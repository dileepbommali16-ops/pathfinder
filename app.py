import os
import json
import re
import hashlib
import hmac
import secrets as py_secrets
import time
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path

import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from google.genai import types
from pypdf import PdfReader
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sklearn.ensemble import RandomForestClassifier

from motion_ui import render_scene


class StudentProfile(BaseModel):
    cgpa: float = Field(ge=0, le=10)
    backlogs: int = Field(ge=0)
    internships: int = Field(ge=0)
    communication: int = Field(ge=1, le=10)
    coding: int = Field(ge=1, le=10)


class ReadinessResult(BaseModel):
    score: float = Field(ge=0, le=100)
    label: str
    strengths: list[str]
    priorities: list[str]


class Roadmap(BaseModel):
    headline: str
    skill_gaps: list[str]
    weekly_actions: list[str]


class CohortInsight(BaseModel):
    headline: str
    summary: str
    actions: list[str]


class ResumeFeedback(BaseModel):
    score: int = Field(ge=0, le=100)
    verdict: str
    strengths: list[str]
    improvements: list[str]
    ats_keywords: list[str]
    formatting_tips: list[str]


def quota_error(error: object) -> bool:
    """Return true for provider quota/rate-limit failures that should degrade gracefully."""
    message = str(error).upper()
    return any(token in message for token in ("429", "RESOURCE_EXHAUSTED", "QUOTA", "RATE LIMIT", "RATE_LIMIT"))


def local_ai_answer(prompt: str) -> str:
    """Provide a warm, conversational answer when the remote model cannot be reached."""
    lower = prompt.lower()
    user_text = lower.split("question:", 1)[-1].strip() if "question:" in lower else lower
    topic_words = ("resume", "ats", "dsa", "leetcode", "coding", "interview", "star", "placement", "job", "career", "project", "cgpa", "internship", "company", "role")
    greeting_words = ("hi", "hii", "hello", "hey", "hola", "good morning", "good afternoon", "good evening")
    has_greeting = any(re.search(rf"\b{re.escape(word)}\b", user_text) for word in greeting_words)
    has_topic = any(re.search(rf"\b{re.escape(word)}\b", user_text) for word in topic_words)
    if has_greeting and not has_topic:
        return """Hey! Nice to hear from you 🙂

I’m here with you — no need to jump into goals immediately. We can just talk, or you can tell me what’s on your mind. Are you feeling like discussing placements, DSA, your resume, interviews, or something else?"""
    if any(phrase in user_text for phrase in ("how are you", "how r u", "what's up", "whats up")):
        return """I’m doing well, thanks for asking 🙂 More importantly, how are you feeling about your placement journey today? You can be completely honest — we can start from wherever you are."""
    if any(phrase in user_text for phrase in ("thanks", "thank you", "thx")) and not has_topic:
        return """Anytime — happy to help. You don’t have to figure everything out at once. What would you like to talk about next?"""
    if "resume" in lower or "ats" in lower:
        return """Hey — absolutely, let’s make your resume stronger without making it sound exaggerated.

### A simple improvement plan

**Start here:**
- Lead with measurable project outcomes: users, latency, accuracy, cost, or adoption.
- Put the target role's keywords in the skills and project sections, but only where they are truthful.
- Rewrite each project bullet as **action + technology + measurable result**.

**Quick ATS checklist**
- Use one-column layout, standard headings, and text-selectable content.
- Keep the resume to one page for an early-career role.
- Add GitHub or demo links and verify every link before applying."""
    if "dsa" in lower or "leetcode" in lower or "coding" in lower:
        return """That’s a great goal — you don’t need to solve random problems all day. You need a repeatable pattern-based routine.

### Your 4-week DSA sprint

- **Week 1:** Arrays, strings, hashing, and two pointers; solve 2–3 timed problems per day.
- **Week 2:** Sliding window, binary search, stacks, and queues; review your mistakes after every session.
- **Week 3:** Trees, recursion, heaps, and graphs; explain your approach aloud before coding.
- **Week 4:** Dynamic programming basics plus four mixed mock interviews.

After every missed problem, write down the pattern trigger, invariant, time complexity, and one variation. If you tell me your current level and target company, I can narrow this into a daily schedule."""
    if "interview" in lower or "star" in lower:
        return """You can absolutely improve this with practice. Don’t memorize polished answers; prepare a few honest stories that you can adapt.

### Interview preparation

Use the **STAR** structure: **Situation**, **Task**, **Action**, and **Result**. Prepare two stories about debugging, one about teamwork, and one about learning a difficult technology. For technical rounds, clarify assumptions first, give a simple approach, state time and space complexity, then improve the solution and test edge cases.

If you share one interview question you find difficult, I’ll help you shape a natural answer."""
    return """Hi! I’m your Pathfinder placement mentor. I’ll help you turn your current profile into a practical next step — no judgment and no vague motivation.

### Let’s start with one clear target

- **Weeks 1–2:** strengthen DSA fundamentals and remove academic blockers.
- **Weeks 3–4:** ship one role-aligned project with a README, tests, and a deployed demo.
- **Weeks 5–6:** complete mock interviews, revise your resume, and apply with tailored bullets.

    Tell me your target role (for example, SDE, data analyst, or QA) and the biggest thing holding you back right now. I’ll help you choose the next small step."""


def local_structured_fallback(prompt: str, schema: type[BaseModel]) -> BaseModel:
    """Return validated local output for structured features during provider outages."""
    if schema is Roadmap:
        return Roadmap(
            headline="A focused six-week placement improvement roadmap",
            skill_gaps=["DSA consistency", "One demonstrable role-aligned project", "Interview communication"],
            weekly_actions=[
                "Week 1: solve 15 array, string, and hashing problems and log every mistake.",
                "Week 2: complete sliding-window, binary-search, and stack patterns.",
                "Week 3: build one project feature with tests and publish a clear README.",
                "Week 4: revise OS, DBMS, networking, and OOP fundamentals.",
                "Week 5: complete three timed coding and two STAR mock interviews.",
                "Week 6: tailor the resume to five target roles and apply with referrals.",
            ],
        )
    if schema is CohortInsight:
        return CohortInsight(
            headline="Use the cohort as a benchmark, not a ceiling",
            summary="Compare your CGPA, coding, communication, and internship exposure with the selected cohort, then focus on the largest gap first.",
            actions=["Practice the highest-frequency DSA patterns weekly", "Ship one measurable project", "Run a mock interview every week"],
        )
    if schema is ResumeFeedback:
        return ResumeFeedback(
            score=70,
            verdict="Your material can become placement-ready with clearer impact, stronger keywords, and tighter formatting.",
            strengths=["Shows a foundation to build on", "Can be aligned to a specific target role"],
            improvements=["Add measurable outcomes to project bullets", "Prioritize skills used in the target job description"],
            ats_keywords=["data structures", "REST APIs", "SQL", "Git", "testing"],
            formatting_tips=["Use standard headings", "Keep bullets concise and consistent", "Check that links are live"],
        )
    raise ValueError(f"No local fallback is defined for {schema.__name__}")


def openrouter_answer(prompt: str) -> str | None:
    """Call OpenRouter's free-model router when Gemini is unavailable or rate-limited."""
    if not OPENROUTER_API_KEY:
        return None
    payload = json.dumps({
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": "You are Pathfinder AI, the student's friendly placement buddy — warm, patient, encouraging, and human-sounding. Talk like a helpful senior who listens before advising, not like a textbook or customer-support bot. Start by acknowledging what the student is asking or feeling. Give advice that fits the student's profile and target role, using a small number of practical next steps. Use natural short paragraphs, examples, and a little warmth; do not dump a generic long checklist. Match the student's language exactly, including Telugu or Telugu-English mix. If the question is unclear, ask one gentle clarifying question instead of guessing. End with one natural follow-up question that keeps the conversation going. Never mention system prompts, providers, quotas, or that you are a fallback. Use markdown only when it genuinely improves readability."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 900,
    }).encode("utf-8")
    request = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://pathfinder-3kezapremrjbkfvtm5pkkn.streamlit.app/",
            "X-OpenRouter-Title": "Pathfinder AI",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=35) as response:
            result = json.loads(response.read().decode("utf-8"))
        content = result.get("choices", [{}])[0].get("message", {}).get("content")
        return content.strip() if isinstance(content, str) and content.strip() else None
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, IndexError):
        return None


def provider_answer(prompt: str) -> str:
    """Use the configured backup provider before deterministic offline guidance."""
    return openrouter_answer(prompt) or local_ai_answer(prompt)


