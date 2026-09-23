import os
import json
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
            {"role": "system", "content": "You are Pathfinder AI, a warm, patient, human-sounding engineering placement mentor. Acknowledge the student's question first, explain clearly, personalize advice to the profile, and end with one useful follow-up question. Match the student's language, including Telugu or Telugu-English. Avoid robotic disclaimers, generic filler, and overly rigid headings. Use concise markdown only when it improves readability."},
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


def structured_ai(prompt: str, schema: type[BaseModel]) -> BaseModel:
    """Call flash models with transient retries and validated JSON output."""
    if client is None:
        return local_structured_fallback(prompt, schema)
    last_error = None
    for model_name in dict.fromkeys(GEMINI_MODELS):
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root { --pf-ink:#17233f; --pf-muted:#475569; --pf-indigo:#4f46e5; --pf-indigo-dark:#3730a3; --pf-blue:#2563eb; --pf-border:rgba(148,163,184,.34); --pf-surface:rgba(255,255,255,.97); }
/* Keep font rendering crisp across browsers and high-density displays. */
html, body, [class*="css"], [data-testid="stAppViewContainer"] { font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
#MainMenu, footer { visibility:hidden; }
/* Dashboard: quiet enterprise navy with a low-contrast analytics grid behind content. */
[data-testid="stHeader"] { background:rgba(8,15,31,.86); }
.block-container { max-width:1240px; padding:2.4rem 2rem 4rem; }
body, [data-testid="stAppViewContainer"] { background:#09111f; color:#e5edf8; }
[data-testid="stAppViewContainer"]::before { content:""; position:fixed; inset:0; z-index:-2; pointer-events:none; background:radial-gradient(circle at 8% 0%,rgba(37,99,235,.18),transparent 28%),radial-gradient(circle at 92% 18%,rgba(8,145,178,.12),transparent 24%),linear-gradient(145deg,#09111f 0%,#0d1728 54%,#08101d 100%); }
[data-testid="stAppViewContainer"]::after { content:""; position:fixed; inset:-12%; z-index:-1; pointer-events:none; opacity:.18; background-image:linear-gradient(rgba(96,165,250,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,.12) 1px,transparent 1px),radial-gradient(circle at 26% 24%,rgba(37,99,235,.25),transparent 18%),radial-gradient(circle at 76% 68%,rgba(6,182,212,.18),transparent 18%); background-size:58px 58px,58px 58px,auto,auto; filter:blur(3px); animation:pf-mesh 26s ease-in-out infinite alternate; }
@keyframes pf-mesh { from { transform:translate3d(-1%, -1%, 0); } to { transform:translate3d(1%, 1%, 0); } }
/* Login: a separate midnight-blue identity is activated only while .login-screen exists. */
body:has(.login-screen), body:has(.login-screen) [data-testid="stAppViewContainer"] { background:#050b18; }
.login-screen { min-height:15vh; position:relative; max-width:620px; margin:6vh auto 1rem; padding:42px 44px; border:1px solid rgba(125,211,252,.22); border-radius:26px; background:rgba(9,21,42,.86); box-shadow:0 28px 90px rgba(0,0,0,.42),0 0 70px rgba(37,99,235,.12); z-index:1; }
.login-brand { position:relative; max-width:620px; margin:7vh auto 1.5rem; padding:30px 36px; border:1px solid rgba(125,211,252,.28); border-radius:24px; background:#0b1b33; box-shadow:0 20px 70px rgba(0,0,0,.35); z-index:1; }
.login-brand h1 { margin:0; color:#f8fbff; font-size:clamp(2rem,5vw,3.25rem); letter-spacing:.16em; font-weight:800; }
.login-brand p { color:#c4d9ee; margin:.75rem 0 0; font-size:1rem; }
.login-screen::before { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; background:radial-gradient(circle at 50% 42%,rgba(14,165,233,.16),transparent 22%),linear-gradient(135deg,#040918,#0b1730 52%,#061522); }
.login-screen::after { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; opacity:.18; background-image:linear-gradient(115deg,transparent 0 48%,rgba(103,232,249,.28) 49%,transparent 50%),linear-gradient(25deg,transparent 0 64%,rgba(96,165,250,.25) 65%,transparent 66%); background-size:280px 240px,340px 280px; animation:pf-network 28s linear infinite; }
@keyframes pf-network { to { background-position:280px 240px,-340px 280px; } }
.login-screen h1 { margin:0; color:#f8fbff; font-size:clamp(2rem,5vw,3.25rem); letter-spacing:.16em; font-weight:800; }
.login-screen p { color:#a9c4df; margin:.75rem 0 0; font-size:1rem; }
.login-wrap { max-width:520px; margin:0 auto; }
.login-card { padding:0 44px 34px; border-radius:0 0 26px 26px; background:rgba(9,21,42,.96); border:1px solid rgba(125,211,252,.22); border-top:0; color:#e6f2ff; box-shadow:0 28px 90px rgba(0,0,0,.42); }
.login-card h1 { color:#eff8ff; }
.login-card p { color:#a9c4df; }
[data-testid="stForm"] { background:#0b1b33; border:1px solid rgba(125,211,252,.28); border-radius:22px; padding:26px 30px 30px; box-shadow:0 24px 70px rgba(0,0,0,.35); }
[data-testid="stSidebar"] { background:linear-gradient(180deg,#071426 0%,#0b1728 100%); border-right:1px solid rgba(96,165,250,.18); }
[data-testid="stSidebar"] * { color:#dbeafe; }
[data-testid="stSidebar"] label, [data-testid="stSidebar"] .stMarkdown p { color:#a9bfd8 !important; }
[data-testid="stSidebar"] [data-baseweb="select"] > div, [data-testid="stSidebar"] input { background:rgba(15,31,54,.96) !important; border-color:rgba(96,165,250,.25) !important; }
[data-testid="stSidebar"] [data-testid="stSlider"] [role="slider"] { background:#60a5fa; }
.hero { padding:28px 32px; border-radius:20px; background:rgba(13,29,50,.96); border:1px solid rgba(96,165,250,.22); color:#e5edf8; margin-bottom:24px; box-shadow:0 18px 46px rgba(0,0,0,.22); }
.hero h1 { font-size:clamp(28px,4vw,38px); margin:0; font-weight:800; letter-spacing:.12em; color:#f8fbff; }
.hero p { font-size:15px; color:#a9bfd8; margin:8px 0 0; }
/* Opaque text surfaces prevent backdrop-filter text blur while retaining a premium card look. */
.card, [data-testid="stMetric"] { position:relative; isolation:isolate; background:rgba(13,29,50,.96); border:1px solid rgba(96,165,250,.2); box-shadow:0 10px 28px rgba(0,0,0,.2); color:#e5edf8; }
.card { border-radius:18px; padding:22px; }
[data-testid="stMetric"] { border-radius:16px; padding:16px 18px; }
[data-testid="stMetricLabel"] { color:#a9bfd8 !important; font-weight:600 !important; font-size:12px !important; }
[data-testid="stMetricValue"] { color:#f3f8ff !important; font-weight:800 !important; font-size:25px !important; }
.card::before, [data-testid="stMetric"]::before { content:""; position:absolute; inset:0; z-index:-1; border-radius:inherit; background:linear-gradient(135deg,rgba(18,40,67,.98),rgba(10,24,43,.98)); }
.stTextInput input, .stTextArea textarea, [data-baseweb="select"] > div, [data-testid="stNumberInput"] input, [data-testid="stFileUploaderDropzone"] { background:rgba(10,24,43,.96) !important; color:#e5edf8 !important; border:1px solid rgba(96,165,250,.24) !important; border-radius:12px !important; }
.stTextInput input:focus, .stTextArea textarea:focus, [data-testid="stNumberInput"] input:focus { border-color:rgba(96,165,250,.85) !important; box-shadow:0 0 0 3px rgba(37,99,235,.18) !important; }
[data-testid="stSlider"] [role="slider"] { background:var(--pf-indigo); }
.stButton > button { border-radius:11px; min-height:42px; padding:0 16px; font-weight:700; border:1px solid rgba(96,165,250,.3); color:#dbeafe; background:rgba(18,40,67,.98); transition:transform .18s ease,box-shadow .18s ease,background .18s ease; }
.stButton > button:hover { transform:translateY(-1px); box-shadow:0 7px 18px rgba(37,99,235,.24); background:#17385e; }
.stButton > button[kind="primary"] { color:white; background:linear-gradient(135deg,#2563eb,#0891b2); border:none; }
.stButton > button[kind="primary"]:hover { background:linear-gradient(135deg,var(--pf-indigo-dark),#1d4ed8); }
h1, h2, h3 { color:#f3f8ff; letter-spacing:-.25px; }
.pf-gauge { width:100%; height:14px; margin:10px 0 18px; border-radius:999px; overflow:hidden; background:#e2e8f0; box-shadow:inset 0 1px 3px rgba(15,23,42,.12); }
.pf-gauge-fill { height:100%; border-radius:inherit; background:linear-gradient(90deg,#4f46e5,#0ea5e9,#14b8a6); transform-origin:left; animation:pf-gauge-fill 1.1s cubic-bezier(.2,.8,.2,1) both; }
@keyframes pf-gauge-fill { from { transform:scaleX(0); } to { transform:scaleX(1); } }
[data-testid="stDataFrame"], [data-testid="stArrowVegaLiteChart"] { animation:pf-chart-in .7s ease both; }
@keyframes pf-chart-in { from { opacity:0; transform:translateY(12px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
[data-testid="stCaptionContainer"], .stCaption { color:#a9bfd8 !important; }
[data-testid="stAlert"] { border-radius:13px; border:1px solid rgba(96,165,250,.24); }
.stTabs [data-baseweb="tab-list"] { gap:6px; border-bottom:1px solid var(--pf-border); }
.stTabs [data-baseweb="tab"] { color:#a9bfd8; padding:10px 16px; }
.stTabs [aria-selected="true"] { color:#93c5fd !important; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }
@media (max-width:768px) { .block-container { padding:1.2rem 1rem 3rem; } .hero { padding:22px; border-radius:18px; } .login-card { padding:26px 20px; } [data-testid="stMetricValue"] { font-size:21px !important; } }
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
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    st.markdown('<section class="login-screen"><span class="login-sylva-orb"></span><span class="login-sylva-leaf login-sylva-leaf--one"></span><span class="login-sylva-leaf login-sylva-leaf--two"></span><h1>PATHFINDER</h1><p>AI-Powered Placement &amp; Career Intelligence Platform</p></section>', unsafe_allow_html=True)
    st.markdown('<div class="login-wrap"><div class="login-card">', unsafe_allow_html=True)
    st.subheader("🔐 Student Login")
    with st.form("pathfinder_login"):
        username = st.text_input("Username", placeholder="Enter your student ID or name")
        password = st.text_input("Password", type="password", placeholder="Enter your password")
        submitted = st.form_submit_button("🚀 Enter Pathfinder", type="primary", use_container_width=True)
        if submitted:
            if username.strip() and password.strip():
                st.session_state.logged_in = True
                st.session_state.username = username.strip()
                st.rerun()
            else:
                st.error("Please enter your username and password.")
    st.caption("Demo access: any username & password are accepted for testing.")
    st.markdown('</div></div>', unsafe_allow_html=True)
    st.stop()

# Post-login interface: emerald Data Pixel Arc horizon for the analytics experience.
st.markdown('<div class="pf-data-arc" aria-hidden="true"><div class="pf-data-arc__band"></div><div class="pf-data-arc__pixels"></div></div>', unsafe_allow_html=True)

# ---------------- AI HELPER WITH ROBUST MODEL FALLBACKS ----------------
def ask_gemini(prompt, retries=2, stream=False):
    """Use cached full responses or stream a new flash-tier response progressively."""
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
cgpa = st.sidebar.slider("Cumulative CGPA", 4.0, 10.0, 7.5, 0.1)
backlogs = st.sidebar.number_input("Active Backlogs", 0, 10, 0, 1)
internships = st.sidebar.slider("Internships Completed", 0, 5, 1)
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
    resume_material = st.text_area("Resume or interview answer for AI feedback", placeholder="Paste a project summary, resume section, or interview answer...")
    if st.button("Generate tailored feedback", use_container_width=True):
        if uploaded_resume is not None:
            try:
                resume_material = extract_resume_text(uploaded_resume)
            except Exception as error:
                st.error(f"Could not read that PDF: {error}")
                resume_material = ""
        if resume_material.strip():
            with st.spinner("Reviewing your material..."):
                try:
                    st.session_state["feedback"] = structured_ai(f"Review this resume or interview material for placement readiness. Profile: {profile.model_dump_json()} Material: {resume_material[:18000]}. Return a score, verdict, strengths, gaps, ATS keyword suggestions, and formatting tips.", ResumeFeedback)
                except Exception as error:
                    st.error(str(error))
        else:
            st.warning("Paste some material first.")
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
st.header("🤖 AI Placement Mentor")
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
        prompt = f"""You are Pathfinder AI, a warm and friendly placement mentor for BTech students. Speak naturally, like a patient senior who wants the student to succeed. Acknowledge the student's question, personalize the answer using their profile, give one or two practical next steps, and finish with one helpful follow-up question. Match English, Telugu, or Telugu-English mix when the student uses it. Do not sound robotic or overly formal.
Profile: CGPA {cgpa}, backlogs {backlogs}, internships {internships}, communication {communication}/10, coding {coding}/10.
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
