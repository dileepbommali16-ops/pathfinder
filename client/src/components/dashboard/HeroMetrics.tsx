import React from "react";
import { motion } from "framer-motion";
import { getUserRole, getRememberedGuestName } from "@/lib/auth";
import { AnimatedMetric, SpotlightSurface } from "@/components/ui/TitaniumPrimitives";

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
  layoutMode?: "background" | "docked";
  onNavigateTab: (tab: any) => void;
  onAskCoach?: (query: string, originTab?: string, cardContext?: string) => void;
}

export const HeroMetrics: React.FC<HeroMetricsProps> = ({
  username,
  chance,
  label,
  onNavigateTab,
  onAskCoach,
}) => {
  const isConfigured = chance !== null && chance !== undefined;
  const isWaitingForModel = !isConfigured && /calculating|waking/i.test(label || "");
  const waitingLabel = label || "Awaiting Profile Input";
  const clampedChance = isConfigured ? Math.max(0, Math.min(100, chance)) : 0;

  const emailNow =
    typeof window !== "undefined" ? localStorage.getItem("userEmail") || undefined : undefined;
  const activeRole = getUserRole(emailNow, username);
  const rememberedGuest = getRememberedGuestName();
  const isGuest =
    !username ||
    username.toLowerCase().includes("guest") ||
    activeRole === "Guest";
  const resolvedUser =
    activeRole === "Boss"
      ? "Boss"
      : rememberedGuest && isGuest
        ? rememberedGuest
        : username && !username.toLowerCase().includes("guest")
          ? username
          : activeRole;

  return (
    <SpotlightSurface className="rounded-2xl p-8 sm:p-12">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Left: Candidate Positioning & Spacious Actions */}
        <div className="space-y-6 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-md border border-white/[0.12] bg-[#141419] px-3 py-1 text-xs font-medium text-[#FAFAFA]">
              {isConfigured ? label : waitingLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#0D0D11] px-3 py-1 font-mono text-[11px] text-[#A1A1AA] tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FAFAFA]" />
              <span>Random Forest · 972-record synthetic dataset</span>
            </span>
          </div>

          <h1
            className="text-3xl font-semibold tracking-[-0.035em] text-[#FAFAFA] sm:text-5xl"
            style={{ textWrap: "balance" }}
          >
            {isGuest && !rememberedGuest ? "Welcome to Pathfinder" : `Welcome back, ${resolvedUser}`}
          </h1>

          <p
            className="max-w-[58ch] text-sm leading-[1.7] text-[#A1A1AA] sm:text-base"
            style={{ textWrap: "pretty" }}
          >
            Your placement workspace synthesizes a 972-record synthetic placement dataset,
            augmented from a 215-record public baseline, Random Forest offer modeling, and live 3D
            voice coaching with DAS into one spacious execution hub.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab("analytics")}
              className="pf-btn-primary inline-flex h-11 items-center justify-center rounded-xl px-5 text-xs font-medium active:scale-[0.98]"
            >
              Open 6-week roadmap
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("resume")}
              title="Instant ATS Resume Audit & Sync"
              className="pf-btn-secondary inline-flex h-11 items-center justify-center rounded-xl px-5 text-xs font-medium text-[#D4D4D8] hover:text-[#FAFAFA] active:scale-[0.98]"
            >
              ATS resume sync
            </button>
          </div>
        </div>

        {/* Right: Machined Telemetry Subpanel */}
        <div className="lg:col-span-5">
          <div className="pf-subpanel rounded-2xl p-7 sm:p-8">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <span className="text-xs font-medium text-[#D4D4D8]">Placement probability</span>
              <span className="font-mono text-[11px] text-[#8A8A92] tabular-nums">
                120 estimators
              </span>
            </div>

            <div className="my-7 flex items-baseline justify-between gap-4">
              <span className="font-mono text-5xl font-semibold tracking-[-0.04em] text-[#FAFAFA] sm:text-6xl">
                {isConfigured ? (
                  <AnimatedMetric value={clampedChance} decimals={1} suffix="%" />
                ) : (
                  <span className="tabular-nums">— %</span>
                )}
              </span>
              <span className="font-mono text-xs text-[#A1A1AA]">
                {isConfigured ? label : waitingLabel}
              </span>
            </div>

            <div className="space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#A1A1AA] to-[#FAFAFA]"
                  initial={{ width: 0 }}
                  animate={{ width: `${clampedChance}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[#8A8A92] tabular-nums">
                <span>0%</span>
                <span>Tier-1 threshold · 75%</span>
                <span>100%</span>
              </div>
            </div>

            {isConfigured ? (
              onAskCoach && (
                <button
                  type="button"
                  onClick={() =>
                    onAskCoach(
                      "I don't understand this score, what does it mean?",
                      "overview",
                      `Readiness Probability Score: ${clampedChance.toFixed(1)}% (${label})`
                    )
                  }
                  className="pf-btn-secondary mt-6 flex h-11 w-full items-center justify-center rounded-xl px-4 text-xs font-medium active:scale-[0.98]"
                >
                  Ask DAS to break down this score
                </button>
              )
            ) : isWaitingForModel ? (
              <div className="mt-6 flex h-11 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-[#121216] px-4 font-mono text-xs text-[#A1A1AA]">
                Waiting for real Random Forest score...
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab("profile")}
                className="pf-btn-secondary mt-6 flex h-11 w-full items-center justify-center rounded-xl px-4 text-xs font-medium active:scale-[0.98]"
              >
                Complete Profile in Settings to Compute
              </button>
            )}
          </div>
        </div>
      </div>
    </SpotlightSurface>
  );
};
