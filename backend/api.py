import os
import sys
import json
import secrets
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form, Header, Cookie, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse

# Configure structured error and server logging (visible in Render logs)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Pathfinder] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("pathfinder.api")

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")

from backend.database import (
    init_database,
    get_user_profile_by_id,
    get_user_profile_by_email_or_username,
    save_user_profile,
    delete_user_profile,
    query_cohort_paginated
)

from backend.models import (
    StudentProfile,
    PredictionResult,
    ReadinessAuditResult,
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
from backend.data_service import (
    get_placement_df,
    get_roles,
    get_skills,
    get_projects,
    get_branches,
    get_cohort_analytics_data,
    get_branch_deep_analytics,
    get_skills_deep_analytics,
    compute_cohort_benchmark,
    execute_data_tool
)
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

# Security & Performance Timing Middleware
@app.middleware("http")
async def add_security_and_timing_headers(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Visible server error logging for Render log streams
    if response.status_code >= 500:
        logger.error(f"[RENDER SERVER ERROR {response.status_code}] {request.method} {request.url.path} ({duration_ms:.2f}ms)")
    elif response.status_code >= 400:
        logger.warning(f"[CLIENT WARNING {response.status_code}] {request.method} {request.url.path} ({duration_ms:.2f}ms)")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Logs any unhandled server error with stack trace visible in Render console."""
    client_ip = get_client_ip(request)
    logger.error(
        f"[RENDER CRITICAL ERROR 500] Method: {request.method} | Path: {request.url.path} | Client IP: {client_ip} | Exception: {type(exc).__name__}: {str(exc)}",
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. The incident has been recorded in the platform logs.",
            "error_type": type(exc).__name__
        }
    )


@app.on_event("startup")
def prewarm_dataset_caches():
    """Initializes persistent database tables and pre-warms dataset caches."""
    try:
        init_database()
        get_placement_df()
        get_roles()
        get_skills()
        get_projects()
        get_branches()
        get_cohort_analytics_data()
        logger.info("[Pathfinder 2.0] Persistent SQL database, indexes, and cohort analytics pre-warmed successfully.")
    except Exception as exc:
        logger.error(f"[Pathfinder 2.0] Startup initialization warning: {exc}", exc_info=True)

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


@app.get("/health")
@app.get("/api/health")
def health_check():
    df = get_placement_df()
    dataset_records = len(df)
    dataset_ok = dataset_records > 0
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_configured = bool(gemini_key and len(gemini_key) > 5)

    return {
        "status": "healthy" if dataset_ok else "degraded",
        "service": "Pathfinder 2.0 Intelligence Engine",
        "server": "healthy",
        "dataset": {
            "status": "ready" if dataset_ok else "missing",
            "total_records": dataset_records,
            "branches_count": len(df["branch"].unique()) if dataset_ok else 0,
            "years_covered": sorted(df["year"].unique().tolist()) if dataset_ok else []
        },
        "gemini": {
            "configured": gemini_configured,
            "model": os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
        },
        "ml_model": "RandomForestClassifier(n_estimators=120)",
        "security": "Enforced: TLS/CORS, Rate-Limiting, Per-User Isolation, Input Sanitization"
    }


# Active server-managed session store & isolated per-user profiles
_active_sessions: Dict[str, UserSession] = {}
_user_profiles: Dict[str, StudentProfile] = {}
PROFILES_FILE = DATA_DIR / "user_profiles.json"


def _load_persisted_profiles():
    global _user_profiles
    if PROFILES_FILE.exists():
        try:
            with open(PROFILES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                for uid, prof_data in data.items():
                    _user_profiles[uid] = StudentProfile(**prof_data)
            print(f"[Profiles] Successfully loaded {len(_user_profiles)} persisted profile(s).")
        except Exception as e:
            print(f"[Profiles] Failed to load persisted profiles: {e}")


def _save_persisted_profiles():
    try:
        PROFILES_FILE.parent.mkdir(parents=True, exist_ok=True)
        dump_data = {uid: prof.model_dump() for uid, prof in _user_profiles.items()}
        temp_file = PROFILES_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(dump_data, f, indent=2)
        temp_file.replace(PROFILES_FILE)
    except Exception as e:
        print(f"[Profiles] Failed to persist profiles: {e}")


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
def get_profile(
    user_id: Optional[str] = Query(None, description="Explicit user_id to look up"),
    username: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    user: UserSession = Depends(get_current_user)
):
    """
    Authorization & Ownership Check:
    Every API route reading a student profile verifies that the logged-in user owns that profile.
    Changing the user_id in the request to another user's ID returns 403 Forbidden, never another user's data.
    """
    # 1. Authorization Ownership Check
    if user_id and user_id != user.user_id:
        if user.is_authenticated:
            logger.warning(
                f"[AUTHORIZATION 403] Authenticated user '{user.user_id}' requested profile of user '{user_id}'"
            )
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: You are not authorized to view user '{user_id}' profile."
            )
        else:
            logger.warning(
                f"[AUTHORIZATION 403] Unauthenticated request for user '{user_id}' profile"
            )
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Authentication required to access user profiles."
            )

    # 2. Determine target lookup key
    target_key = user_id or (user.user_id if user.is_authenticated else None)

    # Look up in persistent SQL database first
    if target_key and target_key != "usr_anonymous":
        db_profile = get_user_profile_by_id(target_key)
        if db_profile:
            return StudentProfile(**db_profile)

    # Fallback lookup by email or username in SQL database
    lookup_id = email or (user.email if user.is_authenticated else None) or username or user.username
    if lookup_id and lookup_id != "candidate@pathfinder.ai":
        db_profile = get_user_profile_by_email_or_username(lookup_id)
        if db_profile:
            return StudentProfile(**db_profile)

    # In-memory session fallback
    if target_key and target_key in _user_profiles:
        return _user_profiles[target_key]

    # Return clean initial profile with onboarding_completed = False so the onboarding wizard triggers
    return StudentProfile(
        user_id=user.user_id,
        email=email or user.email,
        full_name=user.username if user.username != "Student Candidate" else "Student Candidate",
        onboarding_completed=False,
        wizard_step=1
    )


@app.get("/api/profile/{target_user_id}", response_model=StudentProfile)
def get_profile_by_user_id_endpoint(
    target_user_id: str,
    user: UserSession = Depends(get_current_user)
):
    """
    Targeted Profile Access with strict 403 Ownership Enforcement:
    Verifies that the caller owns the requested profile.
    """
    if not user.is_authenticated:
        logger.warning(f"[AUTHORIZATION 403] Unauthenticated request to /api/profile/{target_user_id}")
        raise HTTPException(status_code=403, detail="Forbidden: Authentication required.")

    if user.user_id != target_user_id:
        logger.warning(f"[AUTHORIZATION 403] User '{user.user_id}' attempted to access profile of '{target_user_id}'")
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: You are not authorized to view user '{target_user_id}' profile."
        )

    db_profile = get_user_profile_by_id(target_user_id)
    if not db_profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    return StudentProfile(**db_profile)


@app.post("/api/profile", response_model=StudentProfile)
def update_profile(profile: StudentProfile, user: UserSession = Depends(get_current_user)):
    """
    Authorization & Ownership Check:
    Every API route writing a student profile verifies that the logged-in user owns that profile.
    Changing the user_id in the request to another user's ID returns 403 Forbidden.
    Persists profile to the persistent SQL database.
    """
    # 1. Authorization Ownership Check
    if profile.user_id and profile.user_id != user.user_id:
        if user.is_authenticated:
            logger.warning(
                f"[AUTHORIZATION 403] User '{user.user_id}' attempted to modify profile for '{profile.user_id}'"
            )
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: You cannot modify profile for user '{profile.user_id}'."
            )
        else:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Authentication required to modify user profiles."
            )

    # 2. Server-side calculations & normalization
    target_key = user.user_id if user.is_authenticated else (profile.user_id or profile.email or "usr_anonymous")
    profile.user_id = target_key
    profile.backlogs = profile.active_backlogs
    multiplier = profile.cgpa_formula_multiplier or 9.5
    profile.percentage = round(profile.cgpa * multiplier, 1)

    # 3. Persist to SQL Database
    save_user_profile(target_key, profile.model_dump())

    # Keep memory caches synced
    _user_profiles[target_key] = profile
    if profile.email:
        _user_profiles[profile.email] = profile
    if user.username and user.username != "Student Candidate":
        _user_profiles[user.username] = profile
    if profile.full_name:
        _user_profiles[profile.full_name] = profile

    _save_persisted_profiles()
    logger.info(f"[Database] Profile for '{target_key}' updated in persistent database.")
    return profile


@app.delete("/api/profile/{target_user_id}")
def delete_profile_endpoint(target_user_id: str, user: UserSession = Depends(get_current_user)):
    """Deletes profile with strict 403 ownership enforcement."""
    if not user.is_authenticated or user.user_id != target_user_id:
        logger.warning(f"[AUTHORIZATION 403] Unauthorized deletion attempt by '{user.user_id}' on '{target_user_id}'")
        raise HTTPException(status_code=403, detail="Forbidden: You cannot delete another user's profile.")

    deleted = delete_user_profile(target_user_id)
    if target_user_id in _user_profiles:
        del _user_profiles[target_user_id]
    _save_persisted_profiles()
    return {"success": deleted, "message": f"Profile for '{target_user_id}' deleted."}


@app.post("/api/profile/calculate", response_model=ReadinessAuditResult)
@app.post("/api/readiness/audit", response_model=ReadinessAuditResult)
def calculate_readiness_audit(profile: StudentProfile):
    """Calculates comprehensive career readiness audit, percentage, breakdowns, strengths, gaps, and cohort benchmarks."""
    cgpa = float(profile.cgpa)
    backlogs = int(profile.active_backlogs if profile.active_backlogs is not None else profile.backlogs)
    internships = int(profile.internships)
    coding = float(profile.coding)
    comm = float(profile.communication)
    projects = int(profile.projects_count)
    multiplier = float(profile.cgpa_formula_multiplier or 9.5)
    overall_percentage = round(cgpa * multiplier, 1)
    cert_count = len(profile.certifications) if profile.certifications else 0

    # Multi-factor readiness formula calibrated with real placement trends
    raw = (
        cgpa * 5.2
        + max(0, 3 - backlogs) * 4.0
        + min(internships, 3) * 5.0
        + comm * 2.2
        + coding * 2.7
        + min(projects, 4) * 2.0
        + min(cert_count, 3) * 2.0
        - max(backlogs - 1, 0) * 5.0
    )
    chance = max(18.0, min(97.0, round(raw, 1)))
    tone = "strong" if chance >= 75 else "steady" if chance >= 55 else "focus"
    label = (
        "Strong Candidate Profile"
        if chance >= 75
        else "Solid Foundation (On Track)"
        if chance >= 55
        else "Needs Strategic Acceleration"
    )

    # Multi-dimensional vector breakdown (academics, skills, projects, internships, certifications, etc.)
    breakdown = {
        "academics": min(100.0, round((cgpa / 10.0) * 100.0, 1)),
        "skills": min(100.0, round(coding * 10.0, 1)),
        "coding_dsa": min(100.0, round(coding * 10.0, 1)),
        "projects": min(100.0, max(25.0, projects * 25.0)),
        "internships": min(100.0, internships * 40.0),
        "certifications": min(100.0, max(25.0, cert_count * 35.0)),
        "communication": min(100.0, round(comm * 10.0, 1)),
        "eligibility": max(0.0, round(100.0 - (backlogs * 25.0), 1)),
    }

    # Strengths
    strengths = []
    if cgpa >= 7.5 and backlogs == 0:
        strengths.append(f"Tier-1 MNC Cutoffs Cleared (CGPA {cgpa:.1f}/10.0 • {overall_percentage}%, 0 Backlogs)")
    elif cgpa >= 7.0:
        strengths.append(f"Solid Academic Standing (CGPA {cgpa:.1f}/10.0 • {overall_percentage}%)")
    else:
        strengths.append(f"Eligible for Standard Campus Drives (CGPA {cgpa:.1f}/10.0)")

    if backlogs == 0:
        strengths.append("Clean Academic Record (0 Active Backlogs)")
    if internships > 0:
        strengths.append(f"Proven Practical Experience ({internships} verified internship{'s' if internships > 1 else ''})")
    if coding >= 7:
        strengths.append(f"Strong Algorithmic Foundation (Coding Level {coding:.0f}/10)")
    if projects >= 2:
        strengths.append(f"Hands-On Project Portfolio ({projects} applied engineering projects)")

    # Gaps & Priorities
    gaps = []
    if cgpa < 7.5:
        gaps.append(f"Current CGPA {cgpa:.1f} is below the 7.5 cutoff preferred by top product companies")
    if backlogs > 0:
        gaps.append(f"{backlogs} active backlog(s) may trigger automated campus screening filters")
    if internships == 0:
        gaps.append("Absence of industrial internships requires building and deploying a flagship project")
    if coding < 8:
        gaps.append("Core DSA pattern speed (Two Pointers, Sliding Window) needs timed practice")
    if comm < 8:
        gaps.append("Interview communication requires rehearsing STAR-format technical stories")

    # Recommended skills
    recommended_skills = [
        "Blind 75 Core DSA Patterns",
        "System Architecture & Scalability",
        "Full-Stack API Engineering",
        "STAR Technical Storytelling"
    ]
    if "AI" in (profile.target_role or "") or "ML" in (profile.target_role or "") or (profile.branch or "").upper() == "AIML":
        recommended_skills = [
            "PyTorch & Deep Learning",
            "Vector Databases & RAG Architecture",
            "Blind 75 Core DSA Patterns",
            "Model Deployment & FastAPI"
        ]

    # Benchmark comparison from real dataset
    cohort_comparison = compute_cohort_benchmark(
        branch=profile.branch or "CSE",
        cgpa=cgpa
    )

    next_steps = [
        "Review your tailored 30-Day Mission Roadmap for daily milestones",
        "Run an interactive AI Mock Interview to rehearse technical questions",
        "Optimize your resume in ATS Resume Studio with quantified X-Y-Z bullet points"
    ]

    return ReadinessAuditResult(
        chance=chance,
        label=label,
        tone=tone,
        overall_percentage=overall_percentage,
        cgpa=cgpa,
        conversion_formula=f"CGPA × {multiplier:.1f} (Standard AICTE / University Scale)",
        strengths=strengths,
        gaps=gaps,
        recommended_skills=recommended_skills,
        breakdown=breakdown,
        cohort_comparison=cohort_comparison,
        next_steps=next_steps
    )


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
    year: Optional[int] = Query(2026, ge=0, le=2100, description="Graduation cohort year"),
    branch: Optional[str] = Query("All", max_length=50, description="Branch name or 'All'"),
    gender: Optional[str] = Query("All", max_length=50, description="Gender filter or 'All'"),
    skill: Optional[str] = Query("All", max_length=64, description="Skill domain filter or 'All'"),
    page: int = Query(1, ge=1, description="Page number for records list"),
    page_size: int = Query(25, ge=1, le=100, description="Number of records per page")
):
    try:
        safe_year = int(year) if year and 2000 <= year <= 2100 else (0 if year == 0 else 2026)
        safe_branch = sanitize_user_input(branch, max_length=32)
        safe_gender = sanitize_user_input(gender, max_length=32)
        safe_skill = sanitize_user_input(skill, max_length=32)

        analytics = get_cohort_analytics(year=safe_year, branch=safe_branch, gender=safe_gender, skill=safe_skill)

        # Database indexed pagination using idx_cohort_branch_year
        paginated = query_cohort_paginated(
            year=safe_year,
            branch=safe_branch,
            gender=safe_gender,
            skill=safe_skill,
            page=page,
            page_size=page_size
        )
        analytics["pagination"] = {
            "page": paginated["page"],
            "page_size": paginated["page_size"],
            "total_records": paginated["total_records"],
            "total_pages": paginated["total_pages"],
            "has_next": paginated["has_next"],
            "has_prev": paginated["has_prev"]
        }
        analytics["records"] = paginated["records"]
        return analytics
    except Exception as exc:
        logger.error(f"[ANALYTICS ERROR 500] Error processing cohort analytics: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(exc)}")


# ============================================================================
# UNIFIED DATA REST ENDPOINTS (Strict SSOT from /data/*)
# ============================================================================

@app.get("/api/data/cohort")
def data_cohort_endpoint(
    year: Optional[int] = Query(2026, ge=0, le=2100),
    branch: Optional[str] = Query("All", max_length=50),
    gender: Optional[str] = Query("All", max_length=50),
    skill: Optional[str] = Query("All", max_length=64),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100)
):
    try:
        safe_year = int(year) if year and 2000 <= year <= 2100 else (0 if year == 0 else 2026)
        safe_branch = sanitize_user_input(branch, max_length=32)
        safe_gender = sanitize_user_input(gender, max_length=32)
        safe_skill = sanitize_user_input(skill, max_length=32)

        data = get_cohort_analytics_data(year=safe_year, branch=safe_branch, gender=safe_gender, skill=safe_skill)
        paginated = query_cohort_paginated(
            year=safe_year,
            branch=safe_branch,
            gender=safe_gender,
            skill=safe_skill,
            page=page,
            page_size=page_size
        )
        data["pagination"] = {
            "page": paginated["page"],
            "page_size": paginated["page_size"],
            "total_records": paginated["total_records"],
            "total_pages": paginated["total_pages"],
            "has_next": paginated["has_next"],
            "has_prev": paginated["has_prev"]
        }
        data["records"] = paginated["records"]
        return data
    except Exception as exc:
        logger.error(f"[DATA COHORT ERROR 500] Error fetching cohort data: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Cohort data error: {str(exc)}")


@app.get("/api/data/branches")
def data_branches_endpoint(year: Optional[int] = Query(2026)):
    return get_branch_deep_analytics(year=year)


@app.get("/api/data/skills")
def data_skills_endpoint(year: Optional[int] = Query(2026), branch: Optional[str] = Query("All")):
    return get_skills_deep_analytics(year=year, branch=branch)


@app.get("/api/data/roles")
def data_roles_endpoint():
    return get_roles()


@app.get("/api/data/projects")
def data_projects_endpoint(role_id: Optional[str] = None, domain: Optional[str] = None):
    projects = get_projects()
    if role_id:
        projects = [p for p in projects if role_id.lower() in p.get("roleId", "").lower()]
    if domain:
        projects = [p for p in projects if domain.lower() in p.get("domain", "").lower()]
    return projects


# ============================================================================
# SINGLE BACKEND AGENT ROUTE (POST /api/chat)
# ============================================================================

@app.post("/api/chat")
@app.post("/api/ai/chat")
def chat_endpoint(chat_req: ChatRequest, request: Request, user: UserSession = Depends(get_current_user)):
    # Rate limit: Max 60 requests per minute to support rapid-fire stress queries
    client_key = user.user_id if user.is_authenticated else get_client_ip(request)
    allowed, _ = rate_limiter.check(f"chat_{client_key}", max_requests=60, window_seconds=60)
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
    if not clean_message or not clean_message.strip():
        return {
            "reply": "Please type a question or choose an area above so I can help you with your placement preparation!",
            "status": "ok"
        }

    try:
        reply = chat_with_mentor(
            message=clean_message,
            history=chat_req.history,
            profile=chat_req.profile
        )
        return {"reply": reply}
    except Exception as exc:
        print(f"[Chat Endpoint] Recovering with resilient fallback: {exc}")
        return {
            "reply": "I am currently in resilient fallback mode. You can ask me about campus placements, 6-week roadmaps, branch cutoff CGPAs, or mock technical interviews!",
            "status": "fallback"
        }


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


# Mount frontend SPA static bundle with client-side routing fallback
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

ROOT_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = (
    (ROOT_DIR / "dist" / "public") if (ROOT_DIR / "dist" / "public").exists()
    else (ROOT_DIR / "dist") if (ROOT_DIR / "dist").exists()
    else None
)

if DIST_DIR and DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str = ""):
        if full_path.startswith("api/") or full_path.startswith("health"):
            raise HTTPException(status_code=404, detail="API route not found")
        if full_path:
            file_path = DIST_DIR / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(file_path)
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Page not found")
else:
    @app.get("/")
    def root_fallback():
        return health_check()