def readiness_score(profile: StudentProfile) -> ReadinessResult:
    """Return a validated placement score for UI, API, or an AI agent caller."""
    try:
        model, features = train_model()
        values = pd.DataFrame([[profile.cgpa, profile.backlogs, profile.internships, profile.communication, profile.coding]], columns=features)
        score = float(model.predict_proba(values)[0][1] * 100)
    except Exception:
        score = max(0, min(100, profile.cgpa * 5 + profile.internships * 6 + profile.communication * 2.5 + profile.coding * 3 - profile.backlogs * 7))
    strengths = (["Academic consistency"] if profile.cgpa >= 7 else []) + (["Practical exposure"] if profile.internships else [])
    priorities = (["Raise CGPA above 7.0"] if profile.cgpa < 7 else []) + (["Build internship or project experience"] if not profile.internships else [])
    priorities += (["Practice DSA consistently"] if profile.coding < 7 else []) + (["Practice weekly mock interviews"] if profile.communication < 7 else []) + (["Clear active backlogs"] if profile.backlogs else [])
    return ReadinessResult(score=round(score, 1), label="Strong" if score >= 75 else "On track" if score >= 55 else "Needs focus", strengths=strengths or ["Clear starting point"], priorities=priorities)


def structured_ai(prompt: str, schema: type[BaseModel], pdf_bytes: bytes | None = None) -> BaseModel:
    """Call flash models with transient retries and validated JSON output."""
    if client is None:
        return local_structured_fallback(prompt, schema)
    last_error = None
    for model_name in dict.fromkeys(GEMINI_MODELS):
        for attempt in range(2):
            try:
                contents = [types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"), prompt] if pdf_bytes else prompt
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=schema, temperature=0.3),
                )
                parsed = getattr(response, "parsed", None)
                response_text = response.text or "{}"
                return schema.model_validate(parsed if parsed is not None else json.loads(response_text))
            except Exception as error:
                last_error = error
                error_text = str(error).upper()
                if "429" in error_text or "RESOURCE_EXHAUSTED" in error_text:
                    return local_structured_fallback(prompt, schema)
                if "404" in error_text or "NOT_FOUND" in error_text:
                    break
                transient = any(code in error_text for code in ("503", "500", "502", "504", "UNAVAILABLE", "INTERNAL"))
                if transient and attempt == 0:
                    time.sleep(0.8)
                    continue
                break
    return local_structured_fallback(prompt, schema)


@st.cache_data(show_spinner=False, ttl=3600)
def cached_gemini(prompt: str, model_name: str) -> str:
    """Cache non-streamed Gemini answers so repeated questions avoid API calls."""
    if client is None:
        return provider_answer(prompt)
    try:
        response = client.models.generate_content(model=model_name, contents=prompt)
    except Exception as error:
        if quota_error(error):
            return provider_answer(prompt)
        raise
    return (getattr(response, "text", None) or "").strip()

