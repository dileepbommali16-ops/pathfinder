import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ rpc: vi.fn() })),
}));

import {
  isOwnerAccount,
  inferHonorific,
  getUserRole,
  setHonorificPreference,
  handleAuthLoginDetected,
} from "../lib/auth";
import { getCareerAgentResponse } from "../lib/careerAgent";
import { SUPPORTED_LANGUAGES } from "../agent/codingStudioController";
import { tryExecuteClientAutomationIntent } from "../agent/toolRunner";
import {
  DEFAULT_STUDENT_PROFILE,
  DEMO_GUEST_PROFILE,
  EMPTY_GUEST_PROFILE,
  isProfileUnconfigured,
  buildFreshOnboardingProfile,
  buildInitialProfileFromStorage,
  isPlaceholderCandidateEmail,
  isPlaceholderCandidateName,
  pickCandidateFullName,
} from "../types/profile";

function installMemoryBrowserGlobals() {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };

  if (typeof (globalThis as any).CustomEvent === "undefined") {
    vi.stubGlobal(
      "CustomEvent",
      class CustomEventShim<T = any> {
        type: string;
        detail: T;
        constructor(type: string, init?: { detail?: T }) {
          this.type = type;
          this.detail = init?.detail as T;
        }
      }
    );
  }

  vi.stubGlobal("localStorage", mockLocalStorage);
  vi.stubGlobal("window", {
    localStorage: mockLocalStorage,
    location: { search: "" },
    dispatchEvent: vi.fn(() => true),
  });
}

