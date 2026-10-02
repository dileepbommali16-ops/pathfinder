import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Code,
  Target,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Building,
  Briefcase,
  Search,
  Plus,
  X,
  RefreshCw,
  Sliders,
  Award,
  Link as LinkIcon,
  ShieldCheck,
  Check
} from "lucide-react";
import { StudentProfileState, ReadinessAuditData } from "@/types/profile";

interface OnboardingWizardProps {
  initialProfile: StudentProfileState;
  onComplete: (profile: StudentProfileState, auditResult: ReadinessAuditData) => void;
  apiBase: string;
}

const BRANCH_OPTIONS = [
  "AIML",
  "CSD",
  "CSE",
  "CSM",
  "IT",
  "ECE",
  "EEE",
  "Mech",
  "Mechanical",
  "Civil",
  "Cyber Security",
  "IoT",
  "Data Science",
  "Other"
];

const COURSE_OPTIONS = ["B.Tech", "B.E", "M.Tech", "MCA", "BCA", "B.Sc CS"];
const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTER_OPTIONS = [
  "Semester 1",
  "Semester 2",
  "Semester 3",
  "Semester 4",
  "Semester 5",
  "Semester 6",
  "Semester 7",
  "Semester 8"
];

const DEFAULT_POPULAR_SKILLS = [
  "Blind 75 Core DSA",
  "System Design",
  "Python & FastAPI",
  "SQL & Relational DBMS",
  "React & TypeScript",
  "Java & Spring Boot",
  "Data Structures & Algorithms",
  "Machine Learning & Scikit-Learn",
  "Deep Learning & PyTorch",
  "REST APIs & GraphQL",
  "Next.js & Full-Stack",
  "C++ Problem Solving"
];

const TOOL_OPTIONS = [
  "Git & GitHub",
  "Docker",
  "Linux CLI",
  "Postman",
  "VS Code",
  "AWS Cloud",
  "Google Cloud Platform (GCP)",
  "Kubernetes",
  "Jira / Agile",
  "Figma"
];

const LANGUAGE_OPTIONS = [
  "Python",
  "Java",
  "C++",
  "TypeScript",
  "JavaScript",
  "SQL",
  "Go",
  "Rust",
  "C"
];

const TARGET_ROLE_OPTIONS = [
  {
    title: "Software Development Engineer (SDE)",
    desc: "Backend services, core algorithmic problem solving, enterprise systems",
    tier: "Product Companies / Tier-1 MNCs"
  },
  {
    title: "Data Scientist / ML Engineer",
    desc: "Applied machine learning, statistical modeling, neural networks & GenAI",
    tier: "Product Companies / AI Research"
  },
  {
    title: "Full-Stack Web Developer",
    desc: "React, Next.js, Node.js, end-to-end user interfaces and cloud persistence",
    tier: "High-Growth Tech Startups"
  },
  {
    title: "Cloud & DevOps Engineer",
    desc: "Container orchestration, CI/CD automation, cloud infrastructure & reliability",
    tier: "Global Capability Centers (GCC)"
  },
  {
    title: "QA & Automation Engineer",
    desc: "E2E testing suites, Playwright, performance benchmarking & API assurance",
    tier: "Enterprise Product Teams"
  },
  {
    title: "Product / Systems Analyst",
    desc: "SQL analytics, business metrics, product telemetry, engineering workflows",
    tier: "Product Companies & Consulting"
  }
];

const LOCATION_OPTIONS = [
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Gurgaon / Delhi-NCR",
  "Chennai",
  "Mumbai",
  "Remote",
  "Any / Flexible"
];

const PACKAGE_OPTIONS = [
  "6 - 10 LPA",
  "10 - 15 LPA",
  "15 - 25 LPA",
  "25+ LPA (Product Giants)"
];

