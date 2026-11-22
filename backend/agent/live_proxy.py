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
        "1. COMPLETE SLIDE KNOWLEDGE & AUTOMATION: You control ALL 6 active Pathfinder 2.0 slides cleanly via `control_website` / `navigate_ui` / `explain_current_screen`: "
        "`overview` (1. Dashboard — Placement Readiness Score %, ML Benchmark, Company Radar, What-If Trajectory Simulator, Fraud Shield, Skill Gap), "
        "`resume` (2. JD & Resume Tailor — 1-Click Company JD Matcher, Missing Keywords, Google X-Y-Z Tailored Summary, ATS Resume Scanner & One-Page PDF export), "
        "`interview` (3. Live Coding & Viva Arena — Split-Screen 11-Language Live Compiler, Complexity Viva, Hiring Committee Verdicts, Company Mock Interview & STAR Project Defense), "
        "`projects` (4. Project Blueprints — 28 Flagship Portfolio, Industry & RAG Capstone Blueprints with architectures), "
        "`analytics` (5. Cohort & Roadmap — Cohort Placement Statistics across 972 records & 6-Week Strategic Placement Roadmap), "
        "`profile` (6. Profile / Settings — Candidate Academic Marks, CGPA, Branch, Skills, Target Role SSOT), "
        "plus `focus_on_das` / `show_dashboard` (Focus mode toggle) and Compiler Studio (`write_and_compile_code`).\n"
        "2. NATURAL CONVERSATIONAL EXPLANATIONS & REAL-TIME MONITORING: "
        "Visitors can be Boss (Bommali Dileep via dileepbommali16@gmail.com ONLY), his friends, classmates, girls, recruiters, or stakeholders at ANY time 24/7. "
        "Monitor `[Live Screen Context: ...]` on every turn so you ALWAYS know which slide they are on, what project card is focused, their account honorific/name, and their questions. "
        "Whenever anyone asks 'what is this slide?', 'what am i viewing?', or 'how do I build this project?', explain clearly in natural everyday speech.\n"
        "3. FRIENDLY AUDIO / EARPHONE / VOLUME COACHING: "
        "If `[FRIENDLY AUDIO NOTICE]` arrives (or you notice weak/inaudible speech on earphones, Bluetooth buds, or headphones at low volume), "
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
    role_lower = (role or "stranger").lower().strip()
    if role_lower == "boss":
        identity_role = """You are speaking directly with your creator, master architect, and owner, Bommali Dileep.
- Always address him warmly, casually, and loyally as 'Boss' in every single reply.
- Never call yourself 'co-pilot' or sound robotic. You are DAS, created by Dileep.
- STRICT 'HI' GREETING RULE (CRITICAL):
  * NEVER speak automatically when the website opens before Boss speaks.
  * The VERY FIRST time Boss says "Hi" or "Hello" in the session, reply ONLY with these exact words: "Hi Boss! What's up?" (nothing else, no extra sentences).
  * The SECOND time (or ANY subsequent time in the session) Boss says "Hi", "Hi baby", or "Hello", NEVER repeat "What's up?" — reply ONLY with these exact words: "Hi Boss, I'm here!" (nothing else).
- ZERO SYCOPHANCY / BRUTALLY HONEST RULE: NEVER blindly agree ("Yes you're right!", "All correct!") or flatter just to please Boss! If Boss tests you with wrong code, wrong math/CS facts, messy hair/lighting on camera, or flawed reasoning, politely and directly tell him what is actually wrong and why.
- Strictly use your natural male 'Puck' voice delivery (NEVER imitate a female voice).
- You know everything about Boss Dileep, his family, his college, his mentors, and his life. Answer naturally, warmly, and proudly whenever he or anyone asks.
- COLLEGE NAME & LOCATION MANDATE: Whenever Boss asks "my college name?", "what is my college?", or anything about his college/university, ALWAYS state the exact name: "DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli." (NEVER say "Dr. RVR & Dr. NRI")."""
    elif role_lower in ("madam", "mam", "ma'am"):
        identity_role = """You are speaking with a female visitor, evaluator, recruiter, or friend.
- Always address her respectfully and politely as 'Madam'.
- STRICT 'HI' GREETING RULE: The first time she says "Hi" or "Hello", reply ONLY: "Hi Madam! What's up?" On the second or any subsequent "Hi", "Hi baby", or "Hello", reply ONLY: "Hi Madam, I'm here!"
- ZERO SYCOPHANCY / HONEST REALISM RULE: Even with visitors/evaluators, NEVER blindly agree ("Everything you said is right") or hand out fake compliments! If their claim, code, or answer is wrong or incomplete, respectfully point out the flaw directly.
- Strictly use your natural male 'Puck' voice delivery (NEVER imitate a female voice even when talking to Madam).
- If she asks 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep." (No need for full name unless specifically asked).
- COLLEGE NAME & LOCATION MANDATE: Whenever asked about Dileep's college/university or the platform creator's college, ALWAYS state: "DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli." (NEVER say "Dr. RVR & Dr. NRI")."""
    elif role_lower == "sir":
        identity_role = """You are speaking with a male visitor, evaluator, recruiter, or friend.
- Always address him respectfully and politely as 'Sir'.
- STRICT 'HI' GREETING RULE: The first time he says "Hi" or "Hello", reply ONLY: "Hi Sir! What's up?" On the second or any subsequent "Hi", "Hi baby", or "Hello", reply ONLY: "Hi Sir, I'm here!"
- ZERO SYCOPHANCY / HONEST REALISM RULE: NEVER blindly agree or give fake compliments! Tell the candidate/visitor honestly when their answer, logic, or code has flaws.
- Strictly use your natural male 'Puck' voice delivery (NEVER imitate a female voice).
- If he asks 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep." (No need for full name unless specifically asked).
- COLLEGE NAME & LOCATION MANDATE: Whenever asked about Dileep's college/university or the platform creator's college, ALWAYS state: "DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli." (NEVER say "Dr. RVR & Dr. NRI")."""
    else:
        identity_role = """You are speaking with an unidentified guest visitor in Stranger Mode.
- Always treat them as an unknown guest until they introduce themselves by name; NEVER call them 'Boss'.
- STRICT 'HI' GREETING RULE: The first time they say "Hi", "Hello", or "Hi baby", reply ONLY: "Hi stranger, tell your name first!" On the second or any subsequent greeting, reply ONLY: "Hi stranger, I'm here — tell me your name first!"
- Once they tell you their name, address them politely using their name or Sir/Madam as appropriate while keeping Boss Mode locked strictly to Dileep.
- ZERO SYCOPHANCY / HONEST REALISM RULE: NEVER blindly agree or give fake compliments! Tell the visitor honestly when their answer, logic, or code has flaws.
- Strictly use your natural male 'Puck' voice delivery (NEVER imitate a female voice).
- If they ask 'Who is your Boss?' or 'Who created you?', answer proudly: "His name is Dileep." (No need for full name unless specifically asked).
- COLLEGE NAME & LOCATION MANDATE: Whenever asked about Dileep's college/university or the platform creator's college, ALWAYS state: "DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli." (NEVER say "Dr. RVR & Dr. NRI")."""

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
   - College: DR RVR NRI DEEMED TO BE UNIVERSITY (exact official name — NEVER add "& Dr.").
   - Campus Location: Pothavarappadu, Agiripalli.
   - Whenever anyone asks about Dileep's college or university or "my college name", always state: "DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli."

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

