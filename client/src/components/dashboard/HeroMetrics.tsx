import React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Award,
  BookOpen,
  Code2,
  Briefcase,
  MessageSquare,
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
      border: "border-[#9CE5E0]/30",
      bg: "from-[#9CE5E0]/10 via-[#1B1B1F] to-[#141417]",
      badge: "border-[#9CE5E0]/30 bg-[#9CE5E0]/10 text-[#9CE5E0]",
      progress: "from-[#B8A1FF] to-[#9CE5E0]",
      icon: CheckCircle2,
      tag: "Tier-1 Ready",
    },
    steady: {
      border: "border-[#2A2A30]",
      bg: "from-white/[0.04] via-[#1B1B1F] to-[#141417]",
      badge: "border-[#2A2A30] bg-white/[0.04] text-[#E5E1EF]",
      progress: "from-[#B8A1FF]/60 to-[#E5E1EF]",
      icon: AlertTriangle,
      tag: "Good Foundation",
    },
    focus: {
      border: "border-[#B8A1FF]/30",
      bg: "from-[#B8A1FF]/10 via-[#1B1B1F] to-[#141417]",
      badge: "border-[#B8A1FF]/30 bg-[#B8A1FF]/10 text-[#B8A1FF]",
      progress: "from-[#B8A1FF] to-[#E5E1EF]",
      icon: AlertTriangle,
      tag: "Focus Required",
    },
  }[tone];

  const ToneIcon = toneConfig.icon;

  return (
    <div className="space-y-6">
      {/* Hero Banner with Integrated Probability Dial */}
      <div className={`relative overflow-hidden rounded-3xl border ${toneConfig.border} bg-gradient-to-br ${toneConfig.bg} p-6 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl ring-1 ring-white/10 sm:p-8`}>
        {/* Subtle background ambient mesh */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#B8A1FF]/10 blur-3xl" />

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: Personalized Welcome & Positioning */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${toneConfig.badge}`}>
                <ToneIcon className="h-3.5 w-3.5" />
                {label}
              </span>
              <span className="rounded-full border border-[#2A2A30] bg-[#141417] px-2.5 py-0.5 text-xs text-[#9CE5E0] backdrop-blur-md">
                Random Forest ML Engine
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#FFFFFF] sm:text-4xl">
              Welcome back, <span className="bg-gradient-to-r from-[#B8A1FF] via-[#E5E1EF] to-[#FFFFFF] bg-clip-text text-transparent drop-shadow-sm">{username || "Engineer"}</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-[#B9B5C7]">
              Your placement intelligence command center combines real campus recruitment cohort benchmarks (972 records), scikit-learn probability modeling, and Gemini placement coaching.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigateTab("missions")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#B8A1FF] px-4 py-2.5 text-xs font-bold text-[#0E0F17] shadow-[0_0_20px_rgba(184,161,255,0.35)] transition-all hover:bg-[#D4C7FF] active:scale-95 cursor-pointer"
              >
                <span>View 30-Day Mission & Plan</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => onNavigateTab("coach")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#141417] px-4 py-2.5 text-xs font-semibold text-[#F1F0F7] backdrop-blur-md transition-all hover:border-[#B8A1FF]/40 hover:bg-[#B8A1FF]/10 hover:text-[#9CE5E0] active:scale-95 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#B8A1FF]" />
                <span>Ask AI Placement Coach</span>
              </button>

              {/* Hardware-Accelerated Metallic Chrome ATS Button */}
              <button
                type="button"
                onClick={() => onNavigateTab("resume")}
                title="Chrome Upload: Instant ATS Resume Audit & Sync"
                className="group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#2A2A30] bg-gradient-to-b from-slate-800 via-slate-900 to-black px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:border-[#B8A1FF]/60 hover:shadow-[0_0_18px_rgba(184,161,255,0.35)] active:scale-95 cursor-pointer"
              >
                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                <span className="relative z-10 flex items-center gap-1.5 bg-gradient-to-r from-[#FFFFFF] via-[#E5E1EF] to-[#B9B5C7] bg-clip-text text-transparent">
                  <span className="h-2 w-2 rounded-full bg-[#9CE5E0] shadow-[0_0_8px_rgba(156,229,224,0.9)] animate-pulse" />
                  Chrome ATS Sync
                </span>
                <ArrowUpRight className="relative z-10 h-3.5 w-3.5 text-[#9CE5E0] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </div>

          {/* Right: Modern High-Precision Probability Card */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-6 text-center shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CE5E0]">
              Pathfinder Career Readiness Assessment
            </span>
            <span className="text-[10px] text-[#B9B5C7] font-medium">
              ML Placement Probability Model
            </span>

            {/* Circular / Arc Gauge Visual with Multi-tone Gradient */}
            <div className="relative my-4 flex h-36 w-36 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#B8A1FF" />
                    <stop offset="100%" stopColor="#9CE5E0" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[#2A2A30]"
                  strokeWidth="8"
                  fill="transparent"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#gaugeGradient)"
                  className="drop-shadow-[0_0_10px_rgba(184,161,255,0.5)]"
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
                  className="text-3xl font-bold tracking-tight text-[#F1F0F7] drop-shadow-sm"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {displayChance.toFixed(0)}%
                </motion.span>
                <span className="text-[10px] font-medium text-[#B9B5C7] uppercase tracking-widest">
                  Probability
                </span>
              </div>
            </div>

            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-xs text-[#B9B5C7]">
                <span>Model Confidence</span>
                <span className="font-semibold text-[#F1F0F7]">120 Estimators</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2A2A30]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${toneConfig.progress} shadow-[0_0_10px_rgba(184,161,255,0.4)]`}
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
                className="mt-3.5 flex items-center justify-center gap-1.5 rounded-xl border border-[#B8A1FF]/30 bg-[#B8A1FF]/10 px-3 py-1.5 text-[11px] font-semibold text-[#9CE5E0] hover:bg-[#B8A1FF]/20 hover:border-[#B8A1FF] transition-all active:scale-95 shadow-sm cursor-pointer w-full"
              >
                <Sparkles className="h-3 w-3 text-[#B8A1FF] shrink-0" />
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
          className="rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-[#B8A1FF]/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <div className="flex items-center justify-between text-[#B9B5C7]">
            <span className="text-xs font-semibold">Cumulative CGPA</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B8A1FF]/10 text-[#B8A1FF] border border-[#B8A1FF]/20">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-[#F1F0F7]">{cgpa.toFixed(1)}</span>
            <span className="text-xs text-[#B9B5C7] font-medium">/ 10.0</span>
          </div>
          <div className="mt-3 text-xs text-[#B9B5C7]">
            {cgpa >= 7.5 ? (
              <span className="text-[#9CE5E0] font-medium">✓ Satisfies Tier-1 criteria</span>
            ) : (
              <span className="text-[#B8A1FF] font-medium">⚠ Target ≥ 7.0 cutoff</span>
            )}
          </div>
        </motion.div>

        {/* Backlogs */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-[#B8A1FF]/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <div className="flex items-center justify-between text-[#B9B5C7]">
            <span className="text-xs font-semibold">Active Backlogs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B8A1FF]/10 text-[#B8A1FF] border border-[#B8A1FF]/20">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#F1F0F7]">{backlogs}</span>
            <span className="text-xs text-[#B9B5C7]">Active</span>
          </div>
          <div className="mt-2 text-[11px]">
            {backlogs === 0 ? (
              <span className="text-[#9CE5E0] font-medium">✓ 100% Eligible for drives</span>
            ) : (
              <span className="text-[#B8A1FF] font-medium">Clear before campus drives</span>
            )}
          </div>
        </motion.div>

        {/* Internships */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-[#B8A1FF]/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <div className="flex items-center justify-between text-[#B9B5C7]">
            <span className="text-xs font-semibold">Internships Completed</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#B8A1FF]/10 text-[#B8A1FF] border border-[#B8A1FF]/20">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#F1F0F7]">{internships}</span>
            <span className="text-xs text-[#B9B5C7]">completed</span>
          </div>
          <div className="mt-2 text-[11px] text-[#B9B5C7]">
            {internships >= 1 ? (
              <span className="text-[#9CE5E0] font-medium">✓ Practical work validated</span>
            ) : (
              <span className="text-[#B9B5C7]">Target 1 practical project</span>
            )}
          </div>
        </motion.div>

        {/* Coding & DSA */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-[#B8A1FF]/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <div className="flex items-center justify-between text-[#B9B5C7]">
            <span className="text-xs font-semibold">DSA & Problem Solving</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#B8A1FF]/10 text-[#B8A1FF] border border-[#B8A1FF]/20">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#F1F0F7]">{coding}</span>
            <span className="text-xs text-[#B9B5C7]">/ 10</span>
          </div>
          <div className="mt-2 text-[11px] text-[#B9B5C7]">
            {coding >= 7 ? (
              <span className="text-[#9CE5E0] font-medium">✓ High-frequency patterns</span>
            ) : (
              <span className="text-[#B8A1FF] font-medium">Review Blind 75 list</span>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
