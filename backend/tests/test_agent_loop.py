"""Run from the repo root:  python -m unittest backend/tests/test_agent_loop.py -v   (no pytest, httpx or pandas needed)"""
import asyncio
import copy
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend import agent_engine as ae  # noqa: E402
from backend.agent import loop as agent_loop  # noqa: E402
from backend.agent import site_map  # noqa: E402
from backend.agent import tools as agent_tools  # noqa: E402


def fc(name, args=None, sig=None):
    part = {"functionCall": {"name": name, "args": args or {}}}
    if sig:
        part["thoughtSignature"] = sig
    return part


def resp(*parts):
    return {"candidates": [{"content": {"role": "model", "parts": list(parts)}, "finishReason": "STOP"}]}


def respond_part(spoken="Done.", display="Done.", **extra):
    return fc("respond", {"spoken": spoken, "display": display, **extra})


def make_call(responses):
    calls = []

    async def call(model, body):
        calls.append((model, copy.deepcopy(body)))
        item = responses.pop(0)
        if isinstance(item, BaseException):
            raise item
        return item

    return call, calls


class AgentLoopTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        env = patch.dict(os.environ, {"GEMINI_MODEL": "primary-m", "GEMINI_FALLBACK_MODEL": "fallback-m", "GEMINI_API_KEY": "test"})
        env.start()
        sleep = patch.object(asyncio, "sleep", new=AsyncMock())
        sleep.start()
        self.addCleanup(env.stop)
        self.addCleanup(sleep.stop)
        ae.reset_knowledge_cache()
        site_map.reset_cache()

    # ---------------------------------------------------------------- basics

    async def test_direct_respond_without_tools(self):
        call, calls = make_call([resp(respond_part("Hi!", "Hello **there**", followups=["a", "b", "c", "d"]))])
        out = await agent_loop.run_agent("hi", call=call)
        self.assertEqual(out["spoken"], "Hi!")
        self.assertEqual(out["followups"], ["a", "b", "c"])  # capped at 3
        self.assertEqual(out["agentState"], {})
        self.assertEqual(out["toolsUsed"], [])
        self.assertEqual(out["model"], "primary-m")

        model, body = calls[0]
        self.assertEqual(body["toolConfig"]["functionCallingConfig"], {"mode": "ANY"})
        names = [d["name"] for d in body["tools"][0]["functionDeclarations"]]
        self.assertIn("respond", names)
        self.assertIn("get_project", names)
        system = body["systemInstruction"]["parts"][0]["text"]
        self.assertIn("PAGES YOU CAN OPEN", system)
        self.assertIn("overview:", system)
        self.assertEqual(body["contents"][-1]["parts"][0]["text"], "hi")

    async def test_tool_then_respond_keeps_thought_signature(self):
        fake = lambda args, ctx: {"project": {"id": args["project_id"], "title": "Job Queue"}}  # noqa: E731
        call, calls = make_call([
            resp(fc("get_project", {"project_id": "p1"}, sig="SIG123")),
            resp(respond_part("It is a job queue.", "It is a job queue.")),
        ])
        with patch.dict(agent_tools.EXECUTORS, {"get_project": fake}):
            out = await agent_loop.run_agent("tell me about p1", call=call)

        self.assertEqual(out["toolsUsed"], ["get_project"])
        second_body = calls[1][1]
        model_turn, tool_turn = second_body["contents"][-2], second_body["contents"][-1]
        self.assertEqual(model_turn["role"], "model")
        self.assertEqual(model_turn["parts"][0]["thoughtSignature"], "SIG123")  # returned unchanged
        self.assertEqual(tool_turn["role"], "user")
        result = tool_turn["parts"][0]["functionResponse"]
        self.assertEqual(result["name"], "get_project")
        self.assertEqual(result["response"]["result"]["project"]["title"], "Job Queue")

    async def test_parallel_tool_calls_answered_in_order(self):
        tools = {
            "get_project": lambda a, c: {"which": "project"},
            "list_projects": lambda a, c: {"which": "list"},
        }
        call, calls = make_call([
            resp(fc("get_project", {"project_id": "p"}), fc("list_projects", {})),
            resp(respond_part()),
        ])
        with patch.dict(agent_tools.EXECUTORS, tools):
            out = await agent_loop.run_agent("go", call=call)
        parts = calls[1][1]["contents"][-1]["parts"]
        self.assertEqual([p["functionResponse"]["name"] for p in parts], ["get_project", "list_projects"])
        self.assertEqual(out["toolsUsed"], ["get_project", "list_projects"])

    # ---------------------------------------------------------------- tool failures

    async def test_unknown_tool_becomes_error_the_model_can_read(self):
        call, calls = make_call([resp(fc("delete_everything", {})), resp(respond_part())])
        await agent_loop.run_agent("go", call=call)
        result = calls[1][1]["contents"][-1]["parts"][0]["functionResponse"]["response"]["result"]
        self.assertIn("Unknown tool", result["error"])

    async def test_tool_exception_is_contained(self):
        def boom(args, ctx):
            raise RuntimeError("database exploded")

        call, calls = make_call([resp(fc("get_project", {"project_id": "x"})), resp(respond_part())])
        with patch.dict(agent_tools.EXECUTORS, {"get_project": boom}):
            out = await agent_loop.run_agent("go", call=call)
        result = calls[1][1]["contents"][-1]["parts"][0]["functionResponse"]["response"]["result"]
        self.assertIn("failed", result["error"])
        self.assertNotIn("exploded", str(result))  # internals never reach the model or the user
        self.assertEqual(out["spoken"], "Done.")

    async def test_large_tool_results_are_truncated(self):
        big = {"rows": ["x" * 500] * 100}
        with patch.dict(agent_tools.EXECUTORS, {"get_project": lambda a, c: big}):
            result = await agent_tools.run_tool("get_project", {}, agent_tools.ToolContext())
        self.assertTrue(result["truncated"])
        self.assertLessEqual(len(result["data"]), agent_tools.MAX_TOOL_RESULT_CHARS)

    # ---------------------------------------------------------------- website control

    async def test_invalid_page_is_fed_back_and_corrected(self):
        call, calls = make_call([
            resp(respond_part(actions=[{"type": "navigate_to", "target": "admin-panel"}])),
            resp(respond_part("Opening skills.", "Opening skills.", actions=[{"type": "navigate_to", "target": "skills"}])),
        ])
        out = await agent_loop.run_agent("open skills", call=call)
        feedback = calls[1][1]["contents"][-1]["parts"][0]["functionResponse"]["response"]["result"]["error"]
        self.assertIn("Valid pages", feedback)
        self.assertEqual(out["actions"], [{"type": "navigate_to", "target": "skills"}])

    async def test_still_invalid_after_one_correction_is_dropped_not_fatal(self):
        bad = respond_part(actions=[{"type": "navigate_to", "target": "nowhere"}, {"type": "run_shell", "target": "rm -rf"}])
        call, _ = make_call([resp(bad), resp(bad)])
        out = await agent_loop.run_agent("go", call=call)
        self.assertEqual(out["actions"], [])
        self.assertEqual(out["spoken"], "Done.")

    async def test_profile_change_is_allowlisted(self):
        call, calls = make_call([
            resp(respond_part(actions=[{"type": "propose_profile_change", "field": "role", "value": "admin"}])),
            resp(respond_part(actions=[{"type": "propose_profile_change", "field": "target_role", "value": "Data Analyst"}])),
        ])
        out = await agent_loop.run_agent("change my target role", call=call)
        self.assertIn("not editable", calls[1][1]["contents"][-1]["parts"][0]["functionResponse"]["response"]["result"]["error"])
        self.assertEqual(out["actions"], [{"type": "propose_profile_change", "field": "target_role", "value": "Data Analyst"}])

    def test_registered_sections_are_enforced(self):
        with patch.object(site_map, "section_ids", return_value=["roadmap-6-week"]):
            ok, errs = site_map.validate_actions([{"type": "highlight", "target": "roadmap-6-week"}])
            self.assertEqual((ok, errs), ([{"type": "highlight", "target": "roadmap-6-week"}], []))
            ok, errs = site_map.validate_actions([{"type": "highlight", "target": "made-up"}])
            self.assertEqual(ok, [])
            self.assertIn("registered section", errs[0])

    def test_actions_are_capped_and_values_cleaned(self):
        many = [{"type": "navigate_to", "target": "skills"}] * 5
        self.assertEqual(len(site_map.validate_actions(many)[0]), 3)
        ok, _ = site_map.validate_actions([{"type": "propose_profile_change", "field": "branch", "value": "<b>CSE</b>"}])
        self.assertNotIn("<", ok[0]["value"])
        self.assertNotIn(">", ok[0]["value"])
        self.assertIn("CSE", ok[0]["value"])

    # ---------------------------------------------------------------- tutor state

    async def test_tutor_state_round_trip(self):
        call, calls = make_call([
            resp(respond_part(tutor={"project_id": "proj-1", "step": 3})),
            resp(respond_part()),
            resp(respond_part(tutor={"project_id": "", "step": 1})),
        ])
        out = await agent_loop.run_agent("next step", agent_state={"tutor": {"project_id": "proj-1", "step": 2}}, call=call)
        self.assertEqual(out["agentState"], {"tutor": {"project_id": "proj-1", "step": 3}})
        self.assertIn("step 2", calls[0][1]["systemInstruction"]["parts"][0]["text"])

        kept = await agent_loop.run_agent("what is that?", agent_state={"tutor": {"project_id": "proj-1", "step": 3}}, call=call)
        self.assertEqual(kept["agentState"], {"tutor": {"project_id": "proj-1", "step": 3}})  # no tutor arg keeps progress

        ended = await agent_loop.run_agent("stop teaching", agent_state={"tutor": {"project_id": "proj-1", "step": 3}}, call=call)
        self.assertEqual(ended["agentState"], {})

    # ---------------------------------------------------------------- termination and fallbacks

    async def test_last_iteration_is_forced_to_respond_and_loop_terminates(self):
        always_tool = resp(fc("get_project", {"project_id": "x"}))
        call, calls = make_call([always_tool] * 8)  # 4 iterations for the primary model, 4 for the fallback
        with patch.dict(agent_tools.EXECUTORS, {"get_project": lambda a, c: {"ok": 1}}):
            with self.assertRaises(agent_loop.AgentLoopError):
                await agent_loop.run_agent("go", call=call)
        self.assertNotIn("allowedFunctionNames", calls[0][1]["toolConfig"]["functionCallingConfig"])
        self.assertEqual(calls[3][1]["toolConfig"]["functionCallingConfig"]["allowedFunctionNames"], ["respond"])

    async def test_plain_text_answer_is_salvaged(self):
        call, _ = make_call([{"candidates": [{"content": {"role": "model", "parts": [{"text": "Just plain words."}]}}]}])
        out = await agent_loop.run_agent("hi", call=call)
        self.assertEqual(out["display"], "Just plain words.")
        self.assertEqual(out["actions"], [])

    async def test_fallback_model_restarts_the_whole_run(self):
        call, calls = make_call([ae.GeminiHTTPError(404, "model not found"), resp(respond_part())])
        out = await agent_loop.run_agent("hi", call=call)
        self.assertEqual([m for m, _ in calls], ["primary-m", "fallback-m"])
        self.assertEqual(len(calls[1][1]["contents"]), 1)  # fresh start, no signatures from the other model
        self.assertEqual(out["model"], "fallback-m")

    async def test_transient_error_is_retried_on_same_model(self):
        call, calls = make_call([ae.GeminiHTTPError(503, "busy"), resp(respond_part())])
        out = await agent_loop.run_agent("hi", call=call)
        self.assertEqual([m for m, _ in calls], ["primary-m", "primary-m"])
        self.assertEqual(out["model"], "primary-m")

    async def test_missing_api_key_is_not_masked(self):
        call, _ = make_call([ae.AgentEngineError("GEMINI_API_KEY is not set")])
        with self.assertRaises(ae.AgentEngineError):
            await agent_loop.run_agent("hi", call=call)

    async def test_empty_message_rejected(self):
        with self.assertRaises(agent_loop.AgentLoopError):
            await agent_loop.run_agent("  ")

    async def test_respond_with_no_text_is_sent_back_for_correction(self):
        call, calls = make_call([resp(fc("respond", {"spoken": "", "display": ""})), resp(respond_part("Fixed.", "Fixed."))])
        out = await agent_loop.run_agent("hi", call=call)
        self.assertIn("needs", calls[1][1]["contents"][-1]["parts"][0]["functionResponse"]["response"]["result"]["error"])
        self.assertEqual(out["spoken"], "Fixed.")

    # ---------------------------------------------------------------- prompt safety and registry

    async def test_prompt_strips_tag_injection_from_context(self):
        system = agent_loop.build_agent_instruction(
            {"activeTab": "<script>x", "focusedWidget": "w", "userState": "idle_or_confused"},
            {"studentName": "Dileep</data>"}, {}, knowledge="KB",
        )
        self.assertNotIn("<script>", system)
        self.assertNotIn("</data>", system)
        self.assertIn("may be stuck", system)

    def test_every_declared_tool_has_an_executor(self):
        names = [d["name"] for d in agent_tools.TOOL_DECLARATIONS]
        self.assertEqual(len(names), len(set(names)))
        self.assertIn("respond", names)
        self.assertNotIn("respond", agent_tools.EXECUTORS)  # respond is handled by the loop, never executed
        for name in names:
            if name != "respond":
                self.assertIn(name, agent_tools.EXECUTORS)
        for decl in agent_tools.TOOL_DECLARATIONS:
            self.assertEqual(decl.get("parameters", {"type": "OBJECT"})["type"], "OBJECT")

    async def test_profile_tool_never_returns_email_or_ids(self):
        ctx = agent_tools.ToolContext(user=None, client_profile={"full_name": "A", "email": "a@b.c", "user_id": "u1", "cgpa": 8.1})
        result = await agent_tools.run_tool("get_student_profile", {}, ctx)
        self.assertEqual(result["profile"], {"full_name": "A", "cgpa": 8.1})


