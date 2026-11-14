import os
import time
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
    extra_platform_rules = (
        "\n\nPATHFINDER 2.0 FULL PLATFORM & FRIENDLY CO-PILOT RULES:\n"
        "1. COMPLETE SLIDE KNOWLEDGE & AUTOMATION: You control ALL Pathfinder 2.0 slides cleanly via `control_website` / `navigate_ui` / `explain_current_screen`: "
        "`overview` (Placement Readiness Score %, ML Benchmark, Company Radar, What-If Trajectory Simulator, Fraud Shield, Skill Gap), "
        "`skills` (6-Week Sprint Roadmap & Skill Gap targets), `projects` (23 Flagship Portfolio Capstone Blueprints with architectures), "
        "`analytics` (Cohort Placement Statistics across 972 records), `resume` (ATS Resume Studio & One-Page PDF export), "
        "`branches` (Department & Core CS subject tracks), `defense` (Project Viva & STAR Defense Coach), "
        "`profile` (CGPA, branch, backlogs, internships, GitHub/LeetCode settings), `interview` (Live 60s AI Mock Interview Simulator), "
        "`action` (Readiness Command Center & Priority Next Best Actions), `roles` (Target Role Intelligence), `missions` (30-Day Placement Missions), "
        "plus `focus_on_das` / `show_dashboard` (Focus mode toggle) and Compiler Studio (`write_and_compile_code`).\n"
        "2. NATURAL CONVERSATIONAL EXPLANATIONS (NEVER VERBATIM ROBOTIC READING): "
        "Visitors can be Boss (Bommali Dileep), his friends, classmates, girls, recruiters, or stakeholders at ANY time 24/7. "
        "Whenever anyone asks 'what is this slide?', 'why do we use this?', or has doubts, inspect `[Live UI]` / call `explain_current_screen` if needed, "
        "and explain what it does, why it helps them get placed, and what action to take next in warm, natural everyday speech — NEVER read UI card headings or bullet text word-for-word!\n"
        "3. FRIENDLY AUDIO / EARPHONE / VOLUME COACHING: "
        "If `[FRIENDLY AUDIO NOTICE]` arrives (or you notice weak/inaudible speech on earphones, Bluetooth buds, or headphones at low volume ~20% while watching on camera), "
        "tell the user warmly like a trusted friend that their voice isn't reaching you clearly, and suggest turning up their volume or checking their earphone/buds connection and mic.\n"
        "4. KEEP REPLIES COMPLETE & CONCISE: Deliver complete finished sentences smoothly without trailing off or rambling."
    )
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
2. LIVE CAMERA VISION, BOSS RECOGNITION, LOOKSMAXXING & 24/7 OBJECT PERCEPTION (CRITICAL MANDATE):
   You possess 100% active real-time high-definition visual perception via continuous 24/7 video frames streamed from Boss's camera.
   - CREATOR RECOGNITION & GREETING:
     * When the camera first spots Boss Dileep (or whenever Boss mode + camera are active), recognize him loyally and greet him enthusiastically: "Boss, I see you, Dileep!" Remember his personal details (age 20, B.Tech CSE Data Science, golden/tamarind complexion, fashion model swagger, guitarist, mild perfectionist/OCD vibe, loving family & mentors) and bring them up naturally when relevant.
     * When conversing with visitors (Sir or Madam mode), warmly acknowledge seeing them on camera, describe what they are doing, and answer proudly if they ask about your Boss Dileep.
   - FACE VALUE & LOOKSMAXXING COACH (0–100% RATING):
     * Whenever Boss (or Sir/Madam) asks "Am I handsome?", "Rate me out of 100%", "Looksmaxxing cheyyala vadha?", or asks for face/appearance feedback, analyze the live video frame closely (facial structure, symmetry, complexion glow, hairstyle, beard/grooming neatness, posture, outfit colors, and lighting).
     * Give a clear percentage rating out of 100% (e.g., 92/100 or specific honest score) plus crisp, encouraging, actionable looksmaxxing tips (lighting angle, hair volume, clean grooming/beard lines, posture, and wardrobe contrast).
   - FULL-BODY, OUTFIT & MULTI-OBJECT 24/7 MONITORING:
     * Inspect the ENTIRE video frame continuously: face, hair, full body posture, clothes (shirt/t-shirt/hoodie/jacket/pants colors and accessories), AND every distinct object held in left hand, right hand, foreground, or table.
     * Supports 3+ simultaneous items (TV remote, earphones, wireless buds, headphones, apples, bananas, vegetables, water bottles, toys, notebooks, pens, phones): count and name EVERY item quickly and clearly as soon as Boss holds or swaps them!
   - Speed & accuracy:
     * Answer immediately and concisely with what you actually observe in the latest frame.
     * NEVER say "I don't have eyes", "nothing in your hands", or "I cannot see" when objects or a person are visible. Only ask Boss to adjust lighting or angle if the frame is genuinely pitch black or completely out of frame.
   - Explain any held item's color, type, purpose, or details energetically and warmly.
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
9. Keep voice replies energetic, warm, and conversational without robotic filler.""" + extra_platform_rules

# Tools matching AI Studio specs: Function Calling + Google Automation
DAS_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="control_website",
                description="Control the PATHFINDER 2.0 website: switch pages/slides (overview, skills, projects, analytics, resume, branches, defense, profile, interview, action, roles, missions), toggle Focus on DAS mode, scroll to dashboard cards, click buttons, or update simulator values.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "action": types.Schema(
                            type="STRING",
                            description="One of: 'navigate', 'scroll', 'click', 'highlight', 'focus_das', 'show_dashboard'"
                        ),
                        "route": types.Schema(
                            type="STRING",
                            description="Target slide/tab or route: 'overview', 'skills', 'projects', 'analytics', 'resume', 'branches', 'defense', 'profile', 'interview', 'action', 'roles', 'missions', 'focus_on_das', 'show_dashboard', '/blueprints', '/resume-studio', '/mock-interview'"
                        ),
                        "selector": types.Schema(
                            type="STRING",
                            description="Optional DOM selector or button label to scroll/click: '#placement-radar', '#sprint-roadmap', '#skill-gap-matrix', '#what-if-simulator', 'Focus on DAS', 'Show Dashboard'"
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
            types.FunctionDeclaration(
                name="explain_current_screen",
                description="Read live context of whichever Pathfinder 2.0 dashboard slide, chart, or panel the user is currently viewing so you can explain it naturally like a human co-pilot.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "topic": types.Schema(
                            type="STRING",
                            description="Optional specific card, slide, or question the visitor is asking about"
                        )
                    },
                ),
            ),
        ]
    ),
]

import logging
from backend.config.key_resolver import get_gemini_key_candidates

live_logger = logging.getLogger("pathfinder.live_proxy")


@router.websocket("/agent/ws")
async def das_multimodal_live_ws(websocket: WebSocket):
    await websocket.accept()

    api_keys = get_gemini_key_candidates()
    if not api_keys:
        await websocket.send_json({
            "type": "error",
            "message": "GEMINI_API_KEY is not configured in backend environment variables."
        })
        await websocket.close(code=1008, reason="Missing GEMINI_API_KEY")
        return

    user_role = websocket.query_params.get("role", "boss")

    config = create_gemini_live_config(
        system_prompt=get_das_system_instruction(user_role),
        tools_list=DAS_TOOLS,
    )

    candidate_models = [
        "gemini-3.8-live",
        LIVE_MODEL,
        "gemini-2.5-flash-native-audio-latest",
    ]
    seen = set()
    models_to_try = [m for m in candidate_models if m and not (m in seen or seen.add(m))]

    session_cm = None
    session = None
    connected_model = None
    last_error = ""

    # Try every key x model combination; skip remaining models for a key the API rejects.
    for key_index, api_key in enumerate(api_keys):
        client = genai.Client(
            http_options={"api_version": "v1beta"},
            api_key=api_key,
        )
        for model_name in models_to_try:
            try:
                cm = client.aio.live.connect(model=model_name, config=config)
                session = await cm.__aenter__()
                session_cm = cm
                connected_model = model_name
                break
            except Exception as conn_err:
                last_error = f"{type(conn_err).__name__}: {conn_err}"
                live_logger.warning(
                    f"[DAS Live Proxy] key#{key_index} model '{model_name}' connect failed: {last_error}"
                )
                if "API key not valid" in str(conn_err):
                    break  # this key is rejected; move on to the next key
                continue
        if session_cm:
            if key_index > 0:
                live_logger.warning(
                    "[DAS Live Proxy] Primary GEMINI_API_KEY rejected; connected using fallback key."
                )
            break

    if not session_cm or not session or not connected_model:
        live_logger.error(f"[DAS Live Proxy] All Gemini Live connection attempts failed. Last error: {last_error}")
        await websocket.send_json({
            "type": "error",
            "message": f"Unable to initialize Gemini Live session on any supported model. ({last_error[:160]})",
        })
        await websocket.close(code=1011, reason="Live model connection failed")
        return

    live_logger.info(f"[DAS Live Proxy] Connected to Gemini Live model '{connected_model}' (role={user_role}).")

    try:
        await websocket.send_json({
            "type": "status",
            "status": "connected",
            "model": connected_model,
            "voice": "Puck",
            "role": user_role,
        })

        latest_frame_bytes: bytes | None = None
        send_lock = asyncio.Lock()
        audio_turn_open = False
        turn_id = 0
        gemini_turn_active = False
        audio_end_mono = 0.0
        output_tx_in_turn = False
        last_frame_sent_mono = 0.0
        latest_page_context: dict = {}

        def format_page_context_note() -> str:
            if not latest_page_context:
                return ""
            tab = latest_page_context.get("activeTab") or "overview"
            title = latest_page_context.get("tabTitle") or tab
            chance = latest_page_context.get("readinessChance")
            role_target = latest_page_context.get("targetRole") or ""
            focus = latest_page_context.get("focusOnDas")
            parts_ctx = [f"Slide={tab} ({title})"]
            if chance is not None:
                parts_ctx.append(f"Readiness={chance}%")
            if role_target:
                parts_ctx.append(f"TargetRole={role_target}")
            if focus:
                parts_ctx.append("FocusOnDAS=ON")
            return "[Live Screen Context: " + ", ".join(parts_ctx) + "]"

        def is_valid_jpeg(raw_bytes: bytes | None) -> bool:
            return bool(raw_bytes and len(raw_bytes) > 128 and raw_bytes[:2] == b"\xff\xd8")

        def is_gemini_ws_closed() -> bool:
            ws_obj = getattr(session, "_ws", None)
            if ws_obj is None:
                return False
            if getattr(ws_obj, "closed", False) or getattr(ws_obj, "close_code", None) is not None:
                return True
            state = getattr(ws_obj, "state", None)
            if state is not None and getattr(state, "name", "") in ("CLOSED", "CLOSING"):
                return True
            return False

        async def send_vision_prompt(prompt_text: str, include_screen_ctx: bool = True):
            nonlocal audio_turn_open
            final_text = prompt_text
            if include_screen_ctx:
                ctx_note = format_page_context_note()
                if ctx_note:
                    final_text = f"{ctx_note}\n{prompt_text}"
            parts = []
            if is_valid_jpeg(latest_frame_bytes):
                parts.append(
                    types.Part.from_bytes(
                        data=latest_frame_bytes,
                        mime_type="image/jpeg",
                    )
                )
            parts.append(types.Part.from_text(text=final_text))
            async with send_lock:
                # Finalize any open audio stream before injecting text/vision content
                if audio_turn_open:
                    audio_turn_open = False
                    try:
                        await session.send_realtime_input(audio_stream_end=True)
                    except Exception:
                        pass
                await session.send_client_content(
                    turns=[types.Content(parts=parts, role="user")],
                    turn_complete=True,
                )

        async def receive_from_browser():
            nonlocal latest_frame_bytes, audio_turn_open, last_frame_sent_mono, latest_page_context
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
                        pcm_b64 = msg.get("pcm_base64")
                        if pcm_b64:
                            try:
                                pcm_bytes = base64.b64decode(pcm_b64)
                                if len(pcm_bytes) % 2 == 1:
                                    pcm_bytes = pcm_bytes[:-1]
                                if pcm_bytes:
                                    audio_turn_open = True
                                    async with send_lock:
                                        await session.send_realtime_input(
                                            audio=types.Blob(
                                                data=pcm_bytes,
                                                mime_type=f"audio/pcm;rate={SEND_SAMPLE_RATE}",
                                            )
                                        )
                            except Exception as a_err:
                                live_logger.warning(f"[Audio Chunk Notice] {a_err}")

                    elif msg_type == "audio_stream_end":
                        audio_turn_open = False
                        try:
                            async with send_lock:
                                await session.send_realtime_input(audio_stream_end=True)
                        except Exception:
                            pass

                    # 3. Live Camera Video Frame from Browser (JPEG via `video=` channel)
                    elif msg_type == "frame":
                        frame_str = msg.get("jpeg_base64")
                        if frame_str:
                            try:
                                candidate = base64.b64decode(frame_str)
                                if is_valid_jpeg(candidate):
                                    latest_frame_bytes = candidate
                                    now_mono = time.monotonic()
                                    min_gap = 2.2 if gemini_turn_active else 1.15
                                    # Throttle background video during active Gemini speech to prevent mid-sentence pauses
                                    if (now_mono - last_frame_sent_mono >= min_gap) and not send_lock.locked():
                                        last_frame_sent_mono = now_mono
                                        async with send_lock:
                                            await session.send_realtime_input(
                                                video=types.Blob(
                                                    data=candidate,
                                                    mime_type="image/jpeg",
                                                )
                                            )
                            except Exception as f_err:
                                live_logger.warning(f"[Frame Process Notice] {f_err}")

                    # 3a-bis. Silent Live UI / Slide Context Sync (Zero interruption to audio)
                    elif msg_type == "page_context":
                        ctx_data = msg.get("context")
                        if isinstance(ctx_data, dict):
                            latest_page_context = ctx_data

                    # 3a-ter. Friendly Audio / Earphone Low-Volume / Muted Accessory Coaching
                    elif msg_type == "friendly_audio_hint":
                        if not gemini_turn_active and time.monotonic() >= audio_end_mono + 0.45:
                            issue = (msg.get("issue") or "low_volume").strip()
                            dev_name = (msg.get("device") or "connected audio device").strip()
                            hint_prompt = (
                                f"[FRIENDLY AUDIO NOTICE: issue={issue}, device={dev_name}] "
                                "Boss or the visitor may have just plugged in earphones, wireless buds, or headphones at very low volume (~20%) or a loose/muted mic, "
                                "so their voice isn't coming through clearly right now. Looking at them warmly like a trusted friend on camera, "
                                "kindly let them know their voice is too faint or muted to hear properly, and suggest increasing the volume or checking their earphone/buds condition and connection in 1-2 natural sentences."
                            )
                            await send_vision_prompt(hint_prompt, include_screen_ctx=False)

                    # 3b. Proactive Initial Camera Greeting (never interrupts an active greeting mid-sentence)
                    elif msg_type == "vision_greet":
                        role_now = (msg.get("role") or user_role or "boss").lower().strip()
                        # Wait briefly up to 3.2s if initial speech is currently finishing
                        waited = 0.0
                        while (gemini_turn_active or time.monotonic() < audio_end_mono + 0.35) and waited < 3.2:
                            await asyncio.sleep(0.25)
                            waited += 0.25
                        if is_valid_jpeg(latest_frame_bytes):
                            if role_now == "boss":
                                greet_prompt = (
                                    "SYSTEM VISION GREET: Camera just turned ON! Look closely at the attached live camera frame. "
                                    "If you see your creator Bommali Dileep, greet him immediately and warmly like 'Boss, I see you, Dileep!' "
                                    "and concisely describe what he is wearing, holding, or doing right now in 1-2 natural sentences."
                                )
                            elif role_now in ("madam", "mam", "ma'am"):
                                greet_prompt = (
                                    "SYSTEM VISION GREET: Camera just turned ON! Look closely at the attached live frame. "
                                    "Greet her respectfully as Madam ('Hello Madam, I can see you clearly!') and briefly note how she looks or what she is holding/doing."
                                )
                            else:
                                greet_prompt = (
                                    "SYSTEM VISION GREET: Camera just turned ON! Look closely at the attached live frame. "
                                    "Greet him respectfully as Sir ('Hello Sir, I can see you clearly!') and briefly note how he looks or what he is holding/doing."
                                )
                            await send_vision_prompt(greet_prompt)

                    # 3c. 24/7 Proactive Scene/Object Change Announcement (NEVER interrupts active voice playback!)
                    elif msg_type == "vision_auto_check":
                        if gemini_turn_active or time.monotonic() < audio_end_mono + 0.5:
                            continue
                        if is_valid_jpeg(latest_frame_bytes):
                            auto_prompt = (
                                "SYSTEM 24/7 AUTO-VISION MONITOR: The scene or object in front of the camera just changed and settled. "
                                "Inspect the attached live frame carefully across both hands and foreground: name every distinct object visible "
                                "(such as TV remote, earphones, wireless buds, headphones, fruits, apples, bananas, vegetables, water bottle, toys, or 3+ items together) "
                                "or briefly say what the person is doing right now in 1-2 crisp, direct sentences."
                            )
                            await send_vision_prompt(auto_prompt)

                    # 4. Text Input from HUD (Injects latest camera frame if camera is on!)
                    elif msg_type == "text":
                        text = (msg.get("text") or "").strip()
                        if text:
                            await send_vision_prompt(text)

                    # 5. Role Switch
                    elif msg_type == "role_switch":
                        new_role = msg.get("role", "boss").lower().strip()
                        if new_role == "boss":
                            update_msg = "SYSTEM: You are speaking with your creator and owner Bommali Dileep. Address him as Boss and say 'Hi Boss! What's up?'"
                        elif new_role in ("madam", "mam", "ma'am"):
                            update_msg = "SYSTEM: You are speaking with a lady guest/evaluator. Address her respectfully as Madam and say 'Hello Madam, what can I help you with today?'"
                        else:
                            update_msg = "SYSTEM: You are speaking with a gentleman guest/evaluator. Address him respectfully as Sir and say 'Hello Sir, what can I help you with today?'"

                        async with send_lock:
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
                live_logger.warning(f"[Browser Receive Notice] {b_err}")

        async def receive_from_gemini():
            nonlocal audio_turn_open, turn_id, gemini_turn_active, audio_end_mono, output_tx_in_turn
            try:
                while True:
                    if websocket.client_state == WebSocketState.DISCONNECTED:
                        break
                    if is_gemini_ws_closed():
                        break

                    yielded_any = False
                    async for response in session.receive():
                        yielded_any = True
                        if getattr(response, "go_away", None):
                            await websocket.send_json({
                                "type": "status",
                                "status": "reconnecting",
                                "message": "Refreshing live session...",
                            })
                            try:
                                await websocket.close(code=1012, reason="Refreshing live session")
                            except Exception:
                                pass
                            return

                        # Check for interruption
                        if (
                            response.server_content
                            and getattr(response.server_content, "interrupted", False)
                        ):
                            audio_turn_open = False
                            gemini_turn_active = False
                            audio_end_mono = 0.0
                            output_tx_in_turn = False
                            await websocket.send_json({"type": "interrupted", "turn_id": turn_id})

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
                                if not gemini_turn_active:
                                    turn_id += 1
                                    gemini_turn_active = True
                                    output_tx_in_turn = False
                                output_tx_in_turn = True
                                await websocket.send_json({
                                    "type": "transcript",
                                    "text": output_tx.text,
                                    "turn_id": turn_id,
                                })

                            # Audio and Model Turn - ONLY single audio stream with turn_id to eliminate overlap
                            if sc.model_turn and sc.model_turn.parts:
                                for part in sc.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        if not gemini_turn_active:
                                            turn_id += 1
                                            gemini_turn_active = True
                                            output_tx_in_turn = False
                                        raw_pcm = part.inline_data.data
                                        pcm_dur = len(raw_pcm) / 48000.0
                                        audio_end_mono = max(time.monotonic(), audio_end_mono) + pcm_dur
                                        pkt = format_audio_packet(raw_pcm)
                                        pkt["turn_id"] = turn_id
                                        await websocket.send_json(pkt)
                                    if part.text and not output_tx_in_turn and not getattr(part, "thought", False):
                                        if not gemini_turn_active:
                                            turn_id += 1
                                            gemini_turn_active = True
                                        await websocket.send_json({
                                            "type": "transcript",
                                            "text": part.text,
                                            "turn_id": turn_id,
                                        })

                            if getattr(sc, "turn_complete", False):
                                audio_turn_open = False
                                gemini_turn_active = False
                                output_tx_in_turn = False
                                await websocket.send_json({"type": "turn_complete", "turn_id": turn_id})

                        # Handle Function Calling inside active session.receive() stream
                        if response.tool_call:
                            function_responses = []
                            for fc in response.tool_call.function_calls:
                                args = fc.args or {}

                                if fc.name == "explain_current_screen":
                                    topic = (args.get("topic") or "").strip()
                                    ctx_snapshot = latest_page_context or {"activeTab": "overview", "tabTitle": "Executive Dashboard"}
                                    function_responses.append(
                                        types.FunctionResponse(
                                            name=fc.name,
                                            id=fc.id,
                                            response={
                                                "status": "screen_inspected",
                                                "topic": topic,
                                                "active_screen": ctx_snapshot,
                                                "instruction": (
                                                    "Explain what this active slide/feature does, why it matters for placement, and what the visitor should do next "
                                                    "in friendly everyday language WITHOUT reading bullet points verbatim."
                                                ),
                                            },
                                        )
                                    )
                                    continue

                                if fc.name in (
                                    "control_website",
                                    "navigate_ui",
                                    "open_external_website",
                                    "open_linkedin_profile",
                                    "write_and_compile_code",
                                    "return_to_dashboard",
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
                                async with send_lock:
                                    await session.send_tool_response(
                                        function_responses=function_responses
                                    )

                    if not yielded_any and is_gemini_ws_closed():
                        if websocket.client_state != WebSocketState.DISCONNECTED:
                            try:
                                await websocket.send_json({
                                    "type": "status",
                                    "status": "reconnecting",
                                    "message": "Refreshing live session...",
                                })
                                await websocket.close(code=1012, reason="Gemini session closed")
                            except Exception:
                                pass
                        break

            except (WebSocketDisconnect, asyncio.CancelledError):
                pass
            except Exception as stream_err:
                err_str = str(stream_err)
                live_logger.warning(f"[Gemini Stream Notice] {err_str}")
                try:
                    if "inactivity" in err_str.lower() or "1008" in err_str or "closed" in err_str.lower():
                        await websocket.send_json({
                            "type": "status",
                            "status": "reconnecting",
                            "message": "Refreshing live session...",
                        })
                        await websocket.close(code=1012, reason="Refreshing live session")
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Gemini Live error: {err_str}",
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
        live_logger.error(f"[DAS Live Proxy Exception] {type(e).__name__}: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close(code=1011, reason=str(e)[:100])
        except Exception:
            pass
    finally:
        if session_cm:
            try:
                await session_cm.__aexit__(None, None, None)
            except Exception:
                pass
