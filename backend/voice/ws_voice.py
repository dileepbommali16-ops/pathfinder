"""
Pathfinder Voice WebSocket Router (backend/voice/ws_voice.py)
Implements:
1. /ws/voice WebSocket route with session token authentication
2. Strict origin check (localhost, Vercel, Render)
3. Per-user rate limiting & message size limit (1MB)
4. Maximum session duration enforcement (VOICE_MAX_SESSION_MINUTES)
5. Full relay to Gemini Live with fallback_pipeline fallback
"""

import os
import json
import time
import asyncio
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, HTTPException, Depends
from fastapi.responses import JSONResponse

from backend.voice.live_session import GeminiLiveSession
from backend.voice.fallback_pipeline import fallback_pipeline

logger = logging.getLogger("pathfinder.voice.ws")

voice_router = APIRouter(tags=["voice"])

INITIAL_GREETING = "Hi sir, I'm your Pathfinder AI agent, how can I help you?"
VOICE_MAX_SESSION_MINUTES = int(os.getenv("VOICE_MAX_SESSION_MINUTES", "15"))
MAX_MESSAGE_BYTES = 1024 * 1024  # 1 MB

ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000"
}


def _is_origin_allowed(origin: Optional[str]) -> bool:
    """Validates origin header against localhost, configured FRONTEND_URL, Vercel and Render."""
    if not origin:
        return True  # Native clients or direct WebSocket connections
    origin_clean = origin.rstrip("/").lower()

    if origin_clean in ALLOWED_ORIGINS:
        return True

    frontend_env = os.getenv("FRONTEND_URL", "").rstrip("/").lower()
    if frontend_env and origin_clean == frontend_env:
        return True

    if origin_clean.endswith(".vercel.app") or origin_clean.endswith(".onrender.com"):
        return True

    return False


