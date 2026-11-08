# backend/google_sync_api.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.google_automation import google_auto

router = APIRouter(prefix="/api/google", tags=["Google Workspace Automation"])


class CalendarSyncRequest(BaseModel):
    student_email: str
    company_name: str
    interview_time: str
    role_title: str


class SheetLogRequest(BaseModel):
    student_name: str
    branch: str
    readiness_score: float
    target_role: str


@router.post("/calendar/schedule")
async def schedule_google_calendar(payload: CalendarSyncRequest):
    """
    Automatically schedules an upcoming Mock Interview or Campus Drive
    on Google Calendar.
    """
    try:
        res = google_auto.schedule_interview_calendar(
            student_email=payload.student_email,
            company_name=payload.company_name,
            interview_time=payload.interview_time,
        )
        return {
            "success": True,
            "message": f"Successfully scheduled {payload.company_name} interview on Google Calendar!",
            "automation_status": res,
            "event_details": {
                "title": f"Pathfinder Mock Interview: {payload.role_title} at {payload.company_name}",
                "time": payload.interview_time,
                "calendar": "Primary Student & TPO Calendar",
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sheets/log")
async def log_to_tpo_sheet(payload: SheetLogRequest):
    """
    Logs student readiness score and details as a verified row in the
    Placement Officer (TPO) master Google Sheet.
    """
    try:
        res = google_auto.log_to_placement_sheet(
            student_name=payload.student_name,
            branch=payload.branch,
            score=payload.readiness_score,
        )
        return {
            "success": True,
            "message": "Readiness score logged to TPO Master Google Sheet successfully!",
            "automation_status": res,
            "row_data": {
                "name": payload.student_name,
                "branch": payload.branch,
                "score": f"{payload.readiness_score}%",
                "role": payload.target_role,
                "status": "Verified & Sync Ready",
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

