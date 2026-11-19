import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeLanguage,
  applyCodeEdit,
  applyCodeDelete,
  formatNumberedCode,
  codingStudioController,
  SUPPORTED_LANGUAGES,
} from "../agent/codingStudioController";

describe("codingStudioController & multi-language code automation", () => {
  beforeEach(() => {
    codingStudioController.registerHandler(null);
  });

  it("normalizes language aliases across all 11 supported languages", () => {
    expect(normalizeLanguage("C++")).toBe("cpp");
    expect(normalizeLanguage("py")).toBe("python");
    expect(normalizeLanguage("JS")).toBe("javascript");
    expect(normalizeLanguage("TS")).toBe("typescript");
    expect(normalizeLanguage("golang")).toBe("go");
    expect(normalizeLanguage("c#")).toBe("csharp");
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(11);
  });

  it("applies replace, append, insert_lines, and replace_lines edits accurately", () => {
    const base = "line 1\nline 2\nline 3";
    expect(applyCodeEdit(base, { mode: "replace", source_code: "int main() {}" })).toBe("int main() {}");
    expect(applyCodeEdit(base, { mode: "append", source_code: "line 4" })).toBe("line 1\nline 2\nline 3\nline 4");
    expect(applyCodeEdit(base, { mode: "insert_lines", line_number: 2, source_code: "inserted" })).toBe(
      "line 1\ninserted\nline 2\nline 3"
    );
    expect(
      applyCodeEdit(base, { mode: "replace_lines", start_line: 2, end_line: 3, source_code: "new 2\nnew 3" })
    ).toBe("line 1\nnew 2\nnew 3");
  });

  it("deletes all code, specific line ranges, or specific text targets cleanly", () => {
    const base = "alpha\nbeta\ngamma\ndelta";
    expect(applyCodeDelete(base, {})).toBe("");
    expect(applyCodeDelete(base, { start_line: 2, end_line: 3 })).toBe("alpha\ndelta");
    expect(applyCodeDelete(base, { target_text: "beta\n" })).toBe("alpha\ngamma\ndelta");
  });

  it("formats line-numbered code for DAS AI inspection", () => {
    expect(formatNumberedCode("print(1)\nprint(2)")).toBe("1: print(1)\n2: print(2)");
    expect(formatNumberedCode("")).toBe("(empty)");
  });

  it("executes round-trip actions through registered UI handler", async () => {
    const calls: string[] = [];
    codingStudioController.registerHandler(async (args) => {
      calls.push(String(args.action));
      return {
        ok: true,
        action: args.action,
        language: normalizeLanguage(args.language),
        output: args.action === "stop_code" ? "⏹ Execution stopped." : "Hello Boss",
        stopped: args.action === "stop_code",
      };
    });

    const runRes = await codingStudioController.execute({
      action: "write_code",
      language: "c",
      source_code: '#include <stdio.h>\nint main(){printf("Hello Boss");}',
    });
    expect(runRes.ok).toBe(true);
    expect(runRes.language).toBe("c");
    expect(runRes.output).toBe("Hello Boss");

    const stopRes = await codingStudioController.execute({ action: "stop_code", language: "c" });
    expect(stopRes.stopped).toBe(true);
    expect(calls).toEqual(["write_code", "stop_code"]);
  });
});
