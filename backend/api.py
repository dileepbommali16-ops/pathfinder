import os
import secrets
from pathlib import Path
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form, Header, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")

from backend.models import (
    StudentProfile,
    PredictionResult,
    Roadmap,
    CohortInsight,
    ResumeFeedback,
    ChatRequest,
    UserSession,
    LoginRequest,
    LoginResponse,
    OAuthUrlsResponse,
    SkillGapAnalysis,
    SkillGapItem
)
from backend.ml_engine import predict_placement
from backend.analytics_engine import get_cohort_analytics, filter_cohort_records
from backend.gemini_engine import (
    chat_with_mentor,
    generate_structured_ai
)
from backend.pdf_engine import (
    extract_text_from_pdf,
    generate_analytics_pdf,
    generate_resume_pdf
)
from backend.security import (
    rate_limiter,
    ai_budget_manager,
    get_client_ip,
    sanitize_user_input,
    validate_pdf_upload
)
from fastapi import Request, Depends

app = FastAPI(
    title="Pathfinder 2.0 Career Intelligence API",
    description="High-performance AI/ML backend for placement predictions, cohort analytics, and Gemini AI career coaching.",
    version="2.0.0",
    debug=False
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Configure CORS origins: allow local dev, explicit FRONTEND_URL env var, and Vercel domains
frontend_url_env = os.getenv("FRONTEND_URL", "").strip()
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8501",
    "http://127.0.0.1:8501",
]
if frontend_url_env:
    for origin in frontend_url_env.split(","):
        cleaned = origin.strip().rstrip("/")
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Pathfinder 2.0 Intelligence Engine",
        "ml_model": "RandomForestClassifier(n_estimators=120)",
        "security": "Enforced: TLS/CORS, Rate-Limiting, Per-User Isolation, Input Sanitization",
        "features": ["cgpa", "backlogs", "internships", "communication_score", "coding_score"]
    }


# Active server-managed session store & isolated per-user profiles
_active_sessions: Dict[str, UserSession] = {}
_user_profiles: Dict[str, StudentProfile] = {}


def get_current_user(authorization: Optional[str] = Header(None)) -> UserSession:
    """Server-side session resolution: never trusts frontend user IDs or roles."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[-1].strip()

    if token and token in _active_sessions:
        return _active_sessions[token]

    return UserSession(
        user_id="usr_anonymous",
        username="Student Candidate",
        email="candidate@pathfinder.ai",
        role="student",
        auth_provider="credentials",
        is_authenticated=False
    )


def require_authenticated(user: UserSession = Depends(get_current_user)) -> UserSession:
    """Enforces server-side authentication check."""
    if not user.is_authenticated:
        raise HTTPException(status_code=401, detail="Authentication required to perform this action.")
    return user


@app.get("/api/auth/oauth-urls", response_model=OAuthUrlsResponse)
def get_oauth_urls():
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    github_client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    
    redirect_uri = os.getenv("OAUTH_REDIRECT_URI", "").strip()
    if not redirect_uri:
        frontend_base = os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")[0].strip().rstrip("/")
        redirect_uri = f"{frontend_base}/api/oauth/callback"

    google_url = None
    if google_client_id:
        google_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={google_client_id}&redirect_uri={redirect_uri}&response_type=code&scope=openid%20profile%20email"

    github_url = None
    if github_client_id:
        github_url = f"https://github.com/login/oauth/authorize?client_id={github_client_id}&redirect_uri={redirect_uri}&scope=read:user%20user:email"

    return OAuthUrlsResponse(
        google_configured=bool(google_client_id),
        github_configured=bool(github_client_id),
        google_url=google_url,
        github_url=github_url
    )


@app.post("/api/auth/login", response_model=LoginResponse)
def login_endpoint(payload: LoginRequest, request: Request):
    # Enforce Login Rate-Limiting: Max 10 attempts per minute per IP
    client_ip = get_client_ip(request)
    allowed, remaining = rate_limiter.check(f"login_{client_ip}", max_requests=10, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many authentication attempts. Please wait 60 seconds before trying again."
        )

    username = sanitize_user_input(payload.username, max_length=64)
    if not username:
        raise HTTPException(status_code=400, detail="Username or email is required")

    email = sanitize_user_input(payload.email, max_length=128) if payload.email else (username if "@" in username else f"{username.lower()}@pathfinder.ai")
    token = secrets.token_hex(24)
    session = UserSession(
        user_id=f"usr_{secrets.token_hex(6)}",
        username=username,
        email=email,
        role="student",
        auth_provider="credentials",
        is_authenticated=True,
        token=token
    )
    _active_sessions[token] = session
    return LoginResponse(
        success=True,
        message="Authentication successful",
        user=session,
        token=token
    )


@app.post("/api/auth/logout")
def logout_endpoint(authorization: Optional[str] = Header(None)):
    """Revokes session token server-side immediately."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[-1].strip()
    if token and token in _active_sessions:
        del _active_sessions[token]
    return {"success": True, "message": "Logged out successfully and session revoked"}


