import React, { useState } from "react";
import { StudentProfileState } from "@/types/profile";
import { SpotlightSurface } from "@/components/ui/TitaniumPrimitives";

interface CompanyPlacementRadarProps {
  profile: StudentProfileState;
  predictionChance: number | null;
  onLaunchMockInterview?: (companyName: string, roleTitle: string) => void;
  onAskCoach?: (query: string) => void;
}

interface CompanyBenchmark {
  id: string;
  name: string;
  category: "Tier-1 MAANG" | "Fintech Unicorn" | "Enterprise Cloud" | "Premier Campus Drive";
  logoText: string;
  packageRange: string;
  minCgpa: number;
  maxBacklogs: number;
  requiredSkills: string[];
  recommendedProjects: string[];
  interviewRounds: string[];
  hiringCycle: "Typical Campus Season" | "Campus & Off-Campus" | "National Qualifier (NQT)";
}

const BENCHMARKS: CompanyBenchmark[] = [
  {
    id: "google",
    name: "Google / Alphabet",
    category: "Tier-1 MAANG",
    logoText: "GOOG",
    packageRange: "₹32 - ₹55 LPA",
    minCgpa: 8.0,
    maxBacklogs: 0,
    requiredSkills: ["Data Structures & Algorithms", "System Design", "Operating Systems", "Clean Code"],
    recommendedProjects: ["Distributed Key-Value Store", "Real-Time Collaborative Engine"],
    interviewRounds: ["Online Coding (2 DSA Hard)", "System Design Round", "Googliness & Leadership"],
    hiringCycle: "Typical Campus Season",
  },
  {
    id: "razorpay",
    name: "Razorpay / Fintech",
    category: "Fintech Unicorn",
    logoText: "RZPY",
    packageRange: "₹22 - ₹36 LPA",
    minCgpa: 7.5,
    maxBacklogs: 0,
    requiredSkills: ["React / TypeScript", "Microservices (Go / Node / Python)", "Idempotency & Payments", "SQL & Redis"],
    recommendedProjects: ["Event-Driven Payment Gateway", "Idempotent Financial Ledger"],
    interviewRounds: ["Machine Coding Round (2.5 hrs)", "System Architecture Round", "Bar Raiser Culture Fit"],
    hiringCycle: "Campus & Off-Campus",
  },
  {
    id: "amazon",
    name: "Amazon AWS",
    category: "Tier-1 MAANG",
    logoText: "AMZN",
    packageRange: "₹28 - ₹48 LPA",
    minCgpa: 7.5,
    maxBacklogs: 0,
    requiredSkills: ["Trees & Graphs", "Dynamic Programming", "AWS / Docker", "Leadership Principles (STAR)"],
    recommendedProjects: ["Cloud Resource Autoscaler", "High-Throughput Messaging Queue"],
    interviewRounds: ["Online Assessment (Debugging + 2 DSA)", "2 Technical Problem Solving", "Bar Raiser Interview"],
    hiringCycle: "Typical Campus Season",
  },
  {
    id: "tcs_digital",
    name: "TCS Digital / Prime",
    category: "Premier Campus Drive",
    logoText: "TCS-D",
    packageRange: "₹9 - ₹14 LPA",
    minCgpa: 7.0,
    maxBacklogs: 0,
    requiredSkills: ["Java / Python", "Object-Oriented Programming", "DBMS & SQL", "Aptitude & Speed"],
    recommendedProjects: ["Full-Stack Student Management System", "Automated Query Optimization"],
    interviewRounds: ["NQT Digital Advanced Coding", "Technical Interview (Core CS)", "HR & Managerial"],
    hiringCycle: "National Qualifier (NQT)",
  },
  {
    id: "swiggy",
    name: "Swiggy / Consumer Tech",
    category: "Fintech Unicorn",
    logoText: "SWIG",
    packageRange: "₹18 - ₹30 LPA",
    minCgpa: 7.0,
    maxBacklogs: 0,
    requiredSkills: ["Full Stack Architecture", "REST & GraphQL", "Kafka / Message Queues", "State Management"],
    recommendedProjects: ["Geo-Distributed Tracking API", "Low-Latency Order Engine"],
    interviewRounds: ["Live Machine Coding", "DSA Problem Solving", "Engineering Manager Round"],
    hiringCycle: "Campus & Off-Campus",
  },
  {
    id: "salesforce",
    name: "Salesforce / Enterprise",
    category: "Enterprise Cloud",
    logoText: "CRM",
    packageRange: "₹24 - ₹42 LPA",
    minCgpa: 7.5,
    maxBacklogs: 0,
    requiredSkills: ["Cloud Architecture", "Database Internals", "Security & Auth", "API Design"],
    recommendedProjects: ["Multi-Tenant RBAC Authorization API", "Enterprise Audit Log Pipeline"],
    interviewRounds: ["HackerRank Coding", "System Design & OOP", "Values & Culture"],
    hiringCycle: "Typical Campus Season",
  },
];

