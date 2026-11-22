import React, { useState, useEffect } from "react";
import {
  Code2,
  Play,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Volume2,
  Trophy,
  Terminal,
} from "lucide-react";
import { StudentProfileState } from "@/types/profile";
import { SUPPORTED_LANGUAGES, normalizeLanguage } from "@/agent/codingStudioController";
import { audioEngine, startListening } from "@/agent/audioIO";
import { toast } from "sonner";

export interface ArenaChallenge {
  id: string;
  company: string;
  role: string;
  title: string;
  question: string;
  starterPython: string;
  expectedKeywords: string[];
}

export const ARENA_CHALLENGES: ArenaChallenge[] = [
  {
    id: "binary-search-first",
    company: "Amazon",
    role: "SDE-1",
    title: "1. Binary Search First Occurrence & Complexity Viva",
    question:
      "Write a function that finds the first index of a target order ID in a sorted array in O(log n) time, run it on [10, 20, 20, 20, 30, 40] for target 20, and explain why its time complexity is O(log n) and space complexity is O(1).",
    starterPython:
      'def first_occurrence(arr, target):\n    lo, hi, ans = 0, len(arr) - 1, -1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            ans = mid\n            hi = mid - 1  # continue searching left half\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return ans\n\nprint("First index of 20:", first_occurrence([10, 20, 20, 20, 30, 40], 20))',
    expectedKeywords: ["O(log n)", "O(1)", "binary search", "sorted", "mid", "left"],
  },
  {
    id: "two-sum-optimal",
    company: "Google",
    role: "SWE University Grad",
    title: "2. O(n) Hash Map Two-Sum vs O(n²) Brute Force",
    question:
      "Implement an O(n) Two-Sum solution using a hash map for nums=[2, 7, 11, 15] and target=9, execute the code, and explain the time-space trade-off between O(n) hash lookup and O(n²) nested loops.",
    starterPython:
      'def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        complement = target - x\n        if complement in seen:\n            return [seen[complement], i]\n        seen[x] = i\n    return []\n\nprint("Two-Sum indices:", two_sum([2, 7, 11, 15], 9))',
    expectedKeywords: ["O(n)", "hash map", "dictionary", "complement", "trade-off", "space"],
  },
  {
    id: "deloitte-sql-dept",
    company: "Deloitte",
    role: "Technology Consulting Analyst",
    title: "3. Department Package Aggregation & Indexing Defense",
    question:
      "Compute the average placement package per department from a dataset, print them sorted highest-first, and explain how composite B-Tree indexing speeds up GROUP BY queries in PostgreSQL.",
    starterPython:
      'from collections import defaultdict\n\nplacements = [("CSE", 16.0), ("CSE", 14.0), ("AIML", 22.0), ("AIML", 18.0), ("ECE", 9.0)]\ndept_map = defaultdict(list)\nfor dept, pkg in placements:\n    dept_map[dept].append(pkg)\n\nfor dept, pkgs in sorted(dept_map.items(), key=lambda item: -sum(item[1])/len(item[1])):\n    print(f"{dept}: Avg {sum(pkgs)/len(pkgs):.1f} LPA ({len(pkgs)} offers)")',
    expectedKeywords: ["GROUP BY", "B-Tree", "index", "O(n log n)", "aggregation", "PostgreSQL"],
  },
];

interface LiveCodingInterviewArenaProps {
  profile: StudentProfileState;
  apiBase: string;
  customChallenge?: {
    company: string;
    role: string;
    question: string;
    starterCode: string;
    expectedKeywords: string[];
  } | null;
}

