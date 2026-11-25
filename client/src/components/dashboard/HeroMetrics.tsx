import React from "react";
import { motion } from "framer-motion";
import { getUserRole } from "@/lib/auth";
import { Sparkles, ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";

interface HeroMetricsProps {
  username: string;
  chance: number | null;
  label: string;
  tone: "strong" | "steady" | "focus";
  cgpa?: number;
  backlogs?: number;
  internships?: number;
  coding?: number;
  communication?: number;
  onNavigateTab: (tab: any) => void;
  onAskCoach?: (query: string, originTab?: string, cardContext?: string) => void;
}

export const HeroMetrics: React.FC<HeroMetricsProps> = ({
  username,
  chance,
  label,
  tone,
  onNavigateTab,
  onAskCoach,
}) => {
  const displayChance = chance !== null ? chance : 74.0;
  const clampedChance = Math.max(0, Math.min(100, displayChance));
  const ToneIcon = tone === "strong" ? CheckCircle2 : AlertTriangle;

  const resolvedUser = (() => {
    const emailNow =
      typeof window !== "undefined" ? localStorage.getItem("userEmail") || undefined : undefined;
    const activeRole = getUserRole(emailNow, username);
    if (activeRole === "Boss") return "Boss";
    if (username && !username.toLowerCase().includes("guest")) return username;
    return activeRole;
  })();

  return (
    <div className="rounded-xl border border-[#222226] bg-[#09090B]/56 p-6 backdrop-blur-[2px] sm:p-8">
      <div className="grid items-center gap-8 lg:grid-cols-12">
        {/* Left: Candidate Positioning & Primary Actions */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#27272A] bg-[#111114] px-2.5 py-1 text-xs font-medium text-[#FAFAFA]">
              <ToneIcon className="h-3.5 w-3.5 text-[#A1A1AA]" />
              <span>{label}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#1F1F23] bg-[#0C0C0E] px-2.5 py-1 font-mono text-[11px] text-[#A1A1AA] tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              <span>Random Forest · 972 records</span>
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-4xl">
            Welcome back, {resolvedUser}
          </h1>

          <p className="max-w-[58ch] text-sm leading-relaxed text-[#A1A1AA]">
            Your placement workspace synthesizes historical campus drive cutoffs, Random Forest
            offer modeling, and live 3D voice coaching with DAS into one execution view.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab("analytics")}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#FAFAFA] px-4 text-xs font-medium text-[#09090B] transition-colors duration-150 hover:bg-[#E4E4E7] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              <span>Open 6-week roadmap</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("das-toggle-focus", { detail: { focus: true } }));
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => document.getElementById("das-command-input")?.focus(), 180);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#27272A] bg-[#0C0C0E] px-4 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#A1A1AA]" />
              <span>Talk to 3D voice coach</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("resume")}
              title="Instant ATS Resume Audit & Sync"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#27272A] bg-[#0C0C0E] px-4 text-xs font-medium text-[#D4D4D8] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] hover:text-[#FAFAFA] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
            >
              <span>ATS resume sync</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#71717A]" />
            </button>
          </div>
        </div>

        {/* Right: COMPUTE Precision Telemetry Panel (Concentric 12px outer -> 8px inner) */}
        <div className="lg:col-span-5">
          <div className="rounded-lg border border-[#222226] bg-[#0A0A0D]/82 p-5">
            <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
              <span className="text-xs font-medium text-[#D4D4D8]">Placement probability</span>
              <span className="font-mono text-[11px] text-[#71717A] tabular-nums">
                120 estimators
              </span>
            </div>

            <div className="my-5 flex items-baseline justify-between gap-4">
              <motion.span
                className="font-mono text-4xl font-semibold tracking-[-0.03em] text-[#FAFAFA] tabular-nums sm:text-5xl"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {clampedChance.toFixed(1)}%
              </motion.span>
              <span className="font-mono text-xs text-[#A1A1AA]">{label}</span>
            </div>

            {/* Segmented Precision Telemetry Bar */}
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-sm bg-[#18181B]">
                <motion.div
                  className="h-full bg-[#FAFAFA]"
                  initial={{ width: 0 }}
                  animate={{ width: `${clampedChance}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[#71717A] tabular-nums">
                <span>0%</span>
                <span>Tier-1 threshold · 75%</span>
                <span>100%</span>
              </div>
            </div>

            {onAskCoach && (
              <button
                type="button"
                onClick={() =>
                  onAskCoach(
                    "I don't understand this score, what does it mean?",
                    "overview",
                    `Readiness Probability Score: ${clampedChance.toFixed(1)}% (${label})`
                  )
                }
                className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-[#27272A] bg-[#111114] px-3 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
              >
                <Sparkles className="h-3 w-3 shrink-0 text-[#A1A1AA]" />
                <span>Ask DAS to break down this score</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
