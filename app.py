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

# ---------------- PAGE ----------------
st.set_page_config(
    page_title="Pathfinder AI | Career Intelligence",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------- ENV / AI ----------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

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

# ---------------- THEME ----------------
st.markdown("""
<style>
#MainMenu, footer {visibility:hidden;}
[data-testid="stHeader"] {background:transparent;}
.block-container {padding-top:1.5rem; padding-bottom:3rem; max-width:1450px;}
.hero {
    padding: 30px 34px; border-radius: 24px;
    background: linear-gradient(135deg, #111827 0%, #1e293b 55%, #312e81 100%);
    color: white; margin-bottom: 24px;
    box-shadow: 0 16px 45px rgba(15,23,42,.18);
}
.hero h1 {font-size: 42px; margin:0; font-weight:800;}
.hero p {font-size:17px; opacity:.86; margin:8px 0 0;}
.card {
    border:1px solid rgba(100,116,139,.20); border-radius:20px;
    padding:22px; background:rgba(255,255,255,.78);
    box-shadow:0 8px 25px rgba(15,23,42,.06);
}
[data-testid="stMetric"] {
    border:1px solid rgba(100,116,139,.18); border-radius:18px;
    padding:14px 16px; background:rgba(255,255,255,.72);
}
.stButton > button {border-radius:12px; font-weight:700; min-height:44px;}
.login-wrap {max-width:560px; margin:7vh auto 0;}
.login-card {
    padding:38px; border-radius:28px;
    background:linear-gradient(145deg,#111827,#312e81);
    color:white; box-shadow:0 24px 70px rgba(15,23,42,.28);
}
.login-card h1 {font-size:44px; margin-bottom:4px;}
.login-card p {opacity:.82;}
.small-muted {opacity:.65; font-size:13px;}
</style>
""", unsafe_allow_html=True)

# ---------------- LOGIN ----------------
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    st.markdown('<div class="login-wrap"><div class="login-card"><h1>🎓 Pathfinder</h1><p>AI-Powered Placement Readiness & Career Intelligence</p></div></div>', unsafe_allow_html=True)
    st.write("")
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.subheader("🔐 Student Login")
        username = st.text_input("Username", placeholder="Enter your username")
        password = st.text_input("Password", type="password", placeholder="Enter your password")
        if st.button("🚀 Login to Pathfinder", type="primary", use_container_width=True):
            if username.strip() and password.strip():
                st.session_state.logged_in = True
                st.session_state.username = username.strip()
                st.rerun()
            else:
                st.error("Please enter both username and password.")
        st.caption("Demo authentication: any non-empty username and password are accepted.")
    st.stop()

# ---------------- AI HELPER ----------------
def ask_gemini(prompt, retries=2):
    if client is None:
        return "AI is not configured. Add GEMINI_API_KEY to your .env file and restart the app."
    last_error = None
    for attempt in range(retries + 1):
        try:
            response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
            return response.text or "No AI response was returned."
        except Exception as exc:
            last_error = exc
            text = str(exc)
            if ("503" in text or "UNAVAILABLE" in text or "429" in text or "RESOURCE_EXHAUSTED" in text) and attempt < retries:
                time.sleep(2 * (attempt + 1))
                continue
            break
    return f"AI service is temporarily unavailable. Please try again in a moment. Details: {last_error}"

# ---------------- DATA / MODEL ----------------
DATA_FILE = Path(__file__).parent / "sample-placement-2024-2026.csv"

@st.cache_data(show_spinner=False)
def load_data():
    data = pd.read_csv(DATA_FILE)
    data["placed_label"] = data["placed"].map({1: "Placed", 0: "Not placed"})
    return data

@st.cache_resource(show_spinner=False)
def train_model(data):
    features = ["cgpa", "backlogs", "internships", "communication_score", "coding_score"]
    training = pd.read_csv(Path(__file__).parent / "students.csv")
    model = RandomForestClassifier(n_estimators=150, random_state=42)
    model.fit(training[features], training["placed"])
    return model, features

def filter_records(data, year, branch, gender, skill):
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
    story = [Paragraph("Pathfinder Placement Analytics Report", styles["Title"]), Spacer(1, 10), Paragraph("Filters: " + " | ".join(f"{key}: {value}" for key, value in filters.items()), styles["Normal"]), Spacer(1, 10), Paragraph(f"Records: {len(data)} | Placement rate: {data['placed'].mean() * 100:.1f}%" if len(data) else "Records: 0", styles["Normal"]), Spacer(1, 12)]
    table_data = [["Year", "Course", "Gender", "Skill", "Outcome"]] + data[["year", "branch", "gender", "skillCategory", "placed_label"]].head(150).astype(str).values.tolist()
    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#b7f7dc")), ("GRID", (0, 0), (-1, -1), 0.3, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 7), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(table)
    doc.build(story)
    return output.getvalue()

# ---------------- DASHBOARD HEADER ----------------
user_name = st.session_state.get("username", "Student")
head_left, head_right = st.columns([5, 1])
with head_left:
    st.markdown('<div class="hero"><h1>🎓 Pathfinder AI</h1><p>Placement Readiness & Career Intelligence Platform</p></div>', unsafe_allow_html=True)
with head_right:
    st.write("")
    st.write(f"👋 **{user_name}**")
    if st.button("🚪 Logout", use_container_width=True):
        st.session_state.clear()
        st.rerun()

data = load_data()

# ---------------- STUDENT PROFILE ----------------
st.sidebar.header("👨‍🎓 Student Profile")
cgpa = st.sidebar.number_input("CGPA", 0.0, 10.0, 7.2, 0.1)
backlogs = st.sidebar.number_input("Active backlogs", 0, 20, 0, 1)
internships = st.sidebar.number_input("Internships", 0, 10, 1, 1)
communication = st.sidebar.slider("Communication confidence", 1, 10, 7)
coding = st.sidebar.slider("Coding confidence", 1, 10, 7)

if st.sidebar.button("Calculate my chance", type="primary", use_container_width=True):
    model, features = train_model(data)
    input_data = pd.DataFrame([[cgpa, backlogs, internships, communication, coding]], columns=features)
    st.session_state["chance"] = model.predict_proba(input_data)[0][1] * 100

# ---------------- KPI DASHBOARD ----------------
if "chance" in st.session_state:
    chance = st.session_state["chance"]
else:
    chance = None

k1, k2, k3, k4 = st.columns(4)
k1.metric("🎯 Placement Readiness", f"{chance:.1f}%" if chance is not None else "—")
k2.metric("📚 CGPA", f"{cgpa:.1f}")
k3.metric("💼 Internships", internships)
k4.metric("💻 Coding", f"{coding}/10")

if chance is not None:
    if chance >= 70:
        st.success("Strong profile. Keep building projects and interview consistency.")
    else:
        st.warning("You have a good starting point. Improve the suggestions below.")
    suggestions = []
    if cgpa < 7: suggestions.append("Push CGPA above 7.0")
    if backlogs: suggestions.append("Clear active backlogs")
    if internships == 0: suggestions.append("Complete at least one internship")
    if communication < 7: suggestions.append("Practice mock interviews weekly")
    if coding < 7: suggestions.append("Practice DSA and coding consistently")
    st.write("**Next improvements:** " + ("; ".join(suggestions) if suggestions else "All basic areas look good."))

# ---------------- AI CAREER ASSISTANT ----------------
st.divider()
st.header("🤖 AI Career Assistant")
st.caption("Personalized guidance powered by your profile.")
question = st.text_area("Ask your career question", placeholder="Example: What skills should I learn for a Data Science placement?", key="career_question")
if st.button("✨ Ask Pathfinder AI", type="primary"):
    if question.strip():
        prompt = f"""You are Pathfinder AI, a practical career mentor for a BTech CSE Data Science student.
Profile: CGPA {cgpa}, backlogs {backlogs}, internships {internships}, communication {communication}/10, coding {coding}/10.
Question: {question}
Answer clearly with actionable advice. Keep it concise but useful."""
        with st.spinner("🤖 Pathfinder AI is thinking..."):
            answer = ask_gemini(prompt)
        st.markdown("### AI Career Guidance")
        st.markdown(answer)
    else:
        st.warning("Please enter a question first.")

# ---------------- AI SKILL GAP / ROADMAP ----------------
st.divider()
st.header("🧠 AI Skill Gap & Career Roadmap")
st.caption("Generate a personalized 30 / 60 / 90-day plan.")
if st.button("🚀 Generate My Career Roadmap", type="primary"):
    roadmap_prompt = f"""You are an expert AI career mentor for a BTech CSE Data Science student.
Student profile: CGPA {cgpa}, active backlogs {backlogs}, internships {internships}, communication {communication}/10, coding {coding}/10.
Create a personalized roadmap covering: strengths, skill gaps, technical skills, projects, certifications, internships, and placements.
Organize it into Next 30 days, Next 60 days, and Next 90 days. Focus on Python, Data Science, AI/ML, SQL, DSA and placement preparation. Be practical and actionable."""
    with st.spinner("🤖 Building your roadmap..."):
        roadmap = ask_gemini(roadmap_prompt)
    st.markdown(roadmap)

# ---------------- PLACEMENT ANALYTICS ----------------
st.divider()
st.header("📊 Placement Analytics")
col1, col2, col3, col4 = st.columns(4)
year = col1.selectbox("Year", [2026, 2025, 2024])
branch = col2.selectbox("Course / Branch", ["All"] + sorted(data["branch"].unique().tolist()))
gender = col3.selectbox("Gender", ["All", "Male", "Female"])
skill_options = ["All", "AIML + Python"] + sorted(data["skillCategory"].unique().tolist())
skill = col4.selectbox("Skill category", list(dict.fromkeys(skill_options)))

filtered = filter_records(data, year, branch, gender, skill)
metric1, metric2, metric3 = st.columns(3)
metric1.metric("Matching records", len(filtered))
metric2.metric("Placement rate", f"{filtered['placed'].mean() * 100:.1f}%" if len(filtered) else "0.0%")
metric3.metric("Selected skill", skill)

if filtered.empty:
    st.info("No records match these filters.")
else:
    left, right = st.columns(2)
    with left:
        st.subheader("Course-wise placement rate")
        course_chart = filtered.groupby("branch")["placed"].mean().mul(100).round(1).sort_values(ascending=False)
        st.bar_chart(course_chart)
    with right:
        st.subheader("Skill-category placement rate")
        skill_chart = filtered.groupby("skillCategory")["placed"].mean().mul(100).round(1).sort_values(ascending=False)
        st.bar_chart(skill_chart)
    st.subheader("Filtered records")
    st.dataframe(filtered[["year", "branch", "gender", "skillCategory", "placed_label", "cgpa", "codingScore", "communicationScore", "internships"]], use_container_width=True, hide_index=True)
    filters = {"Year": year, "Course": branch, "Gender": gender, "Skill": skill}
    csv_bytes = filtered.to_csv(index=False).encode("utf-8")
    exp1, exp2 = st.columns(2)
    exp1.download_button("Download CSV", csv_bytes, f"pathfinder-{year}-analytics.csv", "text/csv", use_container_width=True)
    exp2.download_button("Download PDF report", pdf_report(filtered, filters), f"pathfinder-{year}-analytics.pdf", "application/pdf", use_container_width=True)

st.caption("Synthetic sample data for testing only. Replace with approved college placement data for real analysis.")
