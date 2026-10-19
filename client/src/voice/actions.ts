/**
 * Autonomous Website Control & Action Engine (client/src/voice/actions.ts)
 * Dispatches voice-commanded and text-commanded actions directly to the Pathfinder website.
 * Supports:
 * - Dynamic tab navigation across all 13 modules
 * - Direct triggering of ATS Resume Builder modal
 * - Triggering Mock Interview console
 * - Profile updates and persistent memory notes
 * - Undo stack for autonomous reversibility
 */

import { memoryManager } from "./memory";
import { quizManager } from "./quiz";

export interface WebsiteActionContext {
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
  onOpenResumeBuilder?: () => void;
  onLaunchMockInterview?: (company: string, role: string) => void;
  onUpdateProfile?: (updates: any) => void;
  onLanguageChange?: (lang: string) => void;
  onAutoSpeakToggle?: (autoSpeak: boolean) => void;
}

export interface ActionResult {
  handled: boolean;
  actionType: string;
  feedbackText: string;
  spokenFeedback: string;
  target?: string;
}

export class PathfinderActionEngine {
  private undoStack: { type: string; payload?: any; previousTab?: string }[] = [];
  private currentTab: string = "coach";

  public setCurrentTab(tab: string) {
    this.currentTab = tab;
  }

  /**
   * Evaluates natural language command and determines if it triggers a website action.
   */
  public executeCommand(input: string, context: WebsiteActionContext): ActionResult | null {
    const raw = input.trim();
    const lower = raw.toLowerCase();

    // 1. UNDO / REVERT ACTION
    if (lower === "undo" || lower === "go back" || lower === "revert" || lower.includes("undo that")) {
      const last = this.undoStack.pop();
      if (last && last.previousTab && context.onNavigateTab) {
        context.onNavigateTab(last.previousTab);
        memoryManager.recordAction("Reverted navigation", last.previousTab);
        return {
          handled: true,
          actionType: "UNDO_NAVIGATE",
          feedbackText: `Undone last navigation. Returned to ${last.previousTab}.`,
          spokenFeedback: `Reverting back to the ${last.previousTab} section.`,
          target: last.previousTab,
        };
      }
      return {
        handled: true,
        actionType: "UNDO_EMPTY",
        feedbackText: "No previous website actions in the undo stack.",
        spokenFeedback: "There are no previous actions to undo, sir.",
      };
    }

    // 2. OPEN RESUME BUILDER / MODAL
    if (
      lower.includes("resume builder") ||
      lower.includes("open resume") ||
      lower.includes("one page resume") ||
      lower.includes("edit resume") ||
      lower.includes("ats builder")
    ) {
      if (context.onOpenResumeBuilder) {
        context.onOpenResumeBuilder();
        memoryManager.recordAction("Opened ATS Resume Builder Modal");
        return {
          handled: true,
          actionType: "OPEN_RESUME_BUILDER",
          feedbackText: "Opened Pathfinder One-Page ATS Resume Studio.",
          spokenFeedback: "Opening the Pathfinder ATS Resume Builder for you right now.",
        };
      }
    }

    // 3. LAUNCH MOCK INTERVIEW
    if (
      lower.includes("mock interview") ||
      lower.includes("practice interview") ||
      lower.includes("technical interview") ||
      lower.includes("start interview")
    ) {
      let company = "Razorpay / Fintech";
      let role = "Full Stack Engineer";
      if (lower.includes("google")) company = "Google";
      if (lower.includes("amazon")) company = "Amazon";
      if (lower.includes("microsoft")) company = "Microsoft";

      if (context.onLaunchMockInterview) {
        context.onLaunchMockInterview(company, role);
      }
      if (context.onNavigateTab) {
        this.undoStack.push({ type: "navigate", previousTab: this.currentTab });
        context.onNavigateTab("interview");
      }
      memoryManager.recordAction("Launched Mock Interview", company);
      return {
        handled: true,
        actionType: "LAUNCH_MOCK_INTERVIEW",
        feedbackText: `Launched AI Mock Interview for ${company} (${role}).`,
        spokenFeedback: `Navigating to the Mock Interview studio for ${company}. Let's begin technical practice!`,
        target: "interview",
      };
    }

    // 4. TECHNICAL VIVA & PLACEMENT QUIZ
    if (
      lower.includes("start viva") ||
      lower.includes("start quiz") ||
      lower.includes("viva mode") ||
      lower.includes("test me on dsa") ||
      lower.includes("placement quiz")
    ) {
      const q = quizManager.startQuiz();
      return {
        handled: true,
        actionType: "START_VIVA_QUIZ",
        feedbackText: `[TECHNICAL VIVA MODE - ${q.topic}]\n${q.question}`,
        spokenFeedback: q.spokenPrompt,
      };
    }

    // If Viva is in progress:
    if (quizManager.inProgress) {
      // 4A. Exit Viva Mode
      if (
        lower.includes("exit") ||
        lower.includes("quit") ||
        lower === "stop" ||
        lower.includes("stop viva") ||
        lower.includes("cancel") ||
        lower.includes("close viva") ||
        lower.includes("enough") ||
        lower === "aapu"
      ) {
        quizManager.stopQuiz();
        return {
          handled: true,
          actionType: "EXIT_VIVA",
          feedbackText: "Exited Technical Viva Mode. Back to standard assistant mode.",
          spokenFeedback: "Exiting Viva mode, sir. How else can I assist you with your placement preparation?",
        };
      }

      // 4B. Student says "I don't know" / "Tell me answer" / "Explain" / "Skip"
      if (
        lower.includes("dont know") ||
        lower.includes("don't know") ||
        lower.includes("tell me answer") ||
        lower.includes("tell me the answer") ||
        lower.includes("explain") ||
        lower.includes("no idea") ||
        lower.includes("skip") ||
        lower.includes("teliyadu") ||
        lower.includes("cheppandi")
      ) {
        const explanation = quizManager.explainCurrentAnswer();
        return {
          handled: true,
          actionType: "VIVA_EXPLANATION",
          feedbackText: explanation.feedback,
          spokenFeedback: explanation.spokenFeedback,
        };
      }

      // 4C. Student says "Next" to advance
      if (lower === "next" || lower === "next question" || lower === "continue") {
        const nextQ = quizManager.nextQuestion();
        if (nextQ) {
          return {
            handled: true,
            actionType: "NEXT_VIVA_QUESTION",
            feedbackText: `[NEXT QUESTION - ${nextQ.topic}]\n${nextQ.question}`,
            spokenFeedback: nextQ.spokenPrompt,
          };
        }
        quizManager.stopQuiz();
        return {
          handled: true,
          actionType: "END_VIVA",
          feedbackText: "That concludes this technical viva session! Great work practicing core fundamentals.",
          spokenFeedback: "That concludes our technical viva session! Excellent work practicing your placement fundamentals.",
        };
      }

      // If user commanded a normal tab action like "show blueprints", exit viva and proceed
      if (lower.startsWith("go to") || lower.startsWith("open") || lower === "undo" || lower.includes("tab")) {
        quizManager.stopQuiz();
      } else {
        // 4D. Evaluate student technical answer
        const evalResult = quizManager.evaluateAnswer(raw);
        const nextQ = quizManager.nextQuestion();
        const nextPrompt = nextQ ? `\n\n[NEXT QUESTION - ${nextQ.topic}]\n${nextQ.question}` : "\n\nThat concludes this viva round!";
        const spokenNext = nextQ ? ` Next up: ${nextQ.spokenPrompt}` : " That concludes our technical viva round!";

        return {
          handled: true,
          actionType: "EVALUATE_VIVA",
          feedbackText: `[VIVA EVALUATION: ${evalResult.score}/10]\n${evalResult.feedback}${nextPrompt}`,
          spokenFeedback: `${evalResult.spokenFeedback}${spokenNext}`,
        };
      }
    }

    // 4. STEP-BY-STEP PROJECT TUTORING (Persisted across tab switches)
    if (lower === "next step" || lower === "next" || lower.includes("what is next step") || lower === "taruvatha step") {
      const tutoring = memoryManager.getProjectTutoring();
      if (tutoring) {
        const nextStepNum = memoryManager.advanceProjectStep();
        if (nextStepNum && nextStepNum <= tutoring.totalSteps) {
          const stepGuide = `[${tutoring.projectTitle.toUpperCase()} - STEP ${nextStepNum}/${tutoring.totalSteps}]\nProceed with implementation module ${nextStepNum}. Verify with terminal tests before continuing.`;
          const spoken = `Step ${nextStepNum} of ${tutoring.projectTitle}: proceed with module ${nextStepNum} and verify your tests. Say next step when ready!`;
          return {
            handled: true,
            actionType: "PROJECT_STEP_ADVANCE",
            feedbackText: stepGuide,
            spokenFeedback: spoken,
            target: "projects",
          };
        } else {
          memoryManager.clearProjectTutoring();
          return {
            handled: true,
            actionType: "PROJECT_COMPLETE",
            feedbackText: `Congratulations! You have completed all steps for ${tutoring.projectTitle}.`,
            spokenFeedback: `Congratulations! You have finished building ${tutoring.projectTitle}. Would you like to practice viva defense for it?`,
            target: "projects",
          };
        }
      }
    }

    if (lower.includes("build it step by step") || lower.includes("start project") || lower.includes("build project")) {
      memoryManager.setProjectTutoring("proj-sde-1", "Distributed Task Queue", 1, 4);
      return {
        handled: true,
        actionType: "START_PROJECT_TUTORING",
        feedbackText: "[PROJECT MENTOR: Distributed Task Queue - STEP 1/4]\nStep 1: Design clean REST API schemas and thread-safe store. Test with pytest.",
        spokenFeedback: "Starting Step 1 of the Distributed Task Queue project: design the thread-safe engine and test locally. Say 'next step' when ready!",
        target: "projects",
      };
    }

    // 5. TAB NAVIGATION COMMANDS
    const tabMatches: { pattern: RegExp; tab: string; name: string }[] = [
      { pattern: /(project|blueprint|portfolio|flagship)/, tab: "projects", name: "Flagship Portfolio Blueprints" },
      { pattern: /(analytic|cohort|placement stat|salary|package|dataset|records|cohorts)/, tab: "analytics", name: "Cohort Placement Intelligence" },
      { pattern: /(roadmap|sprint|dsa schedule|week|syllabus)/, tab: "skills", name: "6-Week Sprint Roadmap" },
      { pattern: /(resume studio|ats scanner|resume score|resume)/, tab: "resume", name: "ATS Resume Studio" },
      { pattern: /(defense|star method|project viva|architecture defense)/, tab: "defense", name: "STAR Architecture Defense" },
      { pattern: /(readiness|command center|audit|actions)/, tab: "action", name: "Readiness Command Center" },
      { pattern: /(profile|setting|cgpa update|ssot)/, tab: "profile", name: "Candidate Profile & Settings" },
      { pattern: /(branch|degree|tier cutoff)/, tab: "branches", name: "Branch & Degree Analytics" },
      { pattern: /(overview|dashboard|home)/, tab: "overview", name: "Executive Overview Dashboard" },
      { pattern: /(role intelligence|target role)/, tab: "roles", name: "Target Role Intelligence" },
      { pattern: /(mission|placement mission)/, tab: "missions", name: "Placement Mission Tracker" },
      { pattern: /(voice|coach|das agent)/, tab: "coach", name: "AI Career Coach Studio" },
    ];

    if (
      lower.startsWith("go to") ||
      lower.startsWith("open") ||
      lower.startsWith("show") ||
      lower.startsWith("take me to") ||
      lower.startsWith("navigate") ||
      lower.startsWith("switch to") ||
      lower.includes("tab") ||
      lower.includes("page") ||
      lower.includes("slide") ||
      lower.includes("blueprints") ||
      lower.includes("analytics") ||
      lower.includes("dataset") ||
      lower.includes("teesukelli") ||
      lower.includes("chupinchu") ||
      lower.includes("vellu") ||
      lower.includes("veldam")
    ) {
      for (const item of tabMatches) {
        if (item.pattern.test(lower)) {
          if (context.onNavigateTab) {
            this.undoStack.push({ type: "navigate", previousTab: this.currentTab });
            context.onNavigateTab(item.tab);
            this.currentTab = item.tab;
            memoryManager.recordAction(`Navigated to ${item.name}`, item.tab);
            return {
              handled: true,
              actionType: "NAVIGATE_TAB",
              feedbackText: `Navigated autonomously to ${item.name}.`,
              spokenFeedback: `Navigating to ${item.name}.`,
              target: item.tab,
            };
          }
        }
      }
    }

    // 5. REMEMBER NOTE / PERSISTENT MEMORY COMMAND
    if (
      lower.startsWith("remember that") ||
      lower.startsWith("remember my") ||
      lower.startsWith("note that") ||
      lower.startsWith("save note") ||
      lower.includes("dream company is")
    ) {
      let noteText = raw;
      if (lower.includes("dream company is")) {
        const parts = raw.split(/is/i);
        const comp = parts[parts.length - 1].trim();
        memoryManager.updateProfile({ dreamCompany: comp });
        memoryManager.addNote(`Target dream company set to ${comp}`);
        return {
          handled: true,
          actionType: "SAVE_MEMORY",
          feedbackText: `Saved dream company: ${comp} into persistent memory.`,
          spokenFeedback: `I have noted that your dream company is ${comp}. I will optimize your roadmaps accordingly.`,
        };
      }

      memoryManager.addNote(noteText);
      return {
        handled: true,
        actionType: "SAVE_MEMORY",
        feedbackText: `Saved to persistent memory: "${raw}"`,
        spokenFeedback: "Noted and stored in persistent memory across sessions, sir.",
      };
    }

    // 6. RECALL MEMORY NOTES
    if (lower.includes("what are my notes") || lower.includes("recall notes") || lower.includes("what is my dream company")) {
      const mem = memoryManager.getMemory();
      if (lower.includes("dream company")) {
        return {
          handled: true,
          actionType: "RECALL_MEMORY",
          feedbackText: `Dream Company: ${mem.dreamCompany}`,
          spokenFeedback: `Your stored dream company is ${mem.dreamCompany}.`,
        };
      }
      const noteCount = mem.notes.length;
      const topNotes = mem.notes.slice(0, 3).map((n) => n.text).join(". ");
      return {
        handled: true,
        actionType: "RECALL_MEMORY",
        feedbackText: `Retrieved ${noteCount} persistent memory items: ${topNotes}`,
        spokenFeedback: `You have ${noteCount} stored memory items. Recent note: ${mem.notes[0]?.text || "None"}`,
      };
    }

    // 7. LANGUAGE CONTROL
    if (lower.includes("telugu") || lower.includes("telugulo") || lower.includes("తెలుగు")) {
      if (context.onLanguageChange) context.onLanguageChange("te");
      return {
        handled: true,
        actionType: "SET_LANGUAGE",
        feedbackText: "Switched language preference to Telugu (తెలుగు).",
        spokenFeedback: "నేను ఇకపై మీతో తెలుగులో మాట్లాడతాను. మీకు ఏమి సహాయం కావాలి?",
      };
    }
    if (lower.includes("english") || lower.includes("in english")) {
      if (context.onLanguageChange) context.onLanguageChange("en");
      return {
        handled: true,
        actionType: "SET_LANGUAGE",
        feedbackText: "Switched language preference to English.",
        spokenFeedback: "Switched voice language preference to English, sir.",
      };
    }

    // 8. MUTE / UNMUTE VOICE
    if (lower === "mute" || lower === "be quiet" || lower === "voice off") {
      if (context.onAutoSpeakToggle) context.onAutoSpeakToggle(false);
      return {
        handled: true,
        actionType: "SET_MUTE",
        feedbackText: "Voice audio muted. Text responses will continue in Activity Log.",
        spokenFeedback: "",
      };
    }
    if (lower === "unmute" || lower === "voice on" || lower === "speak") {
      if (context.onAutoSpeakToggle) context.onAutoSpeakToggle(true);
      return {
        handled: true,
        actionType: "SET_UNMUTE",
        feedbackText: "Voice output enabled. DAS will speak replies aloud.",
        spokenFeedback: "Voice synthesizer enabled, sir.",
      };
    }

    return null;
  }
}

export const actionEngine = new PathfinderActionEngine();
