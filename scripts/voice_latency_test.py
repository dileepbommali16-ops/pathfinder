"""
Voice Agent Latency Benchmark Script
Measures Time-To-First-Token (TTFT), total stream duration, and token throughput
from POST /api/voice/stream (both local ASGI transport and live Render deployment).
"""

import os
import sys
import time
import json
import asyncio
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

try:
    import httpx
except ImportError:
    print("httpx is required for voice latency testing. Install with: pip install httpx")
    sys.exit(1)


async def benchmark_endpoint(client: httpx.AsyncClient, url: str, test_name: str, payload: dict):
    print(f"\n========================================================")
    print(f"BENCHMARK: {test_name}")
    print(f"Target URL: {url}")
    print(f"Payload query: '{payload.get('message')}' | Lang: {payload.get('language')}")
    print(f"--------------------------------------------------------")

    start_time = time.perf_counter()
    first_token_time = None
    first_token_content = ""
    token_count = 0
    full_text = ""
    ttft_ms = None

    try:
        async with client.stream("POST", url, json=payload, timeout=60.0) as response:
            if response.status_code != 200:
                print(f"FAILED with HTTP Status {response.status_code}")
                body = await response.aread()
                print(f"Error body: {body.decode('utf-8', errors='ignore')}")
                return None

            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue

                line_data = line[len("data:"):].strip()
                if not line_data:
                    continue

                try:
                    chunk = json.loads(line_data)
                    token = chunk.get("token", "")
                    if token and first_token_time is None:
                        first_token_time = time.perf_counter()
                        first_token_content = token
                        ttft_ms = round((first_token_time - start_time) * 1000, 2)

                    if token:
                        token_count += 1
                        full_text += token

                    if chunk.get("done"):
                        break
                except Exception:
                    pass

        total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Parse spoken words before ---SCREEN---
        parts = full_text.split("---SCREEN---")
        spoken_part = parts[0].strip()
        spoken_words = len(spoken_part.split())

        print(f"STATUS: SUCCESS")
        print(f"Time to First Token (TTFT): {ttft_ms} ms")
        print(f"Total Stream Duration:     {total_time_ms} ms")
        print(f"Total Tokens Streamed:     {token_count}")
        print(f"Spoken Word Count:         {spoken_words} words (Limit: 45-50 words)")
        print(f"Spoken Text Preview:       \"{spoken_part[:120]}...\"")
        print(f"Screen Section Present:    {'Yes' if len(parts) > 1 else 'No'}")
        if "[[NAVIGATE:" in full_text:
            print(f"Action Detected:           Navigation Tag Present")
        if "[[ACTION:BUILD_RESUME]]" in full_text:
            print(f"Action Detected:           Resume Builder Action Present")

        return {
            "name": test_name,
            "url": url,
            "ttft_ms": ttft_ms,
            "total_ms": total_time_ms,
            "tokens": token_count,
            "spoken_words": spoken_words,
            "spoken_preview": spoken_part[:120]
        }

    except Exception as e:
        print(f"BENCHMARK ERROR: {e}")
        return None


async def main():
    print("=" * 60)
    print("PATHFINDER 2.0 AI VOICE AGENT — LATENCY & PIPELINE BENCHMARK")
    print("=" * 60)

    # 1. Local in-process ASGI Benchmark (guaranteed zero network overhead)
    from backend.main import app
    results = []

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as local_client:
        # Test A: Service vs Product company preparation in English
        res_a = await benchmark_endpoint(
            local_client,
            "/api/voice/stream",
            "Local Engine: SDE Service vs Product Dual-Track (en-IN)",
            {
                "message": "What is the difference between Service and Product company preparation?",
                "language": "en-IN",
                "active_tab": "coach",
                "profile": {"cgpa": 7.8, "targetRole": "SDE", "branch": "CSE"}
            }
        )
        if res_a:
            results.append(res_a)

        # Test B: Telugu voice query
        res_b = await benchmark_endpoint(
            local_client,
            "/api/voice/stream",
            "Local Engine: Telugu Navigation Voice Command (te-IN)",
            {
                "message": "Skills tab ki teesukelli bro",
                "language": "te-IN",
                "active_tab": "overview"
            }
        )
        if res_b:
            results.append(res_b)

        # Test C: 23-Project Blueprint Tutor
        res_c = await benchmark_endpoint(
            local_client,
            "/api/voice/stream",
            "Local Engine: Project Tutor Blueprint Instruction (en-IN)",
            {
                "message": "Teach me the Distributed Asynchronous Job Queue project step by step",
                "language": "en-IN",
                "active_tab": "projects",
                "tutor_state": {"projectId": "proj-sde-1", "stepIndex": 1}
            }
        )
        if res_c:
            results.append(res_c)

        # Test D: ATS Resume Builder voice command
        res_d = await benchmark_endpoint(
            local_client,
            "/api/voice/stream",
            "Local Engine: ATS Resume Builder Trigger (en-IN)",
            {
                "message": "Build my resume with my projects and skills",
                "language": "en-IN",
                "active_tab": "coach"
            }
        )
        if res_d:
            results.append(res_d)

    # 2. Remote Render Cloud Deployment Benchmark
    remote_base = os.getenv("RENDER_URL", "https://pathfinder-backend-klrp.onrender.com").rstrip("/")
    print(f"\n========================================================")
    print(f"BENCHMARK: Live Cloud Deployment ({remote_base})")
    print(f"--------------------------------------------------------")
    try:
        async with httpx.AsyncClient(timeout=30.0) as remote_client:
            # First check health
            health_start = time.perf_counter()
            health_resp = await remote_client.get(f"{remote_base}/api/health")
            health_ms = round((time.perf_counter() - health_start) * 1000, 2)
            print(f"Remote Health Check: HTTP {health_resp.status_code} in {health_ms} ms")

            res_remote = await benchmark_endpoint(
                remote_client,
                f"{remote_base}/api/voice/stream",
                "Remote Live Deployment: Voice Stream Test",
                {
                    "message": "Explain ACID properties in DBMS for an interview",
                    "language": "en-IN",
                    "active_tab": "coach"
                }
            )
            if res_remote:
                results.append(res_remote)
    except Exception as e:
        print(f"Remote benchmark skipped or cold-start notice: {e}")

    # Summary Table
    print("\n" + "=" * 60)
    print("FINAL LATENCY BENCHMARK SUMMARY")
    print("=" * 60)
    for r in results:
        print(f"• {r['name']}:")
        print(f"    - TTFT (Time to First Token): {r['ttft_ms']} ms")
        print(f"    - Total Stream Time:         {r['total_ms']} ms")
        print(f"    - Spoken Length:              {r['spoken_words']} words")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
