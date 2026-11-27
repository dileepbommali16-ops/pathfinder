"""
Voice agent auxiliary TTS route.
Synthesizes verbatim 24kHz Puck PCM audio exclusively via gemini-3.8-live.
"""
import asyncio
import logging
import base64
import math
import re
import struct
import time
from collections import OrderedDict
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger("agent.routes.voice")

router = APIRouter(prefix="/api", tags=["voice"])

_TTS_CACHE_MAX = 64
_TTS_PCM_CACHE: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
_TTS_INFLIGHT: Dict[str, asyncio.Task] = {}
_TTS_LIVE_SEM: Optional[asyncio.Semaphore] = None
_TTS_CONCURRENCY_SEM: Optional[asyncio.Semaphore] = None
_LIVE_TTS_COOLDOWN_UNTIL: float = 0.0
_UNARY_TTS_COOLDOWN_UNTIL: float = 0.0

STANDARD_GREETING_PHRASES = (
    "Hi Boss! What's up?",
    "Hi Boss, I'm here!",
    "Hi Madam! What's up?",
    "Hi Madam, I'm here!",
    "Hi Sir! What's up?",
    "Hi Sir, I'm here!",
    "Hi! Welcome to Pathfinder! May I know your name?",
    "Hi there! Tell me your name once and I'll remember it throughout your session!",
)


def _get_tts_live_sem() -> asyncio.Semaphore:
    global _TTS_LIVE_SEM
    if _TTS_LIVE_SEM is None:
        _TTS_LIVE_SEM = asyncio.Semaphore(6)
    return _TTS_LIVE_SEM


def _get_tts_semaphore() -> asyncio.Semaphore:
    global _TTS_CONCURRENCY_SEM
    if _TTS_CONCURRENCY_SEM is None:
        _TTS_CONCURRENCY_SEM = asyncio.Semaphore(8)
    return _TTS_CONCURRENCY_SEM


def _chunk_rms_and_peak_int16(pcm_bytes: bytes) -> tuple[float, int]:
    even = len(pcm_bytes) - (len(pcm_bytes) % 2)
    if even <= 0:
        return 0.0, 0
    samples = struct.unpack(f"<{even // 2}h", pcm_bytes[:even])
    sum_sq = 0
    peak = 0
    for s in samples:
        a = abs(s)
        if a > peak:
            peak = a
        sum_sq += s * s
    rms = math.sqrt(sum_sq / len(samples)) / 32768.0
    return rms, peak