# ---------------- PAGE CONFIG ----------------
st.set_page_config(
    page_title="Pathfinder AI | Placement Readiness",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------- ENV / AI CONFIGURATION ----------------
# Load secrets beside app.py; support the current nested local copy during migration.
ENV_FILE = Path(__file__).with_name(".env")
if not ENV_FILE.exists():
    ENV_FILE = Path(__file__).parent / "pathfinder-main" / ".env"
load_dotenv(ENV_FILE)


def setting(name: str, default: str = "") -> str:
    """Read local environment values or Streamlit Cloud Secrets."""
    value = os.getenv(name)
    if value:
        return value.strip()
    try:
        secret_value = st.secrets.get(name, default)
        return str(secret_value).strip()
    except Exception:
        return default


GEMINI_API_KEY = setting("GEMINI_API_KEY")
OPENROUTER_API_KEY = setting("OPENROUTER_API_KEY")
OPENROUTER_MODEL = setting("OPENROUTER_MODEL", "openrouter/free") or "openrouter/free"
# Gemini has retired older model aliases for some new projects. Normalize legacy
# Streamlit Secrets values so deployment does not keep requesting an unavailable model.
configured_model = setting("GEMINI_MODEL", "gemini-3.6-flash")
if configured_model in {"gemini-2.5-flash", "gemini-3.1-flash", "gemini-3.1-flash-lite"}:
    configured_model = "gemini-3.6-flash"
GEMINI_MODEL = configured_model
# Keep fast flash-tier fallbacks so temporary overloads do not break AI features.
GEMINI_MODELS = list(dict.fromkeys([
    GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]))


def verify_configured_user(username: str, password: str) -> bool:
    """Verify a salted sha256 secret; keep demo mode when no auth secrets exist."""
    local_users = st.session_state.get("local_users", {})
    stored_local = local_users.get(username) if hasattr(local_users, "get") else None
    if stored_local:
        parts = str(stored_local).split("$", 2)
        if len(parts) == 3 and parts[0] == "sha256":
            actual = hashlib.sha256(f"{parts[1]}:{password}".encode("utf-8")).hexdigest()
            return hmac.compare_digest(actual, parts[2])
    try:
        auth = st.secrets.get("auth", {})
        users = auth.get("users", {}) if hasattr(auth, "get") else {}
        stored = users.get(username) if hasattr(users, "get") else None
    except Exception:
        stored = None
    if not stored:
        return bool(username.strip() and password.strip())
    parts = str(stored).split("$", 2)
    if len(parts) != 3 or parts[0] != "sha256":
        return False
    salt, expected = parts[1], parts[2]
    actual = hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()
    return hmac.compare_digest(actual, expected)


def hash_user_password(password: str) -> str:
    """Create the same salted sha256 format used by configured auth users."""
    salt = py_secrets.token_hex(16)
    digest = hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()
    return f"sha256${salt}${digest}"

try:
    from google import genai
except ImportError:
    genai = None

client = None
if GEMINI_API_KEY and genai:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        client = None

# ---------------- MODERN ENTERPRISE LIGHT STYLING ----------------
st.markdown("""

<style>
/* ================= PATHFINDER LIGHT MOTION UI ================= */
.stApp {
    background:
        radial-gradient(circle at 10% 10%, rgba(168, 85, 247, 0.14), transparent 28%),
        radial-gradient(circle at 90% 15%, rgba(20, 184, 166, 0.13), transparent 28%),
        radial-gradient(circle at 50% 100%, rgba(236, 72, 153, 0.10), transparent 30%),
        linear-gradient(135deg, #f8f7ff 0%, #ffffff 48%, #f2fbfa 100%);
    background-attachment: fixed;
    color: #182033;
}

/* soft animated background */
.stApp::before {
    content: "";
    position: fixed;
    width: 520px;
    height: 520px;
    top: -220px;
    right: -160px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.09);
    filter: blur(45px);
    animation: pfFloat 9s ease-in-out infinite alternate;
    pointer-events: none;
    z-index: 0;
}

.stApp::after {
    content: "";
    position: fixed;
    width: 420px;
    height: 420px;
    bottom: -180px;
    left: -120px;
    border-radius: 50%;
    background: rgba(20, 184, 166, 0.08);
    filter: blur(45px);
    animation: pfFloat2 11s ease-in-out infinite alternate;
    pointer-events: none;
    z-index: 0;
}

@keyframes pfFloat {
    from { transform: translate3d(0,0,0) scale(1); }
    to { transform: translate3d(-35px,45px,0) scale(1.08); }
}
@keyframes pfFloat2 {
    from { transform: translate3d(0,0,0) scale(1); }
    to { transform: translate3d(40px,-30px,0) scale(1.06); }
}

/* Main content */
.block-container {
    position: relative;
    z-index: 1;
    padding-top: 2rem;
    padding-bottom: 3rem;
}

/* Typography */
h1, h2, h3 {
    color: #17152b !important;
    letter-spacing: -0.02em;
}
p, label, .stMarkdown, .stCaption {
    color: #39415c !important;
}

/* Sidebar */
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #ffffff 0%, #f7f5ff 55%, #f0fbfa 100%);
    border-right: 1px solid rgba(109, 93, 163, 0.14);
}
section[data-testid="stSidebar"] * {
    color: #28304a !important;
}

/* Cards / generic containers */
div[data-testid="stVerticalBlockBorderWrapper"] {
    border: 1px solid rgba(109, 93, 163, 0.13) !important;
    background: rgba(255,255,255,0.78) !important;
    border-radius: 20px !important;
    box-shadow: 0 12px 35px rgba(58, 45, 105, 0.08) !important;
    backdrop-filter: blur(14px);
}

/* Inputs */
.stTextInput input,
.stNumberInput input,
.stSelectbox div[data-baseweb="select"],
.stMultiSelect div[data-baseweb="select"],
.stTextArea textarea {
    background: rgba(255,255,255,0.92) !important;
    color: #1d2438 !important;
    border: 1px solid #ddd7f4 !important;
    border-radius: 12px !important;
}
.stTextInput input:focus,
.stNumberInput input:focus,
.stTextArea textarea:focus {
    border-color: #8b5cf6 !important;
    box-shadow: 0 0 0 3px rgba(139,92,246,0.12) !important;
}

/* Buttons */
.stButton > button {
    border: 0 !important;
    border-radius: 12px !important;
    padding: 0.65rem 1.15rem !important;
    font-weight: 700 !important;
    color: white !important;
    background: linear-gradient(135deg, #7c3aed, #8b5cf6 55%, #ec4899) !important;
    box-shadow: 0 8px 20px rgba(124,58,237,0.20) !important;
    transition: transform .2s ease, box-shadow .2s ease, filter .2s ease !important;
}
.stButton > button:hover {
    transform: translateY(-2px);
    box-shadow: 0 13px 28px rgba(124,58,237,0.28) !important;
    filter: brightness(1.03);
}

/* Tabs */
button[data-baseweb="tab"] {
    color: #4b4565 !important;
}
button[data-baseweb="tab"][aria-selected="true"] {
    color: #7c3aed !important;
}

/* Metrics */
div[data-testid="stMetric"] {
    background: rgba(255,255,255,0.82);
    border: 1px solid rgba(124,58,237,0.12);
    border-radius: 18px;
    padding: 15px;
    box-shadow: 0 10px 25px rgba(58,45,105,0.07);
    transition: transform .2s ease;
}
div[data-testid="stMetric"]:hover {
    transform: translateY(-3px);
}
div[data-testid="stMetricLabel"] {
    color: #646b83 !important;
}
div[data-testid="stMetricValue"] {
    color: #251c4f !important;
}

/* Alerts */
div[data-testid="stAlert"] {
    border-radius: 14px !important;
}

/* Dataframes */
div[data-testid="stDataFrame"] {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid #e5e0f5;
}

/* Hide Streamlit chrome */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {background: transparent !important;}

/* Login / hero helper classes if used by app */
.pf-hero {
    padding: 42px 28px;
    border-radius: 28px;
    background: linear-gradient(135deg, rgba(255,255,255,.92), rgba(246,243,255,.88));
    border: 1px solid rgba(124,58,237,.13);
    box-shadow: 0 20px 55px rgba(56,43,102,.10);
}
.pf-badge {
    display: inline-block;
    padding: 7px 13px;
    border-radius: 999px;
    background: rgba(139,92,246,.10);
    color: #6d28d9;
    font-weight: 800;
    font-size: 13px;
}
</style>

""", unsafe_allow_html=True)

# ---------------- CINEMATIC VISUAL OVERRIDES ----------------
# Visual-only layer: preserve all existing widgets and business logic while
# adding depth, glass surfaces, aurora motion, and a motion-safe starfield.
st.markdown("""
<style>
:root { --pf-cyan:#22d3ee; --pf-violet:#8b5cf6; --pf-sky:#60a5fa; }
[data-testid="stAppViewContainer"]::before { content:""; position:fixed; inset:-18%; z-index:-3; pointer-events:none; background:radial-gradient(ellipse at 8% 4%,rgba(79,70,229,.30),transparent 31%),radial-gradient(ellipse at 93% 18%,rgba(6,182,212,.19),transparent 28%),radial-gradient(ellipse at 50% 92%,rgba(124,58,237,.16),transparent 34%),linear-gradient(145deg,#030817,#08152b 55%,#050a18); animation:pf-aurora 24s ease-in-out infinite alternate; }
[data-testid="stAppViewContainer"]::after { content:""; position:fixed; inset:-20%; z-index:-2; pointer-events:none; opacity:.20; background-image:linear-gradient(115deg,transparent 0 48%,rgba(103,232,249,.22) 49%,transparent 50%),linear-gradient(25deg,transparent 0 64%,rgba(129,140,248,.18) 65%,transparent 66%),linear-gradient(rgba(96,165,250,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,.10) 1px,transparent 1px); background-size:320px 270px,420px 330px,64px 64px,64px 64px; animation:pf-circuit 42s linear infinite; }
@keyframes pf-aurora { 0% { transform:translate3d(-2%,-1%,0) scale(1); filter:hue-rotate(0deg); } 50% { transform:translate3d(2%,1%,0) scale(1.05); } 100% { transform:translate3d(0,-2%,0) scale(1.02); filter:hue-rotate(12deg); } }
@keyframes pf-circuit { to { background-position:320px 270px,-420px 330px,64px 64px,64px 64px; } }
body:has(.login-screen), body:has(.login-screen) [data-testid="stAppViewContainer"] { background:#030617; }
.login-screen { position:relative; max-width:620px; margin:6vh auto 1rem; padding:42px 44px; border:1px solid rgba(165,243,252,.30); border-radius:28px; background:linear-gradient(145deg,rgba(12,27,60,.70),rgba(8,15,38,.48)); backdrop-filter:blur(24px) saturate(130%); box-shadow:0 30px 100px rgba(0,0,0,.52),0 0 90px rgba(59,130,246,.18),inset 0 1px rgba(255,255,255,.10); animation:pf-rise .6s cubic-bezier(.2,.8,.2,1) both; z-index:1; }
.login-screen::before { content:""; position:fixed; inset:-10%; z-index:-2; pointer-events:none; background:radial-gradient(ellipse at 20% 18%,rgba(99,102,241,.34),transparent 27%),radial-gradient(ellipse at 80% 30%,rgba(34,211,238,.22),transparent 26%),radial-gradient(ellipse at 50% 90%,rgba(168,85,247,.18),transparent 34%); filter:blur(18px); animation:pf-aurora 20s ease-in-out infinite alternate; }
.login-screen::after { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; opacity:.42; background-image:radial-gradient(circle,rgba(186,230,253,.75) 0 1px,transparent 1.5px),radial-gradient(circle,rgba(129,140,248,.60) 0 1px,transparent 1.5px); background-size:92px 92px,137px 137px; background-position:10px 18px,40px 70px; animation:pf-stars 28s linear infinite; mix-blend-mode:screen; }
@keyframes pf-stars { to { background-position:102px 110px,-30px -54px; } }
@keyframes pf-rise { from { opacity:0; transform:translateY(18px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
.login-screen h1 { text-shadow:0 0 28px rgba(103,232,249,.22); }
.login-screen h1::after { content:""; display:block; width:68%; height:3px; margin-top:14px; border-radius:99px; background:linear-gradient(90deg,transparent,#22d3ee,#8b5cf6,transparent); box-shadow:0 0 18px rgba(34,211,238,.75); transform-origin:center; animation:pf-breathe 3.4s ease-in-out infinite; }
@keyframes pf-breathe { 0%,100% { opacity:.48; transform:scaleX(.72); } 50% { opacity:1; transform:scaleX(1); } }
[data-testid="stForm"] { background:rgba(10,27,59,.60); backdrop-filter:blur(18px); box-shadow:0 24px 70px rgba(0,0,0,.35),inset 0 1px rgba(255,255,255,.08); }
[data-testid="stSidebar"] { background:linear-gradient(180deg,rgba(5,16,37,.96),rgba(8,20,40,.90)); }
[data-testid="stSidebar"] [data-testid="stSlider"] [role="slider"] { background:#67e8f9; box-shadow:0 0 14px rgba(34,211,238,.55); }
.hero, [data-testid="stMetric"], .card { backdrop-filter:blur(14px); box-shadow:0 12px 32px rgba(0,0,0,.22),inset 0 1px rgba(255,255,255,.05); transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease; }
.hero { background:linear-gradient(135deg,rgba(15,38,73,.82),rgba(8,21,44,.68)); }
[data-testid="stMetric"]:hover, .card:hover { transform:translateY(-3px); border-color:rgba(103,232,249,.48); box-shadow:0 18px 38px rgba(0,0,0,.30),0 0 24px rgba(37,99,235,.10); }
.stTextInput input:focus, .stTextArea textarea:focus, [data-testid="stNumberInput"] input:focus { border-color:rgba(103,232,249,.90) !important; box-shadow:0 0 0 3px rgba(34,211,238,.16),0 0 24px rgba(34,211,238,.12) !important; }
.stButton > button:hover { transform:translateY(-2px); box-shadow:0 9px 22px rgba(37,99,235,.26); }
.stButton > button[kind="primary"] { background:linear-gradient(135deg,#4f46e5,#0891b2); box-shadow:0 8px 24px rgba(37,99,235,.20); }
.pf-gauge { background:rgba(148,163,184,.18); box-shadow:inset 0 1px 3px rgba(15,23,42,.32),0 0 12px rgba(34,211,238,.10); }
	.pf-gauge-fill { background:linear-gradient(90deg,#6366f1,#22d3ee,#2dd4bf); box-shadow:0 0 16px rgba(34,211,238,.55); }
	@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; } }
	@media (max-width:768px) { .login-screen { margin-top:3vh; padding:30px 22px; } }
</style>
""", unsafe_allow_html=True)

# Prompt mapping: Sylva-inspired motion for welcome/login; Data Pixel Arc motion
# for the analytics dashboard after login. Both layers stay decorative and low contrast.
st.markdown("""
<style>
.login-sylva-orb { position:fixed; width:34vw; height:34vw; max-width:520px; max-height:520px; min-width:260px; min-height:260px; left:50%; top:34%; transform:translate(-50%,-50%); border-radius:50% 46% 54% 42%; background:radial-gradient(circle at 42% 38%,rgba(134,239,172,.18),transparent 52%),radial-gradient(circle at 60% 68%,rgba(34,197,94,.11),transparent 60%); filter:blur(4px); opacity:.8; pointer-events:none; z-index:-1; animation:pf-sylva-breathe 8s ease-in-out infinite alternate; }
.login-sylva-leaf { position:fixed; width:180px; height:78px; border:1px solid rgba(187,247,208,.15); border-radius:100% 0 100% 0; opacity:.5; pointer-events:none; z-index:-1; animation:pf-sylva-leaf 12s ease-in-out infinite alternate; }
.login-sylva-leaf--one { left:8%; top:24%; transform:rotate(-25deg); }
.login-sylva-leaf--two { right:7%; bottom:20%; transform:rotate(26deg) scale(.7); animation-delay:-5s; }
@keyframes pf-sylva-breathe { from { transform:translate(-50%,-50%) scale(.92) rotate(-4deg); } to { transform:translate(-50%,-50%) scale(1.08) rotate(5deg); } }
@keyframes pf-sylva-leaf { from { opacity:.22; translate:0 8px; } to { opacity:.62; translate:10px -10px; } }

.pf-data-arc { position:fixed; left:0; right:0; bottom:0; height:29vh; min-height:190px; overflow:hidden; pointer-events:none; z-index:0; opacity:.17; -webkit-mask-image:linear-gradient(to top,black 0%,rgba(0,0,0,.72) 48%,transparent 100%); mask-image:linear-gradient(to top,black 0%,rgba(0,0,0,.72) 48%,transparent 100%); }
.pf-data-arc__band { position:absolute; left:8%; bottom:-135%; width:84%; height:230%; border:1px solid rgba(52,211,153,.72); border-radius:50%; background:repeating-linear-gradient(0deg,transparent 0 7px,rgba(52,211,153,.32) 8px 9px),radial-gradient(ellipse at 50% 47%,rgba(16,185,129,.85),rgba(4,47,46,.06) 45%,transparent 68%); box-shadow:0 -8px 55px rgba(16,185,129,.28),inset 0 25px 45px rgba(45,212,191,.22); transform:rotate(-1deg); animation:pf-arc-breathe 9s ease-in-out infinite alternate; }
.pf-data-arc__pixels { position:absolute; inset:0; opacity:.85; background-image:radial-gradient(circle,rgba(167,243,208,.8) 0 1px,transparent 1.6px),linear-gradient(90deg,rgba(16,185,129,.16) 1px,transparent 1px); background-size:9px 9px,18px 18px; mix-blend-mode:screen; animation:pf-arc-pixels 14s linear infinite; }
@keyframes pf-arc-breathe { from { transform:rotate(-2deg) translateY(8px) scaleX(.98); } to { transform:rotate(2deg) translateY(-8px) scaleX(1.02); } }
@keyframes pf-arc-pixels { to { background-position:18px -18px,36px 0; } }
@media (prefers-reduced-motion: reduce) { .login-sylva-orb,.login-sylva-leaf,.pf-data-arc__band,.pf-data-arc__pixels { animation:none; } }
</style>
""", unsafe_allow_html=True)

# ---------------- LOGIN SESSION ----------------
st.markdown("""
<style>
body:not(:has(.login-screen)) .hero { animation:pf-dashboard-rise .72s cubic-bezier(.2,.8,.2,1) both; }
body:not(:has(.login-screen)) .profile-section-label { margin:18px 0 8px; padding-bottom:6px; border-bottom:1px solid rgba(103,232,249,.18); color:#67e8f9; font-size:10px; font-weight:800; letter-spacing:.16em; }
body:not(:has(.login-screen)) [data-testid="stMetric"] { overflow:hidden; animation:pf-dashboard-rise .62s cubic-bezier(.2,.8,.2,1) both; }
body:not(:has(.login-screen)) [data-testid="stMetric"]::after { content:""; position:absolute; inset:0 auto 0 -45%; width:34%; pointer-events:none; transform:skewX(-18deg); background:linear-gradient(90deg,transparent,rgba(125,211,252,.14),transparent); animation:pf-metric-shine 5.5s ease-in-out infinite; }
body:not(:has(.login-screen)) h2, body:not(:has(.login-screen)) h3 { animation:pf-section-reveal .62s ease both; }
body:not(:has(.login-screen)) [data-testid="stDataFrame"], body:not(:has(.login-screen)) [data-testid="stArrowVegaLiteChart"], body:not(:has(.login-screen)) [data-testid="stPlotlyChart"] { animation:pf-chart-reveal .8s cubic-bezier(.2,.8,.2,1) both; }
body:not(:has(.login-screen)) .stButton > button { will-change:transform; }
body:not(:has(.login-screen)) .stButton > button:active { transform:translateY(1px) scale(.985); }
@keyframes pf-dashboard-rise { from { opacity:0; transform:translateY(14px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes pf-section-reveal { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
@keyframes pf-chart-reveal { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
@keyframes pf-metric-shine { 0%,58%,100% { left:-45%; opacity:0; } 68% { opacity:1; } 82% { left:120%; opacity:0; } }
.pf-bg-advanced { position:fixed; inset:0; z-index:-1; overflow:hidden; pointer-events:none; opacity:.72; }
.pf-bg-advanced__aurora { position:absolute; width:58vw; height:38vw; left:18%; top:8%; border-radius:50%; background:radial-gradient(ellipse at 38% 44%,rgba(34,211,238,.12),transparent 58%),radial-gradient(ellipse at 65% 55%,rgba(16,185,129,.10),transparent 66%); filter:blur(22px); animation:pf-advanced-aurora 19s ease-in-out infinite alternate; }
.pf-bg-advanced__beam { position:absolute; width:76vw; height:1px; left:12%; top:32%; background:linear-gradient(90deg,transparent,rgba(103,232,249,.28),rgba(52,211,153,.18),transparent); box-shadow:0 0 22px rgba(34,211,238,.20); transform:rotate(-8deg); animation:pf-advanced-beam 11s ease-in-out infinite alternate; }
.pf-bg-advanced__beam--two { top:66%; transform:rotate(7deg); opacity:.45; animation-delay:-5s; }
.pf-bg-advanced__grid { position:absolute; inset:0; opacity:.14; background-image:linear-gradient(rgba(103,232,249,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(103,232,249,.16) 1px,transparent 1px); background-size:72px 72px; mask-image:linear-gradient(to bottom,transparent,black 22%,black 72%,transparent); animation:pf-advanced-grid 32s linear infinite; }
.pf-bg-advanced__particle { position:absolute; width:5px; height:5px; border-radius:50%; background:#a7f3d0; box-shadow:0 0 16px rgba(45,212,191,.75); animation:pf-advanced-particle 12s ease-in-out infinite; }
.pf-bg-advanced__particle--one { left:22%; top:24%; animation-delay:-2s; }
.pf-bg-advanced__particle--two { left:78%; top:32%; transform:scale(.7); animation-delay:-7s; }
.pf-bg-advanced__particle--three { left:66%; top:72%; transform:scale(.55); animation-delay:-10s; }
.pf-mentor-heading { display:flex; align-items:center; gap:12px; margin-top:4px; }
.pf-brand-orb { display:inline-block; width:44px; height:44px; flex:none; border-radius:50%; background:radial-gradient(circle at 35% 30%,#fff7ed 0 5%,#fdba74 14%,#fb923c 33%,#c2410c 68%,#431407 100%); box-shadow:0 0 16px rgba(251,146,60,.48),inset -7px -8px 14px rgba(67,20,7,.54); animation:pf-brand-orb-breathe 3.8s ease-in-out infinite; }
@keyframes pf-brand-orb-breathe { 0%,100% { transform:scale(.94); filter:saturate(.92); } 50% { transform:scale(1.06); filter:saturate(1.18) brightness(1.08); } }
@keyframes pf-advanced-aurora { from { transform:translate3d(-3%,-2%,0) scale(.94) rotate(-3deg); } to { transform:translate3d(4%,3%,0) scale(1.08) rotate(5deg); } }
@keyframes pf-advanced-beam { from { opacity:.24; transform:translateX(-4%) rotate(-8deg); } to { opacity:.72; transform:translateX(4%) rotate(-5deg); } }
@keyframes pf-advanced-grid { to { background-position:72px 72px,72px 72px; } }
@keyframes pf-advanced-particle { 0%,100% { opacity:0; transform:translate3d(0,16px,0) scale(.5); } 30%,70% { opacity:.72; } 50% { opacity:1; transform:translate3d(18px,-24px,0) scale(1); } }
@media (prefers-reduced-motion: reduce) { body:not(:has(.login-screen)) .hero, body:not(:has(.login-screen)) [data-testid="stMetric"], body:not(:has(.login-screen)) h2, body:not(:has(.login-screen)) h3, body:not(:has(.login-screen)) [data-testid="stDataFrame"], body:not(:has(.login-screen)) [data-testid="stArrowVegaLiteChart"], body:not(:has(.login-screen)) [data-testid="stPlotlyChart"] { animation:none; } body:not(:has(.login-screen)) [data-testid="stMetric"]::after { display:none; } }
@media (prefers-reduced-motion: reduce) { .pf-bg-advanced__aurora,.pf-bg-advanced__beam,.pf-bg-advanced__grid,.pf-bg-advanced__particle,.pf-brand-orb { animation:none; } }
</style>
""", unsafe_allow_html=True)
st.markdown("""
<style>
body:has(.login-screen) .block-container { max-width:1000px; padding-top:3.4rem; padding-bottom:3rem; }
body:has(.login-screen) .login-screen { max-width:760px; margin:1.5vh auto 1.2rem; padding:42px 50px 34px; text-align:center; border-radius:32px; background:linear-gradient(145deg,rgba(14,33,64,.90),rgba(7,18,39,.78)); border:1px solid rgba(125,211,252,.30); box-shadow:0 30px 90px rgba(0,0,0,.48),0 0 80px rgba(34,211,238,.10),inset 0 1px rgba(255,255,255,.10); }
body:has(.login-screen) .login-screen h1 { font-size:clamp(2.35rem,5vw,4rem); letter-spacing:.20em; text-shadow:0 0 30px rgba(103,232,249,.22); }
body:has(.login-screen) .login-screen p { max-width:520px; margin:12px auto 0; color:#b9d3e9; font-size:.95rem; }
body:has(.login-screen) .login-wrap { width:min(100%,760px); max-width:760px; margin:0 auto; }
body:has(.login-screen) .login-card { width:100%; max-width:760px; padding:0 0 18px; border:0; background:transparent; box-shadow:none; }
body:has(.login-screen) .login-card h2 { width:min(100%,700px); margin:0 auto 14px; padding-left:4px; color:#f3f9ff; font-size:1.25rem; letter-spacing:-.02em; }
body:has(.login-screen) [data-testid="stForm"] { width:min(100%,700px); max-width:700px; margin:0 auto; padding:30px 34px 34px; border:1px solid rgba(125,211,252,.24); border-radius:24px; background:linear-gradient(145deg,rgba(13,31,58,.96),rgba(7,19,39,.94)); box-shadow:0 22px 60px rgba(0,0,0,.34),inset 0 1px rgba(255,255,255,.08); }
body:has(.login-screen) [data-testid="stForm"] label { color:#c9dff1 !important; font-size:.84rem; font-weight:700; letter-spacing:.01em; }
body:has(.login-screen) [data-testid="stForm"] input { height:52px; color:#f5fbff !important; background:rgba(7,20,40,.94) !important; border:1px solid rgba(125,211,252,.26) !important; border-radius:14px !important; font-size:.94rem; }
body:has(.login-screen) [data-testid="stForm"] input::placeholder { color:#7190aa !important; opacity:1; }
body:has(.login-screen) [data-testid="stForm"] input:focus { border-color:#67e8f9 !important; box-shadow:0 0 0 3px rgba(34,211,238,.13),0 0 24px rgba(34,211,238,.10) !important; }
body:has(.login-screen) [data-testid="stForm"] .stButton > button { min-height:52px; margin-top:10px; border:0; border-radius:14px; color:#04131d; background:linear-gradient(135deg,#86efac 0%,#22d3ee 52%,#60a5fa 100%); box-shadow:0 12px 28px rgba(34,211,238,.20),inset 0 1px rgba(255,255,255,.55); font-size:.95rem; font-weight:800; }
body:has(.login-screen) [data-testid="stForm"] .stButton > button:hover { color:#021019; background:linear-gradient(135deg,#bbf7d0 0%,#67e8f9 52%,#93c5fd 100%); box-shadow:0 16px 34px rgba(34,211,238,.30); transform:translateY(-2px); }
body:has(.login-screen) .login-card [data-testid="stCaptionContainer"] { width:min(100%,700px); margin:10px auto 0; text-align:center; color:#86a7c2 !important; }
@media (max-width:768px) { body:has(.login-screen) .block-container { padding:1.4rem 1rem 2.5rem; } body:has(.login-screen) .login-screen { padding:32px 22px 27px; border-radius:25px; } body:has(.login-screen) [data-testid="stForm"] { padding:24px 18px 26px; } }
</style>
""", unsafe_allow_html=True)

st.markdown("""
<style>
/* PATHFINDER LIGHT MOTION THEME — replaces the dark-blue visual language */
:root {
  --pf-bg: #eef3fb;
  --pf-surface: rgba(255,255,255,.86);
  --pf-surface-strong: #ffffff;
  --pf-border: rgba(99,102,241,.14);
  --pf-text: #172033;
  --pf-muted: #667085;
  --pf-primary: #6d5dfc;
  --pf-secondary: #14b8a6;
  --pf-pink: #ec4899;
}

/* Main page */
[data-testid="stAppViewContainer"] {
  background: linear-gradient(135deg,#eaf1fc 0%,#f4f7fd 45%,#eef8f6 100%) !important;
  color: var(--pf-text) !important;
}
[data-testid="stAppViewContainer"]::before {
  content:"";
  position:fixed;
  inset:-18%;
  z-index:-5;
  pointer-events:none;
  background:
    radial-gradient(circle at 10% 12%, rgba(37,99,235,.22), transparent 28%),
    radial-gradient(circle at 90% 14%, rgba(13,148,136,.20), transparent 26%),
    radial-gradient(circle at 82% 88%, rgba(245,158,11,.16), transparent 27%),
    radial-gradient(circle at 16% 86%, rgba(79,70,229,.16), transparent 26%),
    radial-gradient(circle at 50% 50%, rgba(14,165,233,.08), transparent 32%);
  filter: blur(8px);
  animation: pf-light-orbs 18s ease-in-out infinite alternate;
}
[data-testid="stAppViewContainer"]::after {
  content:"";
  position:fixed;
  inset:0;
  z-index:-4;
  pointer-events:none;
  opacity:.34;
  background-image:
    linear-gradient(rgba(37,99,235,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37,99,235,.045) 1px, transparent 1px);
  background-size:48px 48px;
  mask-image:linear-gradient(to bottom, transparent, black 18%, black 78%, transparent);
  animation: pf-light-grid 30s linear infinite;
}
@keyframes pf-light-orbs {
  0% { transform:translate3d(-1%,0,0) scale(1); }
  100% { transform:translate3d(2%,-1%,0) scale(1.04); }
}
@keyframes pf-light-grid { to { background-position:48px 48px; } }

[data-testid="stHeader"] { background:rgba(247,248,252,.72) !important; }
.block-container { color:var(--pf-text) !important; }
h1,h2,h3,h4,h5,h6,p,li,label,
[data-testid="stMarkdownContainer"] {
  color:var(--pf-text);
}
[data-testid="stCaptionContainer"] { color:var(--pf-muted) !important; }

/* Sidebar */
[data-testid="stSidebar"] {
  background:rgba(255,255,255,.88) !important;
  border-right:1px solid rgba(99,102,241,.10);
  box-shadow:8px 0 30px rgba(31,41,55,.05);
  backdrop-filter:blur(20px);
}
[data-testid="stSidebar"] * { color:var(--pf-text); }

/* Cards / hero / metrics */
.hero, .card, [data-testid="stMetric"], [data-testid="stForm"],
[data-testid="stExpander"], [data-testid="stTabs"] {
  background:var(--pf-surface) !important;
  border:1px solid var(--pf-border) !important;
  color:var(--pf-text) !important;
  box-shadow:0 14px 40px rgba(31,41,55,.07) !important;
  backdrop-filter:blur(18px) saturate(125%);
}
.hero {
  background:linear-gradient(135deg, rgba(255,255,255,.96), rgba(245,243,255,.88)) !important;
  border-color:rgba(109,93,252,.16) !important;
}
[data-testid="stMetric"] {
  border-radius:18px !important;
  transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
[data-testid="stMetric"]:hover, .card:hover {
  transform:translateY(-5px);
  border-color:rgba(109,93,252,.30) !important;
  box-shadow:0 20px 46px rgba(31,41,55,.11) !important;
}

/* Inputs */
[data-testid="stTextInput"] input,
[data-testid="stNumberInput"] input,
[data-testid="stTextArea"] textarea,
[data-testid="stSelectbox"] [role="combobox"],
[data-testid="stMultiSelect"] [role="combobox"] {
  color:var(--pf-text) !important;
  background:#ffffff !important;
  border:1px solid rgba(99,102,241,.16) !important;
  border-radius:12px !important;
  box-shadow:0 5px 18px rgba(31,41,55,.04) !important;
}
[data-testid="stTextInput"] input:focus,
[data-testid="stNumberInput"] input:focus,
[data-testid="stTextArea"] textarea:focus {
  border-color:rgba(109,93,252,.55) !important;
  box-shadow:0 0 0 4px rgba(109,93,252,.09) !important;
}

/* Buttons */
.stButton > button {
  color:#ffffff !important;
  background:linear-gradient(135deg,#6d5dfc,#8b5cf6) !important;
  border:0 !important;
  border-radius:12px !important;
  box-shadow:0 9px 22px rgba(109,93,252,.20) !important;
  transition:transform .22s ease, box-shadow .22s ease, filter .22s ease;
  position:relative;
  overflow:hidden;
}
.stButton > button::after {
  content:"";
  position:absolute;
  top:0; bottom:0; left:-45%;
  width:32%;
  transform:skewX(-18deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent);
  animation:pf-button-shine 4.5s ease-in-out infinite;
}
.stButton > button:hover {
  transform:translateY(-2px) !important;
  filter:saturate(1.08);
  box-shadow:0 14px 30px rgba(109,93,252,.28) !important;
}
@keyframes pf-button-shine {
  0%,65% { left:-45%; opacity:0; }
  75% { opacity:1; }
  100% { left:125%; opacity:0; }
}

/* Tabs / expanders */
[data-baseweb="tab-list"] {
  background:rgba(255,255,255,.72) !important;
  border-radius:14px !important;
  padding:4px !important;
}
[data-baseweb="tab"] {
  color:#667085 !important;
  border-radius:10px !important;
}
[data-baseweb="tab"][aria-selected="true"] {
  color:#5b4ee8 !important;
  background:#ffffff !important;
  box-shadow:0 4px 14px rgba(31,41,55,.07);
}
[data-testid="stExpander"] summary {
  color:var(--pf-text) !important;
}

/* Progress / sliders */
[data-testid="stProgressBar"] > div > div {
  background:linear-gradient(90deg,#6d5dfc,#14b8a6,#ec4899) !important;
}
[data-testid="stSlider"] [role="slider"] {
  background:#6d5dfc !important;
  border-color:#6d5dfc !important;
  box-shadow:0 0 0 4px rgba(109,93,252,.10) !important;
}

/* Login becomes clean light glass instead of dark blue */
body:has(.login-screen),
body:has(.login-screen) [data-testid="stAppViewContainer"] {
  background:#f7f8fc !important;
}
body:has(.login-screen) .login-screen {
  background:linear-gradient(145deg,rgba(255,255,255,.92),rgba(245,243,255,.86)) !important;
  border:1px solid rgba(109,93,252,.16) !important;
  box-shadow:0 30px 90px rgba(31,41,55,.10) !important;
}
body:has(.login-screen) .login-screen h1,
body:has(.login-screen) .login-screen p {
  color:var(--pf-text) !important;
}
body:has(.login-screen) [data-testid="stForm"] {
  background:rgba(255,255,255,.90) !important;
  border:1px solid rgba(99,102,241,.12) !important;
  box-shadow:0 20px 60px rgba(31,41,55,.08) !important;
}
body:has(.login-screen) [data-testid="stForm"] input {
  color:var(--pf-text) !important;
  background:#ffffff !important;
  border-color:rgba(99,102,241,.16) !important;
}
body:has(.login-screen) [data-testid="stCaptionContainer"] {
  color:#667085 !important;
}

/* Make the existing decorative motion pastel */
.login-sylva-orb {
  background:radial-gradient(circle at 42% 38%,rgba(167,139,250,.22),transparent 52%),
             radial-gradient(circle at 60% 68%,rgba(45,212,191,.14),transparent 60%) !important;
}
.pf-bg-advanced__grid {
  opacity:.08 !important;
  background-image:
    linear-gradient(rgba(109,93,252,.12) 1px,transparent 1px),
    linear-gradient(90deg,rgba(109,93,252,.12) 1px,transparent 1px) !important;
}
@media (prefers-reduced-motion: reduce) {
  [data-testid="stAppViewContainer"]::before,
  [data-testid="stAppViewContainer"]::after,
  .stButton > button::after { animation:none !important; }
}
</style>
""", unsafe_allow_html=True)
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    render_scene(st, "login")
    st.markdown('<section class="login-screen"><span class="login-sylva-orb"></span><span class="login-sylva-leaf login-sylva-leaf--one"></span><span class="login-sylva-leaf login-sylva-leaf--two"></span><h1>PATHFINDER</h1><p>AI-Powered Placement &amp; Career Intelligence Platform</p></section>', unsafe_allow_html=True)
    st.markdown('<div class="login-wrap"><div class="login-card">', unsafe_allow_html=True)
    st.subheader("🔐 Welcome back")
    sign_in_tab, create_tab = st.tabs(["Sign in", "Create account"])
    with sign_in_tab:
        with st.form("pathfinder_login"):
            username = st.text_input("Email or student ID", placeholder="you@example.com")
            password = st.text_input("Password", type="password", placeholder="Enter your password")
            submitted = st.form_submit_button("🚀 Sign in to Pathfinder", type="primary", use_container_width=True)
            if submitted:
                if verify_configured_user(username, password):
                    st.session_state.logged_in = True
                    st.session_state.username = username.strip()
                    st.session_state.guest_mode = False
                    st.rerun()
                else:
                    st.error("That sign-in didn’t work. Please check your details and try again.")
        forgot_col, guest_col = st.columns(2)
        if forgot_col.button("Forgot password?", use_container_width=True):
            st.info("Password recovery is managed by your Pathfinder administrator.")
        if guest_col.button("Continue as guest", use_container_width=True):
            st.session_state.logged_in = True
            st.session_state.username = "Guest student"
            st.session_state.guest_mode = True
            st.session_state.guest_ai_uses = 0
            st.rerun()
        st.caption("Demo mode: when no [auth].users secret is configured, any non-empty details are accepted.")
    with create_tab:
        with st.form("pathfinder_create_account"):
            new_email = st.text_input("Email address", placeholder="you@example.com")
            new_password = st.text_input("Create password", type="password", placeholder="At least 8 characters")
            confirm_password = st.text_input("Confirm password", type="password", placeholder="Re-enter your password")
            create_submitted = st.form_submit_button("Create my account", type="primary", use_container_width=True)
            if create_submitted:
                if not new_email.strip() or "@" not in new_email:
                    st.error("Please enter a valid email address.")
                elif len(new_password) < 8:
                    st.error("Please use a password with at least 8 characters.")
                elif new_password != confirm_password:
                    st.error("The passwords do not match yet.")
                else:
                    email_key = new_email.strip().lower()
                    local_users = st.session_state.setdefault("local_users", {})
                    if email_key in local_users:
                        st.error("An account with this email already exists in this session. Please sign in.")
                    else:
                        local_users[email_key] = hash_user_password(new_password)
                        st.session_state.logged_in = True
                        st.session_state.username = email_key
                        st.session_state.guest_mode = False
                        st.success("Account created securely. Welcome to Pathfinder!")
                        st.rerun()
        st.caption("For this demo, the account lasts for the current session. Add a hashed [auth].users secret for persistent deployment accounts.")
    st.markdown('</div></div>', unsafe_allow_html=True)
    st.stop()

# Post-login interface: living-green motion scene (ferns, flowers, pollen, butterfly, spark orb).
render_scene(st, "main")

# ---------------- AI HELPER WITH ROBUST MODEL FALLBACKS ----------------
def ask_gemini(prompt, retries=2, stream=False):
    """Use cached full responses or stream a new flash-tier response progressively."""
    if st.session_state.get("guest_mode"):
        guest_uses = int(st.session_state.get("guest_ai_uses", 0))
        if guest_uses >= 3:
            answer = "You’ve used the three guest AI messages for this session. Sign in to continue our conversation and keep your placement context saved."
            return iter([answer]) if stream else answer
        st.session_state["guest_ai_uses"] = guest_uses + 1
    if not GEMINI_API_KEY:
        answer = provider_answer(prompt)
        return iter([answer]) if stream else answer
    if client is None:
        answer = provider_answer(prompt)
        return iter([answer]) if stream else answer
    cache_key = f"{GEMINI_MODEL}:{prompt}"
    if stream and cache_key in st.session_state.get("answer_cache", {}):
        return iter([st.session_state["answer_cache"][cache_key]])
    if not stream:
        return cached_gemini(prompt, GEMINI_MODEL)

    def response_stream():
        last_error = None
        for model_name in dict.fromkeys(GEMINI_MODELS):
            for attempt in range(retries):
                try:
                    response = client.models.generate_content_stream(model=model_name, contents=prompt)  # type: ignore[union-attr]
                    chunks = []
                    for chunk in response:
                        text = getattr(chunk, "text", None)
                        if text:
                            chunks.append(text)
                            yield text
                    st.session_state.setdefault("answer_cache", {})[cache_key] = "".join(chunks)
                    return
                except Exception as exc:
                    last_error = exc
                    error_text = str(exc).upper()
                    if "429" in error_text or "RESOURCE_EXHAUSTED" in error_text:
                        yield provider_answer(prompt)
                        return
                    if "404" in error_text or "NOT_FOUND" in error_text:
                        break
                    if any(code in error_text for code in ("503", "500", "502", "504", "UNAVAILABLE", "INTERNAL")):
                        time.sleep(0.8)
                    if attempt < retries - 1:
                        time.sleep(0.4)
        yield provider_answer(prompt)

    return response_stream()

# ---------------- DATA & MODEL ----------------
DATA_FILE = Path(__file__).parent / "sample-placement-2024-2026.csv"

@st.cache_data(show_spinner=False)
def load_data():
    if not DATA_FILE.exists():
        return pd.DataFrame()
    data = pd.read_csv(DATA_FILE)
    data["placed_label"] = data["placed"].map({1: "Placed", 0: "Not placed"})
    return data

@st.cache_resource(show_spinner=False)
def train_model():
    features = ["cgpa", "backlogs", "internships", "communication_score", "coding_score"]
    students_file = Path(__file__).parent / "students.csv"
    if not students_file.exists():
        students_file = DATA_FILE
    
    training = pd.read_csv(students_file)
    # Align column names if needed
    col_map = {
        "communicationScore": "communication_score",
        "codingScore": "coding_score"
    }
    training = training.rename(columns=col_map)
    
    model = RandomForestClassifier(n_estimators=120, random_state=42)
    model.fit(training[features], training["placed"])
    return model, features

def filter_records(data, year, branch, gender, skill):
    if data.empty:
        return data
    result = data[data["year"].eq(year)].copy()
    if branch != "All":
        result = result[result["branch"].eq(branch)]
    if gender != "All":
        result = result[result["gender"].eq(gender)]
    if skill == "AIML + Python":
        groups = result.groupby(["year", "branch", "gender"])["skillCategory"].apply(set)
        valid = groups[groups.apply(lambda values: {"AIML", "Python"}.issubset(values))].index
        result = result[result.set_index(["year", "branch", "gender"]).index.isin(valid)]
        result = result[result["skillCategory"].isin(["AIML", "Python"])]
    elif skill != "All":
        result = result[result["skillCategory"].eq(skill)]
    return result

def pdf_report(data, filters):
    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter, rightMargin=32, leftMargin=32, topMargin=32, bottomMargin=32)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Pathfinder Placement Analytics Report", styles["Title"]),
        Spacer(1, 10),
        Paragraph("Filters: " + " | ".join(f"{key}: {value}" for key, value in filters.items()), styles["Normal"]),
        Spacer(1, 10),
        Paragraph(f"Records: {len(data)} | Placement rate: {data['placed'].mean() * 100:.1f}%" if len(data) else "Records: 0", styles["Normal"]),
        Spacer(1, 12)
    ]
    table_data = [["Year", "Course", "Gender", "Skill", "Outcome"]] + data[["year", "branch", "gender", "skillCategory", "placed_label"]].head(150).astype(str).values.tolist()
    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP")
    ]))
    story.append(table)
    doc.build(story)
    return output.getvalue()


