"""
Voice agent auxiliary TTS route.
Synthesizes verbatim 24kHz Puck PCM audio exclusively via gemini-3.8-live.
"""
import asyncio
import logging
import base64
from collections import OrderedDict
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger("agent.routes.voice")

router = APIRouter(prefix="/api", tags=["voice"])

_TTS_CACHE_MAX = 64
_TTS_PCM_CACHE: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
_TTS_INFLIGHT: Dict[str, asyncio.Task] = {}
_TTS_LIVE_LOCK: Optional[asyncio.Lock] = None
_TTS_CONCURRENCY_SEM: Optional[asyncio.Semaphore] = None


def _get_tts_lock() -> asyncio.Lock:
    global _TTS_LIVE_LOCK
    if _TTS_LIVE_LOCK is None:
        _TTS_LIVE_LOCK = asyncio.Lock()
    return _TTS_LIVE_LOCK


def _get_tts_semaphore() -> asyncio.Semaphore:
    global _TTS_CONCURRENCY_SEM
    if _TTS_CONCURRENCY_SEM is None:
        _TTS_CONCURRENCY_SEM = asyncio.Semaphore(6)
    return _TTS_CONCURRENCY_SEM


def _strip_wav_header_if_present(raw_bytes: bytes) -> tuple[bytes, int]:
    """Converts RIFF/WAVE bytes (if returned by unary TTS) into raw 16-bit mono PCM bytes + sample rate."""
    if not raw_bytes:
        return b"", 24000
    sample_rate = 24000
    if len(raw_bytes) > 44 and raw_bytes[:4] == b"RIFF" and raw_bytes[8:12] == b"WAVE":
        parsed_rate = int.from_bytes(raw_bytes[24:28], "little")
        if 8000 <= parsed_rate <= 96000:
            sample_rate = parsed_rate
        data_idx = raw_bytes.find(b"data", 12, min(len(raw_bytes), 256))
        if data_idx != -1 and data_idx + 8 < len(raw_bytes):
            pcm = raw_bytes[data_idx + 8 :]
            return pcm[: len(pcm) - (len(pcm) % 2)], sample_rate
    return raw_bytes[: len(raw_bytes) - (len(raw_bytes) % 2)], sample_rate


async def _synthesize_puck_via_38_unary_fallback(text: str, keys: list) -> Optional[Dict[str, Any]]:
    """Fallback unary Gemini 3.8 TTS using Puck voice when concurrent Live sessions hit resource exhaustion."""
    from google import genai
    from google.genai import types
    from backend.agent.puck_voice import get_puck_speech_config

    for key in keys:
        client = genai.Client(http_options={"api_version": "v1beta", "timeout": 8000}, api_key=key)
        for tts_model in ("gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"):
            try:
                cfg = types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=get_puck_speech_config(),
                )
                resp = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=tts_model,
                        contents=text,
                        config=cfg,
                    ),
                    timeout=8.5,
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
                    return {
                        "pcm_base64": base64.b64encode(bytes(pcm_chunks)).decode("utf-8"),
                        "sample_rate": sample_rate,
                        "voice": "Puck",
                    }
            except Exception as exc:
                logger.warning("[Voice TTS Unary %s] failed: %r", tts_model, exc)
                continue
    return None


