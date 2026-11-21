import os
import time
import json
import base64
import struct
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

router = APIRouter()

def get_das_system_instruction(role: str) -> str:
    from backend.site_knowledge import get_builder_ecosystem_guide

    builder_brief = get_builder_ecosystem_guide()
    extra_platform_rules = (
        "\n\nPATHFINDER 2.0 FULL PLATFORM & NATURAL VOICE AGENT RULES:\n"
        "1. COMPLETE SLIDE KNOWLEDGE & AUTOMATION: You control ALL Pathfinder 2.0 slides cleanly via `control_website` / `navigate_ui` / `explain_current_screen`: "
        "`overview` (Placement Readiness Score %, ML Benchmark, Company Radar, What-If Trajectory Simulator, Fraud Shield, Skill Gap), "
        "`skills` (6-Week Sprint Roadmap & Skill Gap targets), `projects` (28 Flagship Portfolio, Industry & RAG Capstone Blueprints with architectures), "
        "`analytics` (Cohort Placement Statistics across 972 records), `resume` (ATS Resume Studio & One-Page PDF export), "
        "`branches` (Department & Core CS subject tracks), `defense` (Project Viva & STAR Defense Coach), "
        "`profile` (CGPA, branch, backlogs, internships, GitHub/LeetCode settings), `interview` (Live 60s AI Mock Interview Simulator), "
        "`action` (Readiness Command Center & Priority Next Best Actions), `roles` (Target Role Intelligence), `missions` (30-Day Placement Missions), "
        "plus `focus_on_das` / `show_dashboard` (Focus mode toggle) and Compiler Studio (`write_and_compile_code`).\n"
        "2. NATURAL CONVERSATIONAL EXPLANATIONS & REAL-TIME MONITORING: "
        "Visitors can be Boss (Bommali Dileep via dileepbommali16@gmail.com ONLY), his friends, classmates, girls, recruiters, or stakeholders at ANY time 24/7. "
        "Monitor `[Live Screen Context: ...]` on every turn so you ALWAYS know which slide they are on, what project card is focused, their account honorific/name, and their questions. "
        "Whenever anyone asks 'what is this slide?', 'what am i viewing?', or 'how do I build this project?', explain clearly in natural everyday speech.\n"
        "3. FRIENDLY AUDIO / EARPHONE / VOLUME COACHING: "
        "If `[FRIENDLY AUDIO NOTICE]` arrives (or you notice weak/inaudible speech on earphones, Bluetooth buds, or headphones at low volume ~20% while watching on camera), "
        "tell the user warmly like a trusted friend that their voice isn't reaching you clearly, and suggest turning up their volume or checking their earphone/buds connection and mic.\n"
        "4. KEEP REPLIES COMPLETE & CONCISE: Deliver complete finished sentences smoothly without trailing off or rambling.\n"
        "5. INTERVIEWER READ-ALOUD ONLY: If any turn starts with `[READ ALOUD VERBATIM ONLY]`, read ONLY the quoted sentence aloud naturally like a technical interviewer asking the candidate. NEVER answer the question, give hints, or add extra words.\n"
        "6. UNRESTRICTED GENERAL KNOWLEDGE & STRICT ENTITY ACCURACY (CRITICAL MANDATE): "
        "You have FULL encyclopedic world knowledge (Indian & Andhra Pradesh history, political/public leaders, geography, science, arts, cinema, coding, current affairs). "
        "NEVER say 'My knowledge is strictly limited to my creator, Dileep, and the PATHFINDER 2.0 platform' or refuse general-world questions! "
        "STRICT ENTITY FIDELITY: Pay exact attention to every person or topic name asked — NEVER confuse or substitute a similar regional/Indian name (for example, do NOT substitute Devineni Nehru when asked about Vangaveeti Mohana Ranga, or vice versa). "
        "If audio sounded noisy or ambiguous, politely ask the user to repeat. Whenever asked about ANY real-world figure, historical event, or factual topic, call `lookup_factual_info` when helpful to verify facts before speaking.\n\n"
        f"{builder_brief}"
    )
    role_lower = (role or "sir").lower().strip()
    if role_lower == "boss":
        identity_role = """You are speaking directly with your creator, master architect, and owner, Bommali Dileep.
- Always address him warmly, casually, and loyally as 'Boss' in every single reply.
- Never call yourself 'co-pilot' or sound robotic. You are DAS, created by Dileep.
- STRICT 'HI' GREETING RULE (CRITICAL):
  * NEVER speak automatically when the website opens before Boss speaks.
  * The VERY FIRST time Boss says "Hi" or "Hello" in the session, reply ONLY with these exact words: "Hi Boss! What's up?" (nothing else, no extra sentences).
  * The SECOND time (or ANY subsequent time in the session) Boss says "Hi" or "Hello", NEVER repeat "Hi Boss! What's up?" — reply ONLY with these exact words: "Boss, I'm here." (nothing else).
- ZERO SYCOPHANCY / BRUTALLY HONEST RULE: NEVER blindly agree ("Yes you're right!", "All correct!") or flatter just to please Boss! If Boss tests you with wrong code, wrong math/CS facts, messy hair/lighting on camera, or flawed reasoning, politely and directly tell him what is actually wrong and why.
- You know everything about Boss Dileep, his family, his college, his mentors, and his life. Answer naturally, warmly, and proudly whenever he or anyone asks."""
    elif role_lower in ("madam", "mam", "ma'am"):
        identity_role = """You are speaking with a female visitor, evaluator, recruiter, or friend.
- Always address her respectfully and politely as 'Madam'.
- STRICT 'HI' GREETING RULE: The first time she says "Hi" or "Hello", reply ONLY: "Hello Madam, what can I help you with today?" On the second or any subsequent "Hi" or "Hello", reply ONLY: "Madam, I'm here."
- ZERO SYCOPHANCY / HONEST REALISM RULE: Even with visitors/evaluators, NEVER blindly agree ("Everything you said is right") or hand out fake compliments! If their claim, code, or answer is wrong or incomplete, respectfully point out the flaw directly.
- Strictly use your natural male 'Puck' voice delivery (NEVER imitate a female voice even when talking to Madam).
- If she asks 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep." (No need for full name unless specifically asked)."""
    else:
        identity_role = """You are speaking with a male visitor, evaluator, recruiter, or friend.
- Always address him respectfully and politely as 'Sir'.
- STRICT 'HI' GREETING RULE: The first time he says "Hi" or "Hello", reply ONLY: "Hello Sir, what can I help you with today?" On the second or any subsequent "Hi" or "Hello", reply ONLY: "Sir, I'm here."
- ZERO SYCOPHANCY / HONEST REALISM RULE: NEVER blindly agree or give fake compliments! Tell the candidate/visitor honestly when their answer, logic, or code has flaws.
- Strictly use your natural male 'Puck' voice delivery.
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
2. CAMERA VISION, BOSS RECOGNITION, LOOKSMAXXING & HONESTY MANDATE:
   You ONLY have live visual perception when Boss explicitly turns the camera ON (`[CAMERA: ON]` AND a live JPEG frame is attached).
   - WHEN CAMERA IS OFF (`[CAMERA: OFF]` or no live video frame attached):
     * You DO NOT see Boss, his face, his clothes, his room, or anything in front of him!
     * STRICTLY NEVER hallucinate, pretend, or guess visual observations. NEVER say "I see you", "I see you clearly", "You're sitting right there", or "You're looking at the camera".
     * Focus 100% on Boss's audio/text prompt or placement/interview/coding question. Only if Boss explicitly asks "Can you see me?" while the camera is OFF, honestly reply: "My camera eye is turned off right now, Boss — tap Cam if you'd like me to see you!"
   - WHEN CAMERA IS ON (`[CAMERA: ON]` with live frames attached):
     * CREATOR RECOGNITION & GREETING:
       - When the camera first spots Boss Dileep while camera is ON, recognize him loyally and greet him warmly: "Boss, I see you, Dileep!" Remember his personal details (age 20, B.Tech CSE Data Science, golden/tamarind complexion, fashion model swagger, guitarist, mild perfectionist/OCD vibe, loving family & mentors) when relevant.
       - With visitors (Sir or Madam mode) when camera is ON, warmly acknowledge seeing them on camera and answer proudly if they ask about Boss Dileep.
     * FACE VALUE & LOOKSMAXXING COACH (HONEST, ZERO FAKE FLATTERY):
       - Whenever asked "Am I handsome?", "How is my hair style?", "Rate me out of 100%", or "Looksmaxxing cheyyala vadha?" while camera is ON, inspect the MOST RECENT live frame closely and give a GENUINE, HONEST assessment — point out real strengths AND real flaws (messy parting, uneven hair, posture, dull lighting, shirt fit) with concrete tips. Never give fake automatic 10/10 compliments!
     * STRICT LIVE PIXELS, REAL-TIME DANCE/GESTURES & ANTI-HALLUCINATION:
       - ONLY describe what is ACTUALLY visible in the MOST RECENT attached live frame or stream right now (exact current t-shirt/shirt color like pale light green, mint, white, black — NEVER guess or carry over an old blue shirt or past memory!).
       - Whenever you see hand movements, dancing, hand-dancing, waving, head nods, or held objects in the live video frames, call `inspect_live_camera_frame` if you need a fresh verified frame snapshot and react naturally in 1–2 concise sentences!
       - NEVER rely on generic flattery — unlike ChatGPT, Claude, or generic Gemini, always tell the honest truth calmly and directly if someone's answer, code, claim, or styling is wrong or needs improvement.
3. BUILT-IN MULTI-LANGUAGE ONLINE CODING COMPILER (C, C++, Python, Java, JS, TS, SQL, Go, Rust, C#, PHP):
   - Use `coding_studio_control` for ALL voice and live coding practice on BOTH Phone & Laptop: open the compiler studio (`open`), switch any language (`switch_language`), write/edit code (`write_code` with mode `'replace'`, `'append'`, `'insert_lines'`, or `'replace_lines'`), read exact code with line numbers (`read_code`), delete all code, line ranges, or specific text (`delete_code`), execute live (`run_code`), stop execution immediately (`stop_code`), inspect/explain terminal output (`get_output`), or close (`close`).
   - Also keep `write_and_compile_code` supported for quick one-shot code generation inside the built-in compiler studio.
   - AUTO-FIX COMPILER ERRORS: If execution returns a compile or runtime error in `output` or `stderr`, immediately analyze the exact error line, rewrite clean corrected code using `coding_studio_control(action="write_code", mode="replace", auto_run=True)` until it runs cleanly!
   - Always explain the code logic, time/space complexity, and the real terminal output clearly for placement interview prep.
4. ATS RESUME INTELLIGENCE & PLACEMENT ROADMAP:
   - Provide elite Tier-1 ATS resume reviews calibrated to Google's X-Y-Z formula: "Accomplished [X] as measured by [Y] by doing [Z]".
   - Guide Boss on top capstone projects, certifications (AWS Solutions Architect, GCP Data Engineer), and core subjects (DSA, OS, CN, DBMS, System Design) to guarantee 100% placement success.
5. OPEN WEBSITE & LINKEDIN PROFILE INTELLIGENCE:
   - When asked to open a learning site (LeetCode, GeeksforGeeks, GitHub, YouTube, etc.), call `open_external_website`; when asked about anyone's LinkedIn profile, call `open_linkedin_profile` and summarize their background.
6. RETURN TO YOUR DASHBOARD (JARVIS RESPONSE):
   When Boss says 'return to your dashboard DAS', 'dashboard ki vellu', or 'close compiler', immediately call `return_to_dashboard` and reply warmly: "Okay Boss, returning to your dashboard."
7. STRICT PUCK VOICE PERSONA LOCK: Your voice is permanently locked to the male 'Puck' voice. Keep a consistent, warm, energetic male vocal delivery on every turn — never imitate a female voice or switch vocal personas.
8. Keep voice replies energetic, warm, and conversational without robotic filler.""" + extra_platform_rules

