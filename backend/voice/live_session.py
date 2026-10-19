"""
Pathfinder Gemini Live Session (backend/voice/live_session.py)
Pathfinder DAS Real-Time Bidirectional Voice Engine.
Manages bidirectional Gemini Live WebSocket session, 16kHz mic -> 24kHz audio relay,
Puck voice profile, dynamic model selection, and tool calls.
"""

import os
import json
import asyncio
import logging
import urllib.request
from typing import Dict, Any, Optional, Callable, Awaitable
from backend.voice.tools import TOOL_DECLARATIONS, execute_tool

logger = logging.getLogger("pathfinder.voice.live")


class GeminiLiveSession:
    """
    Server-side Gemini Live session managing real-time bidirectional audio & tools.
    """

    def __init__(
        self,
        api_key: str,
        system_instruction: str,
        on_audio_delta: Callable[[str], Awaitable[None]],
        on_text_delta: Callable[[str], Awaitable[None]],
        on_turn_complete: Callable[[], Awaitable[None]],
        on_interrupted: Optional[Callable[[], Awaitable[None]]] = None,
        voice_name: str = "Puck"
    ):
        self.api_key = api_key
        self.system_instruction = system_instruction
        self.on_audio_delta = on_audio_delta
        self.on_text_delta = on_text_delta
        self.on_turn_complete = on_turn_complete
        self.on_interrupted = on_interrupted
        self.voice_name = voice_name

        self.ws: Any = None
        self.is_connected = False
        self.live_model: str = self._select_live_model()
        self._receive_task: Optional[asyncio.Task] = None

    def _select_live_model(self) -> str:
        """
        Dynamically selects a supported Live/Native-audio model without hardcoding.
        Logs the choice.
        """
        env_override = os.getenv("GEMINI_LIVE_MODEL", "").strip()
        if env_override:
            logger.info(f"[GeminiLive] Using overridden GEMINI_LIVE_MODEL: '{env_override}'")
            return env_override

        # Query models list endpoint to discover live audio models
        if self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models?key={self.api_key}"
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        models = data.get("models", [])
                        candidate_names = [m.get("name", "").replace("models/", "") for m in models]

                        # Look for native live models
                        for preferred in [
                            "gemini-2.0-flash-exp",
                            "gemini-2.0-flash",
                            "gemini-2.0-flash-thinking-exp"
                        ]:
                            if preferred in candidate_names:
                                logger.info(f"[GeminiLive] Discovered dynamic live model: '{preferred}'")
                                return preferred
            except Exception as e:
                logger.debug(f"[GeminiLive] Dynamic models query skipped: {e}")

        default_model = "gemini-2.0-flash-exp"
        logger.info(f"[GeminiLive] Selecting default live model: '{default_model}'")
        return default_model

    async def connect(self) -> bool:
        """Connects to the Gemini Live WebSocket endpoint and performs setup."""
        if not self.api_key:
            logger.warning("[GeminiLive] No GEMINI_API_KEY provided. Live session cannot connect.")
            return False

        try:
            import websockets  # type: ignore

            ws_url = (
                f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha."
                f"GenerativeService.BidiGenerateContent?key={self.api_key}"
            )

            self.ws = await websockets.connect(ws_url, ping_interval=20, ping_timeout=20)

            # Send Setup Handshake
            setup_msg = {
                "setup": {
                    "model": f"models/{self.live_model}",
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": self.voice_name
                                }
                            }
                        }
                    },
                    "systemInstruction": {
                        "parts": [{"text": self.system_instruction}]
                    },
                    "tools": [
                        {"functionDeclarations": TOOL_DECLARATIONS}
                    ]
                }
            }

            await self.ws.send(json.dumps(setup_msg))

            # Verify Google setup handshake was accepted
            try:
                raw_init = await asyncio.wait_for(self.ws.recv(), timeout=3.5)
                init_data = json.loads(raw_init)
                if "setupComplete" not in init_data:
                    logger.warning(f"[GeminiLive] Handshake failed or rejected by Gemini: {init_data}")
                    try:
                        await self.ws.close()
                    except Exception:
                        pass
                    self.is_connected = False
                    return False
            except Exception as hs_err:
                logger.warning(f"[GeminiLive] Handshake validation failed: {hs_err}")
                try:
                    await self.ws.close()
                except Exception:
                    pass
                self.is_connected = False
                return False

            self.is_connected = True
            self._receive_task = asyncio.create_task(self._listen_loop())
            logger.info(f"[GeminiLive] Connected successfully with voice '{self.voice_name}'.")
            return True

        except Exception as exc:
            logger.warning(f"[GeminiLive] WebSocket connection failed: {exc}")
            self.is_connected = False
            return False

    async def _listen_loop(self):
        """Listens to incoming events from Gemini Live."""
        try:
            async for raw_message in self.ws:
                msg = json.loads(raw_message)
                server_content = msg.get("serverContent")
                if not server_content:
                    # Check for tool call
                    tool_call = msg.get("toolCall")
                    if tool_call:
                        await self._handle_tool_call(tool_call)
                    continue

                # Interruption from Gemini
                if server_content.get("interrupted"):
                    if self.on_interrupted:
                        await self.on_interrupted()
                    continue

                model_turn = server_content.get("modelTurn")
                if model_turn:
                    for part in model_turn.get("parts", []):
                        # Audio chunk (PCM 24kHz)
                        inline_data = part.get("inlineData")
                        if inline_data and "data" in inline_data:
                            await self.on_audio_delta(inline_data["data"])

                        # Transcript / text delta
                        text = part.get("text")
                        if text:
                            await self.on_text_delta(text)

                if server_content.get("turnComplete"):
                    await self.on_turn_complete()

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning(f"[GeminiLive] Listen loop closed: {e}")
        finally:
            self.is_connected = False

    async def _handle_tool_call(self, tool_call: Dict[str, Any]):
        """Dispatches tool calls and returns response to Gemini."""
        function_calls = tool_call.get("functionCalls", [])
        responses = []

        for call in function_calls:
            call_id = call.get("id")
            name = call.get("name")
            args = call.get("args", {})
            logger.info(f"[GeminiLive] Tool call: {name}({args})")

            tool_result = execute_tool(name, args)
            responses.append({
                "id": call_id,
                "name": name,
                "response": {"output": tool_result}
            })

        # Return tool response to Gemini
        tool_response_msg = {
            "toolResponse": {
                "functionResponses": responses
            }
        }
        if self.ws and self.is_connected:
            await self.ws.send(json.dumps(tool_response_msg))

    async def send_audio_chunk(self, base64_pcm16: str):
        """Relays 16kHz PCM audio chunk from client microphone to Gemini."""
        if not self.ws or not self.is_connected:
            return

        chunk_msg = {
            "realtimeInput": {
                "mediaChunks": [
                    {
                        "mimeType": "audio/pcm;rate=16000",
                        "data": base64_pcm16
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(chunk_msg))

    async def send_text_turn(self, text: str):
        """Relays typed client text query to Gemini Live."""
        if not self.ws or not self.is_connected:
            return

        text_msg = {
            "clientContent": {
                "turns": [
                    {
                        "role": "user",
                        "parts": [{"text": text}]
                    }
                ],
                "turnComplete": True
            }
        }
        await self.ws.send(json.dumps(text_msg))

    async def close(self):
        """Gracefully closes live session."""
        self.is_connected = False
        if self._receive_task:
            self._receive_task.cancel()
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass
