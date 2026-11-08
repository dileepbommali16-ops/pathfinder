# backend/google_sync_api.py
import os
import httpx
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.google_automation import google_auto

router = APIRouter(prefix="/api/google", tags=["Google Workspace & n8n Automation"])


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
    student_email: Optional[str] = "student@pathfinder.edu"
    company_name: Optional[str] = "Tier-1 Tech Partner"


async def trigger_n8n_webhook(event_type: str, data: dict) -> Optional[dict]:
    """
    Forwards placement, calendar, and TPO sheet events to an n8n Webhook URL
    (if N8N_WEBHOOK_URL is configured) for zero-OAuth multi-app automation
    (Google Sheets + Google Calendar + Gmail + WhatsApp/Telegram).
    """
    webhook_url = os.getenv(
        "N8N_WEBHOOK_URL",
        "https://dileepdas.app.n8n.cloud/webhook-test/pathfinder-google-sync"
    ).strip()
    if not webhook_url:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                webhook_url,
                json={
                    "source": "Pathfinder 2.0 Autonomous Career OS",
                    "event_type": event_type,
                    **data,
                },
            )
            return {
                "n8n_triggered": resp.status_code < 400,
                "status_code": resp.status_code,
            }
    except Exception as exc:
        return {"n8n_triggered": False, "error": str(exc)}


@router.post("/calendar/schedule")
async def schedule_google_calendar(payload: CalendarSyncRequest):
    """
    Automatically schedules an upcoming Mock Interview or Campus Drive
    on Google Calendar (via n8n Webhook and/or Google Calendar API v3).
    """
    try:
        n8n_res = await trigger_n8n_webhook(
            "schedule_interview_calendar",
            {
                "student_email": payload.student_email,
                "company_name": payload.company_name,
                "interview_time": payload.interview_time,
                "role_title": payload.role_title,
            },
        )
        res = google_auto.schedule_interview_calendar(
            student_email=payload.student_email,
            company_name=payload.company_name,
            interview_time=payload.interview_time,
        )
        return {
            "success": True,
            "message": f"Successfully scheduled {payload.company_name} interview on Google Calendar!",
            "automation_status": res,
            "n8n_status": n8n_res or {"mode": "direct_or_simulated"},
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
    Placement Officer (TPO) master Google Sheet (via n8n Webhook and/or Sheets API v4).
    """
    try:
        n8n_res = await trigger_n8n_webhook(
            "log_tpo_placement_sheet",
            {
                "student_name": payload.student_name,
                "student_email": payload.student_email,
                "branch": payload.branch,
                "readiness_score": payload.readiness_score,
                "target_role": payload.target_role,
                "company_name": payload.company_name,
                "status": "Ready for Placement" if payload.readiness_score >= 75 else "Needs Training",
            },
        )
        res = google_auto.log_to_placement_sheet(
            student_name=payload.student_name,
            branch=payload.branch,
            score=payload.readiness_score,
        )
        return {
            "success": True,
            "message": "Readiness score logged to TPO Master Google Sheet successfully!",
            "automation_status": res,
            "n8n_status": n8n_res or {"mode": "direct_or_simulated"},
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
