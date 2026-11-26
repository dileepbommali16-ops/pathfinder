export interface CodingProfiles {
  github?: string;
  leetcode?: string;
  codechef?: string;
  linkedin?: string;
}

export interface StudentProfileState {
  // Step 1: Basic Details
  email?: string;
  fullName: string;
  college: string;
  branch: string;
  course: string;
  currentYear: string | number;
  currentSemester: string | number;
  yearSemester?: string;

  // Step 2: Academic Details
  tenthPercentage: number;
  twelfthPercentage: number;
  cgpa: number;
  percentage: number;
  cgpaFormulaMultiplier: number;
  semesterCgpas?: number[];
  activeBacklogs: number;
  historyBacklogs: number;
  historyOfBacklogs?: number;
  backlogs: number; // backward compatibility alias

  // Step 3: Skills & Experience
  technicalSkills: string[];
  skills?: string[]; // alias
  tools: string[];
  programmingLanguages: string[];
  languages?: string[]; // alias
  projectsCount: number;
  internships: number;
  certifications: string[];
  codingProfiles: CodingProfiles;
  githubUrl?: string; // direct alias
  leetcodeUrl?: string; // direct alias
  linkedinUrl?: string; // direct alias
  coding: number;
  communication: number;

  // Step 4: Career Goals
  targetRole: string;
  targetDomain: string;
  preferredLocation: string;
  expectedPackage: string;
  preferredCompanyType: string;
  targetTier: string;
  graduationYear: number;

  // Step 5 & Completion status
  onboardingCompleted: boolean;
  wizardStep: number;
  honorificPref?: "Auto" | "Madam" | "Sir" | "Boss" | "Stranger";
  githubVerifiedScore?: number | null;
}

export interface ReadinessAuditData {
  chance: number;
  label: string;
  tone: "strong" | "steady" | "focus";
  overall_percentage: number;
  cgpa: number;
  conversion_formula: string;
  strengths: string[];
  gaps: string[];
  priorities?: string[];
  recommended_skills: string[];
  breakdown: Record<string, number>;
  cohort_comparison: {
    branch: string;
    percentile: number;
    top_percent: number;
    branch_avg_cgpa: number;
    branch_placement_rate: number;
    total_candidates: number;
    comparison_text: string;
  };
  next_steps: string[];
}

/** Returns true when a name is blank or a generic placeholder such as "Student Candidate". */
export function isPlaceholderCandidateName(val?: string | null): boolean {
  const s = (val || "").trim();
  return !s || /^(student candidate|guest student|guest|stranger|student|new student|candidate)$/i.test(s);
}

/** Returns true when an email is blank or a synthetic guest/placeholder address. */
export function isPlaceholderCandidateEmail(val?: string | null): boolean {
  const s = (val || "").trim().toLowerCase();
  return !s || /^(guest|candidate|student|demo)@pathfinder\.ai$/i.test(s);
}

/** Prefers a concrete candidate name over generic template placeholders. */
export function pickCandidateFullName(candidate?: string | null, fallback?: string | null): string {
  const c = (candidate || "").trim();
  if (!isPlaceholderCandidateName(c)) return c;
  const f = (fallback || "").trim();
  if (!isPlaceholderCandidateName(f)) return f;
  return c || f || "";
}

/** Builds a clean onboarding profile pre-seeded with the new student's identity. */
export function buildFreshOnboardingProfile(
  username?: string | null,
  email?: string | null
): StudentProfileState {
  const cleanEmail = (email || "").trim();
  const cleanName = pickCandidateFullName(username) || (username || "").trim();
  return {
    ...DEFAULT_STUDENT_PROFILE,
    email: cleanEmail,
    fullName: cleanName,
    githubUrl: "",
    leetcodeUrl: "",
    codingProfiles: { github: "", leetcode: "", linkedin: "" },
    onboardingCompleted: true,
    wizardStep: 5,
  };
}