export const LiveCodingInterviewArena: React.FC<LiveCodingInterviewArenaProps> = ({
  profile,
  apiBase,
  customChallenge,
}) => {
  const [selectedId, setSelectedId] = useState<string>(ARENA_CHALLENGES[0].id);
  const [company, setCompany] = useState<string>(ARENA_CHALLENGES[0].company);
  const [role, setRole] = useState<string>(ARENA_CHALLENGES[0].role);
  const [question, setQuestion] = useState<string>(ARENA_CHALLENGES[0].question);
  const [expectedKeywords, setExpectedKeywords] = useState<string[]>(
    ARENA_CHALLENGES[0].expectedKeywords
  );
  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>(ARENA_CHALLENGES[0].starterPython);
  const [compilerOutput, setCompilerOutput] = useState<string>("");
  const [compileSuccess, setCompileSuccess] = useState<boolean | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);

  const [explanation, setExplanation] = useState<string>(
    "We divide the sorted search space in half on every iteration by comparing the middle element with the target, achieving O(log n) time complexity and O(1) auxiliary space."
  );
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [stopListenerFn, setStopListenerFn] = useState<(() => void) | null>(null);

  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [verdictResult, setVerdictResult] = useState<{
    overallScore: number;
    codeScore: number;
    vivaScore: number;
    decision: "STRONG HIRE" | "HIRE" | "LEANING NO HIRE" | "NO HIRE";
    verdictText: string;
    matchedKeywords: string[];
    missingKeywords: string[];
  } | null>(null);

  useEffect(() => {
    if (customChallenge) {
      setSelectedId("custom");
      setCompany(customChallenge.company);
      setRole(customChallenge.role);
      setQuestion(customChallenge.question);
      setLanguage("python");
      setCode(customChallenge.starterCode);
      setExpectedKeywords(customChallenge.expectedKeywords);
      setCompilerOutput("");
      setCompileSuccess(null);
      setVerdictResult(null);
    }
  }, [customChallenge]);

  const handleSelectChallenge = (ch: ArenaChallenge) => {
    setSelectedId(ch.id);
    setCompany(ch.company);
    setRole(ch.role);
    setQuestion(ch.question);
    setLanguage("python");
    setCode(ch.starterPython);
    setExpectedKeywords(ch.expectedKeywords);
    setCompilerOutput("");
    setCompileSuccess(null);
    setVerdictResult(null);
  };

  const handleSpeakQuestionAloud = () => {
    audioEngine.speakTextPuckOrLocal(
      `${company} ${role} Technical Coding Round. ${question}`,
      apiBase
    );
  };

  const handleToggleVoiceViva = () => {
    if (isListeningVoice && stopListenerFn) {
      stopListenerFn();
      setIsListeningVoice(false);
      setStopListenerFn(null);
      return;
    }
    const stop = startListening(
      "en-IN",
      (interim) => setExplanation(interim),
      (finalText) => setExplanation(finalText),
      () => {
        setIsListeningVoice(false);
        setStopListenerFn(null);
      }
    );
    if (stop) {
      setIsListeningVoice(true);
      setStopListenerFn(() => stop);
    } else {
      toast.info("Type your complexity & architecture explanation in the viva box.");
    }
  };

  const runCodeOnBackend = async (): Promise<{ ok: boolean; out: string }> => {
    setIsCompiling(true);
    try {
      const resp = await fetch(`${apiBase}/api/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });
      const data = await resp.json();
      const out = String(data.output || data.stderr || data.error || "").trim();
      const ok = Boolean(resp.ok && data.success);
      setCompilerOutput(out || (ok ? "Program executed with 0 output." : "Execution failed."));
      setCompileSuccess(ok);
      return { ok, out };
    } catch (err: any) {
      const msg = `Compiler network error: ${err?.message || "Failed"}`;
      setCompilerOutput(msg);
      setCompileSuccess(false);
      return { ok: false, out: msg };
    } finally {
      setIsCompiling(false);
    }
  };

  const handleEvaluateCodingAndViva = async () => {
    setIsEvaluating(true);
    try {
      let currentOk = compileSuccess;
      let currentOut = compilerOutput;
      if (currentOk === null || !currentOut) {
        const res = await runCodeOnBackend();
        currentOk = res.ok;
        currentOut = res.out;
      }

      const combinedCandidateAnswer = `${explanation.trim()}\n\nSubmitted ${language.toUpperCase()} Code:\n${code.trim()}\n\nLive Compiler Output (${
        currentOk ? "SUCCESS" : "ERROR"
      }):\n${currentOut}`;

      const resp = await fetch(`${apiBase}/api/ai/evaluate-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          role,
          round_type: "Live Coding & Viva Arena",
          difficulty: "Medium-Hard",
          question,
          ideal_keywords: expectedKeywords,
          candidate_answer: explanation.trim() ? combinedCandidateAnswer : "",
        }),
      });
      const data = await resp.json();

      const vivaScore = Number(data?.overall_score ?? 0);
      const hasRealCode = code.trim().length > 25;
      const codeScore = currentOk && hasRealCode ? 92 : hasRealCode ? 35 : 0;
      const finalScore =
        data?.is_non_answer || !explanation.trim()
          ? Math.round(codeScore * 0.4)
          : Math.round(codeScore * 0.45 + vivaScore * 0.55);

      const decision: "STRONG HIRE" | "HIRE" | "LEANING NO HIRE" | "NO HIRE" =
        finalScore >= 80
          ? "STRONG HIRE"
          : finalScore >= 62
            ? "HIRE"
            : finalScore >= 40
              ? "LEANING NO HIRE"
              : "NO HIRE";

      const verdictText =
        data?.coach_verdict ||
        (currentOk
          ? `Your ${language} solution compiled cleanly and produced valid output.`
          : `Your ${language} code had compile/runtime issues that need fixing.`);

      const resultObj = {
        overallScore: finalScore,
        codeScore,
        vivaScore,
        decision,
        verdictText,
        matchedKeywords: data?.matched_keywords || [],
        missingKeywords: data?.missing_keywords || [],
      };
      setVerdictResult(resultObj);

      audioEngine.speakTextPuckOrLocal(
        `Hiring Committee Verdict for ${company}: ${decision}, with an overall score of ${finalScore} out of 100. ${verdictText}`,
        apiBase
      );
    } catch (err: any) {
      toast.error(`Evaluation error: ${err?.message || "Unable to grade right now"}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="holo-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Arena Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-cyan-400/20 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/45 bg-cyan-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-200">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            <span>Live AI Coding &amp; Voice Viva Arena · 11 Languages + DAS Hologram</span>
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-black text-white">
            Split-Screen Technical Coding &amp; Voice Defense Arena
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            Have DAS read the problem aloud, execute real code in 11 languages, and defend your time/space complexity via voice or text for a real Hiring Committee Verdict.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSpeakQuestionAloud}
          className="inline-flex items-center gap-2 rounded-xl border border-[#F23456]/60 bg-[#F23456]/25 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(242,52,86,0.35)] hover:bg-[#F23456]/45 transition cursor-pointer"
        >
          <Volume2 className="h-4 w-4 text-white" />
          <span>🔊 Have 3D DAS Agent Ask Problem Aloud</span>
        </button>
      </div>

      {/* Challenge Selector Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {ARENA_CHALLENGES.map((ch) => {
          const active = ch.id === selectedId;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleSelectChallenge(ch)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "border border-cyan-300 bg-cyan-500/25 text-white shadow-[0_0_16px_rgba(0,240,255,0.3)]"
                  : "border border-cyan-400/20 bg-[#030a16]/60 text-slate-300 hover:border-cyan-400/50 hover:text-white"
              }`}
            >
              {ch.company} · {ch.title}
            </button>
          );
        })}
      </div>

      {/* Split Screen Grid: Left Viva & Problem | Center Translucent Window for 3D Face | Right Live Code Compiler */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 5 cols: Problem Prompt + Spoken/Typed Complexity Viva */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-cyan-400/25 bg-[#030a16]/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="rounded-lg border border-[#F23456]/50 bg-[#F23456]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#ff8da1]">
                {company} · {role}
              </span>
              <span className="text-[11px] font-semibold text-cyan-300">
                Stage 1: Problem &amp; Complexity Viva
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
              {question}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {expectedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200"
                >
                  Target Concept: {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Voice / Text Explanation Box */}
          <div className="rounded-2xl border border-cyan-400/25 bg-[#030a16]/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="arena-viva-explanation"
                className="text-xs font-bold text-cyan-200"
              >
                Your Complexity &amp; Architecture Explanation (Voice or Text)
              </label>
              <button
                type="button"
                onClick={handleToggleVoiceViva}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                  isListeningVoice
                    ? "border border-[#F23456] bg-[#F23456] text-white animate-pulse"
                    : "border border-cyan-400/35 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                }`}
              >
                {isListeningVoice ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    <span>Stop Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    <span>Speak Explanation</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              id="arena-viva-explanation"
              name="arenaVivaExplanation"
              rows={4}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain your approach, time complexity O(...), space complexity O(...), and edge cases..."
              className="w-full rounded-xl border border-cyan-400/25 bg-black/50 p-3 text-xs text-white outline-none focus:border-cyan-300 leading-relaxed"
            />
          </div>

          {/* Live Hiring Committee Verdict Card */}
          {verdictResult && (
            <div className="rounded-2xl border border-cyan-400/40 bg-[#030a16]/80 p-4 space-y-3 shadow-[0_0_25px_rgba(0,240,255,0.15)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                    Live Hiring Verdict
                  </span>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black border ${
                    verdictResult.decision === "STRONG HIRE" || verdictResult.decision === "HIRE"
                      ? "border-emerald-400 bg-emerald-500/25 text-emerald-200"
                      : "border-[#F23456] bg-[#F23456]/25 text-[#ff8da1]"
                  }`}
                >
                  {verdictResult.decision} · {verdictResult.overallScore}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-cyan-400/20 bg-black/40 p-2.5">
                  <span className="text-[10px] text-slate-400 block">Compiled Code Score</span>
                  <span className="text-base font-black text-cyan-300">
                    {verdictResult.codeScore}/100
                  </span>
                </div>
                <div className="rounded-xl border border-cyan-400/20 bg-black/40 p-2.5">
                  <span className="text-[10px] text-slate-400 block">Viva Explanation Score</span>
                  <span className="text-base font-black text-white">
                    {verdictResult.vivaScore}/100
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">{verdictResult.verdictText}</p>
            </div>
          )}
        </div>

        {/* Right 7 cols: Built-In 11-Language Live Code Editor & Compiler Terminal */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-2xl border border-cyan-400/25 bg-[#030a16]/65 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-cyan-300" />
                <label htmlFor="arena-language-select" className="text-xs font-bold text-white">
                  Stage 2: Live 11-Language Compiler
                </label>
                <select
                  id="arena-language-select"
                  name="arenaLanguageSelect"
                  value={language}
                  onChange={(e) => {
                    const nextLang = normalizeLanguage(e.target.value);
                    setLanguage(nextLang);
                    const found = SUPPORTED_LANGUAGES.find((l) => l.id === nextLang);
                    if (found) setCode(found.starter);
                  }}
                  className="rounded-lg border border-cyan-400/35 bg-[#030a16] px-2.5 py-1 text-xs font-bold uppercase text-cyan-200 outline-none cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id} className="bg-[#030a16] text-white">
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isCompiling}
                  onClick={() => void runCodeOnBackend()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/45 bg-cyan-500/20 px-3.5 py-1.5 text-xs font-bold text-cyan-100 hover:bg-cyan-500/35 disabled:opacity-50 transition cursor-pointer"
                >
                  {isCompiling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  <span>{isCompiling ? "Running..." : "Run Code"}</span>
                </button>

                <button
                  type="button"
                  disabled={isEvaluating || isCompiling}
                  onClick={() => void handleEvaluateCodingAndViva()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#F23456] bg-[#F23456]/30 px-4 py-1.5 text-xs font-bold text-white shadow-[0_0_18px_rgba(242,52,86,0.4)] hover:bg-[#F23456]/50 disabled:opacity-50 transition cursor-pointer"
                >
                  {isEvaluating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>{isEvaluating ? "Grading..." : "Submit Code + Viva for Verdict"}</span>
                </button>
              </div>
            </div>

            <textarea
              id="arena-code-editor"
              name="arenaCodeEditor"
              aria-label="Arena Source Code Editor"
              rows={10}
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-cyan-400/25 bg-black/60 p-3.5 font-mono text-xs text-cyan-100 outline-none focus:border-cyan-300 leading-relaxed"
            />

            {/* Live Execution Output Terminal */}
            <div className="rounded-xl border border-cyan-400/20 bg-black/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Live Execution Terminal Output</span>
                </span>
                {compileSuccess !== null && (
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      compileSuccess ? "text-emerald-300" : "text-[#ff8da1]"
                    }`}
                  >
                    {compileSuccess ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Compiled &amp; Executed Cleanly</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Compile / Runtime Error</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {compilerOutput || "Click 'Run Code' or 'Submit Code + Viva for Verdict' to execute live..."}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
