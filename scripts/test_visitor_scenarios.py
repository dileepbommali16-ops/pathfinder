"""
Visitor Experience Scenario Verification for Pathfinder AI Career Coach
Simulates a fresh visitor asking 6 distinct queries:
1. "What is this website?" (from Dashboard overview)
2. "I don't understand this score, what does it mean?" (from readiness score card)
3. "How do I build Distributed Asynchronous Job Queue & Rate Limiter?" step by step
4. "How do I build Automated Multi-Environment GitOps & Canary Deployment Engine?" step by step (differentiated from #3)
5. A vague "I don't get it" with no other context (Coach asks clarifying question)
6. A follow-up continuing from #3 ("what about the database design specifically?")
"""

import sys
import difflib
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.gemini_engine import chat_with_mentor, _calculate_similarity
from backend.models import StudentProfile, ChatMessage

def run_tests():
    print("=" * 80)
    print("TESTING AS A CONFUSED FIRST-TIME VISITOR (6 SCENARIOS)")
    print("=" * 80)

    # Fresh visitor with no prior history
    fresh_profile = StudentProfile(
        user_id="usr_visitor_test_99",
        full_name="Fresh Visitor",
        branch="CSE",
        cgpa=7.5,
        active_backlogs=0,
        internships=1,
        coding=7,
        communication=6,
        target_role="Software Development Engineer (SDE)"
    )

    results = {}

    # Scenario 1: "What is this website?" (from Dashboard overview)
    print("\n--- [SCENARIO 1: 'What is this website?'] ---")
    q1 = "What is this website?"
    r1 = chat_with_mentor(
        message=q1,
        history=[],
        profile=fresh_profile,
        active_tab="overview",
        page_context={"screenName": "Dashboard / Platform Overview", "activeTabTitle": "Dashboard Overview"}
    )
    results["scenario_1"] = {"query": q1, "reply": r1}
    print(f"Coach Reply 1:\n{r1}\n")
    assert "Pathfinder 2.0" in r1, "Scenario 1 failed: Should introduce Pathfinder 2.0"
    assert "Random Forest" in r1 or "Placement Probability" in r1, "Scenario 1 failed: Should mention Placement Engine"

    # Scenario 2: "I don't understand this score, what does it mean?" (from readiness score card)
    print("\n--- [SCENARIO 2: 'I don't understand this score, what does it mean?'] ---")
    q2 = "I don't understand this score, what does it mean?"
    r2 = chat_with_mentor(
        message=q2,
        history=[ChatMessage(role="user", content=q1), ChatMessage(role="assistant", content=r1)],
        profile=fresh_profile,
        active_tab="overview",
        page_context={
            "screenName": "Dashboard Overview",
            "cardContext": "Readiness Probability Score Gauge: 74% (Solid Foundation)",
            "placementReadinessChance": "74%",
            "placementReadinessLabel": "Solid Foundation"
        }
    )
    results["scenario_2"] = {"query": q2, "reply": r2}
    print(f"Coach Reply 2:\n{r2}\n")
    assert "Readiness Score" in r2 or "probability" in r2.lower(), "Scenario 2 failed: Should explain readiness score"
    assert "CGPA" in r2 and "Backlogs" in r2, "Scenario 2 failed: Should break down the core vectors"

    # Scenario 3: "How do I build [Project Name 1]?" (Distributed Asynchronous Job Queue & Rate Limiter)
    print("\n--- [SCENARIO 3: 'How do I build Distributed Asynchronous Job Queue & Rate Limiter?'] ---")
    q3 = "How do I build Distributed Asynchronous Job Queue & Rate Limiter step by step?"
    r3 = chat_with_mentor(
        message=q3,
        history=[],
        profile=fresh_profile,
        active_tab="projects",
        page_context={"projectTitle": "Distributed Asynchronous Job Queue & Rate Limiter"}
    )
    results["scenario_3"] = {"query": q3, "reply": r3}
    print(f"Coach Reply 3:\n{r3}\n")
    assert "Distributed Asynchronous Job Queue" in r3, "Scenario 3 failed: Should mention Project 1"
    assert "Redis" in r3 and "FastAPI" in r3, "Scenario 3 failed: Should mention Redis and FastAPI"

    # Scenario 4: "How do I build [Project Name 2]?" (Automated Multi-Environment GitOps & Canary Deployment Engine)
    print("\n--- [SCENARIO 4: 'How do I build Automated Multi-Environment GitOps & Canary Deployment Engine?'] ---")
    q4 = "How do I build Automated Multi-Environment GitOps & Canary Deployment Engine step by step?"
    r4 = chat_with_mentor(
        message=q4,
        history=[],
        profile=fresh_profile,
        active_tab="projects",
        page_context={"projectTitle": "Automated Multi-Environment GitOps & Canary Deployment Engine"}
    )
    results["scenario_4"] = {"query": q4, "reply": r4}
    print(f"Coach Reply 4:\n{r4}\n")
    assert "GitOps" in r4 or "Canary" in r4, "Scenario 4 failed: Should mention GitOps/Canary"
    assert "Argo Rollouts" in r4 or "Kubernetes" in r4 or "Prometheus" in r4, "Scenario 4 failed: Should mention Argo Rollouts/K8s/Prometheus"

    # Check differentiation between Project 1 and Project 2
    sim_3_4 = _calculate_similarity(r3, r4)
    print(f"[Verification] Similarity between Project 1 and Project 2: {sim_3_4:.2%}")
    assert sim_3_4 < 0.40, f"Scenario 3 vs 4 failed: Replies too similar ({sim_3_4:.2%})!"

    # Scenario 5: Vague "I don't get it" with no other context
    print("\n--- [SCENARIO 5: Vague 'I don't get it'] ---")
    q5 = "I don't get it"
    r5 = chat_with_mentor(
        message=q5,
        history=[],
        profile=fresh_profile,
        active_tab="overview"
    )
    results["scenario_5"] = {"query": q5, "reply": r5}
    print(f"Coach Reply 5:\n{r5}\n")
    assert "?" in r5, "Scenario 5 failed: Should ask a clarifying question"
    assert any(term in r5.lower() for term in ["wondering", "tell me", "specifically", "which card"]), "Scenario 5 failed: Coach should gently ask what they are confused about"

    # Scenario 6: Follow-up question continuing from #3 ("what about the database design specifically?")
    print("\n--- [SCENARIO 6: Follow-up to #3 'what about the database design specifically?'] ---")
    q6 = "what about the database design specifically?"
    # Pass history from Scenario 3
    history_from_3 = [
        ChatMessage(role="user", content=q3),
        ChatMessage(role="assistant", content=r3)
    ]
    r6 = chat_with_mentor(
        message=q6,
        history=history_from_3,
        profile=fresh_profile,
        active_tab="projects",
        page_context={"activeTabTitle": "Project Blueprints"}
    )
    results["scenario_6"] = {"query": q6, "reply": r6}
    print(f"Coach Reply 6:\n{r6}\n")
    assert "Database" in r6 or "Schema" in r6, "Scenario 6 failed: Should explain database architecture"
    assert "Distributed Asynchronous Job Queue" in r6 or "PROJ-SDE-01" in r6 or "jobs" in r6.lower(), "Scenario 6 failed: Should maintain context of Project 1"

    print("=" * 80)
    print("ALL 6 VISITOR SCENARIOS PASSED WITH HIGH DISTINCTION & CONTEXT AWARENESS!")
    print("=" * 80)
    return results

if __name__ == "__main__":
    run_tests()
