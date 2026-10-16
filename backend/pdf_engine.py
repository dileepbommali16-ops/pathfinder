from io import BytesIO
from typing import Dict, Any, Optional
import pandas as pd
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from backend.models import ResumeFeedback


import zipfile
import xml.etree.ElementTree as ET


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


def extract_text_from_docx(docx_bytes: bytes) -> str:
    """Extracts all text content from a DOCX zip container without third-party dependencies."""
    try:
        with zipfile.ZipFile(BytesIO(docx_bytes)) as docx_zip:
            xml_content = docx_zip.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            texts = [node.text for node in tree.iter() if node.tag.endswith("t") and node.text]
            return " ".join(texts).strip()
    except Exception as exc:
        print(f"[DOCX Engine] Text extraction error: {exc}")
        return ""


def extract_resume_text(content: bytes, filename: str) -> str:
    """Unified resume text extractor supporting PDF, DOCX, and TXT files."""
    if not content:
        return ""
    fname = filename.lower()
    if fname.endswith(".pdf"):
        return extract_text_from_pdf(content)
    elif fname.endswith(".docx"):
        return extract_text_from_docx(content)
    elif fname.endswith(".txt"):
        try:
            return content.decode("utf-8", errors="replace").strip()
        except Exception:
            return ""
    # Try pdf first, then docx, then text
    t = extract_text_from_pdf(content)
    if t:
        return t
    t = extract_text_from_docx(content)
    if t:
        return t
    return content.decode("utf-8", errors="replace").strip()


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
        textColor=colors.HexColor("#0a0a0c")
    )
    header_style = ParagraphStyle(
        "ReportSub",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#ff3b5c")
    )
    normal_style = styles["Normal"]

    story = [
        Paragraph("Pathfinder AI · Placement Analytics & Cohort Report", title_style),
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
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ff3b5c")),
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
        textColor=colors.HexColor("#0a0a0c")
    )
    score_style = ParagraphStyle(
        "ScoreHeader",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#ff3b5c") if feedback.score >= 70 else colors.HexColor("#c7c7cf")
    )
    section_style = ParagraphStyle(
        "SecHeader",
        parent=styles["Heading3"],
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#16161a")
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