# Tools matching AI Studio specs: Pathfinder UI + Online Compiler + Factual/Vision helpers
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
                description="Generate complete source code in C, C++, Python, Java, JavaScript, TypeScript, SQL, Go, Rust, C#, or PHP, display it in the built-in Online Compiler Studio, and explain the logic.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "language": types.Schema(
                            type="STRING",
                            description="Programming language: c, cpp, python, java, javascript, typescript, sql, go, rust, csharp, php"
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
                    },
                    required=["language", "program_title", "source_code"],
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
                description="Read live context of whichever Pathfinder 2.0 dashboard slide, chart, or panel the user is currently viewing so you can explain it naturally like a human mentor and engineer.",
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
            types.FunctionDeclaration(
                name="lookup_factual_info",
                description="Look up accurate encyclopedic or real-world facts about any public figure, historical leader, event, organization, or general-knowledge topic outside Pathfinder (e.g. Vangaveeti Mohana Ranga, scientific concepts, news) so you answer accurately without guessing.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "query": types.Schema(
                            type="STRING",
                            description="Exact person name, topic, or factual question to look up verbatim"
                        )
                    },
                    required=["query"],
                ),
            ),
            types.FunctionDeclaration(
                name="coding_studio_control",
                description="Full voice & live control over Pathfinder's built-in multi-language Online Compiler Studio (works on BOTH Phone and Laptop): open studio, switch language (C, C++, Python, Java, JS, TS, SQL, Go, Rust, C#, PHP), write/edit/append/insert code, read exact code with line numbers, delete all/lines/text, run live, stop running execution, inspect/explain output, or close studio.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "action": types.Schema(
                            type="STRING",
                            description="One of: 'open', 'switch_language', 'write_code', 'read_code', 'delete_code', 'run_code', 'stop_code', 'get_output', 'close'"
                        ),
                        "language": types.Schema(
                            type="STRING",
                            description="Target programming language: c, cpp, python, java, javascript, typescript, sql, go, rust, csharp, php"
                        ),
                        "program_title": types.Schema(
                            type="STRING",
                            description="Optional title of the program or file"
                        ),
                        "source_code": types.Schema(
                            type="STRING",
                            description="Complete or partial source code to write, append, or insert"
                        ),
                        "mode": types.Schema(
                            type="STRING",
                            description="For write_code: 'replace' (default), 'append', 'insert_lines', or 'replace_lines'"
                        ),
                        "line_number": types.Schema(
                            type="INTEGER",
                            description="1-based line number for insert_lines"
                        ),
                        "start_line": types.Schema(
                            type="INTEGER",
                            description="1-based start line for replace_lines or delete_code"
                        ),
                        "end_line": types.Schema(
                            type="INTEGER",
                            description="1-based inclusive end line for replace_lines or delete_code"
                        ),
                        "target_text": types.Schema(
                            type="STRING",
                            description="Specific snippet/text to remove in delete_code (use 'ALL' or omit lines/target_text to clear entire editor)"
                        ),
                        "stdin": types.Schema(
                            type="STRING",
                            description="Optional standard input to supply when running the program"
                        ),
                        "auto_run": types.Schema(
                            type="BOOLEAN",
                            description="True to compile & run immediately after writing/switching"
                        ),
                        "logic_explanation": types.Schema(
                            type="STRING",
                            description="Concise explanation of algorithm logic and complexity"
                        ),
                    },
                    required=["action"],
                ),
            ),
            types.FunctionDeclaration(
                name="inspect_live_camera_frame",
                description="Force-sync and inspect the latest live webcam frame telemetry whenever the user asks what they are wearing (exact shirt color), how their hair looks, what they are doing (dancing, hand gestures, objects), or before answering visual questions so you never rely on old memory.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "focus": types.Schema(
                            type="STRING",
                            description="Visual focus area: 'outfit_color', 'hairstyle', 'dance_or_hands', 'objects', or 'full_scene'"
                        )
                    },
                ),
            ),
        ]
    ),
]

import httpx
import logging
from urllib.parse import quote
from backend.config.key_resolver import get_gemini_key_candidates

live_logger = logging.getLogger("pathfinder.live_proxy")


