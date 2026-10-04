import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Ensure test env vars
os.environ["FRONTEND_URL"] = "http://localhost:3000,http://localhost:5173"
os.environ["BACKEND_PUBLIC_URL"] = "http://localhost:8000"

from backend.api import app
from backend.oauth import _oauth_states, _active_sessions

class OAuthTestSuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app, follow_redirects=False)
        _oauth_states.clear()
        _active_sessions.clear()

    def test_oauth_urls_unconfigured(self):
        with patch.dict(os.environ, {
            "GOOGLE_CLIENT_ID": "",
            "GOOGLE_CLIENT_SECRET": "",
            "GITHUB_CLIENT_ID": "",
            "GITHUB_CLIENT_SECRET": ""
        }):
            res = self.client.get("/api/auth/oauth-urls")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertFalse(data["google_configured"])
            self.assertFalse(data["github_configured"])
            self.assertIsNone(data["google_url"])
            self.assertIsNone(data["github_url"])

    def test_oauth_urls_configured(self):
        with patch.dict(os.environ, {
            "GOOGLE_CLIENT_ID": "mock-google-id",
            "GOOGLE_CLIENT_SECRET": "mock-google-secret",
            "GITHUB_CLIENT_ID": "mock-github-id",
            "GITHUB_CLIENT_SECRET": "mock-github-secret",
            "BACKEND_PUBLIC_URL": "http://localhost:8000"
        }):
            res = self.client.get("/api/auth/oauth-urls")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["google_configured"])
            self.assertTrue(data["github_configured"])
            self.assertEqual(data["google_url"], "http://localhost:8000/api/auth/google/start")
            self.assertEqual(data["github_url"], "http://localhost:8000/api/auth/github/start")

    def test_google_start_unconfigured(self):
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "", "GOOGLE_CLIENT_SECRET": ""}):
            res = self.client.get("/api/auth/google/start")
            self.assertEqual(res.status_code, 302)
            location = res.headers.get("location", "")
            self.assertIn("#oauth_error=", location)
            self.assertIn("Google+login+is+not+configured+yet", location)

    def test_google_start_configured(self):
        with patch.dict(os.environ, {
            "GOOGLE_CLIENT_ID": "mock-google-id",
            "GOOGLE_CLIENT_SECRET": "mock-google-secret",
            "BACKEND_PUBLIC_URL": "http://localhost:8000"
        }):
            res = self.client.get("/api/auth/google/start", headers={"referer": "http://localhost:5173/login"})
            self.assertEqual(res.status_code, 302)
            location = res.headers.get("location", "")
            self.assertTrue(location.startswith("https://accounts.google.com/o/oauth2/v2/auth"))
            self.assertIn("client_id=mock-google-id", location)
            self.assertIn("redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fauth%2Fgoogle%2Fcallback", location)
            self.assertIn("prompt=select_account", location)
            self.assertIn("state=", location)
            # Verify state was saved
            self.assertEqual(len(_oauth_states), 1)

    def test_google_callback_access_denied(self):
        res = self.client.get("/api/auth/google/callback?error=access_denied")
        self.assertEqual(res.status_code, 302)
        location = res.headers.get("location", "")
        self.assertIn("#oauth_error=", location)
        self.assertIn("Access+denied+by+user", location)

    def test_google_callback_invalid_state(self):
        res = self.client.get("/api/auth/google/callback?code=mock_code&state=fake_state")
        self.assertEqual(res.status_code, 302)
        location = res.headers.get("location", "")
        self.assertIn("#oauth_error=", location)
        self.assertIn("Invalid+or+expired", location)

    @patch("httpx.AsyncClient.get")
    @patch("httpx.AsyncClient.post")
    def test_google_callback_success(self, mock_post, mock_get):
        with patch.dict(os.environ, {
            "GOOGLE_CLIENT_ID": "mock-google-id",
            "GOOGLE_CLIENT_SECRET": "mock-google-secret",
            "BACKEND_PUBLIC_URL": "http://localhost:8000"
        }):
            # Initiate flow to register valid state
            res_start = self.client.get("/api/auth/google/start")
            self.assertEqual(res_start.status_code, 302)
            state_key = list(_oauth_states.keys())[0]

            # Mock token exchange
            mock_token_resp = MagicMock()
            mock_token_resp.status_code = 200
            mock_token_resp.json.return_value = {"access_token": "mock-google-token"}
            mock_post.return_value = mock_token_resp

            # Mock userinfo
            mock_userinfo_resp = MagicMock()
            mock_userinfo_resp.status_code = 200
            mock_userinfo_resp.json.return_value = {
                "name": "Priyanka Real",
                "email": "priyanka.real@gmail.com",
                "email_verified": True
            }
            mock_get.return_value = mock_userinfo_resp

            # Execute callback
            res_cb = self.client.get(f"/api/auth/google/callback?code=test_code&state={state_key}")
            self.assertEqual(res_cb.status_code, 302)
            location = res_cb.headers.get("location", "")
            self.assertIn("#oauth_token=", location)

            # Extract token and verify session
            token = location.split("#oauth_token=")[-1].split("&")[0]
            self.assertIn(token, _active_sessions)
            session = _active_sessions[token]
            self.assertEqual(session.username, "Priyanka Real")
            self.assertEqual(session.email, "priyanka.real@gmail.com")
            self.assertEqual(session.role, "student")  # Always student
            self.assertEqual(session.auth_provider, "google")

            # Verify /api/auth/me works with this Bearer token
            me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(me_res.status_code, 200)
            me_data = me_res.json()
            self.assertEqual(me_data["username"], "Priyanka Real")
            self.assertEqual(me_data["email"], "priyanka.real@gmail.com")
            self.assertEqual(me_data["role"], "student")

    def test_github_start_unconfigured(self):
        with patch.dict(os.environ, {"GITHUB_CLIENT_ID": "", "GITHUB_CLIENT_SECRET": ""}):
            res = self.client.get("/api/auth/github/start")
            self.assertEqual(res.status_code, 302)
            location = res.headers.get("location", "")
            self.assertIn("#oauth_error=", location)
            self.assertIn("GitHub+login+is+not+configured+yet", location)

    def test_github_start_configured(self):
        with patch.dict(os.environ, {
            "GITHUB_CLIENT_ID": "mock-github-id",
            "GITHUB_CLIENT_SECRET": "mock-github-secret",
            "BACKEND_PUBLIC_URL": "http://localhost:8000"
        }):
            res = self.client.get("/api/auth/github/start")
            self.assertEqual(res.status_code, 302)
            location = res.headers.get("location", "")
            self.assertTrue(location.startswith("https://github.com/login/oauth/authorize"))
            self.assertIn("client_id=mock-github-id", location)
            self.assertIn("redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fauth%2Fgithub%2Fcallback", location)
            self.assertIn("state=", location)

    @patch("httpx.AsyncClient.get")
    @patch("httpx.AsyncClient.post")
    def test_github_callback_success(self, mock_post, mock_get):
        with patch.dict(os.environ, {
            "GITHUB_CLIENT_ID": "mock-github-id",
            "GITHUB_CLIENT_SECRET": "mock-github-secret",
            "BACKEND_PUBLIC_URL": "http://localhost:8000"
        }):
            res_start = self.client.get("/api/auth/github/start")
            self.assertEqual(res_start.status_code, 302)
            state_key = list(_oauth_states.keys())[0]

            # Mock token exchange
            mock_token_resp = MagicMock()
            mock_token_resp.status_code = 200
            mock_token_resp.json.return_value = {"access_token": "mock-github-token"}
            mock_post.return_value = mock_token_resp

            # Mock user profile without public email
            mock_user_resp = MagicMock()
            mock_user_resp.status_code = 200
            mock_user_resp.json.return_value = {
                "login": "priyankagithub",
                "name": "Priyanka Developer",
                "email": None
            }

            # Mock /user/emails
            mock_emails_resp = MagicMock()
            mock_emails_resp.status_code = 200
            mock_emails_resp.json.return_value = [
                {"email": "unverified@example.com", "primary": False, "verified": False},
                {"email": "developer@github.com", "primary": True, "verified": True}
            ]

            mock_get.side_effect = [mock_user_resp, mock_emails_resp]

            res_cb = self.client.get(f"/api/auth/github/callback?code=test_code&state={state_key}")
            self.assertEqual(res_cb.status_code, 302)
            location = res_cb.headers.get("location", "")
            self.assertIn("#oauth_token=", location)

            token = location.split("#oauth_token=")[-1].split("&")[0]
            session = _active_sessions[token]
            self.assertEqual(session.username, "Priyanka Developer")
            self.assertEqual(session.email, "developer@github.com")
            self.assertEqual(session.role, "student")
            self.assertEqual(session.auth_provider, "github")

    def test_auth_me_unauthenticated(self):
        res = self.client.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)

if __name__ == "__main__":
    unittest.main()
