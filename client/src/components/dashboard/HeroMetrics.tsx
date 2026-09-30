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
  onNavigateTab: (tab: "overview" | "roadmap" | "coach" | "analytics" | "resume") => void;
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
}) => {
  const displayChance = chance !== null ? chance : 74.0;

  const toneConfig = {
    strong: {
      border: "border-emerald-500/30",
      bg: "from-emerald-500/10 via-emerald-950/20 to-slate-900/40",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      progress: "from-emerald-400 to-teal-400",
      icon: CheckCircle2,
      tag: "Tier-1 Ready",
    },
    steady: {
      border: "border-amber-500/30",
      bg: "from-amber-500/10 via-amber-950/20 to-slate-900/40",
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      progress: "from-amber-400 to-yellow-400",
      icon: AlertTriangle,
      tag: "Good Foundation",
    },
    focus: {
      border: "border-rose-500/30",
      bg: "from-rose-500/10 via-rose-950/20 to-slate-900/40",
      badge: "border-rose-500/30 bg-rose-500/10 text-rose-400",
      progress: "from-rose-400 to-orange-400",
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
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: Personalized Welcome & Positioning */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${toneConfig.badge}`}>
                <ToneIcon className="h-3.5 w-3.5" />
                {label}
              </span>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs text-slate-300 backdrop-blur-md">
                Random Forest ML Engine
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
              Welcome back, <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">{username || "Engineer"}</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-300">
              Your placement intelligence command center combines real campus recruitment cohort benchmarks (650+ records), scikit-learn probability modeling, and Gemini placement coaching.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => onNavigateTab("roadmap")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:brightness-110 active:scale-95"
              >
                <span>View 6-Week Action Plan</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => onNavigateTab("coach")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-slate-200 backdrop-blur-md transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Ask AI Placement Coach</span>
              </button>
            </div>
          </div>

          {/* Right: Modern High-Precision Probability Card */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-slate-950/70 p-6 text-center shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Placement Probability Score
            </span>

            {/* Circular / Arc Gauge Visual */}
            <div className="relative my-4 flex h-36 w-36 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-800/80"
                  strokeWidth="8"
                  fill="transparent"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={`stroke-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]`}
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
                  className="text-3xl font-black tracking-tight text-white drop-shadow-sm"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {displayChance.toFixed(0)}%
                </motion.span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                  Probability
                </span>
              </div>
            </div>

            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Model Confidence</span>
                <span className="font-semibold text-slate-200">120 Estimators</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${toneConfig.progress} shadow-[0_0_10px_rgba(16,185,129,0.5)]`}
                  style={{ width: `${displayChance}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Parameter KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* CGPA */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-cyan-500/40 hover:shadow-[0_12px_32px_rgba(6,182,212,0.12)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Cumulative CGPA</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{cgpa.toFixed(1)}</span>
            <span className="text-xs text-slate-500">/ 10.0</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {cgpa >= 7.5 ? (
              <span className="text-emerald-400 font-medium">✓ Satisfies Tier-1 criteria</span>
            ) : (
              <span className="text-amber-400 font-medium">⚠ Target ≥ 7.0 cutoff</span>
            )}
          </div>
        </motion.div>

        {/* Backlogs */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-emerald-500/40 hover:shadow-[0_12px_32px_rgba(16,185,129,0.12)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Active Backlogs</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{backlogs}</span>
            <span className="text-xs text-slate-500">Active</span>
          </div>
          <div className="mt-2 text-[11px]">
            {backlogs === 0 ? (
              <span className="text-emerald-400 font-medium">✓ 100% Eligible for drives</span>
            ) : (
              <span className="text-rose-400 font-medium">Clear before campus drives</span>
            )}
          </div>
        </motion.div>

        {/* Internships */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-purple-500/40 hover:shadow-[0_12px_32px_rgba(168,85,247,0.12)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Internships Completed</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{internships}</span>
            <span className="text-xs text-slate-500">completed</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {internships >= 1 ? (
              <span className="text-emerald-400 font-medium">✓ Practical work validated</span>
            ) : (
              <span className="text-slate-400">Target 1 practical project</span>
            )}
          </div>
        </motion.div>

        {/* Coding & DSA */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-slate-900/50 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-amber-500/40 hover:shadow-[0_12px_32px_rgba(245,158,11,0.12)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">DSA & Problem Solving</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{coding}</span>
            <span className="text-xs text-slate-500">/ 10</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {coding >= 7 ? (
              <span className="text-emerald-400 font-medium">✓ High-frequency patterns</span>
            ) : (
              <span className="text-amber-400 font-medium">Review Blind 75 list</span>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
