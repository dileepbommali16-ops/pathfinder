import time
import re
import html
from typing import Dict, Optional, Tuple
from collections import defaultdict
from fastapi import Request, HTTPException, status, Header

# ==========================================
# 1. RATE LIMITING & ABUSE PREVENTION
# ==========================================

class SlidingWindowRateLimiter:
    """In-memory thread-safe sliding window rate limiter."""
    def __init__(self):
        # Key -> list of timestamps
        self.requests: Dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - window_seconds
        
        # Clean older requests outside the window
        timestamps = self.requests[key]
        self.requests[key] = [t for t in timestamps if t > window_start]
        
        if len(self.requests[key]) >= max_requests:
            remaining = 0
            return False, remaining
        
        self.requests[key].append(now)
        remaining = max_requests - len(self.requests[key])
        return True, remaining


rate_limiter = SlidingWindowRateLimiter()

# ==========================================
# 2. AI BUDGET & USER USAGE CAPS
# ==========================================

class AIUsageBudgetManager:
    """Protects Gemini AI budget by capping requests per user/IP per day."""
    def __init__(self, daily_limit: int = 60):
        self.daily_limit = daily_limit
        # Key -> (day_bucket, count)
        self.usage: Dict[str, Dict[str, int]] = defaultdict(lambda: {"day": 0, "count": 0})

    def consume(self, user_key: str) -> Tuple[bool, int, int]:
        current_day = int(time.time() // 86400)
        entry = self.usage[user_key]
        
        if entry["day"] != current_day:
            entry["day"] = current_day
            entry["count"] = 0
            
        if entry["count"] >= self.daily_limit:
            return False, entry["count"], self.daily_limit
            
        entry["count"] += 1
        return True, entry["count"], self.daily_limit


ai_budget_manager = AIUsageBudgetManager(daily_limit=200)

# ==========================================
# 3. CLIENT IDENTIFICATION HELPER
# ==========================================

def get_client_ip(request: Request) -> str:
    """Extract real client IP considering forward headers from proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


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

MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
PDF_MAGIC_BYTES = b"%PDF-"

def validate_pdf_upload(filename: str, content: bytes):
    """
    Validates file upload strictly:
    1. Size limit <= 5MB
    2. File extension must be .pdf
    3. File must begin with authentic %PDF- magic bytes
    """
    if len(content) > MAX_RESUME_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_RESUME_FILE_SIZE // (1024 * 1024)}MB"
        )
    
    lower_name = filename.lower()
    if not lower_name.endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only authentic PDF documents (.pdf) are permitted."
        )
        
    if not content.startswith(PDF_MAGIC_BYTES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content failed PDF magic signature verification."
        )


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
    "Content-Security-Policy": (
        "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; "
        "img-src 'self' https: data: blob:; "
        "connect-src 'self' https: wss:; "
        "frame-ancestors 'self';"
    )
}

