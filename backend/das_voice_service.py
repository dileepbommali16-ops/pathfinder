"""
Pathfinder DAS Agent: Full-Duplex Real-Time Voice & Lip-Sync WebSocket Gateway
Handles audio buffering, Cognee Graph RAG query, Ollama streaming,
Edge-TTS generation, and Viseme phoneme timestamp packaging.
"""

import os
import json
import asyncio
import logging
import base64
from typing import Dict, Any, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.cognee_brain import cognee_brain
from backend.das_ollama_engine import stream_das_response

logger = logging.getLogger("das.voice_service")
das_ws_router = APIRouter()

INITIAL_GREETING_TEXT = "I'm your AI your DAS Agent, niku em help kavali cheppu."

async def synthesize_speech_with_visemes(text: str, voice: str = "en-IN-NeerjaNeural") -> Dict[str, Any]:
    """
    Uses edge-tts to generate audio and word/phoneme boundary timestamps.
    Falls back gracefully if edge_tts is not installed.
    """
    try:
        import edge_tts  # type: ignore
        communicate = edge_tts.Communicate(text, voice)
        audio_chunks = []
        viseme_events = []

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                viseme_events.append({
                    "type": "word",
                    "offset_ms": chunk["offset"] / 10000,
                    "duration_ms": chunk["duration"] / 10000,
                    "text": chunk["text"]
                })

        return {
            "audio_bytes": b"".join(audio_chunks),
            "events": viseme_events
        }
    except ImportError:
        logger.warning("[TTS] edge_tts not installed. Returning text-only metadata.")
        return {
            "audio_bytes": b"",
            "events": []
        }
    except Exception as e:
        logger.warning(f"[TTS] Speech synthesis error: {e}")
        return {
            "audio_bytes": b"",
            "events": []
        }

@das_ws_router.websocket("/ws/das-agent")
async def das_agent_websocket(websocket: WebSocket):
    await websocket.accept()
    logger.info("[DAS WS] Client connected to DAS Voice Agent.")

    conversation_history: List[Dict[str, str]] = []

    try:
        # 1. LIFECYCLE RULE: Immediate greeting on connection
        # "I'm your AI your DAS Agent, niku em help kavali cheppu."
        greeting_synth = await synthesize_speech_with_visemes(INITIAL_GREETING_TEXT)
        audio_b64 = base64.b64encode(greeting_synth["audio_bytes"]).decode("utf-8") if greeting_synth["audio_bytes"] else ""
        
        await websocket.send_json({
            "type": "agent_greeting",
            "text": INITIAL_GREETING_TEXT,
            "audio_base64": audio_b64,
            "events": greeting_synth["events"]
        })
        conversation_history.append({"role": "assistant", "content": INITIAL_GREETING_TEXT})

        # 2. Main Event Loop
        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            msg_type = data.get("type")

            if msg_type == "user_query":
                user_text = data.get("text", "").strip()
                if not user_text:
                    continue

                conversation_history.append({"role": "user", "content": user_text})
                await websocket.send_json({"type": "state_change", "state": "thinking"})

                # Step 1: Cognee Graph RAG Retrieval
                rag_context = await cognee_brain.search_graph_context(user_text)

                # Step 2: Stream from Ollama + Chunk sentences for real-time speech
                await websocket.send_json({"type": "state_change", "state": "speaking"})

                sentence_buffer = ""
                full_reply = ""

                async for token in stream_das_response(user_text, rag_context, conversation_history):
                    full_reply += token
                    sentence_buffer += token

                    # Send tokens for right-side chat UI
                    await websocket.send_json({"type": "text_delta", "delta": token})

                    # If sentence completed, synthesize audio immediately (<150ms TTFA)
                    if any(sentence_buffer.endswith(punct) for punct in [". ", "? ", "! ", ".\n", "?\n"]):
                        spoken_chunk = sentence_buffer.strip()
                        sentence_buffer = ""
                        synth = await synthesize_speech_with_visemes(spoken_chunk)
                        chunk_b64 = base64.b64encode(synth["audio_bytes"]).decode("utf-8") if synth["audio_bytes"] else ""
                        await websocket.send_json({
                            "type": "audio_chunk",
                            "audio_base64": chunk_b64,
                            "events": synth["events"],
                            "text": spoken_chunk
                        })

                # Flush remaining words in sentence buffer
                if sentence_buffer.strip():
                    synth = await synthesize_speech_with_visemes(sentence_buffer.strip())
                    chunk_b64 = base64.b64encode(synth["audio_bytes"]).decode("utf-8") if synth["audio_bytes"] else ""
                    await websocket.send_json({
                        "type": "audio_chunk",
                        "audio_base64": chunk_b64,
                        "events": synth["events"],
                        "text": sentence_buffer.strip()
                    })

                conversation_history.append({"role": "assistant", "content": full_reply})
                await websocket.send_json({"type": "turn_complete"})
                await websocket.send_json({"type": "state_change", "state": "idle"})

    except WebSocketDisconnect:
        logger.info("[DAS WS] Client disconnected.")
    except Exception as e:
        logger.error(f"[DAS WS] Unhandled error: {e}", exc_info=True)
