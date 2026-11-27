import sys
import unittest
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from unittest.mock import patch

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient  # noqa: E402
from backend.api import app  # noqa: E402
from backend.owner_profile import is_owner_user  # noqa: E402
from backend.gemini_engine import generate_smart_fallback_reply, _resolve_verified_honorific  # noqa: E402


class TestConcurrencyAndRoleSecurity(unittest.TestCase):
    """Verifies 50 simultaneous client sessions behind one NAT IP + strict owner isolation."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_strict_owner_identity_only_primary_gmail(self):
        self.assertTrue(is_owner_user(email="dileepbommali16@gmail.com"))
        self.assertTrue(is_owner_user(email="  DILEEPBOMMALI16@GMAIL.COM  "))
        self.assertFalse(is_owner_user(email="dileep@pathfinder.ai"))
        self.assertFalse(is_owner_user(email="dileepbommali2005@gmail.com"))
        self.assertFalse(is_owner_user(email="priyankabommali2@gmail.com"))
        self.assertFalse(is_owner_user(username="dileep"))
        self.assertFalse(is_owner_user(username="Dileep Bommali"))

        # Spoofed honorific="boss" for non-owner MUST be downgraded
        self.assertEqual(
            _resolve_verified_honorific(
                page_context={"honorific": "boss", "userEmail": "friend_dileep@gmail.com"}
            ),
            "Sir",
        )
        self.assertEqual(
            _resolve_verified_honorific(
                page_context={"honorific": "madam", "userEmail": "priyankabommali2@gmail.com"}
            ),
            "Madam",
        )
        self.assertEqual(
            _resolve_verified_honorific(
                page_context={"honorific": "sir", "userEmail": "dileepbommali16@gmail.com"}
            ),
            "Boss",
        )
        # Guest account MUST resolve to Guest (never Boss) and remember introduced name permanently
        self.assertEqual(
            _resolve_verified_honorific(
                page_context={"honorific": "Madam", "userEmail": "guest@pathfinder.ai", "userName": "Guest Student"}
            ),
            "Guest",
        )
        guest_hi_1 = generate_smart_fallback_reply(
            "hi baby",
            history=[],
            page_context={"userEmail": "guest@pathfinder.ai", "userName": "Guest Student", "honorific": "Madam"},
        )
        self.assertEqual(guest_hi_1, "Hi! Welcome to Pathfinder! May I know your name?")
        guest_hi_after_name = generate_smart_fallback_reply(
            "hi",
            history=[
                {"role": "assistant", "content": guest_hi_1},
                {"role": "user", "content": "My name is Deepika"},
            ],
            page_context={"userEmail": "guest@pathfinder.ai", "userName": "Guest Student"},
        )
        self.assertEqual(guest_hi_after_name, "Hi Deepika, I'm right here!")

    def test_screen_monitor_and_builder_encyclopedia_answers(self):
        monitor_reply = generate_smart_fallback_reply(
            "which slide am i on and what project am i looking at?",
            active_tab="projects",
            page_context={
                "userName": "indala gayatri",
                "userEmail": "priyankabommali2@gmail.com",
                "honorific": "Madam",
                "activeProject": "Multi-Agent Regulatory Document Research Engine (RAG)",
            },
        )
        self.assertIn("Madam", monitor_reply)
        self.assertIn("projects", monitor_reply.lower())
        self.assertIn("Multi-Agent Regulatory Document Research Engine", monitor_reply)

        builder_reply = generate_smart_fallback_reply(
            "After problem statement what next step should I do to build? "
            "Antigravity vs Cursor vs Claude Code, VS Code folder structure for LLM and RAG, "
            "how to deploy on Vercel Render Cloudflare, best image and video generation tools, "
            "and ChatGPT vs Gemini AI vs Claude AI",
            active_tab="projects",
            page_context={"userEmail": "friend@gmail.com", "honorific": "Sir"},
        )
        for keyword in (
            "Antigravity",
            "Cursor",
            "Claude Code",
            "rag_pipeline.py",
            "Vercel",
            "Render",
            "Cloudflare",
            "Imagen",
            "Veo",
            "ChatGPT",
            "Gemini AI",
            "Claude AI",
        ):
            self.assertIn(keyword, builder_reply)
        self.assertNotIn("Boss", builder_reply)

    def test_50_concurrent_clients_behind_shared_nat_ip(self):
        """Simulate 50 friends logging in, saving profiles, predicting readiness, and chatting at once."""

        def run_single_client(idx: int):
            sid = f"load-session-{idx}"
            headers = {
                "X-Session-ID": sid,
                "X-Forwarded-For": "203.0.113.50",
            }
            is_female = idx % 2 == 0
            email = f"student{idx}@example.com"
            name = f"Priya Student {idx}" if is_female else f"Arjun Student {idx}"
            honorific = "Madam" if is_female else "Sir"

            r_login = self.client.post(
                "/api/auth/login",
                headers=headers,
                json={"username": name, "email": email},
            )
            if r_login.status_code != 200:
                return f"login {idx} -> {r_login.status_code}: {r_login.text}"
            login_data = r_login.json()
            token = login_data.get("token")
            session_user_id = login_data.get("user", {}).get("user_id", f"load_user_{idx}")
            if token:
                headers["Authorization"] = f"Bearer {token}"

            r_prof = self.client.post(
                "/api/profile",
                headers=headers,
                json={
                    "user_id": session_user_id,
                    "username": name,
                    "email": email,
                    "full_name": name,
                    "branch": "CSE" if idx % 3 == 0 else "AIML",
                    "cgpa": round(6.8 + (idx % 10) * 0.25, 2),
                    "active_backlogs": 0,
                    "internships": idx % 3,
                    "coding": 7,
                    "communication": 7,
                    "target_role": "Software Development Engineer (SDE)",
                },
            )
            if r_prof.status_code != 200:
                return f"profile {idx} -> {r_prof.status_code}: {r_prof.text}"

            r_pred = self.client.post(
                "/api/predict",
                headers=headers,
                json={
                    "branch": "CSE",
                    "cgpa": 8.2,
                    "backlogs": 0,
                    "internships": 1,
                    "coding": 7,
                    "communication": 7,
                },
            )
            if r_pred.status_code != 200:
                return f"predict {idx} -> {r_pred.status_code}: {r_pred.text}"

            r_chat = self.client.post(
                "/api/chat",
                headers=headers,
                json={
                    "message": "After blueprint problem statement, how do I build RAG in VS Code and deploy on Vercel and Render?",
                    "active_tab": "projects",
                    "page_context": {
                        "userName": name,
                        "userEmail": email,
                        "honorific": honorific,
                    },
                },
            )
            if r_chat.status_code != 200:
                return f"chat {idx} -> {r_chat.status_code}: {r_chat.text}"
            reply = r_chat.json().get("reply", "")
            if "Vercel" not in reply or "Antigravity" not in reply:
                return f"chat {idx} missing builder content"
            return None

        # Avoid external Gemini network latency/429 during local load benchmark while exercising full FastAPI pipeline
        with patch("backend.gemini_engine.os.getenv", side_effect=lambda k, d="": "" if k in ("GEMINI_API_KEY", "OPENROUTER_API_KEY") else d):
            errors = []
            with ThreadPoolExecutor(max_workers=50) as pool:
                futures = [pool.submit(run_single_client, i) for i in range(50)]
                for fut in as_completed(futures):
                    res = fut.result()
                    if res:
                        errors.append(res)

        self.assertEqual(errors, [], f"Concurrency errors occurred: {errors[:5]}")

    def test_first_vs_repeat_greeting_and_active_model_priority(self):
        from backend.gemini_engine import PREFERRED_MODELS_ORDER

        self.assertNotIn("gemini-2.0-flash", PREFERRED_MODELS_ORDER)
        self.assertEqual(PREFERRED_MODELS_ORDER[0], "gemini-3.1-flash-lite")
        self.assertIn("gemini-3-flash-preview", PREFERRED_MODELS_ORDER[:3])

        boss_ctx = {"userEmail": "dileepbommali16@gmail.com", "honorific": "Boss"}
        first_hi = generate_smart_fallback_reply("hi", history=[], page_context=boss_ctx)
        self.assertEqual(first_hi, "Hi Boss! What's up?")

        repeat_hi = generate_smart_fallback_reply(
            "hi",
            history=[{"role": "user", "content": "hi"}, {"role": "assistant", "content": first_hi}],
            page_context=boss_ctx,
        )
        self.assertNotIn("What's up", repeat_hi)
        self.assertNotIn("co-pilot", repeat_hi.lower())

    def test_multi_turn_fallback_history_and_chunked_pcm_frames(self):
        import asyncio
        import base64
        from starlette.websockets import WebSocketState
        from backend.gemini_engine import prepare_chat_context
        from backend.agent.live_proxy import _send_chunked_pcm_b64, _WS_PCM_CHUNK_BYTES

        # Non-dict / list profile must never raise AttributeError on Turn 3+ fallback
        invalid_profile = [{"unexpected": "list"}]
        self.assertEqual(
            _resolve_verified_honorific(profile=invalid_profile, page_context={"honorific": "Sir", "userEmail": "friend@test.com"}),
            "Sir",
        )
        sys_prompt, contents, _, clean_msg, _ = prepare_chat_context(
            message="What is binary search?",
            history=[
                {"role": "user", "content": "Hi"},
                {"role": "assistant", "content": "Hi Sir! What's up?"},
                {"role": "user", "content": "My college name?"},
                {"role": "assistant", "content": "DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli."},
            ],
            profile=invalid_profile,  # type: ignore[arg-type]
            active_tab="overview",
            page_context={"honorific": "Sir", "userEmail": "friend@test.com"},
        )
        self.assertIn("DR RVR NRI DEEMED TO BE UNIVERSITY", sys_prompt)
        self.assertEqual(clean_msg, "What is binary search?")
        self.assertGreaterEqual(len(contents), 5)

        fallback_invalid_profile = generate_smart_fallback_reply(
            message="Give one placement tip",
            history=[{"role": "user", "content": "hi"}],
            profile=invalid_profile,  # type: ignore[arg-type]
            page_context={"honorific": "Madam", "userEmail": "friend2@test.com"},
        )
        self.assertTrue(bool(fallback_invalid_profile.strip()))

        # Large >1MB PCM payload must be split cleanly into bounded WebSocket frames (<100KB)
        class _DummyWS:
            client_state = WebSocketState.CONNECTED

            def __init__(self):
                self.frames = []

            async def send_json(self, data):
                self.frames.append(data)

        dummy_ws = _DummyWS()
        large_pcm = b"\x01\x02" * (_WS_PCM_CHUNK_BYTES * 3)  # ~144KB raw -> multiple chunks
        large_b64 = base64.b64encode(large_pcm).decode("utf-8")
        chunks = asyncio.run(_send_chunked_pcm_b64(dummy_ws, large_b64, 24000, turn_id=3, client_turn_id=5))
        self.assertGreaterEqual(chunks, 3)
        self.assertEqual(len(dummy_ws.frames), chunks)
        for frame in dummy_ws.frames:
            self.assertEqual(frame["type"], "audio")
            self.assertEqual(frame["turn_id"], 3)
            self.assertEqual(frame["client_turn_id"], 5)
            self.assertLessEqual(len(frame["pcm_base64"]), 40000)


if __name__ == "__main__":
    unittest.main()
