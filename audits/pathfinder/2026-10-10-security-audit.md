# Pathfinder 2.0 — Pre-Public & Hackathon Security Audit Report

**Audit Target:** Pathfinder 2.0 AI Placement Platform  
**Scope:** `/backend`, `/client/src`, `.env.example`, `render.yaml`, `vercel.json`, `package.json`, `pnpm-lock.yaml`, `requirements.txt`, `.github/workflows`  
**Date:** October 10, 2026  
**Auditor:** Automated AppSec Security Review Engine (`security-audit`)  
**Mode:** READ-ONLY AUDIT (No code modified; awaiting authorization)  

---

## Executive Summary

A comprehensive pre-public deployment security audit was conducted on the **Pathfinder 2.0** codebase. The platform consists of a FastAPI backend (`/backend`), a React 19 + Vite frontend (`/client`), SQLite with WAL storage, OAuth 2.0 authentication (Google & GitHub), and Google Gemini AI integrations.

### Findings Breakdown by Severity

| Severity | Count | Summary |
| :--- | :---: | :--- |
| **Critical** | **3** | Unauthenticated IDOR deletion, Passwordless admin privilege escalation, OAuth open redirect code theft |
| **High** | **3** | `X-Forwarded-For` rate limit spoofing, Diagnostic route leaking API key prefix, Supply-chain package CVEs |
| **Medium** | **4** | Server path disclosure in `/api/health`, Internal exception leaks in HTTP 500, CRLF header injection, `localStorage` tokens |
| **Low** | **3** | Missing rate limits on OAuth/PDF routes, Untyped Dict request bodies in ML endpoints, Outdated Python packages |
| **Info** | **2** | Third-party Maps proxy dependency, In-memory rate limiter multi-worker clustering note |
| **Total** | **15** | **Actionable Findings Documented with Concrete Fixes** |

---

## Detailed Vulnerability Findings

### 1. [SEC-01] Broken Access Control & IDOR in Profile Deletion (CRITICAL)
- **File & Line:** `backend/routers/profile_router.py:165-182`
- **OWASP Category:** A01:2021 — Broken Access Control / Insecure Direct Object References (IDOR)
- **Vulnerability Description:**
  The `delete_profile` endpoint allows arbitrary users to delete student profiles:
  ```python
  @profile_router.delete("/api/profile")
  def delete_profile(
      user_id: Optional[str] = Query(None),
      email: Optional[str] = Query(None),
      user: UserSession = Depends(get_current_user)
  ):
      target = user_id or email or user.user_id
      if not target or target == "usr_anonymous":
          raise HTTPException(status_code=400, detail="Missing user_id or email to delete.")

      if user.is_authenticated and user_id and user_id != user.user_id:
          raise HTTPException(status_code=403, detail="Forbidden: You cannot delete another user's profile.")

      deleted = UserRepository.delete(target)
  ```
  Two critical flaws exist:
  1. **Unauthenticated Bypass:** If `user.is_authenticated` is `False` (guest), the `if user.is_authenticated ...` check is bypassed entirely. An unauthenticated attacker can call `DELETE /api/profile?user_id=usr_victim` and erase any candidate profile.
  2. **Parameter Bypass:** If an authenticated user passes `?email=victim@example.com`, `user_id` is `None`, so `user_id and user_id != user.user_id` evaluates to `False`. The attacker successfully deletes the victim's profile using their email.
- **Why It Matters:** Any malicious actor or script can wipe the persistent SQLite profile database without credentials before a hackathon demo.
- **Concrete Fix:**
  Require strict authentication and enforce that users can only delete their own session-bound ID:
  ```python
  @profile_router.delete("/api/profile")
  def delete_profile(user: UserSession = Depends(require_authenticated)):
      deleted = UserRepository.delete(user.user_id)
      if user.user_id in _user_profiles:
          del _user_profiles[user.user_id]
      return {"status": "deleted" if deleted else "not_found", "target": user.user_id}
  ```

---

