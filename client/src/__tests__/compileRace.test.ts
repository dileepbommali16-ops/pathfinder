import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runCodeWithParallelFallback } from "../lib/compileRace";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("runCodeWithParallelFallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns primary result immediately when /api/compile responds under 4s and never calls fallback", async () => {
    const calledUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calledUrls.push(url);
      return jsonResponse({ success: true, output: "Hello Primary", stderr: "", engine: "backend-fast" });
    });

    const promise = runCodeWithParallelFallback({
      apiBase: "https://api.example.com",
      language: "c",
      code: 'int main(){return 0;}',
      fallbackDelayMs: 4000,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.output).toBe("Hello Primary");
    expect(result.engine).toBe("backend-fast");
    expect(calledUrls).toEqual(["https://api.example.com/api/compile"]);
  });

  it("starts fallback in parallel at 4s when /api/compile stalls and uses fallback when it answers first", async () => {
    let primarySignalAborted = false;
    const calledUrls: string[] = [];

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calledUrls.push(url);
      if (url.endsWith("/api/compile")) {
        init?.signal?.addEventListener("abort", () => {
          primarySignalAborted = true;
        });
        return new Promise<Response>(() => {
          // Simulates cold-starting backend taking much longer than fallback
        });
      }
      return Promise.resolve(
        jsonResponse({
          stdout: [{ text: "Hello Godbolt" }],
          stderr: [],
        })
      );
    });

    const promise = runCodeWithParallelFallback({
      apiBase: "https://api.example.com",
      language: "c",
      code: '#include <stdio.h>\nint main(){printf("Hello Godbolt");}',
      fallbackDelayMs: 4000,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(3900);
    expect(calledUrls).toEqual(["https://api.example.com/api/compile"]);

    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    expect(calledUrls).toEqual([
      "https://api.example.com/api/compile",
      "https://godbolt.org/api/compiler/cg132/compile",
    ]);
    expect(result.ok).toBe(true);
    expect(result.output).toBe("Hello Godbolt");
    expect(result.engine).toBe("godbolt-cg132");
    expect(primarySignalAborted).toBe(true);
  });

  it("lets a slow primary still win after 4s if it finishes before fallback and aborts fallback", async () => {
    let fallbackSignalAborted = false;
    let resolvePrimary!: (res: Response) => void;

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/compile")) {
        return new Promise<Response>((resolve) => {
          resolvePrimary = resolve;
        });
      }
      init?.signal?.addEventListener("abort", () => {
        fallbackSignalAborted = true;
      });
      return new Promise<Response>(() => {});
    });

    const promise = runCodeWithParallelFallback({
      apiBase: "https://api.example.com",
      language: "c",
      code: "int main(){}",
      fallbackDelayMs: 4000,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await vi.advanceTimersByTimeAsync(4100);
    resolvePrimary(jsonResponse({ success: true, output: "Primary Eventually Won", stderr: "", engine: "backend" }));

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.output).toBe("Primary Eventually Won");
    expect(fallbackSignalAborted).toBe(true);
  });

  it("returns clear error result when primary and fallback both fail", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ detail: "Service unavailable" }, 503));

    const result = await runCodeWithParallelFallback({
      apiBase: "https://api.example.com",
      language: "c",
      code: "int main(){}",
      fallbackDelayMs: 4000,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.engine).toBe("error");
  });
});
