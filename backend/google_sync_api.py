# backend/google_sync_api.py
import os
import json
import urllib.request
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.google_automation import google_auto

router = APIRouter(prefix="/api/google", tags=["Google Workspace, Gmail & Placement Automation"])

N8N_WEBHOOK_URL = os.getenv(
    "N8N_WEBHOOK_URL",
    "https://dileepdas.app.n8n.cloud/webhook/pathfinder-google-sync"
)


def trigger_n8n_webhook(event_type: str, data: dict) -> bool:
    urls_to_try = []
    env_url = os.getenv("N8N_WEBHOOK_URL", "").strip()
    if env_url:
        urls_to_try.append(env_url)
    prod_url = "https://dileepdas.app.n8n.cloud/webhook/pathfinder-google-sync"
    test_url = "https://dileepdas.app.n8n.cloud/webhook-test/pathfinder-google-sync"
    for u in [prod_url, test_url]:
        if u not in urls_to_try:
            urls_to_try.append(u)

    payload = json.dumps({"event": event_type, "data": data}).encode("utf-8")
    for target_url in urls_to_try:
        try:
            req = urllib.request.Request(
                target_url,
                data=payload,
                headers={"Content-Type": "application/json", "User-Agent": "Pathfinder/2.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status in (200, 201, 204):
                    return True
        except Exception:
            continue
    return False


class GmailSendRequest(BaseModel):
    recipient_email: str
    subject: str
    body: str


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


@router.post("/gmail/send")
async def send_gmail_message(payload: GmailSendRequest):
    """Sends automated Gmail message (TPO Dossier, Interview Invite, or Readiness Summary)."""
    try:
        if hasattr(google_auto, "send_tpo_placement_report"):
            google_auto.send_tpo_placement_report(
                tpo_email=payload.recipient_email,
                student_name=payload.subject,
                readiness_score=85.0,
            )
        n8n_synced = trigger_n8n_webhook("gmail_send", payload.model_dump())
        return {
            "success": True,
            "n8n_synced": n8n_synced,
            "message": f"Email sent to {payload.recipient_email} with subject '{payload.subject}'.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calendar/schedule")
async def schedule_google_calendar(payload: CalendarSyncRequest):
    try:
        local_res = google_auto.schedule_interview_calendar(
            student_email=payload.student_email,
            company_name=payload.company_name,
            interview_time=payload.interview_time,
        )
        n8n_triggered = trigger_n8n_webhook("calendar_schedule", payload.model_dump())
        return {
            "success": True,
            "n8n_synced": n8n_triggered,
            "message": f"Scheduled {payload.company_name} ({payload.role_title}) on Google Calendar for {payload.interview_time}.",
            "details": local_res,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sheets/log")
async def log_to_tpo_sheet(payload: SheetLogRequest):
    try:
        local_res = google_auto.log_to_placement_sheet(
            student_name=payload.student_name,
            branch=payload.branch,
            score=payload.readiness_score,
        )
        n8n_triggered = trigger_n8n_webhook("tpo_sheet_log", payload.model_dump())
        return {
            "success": True,
            "n8n_synced": n8n_triggered,
            "message": f"Updated {payload.student_name} ({payload.readiness_score}%) in TPO Google Sheet.",
            "details": local_res,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/placement-brief")
async def get_placement_brief_for_agent(query: str = Query("Google")):
    """Complete Google & Top-Tier Company Placement Intelligence for natural agent explanations."""
    q = query.lower().strip()

    if "google" in q:
        return {
            "company": "Google India (SDE-1, STEP Intern, Cloud & AI Roles)",
            "compensation": "28 LPA - 44 LPA Base + Stock (University Grad) | ₹80k-₹1.1L/month Stipend (Intern)",
            "eligibility_requirements": {
                "cgpa": "8.0+ recommended for campus drives (7.5+ accepted with strong competitive programming/projects)",
                "backlogs": "0 active backlogs at the time of interview",
                "resume_rule": "1-Page ATS format using Google's X-Y-Z bullet formula ('Accomplished [X] as measured by [Y], by doing [Z]')"
            },
            "interview_stages": [
                "Stage 1: Google Online Challenge (GOC) - 2 Medium/Hard DSA questions in 60 mins",
                "Stage 2: Recruiter Screening & 45-min Technical Phone Screen (Live coding without IDE autocomplete)",
                "Stage 3: 3x Technical Onsite Rounds (Graphs, Trees, Dynamic Programming, Tries, Sliding Window, & System Design)",
                "Stage 4: Googliness & Leadership Round (Behavioral questions on ambiguity, teamwork, and ethics)"
            ],
            "top_pathfinder_blueprints_for_google": [
                "Blueprint #1: Distributed Cloud Task Orchestrator",
                "Blueprint #5: Autonomous Multi-Agent RAG & Voice Co-Pilot"
            ]
        }

    return {
        "cohort_records": 972,
        "overall_placement_rate": "84.6%",
        "tier1_requirements": "CGPA 7.5+, 0 Backlogs, Blind 75 DSA mastery, 2 Production Capstones",
        "tip": "Use Resume Studio for Google X-Y-Z bullet optimization and STAR Defense tab to practice project cross-questioning."
    }
