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

# ---------------- MODERN AURORA OBSIDIAN STYLING ----------------
st.markdown("""
<style>
#MainMenu, footer {visibility:hidden;}
[data-testid="stHeader"] {background: transparent;}
.block-container {padding-top: 1.5rem; padding-bottom: 3rem; max-width: 1400px;}

/* Full-page animated Aurora background */
body, [data-testid="stAppViewContainer"] { background: #050816; color: #F8FAFC; }
[data-testid="stAppViewContainer"]::before {
    content: ""; position: fixed; inset: 0; z-index: -2; pointer-events: none;
    background: radial-gradient(circle at 8% 12%, rgba(34,211,238,.22), transparent 30%), radial-gradient(circle at 90% 8%, rgba(168,85,247,.24), transparent 32%), radial-gradient(circle at 55% 92%, rgba(16,185,129,.16), transparent 34%), linear-gradient(135deg, #050816 0%, #0b1026 48%, #081b26 100%);
    animation: aurora-shift 14s ease-in-out infinite alternate;
}
[data-testid="stAppViewContainer"]::after {
    content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: .16;
    background-image: linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
    background-size: 42px 42px; mask-image: linear-gradient(to bottom, black, transparent 80%);
}
@keyframes aurora-shift { from { filter: hue-rotate(0deg) saturate(1); } to { filter: hue-rotate(18deg) saturate(1.15); } }
[data-testid="stSidebar"] {
    background: rgba(7,13,32,.82);
    border-right: 1px solid rgba(148,163,184,.18);
    backdrop-filter: blur(22px);
}

.hero {
    padding: 32px 36px;
    border-radius: 24px;
    background: linear-gradient(135deg, #111827 0%, #1E293B 50%, #0F172A 100%);
    border: 1px solid #28384F;
    color: #F8FAFC;
    margin-bottom: 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}
.hero h1 {
    font-size: 38px;
    margin: 0;
    font-weight: 900;
    letter-spacing: -0.5px;
    background: linear-gradient(to right, #10B981, #06B6D4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
.hero p {
    font-size: 16px;
    color: #94A3B8;
    margin: 8px 0 0;
}

.card {
    border: 1px solid #28384F;
    border-radius: 20px;
    padding: 22px;
    background: rgba(15,23,42,.68);
    backdrop-filter: blur(18px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    color: #F8FAFC;
}

[data-testid="stMetric"] {
    border: 1px solid rgba(148,163,184,.18);
    border-radius: 18px;
    padding: 16px 20px;
    background: rgba(15,23,42,.72);
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
}
[data-testid="stMetricLabel"] {
    color: #94A3B8 !important;
    font-weight: 600 !important;
    font-size: 13px !important;
}
[data-testid="stMetricValue"] {
    color: #F8FAFC !important;
    font-weight: 800 !important;
    font-size: 28px !important;
}

.stButton > button {
    border-radius: 14px;
    font-weight: 700;
    min-height: 46px;
    border: none;
    transition: all 0.2s ease;
}
.stButton > button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
}
.stTextInput input, .stTextArea textarea, [data-baseweb="select"] > div, [data-testid="stNumberInput"] input {
    background: rgba(15,23,42,.72) !important;
    border-color: rgba(103,232,249,.25) !important;
}
.stTabs [data-baseweb="tab-list"] { gap: 8px; }
.stTabs [data-baseweb="tab"] { background: rgba(15,23,42,.58); border-radius: 12px 12px 0 0; padding: 10px 18px; }

.login-wrap {max-width: 540px; margin: 8vh auto 0;}
.login-card {
    padding: 40px;
    border-radius: 28px;
    background: linear-gradient(145deg, #111827, #1E293B);
    border: 1px solid #28384F;
    color: white;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
}
.login-card h1 {
    font-size: 40px;
    margin-bottom: 6px;
    background: linear-gradient(to right, #10B981, #06B6D4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
.login-card p {color: #94A3B8;}
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
    if question.strip():
        prompt = f"""You are Pathfinder AI, an expert engineering placement mentor for BTech students.
Profile: CGPA {cgpa}, backlogs {backlogs}, internships {internships}, communication {communication}/10, coding {coding}/10.
Question: {question}
Provide structured, encouraging, actionable advice with concrete examples."""
        with st.spinner("🤖 Gemini AI is generating your response..."):
            answer = ask_gemini(prompt)
        st.markdown("### 💡 Guidance")
        st.markdown(answer)
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
