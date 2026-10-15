"""
Unit & Integration Test Suite for Pathfinder AI Voice Agent
Tests:
  1. Sentence splitter for fast streaming TTS delivery
  2. ---SCREEN--- marker parser (spoken vs screen content)
  3. TTS text cleaner: markdown/code/URL stripper and CS acronym expansion
  4. Project Tutor state machine (next, repeat, simpler, back, where was I) across 23 blueprints
  5. Site Guide catalog and [[NAVIGATE:...]] tags
  6. ATS Resume builder trigger [[ACTION:BUILD_RESUME]]
  7. History truncation & grounding
"""

import sys
import os
import re
import unittest
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.voice_engine import (
    clean_tts_speech,
    load_projects_catalog,
    load_site_guide,
    PROJECT_TUTOR_STEPS,
    generate_local_voice_reply,
    build_voice_system_prompt
)


class TestSentenceSplitter(unittest.TestCase):
    """Verifies that streamed tokens can be split into natural spoken sentences."""

    def split_sentences(self, text: str):
        if not text.strip():
            return []
        raw = re.split(r"(?<=[.!?])\s+|\n\n+", text)
        return [s.strip() for s in raw if s.strip()]

    def test_multi_sentence_split(self):
        text = "Yes, absolutely! Modern product startups prioritize problem solving. Would you like a roadmap?"
        sentences = self.split_sentences(text)
        self.assertEqual(len(sentences), 3)
        self.assertEqual(sentences[0], "Yes, absolutely!")
        self.assertEqual(sentences[1], "Modern product startups prioritize problem solving.")
        self.assertEqual(sentences[2], "Would you like a roadmap?")

    def test_single_sentence(self):
        text = "Service drives evaluate speed in quantitative aptitude."
        sentences = self.split_sentences(text)
        self.assertEqual(len(sentences), 1)
        self.assertEqual(sentences[0], "Service drives evaluate speed in quantitative aptitude.")

    def test_empty_string(self):
        sentences = self.split_sentences("")
        self.assertEqual(sentences, [])


class TestScreenMarkerParser(unittest.TestCase):
    """Verifies parsing of the ---SCREEN--- delimiter."""

    def parse_screen_marker(self, content: str):
        if "---SCREEN---" in content:
            parts = content.split("---SCREEN---")
            return {
                "spoken": parts[0].strip(),
                "screen": "---SCREEN---".join(parts[1:]).strip(),
                "has_screen": True,
            }
        return {
            "spoken": content.strip(),
            "screen": "",
            "has_screen": False,
        }

    def test_marker_separation(self):
        full = "This is spoken to the candidate aloud.\n---SCREEN---\n### Detailed Architecture\n- Step 1: Install FastAPI"
        parsed = self.parse_screen_marker(full)
        self.assertTrue(parsed["has_screen"])
        self.assertEqual(parsed["spoken"], "This is spoken to the candidate aloud.")
        self.assertIn("### Detailed Architecture", parsed["screen"])
        self.assertIn("FastAPI", parsed["screen"])

    def test_no_marker(self):
        full = "Simple conversational reply without markdown screen content."
        parsed = self.parse_screen_marker(full)
        self.assertFalse(parsed["has_screen"])
        self.assertEqual(parsed["spoken"], full)
        self.assertEqual(parsed["screen"], "")


class TestTtsCleanerAndAcronyms(unittest.TestCase):
    """Verifies that markdown, code blocks, URLs, and symbols are stripped, and CS acronyms expanded."""

    def test_markdown_and_url_stripping(self):
        raw = "Check [FastAPI Docs](https://fastapi.tiangolo.com) and `import uvicorn` for **high** performance!"
        cleaned = clean_tts_speech(raw)
        self.assertNotIn("https://", cleaned)
        self.assertNotIn("`", cleaned)
        self.assertNotIn("**", cleaned)
        self.assertNotIn("[", cleaned)
        self.assertIn("FastAPI", cleaned)

    def test_acronym_expansions(self):
        raw = "Your CGPA is 8.0, focus on DSA, DBMS, and SQL with O(n log n) complexity for SDE roles."
        cleaned = clean_tts_speech(raw)
        self.assertIn("C G P A", cleaned)
        self.assertIn("D S A", cleaned)
        self.assertIn("D B M S", cleaned)
        self.assertIn("Sequel", cleaned)
        self.assertIn("O of N log N", cleaned)
        self.assertIn("S D E", cleaned)

    def test_no_forbidden_symbols_in_output(self):
        raw = "### Architecture Overview:\n* Step 1: Redis\n* Step 2: Celery"
        cleaned = clean_tts_speech(raw)
        self.assertNotIn("#", cleaned)
        self.assertNotIn("*", cleaned)


