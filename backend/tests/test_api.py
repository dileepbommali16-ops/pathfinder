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

if __name__ == "__main__":
    unittest.main()
