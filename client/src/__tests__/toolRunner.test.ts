import { describe, it, expect } from "vitest";
import { tryInstantBrowserCommand, runTool } from "../agent/toolRunner";

describe("toolRunner & instant browser commands", () => {
  it("should recognize return back to page commands", () => {
    const res = tryInstantBrowserCommand("return back to your page");
    expect(res.handled).toBe(true);
    expect(res.actionSummary?.toLowerCase()).toContain("returned");
    expect(res.actionSummary?.toLowerCase()).toContain("pathfinder");
  });

  it("delegates Google search and Gmail commands to DAS AI tools instead of blocking popups with window.open", () => {
    const searchRes = tryInstantBrowserCommand("search NRI Institute of Technology on Google");
    expect(searchRes.handled).toBe(false);

    const gmailRes = tryInstantBrowserCommand("open gmail");
    expect(gmailRes.handled).toBe(false);
  });

  it("should run return_to_pathfinder_page tool cleanly", () => {
    const res = runTool("return_to_pathfinder_page", {});
    expect(res.status).toBe("returned_to_pathfinder");
    expect(res.navigated).toBe(true);
  });
});