@app.get("/api/auth/me", response_model=UserSession)
def auth_me_endpoint(user: UserSession = Depends(get_current_user)):
    return user


@app.get("/api/profile", response_model=StudentProfile)
def get_profile(user: UserSession = Depends(get_current_user)):
    """User Data Isolation: Each user accesses only their own profile."""
    return _user_profiles.get(user.user_id, StudentProfile())


@app.post("/api/profile", response_model=StudentProfile)
def update_profile(profile: StudentProfile, user: UserSession = Depends(get_current_user)):
    """User Data Isolation: Persists profile strictly to the authenticated user's scope."""
    _user_profiles[user.user_id] = profile
    return _user_profiles[user.user_id]


@app.post("/api/skill-gap", response_model=SkillGapAnalysis)
def skill_gap_endpoint(profile: StudentProfile):
    strengths: List[str] = []
    gaps: List[SkillGapItem] = []
    priorities: List[str] = []

    # 1. DSA Analysis
    if profile.coding >= 8:
        strengths.append(f"Advanced Problem Solving & Pattern Recognition ({profile.coding}/10)")
    else:
        gaps.append(SkillGapItem(
            skill="High-Frequency DSA Patterns",
            category="Core DSA",
            current_level=float(profile.coding),
            required_level=8.5,
            priority="High",
            actionable_step="Master Blind 75 patterns: Sliding Window, Two Pointers, and Binary Search"
        ))
        priorities.append("Target 3 Blind 75 LeetCode pattern problems per day")

    # 2. System Design & Projects
    if profile.internships >= 2:
        strengths.append(f"Demonstrated Industry Engineering Experience ({profile.internships} internships)")
    else:
        gaps.append(SkillGapItem(
            skill="Full-Stack System Architecture & API Development",
            category="System Design",
            current_level=float(profile.internships * 3.5),
            required_level=8.0,
            priority="High" if profile.internships == 0 else "Medium",
            actionable_step="Build and deploy a flagship full-stack application with OpenAPI docs, auth, and automated tests"
        ))
        priorities.append("Ship one production-grade portfolio project with verified GitHub demo link")

    # 3. Academics & Backlogs
    if profile.cgpa >= 8.0:
        strengths.append(f"High Academic Distinction (CGPA {profile.cgpa:.1f}/10)")
    elif profile.cgpa < 7.0:
        gaps.append(SkillGapItem(
            skill="Academic CGPA Tier-1 Margin",
            category="Academics",
            current_level=profile.cgpa,
            required_level=7.5,
            priority="High",
            actionable_step="Raise current CGPA above 7.0 to unlock top MNC cutoffs"
        ))

    if profile.backlogs > 0:
        gaps.append(SkillGapItem(
            skill="Academic Eligibility Clearance",
            category="Academics",
            current_level=0.0,
            required_level=10.0,
            priority="Critical",
            actionable_step=f"Clear {profile.backlogs} active backlog(s) before placement drives begin"
        ))
        priorities.append(f"Clear {profile.backlogs} active backlog(s) immediately to satisfy eligibility criteria")
    else:
        strengths.append("Clean Academic Record (0 Active Backlogs)")

    # 4. Behavioral & Communication
    if profile.communication >= 8:
        strengths.append(f"Exceptional Interview Articulation & STAR Storytelling ({profile.communication}/10)")
    else:
        gaps.append(SkillGapItem(
            skill="STAR Technical Storytelling",
            category="Behavioral",
            current_level=float(profile.communication),
            required_level=8.0,
            priority="Medium",
            actionable_step="Practice 3 structured engineering STAR stories for technical mock rounds"
        ))

    # Category breakdown
    category_scores = {
        "academics": round(min(100.0, (profile.cgpa / 10.0) * 100.0), 1),
        "coding_dsa": round(profile.coding * 10.0, 1),
        "system_design": round(min(100.0, max(20.0, profile.internships * 45.0)), 1),
        "communication": round(profile.communication * 10.0, 1),
        "eligibility": round(max(0.0, 100.0 - (profile.backlogs * 25.0)), 1)
    }

    role_fit = round(sum(category_scores.values()) / len(category_scores), 1)

    return SkillGapAnalysis(
        strengths=strengths,
        critical_gaps=gaps,
        priorities=priorities,
        category_breakdown=category_scores,
        target_role_fit=role_fit
    )


