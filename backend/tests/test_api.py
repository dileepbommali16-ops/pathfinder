import unittest
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
        from backend.agent.persona import build_system_prompt, get_greeting_for_user

        sys_instruction, _, _, _, _ = prepare_chat_context(
            message="How do I improve my placement score?",
            page_context={"honorific": "Madam", "activeTab": "overview"},
        )
        self.assertIn("Madam", sys_instruction)
        self.assertNotIn("Address her as 'Boss'", sys_instruction)

        persona_prompt = build_system_prompt("guest", {"honorific": "Madam"})
        self.assertIn("Madam", persona_prompt)
        self.assertIn("DAS Neural Voice", persona_prompt)
        self.assertNotIn("Puck", persona_prompt)
        self.assertIn("Madam", get_greeting_for_user(None, honorific="Madam"))

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
        r1 = self.client.post("/api/auth/login", json={"username": "Student Test", "email": email})
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

if __name__ == "__main__":
    unittest.main()
