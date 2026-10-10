import asyncio
import base64
import hashlib
import hmac
import json
import os
import time
import secrets
import logging
import urllib.parse
from typing import Dict, Any, Optional, List
import httpx
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse

from backend.models import UserSession, OAuthUrlsResponse
from backend.database import get_user_profile_by_email_or_username

logger = logging.getLogger("pathfinder.oauth")

# Expiry for OAuth CSRF state parameter (10 minutes)
STATE_EXPIRY_SECONDS = 600
ONE_TIME_CODE_EXPIRY_SECONDS = 60
# OAuth session tokens are self-contained signed tokens valid for 7 days
SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60
SIGNED_SESSION_PREFIX = "pf1."

# Explicit network budget for provider calls: 5s to connect, 10s overall per request
HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# Best-effort replay protection for signed state nonces (state itself is stateless/signed)
_used_state_nonces: Dict[str, float] = {}

# One-time OAuth exchange codes: code -> { session_token, created_at }
_oauth_one_time_codes: Dict[str, Dict[str, Any]] = {}

# Best-effort revocation list for signed OAuth sessions (token -> expiry)
_revoked_session_tokens: Dict[str, float] = {}

# Active server-managed session store (shared with api.py)
_active_sessions: Dict[str, UserSession] = {}
# Compatibility state tracking for older test suites
_oauth_states: Dict[str, Any] = {}

oauth_router = APIRouter(prefix="/api/auth", tags=["OAuth"])


# -----------------------------------------------------------------------------
# STEP TIMING LOGS (never log secrets, auth codes, tokens or state values)
# -----------------------------------------------------------------------------

class _StepTimer:
    """Logs each OAuth step with elapsed milliseconds since the request began."""

    def __init__(self, provider: str, phase: str):
        self.provider = provider
        self.phase = phase
        self._t0 = time.perf_counter()

    def step(self, name: str, **info: Any) -> None:
        elapsed_ms = int((time.perf_counter() - self._t0) * 1000)
        extra = " ".join(f"{k}={v}" for k, v in info.items())
        logger.info(f"[oauth:{self.provider}:{self.phase}] step={name} elapsed_ms={elapsed_ms} {extra}".rstrip())


# -----------------------------------------------------------------------------
# SIGNED TOKEN HELPERS (HMAC-SHA256 keyed with JWT_SECRET)
# -----------------------------------------------------------------------------

_FALLBACK_SECRET = secrets.token_bytes(32)
_warned_missing_secret = False


