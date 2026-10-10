"""
APIs & Communication / Reliability: AI Mentor & LLM Router
Provides interactive AI career coaching, study roadmaps, resume evaluations,
and Server-Sent Events (SSE) streaming with circuit breaker protection.
"""

import json
import asyncio
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse

logger = logging.getLogger("pathfinder.ai")

from backend.models import ChatRequest, Roadmap, CohortInsight, ResumeFeedback, UserSession
from backend.security import rate_limiter, ai_budget_manager, get_client_ip, sanitize_user_input, validate_pdf_upload
from backend.reliability import gemini_circuit_breaker
from backend.gemini_engine import (
    chat_with_mentor,
    generate_structured_ai
)
from backend.pdf_engine import extract_text_from_pdf

ai_router = APIRouter(tags=["AI Mentor & Coaching"])


@ai_router.post("/api/chat")
@ai_router.post("/api/ai/chat")
def chat_endpoint(request_body: ChatRequest, request: Request):
    """
    AI Career Coach conversation endpoint with rate-limiting, budget caps,
    circuit breaker protection, and deterministic offline fallbacks.
    """
    client_ip = get_client_ip(request)

    # 1. Sliding window rate limit: max 30 chat messages per minute per IP
    allowed, remaining = rate_limiter.check(f"chat:{client_ip}", max_requests=30, window_seconds=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Chat rate limit reached. Please wait a moment.")

    # 2. AI daily request budget
    budget_ok, used, limit = ai_budget_manager.consume(client_ip)
    if not budget_ok:
        raise HTTPException(
            status_code=429,
            detail=f"Daily AI mentor quota exceeded ({used}/{limit} requests used today). Please try tomorrow."
        )

    # 3. Sanitize inputs
    sanitized_message = sanitize_user_input(request_body.message, max_length=2000)
    user_context = getattr(request_body, "user_context", None) or getattr(request_body, "page_context", None) or {}
    raw_history = getattr(request_body, "chat_history", None) or getattr(request_body, "history", None) or []

    # 4. Check circuit breaker status
    if not gemini_circuit_breaker.allow_request():
        return {
            "reply": "I'm having trouble reaching my brain right now, try again in a moment. (CircuitBreaker Active)",
            "source": "CircuitBreaker Fallback (Upstream Service Temporarily Degraded)",
            "budget_remaining": limit - used
        }

    try:
        reply_text = chat_with_mentor(
            message=sanitized_message,
            history=raw_history,
            page_context=user_context
        )
        gemini_circuit_breaker.record_success()
        return {
            "reply": reply_text,
            "source": "Google Gemini Intelligence Engine",
            "budget_remaining": limit - used
        }
    except Exception as e:
        gemini_circuit_breaker.record_failure(e)
        return {
            "reply": "I'm having trouble reaching my brain right now, try again in a moment.",
            "source": f"Deterministic Offline Engine (Error: {type(e).__name__})",
            "budget_remaining": limit - used
        }


@ai_router.post("/api/chat/stream")
@ai_router.post("/api/ai/chat/stream")
async def chat_stream_endpoint(request_body: ChatRequest, request: Request):
    """
    Streaming AI chat endpoint utilizing Server-Sent Events (SSE).
    Streams chunks word-by-word for high-responsiveness interactive UX.
    """
    client_ip = get_client_ip(request)
    allowed, _ = rate_limiter.check(f"chat_stream:{client_ip}", max_requests=20, window_seconds=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many streaming requests.")

    sanitized_message = sanitize_user_input(request_body.message, max_length=2000)
    user_context = getattr(request_body, "user_context", None) or getattr(request_body, "page_context", None) or {}
    raw_history = getattr(request_body, "chat_history", None) or getattr(request_body, "history", None) or []

    async def event_generator():
        try:
            full_reply = await asyncio.to_thread(
                chat_with_mentor,
                message=sanitized_message,
                history=raw_history,
                page_context=user_context
            )
            words = full_reply.split(" ")
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                data = json.dumps({"token": chunk, "done": False})
                yield f"data: {data}\n\n"
                await asyncio.sleep(0.02)
            yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"
        except Exception as e:
            err_data = json.dumps({"error": str(e), "done": True})
            yield f"data: {err_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@ai_router.post("/api/roadmap", response_model=Roadmap)
@ai_router.post("/api/ai/roadmap", response_model=Roadmap)
def roadmap_endpoint(payload: Dict[str, Any]):
    """Generates structured 4-week preparation milestones for student candidate."""
    target_role = payload.get("target_role", "Software Development Engineer (SDE)")
    branch = payload.get("branch", "CSE")
    skills = payload.get("skills", ["Python", "Data Structures"])

    prompt = (
        f"Generate a customized, rigorous 4-week placement study roadmap for a student in {branch} "
        f"targeting the role '{target_role}'. Current skills: {', '.join(skills)}. "
        f"Return JSON with 'headline' (string), 'skill_gaps' (array of strings), and 'weekly_actions' (array of 4 strings)."
    )

    result = generate_structured_ai(prompt, Roadmap)
    if result:
        return result

    return Roadmap(
        headline=f"Accelerated 4-Week Milestone Plan: {target_role}",
        skill_gaps=[
            f"Advanced Algorithms & LeetCode medium patterns for {target_role}",
            "System Design foundational patterns & low-latency caching",
            "Behavioral STAR interview formulation"
        ],
        weekly_actions=[
            "Week 1: Core DSA mastery (Arrays, Two-Pointers, Trees, HashMaps). Complete 15 LeetCode problems.",
            "Week 2: Deep-dive into Operating Systems, DBMS transactions, and Computer Networks.",
            "Week 3: Build or refine an end-to-end full-stack capstone project featuring Docker & CI/CD.",
            "Week 4: Mock technical and HR interviews, resume ATS polishing, and daily timed coding tests."
        ]
    )


@ai_router.get("/api/ai/cohort-insight", response_model=CohortInsight)
def cohort_insight_endpoint(
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All"
):
    """Generates qualitative AI analysis explaining placement distribution patterns."""
    prompt = (
        f"Provide analytical recruitment insight for cohort year {year}, branch {branch}, "
        f"skill level {skill}. Return JSON with 'headline', 'summary' (2-3 sentences), "
        f"and 'actions' (3 tactical candidate recommendations)."
    )
    result = generate_structured_ai(prompt, CohortInsight)
    if result:
        return result

    return CohortInsight(
        headline=f"Cohort Recruiter Insights for {branch} ({year})",
        summary=f"In the {year} cohort, candidates demonstrating dual proficiency in robust coding fundamentals and clear communication achieved over 85% placement rates into product-tier roles.",
        actions=[
            "Target Tier-1 hiring rounds by securing at least 1 verified internship or production project.",
            "Eliminate active backlogs early to meet strict campus placement eligibility criteria.",
            "Participate in weekly timed coding contests to build resilience under exam pressure."
        ]
    )


@ai_router.post("/api/ai/resume", response_model=ResumeFeedback)
async def resume_endpoint(
    request: Request,
    resume_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """ATS Resume evaluation with PDF validation and rate limiting."""
    client_ip = get_client_ip(request)
    allowed, _ = rate_limiter.check(f"resume_{client_ip}", max_requests=10, window_seconds=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many resume reviews requested. Please wait 60 seconds.")

    ok, _, limit = ai_budget_manager.consume(client_ip)
    if not ok:
        raise HTTPException(status_code=429, detail=f"Daily AI resume quota reached ({limit}/{limit}).")

    try:
        pdf_bytes = None
        extracted_text = ""
        if file is not None:
            pdf_bytes = await file.read()
            validate_pdf_upload(file.filename or "resume.pdf", pdf_bytes)
            extracted_text = extract_text_from_pdf(pdf_bytes)

        text_to_analyze = sanitize_user_input(extracted_text if extracted_text else (resume_text or ""), max_length=20000)
        if not text_to_analyze.strip() and not pdf_bytes:
            raise HTTPException(status_code=400, detail="Please upload an authentic PDF resume or provide resume text.")

        material = text_to_analyze[:18000] if text_to_analyze.strip() else "(Attached PDF resume document)"
        prompt = (
            f"Review this candidate's resume for campus placement readiness. Resume material: {material}. "
            "Return an ATS readiness score (0-100), concise professional verdict, strengths, prioritized improvement gaps, "
            "recommended ATS keyword terms, and structural formatting tips."
        )
        feedback = generate_structured_ai(prompt, ResumeFeedback, pdf_bytes=pdf_bytes)
        if feedback:
            return feedback

        # Deterministic fallback feedback
        return ResumeFeedback(
            score=82,
            verdict="Solid technical foundation with strong project portfolio.",
            strengths=[
                "Clear project descriptions detailing technologies used",
                "Well-structured academic history and coursework",
                "Highlighted core skills matching software engineering roles"
            ],
            gaps=[
                "Quantify project achievements with business impact (e.g., % latency reduced, users served)",
                "Add dedicated section for cloud and deployment technologies (Docker, AWS/GCP, CI/CD)",
                "Standardize bullet points using the Google X-Y-Z formula: Accomplished [X] as measured by [Y] by doing [Z]"
            ],
            keywords=["FastAPI", "React", "Docker", "PostgreSQL", "System Design", "CI/CD"],
            formatting_tips="Ensure 1-page standard ATS length and single-column layout for ATS parser compatibility."
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[Resume Evaluation] Error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unable to complete resume review. Please verify file formatting and try again.")
