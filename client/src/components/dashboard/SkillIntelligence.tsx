import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Code2,
  TrendingUp,
  Sparkles,
  Award,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Bot,
  Layers,
  ChevronRight,
  BookOpen,
  Filter
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

export interface SkillMetric {
  skill: string;
  totalCandidates: number;
  placedCount: number;
  placementRate: number;
  rateDeltaVsAverage: number;
  avgCgpa: number;
  avgCodingScore: number;
  avgCommunicationScore: number;
}

export interface CanonicalBenchmark {
  id: string;
  name: string;
  category: string;
  priority: string;
  demandIndex: number;
  placementRateWithSkill: number;
  avgSalaryBumpLPA: number;
  requiredLevel: number;
  actionableStep: string;
  highFrequencyTopics: string[];
}

interface SkillIntelligenceProps {
  apiBase: string;
  selectedYear: number;
  selectedBranch: string;
  onAskCoach: (query: string) => void;
  onNavigateTab: (tabId: any) => void;
}

export const SkillIntelligence: React.FC<SkillIntelligenceProps> = ({
  apiBase,
  selectedYear,
  selectedBranch,
  onAskCoach,
  onNavigateTab,
}) => {
  const [skillAnalytics, setSkillAnalytics] = useState<SkillMetric[]>([]);
  const [benchmarks, setBenchmarks] = useState<CanonicalBenchmark[]>([]);
  const [baselineRate, setBaselineRate] = useState<number>(75.0);
  const [selectedSkillName, setSelectedSkillName] = useState<string>("AIML + Python (Combined)");
  const [mySkills, setMySkills] = useState<string[]>(["Python", "SQL"]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSkills = async () => {
      setIsLoading(true);
      try {
        const resp = await fetch(`${apiBase}/api/data/skills?year=${selectedYear}&branch=${selectedBranch}`);
        if (resp.ok) {
          const data = await resp.json();
          if (isMounted) {
            setSkillAnalytics(data.skillAnalytics || []);
            setBenchmarks(data.canonicalBenchmarks || []);
            setBaselineRate(data.baselinePlacementRate || 75.0);
            if (data.skillAnalytics && data.skillAnalytics.length > 0) {
              setSelectedSkillName(data.skillAnalytics[0].skill);
            }
          }
        }
      } catch (err) {
        console.warn("Skill analytics API warning:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchSkills();
    return () => {
      isMounted = false;
    };
  }, [apiBase, selectedYear, selectedBranch]);

  const activeMetric = skillAnalytics.find((s) => s.skill === selectedSkillName) || skillAnalytics[0];

  const toggleSkill = (skill: string) => {
    setMySkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // High priority gap skills from benchmarks that user hasn't checked
  const missingBenchmarks = benchmarks.filter(
    (b) => !mySkills.some((s) => b.name.toLowerCase().includes(s.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/[0.06] blur-3xl" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Skill Intelligence & Impact Matrix</h2>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                  Live Cohort Correlation • 648 Records
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verified correlation between technical skills, campus placement rate, and salary multipliers
              </p>
            </div>
          </div>

          <button
            onClick={() => onAskCoach("Which specific high-yield skills will give me the biggest placement probability boost right now?")}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 active:scale-95 shadow-sm"
          >
            <Bot className="h-4 w-4" />
            <span>Consult Coach on Skills</span>
          </button>
        </div>

        {/* Skill Category Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {skillAnalytics.slice(0, 4).map((s) => (
            <div
              key={s.skill}
              onClick={() => setSelectedSkillName(s.skill)}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                selectedSkillName === s.skill
                  ? "border-cyan-500/50 bg-cyan-500/15 shadow-[0_0_16px_rgba(6,182,212,0.2)]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-400 block truncate">{s.skill}</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">{s.placementRate}%</span>
                <span className={`text-[10px] font-bold ${s.rateDeltaVsAverage >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {s.rateDeltaVsAverage >= 0 ? `+${s.rateDeltaVsAverage}%` : `${s.rateDeltaVsAverage}%`}
                </span>
              </div>
              <span className="mt-1 text-[10px] text-slate-400 block">{s.totalCandidates} candidates</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Visual Chart + Deep Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Interactive Recharts Skill Matrix + Self Gap Assessment */}
        <div className="space-y-6 lg:col-span-2">
          {/* Skill Performance Chart */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-lg backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Placement Clearance Rate by Technical Skill</h3>
              </div>
              <span className="text-xs text-slate-400">Baseline Average: {baselineRate}%</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                  <XAxis dataKey="skill" stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-12} textAnchor="end" height={45} />
                  <YAxis stroke="#64748b" domain={[40, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as SkillMetric;
                        return (
                          <div className="rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-xl backdrop-blur-xl text-xs">
                            <span className="font-bold text-white">{item.skill}</span>
                            <div className="mt-1 space-y-0.5 text-slate-300">
                              <div>Placement Rate: <strong className="text-emerald-400">{item.placementRate}%</strong></div>
                              <div>Boost over baseline: <strong className="text-cyan-300">{item.rateDeltaVsAverage >= 0 ? `+${item.rateDeltaVsAverage}%` : `${item.rateDeltaVsAverage}%`}</strong></div>
                              <div>Evaluated Candidates: <strong className="text-amber-300">{item.totalCandidates}</strong></div>
                              <div>Avg Coding Benchmark: <strong className="text-purple-300">{item.avgCodingScore}/10</strong></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="placementRate" radius={[8, 8, 0, 0]}>
                    {skillAnalytics.map((entry) => (
                      <Cell
                        key={entry.skill}
                        fill={entry.skill === selectedSkillName ? "#06b6d4" : entry.placementRate >= 80 ? "#10b981" : "#334155"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Skill Gap Checklist & Ramp-Up Plan */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-lg backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Interactive Skill Inventory & Gap Diagnosis</h3>
              </div>
              <span className="text-xs text-slate-400">{mySkills.length} selected</span>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Check the skills you currently possess to dynamically reveal your high-yield placement bottlenecks:
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {["Python", "Java", "SQL", "DSA", "AIML", "Docker", "System Design", "React", "C++"].map((sk) => {
                const checked = mySkills.includes(sk);
                return (
                  <button
                    key={sk}
                    onClick={() => toggleSkill(sk)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      checked
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    <CheckCircle2 className={`h-3.5 w-3.5 ${checked ? "text-emerald-400" : "text-slate-600"}`} />
                    <span>{sk}</span>
                  </button>
                );
              })}
            </div>

            {/* Gap Action Plan */}
            <div className="mt-6 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Recommended 30-Day Skill Acceleration Gaps
              </span>
              <div className="mt-3 space-y-2.5">
                {missingBenchmarks.slice(0, 3).map((gap) => (
                  <div key={gap.id} className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-xs">
                    <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white">{gap.name}</strong>
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                          +{gap.avgSalaryBumpLPA} LPA bump
                        </span>
                      </div>
                      <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">{gap.actionableStep}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Deep-Dive Card into Selected Skill */}
        <div className="space-y-6">
          {activeMetric && (
            <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center gap-2 pb-4 border-b border-white/[0.06]">
                <Award className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Skill Benchmark Focus</h3>
              </div>

              <div className="mt-4">
                <span className="text-lg font-bold text-white block">{activeMetric.skill}</span>
                <span className="text-xs text-slate-400 mt-0.5 block">Evaluated across verified college drives</span>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <span className="text-[10px] text-slate-400 block">Placement Rate</span>
                    <span className="text-xl font-bold text-emerald-400 mt-0.5 block">{activeMetric.placementRate}%</span>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <span className="text-[10px] text-slate-400 block">Delta vs Baseline</span>
                    <span className="text-xl font-bold text-cyan-400 mt-0.5 block">
                      {activeMetric.rateDeltaVsAverage >= 0 ? `+${activeMetric.rateDeltaVsAverage}%` : `${activeMetric.rateDeltaVsAverage}%`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-slate-400">Average CGPA</span>
                    <span className="font-semibold text-white">{activeMetric.avgCgpa}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-slate-400">Average Coding Score</span>
                    <span className="font-semibold text-white">{activeMetric.avgCodingScore} / 10</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-slate-400">Average Communication</span>
                    <span className="font-semibold text-white">{activeMetric.avgCommunicationScore} / 10</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Total Tested Students</span>
                    <span className="font-semibold text-white">{activeMetric.totalCandidates}</span>
                  </div>
                </div>

                <button
                  onClick={() => onAskCoach(`How do I prepare and master ${activeMetric.skill} for campus recruitment in 4 weeks?`)}
                  className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 active:scale-95 shadow-sm"
                >
                  <Bot className="h-4 w-4" />
                  <span>Build {activeMetric.skill} Sprint</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Nav to Roles */}
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-lg backdrop-blur-2xl">
            <span className="text-xs font-bold text-white block">Next Career Steps</span>
            <p className="text-[11px] text-slate-400 mt-1">
              Explore how these technical skills map directly to verified SDE, AI Engineer, and Full-Stack role blueprints:
            </p>
            <button
              onClick={() => onNavigateTab("roles")}
              className="mt-4 w-full flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs font-semibold text-slate-200 transition-all hover:bg-white/[0.08]"
            >
              <span>Explore Role Blueprints</span>
              <ArrowRight className="h-4 w-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
