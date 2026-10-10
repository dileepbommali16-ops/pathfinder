"""
Pathfinder 2.0 - Core Backend Application
Implements modern enterprise FastAPI architecture across all 7 engineering pillars:
1. Backend Fundamentals (Lifespan, Typed Config, Structured Logging, Uniform Error Envelopes)
2. APIs & Communication (Modular Routers, Versioning v1, SSE Streaming, CORS)
3. Databases (ACID SQLite WAL Mode, Repositories, Auto-migration & Seeding)
4. Database Performance (Composite Indexes, PRAGMA Page Cache, Query Profiling)
5. Performance & Scalability (In-Memory LRU/TTL Cache, GZip Compression, Background Tasks)
6. Reliability (Circuit Breakers, Liveness/Readiness Probes, Graceful Lifespan Shutdown)
7. Security & Essentials (JWT/Session Verification, RBAC, Sliding Rate Limiting, OWASP Headers)
"""

import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, Request, Response, HTTPException, status
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
from backend.repositories import (
    UserRepository,
    CohortRepository,
    HistoryRepository
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
    compute_cohort_benchmark
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

# Setup application logger
setup_logging()
settings = get_settings()


# ============================================================================
# LIFESPAN CONTEXT MANAGER (Modern FastAPI Startup & Shutdown)
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application lifecycle: pre-warming databases, models, and caches on startup."""
    logger.info("Initializing Pathfinder 2.0 backend services...")
    try:
        # Initialize database tables and composite indexes
        init_database()
        # Pre-warm cohort dataset and cache
        df = get_placement_df()
        get_roles()
        get_skills()
        get_projects()
        get_branches()
        get_cohort_analytics_data()
        logger.info(f"Database and datasets initialized ({len(df)} placement records loaded).")
    except Exception as exc:
        logger.error(f"Startup initialization warning: {exc}", exc_info=True)

    yield  # Application serves requests

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
    allow_origin_regex=r"https://(pathfinder-client-[a-z0-9\-]+\.vercel\.app|pathfinder-backend-[a-z0-9\-]+\.onrender\.com)",
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
app.include_router(export_router)

# Versioned API Prefix (/api/v1) for Standard API Versioning
v1_app = FastAPI(title="Pathfinder v1 Sub-API")
v1_app.include_router(health_router)
v1_app.include_router(oauth_router)
v1_app.include_router(auth_router)
v1_app.include_router(profile_router)
v1_app.include_router(analytics_router)
v1_app.include_router(ai_router)
v1_app.include_router(predictions_router)
v1_app.include_router(export_router)
app.mount("/api/v1", v1_app)


# Backward Compatibility helper for tests expecting _user_profiles dictionary
_user_profiles: Dict[str, StudentProfile] = {}
