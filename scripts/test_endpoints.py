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

req = urllib.request.Request("http://127.0.0.1:8000/api/profile", data=data, headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req) as resp:
        print("POST /api/profile status:", resp.status, resp.read().decode())
except Exception as e:
    print("POST /api/profile error:", e)

req2 = urllib.request.Request("http://127.0.0.1:8000/api/profile/calculate", data=data, headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req2) as resp:
        print("POST /api/profile/calculate status:", resp.status, resp.read().decode()[:200])
except Exception as e:
    print("POST /api/profile/calculate error:", e)
