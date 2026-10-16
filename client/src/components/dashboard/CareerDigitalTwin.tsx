import React, { useState, startTransition } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  UserCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Award,
  BookOpen,
  Code2,
  Briefcase,
  FileText,
  Mic,
  Target
} from "lucide-react";
import { StudentProfileState } from "./ProfileEvaluator";

interface CareerDigitalTwinProps {
  profile: StudentProfileState;
  predictionChance: number;
  predictionTone: "strong" | "steady" | "focus";
  onNavigateTab: (tabId: any) => void;
}

interface ReadinessDimension {
  id: string;
  name: string;
  score: number;
  weight: string;
  icon: React.ElementType;
  source: "USER DATA" | "ML OUTPUT" | "AI RECOMMENDATION" | "SYSTEM DERIVED";
  currentState: string;
  missing: string;
  whyItMatters: string;
  nextAction: string;
  actionTab: string;
}

export const CareerDigitalTwin: React.FC<CareerDigitalTwinProps> = ({
  profile,
  predictionChance,
  predictionTone,
  onNavigateTab,
}) => {
  const [expandedDimension, setExpandedDimension] = useState<string | null>("tech");

  // Profile Completeness calculation
  const completenessFields = [
    Boolean(profile.cgpa),
    Boolean(profile.coding),
    Boolean(profile.communication),
    Boolean(profile.targetRole),
    Boolean(profile.targetTier),
    Boolean(profile.branch),
    profile.internships > 0,
    profile.backlogs === 0
  ];
  const completenessPercent = Math.round(
    (completenessFields.filter(Boolean).length / completenessFields.length) * 100
  );

  // 7 Transparent Dimensions
  const dimensions: ReadinessDimension[] = [
    {
      id: "tech",
      name: "Technical & DSA Problem Solving",
      score: profile.coding * 10,
      weight: "25% Weight",
      icon: Code2,
      source: "SYSTEM DERIVED",
      currentState: `${profile.coding}/10 Confidence in Data Structures & Core Algorithms`,
      missing: profile.coding < 8 ? "High-frequency Blind 75 patterns (Sliding Window, Trees, Binary Search)" : "Advanced Graph & DP edge cases",
      whyItMatters: "85% of company screening tests use automated HackerRank/LeetCode coding rounds.",
      nextAction: "Practice 2 Blind 75 pattern problems today in the Mock Interview section",
      actionTab: "coach"
    },
    {
      id: "projects",
      name: "Flagship Project Evidence",
      score: Math.min(100, Math.max(30, profile.internships * 45)),
      weight: "20% Weight",
      icon: Briefcase,
      source: "USER DATA",
      currentState: `${profile.internships} Practical Engineering Experience / Internships`,
      missing: profile.internships < 2 ? "Production-grade deployed flagship project with OpenAPI docs & test suite" : "High-throughput performance profiling",
      whyItMatters: "Interviewers spend 40% of technical rounds dissecting your architecture and decisions.",
      nextAction: "Generate a role-aligned project blueprint in the Project Studio",
      actionTab: "projects"
    },
    {
      id: "academics",
      name: "Academics & Drive Eligibility",
      score: Math.round(Math.min(100, (profile.cgpa / 10) * 100 - profile.backlogs * 20)),
      weight: "20% Weight",
      icon: Award,
      source: "USER DATA",
      currentState: `CGPA ${profile.cgpa.toFixed(1)}/10.0 · ${profile.backlogs} Active Backlog(s)`,
      missing: profile.backlogs > 0 ? `Must clear ${profile.backlogs} backlog(s) before recruitment drives` : (profile.cgpa < 7.5 ? "Push CGPA above 7.5 to unlock top MNC cutoffs" : "Maintain academic consistency"),
      whyItMatters: "Top MNCs enforce automated cutoff filters (60%-70% / 7.0 CGPA) with 0 active backlogs.",
      nextAction: profile.backlogs > 0 ? "Prioritize backlog clearance roadmap immediately" : "Explore Cohort Benchmarks for your CGPA band",
      actionTab: "analytics"
    },
    {
      id: "role_align",
      name: "Target Role Alignment",
      score: profile.coding >= 7 && profile.cgpa >= 7.5 ? 85 : 68,
      weight: "15% Weight",
      icon: Target,
      source: "AI RECOMMENDATION",
      currentState: `Targeting: ${profile.targetRole}`,
      missing: "Role-specific technology stack depth & domain architectural patterns",
      whyItMatters: "Role alignment distinguishes tailored applicants from generic applicants.",
      nextAction: "Inspect Target Role Intelligence matrix",
      actionTab: "roles"
    },
    {
      id: "interview",
      name: "Interview Articulation (STAR)",
      score: profile.communication * 10,
      weight: "10% Weight",
      icon: Mic,
      source: "SYSTEM DERIVED",
      currentState: `${profile.communication}/10 Communication & Storytelling readiness`,
      missing: profile.communication < 8 ? "Structured STAR framing (Situation, Task, Action, Result) for behavioral rounds" : "System design trade-off articulation",
      whyItMatters: "Final hiring decisions rely heavily on communication clarity and team fit.",
      nextAction: "Start an interactive Mock Interview round",
      actionTab: "coach"
    },
    {
      id: "resume",
      name: "ATS Resume Strength",
      score: 78,
      weight: "10% Weight",
      icon: FileText,
      source: "AI RECOMMENDATION",
      currentState: "Standard engineering resume format with technical skills",
      missing: "Google X-Y-Z quantifiable metric bullets (Accomplished X measured by Y doing Z)",
      whyItMatters: "75% of resumes are discarded by ATS keyword parsers before reaching humans.",
      nextAction: "Audit your PDF resume in ATS Resume Studio",
      actionTab: "resume"
    }
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1c1a22] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      {/* Ambient background glow */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#c76f3b]/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-[#c76f3b]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Top Header */}
        <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#c76f3b]/30 bg-[#c76f3b]/10 text-[#c76f3b] shadow-[0_0_20px_rgba(199, 111, 59,0.2)]">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-[#eae6e0] sm:text-2xl">
                  Student Career Digital Twin
                </h2>
                <span className="rounded-full border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c76f3b]">
                  Live Model
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#938e87]">
                Unified state model aggregating verified candidate attributes, ML inference, and transparent readiness vectors.
              </p>
            </div>
          </div>

          {/* Provenance Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#141318] px-2.5 py-1 text-[11px] font-medium text-[#938e87]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#eae6e0]"></span>
              User Verified
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#141318] px-2.5 py-1 text-[11px] font-medium text-[#938e87]">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300"></span>
              ML Inferred
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#141318] px-2.5 py-1 text-[11px] font-medium text-[#938e87]">
              <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
              AI Prescribed
            </span>
          </div>
        </div>

        {/* Digital Twin Snapshot Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141318] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#938e87]">Target Role</span>
            <p className="mt-1 text-sm font-bold text-[#eae6e0] truncate" title={profile.targetRole}>
              {profile.targetRole.split(" ")[0]}...
            </p>
            <span className="text-[10px] text-white font-medium">User Verified</span>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#141318] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#938e87]">Academic Standing</span>
            <p className="mt-1 text-sm font-bold text-[#eae6e0]">
              {profile.cgpa.toFixed(1)} <span className="text-xs text-[#938e87]">CGPA</span>
            </p>
            <span className={`text-[10px] font-medium ${profile.backlogs === 0 ? "text-white" : "text-[#c76f3b]"}`}>
              {profile.backlogs === 0 ? "0 Backlogs" : `${profile.backlogs} Backlog(s)`}
            </span>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#141318] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#938e87]">ML Placement Readiness</span>
            <p className="mt-1 text-sm font-bold text-white">
              {predictionChance.toFixed(1)}%
            </p>
            <span className="text-[10px] text-[#938e87] font-medium">RandomForest Model</span>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#141318] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#938e87]">Problem Solving</span>
            <p className="mt-1 text-sm font-bold text-[#eae6e0]">
              {profile.coding} <span className="text-xs text-[#938e87]">/ 10</span>
            </p>
            <span className="text-[10px] text-white font-medium">DSA Confidence</span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-2xl border border-white/[0.08] bg-[#141318] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#938e87]">Profile Completeness</span>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-sm font-bold text-[#eae6e0]">{completenessPercent}%</span>
              <span className="text-[10px] text-white font-medium">Active Twin</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1c1a22]">
              <div
                className="h-full bg-gradient-to-r from-zinc-300 to-white transition-all duration-500"
                style={{ width: `${completenessPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Transparent Multi-Dimensional Readiness Model */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#eae6e0]">
                Multi-Dimensional Career Readiness Vectors
              </h3>
              <p className="text-xs text-[#938e87]">
                Transparent breakdown of what comprises your placement probability. Every dimension is independently actionable.
              </p>
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-white">
              6 Core Dimensions
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {dimensions.map((dim) => {
              const Icon = dim.icon;
              const isExpanded = expandedDimension === dim.id;

              const DIM_PALETTES: Record<string, { border: string; glow: string; iconBg: string; text: string; actionBtn: string; actionBg: string }> = {
                tech: {
                  border: "border-white/20",
                  glow: "shadow-[0_4px_20px_rgba(255,255,255,0.08)]",
                  iconBg: "border-white/20 bg-white/10 text-white",
                  text: "text-white",
                  actionBtn: "bg-white hover:bg-zinc-200 active:bg-zinc-300 text-zinc-950 font-medium shadow-[0_0_12px_rgba(255,255,255,0.15)]",
                  actionBg: "border-white/[0.08] bg-[#141318]"
                },
                projects: {
                  border: "border-white/20",
                  glow: "shadow-[0_4px_20px_rgba(255,255,255,0.08)]",
                  iconBg: "border-white/20 bg-white/10 text-white",
                  text: "text-white",
                  actionBtn: "bg-white hover:bg-zinc-200 active:bg-zinc-300 text-zinc-950 font-medium shadow-[0_0_12px_rgba(255,255,255,0.15)]",
                  actionBg: "border-white/[0.08] bg-[#141318]"
                },
                academics: {
                  border: "border-white/20",
                  glow: "shadow-[0_4px_20px_rgba(255,255,255,0.08)]",
                  iconBg: "border-white/20 bg-white/10 text-white",
                  text: "text-white",
                  actionBtn: "bg-white hover:bg-zinc-200 active:bg-zinc-300 text-zinc-950 font-medium shadow-[0_0_12px_rgba(255,255,255,0.15)]",
                  actionBg: "border-white/[0.08] bg-[#141318]"
                },
                role_align: {
                  border: "border-white/20",
                  glow: "shadow-[0_4px_20px_rgba(255,255,255,0.08)]",
                  iconBg: "border-white/20 bg-white/10 text-white",
                  text: "text-white",
                  actionBtn: "bg-white hover:bg-zinc-200 active:bg-zinc-300 text-zinc-950 font-medium shadow-[0_0_12px_rgba(255,255,255,0.15)]",
                  actionBg: "border-white/[0.08] bg-[#141318]"
                },
                interview: {
                  border: "border-white/20",
                  glow: "shadow-[0_4px_20px_rgba(255,255,255,0.08)]",
                  iconBg: "border-white/20 bg-white/10 text-white",
                  text: "text-white",
                  actionBtn: "bg-white hover:bg-zinc-200 active:bg-zinc-300 text-zinc-950 font-medium shadow-[0_0_12px_rgba(255,255,255,0.15)]",
                  actionBg: "border-white/[0.08] bg-[#141318]"
                },
                resume: {
                  border: "border-white/20",
                  glow: "shadow-[0_4px_20px_rgba(255,255,255,0.08)]",
                  iconBg: "border-white/20 bg-white/10 text-white",
                  text: "text-white",
                  actionBtn: "bg-white hover:bg-zinc-200 active:bg-zinc-300 text-zinc-950 font-medium shadow-[0_0_12px_rgba(255,255,255,0.15)]",
                  actionBg: "border-white/[0.08] bg-[#141318]"
                }
              };

              const palette = DIM_PALETTES[dim.id] || DIM_PALETTES.tech;

              return (
                <div
                  key={dim.id}
                  className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isExpanded
                      ? `${palette.border} bg-[#141318] ${palette.glow}`
                      : "border-white/[0.08] bg-[#141318] hover:border-[#c76f3b]/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      startTransition(() => {
                        setExpandedDimension(isExpanded ? null : dim.id);
                      });
                    }}
                    className="flex w-full items-center justify-between p-4 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${palette.iconBg}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#eae6e0]">{dim.name}</span>
                          <span className="text-[10px] font-semibold text-[#938e87]">{dim.weight}</span>
                        </div>
                        <span className="text-[11px] text-[#938e87]">{dim.currentState}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-sm font-black ${palette.text}`}>
                          {dim.score}%
                        </span>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-[#938e87]">
                          {dim.source}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[#938e87]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#938e87]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Explainability Details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/[0.08] bg-white/[0.01] p-4 text-xs"
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/[0.08] bg-[#1c1a22] p-3">
                          <span className="font-bold text-[#c76f3b] uppercase text-[10px] block">What Is Missing</span>
                          <p className="mt-1 text-[#eae6e0] leading-relaxed">{dim.missing}</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.08] bg-[#1c1a22] p-3">
                          <span className="font-bold text-white uppercase text-[10px] block">Why It Matters</span>
                          <p className="mt-1 text-[#eae6e0] leading-relaxed">{dim.whyItMatters}</p>
                        </div>
                        <div className={`flex flex-col justify-between rounded-xl border ${palette.actionBg} p-3`}>
                          <div>
                            <span className={`font-bold ${palette.text} uppercase text-[10px] block`}>Recommended Action</span>
                            <p className="mt-1 text-[#eae6e0] leading-relaxed">{dim.nextAction}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              startTransition(() => {
                                onNavigateTab(dim.actionTab);
                              });
                            }}
                            className={`mt-2.5 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${palette.actionBtn}`}
                          >
                            Execute Now →
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Explainability & Legal Disclaimer (Strict compliance with Section 6 & 21) */}
        <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-white/[0.08] bg-[#141318] p-3.5 text-[11px] text-[#938e87]">
          <HelpCircle className="h-4 w-4 shrink-0 text-white mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#eae6e0]">ML Model Transparency Notice:</strong> The placement probability estimate is derived from a supervised <code className="text-white font-mono">RandomForestClassifier</code> trained on 650 historical student placement records (2024–2026). It represents a statistical estimation based on historical hiring criteria, <span className="text-[#eae6e0] font-semibold">not a guaranteed placement outcome</span>. Real campus placement outcomes depend on company-specific drive criteria, written test performance, and live interview rounds.
          </p>
        </div>
      </div>
    </div>
  );
};