### 2. [SEC-02] Unauthenticated Privilege Escalation to Administrator (CRITICAL)
- **File & Line:** `backend/routers/auth_router.py:83-87`
- **OWASP Category:** A01:2021 — Broken Access Control & A07:2021 — Identification and Authentication Failures
- **Vulnerability Description:**
  The login endpoint (`POST /api/auth/login`) assigns full administrator rights without verifying passwords or tokens:
  ```python
  is_admin = (
      username.lower() in ["admin", "administrator", "faculty_admin", "staff_admin"] or
      (email and email.lower().startswith("admin@"))
  )
  role = "admin" if is_admin else "student"
  ```
- **Why It Matters:** Anyone sending `{"username": "admin"}` or `{"username": "test", "email": "admin@pathfinder.ai"}` receives an authenticated JWT session with `role: "admin"`, unlocking access to `/api/admin/system-stats` and privileged telemetry.
- **Concrete Fix:**
  Require an environment variable secret (`ADMIN_SECRET_KEY` or hashed password check) before granting the `admin` role:
  ```python
  admin_key = payload.admin_secret or request.headers.get("X-Admin-Key")
  is_admin = bool(admin_key and os.getenv("ADMIN_KEY") and hmac.compare_digest(admin_key, os.getenv("ADMIN_KEY")))
  role = "admin" if is_admin else "student"
  ```

---

### 3. [SEC-03] OAuth Open Redirect & One-Time Code Theft (CRITICAL)
- **File & Line:** `backend/oauth.py:212-218`, `backend/oauth.py:233-244`
- **OWASP Category:** A01:2021 — Broken Access Control (Open Redirect / OAuth Hijack)
- **Vulnerability Description:**
  In `backend/oauth.py`, `_is_allowed_origin` treats all domains on Vercel and Render as trusted redirect targets:
  ```python
  if scheme == "https" and (
      hostname == "vercel.app"
      or hostname.endswith(".vercel.app")
      or hostname == "onrender.com"
      or hostname.endswith(".onrender.com")
  ):
      return True
  ```
  When initiating OAuth (`/api/auth/google?origin=https://evil-attacker.vercel.app`), the backend bakes `evil-attacker.vercel.app` into the signed OAuth state. Upon successful login callback, the user's browser is redirected to:
  `https://evil-attacker.vercel.app/?oauth_code=<one_time_code>`
- **Why It Matters:** An attacker hosting an arbitrary app on Vercel can phish users with a Pathfinder login link. Once the victim authenticates, their one-time OAuth code is delivered to the attacker's server, which exchanges it for a permanent session token (`POST /api/auth/exchange`).
- **Concrete Fix:**
  Restrict allowed origins strictly to the project's verified deployed prefixes:
  ```python
  ALLOWED_ORIGIN_REGEX = re.compile(
      r"^https://(pathfinder-client-[a-z0-9\-]+\.vercel\.app|pathfinder-backend-[a-z0-9\-]+\.onrender\.com)$"
  )
  if scheme == "https" and ALLOWED_ORIGIN_REGEX.match(f"https://{hostname}"):
      return True
  ```

---

### 4. [SEC-04] Trivial Rate Limiter Bypass via `X-Forwarded-For` Spoofing (HIGH)
- **File & Line:** `backend/security.py:69-78`
- **OWASP Category:** A04:2021 — Insecure Design (Abuse & DoS Prevention Bypass)
- **Vulnerability Description:**
  The client IP resolver blindly takes the first header item from `x-forwarded-for`:
  ```python
  forwarded = request.headers.get("x-forwarded-for")
  if forwarded:
      return forwarded.split(",")[0].strip()
  ```
- **Why It Matters:** Any client can send a custom header: `X-Forwarded-For: 1.2.3.4`. In the next request, they send `X-Forwarded-For: 1.2.3.5`. The `SlidingWindowRateLimiter` treats each request as a distinct client, completely nullifying the rate limits on login, chat, and resume reviews.
- **Concrete Fix:**
  On Render and cloud reverse proxies, trust the direct client IP or take the rightmost trusted proxy hop, or prioritize `request.client.host` unless running behind a configured trusted proxy subnet.

---

### 5. [SEC-05] Unauthenticated Gemini Key Prefix & Live Ping Exposure (HIGH)
- **File & Line:** `backend/routers/health_router.py:133-163`
- **OWASP Category:** A05:2021 — Security Misconfiguration & A08: Software and Data Integrity Failures
- **Vulnerability Description:**
  The route `GET /api/gemini/ping`:
  1. Requires no authentication.
  2. Has no rate limiting.
  3. Executes 3 outbound requests directly to Google Gemini API per invocation (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).
  4. Returns the production key prefix: `return {"key_prefix": api_key[:6] + "...", ...}`.
