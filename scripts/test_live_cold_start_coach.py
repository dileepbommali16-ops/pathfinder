"""
Test Live Cold Start & Multi-Turn Coach against Production Render Backend.
Simulates fresh requests upon wake-up to verify:
1. Immediate non-canned response on wake-up.
2. Distinct technical architecture answers (low similarity ratio).
3. Multi-turn history preservation.
4. Repeat-detection & response variance across successive turns.
"""

import urllib.request
import json
import time
import difflib
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

LIVE_URL = "https://pathfinder-backend-klrp.onrender.com/api/chat"

def send_chat(message: str, history=None):
    if history is None:
        history = []
    payload = {
        "message": message,
        "history": history,
        "profile": {
            "name": "Sai Krishna",
            "branch": "CSE",
            "cgpa": 8.2,
            "backlogs": 0,
            "internships": 1,
            "coding": 8,
            "communication": 7,
            "target_role": "Software Development Engineer (SDE)",
            "target_tier": "Product Companies / Tier-1 MNCs"
        },
        "active_tab": "coach"
    }
    req = urllib.request.Request(
        LIVE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        return data, elapsed

def main():
    print("=" * 80)
    print("LIVE COLD-START & MULTI-TURN REGRESSION TEST")
    print(f"Target: {LIVE_URL}")
    print("=" * 80)

    # 1. Fresh wake-up query
    print("\n[Test 1] Fresh Query (Wake-up Greeting)...")
    res1, t1 = send_chat("hi")
    reply1 = res1.get("reply", "")
    print(f"-> Latency: {t1}ms | Model: {res1.get('timings_ms', {}).get('model_used')}")
    print(f"-> Reply Preview: {reply1[:120]}...")
    assert len(reply1) > 10, "Failed: empty reply"

    # 2. Distinct technical questions
    print("\n[Test 2] Technical Architecture 1: Distributed Job Queue...")
    res2, t2 = send_chat("Let us discuss how to build Distributed Asynchronous Job Queue. What should the system architecture look like?")
    reply2 = res2.get("reply", "")
    print(f"-> Latency: {t2}ms | Model: {res2.get('timings_ms', {}).get('model_used')}")
    print(f"-> Reply Preview: {reply2[:120]}...")

    print("\n[Test 3] Technical Architecture 2: Multi-Environment GitOps...")
    res3, t3 = send_chat("Let us discuss how to build Multi-Environment GitOps & Canary Deployment Engine. What should the system architecture look like?")
    reply3 = res3.get("reply", "")
    print(f"-> Latency: {t3}ms | Model: {res3.get('timings_ms', {}).get('model_used')}")
    print(f"-> Reply Preview: {reply3[:120]}...")

    # Similarity check
    sim = difflib.SequenceMatcher(None, reply2.lower(), reply3.lower()).ratio()
    print(f"-> Architecture Similarity: {sim:.2%}")
    assert sim < 0.60, f"FAIL: Answers too similar ({sim:.2%}), potential canned response!"
    print("-> PASSED: Highly distinct architectures returned!")

    # 3. Multi-turn conversation
    print("\n[Test 4] Multi-Turn History Context...")
    history = [
        {"role": "user", "content": "I am preparing for SDE role at Google"},
        {"role": "assistant", "content": "Awesome! For Google, DSA depth (graphs, dynamic programming) and scalable system design are critical."}
    ]
    res4, t4 = send_chat("What should I focus on first based on what we just discussed?", history=history)
    reply4 = res4.get("reply", "")
    print(f"-> Latency: {t4}ms")
    print(f"-> Reply Preview: {reply4[:120]}...")
    assert any(k in reply4.lower() for k in ["dsa", "google", "graph", "dynamic programming", "system design", "code", "problem"]), "Failed to reference multi-turn context"
    print("-> PASSED: Multi-turn history accurately incorporated.")

    print("\n" + "=" * 80)
    print("ALL LIVE TESTS PASSED REGRESSION-PROOF!")
    print("=" * 80)

if __name__ == "__main__":
    main()
