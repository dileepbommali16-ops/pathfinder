"""
Pathfinder 2.0 - Core Backend Application (v2.0.1 Gemini Live key reload)
Implements modern enterprise FastAPI architecture across all 7 engineering pillars:
1. Backend Fundamentals (Lifespan, Typed Config, Structured Logging, Uniform Error Envelopes)
2. APIs & Communication (Modular Routers, Versioning v1, SSE Streaming, CORS)
3. Databases (ACID SQLite WAL Mode, Repositories, Auto-migration & Seeding)
4. Database Performance (Composite Indexes, PRAGMA Page Cache, Query Profiling)
5. Performance & Scalability (In-Memory LRU/TTL Cache, GZip Compression, Background Tasks)
6. Reliability (Circuit Breakers, Liveness/Readiness Probes, Graceful Lifespan Shutdown)
7. Security & Essentials (JWT/Session Verification, RBAC, Sliding Rate Limiting, OWASP Headers)
"""

import asyncio
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, Request, Response, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

# 1. Fundamentals: Configuration & Structured Logging
from backend.config import get_settings
from backend.logging_config import (
    setup_logging,
    logger,
    set_current_request_id,
    get_current_request_id
)
from backend.exceptions import (
    PathfinderException,
    pathfinder_exception_handler
)

# 2. Performance & Caching
from backend.cache import cache
from backend.reliability import (
    gemini_circuit_breaker,
    oauth_circuit_breaker
)

# 3. Security
from backend.security import (
    SECURITY_HEADERS,
    get_client_ip,
    rate_limiter,
    ai_budget_manager,
    sanitize_user_input,
    validate_pdf_upload,
    require_role
)

# 4. Database & Repositories
from backend.database import (
    init_database,
    get_db_connection,
    DB_PATH,
    get_user_profile_by_id,
    get_user_profile_by_email_or_username,
    save_user_profile,
    delete_user_profile,
    query_cohort_paginated
)

# 5. Core Services
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
    warm_up_data_caches
)
from backend.ml_engine import predict_placement
from backend.gemini_engine import chat_with_mentor, generate_structured_ai
from backend.pdf_engine import extract_text_from_pdf, generate_analytics_pdf, generate_resume_pdf

# 6. Models
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

# 7. OAuth Store
from backend.oauth import (
    _active_sessions,
    oauth_router,
    verify_signed_session_token,
    revoke_signed_session_token
)

# 8. Modular Routers
from backend.routers.health_router import health_router
from backend.routers.auth_router import (
    auth_router,
    get_current_user,
    require_authenticated,
    require_admin
)
from backend.routers.profile_router import profile_router
from backend.routers.analytics_router import analytics_router
from backend.routers.ai_router import ai_router
from backend.routers.predictions_router import predictions_router
from backend.routers.export_router import export_router
from backend.routers.github_router import github_router
from backend.routers.voice_routes import router as voice_routes, prewarm_puck_greetings
from backend.agent.router import agent_router

# Setup application logger
setup_logging()
settings = get_settings()


