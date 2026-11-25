import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
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

export const BranchIntelligence: React.FC<BranchIntelligenceProps> = ({
  apiBase,
  selectedYear,
  currentBranch,
  onAskCoach,
  onNavigateTab,
}) => {
  const [branches, setBranches] = useState<BranchData[]>(
    FALLBACK_BRANCHES as unknown as BranchData[]
  );
  const [activeCode, setActiveCode] = useState<string>(currentBranch || "CSE");

  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
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
      }
    };
    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, [apiBase, selectedYear]);

  const activeBranch = branches.find((b) => b.code === activeCode) || branches[0];

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
      <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px] sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-5 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#FAFAFA] sm:text-2xl">
                Branch Intelligence &amp; Course Trends
              </h2>
              <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
                {selectedYear} Cohort · {branches.length} Departments
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#A1A1AA] sm:text-sm">
              Authoritative department placement benchmarks, IT pivot roadmaps, and recruiter criteria
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onAskCoach(
                `What are the placement cutoffs, top companies, and roadmaps for ${activeCode} students?`
              )
            }
            className="inline-flex h-9 items-center rounded-lg border border-[#27272A] bg-[#101014] px-4 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#18181B] cursor-pointer"
          >
            Ask DAS on {activeCode}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {branches.map((b) => {
            const isSelected = b.code === activeCode;
            return (
              <button
                key={b.code}
                type="button"
                onClick={() => setActiveCode(b.code)}
                className={`flex h-9 items-center gap-2 rounded-lg border px-3.5 text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "border-[#FAFAFA]/45 bg-[#18181E] text-[#FAFAFA]"
                    : "border-[#222226] bg-[#101014] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]"
                }`}
              >
                <span className="font-semibold">{b.code}</span>
                <span className="hidden text-[11px] text-[#71717A] sm:inline">
                  ({b.name.split(" ")[0]})
                </span>
                <span className="rounded bg-[#0B0B0E] px-1.5 py-0.5 font-mono text-[10px] text-[#D4D4D8] tabular-nums">
                  {b.placementRate}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeBranch && (
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4">
                <span className="text-[11px] text-[#A1A1AA]">Placement Rate</span>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                    {activeBranch.placementRate}%
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-sm bg-[#18181B]">
                  <div
                    className="h-full bg-[#FAFAFA]"
                    style={{ width: `${activeBranch.placementRate}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4">
                <span className="text-[11px] text-[#A1A1AA]">Avg CGPA</span>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                    {activeBranch.avgCgpa}
                  </span>
                  <span className="font-mono text-[10px] text-[#71717A]">/10</span>
                </div>
                <span className="mt-2 block text-[10px] text-[#71717A]">
                  Tier-1: {activeBranch.keyCutoffs?.tier1EligibleCgpa || 7.5}+
                </span>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4">
                <span className="text-[11px] text-[#A1A1AA]">Avg Coding</span>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                    {activeBranch.avgCodingScore}
                  </span>
                  <span className="font-mono text-[10px] text-[#71717A]">/10</span>
                </div>
                <span className="mt-2 block text-[10px] text-[#71717A]">Screening index</span>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4">
                <span className="text-[11px] text-[#A1A1AA]">Peak Package</span>
                <div className="mt-1.5 font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
                  {activeBranch.highestPackage ? `${activeBranch.highestPackage} LPA` : "—"}
                </div>
                <span className="mt-2 block text-[10px] text-[#71717A]">Highest offer</span>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4">
                <span className="text-[11px] text-[#A1A1AA]">Candidates</span>
                <div className="mt-1.5 font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                  {activeBranch.totalStudents}
                </div>
                <span className="mt-2 block text-[10px] text-[#71717A]">
                  {activeBranch.placedCount} placed
                </span>
              </div>
            </div>

            {/* Department Strategy & Transition Bridge */}
            <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px] sm:p-8">
              <div className="flex items-center justify-between border-b border-[#1F1F23] pb-4">
                <div>
                  <h3 className="text-base font-semibold text-[#FAFAFA]">
                    Department Transition &amp; Roadmap Bridge
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">{activeBranch.name}</p>
                </div>
                <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8]">
                  Strategy
                </span>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-[#D4D4D8] sm:text-sm">
                {activeBranch.transitionRoadmap}
              </p>

              <div className="mt-6">
                <span className="text-xs font-medium text-[#A1A1AA]">
                  Top Hiring Domains for {activeBranch.code}
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeBranch.coreHiringDomains.map((domain) => (
                    <span
                      key={domain}
                      className="rounded-md border border-[#222226] bg-[#101014] px-2.5 py-1 text-xs font-medium text-[#FAFAFA]"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <span className="text-xs font-medium text-[#A1A1AA]">
                  Frequent Campus Recruiters
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeBranch.topRecruiters.map((recruiter) => (
                    <span
                      key={recruiter}
                      className="rounded-md border border-[#27272A] bg-[#141418] px-2.5 py-1 text-xs font-medium text-[#FAFAFA]"
                    >
                      {recruiter}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Department Comparison Chart */}
            <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px] sm:p-8">
              <div className="flex items-center justify-between pb-4">
                <h3 className="text-sm font-semibold text-[#FAFAFA]">
                  Cross-Branch Placement Comparison
                </h3>
                <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                  {comparisonData.length} Departments
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" vertical={false} />
                    <XAxis
                      dataKey="code"
                      stroke="#71717A"
                      tick={{ fontSize: 11, fill: "#A1A1AA" }}
                    />
                    <YAxis
                      stroke="#71717A"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#A1A1AA" }}
                      unit="%"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-[#27272A] bg-[#09090B] p-3 text-xs text-[#FAFAFA] shadow-xl">
                              <span className="font-semibold">{item.name}</span>
                              <div className="mt-1 space-y-0.5 text-[#A1A1AA]">
                                <div>
                                  Placement Rate:{" "}
                                  <strong className="font-mono text-[#FAFAFA]">{item.rate}%</strong>
                                </div>
                                <div>
                                  Avg CGPA:{" "}
                                  <strong className="font-mono text-[#FAFAFA]">
                                    {item.avgCgpa}
                                  </strong>
                                </div>
                                <div>
                                  Candidates:{" "}
                                  <strong className="font-mono text-[#FAFAFA]">
                                    {item.students}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                      {comparisonData.map((entry) => (
                        <Cell
                          key={entry.code}
                          fill={entry.code === activeCode ? "#FAFAFA" : "#3F3F46"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
              <h3 className="border-b border-[#1F1F23] pb-3.5 text-sm font-semibold text-[#FAFAFA]">
                Tier-1 Screening Rules
              </h3>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-[#222226] bg-[#101014] p-3">
                  <span className="text-xs text-[#A1A1AA]">Min CGPA for Tier-1</span>
                  <span className="font-mono text-xs font-semibold text-[#FAFAFA] tabular-nums">
                    {activeBranch.keyCutoffs?.tier1EligibleCgpa || 7.5} / 10.0
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#222226] bg-[#101014] p-3">
                  <span className="text-xs text-[#A1A1AA]">Max Backlogs Allowed</span>
                  <span className="font-mono text-xs font-semibold text-[#FAFAFA] tabular-nums">
                    {activeBranch.keyCutoffs?.maxBacklogsAllowed ?? 0} (Strict zero)
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#222226] bg-[#101014] p-3">
                  <span className="text-xs text-[#A1A1AA]">Coding Test Benchmark</span>
                  <span className="font-mono text-xs font-semibold text-[#FAFAFA] tabular-nums">
                    {activeBranch.keyCutoffs?.minCodingConfidence || 7} / 10
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
              <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3.5">
                <h3 className="text-sm font-semibold text-[#FAFAFA]">Highest Yield Skills</h3>
                <span className="font-mono text-[10px] text-[#71717A]">{activeBranch.code}</span>
              </div>

              <div className="mt-4 space-y-3">
                {activeBranch.topSkills?.map((s) => (
                  <div
                    key={s.skill}
                    className="rounded-lg border border-[#222226] bg-[#101014] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#FAFAFA]">{s.skill}</span>
                      <span className="rounded border border-[#27272A] bg-[#0B0B0E] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8] tabular-nums">
                        {s.placement_rate}% placed
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-sm bg-[#18181B]">
                      <div
                        className="h-full bg-[#FAFAFA]"
                        style={{ width: `${s.placement_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab("skills")}
                className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#27272A] bg-[#101014] text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#18181B] cursor-pointer"
              >
                View Complete Skill Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
