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
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { FALLBACK_COHORT_ANALYTICS } from "@/lib/fallbackData";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  Compass,
  Bot,
  Lightbulb,
  TrendingUp,
  FileText,
  GraduationCap,
  ShieldAlert,
  User,
  Target,
  Loader2
} from "lucide-react";
import { getApiBase, API_BASE, fetchWithTimeout, api } from "@/lib/apiClient";
import { getTabKnowledge } from "@/lib/siteKnowledge";

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
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSigningIn, setOauthSigningIn] = useState<boolean>(false);
  const oauthHandledRef = useRef<boolean>(false);

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

  // Complete OAuth returns before rendering either the login card or dashboard.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // The one-time code is single-use: guard so StrictMode/re-renders never run the exchange twice
    if (oauthHandledRef.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    const oauthCode = searchParams.get("oauth_code");
    const queryError = searchParams.get("oauth_error");
    if (oauthCode || queryError) {
      oauthHandledRef.current = true;
      window.history.replaceState(null, "", window.location.pathname);

      if (queryError) {
        const messages: Record<string, string> = {
          google_not_configured: "Google sign-in is not configured yet.",
          github_not_configured: "GitHub sign-in is not configured yet.",
          google_cancelled: "Google sign-in was cancelled.",
          github_cancelled: "GitHub sign-in was cancelled.",
          google_failed: "Google sign-in failed, please try again.",
          github_failed: "GitHub sign-in failed, please try again.",
          google_timeout: "Google took too long to respond. Please try again.",
          github_timeout: "GitHub took too long to respond. Please try again.",
          state_invalid: "Your sign-in session expired. Please try again.",
        };
        setOauthError(messages[queryError.toLowerCase()] || "Sign-in was cancelled or failed. Please try again.");
        return;
      }

      if (oauthCode) {
        setOauthSigningIn(true);
        (async () => {
          try {
            const exchange = () =>
              fetchWithTimeout(`${API_BASE}/api/auth/oauth/exchange`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: oauthCode }),
              }, 60000);

            let exchangeResp: Response;
            try {
              exchangeResp = await exchange();
            } catch (networkErr) {
              // Retry once, on network errors only (not on timeouts or HTTP errors)
              if (networkErr instanceof TypeError) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                exchangeResp = await exchange();
              } else {
                throw networkErr;
              }
            }

            const authData = await exchangeResp.json().catch(() => ({} as any));
            if (!exchangeResp.ok || !authData.success || !authData.user || !authData.token) {
              throw new Error(authData.message || authData.detail || "OAuth sign-in could not be completed.");
            }

            localStorage.setItem("pathfinder_token", authData.token);
            localStorage.setItem("pathfinder_user", JSON.stringify(authData.user));
            setUserRole(authData.user.role || "student");
            setOauthError(null);
            await handleLogin({
              username: authData.user.username || "Student",
              email: authData.user.email,
              isNewUser: authData.is_new_user === true,
            });
          } catch (error) {
            const isAbort = error instanceof DOMException && error.name === "AbortError";
            setOauthError(
              isAbort
                ? "Sign-in timed out. Please try again."
                : error instanceof TypeError
                  ? "Network error while signing in. Please try again."
                  : error instanceof Error
                    ? error.message
                    : "OAuth sign-in could not be completed."
            );
          } finally {
            setOauthSigningIn(false);
          }
        })();
      }
      return;
    }

    const hash = window.location.hash;
    if (!hash || (!hash.includes("oauth_token=") && !hash.includes("oauth_error="))) {
      return;
    }

    const fragmentStr = hash.startsWith("#") ? hash.slice(1) : hash;
    const params = new URLSearchParams(fragmentStr);

    const token = params.get("oauth_token");
    const error = params.get("oauth_error");
    const isNew = params.get("new") === "1";

    // Immediately remove fragment from URL without reload
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (error) {
      setOauthError(decodeURIComponent(error.replace(/\+/g, " ")));
      return;
    }

    if (token) {
      localStorage.setItem("pathfinder_token", token);
      (async () => {
        try {
          const meResp = await fetchWithTimeout(
            `${API_BASE}/api/auth/me`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
            6000
          );
          if (meResp.ok) {
            const userData = await meResp.json();
            if (userData && userData.email) {
              localStorage.setItem("pathfinder_user", JSON.stringify(userData));
              setUserRole(userData.role || "student");
              await handleLogin({
                username: userData.username || "Student",
                email: userData.email,
                isNewUser: isNew,
              });
            }
          } else {
            setOauthError("Failed to verify OAuth session. Please try signing in again.");
          }
        } catch {
          setOauthError("Network error while completing OAuth authentication.");
        }
      })();
    }
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

    const storedToken = localStorage.getItem("pathfinder_token");
    const storedUser = localStorage.getItem("pathfinder_user");
    let isOAuth = false;
    if (storedToken && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.auth_provider === "google" || u.auth_provider === "github") {
          isOAuth = true;
        }
      } catch {}
    }

    if (!isOAuth) {
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
      const resp = await fetchWithTimeout(`${API_BASE}/api/profile?email=${encodeURIComponent(user.email)}`, {}, 45000);
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
        }, 45000),
        fetchWithTimeout(`${API_BASE}/api/skill-gap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }, 45000),
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
  const [isChatWakingUp, setIsChatWakingUp] = useState(false);
  const [isGlobalServerWakingUp, setIsGlobalServerWakingUp] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleWakingUpEvent = (e: any) => {
      setIsGlobalServerWakingUp(Boolean(e.detail?.isWakingUp));
    };
    window.addEventListener("pathfinder_server_waking_up", handleWakingUpEvent);
    return () => {
      window.removeEventListener("pathfinder_server_waking_up", handleWakingUpEvent);
    };
  }, []);

  const handleStopChat = () => {
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    setIsChatLoading(false);
    setIsChatWakingUp(false);
  };

  const handleSendMessage = async (userText: string, customHistory?: Message[]) => {
    const trimmed = userText.trim();
    if (!trimmed) return;

    const currentBase = customHistory || messages;
    const updatedMessages: Message[] = [...currentBase, { role: "user", content: trimmed }];
    setMessages(updatedMessages);
    setIsChatLoading(true);
    setIsChatWakingUp(false);

    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
    }
    const abortCtrl = new AbortController();
    chatAbortRef.current = abortCtrl;

    // Detect Render cold-start: if response takes longer than 3.0s, signal server wake-up
    const coldStartTimer = setTimeout(() => {
      setIsChatWakingUp(true);
    }, 3000);

    // Filter history: drop leading initial assistant greeting so first history item is user turn
    const cleanHistory = currentBase
      .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    const chatPayload = {
      message: trimmed,
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
      active_tab: activeTab,
      page_context: {
        activeTabTitle: getTabKnowledge(activeTab)?.title || activeTab,
        placementReadinessChance: `${prediction.chance}%`,
        placementReadinessLabel: prediction.label,
        candidateBranch: profile.branch,
        targetRole: profile.targetRole,
        cohortYear: cohortFilters.year,
        cohortBranch: cohortFilters.branch,
      },
    };

    const callBackend = async (isRetry = false): Promise<string | null> => {
      try {
        const resp = await fetchWithTimeout(
          `${API_BASE}/api/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abortCtrl.signal,
            body: JSON.stringify(chatPayload),
          },
          60000
        );

        if (resp.ok) {
          const data = await resp.json();
          if (data.reply && data.reply.trim()) {
            return data.reply.trim();
          }
        }

        if (resp.status === 429) {
          const errData = await resp.json().catch(() => null);
          if (errData && errData.detail) {
            return errData.detail;
          }
        }

        // Retry once on transient server errors (500, 502, 503, 504)
        if (!isRetry && resp.status >= 500) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return callBackend(true);
        }

        return null;
      } catch (err: any) {
        if (abortCtrl.signal.aborted) {
          // Manually cancelled by user via stop button
          return null;
        }
        // If timeout or network dropped, retry once before failing
        if (!isRetry) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return callBackend(true);
        }
        return null;
      }
    };

    try {
      const reply = await callBackend(false);
      clearTimeout(coldStartTimer);
      setIsChatWakingUp(false);

      if (abortCtrl.signal.aborted) {
        return;
      }

      if (reply) {
        setMessages([...updatedMessages, { role: "assistant", content: reply }]);
      } else {
        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content: "I'm having trouble reaching my brain right now, try again in a moment",
          },
        ]);
      }
    } catch (err: any) {
      clearTimeout(coldStartTimer);
      setIsChatWakingUp(false);
      if (abortCtrl.signal.aborted) {
        return;
      }
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "I'm having trouble reaching my brain right now, try again in a moment",
        },
      ]);
    } finally {
      clearTimeout(coldStartTimer);
      setIsChatLoading(false);
      setIsChatWakingUp(false);
      chatAbortRef.current = null;
    }
  };

  const handleAskCoach = (query: string) => {
    setActiveTab("coach");
    setTimeout(() => {
      handleSendMessage(query);
    }, 60);
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
  if (oauthSigningIn && !isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#111111] font-['Outfit',sans-serif] text-slate-200">
        <p className="animate-pulse text-sm font-medium tracking-wide">Signing you in...</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <LampLogin onLogin={handleLogin} initialError={oauthError} />;
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
      {/* Graceful Cold-Start Wake-Up Notification */}
      {isGlobalServerWakingUp && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full border border-cyan-500/30 bg-slate-950/95 px-4 py-2 text-xs font-medium text-cyan-300 shadow-[0_4px_24px_rgba(6,182,212,0.25)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
          <span>Waking up the server, this can take up to a minute...</span>
        </div>
      )}

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
              className="space-y-12 sm:space-y-16"
            >
              {/* Optional Profile Completion Banner */}
              {isProfilePartiallyIncomplete && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Profile Acceleration Available</p>
                      <p className="text-xs text-slate-400">
                        Add your GitHub / LeetCode profiles or certifications in Profile / Settings to elevate your career readiness score by up to +12%.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    <span>Complete Profile</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Section 1: Hero KPI Metrics */}
              <section id="career-readiness-assessment" className="space-y-4">
                <SectionHeader
                  title="Campus Placement Readiness Overview"
                  description="Real-time placement probability and primary eligibility benchmark"
                  badge="Class of 2026"
                  accent="emerald"
                  icon={Target}
                  helperLabel="Calculated via Random Forest model trained on 972 student records"
                />
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
              </section>

              {/* Section 2: Career Digital Twin */}
              <section id="career-digital-twin" className="space-y-4">
                <SectionHeader
                  title="Candidate Readiness Vectors"
                  description="Transparent multi-dimensional evaluation of your academic standing, practical coding, and communication confidence"
                  badge="Readiness Vectors"
                  accent="emerald"
                  icon={Zap}
                  helperLabel="5 vectors calibrated against Tier-1 campus drive cutoffs"
                />
                <CareerDigitalTwin
                  profile={profile}
                  predictionChance={prediction.chance}
                  predictionTone={prediction.tone}
                  onNavigateTab={setActiveTab}
                />
              </section>

              {/* Section 3: Priority Next Actions */}
              <section id="career-next-actions" className="space-y-4">
                <SectionHeader
                  title="Priority Next Best Actions"
                  description="Targeted high-leverage steps recommended specifically for your active bottlenecks"
                  badge="Actionable"
                  accent="emerald"
                  icon={ArrowRight}
                  helperLabel="Auto-prioritizes Blind 75 DSA, projects, or cutoff clearance"
                />
                <NextActionsWidget
                  profile={profile}
                  onNavigateTab={setActiveTab}
                  onAskCoach={handleAskCoach}
                />
              </section>

              {/* Section 4: AI Action Center */}
              <section id="career-action-center" className="space-y-4">
                <SectionHeader
                  title="AI Action Center"
                  description="One-click automated intelligence tools integrated with your candidate profile"
                  badge="Command Hub"
                  accent="emerald"
                  icon={Zap}
                  helperLabel="Click any tool to launch diagnostic audit"
                />
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
              </section>

              {/* Section 5: What-If? Trajectory Simulator */}
              <section id="career-trajectory-simulator" className="space-y-4">
                <SectionHeader
                  title="What-If? Career Trajectory Simulator"
                  description="Simulate the immediate placement probability boost of boosting CGPA, clearing backlogs, or shipping an internship"
                  badge="Interactive Sandbox"
                  accent="emerald"
                  icon={TrendingUp}
                  helperLabel="Interactive sliders instantly re-simulate placement probability"
                />
                <WhatIfSimulator
                  currentProfile={profile}
                  currentScore={prediction.chance}
                />
              </section>

              {/* Section 6: Sliders & Parameters */}
              <section id="career-parameters-evaluator" className="space-y-4">
                <SectionHeader
                  title="Candidate Vector Adjustments"
                  description="Fine-tune your verified academic standing, coding proficiency, and target company tier"
                  badge="Profile Parameters"
                  accent="emerald"
                  icon={Target}
                />
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
              </section>

              {/* Section 7: Skill-Gap & Strengths */}
              <section id="career-skill-gap" className="space-y-4">
                <SectionHeader
                  title="Target Role Skill Gap Analysis"
                  description="Direct alignment of your competencies against hiring cutoffs for your chosen domain"
                  badge="Skill Gap Matrix"
                  accent="emerald"
                  icon={Sparkles}
                />
                <SkillGapSection
                  strengths={prediction.strengths}
                  priorities={prediction.priorities}
                  breakdown={prediction.breakdown}
                  onAskCoach={handleAskCoach}
                  apiBase={API_BASE}
                />
              </section>
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
              className="space-y-12 sm:space-y-16"
            >
              <SectionHeader
                title="Readiness Command Center"
                description="One-click automated intelligence workflows integrated with your active profile"
                badge="Command Hub"
                accent="emerald"
                icon={Zap}
                helperLabel="Launch diagnostics, audit reports, or mock interview rounds"
              />
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
                onAskCoach={handleAskCoach}
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
              className="space-y-12 sm:space-y-16"
            >
              <SectionHeader
                title="6-Week Strategic Placement Roadmap"
                description="Custom weekly milestone plan designed to eliminate skill bottlenecks before drive season"
                badge="Sprint Tracker"
                accent="purple"
                icon={Compass}
                helperLabel="Milestones auto-adapt as you update skills and role"
              />
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
                onAskCoach={handleAskCoach}
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
              className="space-y-12 sm:space-y-16"
            >
              <SectionHeader
                title="Branch Intelligence & Course Trends"
                description="Comparative placement rates, top-tier recruiters, and course relevance across engineering departments"
                badge="9 Departments"
                accent="blue"
                icon={GraduationCap}
                helperLabel="Verified campus records for 2024-2026 batches"
              />
              <BranchIntelligence
                apiBase={API_BASE}
                selectedYear={profile.graduationYear || 2026}
                currentBranch={profile.branch || "CSE"}
                onAskCoach={handleAskCoach}
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
              className="space-y-12 sm:space-y-16"
            >
              <SectionHeader
                title="Cohort Placement Analytics & Benchmarks"
                description="Authoritative campus placement records across 972 engineering candidates"
                badge="972 Records"
                accent="blue"
                icon={TrendingUp}
                helperLabel="Filter by branch, year, package, and package tier"
              />
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
              className="space-y-12 sm:space-y-16"
            >
              <SectionHeader
                title="Pathfinder AI Career Coach"
                description="Real-time conversational mentor powered by Gemini AI with live profile awareness"
                badge="Gemini AI"
                accent="cyan"
                icon={Bot}
                helperLabel="Ask anything: casual chat, Telugu, mock interviews, or placement numbers"
              />
              <AICoachConsole
                messages={messages}
                onSendMessage={handleSendMessage}
                onClearChat={() => setMessages([])}
                onStopGeneration={handleStopChat}
                onRegenerate={handleRegenerateChat}
                isLoading={isChatLoading}
                isServerWakingUp={isChatWakingUp}
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
              className="space-y-12 sm:space-y-16"
            >
              <SectionHeader
                title="Candidate Profile & System Settings"
                description="Single Source of Truth (SSOT) academic and coding parameters synced across all AI predictions"
                badge="SSOT Sync"
                accent="cyan"
                icon={User}
                helperLabel="Profile edits immediately recalculate all placement probabilities"
              />
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

          {/* ADDITIONAL FEATURE TABS: RESUME STUDIO, PROJECTS, DEFENSE */}
          {activeTab === "resume" && (
            <motion.div
              key="resume"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-12 sm:space-y-16"
            >
              <SectionHeader
                title="ATS Resume Studio & Diagnostic Scanner"
                description="Upload and scan your PDF resume against recruiter screening standards and Google X-Y-Z formula"
                badge="ATS Scanner"
                accent="rose"
                icon={FileText}
                helperLabel="Single-column ATS compliance and keyword gap detection"
              />
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
              className="space-y-12 sm:space-y-16"
            >
              <SectionHeader
                title="Flagship Project Blueprints & Portfolio"
                description="Production-grade project architectures mapped to recruiter rubrics and technical defense rounds"
                badge="Portfolio Blueprints"
                accent="amber"
                icon={Lightbulb}
                helperLabel="Includes live architecture specs and STAR storytelling defense points"
              />
              <ProjectRecommender
                targetRole={profile.targetRole}
                onAskCoach={handleAskCoach}
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
              className="space-y-12 sm:space-y-16"
            >
              <SectionHeader
                title="Project Architecture Defense Simulator"
                description="Interactive technical grilling simulator for system design, edge cases, and architectural trade-offs"
                badge="STAR Defense"
                accent="amber"
                icon={ShieldAlert}
                helperLabel="Simulates Round 2 technical interview architecture questioning"
              />
              <ProjectDefenseConsole
                profile={profile}
                onAskCoach={handleAskCoach}
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
                onAskCoach={handleAskCoach}
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

        {/* Global Floating 'Ask Coach' Trigger (Available on all tabs except Coach) */}
        {activeTab !== "coach" && (
          <button
            type="button"
            onClick={() => {
              const tabTitle = getTabKnowledge(activeTab)?.title || activeTab;
              handleAskCoach(`Explain the '${tabTitle}' tab and what actions I should take here to improve my placement readiness.`);
            }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-cyan-500/40 bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-cyan-300 shadow-xl shadow-cyan-500/20 backdrop-blur-xl transition-all hover:scale-105 hover:border-cyan-400 hover:bg-slate-900 hover:text-white hover:shadow-cyan-500/35 active:scale-95"
            title="Ask AI Coach about this page"
          >
            <Bot className="h-4 w-4 text-cyan-400" />
            <span>Ask Coach About This Page</span>
          </button>
        )}
      </main>
    </div>
  );
}
