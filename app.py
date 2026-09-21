import os
import time
from io import BytesIO
from pathlib import Path

import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sklearn.ensemble import RandomForestClassifier

# ---------------- PAGE CONFIG ----------------
st.set_page_config(
    page_title="Pathfinder AI | Placement Readiness",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------- ENV / AI CONFIGURATION ----------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Newest-first list; override with GEMINI_MODEL in Streamlit Secrets if needed.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
GEMINI_MODELS = [GEMINI_MODEL, "gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"]

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
:root { --pf-ink:#17233f; --pf-muted:#64748b; --pf-indigo:#4f46e5; --pf-indigo-dark:#3730a3; --pf-blue:#2563eb; --pf-border:rgba(148,163,184,.24); --pf-surface:rgba(255,255,255,.84); }
html, body, [class*="css"], [data-testid="stAppViewContainer"] { font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
#MainMenu, footer { visibility:hidden; }
[data-testid="stHeader"] { background:rgba(248,250,252,.72); }
.block-container { max-width:1240px; padding:2.4rem 2rem 4rem; }
body, [data-testid="stAppViewContainer"] { background:#f5f7fb; color:var(--pf-ink); }
[data-testid="stAppViewContainer"]::before { content:""; position:fixed; inset:0; z-index:-2; pointer-events:none; background:radial-gradient(circle at 6% 4%,rgba(99,102,241,.10),transparent 28%),radial-gradient(circle at 96% 12%,rgba(59,130,246,.09),transparent 26%),radial-gradient(circle at 58% 100%,rgba(129,140,248,.07),transparent 32%),linear-gradient(135deg,#f8fafc 0%,#f4f6fb 54%,#eef3ff 100%); }
[data-testid="stAppViewContainer"]::after { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; opacity:.17; background-image:linear-gradient(rgba(79,70,229,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(79,70,229,.045) 1px,transparent 1px); background-size:52px 52px; mask-image:linear-gradient(to bottom,black,transparent 82%); }
[data-testid="stSidebar"] { background:linear-gradient(180deg,#172554 0%,#1e293b 100%); border-right:1px solid rgba(30,41,59,.18); }
[data-testid="stSidebar"] * { color:#e2e8f0; }
[data-testid="stSidebar"] label, [data-testid="stSidebar"] .stMarkdown p { color:#cbd5e1 !important; }
[data-testid="stSidebar"] [data-baseweb="select"] > div, [data-testid="stSidebar"] input { background:rgba(255,255,255,.10) !important; border-color:rgba(255,255,255,.18) !important; }
[data-testid="stSidebar"] [data-testid="stSlider"] [role="slider"] { background:#a5b4fc; }
.hero { padding:28px 32px; border-radius:22px; background:linear-gradient(120deg,rgba(255,255,255,.94),rgba(239,246,255,.84)); border:1px solid rgba(99,102,241,.16); color:var(--pf-ink); margin-bottom:24px; box-shadow:0 16px 42px rgba(30,41,59,.08); }
.hero h1 { font-size:clamp(28px,4vw,38px); margin:0; font-weight:800; letter-spacing:-.7px; background:linear-gradient(90deg,var(--pf-indigo-dark),var(--pf-blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.hero p { font-size:15px; color:var(--pf-muted); margin:8px 0 0; }
.login-wrap { max-width:520px; margin:7vh auto 0; }
.login-card { padding:38px; border-radius:24px; background:rgba(255,255,255,.9); border:1px solid var(--pf-border); color:var(--pf-ink); box-shadow:0 22px 60px rgba(30,41,59,.11); }
.login-card h1 { font-size:36px; margin-bottom:6px; color:var(--pf-indigo-dark); }
.login-card p { color:var(--pf-muted); }
.card, [data-testid="stMetric"] { background:var(--pf-surface); border:1px solid var(--pf-border); box-shadow:0 8px 26px rgba(30,41,59,.06); backdrop-filter:blur(12px); }
.card { border-radius:18px; padding:22px; color:var(--pf-ink); }
[data-testid="stMetric"] { border-radius:16px; padding:16px 18px; }
[data-testid="stMetricLabel"] { color:var(--pf-muted) !important; font-weight:600 !important; font-size:12px !important; }
[data-testid="stMetricValue"] { color:var(--pf-ink) !important; font-weight:800 !important; font-size:25px !important; }
.stTextInput input, .stTextArea textarea, [data-baseweb="select"] > div, [data-testid="stNumberInput"] input, [data-testid="stFileUploaderDropzone"] { background:rgba(255,255,255,.88) !important; color:var(--pf-ink) !important; border:1px solid var(--pf-border) !important; border-radius:12px !important; }
.stTextInput input:focus, .stTextArea textarea:focus, [data-testid="stNumberInput"] input:focus { border-color:rgba(79,70,229,.62) !important; box-shadow:0 0 0 3px rgba(79,70,229,.10) !important; }
[data-testid="stSlider"] [role="slider"] { background:var(--pf-indigo); }
.stButton > button { border-radius:11px; min-height:42px; padding:0 16px; font-weight:700; border:1px solid rgba(79,70,229,.18); color:var(--pf-indigo-dark); background:rgba(255,255,255,.9); transition:transform .18s ease,box-shadow .18s ease,background .18s ease; }
.stButton > button:hover { transform:translateY(-1px); box-shadow:0 7px 18px rgba(79,70,229,.14); background:#eef2ff; }
.stButton > button[kind="primary"] { color:white; background:linear-gradient(135deg,var(--pf-indigo),var(--pf-blue)); border:none; }
.stButton > button[kind="primary"]:hover { background:linear-gradient(135deg,var(--pf-indigo-dark),#1d4ed8); }
h1, h2, h3 { color:var(--pf-ink); letter-spacing:-.25px; }
[data-testid="stCaptionContainer"], .stCaption { color:var(--pf-muted) !important; }
[data-testid="stAlert"] { border-radius:13px; border:1px solid var(--pf-border); }
.stTabs [data-baseweb="tab-list"] { gap:6px; border-bottom:1px solid var(--pf-border); }
.stTabs [data-baseweb="tab"] { color:var(--pf-muted); padding:10px 16px; }
.stTabs [aria-selected="true"] { color:var(--pf-indigo-dark) !important; }
@media (max-width:768px) { .block-container { padding:1.2rem 1rem 3rem; } .hero { padding:22px; border-radius:18px; } .login-card { padding:26px 20px; } [data-testid="stMetricValue"] { font-size:21px !important; } }
</style>
""", unsafe_allow_html=True)

# ---------------- LOGIN SESSION ----------------
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    st.markdown('<div class="login-wrap"><div class="login-card"><h1>🎓 Pathfinder</h1><p>AI-Powered Placement Readiness & Career Intelligence</p></div></div>', unsafe_allow_html=True)
    st.write("")
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.subheader("🔐 Student Login")
        username = st.text_input("Username", placeholder="Enter your student ID or name")
        password = st.text_input("Password", type="password", placeholder="Enter your password")
        if st.button("🚀 Enter Pathfinder", type="primary", use_container_width=True):
            if username.strip() and password.strip():
                st.session_state.logged_in = True
                st.session_state.username = username.strip()
                st.rerun()
            else:
                st.error("Please enter your username and password.")
        st.caption("Demo access: any username & password are accepted for testing.")
    st.stop()

# ---------------- AI HELPER WITH ROBUST MODEL FALLBACKS ----------------
def ask_gemini(prompt, retries=2):
    """Call Gemini with current models first and return an actionable error."""
    if not GEMINI_API_KEY:
        return "⚠️ AI is not configured yet. Add `GEMINI_API_KEY` under Streamlit Cloud → Settings → Secrets, then reboot the app."
    if client is None:
        return "⚠️ The Gemini SDK could not initialize. Confirm `google-genai` is installed and reboot the Streamlit app."
    last_error = None
    for model_name in dict.fromkeys(GEMINI_MODELS):
        for attempt in range(retries):
            try:
                response = client.models.generate_content(model=model_name, contents=prompt)
                answer = getattr(response, "text", None)
                if answer and answer.strip():
                    return answer.strip()
                last_error = f"{model_name} returned an empty response"
                break
            except Exception as exc:
                last_error = exc
                error_text = str(exc).lower()
                if any(token in error_text for token in ("not found", "404", "unsupported", "permission")):
                    break
                if attempt < retries - 1:
                    time.sleep(1.0)
    return f"⚠️ AI could not respond. Check that your Gemini API key is valid and that the Generative Language API is enabled. Technical detail: {last_error}"

def ask_gemini_chat(messages, retries=2):
    """Call the strongest configured Gemini model with a bounded chat history."""
    if not GEMINI_API_KEY:
        return "⚠️ AI is not configured yet. Add `GEMINI_API_KEY` under Streamlit Cloud → Settings → Secrets, then reboot the app."
    if client is None:
        return "⚠️ The Gemini SDK could not initialize. Confirm `google-genai` is installed and reboot the Streamlit app."
    transcript = "\n\n".join(
        f"{message['role'].upper()}: {message['content']}" for message in messages
    )
    last_error = None
    for model_name in dict.fromkeys(GEMINI_MODELS):
        for attempt in range(retries):
            try:
                response = client.models.generate_content(model=model_name, contents=transcript)
                answer = getattr(response, "text", None)
                if answer and answer.strip():
                    return answer.strip()
                last_error = f"{model_name} returned an empty response"
                break
            except Exception as exc:
                last_error = exc
                error_text = str(exc).lower()
                if any(token in error_text for token in ("not found", "404", "unsupported", "permission")):
                    break
                if attempt < retries - 1:
                    time.sleep(1.0)
    return f"⚠️ AI could not respond. Check your Gemini API key and enabled API access. Technical detail: {last_error}"

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
    training = training.rename(columns={
        "communicationScore": "communication_score",
        "codingScore": "coding_score",
    })

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
        Spacer(1, 12),
    ]
    table_data = [["Year", "Course", "Gender", "Skill", "Outcome"]] + data[["year", "branch", "gender", "skillCategory", "placed_label"]].head(150).astype(str).values.tolist()
    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(table)
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
    if chance >= 75:
        st.success("🟢 **Strong Candidate Profile**: High probability of clearing tier-1 company cutoffs. Focus on system design and behavioral rounds.")
    elif chance >= 55:
        st.warning("🟡 **Solid Foundation**: Good starting point. Prioritize clearing backlogs and solving DSA patterns to raise score.")
    else:
        st.error("🔴 **Needs Focus**: Urgent focus needed on academic eligibility and practical software development internships.")

# ---------------- MULTILINGUAL GENERAL AI AGENT ----------------
st.divider()
st.header("🤖 Pathfinder AI Agent")
st.caption("Friendly, advanced English + తెలుగు assistant. Ask anything, or use it as your personal placement and career coach.")

if "agent_messages" not in st.session_state:
    st.session_state.agent_messages = []
if "agent_language" not in st.session_state:
    st.session_state.agent_language = "Auto-detect"

agent_left, agent_right = st.columns([4, 1])
with agent_left:
    language_options = ["Auto-detect", "English", "తెలుగు (Telugu)", "English + తెలుగు"]
    language = st.selectbox(
        "Response language",
        language_options,
        index=language_options.index(st.session_state.agent_language),
        help="Auto-detect follows your message. You can force Telugu or bilingual replies at any time.",
    )
    st.session_state.agent_language = language
with agent_right:
    st.write("")
    if st.button("🧹 Clear chat", use_container_width=True):
        st.session_state.agent_messages = []
        st.rerun()

prompt_suggestions = [
    "Create a practical 30-day plan for my goals",
    "Explain this topic simply in Telugu and English",
    "Help me compare two career or study options",
]
suggestion_cols = st.columns(len(prompt_suggestions))
for i, suggestion in enumerate(prompt_suggestions):
    if suggestion_cols[i].button(f"💡 {suggestion}", use_container_width=True):
        st.session_state.agent_pending_prompt = suggestion

for message in st.session_state.agent_messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

pending_prompt = st.session_state.pop("agent_pending_prompt", "")
user_message = st.chat_input("Type in English or తెలుగు…")
if pending_prompt and not user_message:
    user_message = pending_prompt

if user_message and user_message.strip():
    user_message = user_message.strip()
    st.session_state.agent_messages.append({"role": "user", "content": user_message})
    chance_text = f"{chance:.1f}%" if chance is not None else "not calculated"
    profile_context = f"""
CURRENT PATHFINDER PROFILE (use only when relevant):
- CGPA: {cgpa}/10
- Active backlogs: {backlogs}
- Internships: {internships}
- Communication confidence: {communication}/10
- Coding and DSA confidence: {coding}/10
- Calculated placement probability: {chance_text}
"""
    language_instruction = {
        "Auto-detect": "Detect the user's language and reply in that language. If they mix Telugu and English, naturally mirror the mix.",
        "English": "Reply in clear, friendly English.",
        "తెలుగు (Telugu)": "Reply primarily in natural Telugu. Keep technical names and code keywords in English when that improves clarity.",
        "English + తెలుగు": "Reply bilingually: give the main answer in clear English, followed by a concise natural Telugu explanation.",
    }[language]
    system_prompt = f"""You are Pathfinder AI Agent, a friendly, highly capable general-purpose assistant.
You can explain concepts, brainstorm, plan, summarize, tutor, review text, help with coding, and coach career or placement goals.
Be warm, practical, honest about uncertainty, and proactive. Ask a short clarifying question only when it is genuinely needed.
Use headings, bullets, examples, and step-by-step guidance when helpful. Never claim to have performed an external action unless you actually did it.
{language_instruction}
{profile_context}
"""
    api_messages = [{"role": "system", "content": system_prompt}] + [
        {"role": item["role"], "content": item["content"]}
        for item in st.session_state.agent_messages[-12:]
    ]
    with st.chat_message("assistant"):
        with st.spinner("🤖 Thinking… / ఆలోచిస్తున్నాను…"):
            answer = ask_gemini_chat(api_messages)
        st.markdown(answer)
    st.session_state.agent_messages.append({"role": "assistant", "content": answer})

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
