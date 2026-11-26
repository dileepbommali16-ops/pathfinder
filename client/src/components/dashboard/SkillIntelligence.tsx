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
import { FALLBACK_SKILLS_DATA } from "@/lib/fallbackData";

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
}) => {
  const [skillAnalytics, setSkillAnalytics] = useState<SkillMetric[]>(
    (FALLBACK_SKILLS_DATA.skillAnalytics || []) as unknown as SkillMetric[]
  );
  const [baselineRate, setBaselineRate] = useState<number>(
    FALLBACK_SKILLS_DATA.baselinePlacementRate || 75.0
  );
  const [selectedSkillName, setSelectedSkillName] = useState<string>("AIML");
  const [mySkills, setMySkills] = useState<string[]>(["Python", "SQL"]);

  useEffect(() => {
    let isMounted = true;
    const fetchSkills = async () => {
      try {
        const resp = await fetch(
          `${apiBase}/api/data/skills?year=${selectedYear}&branch=${selectedBranch}`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (isMounted) {
            setSkillAnalytics(data.skillAnalytics || []);
            setBaselineRate(data.baselinePlacementRate || 75.0);
            if (data.skillAnalytics && data.skillAnalytics.length > 0) {
              setSelectedSkillName(data.skillAnalytics[0].skill);
            }
          }
        }
      } catch (err) {
        console.warn("Skill analytics API warning:", err);
      }
    };
    fetchSkills();
    return () => {
      isMounted = false;
    };
  }, [apiBase, selectedYear, selectedBranch]);

  const activeMetric =
    skillAnalytics.find((s) => s.skill === selectedSkillName) || skillAnalytics[0];

  const toggleSkill = (skill: string) => {
    setMySkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px] sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-5 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#FAFAFA] sm:text-2xl">
                Skill Intelligence &amp; Impact Matrix
              </h2>
              <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
                972 Records
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#A1A1AA] sm:text-sm">
              Observed correlation in the 972-record placement dataset between technical skills,
              placement rate, and package ranges
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onAskCoach(
                "Which specific high-yield skills will give me the biggest placement probability boost right now?"
              )
            }
            className="inline-flex h-9 items-center rounded-lg border border-[#27272A] bg-[#141418] px-4 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#1C1C22] cursor-pointer"
          >
            Ask DAS on Skills
          </button>
        </div>

        {/* Skill Category Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {skillAnalytics.slice(0, 4).map((s) => (
            <button
              key={s.skill}
              type="button"
              onClick={() => setSelectedSkillName(s.skill)}
              className={`cursor-pointer rounded-xl border p-4 text-left transition-colors ${selectedSkillName === s.skill
                ? "border-[#FAFAFA]/45 bg-[#18181E]"
                : "border-[#222226] bg-[#101014] hover:border-[#3F3F46]"
                }`}
            >
              <span className="block truncate text-[11px] font-medium text-[#A1A1AA]">
                {s.skill}
              </span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                  {s.placementRate}%
                </span>
                <span className="font-mono text-[10px] text-[#D4D4D8] tabular-nums">
                  {s.rateDeltaVsAverage >= 0
                    ? `+${s.rateDeltaVsAverage}%`
                    : `${s.rateDeltaVsAverage}%`}
                </span>
              </div>
              <span className="mt-1 block font-mono text-[10px] text-[#71717A] tabular-nums">
                {s.totalCandidates} candidates
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">
                Placement Clearance Rate by Technical Skill
              </h3>
              <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                Baseline: {baselineRate}%
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={skillAnalytics}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" vertical={false} />
                  <XAxis
                    dataKey="skill"
                    stroke="#71717A"
                    tick={{ fontSize: 10, fill: "#A1A1AA" }}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    stroke="#71717A"
                    domain={[40, 100]}
                    tick={{ fontSize: 11, fill: "#A1A1AA" }}
                    unit="%"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as SkillMetric;
                        return (
                          <div className="rounded-xl border border-[#27272A] bg-[#09090B] p-3 text-xs text-[#FAFAFA] shadow-xl">
                            <span className="font-semibold">{item.skill}</span>
                            <div className="mt-1 space-y-0.5 text-[#A1A1AA]">
                              <div>
                                Placement Rate:{" "}
                                <strong className="font-mono text-[#FAFAFA]">
                                  {item.placementRate}%
                                </strong>
                              </div>
                              <div>
                                Delta:{" "}
                                <strong className="font-mono text-[#FAFAFA]">
                                  {item.rateDeltaVsAverage >= 0
                                    ? `+${item.rateDeltaVsAverage}%`
                                    : `${item.rateDeltaVsAverage}%`}
                                </strong>
                              </div>
                              <div>
                                Candidates:{" "}
                                <strong className="font-mono text-[#FAFAFA]">
                                  {item.totalCandidates}
                                </strong>
                              </div>
                              <div>
                                Coding Benchmark:{" "}
                                <strong className="font-mono text-[#FAFAFA]">
                                  {item.avgCodingScore}/10
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="placementRate" radius={[6, 6, 0, 0]}>
                    {skillAnalytics.map((entry) => (
                      <Cell
                        key={entry.skill}
                        fill={
                          entry.skill === selectedSkillName
                            ? "#FAFAFA"
                            : entry.placementRate >= 80
                              ? "#A1A1AA"
                              : "#3F3F46"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
            <div className="flex items-center justify-between border-b border-[#1F1F23] pb-4">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">
                Interactive Skill Inventory
              </h3>
              <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                {mySkills.length} selected
              </span>
            </div>

            <p className="mt-3 text-xs text-[#A1A1AA]">
              Select the skills you possess to compare against cohort clearance trends:
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Python",
                "Java",
                "SQL",
                "DSA",
                "AIML",
                "Docker",
                "System Design",
                "React",
                "C++",
              ].map((sk) => {
                const checked = mySkills.includes(sk);
                return (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => toggleSkill(sk)}
                    className={`h-9 rounded-lg border px-3.5 text-xs font-medium transition-colors cursor-pointer ${checked
                      ? "border-[#FAFAFA]/45 bg-[#18181E] text-[#FAFAFA]"
                      : "border-[#222226] bg-[#101014] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]"
                      }`}
                  >
                    {sk}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {activeMetric && (
            <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
              <h3 className="border-b border-[#1F1F23] pb-3.5 text-sm font-semibold text-[#FAFAFA]">
                Skill Benchmark Focus
              </h3>

              <div className="mt-4">
                <span className="block text-lg font-semibold text-[#FAFAFA]">
                  {activeMetric.skill}
                </span>
                <span className="mt-0.5 block text-xs text-[#A1A1AA]">
                  Computed from the 972-record placement dataset
                </span>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#222226] bg-[#101014] p-3.5">
                    <span className="block text-[10px] text-[#71717A]">Placement Rate</span>
                    <span className="mt-1 block font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
                      {activeMetric.placementRate}%
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#222226] bg-[#101014] p-3.5">
                    <span className="block text-[10px] text-[#71717A]">Delta vs Baseline</span>
                    <span className="mt-1 block font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
                      {activeMetric.rateDeltaVsAverage >= 0
                        ? `+${activeMetric.rateDeltaVsAverage}%`
                        : `${activeMetric.rateDeltaVsAverage}%`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[#1F1F23] py-2">
                    <span className="text-[#A1A1AA]">Average CGPA</span>
                    <span className="font-mono font-medium text-[#FAFAFA] tabular-nums">
                      {activeMetric.avgCgpa}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#1F1F23] py-2">
                    <span className="text-[#A1A1AA]">Average Coding Score</span>
                    <span className="font-mono font-medium text-[#FAFAFA] tabular-nums">
                      {activeMetric.avgCodingScore} / 10
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#1F1F23] py-2">
                    <span className="text-[#A1A1AA]">Average Communication</span>
                    <span className="font-mono font-medium text-[#FAFAFA] tabular-nums">
                      {activeMetric.avgCommunicationScore} / 10
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[#A1A1AA]">Total Tested Students</span>
                    <span className="font-mono font-medium text-[#FAFAFA] tabular-nums">
                      {activeMetric.totalCandidates}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onAskCoach(
                      `How do I prepare and master ${activeMetric.skill} for campus recruitment in 4 weeks?`
                    )
                  }
                  className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#27272A] bg-[#141418] text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#1C1C22] cursor-pointer"
                >
                  Build {activeMetric.skill} Sprint
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
