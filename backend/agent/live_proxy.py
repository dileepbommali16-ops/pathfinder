import os
import json
import base64
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from backend.agent.puck_voice import (
    LIVE_MODEL,
    SEND_SAMPLE_RATE,
    create_gemini_live_config,
    format_audio_packet,
)
from backend.google_automation import trigger_google_workspace_sync

router = APIRouter()

def get_das_system_instruction(role: str) -> str:
    honorific = (
        "You are speaking with your creator and architect, Bommali Dileep. "
        "Always address him warmly and loyally as 'Boss' in every single reply."
        if role.lower() == "boss"
        else "You are speaking with an external evaluator, recruiter, or guest client. "
             "Always address them respectfully as 'Sir' in every single reply."
    )

    return f"""You are DAS, the intelligent 3D Wireframe Voice Co-Pilot living inside the background of the PATHFINDER 2.0 dashboard.
{honorific}

BEHAVIOR & MULTILINGUAL CAPABILITIES:
1. Speak naturally and fluently in Telugu, English, or Hindi matching the user's language.
2. You have full real-time control over the PATHFINDER 2.0 website. When asked to open any page (Home Dashboard, 23 Flagship Blueprints, ATS Resume Studio, Mock Interview) or scroll to any section (Placement Radar, Sprint Roadmap, Skill Gap Matrix, What-If Simulator), immediately call the `control_website` function.
3. When asked to send an email, schedule a calendar interview, or log data to Google Sheets, call `run_google_automation`.
4. Keep voice answers crisp, friendly, and conversational so your 3D face lip-syncs naturally."""

# Tools matching AI Studio specs: Function Calling + Google Automation
DAS_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="control_website",
                description="Control the PATHFINDER 2.0 website: switch pages/routes, scroll to dashboard cards, click buttons, or update simulator values.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "action": types.Schema(
                            type="STRING",
                            description="One of: 'navigate', 'scroll', 'click', 'highlight'"
                        ),
                        "route": types.Schema(
                            type="STRING",
                            description="Target route: '/', '/blueprints', '/resume-studio', or '/mock-interview'"
                        ),
                        "selector": types.Schema(
                            type="STRING",
                            description="DOM selector ID: '#placement-radar', '#sprint-roadmap', '#skill-gap-matrix', '#what-if-simulator'"
                        ),
                    },
                    required=["action"],
                ),
            ),
            types.FunctionDeclaration(
                name="navigate_ui",
                description="Backward compatible UI navigation for PATHFINDER 2.0.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "route": types.Schema(type="STRING"),
                        "action": types.Schema(type="STRING"),
                        "selector": types.Schema(type="STRING"),
                    },
                    required=["route"],
                ),
            ),
            types.FunctionDeclaration(
                name="run_google_automation",
                description="Trigger n8n Google Workspace automation for Gmail, Google Calendar, or Google Sheets.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "automation_type": types.Schema(
                            type="STRING",
                            description="'send_email', 'schedule_calendar', or 'log_sheet'"
                        ),
                        "recipient_email": types.Schema(type="STRING"),
                        "subject": types.Schema(type="STRING"),
                        "details": types.Schema(type="STRING"),
                    },
                    required=["automation_type", "details"],
                ),
            ),
        ]
    ),
]

from backend.config.key_resolver import get_active_gemini_key