describe("Strict Boss Identity, Honorifics & Builder Knowledge", () => {
  beforeEach(() => {
    installMemoryBrowserGlobals();
  });

  it("allows Boss mode ONLY for dileepbommali16@gmail.com", () => {
    expect(isOwnerAccount("dileepbommali16@gmail.com")).toBe(true);
    expect(isOwnerAccount("DILEEPBOMMALI16@GMAIL.COM")).toBe(true);
    expect(isOwnerAccount("dileep@pathfinder.ai")).toBe(false);
    expect(isOwnerAccount("dileepbommali2005@gmail.com")).toBe(false);
    expect(isOwnerAccount("priyankabommali2@gmail.com")).toBe(false);
    expect(isOwnerAccount("")).toBe(false);

    expect(inferHonorific("dileepbommali16@gmail.com", "Dileep")).toBe("Boss");
    expect(inferHonorific("dileep_friend@gmail.com", "Dileep")).toBe("Sir");
    expect(inferHonorific("priyankabommali2@gmail.com", "indala gayatri")).toBe("Madam");
  });

  it("blocks Boss escalation for girl or male visitors and persists Madam/Sir properly", () => {
    const girlRole = handleAuthLoginDetected("priyankabommali2@gmail.com", "indala gayatri");
    expect(girlRole).toBe("Madam");
    expect(getUserRole()).toBe("Madam");

    const blocked = setHonorificPreference("Boss");
    expect(blocked).toBe("Madam");
    expect(localStorage.getItem("userRole")).toBe("Madam");

    const maleRole = handleAuthLoginDetected("arjun@college.edu", "Arjun");
    expect(maleRole).toBe("Sir");
    expect(getUserRole()).toBe("Sir");

    const ownerRole = handleAuthLoginDetected("dileepbommali16@gmail.com", "Dileep");
    expect(ownerRole).toBe("Boss");
    expect(getUserRole()).toBe("Boss");

    // Switching to Guest after Boss or Madam MUST force Stranger mode and never leak prior session roles
    localStorage.setItem("das_honorific_override_map", JSON.stringify({ "guest@pathfinder.ai": "Madam" }));
    const guestAfterGirl = handleAuthLoginDetected("guest@pathfinder.ai", "Guest Student");
    expect(guestAfterGirl).toBe("Stranger");
    expect(getUserRole()).toBe("Stranger");
    expect(setHonorificPreference("Boss")).toBe("Stranger");
    expect(setHonorificPreference("Madam")).toBe("Stranger");
  });

  it("answers builder ecosystem & screen monitor queries offline without Boss leak", () => {
    handleAuthLoginDetected("priyankabommali2@gmail.com", "indala gayatri");
    const builderAnswer = getCareerAgentResponse(
      "After problem statement what next step? Antigravity vs Cursor vs Claude Code, VS Code RAG folder structure, Vercel Render Cloudflare, ChatGPT vs Gemini AI vs Claude AI",
      [],
      { branch: "CSE", cgpa: 8.2 },
      "Madam"
    );
    expect(builderAnswer).toContain("Madam");
    expect(builderAnswer).not.toContain("Boss");
    expect(builderAnswer).toContain("Antigravity");
    expect(builderAnswer).toContain("Cursor");
    expect(builderAnswer).toContain("Claude Code");
    expect(builderAnswer).toContain("rag_pipeline.py");
    expect(builderAnswer).toContain("Vercel");
    expect(builderAnswer).toContain("Render");
    expect(builderAnswer).toContain("Cloudflare");
  });

  it("replaces generic placeholder candidate names with authenticated user names", () => {
    expect(isPlaceholderCandidateName("Student Candidate")).toBe(true);
    expect(isPlaceholderCandidateName("Guest Student")).toBe(true);
    expect(isPlaceholderCandidateName("Dileep Bommali")).toBe(false);

    expect(pickCandidateFullName("Student Candidate", "Dileep Bommali")).toBe("Dileep Bommali");
    expect(pickCandidateFullName("", "indala gayatri")).toBe("indala gayatri");
    expect(pickCandidateFullName("Priya Sharma", "Dileep Bommali")).toBe("Priya Sharma");
  });

  it("builds fresh onboarding profiles and hydrates signed-in users across reloads without placeholder names", () => {
    const fresh = buildFreshOnboardingProfile("Rohan Verma", "rohan@example.com");
    expect(fresh.fullName).toBe("Rohan Verma");
    expect(fresh.email).toBe("rohan@example.com");
    expect(fresh.onboardingCompleted).toBe(true);

    // Reloading never traps users inside the removed step-wise onboarding wizard
    const reloadedNewUser = buildInitialProfileFromStorage(
      null,
      JSON.stringify({ username: "Rohan Verma", email: "rohan@example.com", is_new_user: true })
    );
    expect(reloadedNewUser.fullName).toBe("Rohan Verma");
    expect(reloadedNewUser.email).toBe("rohan@example.com");
    expect(reloadedNewUser.onboardingCompleted).toBe(true);

    // Reloading with a stale/mismatched email draft falls back to the active signed-in user
    const mismatchedDraft = JSON.stringify({
      ...DEFAULT_STUDENT_PROFILE,
      email: "olduser@example.com",
      fullName: "Old User",
    });
    const switchedUser = buildInitialProfileFromStorage(
      mismatchedDraft,
      JSON.stringify({ username: "indala gayatri", email: "priyankabommali2@gmail.com" })
    );
    expect(switchedUser.fullName).toBe("indala gayatri");
    expect(switchedUser.email).toBe("priyankabommali2@gmail.com");

    // Draft containing placeholder fullName inherits authenticated username
    const placeholderDraft = JSON.stringify({
      ...DEFAULT_STUDENT_PROFILE,
      email: "dileepbommali16@gmail.com",
      fullName: "Student Candidate",
    });
    const repairedDraft = buildInitialProfileFromStorage(
      placeholderDraft,
      JSON.stringify({ username: "Dileep Bommali", email: "dileepbommali16@gmail.com" })
    );
    expect(repairedDraft.fullName).toBe("Dileep Bommali");
    expect(repairedDraft.onboardingCompleted).toBe(true);
  });

  it("never falls back to unrelated blueprints or limited-knowledge phrasing for general factual queries", () => {
    handleAuthLoginDetected("priyankabommali2@gmail.com", "indala gayatri");
    const gkReply = getCareerAgentResponse(
      "who is vangaveeti mohana ranga",
      [],
      { branch: "CSE", cgpa: 8.2 },
      "Madam"
    );
    expect(gkReply.toLowerCase()).not.toContain("28 blueprints");
    expect(gkReply.toLowerCase()).not.toContain("strictly limited");
    expect(gkReply.toLowerCase()).toContain("vangaveeti mohana ranga");
  });

  it("permanently removes Sign Up / New Student and blocking OnboardingWizard across all entry flows", () => {
    const srcRoot = path.resolve(__dirname, "..");
    const lampLoginSrc = fs.readFileSync(path.join(srcRoot, "components/auth/LampLogin.tsx"), "utf-8");
    const homeSrc = fs.readFileSync(path.join(srcRoot, "pages/Home.tsx"), "utf-8");
    const audioSrc = fs.readFileSync(path.join(srcRoot, "agent/audioIO.ts"), "utf-8");
    const collegeSelectorSrc = fs.readFileSync(path.join(srcRoot, "components/common/CollegeSelector.tsx"), "utf-8");
    const collegesSrc = fs.readFileSync(path.join(srcRoot, "data/colleges.ts"), "utf-8");
    const agentLayoutSrc = fs.readFileSync(path.join(srcRoot, "agent/AgentLayout.tsx"), "utf-8");

    expect(lampLoginSrc).not.toContain("Sign Up / New Student");
    expect(lampLoginSrc).not.toContain("Start Onboarding");
    expect(homeSrc).not.toContain("<OnboardingWizard");
    expect(homeSrc).not.toContain("buildFreshOnboardingProfile");
    expect(audioSrc).toContain("echoGuardUntilPerfMs");
    expect(audioSrc).toContain("ttsSpeakSeq");
    expect(collegeSelectorSrc).not.toContain("Real Locations");
    expect(collegesSrc.match(/id:\s*"/g)?.length || 0).toBeGreaterThanOrEqual(100);
    expect(collegesSrc.indexOf("nriu-nriit")).toBeLessThan(collegesSrc.indexOf("vrsec-sahe"));
    expect(agentLayoutSrc).not.toContain("das-attachment-file-input");
    expect(agentLayoutSrc).not.toContain("📎");
  });

  it("greets Boss, Madam, Sir, and Stranger with exact 1st and 2nd+ replies and avoids co-pilot", () => {
    handleAuthLoginDetected("dileepbommali16@gmail.com", "Dileep");
    const first = getCareerAgentResponse("hi", [], { branch: "CSE", cgpa: 8.5 }, "Boss");
    expect(first.split("|||")[0]).toBe("Hi Boss! What's up?");
    expect(first.toLowerCase()).not.toContain("co-pilot");

    const second = getCareerAgentResponse(
      "hi baby",
      [
        { role: "user", content: "hi" },
        { role: "assistant", content: first.split("|||")[0] },
      ],
      { branch: "CSE", cgpa: 8.5 },
      "Boss"
    );
    expect(second.split("|||")[0]).toBe("Hi Boss, I'm here!");
    expect(second.toLowerCase()).not.toContain("what's up");
    expect(second.toLowerCase()).not.toContain("co-pilot");

    const madamFirst = getCareerAgentResponse("hi", [], { branch: "CSE" }, "Madam");
    expect(madamFirst.split("|||")[0]).toBe("Hi Madam! What's up?");
    const madamSecond = getCareerAgentResponse(
      "hi baby",
      [{ role: "user", content: "hi" }, { role: "assistant", content: madamFirst.split("|||")[0] }],
      { branch: "CSE" },
      "Madam"
    );
    expect(madamSecond.split("|||")[0]).toBe("Hi Madam, I'm here!");

    const sirFirst = getCareerAgentResponse("hi", [], { branch: "CSE" }, "Sir");
    expect(sirFirst.split("|||")[0]).toBe("Hi Sir! What's up?");
    const sirSecond = getCareerAgentResponse(
      "hi baby",
      [{ role: "user", content: "hi" }, { role: "assistant", content: sirFirst.split("|||")[0] }],
      { branch: "CSE" },
      "Sir"
    );
    expect(sirSecond.split("|||")[0]).toBe("Hi Sir, I'm here!");

    const strangerFirst = getCareerAgentResponse("hi", [], { branch: "CSE" }, "Stranger");
    expect(strangerFirst.split("|||")[0]).toBe("Hi stranger, tell your name first!");
    const strangerSecond = getCareerAgentResponse(
      "hi baby",
      [{ role: "user", content: "hi" }, { role: "assistant", content: strangerFirst.split("|||")[0] }],
      { branch: "CSE" },
      "Stranger"
    );
    expect(strangerSecond.split("|||")[0]).toBe("Hi stranger, I'm here — tell me your name first!");

    const platformOverview = getCareerAgentResponse("what is pathfinder", [], { branch: "CSE" }, "Boss");
    expect(platformOverview.toLowerCase()).not.toContain("co-pilot");
  });

  it("enforces Puck-only voice (no browser speechSynthesis or alternate voices) and zero-sycophancy & live vision rules across female and male accounts", () => {
    const srcRoot = path.resolve(__dirname, "..");
    const audioSrc = fs.readFileSync(path.join(srcRoot, "agent/audioIO.ts"), "utf-8");
    const socketSrc = fs.readFileSync(path.join(srcRoot, "agent/agentSocket.ts"), "utf-8");
    const voiceMgrSrc = fs.readFileSync(path.join(srcRoot, "audio/voiceManager.ts"), "utf-8");
    const coachSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/AICoachConsole.tsx"), "utf-8");
    const combinedVoiceSrc = [audioSrc, socketSrc, voiceMgrSrc, coachSrc].join("\n");

    const layoutSrc = fs.readFileSync(path.join(srcRoot, "agent/AgentLayout.tsx"), "utf-8");
    expect(audioSrc).not.toContain("speechSynthesis.speak(");
    expect(combinedVoiceSrc).not.toMatch(/SpeechSynthesisUtterance|Aoede|Kore|Fenrir|Charon|Donovan|fetchDeepgramMp3|playElevenLabs|speakElevenLabs/i);
    expect(audioSrc).not.toContain("CameraEngine");
    expect(audioSrc).not.toContain("startCameraCapture");
    expect(layoutSrc).not.toContain("toggleCamera");
    expect(layoutSrc).not.toContain("📷 Cam");
    expect(socketSrc).toContain("reconnectForAccountSwitch");
    expect(socketSrc).toContain("ZERO SYCOPHANCY");
    expect(socketSrc).toContain("audioRescueTimer");
    expect(audioSrc).toContain("pendingResumeChunks");
  });

  it("removes Boss starter leak from Coding Studio templates and handles live CGPA profile update intent", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.starter).not.toContain("Hello Boss");
      expect(lang.starter).not.toContain('greet("Boss")');
    }

    const handled = tryExecuteClientAutomationIntent("set my cgpa to 8.9");
    expect(handled).toBe(true);
    const dispatchMock = (window as any).dispatchEvent as ReturnType<typeof vi.fn>;
    const dispatched = dispatchMock.mock.calls.map((c) => c[0]);
    const profEvt = dispatched.find((e) => e?.type === "das-update-profile");
    expect(profEvt).toBeDefined();
    expect(profEvt.detail).toEqual({ field: "cgpa", value: 8.9 });
  });

  it("responds warmly to natural compliments without resetting to a greeting", () => {
    handleAuthLoginDetected("dileepbommali16@gmail.com", "Dileep");
    const praiseReply = getCareerAgentResponse("good", [], { branch: "CSE", cgpa: 8.5 }, "Boss");
    const spoken = praiseReply.split("|||")[0];
    expect(spoken).toContain("Boss");
    expect(spoken).not.toBe("Hi Boss! What's up?");
    expect(spoken.toLowerCase()).not.toContain("what's up");

    const arenaSrc = fs.readFileSync(
      path.resolve(__dirname, "../components/dashboard/LiveCodingInterviewArena.tsx"),
      "utf-8"
    );
    expect(arenaSrc.match(/starterPython:/g)?.length || 0).toBeGreaterThanOrEqual(15);
    expect(arenaSrc.match(/solutionPython:/g)?.length || 0).toBeGreaterThanOrEqual(15);
  });

  it("answers 'hi who i m' with Boss identity instead of falling back to Hi Boss greeting", () => {
    handleAuthLoginDetected("dileepbommali16@gmail.com", "Dileep");
    const idReply = getCareerAgentResponse("hi who i m", [], { branch: "CSD", cgpa: 8.5 }, "Boss");
    const spoken = idReply.split("|||")[0];
    expect(spoken).toContain("Bommali Dileep");
    expect(spoken).not.toContain("What's up");
  });

  it("treats Guest and Stranger as placeholder names and preloads Demo Guest Profile cleanly while preserving cleared state", () => {
    expect(isPlaceholderCandidateName("Guest")).toBe(true);
    expect(isPlaceholderCandidateName("Stranger")).toBe(true);
    expect(pickCandidateFullName("Guest", "Priyanka")).toBe("Priyanka");

    const demoGuestProfile = buildInitialProfileFromStorage(
      null,
      JSON.stringify({ email: "guest@pathfinder.ai", username: "Guest Student" })
    );
    expect(demoGuestProfile.cgpa).toBe(DEMO_GUEST_PROFILE.cgpa);
    expect(demoGuestProfile.branch).toBe("CSE");
    expect(isProfileUnconfigured(demoGuestProfile)).toBe(false);

    const clearedGuestProfile = buildInitialProfileFromStorage(
      JSON.stringify(EMPTY_GUEST_PROFILE),
      JSON.stringify({ email: "guest@pathfinder.ai", username: "Guest Student" })
    );
    expect(clearedGuestProfile.cgpa).toBe(0);
    expect(clearedGuestProfile.branch).toBe("");
    expect(clearedGuestProfile.linkedinUrl).toBe("");
    expect(isProfileUnconfigured(clearedGuestProfile)).toBe(true);
    expect(isProfileUnconfigured(EMPTY_GUEST_PROFILE)).toBe(true);
  });

  it("enforces P0 docked DAS stage, honest claims, and clean Footer/LampLogin copy", () => {
    const srcRoot = path.resolve(__dirname, "..");
    const footerSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/Footer.tsx"), "utf-8");
    const loginSrc = fs.readFileSync(path.join(srcRoot, "components/auth/LampLogin.tsx"), "utf-8");
    const landingSrc = fs.readFileSync(path.join(srcRoot, "components/landing/ComputeLandingPage.tsx"), "utf-8");
    const layoutSrc = fs.readFileSync(path.join(srcRoot, "agent/AgentLayout.tsx"), "utf-8");
    const homeSrc = fs.readFileSync(path.join(srcRoot, "pages/Home.tsx"), "utf-8");

    expect(footerSrc).not.toContain("All 7 subsystems operational");
    expect(footerSrc).not.toContain("support@pathfinder-ai.io");
    expect(footerSrc.toLowerCase()).not.toContain("verified");

    expect(loginSrc).not.toContain("Dileep Bommali");
    expect(loginSrc).not.toContain("Audited");
    expect(loginSrc).not.toContain("System Operational");
    expect(loginSrc).toContain("Your full name");

    expect(landingSrc.toLowerCase()).not.toContain("verified");
    expect(landingSrc.toLowerCase()).not.toContain("audited");

    expect(layoutSrc).toContain("das-stage");
    expect(layoutSrc).toContain("xl:w-[360px]");
    expect(layoutSrc).toContain('export const DAS_LAYOUT: DasLayoutMode = "background"');
    expect(layoutSrc).toContain("onSpeakingStateChange");
    expect(layoutSrc).toContain("SPEAKING_OFF_DEBOUNCE_MS = 400");
    expect(layoutSrc).toContain("isOverviewHeroActive");
    expect(layoutSrc).toContain("opacity-35");
    expect(homeSrc).toContain("opacity-70");
    expect(homeSrc).toContain("Demo Profile (Sample)");
    expect(homeSrc).toContain("Clear &amp; enter my details");
    const heroMetricsSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/HeroMetrics.tsx"), "utf-8");
    const norm = (s: string) => s.replace(/\s+/g, " ");
    const SYNTHETIC_PHRASE = "972-record synthetic placement dataset, augmented from a 215-record public baseline";
    expect(heroMetricsSrc).toContain('data-das-hero-zone="overview"');
    expect(norm(heroMetricsSrc)).toContain(SYNTHETIC_PHRASE);
    expect(norm(footerSrc)).toContain(SYNTHETIC_PHRASE);
    expect(footerSrc).toContain('data-dataset-credit="public-baseline-215"');
    expect(footerSrc).not.toContain("Institutional data");
    expect(footerSrc).not.toContain("Hyderabad, India");
    expect(footerSrc).not.toContain("Hugging Face");
    expect(norm(landingSrc)).toContain(SYNTHETIC_PHRASE);
    const cohortExplorerSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/CohortExplorer.tsx"), "utf-8");
    expect(norm(cohortExplorerSrc)).toContain(SYNTHETIC_PHRASE);
    expect(cohortExplorerSrc).not.toContain("TPO Institutional Command Center");
    expect(cohortExplorerSrc).not.toContain("NAAC 5.2.1");
    expect(cohortExplorerSrc).not.toContain("Class of {y}");
    const geminiLiveSrc = fs.readFileSync(path.join(srcRoot, "agent/geminiLive.ts"), "utf-8");
    const careerAgentSrc = fs.readFileSync(path.join(srcRoot, "lib/careerAgent.js"), "utf-8");
    const complianceSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/ComplianceModals.tsx"), "utf-8");
    expect(geminiLiveSrc).toContain(SYNTHETIC_PHRASE);
    expect(geminiLiveSrc).not.toContain("972 verified");
    expect(careerAgentSrc).toContain(SYNTHETIC_PHRASE);
    expect(careerAgentSrc).not.toContain("972 real student records");
    expect(careerAgentSrc).not.toContain("972 verified");
    expect(complianceSrc).toContain("88% cross-validation accuracy on the synthetic dataset");
  });

  it("keeps visible mode badges, Addressing Mode UI, and dead handleRoleToggle out of AgentLayout and ProfileSettings", () => {
    const srcRoot = path.resolve(__dirname, "..");
    const layoutSrc = fs.readFileSync(path.join(srcRoot, "agent/AgentLayout.tsx"), "utf-8");
    const settingsSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/ProfileSettings.tsx"), "utf-8");

    for (const banned of ["Stranger Mode", "Madam Mode", "Sir Mode", "Boss Mode", "handleRoleToggle"]) {
      expect(layoutSrc).not.toContain(banned);
    }
    expect(settingsSrc).not.toContain("Addressing Mode");
  });

  it("removes fabricated resume/JD/cohort data, duplicate CTAs, duplicate sprint-roadmap IDs, and invalid DOM nesting", () => {
    const srcRoot = path.resolve(__dirname, "..");
    const resumeModalSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/OnePageResumeModal.tsx"), "utf-8");
    const jdTailorSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/JDCustomTailor.tsx"), "utf-8");
    const cohortSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/CohortExplorer.tsx"), "utf-8");
    const landingSrc = fs.readFileSync(path.join(srcRoot, "components/landing/ComputeLandingPage.tsx"), "utf-8");
    const layoutSrc = fs.readFileSync(path.join(srcRoot, "agent/AgentLayout.tsx"), "utf-8");
    const homeSrc = fs.readFileSync(path.join(srcRoot, "pages/Home.tsx"), "utf-8");
    const heroSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/HeroMetrics.tsx"), "utf-8");
    const radarSrc = fs.readFileSync(path.join(srcRoot, "components/dashboard/CompanyPlacementRadar.tsx"), "utf-8");

    // 1. OnePageResumeModal: zero hardcoded fake projects, stats, or duplicate bars/arrows
    for (const fake of [
      "3,500+ tasks/sec",
      "Distributed Asynchronous Task Queue",
      "50+ concurrent users",
      "150+ DSA problems",
      "candidate@pathfinder.ai",
      "github.com/candidate",
      "leetcode.com/candidate",
      "Institute of Technology",
      "← Back",
    ]) {
      expect(resumeModalSrc).not.toContain(fake);
    }
    expect(resumeModalSrc.match(/onClick=\{handlePrint\}/g)?.length).toBe(1);
    expect(isPlaceholderCandidateEmail("guest@pathfinder.ai")).toBe(true);
    expect(isPlaceholderCandidateEmail("candidate@pathfinder.ai")).toBe(true);
    expect(isPlaceholderCandidateEmail("dileepbommali16@gmail.com")).toBe(false);

    // 2. JDCustomTailor: zero fabricated 42% latency claim, fake projectsCount || 2, or duplicate verdict CTA
    expect(jdTailorSrc).not.toContain("42% p95 response latency");
    expect(jdTailorSrc).not.toContain("projectsCount || 2");
    expect(jdTailorSrc).not.toContain("Math.max(18,");
    expect(jdTailorSrc).not.toContain("Hear DAS JD verdict");

    // 3. CohortExplorer: zero hardcoded recruiters or fake Verified/Accreditation Ready badges
    expect(cohortSrc).not.toContain("TCS, Infosys, Accenture, Product Drives");
    expect(cohortSrc).not.toContain("Accreditation Ready");
    expect(cohortSrc).not.toContain('"972 Records"');

    // 4. ComputeLandingPage & AgentLayout: no nested <main> or nested button inside role="button"
    expect(layoutSrc).not.toMatch(/<main[\s>]/);
    expect(landingSrc).not.toContain('role="button"');
    expect(landingSrc).not.toContain("91.9%");
    expect(landingSrc).not.toContain("89 / 100");

    // 5. Deduplicated DOM IDs, coach CTAs, and honest reference benchmarks
    expect(homeSrc.match(/id="sprint-roadmap"/g)?.length).toBe(1);
    expect(heroSrc).not.toContain("Talk to 3D voice coach");
    expect(radarSrc).toContain("Industry Reference Benchmarks");
    expect(radarSrc).not.toContain("Active Campus Drives");
  });
});
