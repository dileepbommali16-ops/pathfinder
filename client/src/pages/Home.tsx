import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardHeader, TabId } from "@/components/dashboard/DashboardHeader";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { ProfileEvaluator, StudentProfileState } from "@/components/dashboard/ProfileEvaluator";
import { SkillGapSection } from "@/components/dashboard/SkillGapSection";
import { RoadmapVisualizer, RoadmapData } from "@/components/dashboard/RoadmapVisualizer";
import { AICoachConsole, Message } from "@/components/dashboard/AICoachConsole";
import { CohortExplorer, CohortAnalyticsData } from "@/components/dashboard/CohortExplorer";
import { ResumeStudio, ResumeFeedbackData } from "@/components/dashboard/ResumeStudio";
import { LampLogin } from "@/components/auth/LampLogin";
import { Ambient3DBackground } from "@/components/dashboard/Ambient3DBackground";

// Base API URL: uses environment variable with fallback to FastAPI on 8000
const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:8000";
const API_BASE = rawApiBase.replace(/\/+$/, "");

const DEFAULT_PROFILE: StudentProfileState = {
  cgpa: 7.8,
  backlogs: 0,
  internships: 1,
  coding: 7,
  communication: 7,
  targetRole: "Software Development Engineer (SDE)",
  targetTier: "Product Companies / Tier-1 MNCs",
  branch: "CSE",
  graduationYear: 2026,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [profile, setProfile] = useState<StudentProfileState>(DEFAULT_PROFILE);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("logout") === "1") {
      localStorage.removeItem("pathfinder_user");
      return false;
    }
    if (params.get("username") || params.get("user") || params.get("demo") === "1") {
      return true;
    }
    return Boolean(localStorage.getItem("pathfinder_user"));
  });

  // Identity state: checks localStorage, URL, or Streamlit parent session
  const [username, setUsername] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pathfinder_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.username) return parsed.username;
        } catch {}
      }
    }
    return "Student";
  });

  const [email, setEmail] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pathfinder_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.email) return parsed.email;
        } catch {}
      }
    }
    return "candidate@pathfinder.ai";
  });

  useEffect(() => {
    // Read session parameters from window or URL query params if present
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("username") || params.get("user");
    const emailParam = params.get("email");
    if (userParam) {
      setUsername(userParam);
      setIsAuthenticated(true);
    }
    if (emailParam) setEmail(emailParam);

    // Initial calculations
    fetchPrediction(DEFAULT_PROFILE);
    fetchCohortAnalytics({ year: 2026, branch: "All", gender: "All", skill: "All" });
  }, []);

  const handleLogin = (user: { username: string; email: string }) => {
    setUsername(user.username);
    setEmail(user.email);
    setIsAuthenticated(true);
    localStorage.setItem("pathfinder_user", JSON.stringify(user));
  };

  // 1. Prediction State
  const [prediction, setPrediction] = useState<{
    chance: number;
    label: string;
    tone: "strong" | "steady" | "focus";
    strengths: string[];
    priorities: string[];
    breakdown: Record<string, number>;
  }>({
    chance: 78.5,
    label: "Strong Candidate Profile",
    tone: "strong",
    strengths: [
      "High Academic Distinction (CGPA 7.8/10)",
      "Clean Academic Record (0 Active Backlogs)",
      "Practical Engineering Exposure (1 Internship)",
      "Core Problem Solving Foundation (7/10)"
    ],
    priorities: [
      "Target Blind 75 DSA patterns to elevate screening clearance rate"
    ],
    breakdown: {
      academics: 78.0,
      coding_dsa: 70.0,
      communication: 70.0,
      experience: 35.0,
      eligibility: 100.0,
    }
  });
  const [isCalculating, setIsCalculating] = useState(false);

  const fetchPrediction = async (p: StudentProfileState) => {
    setIsCalculating(true);
    try {
      const payload = {
        cgpa: p.cgpa,
        backlogs: p.backlogs,
        internships: p.internships,
        communication: p.communication,
        coding: p.coding,
        target_role: p.targetRole,
        target_tier: p.targetTier,
        branch: p.branch,
        graduation_year: p.graduationYear,
      };

      const [predResp, skillResp] = await Promise.allSettled([
        fetch(`${API_BASE}/api/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        fetch(`${API_BASE}/api/skill-gap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      ]);

      if (predResp.status === "fulfilled" && predResp.value.ok) {
        const predData = await predResp.value.json();
        let combined = { ...predData };

        if (skillResp.status === "fulfilled" && skillResp.value.ok) {
          const skillData = await skillResp.value.json();
          combined = {
            ...combined,
            strengths: skillData.strengths?.length ? skillData.strengths : combined.strengths,
            priorities: skillData.priorities?.length ? skillData.priorities : combined.priorities,
            breakdown: {
              ...combined.breakdown,
              ...skillData.category_breakdown,
            },
          };
        }
        setPrediction(combined);
      } else {
        fallbackPredict(p);
      }
    } catch {
      fallbackPredict(p);
    } finally {
      setIsCalculating(false);
    }
  };

  const fallbackPredict = (p: StudentProfileState) => {
    const raw = p.cgpa * 5.2 + Math.max(0, 3 - p.backlogs) * 4 + Math.min(p.internships, 3) * 5 + p.communication * 2.2 + p.coding * 2.7 - Math.max(p.backlogs - 1, 0) * 5;
    const chance = Math.max(18, Math.min(96, Math.round(raw)));
    const tone = chance >= 75 ? "strong" : chance >= 55 ? "steady" : "focus";
    const label = chance >= 75 ? "Strong Candidate Profile" : chance >= 55 ? "Solid Foundation" : "Needs Focus & Acceleration";

    setPrediction({
      chance,
      label,
      tone,
      strengths: [
        `Academic CGPA ${p.cgpa.toFixed(1)}/10.0`,
        p.backlogs === 0 ? "Clean Academic Record (0 Backlogs)" : "Eligible for standard drives",
        p.internships > 0 ? `${p.internships} Practical Internship(s)` : "Active academic projects"
      ],
      priorities: [
        p.cgpa < 7.0 ? "Raise CGPA to >= 7.0 for top-tier cutoff" : "Maintain academic consistency",
        p.coding < 7 ? "Focus on high-frequency Blind 75 DSA patterns" : "Participate in timed mock rounds"
      ],
      breakdown: {
        academics: Math.round(p.cgpa * 10),
        coding_dsa: p.coding * 10,
        communication: p.communication * 10,
        experience: Math.min(100, p.internships * 35),
        eligibility: Math.max(0, 100 - p.backlogs * 25),
      }
    });
  };

  // 2. Roadmap State
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);

  const fetchRoadmap = async () => {
    setIsRoadmapLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/ai/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cgpa: profile.cgpa,
          backlogs: profile.backlogs,
          internships: profile.internships,
          communication: profile.communication,
          coding: profile.coding,
          target_role: profile.targetRole,
          target_tier: profile.targetTier,
          branch: profile.branch,
          graduation_year: profile.graduationYear,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setRoadmap(data);
      }
    } catch (err) {
      console.warn("Roadmap API error, using structured local plan", err);
    } finally {
      setIsRoadmapLoading(false);
    }
  };

  // 3. AI Coach Messages
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Pathfinder AI Career Agent powered by Gemini. I'm connected to your live candidate profile. Ask me anything in English, Telugu script, or Roman Telugu—placement cutoffs, mock interviews, 6-week roadmaps, skill gaps, or resume refinement!"
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendMessage = async (userText: string) => {
    const updatedMessages: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: updatedMessages.slice(-12).map(m => ({ role: m.role, content: m.content })),
          profile: {
            cgpa: profile.cgpa,
            backlogs: profile.backlogs,
            internships: profile.internships,
            communication: profile.communication,
            coding: profile.coding,
            target_role: profile.targetRole,
            target_tier: profile.targetTier,
            branch: profile.branch,
          }
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([...updatedMessages, {
          role: "assistant",
          content: "Focus on Blind 75 high-frequency patterns: Arrays/Strings (Sliding Window, Prefix Sum), Binary Search, Trees (BFS/DFS), and 0/1 Knapsack. Practice explaining solutions aloud using the STAR method."
        }]);
      }
    } catch {
      setMessages([...updatedMessages, {
        role: "assistant",
        content: "I'm right here with you! Key immediate steps: (1) Ensure CGPA >= 7.5 to clear top tier cutoffs, (2) Solve 2–3 Blind 75 LeetCode patterns daily, (3) Deploy one flagship full-stack/AI project with a live link and clean GitHub README."
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // 4. Cohort Analytics State
  const [cohortFilters, setCohortFilters] = useState({
    year: 2026,
    branch: "All",
    gender: "All",
    skill: "All"
  });
  const [cohortAnalytics, setCohortAnalytics] = useState<CohortAnalyticsData | null>(null);
  const [isSummarizingCohort, setIsSummarizingCohort] = useState(false);
  const [cohortInsight, setCohortInsight] = useState<{ headline: string; summary: string; actions: string[] } | null>(null);

  const fetchCohortAnalytics = async (f = cohortFilters) => {
    try {
      const q = new URLSearchParams({
        year: f.year.toString(),
        branch: f.branch,
        gender: f.gender,
        skill: f.skill
      });
      const resp = await fetch(`${API_BASE}/api/analytics?${q.toString()}`);
      if (resp.ok) {
        const data = await resp.json();
        setCohortAnalytics(data);
      }
    } catch (err) {
      console.warn("Analytics fetch error:", err);
    }
  };

  const handleSummarizeCohort = async () => {
    setIsSummarizingCohort(true);
    try {
      const q = new URLSearchParams({
        year: cohortFilters.year.toString(),
        branch: cohortFilters.branch,
        gender: cohortFilters.gender,
        skill: cohortFilters.skill
      });
      const resp = await fetch(`${API_BASE}/api/ai/cohort-insight?${q.toString()}`, { method: "POST" });
      if (resp.ok) {
        const data = await resp.json();
        setCohortInsight(data);
      }
    } catch (err) {
      console.warn("Cohort insight error:", err);
    } finally {
      setIsSummarizingCohort(false);
    }
  };

  // 5. Resume Feedback State
  const [resumeFeedback, setResumeFeedback] = useState<ResumeFeedbackData | null>(null);
  const [isAnalyzingResume, setIsAnalyzingResume] = useState(false);

  const handleAnalyzeResume = async (file: File | null, text: string) => {
    setIsAnalyzingResume(true);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      if (text) formData.append("resume_text", text);

      const resp = await fetch(`${API_BASE}/api/ai/resume`, {
        method: "POST",
        body: formData
      });
      if (resp.ok) {
        const data = await resp.json();
        setResumeFeedback(data);
      }
    } catch (err) {
      console.warn("Resume analysis warning:", err);
    } finally {
      setIsAnalyzingResume(false);
    }
  };

  // Downloads
  const handleDownloadCSV = () => {
    const q = new URLSearchParams({
      year: cohortFilters.year.toString(),
      branch: cohortFilters.branch,
      gender: cohortFilters.gender,
      skill: cohortFilters.skill
    });
    window.open(`${API_BASE}/api/export/csv?${q.toString()}`, "_blank");
  };

  const handleDownloadPDF = () => {
    const q = new URLSearchParams({
      year: cohortFilters.year.toString(),
      branch: cohortFilters.branch,
      gender: cohortFilters.gender,
      skill: cohortFilters.skill
    });
    window.open(`${API_BASE}/api/export/pdf?${q.toString()}`, "_blank");
  };

  // Logout: cleans state and returns to the Lamp Login screen
  const handleLogout = () => {
    localStorage.removeItem("pathfinder_user");
    setIsAuthenticated(false);
    try {
      window.parent.postMessage({ type: "PATHFINDER_LOGOUT" }, "*");
    } catch {
      // ignore
    }
  };

  if (!isAuthenticated) {
    return <LampLogin onLogin={handleLogin} />;
  }

  return (
    <div className="relative min-h-screen bg-[#05070e] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans overflow-x-hidden">
      {/* ================= PREMIUM AI STARTUP BACKGROUND SYSTEM ================= */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Deep Obsidian Foundation Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b16] via-[#05070f] to-[#03040a]" />

        {/* 3D Perspective Constellation, Floating Particles & Volumetric Orbs Layer */}
        <Ambient3DBackground />

        {/* Subtle Engineering Matrix Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.032]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 20%, black 30%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 20%, black 30%, transparent 85%)",
          }}
        />

        {/* Ambient Glow 1: Top Emerald/Teal Command Beam */}
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.75, 0.9, 0.75],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[160px] left-1/2 -translate-x-1/2 h-[520px] w-[980px] rounded-full blur-[120px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.13) 0%, rgba(6, 182, 212, 0.08) 45%, transparent 72%)",
          }}
        />

        {/* Ambient Glow 2: Left AI Neural Indigo/Violet Orb */}
        <motion.div
          animate={{
            y: [-12, 16, -12],
            opacity: [0.55, 0.75, 0.55],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[220px] -left-[180px] h-[660px] w-[660px] rounded-full blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.09) 0%, rgba(168, 85, 247, 0.045) 50%, transparent 70%)",
          }}
        />

        {/* Ambient Glow 3: Right Oceanic Cyan & Emerald Flare */}
        <motion.div
          animate={{
            y: [16, -14, 16],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[480px] -right-[160px] h-[600px] w-[600px] rounded-full blur-[130px]"
          style={{
            background:
              "radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, rgba(16, 185, 129, 0.045) 50%, transparent 70%)",
          }}
        />

        {/* Ambient Glow 4: Lower Foundation Depth Hue */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[1200px] rounded-full blur-[150px] opacity-45"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(30, 58, 138, 0.16) 0%, transparent 75%)",
          }}
        />

        {/* Ultra-subtle Horizontal Horizon Line */}
        <div className="absolute top-[320px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/12 to-transparent" />

        {/* Soft Vignette Border Falloff */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 95% 85% at 50% 50%, transparent 60%, rgba(3,4,10,0.65) 100%)",
          }}
        />
      </div>

      {/* Top Header */}
      <DashboardHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        username={username}
        email={email}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <AnimatePresence mode="wait">
          {/* TAB 1: READINESS OVERVIEW & PARAMETERS */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Hero KPI Metrics */}
              <HeroMetrics
                username={username}
                chance={prediction.chance}
                label={prediction.label}
                tone={prediction.tone}
                cgpa={profile.cgpa}
                backlogs={profile.backlogs}
                internships={profile.internships}
                coding={profile.coding}
                communication={profile.communication}
                onNavigateTab={setActiveTab}
              />

              {/* Sliders & Parameters */}
              <ProfileEvaluator
                profile={profile}
                onChange={(updated) => setProfile((prev) => ({ ...prev, ...updated }))}
                onCalculate={() => fetchPrediction(profile)}
                onReset={() => {
                  setProfile(DEFAULT_PROFILE);
                  fetchPrediction(DEFAULT_PROFILE);
                }}
                isCalculating={isCalculating}
              />

              {/* Skill-Gap & Strengths */}
              <SkillGapSection
                strengths={prediction.strengths}
                priorities={prediction.priorities}
                breakdown={prediction.breakdown}
                onAskCoach={(q) => {
                  setActiveTab("coach");
                  handleSendMessage(q);
                }}
              />
            </motion.div>
          )}

          {/* TAB 2: 6-WEEK AI CAREER ROADMAP */}
          {activeTab === "roadmap" && (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <RoadmapVisualizer
                roadmap={roadmap}
                isLoading={isRoadmapLoading}
                onRegenerate={fetchRoadmap}
              />
            </motion.div>
          )}

          {/* TAB 3: AI PLACEMENT COACH */}
          {activeTab === "coach" && (
            <motion.div
              key="coach"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <AICoachConsole
                messages={messages}
                onSendMessage={handleSendMessage}
                onClearChat={() => setMessages([])}
                isLoading={isChatLoading}
                targetRole={profile.targetRole}
              />
            </motion.div>
          )}

          {/* TAB 4: COHORT ANALYTICS & BENCHMARKS */}
          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <CohortExplorer
                analytics={cohortAnalytics}
                filters={cohortFilters}
                onFilterChange={(newFilters) => {
                  setCohortFilters(newFilters);
                  fetchCohortAnalytics(newFilters);
                }}
                onSummarizeAI={handleSummarizeCohort}
                isSummarizing={isSummarizingCohort}
                aiInsight={cohortInsight}
                onDownloadCSV={handleDownloadCSV}
                onDownloadPDF={handleDownloadPDF}
              />
            </motion.div>
          )}

          {/* TAB 5: ATS RESUME STUDIO */}
          {activeTab === "resume" && (
            <motion.div
              key="resume"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <ResumeStudio
                feedback={resumeFeedback}
                onAnalyze={handleAnalyzeResume}
                isLoading={isAnalyzingResume}
                onDownloadFeedbackPDF={handleDownloadPDF}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
