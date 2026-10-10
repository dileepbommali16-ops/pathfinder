from io import BytesIO
from typing import Dict, Any, Optional
import pandas as pd
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from backend.models import ResumeFeedback


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        extracted = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted.append(text)
        return "\n".join(extracted).strip()
    except Exception as exc:
        print(f"[PDF Engine] Text extraction error: {exc}")
        return ""


def generate_analytics_pdf(
    data: Optional[pd.DataFrame] = None,
    filters: Optional[Dict[str, Any]] = None,
    **kwargs
) -> bytes:
    if data is None or not isinstance(data, pd.DataFrame):
        from backend.analytics_engine import filter_cohort_records
        year = kwargs.get("year", 2026)
        branch = kwargs.get("branch", "All")
        data = filter_cohort_records(year=year, branch=branch)
        if filters is None:
            filters = {"Year": year, "Branch": branch}
    if filters is None:
        filters = {"Cohort": "All"}

    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#06120d")
    )
    header_style = ParagraphStyle(
        "ReportSub",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#10B981")
    )
    normal_style = styles["Normal"]

    story = [
        Paragraph("🎓 Pathfinder AI · Placement Analytics & Cohort Report", title_style),
        Spacer(1, 8),
        Paragraph(f"<b>Applied Filters:</b> " + " | ".join(f"<b>{k}:</b> {v}" for k, v in filters.items()), normal_style),
        Spacer(1, 6),
    ]

    total_records = len(data)
    if total_records > 0 and "placed" in data.columns:
        placed_pct = data["placed"].mean() * 100.0
        story.append(Paragraph(f"<b>Cohort Size:</b> {total_records} candidates | <b>Overall Placement Rate:</b> {placed_pct:.1f}%", header_style))
    else:
        story.append(Paragraph(f"<b>Cohort Size:</b> 0 candidates", normal_style))

    story.append(Spacer(1, 14))

    # Add table of student records
    headers = ["Year", "Branch", "Gender", "Skill Domain", "CGPA", "Coding", "Outcome"]
    table_rows = [headers]

    cols_to_use = ["year", "branch", "gender", "skillCategory", "cgpa", "codingScore", "placed_label"]
    available_cols = [c for c in cols_to_use if c in data.columns]

    if not data.empty and len(available_cols) == len(cols_to_use):
        for _, row in data[available_cols].head(120).iterrows():
            table_rows.append([
                str(row["year"]),
                str(row["branch"]),
                str(row["gender"]),
                str(row["skillCategory"]),
                f"{row['cgpa']:.1f}",
                f"{row['codingScore']:.1f}",
                str(row["placed_label"])
            ])

    if len(table_rows) > 1:
        tbl = Table(table_rows, repeatRows=1)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE")
        ]))
        story.append(tbl)
    else:
        story.append(Paragraph("No matching records found for the selected filter combination.", normal_style))

    doc.build(story)
    return output.getvalue()


def generate_resume_pdf(feedback: ResumeFeedback) -> bytes:
    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ResumeTitle",
        parent=styles["Title"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a")
    )
    score_style = ParagraphStyle(
        "ScoreHeader",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#10b981") if feedback.score >= 70 else colors.HexColor("#f59e0b")
    )
    section_style = ParagraphStyle(
        "SecHeader",
        parent=styles["Heading3"],
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e293b")
    )

    story = [
        Paragraph("Pathfinder AI · ATS Resume Intelligence Report", title_style),
        Spacer(1, 8),
        Paragraph(f"<b>Overall Readiness Score: {feedback.score} / 100</b>", score_style),
        Spacer(1, 4),
        Paragraph(f"<b>Verdict:</b> {feedback.verdict}", styles["Normal"]),
        Spacer(1, 12),
    ]

    sections = [
        ("Key Candidate Strengths", feedback.strengths),
        ("Critical Skill & Experience Gaps", feedback.improvements),
        ("Recommended ATS Keywords to Incorporate", feedback.ats_keywords),
        ("Structural & Formatting Improvements", feedback.formatting_tips)
    ]

    for title, items in sections:
        story.append(Paragraph(title, section_style))
        story.append(Spacer(1, 4))
        for item in items:
            story.append(Paragraph(f"• {item}", styles["Normal"]))
        story.append(Spacer(1, 10))

    doc.build(story)
    return output.getvalue()
