"""
Integration Tests: Health & Analytics API Endpoints (Photo 4)
Uses standard Python unittest for zero-dependency execution.
"""

import unittest
from fastapi.testclient import TestClient
from backend.api import app


class TestEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data.get("status"), ("healthy", "ok", "ready"))

    def test_projects_catalog_endpoint(self):
        response = self.client.get("/api/data/projects")
        self.assertEqual(response.status_code, 200)
        projects = response.json()
        self.assertGreaterEqual(len(projects), 28)
        # Verify RAG project presence
        rag_ids = [p.get("id") for p in projects]
        self.assertIn("pf-rag-graphrag-pipeline", rag_ids)
        self.assertIn("pf-rag-agentic-multidoc", rag_ids)


if __name__ == "__main__":
    unittest.main()
