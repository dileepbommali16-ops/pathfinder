import React from "react";
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

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
    { label: "Academics & CGPA cutoff", score: breakdown.academics ?? 75 },
    { label: "DSA & problem solving", score: breakdown.coding_dsa ?? 70 },
    { label: "Technical communication & STAR", score: breakdown.communication ?? 70 },
    { label: "Practical internships & projects", score: breakdown.experience ?? 35 },
    { label: "Drive eligibility & clearance", score: breakdown.eligibility ?? 100 },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: 5-Dimension Competency Telemetry */}
      <div className="rounded-xl border border-[#222226] bg-[#09090B]/58 p-6 backdrop-blur-[2px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272A] bg-[#0C0C0E]">
              <TrendingUp className="h-4 w-4 text-[#FAFAFA]" />
            </div>
            <h3 className="text-base font-semibold tracking-[-0.015em] text-[#FAFAFA]">
              Competency dimensions
            </h3>
          </div>
          <span className="rounded border border-[#27272A] bg-[#111114] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA] tabular-nums">
            05 axes
          </span>
        </div>
        <p className="mt-1.5 text-xs text-[#A1A1AA]">
          Evaluated relative to verified campus hiring thresholds.
        </p>

        <div className="mt-5 space-y-4">
          {dimensions.map((dim) => {
            const pct = Math.max(5, Math.min(100, dim.score));
            return (
              <div key={dim.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#D4D4D8]">{dim.label}</span>
                  <span className="font-mono font-medium text-[#FAFAFA] tabular-nums">
                    {dim.score.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-sm bg-[#18181B]">
                  <div
                    className="h-full bg-[#FAFAFA] transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* High-Yield Skills */}
        <div className="mt-6 border-t border-[#1F1F23] pt-5">
          <span className="block text-xs font-medium text-[#A1A1AA]">
            Recommended focus topics
          </span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {skillsList.map((skill) => (
              <button
                key={skill.name}
                type="button"
                onClick={() =>
                  onAskCoach(`How should I prepare ${skill.name} for upcoming campus placement tests?`)
                }
                className="group inline-flex h-8 items-center gap-1.5 rounded-md border border-[#27272A] bg-[#0C0C0E] px-2.5 text-xs text-[#D4D4D8] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] hover:text-[#FAFAFA] active:scale-[0.98]"
              >
                <span>{skill.name}</span>
                <ArrowRight className="h-3 w-3 text-[#71717A] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#FAFAFA]" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Strengths & Priority Actions */}
      <div className="space-y-6">
        <div className="rounded-xl border border-[#222226] bg-[#09090B]/58 p-6 backdrop-blur-[2px]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#FAFAFA]" />
            <h3 className="text-base font-semibold tracking-[-0.015em] text-[#FAFAFA]">
              Competitive strengths
            </h3>
          </div>
          <div className="mt-3.5 space-y-2">
            {strengths.map((str, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-[#1F1F23] bg-[#0C0C0E] p-3 text-xs leading-relaxed text-[#E4E4E7]"
              >
                <span className="mt-0.5 font-mono text-[10px] text-[#71717A] tabular-nums">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span>{str}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#222226] bg-[#09090B]/58 p-6 backdrop-blur-[2px]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#FAFAFA]" />
            <h3 className="text-base font-semibold tracking-[-0.015em] text-[#FAFAFA]">
              Priority placement actions
            </h3>
          </div>
          <div className="mt-3.5 space-y-2">
            {priorities.length > 0 ? (
              priorities.map((prio, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-lg border border-[#1F1F23] bg-[#0C0C0E] p-3 text-xs leading-relaxed text-[#E4E4E7]"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                  <span>{prio}</span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-[#1F1F23] bg-[#0C0C0E] p-3 text-xs leading-relaxed text-[#A1A1AA]">
                Upload a resume in JD &amp; Resume Lab to unlock targeted recruiter remediation steps.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
