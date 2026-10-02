import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Target,
  Bot,
  Compass,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Briefcase
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";

export interface BranchData {
  code: string;
  name: string;
  description: string;
  coreHiringDomains: string[];
  topRecruiters: string[];
  transitionRoadmap: string;
  keyCutoffs: {
    tier1EligibleCgpa: number;
    maxBacklogsAllowed: number;
    minCodingConfidence: number;
  };
  totalStudents: number;
  placedCount: number;
  placementRate: number;
  avgCgpa: number;
  avgCodingScore: number;
  avgCommunicationScore: number;
  avgInternships: number;
  highestPackage?: number;
  avgPackage?: number;
  topSkills: Array<{ skill: string; total: number; placement_rate: number }>;
}

interface BranchIntelligenceProps {
  apiBase: string;
  selectedYear: number;
  currentBranch: string;
  onAskCoach: (query: string) => void;
  onNavigateTab: (tabId: any) => void;
}

const BRANCH_COLORS: Record<string, string> = {
  CSE: "#10b981",
  AIML: "#3b82f6",
  CSD: "#a855f7",
  CSM: "#6366f1",
  IT: "#06b6d4",
  ECE: "#8b5cf6",
  EEE: "#eab308",
  MECH: "#f59e0b",
  CIVIL: "#ec4899",
};

