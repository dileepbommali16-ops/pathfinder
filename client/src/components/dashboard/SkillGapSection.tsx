import React from "react";
import { TrendingUp, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";

interface SkillGapSectionProps {
  breakdown: {
    academics?: number;
    coding_dsa?: number;
    communication?: number;
    experience?: number;
    eligibility?: number;
  };
  strengths: string[];
  priorities: string[];
  apiBase: string;
  onAskCoach: (query: string) => void;
}

const DEFAULT_RECOMMENDED_SKILLS = [
  { name: "Dynamic Programming", category: "DSA" },
  { name: "System Design Fundamentals", category: "Architecture" },
  { name: "SQL & Query Optimization", category: "Databases" },
  { name: "Docker & Containerization", category: "DevOps" },
  { name: "REST API Architecture", category: "Backend" },
  { name: "Core Java / OOP Concurrency", category: "Languages" },
];

export const SkillGapSection: React.FC<SkillGapSectionProps> = ({
  breakdown,
  strengths,
  priorities,
  apiBase,
  onAskCoach,
}) => {
  const [skillsList, setSkillsList] = React.useState(DEFAULT_RECOMMENDED_SKILLS);

  React.useEffect(() => {
    if (!apiBase) return;
    let isMounted = true;
    fetch(`${apiBase}/api/data/skills`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && data.canonicalBenchmarks && data.canonicalBenchmarks.length > 0) {
          setSkillsList(data.canonicalBenchmarks);
        }
      })
      .catch((err) => console.warn("Skill gap fetch warning:", err));
    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const dimensions = [
    { label: "Academics & CGPA Cutoff", score: breakdown.academics || 75, color: "from-[#ff3b5c] to-[#ff5470]" },
    { label: "DSA & Problem Solving", score: breakdown.coding_dsa || 70, color: "from-[#ff3b5c] to-[#c7c7cf]" },
    { label: "Technical Communication & STAR", score: breakdown.communication || 70, color: "from-[#c7c7cf] to-[#f2f2f0]" },
    { label: "Practical Internships & Projects", score: breakdown.experience || 35, color: "from-[#ff3b5c] to-[#ff5470]" },
    { label: "Drive Eligibility & Clearance", score: breakdown.eligibility || 100, color: "from-[#ff3b5c] to-[#ff3b5c]" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Dimension Health & Skill-Gap Breakdown */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#16161a] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff3b5c]/10 text-[#ff3b5c] border border-[#ff3b5c]/20">
              <TrendingUp className="h-4 w-4 text-[#ff3b5c]" />
            </div>
            <h3 className="text-lg font-bold text-[#f2f2f0]">Skill Strength & Gap Analysis</h3>
          </div>
          <span className="rounded-md border border-white/[0.08] bg-[#0a0a0c] px-2 py-0.5 text-[10px] font-semibold text-[#8a8a92]">
            5 Dimensions
          </span>
        </div>
        <p className="mt-1 text-xs text-[#8a8a92]">
          Evaluated relative to tier-1 campus recruitment expectations and benchmarks
        </p>

        {/* Dimension Health Bars */}
        <div className="mt-5 space-y-4">
          {dimensions.map((dim) => (
            <div key={dim.label} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#8a8a92]">{dim.label}</span>
                <span className="text-[#f2f2f0]">{dim.score.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${dim.color} shadow-[0_0_8px_rgba(255,59,92,0.3)]`}
                  style={{ width: `${Math.max(5, Math.min(100, dim.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Recommended High-Yield Target Skills */}
        <div className="mt-6 border-t border-white/[0.08] pt-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8a8a92]">
            High-Yield Recommended Skills:
          </span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {skillsList.map((skill) => (
              <button
                key={skill.name}
                onClick={() => onAskCoach(`How should I prepare ${skill.name} for upcoming campus placement tests?`)}
                className="group flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0a0a0c] px-2.5 py-1.5 text-xs text-[#f2f2f0] transition-all hover:border-[#ff3b5c]/40 hover:bg-[#ff3b5c]/10 hover:text-[#f2f2f0] hover:shadow-[0_0_12px_rgba(255,59,92,0.18)] active:scale-95"
              >
                <span>{skill.name}</span>
                <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-[#ff3b5c]" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Strengths & Placement Blocker Cards */}
      <div className="space-y-6">
        {/* Identified Strengths */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#16161a] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-[#ff3b5c]">
            <CheckCircle2 className="h-5 w-5 text-[#ff3b5c]" />
            <h3 className="text-base font-bold text-[#f2f2f0]">Identified Competitive Strengths</h3>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {strengths.map((str, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-[#0a0a0c] p-3 text-xs text-[#f2f2f0]">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff3b5c]" />
                <span>{str}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Action Items / Priorities */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#16161a] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-[#ff3b5c]">
            <ShieldAlert className="h-5 w-5 text-[#ff3b5c]" />
            <h3 className="text-base font-bold text-[#f2f2f0]">Priority Placement Actions</h3>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {priorities.length > 0 ? (
              priorities.map((prio, idx) => (
                <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-[#0a0a0c] p-3 text-xs text-[#f2f2f0]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff3b5c]" />
                  <span>{prio}</span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0c] p-3 text-xs text-[#8a8a92]">
                No critical academic or eligibility blockers detected. Focus on interview polish and mock tests.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