class TestProjectTutorCatalogAndStateMachine(unittest.TestCase):
    """Verifies the 23 project blueprints and the tutor step state machine."""

    def test_projects_catalog_count(self):
        catalog = load_projects_catalog()
        self.assertEqual(len(catalog), 23, "Catalog must contain exactly 23 verified project blueprints.")

    def test_canonical_9_steps(self):
        self.assertEqual(len(PROJECT_TUTOR_STEPS), 9, "Tutor must have 9 canonical pedagogical steps.")
        titles = [s["title"] for s in PROJECT_TUTOR_STEPS]
        self.assertIn("Setup & Environment Configuration", titles[0])
        self.assertIn("System Architecture & Component Flow", titles[1])
        self.assertIn("Resume Bullet", titles[8])

    def test_tutor_start_project(self):
        reply = generate_local_voice_reply(
            message="Teach me the Distributed Asynchronous Job Queue project step by step",
            language="en-IN",
            tutor_state=None
        )
        self.assertIn("Step 1 of 9", reply)
        self.assertIn("Does this step make sense?", reply)

    def test_tutor_simpler_command(self):
        reply = generate_local_voice_reply(
            message="simple ga cheppu bro, ardham kaaledu",
            language="en-IN",
            tutor_state={"current_project_id": "proj-sde-1", "step_index": 2}
        )
        self.assertIn("Everyday Analogy", reply)

    def test_tutor_next_command(self):
        reply = generate_local_voice_reply(
            message="next step ki vellu",
            language="en-IN",
            tutor_state={"current_project_id": "proj-sde-1", "step_index": 1}
        )
        self.assertIn("Step 2 of 9", reply)


class TestSiteGuideAndActions(unittest.TestCase):
    """Verifies site guide JSON integration and action triggers."""

    def test_site_guide_catalog(self):
        guide = load_site_guide()
        self.assertIn("features", guide)
        self.assertGreaterEqual(len(guide["features"]), 10)
        tabs = [f["tab"] for f in guide["features"]]
        self.assertIn("skills", tabs)
        self.assertIn("analytics", tabs)
        self.assertIn("defense", tabs)

    def test_navigation_voice_command(self):
        reply = generate_local_voice_reply(
            message="Skills tab ki teesukelli",
            language="te-IN"
        )
        self.assertIn("[[NAVIGATE:skills]]", reply)

    def test_resume_builder_voice_command(self):
        reply = generate_local_voice_reply(
            message="resume build cheyyi bro",
            language="te-IN"
        )
        self.assertIn("[[ACTION:BUILD_RESUME]]", reply)
        self.assertIn("ATS Engineering Resume", reply)


class TestLanguageIntentAndScriptRules(unittest.TestCase):
    """Verifies that queries in Telugu/Hindi/English map to pure script responses."""

    def test_language_intent_detection(self):
        from backend.voice_engine import detect_language_intent
        self.assertEqual(detect_language_intent("naaku telugu lo cheppu bro", "auto"), "te-IN")
        self.assertEqual(detect_language_intent("malli cheppu", "auto"), "te-IN")
        self.assertEqual(detect_language_intent("mujhe hindi me batao", "auto"), "hi-IN")
        self.assertEqual(detect_language_intent("aage batao", "auto"), "hi-IN")
        self.assertEqual(detect_language_intent("How can I prepare for Amazon SDE?", "auto"), "en-IN")

    def test_telugu_reply_contains_telugu_script(self):
        reply = generate_local_voice_reply(
            message="naaku placement gurinchi cheppu",
            language="te-IN"
        )
        spoken_part = reply.split("---SCREEN---")[0]
        # Must contain Telugu Unicode characters (0x0C00 - 0x0C7F)
        has_telugu = any('\u0C00' <= char <= '\u0C7F' for char in spoken_part)
        self.assertTrue(has_telugu, "Spoken reply for Telugu query must use pure Telugu script for natural TTS.")

    def test_hindi_reply_contains_devanagari_script(self):
        reply = generate_local_voice_reply(
            message="mujhe placement ke baare me batao",
            language="hi-IN"
        )
        spoken_part = reply.split("---SCREEN---")[0]
        # Must contain Devanagari Unicode characters (0x0900 - 0x097F)
        has_devanagari = any('\u0900' <= char <= '\u097F' for char in spoken_part)
        self.assertTrue(has_devanagari, "Spoken reply for Hindi query must use Devanagari script for natural TTS.")


class TestTutorResumeAndInterruptionRecovery(unittest.TestCase):
    """Verifies that stopping and resuming continues from step N instead of restarting at 1."""

    def test_resume_from_interrupted_step(self):
        # Student was stopped at step 3, now asks to continue
        reply = generate_local_voice_reply(
            message="continue",
            language="en-IN",
            tutor_state={"currentProjectId": "proj-sde-1", "stepIndex": 3}
        )
        self.assertIn("Step 3 of 9", reply, "Continuing should resume from the current step instead of restarting at Step 1.")
        self.assertNotIn("Step 1 of 9", reply)

    def test_resume_in_telugu_query(self):
        # Student was stopped at step 4, asks in Telugu "malli cheppu"
        reply = generate_local_voice_reply(
            message="malli cheppu",
            language="te-IN",
            tutor_state={"currentProjectId": "proj-sde-1", "stepIndex": 4}
        )
        self.assertIn("Step 4 of 9", reply)

    def test_reselecting_same_project_prompts_resume(self):
        # Student clicks the same blueprint when already at step 5
        reply = generate_local_voice_reply(
            message="Teach me the Distributed Asynchronous Job Queue project step by step",
            language="en-IN",
            tutor_state={"currentProjectId": "proj-sde-1", "stepIndex": 5}
        )
        self.assertIn("Step 5", reply)
        self.assertTrue("continue" in reply.lower() or "resume" in reply.lower() or "step 5" in reply.lower())


if __name__ == "__main__":
    unittest.main()
