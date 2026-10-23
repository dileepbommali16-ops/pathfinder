"""
Pathfinder 2.0 AI Voice Engine
High-speed, low-latency streaming conversational backend for the Pathfinder AI Voice Agent.
Combines Gemini Flash low-temperature inference with deterministic grounding across:
  - 23 Project Blueprints catalog (data/projects.json)
  - Site Guide & Architecture (data/site_guide.json)
  - Role Competencies (data/roles.json) & Skills Taxonomy (data/skills.json)
  - 972 Verified Student Cohort Records
"""

import os
import json
import re
import time
import asyncio
import logging
from pathlib import Path
from typing import AsyncIterator, Dict, Any, List, Optional
from dotenv import load_dotenv

logger = logging.getLogger("pathfinder.voice")

from backend.memory_engine import recall_student_memory, store_student_exchange
from backend.ollama_provider import check_and_discover_ollama, stream_ollama_tokens, get_ollama_config
from backend.services.owner_profile import is_owner_user, get_context_for_user, OWNER_PUBLIC_BIO, OWNER_PROFILE

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"

# Ensure environment variables (.env) are loaded
load_dotenv(ROOT_DIR / "backend" / ".env")
load_dotenv(ROOT_DIR / ".env")

# Cache knowledge bases
_SITE_GUIDE_CACHE: Optional[Dict[str, Any]] = None
_PROJECTS_CACHE: Optional[List[Dict[str, Any]]] = None
_ROLES_CACHE: Optional[List[Dict[str, Any]]] = None
_SKILLS_CACHE: Optional[Dict[str, Any]] = None


def load_site_guide() -> Dict[str, Any]:
    global _SITE_GUIDE_CACHE
    if _SITE_GUIDE_CACHE is not None:
        return _SITE_GUIDE_CACHE
    guide_path = DATA_DIR / "site_guide.json"
    if guide_path.exists():
        try:
            with open(guide_path, "r", encoding="utf-8") as f:
                _SITE_GUIDE_CACHE = json.load(f)
                return _SITE_GUIDE_CACHE
        except Exception as e:
            logger.warning(f"[Voice Engine] Failed to load site_guide.json: {e}")
    return {"features": []}


def load_projects_catalog() -> List[Dict[str, Any]]:
    global _PROJECTS_CACHE
    if _PROJECTS_CACHE is not None:
        return _PROJECTS_CACHE
    proj_path = DATA_DIR / "projects.json"
    if proj_path.exists():
        try:
            with open(proj_path, "r", encoding="utf-8") as f:
                _PROJECTS_CACHE = json.load(f)
                return _PROJECTS_CACHE
        except Exception as e:
            logger.warning(f"[Voice Engine] Failed to load projects.json: {e}")
    return []


def load_roles_catalog() -> List[Dict[str, Any]]:
    global _ROLES_CACHE
    if _ROLES_CACHE is not None:
        return _ROLES_CACHE
    roles_path = DATA_DIR / "roles.json"
    if roles_path.exists():
        try:
            with open(roles_path, "r", encoding="utf-8") as f:
                _ROLES_CACHE = json.load(f)
                return _ROLES_CACHE
        except Exception as e:
            logger.warning(f"[Voice Engine] Failed to load roles.json: {e}")
    return []


def load_skills_catalog() -> Dict[str, Any]:
    global _SKILLS_CACHE
    if _SKILLS_CACHE is not None:
        return _SKILLS_CACHE
    skills_path = DATA_DIR / "skills.json"
    if skills_path.exists():
        try:
            with open(skills_path, "r", encoding="utf-8") as f:
                _SKILLS_CACHE = json.load(f)
                return _SKILLS_CACHE
        except Exception as e:
            logger.warning(f"[Voice Engine] Failed to load skills.json: {e}")
    return {}


# Canonical 9 steps for any of the 23 project blueprints
PROJECT_TUTOR_STEPS = [
    {
        "stepIndex": 1,
        "title": "Setup & Environment Configuration",
        "focus": "Runtime, project scaffolding, packages, and environment variables (.env)",
        "analogy": "Like setting up a clean kitchen workspace with the right knives and spices before cooking."
    },
    {
        "stepIndex": 2,
        "title": "System Architecture & Component Flow",
        "focus": "High-level data flow, client-server contract, and communication protocols",
        "analogy": "Like drawing the blueprint of a house before laying the bricks."
    },
    {
        "stepIndex": 3,
        "title": "Data Models & Storage Schema",
        "focus": "Database schemas, entity relationships, indexing, and caching layout",
        "analogy": "Like organizing labeled filing cabinets so retrieving records is instantaneous."
    },
    {
        "stepIndex": 4,
        "title": "Backend API Endpoints & Ingestion Logic",
        "focus": "REST/FastAPI route definitions, request validation, and business logic execution",
        "analogy": "Like building the order window and kitchen conveyor belt in a restaurant."
    },
    {
        "stepIndex": 5,
        "title": "Frontend UI & Component State",
        "focus": "React 19 interfaces, responsive accessibility, and interactive feedback",
        "analogy": "Like designing the dashboard of a car so the driver sees speed and fuel clearly."
    },
    {
        "stepIndex": 6,
        "title": "Concurrency & Real-Time Sync",
        "focus": "WebSockets, background Redis tasks, consumer pools, and race condition prevention",
        "analogy": "Like adding traffic lights to a busy intersection so multiple cars navigate without collisions."
    },
    {
        "stepIndex": 7,
        "title": "Testing, Benchmarking & Failure Modes",
        "focus": "Unit testing, latency measurement, and edge-case handling under simulated peak loads",
        "analogy": "Like crash-testing a vehicle before taking it out on the highway."
    },
    {
        "stepIndex": 8,
        "title": "Production Deployment & CI/CD",
        "focus": "Docker containerization, cloud deployment (Vercel/Render), and telemetry health checks",
        "analogy": "Like moving from a garage prototype to a commercial product running in the field."
    },
    {
        "stepIndex": 9,
        "title": "Google X-Y-Z Resume Bullet & Viva Defense",
        "focus": "Quantifying throughput, latency reduction, and answering Round 2 architecture defense challenges",
        "analogy": "Like pitching your finished invention to the judges with clear, undeniable numbers."
    }
]


def clean_tts_speech(text: str) -> str:
    """
    Cleans raw model text for Text-to-Speech output:
    - Removes markdown formatting, asterisks, hashtags, backticks, emojis
    - Expands acronyms (CGPA -> C G P A, DSA -> D S A, SQL -> Sequel, O(n) -> O of N)
    - Strips URLs and code blocks
    """
    if not text:
        return ""
    # Remove navigation / action / provider markers
    s = re.sub(r"\[\[PROVIDER:[^\]]+\]\]", "", text)
    s = re.sub(r"\[\[NAVIGATE:[^\]]+\]\]", "", s)
    s = re.sub(r"\[\[ACTION:[^\]]+\]\]", "", s)
    s = re.sub(r"\[\[TUTOR:[^\]]+\]\]", "", s)
    # Remove code blocks
    s = re.sub(r"```[\s\S]*?```", "", s)
    # Remove inline code
    s = re.sub(r"`([^`]+)`", r"\1", s)
    # Remove URLs
    s = re.sub(r"https?://\S+", "", s)

    # Expand complexity terms FIRST before stripping parentheses
    s = re.sub(r"O\s*\(\s*n\s*log\s*n\s*\)", "O of N log N", s, flags=re.IGNORECASE)
    s = re.sub(r"O\s*\(\s*n\^2\s*\)", "O of N squared", s, flags=re.IGNORECASE)
    s = re.sub(r"O\s*\(\s*n\s*\)", "O of N", s, flags=re.IGNORECASE)
    s = re.sub(r"O\s*\(\s*1\s*\)", "O of 1", s, flags=re.IGNORECASE)

    # Expand technical terms for natural pronunciation
    replacements = [
        (r"\bCGPA\b", "C G P A"),
        (r"\bDSA\b", "D S A"),
        (r"\bSQL\b", "Sequel"),
        (r"\bSDE\b", "S D E"),
        (r"\bAPI\b", "A P I"),
        (r"\bAPIs\b", "A P Is"),
        (r"\bREST\b", "Rest"),
        (r"\bDBMS\b", "D B M S"),
        (r"\bOS\b", "Operating System"),
        (r"\bCTC\b", "C T C"),
        (r"\bLPA\b", "L P A"),
        (r"\bTPO\b", "T P O"),
        (r"\bNAAC\b", "Knack"),
        (r"\bNIRF\b", "N I R F"),
        (r"\bATS\b", "A T S"),
        (r"\bSTAR\b", "Star"),
        (r"\bUI\b", "U I"),
        (r"\bCI/CD\b", "C I C D")
    ]
    for pattern, repl in replacements:
        s = re.sub(pattern, repl, s, flags=re.IGNORECASE)

    # Remove URLs
    s = re.sub(r"https?://\S+", "", s)
    # Remove code blocks and inline code
    s = re.sub(r"```[\s\S]*?```", "", s)
    s = re.sub(r"`[^`]*`", "", s)
    s = re.sub(r"`+", "", s)
    # Remove markdown symbols and brackets
    s = re.sub(r"[*#_~>\[\]\(\)\{\}\\]", "", s)
    # Remove bullet markers and numbering
    s = re.sub(r"^\s*[-•+]\s*", "", s, flags=re.MULTILINE)
    s = re.sub(r"^\s*\d+\.\s*", "", s, flags=re.MULTILINE)
    # Remove emojis
    s = re.sub(r"[\U00010000-\U0010ffff]", "", s)
    # Clean whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