export const BranchIntelligence: React.FC<BranchIntelligenceProps> = ({
  apiBase,
  selectedYear,
  currentBranch,
  onAskCoach,
  onNavigateTab,
}) => {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [activeCode, setActiveCode] = useState<string>(currentBranch || "CSE");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      setIsLoading(true);
      try {
        const resp = await fetch(`${apiBase}/api/data/branches?year=${selectedYear}`);
        if (resp.ok) {
          const data = await resp.json();
          if (isMounted && data.branches && data.branches.length > 0) {
            setBranches(data.branches);
          }
        }
      } catch (err) {
        console.warn("Branch intelligence API warning:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, [apiBase, selectedYear]);

  const activeBranch = branches.find((b) => b.code === activeCode) || branches[0];

  // Chart data for comparing all branches
  const comparisonData = branches.map((b) => ({
    code: b.code,
    name: b.name,
    rate: b.placementRate,
    avgCgpa: b.avgCgpa,
    students: b.totalStudents,
  }));

  return (
    <div className="space-y-8">
      {/* Top Banner & Branch Pills */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/[0.06] blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Course & Branch Intelligence</h2>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Single Data Layer • 2026 Cohort
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authoritative department placement benchmarks, IT pivot roadmaps, and recruiter criteria
              </p>
            </div>
          </div>

          {/* Quick ask button */}
          <button
            onClick={() => onAskCoach(`What are the placement cutoffs, top companies, and roadmaps for ${activeCode} students?`)}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-95 shadow-sm"
          >
            <Bot className="h-4 w-4" />
            <span>Consult Coach on {activeCode}</span>
          </button>
        </div>

        {/* Branch Selector Tabs */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          {branches.map((b) => {
            const isSelected = b.code === activeCode;
            const color = BRANCH_COLORS[b.code] || "#10b981";
            return (
              <button
                key={b.code}
                onClick={() => setActiveCode(b.code)}
                className={`group relative flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/15 text-white shadow-[0_0_16px_rgba(16,185,129,0.25)]"
                    : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-bold">{b.code}</span>
                <span className="hidden sm:inline text-[11px] text-slate-400">({b.name.split(" ")[0]})</span>
                <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                  {b.placementRate}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeBranch && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Branch Specific Metrics & Deep-Dive */}
          <div className="space-y-6 lg:col-span-2">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-slate-400">Placement Rate</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white">{activeBranch.placementRate}%</span>
                  <span className="text-[10px] font-medium text-emerald-400">cleared</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: `${activeBranch.placementRate}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-slate-400">Avg CGPA Benchmark</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-cyan-300">{activeBranch.avgCgpa}</span>
                  <span className="text-[10px] text-slate-400">/ 10.0</span>
                </div>
                <span className="mt-2 block text-[10px] text-slate-400">Target: {activeBranch.keyCutoffs?.tier1EligibleCgpa || 7.5}+ for Tier-1</span>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-slate-400">Avg Coding Score</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-purple-300">{activeBranch.avgCodingScore}</span>
                  <span className="text-[10px] text-slate-400">/ 10</span>
                </div>
                <span className="mt-2 block text-[10px] text-slate-400">Tested in screening rounds</span>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-slate-400">Peak Package</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-300">
                    {activeBranch.highestPackage ? `${activeBranch.highestPackage} LPA` : "—"}
                  </span>
                </div>
                <span className="mt-2 block text-[10px] text-emerald-400">Top recruiter offer</span>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-slate-400">Students Evaluated</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-300">{activeBranch.totalStudents}</span>
                  <span className="text-[10px] text-slate-400">records</span>
                </div>
                <span className="mt-2 block text-[10px] text-emerald-400">{activeBranch.placedCount} placed offers</span>
              </div>
            </div>

            {/* Department Strategy & Transition Bridge */}
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Department Transition & Roadmap Bridge</h3>
                    <p className="text-[11px] text-slate-400">{activeBranch.name}</p>
                  </div>
                </div>
                <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                  Proven Strategy
                </span>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-slate-300">
                {activeBranch.transitionRoadmap}
              </p>

              {/* Core Hiring Domains */}
              <div className="mt-5">
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Top Hiring Domains for {activeBranch.code}
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeBranch.coreHiringDomains.map((domain) => (
                    <span
                      key={domain}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-200"
                    >
                      <Briefcase className="h-3 w-3 text-emerald-400" />
                      {domain}
                    </span>
                  ))}
                </div>
              </div>

              {/* Top Recruiting Companies */}
              <div className="mt-5">
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Frequent Campus Recruiters
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeBranch.topRecruiters.map((recruiter) => (
                    <span
                      key={recruiter}
                      className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-xs font-semibold text-cyan-300"
                    >
                      <Building className="h-3 w-3 text-cyan-400" />
                      {recruiter}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Department Comparison Chart */}
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Cross-Branch Placement Comparison</h3>
                </div>
                <span className="text-xs text-slate-400">All 5 Engineering Streams</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                    <XAxis dataKey="code" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-xl backdrop-blur-xl text-xs">
                              <span className="font-bold text-white">{item.name}</span>
                              <div className="mt-1 space-y-0.5 text-slate-300">
                                <div>Placement Rate: <strong className="text-emerald-400">{item.rate}%</strong></div>
                                <div>Avg CGPA: <strong className="text-cyan-300">{item.avgCgpa}</strong></div>
                                <div>Candidates: <strong className="text-amber-300">{item.students}</strong></div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                      {comparisonData.map((entry) => (
                        <Cell
                          key={entry.code}
                          fill={entry.code === activeCode ? "#10b981" : "#334155"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Key Cutoffs & Top Skills */}
          <div className="space-y-6">
            {/* Cutoff Requirements Card */}
            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Tier-1 Screening Rules</h3>
              </div>

              <div className="mt-4 space-y-3.5">
                <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                  <span className="text-xs text-slate-400">Min CGPA for Tier-1</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {activeBranch.keyCutoffs?.tier1EligibleCgpa || 7.5} / 10.0
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                  <span className="text-xs text-slate-400">Max Backlogs Allowed</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {activeBranch.keyCutoffs?.maxBacklogsAllowed ?? 0} (Strict zero)
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                  <span className="text-xs text-slate-400">Coding Test Benchmark</span>
                  <span className="text-xs font-bold text-cyan-300">
                    {activeBranch.keyCutoffs?.minCodingConfidence || 7} / 10
                  </span>
                </div>
              </div>
            </div>

            {/* In-Demand Skills for this branch */}
            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Highest Yield Skills</h3>
                </div>
                <span className="text-[10px] text-slate-400">For {activeBranch.code}</span>
              </div>

              <div className="mt-4 space-y-3">
                {activeBranch.topSkills?.map((s) => (
                  <div key={s.skill} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{s.skill}</span>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        {s.placement_rate}% placed
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${s.placement_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onNavigateTab("skills")}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-white/[0.08] hover:text-white"
              >
                <span>View Complete Skill Matrix</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