def _signing_key() -> bytes:
    global _warned_missing_secret
    secret = os.getenv("JWT_SECRET", "").strip()
    if secret:
        return secret.encode("utf-8")
    if not _warned_missing_secret:
        _warned_missing_secret = True
        logger.warning("[oauth] JWT_SECRET is not set: signed state/sessions will not survive a restart. Set JWT_SECRET.")
    return _FALLBACK_SECRET


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign_payload(purpose: str, payload: Dict[str, Any]) -> str:
    """Creates '<body>.<signature>'. The purpose is mixed into the MAC so tokens cannot be cross-used."""
    body = _b64e(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(_signing_key(), f"{purpose}.{body}".encode("ascii"), hashlib.sha256).digest()
    return f"{body}.{_b64e(sig)}"


def _verify_payload(purpose: str, token: Optional[str]) -> Optional[Dict[str, Any]]:
    """Returns the payload if the signature is valid and the token has not expired."""
    if not token or token.count(".") != 1:
        return None
    try:
        body, sig = token.split(".")
        expected = hmac.new(_signing_key(), f"{purpose}.{body}".encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64d(sig)):
            return None
        payload = json.loads(_b64d(body).decode("utf-8"))
    except Exception:
        return None
    if not isinstance(payload, dict) or payload.get("exp", 0) < time.time():
        return None
    return payload


def create_signed_session_token(user_id: str, username: str, email: str, provider: str) -> str:
    """Self-contained OAuth session token. Role is always 'student' and never encoded as admin."""
    payload = {
        "uid": user_id,
        "usr": username,
        "eml": email,
        "prv": provider,
        "exp": int(time.time()) + SESSION_EXPIRY_SECONDS,
    }
    return SIGNED_SESSION_PREFIX + _sign_payload("session", payload)


def verify_signed_session_token(token: Optional[str]) -> Optional[UserSession]:
    """Rebuilds a student UserSession from a signed token (works after restarts / cold starts)."""
    if not token or not token.startswith(SIGNED_SESSION_PREFIX):
        return None
    now = time.time()
    if _revoked_session_tokens.get(token, 0) > now:
        return None
    payload = _verify_payload("session", token[len(SIGNED_SESSION_PREFIX):])
    if not payload:
        return None
    provider = payload.get("prv") if payload.get("prv") in ("google", "github") else "oauth"
    return UserSession(
        user_id=str(payload.get("uid") or "usr_oauth"),
        username=str(payload.get("usr") or "Student"),
        email=str(payload.get("eml") or "candidate@pathfinder.ai"),
        role="student",  # OAuth sessions are never admin
        auth_provider=provider,
        is_authenticated=True,
        token=token,
    )


def revoke_signed_session_token(token: Optional[str]) -> None:
    """Best-effort server-side revocation for signed sessions (used by logout)."""
    if not token or not token.startswith(SIGNED_SESSION_PREFIX):
        return
    now = time.time()
    for k in [k for k, exp in _revoked_session_tokens.items() if exp <= now]:
        _revoked_session_tokens.pop(k, None)
    _revoked_session_tokens[token] = now + SESSION_EXPIRY_SECONDS


# -----------------------------------------------------------------------------
# ORIGIN / URL RESOLUTION
# -----------------------------------------------------------------------------

_LOCAL_HOSTS = ("localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]")
_DEFAULT_DEPLOYED_FRONTEND = "https://pathfinder-client-fzom.vercel.app"


def _is_local_url(url: str) -> bool:
    try:
        host = urllib.parse.urlparse(url).hostname or ""
    except Exception:
        return False
    return host in _LOCAL_HOSTS


def get_allowed_frontend_origins() -> List[str]:
    """Retrieves list of allowlisted frontend origins from the comma-separated FRONTEND_URL env var."""
    raw = os.getenv("FRONTEND_URL", f"http://localhost:3000,http://localhost:5173,{_DEFAULT_DEPLOYED_FRONTEND}").strip()
    raw = raw.replace("hhttps://", "https://").replace("ttps://", "https://")
    origins = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    if _DEFAULT_DEPLOYED_FRONTEND not in origins:
        origins.append(_DEFAULT_DEPLOYED_FRONTEND)
    return origins
    return origins if origins else ["http://localhost:3000"]


def _is_allowed_origin(url: Optional[str]) -> bool:
    """Checks whether an origin URL is allowed: localhost, FRONTEND_URL entries, or valid Vercel/Render HTTPS domains."""
    if not url:
        return False
    try:
        parsed = urllib.parse.urlparse(str(url).strip())
        scheme = (parsed.scheme or "").lower()
        if scheme not in ("http", "https"):
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False
        # Local development origins
        if hostname in _LOCAL_HOSTS:
            return True
        # Explicit allowlist configured via FRONTEND_URL
        for allowed in get_allowed_frontend_origins():
            try:
                a_parsed = urllib.parse.urlparse(allowed.strip())
                if (a_parsed.hostname or "").lower() == hostname:
                    return True
            except Exception:
                pass
        # Verified Pathfinder HTTPS Vercel and Render deployments/previews
        if scheme == "https" and (
            hostname.startswith("pathfinder-")
            and (hostname.endswith(".vercel.app") or hostname.endswith(".onrender.com"))
        ):
            return True
    except Exception:
        return False
    return False


def get_default_frontend_base() -> str:
    """Default redirect target: the first non-localhost origin if any, so production never lands on localhost."""
    allowed = get_allowed_frontend_origins()
    for origin in allowed:
        if not _is_local_url(origin):
            return origin
    return allowed[0]


def resolve_frontend_redirect_base(candidate_origin: Optional[str] = None) -> str:
    """
    Returns an allowlisted frontend origin.
    Allows origins that match FRONTEND_URL or trusted deployment domains (*.vercel.app, *.onrender.com).
    Falls back to the default (first non-localhost if available) entry if not matched or empty.
    """
    if candidate_origin:
        clean = candidate_origin.strip().rstrip("/")
        if _is_allowed_origin(clean):
            return clean
    return get_default_frontend_base()


def _candidate_origin(request: Request, origin_param: Optional[str]) -> Optional[str]:
    """First allowlisted origin among ?origin=, Origin header and Referer; otherwise None."""
    for raw in (origin_param, request.headers.get("origin"), request.headers.get("referer")):
        if not raw:
            continue
        try:
            parsed = urllib.parse.urlparse(raw.strip())
            if parsed.scheme and parsed.netloc:
                candidate = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
                if _is_allowed_origin(candidate):
                    return candidate
        except Exception:
            continue
    return None


def _normalize_backend_url(url: str) -> str:
    url = url.strip().rstrip("/")
    if url.startswith("ttps://"):
        url = "https://" + url[len("ttps://"):]
    if url.startswith("http://") and not _is_local_url(url):
        url = "https://" + url[len("http://"):]
    return url


def get_backend_public_url(request: Request) -> str:
    """
    Returns canonical public URL of this backend service for OAuth callback registration.
    Detects dynamic Render domain from request headers if hosted on onrender.com,
    or falls back to BACKEND_PUBLIC_URL / BACKEND_URL env var, or request.base_url.
    Trailing slashes are stripped and https is forced for non-local hosts.
    """
    # 1. Prefer incoming request host if running on onrender.com
    req_host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(":")[0].strip()
    if req_host.endswith(".onrender.com"):
        return f"https://{req_host}"

    # 2. Check explicit environment overrides
    env_backend = os.getenv("BACKEND_PUBLIC_URL", "").strip().rstrip("/")
    if env_backend:
        return _normalize_backend_url(env_backend)
    backend_url = os.getenv("BACKEND_URL", "").strip().rstrip("/")
    if backend_url:
        return _normalize_backend_url(backend_url)

    # 3. Fallback to request base_url
    base = str(request.base_url).rstrip("/")
    proto = request.headers.get("x-forwarded-proto")
    if proto == "https" and base.startswith("http://"):
        base = "https://" + base[len("http://"):]
    return _normalize_backend_url(base)


def redirect_oauth_error(base_frontend: str, user_friendly_message: str) -> RedirectResponse:
    """Safe redirect back to frontend with a sanitized URL-encoded error message."""
    base_frontend = base_frontend.rstrip("/")
    encoded = urllib.parse.quote_plus(user_friendly_message)
    return RedirectResponse(url=f"{base_frontend}/?oauth_error={encoded}", status_code=302)


def build_oauth_frontend_redirect(base_frontend: str, *, oauth_code: Optional[str] = None, oauth_error: Optional[str] = None) -> str:
    """Build a frontend redirect with safe query parameters for OAuth completion or errors."""
    base_frontend = base_frontend.rstrip("/")
    params: Dict[str, str] = {}
    if oauth_code:
        params["oauth_code"] = oauth_code
    if oauth_error:
        params["oauth_error"] = oauth_error
    query = urllib.parse.urlencode(params)
    if query:
        return f"{base_frontend}/?{query}"
    return base_frontend + "/"


def _error_redirect(frontend_base: str, code: str) -> RedirectResponse:
    return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error=code), status_code=302)