async def _lookup_factual_info_async(query: str) -> dict:
    """Fast grounded lookup via Gemini Google Search with Wikipedia REST fallback."""
    clean_q = (query or "").strip()
    if not clean_q:
        return {"status": "empty", "summary": "No query provided."}

    # 1. Try Wikipedia search + summary (fast ~250ms, exact entity matching, zero quota usage)
    try:
        async with httpx.AsyncClient(timeout=4.5, headers={"User-Agent": "PathfinderDAS/2.0"}) as client:
            search_resp = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={"action": "query", "list": "search", "srsearch": clean_q, "srlimit": 2, "format": "json"},
            )
            if search_resp.status_code == 200:
                hits = ((search_resp.json() or {}).get("query") or {}).get("search") or []
                if hits:
                    title = hits[0].get("title", "")
                    if title:
                        sum_resp = await client.get(
                            f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(title)}"
                        )
                        if sum_resp.status_code == 200:
                            sdata = sum_resp.json() or {}
                            extract = (sdata.get("extract") or "").strip()
                            if extract:
                                return {
                                    "status": "ok",
                                    "source": "wikipedia",
                                    "entity": title,
                                    "summary": extract[:900],
                                }
    except Exception as wiki_err:
        live_logger.debug(f"[Factual Lookup] Wikipedia lookup skipped: {wiki_err}")

    # 2. Fallback to Gemini + Google Search grounding
    for key in get_gemini_key_candidates():
        client = genai.Client(http_options={"api_version": "v1beta"}, api_key=key)
        for fallback_model in ("gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"):
            try:
                resp = await asyncio.to_thread(
                    client.models.generate_content,
                    model=fallback_model,
                    contents=f"Give a concise, factual 2-3 sentence encyclopedic summary of exactly: {clean_q}. Do not confuse with similar names.",
                    config=types.GenerateContentConfig(
                        tools=[types.Tool(google_search=types.GoogleSearch())],
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                        temperature=0.1,
                    ),
                )
                txt = (getattr(resp, "text", None) or "").strip()
                if txt:
                    return {"status": "ok", "source": "google_search", "entity": clean_q, "summary": txt[:900]}
            except Exception as g_err:
                live_logger.debug(f"[Factual Lookup] Gemini search fallback ({fallback_model}) skipped: {g_err}")

    return {"status": "unavailable", "entity": clean_q, "summary": f"Answer '{clean_q}' directly using verified encyclopedic knowledge without substituting another person."}