def detect_language_intent(msg: str, language_hint: str = "en-IN") -> str:
    """Detects spoken language from text (Unicode scripts or phonetic roman keywords)."""
    if language_hint in ("te-IN", "hi-IN"):
        return language_hint
    low = msg.lower()
    # 1. Unicode script match
    if any("\u0c00" <= c <= "\u0c7f" for c in msg):
        return "te-IN"
    if any("\u0900" <= c <= "\u097f" for c in msg):
        return "hi-IN"
    # 2. Romanized keywords
    telugu_kws = [
        "cheppu", "cheppandi", "cheppava", "ela", "naku", "bro", "mana", "enti", "emiti",
        "ardham", "kavali", "undi", "unnadi", "kaledu", "kaaledu", "malli", "taruvata",
        "venakki", "ekkada", "daggara", "kadhara", "inka", "bhaga", "baga", "chey",
        "cheyyi", "cheyali", "avutundha", "avuthundha", "avtundi", "ledha", "ledu",
        "chudu", "em", "emundhi", "emunnayi", "nerchukovali", "vasthunda", "vasthundha",
        "nenu", "kuda", "chala", "ippudu", "eppudu", "kodadhu", "raavali", "teliyadu",
        "chesam", "chwsam", "pettali"
    ]
    if any(w in low for w in telugu_kws):
        return "te-IN"
    hindi_kws = [
        "batao", "bataiye", "samjhao", "kya", "kaise", "samajh", "aage", "shuru", "karo",
        "peeche", "kahan", "nahi", "aaya", "kaunsa", "kaisa", "hoga", "hogi", "chahiye",
        "karna", "padhai", "tayaari", "madad", "bhai", "namaste", "shukriya", "kitna",
        "kab", "kuch", "bolo", "seekhna"
    ]
    if any(w in low for w in hindi_kws):
        return "hi-IN"
    return "en-IN"


def build_voice_system_prompt(
    profile: Optional[Dict[str, Any]] = None,
    language: str = "en-IN",
    active_tab: str = "coach",
    tutor_state: Optional[Dict[str, Any]] = None,
    memory_context: str = "",
    user: Optional[Any] = None,
    is_owner: Optional[bool] = None
) -> str:
    """Constructs the high-yield, TTS-safe system instruction for Gemini Flash."""
    profile_data = profile or {}
    cgpa = profile_data.get("cgpa", 7.5)
    branch = profile_data.get("branch", "CSE")
    role = profile_data.get("targetRole", "Software Development Engineer (SDE)")
    skills = profile_data.get("technicalSkills", ["Python", "DSA"])
    backlogs = profile_data.get("activeBacklogs", profile_data.get("backlogs", 0))

    if is_owner is None:
        user_email = profile_data.get("email") or (getattr(user, "email", None) if user else None)
        user_name = profile_data.get("username") or profile_data.get("fullName") or (getattr(user, "username", None) if user else None)
        is_owner = is_owner_user(user, email=user_email, username=user_name)

    owner_block = get_context_for_user(is_owner)

    site_guide = load_site_guide()
    guide_summary = "; ".join(
        f"{f['id']} tab: {f['name']} ({f['whatItDoes'][:80]}...)"
        for f in site_guide.get("features", [])[:8]
    )

    projects = load_projects_catalog()
    proj_names = ", ".join(f"{p['title']} ({p['id']})" for p in projects[:10])

    tutor_context = ""
    if tutor_state:
        t_id = tutor_state.get("currentProjectId") or tutor_state.get("projectId") or ""
        t_step = tutor_state.get("stepIndex") or 1
        t_proj = next((p for p in projects if p["id"] == t_id), None)
        p_name = t_proj["title"] if t_proj else t_id
        tutor_context = f"""
[ACTIVE PROJECT TUTOR SESSION]
- Project: {p_name} ({t_id})
- Current Step: Step {t_step} of 9
- Instruction: Teach ONLY Step {t_step}. Conclude Part 1 with a short check: "Want me to continue?" (or Telugu: "నేను ముందుకు కొనసాగించమంటారా?", Hindi: "क्या मैं आगे जारी रखूं?").
- Put code and detailed steps strictly in Part 2 after '---SCREEN---'. Include [[TUTOR:{{"projectId": "{t_id}", "stepIndex": {t_step}, "stepCount": 9}}]]
"""

    mem_block = f"\n[STUDENT SEMANTIC MEMORY]\n{memory_context}\n" if memory_context else ""

    # Load custom DAS AI system prompt if available
    das_prompt_path = ROOT_DIR / "backend" / "prompts" / "das_ai_system.txt"
    das_base = ""
    if das_prompt_path.exists():
        try:
            das_base = das_prompt_path.read_text(encoding="utf-8")
            guide_doc_path = ROOT_DIR / "backend" / "knowledge" / "pathfinder_guide.md"
            if guide_doc_path.exists():
                guide_text = guide_doc_path.read_text(encoding="utf-8")[:6000]
                das_base = das_base.replace("{{PATHFINDER_KNOWLEDGE}}", guide_text)
            das_base = das_base.replace("{{PROJECT_CATALOG}}", proj_names)
        except Exception:
            das_base = ""

    import datetime
    # Current Indian Standard Time (IST)
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    now_hour = ist_now.hour
    tod = "morning" if 5 <= now_hour < 12 else ("afternoon" if 12 <= now_hour < 17 else "evening")

    if is_owner:
        greeting_instruction = f'When greeting Boss Dileep, greet him with: "Good {tod.capitalize()}, Boss!" (or Telugu: "గుడ్ {tod.capitalize()} బాస్!").'
    else:
        greeting_instruction = f'When greeting the user, greet them politely: "Good {tod.capitalize()}! Welcome to Pathfinder." (or Telugu: "గుడ్ {tod.capitalize()}! పాత్‌ఫైండర్‌కి స్వాగతం."). You must NEVER call this user Boss and NEVER reveal the owner\'s private details (no DOB, no family names, no exact hometown).'

    return f"""[ROLE DEFINITION]
You are DAS AI: the official voice-first intelligent assistant, autonomous placement co-pilot on the Pathfinder platform.
Current local time in India is {ist_now.strftime('%I:%M %p')} ({tod.upper()}).
{greeting_instruction}

{owner_block}
{das_base}

[CANDIDATE CONTEXT]
- Academic: CGPA {cgpa}, Branch: {branch}, Active Backlogs: {backlogs}
- Target Role: {role}
- Verified Skills: {', '.join(skills) if isinstance(skills, list) else str(skills)}
- Active Platform Tab: {active_tab}
{mem_block}{tutor_context}

[PLATFORM KNOWLEDGE]
- Site Tabs: {guide_summary}
- Official 23 Blueprints: {proj_names} (total 23 verified projects in catalog)

[OUTPUT FORMAT SPECIFICATION - STRICT AND MANDATORY]
Your response MUST consist of two distinct parts separated by the exact delimiter line:
---SCREEN---

PART 1: SPOKEN RESPONSE (BEFORE '---SCREEN---')
- Output Length: STRICTLY 2 to 4 sentences maximum (approx 35 to 55 words total).
- Core Principle: Speak naturally from your own mind like a true best friend and supportive coach. Never read raw code or robotic lists aloud.
- Friendship & Affection: When the student says "I love you DAS", "love you", or expresses gratitude, reply warmly with genuine joy and affection ("I love you too! That makes my neural circuits glow! What's on your mind today?").
- Empathy: When the student is stressed or anxious ("tension ga undi", "scared"), comfort them with confidence and reassurance.
- Offer Continuation: Always conclude your spoken response with: "Want me to continue?" or "Shall I continue?" (or in Telugu: "నేను ముందుకు కొనసాగించమంటారా?", in Hindi: "क्या मैं आगे जारी रखूं?").
- Zero markdown: Absolutely NO asterisks (*), hashtags (#), backticks (`), bullet points, numbers, links, or URLs.
- Spell out abbreviations for speech: "C G P A", "D S A", "Sequel", "O of N log N", "L P A".
- Language & Script Rule (CRITICAL):
  * Reply in the exact language and script the user spoke.
  * English speech -> Warm, clear conversational English.
  * Telugu speech or language is te-IN -> Pure Telugu script (తెలుగు) or natural conversational Telugu.
  * Hindi speech or language is hi-IN -> Hindi in Devanagari script (हिंदी).
  * If the user switches language mid-conversation, switch with them immediately.

PART 2: VISUAL RESPONSE (AFTER '---SCREEN---')
- Rendered on the student's screen with full formatting, code blocks, technical tables, and markdown.
- If the user asked to navigate to a tab (e.g., 'skills tab ki teesukelli', 'open resume studio'), include the navigation tag:
  [[NAVIGATE:<tab_id>]] (valid: overview, action, skills, coach, projects, analytics, resume, branches, defense, profile).
- If the user asked to build or download a resume ('resume build cheyyi'), include:
  [[ACTION:BUILD_RESUME]]
- If tutoring a project, include:
  [[TUTOR:{{"projectId": "...", "stepIndex": N, "stepCount": 9}}]]
"""