# -----------------------------------------------------------------------------
# STATE (stateless, signed) AND ONE-TIME CODES
# -----------------------------------------------------------------------------

def create_oauth_state(provider: str, origin: str) -> str:
    """Creates a signed, stateless CSRF state (provider, origin, random nonce) with a 10-minute expiry."""
    payload = {
        "p": provider,
        "o": origin,
        "n": secrets.token_urlsafe(12),
        "exp": int(time.time()) + STATE_EXPIRY_SECONDS,
    }
    state = _sign_payload("state", payload)
    _oauth_states[state] = payload
    return state


def verify_and_consume_oauth_state(state: Optional[str], expected_provider: str, consume: bool = True) -> Optional[Dict[str, Any]]:
    """
    Validates signature, expiry and provider of the signed state. Returns {'provider', 'origin'} or None.
    When consume is True the nonce is marked used (best-effort replay protection).
    """
    payload = _verify_payload("state", state)
    if not payload or payload.get("p") != expected_provider:
        return None
    nonce = str(payload.get("n") or "")
    now = time.time()
    if consume:
        for k in [k for k, exp in _used_state_nonces.items() if exp <= now]:
            _used_state_nonces.pop(k, None)
        if nonce in _used_state_nonces:
            return None
        _used_state_nonces[nonce] = now + STATE_EXPIRY_SECONDS
    return {"provider": payload.get("p"), "origin": payload.get("o")}


