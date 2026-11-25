import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { StudentProfileState } from "@/types/profile";
import { CollegeSelector } from "@/components/common/CollegeSelector";
import { isOwnerAccount, isGuestAccount } from "@/lib/auth";

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const YEAR_TO_SEM: Record<string, { sem: number; label: string }> = {
  "1st Year": { sem: 2, label: "1st Year / Sem 2" },
  "2nd Year": { sem: 4, label: "2nd Year / Sem 4" },
  "3rd Year": { sem: 6, label: "3rd Year / Sem 6" },
  "4th Year": { sem: 8, label: "4th Year / Sem 8" },
};

function normalizeYearOption(raw?: string | number): string {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  if (s.includes("1")) return "1st Year";
  if (s.includes("2")) return "2nd Year";
  if (s.includes("4")) return "4th Year";
  if (s.includes("3")) return "3rd Year";
  return "";
}

interface ProfileSettingsProps {
  profile: StudentProfileState;
  onSaveProfile: (updated: StudentProfileState) => Promise<void>;
  onResetToDefaults: () => void;
  onGoToDashboard?: () => void;
  apiBase: string;
}

const BRANCHES = [
  "AIML",
  "CSD",
  "CSE",
  "CSM",
  "IT",
  "ECE",
  "EEE",
  "Mechanical",
  "Civil",
  "Cyber Security",
  "IoT",
  "Data Science",
  "Other",
];

const ROLE_GROUPS: Array<{ label: string; roles: string[] }> = [
  {
    label: "Software, Web & Cloud (CSE / IT)",
    roles: [
      "Software Development Engineer (SDE)",
      "Full-Stack Web Developer",
      "Backend / Distributed Systems Engineer",
      "Frontend / UI Engineer",
      "Mobile App Developer (Android / iOS / Flutter)",
      "Cloud & DevOps Engineer",
      "Site Reliability Engineer (SRE)",
      "QA & Automation Engineer",
    ],
  },
  {
    label: "AI, ML & Data (AIML / CSM / CSD / Data Science)",
    roles: [
      "Data Scientist / ML Engineer",
      "Generative AI / LLM Engineer",
      "Data Engineer & Analytics",
      "Business Intelligence / Data Analyst",
      "Computer Vision / NLP Engineer",
    ],
  },
  {
    label: "Cybersecurity & Networking",
    roles: [
      "Cybersecurity / SOC Analyst",
      "Cloud Security & Penetration Tester",
      "Network & Telecom Engineer",
    ],
  },
  {
    label: "Electronics, VLSI & Embedded (ECE / IoT)",
    roles: [
      "Embedded Systems & Firmware Engineer",
      "VLSI / RTL Design & Verification Engineer",
      "IoT & Edge Hardware Engineer",
      "Signal Processing & RF Engineer",
    ],
  },
  {
    label: "Electrical, Power & EV (EEE)",
    roles: [
      "Electrical Design & Power Systems Engineer",
      "EV Powertrain & BMS Engineer",
      "PLC / SCADA & Industrial Automation Engineer",
      "Control Systems Engineer",
    ],
  },
  {
    label: "Mechanical, Robotics & Manufacturing (Mechanical)",
    roles: [
      "Mechanical Design / CAD & CAE Engineer",
      "Robotics & Mechatronics Engineer",
      "Automotive / Thermal & R&D Engineer",
      "Production, Supply Chain & Operations Engineer",
    ],
  },
  {
    label: "Civil, Structural & Infrastructure (Civil)",
    roles: [
      "Structural & Civil Design Engineer",
      "BIM / Construction Planning Engineer",
      "Site / Geotechnical & Transportation Engineer",
    ],
  },
  {
    label: "Product, Consulting & Management",
    roles: [
      "Product / Systems Analyst",
      "Technology Consulting Analyst",
      "Associate Product Manager (APM)",
    ],
  },
];

const ALL_KNOWN_ROLES = new Set(ROLE_GROUPS.flatMap((g) => g.roles));

