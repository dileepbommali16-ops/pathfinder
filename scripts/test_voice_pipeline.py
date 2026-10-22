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

    print("\nALL 5 PIPELINE TESTS PASSED SUCCESSFULY!")

if __name__ == "__main__":
    test_pipeline()
