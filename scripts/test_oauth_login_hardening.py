"""
OAuth login hardening tests (stateless signed state, signed sessions, error redirects).
Run from the repo root:  python -m unittest scripts.test_oauth_login_hardening -v
All provider HTTP calls are mocked; no network access is needed.
"""
import os
import sys
import time
import unittest
import urllib.parse
from pathlib import Path
from unittest.mock import patch, MagicMock

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import httpx

os.environ["FRONTEND_URL"] = "http://localhost:3000,https://app.example.vercel.app"
os.environ["BACKEND_PUBLIC_URL"] = "http://pathfinder-1-xhme.onrender.com/"  # http + trailing slash on purpose
os.environ["JWT_SECRET"] = "unit-test-secret-unit-test-secret"
os.environ["GOOGLE_CLIENT_ID"] = "gid"
os.environ["GOOGLE_CLIENT_SECRET"] = "gsecret"
os.environ["GITHUB_CLIENT_ID"] = "ghid"
os.environ["GITHUB_CLIENT_SECRET"] = "ghsecret"

from fastapi.testclient import TestClient  # noqa: E402
from backend.api import app  # noqa: E402
from backend import oauth  # noqa: E402

VERCEL = "https://app.example.vercel.app"
BACKEND = "https://pathfinder-1-xhme.onrender.com"


def _resp(status=200, payload=None):
    r = MagicMock()
    r.status_code = status
    r.json.return_value = payload if payload is not None else {}
    return r


def _qs(url):
    return urllib.parse.parse_qs(urllib.parse.urlparse(url).query)


class OAuthHardeningTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app, follow_redirects=False)
        oauth._active_sessions.clear()
        oauth._oauth_one_time_codes.clear()
        oauth._used_state_nonces.clear()
        oauth._revoked_session_tokens.clear()
        p = patch("backend.oauth.get_user_profile_by_email_or_username", return_value=None)
        p.start()
        self.addCleanup(p.stop)

    # ---- helpers -------------------------------------------------------
    def _start(self, provider):
        res = self.client.get(f"/api/auth/{provider}/start?origin={urllib.parse.quote(VERCEL)}")
        self.assertEqual(res.status_code, 302)
        return res.headers["location"]

    def _state(self, provider):
        return _qs(self._start(provider))["state"][0]

    # ---- start flow ----------------------------------------------------
    def test_google_start_redirects_to_google_with_exact_redirect_uri(self):
        loc = self._start("google")
        self.assertTrue(loc.startswith("https://accounts.google.com/o/oauth2/v2/auth?"))
        q = _qs(loc)
        self.assertEqual(q["redirect_uri"][0], f"{BACKEND}/api/auth/google/callback")
        self.assertEqual(q["prompt"][0], "select_account")
        self.assertEqual(q["client_id"][0], "gid")

    def test_github_start_redirects_to_github_with_exact_redirect_uri(self):
        loc = self._start("github")
        self.assertTrue(loc.startswith("https://github.com/login/oauth/authorize?"))
        self.assertEqual(_qs(loc)["redirect_uri"][0], f"{BACKEND}/api/auth/github/callback")

    def test_state_is_stateless_signed_and_survives_cleared_memory(self):
        state = self._state("github")
        oauth._used_state_nonces.clear()  # simulates a restart: nothing in memory
        self.assertIsNotNone(oauth.verify_and_consume_oauth_state(state, "github", consume=False))
        self.assertIsNone(oauth.verify_and_consume_oauth_state(state, "google", consume=False))  # wrong provider
        self.assertIsNone(oauth.verify_and_consume_oauth_state(state[:-2] + "xx", "github", consume=False))  # tampered

    def test_open_redirect_origin_is_ignored(self):
        res = self.client.get("/api/auth/google/start?origin=https://evil.example.com")
        state = _qs(res.headers["location"])["state"][0]
        data = oauth.verify_and_consume_oauth_state(state, "google", consume=False)
        self.assertEqual(data["origin"], VERCEL)  # falls back to the first non-localhost allowlisted origin

    def test_start_unconfigured_redirects_with_error_code(self):
        with patch.dict(os.environ, {"GITHUB_CLIENT_ID": "", "GITHUB_CLIENT_SECRET": ""}):
            res = self.client.get("/api/auth/github/start")
        self.assertEqual(res.status_code, 302)
        self.assertEqual(_qs(res.headers["location"])["oauth_error"][0], "github_not_configured")
        self.assertTrue(res.headers["location"].startswith(VERCEL))

    # ---- callback failure paths ---------------------------------------
    def test_callback_bad_state(self):
        res = self.client.get("/api/auth/google/callback?code=abc&state=garbage")
        self.assertEqual(res.status_code, 302)
        self.assertEqual(_qs(res.headers["location"])["oauth_error"][0], "state_invalid")
        self.assertTrue(res.headers["location"].startswith(VERCEL))  # never localhost in production

    def test_callback_user_denied_returns_to_vercel_login(self):
        state = self._state("github")
        res = self.client.get(f"/api/auth/github/callback?error=access_denied&state={state}")
        self.assertEqual(res.status_code, 302)
        loc = res.headers["location"]
        self.assertTrue(loc.startswith(VERCEL))
        self.assertEqual(_qs(loc)["oauth_error"][0], "github_cancelled")

    def test_callback_missing_env_vars(self):
        state = self._state("google")
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "", "GOOGLE_CLIENT_SECRET": ""}):
            res = self.client.get(f"/api/auth/google/callback?code=abc&state={state}")
        self.assertEqual(_qs(res.headers["location"])["oauth_error"][0], "google_not_configured")

    @patch("httpx.AsyncClient.post")
    def test_google_timeout_is_friendly_redirect(self, mock_post):
        mock_post.side_effect = httpx.ConnectTimeout("boom")
        state = self._state("google")
        res = self.client.get(f"/api/auth/google/callback?code=abc&state={state}")
        self.assertEqual(res.status_code, 302)
        self.assertEqual(_qs(res.headers["location"])["oauth_error"][0], "google_timeout")

    @patch("httpx.AsyncClient.post")
    def test_github_http_200_with_error_body_is_rejected(self, mock_post):
        mock_post.return_value = _resp(200, {"error": "bad_verification_code", "error_description": "expired"})
        state = self._state("github")
        res = self.client.get(f"/api/auth/github/callback?code=abc&state={state}")
        self.assertEqual(_qs(res.headers["location"])["oauth_error"][0], "github_failed")

    def test_state_cannot_be_replayed(self):
        state = self._state("google")
        with patch("httpx.AsyncClient.post", return_value=_resp(400, {"error": "invalid_grant"})):
            self.client.get(f"/api/auth/google/callback?code=abc&state={state}")
            res = self.client.get(f"/api/auth/google/callback?code=abc&state={state}")
        self.assertEqual(_qs(res.headers["location"])["oauth_error"][0], "state_invalid")

    # ---- success, exchange, signed sessions ----------------------------
    @patch("httpx.AsyncClient.get")
    @patch("httpx.AsyncClient.post")
    def test_github_private_email_falls_back_to_noreply_and_never_admin(self, mock_post, mock_get):
        mock_post.return_value = _resp(200, {"access_token": "tok"})
        mock_get.side_effect = [
            _resp(200, {"login": "octo", "name": None, "email": None}),
            _resp(500, {}),  # /user/emails failing must not fail the login
        ]
        state = self._state("github")
        res = self.client.get(f"/api/auth/github/callback?code=abc&state={state}")
        loc = res.headers["location"]
        self.assertTrue(loc.startswith(VERCEL))
        code = _qs(loc)["oauth_code"][0]
        ex = self.client.post("/api/auth/oauth/exchange", json={"code": code})
        self.assertEqual(ex.status_code, 200)
        user = ex.json()["user"]
        self.assertEqual(user["email"], "octo@users.noreply.github.com")
        self.assertEqual(user["username"], "octo")
        self.assertEqual(user["role"], "student")

    @patch("httpx.AsyncClient.get")
    @patch("httpx.AsyncClient.post")
    def test_signed_session_survives_cleared_memory_and_code_is_single_use(self, mock_post, mock_get):
        mock_post.return_value = _resp(200, {"access_token": "tok"})
        mock_get.return_value = _resp(200, {"name": "Priya", "email": "priya@gmail.com", "email_verified": True})
        state = self._state("google")
        res = self.client.get(f"/api/auth/google/callback?code=abc&state={state}")
        code = _qs(res.headers["location"])["oauth_code"][0]

        ex = self.client.post("/api/auth/oauth/exchange", json={"code": code})
        self.assertEqual(ex.status_code, 200)
        token = ex.json()["token"]

        # single-use
        again = self.client.post("/api/auth/oauth/exchange", json={"code": code})
        self.assertEqual(again.status_code, 400)

        # simulate Render sleep / redeploy: all in-memory sessions gone
        oauth._active_sessions.clear()
        me = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], "priya@gmail.com")
        self.assertEqual(me.json()["role"], "student")

        # tampered token is rejected
        bad = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token[:-3]}abc"})
        self.assertEqual(bad.status_code, 401)

        # logout revokes it
        self.client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        oauth._active_sessions.clear()
        gone = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(gone.status_code, 401)

    def test_exchange_with_expired_code_returns_clean_400(self):
        oauth._oauth_one_time_codes["old"] = {
            "session_token": "x", "is_new_user": False,
            "created_at": time.time() - oauth.ONE_TIME_CODE_EXPIRY_SECONDS - 5,
        }
        res = self.client.post("/api/auth/oauth/exchange", json={"code": "old"})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json()["success"])
        self.assertIn("expired", res.json()["message"].lower())

    def test_expired_signed_session_is_rejected(self):
        payload = {"uid": "u", "usr": "n", "eml": "e@x.com", "prv": "google", "exp": int(time.time()) - 10}
        token = oauth.SIGNED_SESSION_PREFIX + oauth._sign_payload("session", payload)
        self.assertIsNone(oauth.verify_signed_session_token(token))

    def test_state_token_cannot_be_used_as_session(self):
        state = oauth.create_oauth_state("google", VERCEL)
        self.assertIsNone(oauth.verify_signed_session_token(oauth.SIGNED_SESSION_PREFIX + state))

    def test_status_endpoint_has_no_secrets(self):
        res = self.client.get("/api/auth/oauth/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["google_configured"] and data["github_configured"])
        self.assertEqual(data["google_redirect_uri"], f"{BACKEND}/api/auth/google/callback")
        self.assertEqual(data["github_redirect_uri"], f"{BACKEND}/api/auth/github/callback")
        self.assertEqual(data["frontend_base_url"], VERCEL)
        blob = str(data)
        for secret in ("gsecret", "ghsecret", "unit-test-secret"):
            self.assertNotIn(secret, blob)


if __name__ == "__main__":
    unittest.main()
