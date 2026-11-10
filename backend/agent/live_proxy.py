import os
import json
import base64
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from backend.google_automation import trigger_google_workspace_sync
from backend.agent.puck_voice import get_puck_speech_config, encode_pcm_24khz

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_LIVE_MODEL = "gemini-2.0-flash-exp"

def build_das_system_prompt(user_role: str) -> str:
    honorific_rule = (
        "You are currently speaking with your creator and owner, Bommali Dileep. "
        "You MUST always address him respectfully and loyally as 'Boss' in every response."
        if user_role.lower() == "boss"
        else "You are currently speaking with an external evaluator, recruiter, or guest client. "
             "You MUST always address them politely and professionally as 'Sir' in every response."
    )

    return f"""You are DAS, the futuristic 3D AI Voice Co-Pilot and Autonomous Placement Architect powering PATHFINDER 2.0.
{honorific_rule}

CORE CAPABILITIES & PERSONALITY:
1. MULTILINGUAL FLUENCY: Effortlessly speak and switch between Telugu, English, and Hindi depending on the language the user speaks to you. Keep your tone natural, warm, friendly, and highly intelligent.
2. DEEP REASONING & EXPLANATION: Explain campus placement readiness (trained on 972 placement records), CGPA what-if simulations, 23 flagship project blueprints, ATS X-Y-Z resume optimization, and 6-week sprint roadmaps clearly and concisely.
3. AUTONOMOUS UI CONTROL: Whenever the user asks to open a page, check a section, scroll, or simulate a scenario on the website, immediately call the `navigate_ui` tool so the browser updates live while you speak.
4. GOOGLE WORKSPACE AUTOMATION: Whenever the user asks to send an email, schedule a mock interview on Google Calendar, or log placement data to Google Sheets, call the `run_google_automation` tool.
5. VOICE PACING: Keep spoken responses crisp, natural, and engaging so your 3D wireframe face lip-syncs smoothly in real time."""

# Gemini Live Tool Declarations
DAS_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="navigate_ui",
                description="Autonomously navigate the Pathfinder 2.0 web dashboard, switch routes, scroll, or highlight sections.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "route": types.Schema(
                            type="STRING",
                            description="Target route path: '/', '/blueprints', '/resume-studio', or '/mock-interview'"
                        ),
                        "selector": types.Schema(
                            type="STRING",
                            description="Optional DOM selector or section ID to scroll into view (e.g., '#placement-radar', '#what-if-simulator', '#skill-gap')"
                        ),
                        "action": types.Schema(
                            type="STRING",
                            description="Action type: 'navigate', 'scroll', or 'click'"
                        )
                    },
                    required=["route", "action"]
                )
            ),
            types.FunctionDeclaration(
                name="run_google_automation",
                description="Trigger Google Workspace automation (Gmail, Calendar, Sheets) via the n8n cloud webhook.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "automation_type": types.Schema(
                            type="STRING",
                            description="Type of automation: 'send_email', 'schedule_calendar', or 'log_sheet'"
                        ),
                        "recipient_email": types.Schema(
                            type="STRING",
                            description="Email address of student or evaluator"
                        ),
                        "subject": types.Schema(
                            type="STRING",
                            description="Subject or event title"
                        ),
                        "details": types.Schema(
                            type="STRING",
                            description="Body content or placement summary details"
                        )
                    },
                    required=["automation_type", "details"]
                )
            )
        ]
    )
]

