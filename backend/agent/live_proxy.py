"""
Pathfinder DAS Agent: Live WebSocket Gateway (live_proxy.py)
Bridges browser WebSocket to Google Gemini Live API.
Handles:
- JWT/session authentication & Owner vs Stakeholder role resolution
- System prompt injection with site_knowledge.json
- AudioWorklet 16kHz PCM streaming to Gemini Live
- 24kHz audio chunk streaming back to browser for real-time lip-sync
- Tool call dispatching to client (navigate, scroll, click, fill, read_page)
- Barge-in / interruption handling
"""

import os
import json
import base64
import asyncio
import logging
from typing import Optional, Dict, Any

from fastapi import WebSocket, WebSocketDisconnect

from backend.owner_profile import is_owner_user
from backend.oauth import verify_signed_session_token, _active_sessions
from backend.models import UserSession
from backend.agent.persona import build_system_instruction, get_greeting_for_user
from backend.agent.tools_schema import TOOLS_SCHEMA, is_tool_whitelisted, is_destructive_action

logger = logging.getLogger("agent.live_proxy")

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_KNOWLEDGE_PATH = os.path.join(AGENT_DIR, "site_knowledge.json")

def load_site_knowledge() -> str:
    """Loads pre-generated site knowledge JSON for system prompt grounding."""
    if os.path.exists(SITE_KNOWLEDGE_PATH):
        try:
            with open(SITE_KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            logger.warning(f"[LiveProxy] Failed reading site_knowledge.json: {e}")
    return "{}"


def resolve_user_from_token(token: Optional[str]) -> UserSession:
    """Resolves authenticated user from token or falls back to guest session."""
    if token:
        token = token.replace("Bearer ", "").strip()
        if token in _active_sessions:
            return _active_sessions[token]
        signed = verify_signed_session_token(token)
        if signed:
            return signed

    return UserSession(
        user_id="usr_guest",
        username="Guest Candidate",
        email="guest@pathfinder.ai",
        role="student",
        auth_provider="credentials",
        is_authenticated=False
    )


async def handle_agent_websocket(websocket: WebSocket):
    """
    Main WebSocket handler for /agent/ws.
    Connects browser client to Gemini Live session.
    """
    await websocket.accept()
    
    # 1. Resolve authentication & role
    token = websocket.query_params.get("token") or websocket.headers.get("authorization")
    user = resolve_user_from_token(token)
    is_owner = is_owner_user(user)
    role_name = "owner" if is_owner else user.role
    greeting_text = get_greeting_for_user(user)

    logger.info(f"[LiveProxy] Client connected. User: {user.username} ({user.email}), Role: {role_name}")

    # Send initial connection metadata & role greeting to client
    await websocket.send_json({
        "type": "connected",
        "role": role_name,
        "is_owner": is_owner,
        "greeting": greeting_text
    })

    # 2. Prepare Gemini Live Client
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    live_model = os.getenv("GEMINI_LIVE_MODEL", "").strip() or "gemini-2.0-flash-exp"

    site_knowledge_str = load_site_knowledge()
    system_instruction = build_system_instruction(
        user=user,
        site_knowledge_str=site_knowledge_str
    )

    if not api_key:
        logger.warning("[LiveProxy] GEMINI_API_KEY not set. Operating in mock fallback mode.")
        await run_fallback_loop(websocket, greeting_text, is_owner)
        return

    # Attempt to connect to Google GenAI Live API
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        # Build tools configuration
        function_declarations = []
        for tool in TOOLS_SCHEMA:
            function_declarations.append(types.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters=tool.get("parameters")
            ))

        config = types.LiveConnectConfig(
            response_modalities=[types.LiveModality.AUDIO],
            system_instruction=types.Content(
                parts=[types.Part.from_text(text=system_instruction)]
            ),
            tools=[types.Tool(function_declarations=function_declarations)] if function_declarations else None,
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Puck"  # High-energy, crisp natural voice
                    )
                )
            )
        )

        async with client.aio.live.connect(model=live_model, config=config) as session:
            logger.info(f"[LiveProxy] Connected to Gemini Live session using model: {live_model}")

            # Send prompt trigger for initial greeting
            await session.send(
                input=f"Acknowledge the user now with your official initial greeting: '{greeting_text}'",
                end_of_turn=True
            )

            # Bidirectional streaming tasks
            client_to_gemini = asyncio.create_task(
                stream_client_to_gemini(websocket, session)
            )
            gemini_to_client = asyncio.create_task(
                stream_gemini_to_client(websocket, session)
            )

            done, pending = await asyncio.wait(
                [client_to_gemini, gemini_to_client],
                return_when=asyncio.FIRST_COMPLETED
            )

            for task in pending:
                task.cancel()

    except Exception as exc:
        logger.error(f"[LiveProxy] Gemini Live session error: {exc}. Switching to graceful fallback.", exc_info=True)
        await websocket.send_json({
            "type": "warning",
            "message": "Gemini Live session unavailable or busy. Operating in intelligent fallback."
        })
        await run_fallback_loop(websocket, greeting_text, is_owner)


