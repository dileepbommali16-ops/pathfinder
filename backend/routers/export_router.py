"""
APIs & Communication: Export & Report Generation Router
Handles PDF analytics generation, CSV cohort data streaming, and ATS resume PDF export.
"""

import io
import re
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Response, HTTPException, Query, Body, Request

from backend.analytics_engine import filter_cohort_records
from backend.pdf_engine import generate_analytics_pdf, generate_resume_pdf
from backend.security import rate_limiter, get_client_ip

logger = logging.getLogger("pathfinder.export")
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
    request: Request,
    year: Optional[int] = Query(2026),
    branch: Optional[str] = Query("All"),
    gender: Optional[str] = Query("All"),
    skill: Optional[str] = Query("All")
):
    """Generates an executive placement analytics summary PDF."""
    client_ip = get_client_ip(request)
    allowed, _ = rate_limiter.check(f"pdf_{client_ip}", max_requests=10, window_seconds=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many PDF export requests. Please wait 60 seconds.")

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
        logger.error(f"Failed to generate analytics PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate analytics PDF. Please try again.")


@export_router.post("/api/export/resume-pdf")
def export_resume_pdf_endpoint(
    request: Request,
    payload: Dict[str, Any] = Body(...)
):
    """Compiles structured candidate profile into a clean ATS-friendly PDF resume."""
    client_ip = get_client_ip(request)
    allowed, _ = rate_limiter.check(f"resume_pdf_{client_ip}", max_requests=10, window_seconds=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many resume PDF compilation requests. Please wait 60 seconds.")

    try:
        pdf_bytes = generate_resume_pdf(payload)
        raw_name = str(payload.get("full_name") or "candidate").strip()
        candidate_name = re.sub(r"[^a-zA-Z0-9_\-]", "", raw_name.replace(" ", "_"))[:40] or "candidate"
        filename = f"{candidate_name}_ATS_Resume.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Failed to compile resume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to compile resume. Please try again.")