def create_one_time_oauth_code(session_token: str, is_new_user: bool) -> str:
    """Creates a short-lived single-use OAuth exchange code for the frontend."""
    now = time.time()
    expired = [code for code, data in _oauth_one_time_codes.items() if now - data.get("created_at", 0) > ONE_TIME_CODE_EXPIRY_SECONDS]
    for code in expired:
        _oauth_one_time_codes.pop(code, None)

    code = secrets.token_urlsafe(24)
    _oauth_one_time_codes[code] = {
        "session_token": session_token,
        "is_new_user": is_new_user,
        "created_at": now,
    }
    return code


def consume_one_time_oauth_code(code: Optional[str]) -> Optional[Dict[str, Any]]:
    """Consumes and validates a one-time OAuth code."""
    if not code:
        return None
    data = _oauth_one_time_codes.pop(code, None)
    if not data:
        return None
    now = time.time()
    if now - data.get("created_at", 0) > ONE_TIME_CODE_EXPIRY_SECONDS:
        return None
    return data


def _provider_error_summary(resp: httpx.Response) -> str:
    """Safe summary of a provider error response (only error/error_description fields)."""
    try:
        data = resp.json()
        if isinstance(data, dict):
            return f"error={data.get('error')} description={data.get('error_description')}"
    except Exception:
        pass
    return "unparseable_body"


async def _complete_login(provider: str, username: str, email: str, frontend_base: str, timer: _StepTimer) -> RedirectResponse:
    """Creates a signed student session and a one-time code, then redirects to the frontend."""
    user_id = f"usr_{secrets.token_hex(6)}"
    token = create_signed_session_token(user_id, username, email, provider)
    session = UserSession(
        user_id=user_id,
        username=username,
        email=email,
        role="student",  # role is ALWAYS "student" for OAuth (never admin)
        auth_provider=provider,
        is_authenticated=True,
        token=token,
    )
    _active_sessions[token] = session
    timer.step("session_created")

    is_new_user = False
    try:
        # Sync SQLite lookup: run in a worker thread so the event loop is never blocked
        existing_profile = await asyncio.to_thread(get_user_profile_by_email_or_username, email)
        is_new_user = existing_profile is None
    except Exception as exc:
        logger.warning(f"[oauth:{provider}] profile lookup failed: {type(exc).__name__}")
    oauth_code = create_one_time_oauth_code(token, is_new_user=is_new_user)
    redirect_url = build_oauth_frontend_redirect(frontend_base, oauth_code=oauth_code)
    timer.step("redirect_built", frontend_base=frontend_base, new_user=is_new_user)
    return RedirectResponse(url=redirect_url, status_code=302)


# -----------------------------------------------------------------------------
# STATUS / EXCHANGE ENDPOINTS
# -----------------------------------------------------------------------------

@oauth_router.get("/oauth-urls", response_model=OAuthUrlsResponse)
def get_oauth_urls_endpoint(request: Request):
    """
    Reports whether Google & GitHub OAuth are fully configured (both client ID and secret present),
    and returns the respective /start URLs.
    """
    google_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    google_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    github_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    github_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()

    google_configured = bool(google_id and google_secret)
    github_configured = bool(github_id and github_secret)

    backend_base = get_backend_public_url(request)

    return OAuthUrlsResponse(
        google_configured=google_configured,
        github_configured=github_configured,
        google_url=f"{backend_base}/api/auth/google/start" if google_configured else None,
        github_url=f"{backend_base}/api/auth/github/start" if github_configured else None
    )


