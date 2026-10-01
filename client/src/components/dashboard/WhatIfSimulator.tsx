import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Sliders,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Check,
  Zap,
  Info
} from "lucide-react";
import { StudentProfileState } from "./ProfileEvaluator";

interface WhatIfSimulatorProps {
  currentProfile: StudentProfileState;
  currentScore: number;
}

interface WhatIfScenario {
  id: string;
  title: string;
  description: string;
  category: "Technical" | "Projects" | "Academics" | "Interview" | "Resume";
  impactDelta: number; // estimated score boost
  applied: boolean;
  explanation: string;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  currentProfile,
  currentScore,
}) => {
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([
    {
      id: "sc-backlogs",
      title: "Clear all active backlogs",
      description: "Satisfies strict zero-backlog eligibility criteria required by 92% of Tier-1 MNCs.",
      category: "Academics",
      impactDelta: currentProfile.backlogs > 0 ? 14 : 3,
      applied: false,
      explanation: "Removes automated ATS eligibility filters and prevents immediate disqualification."
    },
    {
      id: "sc-project",
      title: "Ship 1 flagship deployed full-stack/AI project",
      description: "Deploy an end-to-end production application with live URL, tests, and GitHub README.",
      category: "Projects",
      impactDelta: 9,
      applied: false,
      explanation: "Demonstrates practical software architecture, API design, and deployment skills during technical rounds."
    },
    {
      id: "sc-dsa",
      title: "Master high-frequency Blind 75 DSA patterns",
      description: "Solve 2–3 daily problems on Sliding Window, Two Pointers, Trees (BFS/DFS), and Binary Search.",
      category: "Technical",
      impactDelta: 8,
      applied: false,
      explanation: "Directly improves clearance rate in automated HackerRank and LeetCode online assessments."
    },
    {
      id: "sc-mock",
      title: "30-Day Daily STAR Mock Interview practice",
      description: "Rehearse behavioral STAR stories and practice technical architecture defense aloud.",
      category: "Interview",
      impactDelta: 6,
      applied: false,
      explanation: "Transforms interview articulation from disjointed answers into polished, confident engineering narratives."
    },
    {
      id: "sc-resume",
      title: "Format resume with Google X-Y-Z formula",
      description: "Quantify all achievements: Accomplished X measured by Y doing Z (e.g. latency, scale).",
      category: "Resume",
      impactDelta: 5,
      applied: false,
      explanation: "Elevates ATS ranking score and provides high-impact conversation hooks for interviewers."
    }
  ]);

  const toggleScenario = (id: string) => {
    setScenarios(prev =>
      prev.map(s => (s.id === id ? { ...s, applied: !s.applied } : s))
    );
  };

  const resetAll = () => {
    setScenarios(prev => prev.map(s => ({ ...s, applied: false })));
  };

  const totalDelta = scenarios
    .filter(s => s.applied)
    .reduce((sum, s) => sum + s.impactDelta, 0);

  // Clamped simulated score
  const simulatedScore = Math.min(98, Math.max(18, Math.round(currentScore + totalDelta)));
  const appliedCount = scenarios.filter(s => s.applied).length;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                  What-If? Career Trajectory Simulator
                </h3>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  Interactive Sandbox
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Explore how specific technical milestones, project deployments, and interview prep would elevate your career readiness.
              </p>
            </div>
          </div>

          {appliedCount > 0 && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Sandbox</span>
            </button>
          )}
        </div>

        {/* Dynamic Comparison Banner */}
        <div className="mt-6 grid gap-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-slate-950/60 to-emerald-950/30 p-5 sm:grid-cols-3 sm:items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Placement Readiness</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-300">{currentScore.toFixed(1)}%</span>
              <span className="text-xs text-slate-400">Baseline</span>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5">
              <ArrowRight className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">
                {totalDelta > 0 ? `+${totalDelta}% Projected Gain` : "Toggle scenarios below"}
              </span>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Simulated Target Readiness</span>
            <div className="mt-1 flex items-baseline gap-2 sm:justify-end">
              <span className={`text-3xl font-black ${
                simulatedScore >= 80 ? "text-emerald-400" : simulatedScore >= 60 ? "text-cyan-400" : "text-amber-400"
              }`}>
                {simulatedScore}%
              </span>
              <span className="text-xs text-emerald-400 font-semibold">
                ({appliedCount} milestone{appliedCount === 1 ? "" : "s"} applied)
              </span>
            </div>
          </div>
        </div>

        {/* Scenarios List */}
        <div className="mt-6 space-y-3">
          {scenarios.map(sc => (
            <div
              key={sc.id}
              onClick={() => toggleScenario(sc.id)}
              className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                sc.applied
                  ? "border-cyan-500/40 bg-cyan-950/20 shadow-[0_4px_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20"
                  : "border-white/[0.06] bg-slate-950/40 hover:border-white/12 hover:bg-slate-950/60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                    sc.applied
                      ? "border-cyan-400 bg-cyan-500 text-slate-950"
                      : "border-slate-600 bg-slate-800 text-transparent"
                  }`}>
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">{sc.title}</span>
                      <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                        {sc.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{sc.description}</p>
                    <p className="mt-1 text-[11px] text-cyan-300/80">
                      💡 <strong>Impact:</strong> {sc.explanation}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300">
                    +{sc.impactDelta}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer per Section 9 */}
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-slate-950/30 p-3 text-[11px] text-slate-400">
          <Info className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
          <p>
            <strong>Simulation Note:</strong> Simulated scores are projected analytical estimates to guide preparation priorities. They illustrate statistical leverage points and do not represent a guaranteed placement offer.
          </p>
        </div>
      </div>
    </div>
  );
};
