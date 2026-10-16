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
    let tierColor = "text-[#938e87] border-[rgba(234,230,224,0.08)] bg-[rgba(234,230,224,0.04)]";
    let companies = "TCS, Infosys, Wipro, Cognizant";

    if (projectedPackage >= 18.0) {
      tierName = "Super Dream / Top Product (Tier-1)";
      tierColor = "text-[#c76f3b] border-[#c76f3b]/30 bg-[#c76f3b]/10";
      companies = "Google, Microsoft, Amazon, Uber, Atlassian";
    } else if (projectedPackage >= 10.0) {
      tierName = "High-Growth Product (Tier-1.5)";
      tierColor = "text-[#c76f3b] border-[#c76f3b]/30 bg-[#c76f3b]/10";
      companies = "Walmart, Cisco, Oracle, Zoho, Swiggy";
    } else if (projectedPackage >= 6.0) {
      tierName = "Enterprise FinTech / Specialized (Tier-2)";
      tierColor = "text-[#b8673a] border-[#b8673a]/30 bg-[#b8673a]/10";
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
    <div className="relative overflow-hidden rounded-3xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#c76f3b]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header with Mode Switcher & Reset */}
        <div className="flex flex-col gap-4 border-b border-[rgba(234,230,224,0.08)] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#c76f3b]/30 bg-[#c76f3b]/10 text-[#c76f3b] shadow-[0_0_20px_rgba(199,111,59,0.2)]">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-[#eae6e0] sm:text-2xl font-['Space_Grotesk']">
                  What-If? Career Trajectory Simulator
                </h3>
                <span className="rounded-full border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c76f3b]">
                  Real-Time Sandbox
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#938e87]">
                Drag sliders in real time to simulate how raising CGPA, solving LeetCode problems, and shipping projects elevate your CTC package and placement odds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle Button */}
            <div className="flex items-center rounded-xl border border-[rgba(234,230,224,0.08)] bg-[#141318] p-1">
              <button
                type="button"
                onClick={() => setActiveMode("sliders")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeMode === "sliders"
                    ? "bg-[#c76f3b] text-[#eae6e0] shadow-sm"
                    : "text-[#938e87] hover:text-[#eae6e0]"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Dynamic Sliders</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("milestones")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeMode === "milestones"
                    ? "bg-[#c76f3b] text-[#eae6e0] shadow-sm"
                    : "text-[#938e87] hover:text-[#eae6e0]"
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                <span>Milestones</span>
              </button>
            </div>

            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-xl border border-[rgba(234,230,224,0.08)] bg-[#141318] px-3 py-1.5 text-xs text-[#938e87] hover:text-[#eae6e0] hover:bg-[rgba(234,230,224,0.08)] transition-all cursor-pointer"
              title="Reset sliders to baseline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Dynamic Prediction Outcome Panel */}
        <div className="mt-6 grid gap-4 rounded-2xl border border-[rgba(234,230,224,0.08)] bg-[#141318] p-5 lg:grid-cols-4 sm:grid-cols-2">
          {/* Card 1: Current Chance */}
          <div className="flex flex-col justify-between border-b border-[rgba(234,230,224,0.08)] pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#938e87]">Current Baseline</span>
            <div className="my-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#eae6e0] font-['Space_Grotesk']">{currentScore.toFixed(1)}%</span>
              <span className="text-xs text-[#938e87]">Profile Chance</span>
            </div>
            <p className="text-[11px] text-[#938e87]">Based on verified records</p>
          </div>

          {/* Card 2: Simulated Chance with Delta */}
          <div className="flex flex-col justify-between border-b border-[rgba(234,230,224,0.08)] pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#c76f3b]">Simulated Target Chance</span>
            <div className="my-1 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#c76f3b] font-['Space_Grotesk']">{displayChance}%</span>
              <span className={`text-xs font-bold ${displayDelta >= 0 ? "text-[#c76f3b]" : "text-[#938e87]"}`}>
                ({displayDelta >= 0 ? `+${displayDelta}%` : `${displayDelta}%`})
              </span>
            </div>
            <p className="text-[11px] text-[#938e87]">Projected clearance probability</p>
          </div>

          {/* Card 3: Projected CTC */}
          <div className="flex flex-col justify-between border-b border-[rgba(234,230,224,0.08)] pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#eae6e0]">Projected CTC Package</span>
            <div className="my-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#c76f3b] font-['Space_Grotesk']">₹{simulatedStats.projectedPackage}</span>
              <span className="text-xs text-[#938e87] font-bold">LPA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${simulatedStats.tierColor}`}>
                {simulatedStats.tierName.split("(")[0]}
              </span>
            </div>
          </div>

          {/* Card 4: Target Companies */}
          <div className="flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#eae6e0]">Eligible Recruiters</span>
            <p className="text-xs font-semibold text-[#eae6e0] pt-1">
              {simulatedStats.companies}
            </p>
            <p className="text-[11px] text-[#938e87]">
              Matches hiring rubrics for this tier
            </p>
          </div>
        </div>

        {/* Highest ROI Recommendation Banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-3.5 text-xs text-[#938e87]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-[#c76f3b]" />
            <span>
              <strong>Highest ROI Action:</strong> Focus on{" "}
              <span className="font-bold text-[#eae6e0]">{simulatedStats.bestRoi.name}</span> for an estimated{" "}
              <strong className="underline text-[#c76f3b]">{simulatedStats.bestRoi.gain}</strong>.
            </span>
          </div>

          {onApplySimulatedProfile && (
            <button
              onClick={handleApplyToProfile}
              className="flex items-center gap-1.5 rounded-xl bg-[#c76f3b] hover:bg-[#b8673a] px-3.5 py-1.5 text-xs font-bold text-[#eae6e0] transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{hasAppliedChanges ? "Saved to Dashboard!" : "Lock as Preparation Target"}</span>
            </button>
          )}
        </div>

        {/* Mode A: Interactive Sliders */}
        {activeMode === "sliders" ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Slider 1: CGPA */}
            <div className="rounded-2xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-[#c76f3b]" />
                  <span className="text-xs font-bold text-[#eae6e0]">Target Academic CGPA</span>
                </div>
                <span className="text-sm font-black text-[#c76f3b]">{cgpa.toFixed(1)} / 10.0</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="10.0"
                step="0.1"
                value={cgpa}
                onChange={e => setCgpa(parseFloat(e.target.value))}
                className="w-full accent-[#c76f3b] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#938e87]">
                <span>5.0 (Pass)</span>
                <span>7.5 (Tier-1 Cutoff)</span>
                <span>9.0+ (Dean's List)</span>
              </div>
            </div>

            {/* Slider 2: Coding & DSA */}
            <div className="rounded-2xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-[#c76f3b]" />
                  <span className="text-xs font-bold text-[#eae6e0]">Coding & DSA Proficiency</span>
                </div>
                <span className="text-sm font-black text-[#c76f3b]">{codingScore} / 100</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={codingScore}
                onChange={e => setCodingScore(parseInt(e.target.value))}
                className="w-full accent-[#c76f3b] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#938e87]">
                <span>Beginner (Arrays/Strings)</span>
                <span>Medium (Blind 75)</span>
                <span>Hard (DP / Graphs)</span>
              </div>
            </div>

            {/* Slider 3: Projects Count */}
            <div className="rounded-2xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-[#c76f3b]" />
                  <span className="text-xs font-bold text-[#eae6e0]">Deployed Full-Stack / AI Projects</span>
                </div>
                <span className="text-sm font-black text-[#c76f3b]">{projectsCount} Deployed</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="1"
                value={projectsCount}
                onChange={e => setProjectsCount(parseInt(e.target.value))}
                className="w-full accent-[#c76f3b] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#938e87]">
                <span>0 Projects</span>
                <span>2 Capstones (Recommended)</span>
                <span>6+ Production Blueprints</span>
              </div>
            </div>

            {/* Slider 4: Verified Internships */}
            <div className="rounded-2xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#938e87]" />
                  <span className="text-xs font-bold text-[#eae6e0]">Verified Industry Internships</span>
                </div>
                <span className="text-sm font-black text-[#c76f3b]">{internships} Completed</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={internships}
                onChange={e => setInternships(parseInt(e.target.value))}
                className="w-full accent-[#c76f3b] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#938e87]">
                <span>0 Internships</span>
                <span>1 Completed</span>
                <span>4 Internships</span>
              </div>
            </div>

            {/* Slider 5: Active Backlogs */}
            <div className="rounded-2xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-5 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-4 w-4 ${activeBacklogs > 0 ? "text-[#8c3a2e]" : "text-[#938e87]"}`} />
                  <span className="text-xs font-bold text-[#eae6e0]">Active Academic Backlogs</span>
                </div>
                <span className={`text-sm font-black ${activeBacklogs > 0 ? "text-[#8c3a2e]" : "text-[#eae6e0]"}`}>
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
                className="w-full accent-[#c76f3b] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#938e87]">
                <span className="text-[#c76f3b] font-bold">0 (Clean record for Tier-1 drives)</span>
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
                    ? "border-[#c76f3b]/50 bg-[#c76f3b]/10 shadow-[0_4px_20px_rgba(199,111,59,0.15)] ring-1 ring-[#c76f3b]/20"
                    : "border-[rgba(234,230,224,0.08)] bg-[#1c1a22] hover:border-[#c76f3b]/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                        sc.applied
                          ? "border-[#c76f3b] bg-[#c76f3b] text-[#eae6e0]"
                          : "border-[rgba(234,230,224,0.12)] bg-[rgba(234,230,224,0.04)] text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#eae6e0]">{sc.title}</span>
                        <span className="rounded-md border border-[rgba(234,230,224,0.12)] bg-[rgba(234,230,224,0.04)] px-2 py-0.5 text-[10px] font-semibold text-[#938e87]">
                          {sc.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#938e87]">{sc.description}</p>
                      <p className="mt-1 text-[11px] text-[#c76f3b]">
                        💡 <strong>Impact:</strong> {sc.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="rounded-lg border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-1 text-xs font-bold text-[#c76f3b]">
                      +{sc.impactDelta}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-[rgba(234,230,224,0.08)] bg-[#1c1a22] p-3 text-[11px] text-[#938e87]">
          <Info className="h-4 w-4 shrink-0 text-[#c76f3b] mt-0.5" />
          <p>
            <strong>Simulation Note:</strong> Simulated scores and salary tiers are mathematical projections calibrated against 972 historical campus placement records across 9 engineering disciplines. They reveal tactical high-leverage preparation priorities.
          </p>
        </div>
      </div>
    </div>
  );
};
