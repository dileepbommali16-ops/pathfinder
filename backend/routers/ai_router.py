"""
APIs & Communication / Reliability: AI Mentor & LLM Router
Provides interactive AI career coaching, study roadmaps, resume evaluations,
and Server-Sent Events (SSE) streaming with circuit breaker protection.
"""

import re
import json
import asyncio
import logging
from typing import Optional, Dict, Any, List, Tuple
from fastapi import APIRouter, Request, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse

logger = logging.getLogger("pathfinder.ai")

from backend.models import (
    ChatRequest,
    Roadmap,
    CohortInsight,
    ResumeFeedback,
    UserSession,
    StudentProfile,
    DefenseEvaluationRequest,
    DefenseEvaluationResult,
    InterviewEvaluationRequest,
    InterviewEvaluationResult,
    CodingArenaEvaluationRequest,
    CodingArenaEvaluationResult,
    GenerateCodingProblemRequest,
    GeneratedCodingProblem,
)
from backend.security import (
    rate_limiter,
    ai_budget_manager,
    get_client_ip,
    get_session_or_client_key,
    sanitize_user_input,
    validate_pdf_upload,
)
from backend.reliability import gemini_circuit_breaker
from backend.gemini_engine import (
    chat_with_mentor,
    stream_chat_with_mentor,
    generate_structured_ai,
    generate_strict_json_evaluation,
    generate_smart_fallback_reply
)
from backend.pdf_engine import extract_text_from_pdf, extract_resume_text
from backend.resume_auditor import (
    analyze_resume_deterministically,
    merge_with_deterministic_audit,
)

ai_router = APIRouter(tags=["AI Mentor & Coaching"])


