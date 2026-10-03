import json
import urllib.request
import time
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api/chat"

test_prompts = [
    {
        "name": "Which branch has the highest package?",
        "payload": {
            "message": "Which branch has the highest package?"
        },
        "check": lambda r: any(k in r.lower() for k in ["highest", "package", "lpa", "cse", "csd", "aiml", "44"])
    },
    {
        "name": "What is my readiness score? (with profile)",
        "payload": {
            "message": "What is my readiness score?",
            "profile": {
                "cgpa": 8.5,
                "backlogs": 0,
                "internships": 1,
                "communication": 8.0,
                "coding": 8.5,
                "branch": "CSE",
                "target_role": "Software Engineer"
            }
        },
        "check": lambda r: any(k in r.lower() for k in ["readiness", "score", "8.", "profile", "cgpa", "strong"])
    },
    {
        "name": "I know Python and SQL, what am I missing for ML Engineer?",
        "payload": {
            "message": "I know Python and SQL, what am I missing for ML Engineer?"
        },
        "check": lambda r: any(k in r.lower() for k in ["machine learning", "math", "scikit", "deep learning", "tensorflow", "pytorch", "model", "missing"])
    },
    {
        "name": "Telugu question: Nenu placement ela prepare avvali?",
        "payload": {
            "message": "Nenu placement ela prepare avvali?"
        },
        "check": lambda r: len(r) > 30 and any(k in r.lower() for k in ["bro", "prepare", "dsa", "coding", "chey", "first", "projects"])
    },
    {
        "name": "Empty message validation",
        "payload": {
            "message": ""
        },
        "check": lambda r: "type a question" in r.lower() or "help" in r.lower()
    },
    {
        "name": "Very long message test (1000 characters)",
        "payload": {
            "message": "I am preparing for campus placements. " * 30
        },
        "check": lambda r: len(r) > 20
    },
    {
        "name": "Special characters & emojis test",
        "payload": {
            "message": "🚀 What about AIML vs CSE? & <script>alert(1)</script> 💯"
        },
        "check": lambda r: ("aiml" in r.lower() or "cse" in r.lower()) and "<script>" not in r
    }
]

print("=== TESTING STEP 4 SPECIFIC CHAT PROMPTS ===")
passed_count = 0
for t in test_prompts:
    t0 = time.time()
    req = urllib.request.Request(
        BASE_URL,
        data=json.dumps(t["payload"]).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            latency = int((time.time() - t0) * 1000)
            reply = data.get("reply", "")
            ok = t["check"](reply)
            status_str = "PASS" if ok else "FAIL"
            print(f"[{status_str}] {t['name']} ({latency}ms)")
            print(f"       Snippet: {reply[:100]}...\n")
            if ok:
                passed_count += 1
            else:
                print(f"       Full reply: {reply}\n")
    except Exception as e:
        print(f"[FAIL] {t['name']} Error: {e}\n")

print(f"Passed: {passed_count}/{len(test_prompts)}")