def extract_resume_text(uploaded_file) -> str:
    """Extract readable text from an uploaded PDF without writing it to disk."""
    reader = PdfReader(BytesIO(uploaded_file.getvalue()))
    return "\n".join(page.extract_text() or "" for page in reader.pages).strip()


def resume_feedback_pdf(feedback: ResumeFeedback) -> bytes:
    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter, rightMargin=42, leftMargin=42, topMargin=42, bottomMargin=42)
    styles = getSampleStyleSheet()
    story = [Paragraph("Pathfinder Resume Feedback", styles["Title"]), Spacer(1, 12), Paragraph(f"Score: {feedback.score}/100", styles["Heading2"]), Paragraph(feedback.verdict, styles["Normal"]), Spacer(1, 10)]
    for title, items in (("Strengths", feedback.strengths), ("Gaps and improvements", feedback.improvements), ("ATS keyword suggestions", feedback.ats_keywords), ("Formatting tips", feedback.formatting_tips)):
        story.append(Paragraph(title, styles["Heading3"]))
        story.extend(Paragraph(f"- {item}", styles["Normal"]) for item in items)
        story.append(Spacer(1, 7))
    doc.build(story)
    return output.getvalue()

# ---------------- HEADER ----------------
user_name = st.session_state.get("username", "Student")
head_left, head_right = st.columns([5, 1.2])
with head_left:
    st.markdown('<div class="hero"><h1>🎓 Pathfinder AI</h1><p>Placement Readiness & Engineering Career Intelligence</p></div>', unsafe_allow_html=True)
