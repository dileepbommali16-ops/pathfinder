import React, { useState } from "react";
import { StudentProfileState } from "@/types/profile";

interface CompanyPlacementRadarProps {
  profile: StudentProfileState;
  predictionChance: number;
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
  hiringStatus: "Active Campus Drives" | "Upcoming Q4" | "Rolling Openings";
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
    hiringStatus: "Active Campus Drives",
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
    hiringStatus: "Active Campus Drives",
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
    hiringStatus: "Upcoming Q4",
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
    hiringStatus: "Active Campus Drives",
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
    hiringStatus: "Rolling Openings",
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
    hiringStatus: "Upcoming Q4",
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

  const studentCgpa = Number(profile.cgpa) || 7.5;
  const studentBacklogs = Number(profile.backlogs ?? profile.activeBacklogs ?? 0);
  const rawCoding = Number(profile.coding ?? 5);
  const studentCodingPct = rawCoding <= 10 ? rawCoding * 10 : Math.min(100, rawCoding);
  const studentInternships = Number(profile.internships) || 0;
  const hasGithubProof = Boolean((profile.githubUrl || profile.codingProfiles?.github || "").trim());
  const hasLeetcodeProof = Boolean((profile.leetcodeUrl || profile.codingProfiles?.leetcode || "").trim());

  const calculateCompatibility = (comp: CompanyBenchmark) => {
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

    score += (predictionChance / 100) * 10;

    return Math.max(15, Math.min(91, Math.round(score)));
  };

