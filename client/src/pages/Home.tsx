import React, { useState, useEffect, useRef, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardHeader, TabId } from "@/components/dashboard/DashboardHeader";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { SkillGapSection } from "@/components/dashboard/SkillGapSection";
import { RoadmapVisualizer, RoadmapData } from "@/components/dashboard/RoadmapVisualizer";
import type { Message } from "@/components/dashboard/AICoachConsole";
import { useScreenWatcher } from "@/hooks/useScreenWatcher";
import { CohortExplorer, CohortAnalyticsData } from "@/components/dashboard/CohortExplorer";
import { ResumeStudio, ResumeFeedbackData } from "@/components/dashboard/ResumeStudio";
import { SignInPage } from "@/components/auth/SignInPage";
import { ComputeLandingPage } from "@/components/landing/ComputeLandingPage";
import { ProjectRecommender } from "@/components/dashboard/ProjectRecommender";
import { RoleIntelligence } from "@/components/dashboard/RoleIntelligence";
import { BranchIntelligence } from "@/components/dashboard/BranchIntelligence";
import { SkillIntelligence } from "@/components/dashboard/SkillIntelligence";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { OnePageResumeModal } from "@/components/dashboard/OnePageResumeModal";
import { CompanyPlacementRadar } from "@/components/dashboard/CompanyPlacementRadar";
import { MockInterviewConsole } from "@/components/dashboard/MockInterviewConsole";
import { JDCustomTailor } from "@/components/dashboard/JDCustomTailor";
import { LiveCodingInterviewArena } from "@/components/dashboard/LiveCodingInterviewArena";
import {
  StudentProfileState,
  DEFAULT_STUDENT_PROFILE,
  DEMO_GUEST_PROFILE,
  EMPTY_GUEST_PROFILE,
  isProfileUnconfigured,
  pickCandidateFullName,
  buildInitialProfileFromStorage,
} from "@/types/profile";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { FALLBACK_COHORT_ANALYTICS } from "@/lib/fallbackData";
import { recordProgressEvent } from "@/lib/progressTracker";
import { MyProgressJourney } from "@/components/dashboard/MyProgressJourney";
import { getCareerAgentResponse, buildRagGeminiSystemPrompt } from "@/lib/careerAgent";
import { geminiLive } from "@/agent/geminiLive";
import { audioEngine } from "@/agent/audioIO";
import {
  handleAuthLoginDetected,
  initAuthMode,
  getUserRole,
  toHonorificKey,
  getRememberedGuestName,
  clearRememberedGuestName,
} from "@/lib/auth";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Compass,
  Lightbulb,
  TrendingUp,
  FileText,
  GraduationCap,
  User,
  Target,
  Loader2,
  Mic,
  Building2,
  LayoutDashboard,
} from "lucide-react";
import { getApiBase, API_BASE, fetchWithTimeout, api, getSessionId } from "@/lib/apiClient";
import { getTabKnowledge } from "@/lib/siteKnowledge";
import { Footer } from "@/components/dashboard/Footer";
import { DAS_LAYOUT, DasLayoutMode } from "@/agent/AgentLayout";
import { SlideTransitionBar, WORKSPACE_SLIDES } from "@/components/ui/TitaniumPrimitives";
import { toast } from "sonner";

export interface HomeProps {
  initialTab?: TabId;
  initialAuthView?: "landing" | "login";
}

const PREDICTION_PENDING_LABEL = "Calculating ML score...";
const PREDICTION_WAKING_LABEL = "ML server waking up";
const DEMO_SAMPLE_LOADING_LABEL = "Sample score, live model loading";
const DEMO_SAMPLE_PREDICTION: {
  chance: number;
  label: string;
  tone: "strong" | "steady" | "focus";
  strengths: string[];
  priorities: string[];
  breakdown: Record<string, number>;
} = {
  chance: 67.3,
  label: DEMO_SAMPLE_LOADING_LABEL,
  tone: "steady",
  strengths: [
    "Clears Standard Campus Cutoffs (CGPA 8.1/10 for Tier-2 & most product drives)",
    "Clean Backlog Status (0 Active Backlogs)",
    "Baseline Industry Exposure (1 internship recorded)",
  ],
  priorities: [
    "CGPA 8.1 is borderline for strict 8.0+ Dream/Tier-1 shortlists — offset this with verified GitHub repos and DSA proof.",
    "Deepen production impact from your internship with measurable latency/scale metrics in STAR & ATS bullets.",
    "Unverified High Coding Claim (8.0/10): Link a live LeetCode/CodeChef profile and prove problem volume under timed conditions.",
    "Missing GitHub Profile Link — Senior Hiring Managers audit live commits, tests, and README quality before interviews.",
    "Upload and audit your PDF resume in Tab 5 (ATS Resume Studio) to verify keyword coverage & project rigor.",
  ],
  breakdown: {
    academics: 83.0,
    skills: 70.6,
    projects: 54.0,
    internships: 60.0,
    coding: 70.6,
    coding_dsa: 70.6,
    communication: 70.4,
    experience: 60.0,
    eligibility: 95.0,
  },
};

function isDemoSampleProfile(p: StudentProfileState | null | undefined): boolean {
  if (!p) return false;
  return (
    (p.email || "").toLowerCase() === "guest@pathfinder.ai" &&
    !isProfileUnconfigured(p) &&
    Number(p.cgpa) === DEMO_GUEST_PROFILE.cgpa &&
    p.branch === DEMO_GUEST_PROFILE.branch &&
    Number(p.backlogs) === DEMO_GUEST_PROFILE.backlogs &&
    Number(p.internships) === DEMO_GUEST_PROFILE.internships &&
    Number(p.coding) === DEMO_GUEST_PROFILE.coding &&
    Number(p.communication) === DEMO_GUEST_PROFILE.communication
  );
}

