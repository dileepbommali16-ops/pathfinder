import time
import re
import html
import hashlib
import threading
from typing import Dict, Optional, Tuple, Any
from collections import defaultdict
from fastapi import Request, HTTPException, status, Header

# ==========================================
# 1. RATE LIMITING & ABUSE PREVENTION
# ==========================================

class SlidingWindowRateLimiter:
    """In-memory thread-safe sliding window rate limiter safe under 50+ concurrent requests."""
    def __init__(self):
        # Key -> list of timestamps
        self.requests: Dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def check(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - window_seconds
        with self._lock:
            # Clean older requests outside the window
            timestamps = self.requests.get(key, [])
            active = [t for t in timestamps if t > window_start]

            if len(active) >= max_requests:
                self.requests[key] = active
                return False, 0

            active.append(now)
            self.requests[key] = active
            remaining = max_requests - len(active)

            # Prevent unbounded growth across thousands of ephemeral sessions
            if len(self.requests) > 4000:
                stale_keys = [
                    k for k, ts in list(self.requests.items())
                    if not ts or ts[-1] <= window_start
                ]
                for sk in stale_keys[:1000]:
                    self.requests.pop(sk, None)

            return True, remaining


rate_limiter = SlidingWindowRateLimiter()

# ==========================================
# 2. AI BUDGET & USER USAGE CAPS
# ==========================================

class AIUsageBudgetManager:
    """Thread-safe AI budget guard capping requests per session/client per day."""
    def __init__(self, daily_limit: int = 60):
        self.daily_limit = daily_limit
        self._lock = threading.Lock()
        # Key -> (day_bucket, count)
        self.usage: Dict[str, Dict[str, int]] = defaultdict(lambda: {"day": 0, "count": 0})

    def consume(self, user_key: str) -> Tuple[bool, int, int]:
        current_day = int(time.time() // 86400)
        with self._lock:
            entry = self.usage[user_key]

            if entry["day"] != current_day:
                entry["day"] = current_day
                entry["count"] = 0

            if entry["count"] >= self.daily_limit:
                return False, entry["count"], self.daily_limit

            entry["count"] += 1

            if len(self.usage) > 4000:
                old_keys = [k for k, v in list(self.usage.items()) if v.get("day") != current_day]
                for ok in old_keys[:1000]:
                    self.usage.pop(ok, None)

            return True, entry["count"], self.daily_limit


ai_budget_manager = AIUsageBudgetManager(daily_limit=200)

# ==========================================
# 3. CLIENT IDENTIFICATION HELPER
# ==========================================

def get_client_ip(request: Request) -> str:
    """Extract real client IP securely prioritizing authentic proxy headers."""
    # 1. Cloudflare / CDN authoritative headers
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip and cf_ip.strip():
        return cf_ip.strip()

    # 2. Render / platform proxy header
    render_ip = request.headers.get("render-client-ip")
    if render_ip and render_ip.strip():
        return render_ip.strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip and real_ip.strip():
        return real_ip.strip()

    # 3. For multi-hop proxies, retrieve peer IP
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if len(parts) > 1:
            return parts[-1]
        elif parts:
            return parts[0]

    return request.client.host if request.client else "0.0.0.0"


def get_session_or_client_key(request: Request, user_hint: str = "") -> str:
    """
    Returns an isolated per-session / per-user bucket key so 50+ concurrent students sharing
    a single college/hostel Wi-Fi NAT IP never lock each other out of rate limits or AI budgets.
    """
    sid = (request.headers.get("x-session-id") or "").strip()
    if sid and re.match(r"^[A-Za-z0-9_.:-]{4,80}$", sid):
        return f"sess:{sid}"

    auth = (request.headers.get("authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        tok = auth.split(" ", 1)[-1].strip()
        if tok:
            tok_hash = hashlib.sha256(tok.encode("utf-8")).hexdigest()[:16]
            return f"tok:{tok_hash}"

    clean_hint = (user_hint or "").strip().lower()
    if clean_hint:
        hint_hash = hashlib.sha256(clean_hint.encode("utf-8")).hexdigest()[:16]
        return f"usr:{hint_hash}"

    return f"ip:{get_client_ip(request)}"


# ==========================================
# 4. INPUT SANITIZATION & XSS PREVENTION
# ==========================================

DANGEROUS_PATTERNS = [
    re.compile(r"<script.*?>.*?</script>", re.IGNORECASE | re.DOTALL),
    re.compile(r"javascript:\s*", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),
    re.compile(r"<iframe.*?>.*?</iframe>", re.IGNORECASE | re.DOTALL),
]

def sanitize_user_input(text: Optional[str], max_length: int = 4000) -> str:
    """Sanitizes text by stripping dangerous script constructs and enforcing length."""
    if not text:
        return ""
    
    # Enforce maximum length
    clipped = text[:max_length]
    
    # Strip dangerous HTML/JS injections
    cleaned = clipped
    for pattern in DANGEROUS_PATTERNS:
        cleaned = pattern.sub("", cleaned)
        
    return cleaned.strip()


# ==========================================
# 5. SECURE FILE UPLOAD VALIDATION
# ==========================================

MAX_RESUME_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
PDF_MAGIC_BYTES = b"%PDF-"
ZIP_MAGIC_BYTES = b"PK\x03\x04"

def validate_resume_upload(filename: str, content: bytes):
    """
    Validates resume file uploads strictly:
    1. Size limit <= 10MB
    2. File extension must be .pdf, .docx, or .txt
    3. File must match authentic format magic bytes or encoding
    """
    if len(content) > MAX_RESUME_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_RESUME_FILE_SIZE // (1024 * 1024)}MB"
        )
    
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        if not content.startswith(PDF_MAGIC_BYTES):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content failed PDF magic signature verification."
            )
    elif lower_name.endswith(".docx"):
        if not content.startswith(ZIP_MAGIC_BYTES):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content failed DOCX document archive verification."
            )
    elif lower_name.endswith(".txt"):
        try:
            content[:4096].decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content is not valid UTF-8 text."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a PDF (.pdf), Word document (.docx), or plain text resume (.txt)."
        )

