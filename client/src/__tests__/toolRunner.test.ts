import { describe, it, expect } from "vitest";
import { tryInstantBrowserCommand, runTool } from "@/agent/toolRunner";

describe("toolRunner & instant browser commands", () => {
  it("should recognize return back to page commands", () => {
    const res = tryInstantBrowserCommand("return back to your page");
    expect(res.handled).toBe(true);
    expect(res.actionSummary?.toLowerCase()).toContain("returned");
    expect(res.actionSummary?.toLowerCase()).toContain("pathfinder");
  });

  it("should recognize Google search command format", () => {
    const res = tryInstantBrowserCommand("search NRI Institute of Technology on Google");
    expect(res.handled).toBe(true);
    expect(res.isSearchQuery).toBe(true);
    expect(res.searchQuery?.toLowerCase()).toContain("nri institute of technology");
  });

  it("should run return_to_pathfinder_page tool cleanly", () => {
    const res = runTool("return_to_pathfinder_page", {});
    expect(res.status).toBe("returned_to_pathfinder");
    expect(res.navigated).toBe(true);
  });
});