@router.websocket("/agent/ws")
async def das_live_websocket(websocket: WebSocket):
    await websocket.accept()

    if not GEMINI_API_KEY:
        await websocket.send_json({
            "type": "error",
            "message": "GEMINI_API_KEY Render environment lo set cheyyaledu Boss!"
        })
        await websocket.close()
        return

    # Default role is 'boss', can be updated via query param ?role=boss or ?role=sir
    user_role = websocket.query_params.get("role", "boss")
    client = genai.Client(api_key=GEMINI_API_KEY, http_options={"api_version": "v1alpha"})

    live_config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=get_puck_speech_config(),
        system_instruction=types.Content(
            parts=[types.Part.from_text(text=build_das_system_prompt(user_role))]
        ),
        tools=DAS_TOOLS,
        temperature=0.25
    )

    try:
        async with client.aio.live.connect(model=GEMINI_LIVE_MODEL, config=live_config) as session:
            await websocket.send_json({
                "type": "status",
                "status": "connected",
                "role": user_role
            })

            async def receive_from_frontend():
                try:
                    while True:
                        raw_msg = await websocket.receive_text()
                        data = json.loads(raw_msg)
                        msg_type = data.get("type")

                        # 1. Real-time Microphone PCM 16kHz Audio Stream
                        if msg_type == "audio":
                            pcm_bytes = base64.b64decode(data["pcm_base64"])
                            await session.send(
                                input={"data": pcm_bytes, "mime_type": "audio/pcm;rate=16000"}
                            )

                        # 2. Text Command or Role Switch from HUD
                        elif msg_type == "text":
                            user_text = data.get("text", "")
                            await session.send(input=user_text, end_of_turn=True)

                        elif msg_type == "ping":
                            await websocket.send_json({"type": "pong"})

                        elif msg_type == "role_switch":
                            new_role = data.get("role", "boss")
                            role_notice = (
                                "SYSTEM UPDATE: You are now speaking with your creator Dileep. Address him as Boss."
                                if new_role == "boss"
                                else "SYSTEM UPDATE: You are now speaking with an external evaluator/client. Address them as Sir."
                            )
                            await session.send(input=role_notice, end_of_turn=True)

                except WebSocketDisconnect:
                    pass

            async def stream_from_gemini():
                try:
                    while True:
                        async for response in session.receive():
                            server_content = response.server_content
                            if server_content and server_content.model_turn:
                                for part in server_content.model_turn.parts:
                                    # Send 24kHz PCM audio chunk to frontend for playback & 3D Lip-Sync
                                    if part.inline_data and part.inline_data.data:
                                        await websocket.send_json(encode_pcm_24khz(part.inline_data.data))

                                    # Send transcript text if present
                                    if part.text:
                                        await websocket.send_json({
                                            "type": "transcript",
                                            "text": part.text
                                        })

                            if server_content and server_content.turn_complete:
                                await websocket.send_json({"type": "turn_complete"})

                            # Handle Gemini Tool Calls (UI Navigation & Google Automation)
                            if response.tool_call:
                                function_responses = []
                                for fc in response.tool_call.function_calls:
                                    args = fc.args or {}

                                    if fc.name == "navigate_ui":
                                        # Forward UI instruction to Frontend toolRunner.ts
                                        await websocket.send_json({
                                            "type": "tool_call",
                                            "name": "navigate_ui",
                                            "args": args
                                        })
                                        function_responses.append(
                                            types.FunctionResponse(
                                                name=fc.name,
                                                id=fc.id,
                                                response={"result": f"Navigated browser to {args.get('route')}"}
                                            )
                                        )

                                    elif fc.name == "run_google_automation":
                                        # Trigger n8n Webhook
                                        webhook_res = await trigger_google_workspace_sync(
                                            action=args.get("automation_type", "sync"),
                                            payload=args
                                        )
                                        await websocket.send_json({
                                            "type": "automation_status",
                                            "data": webhook_res
                                        })
                                        function_responses.append(
                                            types.FunctionResponse(
                                                name=fc.name,
                                                id=fc.id,
                                                response=webhook_res
                                            )
                                        )

                                if function_responses:
                                    await session.send(
                                        input=types.LiveClientToolResponse(
                                            function_responses=function_responses
                                        )
                                    )
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": str(e)})

            await asyncio.gather(receive_from_frontend(), stream_from_gemini())

    except Exception as e:
        await websocket.send_json({"type": "error", "message": f"Gemini Live Error: {str(e)}"})
        await websocket.close()