/** Hydrates initial profile state from localStorage draft and/or signed-in user record. */
export function buildInitialProfileFromStorage(
  savedDraftRaw?: string | null,
  savedUserRaw?: string | null
): StudentProfileState {
  let storedUser: Record<string, any> = {};
  if (savedUserRaw) {
    try {
      const parsed = JSON.parse(savedUserRaw);
      if (parsed && typeof parsed === "object") {
        storedUser = parsed;
      }
    } catch { }
  }

  const storedEmail = String(storedUser.email || "").trim();
  const storedName = pickCandidateFullName(storedUser.username);
  const storedEmailLower = storedEmail.toLowerCase();

  if (savedDraftRaw) {
    try {
      const parsedDraft = JSON.parse(savedDraftRaw);
      if (parsedDraft && typeof parsedDraft === "object") {
        const draftEmailLower = String(parsedDraft.email || "").trim().toLowerCase();
        if (!storedEmailLower || !draftEmailLower || storedEmailLower === draftEmailLower) {
          const baseTemplate =
            storedEmailLower === "guest@pathfinder.ai" || draftEmailLower === "guest@pathfinder.ai"
              ? EMPTY_GUEST_PROFILE
              : DEFAULT_STUDENT_PROFILE;
          return {
            ...baseTemplate,
            ...parsedDraft,
            onboardingCompleted: true,
            email: parsedDraft.email || storedEmail || baseTemplate.email,
            fullName:
              pickCandidateFullName(parsedDraft.fullName, storedName) ||
              baseTemplate.fullName,
          };
        }
      }
    } catch { }
  }

  if (storedEmail || storedName) {
    if (storedEmailLower === "guest@pathfinder.ai") {
      return {
        ...DEMO_GUEST_PROFILE,
        email: storedEmail,
        onboardingCompleted: true,
      };
    }

    return {
      ...DEFAULT_STUDENT_PROFILE,
      email: storedEmail || DEFAULT_STUDENT_PROFILE.email,
      fullName: storedName || DEFAULT_STUDENT_PROFILE.fullName,
      githubUrl: "",
      leetcodeUrl: "",
      codingProfiles: { github: "", leetcode: "", linkedin: "" },
      onboardingCompleted: true,
      wizardStep: DEFAULT_STUDENT_PROFILE.wizardStep,
    };
  }

  return DEFAULT_STUDENT_PROFILE;
}

export function isProfileUnconfigured(
  profile: Partial<StudentProfileState> | null | undefined
): boolean {
  if (!profile) return true;
  const cgpa = Number(profile.cgpa || 0);
  const branch = String(profile.branch || "").trim();
  return !(cgpa > 0) || !branch;
}

export const EMPTY_GUEST_PROFILE: StudentProfileState = {
  fullName: "Guest",
  email: "guest@pathfinder.ai",
  college: "",
  branch: "",
  course: "B.Tech",
  currentYear: "",
  currentSemester: "",
  yearSemester: "",
  tenthPercentage: 0,
  twelfthPercentage: 0,
  cgpa: 0,
  percentage: 0,
  cgpaFormulaMultiplier: 9.5,
  semesterCgpas: [],
  activeBacklogs: 0,
  historyBacklogs: 0,
  historyOfBacklogs: 0,
  backlogs: 0,
  technicalSkills: [],
  skills: [],
  tools: [],
  programmingLanguages: [],
  languages: [],
  projectsCount: 0,
  internships: 0,
  certifications: [],
  codingProfiles: {
    github: "",
    leetcode: "",
    linkedin: "",
  },
  githubUrl: "",
  leetcodeUrl: "",
  linkedinUrl: "",
  coding: 0,
  communication: 0,
  targetRole: "",
  targetDomain: "",
  preferredLocation: "",
  expectedPackage: "",
  preferredCompanyType: "",
  targetTier: "",
  graduationYear: 2026,
  onboardingCompleted: true,
  wizardStep: 5,
};

