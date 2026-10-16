import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Award,
  ChevronRight,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
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
    hiringStatus: "Active Campus Drives"
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
    hiringStatus: "Active Campus Drives"
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
    hiringStatus: "Upcoming Q4"
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
    hiringStatus: "Active Campus Drives"
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
    hiringStatus: "Rolling Openings"
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
    hiringStatus: "Upcoming Q4"
  }
];

export const CompanyPlacementRadar: React.FC<CompanyPlacementRadarProps> = ({
  profile,
  predictionChance,
  onLaunchMockInterview,
  onAskCoach
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("razorpay");
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const studentCgpa = Number(profile.cgpa) || 7.5;
  const studentBacklogs = Number(profile.backlogs ?? profile.activeBacklogs ?? 0);
  const studentCoding = Number(profile.coding) || 75;
  const studentInternships = Number(profile.internships) || 0;

  // Dynamic compatibility calculation
  const calculateCompatibility = (comp: CompanyBenchmark) => {
    let score = 50;

    if (studentCgpa >= comp.minCgpa) {
      const extraCgpa = Math.min(studentCgpa - comp.minCgpa, 2.0);
      score += 15 + extraCgpa * 5;
    } else {
      score -= (comp.minCgpa - studentCgpa) * 18;
    }

    if (studentBacklogs === 0) {
      score += 10;
    } else {
      score -= studentBacklogs * 25;
    }

    score += (studentCoding / 100) * 15;

    if (studentInternships > 0) {
      score += Math.min(studentInternships * 5, 10);
    }

    score += (predictionChance / 100) * 10;

    return Math.max(18, Math.min(96, Math.round(score)));
  };

  const getStatusBadge = (score: number, comp: CompanyBenchmark) => {
    if (studentBacklogs > comp.maxBacklogs) {
      return {
        label: "Backlog Clearance Needed",
        color: "border-[#8c3a2e]/40 bg-[#8c3a2e]/15 text-[#8c3a2e]",
        icon: AlertCircle
      };
    }
    if (studentCgpa < comp.minCgpa) {
      return {
        label: `CGPA Gap (<${comp.minCgpa})`,
        color: "border-[#8c3a2e]/40 bg-[#8c3a2e]/15 text-[#8c3a2e]",
        icon: AlertCircle
      };
    }
    if (score >= 80) {
      return {
        label: "High Match · Ready for Drives",
        color: "border-[#c76f3b]/40 bg-[#c76f3b]/10 text-[#c76f3b] shadow-[0_0_12px_rgba(199,111,59,0.2)]",
        icon: CheckCircle2
      };
    }
    return {
      label: "Competitive · Interview Polish Needed",
      color: "border-[#b8673a]/40 bg-[#b8673a]/10 text-[#b8673a]",
      icon: Sparkles
    };
  };

  const filteredBenchmarks = BENCHMARKS.filter(
    (b) => filterCategory === "All" || b.category === filterCategory
  );

  const selectedCompany = BENCHMARKS.find((b) => b.id === selectedCompanyId) || BENCHMARKS[0];
  const selectedScore = calculateCompatibility(selectedCompany);
  const selectedStatus = getStatusBadge(selectedScore, selectedCompany);

  return (
    <div className="relative rounded-3xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Subtle Warm Copper & Rust Ambient Glow */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#c76f3b]/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#8c3a2e]/10 blur-[140px]" />

      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[rgba(234,230,224,0.08)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#c76f3b]/40 bg-[#c76f3b]/15 text-[#c76f3b] shadow-[0_0_12px_rgba(199,111,59,0.25)]">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#938e87]">
              Industry Placement Benchmark
            </span>
            <span className="rounded-full border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#c76f3b] shadow-sm">
              Live Hiring Matrix
            </span>
          </div>
          <h3 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-[#eae6e0] font-['Space_Grotesk']">
            Target Company Placement Radar
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-[#938e87] max-w-2xl leading-relaxed">
            Real-time hiring compatibility score mapped against historical drive cutoffs, interview rounds, and skill rubrics for Tier-1 engineering recruits.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {["All", "Tier-1 MAANG", "Fintech Unicorn", "Premier Campus Drive"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                filterCategory === cat
                  ? "border border-[#c76f3b] bg-[#c76f3b] text-[#eae6e0] font-bold shadow-[0_0_15px_rgba(199,111,59,0.3)]"
                  : "border border-[rgba(234,230,224,0.08)] bg-[#24222b]/50 text-[#938e87] hover:border-[#c76f3b]/50 hover:text-[#eae6e0]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout: Left Cards & Right Detailed Radar */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Company Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-[#938e87] px-1">
            <span>Target Recruiter</span>
            <span>Match Probability</span>
          </div>

          <div className="space-y-2.5">
            {filteredBenchmarks.map((comp) => {
              const compScore = calculateCompatibility(comp);
              const isSelected = comp.id === selectedCompanyId;

              return (
                <motion.div
                  key={comp.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedCompanyId(comp.id)}
                  className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-[#c76f3b]/70 bg-gradient-to-r from-[#24222b] to-[#1c1a22] shadow-[0_8px_25px_rgba(199,111,59,0.2)] ring-1 ring-[#c76f3b]/40"
                      : "border-[rgba(234,230,224,0.08)] bg-[#24222b]/40 hover:border-[#c76f3b]/40 hover:bg-[#292632]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c76f3b]/30 bg-[#141318] font-mono text-xs font-bold text-[#c76f3b] shadow-sm">
                      {comp.logoText}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#eae6e0] group-hover:text-[#c76f3b] transition-colors">
                          {comp.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[#938e87]">
                        <span className="font-semibold text-[#eae6e0]">{comp.packageRange}</span>
                        <span>•</span>
                        <span>Min {comp.minCgpa} CGPA</span>
                      </div>
                    </div>
                  </div>

                  {/* Score Pill */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-[#c76f3b]">
                        {compScore}%
                      </div>
                      <div className="text-[10px] text-[#938e87]">Readiness</div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "text-[#c76f3b] translate-x-0.5" : "text-[#938e87]"}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Dive Benchmark Diagnostic */}
        <div className="lg:col-span-7 rounded-2xl border border-[rgba(234,230,224,0.08)] bg-[#24222b]/60 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[rgba(234,230,224,0.08)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#c76f3b]">
                    {selectedCompany.category}
                  </span>
                  <span className="text-xs text-[#938e87]">
                    Drive Status: <strong className="text-[#eae6e0]">{selectedCompany.hiringStatus}</strong>
                  </span>
                </div>
                <h4 className="mt-1 text-2xl font-bold text-[#eae6e0] font-['Space_Grotesk']">
                  {selectedCompany.name}
                </h4>
              </div>

              {/* Status Pill */}
              <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${selectedStatus.color}`}>
                <selectedStatus.icon className="h-4 w-4" />
                <span>{selectedStatus.label}</span>
              </div>
            </div>

            {/* Score & Progress Metric */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-3.5">
                <span className="text-xs text-[#938e87]">Match Probability</span>
                <div className="mt-1 text-2xl font-bold font-mono text-[#c76f3b] flex items-baseline gap-1">
                  <span>{selectedScore}%</span>
                  <span className="text-xs text-[#938e87] font-normal">Score</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-[#141318] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#b8673a] via-[#c76f3b] to-[#d97d48] shadow-[0_0_10px_rgba(199,111,59,0.4)] transition-all duration-500"
                    style={{ width: `${selectedScore}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-3.5">
                <span className="text-xs text-[#938e87]">Package Compensation</span>
                <div className="mt-1 text-lg font-bold font-mono text-[#eae6e0]">
                  {selectedCompany.packageRange}
                </div>
                <div className="mt-1 text-[11px] text-[#938e87]">
                  Fixed Base + Stock Grants
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-3.5">
                <span className="text-xs text-[#938e87]">Academic Cutoff</span>
                <div className="mt-1 text-base font-semibold text-[#eae6e0] flex items-center gap-2">
                  <span>≥ {selectedCompany.minCgpa} CGPA</span>
                  <span className="text-[11px] font-medium text-[#938e87]">
                    (You: {studentCgpa})
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[#938e87]">
                  {studentBacklogs === 0 ? "0 Backlogs Cleared" : `${studentBacklogs} Active Backlog(s)`}
                </div>
              </div>
            </div>

            {/* Core Interview Evaluation Focus */}
            <div className="mt-5 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#eae6e0]">
                  Core Evaluation Topics & Skills
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCompany.requiredSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] px-2.5 py-1 text-xs font-medium text-[#eae6e0] shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#eae6e0]">
                  Standard Interview Pipeline
                </span>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedCompany.interviewRounds.map((rnd, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-2.5 text-xs text-[#938e87]"
                    >
                      <span className="text-[10px] font-bold uppercase text-[#c76f3b]">
                        Round {idx + 1}
                      </span>
                      <p className="mt-0.5 font-medium text-[#eae6e0]">{rnd}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#eae6e0]">
                  Resume Differentiating Projects (High Shortlist Rate)
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCompany.recommendedProjects.map((proj, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1.5 rounded-lg border border-[#c76f3b]/30 bg-[#1c1a22] px-2.5 py-1 text-xs font-medium text-[#eae6e0] shadow-sm"
                    >
                      <Sparkles className="h-3 w-3 text-[#c76f3b]" />
                      <span>{proj}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-6 pt-5 border-t border-[rgba(234,230,224,0.08)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#938e87] text-center sm:text-left">
              Simulate {selectedCompany.name}'s real technical questions directly with AI mentor.
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {onAskCoach && (
                <button
                  type="button"
                  onClick={() =>
                    onAskCoach(
                      `How do I crack ${selectedCompany.name} campus drive with my profile (CGPA: ${studentCgpa}, Backlogs: ${studentBacklogs})? Give me a 4-week preparation strategy.`
                    )
                  }
                  className="w-full sm:w-auto rounded-xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] hover:bg-[#24222b] hover:text-[#c76f3b] px-3.5 py-2 text-xs font-semibold text-[#eae6e0] transition-colors"
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
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-[#c76f3b] bg-gradient-to-r from-[#c76f3b] via-[#b8673a] to-[#a8582b] hover:from-[#b8673a] hover:to-[#9c4d23] px-4 py-2 text-xs font-bold text-[#eae6e0] shadow-[0_4px_20px_rgba(199,111,59,0.35)] transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 text-[#eae6e0]" />
                  <span>Start Mock Interview</span>
                  <ArrowRight className="h-3 w-3 text-[#eae6e0]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