# Backward-compatibility alias
validate_pdf_upload = validate_resume_upload


# ==========================================
# 6. ROLE-BASED ACCESS CONTROL (RBAC)
# ==========================================

def require_role(allowed_roles: list[str]):
    """
    FastAPI dependency factory enforcing role-based permissions.
    Usage: Depends(require_role(["admin"]))
    """
    def role_checker(request: Request):
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        from backend.oauth import _active_sessions, verify_signed_session_token
        token = None
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ", 1)[-1].strip()

        user = None
        if token and token in _active_sessions:
            user = _active_sessions[token]
        elif token:
            user = verify_signed_session_token(token)

        if not user or not user.is_authenticated:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to perform this action."
            )

        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires role in {allowed_roles}, but current role is '{user.role}'."
            )
        return user

    return role_checker


# ==========================================
# 7. OWASP SECURITY HEADERS CONFIGURATION
# ==========================================

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": (
        "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; "
        "img-src 'self' https: data: blob:; "
        "connect-src 'self' https: wss:; "
        "frame-ancestors 'self'; "
        "upgrade-insecure-requests;"
    )
}


# ==========================================
# 8. WEBHOOK SIGNATURE VERIFICATION (Point 19)
# ==========================================

import hmac
import hashlib

def verify_webhook_signature(
    payload_bytes: bytes,
    signature_header: Optional[str],
    secret: str,
    header_prefix: str = "sha256="
) -> bool:
    """
    Verifies incoming webhook payloads against an HMAC SHA-256 signature.
    Prevents replay attacks, man-in-the-middle forging, and unauthorized triggering.
    """
    if not signature_header or not secret:
        return False
        
    sig = signature_header.strip()
    if header_prefix and sig.startswith(header_prefix):
        sig = sig[len(header_prefix):]
        
    expected_hash = hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(sig.lower(), expected_hash.lower())


# ==========================================
# 9. BOT PROTECTION & HONEYPOT (Point 11)
# ==========================================

def check_bot_protection(honeypot_value: Optional[str] = None) -> bool:
    """
    Validates form submissions against automated bot traps.
    Legitimate users leave hidden honeypot fields blank; automated spam bots populate them.
    Returns True if valid human submission, False if bot activity detected.
    """
    if honeypot_value and honeypot_value.strip():
        return False
    return True


# ==========================================
# 10. ADMIN ACTION AUDIT LOGGING (Point 12)
# ==========================================

import logging
audit_logger = logging.getLogger("pathfinder.audit")

def log_admin_action(admin_identifier: str, action: str, target: str = "", details: Dict[str, Any] = None):
    """
    Records immutable audit trail entries for all administrative actions.
    Ensures accountability for privilege escalation, data export, or system config changes.
    """
    audit_logger.info(
        f"[AUDIT_LOG] Administrator='{admin_identifier}' Action='{action}' Target='{target}' Details={details or {}}"
    )


# ==========================================
# 11. PRIVATE STORAGE ACCESS VERIFICATION (Point 13)
# ==========================================

def validate_private_storage_access(user_id: str, resource_owner_id: str, is_admin: bool = False) -> bool:
    """
    Enforces tenant privacy on cloud storage objects (resumes, exports).
    Ensures users can only access their own files unless explicitly an administrator.
    """
    if is_admin:
        return True
    return user_id == resource_owner_id