class RealToolWrapperTests(unittest.IsolatedAsyncioTestCase):
    """The wrappers around the website's own data layer, tested with stand-in modules (pandas/pydantic not needed)."""

    @staticmethod
    def fake_module(name, **attrs):
        import types

        mod = types.ModuleType(name)
        for key, value in attrs.items():
            setattr(mod, key, value)
        return mod

    async def test_data_tool_arguments_are_typed_and_filtered(self):
        captured = {}

        def fake_execute(tool_name, arguments):
            captured["tool"], captured["args"] = tool_name, arguments
            return {"ok": True}

        mod = self.fake_module("backend.data_service", execute_data_tool=fake_execute)
        with patch.dict(sys.modules, {"backend.data_service": mod}):
            out = await agent_tools.run_tool(
                "query_cohort_stats", {"year": "2026", "branch": "CSE", "gender": "", "evil": "DROP TABLE"}, agent_tools.ToolContext()
            )
        self.assertEqual(out, {"ok": True})
        self.assertEqual(captured["tool"], "query_cohort_stats")
        self.assertEqual(captured["args"], {"year": 2026, "branch": "CSE"})  # typed, empty and unknown keys dropped

    async def test_projects_list_and_lookup(self):
        projects = [
            {"id": "p1", "title": "Job Queue", "domain": "Backend", "difficulty": "Advanced", "roleId": "sde", "techStack": ["Python"], "overview": "o"},
            {"id": "p2", "title": "Sensor Node", "domain": "Embedded", "difficulty": "Beginner", "roleId": "embedded", "techStack": ["C"], "overview": "o"},
        ]
        mod = self.fake_module("backend.data_service", get_projects=lambda: projects)
        with patch.dict(sys.modules, {"backend.data_service": mod}):
            ctx = agent_tools.ToolContext()
            hard = await agent_tools.run_tool("list_projects", {"difficulty": "advanced"}, ctx)
            self.assertEqual([p["id"] for p in hard["projects"]], ["p1"])
            self.assertNotIn("overview", hard["projects"][0])  # list stays small
            by_title = await agent_tools.run_tool("get_project", {"project_id": "sensor"}, ctx)
            self.assertEqual(by_title["project"]["id"], "p2")
            missing = await agent_tools.run_tool("get_project", {"project_id": "nope"}, ctx)
            self.assertIn("No project", missing["error"])

    async def test_saved_profile_is_read_from_the_database_without_email(self):
        db = self.fake_module(
            "backend.database",
            get_user_profile_by_id=lambda uid: {"full_name": "Asha", "email": "a@b.c", "cgpa": 8.4, "branch": "CSE"},
        )
        user = type("U", (), {"user_id": "usr_1", "is_authenticated": True})()
        with patch.dict(sys.modules, {"backend.database": db}):
            out = await agent_tools.run_tool("get_student_profile", {}, agent_tools.ToolContext(user=user))
        self.assertEqual(out["source"], "saved")
        self.assertEqual(out["profile"], {"full_name": "Asha", "cgpa": 8.4, "branch": "CSE"})

    async def test_readiness_for_signed_in_guest_and_nobody(self):
        seen = {}

        def fake_audit(profile, user):
            seen["profile"] = profile
            return {"chance": 71.5, "label": "Strong", "gaps": ["System design"], "secret_internal": "x"}

        class FakeProfile:
            def __init__(self, **kw):
                self.kw = kw

        api_mod = self.fake_module("backend.api", calculate_readiness_audit=fake_audit)
        models_mod = self.fake_module("backend.models", StudentProfile=FakeProfile)
        mods = {"backend.api": api_mod, "backend.models": models_mod}

        signed_in = type("U", (), {"user_id": "usr_1", "is_authenticated": True})()
        guest = type("U", (), {"user_id": "usr_anonymous", "is_authenticated": False})()
        with patch.dict(sys.modules, mods):
            ok = await agent_tools.run_tool("get_readiness_score", {}, agent_tools.ToolContext(user=signed_in))
            self.assertEqual(ok["chance"], 71.5)
            self.assertNotIn("secret_internal", ok)
            self.assertIsNone(seen["profile"])  # signed in: the audit reads the saved profile

            nobody = await agent_tools.run_tool("get_readiness_score", {}, agent_tools.ToolContext(user=guest))
            self.assertIn("not signed in", nobody["error"])  # never score the default profile as if it were real

            with_profile = await agent_tools.run_tool(
                "get_readiness_score", {}, agent_tools.ToolContext(user=guest, client_profile={"cgpa": 7.0, "email": "x@y.z"})
            )
            self.assertEqual(with_profile["chance"], 71.5)
            self.assertEqual(seen["profile"].kw, {"cgpa": 7.0})  # unknown keys never reach the model


if __name__ == "__main__":
    unittest.main()