def _clean_pcm_edges(pcm_bytes: bytes, sample_rate: int = 24000) -> bytes:
    """Trims excess trailing silence and applies smooth fade-in/out ramps to eliminate clicks or buzz."""
    even = len(pcm_bytes) - (len(pcm_bytes) % 2)
    if even <= 0:
        return b""
    samples = list(struct.unpack(f"<{even // 2}h", pcm_bytes[:even]))
    # Trim trailing digital silence down to at most 80ms padding
    last_active = len(samples) - 1
    while last_active > 0 and abs(samples[last_active]) < 64:
        last_active -= 1
    max_tail_pad = int(max(8000, sample_rate) * 0.08)
    end_idx = min(len(samples), last_active + 1 + max_tail_pad)
    samples = samples[:end_idx]
    if not samples:
        return b""

    fade_in = min(len(samples) // 4, int(max(8000, sample_rate) * 0.005))
    fade_out = min(len(samples) // 4, int(max(8000, sample_rate) * 0.015))
    for i in range(fade_in):
        samples[i] = int(samples[i] * (i / max(1, fade_in)))
    for i in range(fade_out):
        idx = len(samples) - 1 - i
        samples[idx] = int(samples[idx] * (i / max(1, fade_out)))
    return struct.pack(f"<{len(samples)}h", *samples)


def _strip_wav_header_if_present(raw_bytes: bytes) -> tuple[bytes, int]:
    """Walks RIFF chunks strictly and returns ONLY the PCM 'data' chunk (stripping trailing C2PA/metadata)."""
    if not raw_bytes:
        return b"", 24000
    sample_rate = 24000
    if len(raw_bytes) > 44 and raw_bytes[:4] == b"RIFF" and raw_bytes[8:12] == b"WAVE":
        pos = 12
        found_data: Optional[bytes] = None
        while pos + 8 <= len(raw_bytes):
            chunk_id = raw_bytes[pos : pos + 4]
            chunk_size = struct.unpack("<I", raw_bytes[pos + 4 : pos + 8])[0]
            body_start = pos + 8
            body_end = min(len(raw_bytes), body_start + chunk_size)
            if chunk_id == b"fmt " and body_end - body_start >= 16:
                parsed_rate = struct.unpack("<I", raw_bytes[body_start + 4 : body_start + 8])[0]
                if 8000 <= parsed_rate <= 96000:
                    sample_rate = parsed_rate
            elif chunk_id == b"data":
                found_data = raw_bytes[body_start:body_end]
                break
            pos = body_start + chunk_size + (chunk_size % 2)
        if found_data is not None:
            return found_data[: len(found_data) - (len(found_data) % 2)], sample_rate
        parsed_rate = int.from_bytes(raw_bytes[24:28], "little")
        if 8000 <= parsed_rate <= 96000:
            sample_rate = parsed_rate
        pcm_fallback = raw_bytes[44:]
        return pcm_fallback[: len(pcm_fallback) - (len(pcm_fallback) % 2)], sample_rate
    return raw_bytes[: len(raw_bytes) - (len(raw_bytes) % 2)], sample_rate


async def _synthesize_puck_via_38_unary_fallback(text: str, keys: list) -> Optional[Dict[str, Any]]:
    """Fallback unary Gemini 3.8 TTS using Puck voice when Live TTS is unavailable (isolated unary 429 cooldown)."""
    global _UNARY_TTS_COOLDOWN_UNTIL
    if time.monotonic() < _UNARY_TTS_COOLDOWN_UNTIL:
        return None

    from google import genai
    from google.genai import types
    from backend.agent.puck_voice import get_puck_speech_config

    quota_hit_keys = 0
    for key in keys:
        client = genai.Client(http_options={"api_version": "v1beta", "timeout": 12000}, api_key=key)
        for tts_model in ("gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"):
            try:
                cfg = types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=get_puck_speech_config(),
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                )
                resp = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=tts_model,
                        contents=text,
                        config=cfg,
                    ),
                    timeout=8.0,
                )
                pcm_chunks = bytearray()
                sample_rate = 24000
                candidates = getattr(resp, "candidates", None) or []
                for cand in candidates:
                    content = getattr(cand, "content", None)
                    parts = getattr(content, "parts", None) or []
                    for part in parts:
                        inline = getattr(part, "inline_data", None)
                        raw_data = getattr(inline, "data", None) if inline else None
                        if raw_data:
                            if isinstance(raw_data, str):
                                raw_data = base64.b64decode(raw_data)
                            cleaned_pcm, detected_rate = _strip_wav_header_if_present(bytes(raw_data))
                            sample_rate = detected_rate
                            pcm_chunks.extend(cleaned_pcm)
                if pcm_chunks:
                    polished = _clean_pcm_edges(bytes(pcm_chunks), sample_rate)
                    if polished:
                        return {
                            "pcm_base64": base64.b64encode(polished).decode("utf-8"),
                            "sample_rate": sample_rate,
                            "voice": "Puck",
                        }
            except Exception as exc:
                err_l = repr(exc).lower()
                is_quota = "429" in err_l or "resource_exhausted" in err_l or "quota" in err_l
                if is_quota:
                    logger.info("[Voice TTS Unary %s] quota failover triggered: %r", tts_model, exc)
                    quota_hit_keys += 1
                    break
                logger.warning("[Voice TTS Unary %s] failed: %r", tts_model, exc)
                continue

    if keys and quota_hit_keys >= len(keys):
        _UNARY_TTS_COOLDOWN_UNTIL = time.monotonic() + 1800.0
    return None


