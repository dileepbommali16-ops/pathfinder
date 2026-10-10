"""
APIs & Communication: Export & Report Generation Router
Handles PDF analytics generation, CSV cohort data streaming, and ATS resume PDF export.
"""

import io
from typing import Optional, Dict, Any
from fastapi import APIRouter, Response, HTTPException, Query, Body

from backend.analytics_engine import filter_cohort_records
from backend.pdf_engine import generate_analytics_pdf, generate_resume_pdf

export_router = APIRouter(tags=["Exports & Document Generation"])


@export_router.get("/api/export/csv")
def export_csv_endpoint(
    year: Optional[int] = Query(2026),
    branch: Optional[str] = Query("All"),
    gender: Optional[str] = Query("All"),
    skill: Optional[str] = Query("All")
):
    """Exports filtered cohort placement dataset as a downloadable CSV."""
    df = filter_cohort_records(year=year, branch=branch, gender=gender, skill=skill)
    csv_data = df.to_csv(index=False)
    filename = f"pathfinder_cohort_{year}_{branch}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@export_router.get("/api/export/pdf")
def export_pdf_endpoint(
    year: Optional[int] = Query(2026),
    branch: Optional[str] = Query("All"),
    gender: Optional[str] = Query("All"),
    skill: Optional[str] = Query("All")
):
    """Generates an executive placement analytics summary PDF."""
    try:
        df = filter_cohort_records(year=year or 2026, branch=branch or "All", gender=gender or "All", skill=skill or "All")
        filters = {"Year": year or 2026, "Branch": branch or "All"}
        pdf_bytes = generate_analytics_pdf(data=df, filters=filters)
        filename = f"pathfinder_analytics_{year}_{branch}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@export_router.post("/api/export/resume-pdf")
def export_resume_pdf_endpoint(payload: Dict[str, Any] = Body(...)):
    """Compiles structured candidate profile into a clean ATS-friendly PDF resume."""
    try:
        pdf_bytes = generate_resume_pdf(payload)
        candidate_name = payload.get("full_name", "candidate").replace(" ", "_")
        filename = f"{candidate_name}_ATS_Resume.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compile resume: {str(e)}")
