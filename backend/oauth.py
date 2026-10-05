import os
import time
import secrets
import logging
import urllib.parse
from typing import Dict, Any, Optional, List
import httpx
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse

from backend.models import UserSession, OAuthUrlsResponse
from backend.database import get_user_profile_by_email_or_username

logger = logging.getLogger("pathfinder.oauth")

# Expiry for OAuth CSRF state parameter (10 minutes)
STATE_EXPIRY_SECONDS = 600
ONE_TIME_CODE_EXPIRY_SECONDS = 60

# Server-side in-memory state store: state_token -> { provider, origin, created_at }
_oauth_states: Dict[str, Dict[str, Any]] = {}

# One-time OAuth exchange codes: code -> { session_token, created_at }
_oauth_one_time_codes: Dict[str, Dict[str, Any]] = {}

# Active server-managed session store (shared with api.py)
_active_sessions: Dict[str, UserSession] = {}

oauth_router = APIRouter(prefix="/api/auth", tags=["OAuth"])


def get_allowed_frontend_origins() -> List[str]:
    """Retrieves list of allowlisted frontend origins from FRONTEND_URL env var."""
    raw = os.getenv("FRONTEND_URL", "http://localhost:3000,http://localhost:5173").strip()
    origins = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    return origins if origins else ["http://localhost:3000"]


def resolve_frontend_redirect_base(candidate_origin: Optional[str] = None) -> str:
    """
    Returns an allowlisted frontend origin.
    Only allows origins that strictly match entries in FRONTEND_URL.
    Falls back to the first entry if not matched or empty.
    """
    allowed = get_allowed_frontend_origins()
    if candidate_origin:
        clean = candidate_origin.strip().rstrip("/")
        if clean in allowed:
            return clean
    return allowed[0]


def get_backend_public_url(request: Request) -> str:
    """
    Returns canonical public URL of this backend service for OAuth callback registration.
    Uses BACKEND_PUBLIC_URL or BACKEND_URL env var, falling back to request.base_url.
    """
    env_backend = os.getenv("BACKEND_PUBLIC_URL", "").strip().rstrip("/")
    if env_backend:
        return env_backend
    backend_url = os.getenv("BACKEND_URL", "").strip().rstrip("/")
    if backend_url:
        return backend_url
    base = str(request.base_url).rstrip("/")
    proto = request.headers.get("x-forwarded-proto")
    if proto == "https" and base.startswith("http://"):
        base = "https://" + base[len("http://"):]
    return base


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


def create_oauth_state(provider: str, origin: str) -> str:
    """Generates and registers a random CSRF state with a 5-minute expiry."""
    now = time.time()
    # Prune expired states
    expired = [k for k, v in _oauth_states.items() if now - v.get("created_at", 0) > STATE_EXPIRY_SECONDS]
    for k in expired:
        _oauth_states.pop(k, None)

    state = secrets.token_urlsafe(32)
    _oauth_states[state] = {
        "provider": provider,
        "origin": origin,
        "created_at": now
    }
    return state


def verify_and_consume_oauth_state(state: Optional[str], expected_provider: str) -> Optional[Dict[str, Any]]:
    """Validates that the CSRF state exists, matches provider, and has not expired; deletes on use."""
    if not state or state not in _oauth_states:
        return None
    data = _oauth_states.pop(state)
    now = time.time()
    if now - data.get("created_at", 0) > STATE_EXPIRY_SECONDS:
        return None
    if data.get("provider") != expected_provider:
        return None
    return data


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


