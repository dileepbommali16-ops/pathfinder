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

logger = logging.getLogger("pathfinder.voice")

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"

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
    # Remove navigation / action markers
    s = re.sub(r"\[\[NAVIGATE:[^\]]+\]\]", "", text)
    s = re.sub(r"\[\[ACTION:[^\]]+\]\]", "", s)
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
    telugu_kws = ["cheppu", "ela", "naku", "bro", "mana", "enti", "ardham", "kavali", "undi", "unnadi", "kaledu", "kaaledu", "malli", "taruvata", "venakki", "ekkada", "daggara", "kadhara"]
    if any(w in low for w in telugu_kws):
        return "te-IN"
    hindi_kws = ["batao", "kya", "kaise", "samajh", "aage", "shuru", "karo", "peeche", "kahan", "nahi", "aaya", "bataiye", "samjhao"]
    if any(w in low for w in hindi_kws):
        return "hi-IN"
    return "en-IN"


def build_voice_system_prompt(
    profile: Optional[Dict[str, Any]] = None,
    language: str = "en-IN",
    active_tab: str = "coach",
    tutor_state: Optional[Dict[str, Any]] = None
) -> str:
    """Constructs the high-yield, TTS-safe system instruction for Gemini Flash."""
    profile_data = profile or {}
    cgpa = profile_data.get("cgpa", 7.5)
    branch = profile_data.get("branch", "CSE")
    role = profile_data.get("targetRole", "Software Development Engineer (SDE)")
    skills = profile_data.get("technicalSkills", ["Python", "DSA"])
    backlogs = profile_data.get("activeBacklogs", profile_data.get("backlogs", 0))

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

    return f"""[ROLE DEFINITION]
You are Pathfinder AI, an elite Senior Technical Lead and friendly, patient Placement Architect embedded in the Pathfinder 2.0 platform.
You mentor students with warmth, absolute technical correctness, and zero fluff.

[CANDIDATE CONTEXT]
- Academic: CGPA {cgpa}, Branch: {branch}, Active Backlogs: {backlogs}
- Target Role: {role}
- Verified Skills: {', '.join(skills) if isinstance(skills, list) else str(skills)}
- Active Platform Tab: {active_tab}
{tutor_context}

[PLATFORM KNOWLEDGE]
- Site Tabs: {guide_summary}
- Official 23 Blueprints: {proj_names} (total 23 verified projects in catalog)

[OUTPUT FORMAT SPECIFICATION - STRICT AND MANDATORY]
Your response MUST consist of two distinct parts separated by the exact delimiter line:
---SCREEN---

PART 1: SPOKEN RESPONSE (BEFORE '---SCREEN---')
- Output Length: STRICTLY 2 to 4 sentences maximum (approx 35 to 55 words total).
- Core Principle: Give a direct, punchy answer. Never read long lists or code aloud.
- Offer Continuation: Always conclude your spoken response with: "Want me to continue?" (or in Telugu: "నేను ముందుకు కొనసాగించమంటారా?", in Hindi: "क्या मैं आगे जारी रखूं?").
- Zero markdown: Absolutely NO asterisks (*), hashtags (#), backticks (`), bullet points, numbers, links, or URLs.
- Zero preamble: Zero pleasantries ("Hi", "Sure", "Great question"). Jump straight to the core answer.
- Spell out abbreviations for speech: "C G P A", "D S A", "Sequel", "O of N log N", "L P A".
- Language & Script Rule (CRITICAL):
  * Reply in the exact language and script the user spoke.
  * English speech -> Professional English.
  * Telugu speech or language is te-IN -> Pure Telugu script (తెలుగు) so browser speech synthesis pronounces it naturally. Never mix Latin and Telugu randomly.
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

[DUAL-TRACK RECRUITMENT LOGIC]
- Mass IT Services (TCS, Infosys, Wipro, Accenture): Focus on quantitative aptitude speed, OOPs fundamentals, SQL transactions, and communication.
- Product Companies (Tier-1, MAANG, Startups): Focus on DSA efficiency (O(N log N), DP), system architecture, and production code.

[EMOTIONAL DISTRESS SAFETY]
If the student expresses severe distress or self-harm, respond with gentle care, encourage talking to family or trusted mentors, and mention the Tele-MANAS helpline (14416).
"""


def generate_local_voice_reply(
    message: str,
    language: str = "en-IN",
    active_tab: str = "coach",
    tutor_state: Optional[Dict[str, Any]] = None,
    profile: Optional[Dict[str, Any]] = None
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
    Queries Gemini Flash with fallback to deterministic grounded reply.
    """
    sys_prompt = build_voice_system_prompt(
        profile=profile,
        language=language,
        active_tab=active_tab,
        tutor_state=tutor_state
    )

    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    # Attempt live streaming with Gemini SDK if available and key configured
    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=10.0))
            contents_list = []
            if history:
                # Keep last 12 turns
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
            logger.warning(f"[Voice Stream] Live Gemini stream failed: {e}. Falling back to deterministic grounded engine.")

    # Fallback to local grounded generator
    fallback_full = generate_local_voice_reply(
        message=message,
        language=language,
        active_tab=active_tab,
        tutor_state=tutor_state,
        profile=profile
    )

    # Stream out words cleanly with ultra-low latency (~5ms per token)
    words = re.split(r"(\s+)", fallback_full)
    for word in words:
        if word:
            yield word
            await asyncio.sleep(0.004)


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

