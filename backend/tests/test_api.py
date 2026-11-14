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
        self.assertIn(data.get("status"), ["healthy", "operational", "ok"])

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

if __name__ == "__main__":
    unittest.main()