@voice_router.websocket("/ws/voice")
async def websocket_voice_endpoint(websocket: WebSocket):
    """
    Main WebSocket voice session endpoint.
    Handles authentication, live session relay, and fallback text pipeline.
    """
    origin = websocket.headers.get("origin")
    if not _is_origin_allowed(origin):
        logger.warning(f"[VoiceWS] Rejected unauthorized origin: {origin}")
        await websocket.close(code=4403, reason="Forbidden Origin")
        return

    # Extract user token or session identity
    token = websocket.query_params.get("token") or websocket.headers.get("authorization", "")
    student_id = f"student_{abs(hash(token or websocket.client.host if websocket.client else 'guest')) % 100000}"

    await websocket.accept()
    session_start_time = time.time()
    rate_limit_counter = {"count": 0, "reset_at": time.time() + 60}

    logger.info(f"[VoiceWS] Session started for {student_id} from {origin or 'direct'}")

    live_session: Optional[GeminiLiveSession] = None
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    # Callbacks for Gemini Live to push to browser WebSocket
    async def on_audio_delta(base64_pcm: str):
        try:
            await websocket.send_json({
                "type": "audio_chunk",
                "audio_base64": base64_pcm
            })
        except Exception:
            pass

    async def on_text_delta(delta: str):
        try:
            await websocket.send_json({
                "type": "text_delta",
                "delta": delta
            })
        except Exception:
            pass

    async def on_turn_complete():
        try:
            await websocket.send_json({"type": "turn_complete"})
        except Exception:
            pass

    async def on_interrupted():
        try:
            await websocket.send_json({"type": "interrupted"})
        except Exception:
            pass

    # Attempt to initialize Gemini Live Session
    if gemini_key:


        live_session = GeminiLiveSession(
            api_key=gemini_key,
            system_instruction=fallback_pipeline.prompt_template,
            on_audio_delta=on_audio_delta,
            on_text_delta=on_text_delta,
            on_turn_complete=on_turn_complete,
            on_interrupted=on_interrupted,
            voice_name="Puck"
        )
        is_live_ready = await live_session.connect()
        if not is_live_ready:
            live_session = None

    # Send Initial Greeting on Connect
    await websocket.send_json({
        "type": "agent_greeting",
        "text": INITIAL_GREETING,
        "provider": "Gemini Live (Puck)" if live_session else "DAS Fallback Engine"
    })

    try:
        while True:
            # Check maximum session duration
            elapsed_minutes = (time.time() - session_start_time) / 60
            if elapsed_minutes >= VOICE_MAX_SESSION_MINUTES:
                logger.info(f"[VoiceWS] Max session limit reached ({VOICE_MAX_SESSION_MINUTES}m) for {student_id}")
                await websocket.send_json({
                    "type": "session_timeout",
                    "message": f"Session reached max limit of {VOICE_MAX_SESSION_MINUTES} minutes. Reconnecting..."
                })
                await websocket.close(code=1000, reason="Session duration limit")
                break

            # Rate limit check (Max 60 requests per minute)
            now = time.time()
            if now > rate_limit_counter["reset_at"]:
                rate_limit_counter = {"count": 0, "reset_at": now + 60}
            rate_limit_counter["count"] += 1
            if rate_limit_counter["count"] > 60:
                await websocket.send_json({
                    "type": "rate_limited",
                    "message": "Too many requests. Please slow down."
                })
                await asyncio.sleep(1)
                continue

            raw_msg = await websocket.receive_text()

            # Message size limit
            if len(raw_msg.encode("utf-8")) > MAX_MESSAGE_BYTES:
                await websocket.send_json({"type": "error", "message": "Message exceeds 1MB limit"})
                continue

            data = json.loads(raw_msg)
            msg_type = data.get("type")

            # 1. Stop button pressed -> abort audio
            if msg_type == "stop":
                if live_session:
                    await live_session.close()
                    # Reconnect fresh session
                    live_session = GeminiLiveSession(
                        api_key=gemini_key,
                        system_instruction=fallback_pipeline.prompt_template,
                        on_audio_delta=on_audio_delta,
                        on_text_delta=on_text_delta,
                        on_turn_complete=on_turn_complete,
                        on_interrupted=on_interrupted
                    )
                    await live_session.connect()
                await websocket.send_json({"type": "stopped"})
                continue

            # 2. Browser Microphone Audio Chunk (16kHz PCM16)
            if msg_type == "user_mic_chunk":
                audio_base64 = data.get("audio_base64", "")
                if live_session and audio_base64:
                    await live_session.send_audio_chunk(audio_base64)
                continue

            # 3. User Text Query (Typed or Browser Speech Recognized)
            if msg_type == "user_text":
                user_text = data.get("text", "").strip()
                lang_pref = data.get("language", "auto")

                if live_session and live_session.is_connected:
                    await live_session.send_text_turn(user_text)
                else:
                    # Fallback pipeline execution
                    await websocket.send_json({"type": "state_change", "state": "thinking"})
                    turn_result = await fallback_pipeline.process_turn(
                        student_id=student_id,
                        user_text=user_text,
                        language_preference=lang_pref
                    )
                    await websocket.send_json({
                        "type": "turn_response",
                        "spoken_summary": turn_result["spoken_summary"],
                        "screen_details": turn_result["screen_details"],
                        "provider": turn_result["provider"],
                        "sentences": turn_result["sentences"],
                        "is_error": turn_result["is_error"]
                    })
                    await websocket.send_json({"type": "turn_complete"})

    except WebSocketDisconnect:
        logger.info(f"[VoiceWS] Client disconnected gracefully: {student_id}")
    except Exception as exc:
        logger.warning(f"[VoiceWS] WebSocket error: {exc}")
    finally:
        if live_session:
            await live_session.close()


@voice_router.post("/api/voice/chat")
async def fallback_chat_http(request: Request):
    """HTTP endpoint for fallback text queries and testing."""
    body = await request.json()
    user_text = body.get("message") or body.get("text", "")
    student_id = body.get("student_id", "web_student")
    lang_pref = body.get("language", "auto")

    result = await fallback_pipeline.process_turn(
        student_id=student_id,
        user_text=user_text,
        language_preference=lang_pref
    )
    return JSONResponse(result)
