import React, { useState } from "react";
import {
  Compass,
  CheckCircle,
  Circle,
  Sparkles,
  ArrowRight,
  RotateCw,
  Calendar,
  Layers,
  CheckSquare
} from "lucide-react";

export interface RoadmapData {
  headline: string;
  skill_gaps: string[];
  weekly_actions: string[];
}

interface RoadmapVisualizerProps {
  roadmap: RoadmapData | null;
  isLoading: boolean;
  onRegenerate: () => void;
}

const DEFAULT_ROADMAP: RoadmapData = {
  headline: "6-Week Strategic Campus Placement Acceleration Roadmap",
  skill_gaps: [
    "Pattern-based DSA consistency (Blind 75)",
    "Flagship full-stack project with measurable metrics",
    "STAR framework behavioral articulation"
  ],
  weekly_actions: [
    "Week 1: Solve 15 high-frequency Array, String & HashMap problems. Log every suboptimal time complexity.",
    "Week 2: Complete Two-Pointer, Sliding Window, and Monotonic Stack patterns (Daily Temperatures, Longest Substring).",
    "Week 3: Build and deploy a flagship portfolio project with OpenAPI docs, authentication, and live deployed demo.",
    "Week 4: Review Core CS subjects: OS (processes, threads, deadlocks), DBMS (indexing, ACID, normalization), and Networks (TCP/IP).",
    "Week 5: Complete 3 timed mock coding rounds on HackerRank/LeetCode and prepare 4 STAR behavioral stories.",
    "Week 6: Tailor ATS resume to target company job descriptions and request alumni referrals."
  ]
};

export const RoadmapVisualizer: React.FC<RoadmapVisualizerProps> = ({
  roadmap,
  isLoading,
  onRegenerate,
}) => {
  const currentRoadmap = roadmap || DEFAULT_ROADMAP;
  const [completedWeeks, setCompletedWeeks] = useState<Record<number, boolean>>({});

  const toggleWeek = (index: number) => {
    setCompletedWeeks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const completedCount = Object.values(completedWeeks).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / (currentRoadmap.weekly_actions.length || 6)) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
      {/* Subtle background ambient mesh */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#FF6B4A]/[0.08] blur-3xl" />

      {/* Title & Action Bar */}
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF6B4A]/10 text-[#FF6B4A] border border-[#FF6B4A]/20">
              <Compass className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#F2F2F3]">AI-Generated Career Roadmap</h2>
            <span className="rounded-md border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF6B4A] uppercase shadow-[0_0_10px_rgba(255,107,74,0.15)]">
              Gemini Powered
            </span>
          </div>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            {currentRoadmap.headline}
          </p>
        </div>

        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="flex items-center gap-2 self-start rounded-xl border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-4 py-2.5 text-xs font-bold text-[#FF6B4A] shadow-[0_0_15px_rgba(255,107,74,0.15)] transition-all hover:bg-[#FF6B4A]/20 active:scale-95 disabled:opacity-50 sm:self-auto cursor-pointer"
        >
          <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>{isLoading ? "Generating with Gemini..." : "Regenerate Roadmap"}</span>
        </button>
      </div>

      {/* Progress & Skill Gaps Banner */}
      <div className="relative z-10 mt-6 grid gap-4 sm:grid-cols-2">
        {/* Milestone Completion Progress */}
        <div className="rounded-2xl border border-[#2A2A30] bg-[#141417] p-4.5 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#A1A1AA]">Roadmap Milestone Progress</span>
            <span className="text-[#FF6B4A] font-bold">{completedCount} of {currentRoadmap.weekly_actions.length} Completed ({progressPercent}%)</span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#2A2A30]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#C2452B] via-[#FF6B4A] to-[#FF8A6E] shadow-[0_0_10px_rgba(255,107,74,0.4)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Highlighted Skill Gaps */}
        <div className="rounded-2xl border border-[#2A2A30] bg-[#141417] p-4.5 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <span className="text-xs font-semibold text-[#A1A1AA]">Target Skill Gaps to Close:</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {currentRoadmap.skill_gaps.map((gap, i) => (
              <span
                key={i}
                className="rounded-md border border-[#2A2A30] bg-[#1B1B1F] px-2 py-0.5 text-[11px] font-medium text-[#F2F2F3] shadow-[0_0_8px_rgba(255,107,74,0.12)]"
              >
                {gap}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 6-Week Interactive Timeline */}
      <div className="relative z-10 mt-8 space-y-4">
        {currentRoadmap.weekly_actions.map((action, index) => {
          const isDone = !!completedWeeks[index];
          const parts = action.split(":");
          const weekTitle = parts.length > 1 ? parts[0].trim() : `Week ${index + 1}`;
          const weekDescription = parts.length > 1 ? parts.slice(1).join(":").trim() : action;

          return (
            <div
              key={index}
              onClick={() => toggleWeek(index)}
              className={`group flex cursor-pointer items-start gap-4 rounded-2xl border p-4.5 transition-all sm:p-5 ${
                isDone
                  ? "border-[#FF6B4A]/40 bg-[#FF6B4A]/10 text-[#F2F2F3] shadow-[0_4px_20px_rgba(255,107,74,0.1)]"
                  : "border-[#2A2A30] bg-[#141417] text-[#F2F2F3] hover:border-[#FF6B4A]/40 hover:bg-[#1B1B1F] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              }`}
            >
              {/* Checkbox Trigger */}
              <button
                type="button"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all ${
                  isDone
                    ? "border-[#FF6B4A] bg-[#FF6B4A] text-white"
                    : "border-[#2A2A30] bg-[#1B1B1F] text-transparent group-hover:border-[#FF6B4A]/50"
                }`}
              >
                <CheckCircle className="h-4 w-4" />
              </button>

              {/* Week Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDone ? "text-[#FF8A6E]" : "text-[#FF6B4A]"}`}>
                    {weekTitle}
                  </span>
                  {isDone && (
                    <span className="rounded bg-[#FF6B4A]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#FF8A6E]">
                      Completed
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-xs sm:text-sm leading-relaxed ${isDone ? "line-through text-[#A1A1AA]" : "text-[#F2F2F3]"}`}>
                  {weekDescription}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