- **Why It Matters:** Anyone can spam `GET /api/gemini/ping` to exhaust the application's Google Gemini API budget/quota, trigger Denial of Service for legitimate users, and confirm parts of the secret key.
- **Concrete Fix:**
  Protect `/api/gemini/ping` with `Depends(require_admin)` and remove `key_prefix` from the JSON response.

---

### 6. [SEC-06] Supply-Chain Dependency CVEs in `package.json` / `pnpm-lock.yaml` (HIGH)
- **File & Line:** `package.json`, `pnpm-lock.yaml`
- **OWASP Category:** A06:2021 — Vulnerable and Outdated Components
- **Audit Tool Output:** `pnpm audit` revealed 14 vulnerabilities (3 Critical, 3 High):
  1. **Vitest (<3.2.6) [CRITICAL]** — Arbitrary file read & execution via UI server (GHSA-5xrq-8626-4rwp).
  2. **Tinypool (<2.1.2) [CRITICAL]** — Prototype pollution gadget to RCE in worker options (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr).
  3. **Drizzle-ORM (<0.45.2) [HIGH]** — SQL injection via improperly escaped identifiers (GHSA-gpj5-g38j-94v9).
  4. **Vite (<=6.4.2) [HIGH]** — `server.fs.deny` bypass on Windows alternate paths (GHSA-fx2h-pf6j-xcff).
  5. **Source-map-js (<1.2.2) [HIGH]** — Event-loop denial of service (GHSA-68fv-2mgg-jv7q).
- **Concrete Fix:**
  Run `npx.cmd pnpm update vitest drizzle-orm vite source-map-js --latest`.

---

### 7. [SEC-07] Server Filesystem Path Disclosure in Health Check (MEDIUM)
- **File & Line:** `backend/routers/health_router.py:72`
- **OWASP Category:** A05:2021 — Security Misconfiguration (Information Disclosure)
- **Vulnerability Description:**
  `GET /api/health` returns:
  ```json
  "database_sql": {
      "status": "ready",
      "engine": "sqlite_wal",
      "path": "C:\\Users\\Priyanka\\Downloads\\pathfinder-main\\data\\pathfinder_production.db"
  }
  ```
- **Why It Matters:** Unauthenticated visitors can inspect server filesystem paths, host usernames, and directory layouts, aiding targeted attacks.
- **Concrete Fix:**
  Return only `"engine": "sqlite_wal", "connected": True` without exposing the local filesystem path.

---

### 8. [SEC-08] Internal Exception & Stack Info Leakage in HTTP 500 Responses (MEDIUM)
- **File & Line:** `backend/routers/export_router.py:53, 69`, `backend/routers/ai_router.py:247`
- **OWASP Category:** A05:2021 — Security Misconfiguration
- **Vulnerability Description:**
  Several route handlers catch broad exceptions and return `str(e)` directly to the user:
  ```python
  except Exception as e:
      raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
  ```
- **Why It Matters:** If ReportLab, PyPDF, or the SQLite database fails (e.g. disk permission, missing file, driver failure), the exact traceback and internal system path is delivered in the HTTP 500 JSON response.
- **Concrete Fix:**
  Log the full exception with `logger.error("...", exc_info=True)` and return a generic error message: `"Failed to generate document. Please try again later."`

---

### 9. [SEC-09] HTTP Response Splitting / CRLF Header Injection in PDF Export (MEDIUM)
- **File & Line:** `backend/routers/export_router.py:61-66`
- **OWASP Category:** A03:2021 — Injection
- **Vulnerability Description:**
  User input is concatenated directly into the HTTP `Content-Disposition` header:
  ```python
  candidate_name = payload.get("full_name", "candidate").replace(" ", "_")
  filename = f"{candidate_name}_ATS_Resume.pdf"
  return Response(
      content=pdf_bytes,
      media_type="application/pdf",
      headers={"Content-Disposition": f"attachment; filename={filename}"}
  )
  ```