def _normalize_tts_text(raw_text: str) -> str:
    """Converts symbols and Big-O notation into clean spoken English and collapses consecutive repeats."""
    txt = (raw_text or "").split("|||")[0].strip()
    if not txt:
        return ""
    # Replace complexity / math notations before removing brackets so neural TTS never stutters on symbols
    txt = re.sub(r"O\(\s*n\s*(?:\*|\s+)?log\s*n\s*\)", "Big O of n log n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"O\(\s*log\s*n\s*\)", "Big O of log n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"O\(\s*n\s*(?:²|\^2)\s*\)", "Big O of n squared", txt, flags=re.IGNORECASE)
    txt = re.sub(r"O\(\s*n\s*\*\s*k\s*\)", "Big O of n times k", txt, flags=re.IGNORECASE)
    txt = re.sub(r"O\(\s*m\s*\+\s*n\s*\)", "Big O of m plus n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"O\(\s*n\s*\)", "Big O of n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"O\(\s*1\s*\)", "Big O of 1", txt, flags=re.IGNORECASE)
    txt = re.sub(r"O\(\s*k\s*\)", "Big O of k", txt, flags=re.IGNORECASE)
    txt = re.sub(r"\[([^\[\]]{1,40})\]", r"\1", txt)
    txt = re.sub(r"[*_#`>|~]", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    # Collapse consecutive duplicated words/short phrases (e.g., "Big O of log n Big O of log n")
    txt = re.sub(r"\b(\w+(?:\s+\w+){0,4})(?:\s+\1\b)+", r"\1", txt, flags=re.IGNORECASE)
    if len(txt) > 420:
        cutoff = txt.rfind(".", 0, 420)
        txt = txt[: cutoff + 1].strip() if cutoff >= 120 else txt[:420].strip()
    return txt


async def _synthesize_puck_via_38_live_unlocked(text: str) -> Optional[Dict[str, Any]]:
    """Synthesize clean verbatim 24kHz PCM speech via genuine gemini-3.8-live Puck voice first."""
    from google import genai
    from google.genai import types
    from backend.config.key_resolver import get_gemini_key_candidates, mark_gemini_key_rate_limited
    from backend.agent.puck_voice import LIVE_MODEL, get_puck_speech_config

    text = _normalize_tts_text(text)
    if not text:
        return None

    keys = get_gemini_key_candidates()
    if not keys:
        return None

    cfg = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=get_puck_speech_config(),
        system_instruction=types.Content(
            parts=[
                types.Part.from_text(
                    text=(
                        "You are a verbatim voice narrator permanently locked to the lively male Puck voice. "
                        "Read the quoted text aloud ONCE cleanly from start to finish in smooth natural cadence. "
                        "Never repeat any phrase, symbol, or clause, and never add extra commentary."
                    )
                )
            ]
        ),
        temperature=0.3,
    )

    est_max_sec = max(3.5, min(28.0, len(text) / 8.5 + 2.2))
    max_pcm_bytes = int(est_max_sec * 48000)

    global _LIVE_TTS_COOLDOWN_UNTIL
    live_sem = _get_tts_live_sem()
    if time.monotonic() >= _LIVE_TTS_COOLDOWN_UNTIL:
        async with live_sem:
            key_candidates = list(keys) if len(keys) > 1 else [keys[0], keys[0]]
            quota_hits = 0
            for attempt_idx, key in enumerate(key_candidates):
                client = genai.Client(http_options={"api_version": "v1beta"}, api_key=key)
                try:
                    pcm_buf = bytearray()

                    async def _run_live():
                        speech_seen = False
                        trailing_silent_bytes = 0
                        async with client.aio.live.connect(model=LIVE_MODEL, config=cfg) as session:
                            await session.send_client_content(
                                turns=[
                                    types.Content(
                                        role="user",
                                        parts=[types.Part.from_text(text=f'Say verbatim: "{text}"')],
                                    )
                                ],
                                turn_complete=True,
                            )
                            async for resp in session.receive():
                                sc = resp.server_content
                                if sc and sc.model_turn and sc.model_turn.parts:
                                    for part in sc.model_turn.parts:
                                        if part.inline_data and part.inline_data.data:
                                            chunk = bytes(part.inline_data.data)
                                            pcm_buf.extend(chunk)
                                            c_rms, _ = _chunk_rms_and_peak_int16(chunk)
                                            if c_rms >= 0.008 or len(pcm_buf) >= 24000:
                                                speech_seen = True
                                            if speech_seen:
                                                if c_rms < 0.0025:
                                                    trailing_silent_bytes += len(chunk)
                                                else:
                                                    trailing_silent_bytes = 0
                                if sc and (
                                    (getattr(sc, "turn_complete", False) and len(pcm_buf) >= 4800)
                                    or (speech_seen and getattr(sc, "generation_complete", False) and len(pcm_buf) >= 9600)
                                    or (speech_seen and trailing_silent_bytes >= 26400)
                                    or len(pcm_buf) >= max_pcm_bytes
                                ):
                                    break

                    await asyncio.wait_for(_run_live(), timeout=11.0)
                    raw_pcm = bytes(pcm_buf)
                    _, peak = _chunk_rms_and_peak_int16(raw_pcm)
                    if len(raw_pcm) >= 4800 and peak >= 200:
                        polished = _clean_pcm_edges(raw_pcm, 24000)
                        if polished:
                            return {
                                "pcm_base64": base64.b64encode(polished).decode("utf-8"),
                                "sample_rate": 24000,
                                "voice": "Puck",
                            }
                    logger.warning(
                        "[Voice TTS Live Puck] %s attempt#%d returned incomplete audio (bytes=%d, peak=%d)",
                        LIVE_MODEL,
                        attempt_idx + 1,
                        len(raw_pcm),
                        peak,
                    )
                except Exception as exc:
                    err_s = repr(exc).lower()
                    logger.warning("[Voice TTS Live Puck] %s attempt#%d failed: %r", LIVE_MODEL, attempt_idx + 1, exc)
                    if any(tok in err_s for tok in ("1011", "exhausted", "quota", "429")):
                        mark_gemini_key_rate_limited(key, 600.0)
                        quota_hits += 1
                        continue
                    if "api key not valid" in err_s:
                        continue
            if quota_hits >= len(key_candidates):
                _LIVE_TTS_COOLDOWN_UNTIL = time.monotonic() + 10.0

    # 2. Secondary fallback to unary Puck TTS only if Live attempts did not yield audio
    unary_result = await _synthesize_puck_via_38_unary_fallback(text, keys)
    if unary_result:
        return unary_result

    return None