export default function Home({ initialTab, initialAuthView }: HomeProps = {}) {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (initialTab) return initialTab;
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname.includes("blueprint")) return "projects";
      if (pathname.includes("resume")) return "resume";
      if (pathname.includes("interview")) return "interview";
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (
        t &&
        [
          "overview",
          "interview",
          "skills",
          "projects",
          "analytics",
          "resume",
          "branches",
          "profile",
          "roles",
        ].includes(t)
      ) {
        return t as TabId;
      }
      if (t === "defense" || t === "viva") return "interview";
      if (t === "missions") return "skills";
      if (t === "action") return "overview";
    }
    return "overview";
  });

  const [focusOnDas, setFocusOnDas] = useState(false);
  const [dasLayoutMode, setDasLayoutMode] = useState<DasLayoutMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const param = new URLSearchParams(window.location.search).get("dasLayout");
        if (param === "docked" || param === "background") return param;
      } catch { }
    }
    return DAS_LAYOUT;
  });
  const [isDasSpeaking, setIsDasSpeaking] = useState(false);
  const [isStageDockedOpen, setIsStageDockedOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return DAS_LAYOUT === "docked";
    try {
      const param = new URLSearchParams(window.location.search).get("dasLayout");
      const mode = param === "docked" || param === "background" ? param : DAS_LAYOUT;
      return mode === "docked" && window.innerWidth >= 1280;
    } catch {
      return DAS_LAYOUT === "docked" && window.innerWidth >= 1280;
    }
  });
  const { getScreenPayload } = useScreenWatcher(activeTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Central DAS + Gemini Live Agent Automation Listeners
  useEffect(() => {
    const mapToValidTab = (rawTab: string): { tab: TabId; scrollId?: string } => {
      const normalized = rawTab.toLowerCase().trim();
      const tabMap: Record<string, { tab: TabId; scrollId?: string }> = {
        overview: { tab: "overview" },
        dashboard: { tab: "overview" },
        home: { tab: "overview" },
        interview: { tab: "interview" },
        "mock-interview": { tab: "interview" },
        mock_interview: { tab: "interview" },
        action: { tab: "overview", scrollId: "career-action-center" },
        "action-center": { tab: "overview", scrollId: "career-action-center" },
        action_center: { tab: "overview", scrollId: "career-action-center" },
        "ai-action": { tab: "overview", scrollId: "career-action-center" },
        missions: { tab: "analytics", scrollId: "sprint-roadmap" },
        roles: { tab: "roles" },
        "role-intelligence": { tab: "roles" },
        "company-radar": { tab: "overview", scrollId: "career-company-radar" },
        "what-if": { tab: "overview", scrollId: "what-if-simulator" },
        whatif: { tab: "overview", scrollId: "what-if-simulator" },
        skills: { tab: "skills" },
        roadmap: { tab: "analytics", scrollId: "sprint-roadmap" },
        projects: { tab: "projects" },
        blueprints: { tab: "projects" },
        analytics: { tab: "analytics" },
        cohort: { tab: "analytics", scrollId: "cohort-explorer" },
        resume: { tab: "resume" },
        "jd-tailor": { tab: "resume" },
        jd: { tab: "resume" },
        "coding-arena": { tab: "interview" },
        "live-coding": { tab: "interview" },
        branches: { tab: "branches" },
        defense: { tab: "interview" },
        viva: { tab: "interview" },
        "project-defense": { tab: "interview" },
        profile: { tab: "profile" },
        progress: { tab: "progress" },
        "my-progress": { tab: "progress" },
        my_progress: { tab: "progress" },
        journey: { tab: "progress" },
        "progress-journey": { tab: "progress" },
        "skill-gap": { tab: "overview", scrollId: "career-skill-gap" },
      };
      return tabMap[normalized] || { tab: "overview" };
    };

    const scrollToElement = (target?: string) => {
      if (!target) return;
      setTimeout(() => {
        const el =
          document.getElementById(target) ||
          document.querySelector(`[data-das-id="${target}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 250);
    };

    const handleDASNavigate = (e: any) => {
      if (e.detail && e.detail.tab) {
        const rawNormalized = String(e.detail.tab).toLowerCase().trim();
        if (rawNormalized === "defense" || rawNormalized === "viva" || rawNormalized === "project-defense") {
          setInterviewMode("defense");
          setInterviewWorkspace("mock");
        } else if (rawNormalized === "mock-interview" || rawNormalized === "mock_interview") {
          setInterviewMode("company");
          setInterviewWorkspace("mock");
        } else if (rawNormalized === "interview" || rawNormalized === "coding-arena" || rawNormalized === "live-coding") {
          setInterviewWorkspace("coding");
        }
        const mapped = mapToValidTab(e.detail.tab);
        setActiveTab(mapped.tab);
        setFocusOnDas(false);
        scrollToElement(e.detail.scrollTarget || e.detail.targetId || mapped.scrollId);
      }
    };

    const handleDASResume = () => setShowOnePageResume(true);

    const handleDASInterview = (e: any) => {
      if (e.detail) {
        handleLaunchMockInterview(
          e.detail.company || "Razorpay / Fintech",
          e.detail.role || "Full Stack Engineer"
        );
      } else {
        setActiveTab("interview");
      }
    };

    const handleDASSetFilter = (e: any) => {
      if (e.detail && e.detail.filter) {
        setActiveTab("projects");
        setFocusOnDas(false);
        window.dispatchEvent(
          new CustomEvent("das-filter-projects", { detail: { branch: e.detail.filter } })
        );
      }
    };

    const handleDASUpdateProfile = (e: any) => {
      const field = e?.detail?.field;
      const value = e?.detail?.value;
      if (!field || value === undefined) return;
      let displayVal: string | number = String(value);
      setProfile((prev) => {
        const next = { ...prev } as any;
        const fKey = String(field).trim();
        if (fKey === "cgpa") {
          const clamped = Math.max(0, Math.min(10, Number(value)));
          if (Number.isNaN(clamped)) return prev;
          next.cgpa = Number(clamped.toFixed(2));
          displayVal = next.cgpa;
        } else if (fKey === "backlogs") {
          const clamped = Math.max(0, Math.round(Number(value)));
          if (Number.isNaN(clamped)) return prev;
          next.backlogs = clamped;
          displayVal = clamped;
        } else if (fKey === "coding" || fKey === "communication") {
          const clamped = Math.max(1, Math.min(10, Math.round(Number(value))));
          if (Number.isNaN(clamped)) return prev;
          next[fKey] = clamped;
          displayVal = clamped;
        } else if (fKey === "internships") {
          const clamped = Math.max(0, Math.round(Number(value)));
          if (Number.isNaN(clamped)) return prev;
          next.internships = clamped;
          displayVal = clamped;
        } else if (fKey === "branch") {
          next.branch = String(value).toUpperCase();
          displayVal = next.branch;
        } else if (fKey === "targetRole" || fKey === "target_role") {
          next.targetRole = String(value);
          displayVal = next.targetRole;
        } else if (fKey === "fullName" || fKey === "full_name") {
          next.fullName = String(value).trim();
          displayVal = next.fullName;
          setUsername(next.fullName);
        } else {
          return prev;
        }
        try {
          localStorage.setItem("pathfinder_profile_draft", JSON.stringify(next));
        } catch { }
        queueMicrotask(() => {
          void fetchPrediction(next);
          if (!e?.detail?.silentToast) {
            toast.success(`Updated ${String(field).toUpperCase()} to ${displayVal}`, {
              id: "das-profile-update",
            });
          }
        });
        return next;
      });
    };

    const handleDASDemoProfile = (e: any) => {
      const act = String(e?.detail?.action || "load").toLowerCase();
      if (act === "clear") {
        handleClearDemoProfile();
      } else {
        handleLoadDemoProfile();
      }
    };

    let lastNavToastTab = "";
    let lastNavToastAt = 0;

    // Handler for toolRunner.ts (pathfinder:agent-action)
    const handleAgentAction = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { toolName, args } = customEvent.detail || {};

      // 1. Automatic Tab Switching
      if (toolName === "navigate_dashboard_tab" && args?.tabName) {
        const mapped = mapToValidTab(String(args.tabName));
        setActiveTab(mapped.tab);
        setFocusOnDas(false);
        scrollToElement(mapped.scrollId);
        const now = Date.now();
        if (lastNavToastTab !== mapped.tab || now - lastNavToastAt > 2500) {
          lastNavToastTab = mapped.tab;
          lastNavToastAt = now;
          toast.info(`Switched to ${mapped.tab.toUpperCase()} module`, { id: "das-nav-toast" });
        }
      }

      // 2. Automatic Blueprint Open (1 to 23)
      if (toolName === "open_blueprint" && args?.blueprintNumber) {
        setActiveTab("projects");
        setFocusOnDas(false);
        toast.success(`Opening Capstone Blueprint #${args.blueprintNumber}`);
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("das-open-blueprint", {
              detail: { blueprintNumber: Number(args.blueprintNumber) },
            })
          );
        }, 300);
      }

      // 3. Live Readiness Score Update during Viva / Mock Interview
      if (toolName === "update_readiness_score" && typeof args?.scoreDelta === "number") {
        const delta = Number(args.scoreDelta);
        setPrediction((prev) => {
          const baseChance = prev.chance ?? 50;
          const nextChance = Math.min(99, Math.max(10, Number((baseChance + delta).toFixed(1))));
          return {
            ...prev,
            chance: nextChance,
            tone: nextChance >= 75 ? "strong" : nextChance >= 55 ? "steady" : "focus",
          };
        });
        if (delta >= 0) {
          toast.success(`Readiness Score +${delta}%: ${args.feedback || "Strong answer!"}`);
        } else {
          toast.warning(
            `Readiness Score ${delta}%: ${args.feedback || "Needs deeper architecture clarity."}`
          );
        }
      }

      // 4. Placement Intelligence Lookup Notification
      if (toolName === "fetch_placement_intelligence_for_client") {
        toast.info(
          `Analyzing 972-record synthetic placement dataset for: ${args?.companyOrBranch || "Placement Analytics"}...`
        );
      }
    };

    window.addEventListener("das-navigate", handleDASNavigate);
    window.addEventListener("das-navigate-tab", handleDASNavigate);
    window.addEventListener("das-open-resume-builder", handleDASResume);
    window.addEventListener("das-open-mock-interview", handleDASInterview);
    window.addEventListener("das-set-filter", handleDASSetFilter);
    window.addEventListener("das-update-profile", handleDASUpdateProfile);
    window.addEventListener("das-demo-profile", handleDASDemoProfile);
    window.addEventListener("pathfinder:agent-action", handleAgentAction);

    return () => {
      window.removeEventListener("das-navigate", handleDASNavigate);
      window.removeEventListener("das-navigate-tab", handleDASNavigate);
      window.removeEventListener("das-open-resume-builder", handleDASResume);
      window.removeEventListener("das-open-mock-interview", handleDASInterview);
      window.removeEventListener("das-set-filter", handleDASSetFilter);
      window.removeEventListener("das-update-profile", handleDASUpdateProfile);
      window.removeEventListener("das-demo-profile", handleDASDemoProfile);
      window.removeEventListener("pathfinder:agent-action", handleAgentAction);
    };
  }, []);

  // Listen to voice/automation Focus-on-DAS & Docked Stage layout events
  useEffect(() => {
    const onToggleFocus = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (typeof detail?.focus === "boolean") {
        setFocusOnDas(detail.focus);
      } else {
        setFocusOnDas((prev) => !prev);
      }
    };
    const onStageLayout = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (typeof detail?.dockedOpen === "boolean") {
        setIsStageDockedOpen(detail.dockedOpen);
      }
      if (typeof detail?.focusMode === "boolean") {
        setFocusOnDas(detail.focusMode);
      }
      if (typeof detail?.isSpeaking === "boolean") {
        setIsDasSpeaking(detail.isSpeaking);
      }
      if (detail?.layoutMode === "background" || detail?.layoutMode === "docked") {
        setDasLayoutMode(detail.layoutMode);
      }
    };
    window.addEventListener("das-toggle-focus", onToggleFocus);
    window.addEventListener("das-stage-layout", onStageLayout);
    return () => {
      window.removeEventListener("das-toggle-focus", onToggleFocus);
      window.removeEventListener("das-stage-layout", onStageLayout);
    };
  }, []);

  const [profile, setProfile] = useState<StudentProfileState>(() => {
    if (typeof window !== "undefined") {
      return buildInitialProfileFromStorage(
        localStorage.getItem("pathfinder_profile_draft"),
        localStorage.getItem("pathfinder_user")
      );
    }
    return DEFAULT_STUDENT_PROFILE;
  });

  const [isDemoProfile, setIsDemoProfile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("pathfinder_profile_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        return (
          (parsed?.email || "").toLowerCase() === "guest@pathfinder.ai" &&
          !isProfileUnconfigured(parsed)
        );
      }
      const userRaw = localStorage.getItem("pathfinder_user");
      if (!userRaw) return true;
      const userParsed = JSON.parse(userRaw);
      return (userParsed?.email || "").toLowerCase() === "guest@pathfinder.ai";
    } catch {
      return true;
    }
  });

  const [showOnePageResume, setShowOnePageResume] = useState<boolean>(false);
  const [arenaCustomChallenge, setArenaCustomChallenge] = useState<{
    company: string;
    role: string;
    question: string;
    starterCode: string;
    expectedKeywords: string[];
  } | null>(null);
  const [interviewCompany, setInterviewCompany] = useState<string>("Razorpay / Fintech");
  const [interviewRole, setInterviewRole] = useState<string>("Full Stack Engineer");
  const [interviewMode, setInterviewMode] = useState<"company" | "defense">(() => {
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("tab")?.toLowerCase();
      if (t === "defense" || t === "viva") return "defense";
    }
    return "company";
  });
  const [interviewWorkspace, setInterviewWorkspace] = useState<"coding" | "mock">(() => {
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("tab")?.toLowerCase();
      if (t === "defense" || t === "viva" || t === "mock-interview") return "mock";
    }
    return "coding";
  });

  const handleLaunchMockInterview = (companyName: string, roleTitle: string) => {
    setInterviewMode("company");
    setInterviewWorkspace("mock");
    setInterviewCompany(companyName);
    setInterviewRole(roleTitle);
    setActiveTab("interview");
  };

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
        } catch { }
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
        } catch { }
      }
    }
    return "";
  });

  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pathfinder_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.role) return parsed.role;
        } catch { }
      }
    }
    return "student";
  });

  const [isServerWakingUp, setIsServerWakingUp] = useState<boolean>(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSigningIn, setOauthSigningIn] = useState<boolean>(false);
  const [authView, setAuthView] = useState<"landing" | "login">(() => {
    if (initialAuthView) return initialAuthView;
    if (typeof window === "undefined") return "landing";
    const pathname = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash || "";
    if (
      pathname === "/login" ||
      pathname === "/signin" ||
      params.get("auth") === "login" ||
      params.get("oauth_error") ||
      hash.includes("oauth_error=")
    ) {
      return "login";
    }
    return "landing";
  });
  const oauthHandledRef = useRef<boolean>(false);
  const loginSeqRef = useRef<number>(0);
  const pendingAuthSyncRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (initialAuthView) {
      setAuthView(initialAuthView);
    }
  }, [initialAuthView]);

  useEffect(() => {
    if (oauthError && !isAuthenticated) {
      setAuthView("login");
    }
  }, [oauthError, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated || typeof window === "undefined") return;
    const handlePopState = () => {
      const pathname = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (pathname === "/login" || pathname === "/signin" || params.get("auth") === "login") {
        setAuthView("login");
      } else {
        setAuthView("landing");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthenticated]);

  const openLoginView = () => {
    setAuthView("login");
    if (typeof window !== "undefined") {
      try {
        const pathname = window.location.pathname.toLowerCase();
        if (pathname !== "/login" && pathname !== "/signin") {
          window.history.pushState({ authView: "login" }, "", "/login");
        }
      } catch { }
    }
  };

  const openLandingView = () => {
    setAuthView("landing");
    if (typeof window !== "undefined") {
      try {
        if (window.location.pathname !== "/" || window.location.search) {
          window.history.pushState({ authView: "landing" }, "", "/");
        }
      } catch { }
    }
  };

  // Dynamic Document Page Titles & ?tab= URL sync based on Auth & Active Tab
  useEffect(() => {
    if (!isAuthenticated) {
      document.title =
        authView === "login"
          ? "Sign In · Pathfinder 2.0"
          : "Pathfinder 2.0 · Autonomous AI Career Intelligence";
      return;
    }
    const titles: Record<TabId, string> = {
      overview: "Executive Dashboard · Pathfinder 2.0",
      interview: "Interview & Project Defense Simulator · Pathfinder 2.0",
      skills: "6-Week Sprint Roadmap · Pathfinder 2.0",
      projects: "Flagship Portfolio Blueprints · Pathfinder 2.0",
      analytics: "Cohort Placement Intelligence · Pathfinder 2.0",
      resume: "ATS Resume Studio & Scanner · Pathfinder 2.0",
      branches: "Branch & Degree Analytics · Pathfinder 2.0",
      profile: "Candidate Profile & SSOT · Pathfinder 2.0",
      progress: "My Progress Journey · Pathfinder 2.0",
      roles: "Target Role Intelligence · Pathfinder 2.0",
    };
    document.title = titles[activeTab] || "Pathfinder 2.0 · Autonomous AI Career Intelligence";
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("tab") !== activeTab) {
          url.searchParams.set("tab", activeTab);
          window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
        }
      } catch { }
    }
  }, [activeTab, isAuthenticated, authView]);

  // Authentication session expiration listener (401 token revocation)
  useEffect(() => {
    const handleRemoteLogout = () => {
      loginSeqRef.current++;
      pendingAuthSyncRef.current = null;
      setIsAuthenticated(false);
      setAuthView("landing");
      setUserRole("student");
    };
    window.addEventListener("pathfinder_logout", handleRemoteLogout);
    return () => window.removeEventListener("pathfinder_logout", handleRemoteLogout);
  }, []);

  // Auto-detect and force Boss mode on app load without waiting for login
  useEffect(() => {
    initAuthMode();
  }, []);

  // Pre-warm backend immediately on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => { });
    const interval = setInterval(() => {
      fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => { });
    }, 9 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Complete OAuth returns before rendering either the login card or dashboard.
  useEffect(() => {
    if (typeof window === "undefined") return;
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
        setOauthError(
          messages[queryError.toLowerCase()] || "Sign-in was cancelled or failed. Please try again."
        );
        return;
      }

      if (oauthCode) {
        setOauthSigningIn(true);
        (async () => {
          try {
            const exchange = () =>
              fetchWithTimeout(
                `${API_BASE}/api/auth/oauth/exchange`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: oauthCode }),
                },
                60000
              );

            let exchangeResp: Response;
            try {
              exchangeResp = await exchange();
            } catch (networkErr) {
              if (networkErr instanceof TypeError) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                exchangeResp = await exchange();
              } else {
                throw networkErr;
              }
            }

            const authData = await exchangeResp.json().catch(() => ({} as any));
            if (!exchangeResp.ok || !authData.success || !authData.user || !authData.token) {
              throw new Error(
                authData.message || authData.detail || "OAuth sign-in could not be completed."
              );
            }

            localStorage.setItem("pathfinder_token", authData.token);
            localStorage.setItem("pathfinder_user", JSON.stringify(authData.user));
            setUserRole(authData.user.role || "student");
            setOauthError(null);
            await handleLogin({
              username: authData.user.username || "Student",
              email: authData.user.email,
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
  const UNCONFIGURED_PREDICTION: {
    chance: number | null;
    label: string;
    tone: "strong" | "steady" | "focus";
    strengths: string[];
    priorities: string[];
    breakdown: Record<string, number>;
  } = {
    chance: null,
    label: "Awaiting Profile Input",
    tone: "focus",
    strengths: [],
    priorities: [
      "Open Slide 07 Profile & Settings to enter your CGPA, branch, and skills to compute placement readiness.",
    ],
    breakdown: {},
  };

  const [prediction, setPrediction] = useState<{
    chance: number | null;
    label: string;
    tone: "strong" | "steady" | "focus";
    strengths: string[];
    priorities: string[];
    breakdown: Record<string, number>;
  }>(() =>
    isProfileUnconfigured(profile)
      ? UNCONFIGURED_PREDICTION
      : isDemoSampleProfile(profile)
        ? DEMO_SAMPLE_PREDICTION
        : {
          chance: null,
          label: PREDICTION_PENDING_LABEL,
          tone: "focus",
          strengths: [],
          priorities: [
            "Fetching your hybrid Random Forest + evidence rubric score from the Pathfinder backend...",
          ],
          breakdown: {},
        }
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const predictionRetryRef = useRef<number>(0);

  // Continuously broadcast active slide & user profile context to the persistent 24/7 DAS Co-Pilot
  useEffect(() => {
    const knowledge = getTabKnowledge(activeTab);
    const liveContext = {
      activeTab,
      tabTitle: knowledge?.title || activeTab,
      purpose: knowledge?.purpose || "",
      howToExplain: knowledge?.howToUse || "",
      widgetsShown: knowledge?.widgets || [],
      focusOnDas,
      isAuthenticated,
      honorific: getUserRole(),
      userName: username,
      userEmail: email,
      readinessChance: prediction.chance,
      tone: prediction.tone,
      branch: profile.branch,
      cgpa: profile.cgpa,
      backlogs: profile.backlogs,
      internships: profile.internships,
      projectsCount: profile.projectsCount,
      targetRole: profile.targetRole,
      skillsSample: (profile.technicalSkills || []).slice(0, 8),
      timestamp: Date.now(),
    };
    (window as any).__DAS_PAGE_CONTEXT__ = liveContext;
    window.dispatchEvent(new CustomEvent("das:page-context", { detail: liveContext }));
  }, [
    activeTab,
    focusOnDas,
    isAuthenticated,
    username,
    email,
    prediction.chance,
    prediction.tone,
    profile.branch,
    profile.cgpa,
    profile.backlogs,
    profile.internships,
    profile.projectsCount,
    profile.targetRole,
    profile.technicalSkills,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("username") || params.get("user");
    const emailParam = params.get("email");
    if (userParam || emailParam) {
      if (userParam) {
        setUsername(userParam);
        setIsAuthenticated(true);
      }
      if (emailParam) setEmail(emailParam);
      handleAuthLoginDetected(emailParam || "", userParam || "");
    }

    fetchPrediction(profile);
    fetchCohortAnalytics({ year: 2026, branch: "All", gender: "All", skill: "All" });

    const coldTimer = setTimeout(() => setIsServerWakingUp(true), 2500);
    fetch(`${API_BASE}/api/health`)
      .then((res) => {
        if (res.ok) {
          clearTimeout(coldTimer);
          setIsServerWakingUp(false);
        }
      })
      .catch(() => setIsServerWakingUp(true));

    const keepAlive = setInterval(() => {
      fetch(`${API_BASE}/api/health`).catch(() => { });
    }, 180000);

    const handleBackendStatus = (ev: Event) => {
      const status = (ev as CustomEvent<{ status?: string }>).detail?.status;
      if (status === "waking" || status === "offline") setIsServerWakingUp(true);
      if (status === "online") {
        clearTimeout(coldTimer);
        setIsServerWakingUp(false);
      }
    };
    window.addEventListener("pathfinder-backend-status", handleBackendStatus);

    return () => {
      clearTimeout(coldTimer);
      clearInterval(keepAlive);
      window.removeEventListener("pathfinder-backend-status", handleBackendStatus);
    };
  }, []);

  const handleLogin = async (user: {
    username: string;
    email: string;
    isNewUser?: boolean;
    bypassOnboarding?: boolean;
  }) => {
    const seq = ++loginSeqRef.current;

    // Inspect prior session BEFORE overwriting pathfinder_user so OAuth provider/tokens stay intact
    let prevAuthProvider = "";
    try {
      const prevUser = JSON.parse(localStorage.getItem("pathfinder_user") || "{}");
      if (
        prevUser?.email &&
        String(prevUser.email).toLowerCase() === user.email.toLowerCase()
      ) {
        prevAuthProvider = String(prevUser.auth_provider || "");
      }
    } catch { }
    const isOAuth =
      (prevAuthProvider === "google" || prevAuthProvider === "github") &&
      Boolean(localStorage.getItem("pathfinder_token"));

    // 1a. Reset cross-account caches synchronously so a previous student's state never leaks
    setResumeFeedback(null);
    setRoadmap(null);
    setCohortInsight(null);
    localStorage.removeItem("pathfinder_backend_profile");
    let matchedLocalDraft: Record<string, any> | null = null;
    try {
      const prevDraft = JSON.parse(localStorage.getItem("pathfinder_profile_draft") || "{}");
      if (prevDraft?.email && prevDraft.email.toLowerCase() === user.email.toLowerCase()) {
        if (prevDraft?.branch) matchedLocalDraft = prevDraft;
      } else {
        localStorage.removeItem("pathfinder_profile_draft");
        localStorage.removeItem("pathfinder_onboarding_draft");
      }
    } catch {
      localStorage.removeItem("pathfinder_profile_draft");
      localStorage.removeItem("pathfinder_onboarding_draft");
    }
    const prevSidEmail = localStorage.getItem("pathfinder_session_email");
    if (prevSidEmail && prevSidEmail.toLowerCase() !== user.email.toLowerCase()) {
      localStorage.setItem(
        "pathfinder_session_id",
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `pf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      );
    }
    localStorage.setItem("pathfinder_session_email", user.email.toLowerCase());

    if (!isOAuth) {
      // Clear any previous account's bearer token synchronously before background login refresh
      localStorage.removeItem("pathfinder_token");
    }

    // 1b. Immediately persist user session synchronously for instant dashboard entry
    const role = handleAuthLoginDetected(user.email, user.username);
    const userObj: Record<string, any> = {
      username: user.username,
      email: user.email,
      role: role,
      is_new_user: Boolean(user.isNewUser),
    };
    if (isOAuth && prevAuthProvider) {
      userObj.auth_provider = prevAuthProvider;
    }
    localStorage.setItem("pathfinder_user", JSON.stringify(userObj));

    // 2. Commit identity, greeting, initial profile, and Dashboard visibility synchronously (<50ms)
    setUsername(user.username);
    setEmail(user.email);
    setUserRole(role);
    setMessages([
      {
        role: "assistant",
        content:
          role === "Guest"
            ? getRememberedGuestName()
              ? `Hi ${getRememberedGuestName()}! How can I help you today?`
              : "Hi! Welcome to Pathfinder! May I know your name?"
            : `Hi ${role}! What's up?`,
      },
    ]);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pathfinder:auth-change", {
          detail: {
            authenticated: true,
            role,
            honorificKey: toHonorificKey(role),
            email: user.email,
            username: user.username,
          },
        })
      );
    }

    let immediateProfile: StudentProfileState;
    let immediateIsDemo = false;
    if (user.bypassOnboarding) {
      immediateProfile = {
        ...DEMO_GUEST_PROFILE,
        email: user.email,
        onboardingCompleted: true,
        wizardStep: 5,
      };
      immediateIsDemo = true;
      try {
        localStorage.setItem("pathfinder_profile_draft", JSON.stringify(immediateProfile));
      } catch { }
    } else if (matchedLocalDraft) {
      immediateProfile = {
        ...DEFAULT_STUDENT_PROFILE,
        ...matchedLocalDraft,
        fullName: pickCandidateFullName(matchedLocalDraft.fullName, user.username) || user.username,
        email: user.email,
        onboardingCompleted: true,
      };
      immediateIsDemo = false;
    } else {
      immediateProfile = {
        ...DEFAULT_STUDENT_PROFILE,
        fullName: pickCandidateFullName(user.username) || user.username,
        email: user.email,
        githubUrl: "",
        leetcodeUrl: "",
        codingProfiles: { github: "", leetcode: "", linkedin: "" },
        onboardingCompleted: true,
      };
      immediateIsDemo = true;
    }

    setProfile(immediateProfile);
    setIsDemoProfile(immediateIsDemo);
    setActiveTab("overview");
    if (typeof window !== "undefined") {
      try {
        const pathname = window.location.pathname.toLowerCase();
        if (pathname === "/login" || pathname === "/signin") {
          window.history.replaceState({}, "", "/?tab=overview");
        }
      } catch { }
    }
    setIsAuthenticated(true);
    if (isDemoSampleProfile(immediateProfile)) {
      setPrediction(DEMO_SAMPLE_PREDICTION);
    }
    void fetchPrediction(immediateProfile);

    // 3. Synchronize Bearer token + cloud profile in the background without blocking dashboard UI entry
    const syncTask = (async () => {
      if (!isOAuth) {
        try {
          const loginResp = await fetchWithTimeout(
            `${API_BASE}/api/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: user.username, email: user.email }),
            },
            4500
          );
          if (loginSeqRef.current !== seq) return;
          if (loginResp.ok) {
            const authData = await loginResp.json();
            if (loginSeqRef.current !== seq) return;
            if (authData.token) {
              localStorage.setItem("pathfinder_token", authData.token);
              if (authData.user) {
                localStorage.setItem(
                  "pathfinder_user",
                  JSON.stringify({
                    ...authData.user,
                    honorific: role,
                    is_new_user: Boolean(user.isNewUser ?? authData.is_new_user),
                  })
                );
                const resolved = handleAuthLoginDetected(
                  authData.user.email || user.email,
                  authData.user.username || user.username
                );
                setUserRole(resolved);
              }
            }
          }
        } catch { }
      }

      if (user.bypassOnboarding || loginSeqRef.current !== seq) return;

      try {
        const resp = await fetchWithTimeout(
          `${API_BASE}/api/profile?email=${encodeURIComponent(user.email)}`,
          {},
          4500
        );
        if (loginSeqRef.current !== seq) return;
        if (resp.ok) {
          const data = await resp.json();
          if (loginSeqRef.current !== seq) return;
          if (data && data.branch) {
            const restoredCodingProfiles = {
              ...(data.coding_profiles || {}),
              github: data.github_url ?? data.coding_profiles?.github ?? "",
              leetcode: data.leetcode_url ?? data.coding_profiles?.leetcode ?? "",
              linkedin: data.linkedin_url ?? data.coding_profiles?.linkedin ?? "",
            };
            const mappedSkills =
              Array.isArray(data.technicalSkills) && data.technicalSkills.length > 0
                ? data.technicalSkills
                : Array.isArray(data.technical_skills) && data.technical_skills.length > 0
                  ? data.technical_skills
                  : Array.isArray(data.skills) && data.skills.length > 0
                    ? data.skills
                    : DEFAULT_STUDENT_PROFILE.technicalSkills;
            const mappedBacklogs = data.active_backlogs ?? data.activeBacklogs ?? data.backlogs ?? 0;
            const mappedFullName =
              pickCandidateFullName(data.fullName ?? data.full_name, user.username) || user.username;
            const mapped: StudentProfileState = {
              ...DEFAULT_STUDENT_PROFILE,
              ...data,
              email: user.email,
              onboardingCompleted: true,
              wizardStep: data.wizard_step ?? data.wizardStep ?? 5,
              cgpa: data.cgpa ?? 7.8,
              backlogs: mappedBacklogs,
              activeBacklogs: mappedBacklogs,
              internships: data.internships ?? 1,
              coding: data.coding ?? 7,
              communication: data.communication ?? 7,
              projectsCount: data.projects_count ?? data.projectsCount ?? DEFAULT_STUDENT_PROFILE.projectsCount,
              technicalSkills: mappedSkills,
              skills: mappedSkills,
              certifications: Array.isArray(data.certifications)
                ? data.certifications
                : DEFAULT_STUDENT_PROFILE.certifications,
              targetRole: data.target_role || data.targetRole || DEFAULT_STUDENT_PROFILE.targetRole,
              targetTier: data.target_tier || data.targetTier || DEFAULT_STUDENT_PROFILE.targetTier,
              branch: data.branch || DEFAULT_STUDENT_PROFILE.branch,
              graduationYear: data.graduation_year || data.graduationYear || 2026,
              currentYear: data.current_year || data.currentYear || DEFAULT_STUDENT_PROFILE.currentYear,
              fullName: mappedFullName,
              college: data.college || "",
              course: data.course || "",
              yearSemester: data.year_semester || data.yearSemester || "",
              tenthPercentage: data.tenth_percentage ?? data.tenthPercentage ?? 90,
              twelfthPercentage: data.twelfth_percentage ?? data.twelfthPercentage ?? 88,
              percentage: data.percentage ?? 74.1,
              githubUrl: restoredCodingProfiles.github,
              leetcodeUrl: restoredCodingProfiles.leetcode,
              codingProfiles: restoredCodingProfiles,
            };
            setProfile(mapped);
            localStorage.setItem("pathfinder_profile_draft", JSON.stringify(mapped));
            setIsDemoProfile(false);
            void fetchPrediction(mapped);
          }
        }
      } catch (err) {
        console.warn("Could not retrieve backend profile on login:", err);
      }
    })();

    pendingAuthSyncRef.current = syncTask;
    void syncTask.finally(() => {
      if (pendingAuthSyncRef.current === syncTask) {
        pendingAuthSyncRef.current = null;
      }
    });
  };

  function markStoredUserOnboardingComplete() {
    try {
      const rawUser = localStorage.getItem("pathfinder_user");
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        if (parsedUser && parsedUser.is_new_user) {
          localStorage.setItem(
            "pathfinder_user",
            JSON.stringify({ ...parsedUser, is_new_user: false })
          );
        }
      }
    } catch { }
  }

  const handleSaveProfile = async (updated: StudentProfileState) => {
    const profileToSave = { ...updated, email: updated.email || email };
    setProfile(profileToSave);
    setIsDemoProfile(false);
    localStorage.setItem("pathfinder_profile_draft", JSON.stringify(profileToSave));
    markStoredUserOnboardingComplete();

    try {
      if (pendingAuthSyncRef.current) {
        await Promise.race([
          pendingAuthSyncRef.current,
          new Promise<void>((resolve) => setTimeout(resolve, 2000)),
        ]);
      }
      const payload = {
        email: profileToSave.email,
        full_name: profileToSave.fullName,
        college: profileToSave.college,
        branch: profileToSave.branch,
        course: profileToSave.course,
        year_semester: profileToSave.yearSemester,
        tenth_percentage: profileToSave.tenthPercentage,
        twelfth_percentage: profileToSave.twelfthPercentage,
        cgpa: profileToSave.cgpa,
        percentage: profileToSave.percentage,
        semester_cgpas: profileToSave.semesterCgpas,
        backlogs: profileToSave.backlogs,
        history_of_backlogs: profileToSave.historyOfBacklogs,
        skills: profileToSave.technicalSkills || profileToSave.skills,
        tools: profileToSave.tools,
        languages: profileToSave.languages,
        projects_count: profileToSave.projectsCount,
        internships: profileToSave.internships,
        certifications: profileToSave.certifications,
        github_url: profileToSave.githubUrl ?? profileToSave.codingProfiles?.github ?? "",
        leetcode_url: profileToSave.leetcodeUrl ?? profileToSave.codingProfiles?.leetcode ?? "",
        linkedin_url: profileToSave.codingProfiles?.linkedin ?? "",
        coding_profiles: {
          ...(profileToSave.codingProfiles || {}),
          github: profileToSave.githubUrl ?? profileToSave.codingProfiles?.github ?? "",
          leetcode: profileToSave.leetcodeUrl ?? profileToSave.codingProfiles?.leetcode ?? "",
          linkedin: profileToSave.codingProfiles?.linkedin ?? "",
        },
        target_role: profileToSave.targetRole,
        target_tier: profileToSave.targetTier,
        target_domain: profileToSave.targetDomain,
        preferred_location: profileToSave.preferredLocation,
        expected_package: profileToSave.expectedPackage,
        preferred_company_type: profileToSave.preferredCompanyType,
        communication: profileToSave.communication,
        coding: profileToSave.coding,
        graduation_year: profileToSave.graduationYear,
        onboarding_completed: true,
        wizard_step: 5,
      };

      const saveResp = await fetchWithTimeout(
        `${API_BASE}/api/profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        6000
      );
      if (saveResp.ok) {
        toast.success("Profile saved and synchronized with AI engine!");
      }
    } catch (err) {
      console.warn("Backend save profile error:", err);
      toast.info("Profile saved locally and Dashboard recalculated.");
    }

    await fetchPrediction(profileToSave);
  };

  const handleUpdateTargetRole = (newRole: string) => {
    const updated = { ...profile, targetRole: newRole };
    setProfile(updated);
    fetchPrediction(updated);
  };

  const fetchPrediction = async (
    p: StudentProfileState,
    overrides?: { atsScore?: number | null; githubScore?: number | null }
  ) => {
    if (isProfileUnconfigured(p)) {
      setPrediction(UNCONFIGURED_PREDICTION);
      setIsCalculating(false);
      return;
    }
    setIsCalculating(true);
    try {
      const githubUrl = (p.githubUrl ?? p.codingProfiles?.github ?? "").trim();
      const leetcodeUrl = (p.leetcodeUrl ?? p.codingProfiles?.leetcode ?? "").trim();
      const effectiveAts =
        overrides?.atsScore !== undefined ? overrides.atsScore : resumeFeedback?.score ?? null;
      const effectiveGithubScore =
        overrides?.githubScore !== undefined
          ? overrides.githubScore
          : p.githubVerifiedScore ?? null;
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
        skills: p.technicalSkills || p.skills || [],
        certifications: p.certifications || [],
        projects_count: p.projectsCount ?? 0,
        github_url: githubUrl,
        leetcode_url: leetcodeUrl,
        tenth_percentage: p.tenthPercentage ?? 0,
        twelfth_percentage: p.twelfthPercentage ?? 0,
        ats_score: effectiveAts,
        github_verified_score: effectiveGithubScore,
      };

      const [predResp, skillResp] = await Promise.allSettled([
        fetchWithTimeout(
          `${API_BASE}/api/predict`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          45000
        ),
        fetchWithTimeout(
          `${API_BASE}/api/skill-gap`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          45000
        ),
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
        predictionRetryRef.current = 0;
        if (typeof combined.chance === "number") {
          recordProgressEvent(
            "prediction",
            combined.chance,
            String(combined.label || "ML readiness"),
            `${p.branch || ""} · CGPA ${p.cgpa ?? "-"}`.trim()
          );
        }
      } else {
        fallbackPredict(p, effectiveAts, effectiveGithubScore);
      }
    } catch {
      fallbackPredict(
        p,
        overrides?.atsScore !== undefined ? overrides.atsScore : resumeFeedback?.score ?? null,
        overrides?.githubScore !== undefined ? overrides.githubScore : p.githubVerifiedScore ?? null
      );
    } finally {
      setIsCalculating(false);
    }
  };

  // Never invent a local percentage for user profiles. If the Guest demo profile is still
  // waiting for the waking Render backend, keep its cached sample prediction visible while retrying.
  const fallbackPredict = (
    p: StudentProfileState,
    _atsScore?: number | null,
    _githubScore?: number | null
  ) => {
    if (isDemoSampleProfile(p)) {
      setPrediction(DEMO_SAMPLE_PREDICTION);
    } else {
      setPrediction({
        chance: null,
        label: PREDICTION_WAKING_LABEL,
        tone: "focus",
        strengths: [],
        priorities: [
          "The hybrid score server is starting up. Your live Random Forest + evidence rubric score will appear automatically — no estimated number is shown in the meantime.",
        ],
        breakdown: {},
      });
    }
    if (predictionRetryRef.current < 4) {
      predictionRetryRef.current += 1;
      window.setTimeout(() => {
        void fetchPrediction(p);
      }, 6000 * predictionRetryRef.current);
    }
  };

  // 2. Roadmap State
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);

  const fetchRoadmap = async () => {
    setIsRoadmapLoading(true);
    try {
      const resp = await fetchWithTimeout(
        `${API_BASE}/api/ai/roadmap`,
        {
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
        },
        60000
      );
      if (resp.ok) {
        const data = await resp.json();
        setRoadmap(data);
        toast.success("6-Week Placement Roadmap regenerated!");
      }
    } catch (err) {
      console.warn("Roadmap API error, using structured local plan", err);
    } finally {
      setIsRoadmapLoading(false);
    }
  };

  // 3. AI Coach Messages
  const [messages, setMessages] = useState<Message[]>(() => {
    const initialRole = typeof window !== "undefined" ? getUserRole() : "Boss";
    return [
      {
        role: "assistant",
        content: `Hi ${initialRole}, I'm your Pathfinder AI agent, how can I help you?`,
      },
    ];
  });
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatWakingUp, setIsChatWakingUp] = useState(false);
  const [isGlobalServerWakingUp, setIsGlobalServerWakingUp] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const isChatSendingRef = useRef(false);

  useEffect(() => {
    const handleWakingUpEvent = (e: any) => {
      setIsGlobalServerWakingUp(Boolean(e.detail?.isWakingUp));
    };
    window.addEventListener("pathfinder_server_waking_up", handleWakingUpEvent);

    const pingInterval = setInterval(() => {
      fetch(`${API_BASE}/api/health`).catch(() => { });
    }, 4 * 60 * 1000);

    return () => {
      window.removeEventListener("pathfinder_server_waking_up", handleWakingUpEvent);
      clearInterval(pingInterval);
    };
  }, []);

  const handleStopChat = () => {
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    isChatSendingRef.current = false;
    setIsChatLoading(false);
    setIsChatWakingUp(false);
  };

  const handleSendMessage = async (
    userText: string,
    customHistory?: Message[],
    originTab?: string,
    cardContext?: string
  ) => {
    const trimmed = userText.trim();
    if (!trimmed || isChatSendingRef.current) return;
    isChatSendingRef.current = true;

    startTransition(() => {
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setIsChatLoading(true);
      setIsChatWakingUp(false);
    });

    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
    }
    const abortCtrl = new AbortController();
    chatAbortRef.current = abortCtrl;

    const coldStartTimer = setTimeout(() => {
      setIsChatWakingUp(true);
    }, 8000);

    const currentBase = customHistory || messages;
    const cleanHistory = currentBase
      .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    const effectiveTab = originTab || activeTab;
    const tabKnowledge = getTabKnowledge(effectiveTab);

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
      active_tab: effectiveTab,
      page_context: {
        activeTabTitle: tabKnowledge?.title || effectiveTab,
        screenName: tabKnowledge?.title || effectiveTab,
        screenPurpose: tabKnowledge?.purpose || "",
        cardContext: cardContext || "",
        honorific: getUserRole(),
        userName: username,
        userEmail: email,
        placementReadinessChance:
          prediction.chance !== null ? `${prediction.chance}%` : "Unconfigured",
        placementReadinessLabel: prediction.label,
        candidateBranch: profile.branch,
        targetRole: profile.targetRole,
        cgpa: profile.cgpa,
        backlogs: profile.backlogs,
        internships: profile.internships,
        codingConfidence: profile.coding,
        communicationRating: profile.communication,
        cohortYear: cohortFilters.year,
        cohortBranch: cohortFilters.branch,
      },
    };

    const streamBackend = async (): Promise<boolean> => {
      try {
        let voiceReplyEnabled = true;
        try {
          const stored = localStorage.getItem("pathfinder_voice_reply_enabled");
          if (stored !== null) voiceReplyEnabled = stored === "true";
        } catch { }

        const ragPrompt = buildRagGeminiSystemPrompt({
          query: trimmed,
          profile: chatPayload.profile,
          honorific: getUserRole(),
          activeTab: effectiveTab,
          readinessChance:
            prediction.chance !== null ? `${prediction.chance}%` : "Unconfigured",
        });

        let hasAppendedLivePlaceholder = false;
        const liveReply = await geminiLive.sendTurn(trimmed, {
          systemPrompt: ragPrompt,
          speakAudio: voiceReplyEnabled,
          callbacks: {
            onToken: (fullText: string) => {
              if (abortCtrl.signal.aborted) return;
              clearTimeout(coldStartTimer);
              setIsChatWakingUp(false);
              if (!hasAppendedLivePlaceholder) {
                hasAppendedLivePlaceholder = true;
                startTransition(() => {
                  setMessages((prev) => [...prev, { role: "assistant", content: fullText }]);
                });
              } else {
                startTransition(() => {
                  setMessages((prev) => {
                    const updated = [...prev];
                    if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
                      updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        content: fullText,
                      };
                    }
                    return updated;
                  });
                });
              }
            },
          },
        });

        if (liveReply && liveReply.trim().length >= 5) {
          clearTimeout(coldStartTimer);
          setIsChatWakingUp(false);
          if (!hasAppendedLivePlaceholder) {
            startTransition(() => {
              setMessages((prev) => [...prev, { role: "assistant", content: liveReply.trim() }]);
            });
          }
          return true;
        }
      } catch (liveErr) {
        console.warn("[Home] Gemini Live WebSocket stream notice, trying SSE backup:", liveErr);
      }

      try {
        const resp = await fetch(`${API_BASE}/api/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": getSessionId(),
          },
          signal: abortCtrl.signal,
          body: JSON.stringify(chatPayload),
        });

        if (!resp.ok || !resp.body) {
          return false;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        let hasAppendedPlaceholder = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (abortCtrl.signal.aborted) {
            reader.cancel().catch(() => { });
            return true;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data:")) continue;
            const jsonStr = trimmedLine.replace(/^data:\s*/, "").trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.token) {
                clearTimeout(coldStartTimer);
                setIsChatWakingUp(false);
                accumulated += parsed.token;
                const currentContent = accumulated;

                if (!hasAppendedPlaceholder) {
                  hasAppendedPlaceholder = true;
                  startTransition(() => {
                    setMessages((prev) => [
                      ...prev,
                      { role: "assistant", content: currentContent },
                    ]);
                  });
                } else {
                  startTransition(() => {
                    setMessages((prev) => {
                      const updated = [...prev];
                      if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
                        updated[updated.length - 1] = {
                          ...updated[updated.length - 1],
                          content: currentContent,
                        };
                      }
                      return updated;
                    });
                  });
                }
              }
              if (parsed.done) break;
            } catch { }
          }
        }

        const isSubstantialStream = accumulated.trim().length >= 10;
        if (!isSubstantialStream && hasAppendedPlaceholder) {
          startTransition(() => {
            setMessages((prev) => {
              if (prev.length > 0 && prev[prev.length - 1].role === "assistant") {
                return prev.slice(0, -1);
              }
              return prev;
            });
          });
        }
        return isSubstantialStream;
      } catch (err: any) {
        if (abortCtrl.signal.aborted) return true;
        return false;
      }
    };

    const callBackend = async (isRetry = false): Promise<string | null> => {
      try {
        const resp = await fetchWithTimeout(
          `${API_BASE}/api/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-ID": getSessionId(),
            },
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

        if (!isRetry && resp.status >= 500) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return callBackend(true);
        }

        return null;
      } catch (err: any) {
        if (abortCtrl.signal.aborted) {
          return null;
        }
        if (!isRetry) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return callBackend(true);
        }
        return null;
      }
    };

    try {
      const streamSuccess = await streamBackend();
      clearTimeout(coldStartTimer);
      setIsChatWakingUp(false);

      if (abortCtrl.signal.aborted) {
        return;
      }

      if (!streamSuccess) {
        const reply = await callBackend(false);
        if (abortCtrl.signal.aborted) return;

        startTransition(() => {
          if (reply) {
            setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
          } else {
            const instantReply = getCareerAgentResponse(trimmed, cleanHistory, profile, getUserRole());
            setMessages((prev) => [...prev, { role: "assistant", content: instantReply }]);
          }
        });
      }
    } catch (err: any) {
      clearTimeout(coldStartTimer);
      setIsChatWakingUp(false);
      if (abortCtrl.signal.aborted) {
        return;
      }
      const instantReply = getCareerAgentResponse(trimmed, cleanHistory, profile, getUserRole());
      startTransition(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: instantReply }]);
      });
    } finally {
      clearTimeout(coldStartTimer);
      isChatSendingRef.current = false;
      startTransition(() => {
        setIsChatLoading(false);
        setIsChatWakingUp(false);
      });
      chatAbortRef.current = null;
    }
  };

  const handleAskCoach = (query: string, originTab?: string, cardContext?: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    // Unlock WebAudio synchronously inside user click so Coach reply plays immediately on 1st click
    audioEngine.unlockAudio();
    const fromTab = originTab || activeTab;
    const tabKnowledge = getTabKnowledge(fromTab);
    window.dispatchEvent(
      new CustomEvent("das-ask-coach", {
        detail: {
          query: trimmedQuery,
          originTab: fromTab,
          cardContext: cardContext || "",
          pageContext: {
            activeTab: fromTab,
            activeTabTitle: tabKnowledge?.title || fromTab,
            screenName: tabKnowledge?.title || fromTab,
            screenPurpose: tabKnowledge?.purpose || "",
            cardContext: cardContext || "",
            honorific: getUserRole(),
            userName: username,
            userEmail: email,
            placementReadinessChance:
              prediction.chance !== null ? `${prediction.chance}%` : "Unconfigured",
            placementReadinessLabel: prediction.label,
            candidateBranch: profile.branch,
            targetRole: profile.targetRole,
            cgpa: profile.cgpa,
            backlogs: profile.backlogs,
            internships: profile.internships,
            codingConfidence: profile.coding,
            communicationRating: profile.communication,
            cohortYear: cohortFilters.year,
            cohortBranch: cohortFilters.branch,
          },
        },
      })
    );
  };

  const handleRegenerateChat = () => {
    if (isChatSendingRef.current) return;
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
      const resp = await fetchWithTimeout(`${API_BASE}/api/analytics?${q.toString()}`, {}, 18000);
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
        60000
      );
      if (resp.ok) {
        const data = await resp.json();
        setCohortInsight(data);
        toast.success("Cohort intelligence summary generated!");
      } else {
        toast.error(
          resp.status === 503
            ? "Pathfinder server is waking up. Please press Summarize again in a few seconds."
            : "Unable to generate cohort AI summary right now. Please retry."
        );
      }
    } catch (err) {
      console.warn("Cohort insight error:", err);
      toast.error("Cohort insight request failed or timed out. Please retry.");
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
        60000
      );
      if (resp.ok) {
        const data = await resp.json();
        setResumeFeedback(data);
        toast.success("Senior Hiring Manager ATS audit complete!");
        if (typeof data?.score === "number") {
          recordProgressEvent("ats", data.score, "ATS resume scan", file?.name || "Pasted resume text");
          fetchPrediction(profile, { atsScore: data.score });
        }
      } else {
        let errDetail = "Resume analysis could not be completed. Please check your document.";
        try {
          const errJson = await resp.json();
          if (errJson?.detail && typeof errJson.detail === "string") {
            errDetail = errJson.detail;
          }
        } catch { }
        toast.error(errDetail);
      }
    } catch (err) {
      console.warn("Resume analysis warning:", err);
      toast.error("Resume scanner timed out or backend is waking up. Please try again in a few seconds.");
    } finally {
      setIsAnalyzingResume(false);
    }
  };

  // Downloads
  const handleDownloadCSV = () => {
    toast.success("Exporting cohort analytics spreadsheet (CSV)...");
    const q = new URLSearchParams({
      year: cohortFilters.year.toString(),
      branch: cohortFilters.branch,
      gender: cohortFilters.gender,
      skill: cohortFilters.skill,
    });
    window.open(`${API_BASE}/api/export/csv?${q.toString()}`, "_blank");
  };

  const handleDownloadPDF = () => {
    toast.success("Generating cohort placement intelligence PDF report...");
    const q = new URLSearchParams({
      year: cohortFilters.year.toString(),
      branch: cohortFilters.branch,
      gender: cohortFilters.gender,
      skill: cohortFilters.skill,
    });
    window.open(`${API_BASE}/api/export/pdf?${q.toString()}`, "_blank");
  };

  const handleDownloadResumePDF = async () => {
    if (!resumeFeedback) {
      toast.error("Upload or paste your resume first to generate the Senior ATS Audit PDF.");
      return;
    }
    try {
      const resp = await fetchWithTimeout(
        `${API_BASE}/api/export/resume-pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resumeFeedback),
        },
        20000
      );
      if (resp.ok) {
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pathfinder-ats-resume-audit.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Downloaded Senior Hiring Manager & Deloitte ATS Audit PDF!");
      } else {
        toast.error("Failed to generate ATS Audit PDF. Please try again.");
      }
    } catch {
      toast.error("Unable to download ATS Audit PDF right now.");
    }
  };

  const handleLogout = () => {
    loginSeqRef.current++;
    pendingAuthSyncRef.current = null;
    void fetchWithTimeout(`${API_BASE}/api/auth/logout`, { method: "POST" }, 2000).catch(() => { });
    localStorage.removeItem("pathfinder_user");
    localStorage.removeItem("pathfinder_token");
    localStorage.removeItem("pathfinder_profile");
    localStorage.removeItem("pathfinder_profile_draft");
    localStorage.removeItem("pathfinder_onboarding_draft");
    localStorage.removeItem("pathfinder_backend_profile");
    localStorage.removeItem("pathfinder_session_id");
    localStorage.removeItem("pathfinder_session_email");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    localStorage.removeItem("isOwner");
    localStorage.removeItem("das_mode");
    localStorage.removeItem("das_honorific_override");
    clearRememberedGuestName();
    setIsAuthenticated(false);
    setAuthView("landing");
    setActiveTab("profile");
    setResumeFeedback(null);
    setRoadmap(null);
    setCohortInsight(null);
    setProfile(DEFAULT_STUDENT_PROFILE);
    setPrediction(UNCONFIGURED_PREDICTION);
    setIsDemoProfile(true);
    setUserRole("student");
    if (typeof window !== "undefined") {
      try {
        window.history.replaceState({}, "", "/");
      } catch { }
      document.title = "Pathfinder 2.0 · Autonomous AI Career Intelligence";
      window.dispatchEvent(
        new CustomEvent("pathfinder:auth-change", { detail: { authenticated: false } })
      );
    }
    try {
      window.parent.postMessage({ type: "PATHFINDER_LOGOUT" }, "*");
    } catch { }
  };

  const isProfilePartiallyIncomplete =
    Boolean(profile.onboardingCompleted) &&
    (!profile.githubUrl ||
      !profile.leetcodeUrl ||
      !profile.certifications ||
      profile.certifications.length === 0);

  const handleClearDemoProfile = () => {
    const cleanGuest = {
      ...EMPTY_GUEST_PROFILE,
      email: email || "guest@pathfinder.ai",
    };
    setProfile(cleanGuest);
    try {
      localStorage.setItem("pathfinder_profile_draft", JSON.stringify(cleanGuest));
    } catch { }
    setIsDemoProfile(false);
    setPrediction(UNCONFIGURED_PREDICTION);
    setActiveTab("profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("Cleared sample data — enter your own academic details below.");
  };

  const handleLoadDemoProfile = () => {
    const sampleGuest = {
      ...DEMO_GUEST_PROFILE,
      email: email || "guest@pathfinder.ai",
      onboardingCompleted: true,
      wizardStep: 5,
    };
    setProfile(sampleGuest);
    try {
      localStorage.setItem("pathfinder_profile_draft", JSON.stringify(sampleGuest));
    } catch { }
    setIsDemoProfile(true);
    setPrediction(DEMO_SAMPLE_PREDICTION);
    void fetchPrediction(sampleGuest);
    toast.success("Loaded Demo Profile (Sample).");
  };

  // 1. LANDING & AUTH SCREEN
  if (oauthSigningIn && !isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-transparent text-[#f8fafc]">
        <p className="animate-pulse text-sm font-medium tracking-wide">Signing you in...</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    if (authView === "login") {
      return (
        <SignInPage
          onLogin={handleLogin}
          initialError={oauthError}
          onBack={openLandingView}
        />
      );
    }
    return (
      <ComputeLandingPage
        onNavigateLogin={openLoginView}
        onGuestLogin={() =>
          handleLogin({
            username: "Guest Student",
            email: "guest@pathfinder.ai",
            bypassOnboarding: true,
          })
        }
      />
    );
  }

  // 2. MAIN DASHBOARD & PLATFORM NAVIGATION
  return (
    <div className="pathfinder-dashboard relative min-h-screen bg-transparent text-[#f8fafc] selection:bg-[#ffffff]/35 selection:text-[#f8fafc] font-sans overflow-x-hidden">
      {isGlobalServerWakingUp && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full border border-[#242429] bg-[#000000]/95 px-4 py-2 text-xs font-medium text-[#f8fafc] shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ffffff]" />
          <span>Waking up the server, this can take up to a minute...</span>
        </div>
      )}

      {/* Top Header */}
      <DashboardHeader
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setFocusOnDas(false);
          setActiveTab(tab);
        }}
        username={username}
        email={email}
        onLogout={handleLogout}
        userRole={userRole}
      />

      {isServerWakingUp && (
        <div className="relative z-40 border-b border-[#242429] bg-[#000000] px-4 py-2 text-center text-xs font-medium text-[#f8fafc] backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
            </span>
            <span>
              Connecting to cloud backend... (free-tier servers take ~15-20s on first load). All
              predictions will populate automatically.
            </span>
          </div>
        </div>
      )}

      {/* Main Container (reserves right stage width only in docked mode on xl: 1280px+) */}
      <main
        className={`relative z-10 mx-auto px-5 pt-8 pb-24 sm:px-8 lg:pt-10 transition-[padding] duration-200 ${dasLayoutMode === "docked" && isStageDockedOpen && !focusOnDas
          ? "max-w-[1680px] xl:pr-[396px] 2xl:pr-[436px]"
          : "max-w-[1400px] sm:px-10"
          }`}
      >
        {!focusOnDas && (
          <div className="space-y-4 pb-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 font-mono text-[11px] text-[#8A8A92]">
                {(() => {
                  const idx = WORKSPACE_SLIDES.findIndex((s) => s.id === activeTab);
                  if (idx === -1) return <span>PATHFINDER WORKSPACE</span>;
                  const slide = WORKSPACE_SLIDES[idx];
                  return (
                    <>
                      <span className="text-[#D4D4D8]">
                        SLIDE {slide.index} / {String(WORKSPACE_SLIDES.length).padStart(2, "0")}
                      </span>
                      <span>·</span>
                      <span className="uppercase">{slide.label}</span>
                    </>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("das-toggle-focus", { detail: { focus: true } })
                  );
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="pf-btn-secondary inline-flex h-9 items-center rounded-xl px-4 text-xs font-medium active:scale-[0.98] cursor-pointer"
              >
                Focus on DAS
              </button>
            </div>

            {isDemoProfile && !isProfileUnconfigured(profile) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-[#0D0D12]/95 px-4 py-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-white/[0.16] bg-[#16161E] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#FAFAFA]">
                    Demo Profile (Sample)
                  </span>
                  <span className="text-[#A1A1AA]">
                    Viewing pre-loaded sample data across predictions, JD matching &amp; coding
                    rounds.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearDemoProfile}
                  className="pf-btn-secondary inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-xs font-medium cursor-pointer"
                >
                  Clear &amp; enter my details
                </button>
              </div>
            )}

            {isProfileUnconfigured(profile) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-[#0D0D12]/95 px-4 py-3 text-xs">
                <span className="text-[#A1A1AA]">
                  Profile unconfigured — enter your CGPA &amp; branch in Profile Settings or load
                  sample data to preview predictions.
                </span>
                <button
                  type="button"
                  onClick={handleLoadDemoProfile}
                  className="pf-btn-secondary inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-xs font-medium cursor-pointer"
                >
                  Load Demo Profile
                </button>
              </div>
            )}
          </div>
        )}
        <div
          className={`transition-all duration-300 ${focusOnDas
            ? "opacity-[0.12] blur-[2px] pointer-events-none select-none"
            : dasLayoutMode === "background" && isDasSpeaking
              ? "opacity-70 pointer-events-auto"
              : "opacity-100 pointer-events-auto"
            }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {/* TAB 1: OVERVIEW (Top 3 Core Sections Only — Clean & Decluttered) */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                data-slide-theme="dashboard-black-plum"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
                className="space-y-16 sm:space-y-20"
              >
                <section
                  id="career-readiness-assessment"
                  data-das-id="hero-metrics"
                  className="space-y-6"
                >
                  <SectionHeader
                    title="Placement Readiness Overview"
                    description="Real-time placement probability and primary eligibility benchmark"
                    badge="1 of 3 · Readiness"
                    accent="cyan"
                    helperLabel="Hybrid score: Random Forest (88% cross-validation accuracy on the 972-record synthetic placement dataset, generated to demonstrate the pipeline) blended with an evidence rubric (projects, skills, GitHub, LeetCode, certifications, ATS)"
                  />
                  <HeroMetrics
                    username={username}
                    chance={prediction.chance}
                    label={prediction.label}
                    tone={prediction.tone}
                    layoutMode={dasLayoutMode}
                    onNavigateTab={setActiveTab}
                    onAskCoach={handleAskCoach}
                  />
                </section>

                <section id="career-skill-gap" data-das-id="skill-gap" className="space-y-6">
                  <SectionHeader
                    title="Target Role Skill Gap Analysis"
                    description="Direct alignment of your competencies against reference hiring cutoffs for your chosen domain"
                    badge="2 of 3 · Skill Gaps"
                    accent="amber"
                  />
                  <div id="skill-gap-matrix">
                    <SkillGapSection
                      strengths={prediction.strengths}
                      priorities={prediction.priorities}
                      breakdown={prediction.breakdown}
                      onAskCoach={handleAskCoach}
                      apiBase={API_BASE}
                    />
                  </div>
                </section>

                <section id="career-company-radar" data-das-id="company-radar" className="space-y-6">
                  <SectionHeader
                    title="Target Company Placement Radar"
                    description="Estimated profile fit compared against reference campus cutoff benchmarks and standard interview rubrics"
                    badge="3 of 3 · Company Radar"
                    accent="accent"
                    helperLabel="Industry reference benchmarks for Google, Razorpay, Amazon, and TCS Digital"
                  />
                  <div id="placement-radar">
                    <CompanyPlacementRadar
                      profile={profile}
                      predictionChance={prediction.chance}
                      onLaunchMockInterview={handleLaunchMockInterview}
                      onAskCoach={handleAskCoach}
                    />
                  </div>
                </section>
              </motion.div>
            )}

            {/* TAB: INTERVIEW (3. Live Coding & Viva Arena / Company & Project Defense) */}
            {activeTab === "interview" && (
              <motion.div
                key="interview"
                data-slide-theme="dashboard-black-plum"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
                className="space-y-8"
              >
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0B0B0F]/85 p-4 sm:flex-row sm:items-center sm:px-6">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#8A8A92]">
                      Interview Simulator Workspace
                    </span>
                    <p className="mt-0.5 text-xs text-[#A1A1AA]">
                      Switch between live 11-language coding rounds and structured STAR / project
                      architecture defense.
                    </p>
                  </div>
                  <div
                    role="tablist"
                    aria-label="Interview workspace mode"
                    className="inline-flex shrink-0 items-center rounded-xl border border-white/[0.1] bg-black/60 p-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={interviewWorkspace === "coding"}
                      onClick={() => setInterviewWorkspace("coding")}
                      className={`h-9 rounded-lg px-4 text-xs font-medium transition-colors cursor-pointer ${interviewWorkspace === "coding"
                        ? "bg-[#FAFAFA] text-[#09090B]"
                        : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                        }`}
                    >
                      Live Coding &amp; Viva
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={interviewWorkspace === "mock"}
                      onClick={() => setInterviewWorkspace("mock")}
                      className={`h-9 rounded-lg px-4 text-xs font-medium transition-colors cursor-pointer ${interviewWorkspace === "mock"
                        ? "bg-[#FAFAFA] text-[#09090B]"
                        : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                        }`}
                    >
                      Company &amp; Project Defense
                    </button>
                  </div>
                </div>

                {interviewWorkspace === "coding" ? (
                  <LiveCodingInterviewArena
                    profile={profile}
                    apiBase={API_BASE}
                    customChallenge={arenaCustomChallenge}
                    onAskCoach={(q) => handleAskCoach(q, "interview", "Live Coding & Voice Viva Arena")}
                  />
                ) : (
                  <MockInterviewConsole
                    profile={profile}
                    initialCompany={interviewCompany}
                    initialRole={interviewRole}
                    initialMode={interviewMode}
                    onNavigateTab={(tab) => setActiveTab(tab as TabId)}
                    onAskCoach={handleAskCoach}
                  />
                )}
              </motion.div>
            )}

            {/* TAB 3: SKILLS */}
            {activeTab === "skills" && (
              <motion.div
                key="skills"
                data-slide-theme="dashboard-black-plum"
                data-das-id="roadmap-visualizer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
                className="space-y-16 sm:space-y-20"
              >
                <div id="skills-sprint-roadmap">
                  <RoadmapVisualizer
                    roadmap={roadmap}
                    isLoading={isRoadmapLoading}
                    onRegenerate={fetchRoadmap}
                  />
                </div>
                <SkillIntelligence
                  apiBase={API_BASE}
                  selectedYear={profile.graduationYear || 2026}
                  selectedBranch={profile.branch || "All"}
                  onAskCoach={handleAskCoach}
                  onNavigateTab={setActiveTab}
                />
              </motion.div>
            )}

            {/* TAB 4: BRANCHES */}
            {activeTab === "branches" && (
              <motion.div
                key="branches"
                data-slide-theme="dashboard-black-plum"
                data-das-id="branch-intelligence"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
                className="space-y-16 sm:space-y-20"
              >
                <BranchIntelligence
                  apiBase={API_BASE}
                  selectedYear={profile.graduationYear || 2026}
                  currentBranch={profile.branch || "CSE"}
                  onAskCoach={handleAskCoach}
                  onNavigateTab={setActiveTab}
                />
              </motion.div>
            )}

            {/* TAB 5: ANALYTICS (Cohort Analytics + 6-Week Roadmap + Branch Trends) */}
            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                data-slide-theme="dashboard-black-plum"
                data-das-id="cohort-explorer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
                className="space-y-16 sm:space-y-20"
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
                <div id="sprint-roadmap">
                  <RoadmapVisualizer
                    roadmap={roadmap}
                    isLoading={isRoadmapLoading}
                    onRegenerate={fetchRoadmap}
                  />
                </div>
              </motion.div>
            )}

            {/* TAB 6: MY PROGRESS JOURNEY (real user activity only) */}
            {activeTab === "progress" && (
              <motion.div
                key="progress"
                data-slide-theme="dashboard-black-plum"
                data-das-id="progress-journey"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
                className="space-y-16 sm:space-y-20"
              >
                <MyProgressJourney
                  currentChance={prediction.chance}
                  currentLabel={prediction.label}
                  onNavigateTab={(tab) => {
                    setActiveTab(tab as TabId);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onAskCoach={(q) => handleAskCoach(q, "progress", "My Progress Journey")}
                />
              </motion.div>
            )}

            {/* TAB 7: PROFILE */}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                data-slide-theme="dashboard-black-plum"
                data-das-id="profile-settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
                className="space-y-16 sm:space-y-20"
              >
                <ProfileSettings
                  profile={profile}
                  onSaveProfile={handleSaveProfile}
                  onResetToDefaults={() => {
                    const isGuestSession =
                      (email || profile.email || "").toLowerCase() === "guest@pathfinder.ai";
                    if (isGuestSession) {
                      const cleanGuest = {
                        ...EMPTY_GUEST_PROFILE,
                        email: email || "guest@pathfinder.ai",
                      };
                      setProfile(cleanGuest);
                      localStorage.setItem("pathfinder_profile_draft", JSON.stringify(cleanGuest));
                      setPrediction(UNCONFIGURED_PREDICTION);
                      toast.info("Guest workspace reset to unconfigured state.");
                      return;
                    }
                    setProfile(DEFAULT_STUDENT_PROFILE);
                    handleSaveProfile(DEFAULT_STUDENT_PROFILE);
                  }}
                  onGoToDashboard={() => {
                    setActiveTab("overview");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  apiBase={API_BASE}
                />
              </motion.div>
            )}

            {/* RESUME STUDIO (2. JD & Resume Tailor) */}
            {activeTab === "resume" && (
              <motion.div
                key="resume"
                data-slide-theme="dashboard-black-plum"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
                className="space-y-16 sm:space-y-20"
              >
                <JDCustomTailor
                  profile={profile}
                  apiBase={API_BASE}
                  onAskCoach={(q) => handleAskCoach(q, "resume", "1-Click JD to Custom Prep & Resume Tailor")}
                  onAddSkillsToProfile={(newSkills) => {
                    const updatedSkills = Array.from(
                      new Set([...(profile.technicalSkills || []), ...newSkills])
                    );
                    const merged = { ...profile, technicalSkills: updatedSkills, skills: updatedSkills };
                    setProfile(merged);
                    handleSaveProfile(merged);
                    fetchPrediction(merged);
                  }}
                  onOpenOnePageResume={() => setShowOnePageResume(true)}
                  onLaunchInCodingArena={(challenge) => {
                    setArenaCustomChallenge(challenge);
                    setInterviewWorkspace("coding");
                    setActiveTab("interview");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
                <ResumeStudio
                  feedback={resumeFeedback}
                  onAnalyze={handleAnalyzeResume}
                  isLoading={isAnalyzingResume}
                  onDownloadFeedbackPDF={handleDownloadResumePDF}
                  onApplyResumeSkills={(skills) => {
                    const updatedSkills = Array.from(
                      new Set([...(profile.technicalSkills || []), ...skills])
                    );
                    const merged = { ...profile, technicalSkills: updatedSkills };
                    setProfile(merged);
                    handleSaveProfile(merged);
                    fetchPrediction(merged);
                  }}
                />
              </motion.div>
            )}

            {/* PROJECTS */}
            {activeTab === "projects" && (
              <motion.div
                key="projects"
                data-slide-theme="dashboard-black-plum"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
                className="space-y-16 sm:space-y-20"
              >
                <ProjectRecommender
                  targetRole={profile.targetRole}
                  onAskCoach={handleAskCoach}
                  apiBase={API_BASE}
                />
              </motion.div>
            )}

            {/* ROLES */}
            {activeTab === "roles" && (
              <motion.div
                key="roles"
                data-slide-theme="dashboard-black-plum"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.12 }}
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

          </AnimatePresence>
        </div>

        {/* 1-Page ATS Engineering Resume Modal */}
        <OnePageResumeModal
          isOpen={showOnePageResume}
          onClose={() => setShowOnePageResume(false)}
          profile={profile}
          onOpenProfile={() => {
            setShowOnePageResume(false);
            setActiveTab("profile");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

        {/* 7-Slide Workspace Switcher Pager */}
        {!focusOnDas && WORKSPACE_SLIDES.some((s) => s.id === activeTab) && (
          <SlideTransitionBar activeSlideId={activeTab} onSelectSlide={setActiveTab} />
        )}

        {/* Global Footer */}
        {!focusOnDas && <Footer onNavigateTab={setActiveTab} />}
      </main>
    </div>
  );
}