export const CompanyPlacementRadar: React.FC<CompanyPlacementRadarProps> = ({
  profile,
  predictionChance,
  onLaunchMockInterview,
  onAskCoach,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("razorpay");
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const hasConfiguredProfile =
    Number(profile.cgpa) > 0 && Boolean(String(profile.branch || "").trim());
  const studentCgpa = Number(profile.cgpa) || 0;
  const studentBacklogs = Number(profile.backlogs ?? profile.activeBacklogs ?? 0);
  const rawCoding = Number(profile.coding ?? 0);
  const studentCodingPct = rawCoding <= 10 ? rawCoding * 10 : Math.min(100, rawCoding);
  const studentInternships = Number(profile.internships) || 0;
  const hasGithubProof = Boolean((profile.githubUrl || profile.codingProfiles?.github || "").trim());
  const hasLeetcodeProof = Boolean((profile.leetcodeUrl || profile.codingProfiles?.leetcode || "").trim());

  const calculateCompatibility = (comp: CompanyBenchmark): number | null => {
    if (!hasConfiguredProfile) return null;
    let score = 38;

    if (studentCgpa >= comp.minCgpa) {
      const extraCgpa = Math.min(studentCgpa - comp.minCgpa, 2.0);
      score += 12 + extraCgpa * 4;
    } else {
      score -= (comp.minCgpa - studentCgpa) * 18;
    }

    if (studentBacklogs === 0) {
      score += 8;
    } else {
      score -= studentBacklogs * 22;
    }

    score += (studentCodingPct / 100) * 16;

    const effectiveInternships = Math.min(studentInternships, hasGithubProof ? 3 : 2);
    if (effectiveInternships > 0) {
      score += effectiveInternships * (hasGithubProof ? 4 : 2.5);
    }

    if (hasGithubProof) score += 5;
    else score -= 6;
    if (hasLeetcodeProof) score += 3;

    score += ((predictionChance ?? 0) / 100) * 10;

    return Math.max(15, Math.min(91, Math.round(score)));
  };

  const getStatusLabel = (score: number | null, comp: CompanyBenchmark) => {
    if (score === null) return "Awaiting Profile Input";
    if (studentBacklogs > comp.maxBacklogs) return "Backlog clearance needed";
    if (studentCgpa < comp.minCgpa) return `CGPA gap (<${comp.minCgpa})`;
    if (score >= 80) return "High match · Ready for drives";
    return "Competitive · Practice recommended";
  };

  const filteredBenchmarks = BENCHMARKS.filter(
    (b) => filterCategory === "All" || b.category === filterCategory
  );

  const selectedCompany = BENCHMARKS.find((b) => b.id === selectedCompanyId) || BENCHMARKS[0];
  const selectedScore = calculateCompatibility(selectedCompany);
  const selectedStatusLabel = getStatusLabel(selectedScore, selectedCompany);

  return (
    <SpotlightSurface className="rounded-2xl p-8 sm:p-10">
      {/* Compact Filter Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs font-medium text-[#A1A1AA]">
            Industry Reference Benchmarks
          </span>
          <span className="rounded-md border border-white/[0.1] bg-[#121216] px-2.5 py-0.5 font-mono text-[10px] text-[#D4D4D8] tabular-nums">
            Illustrative reference ranges, not dataset values · {filteredBenchmarks.length} firms
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {["All", "Tier-1 MAANG", "Fintech Unicorn", "Premier Campus Drive"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`h-9 shrink-0 rounded-lg border px-4 text-xs font-medium transition-colors duration-150 ${filterCategory === cat
                ? "border-white/[0.28] bg-[#18181E] text-[#FAFAFA]"
                : "border-white/[0.07] bg-[#0E0E12] text-[#A1A1AA] hover:border-white/[0.16] hover:text-[#FAFAFA]"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Spacious 12-Col Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left 5 cols: Recruiter Selector List */}
        <div className="min-w-0 space-y-3.5 lg:col-span-5">
          <div className="flex items-center justify-between px-1 font-mono text-[11px] text-[#8A8A92]">
            <span>Target Recruiter</span>
            <span>Match Estimate</span>
          </div>

          <div className="space-y-3.5">
            {filteredBenchmarks.map((comp) => {
              const compScore = calculateCompatibility(comp);
              const isSelected = comp.id === selectedCompanyId;

              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(comp.id)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border p-4.5 text-left transition-colors duration-150 ${isSelected
                    ? "border-white/[0.28] bg-[#18181F] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "border-white/[0.07] bg-[#0E0E12]/90 hover:border-white/[0.16] hover:bg-[#131319]"
                    }`}
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-[#08080A] font-mono text-[11px] font-semibold text-[#FAFAFA] tabular-nums">
                      {comp.logoText}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#FAFAFA]">{comp.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
                        <span className="font-mono text-[#D4D4D8] tabular-nums">
                          {comp.packageRange}
                        </span>
                        <span className="text-[#8A8A92]">·</span>
                        <span className="font-mono tabular-nums">Min {comp.minCgpa} CGPA</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="font-mono text-base font-semibold text-[#FAFAFA] tabular-nums">
                      {compScore !== null ? `${compScore}%` : "—"}
                    </div>
                    <div className="text-[10px] text-[#8A8A92]">Estimate</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 7 cols: Deep Dive Benchmark Diagnostic */}
        <div className="pf-subpanel flex min-w-0 flex-col justify-between rounded-2xl p-6 sm:p-8 lg:col-span-7">
          <div>
            <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-md border border-white/[0.1] bg-[#141418] px-2.5 py-0.5 font-mono text-[10px] text-[#D4D4D8]">
                    {selectedCompany.category}
                  </span>
                  <span className="text-xs text-[#A1A1AA]">
                    Typical Cycle:{" "}
                    <strong className="font-medium text-[#FAFAFA]">
                      {selectedCompany.hiringCycle}
                    </strong>
                  </span>
                </div>
                <h3 className="mt-2.5 text-2xl font-semibold tracking-[-0.025em] text-[#FAFAFA]">
                  {selectedCompany.name}
                </h3>
              </div>

              <span className="inline-flex h-9 shrink-0 items-center rounded-lg border border-white/[0.1] bg-[#141418] px-3.5 text-xs font-medium text-[#FAFAFA]">
                {selectedStatusLabel}
              </span>
            </div>

            {/* Score & Progress Metric Tiles */}
            <div className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="min-w-0 rounded-xl border border-white/[0.07] bg-black/45 p-4">
                <span className="text-xs text-[#A1A1AA]">Match Score Estimate</span>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                    {selectedScore !== null ? `${selectedScore}%` : "—"}
                  </span>
                  <span className="text-xs text-[#8A8A92]">Estimate</span>
                </div>
                <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-[#FAFAFA] transition-[width] duration-500"
                    style={{ width: `${selectedScore ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="min-w-0 rounded-xl border border-white/[0.07] bg-black/45 p-4">
                <span className="text-xs text-[#A1A1AA]">Reference CTC Band</span>
                <div className="mt-2 font-mono text-lg font-semibold text-[#FAFAFA] tabular-nums">
                  {selectedCompany.packageRange}
                </div>
                <div className="mt-2 text-[11px] text-[#8A8A92]">
                  Illustrative reference range, not dataset values
                </div>
              </div>

              <div className="min-w-0 rounded-xl border border-white/[0.07] bg-black/45 p-4">
                <span className="text-xs text-[#A1A1AA]">Reference CGPA Cutoff</span>
                <div className="mt-2 flex items-center gap-2 font-mono text-base font-semibold text-[#FAFAFA] tabular-nums">
                  <span>{selectedCompany.minCgpa}+ CGPA</span>
                  <span className="text-[11px] font-normal text-[#A1A1AA]">
                    (You: {studentCgpa > 0 ? studentCgpa : "Not set"})
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-[#8A8A92]">
                  {!hasConfiguredProfile
                    ? "Profile not configured"
                    : studentBacklogs === 0
                      ? "0 Active Backlogs"
                      : `${studentBacklogs} Active Backlog(s)`}
                </div>
              </div>
            </div>

            {/* Core Interview Evaluation Focus */}
            <div className="mt-7 space-y-6">
              <div>
                <span className="text-xs font-medium text-[#D4D4D8]">
                  Core Evaluation Topics &amp; Skills
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCompany.requiredSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-white/[0.08] bg-black/45 px-3 py-1.5 text-xs font-medium text-[#FAFAFA]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-[#D4D4D8]">
                  Standard Interview Pipeline
                </span>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {selectedCompany.interviewRounds.map((rnd, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/[0.07] bg-black/45 p-4 text-xs text-[#A1A1AA]"
                    >
                      <span className="font-mono text-[10px] text-[#8A8A92] tabular-nums">
                        Round {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="mt-1.5 font-medium text-[#FAFAFA]">{rnd}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-[#D4D4D8]">
                  Resume Differentiating Projects
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCompany.recommendedProjects.map((proj, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-white/[0.1] bg-black/45 px-3 py-1.5 text-xs font-medium text-[#FAFAFA]"
                    >
                      {proj}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Spacious Action Footer */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-6 sm:flex-row">
            <span className="text-center text-xs text-[#A1A1AA] sm:text-left">
              Simulate {selectedCompany.name}'s technical questions with your AI mentor.
            </span>

            <div className="flex w-full items-center gap-3 sm:w-auto">
              {onAskCoach && (
                <button
                  type="button"
                  onClick={() =>
                    onAskCoach(
                      `How do I crack ${selectedCompany.name} campus drive with my profile (CGPA: ${studentCgpa > 0 ? studentCgpa : "not set yet"}, Backlogs: ${studentBacklogs})? Give me a 4-week preparation strategy.`
                    )
                  }
                  className="pf-btn-secondary inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-xs font-medium sm:w-auto cursor-pointer"
                >
                  Ask DAS Strategy
                </button>
              )}

              {onLaunchMockInterview && (
                <button
                  type="button"
                  onClick={() =>
                    onLaunchMockInterview(selectedCompany.name, selectedCompany.requiredSkills[0])
                  }
                  className="pf-btn-primary inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-xs font-medium active:scale-[0.98] sm:w-auto cursor-pointer"
                >
                  Start Mock Interview
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </SpotlightSurface>
  );
};
