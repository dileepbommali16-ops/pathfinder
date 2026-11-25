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
    } catch {}
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
    <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px] sm:p-8">
      {/* Title & Action Bar */}
      <div className="flex flex-col gap-4 border-b border-[#1F1F23] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              className="text-xl font-semibold tracking-[-0.025em] text-[#FAFAFA] sm:text-2xl"
              style={{ textWrap: "balance" }}
            >
              6-Week Strategic Placement Roadmap
            </h2>
            <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
              Sprint Tracker
            </span>
          </div>
          <p className="mt-1.5 text-xs text-[#A1A1AA] sm:text-sm">{currentRoadmap.headline}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {completedCount > 0 && (
            <button
              type="button"
              onClick={resetProgress}
              className="inline-flex h-9 items-center rounded-lg border border-[#27272A] bg-[#101014] px-3.5 text-xs font-medium text-[#A1A1AA] transition-colors duration-150 hover:border-[#3F3F46] hover:text-[#FAFAFA] cursor-pointer"
            >
              Reset progress
            </button>
          )}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isLoading}
            className="inline-flex h-9 items-center rounded-lg border border-[#27272A] bg-[#141418] px-4 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#1C1C22] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? "Regenerating Roadmap..." : "Regenerate Roadmap"}
          </button>
        </div>
      </div>

      {/* Progress & Skill Gaps Banner */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-[#222226] bg-[#101014] p-5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-[#A1A1AA]">Milestone Progress</span>
            <span className="font-mono text-[#FAFAFA] tabular-nums">
              {completedCount} of {currentRoadmap.weekly_actions.length} ({progressPercent}%)
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-[#18181B]">
            <div
              className="h-full bg-[#FAFAFA] transition-[width] duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#222226] bg-[#101014] p-5">
          <span className="text-xs font-medium text-[#A1A1AA]">Target Skill Gaps to Close</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {currentRoadmap.skill_gaps.map((gap, i) => (
              <span
                key={i}
                className="rounded-md border border-[#27272A] bg-[#0B0B0E] px-2.5 py-1 text-[11px] font-medium text-[#FAFAFA]"
              >
                {gap}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 6-Week Interactive Timeline */}
      <div className="mt-7 space-y-3.5">
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
              className={`flex w-full cursor-pointer items-start gap-4 rounded-xl border p-4 text-left transition-colors duration-150 sm:p-5 ${
                isDone
                  ? "border-[#3F3F46] bg-[#14141A] text-[#FAFAFA]"
                  : "border-[#222226] bg-[#101014] text-[#FAFAFA] hover:border-[#3F3F46] hover:bg-[#141418]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-8 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-medium tabular-nums ${
                  isDone
                    ? "border-[#FAFAFA] bg-[#FAFAFA] text-[#09090B]"
                    : "border-[#27272A] bg-[#0B0B0E] text-[#71717A]"
                }`}
              >
                {isDone ? "DONE" : idxLabel}
              </span>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-[#D4D4D8]">{weekTitle}</span>
                  {isDone && (
                    <span className="rounded border border-[#27272A] bg-[#0B0B0E] px-1.5 py-0.5 font-mono text-[9px] text-[#A1A1AA]">
                      Completed
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1.5 text-xs leading-relaxed sm:text-sm ${
                    isDone ? "line-through text-[#71717A]" : "text-[#E4E4E7]"
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
