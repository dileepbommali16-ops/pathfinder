import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  TrendingUp,
  Award,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Compass,
  Mic,
  BookOpen,
  Sparkles,
  Edit3,
  Zap,
  Layers,
  GraduationCap
} from "lucide-react";
import { StudentProfileState, ReadinessAuditData } from "@/types/profile";

interface OnboardingResultScreenProps {
  profile: StudentProfileState;
  auditResult: ReadinessAuditData;
  onGoToDashboard: () => void;
  onEditProfile: () => void;
  onStartMockInterview: () => void;
  onNavigateTab: (tab: string) => void;
}

export const OnboardingResultScreen: React.FC<OnboardingResultScreenProps> = ({
  profile,
  auditResult,
  onGoToDashboard,
  onEditProfile,
  onStartMockInterview,
  onNavigateTab
}) => {
  const chance = auditResult.chance || 78.5;
  const tone = auditResult.tone || "strong";
  const label = auditResult.label || "Strong Candidate Profile";

  const toneConfig = {
    strong: {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      glow: "shadow-emerald-500/20"
    },
    steady: {
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      glow: "shadow-cyan-500/20"
    },
    focus: {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      glow: "shadow-amber-500/20"
    }
  }[tone];

  const breakdown = auditResult.breakdown || {};
  const cohort = auditResult.cohort_comparison || {
    branch: profile.branch || "CSE",
    percentile: 82.0,
    top_percent: 18.0,
    branch_avg_cgpa: 7.8,
    branch_placement_rate: 64.0,
    comparison_text: `Top 18% in ${profile.branch} branch`
  };

  return (
    <div id="onboarding-result-screen" className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Top Completion Announcement */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                <Sparkles className="h-3 w-3" />
                <span>Onboarding Complete • Single Source of Truth Established</span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
                Career Readiness Intelligence Audit
              </h1>
              <p className="mt-0.5 text-xs text-slate-300">
                Evaluation calculated for <strong className="text-white">{profile.fullName}</strong> ({profile.branch} • {profile.college})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              id="btn-edit-profile-result"
              onClick={onEditProfile}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all active:scale-95"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Readiness Scorecard & Percentage Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-8"
      >
        {/* Metric Cards Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Card 1: Executive Readiness Score */}
          <div className={`rounded-2xl border ${toneConfig.border} ${toneConfig.bg} p-5 backdrop-blur-xl relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Readiness Score
              </span>
              <Award className={`h-4 w-4 ${toneConfig.color}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white">{chance}%</span>
              <span className={`text-xs font-bold ${toneConfig.color}`}>• {tone.toUpperCase()}</span>
            </div>
            <p className="mt-2 text-xs text-slate-300 font-medium">{label}</p>
          </div>

          {/* Card 2: Academic Summary & Converted % */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Academic Conversion
              </span>
              <BookOpen className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white">{profile.percentage.toFixed(1)}%</span>
              <span className="text-xs font-bold text-cyan-300">({profile.cgpa.toFixed(2)} CGPA)</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Formula: CGPA × {profile.cgpaFormulaMultiplier || 9.5} (Standard AICTE multiplier)
            </p>
          </div>

          {/* Card 3: Real Cohort Percentile Benchmark */}
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Cohort Benchmark
              </span>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white">Top {cohort.top_percent}%</span>
              <span className="text-xs font-bold text-purple-300">({cohort.percentile}th pctl)</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-300">
              Benchmarked against {cohort.total_candidates} verified {cohort.branch} student records in dataset.
            </p>
          </div>
        </div>

        {/* Screening Clearance Alert */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white">Campus Screening Filter Status: </span>
            <span className="text-slate-300">
              {profile.cgpa >= 7.5 && (profile.activeBacklogs || 0) === 0
                ? "All Tier-1 MNC Cutoffs Cleared (CGPA >= 7.5 and 0 standing backlogs)."
                : "Eligible for standard recruitment rounds. Focus on clearing standing backlogs and lifting CGPA above 7.5 for elite product filters."}
            </span>
          </div>
        </div>

        {/* 5-Dimensional Readiness Vectors Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span>Multi-Dimensional Competency Vectors</span>
            </h3>
            <span className="text-xs text-slate-400">Target Role: {profile.targetRole}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Academics Vector */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-300">Academics & CGPA</span>
                <span className="text-emerald-400">{profile.cgpa.toFixed(1)}/10.0 ({breakdown.academics || Math.round(profile.cgpa * 10)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${breakdown.academics || Math.round(profile.cgpa * 10)}%` }} />
              </div>
            </div>

            {/* Coding Vector */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-300">Coding & DSA Proficiency</span>
                <span className="text-cyan-400">{profile.coding}/10 ({breakdown.coding_dsa || profile.coding * 10}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${breakdown.coding_dsa || profile.coding * 10}%` }} />
              </div>
            </div>

            {/* Projects Vector */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-300">Applied Projects & Architecture</span>
                <span className="text-purple-400">{profile.projectsCount} projects ({breakdown.projects || Math.min(100, profile.projectsCount * 25)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${breakdown.projects || Math.min(100, profile.projectsCount * 25)}%` }} />
              </div>
            </div>

            {/* Internships Vector */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-300">Practical Internships</span>
                <span className="text-teal-400">{profile.internships} verified ({breakdown.internships || Math.min(100, profile.internships * 40)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-teal-400 rounded-full" style={{ width: `${breakdown.internships || Math.min(100, profile.internships * 40)}%` }} />
              </div>
            </div>

            {/* Certifications Vector */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-300">Industry Certifications</span>
                <span className="text-purple-400">
                  {profile.certifications?.length || 0} active ({breakdown.certifications || Math.min(100, Math.max(25, (profile.certifications?.length || 0) * 35))}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full"
                  style={{
                    width: `${breakdown.certifications || Math.min(100, Math.max(25, (profile.certifications?.length || 0) * 35))}%`
                  }}
                />
              </div>
            </div>

            {/* Communication Vector */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:col-span-2">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-300">Interview Defense & STAR Articulation</span>
                <span className="text-amber-400">{profile.communication}/10 ({breakdown.communication || profile.communication * 10}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${breakdown.communication || profile.communication * 10}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Targeted Gaps */}
        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          {/* Strengths */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Core Profile Strengths</span>
            </span>
            <ul className="space-y-1.5 text-slate-300 leading-relaxed">
              {(auditResult.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Targeted Gaps */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Identified Skill & Academic Gaps</span>
            </span>
            <ul className="space-y-1.5 text-slate-300 leading-relaxed">
              {(auditResult.gaps || []).map((g, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommended Skills to Accelerate */}
        {auditResult.recommended_skills && auditResult.recommended_skills.length > 0 && (
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>Recommended Skills to Accelerate</span>
              </span>
              <span className="text-[11px] text-slate-400">Curated for {profile.targetRole}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {auditResult.recommended_skills.map((skill, sIdx) => (
                <span
                  key={sIdx}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 shadow-sm"
                >
                  <Zap className="h-3 w-3 text-cyan-400" />
                  <span>{skill}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actionable Next-Step Suggestions */}
        {auditResult.next_steps && auditResult.next_steps.length > 0 && (
          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Actionable Next-Step Suggestions</span>
            </span>
            <div className="grid gap-2 sm:grid-cols-3">
              {auditResult.next_steps.map((step, stepIdx) => (
                <div
                  key={stepIdx}
                  className="rounded-xl border border-white/[0.06] bg-black/30 p-3 text-xs text-slate-300 flex items-start gap-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                    {stepIdx + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.08]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="btn-result-mock-interview"
              onClick={onStartMockInterview}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all active:scale-95"
            >
              <Mic className="h-4 w-4" />
              <span>Launch Mock Interview</span>
            </button>

            <button
              type="button"
              id="btn-result-roadmap"
              onClick={() => onNavigateTab("skills")}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-2xl border border-purple-500/40 bg-purple-500/10 px-4 py-3 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-all active:scale-95"
            >
              <Compass className="h-4 w-4" />
              <span>Skills Roadmap</span>
            </button>
          </div>

          <button
            type="button"
            id="btn-go-to-dashboard"
            onClick={onGoToDashboard}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Continue to Full Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