# ============================================================================
# LIFESPAN CONTEXT MANAGER (Modern FastAPI Startup & Shutdown)
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application lifecycle: fast port-bind startup with background cache warming."""
    logger.info("Initializing Pathfinder 2.0 backend services...")
    try:
        # Initialize database tables and composite indexes synchronously (fast)
        init_database()
    except Exception as exc:
        logger.error(f"Startup DB initialization warning: {exc}", exc_info=True)

    def _warm_caches_sync():
        try:
            df = get_placement_df()
            get_roles()
            get_skills()
            get_projects()
            get_branches()
            warm_up_data_caches()
            logger.info(f"Datasets and analytics caches pre-warmed in background ({len(df)} placement records loaded).")
        except Exception as exc:
            logger.warning(f"Background warm-up warning: {exc}")

    warmup_task = asyncio.create_task(asyncio.to_thread(_warm_caches_sync))
    puck_warmup_task = None
    if "PYTEST_CURRENT_TEST" not in os.environ:
        puck_warmup_task = asyncio.create_task(prewarm_puck_greetings())

    yield  # Application serves requests immediately without blocking cold start

    if puck_warmup_task and not puck_warmup_task.done():
        puck_warmup_task.cancel()
        try:
            await puck_warmup_task
        except (asyncio.CancelledError, Exception):
            pass

    if not warmup_task.done():
        warmup_task.cancel()
        try:
            await warmup_task
        except (asyncio.CancelledError, Exception):
            pass

    # Graceful shutdown
    logger.info("Pathfinder 2.0 backend shutting down: flushing caches and closing connections.")
    cache.clear()


# ============================================================================
# FASTAPI APPLICATION INSTANCE
# ============================================================================

app = FastAPI(
    title="Pathfinder 2.0 Career Intelligence API",
    description="High-performance, reliable, full-stack AI/ML backend for placement predictions, cohort analytics, and Gemini AI career coaching.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)


# ============================================================================
# MIDDLEWARES: Performance, Security, Correlation IDs & Compression
# ============================================================================

@app.middleware("http")
async def security_and_timing_middleware(request: Request, call_next):
    """Attaches correlation ID, performance timing, and OWASP security headers to all responses."""
    # 1. Request / Correlation ID
    client_rid = request.headers.get("x-request-id")
    req_id = set_current_request_id(client_rid)

    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000.0

    # 2. Timing & Tracking Headers
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"

    # 3. OWASP Security Headers
    for header_name, header_value in SECURITY_HEADERS.items():
        response.headers[header_name] = header_value

    # 4. Structured Server Logging for Cloud Log Streams
    if response.status_code >= 500:
        logger.error(f"[SERVER ERROR {response.status_code}] {request.method} {request.url.path} ({duration_ms:.2f}ms)")
    elif response.status_code >= 400:
        logger.warning(f"[CLIENT WARNING {response.status_code}] {request.method} {request.url.path} ({duration_ms:.2f}ms)")

    return response


# Response GZip Compression (Pillar 5: Performance & Scalability)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Strict Cross-Origin Resource Sharing (CORS) Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"https://(pathfinder.*\.vercel\.app|pathfinder.*\.onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# EXCEPTION HANDLERS (Pillar 1: Backend Fundamentals)
# ============================================================================

app.add_exception_handler(PathfinderException, pathfinder_exception_handler)


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    """Catches all unexpected internal errors, logs stack trace, and returns uniform JSON."""
    client_ip = get_client_ip(request)
    req_id = get_current_request_id()
    logger.error(
        f"[CRITICAL ERROR 500] Method: {request.method} | Path: {request.url.path} | IP: {client_ip} | Exception: {type(exc).__name__}: {str(exc)}",
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing your request. Please try again later.",
            },
            "request_id": req_id
        }
    )


# ============================================================================
# MOUNT MODULAR ROUTERS (Pillar 2: APIs & Communication)
# ============================================================================

# Core API Routers (Original Paths for Full Frontend Compatibility)
app.include_router(health_router)
app.include_router(oauth_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(analytics_router)
app.include_router(ai_router)
app.include_router(predictions_router)
app.include_router(github_router)
app.include_router(export_router)
app.include_router(voice_routes)
app.include_router(agent_router)


@app.get("/api/gemini-live-key")
def get_gemini_live_key():
    """Secure endpoint providing Gemini Live session metadata. Never exposes raw credentials."""
    from backend.config.key_resolver import get_active_gemini_key
    from backend.agent.puck_voice import LIVE_MODEL
    has_key = bool(get_active_gemini_key() or os.getenv("GEMINI_API_KEY", "").strip())
    return {
        "status": "ready" if has_key else "missing_api_key",
        "service": "pathfinder-agent-ws",
        "ws_endpoint": "/agent/ws",
        "model": LIVE_MODEL,
        "voice": "Puck"
    }


@app.get("/api/test-live")
async def test_live_debug():
    """Diagnostic endpoint to test Gemini Live API connectivity cleanly without exposing stacktraces."""
    try:
        from backend.agent.puck_voice import LIVE_MODEL, create_gemini_live_config
        from backend.agent.live_proxy import DAS_TOOLS, get_das_system_instruction
        from backend.config.key_resolver import get_gemini_key_candidates
        from google import genai
        keys = get_gemini_key_candidates()
        if not keys:
            return {"ok": False, "error": "No GEMINI_API_KEY configured on server"}
        models_to_try = []
        for candidate in (LIVE_MODEL, "gemini-3.8-live"):
            if candidate and candidate not in models_to_try:
                models_to_try.append(candidate)
        cfg = create_gemini_live_config(get_das_system_instruction("boss"), DAS_TOOLS)
        last_err = ""
        for key in keys:
            client = genai.Client(http_options={"api_version": "v1beta"}, api_key=key)
            key_preview = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "redacted"
            for model_name in models_to_try:
                try:
                    async with client.aio.live.connect(model=model_name, config=cfg):
                        return {"ok": True, "connected": True, "model": model_name, "voice": "DAS Neural", "key_preview": key_preview}
                except Exception as inner_exc:
                    last_err = f"{type(inner_exc).__name__}: {inner_exc}"
        return {"ok": False, "error": last_err[:180] or "Gemini Live connection unavailable"}
    except Exception as e:
        return {"ok": False, "error": str(e)[:180], "type": type(e).__name__}


@app.post("/api/rag/search")
async def rag_search_endpoint(payload: Dict[str, Any] = Body(...)):
    """Centralized Supabase pgvector semantic search endpoint."""
    from backend.supabase_rag import query_semantic_rag
    query = payload.get("query", "")
    top_k = int(payload.get("top_k", 3))
    results = await query_semantic_rag(query, top_k=top_k)
    return {"results": results, "count": len(results)}


from backend.compiler_engine import execute_code_live


@app.post("/api/compile")
async def compile_code_endpoint(payload: Dict[str, Any] = Body(...)):
    """Universal code execution endpoint for C, C++, Python, JS, TS, SQL, Rust, Go."""
    language = payload.get("language", "python")
    code = payload.get("code", "")
    stdin = payload.get("stdin", "")
    res = await execute_code_live(language=language, code=code, stdin=stdin)
    return res