with head_right:
    st.write("")
    st.markdown(f"👤 **{user_name}**")
    if st.button("🚪 Logout", use_container_width=True):
        st.session_state.clear()
        st.rerun()

data = load_data()

# ---------------- SIDEBAR PROFILE ----------------
st.sidebar.header("🎯 Candidate Profile")
st.sidebar.caption("Build a more accurate placement plan by completing your profile.")
st.sidebar.markdown("<div class='profile-section-label'>ACADEMIC DETAILS</div>", unsafe_allow_html=True)
graduation_year = st.sidebar.selectbox("Graduation Year", [2026, 2027, 2025, 2024], index=0)
student_branch = st.sidebar.selectbox("Branch / Course", ["CSE", "AIML", "IT", "ECE", "EEE", "CSD", "Other"], index=0)
cgpa = st.sidebar.slider("Cumulative CGPA", 4.0, 10.0, 7.5, 0.1)
backlogs = st.sidebar.number_input("Active Backlogs", 0, 10, 0, 1)
internships = st.sidebar.slider("Internships Completed", 0, 5, 1)
st.sidebar.markdown("<div class='profile-section-label'>CAREER TARGET</div>", unsafe_allow_html=True)
target_role = st.sidebar.selectbox("Target Role", ["Software Engineer", "Data Analyst", "Data Scientist", "QA Engineer", "Product / Business Analyst", "Cloud / DevOps Engineer"], index=0)
target_tier = st.sidebar.selectbox("Target Company Tier", ["Any good opportunity", "Product companies", "Service companies", "Startups", "Top-tier / FAANG"], index=0)
preferred_mode = st.sidebar.selectbox("Preferred Work Mode", ["Open to all", "On-site", "Hybrid", "Remote"], index=0)
st.sidebar.markdown("<div class='profile-section-label'>SKILL CONFIDENCE</div>", unsafe_allow_html=True)
communication = st.sidebar.slider("Communication Confidence", 1, 10, 7)
coding = st.sidebar.slider("Coding & DSA Confidence", 1, 10, 7)