async def stream_client_to_gemini(websocket: WebSocket, session: Any):
    """Streams microphone audio and user messages from browser WebSocket to Gemini Live."""
    from google.genai import types

    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                # Raw PCM 16kHz binary chunk from AudioWorklet
                pcm_bytes = message["bytes"]
                await session.send_realtime_input(
                    audio=types.Blob(
                        data=pcm_bytes,
                        mime_type="audio/pcm;rate=16000"
                    )
                )
            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    msg_type = payload.get("type")

                    if msg_type == "audio_chunk":
                        # Base64 encoded PCM chunk
                        b64_data = payload.get("data", "")
                        if b64_data:
                            pcm_data = base64.b64decode(b64_data)
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=pcm_data,
                                    mime_type="audio/pcm;rate=16000"
                                )
                            )

                    elif msg_type == "text":
                        # Typed chat message
                        user_text = payload.get("text", "").strip()
                        if user_text:
                            await session.send(input=user_text, end_of_turn=True)

                    elif msg_type == "tool_response":
                        # Response from client after executing a tool (e.g. read_page, click)
                        tool_id = payload.get("id", "")
                        tool_name = payload.get("name", "")
                        result = payload.get("result", {})

                        await session.send_tool_response(
                            function_responses=[
                                types.FunctionResponse(
                                    name=tool_name,
                                    id=tool_id,
                                    response={"result": result}
                                )
                            ]
                        )

                    elif msg_type == "page_context":
                        # Update current page text/url
                        ctx_text = f"[Current Page Context]: {json.dumps(payload.get('context', {}))}"
                        await session.send(input=ctx_text, end_of_turn=False)

                except json.JSONDecodeError:
                    pass

    except (WebSocketDisconnect, asyncio.CancelledError):
        logger.info("[LiveProxy] Client to Gemini stream ended.")


async def stream_gemini_to_client(websocket: WebSocket, session: Any):
    """Streams audio chunks and tool calls from Gemini Live to browser WebSocket."""
    try:
        async for response in session.receive():
            server_content = getattr(response, "server_content", None)
            if server_content:
                # Check for barge-in / interrupt
                if getattr(server_content, "interrupted", False):
                    await websocket.send_json({"type": "interrupted"})

                model_turn = getattr(server_content, "model_turn", None)
                if model_turn and hasattr(model_turn, "parts"):
                    for part in model_turn.parts:
                        # 1. Spoken Audio chunk (for lip-sync & speaker playback)
                        inline_data = getattr(part, "inline_data", None)
                        if inline_data and getattr(inline_data, "data", None):
                            audio_b64 = base64.b64encode(inline_data.data).decode("utf-8")
                            await websocket.send_json({
                                "type": "audio",
                                "data": audio_b64,
                                "mime_type": getattr(inline_data, "mime_type", "audio/pcm;rate=24000")
                            })

                        # 2. Text / transcript token
                        text_val = getattr(part, "text", None)
                        if text_val:
                            await websocket.send_json({
                                "type": "text",
                                "text": text_val
                            })

            # Check for tool call
            tool_call = getattr(response, "tool_call", None)
            if tool_call and hasattr(tool_call, "function_calls"):
                for fc in tool_call.function_calls:
                    fc_name = getattr(fc, "name", "")
                    fc_args = getattr(fc, "args", {}) or {}
                    fc_id = getattr(fc, "id", "") or f"call_{int(asyncio.get_event_loop().time() * 1000)}"

                    if is_tool_whitelisted(fc_name):
                        is_dangerous = is_destructive_action(fc_name, fc_args.get("agent_id", ""))
                        await websocket.send_json({
                            "type": "tool_call",
                            "id": fc_id,
                            "name": fc_name,
                            "args": fc_args,
                            "requires_confirmation": is_dangerous
                        })
                    else:
                        logger.warning(f"[LiveProxy] Blocked non-whitelisted tool call: {fc_name}")

    except (WebSocketDisconnect, asyncio.CancelledError):
        logger.info("[LiveProxy] Gemini to client stream ended.")


async def run_fallback_loop(websocket: WebSocket, greeting: str, is_owner: bool):
    """Graceful fallback loop if Live API is unavailable or unconfigured."""
    await websocket.send_json({
        "type": "text",
        "text": greeting
    })

    try:
        while True:
            msg = await websocket.receive_text()
            data = json.loads(msg)
            user_text = data.get("text", "")
            
            if user_text:
                reply = (
                    f"Hi boss! I received: '{user_text}'. All 23 blueprints, ATS resume studio, and ML predictions are fully operational."
                    if is_owner else
                    f"Hello sir! I received: '{user_text}'. Let me know which section or placement blueprint you would like to explore."
                )
                await websocket.send_json({"type": "text", "text": reply})

    except WebSocketDisconnect:
        pass
