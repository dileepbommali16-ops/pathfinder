import requests
import json
import sys

base_url = "http://127.0.0.1:8000"

_client = None
def post_json(path, payload):
    global _client
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.15)
    is_live = False
    try:
        s.connect(("127.0.0.1", 8000))
        s.close()
        is_live = True
    except Exception:
        pass

    if is_live:
        return requests.post(f"{base_url}{path}", json=payload, timeout=45)
    
    if _client is None:
        from pathlib import Path
        root = Path(__file__).resolve().parent.parent
        if str(root) not in sys.path:
            sys.path.insert(0, str(root))
        from fastapi.testclient import TestClient
        from backend.api import app
        _client = TestClient(app)
    return _client.post(path, json=payload)

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
    chat_resp = post_json("/api/ai/chat", chat_payload)
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
    roadmap_resp = post_json("/api/ai/roadmap", roadmap_payload)
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