if st.sidebar.button("⚡ Calculate Placement Probability", type="primary", use_container_width=True):
    try:
        model, features = train_model()
        input_data = pd.DataFrame([[cgpa, backlogs, internships, communication, coding]], columns=features)
        st.session_state["chance"] = model.predict_proba(input_data)[0][1] * 100
    except Exception:
        # Fallback scoring formula
        score = cgpa * 5.2 + max(0, 3 - backlogs) * 4 + min(internships, 3) * 5 + communication * 2.2 + coding * 2.7 - max(backlogs - 1, 0) * 5
        st.session_state["chance"] = max(18, min(96, round(score)))

# ---------------- KPI DASHBOARD ----------------
chance = st.session_state.get("chance", None)

k1, k2, k3, k4 = st.columns(4)
k1.metric("🎯 Placement Probability", f"{chance:.1f}%" if chance is not None else "—")
k2.metric("📚 CGPA", f"{cgpa:.1f}")
k3.metric("💼 Internships", internships)
k4.metric("💻 Coding Score", f"{coding}/10")

if chance is not None:
    st.markdown(f'<div class="pf-gauge" aria-label="Placement probability {chance:.1f} percent"><div class="pf-gauge-fill" style="width:{max(0, min(100, chance)):.1f}%"></div></div>', unsafe_allow_html=True)
    if chance >= 75:
        st.success("🟢 **Strong Candidate Profile**: High probability of clearing tier-1 company cutoffs. Focus on system design and behavioral rounds.")
    elif chance >= 55:
        st.warning("🟡 **Solid Foundation**: Good starting point. Prioritize clearing backlogs and solving DSA patterns to raise score.")
    else:
        st.error("🔴 **Needs Focus**: Urgent focus needed on academic eligibility and practical software development internships.")

