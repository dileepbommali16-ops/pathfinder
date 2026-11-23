import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.api import app

class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data.get("status"), ["healthy", "operational", "ok", "online"])

    def test_predict_endpoint(self):
        payload = {
            "cgpa": 8.5,
            "branch": "CSE",
            "backlogs": 0,
            "internships": 1,
            "communication": 8.0,
            "coding": 8.5
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("chance", data)
        self.assertIn("label", data)

    def test_cohort_endpoint(self):
        response = self.client.get("/api/cohort?year=2026&branch=CSE")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(isinstance(data, dict))

    def test_defense_evaluation_scores_zero_on_non_answer(self):
        payload = {
            "question_id": "def-1",
            "category": "Architecture",
            "question": "Why did you choose a decoupled REST architecture instead of a monolith?",
            "context": "Evaluates architectural trade-offs and network latency.",
            "key_concepts": ["service boundary", "network latency", "independent scaling"],
            "reference_answer": "Tailored architecture model answer.",
            "candidate_answer": "i dont know next question",
        }
        response = self.client.post("/api/ai/evaluate-defense", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["score"], 0)
        self.assertEqual(data["strengths"], [])
        self.assertTrue(data["is_non_answer"])
        self.assertIn("Tailored architecture model answer.", data["model_answer"])

    def test_interview_evaluation_scores_zero_on_non_answer(self):
        payload = {
            "question_id": "rzp-1",
            "company": "Razorpay",
            "role": "Full Stack Engineer",
            "round_type": "Technical & Algorithms",
            "difficulty": "Hard",
            "question": "How do you prevent double-charging on webhook retries?",
            "context_hint": "Focus on idempotency and distributed locks.",
            "key_concepts": ["Idempotency Key", "Distributed Locking"],
            "ideal_keywords": ["idempotency", "redis lock", "atomic transaction"],
            "benchmark_answer": "Use idempotency keys and database unique constraints.",
            "candidate_answer": "i dont know next question",
        }
        response = self.client.post("/api/ai/evaluate-interview", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["overall_score"], 0)
        self.assertEqual(data["technical_precision"], 0)
        self.assertEqual(data["matched_keywords"], [])
        self.assertTrue(data["is_non_answer"])

    def test_defense_evaluation_substantive_answer(self):
        payload = {
            "question_id": "def-2",
            "category": "Database & Scale",
            "question": "What happens if your application experiences a 10x spike in concurrent requests?",
            "context": "Tests connection pooling, read-replicas, caching with Redis, and indexing.",
            "key_concepts": ["connection pool", "read replica", "redis cache", "database index"],
            "reference_answer": "Tailored scaling model answer.",
            "candidate_answer": (
                "Under a 10x spike, the primary database connection pool saturates first, increasing tail latency. "
                "We mitigate this with PgBouncer connection pooling, caching hot read endpoints in Redis with 15ms p99 targets, "
                "and routing heavy reads to a read replica backed by composite database index tuning."
            ),
        }
        response = self.client.post("/api/ai/evaluate-defense", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["is_non_answer"])
        self.assertGreater(data["score"], 50)
        self.assertTrue(len(data["strengths"]) > 0)

    def test_profile_persists_linkedin_url(self):
        test_email = "test-linkedin-persist@example.com"
        payload = {
            "email": test_email,
            "full_name": "Bommali Dileep",
            "branch": "CSE",
            "cgpa": 8.6,
            "linkedin_url": "https://linkedin.com/in/dileep-test",
            "coding_profiles": {
                "github": "https://github.com/dileep-test",
                "leetcode": "https://leetcode.com/dileep-test",
                "linkedin": "https://linkedin.com/in/dileep-test",
            },
        }
        post_resp = self.client.post("/api/profile", json=payload)
        self.assertEqual(post_resp.status_code, 200)
        get_resp = self.client.get(f"/api/profile?email={test_email}")
        self.assertEqual(get_resp.status_code, 200)
        saved = get_resp.json()
        self.assertEqual(saved.get("coding_profiles", {}).get("linkedin"), "https://linkedin.com/in/dileep-test")
        self.assertEqual(saved.get("linkedin_url"), "https://linkedin.com/in/dileep-test")

    def test_resume_audit_weak_streamlit_resume(self):
        weak_resume = (
            "Candidate Name\nB.Tech CSE Student\n"
            "Skills: Python, Pandas, Streamlit, HTML\n"
            "Projects:\n"
            "1. Iris Flower Classifier built a basic app using Streamlit.\n"
            "2. Movie Recommendation System mini-project in Streamlit.\n"
            "3. Handwritten Digit Classifier built in Streamlit dashboard.\n"
        )
        resp = self.client.post("/api/ai/resume", data={"resume_text": weak_resume})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertLess(data["score"], 50)
        self.assertTrue(len(data.get("improvements", [])) > 0)
        self.assertTrue(len(data.get("missing_skills", [])) > 0)
        self.assertTrue(len(data.get("recommended_certifications", [])) > 0)
        self.assertTrue(len(data.get("project_upgrade_plan", [])) > 0)
        self.assertTrue(len(data.get("rewritten_bullets", [])) > 0)
        self.assertTrue(len(data.get("ats_keywords", [])) > 0)
        self.assertTrue(len(data.get("formatting_tips", [])) > 0)
        companies = [c.get("company") for c in data.get("company_matches", [])]
        self.assertGreater(len(companies), 0)
        self.assertEqual(companies[0], "Deloitte")

    def test_resume_audit_pdf_export(self):
        audit_resp = self.client.post(
            "/api/ai/resume",
            data={
                "resume_text": "Python & SQL developer. Built 3 Streamlit mini-projects (<basic>).",
            },
        )
        self.assertEqual(audit_resp.status_code, 200)
        payload = audit_resp.json()
        pdf_resp = self.client.post("/api/export/resume-pdf", json=payload)
        self.assertEqual(pdf_resp.status_code, 200)
        self.assertIn("application/pdf", pdf_resp.headers.get("content-type", ""))
        self.assertTrue(pdf_resp.content.startswith(b"%PDF-"))

    def test_calibrated_predict_prevents_unverified_inflation(self):
        payload = {
            "cgpa": 7.8,
            "branch": "CSE",
            "backlogs": 0,
            "internships": 10,
            "communication": 9.0,
            "coding": 9.0,
            "github_url": "",
            "leetcode_url": "",
            "skills": [],
            "certifications": [],
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertLess(data["chance"], 70)
        priorities_joined = " ".join(data.get("priorities", [])).lower()
        strengths_joined = " ".join(data.get("strengths", [])).lower()
        self.assertTrue(len(data.get("priorities", [])) > 0)
        self.assertNotIn("exceptional practical experience", strengths_joined)
        self.assertTrue("github" in priorities_joined or "unverified" in priorities_joined)

    def test_github_target_parser_and_endpoint_validation(self):
        from backend.routers.github_router import parse_github_target

        self.assertEqual(
            parse_github_target("https://github.com/dileepbommali/small-project"),
            ("repo", "dileepbommali", "small-project"),
        )
        self.assertEqual(
            parse_github_target("https://github.com/torvalds"),
            ("profile", "torvalds", None),
        )
        self.assertEqual(parse_github_target("@priyanka"), ("profile", "priyanka", None))

        bad_resp = self.client.post("/api/verify-github", json={"url_or_username": ""})
        self.assertEqual(bad_resp.status_code, 400)

    def test_madam_honorific_in_chat_and_persona(self):
        from backend.gemini_engine import prepare_chat_context
        from backend.agent.live_proxy import get_das_system_instruction

        sys_instruction, _, _, _, _ = prepare_chat_context(
            message="How do I improve my placement score?",
            page_context={"honorific": "Madam", "activeTab": "overview"},
        )
        self.assertIn("Madam", sys_instruction)
        self.assertNotIn("Address her as 'Boss'", sys_instruction)

        live_prompt = get_das_system_instruction("madam")
        self.assertIn("Madam", live_prompt)
        self.assertIn("STRICT PUCK VOICE PERSONA LOCK", live_prompt)
        self.assertIn("ZERO SYCOPHANCY", live_prompt)
        self.assertIn("NEVER imitate a female voice", live_prompt)

    def test_vision_tool_camera_frame_schema_and_anti_sycophancy(self):
        from backend.agent.live_proxy import DAS_TOOLS
        from backend.gemini_engine import SYSTEM_INSTRUCTION

        tool_names = [fn.name for t in DAS_TOOLS for fn in (t.function_declarations or [])]
        self.assertNotIn("inspect_live_camera_frame", tool_names)
        self.assertIn("ZERO SYCOPHANCY", SYSTEM_INSTRUCTION)

    def test_strong_vs_weak_resume_audit_no_index_error(self):
        strong_resume = (
            "Dileep Bommali | dileep@example.com | github.com/dileep | linkedin.com/in/dileep\n"
            "EDUCATION: B.Tech CSE (Data Science), DR RVR NRI DEEMED TO BE UNIVERSITY, CGPA: 8.9/10\n"
            "SKILLS: Python, Java, C++, FastAPI, React, TypeScript, PostgreSQL, Docker, AWS, CI/CD, PyTest, Git, System Design, DSA\n"
            "EXPERIENCE: SDE Intern — Accomplished 42% latency reduction as measured by p95 Prometheus metrics by engineering Redis caching & async FastAPI microservices handling 2,400 RPS.\n"
            "PROJECTS: Pathfinder 2.0 — Built full-stack AI placement intelligence platform serving 972 records with 88% Random Forest accuracy, PostgreSQL, Docker & GitHub Actions CI/CD.\n"
            "CERTIFICATIONS: AWS Certified Solutions Architect, Azure AZ-900"
        )
        r_strong = self.client.post("/api/ai/resume", data={"resume_text": strong_resume})
        self.assertEqual(r_strong.status_code, 200, r_strong.text)
        r_weak = self.client.post("/api/ai/resume", data={"resume_text": "Name: Student. Know basic C."})
        self.assertEqual(r_weak.status_code, 200, r_weak.text)
        self.assertGreater(r_strong.json()["score"], r_weak.json()["score"] + 25)

    def test_no_puck_exposed_in_agent_status(self):
        resp = self.client.get("/agent/status")
        self.assertEqual(resp.status_code, 200)
        body = resp.text.lower()
        self.assertNotIn("puck", body)
        self.assertIn("das neural", body)

    def test_skill_gap_returns_named_skills(self):
        resp = self.client.post("/api/skill-gap", json={"cgpa": 7.8, "skills": ["Python"], "target_role": "SDE"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        gaps = data.get("gap_analysis") or []
        self.assertGreater(len(gaps), 0)
        for gap in gaps:
            self.assertTrue((gap.get("skill") or "").strip(), f"Empty skill in gap item: {gap}")
            self.assertGreater(float(gap.get("placement_rate", 0)), 0)
            self.assertTrue((gap.get("recommendation") or "").strip())

    def test_relogin_deterministic_user_id_and_db_auto_close(self):
        from backend.database import get_db_connection

        # SQLite connection must close automatically when leaving `with` block
        conn = get_db_connection()
        with conn as db:
            db.execute("SELECT 1").fetchone()
        import sqlite3
        with self.assertRaises(sqlite3.ProgrammingError):
            conn.execute("SELECT 1")

        # Returning user login gets identical user_id so saving profile never 403s
        email = "relogin.student@example.com"
        with patch("backend.database.cloud_get_profile_by_identifier") as mock_cloud_lookup:
            r1 = self.client.post("/api/auth/login", json={"username": "Student Test", "email": email})
            mock_cloud_lookup.assert_not_called()
        self.assertEqual(r1.status_code, 200)
        d1 = r1.json()
        p1 = self.client.post(
            "/api/profile",
            headers={"Authorization": f"Bearer {d1['token']}"},
            json={"email": email, "full_name": "Student Test", "branch": "AIML", "cgpa": 8.4, "skills": ["Python", "Docker"]},
        )
        self.assertEqual(p1.status_code, 200)

        r2 = self.client.post("/api/auth/login", json={"username": "Student Test", "email": email})
        self.assertEqual(r2.status_code, 200)
        d2 = r2.json()
        self.assertEqual(d1["user"]["user_id"], d2["user"]["user_id"])

        p2 = self.client.post(
            "/api/profile",
            headers={"Authorization": f"Bearer {d2['token']}"},
            json={
                "user_id": d1["user"]["user_id"],
                "email": email,
                "full_name": "Student Test",
                "branch": "CSE",
                "cgpa": 8.9,
                "skills": ["Python", "Docker", "Kubernetes"],
            },
        )
        self.assertEqual(p2.status_code, 200)
        self.assertEqual(p2.json()["cgpa"], 8.9)

    def test_das_unrestricted_general_knowledge_prompt_and_fallback(self):
        from backend.agent.live_proxy import get_das_system_instruction
        from backend.gemini_engine import generate_smart_fallback_reply

        live_prompt = get_das_system_instruction("madam")
        self.assertIn("Vangaveeti Mohana Ranga", live_prompt)
        self.assertIn("UNRESTRICTED GENERAL KNOWLEDGE", live_prompt)

        fallback_reply = generate_smart_fallback_reply(
            "who is vangaveeti mohana ranga?",
            active_tab="overview",
            page_context={"honorific": "Madam", "userEmail": "priyankabommali2@gmail.com"},
        )
        self.assertNotIn("strictly limited", fallback_reply.lower())
        self.assertNotIn("28 project blueprints", fallback_reply.lower())

    def test_rag_search_endpoint_returns_results(self):
        resp = self.client.post("/api/rag/search", json={"query": "CSE distributed cloud", "top_k": 3})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("count"), 3)
        self.assertEqual(len(data.get("results", [])), 3)

    def test_supabase_cloud_hydration_and_health_status(self):
        from unittest.mock import patch
        from backend.database import get_user_profile_by_id, delete_user_profile

        fake_uid = "usr_cloud_hydrate_test"
        delete_user_profile(fake_uid)
        cloud_payload = {
            "user_id": fake_uid,
            "email": "cloud.hydrate@example.com",
            "full_name": "Cloud Student",
            "branch": "CSE",
            "cgpa": 9.2,
            "onboarding_completed": True,
        }
        with patch("backend.database.cloud_get_profile_by_id", return_value=cloud_payload) as mock_get:
            loaded = get_user_profile_by_id(fake_uid)
            self.assertIsNotNone(loaded)
            self.assertEqual(loaded["cgpa"], 9.2)
            mock_get.assert_called_once_with(fake_uid)
            # Second read hits local SQLite cache without repeating cloud query
            cached = get_user_profile_by_id(fake_uid)
            self.assertEqual(cached["cgpa"], 9.2)
            mock_get.assert_called_once()
        delete_user_profile(fake_uid)

        health = self.client.get("/api/health").json()
        self.assertIn("database_cloud", health)
        self.assertEqual(health["database_cloud"]["engine"], "supabase_postgres_pgvector")

    def test_puck_voice_lock_and_camel_case_speech_config(self):
        from backend.agent.puck_voice import LIVE_MODEL, create_gemini_live_config
        from backend.agent.live_proxy import get_das_system_instruction
        from google import genai
        from google.genai import _live_converters

        self.assertEqual(LIVE_MODEL, "gemini-3.8-live")
        self.assertIn("STRICT PUCK VOICE PERSONA LOCK", get_das_system_instruction("boss"))

        client = genai.Client(api_key="test_key", http_options={"api_version": "v1beta"})
        cfg = create_gemini_live_config("Test prompt", [])
        parent = {}
        _live_converters._LiveConnectConfig_to_mldev(client._api_client, cfg.model_dump(exclude_none=True), parent)
        speech_cfg = parent.get("setup", {}).get("generationConfig", {}).get("speechConfig", {})
        self.assertEqual(
            speech_cfg,
            {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Puck"}}},
        )

        import inspect
        import backend.routers.voice_routes as vr

        vr_src = inspect.getsource(vr)
        self.assertNotIn("gemini-2.5-flash-preview-tts", vr_src)
        self.assertIn("gemini-3.8-live", vr_src)
        self.assertIn("generation_complete", vr_src)
        self.assertIn("_TTS_INFLIGHT", vr_src)

    def test_voice_tts_dedups_inflight_concurrent_requests(self):
        import asyncio
        from unittest.mock import AsyncMock, patch
        import backend.routers.voice_routes as vr

        calls = 0

        async def fake_synth(text: str):
            nonlocal calls
            calls += 1
            await asyncio.sleep(0.05)
            return {"pcm_base64": "AAAA", "sample_rate": 24000, "voice": "Puck"}

        vr._TTS_PCM_CACHE.clear()
        vr._TTS_INFLIGHT.clear()

        async def _run_concurrent():
            with patch.object(vr, "_synthesize_puck_via_38_live_unlocked", side_effect=fake_synth):
                return await asyncio.gather(
                    vr.voice_tts({"text": "Idempotency concurrent test", "voice": "Puck"}, None),
                    vr.voice_tts({"text": "Idempotency concurrent test", "voice": "Puck"}, None),
                )

        r1, r2 = asyncio.run(_run_concurrent())
        self.assertEqual(calls, 1)
        self.assertEqual(r1["status"], "ok")
        self.assertEqual(r2["status"], "ok")
        self.assertEqual(r1["pcm_base64"], "AAAA")
        self.assertEqual(r2["pcm_base64"], "AAAA")

    def test_wav_riff_parser_strips_trailing_c2pa_and_stranger_ws_lock(self):
        import struct
        import backend.routers.voice_routes as vr
        from backend.agent.live_proxy import get_das_system_instruction

        pcm_payload = b"\x10\x00\x20\x00" * 120  # 480 bytes clean 16-bit PCM
        c2pa_payload = b"SynthID C2PA BUZZ DATA" * 10
        fmt_body = struct.pack("<HHIIHH", 1, 1, 24000, 48000, 2, 16)
        fmt_chunk = b"fmt " + struct.pack("<I", len(fmt_body)) + fmt_body
        data_chunk = b"data" + struct.pack("<I", len(pcm_payload)) + pcm_payload
        c2pa_chunk = b"C2PA" + struct.pack("<I", len(c2pa_payload)) + c2pa_payload
        riff_body = b"WAVE" + fmt_chunk + data_chunk + c2pa_chunk
        wav_with_c2pa = b"RIFF" + struct.pack("<I", len(riff_body)) + riff_body

        stripped, sr = vr._strip_wav_header_if_present(wav_with_c2pa)
        self.assertEqual(sr, 24000)
        self.assertEqual(stripped, pcm_payload)
        self.assertNotIn(b"C2PA", stripped)
        self.assertNotIn(b"SynthID", stripped)

        stranger_prompt = get_das_system_instruction("stranger")
        self.assertIn("Stranger Mode", stranger_prompt)
        self.assertIn("Hi stranger, tell your name first!", stranger_prompt)
        self.assertIn("NEVER call them 'Boss'", stranger_prompt)

    def test_on_demand_multiuser_live_proxy_and_wav_fallback(self):
        import inspect
        import backend.agent.live_proxy as lp

        wav = lp._pcm16_to_wav_bytes(b"\x01\x02" * 160, sample_rate=16000)
        self.assertEqual(wav[:4], b"RIFF")
        self.assertEqual(wav[8:12], b"WAVE")
        self.assertEqual(int.from_bytes(wav[24:28], "little"), 16000)
        self.assertEqual(len(wav), 44 + 320)

        lp_src = inspect.getsource(lp.das_multimodal_live_ws)
        self.assertIn("ensure_live_session", lp_src)
        self.assertIn("_deliver_fallback_audio_turn", lp_src)
        self.assertIn("generation_complete", lp_src)
        self.assertIn("idle_reaper_loop", lp_src)
        # Immediate ONLINE status must be sent before opening an upstream Live connection
        self.assertLess(lp_src.find('"status": "connected"'), lp_src.find("client.aio.live.connect"))

    def test_compiler_engine_zero_local_subprocess_and_sqlite_authorizer(self):
        import asyncio
        import inspect
        from unittest.mock import AsyncMock, MagicMock, patch
        import backend.compiler_engine as ce

        src = inspect.getsource(ce)
        self.assertNotIn("subprocess", src)

        oversized = asyncio.run(ce.execute_code_live("python", "a" * 70000))
        self.assertFalse(oversized["success"])
        self.assertEqual(oversized["engine"], "security-guard")

        attach_res = asyncio.run(ce.execute_code_live("sql", "ATTACH DATABASE 'pathfinder.db' AS stolen;"))
        self.assertFalse(attach_res["success"])
        self.assertIn("not authorized", attach_res["output"].lower())

        good_sql = asyncio.run(
            ce.execute_code_live(
                "sql",
                "CREATE TABLE t(x INT); INSERT INTO t VALUES (42); SELECT x FROM t;",
            )
        )
        self.assertTrue(good_sql["success"])
        self.assertIn("42", good_sql["output"])

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "code": 0,
            "stdout": [{"text": "sandboxed-only-ok"}],
            "stderr": [],
            "buildResult": {"stderr": []},
        }
        mock_post = AsyncMock(return_value=mock_resp)
        with patch("httpx.AsyncClient.post", mock_post):
            py_res = asyncio.run(ce.execute_code_live("python", "import os; print(os.environ)"))
        self.assertTrue(py_res["success"])
        self.assertEqual(py_res["engine"], "godbolt-python311")
        self.assertIn("sandboxed-only-ok", py_res["output"])
        mock_post.assert_called_once()

    def test_online_compiler_coding_studio_tool_declarations(self):
        from backend.agent.live_proxy import DAS_TOOLS

        fn_map = {fn.name: fn for t in DAS_TOOLS for fn in (t.function_declarations or [])}
        self.assertIn("coding_studio_control", fn_map)
        self.assertIn("write_and_compile_code", fn_map)

        for removed_tool in (
            "gmail_workspace_control",
            "whatsapp_message_control",
            "chrome_browser_control",
            "programiz_compiler",
            "vscode_control",
            "run_google_automation",
        ):
            self.assertNotIn(removed_tool, fn_map)

        code_desc = fn_map["coding_studio_control"].parameters.properties["action"].description
        for act in ("open", "switch_language", "write_code", "read_code", "delete_code", "run_code", "stop_code", "get_output", "close"):
            self.assertIn(act, code_desc)

        self.assertIn("update_student_profile", fn_map)
        upd_props = fn_map["update_student_profile"].parameters.properties
        self.assertIn("field", upd_props)
        self.assertIn("value", upd_props)

    def test_compiler_routing_all_11_languages_and_rust_no_O2(self):
        import asyncio
        from unittest.mock import AsyncMock, MagicMock, patch
        import backend.compiler_engine as ce

        self.assertEqual(ce.GODBOLT_COMPILERS["javascript"], ("v8113", "javascript"))
        self.assertEqual(ce.GODBOLT_COMPILERS["rust"], ("r1840", "rust"))
        self.assertEqual(ce.GODBOLT_COMPILERS["csharp"], ("dotnet80csharpcoreclr", "csharp"))
        self.assertNotIn("go", ce.GODBOLT_COMPILERS)
        self.assertNotIn("typescript", ce.GODBOLT_COMPILERS)
        self.assertNotIn("php", ce.GODBOLT_COMPILERS)
        self.assertEqual(ce.JUDGE0_LANGUAGE_IDS["php"], 68)
        self.assertEqual(ce.JUDGE0_LANGUAGE_IDS["go"], 60)
        self.assertEqual(ce.JUDGE0_LANGUAGE_IDS["typescript"], 74)

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "code": 0,
            "stdout": [{"text": "OK_RUST"}],
            "stderr": [],
            "buildResult": {"stderr": []},
        }
        mock_post = AsyncMock(return_value=mock_resp)
        with patch("httpx.AsyncClient.post", mock_post):
            rust_res = asyncio.run(ce.execute_code_live("rust", 'fn main(){println!("OK_RUST");}'))
        self.assertTrue(rust_res["success"])
        self.assertEqual(rust_res["engine"], "godbolt-r1840")
        sent_payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(sent_payload["options"]["userArguments"], "")

    def test_voice_tts_skips_unary_when_429_and_falls_back_to_live_puck(self):
        import asyncio
        import time
        from unittest.mock import patch
        import backend.routers.voice_routes as vr

        class QuotaErr(Exception):
            pass

        vr._TTS_PCM_CACHE.clear()
        vr._TTS_INFLIGHT.clear()
        vr._UNARY_TTS_COOLDOWN_UNTIL = 0.0
        vr._LIVE_TTS_COOLDOWN_UNTIL = 0.0

        async def fail_unary_429(text: str, keys: list):
            vr._UNARY_TTS_COOLDOWN_UNTIL = time.monotonic() + 1800.0
            return None

        live_calls = 0

        async def fake_live(text: str):
            nonlocal live_calls
            live_calls += 1
            return {"pcm_base64": "BBBB", "sample_rate": 24000, "voice": "Puck"}

        async def _run():
            with patch.object(vr, "_synthesize_puck_via_38_unary_fallback", side_effect=fail_unary_429), \
                 patch.object(vr, "_synthesize_puck_via_38_live_unlocked", side_effect=fake_live):
                return await vr.synthesize_puck_pcm("Fallback test utterance", prefer_unary=True)

        res = asyncio.run(_run())
        self.assertIsNotNone(res)
        self.assertEqual(res["pcm_base64"], "BBBB")
        self.assertEqual(live_calls, 1)
        vr._UNARY_TTS_COOLDOWN_UNTIL = 0.0

    def test_multi_key_rotation_and_cooldown_priority(self):
        import os
        from backend.config import key_resolver as kr

        kr.clear_gemini_key_cooldowns()
        try:
            with patch.dict(
                os.environ,
                {
                    "GEMINI_API_KEY": "AIzaPrimaryTestKey01",
                    "GEMINI_API_KEY_FALLBACK": "AIzaBackupTestKey02, AIzaBackupTestKey03",
                },
                clear=False,
            ):
                candidates = kr.get_gemini_key_candidates()
                self.assertIn("AIzaPrimaryTestKey01", candidates)
                self.assertIn("AIzaBackupTestKey02", candidates)
                self.assertIn("AIzaBackupTestKey03", candidates)
                self.assertEqual(candidates[:3], ["AIzaPrimaryTestKey01", "AIzaBackupTestKey02", "AIzaBackupTestKey03"])

                kr.mark_gemini_key_rate_limited("AIzaPrimaryTestKey01", 600.0)
                rotated = kr.get_gemini_key_candidates()
                self.assertEqual(rotated[0], "AIzaBackupTestKey02")
                self.assertEqual(kr.get_active_gemini_key(), "AIzaBackupTestKey02")
                self.assertEqual(rotated[-1], "AIzaPrimaryTestKey01")

                kr.clear_gemini_key_cooldowns()
                restored = kr.get_gemini_key_candidates()
                self.assertEqual(restored[0], "AIzaPrimaryTestKey01")
        finally:
            kr.clear_gemini_key_cooldowns()

    def test_health_reports_keys_count_without_secrets_and_supports_head(self):
        head_resp = self.client.head("/api/health")
        self.assertEqual(head_resp.status_code, 200)

        get_resp = self.client.get("/api/health")
        self.assertEqual(get_resp.status_code, 200)
        data = get_resp.json()
        self.assertGreaterEqual(data.get("gemini", {}).get("keys_configured", 0), 1)
        serialized = get_resp.text
        self.assertNotIn("AIza", serialized)
        self.assertNotIn("AQ.", serialized)

    def test_live_puck_tts_runs_at_zero_cooldown_and_rotates_on_429(self):
        import asyncio
        import os
        import struct
        from types import SimpleNamespace
        from google import genai
        from backend.config import key_resolver as kr
        import backend.routers.voice_routes as vr

        kr.clear_gemini_key_cooldowns()
        vr._LIVE_TTS_COOLDOWN_UNTIL = 0.0
        vr._TTS_LIVE_SEM = None
        attempted_keys = []
        valid_pcm = struct.pack("<" + "h" * 2400, *([1500, -1500] * 1200))

        class _FakeSession:
            async def send_client_content(self, **kwargs):
                return None

            async def receive(self):
                part = SimpleNamespace(inline_data=SimpleNamespace(data=valid_pcm))
                sc = SimpleNamespace(
                    model_turn=SimpleNamespace(parts=[part]),
                    turn_complete=True,
                    generation_complete=True,
                )
                yield SimpleNamespace(server_content=sc)

        class _FakeConnectCM:
            def __init__(self, api_key: str):
                self._api_key = api_key

            async def __aenter__(self):
                if self._api_key == "AIzaFailKey1":
                    raise Exception("429 RESOURCE_EXHAUSTED")
                return _FakeSession()

            async def __aexit__(self, exc_type, exc, tb):
                return False

        def fake_genai_client(*, http_options=None, api_key=""):
            attempted_keys.append(api_key)
            return SimpleNamespace(
                aio=SimpleNamespace(
                    live=SimpleNamespace(connect=lambda model=None, config=None: _FakeConnectCM(api_key))
                )
            )

        try:
            with patch.dict(
                os.environ,
                {
                    "GEMINI_API_KEY": "AIzaFailKey1",
                    "GEMINI_API_KEY_FALLBACK": "AIzaGoodKey2",
                },
                clear=False,
            ), patch.object(genai, "Client", side_effect=fake_genai_client):
                res = asyncio.run(vr._synthesize_puck_via_38_live_unlocked("Rotation check"))
                self.assertIsNotNone(res)
                self.assertEqual(res.get("voice"), "Puck")
                self.assertTrue(bool(res.get("pcm_base64")))
                self.assertEqual(attempted_keys, ["AIzaFailKey1", "AIzaGoodKey2"])

                rotated = kr.get_gemini_key_candidates()
                self.assertIn("AIzaGoodKey2", rotated)
                self.assertIn("AIzaFailKey1", rotated)
                self.assertGreater(rotated.index("AIzaFailKey1"), rotated.index("AIzaGoodKey2"))
        finally:
            kr.clear_gemini_key_cooldowns()
            vr._LIVE_TTS_COOLDOWN_UNTIL = 0.0
            vr._TTS_LIVE_SEM = None

    def test_coding_arena_zero_score_on_blank_and_caps_wrong_output(self):
        starter = (
            "def first_occurrence(arr, target):\n"
            "    # TODO: write solution\n"
            "    pass\n"
            "print(first_occurrence([10, 20, 20], 20))\n"
        )
        blank_payload = {
            "company": "Amazon",
            "role": "SDE-1",
            "title": "Binary Search First Occurrence",
            "question": "Find the first occurrence of target in a sorted array in O(log n) time.",
            "language": "python",
            "candidate_code": starter,
            "starter_code": starter,
            "viva_explanation": "",
            "compile_success": False,
            "compiler_output": "",
            "expected_output": "1",
            "output_matched": False,
            "expected_keywords": ["O(log n)", "O(1)"],
        }
        blank_resp = self.client.post("/api/ai/evaluate-coding-arena", json=blank_payload)
        self.assertEqual(blank_resp.status_code, 200, blank_resp.text)
        blank_data = blank_resp.json()
        self.assertEqual(blank_data["overall_score"], 0)
        self.assertEqual(blank_data["code_score"], 0)
        self.assertEqual(blank_data["viva_score"], 0)
        self.assertEqual(blank_data["decision"], "NO HIRE")

        wrong_payload = {
            "company": "Amazon",
            "role": "SDE-1",
            "title": "Binary Search First Occurrence",
            "question": "Find the first occurrence of target in a sorted array in O(log n) time.",
            "language": "python",
            "candidate_code": "def first_occurrence(arr, target):\n    return 99\nprint(first_occurrence([10, 20], 20))\n",
            "starter_code": starter,
            "viva_explanation": "We scan half the sorted array with binary search taking O(log n) time and O(1) space.",
            "compile_success": True,
            "compiler_output": "99",
            "expected_output": "1",
            "output_matched": False,
            "expected_keywords": ["O(log n)", "O(1)", "binary search"],
        }
        wrong_resp = self.client.post("/api/ai/evaluate-coding-arena", json=wrong_payload)
        self.assertEqual(wrong_resp.status_code, 200, wrong_resp.text)
        wrong_data = wrong_resp.json()
        self.assertLessEqual(wrong_data["code_score"], 40)
        self.assertNotIn(wrong_data["decision"], ("HIRE", "STRONG HIRE"))

    def test_normalize_tts_text_expands_big_o_and_collapses_repeats(self):
        from backend.routers.voice_routes import _normalize_tts_text

        norm = _normalize_tts_text("Explain O(log n) O(log n) with O(1) and O(n²).")
        self.assertIn("Big O of log n", norm)
        self.assertIn("Big O of 1", norm)
        self.assertIn("Big O of n squared", norm)
        self.assertEqual(norm.count("Big O of log n"), 1)

    def test_das_tools_keep_factual_lookup_and_compiler_without_external_tab_tools(self):
        from backend.agent.live_proxy import DAS_TOOLS

        declared = {
            fn.name
            for tool in DAS_TOOLS
            for fn in (tool.function_declarations or [])
        }
        self.assertIn("lookup_factual_info", declared)
        self.assertIn("coding_studio_control", declared)
        self.assertIn("write_and_compile_code", declared)
        self.assertIn("control_website", declared)
        self.assertIn("update_student_profile", declared)
        self.assertIn("return_to_dashboard", declared)
        self.assertNotIn("open_external_website", declared)
        self.assertNotIn("open_linkedin_profile", declared)

if __name__ == "__main__":
    unittest.main()
