from io import BytesIO
from pathlib import Path

import pandas as pd
import streamlit as st
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sklearn.ensemble import RandomForestClassifier

st.set_page_config(page_title="Pathfinder | Placement Analytics", page_icon="🎓", layout="wide")

DATA_FILE = Path(__file__).parent / "sample-placement-2024-2026.csv"

@st.cache_data
def load_data():
    data = pd.read_csv(DATA_FILE)
    data["placed_label"] = data["placed"].map({1: "Placed", 0: "Not placed"})
    return data

@st.cache_resource
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

st.title("🎓 Pathfinder")
st.caption("Student placement readiness and recent placement analytics")
data = load_data()

with st.sidebar:
    st.header("Student profile")
    cgpa = st.number_input("CGPA", 0.0, 10.0, 7.2, 0.1)
    backlogs = st.number_input("Active backlogs", 0, 20, 0, 1)
    internships = st.number_input("Internships", 0, 10, 1, 1)
    communication = st.slider("Communication confidence", 1, 10, 7)
    coding = st.slider("Coding confidence", 1, 10, 7)
    if st.button("Calculate my chance", type="primary", use_container_width=True):
        model, features = train_model(data)
        input_data = pd.DataFrame([[cgpa, backlogs, internships, communication, coding]], columns=features)
        chance = model.predict_proba(input_data)[0][1] * 100
        st.session_state["chance"] = chance

if "chance" in st.session_state:
    chance = st.session_state["chance"]
    st.metric("Your placement readiness", f"{chance:.1f}%")
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

st.divider()
st.header("Placement Analytics")
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
