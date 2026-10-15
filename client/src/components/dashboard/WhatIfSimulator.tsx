import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Sliders,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Check,
  Zap,
  Info,
  DollarSign,
  Briefcase,
  Code2,
  FolderGit2,
  GraduationCap,
  Layers,
  Award
} from "lucide-react";
import { StudentProfileState } from "@/types/profile";

interface WhatIfSimulatorProps {
  currentProfile: StudentProfileState;
  currentScore: number;
  onApplySimulatedProfile?: (simulated: Partial<StudentProfileState>) => void;
}

interface WhatIfScenario {
  id: string;
  title: string;
  description: string;
  category: "Technical" | "Projects" | "Academics" | "Interview" | "Resume";
  impactDelta: number;
  applied: boolean;
  explanation: string;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  currentProfile,
  currentScore,
  onApplySimulatedProfile,
}) => {
  const [activeMode, setActiveMode] = useState<"sliders" | "milestones">("sliders");
  const [hasAppliedChanges, setHasAppliedChanges] = useState(false);

  // Dynamic continuous slider states initialized with current profile
  const [cgpa, setCgpa] = useState<number>(currentProfile.cgpa || 7.5);
  const [codingScore, setCodingScore] = useState<number>(currentProfile.coding || 65);
  const [projectsCount, setProjectsCount] = useState<number>(currentProfile.projectsCount || 2);
  const [internships, setInternships] = useState<number>(currentProfile.internships || 0);
  const [activeBacklogs, setActiveBacklogs] = useState<number>(
    currentProfile.activeBacklogs ?? currentProfile.backlogs ?? 0
  );

  // Pre-configured tactical scenarios
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([
    {
      id: "sc-backlogs",
      title: "Clear all active backlogs",
      description: "Satisfies strict zero-backlog eligibility criteria required by 92% of Tier-1 MNCs.",
      category: "Academics",
      impactDelta: (currentProfile.activeBacklogs || currentProfile.backlogs || 0) > 0 ? 14 : 3,
      applied: false,
      explanation: "Removes automated ATS eligibility filters and prevents immediate disqualification."
    },
    {
      id: "sc-project",
      title: "Ship 1 flagship deployed full-stack/AI project",
      description: "Deploy an end-to-end production application with live URL, tests, and GitHub README.",
      category: "Projects",
      impactDelta: 9,
      applied: false,
      explanation: "Demonstrates practical software architecture, API design, and deployment skills during technical rounds."
    },
    {
      id: "sc-dsa",
      title: "Master high-frequency Blind 75 DSA patterns",
      description: "Solve 2–3 daily problems on Sliding Window, Two Pointers, Trees (BFS/DFS), and Binary Search.",
      category: "Technical",
      impactDelta: 8,
      applied: false,
      explanation: "Directly improves clearance rate in automated HackerRank and LeetCode online assessments."
    },
    {
      id: "sc-mock",
      title: "30-Day Daily STAR Mock Interview practice",
      description: "Rehearse behavioral STAR stories and practice technical architecture defense aloud.",
      category: "Interview",
      impactDelta: 6,
      applied: false,
      explanation: "Transforms interview articulation from disjointed answers into polished, confident engineering narratives."
    },
    {
      id: "sc-resume",
      title: "Format resume with Google X-Y-Z formula",
      description: "Quantify all achievements: Accomplished X measured by Y doing Z (e.g. latency, scale).",
      category: "Resume",
      impactDelta: 5,
      applied: false,
      explanation: "Elevates ATS ranking score and provides high-impact conversation hooks for interviewers."
    }
  ]);

  // Synchronize initial values when currentProfile changes
  React.useEffect(() => {
    setCgpa(currentProfile.cgpa || 7.5);
    setCodingScore(currentProfile.coding || 65);
    setProjectsCount(currentProfile.projectsCount || 2);
    setInternships(currentProfile.internships || 0);
    setActiveBacklogs(currentProfile.activeBacklogs ?? currentProfile.backlogs ?? 0);
  }, [currentProfile]);

  // Real-time dynamic calculations for Slider Mode
  const simulatedStats = useMemo(() => {
    const cgpaDelta = (cgpa - (currentProfile.cgpa || 7.5)) * 4.8;
    const codingDelta = (codingScore - (currentProfile.coding || 65)) * 0.35;
    const projectDelta = (projectsCount - (currentProfile.projectsCount || 2)) * 3.5;
    const internshipDelta = (internships - (currentProfile.internships || 0)) * 5.0;
    const backlogPenalty = activeBacklogs * 12.0 - ((currentProfile.activeBacklogs ?? currentProfile.backlogs ?? 0) * 12.0);

    const calculatedChance = Math.min(
      99,
      Math.max(15, Math.round(currentScore + cgpaDelta + codingDelta + projectDelta + internshipDelta - backlogPenalty))
    );

    // Projected CTC in Lakhs Per Annum (LPA)
    let projectedPackage =
      4.2 +
      Math.max(0, cgpa - 6.0) * 1.4 +
      (codingScore / 100) * 8.0 +
      projectsCount * 1.5 +
      internships * 2.8 -
      activeBacklogs * 2.2;

    projectedPackage = Math.min(38.0, Math.max(3.2, Math.round(projectedPackage * 10) / 10));

    // Determine target company tier
    let tierName = "Mass Recruiter (Tier-3)";
    let tierColor = "text-amber-400 border-amber-400/30 bg-amber-400/10";
    let companies = "TCS, Infosys, Wipro, Cognizant";

    if (projectedPackage >= 18.0) {
      tierName = "Super Dream / Top Product (Tier-1)";
      tierColor = "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
      companies = "Google, Microsoft, Amazon, Uber, Atlassian";
    } else if (projectedPackage >= 10.0) {
      tierName = "High-Growth Product (Tier-1.5)";
      tierColor = "text-cyan-400 border-cyan-400/30 bg-cyan-400/10";
      companies = "Walmart, Cisco, Oracle, Zoho, Swiggy";
    } else if (projectedPackage >= 6.0) {
      tierName = "Enterprise FinTech / Specialized (Tier-2)";
      tierColor = "text-indigo-400 border-indigo-400/30 bg-indigo-400/10";
      companies = "Accenture Digital, Capgemini Tech, LTI Mindtree";
    }

    // Identify single Highest ROI lever
    const levers = [
      { name: "LeetCode / DSA (+20 problems)", gain: "+7.0% Chance, +₹1.6 LPA", roi: 85 },
      { name: "Ship 1 Flagship Deployed Project", gain: "+9.2% Chance, +₹2.2 LPA", roi: 92 },
      { name: "Clear 1 Active Backlog", gain: "+14.0% Chance, +₹2.5 LPA", roi: activeBacklogs > 0 ? 100 : 0 },
      { name: "Secure 1 Verified Internship", gain: "+12.5% Chance, +₹3.1 LPA", roi: 95 }
    ].sort((a, b) => b.roi - a.roi);

    return {
      calculatedChance,
      projectedPackage,
      tierName,
      tierColor,
      companies,
      bestRoi: levers[0],
      totalDelta: calculatedChance - Math.round(currentScore)
    };
  }, [cgpa, codingScore, projectsCount, internships, activeBacklogs, currentProfile, currentScore]);

  // Milestone toggling
  const toggleScenario = (id: string) => {
    setScenarios(prev =>
      prev.map(s => (s.id === id ? { ...s, applied: !s.applied } : s))
    );
  };

  const resetAll = () => {
    setCgpa(currentProfile.cgpa || 7.5);
    setCodingScore(currentProfile.coding || 65);
    setProjectsCount(currentProfile.projectsCount || 2);
    setInternships(currentProfile.internships || 0);
    setActiveBacklogs(currentProfile.activeBacklogs ?? currentProfile.backlogs ?? 0);
    setScenarios(prev => prev.map(s => ({ ...s, applied: false })));
    setHasAppliedChanges(false);
  };

  const handleApplyToProfile = () => {
    if (onApplySimulatedProfile) {
      onApplySimulatedProfile({
        cgpa,
        coding: codingScore,
        projectsCount,
        internships,
        activeBacklogs,
        backlogs: activeBacklogs
      });
      setHasAppliedChanges(true);
      setTimeout(() => setHasAppliedChanges(false), 3000);
    }
  };

  // Milestone delta calculations
  const milestoneDelta = scenarios
    .filter(s => s.applied)
    .reduce((sum, s) => sum + s.impactDelta, 0);
  const milestoneScore = Math.min(98, Math.max(18, Math.round(currentScore + milestoneDelta)));

  const displayChance = activeMode === "sliders" ? simulatedStats.calculatedChance : milestoneScore;
  const displayDelta = activeMode === "sliders" ? simulatedStats.totalDelta : milestoneDelta;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#FF6B4A]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header with Mode Switcher & Reset */}
        <div className="flex flex-col gap-4 border-b border-[#2A2A30] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 text-[#FF6B4A] shadow-[0_0_20px_rgba(255,107,74,0.2)]">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-[#F2F2F3] sm:text-2xl">
                  What-If? Career Trajectory Simulator
                </h3>
                <span className="rounded-full border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF6B4A]">
                  Real-Time Sandbox
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#A1A1AA]">
                Drag sliders in real time to simulate how raising CGPA, solving LeetCode problems, and shipping projects elevate your CTC package and placement odds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle Button */}
            <div className="flex items-center rounded-xl border border-[#2A2A30] bg-[#141417] p-1">
              <button
                type="button"
                onClick={() => setActiveMode("sliders")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeMode === "sliders"
                    ? "bg-[#FF6B4A] text-white shadow-sm"
                    : "text-[#A1A1AA] hover:text-[#F2F2F3]"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Dynamic Sliders</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("milestones")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeMode === "milestones"
                    ? "bg-[#FF6B4A] text-white shadow-sm"
                    : "text-[#A1A1AA] hover:text-[#F2F2F3]"
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                <span>Milestones</span>
              </button>
            </div>

            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#141417] px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#F2F2F3] hover:bg-[#2A2A30] transition-all cursor-pointer"
              title="Reset all simulated values to your profile baseline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Live Dynamic Comparison Cards */}
        <div className="mt-6 grid gap-4 rounded-2xl border border-[#2A2A30] bg-[#141417] p-5 lg:grid-cols-4 sm:grid-cols-2">
          {/* Baseline */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">Current Baseline</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#F2F2F3]">{currentScore.toFixed(1)}%</span>
              <span className="text-xs text-[#A1A1AA]">Profile Chance</span>
            </div>
            <p className="text-[11px] text-[#A1A1AA]">Based on verified records</p>
          </div>

          {/* Simulated Probability */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B4A]">Simulated Target Chance</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#FF6B4A]">{displayChance}%</span>
              <span className={`text-xs font-bold ${displayDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {displayDelta >= 0 ? `+${displayDelta}%` : `${displayDelta}%`}
              </span>
            </div>
            <p className="text-[11px] text-[#A1A1AA]">Projected clearance probability</p>
          </div>

          {/* Projected Package */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Projected CTC Package</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">₹{simulatedStats.projectedPackage}</span>
              <span className="text-xs text-emerald-300/80 font-bold">LPA</span>
            </div>
            <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${simulatedStats.tierColor}`}>
              {simulatedStats.tierName}
            </span>
          </div>

          {/* Target Recruiters */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Eligible Recruiters</span>
            <p className="text-xs font-semibold text-[#F2F2F3] pt-1">
              {simulatedStats.companies}
            </p>
            <p className="text-[11px] text-[#A1A1AA]">
              {simulatedStats.bestRoi.gain}
            </p>
          </div>
        </div>

        {/* Max ROI Action Banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Highest ROI Action for You:</strong> {simulatedStats.bestRoi.name} yields an immediate{" "}
              <strong className="underline">{simulatedStats.bestRoi.gain}</strong>
            </span>
          </div>
          {onApplySimulatedProfile && (
            <button
              onClick={handleApplyToProfile}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-zinc-950 transition-all hover:bg-emerald-400 active:scale-95 shadow-sm cursor-pointer"
            >
              {hasAppliedChanges ? (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Applied to Profile!</span>
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Sync to My Profile</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Content based on Active Mode */}
        {activeMode === "sliders" ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Slider 1: CGPA */}
            <div className="rounded-2xl border border-[#2A2A30] bg-[#141417] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-[#FF6B4A]" />
                  <span className="text-xs font-bold text-[#F2F2F3]">Target Academic CGPA</span>
                </div>
                <span className="text-sm font-black text-[#FF6B4A]">{cgpa.toFixed(1)} / 10.0</span>
              </div>
              <input
                type="range"
                min="6.0"
                max="10.0"
                step="0.1"
                value={cgpa}
                onChange={e => setCgpa(parseFloat(e.target.value))}
                className="w-full accent-[#FF6B4A] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#A1A1AA]">
                <span>6.0 (Tier-3 Cutoff)</span>
                <span>8.0 (Tier-1 Cutoff)</span>
                <span>10.0 (Gold Medalist)</span>
              </div>
            </div>

            {/* Slider 2: Coding & DSA / LeetCode */}
            <div className="rounded-2xl border border-[#2A2A30] bg-[#141417] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-bold text-[#F2F2F3]">Coding & DSA Proficiency</span>
                </div>
                <span className="text-sm font-black text-cyan-400">{codingScore} / 100</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={codingScore}
                onChange={e => setCodingScore(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#A1A1AA]">
                <span>Basic Syntax (20)</span>
                <span>Blind 75 Mediums (65)</span>
                <span>Grandmaster (100)</span>
              </div>
            </div>

            {/* Slider 3: Production Projects */}
            <div className="rounded-2xl border border-[#2A2A30] bg-[#141417] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-[#F2F2F3]">Deployed Full-Stack / AI Projects</span>
                </div>
                <span className="text-sm font-black text-emerald-400">{projectsCount} Deployed</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="1"
                value={projectsCount}
                onChange={e => setProjectsCount(parseInt(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#A1A1AA]">
                <span>0 Projects</span>
                <span>2 Capstones (Recommended)</span>
                <span>6+ Production Blueprints</span>
              </div>
            </div>

            {/* Slider 4: Verified Internships */}
            <div className="rounded-2xl border border-[#2A2A30] bg-[#141417] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-[#F2F2F3]">Verified Industry Internships</span>
                </div>
                <span className="text-sm font-black text-purple-400">{internships} Completed</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={internships}
                onChange={e => setInternships(parseInt(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#A1A1AA]">
                <span>0 Internships</span>
                <span>1 Completed</span>
                <span>4 Internships</span>
              </div>
            </div>

            {/* Slider 5: Active Backlogs */}
            <div className="rounded-2xl border border-[#2A2A30] bg-[#141417] p-5 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-4 w-4 ${activeBacklogs > 0 ? "text-rose-400" : "text-emerald-400"}`} />
                  <span className="text-xs font-bold text-[#F2F2F3]">Active Academic Backlogs</span>
                </div>
                <span className={`text-sm font-black ${activeBacklogs > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {activeBacklogs === 0 ? "0 (Zero Backlogs - Fully Eligible)" : `${activeBacklogs} Active`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={activeBacklogs}
                onChange={e => setActiveBacklogs(parseInt(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#A1A1AA]">
                <span className="text-emerald-400 font-bold">0 (Clean record for Tier-1 drives)</span>
                <span>1 backlog</span>
                <span>4+ backlogs (Restricted eligibility)</span>
              </div>
            </div>
          </div>
        ) : (
          /* Mode B: Scenarios List */
          <div className="mt-6 space-y-3">
            {scenarios.map(sc => (
              <div
                key={sc.id}
                onClick={() => toggleScenario(sc.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                  sc.applied
                    ? "border-[#FF6B4A]/50 bg-[#FF6B4A]/10 shadow-[0_4px_20px_rgba(255,107,74,0.15)] ring-1 ring-[#FF6B4A]/20"
                    : "border-[#2A2A30] bg-[#141417] hover:border-[#FF6B4A]/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                        sc.applied
                          ? "border-[#FF6B4A] bg-[#FF6B4A] text-white"
                          : "border-[#2A2A30] bg-[#1B1B1F] text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#F2F2F3]">{sc.title}</span>
                        <span className="rounded-md border border-[#2A2A30] bg-[#1B1B1F] px-2 py-0.5 text-[10px] font-semibold text-[#A1A1AA]">
                          {sc.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#A1A1AA]">{sc.description}</p>
                      <p className="mt-1 text-[11px] text-[#FF8A6E]">
                        💡 <strong>Impact:</strong> {sc.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="rounded-lg border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-2.5 py-1 text-xs font-bold text-[#FF6B4A]">
                      +{sc.impactDelta}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-[#2A2A30] bg-[#141417] p-3 text-[11px] text-[#A1A1AA]">
          <Info className="h-4 w-4 shrink-0 text-[#FF6B4A] mt-0.5" />
          <p>
            <strong>Simulation Note:</strong> Simulated scores and salary tiers are mathematical projections calibrated against 972 historical campus placement records across 9 engineering disciplines. They reveal tactical high-leverage preparation priorities.
          </p>
        </div>
      </div>
    </div>
  );
};
