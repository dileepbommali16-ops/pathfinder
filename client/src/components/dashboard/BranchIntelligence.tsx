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
import { FALLBACK_BRANCHES } from "@/lib/fallbackData";

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
  CSE: "#FF6B4A",
  AIML: "#FF8A6E",
  CSD: "#E4E4E7",
  CSM: "#D4D4D8",
  IT: "#C2452B",
  ECE: "#A1A1AA",
  EEE: "#FF6B4A",
  MECH: "#71717A",
  CIVIL: "#FF8A6E",
};

export const BranchIntelligence: React.FC<BranchIntelligenceProps> = ({
  apiBase,
  selectedYear,
  currentBranch,
  onAskCoach,
  onNavigateTab,
}) => {
  const [branches, setBranches] = useState<BranchData[]>(FALLBACK_BRANCHES as unknown as BranchData[]);
  const [activeCode, setActiveCode] = useState<string>(currentBranch || "CSE");
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      <div className="relative overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#FF6B4A]/[0.08] blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B4A]/10 text-[#FF6B4A] border border-[#FF6B4A]/30 shadow-inner">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-[#F2F2F3]">Course & Branch Intelligence</h2>
                <span className="rounded-md border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF6B4A]">
                  Single Data Layer • 2026 Cohort
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Authoritative department placement benchmarks, IT pivot roadmaps, and recruiter criteria
              </p>
            </div>
          </div>

          {/* Quick ask button */}
          <button
            onClick={() => onAskCoach(`What are the placement cutoffs, top companies, and roadmaps for ${activeCode} students?`)}
            className="flex items-center gap-2 rounded-xl border border-[#FF6B4A]/40 bg-[#FF6B4A]/10 px-4 py-2 text-xs font-semibold text-[#FF6B4A] transition-all hover:bg-[#FF6B4A]/20 active:scale-95 shadow-sm cursor-pointer"
          >
            <Bot className="h-4 w-4" />
            <span>Consult Coach on {activeCode}</span>
          </button>
        </div>

        {/* Branch Selector Tabs */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          {branches.map((b) => {
            const isSelected = b.code === activeCode;
            const color = BRANCH_COLORS[b.code] || "#FF6B4A";
            return (
              <button
                key={b.code}
                onClick={() => setActiveCode(b.code)}
                className={`group relative flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#FF6B4A]/50 bg-[#FF6B4A]/20 text-white shadow-[0_0_16px_rgba(255,107,74,0.25)]"
                    : "border-[#2A2A30] bg-[#141417] text-[#A1A1AA] hover:border-[#FF6B4A]/30 hover:text-[#F2F2F3]"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-bold">{b.code}</span>
                <span className="hidden sm:inline text-[11px] text-[#A1A1AA]">({b.name.split(" ")[0]})</span>
                <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-[#FF8A6E]">
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
              <div className="rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-[#A1A1AA]">Placement Rate</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[#F2F2F3]">{activeBranch.placementRate}%</span>
                  <span className="text-[10px] font-medium text-[#FF6B4A]">cleared</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#141417]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C2452B] to-[#FF6B4A]"
                    style={{ width: `${activeBranch.placementRate}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-[#A1A1AA]">Avg CGPA Benchmark</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[#F2F2F3]">{activeBranch.avgCgpa}</span>
                  <span className="text-[10px] text-[#A1A1AA]">/ 10.0</span>
                </div>
                <span className="mt-2 block text-[10px] text-[#A1A1AA]">Target: {activeBranch.keyCutoffs?.tier1EligibleCgpa || 7.5}+ for Tier-1</span>
              </div>

              <div className="rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-[#A1A1AA]">Avg Coding Score</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[#FF8A6E]">{activeBranch.avgCodingScore}</span>
                  <span className="text-[10px] text-[#A1A1AA]">/ 10</span>
                </div>
                <span className="mt-2 block text-[10px] text-[#A1A1AA]">Tested in screening rounds</span>
              </div>

              <div className="rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-[#A1A1AA]">Peak Package</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[#FF6B4A]">
                    {activeBranch.highestPackage ? `${activeBranch.highestPackage} LPA` : "—"}
                  </span>
                </div>
                <span className="mt-2 block text-[10px] text-[#A1A1AA]">Top recruiter offer</span>
              </div>

              <div className="rounded-2xl border border-[#2A2A30] bg-[#1B1B1F] p-4 backdrop-blur-xl">
                <span className="text-[11px] font-medium text-[#A1A1AA]">Students Evaluated</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[#F2F2F3]">{activeBranch.totalStudents}</span>
                  <span className="text-[10px] text-[#A1A1AA]">records</span>
                </div>
                <span className="mt-2 block text-[10px] text-[#FF8A6E]">{activeBranch.placedCount} placed offers</span>
              </div>
            </div>

            {/* Department Strategy & Transition Bridge */}
            <div className="relative overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-[#2A2A30] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6B4A]/10 text-[#FF6B4A] border border-[#FF6B4A]/20">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F2F2F3]">Department Transition & Roadmap Bridge</h3>
                    <p className="text-[11px] text-[#A1A1AA]">{activeBranch.name}</p>
                  </div>
                </div>
                <span className="rounded-md border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF6B4A]">
                  Proven Strategy
                </span>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-[#A1A1AA]">
                {activeBranch.transitionRoadmap}
              </p>

              {/* Core Hiring Domains */}
              <div className="mt-5">
                <span className="text-[11px] font-semibold tracking-wider text-[#A1A1AA] uppercase">
                  Top Hiring Domains for {activeBranch.code}
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeBranch.coreHiringDomains.map((domain) => (
                    <span
                      key={domain}
                      className="flex items-center gap-1.5 rounded-lg border border-[#2A2A30] bg-[#141417] px-2.5 py-1 text-xs font-medium text-[#F2F2F3]"
                    >
                      <Briefcase className="h-3 w-3 text-[#FF6B4A]" />
                      {domain}
                    </span>
                  ))}
                </div>
              </div>

              {/* Top Recruiting Companies */}
              <div className="mt-5">
                <span className="text-[11px] font-semibold tracking-wider text-[#A1A1AA] uppercase">
                  Frequent Campus Recruiters
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeBranch.topRecruiters.map((recruiter) => (
                    <span
                      key={recruiter}
                      className="flex items-center gap-1.5 rounded-lg border border-[#FF6B4A]/20 bg-[#FF6B4A]/5 px-2.5 py-1 text-xs font-semibold text-[#FF8A6E]"
                    >
                      <Building className="h-3 w-3 text-[#FF6B4A]" />
                      {recruiter}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Department Comparison Chart */}
            <div className="relative overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#FF6B4A]" />
                  <h3 className="text-sm font-bold text-[#F2F2F3]">Cross-Branch Placement Comparison</h3>
                </div>
                <span className="text-xs text-[#A1A1AA]">All 5 Engineering Streams</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" opacity={0.5} vertical={false} />
                    <XAxis dataKey="code" stroke="#A1A1AA" tick={{ fontSize: 11, fill: "#A1A1AA" }} />
                    <YAxis stroke="#A1A1AA" domain={[0, 100]} tick={{ fontSize: 11, fill: "#A1A1AA" }} unit="%" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-[#2A2A30] bg-[#1B1B1F] p-3 shadow-xl backdrop-blur-xl text-xs text-[#F2F2F3]">
                              <span className="font-bold text-[#F2F2F3]">{item.name}</span>
                              <div className="mt-1 space-y-0.5 text-[#A1A1AA]">
                                <div>Placement Rate: <strong className="text-[#FF6B4A]">{item.rate}%</strong></div>
                                <div>Avg CGPA: <strong className="text-[#FF8A6E]">{item.avgCgpa}</strong></div>
                                <div>Candidates: <strong className="text-[#F2F2F3]">{item.students}</strong></div>
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
                          fill={entry.code === activeCode ? "#FF6B4A" : "#2A2A30"}
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
            <div className="rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-[#2A2A30]">
                <ShieldCheck className="h-5 w-5 text-[#FF6B4A]" />
                <h3 className="text-sm font-bold text-[#F2F2F3]">Tier-1 Screening Rules</h3>
              </div>

              <div className="mt-4 space-y-3.5">
                <div className="flex items-center justify-between rounded-xl bg-[#141417] border border-[#2A2A30] p-3">
                  <span className="text-xs text-[#A1A1AA]">Min CGPA for Tier-1</span>
                  <span className="text-xs font-bold text-[#FF6B4A]">
                    {activeBranch.keyCutoffs?.tier1EligibleCgpa || 7.5} / 10.0
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#141417] border border-[#2A2A30] p-3">
                  <span className="text-xs text-[#A1A1AA]">Max Backlogs Allowed</span>
                  <span className="text-xs font-bold text-[#F2F2F3]">
                    {activeBranch.keyCutoffs?.maxBacklogsAllowed ?? 0} (Strict zero)
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#141417] border border-[#2A2A30] p-3">
                  <span className="text-xs text-[#A1A1AA]">Coding Test Benchmark</span>
                  <span className="text-xs font-bold text-[#FF8A6E]">
                    {activeBranch.keyCutoffs?.minCodingConfidence || 7} / 10
                  </span>
                </div>
              </div>
            </div>

            {/* In-Demand Skills for this branch */}
            <div className="rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#2A2A30]">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#FF6B4A]" />
                  <h3 className="text-sm font-bold text-[#F2F2F3]">Highest Yield Skills</h3>
                </div>
                <span className="text-[10px] text-[#A1A1AA]">For {activeBranch.code}</span>
              </div>

              <div className="mt-4 space-y-3">
                {activeBranch.topSkills?.map((s) => (
                  <div key={s.skill} className="rounded-xl border border-[#2A2A30] bg-[#141417] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F2F2F3]">{s.skill}</span>
                      <span className="rounded bg-[#FF6B4A]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF6B4A]">
                        {s.placement_rate}% placed
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1B1B1F]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C2452B] to-[#FF6B4A]"
                        style={{ width: `${s.placement_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onNavigateTab("skills")}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl border border-[#2A2A30] bg-[#141417] py-2.5 text-xs font-semibold text-[#A1A1AA] transition-all hover:bg-white/[0.08] hover:text-[#F2F2F3]"
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
