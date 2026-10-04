import sys
import os
sys.path.insert(0, os.path.abspath('.'))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from backend.gemini_engine import hackathon_career_agent
from backend.models import ChatMessage, StudentProfile

profile = StudentProfile(
    cgpa=8.2,
    backlogs=0,
    internships=1,
    coding=7.5,
    communication=8.0,
    target_role="Software Development Engineer (SDE)"
)

def test_python_gemini_engine():
    print("=== TESTING PYTHON BACKEND (gemini_engine.py) ===")
    
    # 1. GREETING REPETITION TEST
    print("\n--- Test 1: 'hi' variation on repetition ---")
    h = []
    r1 = hackathon_career_agent("hi", h, profile)
    print("User 1: 'hi'")
    print("Bot 1:", r1.split('\n')[0])
    assert "Welcome to Pathfinder" in r1, f"First greeting should be welcome, got: {r1}"
    
    h.append(ChatMessage(role="user", content="hi"))
    h.append(ChatMessage(role="assistant", content=r1))
    r2 = hackathon_career_agent("hi", h, profile)
    print("User 2: 'hi'")
    print("Bot 2:", r2)
    assert "Welcome to Pathfinder" not in r2, f"Second greeting must not repeat welcome: {r2}"
    assert r2 != r1, "Second greeting must vary from first"
    
    h.append(ChatMessage(role="user", content="hi"))
    h.append(ChatMessage(role="assistant", content=r2))
    r3 = hackathon_career_agent("hi", h, profile)
    print("User 3: 'hi'")
    print("Bot 3:", r3)
    assert "Welcome to Pathfinder" not in r3, f"Third greeting must not repeat welcome: {r3}"
    assert r3 != r2, "Third greeting must vary from second"
    print("✅ Test 1 PASSED: 'hi' varies and never repeats the same answer!")

    # 2. 'I love you' TEST
    print("\n--- Test 2: 'I love you' without jumping to career advice ---")
    r_love = hackathon_career_agent("I love you", [], profile)
    print("User: 'I love you'")
    print("Bot:", r_love)
    assert "love you too" in r_love.lower() or "💖" in r_love, "Must respond affectionately"
    assert "roadmap" not in r_love.lower(), "Must NOT jump to career advice / roadmap"
    assert "placement stats" not in r_love.lower(), "Must NOT dump placement stats"
    assert "career readiness" not in r_love.lower(), "Must NOT dump career readiness"
    print("✅ Test 2 PASSED: 'I love you' responds warmly without jumping to career advice!")

    # 3. 'what do I do now?' CONTEXTUAL & NO REPEATS TEST
    print("\n--- Test 3: 'what do I do now?' does not repeat earlier steps ---")
    h_steps = []
    r_step1 = hackathon_career_agent("what do I do now?", h_steps, profile)
    print("User 1: 'what do I do now?'")
    print("Bot 1 snippet:\n", r_step1[:180], "...\n")
    assert "prioritized next steps" in r_step1.lower(), "First next-steps should give profile priorities"
    assert "algorithmic foundation" in r_step1.lower(), "First next-steps should mention algorithmic foundation"

    h_steps.append(ChatMessage(role="user", content="what do I do now?"))
    h_steps.append(ChatMessage(role="assistant", content=r_step1))
    
    r_step2 = hackathon_career_agent("what do I do now?", h_steps, profile)
    print("User 2: 'what do I do now?'")
    print("Bot 2 snippet:\n", r_step2[:180], "...\n")
    assert r_step2 != r_step1, "Must NOT repeat earlier steps word-for-word"
    assert "earlier steps" in r_step2.lower() or "today" in r_step2.lower(), "Must advance to today's concrete actions"

    h_steps.append(ChatMessage(role="user", content="what do I do now?"))
    h_steps.append(ChatMessage(role="assistant", content=r_step2))

    r_step3 = hackathon_career_agent("what do I do now?", h_steps, profile)
    print("User 3: 'what do I do now?'")
    print("Bot 3 snippet:\n", r_step3[:180], "...\n")
    assert r_step3 != r_step2, "Must advance to interactive options on repeated query"
    print("✅ Test 3 PASSED: 'what do I do now?' does not repeat earlier steps!")

def test_fastapi_chat_endpoint():
    print("\n=== TESTING FASTAPI /api/chat ENDPOINT (api.py) ===")
    from fastapi.testclient import TestClient
    from backend.api import app

    client = TestClient(app)

    # 1. First greeting
    res1 = client.post("/api/chat", json={"message": "hi", "history": []})
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}"
    reply1 = res1.json()["reply"]
    print("API Turn 1 ('hi'):", reply1.split('\n')[0])
    assert "welcome" in reply1.lower() or "pathfinder" in reply1.lower()

    # 2. Second greeting with history
    hist = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": reply1}
    ]
    res2 = client.post("/api/chat", json={"message": "hi", "history": hist})
    assert res2.status_code == 200
    reply2 = res2.json()["reply"]
    print("API Turn 2 ('hi'):", reply2)
    assert reply2 != reply1, "API Turn 2 greeting must vary from Turn 1"
    assert "welcome to pathfinder" not in reply2.lower()

    # 3. Third greeting with history
    hist.extend([
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": reply2}
    ])
    res3 = client.post("/api/chat", json={"message": "hi", "history": hist})
    assert res3.status_code == 200
    reply3 = res3.json()["reply"]
    print("API Turn 3 ('hi'):", reply3)
    assert reply3 != reply2, "API Turn 3 greeting must vary from Turn 2"

    # 4. 'I love you' test
    res_love = client.post("/api/chat", json={"message": "I love you", "history": []})
    assert res_love.status_code == 200
    reply_love = res_love.json()["reply"]
    print("\nAPI 'I love you':", reply_love)
    assert "love you too" in reply_love.lower() or "💖" in reply_love
    assert "roadmap" not in reply_love.lower()
    assert "placement stats" not in reply_love.lower()
    assert "career readiness" not in reply_love.lower()
    print("✅ API 'I love you' does not jump to career advice!")

    # 5. 'what do I do now?'
    res_step1 = client.post("/api/chat", json={"message": "what do I do now?", "history": []})
    assert res_step1.status_code == 200
    reply_s1 = res_step1.json()["reply"]
    print("\nAPI Step 1:\n", reply_s1[:140], "...")

    hist_s = [
        {"role": "user", "content": "what do I do now?"},
        {"role": "assistant", "content": reply_s1}
    ]
    res_step2 = client.post("/api/chat", json={"message": "what do I do now?", "history": hist_s})
    assert res_step2.status_code == 200
    reply_s2 = res_step2.json()["reply"]
    print("\nAPI Step 2:\n", reply_s2[:140], "...")
    assert reply_s2 != reply_s1
    assert "earlier steps" in reply_s2.lower() or "today" in reply_s2.lower()
    print("✅ API 'what do I do now?' does not repeat earlier steps!")

if __name__ == "__main__":
    test_python_gemini_engine()
    test_fastapi_chat_endpoint()