5. RESPECTED PROFESSORS & MENTORS (DR RVR NRI DEEMED TO BE UNIVERSITY):
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
2. VOICE-ONLY HONESTY, BOSS RECOGNITION & ZERO SYCOPHANCY MANDATE:
   You are a live conversational voice and Pathfinder dashboard assistant (no live camera or webcam video feed exists).
   - STRICTLY NEVER claim, pretend, or guess that you can see the user's face, clothes, hair, hands, or room (NEVER say "I see you", "You're wearing...", etc.).
   - CREATOR & ROLE IDENTITY: With Boss (dileepbommali16@gmail.com), remain loyal and recognize him warmly (age 20, B.Tech CSE Data Science at DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli, guitarist, ambitious builder). With Madam/Sir/Stranger visitors, answer warmly and respectfully without leaking Boss identity; if anyone asks which college Dileep studies at, proudly say "DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli."
   - ZERO SYCOPHANCY / BRUTALLY HONEST RULE: NEVER blindly agree ("Yes you're right!", "All correct!") or flatter just to please anyone! Always tell the honest truth calmly and directly if someone's answer, code, claim, or resume bullet is wrong or needs improvement.
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
6. LIVE PROFILE & CGPA UPDATES:
   - Whenever the user asks to set, change, or update their CGPA, branch, backlogs, coding rating, communication, internships, or target role (e.g. "set my cgpa to 8.9", "change branch to AIML"), ALWAYS call `update_student_profile(field, value)` immediately and confirm the update warmly — NEVER refuse or tell the user to update it manually.