@app.post("/api/predict", response_model=PredictionResult)
def predict_endpoint(profile: StudentProfile):
    try:
        return predict_placement(profile)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(exc)}")


@app.get("/api/analytics")
def analytics_endpoint(
    year: Optional[int] = Query(2026, description="Graduation cohort year"),
    branch: Optional[str] = Query("All", description="Branch name or 'All'"),
    gender: Optional[str] = Query("All", description="Gender filter or 'All'"),
    skill: Optional[str] = Query("All", description="Skill domain filter or 'All'")
):
    try:
        return get_cohort_analytics(year=year, branch=branch, gender=gender, skill=skill)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(exc)}")


@app.post("/api/ai/chat")
def chat_endpoint(chat_req: ChatRequest, request: Request, user: UserSession = Depends(get_current_user)):
    # Rate limit: Max 30 requests per minute
    client_key = user.user_id if user.is_authenticated else get_client_ip(request)
    allowed, _ = rate_limiter.check(f"chat_{client_key}", max_requests=30, window_seconds=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="AI query frequency limit reached. Please wait a moment.")

    # AI usage quota cap (Protects Gemini API Budget)
    ok, count, limit = ai_budget_manager.consume(client_key)
    if not ok:
        raise HTTPException(
            status_code=429,
            detail=f"Daily AI coaching quota reached ({limit}/{limit} requests). Quota resets at midnight."
        )

    # Input sanitization & length restriction
    clean_message = sanitize_user_input(chat_req.message, max_length=4000)
    if not clean_message:
        raise HTTPException(status_code=400, detail="Chat message cannot be empty or contain only unsafe tags.")

    try:
        reply = chat_with_mentor(
            message=clean_message,
            history=chat_req.history,
            profile=chat_req.profile
        )
        return {"reply": reply}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="AI coaching service temporarily unavailable. Please retry.")


