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
import {
  DEFAULT_STUDENT_PROFILE,
  buildFreshOnboardingProfile,
  buildInitialProfileFromStorage,
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

    expect(lampLoginSrc).not.toContain("Sign Up / New Student");
    expect(lampLoginSrc).not.toContain("Start Onboarding");
    expect(homeSrc).not.toContain("<OnboardingWizard");
    expect(homeSrc).not.toContain("buildFreshOnboardingProfile");
    expect(audioSrc).toContain("echoGuardUntilPerfMs");
    expect(audioSrc).toContain("ttsSpeakSeq");
  });

  it("greets Boss once with 'Hi Boss! What's up?' on first hi, never repeats on second hi, and avoids co-pilot", () => {
    handleAuthLoginDetected("dileepbommali16@gmail.com", "Dileep");
    const first = getCareerAgentResponse("hi", [], { branch: "CSE", cgpa: 8.5 }, "Boss");
    expect(first).toContain("Hi Boss! What's up?");
    expect(first.toLowerCase()).not.toContain("co-pilot");

    const second = getCareerAgentResponse(
      "hi",
      [
        { role: "user", content: "hi" },
        { role: "assistant", content: first.split("|||")[0] },
      ],
      { branch: "CSE", cgpa: 8.5 },
      "Boss"
    );
    expect(second.toLowerCase()).not.toContain("what's up");
    expect(second.toLowerCase()).not.toContain("co-pilot");

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

    expect(audioSrc).not.toContain("speechSynthesis.speak(");
    expect(combinedVoiceSrc).not.toMatch(/SpeechSynthesisUtterance|Aoede|Kore|Fenrir|Charon|Donovan|fetchDeepgramMp3|playElevenLabs|speakElevenLabs/i);
    expect(audioSrc).toContain("dance_or_motion");
    expect(socketSrc).toContain("reconnectForAccountSwitch");
    expect(socketSrc).toContain("ZERO SYCOPHANCY");
  });
});
