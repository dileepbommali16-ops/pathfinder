import React from "react";
import {
  Sliders,
  RotateCcw,
  Zap,
  Target,
  Building,
  GraduationCap,
  Sparkles,
  BookOpen,
  Briefcase,
  Code,
  MessageSquare
} from "lucide-react";

import { StudentProfileState } from "@/types/profile";
export type { StudentProfileState };

interface ProfileEvaluatorProps {
  profile: StudentProfileState;
  onChange: (updated: Partial<StudentProfileState>) => void;
  onCalculate: () => void;
  onReset: () => void;
  isCalculating: boolean;
}

const ROLES = [
  "Software Development Engineer (SDE)",
  "Data Scientist / ML Engineer",
  "Cloud & DevOps Engineer",
  "QA & Automation Engineer",
  "Full-Stack Web Developer",
  "Product / Systems Analyst",
];

const TIERS = [
  "Product Companies / Tier-1 MNCs",
  "High-Growth Startups (Series A-C)",
  "Global Capability Centers (GCC)",
  "Service Companies / Mass Recruiters",
  "FAANG / Top Tier Tech Giants",
];

const BRANCHES = ["CSE", "AIML", "IT", "ECE", "EEE", "CSD", "Mechanical", "Civil", "Other"];

export const ProfileEvaluator: React.FC<ProfileEvaluatorProps> = ({
  profile,
  onChange,
  onCalculate,
  onReset,
  isCalculating,
}) => {
  const applyPreset = (preset: "tier1" | "average" | "starter") => {
    if (preset === "tier1") {
      onChange({
        cgpa: 8.8,
        backlogs: 0,
        internships: 2,
        coding: 9,
        communication: 8,
        targetRole: "Software Development Engineer (SDE)",
        targetTier: "FAANG / Top Tier Tech Giants"
      });
    } else if (preset === "average") {
      onChange({
        cgpa: 7.4,
        backlogs: 0,
        internships: 1,
        coding: 6,
        communication: 7,
        targetRole: "Full-Stack Web Developer",
        targetTier: "Product Companies / Tier-1 MNCs"
      });
    } else {
      onChange({
        cgpa: 6.5,
        backlogs: 1,
        internships: 0,
        coding: 5,
        communication: 6,
        targetRole: "QA & Automation Engineer",
        targetTier: "Service Companies / Mass Recruiters"
      });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#161926] bg-[#11131c] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
      {/* Subtle background ambient mesh */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#ffffff]/[0.05] blur-3xl" />

      {/* Header & Preset Shortcuts */}
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ffffff]/10 text-[#ffffff] border border-[#ffffff]/20">
              <Sliders className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#f8fafc]">Evaluation Parameters</h2>
          </div>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Fine-tune your academic and skill inputs to test placement chance sensitivity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-[#94a3b8]">Quick Presets:</span>
          <button
            onClick={() => applyPreset("tier1")}
            className="rounded-lg border border-[#ffffff]/30 bg-[#ffffff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ffffff] shadow-[0_0_10px_rgba(255, 255, 255,0.15)] hover:bg-[#ffffff]/20 transition-all active:scale-95"
          >
            Tier-1 Profile
          </button>
          <button
            onClick={() => applyPreset("average")}
            className="rounded-lg border border-[#161926] bg-[#0a0b10] px-2.5 py-1 text-[11px] font-semibold text-[#f8fafc] hover:border-[#ffffff]/40 transition-all active:scale-95"
          >
            Solid Benchmark
          </button>
          <button
            onClick={() => applyPreset("starter")}
            className="rounded-lg border border-[#9f1239]/30 bg-[#9f1239]/10 px-2.5 py-1 text-[11px] font-semibold text-[#9f1239] shadow-[0_0_10px_rgba(159, 18, 57,0.15)] hover:bg-[#9f1239]/20 transition-all active:scale-95"
          >
            Needs Support
          </button>
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-6 md:grid-cols-2">
        {/* Left Column: Sliders */}
        <div className="space-y-5 rounded-2xl border border-[#161926] bg-[#0a0b10] p-5 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#ffffff]">
            1. Core Academic & Technical Sliders
          </span>

          {/* CGPA Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#f8fafc]">Cumulative CGPA</span>
              <span className="rounded bg-[#161926] px-2 py-0.5 font-bold text-[#ffffff]">
                {profile.cgpa.toFixed(1)} / 10.0
              </span>
            </div>
            <input
              type="range"
              min="4.0"
              max="10.0"
              step="0.1"
              value={profile.cgpa}
              onChange={(e) => onChange({ cgpa: parseFloat(e.target.value) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#161926] accent-[#ffffff]"
            />
            <div className="flex justify-between text-[10px] text-[#94a3b8]">
              <span>4.0 (Minimum)</span>
              <span>7.0 (MNC Cutoff)</span>
              <span>10.0 (Distinction)</span>
            </div>
          </div>

          {/* Active Backlogs */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#f8fafc]">Active Academic Backlogs</span>
              <span className={`rounded px-2 py-0.5 font-bold ${profile.backlogs === 0 ? "bg-[#161926] text-[#f8fafc]" : "bg-[#9f1239]/20 text-[#9f1239]"}`}>
                {profile.backlogs} {profile.backlogs === 1 ? "Backlog" : "Backlogs"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              step="1"
              value={profile.backlogs}
              onChange={(e) => onChange({ backlogs: parseInt(e.target.value, 10) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#161926] accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-[#94a3b8]">
              <span>0 (Clean Eligibility)</span>
              <span>3</span>
              <span>6+</span>
            </div>
          </div>

          {/* Internships Completed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#f8fafc]">Internships Completed</span>
              <span className="rounded bg-[#161926] px-2 py-0.5 font-bold text-[#ffffff]">
                {profile.internships} {profile.internships === 1 ? "Internship" : "Internships"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={profile.internships}
              onChange={(e) => onChange({ internships: parseInt(e.target.value, 10) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#161926] accent-[#ffffff]"
            />
            <div className="flex justify-between text-[10px] text-[#94a3b8]">
              <span>0 (Academic Only)</span>
              <span>2 (Solid)</span>
              <span>4+ (Extensive)</span>
            </div>
          </div>

          {/* Coding & DSA Confidence */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#f8fafc]">DSA & Problem Solving Confidence</span>
              <span className="rounded bg-[#161926] px-2 py-0.5 font-bold text-[#ffffff]">
                {profile.coding} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={profile.coding}
              onChange={(e) => onChange({ coding: parseInt(e.target.value, 10) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#161926] accent-[#ffffff]"
            />
            <div className="flex justify-between text-[10px] text-[#94a3b8]">
              <span>1 (Beginner)</span>
              <span>6 (Blind 75)</span>
              <span>10 (Competitive)</span>
            </div>
          </div>

          {/* Communication Confidence */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#f8fafc]">Technical Communication Confidence</span>
              <span className="rounded bg-[#161926] px-2 py-0.5 font-bold text-[#ffffff]">
                {profile.communication} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={profile.communication}
              onChange={(e) => onChange({ communication: parseInt(e.target.value, 10) })}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#161926] accent-[#ffffff]"
            />
            <div className="flex justify-between text-[10px] text-[#94a3b8]">
              <span>1 (Shy)</span>
              <span>7 (STAR Fluent)</span>
              <span>10 (Articulate)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Career Target & Dropdowns */}
        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-[#161926] bg-[#0a0b10] p-5 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ffffff]">
              2. Career Aspirations & Cohort Mapping
            </span>

            {/* Target Role */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#f8fafc]">
                <Target className="h-3.5 w-3.5 text-[#ffffff]" />
                <span>Primary Target Role</span>
              </label>
              <select
                value={profile.targetRole}
                onChange={(e) => onChange({ targetRole: e.target.value })}
                className="w-full rounded-xl border border-[#161926] bg-[#11131c] px-3.5 py-2.5 text-xs font-medium text-[#f8fafc] outline-none transition-all focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]/20"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Company Tier */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#f8fafc]">
                <Building className="h-3.5 w-3.5 text-[#ffffff]" />
                <span>Target Company Tier</span>
              </label>
              <select
                value={profile.targetTier}
                onChange={(e) => onChange({ targetTier: e.target.value })}
                className="w-full rounded-xl border border-[#161926] bg-[#11131c] px-3.5 py-2.5 text-xs font-medium text-[#f8fafc] outline-none transition-all focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]/20"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Branch & Cohort Year */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#f8fafc]">
                  <GraduationCap className="h-3.5 w-3.5 text-[#ffffff]" />
                  <span>Branch / Stream</span>
                </label>
                <select
                  value={profile.branch}
                  onChange={(e) => onChange({ branch: e.target.value })}
                  className="w-full rounded-xl border border-[#161926] bg-[#11131c] px-3 py-2.5 text-xs font-medium text-[#f8fafc] outline-none focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]/20"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#f8fafc]">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  <span>Graduation Year</span>
                </label>
                <select
                  value={profile.graduationYear}
                  onChange={(e) => onChange({ graduationYear: parseInt(e.target.value, 10) })}
                  className="w-full rounded-xl border border-[#161926] bg-[#11131c] px-3 py-2.5 text-xs font-medium text-[#f8fafc] outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20"
                >
                  {[2028, 2027, 2026, 2025, 2024].map((y) => (
                    <option key={y} value={y}>
                      Class of {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-4">
            <button
              onClick={onCalculate}
              disabled={isCalculating}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ffffff] px-5 py-3 text-xs font-bold text-white shadow-[0_0_25px_rgba(255, 255, 255,0.3)] transition-all hover:bg-[#ffffff] active:scale-95 disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              <span>{isCalculating ? "Evaluating with ML..." : "⚡ Calculate Placement Probability"}</span>
            </button>

            <button
              onClick={onReset}
              title="Reset parameters to defaults"
              className="flex items-center justify-center rounded-xl border border-[#161926] bg-[#11131c] px-3.5 py-3 text-[#94a3b8] hover:text-[#f8fafc] hover:border-white/20 transition-all active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
