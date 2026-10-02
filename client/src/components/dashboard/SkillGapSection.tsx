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
    { label: "Academics & CGPA Cutoff", score: breakdown.academics || 75, color: "from-cyan-400 to-blue-500" },
    { label: "DSA & Problem Solving", score: breakdown.coding_dsa || 70, color: "from-emerald-400 to-teal-500" },
    { label: "Technical Communication & STAR", score: breakdown.communication || 70, color: "from-purple-400 to-indigo-500" },
    { label: "Practical Internships & Projects", score: breakdown.experience || 35, color: "from-amber-400 to-orange-500" },
    { label: "Drive Eligibility & Clearance", score: breakdown.eligibility || 100, color: "from-rose-400 to-pink-500" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Dimension Health & Skill-Gap Breakdown */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-bold text-white">Skill Strength & Gap Analysis</h3>
          </div>
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
            5 Dimensions
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Evaluated relative to tier-1 campus recruitment expectations and benchmarks
        </p>

        {/* Dimension Health Bars */}
        <div className="mt-5 space-y-4">
          {dimensions.map((dim) => (
            <div key={dim.label} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">{dim.label}</span>
                <span className="text-slate-200">{dim.score.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${dim.color} shadow-[0_0_8px_rgba(16,185,129,0.3)]`}
                  style={{ width: `${Math.max(5, Math.min(100, dim.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Recommended High-Yield Target Skills */}
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            High-Yield Recommended Skills:
          </span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {skillsList.map((skill) => (
              <button
                key={skill.name}
                onClick={() => onAskCoach(`How should I prepare ${skill.name} for upcoming campus placement tests?`)}
                className="group flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 hover:shadow-[0_0_12px_rgba(16,185,129,0.18)] active:scale-95"
              >
                <span>{skill.name}</span>
                <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Strengths & Placement Blocker Cards */}
      <div className="space-y-6">
        {/* Identified Strengths */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-slate-900/80 p-6 shadow-[0_8px_32px_rgba(16,185,129,0.08)] backdrop-blur-2xl ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="text-base font-bold text-white">Identified Competitive Strengths</h3>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {strengths.map((str, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs text-emerald-200">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>{str}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Action Items / Priorities */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-900/80 p-6 shadow-[0_8px_32px_rgba(245,158,11,0.08)] backdrop-blur-2xl ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldAlert className="h-5 w-5" />
            <h3 className="text-base font-bold text-white">Priority Placement Actions</h3>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {priorities.length > 0 ? (
              priorities.map((prio, idx) => (
                <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-200">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>{prio}</span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs text-emerald-300">
                No critical academic or eligibility blockers detected. Focus on interview polish and mock tests.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