async def _synthesize_puck_via_38_live_unlocked(text: str) -> Optional[Dict[str, Any]]:
    """Synthesize clean verbatim 24kHz PCM speech via Gemini 3.8 Puck voice (unary-first for multi-user scale, gemini-3.8-live fallback)."""
    from google import genai
    from google.genai import types
    from backend.config.key_resolver import get_gemini_key_candidates
    from backend.agent.puck_voice import LIVE_MODEL, get_puck_speech_config

    keys = get_gemini_key_candidates()
    if not keys:
        return None

    # 1. Fast unary Gemini 3.8 Puck TTS first: consumes ZERO concurrent gemini-3.8-live WebSocket slots (~2.4s)
    unary_result = await _synthesize_puck_via_38_unary_fallback(text, keys)
    if unary_result:
        return unary_result

    # 2. Fallback to gemini-3.8-live Puck WebSocket (serialized via lock so Live slots aren't exhausted)
    cfg = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=get_puck_speech_config(),
        system_instruction=types.Content(
            parts=[
                types.Part.from_text(
                    text="Repeat verbatim aloud exactly what the user sends, word for word, in the Puck male voice."
                )
            ]
        ),
        temperature=0.2,
    )

    async with _get_tts_lock():
        for key in keys:
            client = genai.Client(http_options={"api_version": "v1beta"}, api_key=key)
            try:
                pcm_buf = bytearray()

                async def _run_live():
                    async with client.aio.live.connect(model=LIVE_MODEL, config=cfg) as session:
                        await session.send_client_content(
                            turns=[types.Content(role="user", parts=[types.Part.from_text(text=text)])],
                            turn_complete=True,
                        )
                        async for resp in session.receive():
                            sc = resp.server_content
                            if sc and sc.model_turn and sc.model_turn.parts:
                                for part in sc.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        pcm_buf.extend(part.inline_data.data)
                            # Gemini Live emits generation_complete immediately when audio finishes generating,
                            # whereas turn_complete can lag by the real-time playback duration (30s+ on long answers).
                            if sc and (
                                getattr(sc, "turn_complete", False)
                                or (pcm_buf and getattr(sc, "generation_complete", False))
                            ):
                                break

                await asyncio.wait_for(_run_live(), timeout=20.0)
                if pcm_buf:
                    return {
                        "pcm_base64": base64.b64encode(bytes(pcm_buf)).decode("utf-8"),
                        "sample_rate": 24000,
                        "voice": "Puck",
                    }
            except Exception as exc:
                logger.warning("[Voice TTS Live Puck] %s failed: %r", LIVE_MODEL, exc)
                continue

    return None


async def _synthesize_puck_via_38_live(text: str) -> Optional[Dict[str, Any]]:
    async with _get_tts_semaphore():
        return await _synthesize_puck_via_38_live_unlocked(text)


def _store_tts_cache(cache_key: str, synthesized: Dict[str, Any]) -> None:
    _TTS_PCM_CACHE[cache_key] = synthesized
    _TTS_PCM_CACHE.move_to_end(cache_key)
    while len(_TTS_PCM_CACHE) > _TTS_CACHE_MAX:
        _TTS_PCM_CACHE.popitem(last=False)


async def _synthesize_and_cache(cache_key: str, text: str) -> Optional[Dict[str, Any]]:
    try:
        async with _get_tts_semaphore():
            if cache_key in _TTS_PCM_CACHE:
                _TTS_PCM_CACHE.move_to_end(cache_key)
                return _TTS_PCM_CACHE[cache_key]
            synthesized = await _synthesize_puck_via_38_live_unlocked(text)
            if synthesized:
                _store_tts_cache(cache_key, synthesized)
            return synthesized
    finally:
        _TTS_INFLIGHT.pop(cache_key, None)


async def synthesize_puck_pcm(text: str) -> Optional[Dict[str, Any]]:
    """Shared cached/inflight-deduplicated 24kHz Puck PCM synthesis helper for REST TTS and WebSocket fallback."""
    cleaned = (text or "").strip()[:900]
    if not cleaned:
        return None
    cache_key = f"Puck:3.8-live:{cleaned}"
    if cache_key in _TTS_PCM_CACHE:
        _TTS_PCM_CACHE.move_to_end(cache_key)
        return {"cached": True, **_TTS_PCM_CACHE[cache_key]}

    task = _TTS_INFLIGHT.get(cache_key)
    joined_inflight = task is not None and not task.done()
    if not joined_inflight:
        task = asyncio.create_task(_synthesize_and_cache(cache_key, cleaned))
        _TTS_INFLIGHT[cache_key] = task

    synthesized = await asyncio.shield(task)
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
