import urllib.request
import json
import time
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

url = "https://pathfinder-backend-klrp.onrender.com/api/chat"

test_questions = [
    ("Test 1 (Greeting)", "hi", "overview"),
    ("Test 2 (Placement Statistics)", "Which branch got the highest package and how many students were placed in CSE?", "analytics"),
    ("Test 3 (Project Architecture)", "Let us discuss how to build Distributed Asynchronous Job Queue. What should the system architecture look like?", "projects")
]

results = []

for label, q, tab in test_questions:
    print(f"\nSending {label}...")
    payload = json.dumps({"message": q, "history": [], "active_tab": tab}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    
    t_client_start = time.perf_counter()
    resp = urllib.request.urlopen(req, timeout=75)
    t_client_end = time.perf_counter()
    
    client_roundtrip_ms = round((t_client_end - t_client_start) * 1000, 2)
    data = json.loads(resp.read().decode("utf-8"))
    timings = data.get("timings_ms", {})
    reply = data.get("reply", "")
    
    results.append({
        "label": label,
        "question": q,
        "client_roundtrip_ms": client_roundtrip_ms,
        "timings": timings,
        "reply_preview": reply[:150]
    })
    
    print(f"-> Done in {client_roundtrip_ms} ms (Server: {timings.get('total_request_ms')} ms, Gemini: {timings.get('gemini_call_ms')} ms, Model: {timings.get('model_used')})")

print("\n" + "=" * 80)
print("FINAL BENCHMARK REPORT (STAGE-BY-STAGE)")
print("=" * 80)
for r in results:
    print(f"\n{r['label']}: \"{r['question']}\"")
    print(f"  • Total Client Round-Trip Time: {r['client_roundtrip_ms']} ms")
    t = r['timings']
    print(f"  • Server Total Request Time:    {t.get('total_request_ms')} ms")
    print(f"  • Auth / Rate Limit Check:       {t.get('auth_ratelimit_ms')} ms")
    print(f"  • Context Preparation & Tools:   {t.get('prep_ms')} ms")
    print(f"  • Gemini API Execution:          {t.get('gemini_call_ms')} ms")
    print(f"  • Model Selected:                {t.get('model_used')}")
    print(f"  • Novelty / Similarity Check:    {t.get('novelty_ms')} ms")
    print(f"  • Network & SSL Overhead:        {round(r['client_roundtrip_ms'] - t.get('total_request_ms', 0), 2)} ms")
    print(f"  • Model Attempts Breakdown:      {t.get('attempts')}")
    print(f"  • Response Preview:              \"{r['reply_preview']}...\"")
