import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Brain,
  Code,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles
} from "lucide-react";

interface SkillGapSectionProps {
  strengths: string[];
  priorities: string[];
  breakdown: Record<string, number>;
  onAskCoach: (query: string) => void;
  apiBase?: string;
}

const DEFAULT_RECOMMENDED_SKILLS = [
  { name: "Blind 75 DSA Patterns", category: "Core DSA", priority: "High" },
  { name: "System Design Foundations", category: "Architecture", priority: "High" },
  { name: "STAR Method Articulation", category: "Interviews", priority: "Critical" },
  { name: "RESTful APIs & Postman", category: "Backend", priority: "Medium" },
  { name: "PostgreSQL & Query Optimization", category: "Database", priority: "Medium" },
  { name: "Docker Containerization", category: "DevOps", priority: "High" },
  { name: "Clean Git & CI/CD Pipelines", category: "Engineering", priority: "Medium" },
  { name: "Dynamic Programming Patterns", category: "DSA", priority: "High" },
];

export const SkillGapSection: React.FC<SkillGapSectionProps> = ({
  strengths,
  priorities,
  breakdown,
  onAskCoach,
  apiBase,
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
    { label: "Academics & CGPA Cutoff", score: breakdown.academics || 75, color: "from-[#C2452B] to-[#FF6B4A]" },
    { label: "DSA & Problem Solving", score: breakdown.coding_dsa || 70, color: "from-[#FF6B4A] to-[#FF8A6E]" },
    { label: "Technical Communication & STAR", score: breakdown.communication || 70, color: "from-[#FF8A6E] to-[#F2F2F3]" },
    { label: "Practical Internships & Projects", score: breakdown.experience || 35, color: "from-[#C2452B] to-[#FF8A6E]" },
    { label: "Drive Eligibility & Clearance", score: breakdown.eligibility || 100, color: "from-[#FF6B4A] to-[#FF6B4A]" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Dimension Health & Skill-Gap Breakdown */}
      <div className="relative overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF6B4A]/10 text-[#FF6B4A] border border-[#FF6B4A]/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-bold text-[#F2F2F3]">Skill Strength & Gap Analysis</h3>
          </div>
          <span className="rounded-md border border-[#2A2A30] bg-[#141417] px-2 py-0.5 text-[10px] font-semibold text-[#A1A1AA]">
            5 Dimensions
          </span>
        </div>
        <p className="mt-1 text-xs text-[#A1A1AA]">
          Evaluated relative to tier-1 campus recruitment expectations and benchmarks
        </p>

        {/* Dimension Health Bars */}
        <div className="mt-5 space-y-4">
          {dimensions.map((dim) => (
            <div key={dim.label} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#A1A1AA]">{dim.label}</span>
                <span className="text-[#F2F2F3]">{dim.score.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#2A2A30]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${dim.color} shadow-[0_0_8px_rgba(255,107,74,0.3)]`}
                  style={{ width: `${Math.max(5, Math.min(100, dim.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Recommended High-Yield Target Skills */}
        <div className="mt-6 border-t border-[#2A2A30] pt-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
            High-Yield Recommended Skills:
          </span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {skillsList.map((skill) => (
              <button
                key={skill.name}
                onClick={() => onAskCoach(`How should I prepare ${skill.name} for upcoming campus placement tests?`)}
                className="group flex items-center gap-1.5 rounded-lg border border-[#2A2A30] bg-[#141417] px-2.5 py-1.5 text-xs text-[#F2F2F3] transition-all hover:border-[#FF6B4A]/40 hover:bg-[#FF6B4A]/10 hover:text-[#FF8A6E] hover:shadow-[0_0_12px_rgba(255,107,74,0.18)] active:scale-95"
              >
                <span>{skill.name}</span>
                <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-[#FF6B4A]" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Strengths & Placement Blocker Cards */}
      <div className="space-y-6">
        {/* Identified Strengths */}
        <div className="relative overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-[var(--text-accent)]">
            <CheckCircle2 className="h-5 w-5 text-[var(--text-accent)]" />
            <h3 className="text-base font-bold text-[#F2F2F3]">Identified Competitive Strengths</h3>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {strengths.map((str, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-[#2A2A30] bg-[#141417] p-3 text-xs text-[#F2F2F3]">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-accent)]" />
                <span>{str}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Action Items / Priorities */}
        <div className="relative overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-[var(--text-accent-soft)]">
            <ShieldAlert className="h-5 w-5 text-[var(--text-accent-soft)]" />
            <h3 className="text-base font-bold text-[#F2F2F3]">Priority Placement Actions</h3>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {priorities.length > 0 ? (
              priorities.map((prio, idx) => (
                <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-[#2A2A30] bg-[#141417] p-3 text-xs text-[#F2F2F3]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span>{prio}</span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-[#2A2A30] bg-[#141417] p-3 text-xs text-[#A1A1AA]">
                No critical academic or eligibility blockers detected. Focus on interview polish and mock tests.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
