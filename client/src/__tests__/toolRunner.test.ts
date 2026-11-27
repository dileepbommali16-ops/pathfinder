import { describe, it, expect, beforeEach } from "vitest";
import {
  PATHFINDER_TOOLS,
  tryExecuteClientAutomationIntent,
  runTool,
} from "../agent/toolRunner";
import { codingStudioController } from "../agent/codingStudioController";

describe("toolRunner & internal DAS automations", () => {
  beforeEach(() => {
    codingStudioController.registerHandler(null);
  });

  it("excludes external website/Google/LinkedIn tools while keeping internal tools", () => {
    const names = PATHFINDER_TOOLS.flatMap((t) => t.functionDeclarations.map((d) => d.name));
    expect(names).not.toContain("open_external_website_or_google_search");
    expect(names).not.toContain("return_to_pathfinder_page");
    expect(names).toContain("navigate_dashboard_tab");
    expect(names).toContain("update_student_profile");
    expect(names).toContain("click_element");
    expect(names).toContain("read_page");
  });

  it("handles internal tab/profile/compiler/progress commands and ignores external site commands", async () => {
    expect(tryExecuteClientAutomationIntent("open live coding arena")).toBe(true);
    expect(tryExecuteClientAutomationIntent("open my progress")).toBe(true);
    expect(tryExecuteClientAutomationIntent("blueprints open chesi cheppu")).toBe(true);
    expect(tryExecuteClientAutomationIntent("set my cgpa to 8.9")).toBe(true);
    expect(tryExecuteClientAutomationIntent("open c compiler")).toBe(true);
    expect(tryExecuteClientAutomationIntent("c compiler open chey")).toBe(true);
    expect(tryExecuteClientAutomationIntent("open python compiler")).toBe(true);
    expect(tryExecuteClientAutomationIntent("run code")).toBe(true);
    expect(tryExecuteClientAutomationIntent("close compiler")).toBe(true);
    expect(tryExecuteClientAutomationIntent("open gmail")).toBe(false);
    expect(tryExecuteClientAutomationIntent("open youtube")).toBe(false);
  });

  it("invokes codingStudioController immediately for compiler open intents", async () => {
    const dispatched: Array<Record<string, any>> = [];
    codingStudioController.registerHandler(async (args) => {
      dispatched.push(args);
      return { ok: true, action: args.action, language: args.language };
    });

    expect(tryExecuteClientAutomationIntent("open c compiler")).toBe(true);
    expect(tryExecuteClientAutomationIntent("open compiler")).toBe(true);
    await Promise.resolve();

    expect(dispatched[0]).toMatchObject({
      action: "switch_language",
      language: "c",
      auto_run: false,
    });
    expect(dispatched[1]).toMatchObject({
      action: "open",
      language: "python",
      auto_run: false,
    });
  });

  it("should navigate dashboard tabs cleanly", () => {
    const res = runTool("navigate_dashboard_tab", { tabName: "interview" });
    expect(res.status).toBe("navigated");
    expect(res.navigated).toBe(true);
  });
});
