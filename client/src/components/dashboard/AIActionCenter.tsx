import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Target,
  Compass,
  Bot,
  FileText,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Zap,
  Mic,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Award,
  Layers,
  BarChart3
} from "lucide-react";
import { TabId } from "./DashboardHeader";
import { StudentProfileState, DEFAULT_STUDENT_PROFILE } from "@/types/profile";

interface AIActionCenterProps {
  onNavigateTab: (tab: TabId) => void;
  onTriggerCalculate: () => void;
  onStartMockInterview: () => void;
  targetRole: string;
  profile?: StudentProfileState;
  prediction?: {
    chance: number;
    label: string;
    tone: "strong" | "steady" | "focus";
    strengths: string[];
    priorities: string[];
    breakdown: Record<string, number>;
  };
}

export const AIActionCenter: React.FC<AIActionCenterProps> = ({
  onNavigateTab,
  onTriggerCalculate,
  onStartMockInterview,
  targetRole,
  profile,
  prediction,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [analyzedSuccess, setAnalyzedSuccess] = useState(false);

  // Active candidate vectors fallback to safe defaults if not provided
  const activeProfile: StudentProfileState = profile || {
    ...DEFAULT_STUDENT_PROFILE,
    targetRole: targetRole || DEFAULT_STUDENT_PROFILE.targetRole,
  };

  // Live mathematical sensitivity calculation
  const rawScore =
    activeProfile.cgpa * 5.2 +
    Math.max(0, 3 - activeProfile.backlogs) * 4 +
    Math.min(activeProfile.internships, 3) * 5 +
    activeProfile.communication * 2.2 +
    activeProfile.coding * 2.7 -
    Math.max(activeProfile.backlogs - 1, 0) * 5;

  const currentChance = prediction?.chance ?? Math.max(18, Math.min(96, Math.round(rawScore * 10) / 10));
  const currentLabel =
    prediction?.label ??
    (currentChance >= 75
      ? "Strong Candidate Profile"
      : currentChance >= 55
      ? "Solid Foundation (On Track)"
      : "Needs Strategic Acceleration");

  const academicsScore = Math.min(100, Math.round(activeProfile.cgpa * 10));
  const codingScore = Math.min(100, Math.round(activeProfile.coding * 10));
  const experienceScore = Math.min(100, activeProfile.internships * 35);
  const commScore = Math.min(100, Math.round(activeProfile.communication * 10));
  const eligibilityScore = Math.max(0, 100 - activeProfile.backlogs * 25);

  const handleAnalyzeReadiness = () => {
    setIsAnalyzing(true);
    onTriggerCalculate();
    // Smooth transition into the interactive report modal
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalyzedSuccess(true);
      setShowReadinessModal(true);
    }, 450);
  };

  const actions = [
    {
      id: "calculate",
      title: "Analyze Career Readiness",
      description: "Run Random Forest ML sensitivity on current CGPA, internships & coding scores.",
      icon: Target,
      tag: isAnalyzing ? "Evaluating..." : analyzedSuccess ? "Report Ready ✓" : "Instant ML",
      accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
      btnClass: isAnalyzing
        ? "border-emerald-400 animate-pulse bg-emerald-500/20"
        : "hover:border-emerald-500/50 hover:bg-emerald-500/10",
      action: handleAnalyzeReadiness,
      actionText: isAnalyzing ? "Evaluating ML Vectors..." : "Launch Audit Report",
    },
    {
      id: "missions",
      title: "30-Day Sprint Mission",
      description: `Structured sprint roadmap & milestones customized for ${targetRole || "SDE"}.`,
      icon: Compass,
      tag: "AI Guided",
      accent: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400",
      btnClass: "hover:border-purple-500/50 hover:bg-purple-500/10",
      action: () => onNavigateTab("missions"),
      actionText: "Open 30-Day Sprint",
    },
    {
      id: "interview",
      title: "Start AI Mock Interview",
      description: "Interactive technical & STAR behavioral questions with instant AI scoring.",
      icon: Mic,
      tag: "Live Simulation",
      accent: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
      btnClass: "hover:border-cyan-500/50 hover:bg-cyan-500/10",
      action: onStartMockInterview,
      actionText: "Begin Interview",
    },
    {
      id: "resume",
      title: "Audit Resume with ATS",
      description: "Detect missing keywords, parse PDF bullet points and align with recruiter standards.",
      icon: FileText,
      tag: "ATS Scanner",
      accent: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400",
      btnClass: "hover:border-amber-500/50 hover:bg-amber-500/10",
      action: () => onNavigateTab("resume"),
      actionText: "Scan Resume",
    },
    {
      id: "projects",
      title: "Suggest Flagship Projects",
      description: "Production-grade project blueprints mapped directly to your missing skill gaps.",
      icon: Lightbulb,
      tag: "Portfolio",
      accent: "from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400",
      btnClass: "hover:border-rose-500/50 hover:bg-rose-500/10",
      action: () => onNavigateTab("projects"),
      actionText: "View Blueprints",
    },
    {
      id: "analytics",
      title: "Cohort Placement Trends",
      description: "Compare your branch and graduation year against 650+ verified campus offers.",
      icon: TrendingUp,
      tag: "Campus Data",
      accent: "from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400",
      btnClass: "hover:border-teal-500/50 hover:bg-teal-500/10",
      action: () => onNavigateTab("analytics"),
      actionText: "Explore Cohort",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/40 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>AI Action Center</span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                Command Hub
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              One-click career intelligence tools integrated with your active candidate profile
            </p>
          </div>
        </div>

        {analyzedSuccess && (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Latest Readiness: {currentChance}%</span>
          </div>
        )}
      </div>

      {/* Grid of Action Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              id={act.id === "readiness" ? "btn-action-calculate" : `btn-action-${act.id}`}
              data-testid={`btn-action-${act.id}`}
              onClick={act.action}
              className={`group flex flex-col justify-between rounded-2xl border bg-gradient-to-br ${act.accent} p-4 text-left transition-all duration-200 active:scale-[0.98] shadow-sm ${act.btnClass}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] backdrop-blur-md shadow-inner group-hover:scale-105 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {act.tag}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {act.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {act.description}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">
                <span>{act.actionText || "Launch Tool"}</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* HIGH-IMPACT MODAL: CAREER READINESS INTELLIGENCE REPORT                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showReadinessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            >
              {/* Top Horizon Accent Glow */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />

              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shadow-inner">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Career Readiness Intelligence Audit</span>
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase">
                        Verified ML
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Multi-dimensional placement sensitivity analysis for {activeProfile.targetRole}
                    </p>
                  </div>
                </div>

                <button
                  id="btn-close-readiness-modal"
                  onClick={() => setShowReadinessModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Main Gauge Banner */}
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-5 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Overall Placement Readiness
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-white">{currentChance}%</span>
                      <span className="text-xs font-semibold text-emerald-300">• {currentLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-200">
                      {activeProfile.cgpa >= 7.5 && activeProfile.backlogs === 0
                        ? "Tier-1 MNC Cutoffs Cleared"
                        : "Cutoff Notice: Maintain CGPA 7.5+ & 0 Backlogs"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5-Dimensional Readiness Vectors */}
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Multi-Dimensional Vectors</span>
                </h4>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Academics & CGPA</span>
                      <span className="text-emerald-400">{activeProfile.cgpa.toFixed(1)}/10 ({academicsScore}%)</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${academicsScore}%` }} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Coding & DSA Level</span>
                      <span className="text-cyan-400">{activeProfile.coding}/10 ({codingScore}%)</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${codingScore}%` }} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Practical Internships</span>
                      <span className="text-purple-400">{activeProfile.internships} verified ({experienceScore}%)</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${experienceScore}%` }} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">STAR Communication</span>
                      <span className="text-amber-400">{activeProfile.communication}/10 ({commScore}%)</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${commScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Strengths & Priority Roadmap */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Top Candidate Strengths</span>
                  </span>
                  <ul className="mt-2 space-y-1.5 text-slate-300 leading-relaxed">
                    <li>• CGPA {activeProfile.cgpa.toFixed(1)} clears tier-1 screening criteria</li>
                    <li>• Clean record with {activeProfile.backlogs} active backlogs</li>
                    <li>• Proven practical exposure through {activeProfile.internships} internship(s)</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <span>Targeted Next Milestones</span>
                  </span>
                  <ul className="mt-2 space-y-1.5 text-slate-300 leading-relaxed">
                    <li>• Solve 2 daily Blind 75 LeetCode Two Pointers mediums</li>
                    <li>• Deploy 1 flagship project with live Vercel/Render URL</li>
                    <li>• Rehearse STAR interview defense for technical rounds</li>
                  </ul>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
                <button
                  onClick={() => {
                    setShowReadinessModal(false);
                    onStartMockInterview();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all active:scale-95"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Start Mock Interview</span>
                </button>

                <button
                  onClick={() => {
                    setShowReadinessModal(false);
                    onNavigateTab("missions");
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all active:scale-95"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Open 30-Day Sprint Roadmap</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
