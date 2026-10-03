import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardHeader, TabId } from "@/components/dashboard/DashboardHeader";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { ProfileEvaluator } from "@/components/dashboard/ProfileEvaluator";
import { SkillGapSection } from "@/components/dashboard/SkillGapSection";
import { RoadmapVisualizer, RoadmapData } from "@/components/dashboard/RoadmapVisualizer";
import { AICoachConsole, Message } from "@/components/dashboard/AICoachConsole";
import { CohortExplorer, CohortAnalyticsData } from "@/components/dashboard/CohortExplorer";
import { ResumeStudio, ResumeFeedbackData } from "@/components/dashboard/ResumeStudio";
import { LampLogin } from "@/components/auth/LampLogin";
import { Ambient3DBackground } from "@/components/dashboard/Ambient3DBackground";
import { AIActionCenter } from "@/components/dashboard/AIActionCenter";
import { NextActionsWidget } from "@/components/dashboard/NextActionsWidget";
import { ProjectRecommender } from "@/components/dashboard/ProjectRecommender";
import { CareerDigitalTwin } from "@/components/dashboard/CareerDigitalTwin";
import { WhatIfSimulator } from "@/components/dashboard/WhatIfSimulator";
import { RoleIntelligence } from "@/components/dashboard/RoleIntelligence";
import { ProjectDefenseConsole } from "@/components/dashboard/ProjectDefenseConsole";
import { CareerMissionTracker } from "@/components/dashboard/CareerMissionTracker";
import { BranchIntelligence } from "@/components/dashboard/BranchIntelligence";
import { SkillIntelligence } from "@/components/dashboard/SkillIntelligence";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { OnboardingResultScreen } from "@/components/onboarding/OnboardingResultScreen";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { StudentProfileState, ReadinessAuditData, DEFAULT_STUDENT_PROFILE } from "@/types/profile";
import { getCareerAgentResponse } from "@/lib/careerAgent";
import { FALLBACK_COHORT_ANALYTICS } from "@/lib/fallbackData";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { getApiBase, API_BASE, fetchWithTimeout, api } from "@/lib/apiClient";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [profile, setProfile] = useState<StudentProfileState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pathfinder_profile_draft");
      if (saved) {
        try {
          return { ...DEFAULT_STUDENT_PROFILE, ...JSON.parse(saved) };
        } catch {}
      }
    }
    return DEFAULT_STUDENT_PROFILE;
  });

  const [auditResult, setAuditResult] = useState<ReadinessAuditData | null>(null);
  const [showResultScreen, setShowResultScreen] = useState<boolean>(false);

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

  // Identity state: checks localStorage, URL, or parent session
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

  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pathfinder_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.role) return parsed.role;
        } catch {}
      }
    }
    return "student";
  });

  const [isServerWakingUp, setIsServerWakingUp] = useState<boolean>(false);

  // Authentication session expiration listener (401 token revocation)
  useEffect(() => {
    const handleRemoteLogout = () => {
      setIsAuthenticated(false);
      setShowResultScreen(false);
      setUserRole("student");
    };
    window.addEventListener("pathfinder_logout", handleRemoteLogout);
    return () => window.removeEventListener("pathfinder_logout", handleRemoteLogout);
  }, []);

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
      "Core Problem Solving Foundation (7/10)",
    ],
    priorities: [
      "Target Blind 75 DSA patterns to elevate screening clearance rate",
    ],
    breakdown: {
      academics: 78.0,
      coding_dsa: 70.0,
      communication: 70.0,
      experience: 35.0,
      eligibility: 100.0,
    },
  });
  const [isCalculating, setIsCalculating] = useState(false);

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
    fetchPrediction(profile);
    fetchCohortAnalytics({ year: 2026, branch: "All", gender: "All", skill: "All" });

    // Health check & cold-start detector for Render free tier
    const coldTimer = setTimeout(() => setIsServerWakingUp(true), 2500);
    fetch(`${API_BASE}/api/health`)
      .then((res) => {
        if (res.ok) {
          clearTimeout(coldTimer);
          setIsServerWakingUp(false);
        }
      })
      .catch(() => setIsServerWakingUp(true));

    // Keep-alive ping every 3 minutes
    const keepAlive = setInterval(() => {
      fetch(`${API_BASE}/api/health`).catch(() => {});
    }, 180000);

    return () => {
      clearTimeout(coldTimer);
      clearInterval(keepAlive);
    };
  }, []);

  const handleLogin = async (user: {
    username: string;
    email: string;
    isNewUser?: boolean;
    bypassOnboarding?: boolean;
  }) => {
    setUsername(user.username);
    setEmail(user.email);
    setIsAuthenticated(true);

    try {
      const loginResp = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username, email: user.email }),
      }, 5000);
      if (loginResp.ok) {
        const authData = await loginResp.json();
        if (authData.token) {
          localStorage.setItem("pathfinder_token", authData.token);
          if (authData.user) {
            localStorage.setItem("pathfinder_user", JSON.stringify(authData.user));
            setUserRole(authData.user.role || "student");
          }
        }
      } else {
        localStorage.setItem("pathfinder_user", JSON.stringify(user));
      }
    } catch {
      localStorage.setItem("pathfinder_user", JSON.stringify(user));
    }


    if (user.isNewUser) {
      // Force onboarding wizard for newly registered candidates
      const freshProfile: StudentProfileState = {
        ...DEFAULT_STUDENT_PROFILE,
        fullName: user.username !== "Student" && user.username !== "New Student" ? user.username : "",
        onboardingCompleted: false,
        wizardStep: 1,
      };
      setProfile(freshProfile);
      setShowResultScreen(false);
      localStorage.removeItem("pathfinder_onboarding_draft");
      return;
    }

    if (user.bypassOnboarding) {
      // Pre-filled demo user: go straight to dashboard
      const demoProfile: StudentProfileState = {
        ...DEFAULT_STUDENT_PROFILE,
        fullName: user.username,
        onboardingCompleted: true,
        wizardStep: 5,
      };
      setProfile(demoProfile);
      setShowResultScreen(false);
      fetchPrediction(demoProfile);
      return;
    }

    // Returning user: check backend persisted profile
    try {
      const resp = await fetchWithTimeout(`${API_BASE}/api/profile?email=${encodeURIComponent(user.email)}`, {}, 3000);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.branch) {
          const mapped: StudentProfileState = {
            ...DEFAULT_STUDENT_PROFILE,
            ...data,
            onboardingCompleted: data.onboarding_completed ?? false,
            wizardStep: data.wizard_step ?? 1,
            cgpa: data.cgpa ?? 7.8,
            backlogs: data.backlogs ?? 0,
            internships: data.internships ?? 1,
            coding: data.coding ?? 7,
            communication: data.communication ?? 7,
            targetRole: data.target_role || DEFAULT_STUDENT_PROFILE.targetRole,
            targetTier: data.target_tier || DEFAULT_STUDENT_PROFILE.targetTier,
            branch: data.branch || DEFAULT_STUDENT_PROFILE.branch,
            graduationYear: data.graduation_year || 2026,
            fullName: data.full_name || user.username,
            college: data.college || "",
            course: data.course || "",
            yearSemester: data.year_semester || "",
            tenthPercentage: data.tenth_percentage ?? 90,
            twelfthPercentage: data.twelfth_percentage ?? 88,
            percentage: data.percentage ?? 74.1,
          };
          setProfile(mapped);
          if (!mapped.onboardingCompleted) {
            setShowResultScreen(false);
          } else {
            fetchPrediction(mapped);
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Could not retrieve backend profile on login:", err);
    }
  };

  const handleWizardComplete = (completedProfile: StudentProfileState, audit: ReadinessAuditData) => {
    setProfile(completedProfile);
    setAuditResult(audit);
    setShowResultScreen(true);
    setPrediction({
      chance: audit.chance,
      label: audit.label,
      tone: audit.tone,
      strengths: audit.strengths || [],
      priorities: audit.priorities || audit.gaps || [],
      breakdown: audit.breakdown || {},
    });
    localStorage.setItem("pathfinder_profile_draft", JSON.stringify(completedProfile));
  };

  const handleSaveProfile = async (updated: StudentProfileState) => {
    setProfile(updated);
    localStorage.setItem("pathfinder_profile_draft", JSON.stringify(updated));

    try {
      const payload = {
        email: email,
        full_name: updated.fullName,
        college: updated.college,
        branch: updated.branch,
        course: updated.course,
        year_semester: updated.yearSemester,
        tenth_percentage: updated.tenthPercentage,
        twelfth_percentage: updated.twelfthPercentage,
        cgpa: updated.cgpa,
        percentage: updated.percentage,
        semester_cgpas: updated.semesterCgpas,
        backlogs: updated.backlogs,
        history_of_backlogs: updated.historyOfBacklogs,
        skills: updated.skills,
        tools: updated.tools,
        languages: updated.languages,
        projects_count: updated.projectsCount,
        internships: updated.internships,
        certifications: updated.certifications,
        github_url: updated.githubUrl,
        leetcode_url: updated.leetcodeUrl,
        target_role: updated.targetRole,
        target_tier: updated.targetTier,
        target_domain: updated.targetDomain,
        preferred_location: updated.preferredLocation,
        expected_package: updated.expectedPackage,
        preferred_company_type: updated.preferredCompanyType,
        communication: updated.communication,
        coding: updated.coding,
        graduation_year: updated.graduationYear,
        onboarding_completed: true,
        wizard_step: 5,
      };

      await fetchWithTimeout(`${API_BASE}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }, 6000);
    } catch (err) {
      console.warn("Backend save profile error:", err);
    }

    await fetchPrediction(updated);
  };

  // Synchronize target role update across Career Digital Twin, ML Sensitivity, Roadmap & Projects
  const handleUpdateTargetRole = (newRole: string) => {
    const updated = { ...profile, targetRole: newRole };
    setProfile(updated);
    fetchPrediction(updated);
  };

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
        fetchWithTimeout(`${API_BASE}/api/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }, 5000),
        fetchWithTimeout(`${API_BASE}/api/skill-gap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }, 5000),
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
    const raw =
      p.cgpa * 5.2 +
      Math.max(0, 3 - p.backlogs) * 4 +
      Math.min(p.internships, 3) * 5 +
      p.communication * 2.2 +
      p.coding * 2.7 -
      Math.max(p.backlogs - 1, 0) * 5;
    const chance = Math.max(18, Math.min(96, Math.round(raw)));
    const tone = chance >= 75 ? "strong" : chance >= 55 ? "steady" : "focus";
    const label =
      chance >= 75
        ? "Strong Candidate Profile"
        : chance >= 55
        ? "Solid Foundation"
        : "Needs Focus & Acceleration";

    setPrediction({
      chance,
      label,
      tone,
      strengths: [
        `Academic CGPA ${p.cgpa.toFixed(1)}/10.0`,
        p.backlogs === 0 ? "Clean Academic Record (0 Backlogs)" : "Eligible for standard drives",
        p.internships > 0 ? `${p.internships} Practical Internship(s)` : "Active academic projects",
      ],
      priorities: [
        p.cgpa < 7.0 ? "Raise CGPA to >= 7.0 for top-tier cutoff" : "Maintain academic consistency",
        p.coding < 7 ? "Focus on high-frequency Blind 75 DSA patterns" : "Participate in timed mock rounds",
      ],
      breakdown: {
        academics: Math.round(p.cgpa * 10),
        coding_dsa: p.coding * 10,
        communication: p.communication * 10,
        experience: Math.min(100, p.internships * 35),
        eligibility: Math.max(0, 100 - p.backlogs * 25),
      },
    });
  };

  // 2. Roadmap State
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);

  const fetchRoadmap = async () => {
    setIsRoadmapLoading(true);
    try {
      const resp = await fetchWithTimeout(`${API_BASE}/api/ai/roadmap`, {
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
      }, 10000);
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
      content:
        "Hi! I'm your Pathfinder AI Career Coach powered by Gemini. I'm connected to your live candidate profile. Ask me anything in English, Telugu script, or Roman Telugu—placement cutoffs, mock interviews, 6-week roadmaps, skill gaps, or resume refinement!",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);

  const handleStopChat = () => {
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    setIsChatLoading(false);
  };

  const handleSendMessage = async (userText: string, customHistory?: Message[]) => {
    const currentBase = customHistory || messages;
    const updatedMessages: Message[] = [...currentBase, { role: "user", content: userText }];
    setMessages(updatedMessages);
    setIsChatLoading(true);

    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
    }
    const abortCtrl = new AbortController();
    chatAbortRef.current = abortCtrl;

    // Filter history: skip leading initial assistant greeting so first history item is user turn
    const cleanHistory = currentBase
      .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetchWithTimeout(
        `${API_BASE}/api/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortCtrl.signal,
          body: JSON.stringify({
            message: userText,
            history: cleanHistory,
            profile: {
              cgpa: profile.cgpa,
              backlogs: profile.backlogs,
              internships: profile.internships,
              communication: profile.communication,
              coding: profile.coding,
              target_role: profile.targetRole,
              target_tier: profile.targetTier,
              branch: profile.branch,
            },
          }),
        },
        20000
      );

      if (resp.ok) {
        const data = await resp.json();
        if (data.reply && data.reply.trim()) {
          setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
          return;
        }
      }

      const agentReply = getCareerAgentResponse(userText, updatedMessages, profile);
      setMessages([...updatedMessages, { role: "assistant", content: agentReply }]);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      const agentReply = getCareerAgentResponse(userText, updatedMessages, profile);
      setMessages([...updatedMessages, { role: "assistant", content: agentReply }]);
    } finally {
      setIsChatLoading(false);
      chatAbortRef.current = null;
    }
  };

  const handleRegenerateChat = () => {
    // Find the last user message and re-send it
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const lastUserText = messages[i].content;
        const priorMessages = messages.slice(0, i);
        setMessages(priorMessages);
        handleSendMessage(lastUserText, priorMessages);
        break;
      }
    }
  };

  // 4. Cohort Analytics State
  const [cohortFilters, setCohortFilters] = useState({
    year: 2026,
    branch: "All",
    gender: "All",
    skill: "All",
  });
  const [cohortAnalytics, setCohortAnalytics] = useState<CohortAnalyticsData | null>(
    FALLBACK_COHORT_ANALYTICS as unknown as CohortAnalyticsData
  );
  const [isSummarizingCohort, setIsSummarizingCohort] = useState(false);
  const [cohortInsight, setCohortInsight] = useState<{
    headline: string;
    summary: string;
    actions: string[];
  } | null>(null);

  const fetchCohortAnalytics = async (f = cohortFilters) => {
    try {
      const q = new URLSearchParams({
        year: f.year.toString(),
        branch: f.branch,
        gender: f.gender,
        skill: f.skill,
      });
      const resp = await fetchWithTimeout(`${API_BASE}/api/analytics?${q.toString()}`, {}, 6000);
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
        skill: cohortFilters.skill,
      });
      const resp = await fetchWithTimeout(
        `${API_BASE}/api/ai/cohort-insight?${q.toString()}`,
        { method: "POST" },
        10000
      );
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

      const resp = await fetchWithTimeout(
        `${API_BASE}/api/ai/resume`,
        {
          method: "POST",
          body: formData,
        },
        12000
      );
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
      skill: cohortFilters.skill,
    });
    window.open(`${API_BASE}/api/export/csv?${q.toString()}`, "_blank");
  };

  const handleDownloadPDF = () => {
    const q = new URLSearchParams({
      year: cohortFilters.year.toString(),
      branch: cohortFilters.branch,
      gender: cohortFilters.gender,
      skill: cohortFilters.skill,
    });
    window.open(`${API_BASE}/api/export/pdf?${q.toString()}`, "_blank");
  };

  const handleDownloadResumePDF = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/export/resume-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          resumeFeedback || {
            score: 78,
            verdict: "Strong technical foundation with measurable project work.",
            strengths: ["Clean chronological structure", "Full-stack web & database projects"],
            improvements: ["Rewrite project bullets using the Google X-Y-Z formula", "Add live deployment links"],
            ats_keywords: ["REST APIs", "Data Structures", "PostgreSQL", "Docker"],
            formatting_tips: ["Single-column layout", "Standard ATS taxonomies"],
          }
        ),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pathfinder-ats-resume-report.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        handleDownloadPDF();
      }
    } catch {
      handleDownloadPDF();
    }
  };

  // Logout: cleans state and returns to the Lamp Login screen
  const handleLogout = async () => {
    try {
      await fetchWithTimeout(`${API_BASE}/api/auth/logout`, { method: "POST" }, 2000);
    } catch {
      // ignore
    }
    localStorage.removeItem("pathfinder_user");
    localStorage.removeItem("pathfinder_token");
    setIsAuthenticated(false);
    setShowResultScreen(false);
    setUserRole("student");
    try {
      window.parent.postMessage({ type: "PATHFINDER_LOGOUT" }, "*");
    } catch {
      // ignore
    }
  };


  // Check if any optional profile fields are missing to show completion banner on dashboard
  const isProfilePartiallyIncomplete =
    Boolean(profile.onboardingCompleted) &&
    (!profile.githubUrl || !profile.leetcodeUrl || !profile.certifications || profile.certifications.length === 0);

  // 1. LANDING & AUTH SCREEN
  if (!isAuthenticated) {
    return <LampLogin onLogin={handleLogin} />;
  }

  // 2. ONBOARDING WIZARD (STRICT STEP-WISE FLOW FOR NEW USERS)
  if (!profile.onboardingCompleted) {
    return (
      <div className="relative min-h-screen bg-[#05070e] text-slate-100 font-sans overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-[#070b16] via-[#05070f] to-[#03040a]" />
          <Ambient3DBackground />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-md shadow-emerald-500/20">
                <Sparkles className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight">Pathfinder Candidate Onboarding</h1>
                <p className="text-xs text-slate-400">Step-Wise Profile Setup for AI Career Readiness Assessment</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                Logged in as {username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          <OnboardingWizard
            initialProfile={profile}
            onComplete={handleWizardComplete}
            apiBase={API_BASE}
          />
        </div>
      </div>
    );
  }

  // 3. IMMEDIATE RESULT SCREEN POST-SUBMIT
  if (showResultScreen && auditResult) {
    return (
      <div className="relative min-h-screen bg-[#05070e] text-slate-100 font-sans overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-[#070b16] via-[#05070f] to-[#03040a]" />
          <Ambient3DBackground />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <OnboardingResultScreen
            profile={profile}
            auditResult={auditResult}
            onGoToDashboard={() => {
              setShowResultScreen(false);
              setActiveTab("overview");
            }}
            onEditProfile={() => {
              setShowResultScreen(false);
              setActiveTab("profile");
            }}
            onStartMockInterview={() => {
              setShowResultScreen(false);
              setActiveTab("coach");
              handleSendMessage("Let's do an interactive mock interview for my role. Ask me question 1.");
            }}
            onNavigateTab={(tab) => {
              setShowResultScreen(false);
              setActiveTab(tab as TabId);
            }}
          />
        </div>
      </div>
    );
  }

  // 4. MAIN DASHBOARD & PLATFORM NAVIGATION
  return (
    <div className="relative min-h-screen bg-[#05070e] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans overflow-x-hidden">
      {/* ================= PREMIUM AI STARTUP BACKGROUND SYSTEM ================= */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b16] via-[#05070f] to-[#03040a]" />
        <Ambient3DBackground />

        {/* Matrix Grid */}
        <div
          className="absolute inset-0 opacity-[0.032]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 20%, black 30%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 20%, black 30%, transparent 85%)",
          }}
        />

        {/* Ambient Glows */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.75, 0.9, 0.75] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[160px] left-1/2 -translate-x-1/2 h-[520px] w-[980px] rounded-full blur-[120px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.13) 0%, rgba(6, 182, 212, 0.08) 45%, transparent 72%)",
          }}
        />
        <motion.div
          animate={{ y: [-12, 16, -12], opacity: [0.55, 0.75, 0.55] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[220px] -left-[180px] h-[660px] w-[660px] rounded-full blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.09) 0%, rgba(168, 85, 247, 0.045) 50%, transparent 70%)",
          }}
        />
        <motion.div
          animate={{ y: [16, -14, 16], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[480px] -right-[160px] h-[600px] w-[600px] rounded-full blur-[130px]"
          style={{
            background:
              "radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, rgba(16, 185, 129, 0.045) 50%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[1200px] rounded-full blur-[150px] opacity-45"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(30, 58, 138, 0.16) 0%, transparent 75%)",
          }}
        />
        <div className="absolute top-[320px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/12 to-transparent" />
      </div>

      {/* Top Header */}
      <DashboardHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        username={username}
        email={email}
        onLogout={handleLogout}
        userRole={userRole}
      />


      {/* Render Cold-Start Alert Banner */}
      {isServerWakingUp && (
        <div className="relative z-40 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-300 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </span>
            <span>Connecting to cloud backend... (free-tier servers take ~15-20s on first load). All predictions will populate automatically.</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <AnimatePresence mode="wait">
          {/* TAB 1: READINESS OVERVIEW & COMMAND CENTER */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Optional Profile Completion Banner */}
              {isProfilePartiallyIncomplete && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Profile Boost Available</p>
                      <p className="text-xs text-slate-400">
                        Add your GitHub / LeetCode profiles or certifications in Profile / Settings to elevate your career readiness score by up to +12%.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    <span>Complete Profile</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Hero KPI Metrics */}
              <div id="career-readiness-assessment">
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
              </div>

              {/* Career Digital Twin & Transparent Readiness Dimensions */}
              <div id="career-digital-twin">
                <CareerDigitalTwin
                  profile={profile}
                  predictionChance={prediction.chance}
                  predictionTone={prediction.tone}
                  onNavigateTab={setActiveTab}
                />
              </div>

              {/* Personalized Next Best Action: What Should I Do Next? */}
              <NextActionsWidget
                profile={profile}
                onNavigateTab={setActiveTab}
                onAskCoach={(q) => {
                  setActiveTab("coach");
                  handleSendMessage(q);
                }}
              />

              {/* AI Action Center */}
              <AIActionCenter
                onNavigateTab={setActiveTab}
                onTriggerCalculate={() => fetchPrediction(profile)}
                onStartMockInterview={() => {
                  setActiveTab("coach");
                  handleSendMessage("Let's do an interactive mock interview for my role. Ask me question 1.");
                }}
                targetRole={profile.targetRole}
                profile={profile}
                prediction={prediction}
                apiBase={API_BASE}
              />

              {/* What-If? Career Trajectory Simulator */}
              <WhatIfSimulator
                currentProfile={profile}
                currentScore={prediction.chance}
              />

              {/* Sliders & Parameters */}
              <ProfileEvaluator
                profile={profile}
                onChange={(updated) => {
                  const merged = { ...profile, ...updated };
                  setProfile(merged);
                  fetchPrediction(merged);
                }}
                onCalculate={() => fetchPrediction(profile)}
                onReset={() => {
                  setProfile(DEFAULT_STUDENT_PROFILE);
                  fetchPrediction(DEFAULT_STUDENT_PROFILE);
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
                apiBase={API_BASE}
              />
            </motion.div>
          )}

          {/* TAB 2: AI ACTION CENTRE */}
          {activeTab === "action" && (
            <motion.div
              key="action"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              <AIActionCenter
                onNavigateTab={setActiveTab}
                onTriggerCalculate={() => fetchPrediction(profile)}
                onStartMockInterview={() => {
                  setActiveTab("coach");
                  handleSendMessage("Let's do an interactive mock interview for my role. Ask me question 1.");
                }}
                targetRole={profile.targetRole}
                profile={profile}
                prediction={prediction}
                apiBase={API_BASE}
              />
              <NextActionsWidget
                profile={profile}
                onNavigateTab={setActiveTab}
                onAskCoach={(q) => {
                  setActiveTab("coach");
                  handleSendMessage(q);
                }}
              />
            </motion.div>
          )}

          {/* TAB 3: SKILLS ROADMAP */}
          {activeTab === "skills" && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              <CareerMissionTracker
                profile={profile}
                onNavigateTab={setActiveTab}
              />
              <RoadmapVisualizer
                roadmap={roadmap}
                isLoading={isRoadmapLoading}
                onRegenerate={fetchRoadmap}
              />
              <SkillIntelligence
                apiBase={API_BASE}
                selectedYear={profile.graduationYear || 2026}
                selectedBranch={profile.branch || "All"}
                onAskCoach={(q) => {
                  setActiveTab("coach");
                  handleSendMessage(q);
                }}
                onNavigateTab={setActiveTab}
              />
            </motion.div>
          )}

          {/* TAB 4: BRANCHES & COURSES */}
          {activeTab === "branches" && (
            <motion.div
              key="branches"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <BranchIntelligence
                apiBase={API_BASE}
                selectedYear={profile.graduationYear || 2026}
                currentBranch={profile.branch || "CSE"}
                onAskCoach={(q) => {
                  setActiveTab("coach");
                  handleSendMessage(q);
                }}
                onNavigateTab={setActiveTab}
              />
            </motion.div>
          )}

          {/* TAB 5: COHORT ANALYTICS / PLACEMENTS */}
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

          {/* TAB 6: AI CHAT ASSISTANT */}
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
                onStopGeneration={handleStopChat}
                onRegenerate={handleRegenerateChat}
                isLoading={isChatLoading}
                targetRole={profile.targetRole}
              />
            </motion.div>
          )}

          {/* TAB 7: PROFILE / SETTINGS (EDIT DETAILS ANYTIME & SSOT SYNC) */}
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <ProfileSettings
                profile={profile}
                onSaveProfile={handleSaveProfile}
                onResetToDefaults={() => {
                  setProfile(DEFAULT_STUDENT_PROFILE);
                  handleSaveProfile(DEFAULT_STUDENT_PROFILE);
                }}
                apiBase={API_BASE}
              />
            </motion.div>
          )}

          {/* ADDITIONAL FEATURE TABS: RESUME STUDIO, PROJECTS, DEFENSE, ROLES */}
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
                onDownloadFeedbackPDF={handleDownloadResumePDF}
              />
            </motion.div>
          )}

          {activeTab === "projects" && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <ProjectRecommender
                targetRole={profile.targetRole}
                onAskCoach={(q) => {
                  setActiveTab("coach");
                  handleSendMessage(q);
                }}
                apiBase={API_BASE}
              />
            </motion.div>
          )}

          {activeTab === "defense" && (
            <motion.div
              key="defense"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <ProjectDefenseConsole
                profile={profile}
                onAskCoach={(q) => {
                  setActiveTab("coach");
                  handleSendMessage(q);
                }}
              />
            </motion.div>
          )}

          {activeTab === "roles" && (
            <motion.div
              key="roles"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <RoleIntelligence
                currentProfile={profile}
                onUpdateTargetRole={handleUpdateTargetRole}
                onNavigateTab={setActiveTab}
                apiBase={API_BASE}
              />
            </motion.div>
          )}

          {activeTab === "missions" && (
            <motion.div
              key="missions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              <CareerMissionTracker
                profile={profile}
                onNavigateTab={setActiveTab}
              />
              <RoadmapVisualizer
                roadmap={roadmap}
                isLoading={isRoadmapLoading}
                onRegenerate={fetchRoadmap}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