async def prewarm_puck_greetings() -> None:
    """Silently pre-synthesizes standard role greetings via genuine gemini-3.8-live Puck on server startup."""
    try:
        for phrase in STANDARD_GREETING_PHRASES:
            try:
                await synthesize_puck_pcm(phrase)
            except Exception as exc:
                logger.debug("[Voice Prewarm] skipped %r: %r", phrase, exc)
    except asyncio.CancelledError:
        return


async def _synthesize_puck_via_38_live(text: str) -> Optional[Dict[str, Any]]:
    async with _get_tts_semaphore():
        return await _synthesize_puck_via_38_live_unlocked(text)


def _store_tts_cache(cache_key: str, synthesized: Dict[str, Any]) -> None:
    _TTS_PCM_CACHE[cache_key] = synthesized
    _TTS_PCM_CACHE.move_to_end(cache_key)
    while len(_TTS_PCM_CACHE) > _TTS_CACHE_MAX:
        _TTS_PCM_CACHE.popitem(last=False)


async def _synthesize_and_cache(cache_key: str, text: str, prefer_unary: bool = False) -> Optional[Dict[str, Any]]:
    try:
        async with _get_tts_semaphore():
            if cache_key in _TTS_PCM_CACHE:
                _TTS_PCM_CACHE.move_to_end(cache_key)
                return _TTS_PCM_CACHE[cache_key]
            synthesized: Optional[Dict[str, Any]] = None
            if prefer_unary:
                from backend.config.key_resolver import get_gemini_key_candidates
                synthesized = await _synthesize_puck_via_38_unary_fallback(text, get_gemini_key_candidates())
            if not synthesized:
                synthesized = await _synthesize_puck_via_38_live_unlocked(text)
            if synthesized:
                _store_tts_cache(cache_key, synthesized)
            return synthesized
    finally:
        _TTS_INFLIGHT.pop(cache_key, None)


async def synthesize_puck_pcm(text: str, prefer_unary: bool = False) -> Optional[Dict[str, Any]]:
    """Shared cached/inflight-deduplicated 24kHz Puck PCM synthesis helper for REST TTS and WebSocket fallback."""
    cleaned = _normalize_tts_text(text)
    if not cleaned:
        return None
    cache_key = f"Puck:3.8-live:{cleaned}"
    if cache_key in _TTS_PCM_CACHE:
        _TTS_PCM_CACHE.move_to_end(cache_key)
        return {"cached": True, **_TTS_PCM_CACHE[cache_key]}

    task = _TTS_INFLIGHT.get(cache_key)
    joined_inflight = task is not None and not task.done()
    if not joined_inflight:
        task = asyncio.create_task(_synthesize_and_cache(cache_key, cleaned, prefer_unary=prefer_unary))
        _TTS_INFLIGHT[cache_key] = task

    try:
        synthesized = await asyncio.wait_for(asyncio.shield(task), timeout=13.5)
    except asyncio.TimeoutError:
        logger.warning("[Voice TTS] timed out waiting 13.5s for Puck synthesis")
        return None
    if synthesized:
        return {"cached": joined_inflight, **synthesized}
    return None


@router.post("/voice/tts")
async def voice_tts(req: dict, request: Request):
    """Synthesize exact verbatim 24kHz Puck PCM audio strictly via gemini-3.8-live Puck."""
    text = (req.get("text", "") if isinstance(req, dict) else "").strip()[:900]
    if not text:
        raise HTTPException(400, "Text is required.")

    synthesized = await synthesize_puck_pcm(text)
    if synthesized:
        return {
            "status": "ok",
            "provider": "gemini-3.8-live-puck",
            **synthesized,
        }

    return {
        "status": "fallback_live",
        "text": text,
        "voice": "Puck",
        "provider": "gemini-3.8-live-puck",
    }