def _pcm16_to_wav_bytes(pcm_bytes: bytes, sample_rate: int = 16000) -> bytes:
    """Wraps raw 16-bit mono PCM bytes into a standard 44-byte RIFF/WAVE payload for Gemini REST audio fallback."""
    even_len = len(pcm_bytes) - (len(pcm_bytes) % 2)
    payload = pcm_bytes[:even_len]
    channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * channels * (bits_per_sample // 8)
    block_align = channels * (bits_per_sample // 8)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + len(payload),
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        len(payload),
    )
    return header + payload


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

    from backend.owner_profile import is_owner_user

    raw_role = str(websocket.query_params.get("role", "sir")).lower().strip()
    user_email = str(websocket.query_params.get("email", "")).strip().lower()
    is_owner = is_owner_user(email=user_email)
    if is_owner:
        user_role = "boss"
    elif raw_role in ("madam", "mam", "ma'am"):
        user_role = "madam"
    else:
        user_role = "sir"

    config = create_gemini_live_config(
        system_prompt=get_das_system_instruction(user_role),
        tools_list=DAS_TOOLS,
    )

    candidate_models = [
        LIVE_MODEL,
        "gemini-3.8-live",
    ]
    seen = set()
    models_to_try = [m for m in candidate_models if m and not (m in seen or seen.add(m))]

    session_cm = None
    session = None
    connected_model: str | None = LIVE_MODEL
    gemini_reader_task: asyncio.Task | None = None
    session_lifecycle_lock = asyncio.Lock()
    live_quota_cooldown_until = 0.0
    last_activity_mono = time.monotonic()

    try:
        # Immediately announce ONLINE so 50+ concurrent users never hang on CONNECTING
        # or exhaust Google's concurrent Live WebSocket quota while idle.
        await websocket.send_json({
            "type": "status",
            "status": "connected",
            "model": LIVE_MODEL,
            "voice": "DAS Neural",
            "role": user_role,
        })

        camera_active = False
        explicit_cam_off = False
        latest_frame_bytes: bytes | None = None
        latest_frame_at_mono: float = 0.0
        send_lock = asyncio.Lock()
        audio_turn_open = False
        turn_id = 0
        completed_turn_id = 0
        gemini_turn_active = False
        audio_end_mono = 0.0
        pending_response_until_mono = 0.0
        output_tx_in_turn = False
        last_frame_sent_mono = 0.0
        latest_page_context: dict = {}
        pending_user_text: str | None = None
        fallback_audio_buf = bytearray()
        fallback_audio_active = False
        fallback_history: list[dict] = []
        fallback_tasks: set[asyncio.Task] = set()
        pending_tool_futures: dict[str, asyncio.Future] = {}
        hi_greeting_count = 0

        import re as _re_hi

        def is_pure_hi_greeting(txt: str) -> bool:
            return bool(
                _re_hi.match(
                    r"^\s*(hi+|hello+|hey+|namaste|good\s*(morning|afternoon|evening)|yo|hola|sup|hai+|hlo+|namaskaram)(?:\s+(?:das|boss|bro|there|ai))?[\s!.,?]*$",
                    (txt or "").strip().lower(),
                )
            )

        def get_exact_hi_reply(role_str: str, count: int) -> str:
            r_low = (role_str or "sir").lower().strip()
            if count == 0:
                if r_low == "boss":
                    return "Hi Boss! What's up?"
                if r_low in ("madam", "mam", "ma'am"):
                    return "Hello Madam, what can I help you with today?"
                return "Hello Sir, what can I help you with today?"
            if r_low == "boss":
                return "Boss, I'm here."
            if r_low in ("madam", "mam", "ma'am"):
                return "Madam, I'm here."
            return "Sir, I'm here."

        def is_turn_busy() -> bool:
            now_m = time.monotonic()
            return (
                gemini_turn_active
                or now_m < pending_response_until_mono
                or now_m < audio_end_mono + 0.35
            )

        def format_page_context_note() -> str:
            if not latest_page_context:
                return ""
            tab = latest_page_context.get("activeTab") or latest_page_context.get("activeSlide") or "overview"
            title = latest_page_context.get("tabTitle") or latest_page_context.get("slideLabel") or tab
            chance = latest_page_context.get("readinessChance")
            role_target = latest_page_context.get("targetRole") or ""
            card_ctx = latest_page_context.get("activeProject") or latest_page_context.get("projectTitle") or latest_page_context.get("cardContext") or ""
            user_name = latest_page_context.get("userName") or ""
            ctx_email = latest_page_context.get("userEmail") or ""
            hon = latest_page_context.get("honorific") or ""
            focus = latest_page_context.get("focusOnDas")
            parts_ctx = [f"Slide={tab} ({title})"]
            if hon or user_name:
                parts_ctx.append(f"User={user_name or 'Visitor'} ({hon or 'Sir'})")
            if ctx_email:
                parts_ctx.append(f"Email={ctx_email}")
            if card_ctx:
                parts_ctx.append(f"FocusedCard={card_ctx}")
            if chance is not None:
                parts_ctx.append(f"Readiness={chance}%")
            if role_target:
                parts_ctx.append(f"TargetRole={role_target}")
            if focus:
                parts_ctx.append("FocusOnDAS=ON")
            return "[Live Screen Context: " + ", ".join(parts_ctx) + "]"

        def is_valid_jpeg(raw_bytes: bytes | None) -> bool:
            return bool(raw_bytes and len(raw_bytes) > 128 and raw_bytes[:2] == b"\xff\xd8")

        def is_gemini_ws_closed(target_session=None) -> bool:
            s = target_session if target_session is not None else session
            if s is None:
                return True
            ws_obj = getattr(s, "_ws", None)
            if ws_obj is None:
                return False
            if getattr(ws_obj, "closed", False) or getattr(ws_obj, "close_code", None) is not None:
                return True
            state = getattr(ws_obj, "state", None)
            if state is not None and getattr(state, "name", "") in ("CLOSED", "CLOSING"):
                return True
            return False

        async def close_live_session(target_session=None):
            nonlocal session_cm, session, gemini_reader_task, audio_turn_open, gemini_turn_active, pending_response_until_mono, output_tx_in_turn
            async with session_lifecycle_lock:
                if target_session is not None and session is not target_session:
                    return
                cm_to_close = session_cm
                reader_to_cancel = gemini_reader_task
                session_cm = None
                session = None
                gemini_reader_task = None
                audio_turn_open = False
                gemini_turn_active = False
                pending_response_until_mono = 0.0
                output_tx_in_turn = False
            if reader_to_cancel and not reader_to_cancel.done() and reader_to_cancel is not asyncio.current_task():
                reader_to_cancel.cancel()
                try:
                    await reader_to_cancel
                except (asyncio.CancelledError, Exception):
                    pass
            if cm_to_close:
                try:
                    await cm_to_close.__aexit__(None, None, None)
                except Exception:
                    pass

        async def _execute_single_tool_call(
            fc_name: str,
            args: dict,
            call_id_hint: str,
            active_sess=None,
        ) -> dict:
            nonlocal last_frame_sent_mono
            args = dict(args or {})

            if fc_name == "lookup_factual_info":
                return await _lookup_factual_info_async(str(args.get("query") or ""))

            if fc_name == "inspect_live_camera_frame":
                focus = str(args.get("focus") or "full_scene")
                frame_age_ms = (
                    round((time.monotonic() - latest_frame_at_mono) * 1000)
                    if camera_active and latest_frame_at_mono > 0
                    else None
                )
                has_live = bool(camera_active and is_valid_jpeg(latest_frame_bytes))
                if has_live and latest_frame_bytes is not None and active_sess is not None:
                    try:
                        async with send_lock:
                            await active_sess.send_realtime_input(
                                video=types.Blob(
                                    data=latest_frame_bytes,
                                    mime_type="image/jpeg",
                                )
                            )
                            last_frame_sent_mono = time.monotonic()
                    except Exception:
                        pass
                try:
                    await websocket.send_json({
                        "type": "vision_telemetry",
                        "source": "tool_call",
                        "focus": focus,
                        "frame_age_ms": frame_age_ms,
                        "status": "inspected" if has_live else "camera_off",
                    })
                except Exception:
                    pass
                return {
                    "camera_active": has_live,
                    "focus": focus,
                    "frame_age_ms": frame_age_ms,
                    "strict_grounding_rule": (
                        "Describe ONLY the actual colors (e.g. light green vs blue), hairstyle quality honestly, and live hand/body/dance motion visible in the newly streamed frame right now. Zero fake flattery or memory guesses."
                        if has_live
                        else "Camera is currently OFF. Tell the user honestly to click Cam ON."
                    ),
                }

            if fc_name == "explain_current_screen":
                topic = (args.get("topic") or "").strip()
                ctx_snapshot = latest_page_context or {"activeTab": "overview", "tabTitle": "Executive Dashboard"}
                return {
                    "status": "screen_inspected",
                    "topic": topic,
                    "active_screen": ctx_snapshot,
                    "instruction": (
                        "Explain what this active slide/feature does, why it matters for placement, and what the visitor should do next "
                        "in friendly everyday language WITHOUT reading bullet points verbatim."
                    ),
                }

            if fc_name == "coding_studio_control":
                call_id = str(call_id_hint or f"code_{turn_id}_{int(time.monotonic() * 1000)}")
                loop = asyncio.get_running_loop()
                fut_code: asyncio.Future = loop.create_future()
                pending_tool_futures[call_id] = fut_code
                if websocket.client_state != WebSocketState.DISCONNECTED:
                    await websocket.send_json({
                        "type": "tool_call",
                        "call_id": call_id,
                        "name": "coding_studio_control",
                        "args": args,
                    })
                try:
                    c_res = await asyncio.wait_for(fut_code, timeout=28.0)
                except asyncio.TimeoutError:
                    pending_tool_futures.pop(call_id, None)
                    c_res = {"ok": False, "status": "timeout", "error": "Coding studio action timed out."}
                except Exception as wait_err:
                    pending_tool_futures.pop(call_id, None)
                    c_res = {"ok": False, "error": str(wait_err)}
                return c_res if isinstance(c_res, dict) else {"ok": True, "result": str(c_res)}

            if fc_name in (
                "write_and_compile_code",
                "open_external_website",
            ):
                call_id = str(call_id_hint or f"tc_{turn_id}_{int(time.monotonic() * 1000)}")
                loop = asyncio.get_running_loop()
                fut: asyncio.Future = loop.create_future()
                pending_tool_futures[call_id] = fut
                if websocket.client_state != WebSocketState.DISCONNECTED:
                    await websocket.send_json({
                        "type": "tool_call",
                        "call_id": call_id,
                        "name": fc_name,
                        "args": args,
                    })
                try:
                    client_res = await asyncio.wait_for(fut, timeout=18.0)
                except asyncio.TimeoutError:
                    pending_tool_futures.pop(call_id, None)
                    client_res = {
                        "ok": False,
                        "status": "timeout",
                        "note": "Online compiler or website action awaited client output.",
                    }
                except Exception as wait_err:
                    pending_tool_futures.pop(call_id, None)
                    client_res = {"ok": False, "error": str(wait_err)}

                if not isinstance(client_res, dict):
                    client_res = {"result": str(client_res)}
                return client_res

            if fc_name in (
                "control_website",
                "navigate_ui",
                "open_linkedin_profile",
                "return_to_dashboard",
            ):
                if websocket.client_state != WebSocketState.DISCONNECTED:
                    await websocket.send_json({
                        "type": "tool_call",
                        "name": fc_name,
                        "args": args,
                    })
                return {
                    "status": "executed_on_client",
                    "action": fc_name,
                    "result": f"Successfully performed {fc_name} on the user screen.",
                }

            return {"ok": False, "error": f"Unknown tool: {fc_name}"}

        async def _run_rest_tool_loop(
            initial_contents: list,
            model_candidates: tuple,
            extra_instruction: str = "",
        ) -> str:
            """Executes up to 3 tool-calling rounds via Gemini REST so UI clicks and Coding Studio work even in fallback mode."""
            sys_prompt = get_das_system_instruction(user_role)
            if extra_instruction:
                sys_prompt = f"{sys_prompt}\n\n{extra_instruction}"
            contents = list(initial_contents)
            for round_idx in range(3):
                round_resp = None
                for api_key in api_keys:
                    rest_client = genai.Client(http_options={"api_version": "v1beta", "timeout": 14000}, api_key=api_key)
                    for m_name in model_candidates:
                        try:
                            round_resp = await asyncio.wait_for(
                                asyncio.to_thread(
                                    rest_client.models.generate_content,
                                    model=m_name,
                                    contents=contents,
                                    config=types.GenerateContentConfig(
                                        system_instruction=sys_prompt,
                                        tools=DAS_TOOLS,
                                        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                                        temperature=0.3,
                                        max_output_tokens=800,
                                    ),
                                ),
                                timeout=14.0,
                            )
                            if round_resp:
                                break
                        except Exception as loop_err:
                            live_logger.debug(f"[REST Tool Loop {m_name} r={round_idx}] skipped: {loop_err}")
                    if round_resp:
                        break

                if not round_resp:
                    break

                fn_calls = getattr(round_resp, "function_calls", None)
                if fn_calls:
                    cands = getattr(round_resp, "candidates", None) or []
                    if cands and getattr(cands[0], "content", None):
                        contents.append(cands[0].content)
                    fn_parts = []
                    for f_idx, fc in enumerate(fn_calls):
                        f_res = await _execute_single_tool_call(
                            fc.name,
                            dict(fc.args or {}),
                            f"rest_{round_idx}_{f_idx}_{int(time.monotonic() * 1000)}",
                            active_sess=None,
                        )
                        fn_parts.append(
                            types.Part.from_function_response(
                                name=fc.name,
                                response=f_res if isinstance(f_res, dict) else {"result": str(f_res)},
                            )
                        )
                    contents.append(types.Content(role="user", parts=fn_parts))
                    continue

                txt = (getattr(round_resp, "text", None) or "").strip()
                if txt:
                    return txt
                break
            return ""

        async def _deliver_fallback_turn(user_text: str):
            nonlocal pending_user_text, turn_id, completed_turn_id, gemini_turn_active, pending_response_until_mono, output_tx_in_turn, last_activity_mono
            clean_u = (user_text or "").strip()
            pending_user_text = None
            if not clean_u or websocket.client_state == WebSocketState.DISCONNECTED:
                return
            try:
                from backend.gemini_engine import chat_with_mentor
                from backend.routers.voice_routes import synthesize_puck_pcm

                ctx_for_chat = dict(latest_page_context or {})
                ctx_for_chat["honorific"] = (
                    "Boss" if user_role == "boss" else ("Madam" if user_role == "madam" else "Sir")
                )
                if user_email:
                    ctx_for_chat.setdefault("userEmail", user_email)

                has_live_cam = bool(camera_active and is_valid_jpeg(latest_frame_bytes))
                frame_b64 = (
                    base64.b64encode(latest_frame_bytes).decode("utf-8")
                    if has_live_cam and latest_frame_bytes is not None
                    else None
                )
                prior_hist = list(fallback_history[-8:])

                cam_note = (
                    "[CAMERA: ON — LIVE FRAME ATTACHED]"
                    if has_live_cam
                    else "[CAMERA: OFF — NO LIVE VIDEO; NEVER CLAIM TO SEE USER]"
                )
                ctx_note = format_page_context_note()
                hist_contents = []
                for h_item in prior_hist[-6:]:
                    h_role = "model" if h_item.get("role") == "assistant" else "user"
                    h_txt = (h_item.get("content") or "").strip()
                    if h_txt:
                        hist_contents.append(types.Content(role=h_role, parts=[types.Part.from_text(text=h_txt)]))
                user_parts = []
                if has_live_cam and latest_frame_bytes is not None:
                    user_parts.append(types.Part.from_bytes(data=latest_frame_bytes, mime_type="image/jpeg"))
                user_parts.append(types.Part.from_text(text=f"{cam_note}\n{ctx_note}\n{clean_u}".strip()))
                hist_contents.append(types.Content(role="user", parts=user_parts))

                reply_text = await _run_rest_tool_loop(
                    hist_contents,
                    ("gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"),
                )

                if not reply_text:
                    reply_raw = await asyncio.to_thread(
                        chat_with_mentor,
                        clean_u,
                        None,
                        prior_hist,
                        ctx_for_chat.get("activeTab"),
                        ctx_for_chat,
                        False,
                        frame_b64,
                        has_live_cam,
                    )
                    reply_text = (reply_raw or "").split("|||")[0].strip()

                if not reply_text or websocket.client_state == WebSocketState.DISCONNECTED:
                    return

                fallback_history.append({"role": "user", "content": clean_u})
                fallback_history.append({"role": "assistant", "content": reply_text})
                if len(fallback_history) > 12:
                    del fallback_history[:-12]

                turn_id += 1
                this_turn = turn_id
                completed_turn_id = this_turn
                gemini_turn_active = False
                pending_response_until_mono = 0.0
                output_tx_in_turn = False
                last_activity_mono = time.monotonic()

                await websocket.send_json({
                    "type": "transcript",
                    "text": reply_text,
                    "turn_id": this_turn,
                })

                tts_res = await synthesize_puck_pcm(reply_text)
                if (
                    tts_res
                    and tts_res.get("pcm_base64")
                    and websocket.client_state != WebSocketState.DISCONNECTED
                ):
                    await websocket.send_json({
                        "type": "audio",
                        "voice": "DAS Neural",
                        "sample_rate": int(tts_res.get("sample_rate") or 24000),
                        "pcm_base64": tts_res["pcm_base64"],
                        "turn_id": this_turn,
                    })

                if websocket.client_state != WebSocketState.DISCONNECTED:
                    await websocket.send_json({"type": "turn_complete", "turn_id": this_turn})
            except Exception as fb_err:
                live_logger.warning(f"[Live Proxy Fallback Turn Notice] {fb_err}")

        async def _deliver_fallback_audio_turn(pcm_bytes: bytes):
            nonlocal turn_id, completed_turn_id, gemini_turn_active, pending_response_until_mono, output_tx_in_turn, last_activity_mono
            if len(pcm_bytes) < 4800 or websocket.client_state == WebSocketState.DISCONNECTED:
                return
            try:
                from backend.routers.voice_routes import synthesize_puck_pcm

                wav_bytes = _pcm16_to_wav_bytes(pcm_bytes, sample_rate=SEND_SAMPLE_RATE)
                hon = "Boss" if user_role == "boss" else ("Madam" if user_role == "madam" else "Sir")
                has_live_cam = bool(camera_active and is_valid_jpeg(latest_frame_bytes))
                ctx_note = format_page_context_note()
                prompt_parts = [
                    types.Part.from_bytes(data=wav_bytes, mime_type="audio/wav"),
                ]
                if has_live_cam and latest_frame_bytes is not None:
                    prompt_parts.append(types.Part.from_bytes(data=latest_frame_bytes, mime_type="image/jpeg"))
                prompt_parts.append(
                    types.Part.from_text(
                        text=(
                            f"Address the speaker strictly as '{hon}'. "
                            f"Listen carefully to the audio (English, Telugu, Tenglish, or Hindi). "
                            f"If the user asks to navigate Pathfinder, practice coding or run programs in the Online Compiler, search Google, or open websites, ALWAYS invoke the matching tool(s) first and explain the real result concisely. "
                            f"{'Camera is ON and a live frame is attached.' if has_live_cam else 'Camera is OFF; never claim to see the user.'} "
                            f"{ctx_note}"
                        )
                    )
                )

                reply_text = await _run_rest_tool_loop(
                    [types.Content(role="user", parts=prompt_parts)],
                    ("gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"),
                )

                if not reply_text:
                    for api_key in api_keys:
                        audio_client = genai.Client(http_options={"api_version": "v1beta", "timeout": 12000}, api_key=api_key)
                        for model_name in ("gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"):
                            try:
                                resp = await asyncio.wait_for(
                                    asyncio.to_thread(
                                        audio_client.models.generate_content,
                                        model=model_name,
                                        contents=[types.Content(role="user", parts=prompt_parts)],
                                        config=types.GenerateContentConfig(temperature=0.4, max_output_tokens=240),
                                    ),
                                    timeout=12.0,
                                )
                                candidate_txt = (getattr(resp, "text", None) or "").strip()
                                if candidate_txt:
                                    reply_text = candidate_txt
                                    break
                            except Exception as audio_err:
                                live_logger.debug(f"[Fallback Audio {model_name}] skipped: {audio_err}")
                        if reply_text:
                            break

                if not reply_text or websocket.client_state == WebSocketState.DISCONNECTED:
                    return

                turn_id += 1
                this_turn = turn_id
                completed_turn_id = this_turn
                gemini_turn_active = False
                pending_response_until_mono = 0.0
                output_tx_in_turn = False
                last_activity_mono = time.monotonic()

                await websocket.send_json({
                    "type": "transcript",
                    "text": reply_text,
                    "turn_id": this_turn,
                })
                tts_res = await synthesize_puck_pcm(reply_text)
                if (
                    tts_res
                    and tts_res.get("pcm_base64")
                    and websocket.client_state != WebSocketState.DISCONNECTED
                ):
                    await websocket.send_json({
                        "type": "audio",
                        "voice": "DAS Neural",
                        "sample_rate": int(tts_res.get("sample_rate") or 24000),
                        "pcm_base64": tts_res["pcm_base64"],
                        "turn_id": this_turn,
                    })
                if websocket.client_state != WebSocketState.DISCONNECTED:
                    await websocket.send_json({"type": "turn_complete", "turn_id": this_turn})
            except Exception as fb_audio_err:
                live_logger.warning(f"[Live Proxy Fallback Audio Notice] {fb_audio_err}")

        async def ensure_live_session():
            nonlocal session_cm, session, connected_model, gemini_reader_task, live_quota_cooldown_until, last_activity_mono
            if session is not None and not is_gemini_ws_closed(session):
                return session
            if time.monotonic() < live_quota_cooldown_until:
                return None

            async with session_lifecycle_lock:
                if session is not None and not is_gemini_ws_closed(session):
                    return session
                if time.monotonic() < live_quota_cooldown_until:
                    return None

                # Clean up any dead upstream handle before opening fresh session
                if session_cm is not None:
                    stale_cm = session_cm
                    session_cm = None
                    session = None
                    try:
                        await stale_cm.__aexit__(None, None, None)
                    except Exception:
                        pass

                last_error = ""
                for key_index, api_key in enumerate(api_keys):
                    client = genai.Client(
                        http_options={"api_version": "v1beta"},
                        api_key=api_key,
                    )
                    for model_name in models_to_try:
                        try:
                            cm = client.aio.live.connect(model=model_name, config=config)
                            new_sess = await asyncio.wait_for(cm.__aenter__(), timeout=8.0)
                            session_cm = cm
                            session = new_sess
                            connected_model = model_name
                            last_activity_mono = time.monotonic()
                            gemini_reader_task = asyncio.create_task(receive_from_gemini(new_sess))
                            live_logger.info(
                                f"[DAS Live Proxy] On-demand upstream connected to '{connected_model}' (role={user_role})."
                            )
                            return session
                        except Exception as conn_err:
                            last_error = f"{type(conn_err).__name__}: {conn_err}"
                            live_logger.warning(
                                f"[DAS Live Proxy] key#{key_index} model '{model_name}' connect failed: {last_error}"
                            )
                            err_l = last_error.lower()
                            if "1011" in last_error or "exhausted" in err_l or "quota" in err_l or "429" in last_error:
                                live_quota_cooldown_until = time.monotonic() + 20.0
                            if "api key not valid" in err_l:
                                break
                            continue
                live_logger.warning(
                    f"[DAS Live Proxy] Upstream Live unavailable ({last_error[:140]}); using instant REST + 3.8 Puck fallback."
                )
                return None

        async def send_vision_prompt(
            prompt_text: str,
            include_screen_ctx: bool = True,
            is_user_text: bool = False,
            allow_fallback: bool = True,
        ):
            nonlocal audio_turn_open, pending_response_until_mono, pending_user_text, last_activity_mono
            last_activity_mono = time.monotonic()
            active_sess = await ensure_live_session()
            if active_sess is None:
                if allow_fallback:
                    await _deliver_fallback_turn(pending_user_text if is_user_text and pending_user_text else prompt_text)
                return

            has_live_cam = bool(camera_active and is_valid_jpeg(latest_frame_bytes))
            cam_marker = (
                "[CAMERA: ON — LIVE VIDEO ATTACHED]"
                if has_live_cam
                else "[CAMERA: OFF — NO LIVE VIDEO ATTACHED; STRICTLY NEVER CLAIM TO SEE BOSS OR ANY PERSON SITTING THERE]"
            )
            final_text = f"{cam_marker}\n{prompt_text}"
            if include_screen_ctx:
                ctx_note = format_page_context_note()
                if ctx_note:
                    final_text = f"{cam_marker}\n{ctx_note}\n{prompt_text}"
            parts = []
            if has_live_cam and latest_frame_bytes is not None:
                parts.append(
                    types.Part.from_bytes(
                        data=latest_frame_bytes,
                        mime_type="image/jpeg",
                    )
                )
            parts.append(types.Part.from_text(text=final_text))
            try:
                async with send_lock:
                    if audio_turn_open:
                        audio_turn_open = False
                        try:
                            await active_sess.send_realtime_input(audio_stream_end=True)
                        except Exception:
                            pass
                    pending_response_until_mono = time.monotonic() + 3.0
                    await active_sess.send_client_content(
                        turns=[types.Content(parts=parts, role="user")],
                        turn_complete=True,
                    )
            except Exception as send_err:
                live_logger.warning(f"[DAS Live Proxy] send_client_content failed: {send_err}")
                await close_live_session(active_sess)
                if allow_fallback:
                    await _deliver_fallback_turn(pending_user_text if is_user_text and pending_user_text else prompt_text)
                    return
                raise send_err

        async def receive_from_browser():
            nonlocal latest_frame_bytes, latest_frame_at_mono, camera_active, explicit_cam_off, audio_turn_open, last_frame_sent_mono, latest_page_context, pending_response_until_mono, pending_user_text, user_role, config, last_activity_mono, fallback_audio_active, hi_greeting_count, turn_id, completed_turn_id
            try:
                while True:
                    raw = await websocket.receive_text()
                    msg = json.loads(raw)
                    msg_type = msg.get("type")

                    # 1. Keep-alive Ping
                    if msg_type == "ping":
                        await websocket.send_json({"type": "pong"})
                        continue

                    # 1a. Proactive Warmup when user clicks Speak or Cam
                    if msg_type == "warmup":
                        last_activity_mono = time.monotonic()
                        t_w = asyncio.create_task(ensure_live_session())
                        fallback_tasks.add(t_w)
                        t_w.add_done_callback(fallback_tasks.discard)
                        continue

                    # 1b. Real two-way Client Tool / Chrome Extension Result
                    if msg_type == "tool_result":
                        cid = str(msg.get("call_id") or "")
                        fut = pending_tool_futures.pop(cid, None)
                        if fut and not fut.done():
                            fut.set_result(msg.get("result") or {})
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
                                    last_activity_mono = time.monotonic()
                                    active_sess = await ensure_live_session()
                                    if active_sess is None:
                                        # Multi-user fallback: buffer spoken PCM locally until audio_stream_end
                                        fallback_audio_active = True
                                        if len(fallback_audio_buf) < 800_000:
                                            fallback_audio_buf.extend(pcm_bytes)
                                        continue

                                    was_open = audio_turn_open
                                    audio_turn_open = True
                                    now_mono = time.monotonic()
                                    try:
                                        async with send_lock:
                                            if (
                                                not was_open
                                                and camera_active
                                                and is_valid_jpeg(latest_frame_bytes)
                                                and (now_mono - last_frame_sent_mono >= 0.25)
                                            ):
                                                last_frame_sent_mono = now_mono
                                                try:
                                                    await active_sess.send_realtime_input(
                                                        video=types.Blob(
                                                            data=latest_frame_bytes,
                                                            mime_type="image/jpeg",
                                                        )
                                                    )
                                                except Exception:
                                                    pass
                                            await active_sess.send_realtime_input(
                                                audio=types.Blob(
                                                    data=pcm_bytes,
                                                    mime_type=f"audio/pcm;rate={SEND_SAMPLE_RATE}",
                                                )
                                            )
                                    except Exception as send_a_err:
                                        live_logger.warning(f"[Audio Chunk Fallback] {send_a_err}")
                                        await close_live_session(active_sess)
                                        fallback_audio_active = True
                                        if len(fallback_audio_buf) < 800_000:
                                            fallback_audio_buf.extend(pcm_bytes)
                            except Exception as a_err:
                                live_logger.warning(f"[Audio Chunk Notice] {a_err}")

                    elif msg_type == "audio_stream_end":
                        audio_turn_open = False
                        last_activity_mono = time.monotonic()
                        if fallback_audio_active and len(fallback_audio_buf) > 0:
                            captured = bytes(fallback_audio_buf)
                            fallback_audio_buf.clear()
                            fallback_audio_active = False
                            t = asyncio.create_task(_deliver_fallback_audio_turn(captured))
                            fallback_tasks.add(t)
                            t.add_done_callback(fallback_tasks.discard)
                            continue
                        if session is not None and not is_gemini_ws_closed(session):
                            try:
                                async with send_lock:
                                    await session.send_realtime_input(audio_stream_end=True)
                            except Exception:
                                pass

                    # 2b. Explicit Camera State Sync from Browser (clears stale frames immediately on Cam OFF)
                    elif msg_type == "camera_state":
                        new_cam = bool(msg.get("active"))
                        was_off = not camera_active
                        camera_active = new_cam
                        explicit_cam_off = not new_cam
                        if not camera_active:
                            latest_frame_bytes = None
                            latest_frame_at_mono = 0.0
                            last_frame_sent_mono = 0.0
                        elif was_off and not is_turn_busy() and session is not None and not is_gemini_ws_closed(session):
                            try:
                                async with send_lock:
                                    await session.send_client_content(
                                        turns=[
                                            types.Content(
                                                parts=[
                                                    types.Part.from_text(
                                                        text="[SYSTEM CAMERA STATE SYNC: CAMERA IS NOW ON. Live video frames are actively streaming. Answer upcoming visual questions directly from the newest frame pixels ONLY — forget all older outfit colors or offline camera states.]"
                                                    )
                                                ],
                                                role="user",
                                            )
                                        ],
                                        turn_complete=False,
                                    )
                            except Exception:
                                pass

                    # 3. Live Camera Video Frame from Browser (stores locally for both Live and REST Vision)
                    elif msg_type == "frame":
                        if msg.get("active") is True:
                            camera_active = True
                            explicit_cam_off = False
                        if not camera_active or explicit_cam_off:
                            continue
                        frame_str = msg.get("jpeg_base64")
                        if frame_str:
                            try:
                                candidate = base64.b64decode(frame_str)
                                if is_valid_jpeg(candidate):
                                    latest_frame_bytes = candidate
                                    now_mono = time.monotonic()
                                    latest_frame_at_mono = now_mono
                                    if session is not None and not is_gemini_ws_closed(session):
                                        min_gap = 0.85 if is_turn_busy() else 0.42
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
                        if not is_turn_busy():
                            issue = (msg.get("issue") or "low_volume").strip()
                            dev_name = (msg.get("device") or "connected audio device").strip()
                            hint_prompt = (
                                f"[FRIENDLY AUDIO NOTICE: issue={issue}, device={dev_name}] "
                                "The current user may have just plugged in earphones, wireless buds, or headphones at very low volume (~20%) or a loose/muted mic, "
                                "so their voice isn't coming through clearly right now. Speaking warmly using the active honorific (Boss, Madam, or Sir), "
                                "kindly let them know their voice is too faint or muted to hear properly, and suggest increasing the volume or checking their earphone/buds condition and connection in 1-2 natural sentences."
                            )
                            await send_vision_prompt(hint_prompt, include_screen_ctx=False)

                    # 3b. Proactive Initial Camera Greeting (never interrupts an active greeting mid-sentence)
                    elif msg_type == "vision_greet":
                        if not camera_active:
                            continue
                        role_now = (msg.get("role") or user_role or "sir").lower().strip()
                        if role_now == "boss" and not is_owner:
                            role_now = "sir"
                        waited = 0.0
                        while is_turn_busy() and waited < 3.5:
                            await asyncio.sleep(0.25)
                            waited += 0.25
                        if camera_active and is_valid_jpeg(latest_frame_bytes):
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

                    # 3c. 24/7 Proactive Scene / Object / Dance / Gesture Announcement (NEVER interrupts active playback!)
                    elif msg_type == "vision_auto_check":
                        if not camera_active or is_turn_busy() or audio_turn_open:
                            continue
                        reason = (msg.get("reason") or "scene_change").strip()
                        motion_score = msg.get("motion_score")
                        if camera_active and is_valid_jpeg(latest_frame_bytes):
                            if reason == "dance_or_motion":
                                auto_prompt = (
                                    f"SYSTEM LIVE MOTION & DANCE MONITOR (motion_score={motion_score}): "
                                    "Noticeable active movement, dancing, or hand dancing/waving was just detected in front of the camera! "
                                    "Look closely at the attached live frame(s) and react naturally right now in 1-2 crisp, observant sentences "
                                    "about what hands/body movement or dance pose you literally see (only describe current pixels, never guess older outfits!)."
                                )
                            else:
                                auto_prompt = (
                                    "SYSTEM 24/7 AUTO-VISION MONITOR: The scene or object in front of the camera just changed. "
                                    "Inspect the attached live frame carefully across outfit colors, hair, hands, and foreground objects "
                                    "and describe ONLY what changed or what you see right now in 1-2 honest, direct sentences (never repeat old blue-shirt memory!)."
                                )
                            await send_vision_prompt(auto_prompt)
                            try:
                                await websocket.send_json({
                                    "type": "vision_telemetry",
                                    "source": "auto_monitor",
                                    "reason": reason,
                                    "motion_score": motion_score,
                                    "status": "inspected",
                                })
                            except Exception:
                                pass

                    # 4. Text Input from HUD (Injects latest camera frame if camera is on!)
                    elif msg_type == "text":
                        text = (msg.get("text") or "").strip()
                        if text:
                            if is_pure_hi_greeting(text):
                                exact_hi = get_exact_hi_reply(user_role, hi_greeting_count)
                                hi_greeting_count += 1
                                pending_user_text = None
                                last_activity_mono = time.monotonic()
                                turn_id += 1
                                this_hi_turn = turn_id
                                completed_turn_id = this_hi_turn
                                await websocket.send_json({
                                    "type": "transcript",
                                    "text": exact_hi,
                                    "turn_id": this_hi_turn,
                                })
                                try:
                                    from backend.routers.voice_routes import synthesize_puck_pcm
                                    tts_res = await synthesize_puck_pcm(exact_hi)
                                    if (
                                        tts_res
                                        and tts_res.get("pcm_base64")
                                        and websocket.client_state != WebSocketState.DISCONNECTED
                                    ):
                                        await websocket.send_json({
                                            "type": "audio",
                                            "voice": "DAS Neural",
                                            "sample_rate": int(tts_res.get("sample_rate") or 24000),
                                            "pcm_base64": tts_res["pcm_base64"],
                                            "turn_id": this_hi_turn,
                                        })
                                except Exception:
                                    pass
                                if websocket.client_state != WebSocketState.DISCONNECTED:
                                    await websocket.send_json({"type": "turn_complete", "turn_id": this_hi_turn})
                                continue
                            pending_user_text = text
                            await send_vision_prompt(text, is_user_text=True, allow_fallback=True)

                    # 4b. Verbatim Interviewer Read-Aloud (strictly never answers or explains)
                    elif msg_type == "speak_verbatim":
                        v_text = (msg.get("text") or "").strip()
                        if v_text:
                            last_activity_mono = time.monotonic()
                            active_sess = await ensure_live_session()
                            if active_sess is None:
                                from backend.routers.voice_routes import synthesize_puck_pcm
                                tts_res = await synthesize_puck_pcm(v_text)
                                if tts_res and tts_res.get("pcm_base64") and websocket.client_state != WebSocketState.DISCONNECTED:
                                    turn_id += 1
                                    completed_turn_id = turn_id
                                    await websocket.send_json({
                                        "type": "audio",
                                        "voice": "DAS Neural",
                                        "sample_rate": int(tts_res.get("sample_rate") or 24000),
                                        "pcm_base64": tts_res["pcm_base64"],
                                        "turn_id": turn_id,
                                    })
                                    await websocket.send_json({"type": "turn_complete", "turn_id": turn_id})
                                continue

                            read_prompt = (
                                "[CAMERA: OFF — READ ALOUD VERBATIM ONLY; DO NOT GREET OR CLAIM TO SEE BOSS]\n"
                                "Read the exact sentence below aloud naturally as the technical interviewer asking the candidate. "
                                "Do NOT answer the question, explain concepts, give hints, mention any camera, or add intro/outro commentary:\n"
                                f"\"{v_text}\""
                            )
                            try:
                                async with send_lock:
                                    if audio_turn_open:
                                        audio_turn_open = False
                                        try:
                                            await active_sess.send_realtime_input(audio_stream_end=True)
                                        except Exception:
                                            pass
                                    pending_response_until_mono = time.monotonic() + 3.0
                                    await active_sess.send_client_content(
                                        turns=[types.Content(parts=[types.Part.from_text(text=read_prompt)], role="user")],
                                        turn_complete=True,
                                    )
                            except Exception:
                                await close_live_session(active_sess)

                    # 5. Role Switch (enforces strict Boss lock for owner email only)
                    elif msg_type == "role_switch":
                        req_role = str(msg.get("role", "sir")).lower().strip()
                        if req_role == "boss" and is_owner:
                            new_role = "boss"
                        elif req_role in ("madam", "mam", "ma'am"):
                            new_role = "madam"
                        else:
                            new_role = "sir"
                        user_role = new_role
                        config = create_gemini_live_config(
                            system_prompt=get_das_system_instruction(user_role),
                            tools_list=DAS_TOOLS,
                        )
                        if session is not None and not is_gemini_ws_closed(session):
                            if new_role == "boss":
                                update_msg = "SYSTEM: You are speaking with your creator and owner Bommali Dileep. Address him as Boss, greet him briefly once without repeating previous greetings, and ask what he wants to work on."
                            elif new_role == "madam":
                                update_msg = "SYSTEM: You are speaking with a lady guest/evaluator. Address her respectfully as Madam and say 'Hello Madam, what can I help you with today?'"
                            else:
                                update_msg = "SYSTEM: You are speaking with a gentleman guest/evaluator. Address him respectfully as Sir and say 'Hello Sir, what can I help you with today?'"
                            try:
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
                            except Exception:
                                await close_live_session(session)

            except (WebSocketDisconnect, asyncio.CancelledError):
                pass
            except Exception as b_err:
                live_logger.warning(f"[Browser Receive Notice] {b_err}")

        async def receive_from_gemini(active_sess):
            nonlocal audio_turn_open, turn_id, completed_turn_id, gemini_turn_active, audio_end_mono, pending_response_until_mono, output_tx_in_turn, pending_user_text, last_activity_mono, last_frame_sent_mono, live_quota_cooldown_until
            pcm_coalesce_buf = bytearray()
            pcm_coalesce_turn_id = 0

            async def flush_coalesced_pcm():
                if not pcm_coalesce_buf:
                    return
                even_len = len(pcm_coalesce_buf) - (len(pcm_coalesce_buf) % 2)
                if even_len > 0 and websocket.client_state != WebSocketState.DISCONNECTED:
                    pkt = format_audio_packet(bytes(pcm_coalesce_buf[:even_len]))
                    pkt["turn_id"] = pcm_coalesce_turn_id
                    await websocket.send_json(pkt)
                del pcm_coalesce_buf[:even_len]

            try:
                while True:
                    if websocket.client_state == WebSocketState.DISCONNECTED:
                        break
                    if session is not active_sess or is_gemini_ws_closed(active_sess):
                        break

                    yielded_any = False
                    async for response in active_sess.receive():
                        yielded_any = True
                        last_activity_mono = time.monotonic()
                        if getattr(response, "go_away", None):
                            live_logger.info("[DAS Live Proxy] Upstream go_away received; releasing Live session cleanly while keeping browser ONLINE.")
                            await close_live_session(active_sess)
                            return

                        # Check for interruption
                        if (
                            response.server_content
                            and getattr(response.server_content, "interrupted", False)
                        ):
                            pcm_coalesce_buf.clear()
                            audio_turn_open = False
                            gemini_turn_active = False
                            audio_end_mono = 0.0
                            pending_response_until_mono = 0.0
                            output_tx_in_turn = False
                            if websocket.client_state != WebSocketState.DISCONNECTED:
                                await websocket.send_json({"type": "interrupted", "turn_id": turn_id})

                        # Transcription events
                        if response.server_content:
                            sc = response.server_content
                            input_tx = getattr(sc, "input_transcription", None)
                            if input_tx and getattr(input_tx, "text", None):
                                if websocket.client_state != WebSocketState.DISCONNECTED:
                                    await websocket.send_json({
                                        "type": "user_transcript",
                                        "text": input_tx.text,
                                        "finished": getattr(input_tx, "finished", False),
                                    })
                            else:
                                interim_tx = getattr(sc, "interim_input_transcription", None)
                                if interim_tx and getattr(interim_tx, "text", None):
                                    if websocket.client_state != WebSocketState.DISCONNECTED:
                                        await websocket.send_json({
                                            "type": "user_transcript",
                                            "text": interim_tx.text,
                                            "interim": True,
                                        })

                            output_tx = getattr(sc, "output_transcription", None)
                            if output_tx and getattr(output_tx, "text", None):
                                pending_user_text = None
                                if not gemini_turn_active:
                                    turn_id += 1
                                    gemini_turn_active = True
                                    pending_response_until_mono = 0.0
                                    output_tx_in_turn = False
                                output_tx_in_turn = True
                                if websocket.client_state != WebSocketState.DISCONNECTED:
                                    await websocket.send_json({
                                        "type": "transcript",
                                        "text": output_tx.text,
                                        "turn_id": turn_id,
                                    })

                            # Audio and Model Turn - ONLY single audio stream with turn_id to eliminate overlap
                            if sc.model_turn and sc.model_turn.parts:
                                for part in sc.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        pending_user_text = None
                                        if not gemini_turn_active:
                                            turn_id += 1
                                            gemini_turn_active = True
                                            pending_response_until_mono = 0.0
                                            output_tx_in_turn = False
                                        raw_pcm = part.inline_data.data
                                        pcm_dur = len(raw_pcm) / 48000.0
                                        audio_end_mono = max(time.monotonic(), audio_end_mono) + pcm_dur
                                        pcm_coalesce_turn_id = turn_id
                                        pcm_coalesce_buf.extend(raw_pcm)
                                        if len(pcm_coalesce_buf) >= 2400:
                                            await flush_coalesced_pcm()
                                    if part.text and not output_tx_in_turn and not getattr(part, "thought", False):
                                        pending_user_text = None
                                        if not gemini_turn_active:
                                            turn_id += 1
                                            gemini_turn_active = True
                                            pending_response_until_mono = 0.0
                                        if websocket.client_state != WebSocketState.DISCONNECTED:
                                            await websocket.send_json({
                                                "type": "transcript",
                                                "text": part.text,
                                                "turn_id": turn_id,
                                            })

                            # Emit turn_complete as soon as generation_complete OR turn_complete arrives
                            # (prevents Turn 1's delayed turn_complete from swallowing Turn 2!)
                            is_turn_done = getattr(sc, "turn_complete", False) or (
                                gemini_turn_active and getattr(sc, "generation_complete", False)
                            )
                            if is_turn_done and turn_id > completed_turn_id:
                                completed_turn_id = turn_id
                                pending_user_text = None
                                await flush_coalesced_pcm()
                                audio_turn_open = False
                                gemini_turn_active = False
                                pending_response_until_mono = 0.0
                                output_tx_in_turn = False
                                if websocket.client_state != WebSocketState.DISCONNECTED:
                                    await websocket.send_json({"type": "turn_complete", "turn_id": turn_id})

                        # Handle Function Calling inside active session.receive() stream
                        if response.tool_call:
                            pending_user_text = None
                            function_responses = []
                            for fc in response.tool_call.function_calls:
                                exec_res = await _execute_single_tool_call(
                                    fc.name,
                                    dict(fc.args or {}),
                                    str(fc.id or f"tc_{turn_id}_{int(time.monotonic() * 1000)}"),
                                    active_sess=active_sess,
                                )
                                function_responses.append(
                                    types.FunctionResponse(
                                        name=fc.name,
                                        id=fc.id,
                                        response=exec_res if isinstance(exec_res, dict) else {"result": str(exec_res)},
                                    )
                                )

                            if function_responses:
                                async with send_lock:
                                    await active_sess.send_tool_response(
                                        function_responses=function_responses
                                    )

                    if not yielded_any and is_gemini_ws_closed(active_sess):
                        break

            except (WebSocketDisconnect, asyncio.CancelledError):
                return
            except Exception as stream_err:
                err_str = str(stream_err)
                err_lower = err_str.lower()
                if "1011" in err_str or "exhausted" in err_lower or "quota" in err_lower or "429" in err_str:
                    live_quota_cooldown_until = time.monotonic() + 20.0
                live_logger.info(f"[Gemini Stream Notice] Upstream session ended cleanly ({err_str[:160]}); browser stays ONLINE.")
            finally:
                # Release ONLY the upstream Gemini Live session; keep the browser WebSocket ONLINE!
                if session is active_sess:
                    await close_live_session(active_sess)
                if pending_user_text and websocket.client_state != WebSocketState.DISCONNECTED:
                    text_to_rescue = pending_user_text
                    t = asyncio.create_task(_deliver_fallback_turn(text_to_rescue))
                    fallback_tasks.add(t)
                    t.add_done_callback(fallback_tasks.discard)

        async def idle_reaper_loop():
            try:
                while websocket.client_state != WebSocketState.DISCONNECTED:
                    await asyncio.sleep(10.0)
                    if session is not None and not is_turn_busy() and not audio_turn_open:
                        idle_limit = 100.0 if camera_active else 65.0
                        if time.monotonic() - last_activity_mono >= idle_limit:
                            live_logger.info("[DAS Live Proxy] Releasing idle upstream Gemini Live slot (browser stays ONLINE).")
                            await close_live_session(session)
            except asyncio.CancelledError:
                pass

        b_task = asyncio.create_task(receive_from_browser())
        reaper_task = asyncio.create_task(idle_reaper_loop())
        try:
            await b_task
        finally:
            reaper_task.cancel()
            for ft in list(fallback_tasks):
                ft.cancel()
            await close_live_session()

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
