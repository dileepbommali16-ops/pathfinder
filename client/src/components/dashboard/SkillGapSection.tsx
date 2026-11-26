import React from "react";
import { SpotlightSurface } from "@/components/ui/TitaniumPrimitives";

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

  const hasMetrics =
    breakdown &&
    (breakdown.academics !== undefined ||
      breakdown.coding_dsa !== undefined ||
      breakdown.communication !== undefined);

  const dimensions = [
    { label: "Academics & CGPA cutoff", score: hasMetrics ? breakdown.academics ?? null : null },
    { label: "DSA & problem solving", score: hasMetrics ? breakdown.coding_dsa ?? null : null },
    {
      label: "Technical communication & STAR",
      score: hasMetrics ? breakdown.communication ?? null : null,
    },
    {
      label: "Practical internships & projects",
      score: hasMetrics ? breakdown.experience ?? null : null,
    },
    { label: "Drive eligibility & clearance", score: hasMetrics ? breakdown.eligibility ?? null : null },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      {/* Left 6 cols: 5-Dimension Competency Telemetry */}
      <SpotlightSurface className="min-w-0 rounded-2xl p-8 sm:p-10 lg:col-span-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#FAFAFA]">
            Competency dimensions
          </h3>
          <span className="rounded-md border border-white/[0.1] bg-[#121216] px-2.5 py-0.5 font-mono text-[10px] text-[#A1A1AA] tabular-nums">
            05 axes
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#A1A1AA]">
          {hasMetrics
            ? "Profile competency axes evaluated against reference campus hiring thresholds."
            : "Add your CGPA, branch, and skills in Profile & Settings to compute your 5 competency axes."}
        </p>

        <div className="mt-7 space-y-6">
          {dimensions.map((dim) => {
            const hasScore = dim.score !== null && dim.score !== undefined;
            const pct = hasScore ? Math.max(5, Math.min(100, dim.score as number)) : 0;
            return (
              <div key={dim.label} className="space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#E4E4E7]">{dim.label}</span>
                  <span className="font-mono font-semibold text-[#FAFAFA] tabular-nums">
                    {hasScore ? `${(dim.score as number).toFixed(0)}%` : "—"}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#71717A] to-[#FAFAFA] transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Industry Reference Focus Topics — Spacious Pills */}
        <div className="mt-8 border-t border-white/[0.07] pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="block font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
              Industry reference focus topics
            </span>
            <span className="rounded-md border border-white/[0.08] bg-[#121216] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
              Reference Benchmarks
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-[#71717A]">
            Standard campus interview syllabus topics — select any topic to review with DAS.
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            {skillsList.map((skill) => (
              <button
                key={skill.name}
                type="button"
                onClick={() =>
                  onAskCoach(`How should I prepare ${skill.name} for upcoming campus placement tests?`)
                }
                className="pf-btn-secondary inline-flex h-9 items-center rounded-lg px-3.5 text-xs text-[#D4D4D8] hover:text-[#FAFAFA] active:scale-[0.98]"
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>
      </SpotlightSurface>

      {/* Right 6 cols: Spacious Numbered Strengths & Priority Actions */}
      <div className="min-w-0 space-y-8 lg:col-span-6">
        <SpotlightSurface className="rounded-2xl p-8 sm:p-9">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#FAFAFA]">
            Competitive strengths
          </h3>
          <div className="mt-5 space-y-3">
            {strengths.length > 0 ? (
              strengths.map((str, idx) => (
                <div
                  key={idx}
                  className="pf-subpanel flex items-start gap-3.5 rounded-xl p-4 text-xs leading-relaxed text-[#E4E4E7]"
                >
                  <span className="mt-0.5 font-mono text-[11px] text-[#71717A] tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span>{str}</span>
                </div>
              ))
            ) : (
              <div className="pf-subpanel rounded-xl p-4 text-xs leading-relaxed text-[#A1A1AA]">
                Complete your CGPA, branch, and skills in Profile &amp; Settings to surface personalized strengths.
              </div>
            )}
          </div>
        </SpotlightSurface>

        <SpotlightSurface className="rounded-2xl p-8 sm:p-9">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#FAFAFA]">
            Priority placement actions
          </h3>
          <div className="mt-5 space-y-3">
            {priorities.length > 0 ? (
              priorities.map((prio, idx) => (
                <div
                  key={idx}
                  className="pf-subpanel flex items-start gap-3.5 rounded-xl p-4 text-xs leading-relaxed text-[#E4E4E7]"
                >
                  <span className="mt-0.5 font-mono text-[11px] text-[#71717A] tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span>{prio}</span>
                </div>
              ))
            ) : (
              <div className="pf-subpanel rounded-xl p-4 text-xs leading-relaxed text-[#A1A1AA]">
                Upload a resume in JD &amp; Resume Lab to unlock targeted recruiter remediation steps.
              </div>
            )}
          </div>
        </SpotlightSurface>
      </div>
    </div>
  );
};