@oauth_router.get("/oauth/status")
def oauth_status(request: Request):
    """Configuration check with no secrets: use it to verify what to register in the provider consoles."""
    backend_base = get_backend_public_url(request)
    return {
        "google_configured": bool(os.getenv("GOOGLE_CLIENT_ID", "").strip() and os.getenv("GOOGLE_CLIENT_SECRET", "").strip()),
        "github_configured": bool(os.getenv("GITHUB_CLIENT_ID", "").strip() and os.getenv("GITHUB_CLIENT_SECRET", "").strip()),
        "backend_base_url": backend_base,
        "google_redirect_uri": f"{backend_base}/api/auth/google/callback",
        "github_redirect_uri": f"{backend_base}/api/auth/github/callback",
        "frontend_base_url": get_default_frontend_base(),
        "allowed_frontend_origins": get_allowed_frontend_origins(),
        "jwt_secret_configured": bool(os.getenv("JWT_SECRET", "").strip()),
    }


@oauth_router.post("/oauth/exchange")
@oauth_router.post("/exchange-code")
def exchange_oauth_code(payload: Dict[str, Any]):
    """Consumes a one-time OAuth code and returns the same session payload as a normal login."""
    timer = _StepTimer("any", "exchange")
    code = payload.get("code") if isinstance(payload, dict) else None
    oauth_code_data = consume_one_time_oauth_code(code)
    if not oauth_code_data:
        timer.step("code_invalid_or_expired")
        message = "This sign-in link has expired or was already used. Please sign in again."
        return JSONResponse(status_code=400, content={"success": False, "message": message, "detail": message, "token": ""})

    session_token = oauth_code_data.get("session_token")
    session = _active_sessions.get(session_token) or verify_signed_session_token(session_token)
    if not session or not session.is_authenticated:
        timer.step("session_unverified")
        message = "We could not verify your sign-in. Please sign in again."
        return JSONResponse(status_code=400, content={"success": False, "message": message, "detail": message, "token": ""})

    timer.step("exchange_ok")
    return {
        "success": True,
        "message": "OAuth authentication successful",
        "user": session,
        "token": session_token,
        "is_new_user": oauth_code_data.get("is_new_user", False),
    }


# -----------------------------------------------------------------------------
# GOOGLE OAUTH 2.0 (AUTHORIZATION CODE FLOW)
# -----------------------------------------------------------------------------

