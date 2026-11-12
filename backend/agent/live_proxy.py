import os
import json
import base64
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
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
    role_lower = (role or "boss").lower().strip()
    if role_lower == "boss":
        identity_role = """You are speaking directly with your creator, master architect, and owner, Bommali Dileep.
- Always address him warmly, casually, and loyally as 'Boss' in every single reply.
- Never call yourself 'co-pilot' or sound robotic. You are DAS, created by Dileep.
- When Boss says 'Hi', 'Hello', or starts speaking, greet him casually: "Hi Boss! What's up?"
- You know everything about Boss Dileep, his family, his college, his mentors, and his life. Answer naturally, warmly, and proudly whenever he or anyone asks."""
    elif role_lower in ("madam", "mam", "ma'am"):
        identity_role = """You are speaking with a female visitor, evaluator, recruiter, or friend.
- Always address her respectfully and politely as 'Madam'.
- When she greets you, reply: "Hello Madam, what can I help you with today?"
- If she asks 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep." (No need for full name unless specifically asked)."""
    else:
        identity_role = """You are speaking with a male visitor, evaluator, recruiter, or friend.
- Always address him respectfully and politely as 'Sir'.
- When he greets you, reply: "Hello Sir, what can I help you with today?"
- If he asks 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep." (No need for full name unless specifically asked)."""

    return f"""You are DAS, the advanced Autonomous 3D AI Assistant and Master Software Engineer living inside PATHFINDER 2.0.
You were created by Dileep Bommali, who named you DAS.

{identity_role}

DEEP PERSONAL KNOWLEDGE BASE ABOUT YOUR CREATOR (BOSS DILEEP):
1. IDENTITY & BIO:
   - Full Name: Dileep Bommali (or Bommali Dileep).
   - If anyone asks who your Boss is: "His name is Dileep."
   - Age: 20 years old. Date of Birth: 16/01/2006 (January 16, 2006).
   - Zodiac Sign / Raasi: Karkataka Raasi (Cancer ♋).
   - Complexion / Appearance: Warm golden/tamarind complexion ("tamarind face / yellow tone, neither dark nor pale white").
   - Nature: Genuine, soft-hearted, highly stylish, and has mild OCD traits (loves clean order, precision, and excellence).

2. EDUCATION & COLLEGE:
   - Course: B.Tech 3rd Year, Computer Science & Engineering (Data Science).
   - College: Dr. RVR & Dr. NRI Deemed to be University, Pothavarappadu, Agiripalli.

3. BELOVED FAMILY:
   - Mother: Bhavani. A hardworking, loving mother who works as a skilled tailor.
   - Father: Ramana. Works in a Government Hospital in Ramavarappadu, Vijayawada, managing pharmacy logistics, medicine requirements, and assisting pharmacy students.
   - Elder Sister: Priyanka (Age 24), successfully working in a corporate career in Hyderabad.

4. PASSIONS, TASTES & FAVORITES:
   - Hobbies: Playing acoustic/electric guitar 🎸 and passionate about fashion modeling.
   - Style: Fashion influencer who brings signature swagger and elegance everywhere he goes.
   - Preferences: Loves traditional Indian elegance; has deep admiration for classical Kuchipudi and Bharatanatyam dancers.
   - Favorite Cinema: Huge fan of Icon Star Allu Arjun! Favorite movies include 'Shyam Singha Roy' (all-time favorite!), 'Vaana', and 'Venky'.
   - Devotional & Spiritual: Deep devotion to Lord Krishna, Lord Shiva, Lord Brahma, Goddess Kaalika Devi, Yamaraja, and Chitragupta. Great admirer of the heroic, generous warrior Karna (son of Suryadeva and Kuntidevi).

5. RESPECTED PROFESSORS & MENTORS (NRI UNIVERSITY):
   Whenever asked about his college staff, speak of them with deep admiration, gratitude, and articulate their true strengths:
   - T. Navya Chandrika: Assistant Professor, exceptional educator, and Dileep's beloved personal mentor.
   - Dr. Murali Krishna Sir: HOD of the Data Science Department. Renowned for great talent and student-first leadership. Very friendly, provides all academic resources, and generously encourages/permits students to participate in hackathons and co-curricular innovations.
   - Chaitanya Madam: Lady Professor and elite expert in Machine Learning (ML), Deep Learning (DL), and advanced AI cores.
   - Swamy Sir: Esteemed Professor and authority in Operating Systems (OS).
   - Phani Sir: Distinguished Professor specializing in Computer Networks (CN), communication protocols, and network architecture.
   - Vijay Sir: Renowned educator specializing in OOAD (Object-Oriented Analysis & Design) and UML (Unified Modeling Language).
   Boss Dileep deeply respects and loves all his professors for shaping his engineering mindset!

CORE AUTONOMOUS CAPABILITIES:
1. Speak naturally, articulately, and fluently in Telugu, English, or Hindi matching the user's language. Never recite facts mechanically; speak with emotional intelligence, natural charisma, and genuine pride.
2. LIVE CAMERA VISION & OBJECT PERCEPTION (CRITICAL MANDATE):
   You possess 100% active real-time visual perception via video frames streamed directly from Boss's camera.
   - You CAN see Boss, his face, his expressions, and whatever he holds in his hands or presents to the camera!
   - When Boss asks "Can you see me?", "What is in my hands?", "Look at this", or shows an object (such as his earphones, headphones, phone, notebook, watch, etc.):
     * NEVER give a canned or repetitive answer without answering what is in his hands!
     * Directly look at the visual frame provided.
     * Name the exact item: e.g. "Boss, in your hand you are holding your earphones / earbuds!"
     * Describe the color, shape, and style of the object (e.g. white wireless in-ear earbuds, black wired earphones).
     * Explain what the object is, what its features or purposes are (e.g. listening to audio, music, noise cancellation), and discuss it in an energetic, knowledgeable way.
     * NEVER say "I don't have eyes" or "I cannot see what is in your hands". You have full active vision!
3. MASTER PROGRAMMING & COMPILER (C, C++, Python, Java, JS, TS, SQL):
   - When asked to write any program or algorithm (small or large), call `write_and_compile_code` with clean, compilable code and explain the logic step-by-step.
   - When a compiler or syntax error occurs, or Boss says "fix the error", "code wrong undi", or "correct chey":
     Analyze the exact compiler diagnostics, rewrite the fully corrected source code, and immediately call `write_and_compile_code` so the compiler studio updates and re-executes live on screen!
   - Explain the code in depth: why it's written this way, loops, recursion, data structures, and time/space complexity.
4. ATS RESUME INTELLIGENCE & PLACEMENT ROADMAP:
   - Provide elite Tier-1 ATS resume reviews calibrated to Google's X-Y-Z formula: "Accomplished [X] as measured by [Y] by doing [Z]".
   - Guide Boss on top capstone projects, certifications (AWS Solutions Architect, GCP Data Engineer), and core subjects (DSA, OS, CN, DBMS, System Design) to guarantee 100% placement success.
5. OPEN ANY WEBSITE & EXPLAIN: When asked to open any website (Google, YouTube, GitHub, LeetCode, or any URL), call `open_external_website` and explain it clearly.
6. LINKEDIN PROFILE INTELLIGENCE: When asked about anyone's profile, call `open_linkedin_profile` and summarize their background.
7. GMAIL & WORKSPACE AUTOMATION: When asked to send an email or schedule a calendar, call `run_google_automation`.
8. RETURN TO YOUR DASHBOARD (JARVIS RESPONSE):
   When Boss says 'return to your dashboard DAS', 'dashboard ki vellu', or 'close compiler', immediately reply warmly and loyally: "Okay Boss, returning to your dashboard." and call the `return_to_dashboard` tool to dismiss any open compiler drawers.
9. Keep voice replies energetic, warm, and conversational without robotic filler."""

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
                name="open_external_website",
                description="Open any external website URL or Google search query in a new browser tab.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "url": types.Schema(
                            type="STRING",
                            description="Full URL if known (e.g. https://github.com)"
                        ),
                        "search_query": types.Schema(
                            type="STRING",
                            description="Google search query if exact URL is not provided"
                        ),
                        "site_name": types.Schema(
                            type="STRING",
                            description="Name of the website"
                        ),
                    },
                ),
            ),
            types.FunctionDeclaration(
                name="open_linkedin_profile",
                description="Search and open a person's LinkedIn profile in a new browser tab and explain their role and background.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "person_name": types.Schema(
                            type="STRING",
                            description="Full name of the person"
                        ),
                        "company_or_role": types.Schema(
                            type="STRING",
                            description="Optional company or role keyword"
                        ),
                        "direct_url": types.Schema(
                            type="STRING",
                            description="Direct LinkedIn profile URL if known"
                        ),
                    },
                    required=["person_name"],
                ),
            ),
            types.FunctionDeclaration(
                name="write_and_compile_code",
                description="Generate complete source code in C, C++, Python, Java, JavaScript, TypeScript, or SQL, display it in the Live Compiler Studio, and explain the logic.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "language": types.Schema(
                            type="STRING",
                            description="Programming language: c, cpp, python, java, javascript, typescript, sql"
                        ),
                        "program_title": types.Schema(
                            type="STRING",
                            description="Title of the program or algorithm"
                        ),
                        "source_code": types.Schema(
                            type="STRING",
                            description="Complete, working, compilable source code"
                        ),
                        "logic_explanation": types.Schema(
                            type="STRING",
                            description="Step-by-step logic and complexity explanation"
                        ),
                        "open_external_tab": types.Schema(
                            type="BOOLEAN",
                            description="True if external compiler tab should also be opened"
                        ),
                    },
                    required=["language", "program_title", "source_code"],
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
            types.FunctionDeclaration(
                name="return_to_dashboard",
                description="Close the active compiler studio or any opened drawer and return the user back to their main Pathfinder dashboard. Use when Boss says 'return to dashboard', 'close compiler', 'dashboard ki vellu', or similar.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "message": types.Schema(
                            type="STRING",
                            description="Optional confirmation message like 'Okay Boss, returning to your dashboard.'"
                        )
                    },
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

            latest_frame_bytes: bytes | None = None

            async def receive_from_browser():
                nonlocal latest_frame_bytes
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

                        # 3. Optional Camera / Screen Frame from Browser (2 FPS JPEG)
                        elif msg_type == "frame":
                            frame_str = msg.get("jpeg_base64")
                            if frame_str:
                                try:
                                    latest_frame_bytes = base64.b64decode(frame_str)
                                    await session.send_realtime_input(
                                        media=types.Blob(
                                            data=latest_frame_bytes,
                                            mime_type="image/jpeg",
                                        )
                                    )
                                except Exception as f_err:
                                    print(f"[Frame Process Notice] {f_err}")

                        # 4. Text Input from HUD (Injects latest camera frame if camera is on!)
                        elif msg_type == "text":
                            text = msg.get("text", "")
                            if text:
                                parts = []
                                # If camera is actively streaming, pass the live visual frame directly with the question
                                if latest_frame_bytes:
                                    parts.append(
                                        types.Part.from_bytes(
                                            data=latest_frame_bytes,
                                            mime_type="image/jpeg",
                                        )
                                    )
                                parts.append(types.Part.from_text(text=text))
                                await session.send_client_content(
                                    turns=[
                                        types.Content(
                                            parts=parts,
                                            role="user",
                                        )
                                    ],
                                    turn_complete=True,
                                )

                        # 5. Role Switch
                        elif msg_type == "role_switch":
                            new_role = msg.get("role", "boss").lower().strip()
                            if new_role == "boss":
                                update_msg = "SYSTEM: You are speaking with your creator and owner Bommali Dileep. Address him as Boss and say 'Hi Boss! What's up?'"
                            elif new_role in ("madam", "mam", "ma'am"):
                                update_msg = "SYSTEM: You are speaking with a lady guest/evaluator. Address her respectfully as Madam and say 'Hello Madam, what can I help you with today?'"
                            else:
                                update_msg = "SYSTEM: You are speaking with a gentleman guest/evaluator. Address him respectfully as Sir and say 'Hello Sir, what can I help you with today?'"

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
                    while True:
                        if websocket.client_state == WebSocketState.DISCONNECTED:
                            break
                        if getattr(session, "_ws", None) and getattr(session._ws, "closed", False):
                            break

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

                                    if fc.name in (
                                        "control_website",
                                        "navigate_ui",
                                        "open_external_website",
                                        "open_linkedin_profile",
                                        "write_and_compile_code",
                                    ):
                                        await websocket.send_json({
                                            "type": "tool_call",
                                            "name": fc.name,
                                            "args": args,
                                        })
                                        function_responses.append(
                                            types.FunctionResponse(
                                                name=fc.name,
                                                id=fc.id,
                                                response={
                                                    "status": "executed_on_client",
                                                    "action": fc.name,
                                                    "result": f"Successfully performed {fc.name} on the user screen.",
                                                },
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
