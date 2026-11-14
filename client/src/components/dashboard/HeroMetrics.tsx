import React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Award,
  BookOpen,
  Code2,
  Briefcase,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface HeroMetricsProps {
  username: string;
  chance: number | null;
  label: string;
  tone: "strong" | "steady" | "focus";
  cgpa: number;
  backlogs: number;
  internships: number;
  coding: number;
  communication: number;
  onNavigateTab: (tab: any) => void;
  onAskCoach?: (query: string, originTab?: string, cardContext?: string) => void;
}

export const HeroMetrics: React.FC<HeroMetricsProps> = ({
  username,
  chance,
  label,
  tone,
  cgpa,
  backlogs,
  internships,
  coding,
  communication,
  onNavigateTab,
  onAskCoach,
}) => {
  const displayChance = chance !== null ? chance : 74.0;

  const toneConfig = {
    strong: {
      border: "border-[#34222E]",
      bg: "from-[#060608] via-[#000000] to-[#34222E]/35",
      badge: "border-[#34222E] bg-[#060608] text-[#f8fafc]",
      progress: "from-[#060608] to-[#34222E]",
      icon: CheckCircle2,
      tag: "Tier-1 Ready",
    },
    steady: {
      border: "border-[#34222E]/80",
      bg: "from-[#060608] via-[#000000] to-[#34222E]/25",
      badge: "border-[#34222E] bg-[#060608] text-[#f8fafc]",
      progress: "from-[#060608] to-[#34222E]",
      icon: AlertTriangle,
      tag: "Good Foundation",
    },
    focus: {
      border: "border-[#34222E]",
      bg: "from-[#060608] via-[#000000] to-[#34222E]/35",
      badge: "border-[#34222E] bg-[#060608] text-[#f8fafc]",
      progress: "from-[#060608] to-[#34222E]",
      icon: AlertTriangle,
      tag: "Focus Required",
    },
  }[tone] || {
    border: "border-[#34222E]",
    bg: "from-[#060608] via-[#000000] to-[#34222E]/35",
    badge: "border-[#34222E] bg-[#060608] text-[#f8fafc]",
    progress: "from-[#060608] to-[#34222E]",
    icon: CheckCircle2,
    tag: "Tier-1 Ready",
  };

  const ToneIcon = toneConfig.icon;

  return (
    <div className="space-y-6">
      {/* Hero Banner with Integrated Probability Dial — Strictly #000000 & #060608 with light #34222E accents */}
      <div className={`relative overflow-hidden rounded-3xl border ${toneConfig.border} bg-gradient-to-br ${toneConfig.bg} p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-8`}>
        {/* Subtle #34222E accent glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#34222E]/35 blur-3xl" />

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: Personalized Welcome & Positioning */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${toneConfig.badge}`}>
                <ToneIcon className="h-3.5 w-3.5 text-[#f8fafc]" />
                {label}
              </span>
              <span className="rounded-full border border-[#34222E] bg-[#060608] px-2.5 py-0.5 text-xs text-[#f8fafc]/85 backdrop-blur-md font-medium">
                Random Forest ML Engine
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#f8fafc] sm:text-4xl">
              Welcome back, <span className="text-[#f8fafc] drop-shadow-sm">{
                (typeof window !== "undefined" &&
                 (localStorage.getItem("userRole") === "Boss" ||
                  localStorage.getItem("isOwner") === "true" ||
                  localStorage.getItem("das_mode") === "BOSS" ||
                  (username || "").toLowerCase().includes("dileep") ||
                  (username || "").toLowerCase().includes("guest")))
                  ? "Boss"
                  : (username || "Engineer")
              }</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-[#94a3b8]">
              Your placement intelligence command center combines real campus recruitment cohort benchmarks (972 records), scikit-learn probability modeling, and Gemini placement coaching.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigateTab("missions")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#34222E] bg-[#34222E] hover:bg-[#060608] px-4 py-2.5 text-xs font-bold text-[#f8fafc] shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span>View 30-Day Mission & Plan</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => onNavigateTab("coach")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#34222E] bg-[#060608] px-4 py-2.5 text-xs font-semibold text-[#f8fafc] backdrop-blur-md transition-all hover:bg-[#34222E] active:scale-95 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#f8fafc]" />
                <span>Ask AI Placement Coach</span>
              </button>

              {/* Hardware-Accelerated ATS Button */}
              <button
                type="button"
                onClick={() => onNavigateTab("resume")}
                title="Instant ATS Resume Audit & Sync"
                className="group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#34222E] bg-[#000000] px-4 text-xs font-bold text-[#f8fafc] shadow-md transition-all hover:bg-[#34222E] active:scale-95 cursor-pointer"
              >
                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                <span className="relative z-10 flex items-center gap-1.5 text-[#f8fafc]">
                  <span className="h-2 w-2 rounded-full bg-[#f8fafc] animate-pulse" />
                  ATS Resume Sync
                </span>
                <ArrowUpRight className="relative z-10 h-3.5 w-3.5 text-[#f8fafc] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </div>

          {/* Right: Modern High-Precision Probability Card */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#34222E] bg-[#000000] p-6 text-center shadow-2xl backdrop-blur-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f8fafc]">
              Pathfinder Career Readiness Assessment
            </span>
            <span className="text-[10px] text-[#94a3b8] font-medium">
              ML Placement Probability Model
            </span>

            {/* Circular Gauge Visual */}
            <div className="relative my-4 flex h-36 w-36 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34222E" />
                    <stop offset="100%" stopColor="#f8fafc" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[#060608]"
                  strokeWidth="8"
                  fill="transparent"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#gaugeGradient)"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 251.2 - (251.2 * displayChance) / 100 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-3xl font-bold tracking-tight text-[#f8fafc] drop-shadow-sm font-['Space_Grotesk']"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {displayChance.toFixed(0)}%
                </motion.span>
                <span className="text-[10px] font-medium text-[#94a3b8] uppercase tracking-widest">
                  Probability
                </span>
              </div>
            </div>

            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-xs text-[#94a3b8]">
                <span>Model Confidence</span>
                <span className="font-semibold text-[#f8fafc]">120 Estimators</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#060608] border border-[#34222E]/60">
                <div
                  className="h-full rounded-full bg-[#34222E]"
                  style={{ width: `${displayChance}%` }}
                />
              </div>
            </div>

            {onAskCoach && (
              <button
                type="button"
                onClick={() =>
                  onAskCoach(
                    "I don't understand this score, what does it mean?",
                    "overview",
                    `Readiness Probability Score Gauge: ${displayChance.toFixed(0)}% (${label})`
                  )
                }
                className="mt-3.5 flex items-center justify-center gap-1.5 rounded-xl border border-[#34222E] bg-[#060608] px-3 py-1.5 text-[11px] font-semibold text-[#f8fafc] hover:bg-[#34222E] transition-all active:scale-95 shadow-sm cursor-pointer w-full"
              >
                <Sparkles className="h-3 w-3 text-[#f8fafc] shrink-0" />
                <span>Ask Coach about this score</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Core Parameter KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {/* CGPA */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-[#34222E] bg-[#060608] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all hover:bg-[#000000]"
        >
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-xs font-semibold">Cumulative CGPA</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#34222E] text-[#f8fafc] border border-[#34222E]">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#f8fafc] font-['Space_Grotesk']">{cgpa.toFixed(1)}</span>
            <span className="text-xs text-[#94a3b8] font-medium">/ 10.0</span>
          </div>
          <div className="mt-3 text-xs text-[#94a3b8]">
            {cgpa >= 7.5 ? (
              <span className="text-[#f8fafc] font-medium">✓ Satisfies Tier-1 criteria</span>
            ) : (
              <span className="text-[#94a3b8] font-medium">⚠ Target ≥ 7.0 cutoff</span>
            )}
          </div>
        </motion.div>

        {/* Backlogs */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-[#34222E] bg-[#060608] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all hover:bg-[#000000]"
        >
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-xs font-semibold">Active Backlogs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#34222E] text-[#f8fafc] border border-[#34222E]">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#f8fafc] font-['Space_Grotesk']">{backlogs}</span>
            <span className="text-xs text-[#94a3b8]">Active</span>
          </div>
          <div className="mt-2 text-[11px]">
            {backlogs === 0 ? (
              <span className="text-[#f8fafc] font-medium">✓ 100% Eligible for drives</span>
            ) : (
              <span className="text-[#94a3b8] font-medium">Clear before campus drives</span>
            )}
          </div>
        </motion.div>

        {/* Internships */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-[#34222E] bg-[#060608] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all hover:bg-[#000000]"
        >
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-xs font-semibold">Internships Completed</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#34222E] text-[#f8fafc] border border-[#34222E]">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#f8fafc] font-['Space_Grotesk']">{internships}</span>
            <span className="text-xs text-[#94a3b8]">completed</span>
          </div>
          <div className="mt-2 text-[11px] text-[#94a3b8]">
            {internships >= 1 ? (
              <span className="text-[#f8fafc] font-medium">✓ Practical work validated</span>
            ) : (
              <span className="text-[#94a3b8]">Target 1 practical project</span>
            )}
          </div>
        </motion.div>

        {/* Coding & DSA */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-[#34222E] bg-[#060608] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all hover:bg-[#000000]"
        >
          <div className="flex items-center justify-between text-[#94a3b8]">
            <span className="text-xs font-semibold">DSA & Problem Solving</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#34222E] text-[#f8fafc] border border-[#34222E]">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#f8fafc] font-['Space_Grotesk']">{coding}</span>
            <span className="text-xs text-[#94a3b8]">/ 10</span>
          </div>
          <div className="mt-2 text-[11px] text-[#94a3b8]">
            {coding >= 7 ? (
              <span className="text-[#f8fafc] font-medium">✓ High-frequency patterns</span>
            ) : (
              <span className="text-[#94a3b8] font-medium">Review Blind 75 list</span>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