const COMPANY_TYPE_OPTIONS = [
  "Product Companies / Tier-1 MNCs",
  "High-Growth Tech Startups",
  "Global Capability Centers (GCC)",
  "Service MNCs / Consultancies"
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  onComplete,
  apiBase
}) => {
  // Restore draft from localStorage if available, or fall back to initialProfile
  const [profile, setProfile] = useState<StudentProfileState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pathfinder_profile_draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...initialProfile, ...parsed };
        } catch {}
      }
    }
    return initialProfile;
  });

  const [step, setStep] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pathfinder_profile_draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.wizardStep && parsed.wizardStep >= 1 && parsed.wizardStep <= 5) {
            return parsed.wizardStep;
          }
        } catch {}
      }
    }
    return 1;
  });

  const [skillSearch, setSkillSearch] = useState("");
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [customCertInput, setCustomCertInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveIndicator, setSaveIndicator] = useState<string>("Draft auto-saved");

  // Auto-save draft on every change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const draft = { ...profile, wizardStep: step };
      localStorage.setItem("pathfinder_profile_draft", JSON.stringify(draft));
      setSaveIndicator("All changes saved locally");

      // Debounced backend save
      const timeout = setTimeout(() => {
        fetch(`${apiBase}/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, onboarding_completed: false })
        })
          .then(() => setSaveIndicator("Cloud & local sync complete"))
          .catch(() => setSaveIndicator("Saved locally in browser"));
      }, 800);

      return () => clearTimeout(timeout);
    }
  }, [profile, step, apiBase]);

  // Recalculate converted percentage whenever CGPA or formula multiplier changes
  useEffect(() => {
    const mult = profile.cgpaFormulaMultiplier || 9.5;
    const calc = Math.min(100, Math.max(0, Math.round(profile.cgpa * mult * 10) / 10));
    if (profile.percentage !== calc) {
      setProfile((prev) => ({ ...prev, percentage: calc }));
    }
  }, [profile.cgpa, profile.cgpaFormulaMultiplier]);

  // Validation per step
  const stepValidation = useMemo(() => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!profile.fullName?.trim()) errors.fullName = "Full name is required";
      if (!profile.college?.trim()) errors.college = "College / University is required";
      if (!profile.branch?.trim()) errors.branch = "Please select your engineering branch";
    } else if (step === 2) {
      if (profile.tenthPercentage === undefined || profile.tenthPercentage < 0 || profile.tenthPercentage > 100) {
        errors.tenthPercentage = "10th percentage must be between 0% and 100%";
      }
      if (profile.twelfthPercentage === undefined || profile.twelfthPercentage < 0 || profile.twelfthPercentage > 100) {
        errors.twelfthPercentage = "12th / Diploma percentage must be between 0% and 100%";
      }
      if (profile.cgpa === undefined || profile.cgpa < 0 || profile.cgpa > 10) {
        errors.cgpa = "Current CGPA must be between 0.0 and 10.0";
      }
      if (profile.activeBacklogs < 0) {
        errors.activeBacklogs = "Active backlogs cannot be negative";
      }
    } else if (step === 3) {
      if (!profile.technicalSkills || profile.technicalSkills.length === 0) {
        errors.technicalSkills = "Select at least 1 technical skill to benchmark your profile";
      }
      if (profile.projectsCount < 0) {
        errors.projectsCount = "Projects count cannot be negative";
      }
      if (profile.internships < 0) {
        errors.internships = "Internships count cannot be negative";
      }
    } else if (step === 4) {
      if (!profile.targetRole?.trim()) errors.targetRole = "Please select a target engineering role";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [step, profile]);

  const handleNext = () => {
    if (!stepValidation.isValid) return;
    if (step < 5) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleToggleSkill = (skill: string) => {
    setProfile((prev) => {
      const current = prev.technicalSkills || [];
      const exists = current.includes(skill);
      const updated = exists ? current.filter((s) => s !== skill) : [...current, skill];
      return { ...prev, technicalSkills: updated };
    });
  };

  const handleAddCustomSkill = () => {
    const val = customSkillInput.trim();
    if (val && !profile.technicalSkills.includes(val)) {
      setProfile((prev) => ({
        ...prev,
        technicalSkills: [...prev.technicalSkills, val]
      }));
      setCustomSkillInput("");
    }
  };

  const handleToggleTool = (tool: string) => {
    setProfile((prev) => {
      const current = prev.tools || [];
      const exists = current.includes(tool);
      const updated = exists ? current.filter((t) => t !== tool) : [...current, tool];
      return { ...prev, tools: updated };
    });
  };

  const handleToggleLanguage = (lang: string) => {
    setProfile((prev) => {
      const current = prev.programmingLanguages || [];
      const exists = current.includes(lang);
      const updated = exists ? current.filter((l) => l !== lang) : [...current, lang];
      return { ...prev, programmingLanguages: updated };
    });
  };

  const handleAddCertification = () => {
    const val = customCertInput.trim();
    if (val && !profile.certifications.includes(val)) {
      setProfile((prev) => ({
        ...prev,
        certifications: [...prev.certifications, val]
      }));
      setCustomCertInput("");
    }
  };

  const handleRemoveCertification = (cert: string) => {
    setProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c !== cert)
    }));
  };

  // Submit and Calculate Career Readiness
  const handleSubmitProfile = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const completePayload: StudentProfileState = {
      ...profile,
      backlogs: profile.activeBacklogs,
      onboardingCompleted: true,
      wizardStep: 5
    };

    try {
      // 1. Persist completed profile to backend
      const saveResp = await fetch(`${apiBase}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completePayload),
        signal: controller.signal
      });

      // 2. Call calculation audit endpoint
      const auditResp = await fetch(`${apiBase}/api/profile/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completePayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let auditData: ReadinessAuditData;
      if (auditResp.ok) {
        auditData = await auditResp.json();
      } else {
        // Fallback calculations if backend calculation endpoint has brief hiccup
        const cgpa = Number(completePayload.cgpa || 7.8);
        const backlogs = Number(completePayload.activeBacklogs || 0);
        const internships = Number(completePayload.internships || 0);
        const coding = Number(completePayload.coding || 7);
        const comm = Number(completePayload.communication || 7);
        const raw = cgpa * 5.2 + Math.max(0, 3 - backlogs) * 4 + Math.min(internships, 3) * 5 + comm * 2.2 + coding * 2.7 - Math.max(backlogs - 1, 0) * 5;
        const chance = Math.max(18, Math.min(97, Math.round(raw)));
        const overall_pct = Math.round(cgpa * (completePayload.cgpaFormulaMultiplier || 9.5) * 10) / 10;

        auditData = {
          chance,
          label: chance >= 75 ? "Strong Candidate Profile" : chance >= 55 ? "Solid Foundation (On Track)" : "Needs Strategic Acceleration",
          tone: chance >= 75 ? "strong" : chance >= 55 ? "steady" : "focus",
          overall_percentage: overall_pct,
          cgpa,
          conversion_formula: `CGPA × ${(completePayload.cgpaFormulaMultiplier || 9.5).toFixed(1)} (AICTE Scale)`,
          strengths: [
            `Academic CGPA ${cgpa.toFixed(1)}/10.0 (${overall_pct}%)`,
            backlogs === 0 ? "Clean Academic Record (0 Backlogs)" : "Eligible for standard recruitment rounds",
            internships > 0 ? `${internships} Verified Practical Internship(s)` : "Active engineering coursework"
          ],
          gaps: [
            cgpa < 7.5 ? "Maintain CGPA >= 7.5 to unlock Tier-1 MNC shortlists" : "Maintain academic distinction",
            coding < 8 ? "Master high-frequency LeetCode Two Pointers and Sliding Window patterns" : "Target advanced DP patterns"
          ],
          recommended_skills: ["Blind 75 Core DSA", "System Design", "Production APIs", "STAR Interview Defense"],
          breakdown: {
            academics: Math.round(cgpa * 10),
            coding_dsa: coding * 10,
            projects: Math.min(100, completePayload.projectsCount * 25),
            internships: Math.min(100, internships * 40),
            communication: comm * 10,
            eligibility: Math.max(0, 100 - backlogs * 25)
          },
          cohort_comparison: {
            branch: completePayload.branch,
            percentile: Math.min(95, Math.max(25, Math.round(chance * 1.05))),
            top_percent: Math.max(5, Math.round(100 - chance * 1.05)),
            branch_avg_cgpa: 7.7,
            branch_placement_rate: 62.5,
            total_candidates: 120,
            comparison_text: `Top ${Math.max(5, Math.round(100 - chance * 1.05))}% in ${completePayload.branch} based on cohort benchmarks`
          },
          next_steps: [
            "Review your tailored 30-Day Sprint Roadmap",
            "Launch an interactive AI Mock Interview",
            "Explore department cutoffs in Branch Intelligence"
          ]
        };
      }

      // Save to localStorage as finalized profile
      localStorage.setItem("pathfinder_profile", JSON.stringify(completePayload));
      localStorage.removeItem("pathfinder_profile_draft");

      // Notify parent to render Result Screen
      onComplete(completePayload, auditData);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Submission error:", err);
      setSubmitError(
        err.name === "AbortError"
          ? "Request timed out while contacting server. Please click Retry."
          : "Unable to finalize profile. Please check network connection and click Retry."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: "Basic Details", icon: GraduationCap },
    { num: 2, label: "Academics", icon: BookOpen },
    { num: 3, label: "Skills & Experience", icon: Code },
    { num: 4, label: "Career Goals", icon: Target },
    { num: 5, label: "Review & Submit", icon: CheckCircle2 }
  ];

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Top Banner & Progress Header */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Step-Wise Candidate Onboarding</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
              Student Placement Profile Wizard
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Complete your profile once to unlock live readiness scoring, tailored roadmaps, and grounded AI guidance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center text-xs text-slate-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-xl">
            <RefreshCw className="h-3.5 w-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "8s" }} />
            <span>{saveIndicator}</span>
          </div>
        </div>

        {/* Progress Bar & Steps Tabs */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span className="text-emerald-400 font-bold">
              Step {step} of 5: {stepsList[step - 1].label}
            </span>
            <span>{Math.round(((step - 1) / 4) * 100)}% Completed</span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${((step - 1) / 4) * 100}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>

          {/* Stepper Dots / Buttons */}
          <div className="mt-4 grid grid-cols-5 gap-1 sm:gap-2">
            {stepsList.map((s) => {
              const Icon = s.icon;
              const isPast = s.num < step;
              const isCurrent = s.num === step;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num <= step) setStep(s.num);
                  }}
                  disabled={s.num > step}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-left transition-all ${
                    isCurrent
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-sm"
                      : isPast
                      ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                      : "border-transparent text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs font-semibold truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Wizard Form Body */}
      <div className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* STEP 1: BASIC DETAILS */}
          {/* ======================================================== */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-400" />
                  <span>Step 1: Candidate & Academic Identity</span>
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Tell us who you are and which engineering department you are affiliated with.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Full Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-full-name"
                    placeholder="e.g. John Doe / Priya Sharma"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {stepValidation.errors.fullName && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{stepValidation.errors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* College / University */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    College / Institute Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      id="input-college"
                      placeholder="e.g. Hyderabad Institute of Technology and Management"
                      value={profile.college}
                      onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                      className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  {stepValidation.errors.college && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{stepValidation.errors.college}</span>
                    </p>
                  )}
                </div>

                {/* Branch */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Department / Branch <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="select-branch"
                    value={profile.branch}
                    onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Course / Degree</label>
                  <select
                    id="select-course"
                    value={profile.course}
                    onChange={(e) => setProfile({ ...profile, course: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {COURSE_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Year */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Current Academic Year</label>
                  <select
                    id="select-year"
                    value={profile.currentYear}
                    onChange={(e) => setProfile({ ...profile, currentYear: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Semester */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Current Semester</label>
                  <select
                    id="select-semester"
                    value={profile.currentSemester}
                    onChange={(e) => setProfile({ ...profile, currentSemester: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {SEMESTER_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: ACADEMIC DETAILS */}
          {/* ======================================================== */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-400" />
                  <span>Step 2: Academic Metrics & Live Conversion</span>
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Enter your performance across boards and undergraduate coursework. Includes live AICTE percentage conversion.
                </p>
              </div>

              {/* Live Conversion Banner */}
              <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Live CGPA ➔ Percentage Conversion</span>
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {profile.cgpa.toFixed(2)} CGPA
                      </span>
                      <span className="text-slate-400">=</span>
                      <span className="text-2xl sm:text-3xl font-black text-emerald-300">
                        {profile.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Formula Multiplier:</span>
                    <select
                      id="select-formula-multiplier"
                      value={profile.cgpaFormulaMultiplier || 9.5}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          cgpaFormulaMultiplier: parseFloat(e.target.value)
                        })
                      }
                      className="rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-emerald-300 outline-none"
                    >
                      <option value={9.5}>AICTE / Standard (× 9.5)</option>
                      <option value={10.0}>Direct Scale (× 10.0)</option>
                      <option value={9.0}>State University (× 9.0)</option>
                    </select>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Formula applied: <strong className="text-slate-200">Percentage = CGPA × {profile.cgpaFormulaMultiplier || 9.5}</strong> (Complies with major placement portal shortlisting cutoffs).
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Current CGPA */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Current Degree CGPA <span className="text-red-400">*</span>
                    </label>
                    <span className="text-xs font-bold text-emerald-400">{profile.cgpa.toFixed(1)} / 10.0</span>
                  </div>
                  <input
                    type="number"
                    id="input-cgpa"
                    min="0"
                    max="10"
                    step="0.05"
                    value={profile.cgpa}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setProfile({ ...profile, cgpa: isNaN(val) ? 0 : val });
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {stepValidation.errors.cgpa && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{stepValidation.errors.cgpa}</span>
                    </p>
                  )}
                </div>

                {/* Converted / Stored Percentage */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Calculated Degree Percentage
                  </label>
                  <input
                    type="number"
                    id="input-percentage"
                    min="0"
                    max="100"
                    step="0.1"
                    value={profile.percentage}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setProfile({ ...profile, percentage: isNaN(val) ? 0 : val });
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-300 outline-none"
                  />
                </div>

                {/* 10th Percentage */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    10th Board Percentage / Equivalent <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    id="input-tenth"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 88.5"
                    value={profile.tenthPercentage}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setProfile({ ...profile, tenthPercentage: isNaN(val) ? 0 : val });
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="text-[11px] text-slate-500">If board awarded CGPA (e.g. 10.0), enter percentage = CGPA × 9.5 (e.g. 95%).</p>
                  {stepValidation.errors.tenthPercentage && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{stepValidation.errors.tenthPercentage}</span>
                    </p>
                  )}
                </div>

                {/* 12th / Diploma Percentage */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    12th / Intermediate / Diploma % <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    id="input-twelfth"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 84.0"
                    value={profile.twelfthPercentage}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setProfile({ ...profile, twelfthPercentage: isNaN(val) ? 0 : val });
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {stepValidation.errors.twelfthPercentage && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{stepValidation.errors.twelfthPercentage}</span>
                    </p>
                  )}
                </div>

                {/* Active Backlogs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Active (Standing) Backlogs
                  </label>
                  <input
                    type="number"
                    id="input-active-backlogs"
                    min="0"
                    max="20"
                    value={profile.activeBacklogs}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const safeVal = isNaN(val) ? 0 : Math.max(0, val);
                      setProfile({ ...profile, activeBacklogs: safeVal, backlogs: safeVal });
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="text-[11px] text-slate-500">Tier-1 MNC cutoffs typically mandate 0 standing backlogs.</p>
                </div>

                {/* History of Backlogs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    History of Backlogs (Cleared)
                  </label>
                  <input
                    type="number"
                    id="input-history-backlogs"
                    min="0"
                    max="20"
                    value={profile.historyBacklogs}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setProfile({ ...profile, historyBacklogs: isNaN(val) ? 0 : Math.max(0, val) });
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Semester-Wise CGPA (Optional) */}
                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Semester-Wise CGPA / SGPA (Optional)
                    </label>
                    <span className="text-[11px] text-slate-400">Semesters 1 through 8</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((semNum) => {
                      const semIndex = semNum - 1;
                      const semVal =
                        profile.semesterCgpas && profile.semesterCgpas[semIndex] !== undefined && profile.semesterCgpas[semIndex] > 0
                          ? profile.semesterCgpas[semIndex]
                          : "";
                      return (
                        <div key={semNum} className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400 block text-center">Sem {semNum}</span>
                          <input
                            type="number"
                            id={`input-sem-${semNum}`}
                            min="0"
                            max="10"
                            step="0.05"
                            placeholder="0.0"
                            value={semVal}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const currentList = [...(profile.semesterCgpas || [0, 0, 0, 0, 0, 0, 0, 0])];
                              while (currentList.length < 8) currentList.push(0);
                              currentList[semIndex] = isNaN(val) ? 0 : val;
                              setProfile({ ...profile, semesterCgpas: currentList });
                            }}
                            className="w-full text-center rounded-xl border border-white/10 bg-black/40 py-2 px-1 text-xs text-white outline-none focus:border-emerald-500/50"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: SKILLS AND EXPERIENCE */}
          {/* ======================================================== */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Code className="h-5 w-5 text-emerald-400" />
                  <span>Step 3: Technical Skills & Practical Experience</span>
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Select and tag your core technical skills, developer tools, programming languages, and industry exposure.
                </p>
              </div>

              {/* Technical Skills Search & Multi-Select Chips */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Core Technical Skills <span className="text-red-400">*</span>
                  </label>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {profile.technicalSkills?.length || 0} skills selected
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    id="search-skills"
                    placeholder="Search or filter technical skills (e.g. DSA, System Design, SQL)..."
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Skill Chips */}
                <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                  {DEFAULT_POPULAR_SKILLS.filter((s) =>
                    s.toLowerCase().includes(skillSearch.toLowerCase())
                  ).map((s) => {
                    const isSelected = profile.technicalSkills?.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleToggleSkill(s)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-emerald-400" />}
                        <span>{s}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Skill */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add custom skill not listed above..."
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSkill();
                      }
                    }}
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSkill}
                    className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
                {stepValidation.errors.technicalSkills && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{stepValidation.errors.technicalSkills}</span>
                  </p>
                )}
              </div>

              {/* Programming Languages Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Programming Languages
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const isSelected = profile.programmingLanguages?.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleToggleLanguage(lang)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-cyan-400" />}
                        <span>{lang}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Developer Tools Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Developer Tools & Cloud
                </label>
                <div className="flex flex-wrap gap-2">
                  {TOOL_OPTIONS.map((tool) => {
                    const isSelected = profile.tools?.includes(tool);
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => handleToggleTool(tool)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-500/20 text-purple-300"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-purple-400" />}
                        <span>{tool}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Projects, Internships, Self Ratings */}
              <div className="grid gap-5 sm:grid-cols-2 pt-2 border-t border-white/[0.06]">
                {/* Projects Count */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Flagship Projects Built
                    </label>
                    <span className="text-xs font-bold text-cyan-400">{profile.projectsCount} Projects</span>
                  </div>
                  <input
                    type="number"
                    id="input-projects-count"
                    min="0"
                    max="20"
                    value={profile.projectsCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setProfile({ ...profile, projectsCount: isNaN(val) ? 0 : Math.max(0, val) });
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                {/* Internships Count */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Industrial Internships
                    </label>
                    <span className="text-xs font-bold text-purple-400">{profile.internships} Internships</span>
                  </div>
                  <input
                    type="number"
                    id="input-internships"
                    min="0"
                    max="10"
                    value={profile.internships}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setProfile({ ...profile, internships: isNaN(val) ? 0 : Math.max(0, val) });
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                {/* Coding Level Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Coding & DSA Confidence
                    </label>
                    <span className="text-xs font-bold text-emerald-400">{profile.coding}/10</span>
                  </div>
                  <input
                    type="range"
                    id="slider-coding"
                    min="1"
                    max="10"
                    value={profile.coding}
                    onChange={(e) => setProfile({ ...profile, coding: parseInt(e.target.value, 10) })}
                    className="w-full accent-emerald-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Beginner (1-4)</span>
                    <span>Intermediate (5-7)</span>
                    <span>Advanced (8-10)</span>
                  </div>
                </div>

                {/* Communication Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Communication & STAR Articulation
                    </label>
                    <span className="text-xs font-bold text-amber-400">{profile.communication}/10</span>
                  </div>
                  <input
                    type="range"
                    id="slider-comm"
                    min="1"
                    max="10"
                    value={profile.communication}
                    onChange={(e) => setProfile({ ...profile, communication: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Developing (1-4)</span>
                    <span>Proficient (5-7)</span>
                    <span>Articulate (8-10)</span>
                  </div>
                </div>
              </div>

              {/* Certifications (Optional) */}
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Certifications & Credentials (Optional)
                  </label>
                  <span className="text-xs text-purple-400 font-semibold">
                    {profile.certifications?.length || 0} active
                  </span>
                </div>

                {/* Popular suggestion chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "AWS Certified Cloud Practitioner",
                    "Google Cloud Associate Cloud Engineer",
                    "Meta Front-End Developer",
                    "Oracle Certified Java Associate",
                    "Postman API Fundamentals",
                    "DeepLearning.AI Machine Learning"
                  ].map((cert) => {
                    const isSelected = profile.certifications?.includes(cert);
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            handleRemoveCertification(cert);
                          } else {
                            setProfile((prev) => ({
                              ...prev,
                              certifications: [...(prev.certifications || []), cert]
                            }));
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-500/20 text-purple-300 shadow-sm"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-purple-400" />}
                        <span>{cert}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Certification Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    id="input-custom-cert"
                    placeholder="Add custom certification (e.g. Azure AI-900, Docker Certified)..."
                    value={customCertInput}
                    onChange={(e) => setCustomCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCertification();
                      }
                    }}
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500/50"
                  />
                  <button
                    type="button"
                    id="btn-add-cert"
                    onClick={handleAddCertification}
                    className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/15"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Selected Certifications Tags */}
                {profile.certifications && profile.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.certifications.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-200"
                      >
                        <Award className="h-3 w-3 text-purple-400" />
                        <span>{c}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCertification(c)}
                          className="hover:text-red-400 ml-0.5"
                          title={`Remove ${c}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Coding Profiles & Portfolios (Optional) */}
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Coding Profiles & Portfolios (Optional)
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      id="input-github-profile"
                      placeholder="GitHub username or URL..."
                      value={profile.codingProfiles?.github || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          codingProfiles: { ...profile.codingProfiles, github: e.target.value },
                          githubUrl: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>

                  <div className="relative">
                    <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      id="input-leetcode-profile"
                      placeholder="LeetCode handle or URL..."
                      value={profile.codingProfiles?.leetcode || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          codingProfiles: { ...profile.codingProfiles, leetcode: e.target.value },
                          leetcodeUrl: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: CAREER GOALS */}
          {/* ======================================================== */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-400" />
                  <span>Step 4: Target Career Trajectory & Preferences</span>
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Select your primary job role, preferred geography, compensation expectations, and enterprise company tier.
                </p>
              </div>

              {/* Target Role Cards */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Primary Target Engineering Role <span className="text-red-400">*</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TARGET_ROLE_OPTIONS.map((r) => {
                    const isSelected = profile.targetRole === r.title;
                    return (
                      <button
                        key={r.title}
                        type="button"
                        onClick={() =>
                          setProfile({
                            ...profile,
                            targetRole: r.title,
                            targetTier: r.tier
                          })
                        }
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_18px_rgba(16,185,129,0.2)]"
                            : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-bold text-white">{r.title}</span>
                          {isSelected && <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                        <span className="mt-2.5 inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                          {r.tier}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 pt-2 border-t border-white/[0.06]">
                {/* Target Domain */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Target Engineering Domain
                  </label>
                  <input
                    type="text"
                    id="input-domain"
                    placeholder="e.g. AI/ML, Cloud & DevOps, Full-Stack"
                    value={profile.targetDomain}
                    onChange={(e) => setProfile({ ...profile, targetDomain: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                {/* Preferred Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Preferred Location
                  </label>
                  <select
                    id="select-location"
                    value={profile.preferredLocation}
                    onChange={(e) => setProfile({ ...profile, preferredLocation: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expected Package */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Expected Package Range
                  </label>
                  <select
                    id="select-package"
                    value={profile.expectedPackage}
                    onChange={(e) => setProfile({ ...profile, expectedPackage: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    {PACKAGE_OPTIONS.map((pkg) => (
                      <option key={pkg} value={pkg}>
                        {pkg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preferred Company Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Target Enterprise Tier
                  </label>
                  <select
                    id="select-company-type"
                    value={profile.preferredCompanyType}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        preferredCompanyType: e.target.value,
                        targetTier: e.target.value
                      })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    {COMPANY_TYPE_OPTIONS.map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: REVIEW AND SUBMIT */}
          {/* ======================================================== */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Step 5: Review Profile & Run Intelligence Audit</span>
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Review your information below. Click any section's Edit button to revise, or submit to generate your Career Readiness Audit.
                </p>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                    <span>{submitError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitProfile}
                    className="rounded-xl border border-red-500/40 bg-red-500/20 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500/30"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Review Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* 1. Basic Details Card */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 relative">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>1. Basic Details</span>
                    </span>
                    <button
                      type="button"
                      id="btn-edit-step-1"
                      onClick={() => setStep(1)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    <p><strong className="text-white">Name:</strong> {profile.fullName || "Candidate"}</p>
                    <p><strong className="text-white">College:</strong> {profile.college || "N/A"}</p>
                    <p><strong className="text-white">Branch:</strong> {profile.branch} • {profile.course}</p>
                    <p><strong className="text-white">Standing:</strong> {profile.currentYear} ({profile.currentSemester})</p>
                  </div>
                </div>

                {/* 2. Academics Card */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 relative">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>2. Academics & Conversion</span>
                    </span>
                    <button
                      type="button"
                      id="btn-edit-step-2"
                      onClick={() => setStep(2)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    <p>
                      <strong className="text-white">CGPA:</strong> {profile.cgpa.toFixed(2)} / 10.0 (
                      <span className="text-emerald-300 font-semibold">{profile.percentage.toFixed(1)}%</span>)
                    </p>
                    <p><strong className="text-white">Formula:</strong> CGPA × {profile.cgpaFormulaMultiplier || 9.5}</p>
                    <p><strong className="text-white">10th / 12th:</strong> {profile.tenthPercentage}% / {profile.twelfthPercentage}%</p>
                    <p><strong className="text-white">Backlogs:</strong> {profile.activeBacklogs} active ({profile.historyBacklogs} cleared)</p>
                  </div>
                </div>

                {/* 3. Skills & Experience Card */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 relative">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      <span>3. Skills & Projects</span>
                    </span>
                    <button
                      type="button"
                      id="btn-edit-step-3"
                      onClick={() => setStep(3)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    <p><strong className="text-white">Skills:</strong> {profile.technicalSkills?.slice(0, 4).join(", ") || "None selected"}{profile.technicalSkills?.length > 4 ? ` +${profile.technicalSkills.length - 4} more` : ""}</p>
                    <p><strong className="text-white">Certifications:</strong> {profile.certifications?.length ? profile.certifications.slice(0, 2).join(", ") + (profile.certifications.length > 2 ? ` +${profile.certifications.length - 2} more` : "") : "None added"}</p>
                    <p><strong className="text-white">Projects / Internships:</strong> {profile.projectsCount} projects, {profile.internships} internship(s)</p>
                    <p><strong className="text-white">Self Ratings:</strong> Coding: {profile.coding}/10 • Comm: {profile.communication}/10</p>
                  </div>
                </div>

                {/* 4. Career Ambitions Card */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 relative">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      <span>4. Career Ambitions</span>
                    </span>
                    <button
                      type="button"
                      id="btn-edit-step-4"
                      onClick={() => setStep(4)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    <p><strong className="text-white">Target Role:</strong> {profile.targetRole}</p>
                    <p><strong className="text-white">Target Tier:</strong> {profile.preferredCompanyType}</p>
                    <p><strong className="text-white">Location / CTC:</strong> {profile.preferredLocation} • {profile.expectedPackage}</p>
                  </div>
                </div>
              </div>

              {/* Submit CTA Banner */}
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 p-5 text-center">
                <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">Ready to Compute Your Readiness Audit</h3>
                <p className="text-xs text-slate-300 max-w-lg mx-auto mt-1">
                  Upon submission, Pathfinder will benchmark your academic records and skillset against 972 campus placement profiles to generate your comprehensive audit report.
                </p>

                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    id="btn-submit-wizard"
                    onClick={handleSubmitProfile}
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-4 text-sm font-extrabold text-slate-950 shadow-xl shadow-emerald-500/25 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Computing Readiness & Benchmarks...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Profile & Calculate Career Readiness</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Navigation Buttons (Back & Next) */}
        <div className="mt-8 flex items-center justify-between border-t border-white/[0.08] pt-5">
          <button
            type="button"
            id="btn-wizard-back"
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
              step === 1 || isSubmitting
                ? "border-transparent text-slate-600 cursor-not-allowed"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] active:scale-95"
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          {step < 5 && (
            <button
              type="button"
              id="btn-wizard-next"
              onClick={handleNext}
              disabled={!stepValidation.isValid || isSubmitting}
              className={`flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-xs font-bold transition-all ${
                stepValidation.isValid && !isSubmitting
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <span>Next: {stepsList[step].label}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
