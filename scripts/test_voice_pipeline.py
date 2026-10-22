import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import scripts.complete_voice_agent as cva

def test_pipeline():
    # Test 1: Calculate tool JSON
    r1 = cva.process_response('{"tool": "calculate", "expression": "25 * 4 + 10"}')
    print("Test 1 Result:", r1)
    assert "110" in r1

    # Test 2: Markdown fenced tool JSON
    r2 = cva.process_response('```json\n{"tool": "get_current_time"}\n```')
    print("Test 2 Result:", r2)
    assert "The current time is" in r2

    # Test 3: Placement stats tool JSON
    r3 = cva.process_response('{"tool": "get_placement_stats", "branch": "CSE"}')
    print("Test 3 Result:", r3)
    assert "Computer Science" in r3

    # Test 4: Project search tool JSON
    r4 = cva.process_response('{"tool": "search_career_projects", "query": "RAG"}')
    print("Test 4 Result:", r4)
    assert "recommend" in r4

    # Test 5: Plain conversational reply
    r5 = cva.process_response('Hello Dileep, ready to prepare for your tech interview!')
    print("Test 5 Result:", r5)
    assert "Hello Dileep" in r5

    # Test 6: Qualification tool JSON (Photos 1 & 2)
    r6 = cva.process_response('{"tool": "qualify_candidate", "branch": "CSE", "target_role": "SDE", "timeline_days": 30, "dsa_confidence": 8}')
    print("Test 6 Result:", r6)
    assert "Candidate qualified" in r6

    # Test 7: Booking mock interview tool JSON (Photos 1 & 2)
    r7 = cva.process_response('{"tool": "book_mock_interview", "slot_date": "Tomorrow at 5:00 PM", "interview_type": "SDE Technical"}')
    print("Test 7 Result:", r7)
    assert "Mock interview successfully scheduled" in r7

    # Test 8: Escalation to human mentor tool JSON (Photos 1 & 2)
    r8 = cva.process_response('{"tool": "escalate_to_human_mentor", "reason": "Complex backlog advice", "candidate_name": "Dileep"}')
    print("Test 8 Result:", r8)
    assert "Escalation initiated" in r8

    print("\nALL 8 ADVANCED PIPELINE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_pipeline()
