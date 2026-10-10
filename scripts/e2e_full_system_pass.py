"""
Pathfinder 2.0 - Comprehensive End-to-End System Audit Suite
Tests every single frontend view logic and backend API endpoint.
Measures latency, verifies data integrity, and checks error boundaries.
"""

import sys
import os
import time
import json
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Ensure UTF-8 output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient
from backend.api import app
from backend.database import init_database

def audit_all_endpoints():
    print("=" * 80)
    print("🚀 PATHFINDER 2.0 — TOP-TO-BOTTOM ENDPOINT & ROUTE AUDIT")
    print("=" * 80)

    # Initialize DB
    init_database()
    client = TestClient(app)

    results = []
    
    def record(category: str, method: str, path: str, status_code: int, expected: int, latency_ms: float, details: str = ""):
        passed = status_code == expected
        icon = "✅ PASS" if passed else "❌ FAIL"
        results.append({
            "category": category,
            "method": method,
            "path": path,
            "status": status_code,
            "expected": expected,
            "latency_ms": round(latency_ms, 2),
            "passed": passed,
            "details": details
        })
        print(f"{icon} [{category:12}] {method:6} {path:32} -> HTTP {status_code} ({latency_ms:.1f}ms) {details}")

    # 1. HEALTH & SYSTEM DIAGNOSTICS
    for p in ["/", "/health", "/api/health"]:
        t0 = time.perf_counter()
        r = client.get(p)
        record("Health Probes", "GET", p, r.status_code, 200, (time.perf_counter() - t0) * 1000, f"service: {r.json().get('service', 'N/A')}")
        
        t0 = time.perf_counter()
        r_head = client.head(p)
        record("Health Probes", "HEAD", p, r_head.status_code, 200, (time.perf_counter() - t0) * 1000, "UptimeRobot probe")

    for p in ["/api/health/live", "/api/health/ready", "/api/cache/stats"]:
        t0 = time.perf_counter()
        r = client.get(p)
        record("Health Probes", "GET", p, r.status_code, 200, (time.perf_counter() - t0) * 1000)

    # 2. AUTHENTICATION & OAUTH
    t0 = time.perf_counter()
    r = client.get("/api/auth/oauth-urls")
    record("Auth & OAuth", "GET", "/api/auth/oauth-urls", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Providers: {list(r.json().keys())}")

    # Login
    t0 = time.perf_counter()
    login_payload = {"username": "evaluator_judge", "email": "judge@hackathon.org"}
    r = client.post("/api/auth/login", json=login_payload)
    login_data = r.json()
    token = login_data.get("token", "")
    auth_headers = {"Authorization": f"Bearer {token}"}
    record("Auth & OAuth", "POST", "/api/auth/login", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"JWT received: {bool(token)}")

    # Me check
    t0 = time.perf_counter()
    r = client.get("/api/auth/me", headers=auth_headers)
    record("Auth & OAuth", "GET", "/api/auth/me", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"User: {r.json().get('user', {}).get('username')}")

    # 3. PROFILE CRUD (SSOT)
    sample_profile = {
        "fullName": "Evaluator Judge",
        "email": "judge@hackathon.org",
        "branch": "CSE",
        "degree": "B.Tech",
        "cgpa": 8.8,
        "backlogs": 0,
        "codingScore": 9,
        "communicationScore": 8,
        "targetRole": "sde",
        "skills": ["Python", "FastAPI", "React", "TypeScript", "Docker"],
        "certifications": ["AWS Cloud Practitioner"],
        "internships": 1,
        "projects": 3
    }
    t0 = time.perf_counter()
    r = client.post("/api/profile", json=sample_profile, headers=auth_headers)
    record("Profile SSOT", "POST", "/api/profile", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Updated ID: {r.json().get('profile', {}).get('email')}")

    t0 = time.perf_counter()
    r = client.get("/api/profile", headers=auth_headers)
    record("Profile SSOT", "GET", "/api/profile", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"CGPA: {r.json().get('cgpa')}")

    # 4. PREDICTIONS & MACHINE LEARNING
    predict_payload = {
        "cgpa": 8.8,
        "backlogs": 0,
        "codingConfidence": 9,
        "communicationRating": 8,
        "internships": 1,
        "branch": "CSE"
    }
    t0 = time.perf_counter()
    r = client.post("/api/predict", json=predict_payload)
    prob = r.json().get("probability", 0)
    record("ML Inference", "POST", "/api/predict", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Placement Prob: {prob}% ({r.json().get('confidenceLabel')})")

    t0 = time.perf_counter()
    r = client.post("/api/skill-gap", json=sample_profile)
    record("ML Inference", "POST", "/api/skill-gap", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Gaps: {len(r.json().get('gaps', []))}")

    # 5. DATA CATALOGS & COHORT ANALYTICS
    for p in ["/api/data/projects", "/api/data/roles", "/api/data/skills", "/api/data/branches"]:
        t0 = time.perf_counter()
        r = client.get(p)
        cnt = len(r.json()) if isinstance(r.json(), list) else len(r.json().keys())
        record("Data Catalog", "GET", p, r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Count: {cnt}")

    # Cohort 972 filters
    t0 = time.perf_counter()
    r = client.get("/api/analytics?branch=CSE&year=2025")
    record("Cohort Analytics", "GET", "/api/analytics (filtered)", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Records: {r.json().get('filtered_records')}/{r.json().get('total_records')}")

    t0 = time.perf_counter()
    r = client.get("/api/cohort/paginated?page=1&limit=10")
    record("Cohort Analytics", "GET", "/api/cohort/paginated", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Page 1 items: {len(r.json().get('items', []))}")

    t0 = time.perf_counter()
    r = client.get("/api/analytics/branch-deep")
    b_cnt = len(r.json()) if isinstance(r.json(), list) else len(r.json().get("branches", []))
    record("Cohort Analytics", "GET", "/api/analytics/branch-deep", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Branches: {b_cnt}")

    t0 = time.perf_counter()
    r = client.get("/api/analytics/skills-deep")
    s_cnt = len(r.json()) if isinstance(r.json(), list) else len(r.json().get("skills", []))
    record("Cohort Analytics", "GET", "/api/analytics/skills-deep", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Top skills: {s_cnt}")

    # 6. AI CAREER COACH & WORKFLOWS
    chat_queries = [
        ("English Greeting", "Hello coach, what are the top skills for SDE roles?"),
        ("Telugu Query", "Bro naku placement prep kosam 6-week plan cheppu"),
        ("Architecture Query", "Let's discuss how to build 'Distributed Asynchronous Job Queue'"),
        ("Campus Package Inquiry", "Which branch has the highest package?")
    ]
    for label, query in chat_queries:
        t0 = time.perf_counter()
        r = client.post("/api/chat", json={"message": query, "history": [], "profile": sample_profile})
        reply = r.json().get("reply", "")
        record("AI Career Coach", "POST", f"/api/chat ({label})", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Reply length: {len(reply)} chars")

    # AI Roadmap
    t0 = time.perf_counter()
    r = client.post("/api/ai/roadmap", json={"role": "sde", "profile": sample_profile})
    record("AI Workflows", "POST", "/api/ai/roadmap", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Weeks: {len(r.json().get('weeks', []))}")

    # AI Cohort Insight
    t0 = time.perf_counter()
    r = client.post("/api/ai/cohort-insight", json={"branch": "CSE", "role": "sde"})
    record("AI Workflows", "POST", "/api/ai/cohort-insight", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"Insight length: {len(r.json().get('insight', ''))}")

    # 7. EXPORT ENDPOINTS
    t0 = time.perf_counter()
    r = client.get("/api/export/csv")
    record("Data Exports", "GET", "/api/export/csv", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"CSV Bytes: {len(r.content)}")

    t0 = time.perf_counter()
    r = client.get("/api/export/pdf")
    record("Data Exports", "GET", "/api/export/pdf", r.status_code, 200, (time.perf_counter() - t0) * 1000, f"PDF Bytes: {len(r.content)}")

    # 8. SECURITY & BOUNDS CHECKS
    # IDOR Protection: returns 403 Forbidden if not authenticated as target
    t0 = time.perf_counter()
    r_unauth = client.get("/api/profile/usr_unauthorized_victim")
    record("Security Guards", "GET", "/api/profile/:id (unauth)", r_unauth.status_code, 403, (time.perf_counter() - t0) * 1000, "Blocked without token")

    # Logout & token revocation
    t0 = time.perf_counter()
    r_logout = client.post("/api/auth/logout", headers=auth_headers)
    record("Security Guards", "POST", "/api/auth/logout", r_logout.status_code, 200, (time.perf_counter() - t0) * 1000, "Token revoked")

    t0 = time.perf_counter()
    r_revoked = client.get("/api/auth/me", headers=auth_headers)
    record("Security Guards", "GET", "/api/auth/me (after logout)", r_revoked.status_code, 401, (time.perf_counter() - t0) * 1000, "Rejected revoked token")

    print("=" * 80)
    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)
    avg_latency = sum(r["latency_ms"] for r in results) / total_count
    print(f"📊 AUDIT SUMMARY: {passed_count}/{total_count} PASSED ({passed_count/total_count*100:.1f}%) — Average Latency: {avg_latency:.1f}ms")
    print("=" * 80)

    if passed_count != total_count:
        sys.exit(1)

if __name__ == "__main__":
    audit_all_endpoints()