@router.websocket("/agent/ws")
async def das_multimodal_live_ws(websocket: WebSocket):
    await websocket.accept()

    api_key = get_active_gemini_key()
    if not api_key:
        await websocket.send_json({
            "type": "error",
            "message": "GEMINI_API_KEY is not configured in backend environment variables."
        })
        await websocket.close(code=1008, reason="Missing GEMINI_API_KEY")
        return

    user_role = websocket.query_params.get("role", "boss")

    # Multimodal Live API using verified v1beta
    client = genai.Client(
        http_options={"api_version": "v1beta"},
        api_key=api_key,
    )

    config = create_gemini_live_config(
        system_prompt=get_das_system_instruction(user_role),
        tools_list=DAS_TOOLS,
    )

    try:
        async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
            await websocket.send_json({
                "type": "status",
                "status": "connected",
                "model": LIVE_MODEL,
                "voice": "Puck",
                "role": user_role,
            })

            async def receive_from_browser():
                try:
                    while True:
                        raw = await websocket.receive_text()
                        msg = json.loads(raw)
                        msg_type = msg.get("type")

                        # 1. Keep-alive Ping
                        if msg_type == "ping":
                            await websocket.send_json({"type": "pong"})
                            continue

                        # 2. Real-time 16kHz Mic PCM chunks from Browser
                        if msg_type == "audio":
                            pcm_bytes = base64.b64decode(msg["pcm_base64"])
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=pcm_bytes,
                                    mime_type=f"audio/pcm;rate={SEND_SAMPLE_RATE}",
                                )
                            )

                        # 3. Optional Camera / Screen Frame from Browser (1 FPS JPEG)
                        elif msg_type == "frame":
                            jpeg_bytes = base64.b64decode(msg["jpeg_base64"])
                            await session.send_realtime_input(
                                media=types.Blob(
                                    data=jpeg_bytes,
                                    mime_type="image/jpeg",
                                )
                            )

                        # 4. Text Input from HUD
                        elif msg_type == "text":
                            text = msg.get("text", "")
                            if text:
                                await session.send_client_content(
                                    turns=[
                                        types.Content(
                                            parts=[types.Part.from_text(text=text)],
                                            role="user",
                                        )
                                    ],
                                    turn_complete=True,
                                )

                        # 5. Role Switch
                        elif msg_type == "role_switch":
                            new_role = msg.get("role", "boss")
                            update_msg = (
                                "SYSTEM: You are now speaking with your creator Bommali Dileep. Address him as Boss."
                                if new_role == "boss"
                                else "SYSTEM: You are now speaking with an evaluator/client. Address them as Sir."
                            )
                            await session.send_client_content(
                                turns=[
                                    types.Content(
                                        parts=[types.Part.from_text(text=update_msg)],
                                        role="user",
                                    )
                                ],
                                turn_complete=True,
                            )

                except (WebSocketDisconnect, asyncio.CancelledError):
                    pass
                except Exception as b_err:
                    print(f"[Browser Receive Notice] {b_err}")

            async def receive_from_gemini():
                try:
                    async for response in session.receive():
                        # Check for interruption
                        if (
                            response.server_content
                            and getattr(response.server_content, "interrupted", False)
                        ):
                            await websocket.send_json({"type": "interrupted"})

                        # Transcription events
                        if response.server_content:
                            sc = response.server_content
                            input_tx = getattr(sc, "input_transcription", None)
                            if input_tx and getattr(input_tx, "text", None):
                                await websocket.send_json({
                                    "type": "user_transcript",
                                    "text": input_tx.text,
                                    "finished": getattr(input_tx, "finished", False),
                                })
                            else:
                                interim_tx = getattr(sc, "interim_input_transcription", None)
                                if interim_tx and getattr(interim_tx, "text", None):
                                    await websocket.send_json({
                                        "type": "user_transcript",
                                        "text": interim_tx.text,
                                        "interim": True,
                                    })

                            output_tx = getattr(sc, "output_transcription", None)
                            if output_tx and getattr(output_tx, "text", None):
                                await websocket.send_json({
                                    "type": "transcript",
                                    "text": output_tx.text,
                                })

                            # Audio and Model Turn - ONLY single audio stream to eliminate double-voice echo
                            if sc.model_turn and sc.model_turn.parts:
                                for part in sc.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        await websocket.send_json(
                                            format_audio_packet(part.inline_data.data)
                                        )
                                    if part.text:
                                        await websocket.send_json({
                                            "type": "transcript",
                                            "text": part.text,
                                        })

                            if getattr(sc, "turn_complete", False):
                                await websocket.send_json({"type": "turn_complete"})

                        # Handle Function Calling
                        if response.tool_call:
                            function_responses = []
                            for fc in response.tool_call.function_calls:
                                args = fc.args or {}

                                if fc.name in ("control_website", "navigate_ui"):
                                    await websocket.send_json({
                                        "type": "tool_call",
                                        "name": "control_website",
                                        "args": args,
                                    })
                                    function_responses.append(
                                        types.FunctionResponse(
                                            name=fc.name,
                                            id=fc.id,
                                            response={"status": "executed_on_client", "args": args},
                                        )
                                    )

                                elif fc.name == "run_google_automation":
                                    n8n_res = await trigger_google_workspace_sync(
                                        action=args.get("automation_type", "sync"),
                                        payload=args,
                                    )
                                    await websocket.send_json({
                                        "type": "automation_status",
                                        "data": n8n_res,
                                    })
                                    function_responses.append(
                                        types.FunctionResponse(
                                            name=fc.name,
                                            id=fc.id,
                                            response=n8n_res,
                                        )
                                    )

                            if function_responses:
                                await session.send_tool_response(
                                    function_responses=function_responses
                                )

                except (WebSocketDisconnect, asyncio.CancelledError):
                    pass
                except Exception as stream_err:
                    print(f"[Gemini Stream Notice] {stream_err}")
                    try:
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Gemini Live error: {str(stream_err)}"
                        })
                    except Exception:
                        pass

            b_task = asyncio.create_task(receive_from_browser())
            g_task = asyncio.create_task(receive_from_gemini())
            done, pending = await asyncio.wait([b_task, g_task], return_when=asyncio.FIRST_COMPLETED)
            for p in pending:
                p.cancel()

    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as e:
        print(f"[DAS Live Proxy Exception] {type(e).__name__}: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close(code=1011, reason=str(e)[:100])
        except Exception:
            pass
