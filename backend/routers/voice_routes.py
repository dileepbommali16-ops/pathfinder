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

_TTS_CACHE_MAX = 40
_TTS_PCM_CACHE: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
_TTS_INFLIGHT: Dict[str, asyncio.Task] = {}
_TTS_LIVE_LOCK: Optional[asyncio.Lock] = None


def _get_tts_lock() -> asyncio.Lock:
    global _TTS_LIVE_LOCK
    if _TTS_LIVE_LOCK is None:
        _TTS_LIVE_LOCK = asyncio.Lock()
    return _TTS_LIVE_LOCK


async def _synthesize_puck_via_38_live_unlocked(text: str) -> Optional[Dict[str, Any]]:
    """Synthesize clean verbatim 24kHz PCM speech exclusively via gemini-3.8-live Puck voice."""
    from google import genai
    from google.genai import types
    from backend.config.key_resolver import get_gemini_key_candidates
    from backend.agent.puck_voice import LIVE_MODEL, get_puck_speech_config

    keys = get_gemini_key_candidates()
    if not keys:
        return None

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
    async with _get_tts_lock():
        return await _synthesize_puck_via_38_live_unlocked(text)


def _store_tts_cache(cache_key: str, synthesized: Dict[str, Any]) -> None:
    _TTS_PCM_CACHE[cache_key] = synthesized
    _TTS_PCM_CACHE.move_to_end(cache_key)
    while len(_TTS_PCM_CACHE) > _TTS_CACHE_MAX:
        _TTS_PCM_CACHE.popitem(last=False)


async def _synthesize_and_cache(cache_key: str, text: str) -> Optional[Dict[str, Any]]:
    try:
        async with _get_tts_lock():
            if cache_key in _TTS_PCM_CACHE:
                _TTS_PCM_CACHE.move_to_end(cache_key)
                return _TTS_PCM_CACHE[cache_key]
            synthesized = await _synthesize_puck_via_38_live_unlocked(text)
            if synthesized:
                _store_tts_cache(cache_key, synthesized)
            return synthesized
    finally:
        _TTS_INFLIGHT.pop(cache_key, None)


@router.post("/voice/tts")
async def voice_tts(req: dict, request: Request):
    """Synthesize exact verbatim 24kHz Puck PCM audio strictly via gemini-3.8-live Puck."""
    text = (req.get("text", "") if isinstance(req, dict) else "").strip()[:900]
    voice_name = "Puck"
    if not text:
        raise HTTPException(400, "Text is required.")

    cache_key = f"{voice_name}:3.8-live:{text}"
    if cache_key in _TTS_PCM_CACHE:
        _TTS_PCM_CACHE.move_to_end(cache_key)
        cached = _TTS_PCM_CACHE[cache_key]
        return {
            "status": "ok",
            "cached": True,
            "provider": "gemini-3.8-live-puck",
            **cached,
        }

    task = _TTS_INFLIGHT.get(cache_key)
    joined_inflight = task is not None and not task.done()
    if not joined_inflight:
        task = asyncio.create_task(_synthesize_and_cache(cache_key, text))
        _TTS_INFLIGHT[cache_key] = task

    synthesized = await asyncio.shield(task)

    if synthesized:
        return {
            "status": "ok",
            "cached": joined_inflight,
            "provider": "gemini-3.8-live-puck",
            **synthesized,
        }

    return {
        "status": "fallback_live",
        "text": text,
        "voice": "Puck",
        "provider": "gemini-3.8-live-puck",
    }