- **Why It Matters:** If `full_name` contains carriage return / line feed characters (`\r\n`) or double quotes, an attacker can manipulate response headers, inject arbitrary cookies, or trigger response splitting.
- **Concrete Fix:**
  Sanitize `filename` using strict alphanumeric regex:
  ```python
  clean_name = re.sub(r"[^a-zA-Z0-9_\-]", "", candidate_name)[:40] or "candidate"
  ```

---

### 10. [SEC-10] Auth Session Token Stored in `localStorage` (MEDIUM)
- **File & Line:** `client/src/pages/Home.tsx:655`
- **OWASP Category:** A07:2021 — Identification and Authentication Failures
- **Vulnerability Description:**
  Session tokens are stored in `window.localStorage.setItem("pathfinder_token", token)`.
- **Why It Matters:** Any Cross-Site Scripting (XSS) vulnerability or third-party script running on the page can access `localStorage` and exfiltrate user credentials.
- **Concrete Fix:**
  Transition to `HttpOnly`, `Secure`, `SameSite=Lax` session cookies.

---

### 11. [SEC-11] Missing Rate Limiting on Resource-Intensive Endpoints (LOW)
- **File & Line:** `backend/routers/export_router.py:34, 56`, `backend/oauth.py:455, 495`
- **OWASP Category:** A04:2021 — Insecure Design
- **Vulnerability Description:**
  PDF generation (`/api/export/pdf`, `/api/export/resume-pdf`) and OAuth initiation routes have no rate limits attached. Generating 100 PDFs concurrently can exhaust server CPU and memory.
- **Concrete Fix:**
  Add `rate_limiter.check(f"pdf_{client_ip}", max_requests=10, window_seconds=60)`.

---

### 12. [SEC-12] Untyped Dictionary Request Bodies in ML Endpoints (LOW)
- **File & Line:** `backend/routers/predictions_router.py:17, 35`
- **OWASP Category:** A03:2021 — Injection / Input Validation
- **Vulnerability Description:**
  `predict_endpoint` and `skill_gap_endpoint` use `payload: Dict[str, Any] = Body(...)` rather than strict Pydantic schemas, relying on manual dictionary key lookups and type casting.
- **Concrete Fix:**
  Define `class PredictionInput(BaseModel):` with bounds validation (`ge=0`, `le=10`).

---

### 13. [SEC-13] Outdated Python Dependencies with Known CVEs (LOW)
- **File & Line:** `requirements.txt:11, 12, 14`
- **OWASP Category:** A06:2021 — Vulnerable and Outdated Components
- **Vulnerability Description:**
  - `requests>=2.31.0`: requests 2.31.0 is affected by CVE-2024-35195.
  - `gunicorn>=21.2.0`: gunicorn 21.2.0 is affected by CVE-2024-1135 (HTTP request smuggling).
  - `python-multipart>=0.0.9`: vulnerable to CVE-2024-53981 (DoS).
- **Concrete Fix:**
  Update `requirements.txt` to `requests>=2.32.3`, `gunicorn>=22.0.0`, `python-multipart>=0.0.18`.

---

### 14. [SEC-14] Third-Party Maps Proxy Dependency (INFO)
- **File & Line:** `client/src/components/Map.tsx:89-93`
- **Vulnerability Description:**
  The frontend loads Google Maps via `https://forge.butterfly-effect.dev/v1/maps/proxy`. If this external domain is unreachable or hijacked, the Map component fails.
- **Recommendation:**
  Ensure the Map component fails gracefully with a fallback placeholder.

---

### 15. [SEC-15] In-Memory Rate Limiter Multi-Worker Clustered Scaling (INFO)
- **File & Line:** `backend/security.py:12`
- **Vulnerability Description:**
  `SlidingWindowRateLimiter` is in-memory per Python process. If deployed with multiple Gunicorn workers (`-w 4`), rate limits are tracked per worker rather than globally.
- **Recommendation:**
  For multi-worker or multi-instance horizontal scaling, connect to an external Redis store (`redis-py`).

---

## Verification & Status

- **Status:** Audit completed.
- **Code Modifications:** None applied (strictly read-only as requested).
- **Awaiting User Review:** Review the findings above. Upon your approval, remediation patches can be applied and verified.
