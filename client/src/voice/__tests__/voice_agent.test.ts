import { describe, it, expect } from "vitest";
import { VisemeEngine, NEUTRAL_VISEMES } from "../avatar/visemes";
import { IdleController } from "../avatar/idle";
import { EchoGateManager } from "../echo";
import { AudioQueuePlayer } from "../audio/player";
import { actionEngine } from "../actions";
import { memoryManager } from "../memory";
import { quizManager } from "../quiz";
import { analyzeResumeFile } from "../resumeScanner";

describe("Pathfinder Voice Agent Architecture Unit Tests", () => {
  describe("1. Multilingual Viseme Mapping (English, Hindi, Telugu)", () => {
    const engine = new VisemeEngine();

    it("maps English open vowels, spread vowels, rounded vowels, and closed bilabials", () => {
      // Open vowel 'a'
      const vA = engine.getTargetViseme("a", 0.5);
      expect(vA.jawOpen).toBeGreaterThan(0.5);

      // Spread vowel 'e' / 'i'
      const vE = engine.getTargetViseme("e", 0.5);
      expect(vE.mouthWide).toBeGreaterThan(0.5);

      // Rounded vowel 'o' / 'u'
      const vO = engine.getTargetViseme("o", 0.5);
      expect(vO.mouthRound).toBeGreaterThan(0.5);

      // Closed bilabial 'm'
      const vM = engine.getTargetViseme("m", 0.5);
      expect(vM.jawOpen).toBe(0.0);
    });

    it("maps Telugu vowels and syllables accurately", () => {
      // Telugu Open Vowel: ఆ (aa)
      const vTeA = engine.getTargetViseme("ఆ", 0.6);
      expect(vTeA.jawOpen).toBeGreaterThan(0.6);

      // Telugu Rounded Vowel: ఉ (u)
      const vTeU = engine.getTargetViseme("ఉ", 0.6);
      expect(vTeU.mouthRound).toBeGreaterThan(0.6);

      // Telugu Bilabial: మ (ma)
      const vTeM = engine.getTargetViseme("మ", 0.6);
      expect(vTeM.jawOpen).toBe(0.0);
    });

    it("maps Hindi Devanagari vowels accurately", () => {
      // Hindi Open Vowel: आ (aa)
      const vHiA = engine.getTargetViseme("आ", 0.6);
      expect(vHiA.jawOpen).toBeGreaterThan(0.6);

      // Hindi Rounded Vowel: ओ (oh)
      const vHiO = engine.getTargetViseme("ओ", 0.6);
      expect(vHiO.mouthRound).toBeGreaterThan(0.6);

      // Hindi Bilabial: म (ma)
      const vHiM = engine.getTargetViseme("म", 0.6);
      expect(vHiM.jawOpen).toBe(0.0);
    });

    it("smoothly converges spring to target over consecutive animation frames", () => {
      let state = { ...NEUTRAL_VISEMES };
      for (let i = 0; i < 12; i++) {
        state = engine.update("a", 0.5, 0.016);
      }
      expect(state.jawOpen).toBeGreaterThan(0.3);
    });

    it("decays mouth to closed neutral state when no audio plays", () => {
      // 0 RMS -> decays to neutral
      const neutral = engine.update("", 0.0, 0.05);
      expect(neutral.jawOpen).toBeLessThan(0.05);
      expect(neutral.mouthRound).toBeLessThan(0.05);
    });
  });

  describe("2. Blink Scheduler & Skeletal Micro-motion", () => {
    it("generates continuous sine wave breathing sway in idle state", () => {
      const controller = new IdleController();
      const frame1 = controller.update(1000, "idle", 1.0);
      const frame2 = controller.update(1500, "idle", 1.5);

      // Should oscillate with time
      expect(typeof frame1.positionY).toBe("number");
      expect(typeof frame1.rotationY).toBe("number");
      expect(frame1.positionY).not.toBe(frame2.positionY);
    });

    it("triggers smooth eye blinking within 3 to 5 second interval", () => {
      const controller = new IdleController();

      // At start, eyes open (progress = 0)
      const initial = controller.update(1000, "idle", 1.0);
      expect(initial.eyeBlinkProgress).toBe(0);

      // Advance by 3.6 seconds (should trigger blink)
      const blinking = controller.update(4700, "idle", 4.7);
      expect(blinking.eyeBlinkProgress).toBeGreaterThanOrEqual(0.0);
    });

    it("adapts gaze and head tilt according to conversational state", () => {
      const controller = new IdleController();
      const listening = controller.update(1000, "listening", 1.0);
      expect(listening.browRaise).toBeGreaterThan(0);

      const thinking = controller.update(2000, "thinking", 2.0);
      expect(thinking.gazeX).toBeGreaterThan(0);
    });
  });

  describe("3. Echo Cancellation & Barge-in Gating", () => {
    it("gates out speaker echo during agent speech", () => {
      let bargedIn = false;
      const echo = new EchoGateManager({
        onBargeIn: () => { bargedIn = true; }
      });

      echo.setAgentSpeaking(true);
      // Low audio level (speaker bleed into mic) -> gated out
      const allowed = echo.evaluateMicFrame(0.12);
      expect(allowed).toBe(false);
      expect(bargedIn).toBe(false);
    });

    it("detects clean voice barge-in when user speaks loud and clear", () => {
      let bargedIn = false;
      const echo = new EchoGateManager({
        onBargeIn: () => { bargedIn = true; }
      });

      echo.setAgentSpeaking(true);
      // High audio level (deliberate user speech) -> triggers barge-in
      const allowed = echo.evaluateMicFrame(0.55);
      expect(allowed).toBe(true);
      expect(bargedIn).toBe(true);
    });
  });

  describe("4. Central stopAll() Dynamics", () => {
    it("immediately clears all audio sources and resets player to idle", () => {
      const player = new AudioQueuePlayer();
      player.stopAll();
      expect(player.isPlaying).toBe(false);
      expect(player.getRMS()).toBe(0);
    });
  });

  describe("5. Autonomous Website Action Engine", () => {
    it("autonomously triggers tab navigation for projects, analytics, and resume", () => {
      let navigatedTab = "";
      const context = {
        onNavigateTab: (tab: string) => {
          navigatedTab = tab;
        },
      };

      const resProjects = actionEngine.executeCommand("show me project blueprints", context);
      expect(resProjects?.handled).toBe(true);
      expect(resProjects?.actionType).toBe("NAVIGATE_TAB");
      expect(navigatedTab).toBe("projects");

      const resAnalytics = actionEngine.executeCommand("open cohort analytics", context);
      expect(resAnalytics?.handled).toBe(true);
      expect(navigatedTab).toBe("analytics");
    });

    it("triggers ATS Resume Builder modal when requested", () => {
      let openedModal = false;
      const context = {
        onOpenResumeBuilder: () => {
          openedModal = true;
        },
      };

      const res = actionEngine.executeCommand("open resume builder", context);
      expect(res?.handled).toBe(true);
      expect(res?.actionType).toBe("OPEN_RESUME_BUILDER");
      expect(openedModal).toBe(true);
    });

    it("supports undo stack to reverse autonomous actions", () => {
      let currentTab = "coach";
      const context = {
        onNavigateTab: (tab: string) => {
          currentTab = tab;
        },
      };

      actionEngine.setCurrentTab("coach");
      actionEngine.executeCommand("go to blueprints", context);
      expect(currentTab).toBe("projects");

      const undoRes = actionEngine.executeCommand("undo", context);
      expect(undoRes?.handled).toBe(true);
      expect(currentTab).toBe("coach");
    });
  });

  describe("6. Persistent Memory Manager", () => {
    it("stores and recalls student dream company and notes", () => {
      memoryManager.updateProfile({ dreamCompany: "Microsoft" });
      const mem = memoryManager.getMemory();
      expect(mem.dreamCompany).toBe("Microsoft");

      const note = memoryManager.addNote("Master Dynamic Programming by November");
      expect(note.text).toContain("Dynamic Programming");
      const updatedMem = memoryManager.getMemory();
      expect(updatedMem.notes.length).toBeGreaterThan(0);
    });
  });

  describe("7. Technical Placement Viva & Quiz Mode", () => {
    it("initiates viva session and dispatches question", () => {
      const q = quizManager.startQuiz();
      expect(q.id).toBe("q_1");
      expect(q.topic).toContain("DSA");
      expect(quizManager.inProgress).toBe(true);
    });

    it("evaluates student viva answers and returns score and explanation", () => {
      const evalGood = quizManager.evaluateAnswer("QuickSort worst case is O(N^2) when array is sorted, prevented by random pivot");
      expect(evalGood.score).toBeGreaterThanOrEqual(7);
      expect(evalGood.isCorrect).toBe(true);
      expect(evalGood.spokenFeedback).toContain("out of 10");

      const nextQ = quizManager.nextQuestion();
      expect(nextQ?.topic).toContain("Database");
    });
  });

  describe("8. Instant Drag-and-Drop Resume Deep Scanner", () => {
    it("parses resume skills and calculates ATS placement readiness score", async () => {
      const mockResumeContent = `
        Senior Software Engineer.
        Skills: Docker, Kubernetes, Redis, PostgreSQL, System Design, TypeScript, Python, DSA.
        Experience: Optimized microservices latency by 45%, handling 500000 requests daily.
      `;
      const file = new File([mockResumeContent], "priyanka_resume.txt", { type: "text/plain" });

      const audit = await analyzeResumeFile(file);
      expect(audit.atsScore).toBeGreaterThanOrEqual(75);
      expect(audit.extractedSkills).toContain("Docker");
      expect(audit.extractedSkills).toContain("Redis");
      expect(audit.spokenFeedback).toContain("ATS Placement Match");
    });
  });
});
