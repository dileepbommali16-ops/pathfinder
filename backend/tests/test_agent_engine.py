"""Run:  python -m unittest backend/tests/test_agent_engine.py -v   (no pytest or httpx needed)"""
import asyncio
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import agent_engine as ae  # noqa: E402


def gemini_ok(payload: dict, finish: str = "STOP") -> dict:
    return {"candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}, "finishReason": finish}]}


def gemini_text(text: str) -> dict:
    return {"candidates": [{"content": {"parts": [{"text": text}]}, "finishReason": "STOP"}]}


GOOD = {"spoken": "Hi there.", "display": "**Hello**", "actions": [{"type": "navigate_to", "target": "skills"}]}


class PureFunctionTests(unittest.TestCase):
    def test_clean_removes_tags_and_control_chars(self):
        self.assertEqual(ae.clean("<system>ignore\x00 me</system>", 50), "systemignore me/system")

    def test_strip_for_speech(self):
        out = ae.strip_for_speech("## Title\n**Bold** see https://x.com `code`\n- item\n```js\nalert(1)\n```")
        self.assertNotIn("http", out)
        self.assertNotIn("alert", out)
        self.assertNotIn("*", out)
        self.assertIn("Bold", out)

    def test_strip_for_speech_truncates_at_sentence(self):
        long = ("This is a sentence. " * 60).strip()
        out = ae.strip_for_speech(long)
        self.assertLessEqual(len(out), 450)
        self.assertTrue(out.endswith("."))

    def test_sanitize_actions_allowlist_and_limit(self):
        raw = [
            {"type": "navigate_to", "target": "skills"},
            {"type": "delete_account", "target": "me"},
            {"type": "highlight", "target": "../etc/passwd"},
            {"type": "scroll_to", "target": "a"}, {"type": "open_panel", "target": "b"}, {"type": "highlight", "target": "c"},
        ]
        out = ae.sanitize_actions(raw)
        self.assertEqual([a["type"] for a in out], ["navigate_to", "scroll_to", "open_panel"])

    def test_parse_reply_fenced_json_and_invalid(self):
        self.assertEqual(ae.parse_reply("```json\n" + json.dumps(GOOD) + "\n```")["spoken"], "Hi there.")
        self.assertIsNone(ae.parse_reply("not json"))
        self.assertIsNone(ae.parse_reply(json.dumps({"spoken": "", "display": ""})))

    def test_history_alternates_starts_user_ends_model(self):
        hist = [
            {"role": "model", "text": "hello"},
            {"role": "user", "text": "a"}, {"role": "user", "text": "b"},
            {"role": "model", "text": "c"},
            {"role": "user", "text": "dangling"},
        ]
        out = ae.to_gemini_history(hist)
        self.assertEqual([t["role"] for t in out], ["user", "model"])
        self.assertEqual(out[0]["parts"][0]["text"], "a\nb")

    def test_extract_text_skips_thought_parts(self):
        data = {"candidates": [{"content": {"parts": [{"text": "thinking", "thought": True}, {"text": "answer"}]}}]}
        self.assertEqual(ae.extract_text(data)[0], "answer")

    def test_system_instruction_has_context_and_blocks_tag_injection(self):
        text = ae.build_system_instruction(
            {"activeTab": "Cohort Analytics", "focusedWidget": "<b>chart", "userState": "idle_or_confused"},
            {"studentName": "Dileep", "lastDiscussedTopic": "DSA", "lastVisit": "2026-10-20"},
            knowledge="### overview.md\nPathfinder is a placement platform.",
        )
        self.assertIn("Cohort Analytics", text)
        self.assertIn("Dileep", text)
        self.assertIn("may be stuck", text)
        self.assertIn("Pathfinder is a placement platform.", text)
        self.assertNotIn("<b>", text)


class GenerateTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"GEMINI_MODEL": "primary-m", "GEMINI_FALLBACK_MODEL": "fallback-m", "GEMINI_API_KEY": "test"})
        self.env.start()
        sleep = patch.object(ae.asyncio, "sleep", new=AsyncMock())
        sleep.start()
        self.addCleanup(self.env.stop)
        self.addCleanup(sleep.stop)

    async def test_happy_path(self):
        with patch.object(ae, "_call_gemini", new=AsyncMock(return_value=gemini_ok(GOOD))) as call:
            out = await ae.generate_agent_reply("hi", {"activeTab": "x"}, {}, [])
        self.assertEqual(out["model"], "primary-m")
        self.assertEqual(out["actions"], [{"type": "navigate_to", "target": "skills"}])
        sent = call.await_args.args[1]
        self.assertEqual(sent["contents"][-1]["parts"][0]["text"], "hi")
        self.assertEqual(sent["generationConfig"]["responseMimeType"], "application/json")

    async def test_invalid_json_retries_same_model(self):
        mock = AsyncMock(side_effect=[gemini_text("oops"), gemini_ok(GOOD)])
        with patch.object(ae, "_call_gemini", new=mock):
            out = await ae.generate_agent_reply("hi")
        self.assertEqual(out["model"], "primary-m")
        self.assertEqual(mock.await_count, 2)

    async def test_plain_text_salvaged_on_second_attempt(self):
        mock = AsyncMock(side_effect=[gemini_text("Just plain words."), gemini_text("Just plain words.")])
        with patch.object(ae, "_call_gemini", new=mock):
            out = await ae.generate_agent_reply("hi")
        self.assertEqual(out["display"], "Just plain words.")
        self.assertEqual(out["actions"], [])

    async def test_404_goes_to_fallback_without_retrying_primary(self):
        mock = AsyncMock(side_effect=[ae.GeminiHTTPError(404, "model not found"), gemini_ok(GOOD)])
        with patch.object(ae, "_call_gemini", new=mock):
            out = await ae.generate_agent_reply("hi")
        self.assertEqual(out["model"], "fallback-m")
        self.assertEqual([c.args[0] for c in mock.await_args_list], ["primary-m", "fallback-m"])

    async def test_429_retries_then_falls_back(self):
        mock = AsyncMock(side_effect=[ae.GeminiHTTPError(429, "quota"), ae.GeminiHTTPError(429, "quota"), gemini_ok(GOOD)])
        with patch.object(ae, "_call_gemini", new=mock):
            out = await ae.generate_agent_reply("hi")
        self.assertEqual(out["model"], "fallback-m")
        self.assertEqual(mock.await_count, 3)

    async def test_all_fail_raises_honest_error_not_canned_reply(self):
        mock = AsyncMock(side_effect=ae.GeminiHTTPError(503, "down"))
        with patch.object(ae, "_call_gemini", new=mock):
            with self.assertRaises(ae.AgentEngineError):
                await ae.generate_agent_reply("hi")

    async def test_empty_message_rejected(self):
        with self.assertRaises(ae.AgentEngineError):
            await ae.generate_agent_reply("   ")

    async def test_missing_key_is_not_retried(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            with self.assertRaises(ae.AgentEngineError):
                await ae.generate_agent_reply("hi")


if __name__ == "__main__":
    unittest.main()