profile = StudentProfile(cgpa=cgpa, backlogs=backlogs, internships=internships, communication=communication, coding=coding)
st.subheader("🧭 Personalized AI Studio")
studio_left, studio_right = st.columns(2)
with studio_left:
    if st.button("Generate weekly improvement roadmap", use_container_width=True):
        with st.spinner("Building your roadmap..."):
            try:
                st.session_state["roadmap"] = structured_ai(f"Create a practical 6-week placement roadmap for this student profile: {profile.model_dump_json()}. Include a headline, skill gaps, and measurable weekly actions focused on Python, data science, AI/ML, projects, and interview preparation.", Roadmap)
            except Exception as error:
                st.error(str(error))
    if "roadmap" in st.session_state:
        roadmap = st.session_state["roadmap"]
        st.info(roadmap.headline)
        st.write("**Skill gaps:** " + ", ".join(roadmap.skill_gaps))
        st.write("**Weekly actions:**")
        st.write("\n".join(f"- {action}" for action in roadmap.weekly_actions))
with studio_right:
    st.markdown("#### 📄 Upload Resume")
    uploaded_resume = st.file_uploader("Upload your PDF resume", type=["pdf"], help="Your resume is read in memory for feedback and is not saved by Pathfinder.")
    st.caption("Step 1: upload your PDF resume above. Step 2: click **Generate tailored feedback**. The box below is optional \u2014 use it only if you have no PDF, or want feedback on a specific project or interview answer.")
    resume_material = st.text_area("Optional: paste resume text or an interview answer instead", placeholder="Not needed if you uploaded a PDF. Or paste a project summary, resume section, or interview answer here...")
    if st.button("Generate tailored feedback", use_container_width=True):
        pdf_bytes = None
        read_failed = False
        if uploaded_resume is not None:
            try:
                resume_material = extract_resume_text(uploaded_resume)
            except Exception as error:
                st.error(f"Could not read that PDF: {error}")
                resume_material = ""
                read_failed = True
            if not resume_material.strip() and not read_failed:
                # Scanned / image-only PDF: no text layer, so let Gemini read the PDF directly.
                pdf_bytes = uploaded_resume.getvalue()
        if read_failed:
            pass
        elif pdf_bytes is not None and client is None:
            st.warning("This PDF looks like a scanned image, so no text could be read from it, and the AI key is not configured to read it directly. Please paste your resume text into the box below instead.")
        elif resume_material.strip() or pdf_bytes is not None:
            with st.spinner("Reviewing your resume..."):
                try:
                    material = resume_material[:18000] if resume_material.strip() else "(see the attached resume PDF)"
                    st.session_state["feedback"] = structured_ai(f"Review this resume or interview material for placement readiness. Profile: {profile.model_dump_json()} Material: {material}. Return a score, verdict, strengths, gaps, ATS keyword suggestions, and formatting tips.", ResumeFeedback, pdf_bytes=pdf_bytes)
                except Exception as error:
                    st.error(str(error))
        else:
            st.warning("Nothing to review yet. Please upload a PDF resume above, or paste your resume text in the box below.")
    if "feedback" in st.session_state:
        feedback = st.session_state["feedback"]
        st.metric("AI feedback score", f"{feedback.score}/100")
        st.write(feedback.verdict)
        st.write("**Strengths:** " + ", ".join(feedback.strengths))
        st.write("**Improvements:** " + ", ".join(feedback.improvements))
        st.write("**ATS keywords:** " + ", ".join(feedback.ats_keywords))
        st.write("**Formatting tips:** " + " | ".join(feedback.formatting_tips))
        st.download_button("Download feedback PDF", resume_feedback_pdf(feedback), "pathfinder-resume-feedback.pdf", "application/pdf", use_container_width=True)

