import { normalizeLanguage } from "@/agent/codingStudioController";

export interface CompileRaceParams {
  apiBase: string;
  language: string;
  code: string;
  stdin?: string;
  title?: string;
  signal?: AbortSignal;
  fallbackDelayMs?: number;
  overallTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface CompileRaceResult {
  ok: boolean;
  output: string;
  stderr: string;
  engine: string;
  stopped?: boolean;
  error?: string;
}

const GODBOLT_COMPILERS: Record<string, { id: string; lang: string; args: string }> = {
  c: { id: "cg132", lang: "c", args: "-O2" },
  cpp: { id: "g132", lang: "c++", args: "-O2" },
  python: { id: "python311", lang: "python", args: "" },
  java: { id: "java2100", lang: "java", args: "" },
  javascript: { id: "v8113", lang: "javascript", args: "" },
  rust: { id: "r1840", lang: "rust", args: "-O2" },
  csharp: { id: "dotnet80csharpcoreclr", lang: "csharp", args: "" },
};

const PISTON_LANGS: Record<string, string> = {
  c: "c",
  cpp: "c++",
  python: "python",
  java: "java",
  javascript: "javascript",
  typescript: "typescript",
  rust: "rust",
  go: "go",
  csharp: "csharp.net",
  php: "php",
};

/**
 * Executes code via `/api/compile` and races remote sandbox fallbacks (Godbolt / Piston)
 * in parallel if the primary backend does not respond within `fallbackDelayMs` (default 4s).
 */
export function runCodeWithParallelFallback({
  apiBase,
  language,
  code,
  stdin = "",
  title = "Live Program",
  signal,
  fallbackDelayMs = 4000,
  overallTimeoutMs = 65000,
  fetchImpl,
}: CompileRaceParams): Promise<CompileRaceResult> {
  if (signal?.aborted) {
    return Promise.resolve({
      ok: false,
      stopped: true,
      output: "Execution stopped.",
      stderr: "",
      engine: "aborted",
    });
  }

  const fetchFn: typeof fetch = fetchImpl || fetch;
  const targetLang = normalizeLanguage(language);
  const cleanCode =
    targetLang === "java" ? code.replace(/\bpublic\s+class\b/g, "class") : code;

  return new Promise<CompileRaceResult>((resolve) => {
    const primaryController = new AbortController();
    const fallbackController = new AbortController();

    let settled = false;
    let primaryDone = false;
    let fallbackStarted = false;
    let fallbackDone = false;
    let lastError = "Compiler request failed. Please try Run Code again.";

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let overallTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (fallbackTimer !== null) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (overallTimer !== null) {
        clearTimeout(overallTimer);
        overallTimer = null;
      }
      signal?.removeEventListener("abort", onCallerAbort);
    };

    const finish = (result: CompileRaceResult, abortLoser: "primary" | "fallback" | "both" | "none") => {
      if (settled) return;
      settled = true;
      cleanup();
      if (abortLoser === "primary" || abortLoser === "both") {
        primaryController.abort();
      }
      if (abortLoser === "fallback" || abortLoser === "both") {
        fallbackController.abort();
      }
      resolve(result);
    };

    const maybeFinishAllFailed = () => {
      if (!settled && primaryDone && fallbackDone) {
        finish(
          {
            ok: false,
            output: lastError,
            stderr: lastError,
            error: lastError,
            engine: "error",
          },
          "none"
        );
      }
    };

    const onCallerAbort = () => {
      finish(
        {
          ok: false,
          stopped: true,
          output: "Execution stopped.",
          stderr: "",
          engine: "aborted",
        },
        "both"
      );
    };

    signal?.addEventListener("abort", onCallerAbort, { once: true });

    overallTimer = setTimeout(() => {
      finish(
        {
          ok: false,
          output: "Execution timed out. Please try Run Code again.",
          stderr: "TimeoutError",
          error: "Execution timed out. Please try Run Code again.",
          engine: "timeout",
        },
        "both"
      );
    }, overallTimeoutMs);

    const runGodbolt = async (): Promise<CompileRaceResult | null> => {
      const comp = GODBOLT_COMPILERS[targetLang];
      if (!comp) return null;
      try {
        const res = await fetchFn(`https://godbolt.org/api/compiler/${comp.id}/compile`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          signal: fallbackController.signal,
          body: JSON.stringify({
            source: cleanCode,
            compiler: comp.id,
            options: {
              userArguments: comp.args,
              executeParameters: { args: [], stdin: stdin || "" },
              compilerOptions: { executorRequest: true },
              filters: { binary: true, execute: true },
            },
            lang: comp.lang,
          }),
        });
        if (!res.ok) {
          lastError = `Compiler fallback failed (HTTP ${res.status}).`;
          return null;
        }
        const fbData = await res.json().catch(() => null);
        if (!fbData || typeof fbData !== "object") return null;
        const stdout = (fbData.stdout || []).map((i: any) => i.text || "").join("\n").trim();
        const stderr = (fbData.stderr || []).map((i: any) => i.text || "").join("\n").trim();
        const buildErr = (fbData.buildResult?.stderr || []).map((i: any) => i.text || "").join("\n").trim();
        const errCombined = stderr || buildErr;
        const finalOutput = stdout || errCombined || "Program executed successfully (no stdout).";
        const ok = !errCombined;
        return {
          ok,
          output: finalOutput,
          stderr: errCombined,
          engine: `godbolt-${comp.id}`,
          ...(ok ? {} : { error: errCombined }),
        };
      } catch (err: any) {
        if (!fallbackController.signal.aborted) {
          lastError = `Fallback compiler error: ${err?.message || String(err)}`;
        }
        return null;
      }
    };

    const runPiston = async (): Promise<CompileRaceResult | null> => {
      const pLang = PISTON_LANGS[targetLang];
      if (!pLang) return null;
      try {
        const res = await fetchFn("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: fallbackController.signal,
          body: JSON.stringify({
            language: pLang,
            version: "*",
            files: [{ content: cleanCode }],
            stdin: stdin || "",
          }),
        });
        if (!res.ok) {
          lastError = `Compiler fallback failed (HTTP ${res.status}).`;
          return null;
        }
        const pData = await res.json().catch(() => null);
        if (!pData || typeof pData !== "object") return null;
        const pOut = String(pData.run?.output || pData.run?.stdout || "").trim();
        const pErr = String(pData.run?.stderr || "").trim();
        const exitCode = typeof pData.run?.code === "number" ? pData.run.code : pErr ? 1 : 0;
        const outStr = pOut || pErr || "Program executed with no standard output.";
        const ok = exitCode === 0 && !pErr;
        return {
          ok,
          output: outStr,
          stderr: pErr,
          engine: "piston",
          ...(ok ? {} : { error: pErr || outStr }),
        };
      } catch (err: any) {
        if (!fallbackController.signal.aborted) {
          lastError = `Fallback compiler error: ${err?.message || String(err)}`;
        }
        return null;
      }
    };