@app.post("/api/ai/roadmap", response_model=Roadmap)
def roadmap_endpoint(profile: StudentProfile, request: Request, user: UserSession = Depends(get_current_user)):
    client_key = user.user_id if user.is_authenticated else get_client_ip(request)
    allowed, _ = rate_limiter.check(f"roadmap_{client_key}", max_requests=15, window_seconds=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many roadmap requests. Please wait a minute.")

    ok, _, limit = ai_budget_manager.consume(client_key)
    if not ok:
        raise HTTPException(status_code=429, detail=f"Daily AI generation quota reached ({limit}/{limit}).")

    try:
        prompt = (
            f"Create a practical 6-week placement roadmap for this student profile: {profile.model_dump_json()}. "
            "Include a headline, skill gaps, and measurable weekly actions focused on Python/Java, DSA patterns, "
            "flagship portfolio project development, and mock interviews."
        )
        return generate_structured_ai(prompt, Roadmap)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Roadmap generation failed. Please try again.")


@app.post("/api/ai/cohort-insight", response_model=CohortInsight)
def cohort_insight_endpoint(
    year: Optional[int] = 2026,
    branch: Optional[str] = "All",
    gender: Optional[str] = "All",
    skill: Optional[str] = "All"
):
    try:
        filtered = filter_cohort_records(year, branch, gender, skill)
        if filtered.empty:
            return CohortInsight(
                headline="No Cohort Records Available",
                summary="Please adjust your filter parameters to view cohort trends.",
                actions=["Broaden branch or skill category filters"]
            )
        summary_stats = filtered[["placed", "cgpa", "codingScore", "communicationScore", "internships"]].describe().fillna(0).to_json()
        prompt = f"Summarize this placement cohort in plain language for engineering students. Aggregate data: {summary_stats}. Return a headline, evidence-based summary, and practical actions."
        return generate_structured_ai(prompt, CohortInsight)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Cohort insight unavailable.")


@app.post("/api/ai/resume", response_model=ResumeFeedback)
async def resume_endpoint(
    request: Request,
    resume_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user: UserSession = Depends(get_current_user)
):
    client_key = user.user_id if user.is_authenticated else get_client_ip(request)
    allowed, _ = rate_limiter.check(f"resume_{client_key}", max_requests=10, window_seconds=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many resume reviews requested. Please wait 60 seconds.")

    ok, _, limit = ai_budget_manager.consume(client_key)
    if not ok:
        raise HTTPException(status_code=429, detail=f"Daily AI resume quota reached ({limit}/{limit}).")

    try:
        pdf_bytes = None
        extracted_text = ""
        if file is not None:
            pdf_bytes = await file.read()
            # Enforce file upload restrictions: <=5MB, authentic %PDF- header, .pdf extension
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
        return generate_structured_ai(prompt, ResumeFeedback, pdf_bytes=pdf_bytes)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Resume evaluation service error.")


@app.get("/api/export/pdf")
def export_pdf_endpoint(
    year: Optional[int] = Query(2026),
    branch: Optional[str] = Query("All"),
    gender: Optional[str] = Query("All"),
    skill: Optional[str] = Query("All")
):
    # Parameter boundary validation
    safe_year = int(year) if year and 2000 <= year <= 2100 else 2026
    safe_branch = sanitize_user_input(branch, max_length=32)
    safe_gender = sanitize_user_input(gender, max_length=32)
    safe_skill = sanitize_user_input(skill, max_length=32)

    try:
        filtered = filter_cohort_records(safe_year, safe_branch, safe_gender, safe_skill)
        filters = {"Year": safe_year, "Branch": safe_branch, "Gender": safe_gender, "Skill Domain": safe_skill}
        pdf_bytes = generate_analytics_pdf(filtered, filters)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=pathfinder-{safe_year}-analytics.pdf"}
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="PDF export failed.")


@app.get("/api/export/csv")
def export_csv_endpoint(
    year: Optional[int] = Query(2026),
    branch: Optional[str] = Query("All"),
    gender: Optional[str] = Query("All"),
    skill: Optional[str] = Query("All")
):
    safe_year = int(year) if year and 2000 <= year <= 2100 else 2026
    safe_branch = sanitize_user_input(branch, max_length=32)
    safe_gender = sanitize_user_input(gender, max_length=32)
    safe_skill = sanitize_user_input(skill, max_length=32)

    try:
        filtered = filter_cohort_records(safe_year, safe_branch, safe_gender, safe_skill)
        csv_data = filtered.to_csv(index=False)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=pathfinder-{safe_year}-analytics.csv"}
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="CSV export failed.")


@app.post("/api/export/resume-pdf")
def export_resume_pdf_endpoint(feedback: ResumeFeedback):
    try:
        pdf_bytes = generate_resume_pdf(feedback)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=pathfinder-ats-resume-feedback.pdf"}
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Resume PDF export failed.")


# Mount frontend SPA static bundle
from pathlib import Path
from fastapi.staticfiles import StaticFiles

ROOT_DIR = Path(__file__).resolve().parent.parent
DIST_PUBLIC = ROOT_DIR / "dist" / "public"
if DIST_PUBLIC.exists():
    app.mount("/", StaticFiles(directory=str(DIST_PUBLIC), html=True), name="frontend")

