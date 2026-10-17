"""
Backend Architecture: Auth Controller (Photo 2)
Receives authentication requests, validates payloads, manages sessions, and produces responses.
"""

import os
import time
import secrets
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status

from backend.models import UserSession, LoginRequest, LoginResponse
from backend.security import (
    rate_limiter,
    get_client_ip,
    sanitize_user_input,
    log_admin_action,
    check_bot_protection
)
from backend.oauth import _active_sessions, revoke_signed_session_token
from backend.data_service import get_placement_df
from backend.logging_config import logger


def handle_login(payload: LoginRequest, request: Request) -> LoginResponse:
    """Handles login validation, bot protection, and session generation."""
    if not check_bot_protection(payload.honeypot):
        logger.warning(f"[BOT BLOCKED] Automated bot trap triggered on login from IP: {get_client_ip(request)}")
        raise HTTPException(
            status_code=400,
            detail="Automated submission detected. Request rejected."
        )

    client_ip = get_client_ip(request)
    allowed, _ = rate_limiter.check(f"login_{client_ip}", max_requests=10, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many authentication attempts. Please wait 60 seconds before trying again."
        )

    username = sanitize_user_input(payload.username, max_length=64)
    if not username:
        raise HTTPException(status_code=400, detail="Username or email is required")

    email = sanitize_user_input(payload.email, max_length=128) if payload.email else (
        username if "@" in username else f"{username.lower()}@pathfinder.ai"
    )
    token = secrets.token_hex(24)
    admin_header = request.headers.get("x-admin-key") or request.headers.get("X-Admin-Key") or ""
    configured_key = os.getenv("ADMIN_KEY", "").strip()
    is_admin = False
    if configured_key and admin_header:
        import hmac
        if hmac.compare_digest(admin_header, configured_key):
            is_admin = True
    elif not configured_key and os.getenv("ENVIRONMENT", "development") in ("development", "test") and not os.getenv("RENDER") and not os.getenv("VERCEL"):
        is_admin = (
            username.lower() in ["admin", "administrator", "faculty_admin", "staff_admin"] or
            (email and email.lower().startswith("admin@"))
        )
    role = "admin" if is_admin else "student"
    session = UserSession(
        user_id=f"usr_{secrets.token_hex(6)}",
        username=username,
        email=email,
        role=role,
        auth_provider="credentials",
        is_authenticated=True,
        token=token,
        last_active_at=time.time()
    )
    _active_sessions[token] = session
    return LoginResponse(
        success=True,
        message="Authentication successful",
        user=session,
        token=token
    )


def handle_logout(authorization: Optional[str]) -> Dict[str, Any]:
    """Revokes active session tokens."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[-1].strip()
    if token and token in _active_sessions:
        del _active_sessions[token]
    revoke_signed_session_token(token)
    return {"success": True, "message": "Logged out successfully and session revoked"}


def handle_get_system_stats(admin_user: UserSession) -> Dict[str, Any]:
    """Protected Admin endpoint: reports infrastructure, active sessions, and cohort metrics."""
    log_admin_action(
        admin_identifier=admin_user.username,
        action="GET_SYSTEM_STATS",
        target="infrastructure_telemetry",
        details={"user_id": admin_user.user_id, "role": admin_user.role}
    )
    df = get_placement_df()
    return {
        "status": "operational",
        "admin_user": admin_user.username,
        "active_sessions_count": len(_active_sessions),
        "total_cohort_records": len(df),
        "total_branches": len(df["branch"].unique()) if len(df) else 0,
        "overall_placement_rate": round((len(df[df["placed"] == 1]) / len(df) * 100), 1) if len(df) else 0,
        "models": {
            "ml_classifier": "RandomForestClassifier(n_estimators=120)",
            "gemini_agent": os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
        },
        "server_time": time.time()
    }