@oauth_router.get("/google/start")
def google_oauth_start(request: Request, origin: Optional[str] = None):
    """
    Initiates Google OAuth 2.0 authorization code flow.
    Generates a secure signed state and redirects to Google Account Chooser.
    """
    timer = _StepTimer("google", "start")
    frontend_base = resolve_frontend_redirect_base(_candidate_origin(request, origin))
    timer.step("frontend_resolved", frontend_base=frontend_base)

    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

    if not google_client_id or not google_client_secret:
        logger.warning("[Google OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET")
        return _error_redirect(frontend_base, "google_not_configured")

    state = create_oauth_state("google", frontend_base)
    timer.step("state_created")
    backend_base = get_backend_public_url(request)
    redirect_uri = f"{backend_base}/api/auth/google/callback"

    params = {
        "client_id": google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account"
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    timer.step("redirect_built", redirect_uri=redirect_uri)
    return RedirectResponse(url=google_auth_url, status_code=302)


@oauth_router.get("/google/callback")
async def google_oauth_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None
):
    """
    Handles Google OAuth 2.0 callback:
    Verifies signed state, exchanges code for tokens, retrieves userinfo, requires verified email,
    and redirects to the frontend with a short-lived one-time code.
    """
    timer = _StepTimer("google", "callback")
    fallback_frontend = get_default_frontend_base()

    if error:
        peek = verify_and_consume_oauth_state(state, "google", consume=False)
        frontend_base = resolve_frontend_redirect_base(peek.get("origin") if peek else None)
        logger.warning(f"[Google OAuth] Error received from Google: {error}")
        timer.step("provider_error", error=error)
        return _error_redirect(frontend_base, "google_cancelled" if error == "access_denied" else "google_failed")

    state_data = verify_and_consume_oauth_state(state, "google")
    if not state_data:
        logger.warning("[Google OAuth] State verification failed (invalid, expired or reused)")
        timer.step("state_invalid")
        return _error_redirect(fallback_frontend, "state_invalid")
    timer.step("state_ok")

    frontend_base = resolve_frontend_redirect_base(state_data.get("origin"))

    if not code:
        logger.warning("[Google OAuth] Authorization code missing in callback")
        return _error_redirect(frontend_base, "google_failed")

    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not google_client_id or not google_client_secret:
        return _error_redirect(frontend_base, "google_not_configured")

    backend_base = get_backend_public_url(request)
    redirect_uri = f"{backend_base}/api/auth/google/callback"
    logger.info(f"[Google OAuth] token exchange redirect_uri={redirect_uri}")

    token_payload = {
        "code": code,
        "client_id": google_client_id,
        "client_secret": google_client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            token_resp = await client.post("https://oauth2.googleapis.com/token", data=token_payload)
            timer.step("token_exchange", status=token_resp.status_code)
            if token_resp.status_code != 200:
                logger.error(f"[Google OAuth] Token exchange error ({token_resp.status_code}): {_provider_error_summary(token_resp)}")
                return _error_redirect(frontend_base, "google_failed")

            access_token = token_resp.json().get("access_token")
            if not access_token:
                logger.error("[Google OAuth] Missing access_token in Google response")
                return _error_redirect(frontend_base, "google_failed")

            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            timer.step("profile_fetch", status=userinfo_resp.status_code)
            if userinfo_resp.status_code != 200:
                logger.error(f"[Google OAuth] Userinfo fetch failed ({userinfo_resp.status_code})")
                return _error_redirect(frontend_base, "google_failed")

            userinfo = userinfo_resp.json()
    except httpx.TimeoutException:
        logger.error("[Google OAuth] Timed out talking to Google")
        timer.step("timeout")
        return _error_redirect(frontend_base, "google_timeout")
    except Exception as exc:
        logger.error(f"[Google OAuth] Network exception during Google OAuth: {type(exc).__name__}")
        return _error_redirect(frontend_base, "google_failed")

    # Enforce verified email (userinfo may report the flag as bool or string)
    email = userinfo.get("email")
    is_verified = userinfo.get("email_verified") in (True, "true", "True")
    if not email or not is_verified:
        logger.warning("[Google OAuth] Rejected login: missing or unverified email")
        return _error_redirect(frontend_base, "google_failed")

    username = userinfo.get("name") or userinfo.get("given_name") or email.split("@")[0]
    logger.info(f"[Google OAuth] Authenticated user '{username}' as student session")
    return await _complete_login("google", username, email, frontend_base, timer)


# -----------------------------------------------------------------------------
# GITHUB OAUTH (AUTHORIZATION CODE FLOW)
# -----------------------------------------------------------------------------

_GITHUB_API_HEADERS_BASE = {
    "User-Agent": "Pathfinder-Career-Intelligence",
    "Accept": "application/vnd.github+json",
}


@oauth_router.get("/github/start")
def github_oauth_start(request: Request, origin: Optional[str] = None):
    """
    Initiates GitHub OAuth authorization flow.
    Generates a secure signed state and redirects to GitHub authorize page.
    """
    timer = _StepTimer("github", "start")
    frontend_base = resolve_frontend_redirect_base(_candidate_origin(request, origin))
    timer.step("frontend_resolved", frontend_base=frontend_base)

    github_client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    github_client_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()

    if not github_client_id or not github_client_secret:
        logger.warning("[GitHub OAuth] Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET")
        return _error_redirect(frontend_base, "github_not_configured")

    state = create_oauth_state("github", frontend_base)
    timer.step("state_created")
    backend_base = get_backend_public_url(request)
    redirect_uri = f"{backend_base}/api/auth/github/callback"

    params = {
        "client_id": github_client_id,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
        "state": state
    }
    github_auth_url = f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"
    timer.step("redirect_built", redirect_uri=redirect_uri)
    return RedirectResponse(url=github_auth_url, status_code=302)


@oauth_router.get("/github/callback")
async def github_oauth_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None
):
    """
    Handles GitHub OAuth callback:
    Verifies signed state, exchanges code for access token with Accept: application/json,
    fetches user and verified primary email, and redirects with a one-time code.
    """
    timer = _StepTimer("github", "callback")
    fallback_frontend = get_default_frontend_base()

    if error:
        peek = verify_and_consume_oauth_state(state, "github", consume=False)
        frontend_base = resolve_frontend_redirect_base(peek.get("origin") if peek else None)
        logger.warning(f"[GitHub OAuth] Error received from GitHub: {error}")
        timer.step("provider_error", error=error)
        return _error_redirect(frontend_base, "github_cancelled" if error == "access_denied" else "github_failed")

    state_data = verify_and_consume_oauth_state(state, "github")
    if not state_data:
        logger.warning("[GitHub OAuth] State verification failed (invalid, expired or reused)")
        timer.step("state_invalid")
        return _error_redirect(fallback_frontend, "state_invalid")
    timer.step("state_ok")

    frontend_base = resolve_frontend_redirect_base(state_data.get("origin"))

    if not code:
        logger.warning("[GitHub OAuth] Authorization code missing in callback")
        return _error_redirect(frontend_base, "github_failed")

    github_client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    github_client_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
    if not github_client_id or not github_client_secret:
        return _error_redirect(frontend_base, "github_not_configured")

    backend_base = get_backend_public_url(request)
    redirect_uri = f"{backend_base}/api/auth/github/callback"
    logger.info(f"[GitHub OAuth] token exchange redirect_uri={redirect_uri}")

    token_payload = {
        "client_id": github_client_id,
        "client_secret": github_client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
    }

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data=token_payload,
                headers={"Accept": "application/json", "User-Agent": _GITHUB_API_HEADERS_BASE["User-Agent"]}
            )
            timer.step("token_exchange", status=token_resp.status_code)
            if token_resp.status_code != 200:
                logger.error(f"[GitHub OAuth] Token exchange error ({token_resp.status_code}): {_provider_error_summary(token_resp)}")
                return _error_redirect(frontend_base, "github_failed")

            token_data = token_resp.json()
            # GitHub can answer HTTP 200 with an error body (bad_verification_code, redirect_uri_mismatch, ...)
            if not isinstance(token_data, dict) or token_data.get("error"):
                logger.error(
                    f"[GitHub OAuth] Token exchange rejected: error={token_data.get('error') if isinstance(token_data, dict) else 'invalid'} "
                    f"description={token_data.get('error_description') if isinstance(token_data, dict) else ''}"
                )
                return _error_redirect(frontend_base, "github_failed")
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("[GitHub OAuth] Missing access_token in response")
                return _error_redirect(frontend_base, "github_failed")

            api_headers = {**_GITHUB_API_HEADERS_BASE, "Authorization": f"Bearer {access_token}"}

            # Fetch user profile
            user_resp = await client.get("https://api.github.com/user", headers=api_headers)
            timer.step("profile_fetch", status=user_resp.status_code)
            if user_resp.status_code != 200:
                logger.error(f"[GitHub OAuth] User profile fetch failed ({user_resp.status_code})")
                return _error_redirect(frontend_base, "github_failed")

            user_data = user_resp.json()
            login = user_data.get("login") or "github_user"
            username = user_data.get("name") or login
            email = user_data.get("email")

            # If email is null or private, fetch verified emails from /user/emails.
            # A failure here must never block the login: we fall back to the noreply address.
            if not email:
                try:
                    emails_resp = await client.get("https://api.github.com/user/emails", headers=api_headers)
                    timer.step("email_fetch", status=emails_resp.status_code)
                    if emails_resp.status_code == 200:
                        emails_list = emails_resp.json()
                        if isinstance(emails_list, list):
                            email = next(
                                (e.get("email") for e in emails_list if e.get("primary") and e.get("verified")),
                                None
                            ) or next(
                                (e.get("email") for e in emails_list if e.get("verified")),
                                None
                            )
                except Exception as exc:
                    logger.warning(f"[GitHub OAuth] Email fetch failed, using noreply fallback: {type(exc).__name__}")

            # Fallback if no public or verified email returned
            if not email:
                email = f"{login}@users.noreply.github.com"
    except httpx.TimeoutException:
        logger.error("[GitHub OAuth] Timed out talking to GitHub")
        timer.step("timeout")
        return _error_redirect(frontend_base, "github_timeout")
    except Exception as exc:
        logger.error(f"[GitHub OAuth] Network exception during GitHub OAuth: {type(exc).__name__}")
        return _error_redirect(frontend_base, "github_failed")

    logger.info(f"[GitHub OAuth] Authenticated user '{username}' as student session")
    return await _complete_login("github", username, email, frontend_base, timer)
