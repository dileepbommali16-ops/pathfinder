"""
Benchmark script to measure before and after timings for the AI Career Coach chat route:
- Time to first token (TTFT)
- Total response time
- Gemini call duration
- Tool calls count & duration
- History size (turns & characters)
- System instruction size (characters & estimated tokens)
"""

import sys
import os
import json
import time
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
elif hasattr(sys.stdout, "buffer"):
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "replace")

from backend.gemini_engine import (
    chat_with_mentor,
    load_system_instruction,
    get_detailed_project_context,
    get_compact_project_catalog
)
from backend.models import StudentProfile

def measure_chat_baseline():
    print("=" * 70)
    print("AI CAREER COACH CHAT ROUTE - BASELINE PERFORMANCE AUDIT")
    print("=" * 70)

    test_queries = [
        {
            "label": "Test 1: Casual / General Greeting",
            "query": "hi, can you help me prepare for placements?",
            "tab": "coach",
            "history": []
        },
        {
            "label": "Test 2: Statistics & Placement Tool Grounding",
            "query": "Which branch got the highest package and what are the CSE placement numbers?",
            "tab": "analytics",
            "history": [
                {"role": "user", "content": "hi"},
                {"role": "assistant", "content": "Hello! I am your AI placement coach. How can I assist you today?"}
            ]
        },
        {
            "label": "Test 3: Project Architecture Deep-Dive",
            "query": "Let's discuss how to build 'Distributed Asynchronous Job Queue'. What is the architecture?",
            "tab": "projects",
            "history": [
                {"role": "user", "content": "I want to build an advanced backend project for Tier-1 companies."},
                {"role": "assistant", "content": "The Distributed Asynchronous Job Queue with Redis and Celery is an outstanding choice."}
            ]
        },
        {
            "label": "Test 4: Live Technical Question (Gemini Call)",
            "query": "Explain optimistic locking vs pessimistic locking in database transactions with concurrency code example.",
            "tab": "coach",
            "history": [
                {"role": "user", "content": "I am preparing for an SDE 2 database round."},
                {"role": "assistant", "content": "Let's focus on transactional isolation, MVCC, and row-level locking."}
            ]
        },
        {
            "label": "Test 5: Live Behavioral STAR Interview (Gemini Call)",
            "query": "How should I structure my answer using STAR for a time I resolved a conflict with a senior engineer?",
            "tab": "defense",
            "history": []
        }
    ]

    profile = StudentProfile(
        name="Priyanka",
        branch="CSE",
        cgpa=8.4,
        backlogs=0,
        internships=1,
        coding=8.0,
        communication=7.5,
        target_role="Software Development Engineer (SDE)",
        target_tier="Product Companies / Tier-1 MNCs"
    )

    base_sys_instruction = load_system_instruction()
    base_catalog = get_compact_project_catalog()

    print(f"Base System Instruction Size: {len(base_sys_instruction)} chars (~{len(base_sys_instruction)//4} tokens)")
    print(f"Compact Project Catalog Size: {len(base_catalog)} chars (~{len(base_catalog)//4} tokens)")
    print("-" * 70)

    results = []

    for test in test_queries:
        label = test["label"]
        query = test["query"]
        tab = test["tab"]
        history = test["history"]

        history_chars = sum(len(h.get("content", "")) for h in history)
        history_turns = len(history)

        t_start = time.perf_counter()
        reply, meta = chat_with_mentor(
            message=query,
            history=history,
            profile=profile,
            active_tab=tab,
            page_context={"active_tab": tab, "targetRole": "SDE"},
            return_meta=True
        )
        total_time_ms = round((time.perf_counter() - t_start) * 1000, 2)

        # Estimate TTFT for non-streaming baseline as total gemini execution time
        ttft_ms = meta.get("gemini_call_ms", total_time_ms)

        res = {
            "label": label,
            "query": query,
            "total_time_ms": total_time_ms,
            "ttft_ms": ttft_ms,
            "gemini_call_ms": meta.get("gemini_call_ms", 0.0),
            "prep_ms": meta.get("prep_ms", 0.0),
            "model_used": meta.get("model_used", "unknown"),
            "history_turns": history_turns,
            "history_chars": history_chars,
            "sys_instruction_chars": len(base_sys_instruction),
            "reply_length_chars": len(reply),
            "reply_snippet": reply[:120].replace("\n", " ")
        }
        results.append(res)

        print(f"\n{label}:")
        print(f"  • Query: \"{query}\"")
        print(f"  • Total Time: {total_time_ms} ms | Gemini Call: {meta.get('gemini_call_ms', 0)} ms")
        print(f"  • Model Used: {meta.get('model_used')}")
        print(f"  • History Size: {history_turns} turns ({history_chars} chars)")
        print(f"  • System Instruction: {len(base_sys_instruction)} chars (~{len(base_sys_instruction)//4} tokens)")
        print(f"  • Reply ({len(reply)} chars): \"{reply[:90]}...\"")

    return results

if __name__ == "__main__":
    measure_chat_baseline()