@oauth_router.post("/oauth/exchange")
def exchange_oauth_code(payload: Dict[str, Any]):
    """Consumes a one-time OAuth code and returns the same session payload as a normal login."""
    code = payload.get("code") if isinstance(payload, dict) else None
    oauth_code_data = consume_one_time_oauth_code(code)
    if not oauth_code_data:
        return {
            "success": False,
            "message": "OAuth login code is invalid or expired.",
            "user": UserSession(
                user_id="usr_anonymous",
                username="Guest",
                email="guest@pathfinder.ai",
                role="student",
                auth_provider="oauth",
                is_authenticated=False,
                token=""
            ),
            "token": ""
        }

    session_token = oauth_code_data.get("session_token")
    session = _active_sessions.get(session_token)
    if not session or not session.is_authenticated:
        return {
            "success": False,
            "message": "OAuth session could not be verified.",
            "user": UserSession(
                user_id="usr_anonymous",
                username="Guest",
                email="guest@pathfinder.ai",
                role="student",
                auth_provider="oauth",
                is_authenticated=False,
                token=""
            ),
            "token": ""
        }

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
def google_oauth_start(request: Request):
    """
    Initiates Google OAuth 2.0 authorization code flow.
    Generates a secure state and redirects to Google Account Chooser.
    """
    # Detect requesting origin if allowlisted
    referer = request.headers.get("referer") or request.headers.get("origin")
    candidate_origin = None
    if referer:
        parsed = urllib.parse.urlparse(referer)
        if parsed.scheme and parsed.netloc:
            candidate_origin = f"{parsed.scheme}://{parsed.netloc}"
    frontend_base = resolve_frontend_redirect_base(candidate_origin)

    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

    if not google_client_id or not google_client_secret:
        logger.warning("[Google OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET")
        return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="google_not_configured"), status_code=302)

    state = create_oauth_state("google", frontend_base)
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
    Verifies state, exchanges code for tokens, retrieves userinfo, requires verified email,
    and returns a student session token via URL fragment.
    """
    fallback_frontend = resolve_frontend_redirect_base()

    if error:
        logger.warning(f"[Google OAuth] Error received from Google: {error}")
        return RedirectResponse(url=build_oauth_frontend_redirect(fallback_frontend, oauth_error="google_cancelled"), status_code=302)

    state_data = verify_and_consume_oauth_state(state, "google")
    if not state_data:
        logger.warning(f"[Google OAuth] State verification failed for state={state}")
        return RedirectResponse(url=build_oauth_frontend_redirect(fallback_frontend, oauth_error="google_failed"), status_code=302)

    frontend_base = state_data.get("origin") or fallback_frontend

    if not code:
        logger.warning("[Google OAuth] Authorization code missing in callback")
        return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="google_failed"), status_code=302)

    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not google_client_id or not google_client_secret:
        return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="google_not_configured"), status_code=302)

    backend_base = get_backend_public_url(request)
    redirect_uri = f"{backend_base}/api/auth/google/callback"

    token_payload = {
        "code": code,
        "client_id": google_client_id,
        "client_secret": google_client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post("https://oauth2.googleapis.com/token", data=token_payload)
            if token_resp.status_code != 200:
                logger.error(f"[Google OAuth] Token exchange error ({token_resp.status_code}): {token_resp.text}")
                return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="google_failed"), status_code=302)

            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("[Google OAuth] Missing access_token in Google response")
                return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="google_failed"), status_code=302)

            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            if userinfo_resp.status_code != 200:
                logger.error(f"[Google OAuth] Userinfo fetch failed ({userinfo_resp.status_code}): {userinfo_resp.text}")
                return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="google_failed"), status_code=302)

            userinfo = userinfo_resp.json()
    except Exception as exc:
        logger.exception(f"[Google OAuth] Network exception during Google OAuth: {exc}")
        return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="google_failed"), status_code=302)

    # Enforce verified email
    email = userinfo.get("email")
    is_verified = bool(userinfo.get("email_verified"))
    if not email or not is_verified:
        logger.warning(f"[Google OAuth] Rejected login: unverified email ({email})")
        return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="google_failed"), status_code=302)

    username = userinfo.get("name") or userinfo.get("given_name") or email.split("@")[0]

    # Create server session with role ALWAYS "student" (never admin for OAuth)
    token = secrets.token_hex(24)
    user_id = f"usr_{secrets.token_hex(6)}"
    session = UserSession(
        user_id=user_id,
        username=username,
        email=email,
        role="student",
        auth_provider="google",
        is_authenticated=True,
        token=token
    )
    _active_sessions[token] = session
    logger.info(f"[Google OAuth] Authenticated user '{username}' ({email}) as student session")

    existing_profile = get_user_profile_by_email_or_username(email)
    oauth_code = create_one_time_oauth_code(token, is_new_user=existing_profile is None)
    return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_code=oauth_code), status_code=302)


# -----------------------------------------------------------------------------
# GITHUB OAUTH (AUTHORIZATION CODE FLOW)
# -----------------------------------------------------------------------------

@oauth_router.get("/github/start")
def github_oauth_start(request: Request):
    """
    Initiates GitHub OAuth authorization flow.
    Generates a secure state and redirects to GitHub authorize page.
    """
    referer = request.headers.get("referer") or request.headers.get("origin")
    candidate_origin = None
    if referer:
        parsed = urllib.parse.urlparse(referer)
        if parsed.scheme and parsed.netloc:
            candidate_origin = f"{parsed.scheme}://{parsed.netloc}"
    frontend_base = resolve_frontend_redirect_base(candidate_origin)

    github_client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    github_client_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()

    if not github_client_id or not github_client_secret:
        logger.warning("[GitHub OAuth] Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET")
        return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="github_not_configured"), status_code=302)

    state = create_oauth_state("github", frontend_base)
    backend_base = get_backend_public_url(request)
    redirect_uri = f"{backend_base}/api/auth/github/callback"

    params = {
        "client_id": github_client_id,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
        "state": state
    }
    github_auth_url = f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"
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
    Verifies state, exchanges code for access token with Accept: application/json,
    fetches user and verified primary email, and returns a student session token.
    """
    fallback_frontend = resolve_frontend_redirect_base()

    if error:
        logger.warning(f"[GitHub OAuth] Error received from GitHub: {error}")
        return RedirectResponse(url=build_oauth_frontend_redirect(fallback_frontend, oauth_error="github_cancelled"), status_code=302)

    state_data = verify_and_consume_oauth_state(state, "github")
    if not state_data:
        logger.warning(f"[GitHub OAuth] State verification failed for state={state}")
        return RedirectResponse(url=build_oauth_frontend_redirect(fallback_frontend, oauth_error="github_failed"), status_code=302)

    frontend_base = state_data.get("origin") or fallback_frontend

    if not code:
        logger.warning("[GitHub OAuth] Authorization code missing in callback")
        return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="github_failed"), status_code=302)

    github_client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    github_client_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
    if not github_client_id or not github_client_secret:
        return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="github_not_configured"), status_code=302)

    backend_base = get_backend_public_url(request)
    redirect_uri = f"{backend_base}/api/auth/github/callback"

    token_payload = {
        "client_id": github_client_id,
        "client_secret": github_client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data=token_payload,
                headers={"Accept": "application/json"}
            )
            if token_resp.status_code != 200:
                logger.error(f"[GitHub OAuth] Token exchange error ({token_resp.status_code}): {token_resp.text}")
                return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="github_failed"), status_code=302)

            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error(f"[GitHub OAuth] Missing access_token in response: {token_data}")
                return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="github_failed"), status_code=302)

            # Fetch user profile
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "User-Agent": "Pathfinder-Career-Intelligence",
                    "Accept": "application/vnd.github.v3+json"
                }
            )
            if user_resp.status_code != 200:
                logger.error(f"[GitHub OAuth] User profile fetch failed ({user_resp.status_code}): {user_resp.text}")
                return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="github_failed"), status_code=302)

            user_data = user_resp.json()
            login = user_data.get("login") or "github_user"
            username = user_data.get("name") or login
            email = user_data.get("email")

            # If email is null or private, fetch verified emails from /user/emails
            if not email:
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "User-Agent": "Pathfinder-Career-Intelligence",
                        "Accept": "application/vnd.github.v3+json"
                    }
                )
                if emails_resp.status_code == 200:
                    emails_list = emails_resp.json()
                    if isinstance(emails_list, list):
                        # Find primary verified email
                        primary_verified = next(
                            (e.get("email") for e in emails_list if e.get("primary") and e.get("verified")),
                            None
                        )
                        if primary_verified:
                            email = primary_verified
                        else:
                            # Any verified email
                            any_verified = next(
                                (e.get("email") for e in emails_list if e.get("verified")),
                                None
                            )
                            if any_verified:
                                email = any_verified

            # Fallback if no public or verified email returned
            if not email:
                email = f"{login}@users.noreply.github.com"
    except Exception as exc:
        logger.exception(f"[GitHub OAuth] Network exception during GitHub OAuth: {exc}")
        return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_error="github_failed"), status_code=302)

    # Create server session with role ALWAYS "student" (never admin for OAuth)
    token = secrets.token_hex(24)
    user_id = f"usr_{secrets.token_hex(6)}"
    session = UserSession(
        user_id=user_id,
        username=username,
        email=email,
        role="student",
        auth_provider="github",
        is_authenticated=True,
        token=token
    )
    _active_sessions[token] = session
    logger.info(f"[GitHub OAuth] Authenticated user '{username}' ({email}) as student session")

    existing_profile = get_user_profile_by_email_or_username(email)
    oauth_code = create_one_time_oauth_code(token, is_new_user=existing_profile is None)
    return RedirectResponse(url=build_oauth_frontend_redirect(frontend_base, oauth_code=oauth_code), status_code=302)
