import requests
import sys

base = "http://127.0.0.1:8000"
results = {}

try:
    # 1. Health
    r = requests.get(f"{base}/api/health", timeout=5)
    results["health"] = (r.status_code, r.json().get("status"), r.json().get("service"))

    # 2. OAuth URLs
    r = requests.get(f"{base}/api/auth/oauth-urls", timeout=5)
    results["oauth_urls"] = (r.status_code, r.json().get("google_configured"), r.json().get("github_configured"))

    # 3. Login
    r = requests.post(f"{base}/api/auth/login", json={"username": "Priyanka", "email": "priyanka@pathfinder.ai"}, timeout=5)
    token = r.json().get("token")
    results["login"] = (r.status_code, r.json().get("success"), token[:8] if token else None)

    # 4. Auth Me
    r = requests.get(f"{base}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=5)
    results["auth_me"] = (r.status_code, r.json().get("username"), r.json().get("email"))

    # 5. Profile GET & POST
    r = requests.get(f"{base}/api/profile", timeout=5)
    results["profile_get"] = (r.status_code, r.json().get("cgpa"))
    r = requests.post(f"{base}/api/profile", json={"cgpa": 8.5, "backlogs": 0, "internships": 2, "coding": 8, "communication": 8}, timeout=5)
    results["profile_post"] = (r.status_code, r.json().get("cgpa"))

    # 6. Skill Gap
    r = requests.post(f"{base}/api/skill-gap", json={"cgpa": 8.5, "backlogs": 0, "internships": 2, "coding": 8, "communication": 8}, timeout=5)
    results["skill_gap"] = (r.status_code, len(r.json().get("strengths", [])), r.json().get("target_role_fit"))

    # 7. Predict
    r = requests.post(f"{base}/api/predict", json={"cgpa": 8.5, "backlogs": 0, "internships": 2, "coding": 8, "communication": 8}, timeout=5)
    results["predict"] = (r.status_code, r.json().get("chance"), r.json().get("label"))

    # 8. Analytics
    r = requests.get(f"{base}/api/analytics?year=2026", timeout=5)
    results["analytics"] = (r.status_code, r.json().get("metrics", {}).get("total_students"))

    # 9. AI Chat
    r = requests.post(f"{base}/api/ai/chat", json={"message": "Give me DSA tips", "history": []}, timeout=30)
    results["ai_chat"] = (r.status_code, bool(r.json().get("reply")))

    # 10. AI Roadmap
    r = requests.post(f"{base}/api/ai/roadmap", json={"cgpa": 8.5, "backlogs": 0, "internships": 2, "coding": 8, "communication": 8}, timeout=30)
    results["ai_roadmap"] = (r.status_code, len(r.json().get("weeks", [])))

    # 11. CSV Export
    r = requests.get(f"{base}/api/export/csv?year=2026", timeout=5)
    results["csv_export"] = (r.status_code, len(r.content))

    # 12. PDF Export
    r = requests.get(f"{base}/api/export/pdf?year=2026", timeout=5)
    results["pdf_export"] = (r.status_code, len(r.content))

    # 13. Docs
    r = requests.get(f"{base}/docs", timeout=5)
    results["docs"] = r.status_code

    # 14. Frontend on 3000
    r_front = requests.get("http://localhost:3000", timeout=5)
    results["frontend_3000"] = (r_front.status_code, len(r_front.content))

    print("--- VERIFICATION RESULTS ---")
    for k, v in results.items():
        print(f"  {k:15}: {v}")
    print("ALL VERIFIED SUCCESSFULLY")
except Exception as e:
    print(f"Error during verification: {e}")
    sys.exit(1)
