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

export const DEFAULT_STUDENT_PROFILE: StudentProfileState = {
  fullName: "Student Candidate",
  college: "Engineering Institute of Technology",
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
    github: "https://github.com/candidate-demo",
    leetcode: "https://leetcode.com/candidate-demo",
  },
  githubUrl: "https://github.com/candidate-demo",
  leetcodeUrl: "https://leetcode.com/candidate-demo",
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