const TIERS = [
  "Product Companies / Tier-1 MNCs",
  "FAANG / MAANG & Big-Tech Product",
  "High-Growth Tech Startups",
  "Global Capability Centers (GCC)",
  "Core Electronics / Semiconductor / VLSI MNCs",
  "Core Mechanical / Automotive / EV & Aerospace",
  "Core Infrastructure / Construction / EPC Firms",
  "PSUs / GATE / Govt R&D (ISRO, DRDO, BHEL, NTPC)",
  "Big-4 Consulting & Fintech",
  "Service MNCs / Consultancies",
];

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  profile,
  onSaveProfile,
  onResetToDefaults,
  onGoToDashboard,
}) => {
  const [formData, setFormData] = useState<StudentProfileState>({
    ...profile,
    currentYear: normalizeYearOption(profile.currentYear),
  });
  const [skillsText, setSkillsText] = useState<string>(
    (profile.technicalSkills || profile.skills || []).join(", ")
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resolvedEmail =
    formData.email ||
    (typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "");
  const canSelectBossMode = isOwnerAccount(resolvedEmail);

  useEffect(() => {
    setFormData({
      ...profile,
      currentYear: normalizeYearOption(profile.currentYear),
    });
    setSkillsText((profile.technicalSkills || profile.skills || []).join(", "));
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!String(formData.branch || "").trim() || !(Number(formData.cgpa) > 0)) {
      setSuccessMsg(null);
      setErrorMsg("Please select your branch and enter your current CGPA (> 0) to calculate predictions.");
      return;
    }
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const mult = formData.cgpaFormulaMultiplier || 9.5;
      const parsedSkills = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const cleanGithub = (formData.githubUrl ?? formData.codingProfiles?.github ?? "").trim();
      const cleanLeetcode = (formData.leetcodeUrl ?? formData.codingProfiles?.leetcode ?? "").trim();
      const cleanLinkedin = (formData.codingProfiles?.linkedin ?? "").trim();
      const normalizedYear = normalizeYearOption(formData.currentYear);
      const semMeta = normalizedYear ? YEAR_TO_SEM[normalizedYear] : undefined;
      const updated: StudentProfileState = {
        ...formData,
        currentYear: normalizedYear,
        currentSemester: formData.currentSemester || (semMeta ? semMeta.sem : ""),
        yearSemester: semMeta ? semMeta.label : "",
        githubUrl: cleanGithub,
        leetcodeUrl: cleanLeetcode,
        linkedinUrl: cleanLinkedin,
        technicalSkills: parsedSkills,
        skills: parsedSkills,
        codingProfiles: {
          ...(formData.codingProfiles || {}),
          github: cleanGithub,
          leetcode: cleanLeetcode,
          linkedin: cleanLinkedin,
        },
        percentage: Math.round(formData.cgpa * mult * 10) / 10,
        backlogs: formData.activeBacklogs,
        onboardingCompleted: true,
      };
      await onSaveProfile(updated);
      setSuccessMsg("Profile saved. Recalculating dashboard predictions...");
      if (onGoToDashboard) {
        setTimeout(() => onGoToDashboard(), 350);
      } else {
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <form
        onSubmit={handleSave}
        className="pf-titanium-card space-y-8 rounded-2xl p-8 sm:p-12"
      >
        {/* Single Clean Profile Header */}
        <div className="flex flex-col justify-between gap-5 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-center">
          <div>
            <span className="inline-block rounded-md border border-white/[0.1] bg-[#141418] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA]">
              Candidate SSOT
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-3xl">
              Profile &amp; Candidate Settings
            </h1>
            <p className="mt-2 text-xs text-[#A1A1AA] sm:text-sm">
              Update your verified academic marks, backlogs, coding profiles, skills, and target
              role.
            </p>
          </div>

          <button
            type="button"
            onClick={onResetToDefaults}
            className="pf-btn-secondary inline-flex h-10 items-center self-start rounded-xl px-4 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] sm:self-auto cursor-pointer"
          >
            Reset defaults
          </button>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-xl border border-[#F87171]/40 bg-[#1F1215] p-4 text-xs font-medium text-[#FCA5A5]"
          >
            {errorMsg}
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/[0.2] bg-[#16161C] p-4 text-xs font-medium text-[#FAFAFA]"
          >
            {successMsg}
          </motion.div>
        )}

        {/* Section 1: Identity & College */}
        <div className="pf-subpanel space-y-5 rounded-2xl p-6 sm:p-8">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">01 · Academic Identity</h3>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="block text-xs font-medium text-[#D4D4D8]">
                Verified Login Identity
              </span>
              <div
                id="settings-verified-identity"
                className="pf-input flex h-11 items-center justify-between rounded-xl px-4 text-xs text-[#FAFAFA]"
              >
                <div className="truncate">
                  <span className="font-semibold text-[#FAFAFA]">
                    {canSelectBossMode
                      ? "Bommali Dileep"
                      : isGuestAccount(resolvedEmail, formData.fullName)
                        ? "Guest Session"
                        : formData.fullName || "Signed-In Candidate"}
                  </span>
                  {resolvedEmail && (
                    <span className="ml-2 font-mono text-[11px] text-[#71717A]">
                      {isGuestAccount(resolvedEmail, formData.fullName)
                        ? "Local Workspace"
                        : resolvedEmail}
                    </span>
                  )}
                </div>
                <span className="shrink-0 rounded-md border border-white/[0.1] bg-[#16161C] px-2.5 py-0.5 font-mono text-[10px] text-[#D4D4D8]">
                  {isGuestAccount(resolvedEmail, formData.fullName)
                    ? formData.cgpa > 0 && formData.branch
                      ? "Configured"
                      : "Unconfigured"
                    : "Synced"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-college"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                College / Institute
              </label>
              <CollegeSelector
                id="settings-college"
                variant="settings"
                value={formData.college}
                onChange={(college) => setFormData({ ...formData, college })}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-branch"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Branch / Department
              </label>
              <select
                id="settings-branch"
                name="branch"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              >
                <option value="" className="bg-[#09090B]">
                  Select branch...
                </option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b} className="bg-[#09090B]">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-course"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Course &amp; Year
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  id="settings-course"
                  name="course"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="pf-input h-11 rounded-xl px-4 text-xs text-[#FAFAFA]"
                  placeholder="e.g. B.Tech"
                />
                <select
                  id="settings-current-year"
                  name="currentYear"
                  aria-label="Academic Year"
                  value={normalizeYearOption(formData.currentYear)}
                  onChange={(e) => {
                    const yr = e.target.value;
                    const semMeta = YEAR_TO_SEM[yr];
                    setFormData({
                      ...formData,
                      currentYear: yr,
                      currentSemester: semMeta ? semMeta.sem : "",
                      yearSemester: semMeta ? semMeta.label : "",
                    });
                  }}
                  className="pf-input h-11 rounded-xl px-4 text-xs text-[#FAFAFA]"
                >
                  <option value="" className="bg-[#09090B]">
                    Select year...
                  </option>
                  {YEAR_OPTIONS.map((yr) => (
                    <option key={yr} value={yr} className="bg-[#09090B]">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Academics & Formula */}
        <div className="pf-subpanel space-y-5 rounded-2xl p-6 sm:p-8">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            02 · Academic Performance &amp; Live Conversion
          </h3>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="settings-cgpa" className="font-medium text-[#D4D4D8]">
                  Current CGPA (0 - 10)
                </label>
                <span className="font-mono font-semibold text-[#FAFAFA] tabular-nums">
                  {formData.cgpa.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                id="settings-cgpa"
                name="cgpa"
                step="0.05"
                min="0"
                max="10"
                value={formData.cgpa > 0 ? formData.cgpa : ""}
                placeholder="e.g. 8.2"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const cgpa = isNaN(val) ? 0 : val;
                  const mult = formData.cgpaFormulaMultiplier || 9.5;
                  setFormData({
                    ...formData,
                    cgpa,
                    percentage: Math.round(cgpa * mult * 10) / 10,
                  });
                }}
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-converted-percentage"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Converted Percentage
              </label>
              <input
                type="number"
                id="settings-converted-percentage"
                name="convertedPercentage"
                disabled
                placeholder="—"
                value={
                  formData.cgpa > 0
                    ? (formData.cgpa * (formData.cgpaFormulaMultiplier || 9.5)).toFixed(1)
                    : ""
                }
                className="pf-input h-11 w-full rounded-xl px-4 font-mono text-xs font-semibold text-[#FAFAFA] tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-formula"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Conversion Multiplier
              </label>
              <select
                id="settings-formula"
                name="cgpaFormulaMultiplier"
                value={formData.cgpaFormulaMultiplier || 9.5}
                onChange={(e) => {
                  const mult = parseFloat(e.target.value);
                  setFormData({
                    ...formData,
                    cgpaFormulaMultiplier: mult,
                    percentage: Math.round(formData.cgpa * mult * 10) / 10,
                  });
                }}
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              >
                <option value={9.5} className="bg-[#09090B]">AICTE / Standard (× 9.5)</option>
                <option value={10.0} className="bg-[#09090B]">Direct Scale (× 10.0)</option>
                <option value={9.0} className="bg-[#09090B]">State University (× 9.0)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-tenth"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                10th Percentage (%)
              </label>
              <input
                type="number"
                id="settings-tenth"
                name="tenthPercentage"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 86.5"
                value={formData.tenthPercentage > 0 ? formData.tenthPercentage : ""}
                onChange={(e) =>
                  setFormData({ ...formData, tenthPercentage: parseFloat(e.target.value) || 0 })
                }
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-twelfth"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                12th / Diploma (%)
              </label>
              <input
                type="number"
                id="settings-twelfth"
                name="twelfthPercentage"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 83.2"
                value={formData.twelfthPercentage > 0 ? formData.twelfthPercentage : ""}
                onChange={(e) =>
                  setFormData({ ...formData, twelfthPercentage: parseFloat(e.target.value) || 0 })
                }
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-backlogs"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Active Standing Backlogs
              </label>
              <input
                type="number"
                id="settings-backlogs"
                name="activeBacklogs"
                min="0"
                max="20"
                value={formData.activeBacklogs}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setFormData({ ...formData, activeBacklogs: val, backlogs: val });
                }}
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Skills & Ratings */}
        <div className="pf-subpanel space-y-5 rounded-2xl p-6 sm:p-8">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            03 · Skills, Projects &amp; Self-Assessments
          </h3>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="settings-projects-count"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Flagship Projects Count
              </label>
              <input
                type="number"
                id="settings-projects-count"
                name="projectsCount"
                min="0"
                max="20"
                value={formData.projectsCount}
                onChange={(e) =>
                  setFormData({ ...formData, projectsCount: parseInt(e.target.value, 10) || 0 })
                }
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-internships"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Verified Internships Count
              </label>
              <input
                type="number"
                id="settings-internships"
                name="internships"
                min="0"
                max="10"
                value={formData.internships}
                onChange={(e) =>
                  setFormData({ ...formData, internships: parseInt(e.target.value, 10) || 0 })
                }
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="settings-coding" className="font-medium text-[#D4D4D8]">
                  Coding &amp; DSA Confidence
                </label>
                <span className="font-mono font-semibold text-[#FAFAFA] tabular-nums">
                  {formData.coding} / 10
                </span>
              </div>
              <input
                type="range"
                id="settings-coding"
                name="coding"
                min="0"
                max="10"
                value={formData.coding}
                onChange={(e) =>
                  setFormData({ ...formData, coding: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#FAFAFA]"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="settings-communication" className="font-medium text-[#D4D4D8]">
                  Communication &amp; Interview Confidence
                </label>
                <span className="font-mono font-semibold text-[#FAFAFA] tabular-nums">
                  {formData.communication} / 10
                </span>
              </div>
              <input
                type="range"
                id="settings-communication"
                name="communication"
                min="0"
                max="10"
                value={formData.communication}
                onChange={(e) =>
                  setFormData({ ...formData, communication: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#FAFAFA]"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label
                htmlFor="settings-technical-skills"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Technical Skills (comma-separated)
              </label>
              <input
                type="text"
                id="settings-technical-skills"
                name="technicalSkills"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="e.g. Python, JavaScript, React, SQL, Data Structures"
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA] placeholder-[#52525B]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:col-span-2 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="settings-github-url"
                  className="block text-xs font-medium text-[#D4D4D8]"
                >
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  id="settings-github-url"
                  name="githubUrl"
                  value={formData.githubUrl ?? formData.codingProfiles?.github ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      githubUrl: val,
                      codingProfiles: { ...(formData.codingProfiles || {}), github: val },
                    });
                  }}
                  placeholder="https://github.com/your-username"
                  className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA] placeholder-[#52525B]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="settings-leetcode-url"
                  className="block text-xs font-medium text-[#D4D4D8]"
                >
                  LeetCode Profile URL
                </label>
                <input
                  type="url"
                  id="settings-leetcode-url"
                  name="leetcodeUrl"
                  value={formData.leetcodeUrl ?? formData.codingProfiles?.leetcode ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      leetcodeUrl: val,
                      codingProfiles: { ...(formData.codingProfiles || {}), leetcode: val },
                    });
                  }}
                  placeholder="https://leetcode.com/your-username"
                  className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA] placeholder-[#52525B]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="settings-linkedin-url"
                  className="block text-xs font-medium text-[#D4D4D8]"
                >
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  id="settings-linkedin-url"
                  name="linkedinUrl"
                  value={formData.codingProfiles?.linkedin ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      codingProfiles: { ...(formData.codingProfiles || {}), linkedin: val },
                    });
                  }}
                  placeholder="https://linkedin.com/in/your-username"
                  className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA] placeholder-[#52525B]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Target Role & Preferences */}
        <div className="pf-subpanel space-y-5 rounded-2xl p-6 sm:p-8">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">04 · Target Role &amp; Preferences</h3>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="settings-target-role"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Target Role
              </label>
              <select
                id="settings-target-role"
                name="targetRole"
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              >
                {formData.targetRole && !ALL_KNOWN_ROLES.has(formData.targetRole) && (
                  <option value={formData.targetRole}>{formData.targetRole}</option>
                )}
                {ROLE_GROUPS.map((group) => (
                  <optgroup
                    key={group.label}
                    label={group.label}
                    className="bg-[#09090B] text-[#A1A1AA]"
                  >
                    {group.roles.map((r) => (
                      <option key={r} value={r} className="bg-[#09090B] text-[#FAFAFA]">
                        {r}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="settings-target-tier"
                className="block text-xs font-medium text-[#D4D4D8]"
              >
                Target Company Tier
              </label>
              <select
                id="settings-target-tier"
                name="targetTier"
                value={formData.targetTier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetTier: e.target.value,
                    preferredCompanyType: e.target.value,
                  })
                }
                className="pf-input h-11 w-full rounded-xl px-4 text-xs text-[#FAFAFA]"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t} className="bg-[#09090B]">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {onGoToDashboard && (
            <button
              type="button"
              onClick={onGoToDashboard}
              className="pf-btn-secondary inline-flex h-11 items-center rounded-xl px-5 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
            >
              Back to Overview
            </button>
          )}
          <button
            type="submit"
            id="btn-save-settings"
            disabled={isSaving}
            className="pf-btn-primary inline-flex h-11 items-center rounded-xl px-6 text-xs font-medium active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? "Saving & Recalculating..." : "Save Profile & Recalculate"}
          </button>
        </div>
      </form>
    </div>
  );
};
