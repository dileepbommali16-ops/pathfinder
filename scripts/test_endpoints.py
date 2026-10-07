import urllib.request
import json

payload = {
    "fullName": "Arjun Reddy",
    "college": "NIT Hyderabad",
    "branch": "AIML",
    "course": "B.Tech",
    "currentYear": "3rd Year",
    "currentSemester": "6th Semester",
    "tenthPercentage": 91.5,
    "twelfthPercentage": 88.0,
    "cgpa": 8.2,
    "percentage": 77.9,
    "activeBacklogs": 0,
    "historyBacklogs": 0,
    "backlogs": 0,
    "technicalSkills": ["Python", "SQL", "FastAPI"],
    "tools": ["Git", "Docker"],
    "programmingLanguages": ["Python", "TypeScript"],
    "projectsCount": 3,
    "internships": 1,
    "certifications": ["AWS Certified"],
    "targetRole": "AI/ML Engineer",
    "preferredCompanyType": "Product Tier-1 MNC",
    "preferredLocation": "Hyderabad / Remote",
    "expectedPackage": "12 - 18 LPA",
    "coding": 8,
    "communication": 8,
    "onboardingCompleted": True,
    "wizardStep": 5
}
data = json.dumps(payload).encode("utf-8")

def post_endpoint(path):
    try:
        req = urllib.request.Request(f"http://127.0.0.1:8000{path}", data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            print(f"POST {path} status:", resp.status, resp.read().decode()[:200])
    except Exception as e:
        import sys
        from pathlib import Path
        root = Path(__file__).resolve().parent.parent
        if str(root) not in sys.path:
            sys.path.insert(0, str(root))
        from fastapi.testclient import TestClient
        from backend.api import app
        client = TestClient(app)
        res = client.post(path, json=payload)
        print(f"POST {path} status (in-process):", res.status_code, res.text[:200])

post_endpoint("/api/profile")
post_endpoint("/api/profile/calculate")
