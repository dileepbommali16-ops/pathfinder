import React, { useState } from "react";

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
    "STAR framework behavioral articulation",
  ],
  weekly_actions: [
    "Week 1: Solve 15 high-frequency Array, String & HashMap problems. Log every suboptimal time complexity.",
    "Week 2: Complete Two-Pointer, Sliding Window, and Monotonic Stack patterns (Daily Temperatures, Longest Substring).",
    "Week 3: Build and deploy a flagship portfolio project with OpenAPI docs, authentication, and live deployed demo.",
    "Week 4: Review Core CS subjects: OS (processes, threads, deadlocks), DBMS (indexing, ACID, normalization), and Networks (TCP/IP).",
    "Week 5: Complete 3 timed mock coding rounds on HackerRank/LeetCode and prepare 4 STAR behavioral stories.",
    "Week 6: Tailor ATS resume to target company job descriptions and request alumni referrals.",
  ],
};

export const RoadmapVisualizer: React.FC<RoadmapVisualizerProps> = ({
  roadmap,
  isLoading,
  onRegenerate,
}) => {
  const currentRoadmap = roadmap || DEFAULT_ROADMAP;
  const getRoadmapStorageKey = () => {
    if (typeof window === "undefined") return "pathfinder_roadmap_completed_v1_guest";
    const email = (localStorage.getItem("userEmail") || "guest").trim().toLowerCase() || "guest";
    return `pathfinder_roadmap_completed_v1_${email}`;
  };
  const [storageKey, setStorageKey] = useState<string>(getRoadmapStorageKey);
  const [completedWeeks, setCompletedWeeks] = useState<Record<number, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(getRoadmapStorageKey());
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
    const syncKey = () => {
      const nextKey = getRoadmapStorageKey();
      setStorageKey(nextKey);
      try {
        const saved = localStorage.getItem(nextKey);
        setCompletedWeeks(saved ? JSON.parse(saved) : {});
      } catch {
        setCompletedWeeks({});
      }
    };
    window.addEventListener("pathfinder:auth-change", syncKey);
    return () => window.removeEventListener("pathfinder:auth-change", syncKey);
  }, []);

  const persistCompleted = (next: Record<number, boolean>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch { }
  };

  const toggleWeek = (index: number) => {
    setCompletedWeeks((prev) => {
      const next = { ...prev, [index]: !prev[index] };
      persistCompleted(next);
      return next;
    });
  };

  const resetProgress = () => {
    setCompletedWeeks({});
    persistCompleted({});
  };

  const completedCount = Object.values(completedWeeks).filter(Boolean).length;
  const progressPercent = Math.round(
    (completedCount / (currentRoadmap.weekly_actions.length || 6)) * 100
  );

  return (
    <div className="pf-titanium-card rounded-2xl p-8 sm:p-10">
      {/* Title & Action Bar */}
      <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-2xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-[28px]"
              style={{ textWrap: "balance" }}
            >
              6-Week Strategic Placement Roadmap
            </h2>
            <span className="rounded-md border border-white/[0.1] bg-[#141418] px-2.5 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
              Sprint Tracker
            </span>
          </div>
          <p className="mt-2 text-xs text-[#A1A1AA] sm:text-sm">{currentRoadmap.headline}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {completedCount > 0 && (
            <button
              type="button"
              onClick={resetProgress}
              className="pf-btn-secondary inline-flex h-10 items-center rounded-xl px-4 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
            >
              Reset progress
            </button>
          )}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isLoading}
            className="pf-btn-secondary inline-flex h-10 items-center rounded-xl px-4 text-xs font-medium active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? "Regenerating Roadmap..." : "Regenerate Roadmap"}
          </button>
        </div>
      </div>

      {/* Progress & Skill Gaps Banner */}
      <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:gap-8">
        <div className="pf-subpanel rounded-2xl p-6">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-[#A1A1AA]">Milestone Progress</span>
            <span className="font-mono text-[#FAFAFA] tabular-nums">
              {completedCount} of {currentRoadmap.weekly_actions.length} ({progressPercent}%)
            </span>
          </div>
          <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#A1A1AA] to-[#FAFAFA] transition-[width] duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="pf-subpanel rounded-2xl p-6">
          <span className="text-xs font-medium text-[#A1A1AA]">Target Skill Gaps to Close</span>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {currentRoadmap.skill_gaps.map((gap, i) => (
              <span
                key={i}
                className="rounded-md border border-white/[0.08] bg-black/50 px-3 py-1 text-[11px] font-medium text-[#FAFAFA]"
              >
                {gap}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 6-Week Spacious 2-Column Sprint Timeline */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {currentRoadmap.weekly_actions.map((action, index) => {
          const isDone = !!completedWeeks[index];
          const parts = action.split(":");
          const weekTitle = parts.length > 1 ? parts[0].trim() : `Week ${index + 1}`;
          const weekDescription = parts.length > 1 ? parts.slice(1).join(":").trim() : action;
          const idxLabel = String(index + 1).padStart(2, "0");

          return (
            <button
              key={index}
              type="button"
              onClick={() => toggleWeek(index)}
              aria-pressed={isDone}
              className={`flex w-full cursor-pointer items-start gap-4 rounded-2xl border p-5 text-left transition-colors duration-150 sm:p-6 ${isDone
                ? "border-white/[0.26] bg-[#16161D] text-[#FAFAFA]"
                : "border-white/[0.07] bg-[#0D0D11]/90 text-[#FAFAFA] hover:border-white/[0.16] hover:bg-[#131319]"
                }`}
            >
              <span
                className={`mt-0.5 flex h-7 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-[10px] font-medium tabular-nums ${isDone
                  ? "border-[#FAFAFA] bg-[#FAFAFA] text-[#09090B]"
                  : "border-white/[0.1] bg-black/50 text-[#8A8A92]"
                  }`}
              >
                {isDone ? "DONE" : idxLabel}
              </span>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-[#D4D4D8]">{weekTitle}</span>
                  {isDone && (
                    <span className="rounded border border-white/[0.12] bg-black/50 px-1.5 py-0.5 font-mono text-[9px] text-[#FAFAFA]">
                      Completed
                    </span>
                  )}
                </div>
                <p
                  className={`mt-2 text-xs leading-[1.65] sm:text-sm ${isDone ? "line-through text-[#8A8A92]" : "text-[#E4E4E7]"
                    }`}
                >
                  {weekDescription}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
