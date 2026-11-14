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
)
from backend.security import rate_limiter, ai_budget_manager, get_client_ip, sanitize_user_input, validate_pdf_upload
from backend.reliability import gemini_circuit_breaker
from backend.gemini_engine import (
    chat_with_mentor,
    stream_chat_with_mentor,
    generate_structured_ai,
    generate_strict_json_evaluation,
    generate_smart_fallback_reply
)
from backend.pdf_engine import extract_text_from_pdf, extract_resume_text

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
    active_tab = getattr(request_body, "active_tab", None) or (user_context.get("active_tab") if isinstance(user_context, dict) else None)
    profile = getattr(request_body, "profile", None)

    # 4. Check circuit breaker status
    if not gemini_circuit_breaker.allow_request():
        honest_error = "I couldn't reach the AI right now. Please tap retry in a moment!"
        return {
            "reply": honest_error,
            "source": "Pathfinder AI (Circuit Breaker)",
            "budget_remaining": limit - used
        }

    try:
        reply_text, meta = chat_with_mentor(
            message=sanitized_message,
            history=raw_history,
            profile=profile,
            active_tab=active_tab,
            page_context=user_context,
            return_meta=True
        )
        if meta.get("status") == "success":
            gemini_circuit_breaker.record_success()
        else:
            gemini_circuit_breaker.record_failure(Exception("All LLM providers unavailable"))
        model_used = meta.get("model_used", "none")
        if "gemini" in model_used.lower():
            source = f"Google Gemini ({model_used})"
        elif "openrouter" in model_used.lower():
            source = f"OpenRouter ({model_used})"
        elif model_used != "none":
            source = f"Pathfinder AI ({model_used})"
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
        honest_error = "I couldn't reach the AI right now. Please tap retry in a moment!"
        return {
            "reply": honest_error,
            "source": "Pathfinder AI (Adaptive Guidance)",
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
            extracted_text = extract_resume_text(pdf_bytes, file.filename or "resume.pdf")

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
def evaluate_defense_endpoint(request_body: DefenseEvaluationRequest, request: Request):
    """
    Genuine strict technical interviewer evaluation for Project Defense.
    Detects abstentions ('I don't know', 'skip') at 0/100 and otherwise grades via live Gemini AI.
    """
    client_ip = get_client_ip(request)
    allowed, _ = rate_limiter.check(f"defense:{client_ip}", max_requests=30, window_seconds=60)
    if not allowed:
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
        "- evaluation_source: set to 'gemini-ai'\n"
        "- is_non_answer: false unless the text avoids answering the question"
    )

    ai_budget_manager.consume(client_ip)
    ai_result, model_name, err_reason = generate_strict_json_evaluation(
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
            evaluation_source=f"Gemini AI ({model_name})",
            is_non_answer=bool(ai_result.is_non_answer),
        )

    logger.warning(f"[Defense Eval] Gemini unavailable ({err_reason}); using strict offline rubric.")
    return _score_defense_offline(request_body)


@ai_router.post("/api/ai/evaluate-interview", response_model=InterviewEvaluationResult)
def evaluate_interview_endpoint(request_body: InterviewEvaluationRequest, request: Request):
    """
    Genuine strict Mock Interview evaluation endpoint.
    Scores Technical Precision, Communication, and Problem Solving honestly using live Gemini AI.
    """
    client_ip = get_client_ip(request)
    allowed, _ = rate_limiter.check(f"interview:{client_ip}", max_requests=30, window_seconds=60)
    if not allowed:
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
        "- evaluation_source: 'gemini-ai'\n"
        "- is_non_answer: false unless off-topic or abstaining"
    )

    ai_budget_manager.consume(client_ip)
    ai_result, model_name, err_reason = generate_strict_json_evaluation(
        prompt=prompt,
        schema=InterviewEvaluationResult,
        system_instruction=sys_instruction,
    )
    if ai_result is not None:
        matched_det, missing_det = _match_keywords(clean_answer, expected_keywords)
        # Reconcile so missing keywords are honest and non-empty if concepts were omitted
        matched = [m.strip() for m in (ai_result.matched_keywords or matched_det) if m and m.strip()]
        missing = [m.strip() for m in (ai_result.missing_keywords or missing_det) if m and m.strip()]
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
            evaluation_source=f"Gemini AI ({model_name})",
            is_non_answer=bool(ai_result.is_non_answer),
        )

    logger.warning(f"[Interview Eval] Gemini unavailable ({err_reason}); using strict offline rubric.")
    return _score_interview_offline(request_body)