  const getStatusLabel = (score: number, comp: CompanyBenchmark) => {
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
    <div className="rounded-2xl border border-[#242429] bg-[#09090B]/64 p-6 backdrop-blur-[2px] sm:p-8">
      {/* Compact Filter Bar (No Duplicate Section Heading) */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-medium text-[#A1A1AA]">
            Target Recruiter Benchmarks
          </span>
          <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8] tabular-nums">
            {filteredBenchmarks.length} firms
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {["All", "Tier-1 MAANG", "Fintech Unicorn", "Premier Campus Drive"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`h-9 shrink-0 rounded-lg border px-3.5 text-xs font-medium transition-colors duration-150 ${
                filterCategory === cat
                  ? "border-[#FAFAFA]/40 bg-[#18181E] text-[#FAFAFA]"
                  : "border-[#222226] bg-[#101014] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout: Left Cards & Right Detailed Radar */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Company Cards */}
        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between px-1 font-mono text-[11px] text-[#71717A]">
            <span>Target Recruiter</span>
            <span>Match</span>
          </div>

          <div className="space-y-3">
            {filteredBenchmarks.map((comp) => {
              const compScore = calculateCompatibility(comp);
              const isSelected = comp.id === selectedCompanyId;

              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(comp.id)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-colors duration-150 ${
                    isSelected
                      ? "border-[#FAFAFA]/45 bg-[#18181E]"
                      : "border-[#222226] bg-[#101014]/90 hover:border-[#3F3F46] hover:bg-[#14141A]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg border border-[#27272A] bg-[#0B0B0E] font-mono text-[11px] font-semibold text-[#FAFAFA] tabular-nums">
                      {comp.logoText}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#FAFAFA]">{comp.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[#A1A1AA]">
                        <span className="font-mono text-[#D4D4D8] tabular-nums">
                          {comp.packageRange}
                        </span>
                        <span className="text-[#52525B]">·</span>
                        <span className="font-mono tabular-nums">Min {comp.minCgpa} CGPA</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-base font-semibold text-[#FAFAFA] tabular-nums">
                      {compScore}%
                    </div>
                    <div className="text-[10px] text-[#71717A]">Readiness</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Dive Benchmark Diagnostic */}
        <div className="flex flex-col justify-between rounded-xl border border-[#222226] bg-[#0D0D11]/92 p-6 sm:p-7 lg:col-span-7">
          <div>
            <div className="flex flex-col justify-between gap-3 border-b border-[#1F1F23] pb-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-[#27272A] bg-[#141418] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8]">
                    {selectedCompany.category}
                  </span>
                  <span className="text-xs text-[#A1A1AA]">
                    Drive Status:{" "}
                    <strong className="font-medium text-[#FAFAFA]">
                      {selectedCompany.hiringStatus}
                    </strong>
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#FAFAFA] sm:text-2xl">
                  {selectedCompany.name}
                </h3>
              </div>

              <span className="inline-flex h-8 shrink-0 items-center rounded-lg border border-[#27272A] bg-[#141418] px-3 text-xs font-medium text-[#FAFAFA]">
                {selectedStatusLabel}
              </span>
            </div>

            {/* Score & Progress Metric */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4">
                <span className="text-xs text-[#A1A1AA]">Match Probability</span>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                    {selectedScore}%
                  </span>
                  <span className="text-xs text-[#71717A]">Score</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-sm bg-[#18181B]">
                  <div
                    className="h-full bg-[#FAFAFA] transition-[width] duration-500"
                    style={{ width: `${selectedScore}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4">
                <span className="text-xs text-[#A1A1AA]">Package Compensation</span>
                <div className="mt-1.5 font-mono text-lg font-semibold text-[#FAFAFA] tabular-nums">
                  {selectedCompany.packageRange}
                </div>
                <div className="mt-1.5 text-[11px] text-[#71717A]">Fixed Base + Stock Grants</div>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4">
                <span className="text-xs text-[#A1A1AA]">Academic Cutoff</span>
                <div className="mt-1.5 flex items-center gap-2 font-mono text-base font-semibold text-[#FAFAFA] tabular-nums">
                  <span>{selectedCompany.minCgpa}+ CGPA</span>
                  <span className="text-[11px] font-normal text-[#A1A1AA]">
                    (You: {studentCgpa})
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-[#71717A]">
                  {studentBacklogs === 0
                    ? "0 Backlogs Cleared"
                    : `${studentBacklogs} Active Backlog(s)`}
                </div>
              </div>
            </div>

            {/* Core Interview Evaluation Focus */}
            <div className="mt-6 space-y-5">
              <div>
                <span className="text-xs font-medium text-[#D4D4D8]">
                  Core Evaluation Topics &amp; Skills
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {selectedCompany.requiredSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-[#222226] bg-[#101014] px-2.5 py-1 text-xs font-medium text-[#FAFAFA]"
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
                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {selectedCompany.interviewRounds.map((rnd, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#222226] bg-[#101014] p-3 text-xs text-[#A1A1AA]"
                    >
                      <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                        Round {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="mt-1 font-medium text-[#FAFAFA]">{rnd}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-[#D4D4D8]">
                  Resume Differentiating Projects
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {selectedCompany.recommendedProjects.map((proj, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-[#27272A] bg-[#101014] px-2.5 py-1 text-xs font-medium text-[#FAFAFA]"
                    >
                      {proj}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-[#1F1F23] pt-5 sm:flex-row">
            <span className="text-center text-xs text-[#A1A1AA] sm:text-left">
              Simulate {selectedCompany.name}'s technical questions with your AI mentor.
            </span>

            <div className="flex w-full items-center gap-2.5 sm:w-auto">
              {onAskCoach && (
                <button
                  type="button"
                  onClick={() =>
                    onAskCoach(
                      `How do I crack ${selectedCompany.name} campus drive with my profile (CGPA: ${studentCgpa}, Backlogs: ${studentBacklogs})? Give me a 4-week preparation strategy.`
                    )
                  }
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#27272A] bg-[#101014] px-4 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] sm:w-auto cursor-pointer"
                >
                  Ask Coach Strategy
                </button>
              )}

              {onLaunchMockInterview && (
                <button
                  type="button"
                  onClick={() =>
                    onLaunchMockInterview(selectedCompany.name, selectedCompany.requiredSkills[0])
                  }
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#FAFAFA] px-4 text-xs font-medium text-[#09090B] transition-colors duration-150 hover:bg-[#E4E4E7] active:scale-[0.98] sm:w-auto cursor-pointer"
                >
                  Start Mock Interview
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