export const DEMO_GUEST_PROFILE: StudentProfileState = {
  fullName: "Sample Student",
  email: "guest@pathfinder.ai",
  college: "Sample Engineering Institute",
  branch: "CSE",
  course: "B.Tech",
  currentYear: "4th Year",
  currentSemester: "Semester 7",
  yearSemester: "4th Year / Sem 7",
  tenthPercentage: 88,
  twelfthPercentage: 85,
  cgpa: 8.1,
  percentage: 76.95,
  cgpaFormulaMultiplier: 9.5,
  semesterCgpas: [7.6, 7.8, 8.0, 8.2, 8.1, 8.4],
  activeBacklogs: 0,
  historyBacklogs: 0,
  historyOfBacklogs: 0,
  backlogs: 0,
  technicalSkills: [
    "Python",
    "TypeScript",
    "React",
    "FastAPI",
    "SQL",
    "Docker",
    "Data Structures",
  ],
  skills: [
    "Python",
    "TypeScript",
    "React",
    "FastAPI",
    "SQL",
    "Docker",
    "Data Structures",
  ],
  tools: ["Git", "Docker", "PostgreSQL", "VS Code"],
  programmingLanguages: ["Python", "TypeScript", "C++"],
  languages: ["Python", "TypeScript", "C++"],
  projectsCount: 3,
  internships: 1,
  certifications: ["AWS Cloud Practitioner (Sample)"],
  codingProfiles: {
    github: "",
    leetcode: "",
    linkedin: "",
  },
  githubUrl: "",
  leetcodeUrl: "",
  linkedinUrl: "",
  coding: 8,
  communication: 7,
  targetRole: "Software Development Engineer (SDE)",
  targetDomain: "Full Stack & Backend Systems",
  preferredLocation: "Hyderabad / Bangalore",
  expectedPackage: "12-18 LPA",
  preferredCompanyType: "Product Companies / Tier-1 MNCs",
  targetTier: "Product Companies / Tier-1 MNCs",
  graduationYear: 2026,
  onboardingCompleted: true,
  wizardStep: 5,
};

export const DEFAULT_STUDENT_PROFILE: StudentProfileState = {
  fullName: "Student Candidate",
  college: "",
  branch: "CSE",
  course: "B.Tech",
  currentYear: "4th Year",
  currentSemester: "Semester 7",
  yearSemester: "4th Year / Semester 7",
  tenthPercentage: 86.5,
  twelfthPercentage: 83.2,
  cgpa: 7.8,
  percentage: 74.1,
  cgpaFormulaMultiplier: 9.5,
  semesterCgpas: [7.2, 7.5, 7.8, 8.0, 7.9, 8.2],
  activeBacklogs: 0,
  historyBacklogs: 0,
  historyOfBacklogs: 0,
  backlogs: 0,
  technicalSkills: ["Python", "JavaScript", "React", "SQL", "Data Structures"],
  skills: ["Python", "JavaScript", "React", "SQL", "Data Structures"],
  tools: ["Git", "Docker", "VS Code", "Postman"],
  programmingLanguages: ["Python", "JavaScript", "C++"],
  languages: ["Python", "JavaScript", "C++"],
  projectsCount: 3,
  internships: 1,
  certifications: ["AWS Certified Cloud Practitioner", "HackerRank Problem Solving (Gold)"],
  codingProfiles: {
    github: "",
    leetcode: "",
    linkedin: "",
  },
  githubUrl: "",
  leetcodeUrl: "",
  linkedinUrl: "",
  coding: 7,
  communication: 7,
  targetRole: "Software Development Engineer (SDE)",
  targetDomain: "Full Stack & Distributed Systems",
  preferredLocation: "Hyderabad / Bangalore",
  expectedPackage: "10-16 LPA",
  preferredCompanyType: "Product Companies / Tier-1 MNCs",
  targetTier: "Product Companies / Tier-1 MNCs",
  graduationYear: 2026,
  onboardingCompleted: true,
  wizardStep: 5,
};