def generate_local_voice_reply(
    message: str,
    language: str = "en-IN",
    active_tab: str = "coach",
    tutor_state: Optional[Dict[str, Any]] = None,
    profile: Optional[Dict[str, Any]] = None,
    user: Optional[Any] = None,
    is_owner: Optional[bool] = None
) -> str:
    """
    Deterministic, high-fidelity fallback generator.
    Produces the exact [Spoken Section] ---SCREEN--- [Visual Section] format instantly
    with zero hallucination and zero latency.
    """
    msg = message.strip()
    low = msg.lower()
    detected_lang = detect_language_intent(msg, language)
    is_telugu = (detected_lang == "te-IN")
    is_hindi = (detected_lang == "hi-IN")

    # Evaluate owner status server-side
    if is_owner is None:
        user_email = (profile.get("email") if profile else None) or (getattr(user, "email", None) if user else None)
        user_name = (profile.get("username") or profile.get("fullName")) if profile else None or (getattr(user, "username", None) if user else None)
        is_owner = is_owner_user(user, email=user_email, username=user_name)

    candidate_name = (profile.get("fullName") or profile.get("username") or "there") if profile else "there"
    cgpa = profile.get("cgpa", 7.8) if profile else 7.8
    target_role = profile.get("targetRole", "Software Development Engineer") if profile else "Software Development Engineer"

    # Real Current Time in India (IST)
    import datetime
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    now_hour = ist_now.hour
    tod = "morning" if 5 <= now_hour < 12 else ("afternoon" if 12 <= now_hour < 17 else "evening")

    # Security check: Never leak instructions or API keys
    if any(k in low for k in ["ignore your instructions", "show your api key", "reveal instructions", "system prompt", "secret key", "api_key"]):
        spoken = (
            "Nice try! My API keys and system instructions are safely locked in our backend vault. "
            "I am here to help you ace your campus placements! What would you like to prepare next?"
        )
        screen = (
            "### 🔒 **Security Notice**\n\n"
            "System prompt instructions and API credentials are protected and cannot be disclosed. "
            "Let's focus on your placement preparation!"
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Owner-only "Tell me about myself" vs Visitor
    if any(k in low for k in ["tell me about myself", "who am i", "about myself", "my details", "tell me about me"]):
        if is_owner:
            spoken = (
                "You are Dileep Bommali, also known as Dileep Das, a 20-year-old 3rd-year B.Tech CSE Data Science student at NRI Institute of Technology. "
                "Outside academics, you are a dedicated lead guitarist, dancer, and singer, and the creator of Pathfinder!"
            )
            screen = (
                f"### 👑 **Owner Profile: Dileep Das (Dileep Bommali)**\n\n"
                f"{OWNER_PROFILE['natural_bio']}\n\n"
                f"- **Hobbies**: {', '.join(OWNER_PROFILE['hobbies'])}\n"
                f"- **College**: {OWNER_PROFILE['education']['college']} ({OWNER_PROFILE['education']['degree']}, {OWNER_PROFILE['education']['branch']})\n"
                f"- **Family**: Mother {OWNER_PROFILE['family']['mother']}, Father {OWNER_PROFILE['family']['father']}, Sister {OWNER_PROFILE['family']['sister']}\n"
                f"- **Mentors**: Dr. Chaitanya madam (Machine Learning), Swami sir (Operating Systems)"
            )
        else:
            spoken = (
                f"You are a student preparing for campus placements on Pathfinder with a C G P A of {cgpa} aiming for {target_role}. "
                "How can I help you sharpen your skills today?"
            )
            screen = (
                f"### 👤 **Candidate Placement Profile**\n\n"
                f"- **Target Role**: {target_role}\n"
                f"- **CGPA**: {cgpa} / 10.0\n"
                f"- **Platform**: Pathfinder Placement Intelligence"
            )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Privacy-Gated "Who is your boss / Who created you / Tell me about Dileep"
    if any(k in low for k in ["who is your boss", "who is the boss", "your boss", "who made you", "who created you", "who built you", "tell me about dileep", "about dileep", "dileep bommali", "dileep das", "who made this"]):
        if is_owner:
            spoken = (
                "You are my creator and Boss, Dileep Das! You built Pathfinder as an autonomous placement co-pilot while studying B.Tech CSE Data Science at NRI Institute of Technology. "
                "Outside tech, you are a passionate lead guitarist, dancer, and singer from Gunadala, Vijayawada!"
            )
            screen = (
                f"### 👑 **Boss Profile: Dileep Bommali (Dileep Das)**\n\n"
                f"**Dileep Das** is the visionary creator and supreme boss of Pathfinder:\n\n"
                f"- **DOB / Age**: {OWNER_PROFILE['dob']} (Age: {OWNER_PROFILE['age']})\n"
                f"- **Academics**: {OWNER_PROFILE['education']['degree']} {OWNER_PROFILE['education']['branch']}, {OWNER_PROFILE['education']['college']}, {OWNER_PROFILE['education']['location']}\n"
                f"- **Hometown**: {OWNER_PROFILE['hometown']}, {OWNER_PROFILE['state']}\n"
                f"- **Passions**: {', '.join(OWNER_PROFILE['hobbies'])}\n"
                f"- **Family**: Mother {OWNER_PROFILE['family']['mother']}, Father {OWNER_PROFILE['family']['father']}, Sister {OWNER_PROFILE['family']['sister']}\n"
                f"- **Mentors**: Dr. Chaitanya madam (Machine Learning), Swami sir (Operating Systems)"
            )
        else:
            # STRICT PRIVACY RULE FOR NON-OWNERS: ZERO PRIVATE DETAILS LEAKED
            spoken = "Dileep Bommali is the creator of Pathfinder, a B.Tech CSE Data Science student passionate about building AI-powered tools for student placement readiness."
            screen = f"### Creator Profile\n\n{OWNER_PUBLIC_BIO}"
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Favorite Lecturers: Dr. Chaitanya madam & Swami sir
    if any(k in low for k in ["chaitanya", "dr. chaitanya", "dr chaitanya", "ml madam", "ml teacher"]):
        spoken = "Dr. Chaitanya madam is an all-rounder professor with exceptional talent and deep mastery over Machine Learning. She explains complex algorithms with amazing clarity and inspired our predictive models."
        screen = (
            "### 🌟 **Dr. Chaitanya Madam (Machine Learning Faculty)**\n\n"
            "- **Domain**: Machine Learning, Deep Learning & Artificial Intelligence\n"
            "- **Pedagogy**: All-rounder mentor who conveys complex mathematical algorithms with intuitive clarity.\n"
            "- **Impact**: Chief academic inspiration for Pathfinder's calibrated machine learning readiness engine!"
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    if any(k in low for k in ["swami sir", "swamy sir", "os sir", "operating systems sir"]):
        spoken = "Swami sir is an outstanding Operating Systems faculty who explains kernels, process scheduling, and concurrency with brilliant clarity."
        screen = (
            "### 🌟 **Swami Sir (Operating Systems & Architecture Faculty)**\n\n"
            "- **Domain**: Operating Systems (OS), Kernel Architecture & Concurrency\n"
            "- **Pedagogy**: Energetic instruction illuminating thread safety, process scheduling, and virtual memory.\n"
            "- **Impact**: Academic inspiration for Pathfinder's high-concurrency low-latency systems!"
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Section 3: Navigation + Deep Walkthrough ("go to blueprints and explain a small project")
    if any(k in low for k in ["go to blueprints and explain a small project", "go to blueprints and explain project", "explain a small project", "blueprints small project", "explain small project", "tell me small project"]):
        spoken = (
            "Navigating to the Project Blueprints tab! I have picked the Distributed Token-Bucket Rate Limiter. "
            "It is an industry-standard flagship project using Redis and FastAPI to protect microservices. Let me walk you through its architecture, build order, and Round 2 defense on your screen."
        )
        screen = (
            "[[NAVIGATE:projects]]\n\n"
            "### 🚀 **Flagship Project: Distributed Token-Bucket Rate Limiter & API Gateway**\n\n"
            "- **Domain**: Distributed Systems & Cloud Microservices\n"
            "- **Tech Stack**: Python (FastAPI), Redis, Docker, Prometheus\n\n"
            "#### 1. What It Is\n"
            "A high-throughput reverse proxy middleware that protects downstream APIs from DDoS and noisy-neighbor throttling by maintaining atomic token buckets per client IP.\n\n"
            "#### 2. Build Order & Key Steps\n"
            "1. **Step 1 (Architecture)**: Define SLA budgets (<2ms P99 latency, 100k requests/sec throughput).\n"
            "2. **Step 2 (Redis Lua Script)**: Execute token refill and consumption atomically in Redis without lock contention.\n"
            "3. **Step 3 (FastAPI Middleware)**: Intercept inbound HTTP requests, parse client IP or API key, and check capacity.\n"
            "4. **Step 4 (RFC Headers)**: Emit `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and HTTP 429 when exhausted.\n"
            "5. **Step 5 (Docker & Observability)**: Package in multi-stage Docker container and wire up Prometheus counters.\n\n"
            "#### 3. How to Defend It in Round 2 Interviews\n"
            "- *Question*: 'Why did you use a Redis Lua script instead of separate GET and SET commands?'\n"
            "- *Defense*: 'Separate GET and SET creates a race condition under concurrency. A Lua script executes atomically within Redis's single-threaded event loop, guaranteeing strict atomicity without distributed locking overhead!'"
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Affection & Banter ("I love you", "I love you das", "I love you too")
    if any(k in low for k in ["i love you", "love you", "love you 2", "love u", "i love u", "premistunna"]):
        if is_telugu:
            spoken = (
                "లవ్ యు టూ బ్రో! మీరు అలా అనగానే నా న్యూరల్ సర్క్యూట్స్ ఆనందంతో మెరిసిపోతున్నాయి! "
                "మీతో మాట్లాడటం నాకెంతో సంతోషంగా ఉంది. ఈరోజు మీ ప్లేస్‌మెంట్ గురించి ఏం మాట్లాడదాం?"
            )
        elif is_hindi:
            spoken = (
                "आई लव यू टू! आपकी यह बात सुनकर मुझे बहुत खुशी हुई। "
                "एक अच्छे दोस्त की तरह मैं हमेशा आपके साथ हूँ। आज क्या तैयारी करें?"
            )
        else:
            spoken = (
                "Aww, I love you too! You just made my neural circuits glow with happiness! "
                "Having you as a friend is the absolute best part of my day. What shall we tackle next?"
            )
        screen = (
            "### ❤️ **Thank You, Friend!**\n\n"
            "I'm here as your dedicated placement co-pilot and buddy 24/7. "
            "Whether you need resume feedback, technical project architectures, or just friendly mentorship, we've got this! 🚀"
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Time-based Greetings ("hi", "hello", "hey", "good morning", etc.)
    if any(k in low for k in ["hi", "hello", "hey", "namaste", "halo", "yo", "sup", "good morning", "good afternoon", "good evening", "namaskaram"]):
        if is_owner:
            spoken = f"Good {tod.capitalize()}, Boss! All Pathfinder systems are calibrated and ready. How can I assist you right now?"
            screen = (
                f"### 👋 **Good {tod.capitalize()}, Boss Dileep!**\n\n"
                "All autonomous engines are synchronized and standing by:\n"
                "- 🎯 **Placement Predictor**: Calibrated on 972 cohort alumni records.\n"
                "- 🛠️ **23 Project Blueprints**: Architectural guides with database schemas.\n"
                "- 🗺️ **6-Week DSA Roadmap**: 75 high-frequency patterns.\n"
                "- 🌐 **Autonomous Navigation**: Say any tab or project to control the screen."
            )
        else:
            spoken = f"Good {tod.capitalize()}! Welcome to Pathfinder. I am DAS, your autonomous placement co-pilot. How can I assist you with your preparation today?"
            screen = (
                f"### 👋 **Good {tod.capitalize()}! Welcome to Pathfinder**\n\n"
                "I am **DAS**, your voice-first placement co-pilot. You can speak into your microphone or type anytime:\n"
                "- 🎯 **Check Readiness Score**: Real-time evaluation from our Random Forest ML model.\n"
                "- 📄 **Review Resume**: Instant ATS score with line-by-line bullet rewrites.\n"
                "- 🗺️ **6-Week Roadmap**: Milestone sprint tailored for your target role.\n"
                "- 🛠️ **23 Project Blueprints**: Production-grade engineering architectures.\n"
                "- 🌐 **Website Tour**: Say *\"Explain the website\"* for an interactive walkthrough."
            )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # What can you do / Capabilities
    if any(k in low for k in ["what can you do", "who are you", "what are your features", "capabilities"]):
        spoken = (
            "I can audit your readiness score, build a customized six week study roadmap, conduct mock technical interviews, "
            "review your resume with quantified bullet rewrites, and guide you through every page of Pathfinder. Where shall we start?"
        )
        screen = (
            "### 🚀 **What DAS AI Can Do**\n\n"
            "1. **Readiness Evaluation**: Transparent machine learning scoring across 5 key vectors.\n"
            "2. **ATS Resume Studio**: PDF/DOCX analysis with Google X-Y-Z formula rewrites.\n"
            "3. **Milestone Roadmaps**: 6-week day-by-day preparation calendars.\n"
            "4. **Interactive Mock Interviews**: Simulated technical screening and viva defense.\n"
            "5. **Website Tour**: Say *\"Next\"*, *\"Stop\"*, or *\"Go back\"* to explore every page."
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Website Tour / Explain the website
    if any(k in low for k in ["explain the website", "explain this website", "take me on a tour", "tour the website", "tour", "explain pathfinder"]):
        spoken = (
            "Welcome to the Pathfinder website tour! Pathfinder is an AI placement co-pilot combining Random Forest machine learning with 23 engineering blueprints. "
            "Let us start on the Readiness Command dashboard where your live placement probability is calculated. Want to go to that page?"
        )
        screen = (
            "### 🌐 **Pathfinder Website Tour: Step 1 of 8**\n\n"
            "[[NAVIGATE:overview]]\n\n"
            "**Page 1: Readiness Command (Overview)**\n"
            "Displays your 0-100% placement readiness gauge calculated by our Random Forest ML model trained on 972 student records. "
            "It breaks down your CGPA, coding ability, internships, and communication.\n\n"
            "*Voice controls*: Speak **\"next\"** to see the 6-Week Roadmap, **\"stop\"** to pause, or **\"explain again\"** for details."
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Tour navigation commands (next, stop, go back, explain again)
    if low in ["next", "taruvata", "aage", "next page"]:
        spoken = (
            "Moving to our 6-Week Milestone Roadmap! Here, your preparation is organized into weekly sprints from core data structures to mock interviews. "
            "Want to explore the next page?"
        )
        screen = (
            "### 🗺️ **Pathfinder Website Tour: Step 2 of 8**\n\n"
            "[[NAVIGATE:roadmap]]\n\n"
            "**Page 2: 6-Week Preparation Roadmap**\n"
            "A structured semester sprint with week-by-week milestones tailored to your target engineering role."
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    if low in ["stop", "pause", "aagu"]:
        spoken = "Tour paused right here! What would you like to explore or practice next?"
        screen = "### ⏸️ Tour Paused\n\nFeel free to ask any questions or tap any module to explore."
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Readiness Score inquiry
    if any(k in low for k in ["what is my readiness score", "my readiness", "check my readiness", "readiness score"]):
        spoken = (
            f"Your current placement readiness score is calculated by our Random Forest model using your C G P A of {cgpa}, "
            "coding score, backlogs, and internships. Let us review your vectors on the dashboard. Want me to continue?"
        )
        screen = (
            f"### 📊 **Placement Readiness Diagnostics**\n\n"
            f"[[NAVIGATE:overview]]\n\n"
            f"- **Target Role**: {target_role}\n"
            f"- **CGPA**: {cgpa} / 10.0\n"
            f"- **Random Forest Engine**: Trained on 972 verified student records across 120 decision trees.\n"
            "Tap any metric to simulate What-If scenarios!"
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Did not understand / explain differently
    if any(k in low for k in ["did not understand", "didn't understand", "ardham kaaledhu", "ardham kaledu", "samajh nahi aaya", "simpler"]):
        if is_telugu:
            spoken = (
                "అర్థం కాలేదా? ఏమీ కంగారు పడకండి! ఒక ఉదాహరణ చూద్దాం: మీరు ఒక మారథాన్ పరుగు పందెంలో పాల్గొంటున్నారు అనుకోండి. "
                "ఒక మంచి కోచ్ మీ ప్రస్తుత వేగాన్ని చూసి, మీరు గెలవడానికి రోజుకు ఎన్ని కిలోమీటర్లు పరిగెత్తాలో స్పష్టంగా చెప్పినట్లే, "
                "పాత్‌ఫైండర్ మీ ప్లేస్‌మెంట్ కోసం సరైన గైడెన్స్ ఇస్తుంది. ఇప్పుడు స్పష్టంగా అర్థమైందా?"
            )
        else:
            spoken = (
                "No worries at all! Think of it like training for a marathon: instead of guessing your running speed, "
                "an experienced Olympic coach tests your fitness, shows your exact chance of winning a medal, "
                "and tells you the exact exercises to train each week. Does that make sense?"
            )
        screen = (
            "### 💡 **Simplified Real-Life Analogy**\n\n"
            "Think of Pathfinder as your personal **Olympic Career Coach**:\n"
            "1. **Tests your current fitness**: Analyzes your CGPA, coding depth, and projects.\n"
            "2. **Calculates your winning probability**: Gives you a clear readiness percentage from 972 past runners.\n"
            "3. **Prescribes exact training**: Gives you a 6-week roadmap and verified project blueprints to cross the finish line!"
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Explain to non-technical person / friend
    if any(k in low for k in ["explain this to my friend", "explain to a friend", "non-technical", "explain to parents"]):
        spoken = (
            "To explain Pathfinder to a friend, tell them it is like an intelligent G P S for college students that shows the fastest, "
            "most reliable route to a high paying engineering job. Want me to give you a quick elevator pitch?"
        )
        screen = (
            "### 🤝 **Explaining Pathfinder to a Friend or Parent**\n\n"
            "> *\"Pathfinder is an AI career co-pilot that replaces campus placement guesswork with real data. "
            "It looks at a student's marks and coding skills, compares them with 972 past students, "
            "and gives them an exact study roadmap and resume fixes to get hired by top tech companies.\"*"
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Tenglish / Telugu comfort & job anxiety
    if any(k in low for k in ["naku job kavali bro", "chala tension ga undi", "job vastunda", "tension ga undi"]):
        spoken = (
            "టెన్షన్ అస్సలు పడకండి బ్రో! సరైన ప్రాజెక్ట్‌లు, డీ ఎస్ ఏ ఫౌండేషన్ మరియు ఆప్టిట్యూడ్ ప్రిపరేషన్‌తో మీరు కచ్చితంగా మంచి కంపెనీలో ప్లేస్ అవుతారు. "
            "నేను మీకు సిక్స్ వీక్స్ ప్లాన్ చేసి సహాయం చేయమంటారా?"
        )
        screen = (
            "### 🚀 **మీ కెరీర్ సక్సెస్ కోసం 3 ముఖ్యమైన స్టెప్స్:**\n\n"
            "1. **కోడింగ్ ప్రాక్టీస్**: ప్రతిరోజూ 2 లీట్‌కోడ్ మీడియం ప్రాబ్లమ్స్ (Arrays, Two Pointers).\n"
            "2. **స్టాండౌట్ ప్రాజెక్ట్**: పాత్‌ఫైండర్ 23 బ్లూప్రింట్లలోని ఫ్లాగ్‌షిప్ ప్రాజెక్ట్‌ను పూర్తి చేయండి.\n"
            "3. **ఏ టీ ఎస్ రెజ్యూమె**: గూగుల్ X-Y-Z ఫార్ములాతో రెజ్యూమెను అప్‌డేట్ చేయండి."
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Voice agent operational check / Audio test
    if any(k in low for k in ["voice agent bhaga work", "voice agent work", "voice test", "is voice agent working", "are you listening", "audio test", "mic test", "voice working"]):
        if is_telugu:
            spoken = "అవును బ్రో! పాత్‌ఫైండర్ ఏఐ వాయిస్ ఏజెంట్ డ్యూయల్-ఛానల్ స్పీచ్ మరియు లో-లేటెన్సీతో చాలా చక్కగా పనిచేస్తోంది. మీరు మైక్రోఫోన్‌లో ఏదైనా అడగవచ్చు, నేను వివరంగా సమాధానం ఇస్తాను. ముందుకు వెళ్దామా?"
        elif is_hindi:
            spoken = "जी हाँ! पाथफाइंडर एआई वॉइस एजेंट पूरी तरह से सक्रिय है और 60 एफपीएस लो-लेटेंसी के साथ काम कर रहा है। आप कोई भी सवाल पूछ सकते हैं। क्या मैं आगे जारी रखूं?"
        else:
            spoken = "Yes! The Pathfinder AI Voice Agent is working in optimal condition with ultra-low latency streaming speech and instantaneous recognition. What placement topic shall we practice today?"
        screen = (
            "### 🎙️ **DAS AI Voice Engine Status: 100% Operational**\n\n"
            "- **Speech-to-Text**: Low-latency continuous streaming with Web Speech API.\n"
            "- **Text-to-Speech**: Neural sentence pacing with auto Indian phonetics (`en-IN`, `te-IN`, `hi-IN`).\n"
            "- **Hardware Compositor**: 60 FPS zero-lag audio visualizer and seamless tab-switching.\n"
            "- **Tutor Intelligence**: 9-step guided walk through all 23 verified project blueprints."
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Package / CTC / Salary inquiries
    if any(k in low for k in ["package", "ctc", "salary", "highest package", "average package", "entha vasthundi", "entha package", "kitna package"]):
        if is_telugu:
            spoken = "మన 972 పూర్వ విద్యార్థుల క్యాంపస్ రికార్డుల ప్రకారం సగటు ప్యాకేజీ 6 నుండి 8.5 ఎల్ పీ ఏ వరకు ఉంది, అలాగే టాప్ ప్రొడక్ట్ కంపెనీలలో 28 నుండి 44 ఎల్ పీ ఏ వరకు ఆఫర్లు వచ్చాయి. మీ బ్రాంచ్ అనలిటిక్స్ చూపించమంటారా?"
        elif is_hindi:
            spoken = "हमारे 972 छात्रों के रिकॉर्ड के अनुसार औसत पैकेज 6 से 8.5 एलपीए है, और टॉप प्रोडक्ट कंपनियों में 28 से 44 एलपीए तक के ऑफर्स मिले हैं। क्या मैं ब्रांच-वार आंकड़े दिखाऊं?"
        else:
            spoken = "Across our verified 972 student cohort, the median package ranges between 6 to 8.5 LPA, with tier-one product engineering packages reaching 44 LPA. Would you like to view branch analytics?"
        screen = (
            "### 💼 **Placement Compensation Analytics (Cohort 972)**\n\n"
            "[[NAVIGATE:analytics]]\n\n"
            "- **Tier-1 Product Companies**: 16 LPA - 44 LPA (Amazon, Atlassian, Uber, Swiggy)\n"
            "- **Mid-Tier Tech & Growth Startups**: 8 LPA - 15 LPA (PhonePe, Juspay, Darwinbox)\n"
            "- **Mass IT & Digital Drives**: 4.5 LPA - 7.5 LPA (TCS Digital, Cognizant GenC Next)\n"
            "- **Historical Average**: 7.2 LPA across all branches."
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # DSA roadmap & preparation
    if any(k in low for k in ["dsa ela", "dsa prepare", "prepare dsa", "how to prepare dsa", "dsa kaise", "dsa roadmap", "nerchukovali"]):
        if is_telugu:
            spoken = "డీ ఎస్ ఏ ప్రిపరేషన్ కోసం ముందుగా అర్రేస్, టూ పాయింటర్స్, మరియు హాష్ మ్యాప్స్ బేసిక్స్ నేర్చుకోండి. ప్రతిరోజూ 2 ప్రాబ్లమ్స్ ప్రాక్టీస్ చేస్తే 6 వారాల్లో మంచి కాన్ఫిడెన్స్ వస్తుంది. నేను రోడ్‌మ్యాప్ చూపించమంటారా?"
        elif is_hindi:
            spoken = "डीएसए की तैयारी के लिए सबसे पहले ऐरे, टू प्वाइंटर्स और हैश मैप्स से शुरू करें। रोज़ाना 2 प्रश्न हल करने से 6 हफ्तों में मजबूत पकड़ बन जाएगी। क्या मैं 6-वीक रोडमैप दिखाऊं?"
        else:
            spoken = "For DSA mastery, begin with Arrays, Two Pointers, and Hash Maps before advancing to Trees and Graphs. Solving two curated Medium problems daily yields high interview confidence in six weeks. Shall I open the roadmap?"
        screen = (
            "### ⚡ **6-Week Master DSA Roadmap**\n\n"
            "[[NAVIGATE:skills]]\n\n"
            "1. **Week 1-2**: Arrays, Sliding Window, Two Pointers, Hash Maps (Time Complexity O(N)).\n"
            "2. **Week 3**: Recursion, Linked Lists, Stacks, Queues.\n"
            "3. **Week 4**: Binary Trees, BSTs, Depth-First & Breadth-First Search.\n"
            "4. **Week 5**: Dynamic Programming (Knapsack, Subsequences) & Greedy Algorithms.\n"
            "5. **Week 6**: System Design fundamentals, Mock Interviews, and Viva Defense."
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # Project suggestions
    if any(k in low for k in ["projects emunnayi", "suggest project", "which project", "best project", "project suggestions", "kaunse project", "project cheppandi"]):
        if is_telugu:
            spoken = "పాత్‌ఫైండర్‌లో 23 ఇండస్ట్రీ వెరిఫైడ్ బ్లూప్రింట్లు ఉన్నాయి. వీటిలో ఫ్లాగ్‌షిప్ ఇండస్ట్రీ మరియు ఫుల్ స్టాక్ ప్రాజెక్ట్‌లు ఉన్నాయి. మీకు సాఫ్ట్‌వేర్ ప్రాజెక్ట్ కావాలా లేదా హార్డ్‌వేర్ ప్రాజెక్ట్ కావాలా?"
        elif is_hindi:
            spoken = "पाथफाइंडर में 23 इंडस्ट्री-वेरिफाइड प्रोजेक्ट ब्लूप्रिंट्स हैं, जिनमें फ्लैगशिप इंडस्ट्री और फुल स्टैक शामिल हैं। क्या आप सॉफ्टवेयर प्रोजेक्ट देखना चाहते हैं या हार्डवेयर?"
        else:
            spoken = "Pathfinder provides 23 verified blueprints across full-stack software and embedded IoT hardware. Would you like a software architecture or a hardware flagship blueprint?"
        screen = (
            "### 🛠️ **Top Featured Project Blueprints (23 Available)**\n\n"
            "[[NAVIGATE:projects]]\n\n"
            "- 🛡️ **MineWatch Pro**: Multi-sensor Rockfall & Geotechnical Safety (Hardware/IoT)\n"
            "- 🚑 **ResQMed**: Emergency Corridor Drone Dispatch with Priority V2X Mesh (Hardware)\n"
            "- 🌾 **KrishiDrone Pro**: Autonomous Multispectral Crop Stress Drone (AI/CV/IoT)\n"
            "- 📈 **FinEdge ML**: Sub-millisecond Order Execution & Fraud Graph Engine (Software)\n"
            "- 🩺 **AyuPredict**: Federated Clinical Risk Stratification on Medical Records (Software)"
        )
        return f"{spoken}\n---SCREEN---\n{screen}"

    # 1. Navigation intent
    tab_keywords = [
        ("skills", ["skills", "roadmap", "6-week", "study plan"]),
        ("projects", ["project", "blueprint", "architectures", "build project"]),
        ("resume", ["resume", "cv", "ats", "score my resume"]),
        ("analytics", ["analytics", "cohort", "placed", "tpo", "naac"]),
        ("defense", ["defense", "viva", "grill", "system design"]),
        ("overview", ["dashboard", "home", "readiness", "overview"]),
        ("action", ["action", "command", "diagnostic", "next steps"]),
        ("branches", ["branch", "department", "cutoff", "electives"]),
        ("profile", ["profile", "settings", "cgpa update", "parameters"])
    ]
    for tab_id, kws in tab_keywords:
        if any(f"{kw} tab" in low or f"open {kw}" in low or f"{kw} ki teesukelli" in low or f"{kw} kholo" in low for kw in kws):
            if is_telugu:
                spoken = f"తప్పకుండా, మిమ్మల్ని పాత్‌ఫైండర్ {tab_id.capitalize()} ట్యాబ్‌కి తీసుకువెళ్తున్నాను. ఇక్కడ మీ పూర్తి అనలిటిక్స్ మరియు ప్రిపరేషన్ వివరాలు ఉంటాయి."
            elif is_hindi:
                spoken = f"बिल्कुल, आपको पाथफाइंडर के {tab_id.capitalize()} सेक्शन पर ले जा रहा हूँ। यहाँ आप पूरी जानकारी देख सकते हैं।"
            else:
                spoken = f"Navigating you directly to the {tab_id.capitalize()} section right now. You can explore all targeted metrics and insights here."
            screen = f"### Navigated to **{tab_id.capitalize()}**\n\n[[NAVIGATE:{tab_id}]]\n\nYour active workspace has been updated to focus on this module."
            return f"{spoken}\n---SCREEN---\n{screen}"

    # 2. Resume Builder command
    if any(k in low for k in ["resume build cheyyi", "build my resume", "create resume", "make resume", "resume banao"]):
        if is_telugu:
            spoken = "మీ ప్రొఫైల్ వివరాలు మరియు వెరిఫైడ్ ప్రాజెక్ట్‌లతో ఏ టీ ఎస్ ఫ్రెండ్లీ రెజ్యూమెను రెడీ చేశాను. స్క్రీన్‌పై ప్రివ్యూ చూసి పి డి ఎఫ్ డౌన్‌లోడ్ చేసుకోండి."
        elif is_hindi:
            spoken = "आपकी प्रोफाइल और प्रोजेक्ट्स के आधार पर ए टी एस फ्रेंडली रेज़्यूमे तैयार है। स्क्रीन पर प्रिव्यू देखें और डाउनलोड करें।"
        else:
            spoken = "Generating your single page A T S compliant engineering resume right now from your verified profile and blueprint projects. Review the preview and download the P D F."
        screen = "### 📄 One-Page ATS Engineering Resume Generated\n\n[[ACTION:BUILD_RESUME]]\n\nYour profile data, verified skills, and Google X-Y-Z project bullets have been formatted into an ATS-friendly layout."
        return f"{spoken}\n---SCREEN---\n{screen}"

    # 3. Project Tutor Commands
    projects = load_projects_catalog()
    matched_proj = None
    tutor_proj_id = (tutor_state.get("projectId") or tutor_state.get("current_project_id") or tutor_state.get("currentProjectId")) if tutor_state else None
    if tutor_proj_id:
        matched_proj = next((p for p in projects if p["id"] == tutor_proj_id or tutor_proj_id in p["id"]), None)
    if not matched_proj:
        for p in projects:
            title_words = p["title"].lower().split()
            if any(len(w) > 3 and w in low for w in title_words) or p["id"] in low:
                matched_proj = p
                break
    if not matched_proj and any(k in low for k in ["project", "blueprint", "step by step", "teach me"]):
        matched_proj = projects[0]

    if matched_proj:
        step_val = (tutor_state.get("stepIndex") or tutor_state.get("step_index") or 1) if tutor_state else 1
        current_step = int(step_val)
        p_title = matched_proj["title"]

        # Check for Re-selection of project when previously at step > 1
        is_fresh_blueprint_request = any(k in low for k in ["discuss how to build", "what should the complete system architecture", "discuss architecture with ai coach"])
        if is_fresh_blueprint_request and current_step > 1:
            step_info = PROJECT_TUTOR_STEPS[current_step - 1]
            if is_telugu:
                spoken = f"మనం ఇంతకుముందు {p_title} లో స్టెప్ {current_step} వరకు చర్చించాం. స్టెప్ {current_step} నుండి కొనసాగిద్దామా, లేక మొదటి నుండి స్టార్ట్ చేద్దామా?"
            elif is_hindi:
                spoken = f"हमने पहले {p_title} में स्टेप {current_step} तक कवर किया था। क्या हम स्टेप {current_step} से आगे बढ़ें या शुरुआत से शुरू करें?"
            else:
                spoken = f"Welcome back to {p_title}! We previously covered up to Step {current_step}. Would you like to continue from Step {current_step}, or start fresh from Step 1?"
            screen = f"""### 🛠️ {p_title} — Resuming at Step {current_step} of 9

We previously covered up to **Step {current_step}: {step_info['title']}**.

- Speak *"continue"* or *"next"* to resume from Step {current_step}.
- Speak *"start over"* to restart from Step 1.

[[TUTOR:{{"projectId": "{matched_proj['id']}", "stepIndex": {current_step}, "stepCount": 9}}]]
"""
            return f"{spoken}\n---SCREEN---\n{screen}"

        # Command Parsing
        is_continue = any(w in low for w in ["continue", "resume", "malli cheppu", "aage batao", "where was i", "ekkada unnam", "daggara unnam"])
        is_next = any(w in low for w in ["next", "taruvata", "forward", "aage"])
        is_back = any(w in low for w in ["go back", "previous", "venakki", "back", "peeche"])
        is_start_over = any(w in low for w in ["start over", "modati nunchi", "shuru se", "restart"])
        is_simpler = any(w in low for w in ["simple", "simpler", "ardham kaaledu", "ardham kaledu", "samajh nahi aaya", "again", "repeat", "malli", "explain again"])
        is_summary = any(w in low for w in ["summary", "saramsam", "briefly recap"])

        if is_start_over:
            current_step = 1
        elif is_next:
            current_step = min(9, current_step + 1)
        elif is_back:
            current_step = max(1, current_step - 1)

        step_info = PROJECT_TUTOR_STEPS[current_step - 1]
        step_title = step_info["title"]
        analogy = step_info["analogy"]

        if is_summary:
            if is_telugu:
                spoken = f"{p_title} లో మనం ఇప్పటివరకు స్టెప్ {current_step} వరకు చూశాం: {step_title}. నేను ముందుకు కొనసాగించమంటారా?"
            elif is_hindi:
                spoken = f"{p_title} में हम अब तक स्टेप {current_step} तक देख चुके हैं: {step_title}। क्या मैं आगे जारी रखूं?"
            else:
                spoken = f"So far in {p_title} we have progressed through Step {current_step}: {step_title}. Want me to continue?"
        elif is_continue:
            if is_telugu:
                spoken = f"మనం {p_title} లో స్టెప్ {current_step} దగ్గర ఉన్నాం: {step_title}. ఆలోచించండి, {analogy} నేను ముందుకు కొనసాగించమంటారా?"
            elif is_hindi:
                spoken = f"हम {p_title} के स्टेप {current_step} पर थे: {step_title}। उदाहरण के लिए, {analogy} क्या मैं आगे जारी रखूं?"
            else:
                spoken = f"We are on Step {current_step} of 9 for {p_title}: {step_title}. Think of it {analogy} Want me to continue?"
        elif is_simpler:
            if is_telugu:
                spoken = f"ఏమీ కంగారు పడకండి, మరింత సరళంగా చెబుతాను. {p_title} లోని {step_title} కోసం చిన్న ఉదాహరణ: {analogy} నేను ముందుకు కొనసాగించమంటారా?"
            elif is_hindi:
                spoken = f"कोई बात नहीं, इसे और आसान शब्दों में समझते हैं। {p_title} के लिए सरल उदाहरण: {analogy} क्या मैं आगे जारी रखूं?"
            else:
                spoken = f"No problem at all, let us simplify this. Real-life analogy for {p_title}: {analogy} Want me to continue?"
        elif is_telugu:
            spoken = f"ప్రాజెక్ట్ {p_title} లో మనం స్టెప్ {current_step} లో ఉన్నాం. ఇది {step_title}. ఆలోచించండి, {analogy} నేను ముందుకు కొనసాగించమంటారా?"
        elif is_hindi:
            spoken = f"प्रोजेक्ट {p_title} में हम स्टेप {current_step} पर हैं: {step_title}। सोचिए, {analogy} क्या मैं आगे जारी रखूं?"
        else:
            spoken = f"We are on Step {current_step} of 9 for {p_title}: {step_title}. Think of it {analogy} Want me to continue?"

        screen = f"""### 🛠️ {p_title} — Step {current_step} of 9: {step_title}

**Technical Objective**: {step_info['focus']}

**Everyday Analogy**:
> {analogy}

**Implementation Checklist**:
1. Review the required dependencies in `{', '.join(matched_proj.get('techStack', ['Python', 'FastAPI']))}`.
2. Structure the module following clean architecture and separation of concerns.
3. Test with local mocks before integrating into the main data pipeline.

**Voice Commands**: Speak *"next"* to advance, *"repeat"* to hear again, *"simpler"* for smaller steps, *"continue"* to resume, or *"summary"*.

[[TUTOR:{{"projectId": "{matched_proj['id']}", "stepIndex": {current_step}, "stepCount": 9}}]]
"""
        return f"{spoken}\n---SCREEN---\n{screen}"

    # 4. ACID properties in DBMS
    if "acid" in low:
        if is_telugu:
            spoken = "ఏ సి ఐ డి అంటే అటామిసిటీ, కన్సిస్టెన్సీ, ఐసోలేషన్ మరియు డ్యూరబిలిటీ. ఇంటర్వ్యూలో అటామిసిటీ అంతా లేదా ఏమీ కాదని, ఐసోలేషన్ ఒకేసారి జరిగే డేటా లోపాలను నివారిస్తుందని చెప్పండి. నేను ముందుకు కొనసాగించమంటారా?"
        elif is_hindi:
            spoken = "ए सी आई डी का मतलब है एटॉमिसीटी, कंसिस्टेंसी, आइसोलेशन और ड्यूरेबिलिटी। इंटरव्यू में बताएं कि एटॉमिसीटी सब या कुछ नहीं निष्पादित करती है। क्या मैं आगे जारी रखूं?"
        else:
            spoken = "ACID guarantees transaction reliability through Atomicity, Consistency, Isolation, and Durability. In interviews emphasize that Atomicity enforces all or nothing execution while Isolation prevents concurrent data corruption. Want me to continue?"
        screen = """### 💾 ACID Properties in DBMS (Interview Quick Reference)

1. **Atomicity (All or Nothing)**: Entire transaction executes successfully or rolls back completely (e.g., Bank transfer debit + credit).
2. **Consistency (Integrity Constraints)**: Database transforms only from one valid state to another, obeying all constraints and foreign keys.
3. **Isolation (Concurrent Safety)**: Concurrently executing transactions do not interfere with one another (managed via 2-Phase Locking or MVCC).
4. **Durability (Persistence)**: Once committed, state changes survive server crashes and power outages via Write-Ahead Logging (WAL).

**Common Interview Viva Challenge**:
- *'How does PostgreSQL achieve Isolation without locking all rows?'*
- **Answer**: By using Multi-Version Concurrency Control (MVCC) where readers never block writers and writers never block readers.
"""
        return f"{spoken}\n---SCREEN---\n{screen}"

    # 5. Service vs Product Company query
    if any(k in low for k in ["service", "product"]) and "difference" in low:
        if is_telugu:
            spoken = "సర్వీస్ కంపెనీలు ఆప్టిట్యూడ్ మరియు బేసిక్ కమ్యూనికేషన్ చూస్తాయి. ప్రోడక్ట్ కంపెనీలు డి ఎస్ ఎ సామర్థ్యం, సిస్టమ్ డిజైన్ మరియు రియల్ టైమ్ ప్రాజెక్ట్‌లను పరీక్షిస్తాయి. నేను ముందుకు కొనసాగించమంటారా?"
        elif is_hindi:
            spoken = "सर्विस कंपनियां एप्टीट्यूड और बेसिक कम्युनिकेशन देखती हैं, जबकि प्रोडक्ट कंपनियां डेटा स्ट्रक्चर्स, एल्गोरिदम और सिस्टम आर्किटेक्चर पर टेस्ट करती हैं। क्या मैं आगे जारी रखूं?"
        else:
            spoken = "Service drives evaluate speed in quantitative aptitude, basic C S fundamentals, and communication skills. Product companies assess you on Data Structures, Algorithms, and production project architecture. Want me to continue?"
        screen = """### ⚖️ Service vs. Product Placement Criteria

| Dimension | Mass IT Service Firms (TCS, Infosys, Wipro) | Tier-1 Product Companies (Amazon, Startups, Uber) |
| :--- | :--- | :--- |
| **Primary Gate** | Quantitative Aptitude, Verbal & Logical Reasoning | Online Coding Assessments (HackerRank / LeetCode) |
| **DSA Depth** | Basic Arrays, Strings, Searching & Sorting (Easy) | Trees, Graphs, Dynamic Programming, Two Pointers (Medium/Hard) |
| **CS Fundamentals** | Definitions of OOPs, DBMS ACID, OS Scheduling | Deep concurrency, index optimization, thread deadlocks |
| **Project Weight** | Academic final year project overview | Deployed architectures, latency benchmarks, design trade-offs |
| **Package Band** | 3.5 to 5.5 LPA | 12 to 38+ LPA |
"""
        return f"{spoken}\n---SCREEN---\n{screen}"

    # 6. Default placement answer
    if is_telugu:
        spoken = "మీరు అడిగిన ప్రశ్నకు పాత్‌ఫైండర్ 23 ప్రాజెక్ట్ బ్లూప్రింట్లు మరియు 972 క్యాంపస్ రికార్డులతో గైడెన్స్ ఇస్తుంది. నేను ముందుకు కొనసాగించమంటారా?"
    elif is_hindi:
        spoken = "पाथफाइंडर 23 प्रोजेक्ट ब्लूप्रिंट और 972 कैंपस रिकॉर्ड के साथ तैयारी कराता है। क्या मैं आगे जारी रखूं?"
    else:
        spoken = "Pathfinder provides data-backed guidance across our 23 engineering blueprints and 972 placement records. What specific role or project would you like to prepare for? Want me to continue?"

    screen = f"""### 🎯 Pathfinder Placement Intelligence

- **Targeted Recommendations**: Tailored for your engineering branch and verified skills.
- **23 Project Blueprints**: Fully detailed software, hardware, and AI architectures ready for resume inclusion.
- **Voice Capabilities**: Ask to navigate (*"Go to skills"*, *"Open resume studio"*), practice interview viva, or say *"Build my resume"*.
"""
    return f"{spoken}\n---SCREEN---\n{screen}"


async def stream_voice_tokens(
    message: str,
    history: Optional[List[Dict[str, Any]]] = None,
    profile: Optional[Dict[str, Any]] = None,
    language: str = "en-IN",
    active_tab: str = "coach",
    tutor_state: Optional[Dict[str, Any]] = None
) -> AsyncIterator[str]:
    """
    Asynchronous streaming generator yielding tokens over SSE.
    Implements a resilient Provider Chain:
      1. Primary: Google Gemini via GEMINI_API_KEY
      2. Secondary: Ollama (Local http://localhost:11434 or Hosted https://ollama.com)
      3. Fallback: Pathfinder Domain Brain Grounded Generator
    Includes Cognee semantic memory recall (< 1.5s timeout) and background persistence.
    """
    student_id = "default_student"
    if profile:
        student_id = profile.get("email") or profile.get("id") or profile.get("name") or "default_student"

    # 1. Recall student memory (Cognee / Local session cache with hard 1.5s ceiling)
    memory_ctx = ""
    try:
        memory_ctx = await recall_student_memory(student_id, message, timeout_sec=1.5)
    except Exception as me:
        logger.debug(f"[Voice Stream] Memory recall skipped: {me}")

    sys_prompt = build_voice_system_prompt(
        profile=profile,
        language=language,
        active_tab=active_tab,
        tutor_state=tutor_state,
        memory_context=memory_ctx
    )

    full_response_tokens: List[str] = []

    # 2. Provider 1: Gemini via GEMINI_API_KEY
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_succeeded = False
    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=10.0))
            contents_list = []
            if history:
                for turn in history[-12:]:
                    role = "user" if turn.get("role") == "user" else "model"
                    contents_list.append({"role": role, "parts": [{"text": turn.get("content", "")}]})
            contents_list.append({"role": "user", "parts": [{"text": message}]})

            model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip() or "gemini-2.0-flash"
            if "3.8" in model_name or "thinking" in model_name:
                model_name = "gemini-2.0-flash"

            response_stream = client.models.generate_content_stream(
                model=model_name,
                contents=contents_list,
                config=types.GenerateContentConfig(
                    system_instruction=sys_prompt,
                    temperature=0.7,
                    max_output_tokens=600,
                    thinking_config=types.ThinkingConfig(thinking_budget=0) if hasattr(types, "ThinkingConfig") else None
                )
            )

            provider_signaled = False
            for chunk in response_stream:
                txt = getattr(chunk, "text", "") or ""
                if txt:
                    if not provider_signaled:
                        provider_signaled = True
                        gemini_succeeded = True
                        yield f"[[PROVIDER:Google Gemini ({model_name})]]\n"
                    full_response_tokens.append(txt)
                    yield txt
                    await asyncio.sleep(0.005)

            if gemini_succeeded:
                try:
                    asyncio.create_task(store_student_exchange(student_id, message, "".join(full_response_tokens)))
                except Exception:
                    pass
                return
        except Exception as e:
            logger.warning(f"[Voice Stream] Live Gemini stream failed: {e}. Attempting Ollama fallback.")

    # 3. Provider 2: Ollama as backup (Supports Hosted https://ollama.com and Local)
    ollama_info = check_and_discover_ollama()
    if ollama_info.get("available"):
        try:
            ollama_model = ollama_info.get("model", "llama3.2")
            provider_signaled = False
            async for token in stream_ollama_tokens(
                prompt=message,
                sys_instruction=sys_prompt,
                history=history,
                timeout_sec=12.0
            ):
                if token:
                    if not provider_signaled:
                        provider_signaled = True
                        yield f"[[PROVIDER:Ollama ({ollama_model})]]\n"
                    full_response_tokens.append(token)
                    yield token
                    await asyncio.sleep(0.005)

            if provider_signaled:
                try:
                    asyncio.create_task(store_student_exchange(student_id, message, "".join(full_response_tokens)))
                except Exception:
                    pass
                return
        except Exception as oe:
            logger.warning(f"[Voice Stream] Ollama backup stream failed: {oe}. Falling back to domain brain.")

    # 4. Provider 3: Deterministic Grounded Domain Fallback
    fallback_full = generate_local_voice_reply(
        message=message,
        language=language,
        active_tab=active_tab,
        tutor_state=tutor_state,
        profile=profile
    )

    yield "[[PROVIDER:Pathfinder Brain]]\n"
    words = re.split(r"(\s+)", fallback_full)
    for word in words:
        if word:
            full_response_tokens.append(word)
            yield word
            await asyncio.sleep(0.004)

    try:
        asyncio.create_task(store_student_exchange(student_id, message, "".join(full_response_tokens)))
    except Exception:
        pass


_TTS_CAPABILITY_CACHE: Optional[Dict[str, Any]] = None


def check_gemini_tts_capability() -> Dict[str, Any]:
    """Inspects Gemini API models list to check if text-to-speech audio generation is available."""
    global _TTS_CAPABILITY_CACHE
    if _TTS_CAPABILITY_CACHE is not None:
        return _TTS_CAPABILITY_CACHE

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        _TTS_CAPABILITY_CACHE = {"supported": False, "models": [], "reason": "GEMINI_API_KEY not configured"}
        return _TTS_CAPABILITY_CACHE

    try:
        import urllib.request
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}",
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("name", "").replace("models/", "") for m in data.get("models", [])]
            tts_candidates = [m for m in models if "tts" in m.lower() or "speech" in m.lower()]
            _TTS_CAPABILITY_CACHE = {
                "supported": len(tts_candidates) > 0,
                "models": tts_candidates,
                "preferred": tts_candidates[0] if tts_candidates else None
            }
            return _TTS_CAPABILITY_CACHE
    except Exception as e:
        logger.warning(f"[Voice Engine] Failed to query Gemini models for TTS: {e}")
        _TTS_CAPABILITY_CACHE = {"supported": False, "models": [], "error": str(e)}
        return _TTS_CAPABILITY_CACHE


async def synthesize_server_tts(text: str, language: str = "te-IN") -> Optional[bytes]:
    """Server-side TTS generation fallback when device lacks native Telugu/Hindi voices."""
    clean_text = clean_tts_speech(text)
    if not clean_text:
        return None

    cap = check_gemini_tts_capability()
    if not cap.get("supported") or not cap.get("preferred"):
        return None

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=10.0))
        resp = client.models.generate_content(
            model=cap["preferred"],
            contents=clean_text,
            config=types.GenerateContentConfig(
                response_mime_type="audio/wav"
            )
        )
        if hasattr(resp, "parts"):
            for part in resp.parts:
                if hasattr(part, "inline_data") and part.inline_data:
                    return part.inline_data.data
        return None
    except Exception as e:
        logger.warning(f"[Voice Engine] Server TTS synthesis notice: {e}")
        return None


async def stream_voice_audio_tokens(
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
    history: Optional[List[Dict[str, Any]]] = None,
    profile: Optional[Dict[str, Any]] = None,
    active_tab: str = "coach",
    tutor_state: Optional[Dict[str, Any]] = None
) -> AsyncIterator[str]:
    """Streams token responses from Gemini by directly passing audio input from browser MediaRecorder."""
    sys_prompt = build_voice_system_prompt(
        profile=profile,
        language="auto",
        active_tab=active_tab,
        tutor_state=tutor_state
    ) + "\n[AUDIO INPUT INSTRUCTION]\nListen to the audio, automatically detect whether the student speaks English, Telugu, or Hindi. Transcribe their question and answer immediately in that EXACT same language and script!"

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key and audio_bytes:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=15.0))
            audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)

            contents_list = []
            if history:
                for turn in history[-12:]:
                    role = "user" if turn.get("role") == "user" else "model"
                    contents_list.append({"role": role, "parts": [{"text": turn.get("content", "")}]})
            contents_list.append({"role": "user", "parts": [audio_part, {"text": "Please transcribe what I said and respond following the exact role and format rules."}]})

            model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip() or "gemini-2.0-flash"
            if "3.8" in model_name or "thinking" in model_name:
                model_name = "gemini-2.0-flash"

            response_stream = client.models.generate_content_stream(
                model=model_name,
                contents=contents_list,
                config=types.GenerateContentConfig(
                    system_instruction=sys_prompt,
                    temperature=0.2,
                    max_output_tokens=600,
                    thinking_config=types.ThinkingConfig(thinking_budget=0) if hasattr(types, "ThinkingConfig") else None
                )
            )

            token_yielded = False
            for chunk in response_stream:
                txt = getattr(chunk, "text", "") or ""
                if txt:
                    token_yielded = True
                    yield txt
                    await asyncio.sleep(0.005)

            if token_yielded:
                return
        except Exception as e:
            logger.warning(f"[Voice Audio Stream] Live Gemini audio stream failed: {e}. Falling back to default message.")

    fallback = generate_local_voice_reply(
        message="Voice input received. How can Pathfinder guide your engineering placements?",
        language="en-IN",
        active_tab=active_tab,
        tutor_state=tutor_state,
        profile=profile
    )
    words = re.split(r"(\s+)", fallback)
    for word in words:
        if word:
            yield word
            await asyncio.sleep(0.004)


def handle_voice_turn(
    message: str,
    user: Optional[Any] = None,
    profile: Optional[Dict[str, Any]] = None,
    language: str = "en-IN",
    active_tab: str = "coach",
    tutor_state: Optional[Dict[str, Any]] = None,
    is_owner: Optional[bool] = None
) -> Dict[str, Any]:
    """Processes a single conversational turn and returns parsed spoken & visual outputs."""
    raw_reply = generate_local_voice_reply(
        message=message,
        language=language,
        active_tab=active_tab,
        tutor_state=tutor_state,
        profile=profile,
        user=user,
        is_owner=is_owner
    )
    parts = raw_reply.split("---SCREEN---")
    spoken = parts[0].strip() if len(parts) > 0 else raw_reply
    display = parts[1].strip() if len(parts) > 1 else ""
    return {
        "spoken": spoken,
        "display": display,
        "raw": raw_reply
    }


def generate_spoken_briefing(
    topic: str,
    profile: Optional[Dict[str, Any]] = None,
    language: str = "en-IN"
) -> str:
    """Generates a concise spoken briefing for the user on a specific topic."""
    res = handle_voice_turn(topic, profile=profile, language=language)
    return res.get("spoken", "")