    const startFallback = () => {
      if (fallbackStarted || settled) return;
      fallbackStarted = true;
      if (fallbackTimer !== null) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }

      void (async () => {
        const godboltRes = await runGodbolt();
        if (settled) return;
        if (godboltRes) {
          finish(godboltRes, "primary");
          return;
        }
        const pistonRes = await runPiston();
        if (settled) return;
        if (pistonRes) {
          finish(pistonRes, "primary");
          return;
        }
        fallbackDone = true;
        maybeFinishAllFailed();
      })();
    };

    fallbackTimer = setTimeout(() => {
      startFallback();
    }, fallbackDelayMs);

    void (async () => {
      try {
        const cleanBase = apiBase.replace(/\/+$/, "");
        const res = await fetchFn(`${cleanBase}/api/compile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: primaryController.signal,
          body: JSON.stringify({
            language: targetLang,
            code: cleanCode,
            stdin,
            title,
          }),
        });
        if (settled) return;

        const data: any = await res.json().catch(() => null);
        if (res.ok && data && typeof data === "object") {
          const stderrText = String(data.stderr || "");
          const errRaw = String(data.error || data.detail || "");
          const ok = data.success !== false;
          const output = String(
            data.output || (stderrText ? `Diagnostics:\n${stderrText}` : errRaw || "Program executed with no standard output.")
          );
          const errorMsg = ok ? undefined : String(errRaw || stderrText || output || "Compile or runtime error occurred.");
          finish(
            {
              ok,
              output,
              stderr: stderrText,
              engine: String(data.engine || "backend"),
              ...(errorMsg ? { error: errorMsg } : {}),
            },
            "fallback"
          );
          return;
        }

        const detailMsg = data && typeof data === "object" ? String(data.detail || data.error || "") : "";
        lastError = detailMsg || `Compiler request failed (HTTP ${res.status}).`;
      } catch (err: any) {
        if (!primaryController.signal.aborted) {
          lastError = `Compiler network error: ${err?.message || String(err)}`;
        }
      }

      if (settled) return;
      primaryDone = true;
      startFallback();
      maybeFinishAllFailed();
    })();
  });
}