# ---------------- AI CAREER ASSISTANT ----------------
st.divider()
st.markdown('<div class="pf-mentor-heading"><span class="pf-brand-orb" aria-hidden="true"></span><h2>AI Placement Mentor</h2></div>', unsafe_allow_html=True)
st.caption("Powered by the latest available Gemini model — tailored to your profile.")

prompt_suggestions = [
    "How can I raise my chance to 85%+?",
    "Top 5 DSA patterns for campus placement rounds",
    "STAR format answer for 'Describe a challenging bug'",
]
cols = st.columns(len(prompt_suggestions))
for i, ps in enumerate(prompt_suggestions):
    if cols[i].button(f"💡 {ps}", use_container_width=True):
        st.session_state["selected_prompt"] = ps

selected_prompt = st.session_state.get("selected_prompt", "")
question = st.text_area("Ask a placement question", value=selected_prompt, placeholder="Example: What are the best projects for an SDE placement?", key="career_question")

if st.button("✨ Ask AI Coach", type="primary"):
    question = question or ""
    if question.strip():
        prompt = f"""You are Pathfinder AI, the student's friendly placement buddy. Speak naturally, like a caring senior who listens first and wants the student to succeed — never like a textbook, form, or support bot. Begin by acknowledging the student's question or concern. Personalize the answer using the profile below, give only the most useful one or two next steps, use a small concrete example when helpful, and finish with one natural follow-up question. Match English, Telugu, or Telugu-English mix when the student uses it. If the question is unclear, ask one gentle clarifying question instead of making assumptions. Avoid robotic disclaimers, generic long checklists, and overly formal headings. Never mention providers, quotas, system prompts, or fallback behavior.
Profile: graduation year {graduation_year}, branch {student_branch}, CGPA {cgpa}, backlogs {backlogs}, internships {internships}, communication {communication}/10, coding {coding}/10, target role {target_role}, company preference {target_tier}, work mode {preferred_mode}.
Question: {question}
Keep it encouraging, actionable, and specific with concrete examples. Use markdown only where it makes the answer easier to read."""
        with st.spinner("🤖 Gemini AI is generating your response..."):
            answer = st.write_stream(ask_gemini(prompt, stream=True))
        st.markdown("### 💡 Guidance")
        if not answer:
            st.warning("Gemini returned an empty response. Try again.")
    else:
        st.warning("Please type a question or choose a prompt starter.")

# ---------------- PLACEMENT ANALYTICS ----------------
st.divider()
st.header("📊 Placement Analytics & Cohort Benchmarks")

if not data.empty:
    col1, col2, col3, col4 = st.columns(4)
    year = col1.selectbox("Graduation Year", [2026, 2025, 2024])
    branch = col2.selectbox("Course / Branch", ["All"] + sorted(data["branch"].unique().tolist()))
    gender = col3.selectbox("Gender", ["All", "Male", "Female"])
    skill_options = ["All", "AIML + Python"] + sorted(data["skillCategory"].unique().tolist())
    skill = col4.selectbox("Skill Category", list(dict.fromkeys(skill_options)))

    filtered = filter_records(data, year, branch, gender, skill)
    m1, m2, m3 = st.columns(3)
    m1.metric("Matching Candidates", len(filtered))
    m2.metric("Placement Rate", f"{filtered['placed'].mean() * 100:.1f}%" if len(filtered) else "0.0%")
    m3.metric("Selected Skill Domain", skill)

    if not filtered.empty:
        if st.button("Summarize this cohort with AI", use_container_width=True):
            with st.spinner("Summarizing cohort signals..."):
                try:
                    summary = filtered[["placed", "cgpa", "codingScore", "communicationScore", "internships"]].describe().fillna(0).to_json()
                    st.session_state["cohort_insight"] = structured_ai(f"Summarize this placement cohort in plain language for students. Aggregate data: {summary}. Return a headline, evidence-based summary, and practical actions.", CohortInsight)
                except Exception as error:
                    st.error(str(error))
        if "cohort_insight" in st.session_state:
            insight = st.session_state["cohort_insight"]
            st.info(insight.headline)
            st.write(insight.summary)
            st.write("**Actions:** " + " | ".join(insight.actions))
        left, right = st.columns(2)
        with left:
            st.subheader("Branch Placement Rates")
            course_chart = filtered.groupby("branch")["placed"].mean().mul(100).round(1).sort_values(ascending=False)
            st.bar_chart(course_chart)
        with right:
            st.subheader("Skill Domain Placement Rates")
            skill_chart = filtered.groupby("skillCategory")["placed"].mean().mul(100).round(1).sort_values(ascending=False)
            st.bar_chart(skill_chart)

        st.subheader("Cohort Records")
        st.dataframe(filtered[["year", "branch", "gender", "skillCategory", "placed_label", "cgpa", "codingScore", "communicationScore", "internships"]], use_container_width=True, hide_index=True)

        filters = {"Year": year, "Course": branch, "Gender": gender, "Skill": skill}
        csv_bytes = filtered.to_csv(index=False).encode("utf-8")
        exp1, exp2 = st.columns(2)
        exp1.download_button("📥 Download CSV", csv_bytes, f"pathfinder-{year}-analytics.csv", "text/csv", use_container_width=True)
        exp2.download_button("📄 Download PDF Report", pdf_report(filtered, filters), f"pathfinder-{year}-analytics.pdf", "application/pdf", use_container_width=True)
else:
    st.info("No cohort placement dataset found. Please ensure sample-placement-2024-2026.csv is present.")

st.caption("Pathfinder Career Intelligence · Powered by Gemini LLM")
