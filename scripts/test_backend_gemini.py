import requests
import json
import sys

base_url = "http://127.0.0.1:8000"

print("--- Testing Live FastAPI Gemini Endpoints ---")

# 1. Test POST /api/ai/chat
chat_payload = {
    "message": "Give me 2 concise recommendations for campus placements in 2026.",
    "history": [],
    "profile": {
        "cgpa": 8.2,
        "backlogs": 0,
        "internships": 1,
        "communication": 8,
        "coding": 8,
        "target_role": "Full Stack Developer",
        "target_tier": "Product Tier-1",
        "branch": "CSE",
        "graduation_year": 2026
    }
}

try:
    print("Sending request to POST /api/ai/chat...")
    chat_resp = requests.post(f"{base_url}/api/ai/chat", json=chat_payload, timeout=45)
    print(f"1. Endpoint: POST /api/ai/chat")
    print(f"   HTTP Status: {chat_resp.status_code}")
    if chat_resp.status_code == 200:
        reply = chat_resp.json().get("reply", "")
        print(f"   Reply length: {len(reply)} chars")
        # Print a short snippet to verify real AI content (without any sensitive info)
        snippet = reply[:180].replace('\n', ' ')
        print(f"   Snippet: {snippet}...")
    else:
        print(f"   Error: {chat_resp.text}")
except Exception as e:
    print(f"   Exception testing /api/ai/chat: {e}")
    sys.exit(1)

# 2. Test POST /api/ai/roadmap
roadmap_payload = {
    "cgpa": 8.2,
    "backlogs": 0,
    "internships": 1,
    "communication": 8,
    "coding": 8,
    "target_role": "Full Stack Developer",
    "target_tier": "Product Tier-1",
    "branch": "CSE",
    "graduation_year": 2026
}

try:
    print("\nSending request to POST /api/ai/roadmap...")
    roadmap_resp = requests.post(f"{base_url}/api/ai/roadmap", json=roadmap_payload, timeout=45)
    print(f"2. Endpoint: POST /api/ai/roadmap")
    print(f"   HTTP Status: {roadmap_resp.status_code}")
    if roadmap_resp.status_code == 200:
        data = roadmap_resp.json()
        print(f"   Headline: {data.get('headline')}")
        print(f"   Weekly actions count: {len(data.get('weekly_actions', []))}")
        print(f"   Skill gaps: {data.get('skill_gaps')}")
    else:
        print(f"   Error: {roadmap_resp.text}")
except Exception as e:
    print(f"   Exception testing /api/ai/roadmap: {e}")
    sys.exit(1)

print("\n--- Live Gemini Testing Complete ---")
