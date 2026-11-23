import { describe, it, expect } from "vitest";
import {
  PATHFINDER_TOOLS,
  tryExecuteClientAutomationIntent,
  runTool,
} from "../agent/toolRunner";

describe("toolRunner & internal DAS automations", () => {
  it("excludes external website/Google/LinkedIn tools while keeping internal tools", () => {
    const names = PATHFINDER_TOOLS.flatMap((t) => t.functionDeclarations.map((d) => d.name));
    expect(names).not.toContain("open_external_website_or_google_search");
    expect(names).not.toContain("return_to_pathfinder_page");
    expect(names).toContain("navigate_dashboard_tab");
    expect(names).toContain("update_student_profile");
    expect(names).toContain("click_element");
    expect(names).toContain("read_page");
  });

  it("handles internal tab/profile commands and ignores external site commands", () => {
    expect(tryExecuteClientAutomationIntent("open live coding arena")).toBe(true);
    expect(tryExecuteClientAutomationIntent("set my cgpa to 8.9")).toBe(true);
    expect(tryExecuteClientAutomationIntent("open gmail")).toBe(false);
    expect(tryExecuteClientAutomationIntent("open youtube")).toBe(false);
  });

  it("should navigate dashboard tabs cleanly", () => {
    const res = runTool("navigate_dashboard_tab", { tabName: "interview" });
    expect(res.status).toBe("navigated");
    expect(res.navigated).toBe(true);
  });
});