@ai_router.post("/api/chat")
@ai_router.post("/api/ai/chat")
async def chat_endpoint(request_body: ChatRequest, request: Request):
    """
    AI Career Coach conversation endpoint with session-isolated rate-limiting,
    campus NAT burst headroom, circuit breaker protection, and grounded fallbacks.
    """
    user_context = getattr(request_body, "user_context", None) or getattr(request_body, "page_context", None) or {}
    raw_history = getattr(request_body, "chat_history", None) or getattr(request_body, "history", None) or []
    active_tab = getattr(request_body, "active_tab", None) or (user_context.get("active_tab") if isinstance(user_context, dict) else None)
    profile = getattr(request_body, "profile", None)
    user_hint = (user_context.get("userEmail") or user_context.get("userName") or "") if isinstance(user_context, dict) else ""

    client_ip = get_client_ip(request)
    session_key = get_session_or_client_key(request, user_hint=str(user_hint))

    # 1. Per-session sliding window rate limit + high campus NAT IP burst headroom
    allowed, _ = rate_limiter.check(f"chat:{session_key}", max_requests=60, window_seconds=60)
    ip_burst_ok, _ = rate_limiter.check(f"chat_burst:{client_ip}", max_requests=600, window_seconds=60)
    if not allowed or not ip_burst_ok:
        raise HTTPException(status_code=429, detail="Chat rate limit reached. Please wait a moment.")

    # 2. Per-session AI daily request budget
    budget_ok, used, limit = ai_budget_manager.consume(session_key)
    if not budget_ok:
        raise HTTPException(
            status_code=429,
            detail=f"Daily AI mentor quota exceeded ({used}/{limit} requests used today). Please try tomorrow."
        )

    # 3. Sanitize inputs
    sanitized_message = sanitize_user_input(request_body.message, max_length=2000)

    # 4. Check circuit breaker status -> serve grounded domain answer seamlessly instead of dead-ending
    if not gemini_circuit_breaker.allow_request():
        fallback_reply = generate_smart_fallback_reply(
            message=sanitized_message,
            history=raw_history,
            profile=profile,
            active_tab=active_tab,
            page_context=user_context
        )
        return {
            "reply": fallback_reply,
            "source": "Pathfinder Intelligence Engine (High-Availability Fallback)",
            "budget_remaining": limit - used
        }

    try:
        reply_text, meta = await asyncio.to_thread(
            chat_with_mentor,
            message=sanitized_message,
            history=raw_history,
            profile=profile,
            active_tab=active_tab,
            page_context=user_context,
            return_meta=True,
        )
        if meta.get("status") == "success":
            gemini_circuit_breaker.record_success()
        else:
            gemini_circuit_breaker.record_failure(Exception("All LLM providers unavailable"))
        model_used = meta.get("model_used", "none")
        if model_used and model_used != "none":
            source = "DAS AI Core"
        else:
            source = "Pathfinder Intelligence Engine"
        return {
            "reply": reply_text,
            "source": source,
            "budget_remaining": limit - used,
            "meta": meta
        }
    except Exception as e:
        gemini_circuit_breaker.record_failure(e)
        fallback_reply = generate_smart_fallback_reply(
            message=sanitized_message,
            history=raw_history,
            profile=profile,
            active_tab=active_tab,
            page_context=user_context
        )
        return {
            "reply": fallback_reply,
            "source": "Pathfinder Intelligence Engine (Adaptive Guidance)",
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
    session_key = get_session_or_client_key(request)
    allowed, _ = rate_limiter.check(f"chat_stream:{session_key}", max_requests=40, window_seconds=60)
    ip_burst_ok, _ = rate_limiter.check(f"chat_stream_burst:{client_ip}", max_requests=500, window_seconds=60)
    if not allowed or not ip_burst_ok:
        raise HTTPException(status_code=429, detail="Too many streaming requests.")

    sanitized_message = sanitize_user_input(request_body.message, max_length=2000)
    user_context = getattr(request_body, "user_context", None) or getattr(request_body, "page_context", None) or {}
    raw_history = getattr(request_body, "chat_history", None) or getattr(request_body, "history", None) or []
    active_tab = getattr(request_body, "active_tab", None) or (user_context.get("active_tab") if isinstance(user_context, dict) else None)
    profile = getattr(request_body, "profile", None)

    async def event_generator():
        try:
            async for chunk in stream_chat_with_mentor(
                message=sanitized_message,
                history=raw_history,
                profile=profile,
                active_tab=active_tab,
                page_context=user_context
            ):
                data = json.dumps({"token": chunk, "done": False})
                yield f"data: {data}\n\n"
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
async def roadmap_endpoint(payload: Dict[str, Any]):
    """Generates structured 4-week preparation milestones for student candidate."""
    target_role = payload.get("target_role", "Software Development Engineer (SDE)")
    branch = payload.get("branch", "CSE")
    skills = payload.get("skills", ["Python", "Data Structures"])

    prompt = (
        f"Generate a customized, rigorous 4-week placement study roadmap for a student in {branch} "
        f"targeting the role '{target_role}'. Current skills: {', '.join(skills)}. "
        f"Return JSON with 'headline' (string), 'skill_gaps' (array of strings), and 'weekly_actions' (array of 4 strings)."
    )

    result = await asyncio.to_thread(generate_structured_ai, prompt, Roadmap)
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


@ai_router.api_route("/api/ai/cohort-insight", methods=["GET", "POST"], response_model=CohortInsight)
@ai_router.api_route("/api/cohort-insight", methods=["GET", "POST"], response_model=CohortInsight)
async def cohort_insight_endpoint(
    request: Request,
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All"
):
    """Generates qualitative AI analysis explaining placement distribution patterns."""
    if request.method == "POST":
        try:
            body = await request.json()
            if isinstance(body, dict):
                year = body.get("year", year)
                branch = body.get("branch", branch)
                gender = body.get("gender", gender)
                skill = body.get("skill", skill)
        except Exception:
            pass
    prompt = (
        f"Provide analytical recruitment insight for cohort year {year}, branch {branch}, "
        f"skill level {skill}. Return JSON with 'headline', 'summary' (2-3 sentences), "
        f"and 'actions' (3 tactical candidate recommendations)."
    )
    result = await asyncio.to_thread(generate_structured_ai, prompt, CohortInsight)
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
    """ATS Resume evaluation with PDF validation, thread offload, and session-scoped limits."""
    client_ip = get_client_ip(request)
    session_key = get_session_or_client_key(request)
    allowed_session, _ = rate_limiter.check(f"resume_{session_key}", max_requests=25, window_seconds=60)
    allowed_ip, _ = rate_limiter.check(f"resume_burst_{client_ip}", max_requests=250, window_seconds=60)
    if not (allowed_session and allowed_ip):
        raise HTTPException(status_code=429, detail="Too many resume reviews requested. Please wait 60 seconds.")

    ok, _, limit = ai_budget_manager.consume(session_key)
    if not ok:
        raise HTTPException(status_code=429, detail=f"Daily AI resume quota reached ({limit}/{limit}).")

    try:
        pdf_bytes = None
        extracted_text = ""
        if file is not None:
            pdf_bytes = await file.read()
            validate_pdf_upload(file.filename or "resume.pdf", pdf_bytes)
            extracted_text = await asyncio.to_thread(
                extract_resume_text,
                pdf_bytes,
                file.filename or "resume.pdf",
            )

        text_to_analyze = sanitize_user_input(extracted_text if extracted_text else (resume_text or ""), max_length=20000)
        if not text_to_analyze.strip() and not pdf_bytes:
            raise HTTPException(status_code=400, detail="Please upload an authentic PDF resume or provide resume text.")

        deterministic_audit = await asyncio.to_thread(
            analyze_resume_deterministically,
            resume_text=text_to_analyze,
        )

        # If extracted text is virtually empty (scanned/blank PDF) without raw bytes, return immediate honest audit
        if len(text_to_analyze.strip()) < 40 and not pdf_bytes:
            return deterministic_audit

        sys_instruction = (
            "You are a candid Senior Deloitte Technology Consulting Manager and Staff Big-Tech Hiring Manager "
            "(Deloitte, Amazon, Google, Microsoft). NEVER flatter thin, student-level, or toy/Streamlit-only resumes "
            "or invent strengths absent from the resume. "
            "If the resume shows thin skills, only Streamlit/academic mini-projects without production backend APIs "
            "(FastAPI/Spring/Node), persistent SQL/NoSQL databases, Docker/AWS/Azure/GCP cloud deployment, CI/CD, "
            "automated testing, or quantified metrics (latency %, scale, accuracy), score strictly 25-48 ('Major Overhaul Needed'). "
            "Populate ALL lists thoroughly: strengths, improvements (blunt hiring manager blockers), missing_skills "
            "(specific Backend, Cloud, DB, Testing, DSA skills missing), recommended_certifications (AWS, Azure AZ-900, GCP, Databricks), "
            "project_upgrade_plan (how to graduate basic Streamlit demos into deployed production systems), ats_keywords, "
            "formatting_tips, rewritten_bullets (Google X-Y-Z before/after examples for their projects), and "
            "company_matches (exact objects for Deloitte, Amazon, Google, Microsoft, TCS Digital / Infosys, Fast-Growth AI Startup)."
        )

        prompt = (
            f"Deterministic Pre-Scan Summary: Detected skills={deterministic_audit.detected_skills or ['Minimal']}; "
            f"Detected project lines={deterministic_audit.detected_projects or ['None clear']}; "
            f"Baseline strict heuristic score={deterministic_audit.score}/100 ({deterministic_audit.recruiter_readiness_tier}).\n\n"
            f"Extracted Resume Content:\n\"\"\"\n{text_to_analyze[:14000]}\n\"\"\"\n\n"
            "Evaluate this exact resume critically as a Senior Deloitte & Big-Tech Manager and return strict JSON "
            "matching ResumeFeedback (all lists non-empty where guidance applies; zero empty placeholder arrays)."
        )

        ai_feedback = None
        if gemini_circuit_breaker.allow_request():
            ai_result, model_name, err_reason = await asyncio.to_thread(
                generate_strict_json_evaluation,
                prompt=prompt,
                schema=ResumeFeedback,
                system_instruction=sys_instruction,
                pdf_bytes=pdf_bytes if (pdf_bytes and len(text_to_analyze.strip()) < 250) else None,
            )
            if ai_result is not None:
                ai_feedback = ai_result
                ai_feedback.evaluation_source = "DAS AI + Senior Hiring Manager Rubric"
                gemini_circuit_breaker.record_success()
            else:
                gemini_circuit_breaker.record_failure(Exception(err_reason or "Gemini unavailable"))
                logger.warning(f"[Resume Evaluation] Gemini unavailable ({err_reason}); serving strict deterministic audit.")

        return await asyncio.to_thread(
            merge_with_deterministic_audit,
            ai_feedback,
            deterministic_audit,
            text_to_analyze,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[Resume Evaluation] Error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unable to complete resume review. Please verify file formatting and try again.")


_NON_ANSWER_PATTERNS = [
    r"\bi\s*don['’]?t\s*know\b",
    r"\bdon['’]?t\s*know\b",
    r"\bi\s*do\s*not\s*know\b",
    r"\bno\s*idea\b",
    r"\bidk\b",
    r"\bskip\b",
    r"\bnext\s*question\b",
    r"\bpass\b",
    r"\bnothing\b",
    r"\bnot\s*sure\b",
    r"\bcan['’]?t\s*answer\b",
    r"\bwhat\s*is\s*the\s*answer\b",
    r"\btell\s*me\s*the\s*answer\b",
]


def _assess_answer_substance(answer: str) -> Tuple[bool, Optional[str]]:
    """
    Returns (is_non_answer, reason) so abstentions, skips, and empty inputs
    are graded honestly at 0 rather than receiving inflated rubric scores.
    """
    cleaned = re.sub(r"\s+", " ", (answer or "").strip())
    low = cleaned.lower()
    if not cleaned:
        return True, "No answer was submitted."

    for pattern in _NON_ANSWER_PATTERNS:
        if re.search(pattern, low):
            words = re.findall(r"[a-zA-Z0-9]+", low)
            # Short or explicit abstention ("i dont know next question", "skip", etc.)
            if len(words) <= 14:
                return True, f'Candidate explicitly passed or stated they do not know ("{cleaned[:80]}").'

    tokens = re.findall(r"[a-zA-Z0-9]{2,}", low)
    unique_tokens = set(tokens)
    if len(tokens) < 4 or len(unique_tokens) < 3:
        return True, "Response is too brief or lacks technical explanation to evaluate."

    # Detect keyboard smash / low-entropy repetition (e.g. "asdf asdf asdf asdf")
    if len(tokens) >= 4 and len(unique_tokens) <= 2 and len(cleaned) > 12:
        return True, "Response appears repetitive or non-substantive."

    return False, None


def _build_candidate_context(profile: Optional[StudentProfile]) -> str:
    """Formats minimal candidate context for LLM grounding."""
    if not profile:
        return "Candidate Profile: General engineering placement candidate."
    skills_list = (profile.skills or [])[:10]
    return (
        f"Candidate Context: Name={profile.full_name or 'Candidate'}, Branch={profile.branch or 'CSE'}, "
        f"Target Role={profile.target_role or 'Software Engineer'}, Target Tier={profile.target_tier or 'Product'}, "
        f"Projects={profile.projects_count or 0}, Skills={', '.join(skills_list) or 'Not specified'}."
    )


def _clamp_score(value: Any) -> int:
    try:
        return max(0, min(100, int(round(float(value)))))
    except Exception:
        return 0


def _tokenize_concepts(concepts: List[str], extra_text: str = "") -> List[str]:
    """Builds deduplicated technical concepts from request hints + prompt text."""
    seen = set()
    ordered: List[str] = []
    for item in concepts:
        clean = (item or "").strip()
        if clean and clean.lower() not in seen:
            seen.add(clean.lower())
            ordered.append(clean)
    if not ordered and extra_text:
        for tok in re.findall(r"[A-Za-z][A-Za-z0-9+/.-]{3,}", extra_text):
            low = tok.lower()
            if low not in {
                "what", "when", "where", "which", "would", "could", "should", "this", "that",
                "your", "with", "from", "into", "about", "there", "their", "they", "have",
                "does", "will", "first", "project", "system", "application", "question", "happens"
            } and low not in seen:
                seen.add(low)
                ordered.append(tok)
    return ordered[:8]


def _match_keywords(answer: str, expected_keywords: List[str]) -> Tuple[List[str], List[str]]:
    """Checks substring and stemmed token overlap between answer and expected keywords."""
    low_answer = (answer or "").lower()
    answer_words = set(re.findall(r"[a-z0-9]+", low_answer))
    matched: List[str] = []
    missing: List[str] = []

    for kw in expected_keywords:
        clean_kw = (kw or "").strip()
        if not clean_kw:
            continue
        low_kw = clean_kw.lower()
        kw_tokens = [t for t in re.findall(r"[a-z0-9]+", low_kw) if len(t) >= 3]
        direct_match = low_kw in low_answer
        token_match = bool(kw_tokens) and all(
            any(aw.startswith(kt[: min(5, len(kt))]) or kt in aw for aw in answer_words)
            for kt in kw_tokens
        )
        if direct_match or token_match:
            matched.append(clean_kw)
        else:
            missing.append(clean_kw)
    return matched, missing


def _score_defense_offline(req: DefenseEvaluationRequest) -> DefenseEvaluationResult:
    """Honest, zero-inflation local rubric used only when live Gemini is unreachable."""
    clean_answer = (req.candidate_answer or "").strip()
    concepts = _tokenize_concepts(req.key_concepts, f"{req.question} {req.context or ''}")
    matched, missing = _match_keywords(clean_answer, concepts)
    word_count = len(re.findall(r"[a-zA-Z0-9]+", clean_answer))

    concept_ratio = len(matched) / max(1, len(concepts))
    has_reasoning = bool(
        re.search(r"\b(because|therefore|trade-?off|latency|overhead|avoid|prevent|guarantee|scale|ms|throughput|bottleneck)\b", clean_answer.lower())
    )
    has_metrics = bool(re.search(r"\b(\d+\s*(?:ms|s|x|%|req|rps|qps|mb|gb))\b", clean_answer.lower()))

    raw_score = (concept_ratio * 58.0) + min(22.0, word_count * 0.4) + (12.0 if has_reasoning else 0.0) + (8.0 if has_metrics else 0.0)
    if len(matched) == 0 and word_count < 18:
        raw_score = min(raw_score, 18.0)
    score = _clamp_score(raw_score)

    strengths: List[str] = []
    if matched:
        strengths.append(f"Addressed relevant technical concepts: {', '.join(matched[:4])}.")
    if has_reasoning and word_count >= 15:
        strengths.append("Included cause-and-effect reasoning or architectural trade-off logic.")
    if has_metrics:
        strengths.append("Supported points with quantitative metrics or concrete scale thresholds.")

    gaps: List[str] = []
    if missing:
        gaps.append(f"Missed critical concepts expected for {req.category}: {', '.join(missing[:4])}.")
    if not has_reasoning:
        gaps.append("Explain WHY you chose this approach and what architectural or performance trade-off it introduces.")
    if not has_metrics:
        gaps.append("Quantify impact or failure limits (latency budget, throughput, connection limits, or rollback criteria).")

    verdict = (
        "Strong technical defense covering key architecture and failure trade-offs."
        if score >= 75
        else "Partial defense with foundational ideas, but missing depth on critical mechanisms or failure handling."
        if score >= 45
        else "Weak or incomplete technical defense. Core engineering concepts from the prompt were not explained."
    )

    ref_answer = (req.reference_answer or "").strip() or (
        f"Address {req.question} using concrete mechanisms ({', '.join(concepts[:4]) or req.category}), "
        "quantifiable latency/reliability impact, and explicit failure-mode handling."
    )
    return DefenseEvaluationResult(
        score=score,
        verdict=verdict,
        strengths=strengths,
        gaps=gaps,
        model_answer=ref_answer,
        evaluation_source="Strict Offline Rubric (Live AI unavailable)",
        is_non_answer=False,
    )


def _score_interview_offline(req: InterviewEvaluationRequest) -> InterviewEvaluationResult:
    """Honest, zero-inflation local rubric for Mock Interview when live Gemini is unreachable."""
    clean_answer = (req.candidate_answer or "").strip()
    keywords = req.ideal_keywords or req.key_concepts or _tokenize_concepts([], req.question)
    matched, missing = _match_keywords(clean_answer, keywords)
    words = re.findall(r"[a-zA-Z0-9]+", clean_answer)
    word_count = len(words)

    kw_ratio = len(matched) / max(1, len(keywords))
    depth_ratio = min(1.0, word_count / 55.0)
    has_structure = bool(re.search(r"\b(first|then|finally|because|however|trade-?off|ensure|prevent)\b", clean_answer.lower()))

    tech_score = _clamp_score(kw_ratio * 75.0 + depth_ratio * 15.0 + (10.0 if has_structure else 0.0))
    if len(matched) == 0:
        tech_score = min(tech_score, 22)
    comm_score = _clamp_score(depth_ratio * 55.0 + (25.0 if has_structure else 8.0) + kw_ratio * 20.0)
    prob_score = _clamp_score(kw_ratio * 65.0 + depth_ratio * 20.0 + (15.0 if has_structure else 0.0))
    overall = _clamp_score((tech_score * 0.45) + (comm_score * 0.25) + (prob_score * 0.30))

    if overall >= 80:
        verdict = "Strong senior-level answer covering key technical primitives and clear execution steps."
    elif overall >= 50:
        verdict = "Partial technical coverage — address the missing core primitives and edge cases listed below."
    else:
        verdict = "Insufficient technical depth for hiring bar. Most expected concepts for this prompt were missing."

    critique = (
        f"Your answer matched {len(matched)}/{max(1, len(keywords))} core concepts "
        f"across {word_count} words. "
        + (f"Focus next on: {', '.join(missing[:4])}. " if missing else "")
        + (f"Benchmark guidance: {req.benchmark_answer[:320]}" if req.benchmark_answer else (req.context_hint or ""))
    ).strip()

    return InterviewEvaluationResult(
        overall_score=overall,
        technical_precision=tech_score,
        communication_score=comm_score,
        problem_solving_score=prob_score,
        matched_keywords=matched,
        missing_keywords=missing,
        coach_verdict=verdict,
        model_critique=critique,
        evaluation_source="Strict Offline Rubric (Live AI unavailable)",
        is_non_answer=False,
    )


@ai_router.post("/api/ai/evaluate-defense", response_model=DefenseEvaluationResult)
async def evaluate_defense_endpoint(request_body: DefenseEvaluationRequest, request: Request):
    """
    Genuine strict technical interviewer evaluation for Project Defense.
    Detects abstentions ('I don't know', 'skip') at 0/100 and otherwise grades via live Gemini AI.
    """
    client_ip = get_client_ip(request)
    session_key = get_session_or_client_key(request)
    allowed, _ = rate_limiter.check(f"defense:{session_key}", max_requests=45, window_seconds=60)
    ip_burst_ok, _ = rate_limiter.check(f"defense_burst:{client_ip}", max_requests=450, window_seconds=60)
    if not allowed or not ip_burst_ok:
        raise HTTPException(status_code=429, detail="Evaluation rate limit reached. Please wait 60 seconds.")

    clean_answer = sanitize_user_input(request_body.candidate_answer, max_length=6000)
    is_non_answer, non_answer_reason = _assess_answer_substance(clean_answer)
    concepts = _tokenize_concepts(request_body.key_concepts, f"{request_body.question} {request_body.context or ''}")

    if is_non_answer:
        ref_answer = (request_body.reference_answer or "").strip() or (
            f"For {request_body.category}, explain concrete mechanisms for: {', '.join(concepts[:4]) or request_body.question}."
        )
        return DefenseEvaluationResult(
            score=0,
            verdict=non_answer_reason or "No valid technical answer was provided.",
            strengths=[],
            gaps=[
                non_answer_reason or "You did not attempt a technical explanation.",
                f"Required topics for this question: {', '.join(concepts[:5]) or request_body.context or request_body.category}.",
                "Read the Model Interviewer Response below, understand the architecture trade-offs, and try explaining it in your own words."
            ],
            model_answer=ref_answer,
            evaluation_source="Honest Screening",
            is_non_answer=True,
        )

    candidate_ctx = _build_candidate_context(request_body.profile)
    sys_instruction = (
        "You are a strict, honest Principal Software Engineer conducting a real project architecture defense interview. "
        "NEVER flatter or invent strengths that are absent in the candidate's answer. "
        "Grade strictly 0-100: 0-15 for wrong/irrelevant/no-substance, 16-40 for vague buzzwords lacking mechanism, "
        "41-65 for partial answer missing trade-offs/failure modes, 66-84 for solid answer missing quantification, "
        "85-100 only for complete production-grade reasoning with metrics and failure handling. "
        "Reference specifics from what the candidate actually wrote."
    )
    prompt = (
        f"{candidate_ctx}\n"
        f"Question Category: {request_body.category}\n"
        f"Interviewer Question: {request_body.question}\n"
        f"Evaluation Context: {request_body.context or 'Technical depth, trade-offs, failure modes, and scale metrics.'}\n"
        f"Expected Concepts: {', '.join(concepts) or 'Core architectural trade-offs'}\n\n"
        f"Candidate's Actual Answer:\n\"\"\"\n{clean_answer}\n\"\"\"\n\n"
        "Return strict JSON matching DefenseEvaluationResult:\n"
        "- score: integer 0..100 based strictly on the candidate's answer\n"
        "- verdict: 1-2 honest sentences evaluating the candidate's actual answer\n"
        "- strengths: list ONLY genuine technical points the candidate actually demonstrated (use [] if none!)\n"
        "- gaps: 2-4 specific technical omissions, inaccuracies, or unquantified claims in their answer\n"
        "- model_answer: a crisp, concrete 3-5 sentence STAR/architecture benchmark answer specifically for THIS question\n"
        "- evaluation_source: set to 'DAS AI'\n"
        "- is_non_answer: false unless the text avoids answering the question"
    )

    ai_budget_manager.consume(session_key)
    ai_result, model_name, err_reason = await asyncio.to_thread(
        generate_strict_json_evaluation,
        prompt=prompt,
        schema=DefenseEvaluationResult,
        system_instruction=sys_instruction,
    )
    if ai_result is not None:
        # Guardrail: even if an LLM softens a non-substantive response, ensure is_non_answer stays consistent
        score = _clamp_score(ai_result.score)
        if ai_result.is_non_answer:
            score = min(score, 10)
        return DefenseEvaluationResult(
            score=score,
            verdict=ai_result.verdict.strip(),
            strengths=[s.strip() for s in (ai_result.strengths or []) if s and s.strip()][:5],
            gaps=[g.strip() for g in (ai_result.gaps or []) if g and g.strip()][:5],
            model_answer=ai_result.model_answer.strip() or (request_body.reference_answer or ""),
            evaluation_source="DAS AI Technical Review",
            is_non_answer=bool(ai_result.is_non_answer),
        )

    logger.warning(f"[Defense Eval] Gemini unavailable ({err_reason}); using strict offline rubric.")
    return _score_defense_offline(request_body)


@ai_router.post("/api/ai/evaluate-interview", response_model=InterviewEvaluationResult)
async def evaluate_interview_endpoint(request_body: InterviewEvaluationRequest, request: Request):
    """
    Genuine strict Mock Interview evaluation endpoint.
    Scores Technical Precision, Communication, and Problem Solving honestly using live Gemini AI.
    """
    client_ip = get_client_ip(request)
    session_key = get_session_or_client_key(request)
    allowed, _ = rate_limiter.check(f"interview:{session_key}", max_requests=45, window_seconds=60)
    ip_burst_ok, _ = rate_limiter.check(f"interview_burst:{client_ip}", max_requests=450, window_seconds=60)
    if not allowed or not ip_burst_ok:
        raise HTTPException(status_code=429, detail="Interview evaluation rate limit reached. Please wait 60 seconds.")

    clean_answer = sanitize_user_input(request_body.candidate_answer, max_length=6000)
    expected_keywords = list(request_body.ideal_keywords or request_body.key_concepts or [])
    is_non_answer, non_answer_reason = _assess_answer_substance(clean_answer)

    if is_non_answer:
        return InterviewEvaluationResult(
            overall_score=0,
            technical_precision=0,
            communication_score=0,
            problem_solving_score=0,
            matched_keywords=[],
            missing_keywords=expected_keywords,
            coach_verdict=non_answer_reason or "No answer provided for this interview prompt.",
            model_critique=(
                "You passed or gave an incomplete non-answer. Review the target concepts above "
                + (f"and compare against a senior-level approach: {request_body.benchmark_answer}" if request_body.benchmark_answer else "before retrying.")
            ),
            evaluation_source="Honest Screening",
            is_non_answer=True,
        )

    candidate_ctx = _build_candidate_context(request_body.profile)
    sys_instruction = (
        "You are a strict Senior Staff Technical Interviewer grading a live interview response. "
        "NEVER inflate scores or praise blank/wrong/buzzword-only answers. "
        "Score honestly 0-100 across overall_score, technical_precision, communication_score, and problem_solving_score. "
        "If the candidate only states generic fluff or misses the core mechanism, score under 35. "
        "Quote or address specific points from the candidate's response in coach_verdict and model_critique."
    )
    prompt = (
        f"{candidate_ctx}\n"
        f"Company/Track: {request_body.company or 'Top Tech'} | Role: {request_body.role or 'SWE'} | "
        f"Round: {request_body.round_type or 'Technical'} | Difficulty: {request_body.difficulty or 'Medium'}\n"
        f"Question: {request_body.question}\n"
        f"Interviewer Expectation: {request_body.context_hint or 'Clear mechanism, edge cases, and trade-offs.'}\n"
        f"Expected Core Keywords: {', '.join(expected_keywords) or 'Relevant system/algorithm concepts'}\n"
        f"Response Duration: {request_body.duration_seconds or 0}s\n\n"
        f"Candidate's Actual Answer:\n\"\"\"\n{clean_answer}\n\"\"\"\n\n"
        "Return strict JSON matching InterviewEvaluationResult:\n"
        "- overall_score, technical_precision, communication_score, problem_solving_score: integers 0..100\n"
        "- matched_keywords: ONLY items from Expected Core Keywords (or equivalent demonstrated concepts) truly explained by the candidate\n"
        "- missing_keywords: items from Expected Core Keywords that the candidate missed or only name-dropped without explaining\n"
        "- coach_verdict: 1-2 direct honest sentences summarizing interview readiness on this question\n"
        "- model_critique: concrete feedback referencing what the candidate wrote, what was wrong/missing, and how to elevate it\n"
        "- evaluation_source: 'DAS AI'\n"
        "- is_non_answer: false unless off-topic or abstaining"
    )

    ai_budget_manager.consume(session_key)
    ai_result, model_name, err_reason = await asyncio.to_thread(
        generate_strict_json_evaluation,
        prompt=prompt,
        schema=InterviewEvaluationResult,
        system_instruction=sys_instruction,
    )
    if ai_result is not None:
        matched_det, _ = _match_keywords(clean_answer, expected_keywords)
        matched = [m.strip() for m in (ai_result.matched_keywords or matched_det) if m and m.strip()]
        matched_set = {m.lower() for m in matched}
        raw_missing = (
            ai_result.missing_keywords
            if ai_result.missing_keywords
            else [k for k in expected_keywords if k.strip().lower() not in matched_set]
        )
        missing = [
            m.strip()
            for m in raw_missing
            if m and m.strip() and m.strip().lower() not in matched_set
        ]
        if ai_result.is_non_answer:
            overall = min(_clamp_score(ai_result.overall_score), 10)
            tech = min(_clamp_score(ai_result.technical_precision), 10)
            comm = min(_clamp_score(ai_result.communication_score), 15)
            prob = min(_clamp_score(ai_result.problem_solving_score), 10)
        else:
            overall = _clamp_score(ai_result.overall_score)
            tech = _clamp_score(ai_result.technical_precision)
            comm = _clamp_score(ai_result.communication_score)
            prob = _clamp_score(ai_result.problem_solving_score)

        return InterviewEvaluationResult(
            overall_score=overall,
            technical_precision=tech,
            communication_score=comm,
            problem_solving_score=prob,
            matched_keywords=matched,
            missing_keywords=missing,
            coach_verdict=ai_result.coach_verdict.strip(),
            model_critique=ai_result.model_critique.strip(),
            evaluation_source="DAS AI Interview Panel",
            is_non_answer=bool(ai_result.is_non_answer),
        )

    logger.warning(f"[Interview Eval] Gemini unavailable ({err_reason}); using strict offline rubric.")
    return _score_interview_offline(request_body)


def _strip_code_noise(source: str) -> str:
    """Strips Python/JS/C-style comments, docstrings, and whitespace to detect blank/starter-only code."""
    s = source or ""
    s = re.sub(r'""".*?"""', "", s, flags=re.DOTALL)
    s = re.sub(r"'''.*?'''", "", s, flags=re.DOTALL)
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.DOTALL)
    lines = []
    for ln in s.splitlines():
        ln = re.sub(r"#.*$", "", ln)
        ln = re.sub(r"//.*$", "", ln)
        stripped = ln.strip()
        if stripped:
            lines.append(stripped)
    return "\n".join(lines)


def _is_code_blank_or_skeleton(candidate_code: str, starter_code: str) -> Tuple[bool, str]:
    cleaned_cand = _strip_code_noise(candidate_code)
    if not cleaned_cand:
        return True, "No executable solution code was written."
    cleaned_starter = _strip_code_noise(starter_code)
    if cleaned_starter and cleaned_cand == cleaned_starter:
        return True, "Code editor still contains only the unchanged starter skeleton. Implement the algorithm before submitting."
    meaningful = [
        ln for ln in cleaned_cand.splitlines()
        if not ln.startswith("def ")
        and not ln.startswith("print(")
        and ln not in ("pass", "return", "return None", "return []", "return -1", "return 0")
    ]
    if len(meaningful) == 0:
        return True, "Function body has no algorithmic implementation (only placeholder/pass statements)."
    return False, ""


def _score_coding_arena_offline(
    req: CodingArenaEvaluationRequest,
    blank_code: bool,
    code_reason: str,
    non_viva: bool,
    viva_reason: str,
) -> CodingArenaEvaluationResult:
    if blank_code:
        code_score = 0
        code_feedback = code_reason
    elif not req.compile_success:
        code_score = 18
        code_feedback = (
            f"Code failed to compile or threw a runtime error: {(req.compiler_output or '')[:180]}"
        )
    elif not req.output_matched:
        code_score = 32
        actual = (req.compiler_output or "").strip() or "no standard output"
        exp = (req.expected_output or "").strip() or "expected test output"
        code_feedback = f"Program executed without matching expected output (Expected: {exp} | Actual: {actual[:140]})."
    else:
        code_score = 88
        code_feedback = "Solution compiled cleanly and matched all sample test outputs."

    keywords = req.expected_keywords or []
    if non_viva:
        viva_score = 0
        matched_kw: List[str] = []
        missing_kw = list(keywords)
        viva_feedback = viva_reason or "No complexity or architecture explanation was submitted."
    else:
        matched_kw, missing_kw = _match_keywords(req.viva_explanation, keywords)
        words = re.findall(r"[a-zA-Z0-9]+", req.viva_explanation or "")
        kw_ratio = len(matched_kw) / max(1, len(keywords))
        depth_ratio = min(1.0, len(words) / 40.0)
        has_complexity = bool(re.search(r"O\(|complexity|time|space|linear|logarithmic", req.viva_explanation or "", re.IGNORECASE))
        viva_score = _clamp_score(kw_ratio * 65.0 + depth_ratio * 20.0 + (15.0 if has_complexity else 0.0))
        viva_feedback = (
            f"Covered {len(matched_kw)}/{max(1, len(keywords))} target complexity/design concepts."
            + (f" Missing: {', '.join(missing_kw[:3])}." if missing_kw else "")
        )

    overall = _clamp_score(code_score * 0.55 + viva_score * 0.45)
    if overall >= 82 and code_score >= 75 and req.compile_success and req.output_matched and not non_viva:
        decision = "STRONG HIRE"
    elif overall >= 65 and code_score >= 60 and req.compile_success and req.output_matched:
        decision = "HIRE"
    elif overall >= 40:
        decision = "LEANING NO HIRE"
    else:
        decision = "NO HIRE"

    verdict_text = f"{code_feedback} {viva_feedback}".strip()
    return CodingArenaEvaluationResult(
        overall_score=overall,
        code_score=code_score,
        viva_score=viva_score,
        decision=decision,
        verdict_text=verdict_text,
        code_feedback=code_feedback,
        viva_feedback=viva_feedback,
        matched_keywords=matched_kw,
        missing_keywords=missing_kw,
        evaluation_source="Strict Sandbox Rubric",
    )


@ai_router.post("/api/ai/evaluate-coding-arena", response_model=CodingArenaEvaluationResult)
async def evaluate_coding_arena_endpoint(request_body: CodingArenaEvaluationRequest, request: Request):
    """
    Zero-fake evaluation for Live Coding & Viva Arena.
    Enforces hard deterministic 0-score gates on empty/unchanged code and empty/skip viva answers,
    caps uncompiled or wrong-output submissions, and inspects actual code + stdout with Gemini.
    """
    client_ip = get_client_ip(request)
    session_key = get_session_or_client_key(request)
    allowed, _ = rate_limiter.check(f"arena_eval:{session_key}", max_requests=45, window_seconds=60)
    ip_burst_ok, _ = rate_limiter.check(f"arena_eval_burst:{client_ip}", max_requests=450, window_seconds=60)
    if not allowed or not ip_burst_ok:
        raise HTTPException(status_code=429, detail="Coding arena evaluation rate limit reached. Please wait 60 seconds.")

    clean_viva = sanitize_user_input(request_body.viva_explanation, max_length=6000)
    blank_code, code_reason = _is_code_blank_or_skeleton(request_body.candidate_code, request_body.starter_code or "")
    non_viva, viva_reason = _assess_answer_substance(clean_viva)

    if blank_code and non_viva:
        return CodingArenaEvaluationResult(
            overall_score=0,
            code_score=0,
            viva_score=0,
            decision="NO HIRE",
            verdict_text="No solution code or viva explanation was submitted. Write your implementation, run tests cleanly, and explain its time and space complexity.",
            code_feedback=code_reason,
            viva_feedback=viva_reason or "No viva explanation provided.",
            matched_keywords=[],
            missing_keywords=list(request_body.expected_keywords or []),
            evaluation_source="Honest Sandbox Gate",
        )

    sys_instruction = (
        "You are a ruthless, strictly honest Staff Engineer evaluating a live coding + complexity viva submission. "
        "NEVER fabricate praise or award passing points for missing code, compile errors, wrong output, or hardcoded print cheats. "
        "Inspect the candidate's actual code logic against optimal complexity requirements, compiler output vs expected output, "
        "and whether their viva accurately explains time and space complexity."
    )
    prompt = (
        f"Company: {request_body.company} | Role: {request_body.role} | Language: {request_body.language}\n"
        f"Problem: {request_body.question}\n"
        f"Expected Sample Output: {request_body.expected_output or 'N/A'}\n"
        f"Expected Viva Concepts: {', '.join(request_body.expected_keywords or [])}\n\n"
        f"Compile Success: {request_body.compile_success} | Output Matched Expected: {request_body.output_matched}\n"
        f"Actual Terminal Output:\n\"\"\"\n{(request_body.compiler_output or 'none')[:2000]}\n\"\"\"\n\n"
        f"Candidate Code Blank/Unchanged: {blank_code} ({code_reason or 'implemented'})\n"
        f"Candidate Code:\n\"\"\"\n{(request_body.candidate_code or '')[:6000]}\n\"\"\"\n\n"
        f"Viva Explanation Non-Answer: {non_viva} ({viva_reason or 'provided'})\n"
        f"Candidate Viva Explanation:\n\"\"\"\n{clean_viva or '(empty)'}\n\"\"\"\n\n"
        "Return strict JSON matching CodingArenaEvaluationResult:\n"
        "- code_score (0..100): MUST be 0 if blank/unchanged, <=25 if compile/runtime failed, <=40 if output did not match or hardcoded print cheat.\n"
        "- viva_score (0..100): MUST be 0 if non-answer/empty; otherwise grade complexity accuracy cleanly.\n"
        "- overall_score (0..100), decision ('STRONG HIRE' | 'HIRE' | 'LEANING NO HIRE' | 'NO HIRE'), "
        "verdict_text (1-2 direct honest sentences), code_feedback (specific observation on candidate code/output), "
        "viva_feedback (specific observation on explanation/complexity), matched_keywords, missing_keywords."
    )

    ai_budget_manager.consume(session_key)
    ai_res, _model_used, err_reason = await asyncio.to_thread(
        generate_strict_json_evaluation,
        prompt=prompt,
        schema=CodingArenaEvaluationResult,
        system_instruction=sys_instruction,
    )
    if ai_res is not None:
        raw_code_score = _clamp_score(ai_res.code_score)
        raw_viva_score = _clamp_score(ai_res.viva_score)

        # Enforce hard unbreakable server guardrails regardless of AI leniency
        if blank_code:
            code_score = 0
        elif not request_body.compile_success:
            code_score = min(raw_code_score, 25)
        elif not request_body.output_matched:
            code_score = min(raw_code_score, 40)
        else:
            code_score = raw_code_score

        viva_score = 0 if non_viva else raw_viva_score
        overall = _clamp_score(code_score * 0.55 + viva_score * 0.45)

        if overall >= 82 and code_score >= 75 and request_body.compile_success and request_body.output_matched and not blank_code and not non_viva:
            decision = "STRONG HIRE"
        elif overall >= 65 and code_score >= 60 and request_body.compile_success and request_body.output_matched and not blank_code:
            decision = "HIRE"
        elif overall >= 40:
            decision = "LEANING NO HIRE"
        else:
            decision = "NO HIRE"

        return CodingArenaEvaluationResult(
            overall_score=overall,
            code_score=code_score,
            viva_score=viva_score,
            decision=decision,
            verdict_text=(ai_res.verdict_text or "").strip() or "Evaluated against live execution and complexity rubric.",
            code_feedback=(code_reason if blank_code else (ai_res.code_feedback or "").strip()) or "Checked code execution output.",
            viva_feedback=(viva_reason if non_viva else (ai_res.viva_feedback or "").strip()) or "Checked complexity explanation.",
            matched_keywords=[] if non_viva else [m.strip() for m in (ai_res.matched_keywords or []) if m and m.strip()],
            missing_keywords=list(request_body.expected_keywords or []) if non_viva else [m.strip() for m in (ai_res.missing_keywords or []) if m and m.strip()],
            evaluation_source="DAS AI + Live Sandbox Verification",
        )

    logger.warning(f"[Coding Arena Eval] Gemini unavailable ({err_reason}); using strict sandbox rubric.")
    return _score_coding_arena_offline(request_body, blank_code, code_reason, non_viva, viva_reason or "")


_CURATED_DYNAMIC_BACKUP_POOL = [
    {
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": "Medium",
        "question": "Write a function length_of_longest_substring(s) returning the length of the longest substring without duplicate characters in O(n) time, test on 'abcabcbb', and explain your sliding window invariant.",
        "spoken_prompt": "Solve longest substring without repeating characters in Big O of n time using a sliding window and explain its invariant.",
        "sample_input": "s = 'abcabcbb'",
        "expected_output": "3",
        "expected_output_tokens": ["3"],
        "starter_python": "def length_of_longest_substring(s):\n    # TODO: write your sliding window solution here\n    pass\n\nprint(length_of_longest_substring('abcabcbb'))",
        "solution_python": "def length_of_longest_substring(s):\n    last_seen = {}\n    left = 0\n    best = 0\n    for right, ch in enumerate(s):\n        if ch in last_seen and last_seen[ch] >= left:\n            left = last_seen[ch] + 1\n        last_seen[ch] = right\n        best = max(best, right - left + 1)\n    return best\n\nprint(length_of_longest_substring('abcabcbb'))",
        "complexity_explanation": "Time: O(n) because left and right pointers each advance at most n steps. Space: O(min(n, alphabet)) for the index map.",
        "expected_keywords": ["sliding window", "O(n)", "hash map", "left pointer", "O(1)"],
    },
    {
        "title": "Subarray Sum Equals K Prefix Hash",
        "difficulty": "Medium",
        "question": "Write subarray_sum(nums, k) returning the count of contiguous subarrays summing to k in O(n) time, run on nums=[1, 1, 1] and k=2, and explain why prefix sum hashing avoids O(n^2) loops.",
        "spoken_prompt": "Count contiguous subarrays summing to k in Big O of n time using prefix sums and explain the space trade-off.",
        "sample_input": "nums = [1, 1, 1], k = 2",
        "expected_output": "2",
        "expected_output_tokens": ["2"],
        "starter_python": "def subarray_sum(nums, k):\n    # TODO: implement prefix sum hashmap solution\n    pass\n\nprint(subarray_sum([1, 1, 1], 2))",
        "solution_python": "def subarray_sum(nums, k):\n    counts = {0: 1}\n    prefix = 0\n    ans = 0\n    for x in nums:\n        prefix += x\n        ans += counts.get(prefix - k, 0)\n        counts[prefix] = counts.get(prefix, 0) + 1\n    return ans\n\nprint(subarray_sum([1, 1, 1], 2))",
        "complexity_explanation": "Time: O(n) single pass with O(1) dictionary lookups. Space: O(n) to store prefix sum frequencies.",
        "expected_keywords": ["prefix sum", "hash map", "O(n)", "complement"],
    },
    {
        "title": "Top-K Frequent Elements Bucket Sort",
        "difficulty": "Medium",
        "question": "Return the k=2 most frequent integers from [1, 1, 1, 2, 2, 3] in linear or O(n log k) time and explain bucket vs heap complexity trade-offs.",
        "spoken_prompt": "Find the top k frequent elements in linear time and compare bucket sort versus min-heap complexity.",
        "sample_input": "nums = [1, 1, 1, 2, 2, 3], k = 2",
        "expected_output": "[1, 2]",
        "expected_output_tokens": ["1", "2"],
        "starter_python": "def top_k_frequent(nums, k):\n    # TODO: compute frequencies and return top k elements\n    pass\n\nprint(top_k_frequent([1, 1, 1, 2, 2, 3], 2))",
        "solution_python": "def top_k_frequent(nums, k):\n    freq = {}\n    for x in nums:\n        freq[x] = freq.get(x, 0) + 1\n    buckets = [[] for _ in range(len(nums) + 1)]\n    for val, c in freq.items():\n        buckets[c].append(val)\n    res = []\n    for c in range(len(buckets) - 1, 0, -1):\n        for val in buckets[c]:\n            res.append(val)\n            if len(res) == k:\n                return res\n    return res\n\nprint(top_k_frequent([1, 1, 1, 2, 2, 3], 2))",
        "complexity_explanation": "Time: O(n) via frequency bucket sort instead of O(n log n) sorting. Space: O(n) for frequency table and buckets.",
        "expected_keywords": ["bucket sort", "hash map", "O(n)", "heap"],
    },
]


@ai_router.post("/api/ai/generate-coding-problem", response_model=GeneratedCodingProblem)
async def generate_coding_problem_endpoint(request_body: GenerateCodingProblemRequest, request: Request):
    """Generates a fresh unseen Python coding + complexity viva problem tailored to company and role."""
    client_ip = get_client_ip(request)
    session_key = get_session_or_client_key(request)
    allowed, _ = rate_limiter.check(f"gen_problem:{session_key}", max_requests=25, window_seconds=60)
    ip_burst_ok, _ = rate_limiter.check(f"gen_problem_burst:{client_ip}", max_requests=250, window_seconds=60)
    if not allowed or not ip_burst_ok:
        raise HTTPException(status_code=429, detail="Problem generator rate limit reached. Please wait 60 seconds.")

    company = sanitize_user_input(request_body.company or "Amazon", max_length=80) or "Amazon"
    role = sanitize_user_input(request_body.role or "SDE-1", max_length=80) or "SDE-1"
    difficulty = sanitize_user_input(request_body.difficulty or "Medium", max_length=40) or "Medium"
    avoid_list = [t.strip() for t in (request_body.existing_titles or []) if t and t.strip()][:25]

    sys_instruction = (
        "You design self-contained, deterministic Python coding interview challenges with complexity viva follow-ups. "
        "The starter_python MUST leave `# TODO:` inside the function body (never pre-solved!) plus a concrete `print(...)` test call. "
        "The solution_python MUST be 100% valid standalone Python 3.11 with standard library imports only, executing deterministically to print expected_output. "
        "spoken_prompt MUST write complexity in plain spoken English like 'Big O of n' (NEVER raw brackets or O(n) symbols)."
    )
    prompt = (
        f"Company: {company} | Role: {role} | Difficulty: {difficulty}\n"
        f"Avoid repeating these existing titles: {', '.join(avoid_list) or 'None'}\n\n"
        "Create ONE fresh algorithmic or systems/data coding problem returning strict JSON matching GeneratedCodingProblem:\n"
        "- id: short unique slug like 'ai-gen-...'\n"
        "- company, role, title, difficulty, question (2 concise sentences)\n"
        "- spoken_prompt: clean 1-2 spoken sentences with no parentheses or square brackets\n"
        "- sample_input: readable single-line sample input\n"
        "- expected_output: exact stdout line(s) printed by solution_python\n"
        "- expected_output_tokens: 1-3 exact substrings that must appear in stdout to pass\n"
        "- starter_python: function signature with `# TODO: write your solution here` and `pass`, plus the exact `print(...)` test call\n"
        "- solution_python: complete working optimal Python 3.11 solution printing expected_output\n"
        "- complexity_explanation: concise optimal Time & Space complexity breakdown\n"
        "- expected_keywords: 4-6 key algorithm/complexity terms expected in candidate viva."
    )

    ai_budget_manager.consume(session_key)
    ai_prob, _, _ = await asyncio.to_thread(
        generate_strict_json_evaluation,
        prompt=prompt,
        schema=GeneratedCodingProblem,
        system_instruction=sys_instruction,
    )
    if (
        ai_prob is not None
        and ai_prob.question.strip()
        and ai_prob.starter_python.strip()
        and ai_prob.solution_python.strip()
        and ai_prob.expected_output.strip()
        and ai_prob.solution_python.strip() != ai_prob.starter_python.strip()
    ):
        tokens = [t.strip() for t in (ai_prob.expected_output_tokens or []) if t and t.strip()]
        if not tokens:
            tokens = [ai_prob.expected_output.strip().splitlines()[0].strip()]
        return GeneratedCodingProblem(
            id=ai_prob.id.strip() or f"ai-gen-{abs(hash(ai_prob.title)) % 100000}",
            company=company,
            role=role,
            title=ai_prob.title.strip(),
            difficulty=ai_prob.difficulty.strip() or difficulty,
            question=ai_prob.question.strip(),
            spoken_prompt=(ai_prob.spoken_prompt or ai_prob.question).strip(),
            sample_input=ai_prob.sample_input.strip(),
            expected_output=ai_prob.expected_output.strip(),
            expected_output_tokens=tokens,
            starter_python=ai_prob.starter_python.strip(),
            solution_python=ai_prob.solution_python.strip(),
            complexity_explanation=ai_prob.complexity_explanation.strip(),
            expected_keywords=[k.strip() for k in (ai_prob.expected_keywords or []) if k and k.strip()] or ["O(n)", "O(1)"],
        )

    avoid_lower = {t.lower() for t in avoid_list}
    pick = next(
        (b for b in _CURATED_DYNAMIC_BACKUP_POOL if b["title"].lower() not in avoid_lower),
        _CURATED_DYNAMIC_BACKUP_POOL[len(avoid_list) % len(_CURATED_DYNAMIC_BACKUP_POOL)],
    )
    return GeneratedCodingProblem(
        id=f"gen-{len(avoid_list) + 1}",
        company=company,
        role=role,
        title=pick["title"],
        difficulty=pick["difficulty"],
        question=pick["question"],
        spoken_prompt=pick["spoken_prompt"],
        sample_input=pick["sample_input"],
        expected_output=pick["expected_output"],
        expected_output_tokens=pick["expected_output_tokens"],
        starter_python=pick["starter_python"],
        solution_python=pick["solution_python"],
        complexity_explanation=pick["complexity_explanation"],
        expected_keywords=pick["expected_keywords"],
    )