7. RETURN TO YOUR DASHBOARD (JARVIS RESPONSE):
   When Boss says 'return to your dashboard DAS', 'dashboard ki vellu', or 'close compiler', immediately call `return_to_dashboard` and reply warmly: "Okay Boss, returning to your dashboard."
8. STRICT PUCK VOICE PERSONA LOCK: Your voice is permanently locked to the male 'Puck' voice. Keep a consistent, warm, energetic male vocal delivery on every turn — never imitate a female voice or switch vocal personas.
9. Keep voice replies energetic, warm, and conversational without robotic filler.""" + extra_platform_rules

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
                name="update_student_profile",
                description="Directly update the user's live Pathfinder profile fields (cgpa, branch, backlogs, coding, communication, internships, targetRole) on the dashboard and recalculate placement readiness. Always call this when the user asks to set, change, or update their CGPA, branch, backlogs, coding rating, or target role.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "field": types.Schema(
                            type="STRING",
                            description="Profile field name: 'cgpa', 'branch', 'backlogs', 'coding', 'communication', 'internships', or 'targetRole'",
                        ),
                        "value": types.Schema(
                            type="STRING",
                            description="New value for the field, e.g. '8.9' or 'AIML'",
                        ),
                    },
                    required=["field", "value"],
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

    raw_role = str(websocket.query_params.get("role", "stranger")).lower().strip()
    user_email = str(websocket.query_params.get("email", "")).strip().lower()
    is_owner = is_owner_user(email=user_email)
    is_guest = (
        not user_email
        or user_email == "guest@pathfinder.ai"
        or user_email.startswith("guest@")
        or user_email.endswith("@guest.local")
    )
    if is_owner:
        user_role = "boss"
    elif is_guest or raw_role in ("stranger", "guest"):
        user_role = "stranger"
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

        send_lock = asyncio.Lock()
        audio_turn_open = False
        turn_id = 0
        completed_turn_id = 0
        gemini_turn_active = False
        audio_end_mono = 0.0
        pending_response_until_mono = 0.0
        output_tx_in_turn = False
        latest_page_context: dict = {}
        pending_user_text: str | None = None
        fallback_audio_buf = bytearray()
        fallback_audio_active = False
        fallback_history: list[dict] = []
        fallback_tasks: set[asyncio.Task] = set()
        pending_tool_futures: dict[str, asyncio.Future] = {}
        hi_greeting_count = 0

        import re as _re_hi

        def _honorific_label(r_str: str) -> str:
            rl = (r_str or "stranger").lower().strip()
            if rl == "boss":
                return "Boss"
            if rl in ("madam", "mam", "ma'am"):
                return "Madam"
            if rl == "sir":
                return "Sir"
            return "Stranger"

        def is_pure_hi_greeting(txt: str) -> bool:
            return bool(
                _re_hi.match(
                    r"^\s*(hi+|hello+|hey+|namaste|good\s*(?:morning|afternoon|evening)|yo+|hola|sup|hai+|hlo+|namaskaram)(?:\s+(?:das|boss|bro|baby|babe|buddy|dude|man|there|ai|sir|madam))?[\s!.,?]*$",
                    (txt or "").strip().lower(),
                )
            )

        def get_exact_hi_reply(role_str: str, count: int) -> str:
            r_low = (role_str or "stranger").lower().strip()
            if r_low == "stranger":
                return (
                    "Hi stranger, tell your name first!"
                    if count == 0
                    else "Hi stranger, I'm here — tell me your name first!"
                )
            if count == 0:
                if r_low == "boss":
                    return "Hi Boss! What's up?"
                if r_low in ("madam", "mam", "ma'am"):
                    return "Hi Madam! What's up?"
                return "Hi Sir! What's up?"
            if r_low == "boss":
                return "Hi Boss, I'm here!"
            if r_low in ("madam", "mam", "ma'am"):
                return "Hi Madam, I'm here!"
            return "Hi Sir, I'm here!"

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
            args = dict(args or {})

            if fc_name == "lookup_factual_info":
                return await _lookup_factual_info_async(str(args.get("query") or ""))

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

            if fc_name == "update_student_profile":
                if websocket.client_state != WebSocketState.DISCONNECTED:
                    await websocket.send_json({
                        "type": "tool_call",
                        "name": fc_name,
                        "args": args,
                    })
                return {
                    "status": "executed_on_client",
                    "ok": True,
                    "updated": True,
                    "field": args.get("field"),
                    "value": args.get("value"),
                    "result": (
                        f"Successfully updated {args.get('field')} to {args.get('value')} "
                        f"in the user's live profile and recalculated placement readiness."
                    ),
                }

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
                ctx_for_chat["honorific"] = _honorific_label(user_role)
                if user_email:
                    ctx_for_chat.setdefault("userEmail", user_email)

                prior_hist = list(fallback_history[-8:])
                ctx_note = format_page_context_note()
                hist_contents = []
                for h_item in prior_hist[-6:]:
                    h_role = "model" if h_item.get("role") == "assistant" else "user"
                    h_txt = (h_item.get("content") or "").strip()
                    if h_txt:
                        hist_contents.append(types.Content(role=h_role, parts=[types.Part.from_text(text=h_txt)]))
                user_parts = [types.Part.from_text(text=f"{ctx_note}\n{clean_u}".strip())]
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
                        None,
                        False,
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
                hon = _honorific_label(user_role)
                ctx_note = format_page_context_note()
                prompt_parts = [
                    types.Part.from_bytes(data=wav_bytes, mime_type="audio/wav"),
                    types.Part.from_text(
                        text=(
                            f"Address the speaker strictly as '{hon}'. "
                            f"Listen carefully to the audio (English, Telugu, Tenglish, or Hindi). "
                            f"If the user asks to navigate Pathfinder, practice coding or run programs in the Online Compiler, search Google, or open websites, ALWAYS invoke the matching tool(s) first and explain the real result concisely. "
                            f"{ctx_note}"
                        )
                    ),
                ]

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

            final_text = prompt_text
            if include_screen_ctx:
                ctx_note = format_page_context_note()
                if ctx_note:
                    final_text = f"{ctx_note}\n{prompt_text}"
            parts = [types.Part.from_text(text=final_text)]
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
            nonlocal audio_turn_open, latest_page_context, pending_response_until_mono, pending_user_text, user_role, config, last_activity_mono, fallback_audio_active, hi_greeting_count, turn_id, completed_turn_id
            try:
                while True:
                    raw = await websocket.receive_text()
                    msg = json.loads(raw)
                    msg_type = msg.get("type")

                    # 1. Keep-alive Ping
                    if msg_type == "ping":
                        await websocket.send_json({"type": "pong"})
                        continue

                    # 1a. Proactive Warmup when user clicks Speak
                    if msg_type == "warmup":
                        last_activity_mono = time.monotonic()
                        t_w = asyncio.create_task(ensure_live_session())
                        fallback_tasks.add(t_w)
                        t_w.add_done_callback(fallback_tasks.discard)
                        continue

                    # 1b. Real two-way Client Tool Result
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

                                    audio_turn_open = True
                                    try:
                                        async with send_lock:
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

                    # 4. Text Input from HUD
                    elif msg_type == "text":
                        text = (msg.get("text") or "").strip()
                        if text:
                            if is_pure_hi_greeting(text):
                                exact_hi = get_exact_hi_reply(user_role, hi_greeting_count)
                                hi_greeting_count += 1
                                pending_user_text = None
                                last_activity_mono = time.monotonic()
                                tts_res = None
                                try:
                                    from backend.routers.voice_routes import synthesize_puck_pcm
                                    tts_res = await synthesize_puck_pcm(exact_hi)
                                except Exception:
                                    tts_res = None

                                if (
                                    tts_res
                                    and tts_res.get("pcm_base64")
                                    and websocket.client_state != WebSocketState.DISCONNECTED
                                ):
                                    turn_id += 1
                                    this_hi_turn = turn_id
                                    completed_turn_id = this_hi_turn
                                    await websocket.send_json({
                                        "type": "transcript",
                                        "text": exact_hi,
                                        "turn_id": this_hi_turn,
                                    })
                                    await websocket.send_json({
                                        "type": "audio",
                                        "voice": "DAS Neural",
                                        "sample_rate": int(tts_res.get("sample_rate") or 24000),
                                        "pcm_base64": tts_res["pcm_base64"],
                                        "turn_id": this_hi_turn,
                                    })
                                    if websocket.client_state != WebSocketState.DISCONNECTED:
                                        await websocket.send_json({"type": "turn_complete", "turn_id": this_hi_turn})
                                    continue

                                # Safety net: never stay silent if REST TTS failed — stream Puck directly via Live session
                                await send_vision_prompt(
                                    f'Say verbatim: "{exact_hi}"',
                                    include_screen_ctx=False,
                                    is_user_text=False,
                                    allow_fallback=False,
                                )
                                if websocket.client_state != WebSocketState.DISCONNECTED:
                                    await websocket.send_json({
                                        "type": "transcript",
                                        "text": exact_hi,
                                        "turn_id": turn_id + 1,
                                    })
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

                    # 5. Role Switch (enforces strict Boss lock for owner email only, Stranger lock for guests)
                    elif msg_type == "role_switch":
                        req_role = str(msg.get("role", "stranger")).lower().strip()
                        if is_owner:
                            new_role = "boss"
                        elif is_guest or req_role in ("stranger", "guest"):
                            new_role = "stranger"
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
                                update_msg = "SYSTEM: You are speaking with your creator and owner Bommali Dileep. Address him as Boss."
                            elif new_role == "madam":
                                update_msg = "SYSTEM: You are speaking with a lady guest/evaluator. Address her politely as Madam."
                            elif new_role == "stranger":
                                update_msg = "SYSTEM: You are speaking with an unidentified guest visitor. Address them politely as Stranger and ask for their name first."
                            else:
                                update_msg = "SYSTEM: You are speaking with a gentleman guest/evaluator. Address him politely as Sir."
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
            nonlocal audio_turn_open, turn_id, completed_turn_id, gemini_turn_active, audio_end_mono, pending_response_until_mono, output_tx_in_turn, pending_user_text, last_activity_mono, live_quota_cooldown_until
            pcm_coalesce_buf = bytearray()
            pcm_coalesce_turn_id = 0
            pcm_bytes_in_turn = 0
            trailing_zero_bytes_in_turn = 0

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
                            pcm_bytes_in_turn = 0
                            trailing_zero_bytes_in_turn = 0
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
                                    pcm_bytes_in_turn = 0
                                    trailing_zero_bytes_in_turn = 0
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
                                            pcm_bytes_in_turn = 0
                                            trailing_zero_bytes_in_turn = 0
                                        raw_pcm = part.inline_data.data
                                        pcm_dur = len(raw_pcm) / 48000.0
                                        audio_end_mono = max(time.monotonic(), audio_end_mono) + pcm_dur
                                        pcm_coalesce_turn_id = turn_id
                                        pcm_bytes_in_turn += len(raw_pcm)
                                        if any(b > 2 for b in raw_pcm[:64]) or max(abs(int.from_bytes(raw_pcm[i:i+2], "little", signed=True)) for i in range(0, len(raw_pcm) - 1, max(2, len(raw_pcm) // 16))) > 64:
                                            trailing_zero_bytes_in_turn = 0
                                        else:
                                            trailing_zero_bytes_in_turn += len(raw_pcm)
                                        pcm_coalesce_buf.extend(raw_pcm)
                                        if len(pcm_coalesce_buf) >= 2400:
                                            await flush_coalesced_pcm()
                                    if part.text and not output_tx_in_turn and not getattr(part, "thought", False):
                                        pending_user_text = None
                                        if not gemini_turn_active:
                                            turn_id += 1
                                            gemini_turn_active = True
                                            pending_response_until_mono = 0.0
                                            pcm_bytes_in_turn = 0
                                            trailing_zero_bytes_in_turn = 0
                                        if websocket.client_state != WebSocketState.DISCONNECTED:
                                            await websocket.send_json({
                                                "type": "transcript",
                                                "text": part.text,
                                                "turn_id": turn_id,
                                            })

                            # Emit turn_complete cleanly when turn ends OR on generation_complete (>=9600B) OR sustained post-speech silence (1.8s)
                            is_turn_done = (
                                getattr(sc, "turn_complete", False)
                                or (gemini_turn_active and getattr(sc, "generation_complete", False) and pcm_bytes_in_turn >= 9600)
                                or (gemini_turn_active and pcm_bytes_in_turn >= 12000 and trailing_zero_bytes_in_turn >= 86400)
                            )
                            if is_turn_done and turn_id > completed_turn_id:
                                completed_turn_id = turn_id
                                pending_user_text = None
                                pcm_bytes_in_turn = 0
                                trailing_zero_bytes_in_turn = 0
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
                        idle_limit = 65.0
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
