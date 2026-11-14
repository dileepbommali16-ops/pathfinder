import { describe, it, expect } from "vitest";
import {
  assessAnswerSubstance,
  evaluateProjectDefenseAnswer,
  evaluateMockInterviewAnswer,
} from "../lib/interviewEvaluator";
import { DEFAULT_STUDENT_PROFILE } from "../types/profile";

describe("interviewEvaluator strict honesty checks", () => {
  it("flags 'i dont know next question', 'skip', and gibberish as non-answers", () => {
    expect(assessAnswerSubstance("i dont know next question").isNonAnswer).toBe(true);
    expect(assessAnswerSubstance("skip").isNonAnswer).toBe(true);
    expect(assessAnswerSubstance("idk").isNonAnswer).toBe(true);
    expect(assessAnswerSubstance("asdf asdf asdf asdf").isNonAnswer).toBe(true);
  });

  it("allows real technical explanations through screening", () => {
    const res = assessAnswerSubstance(
      "We separated the ML inference worker to isolate memory pressure and added Redis caching to reduce p99 latency below 20ms."
    );
    expect(res.isNonAnswer).toBe(false);
  });

  it("scores 'i dont know next question' at 0/100 with zero strengths in Project Defense", async () => {
    const res = await evaluateProjectDefenseAnswer({
      questionId: "def-1",
      category: "Architecture",
      question: "Why did you choose microservices instead of a monolith?",
      context: "Evaluates trade-offs and latency.",
      keyConcepts: ["service boundary", "network latency"],
      referenceAnswer: "Model defense answer.",
      candidateAnswer: "i dont know next question",
      profile: DEFAULT_STUDENT_PROFILE,
    });
    expect(res.score).toBe(0);
    expect(res.strengths).toEqual([]);
    expect(res.isNonAnswer).toBe(true);
    expect(res.modelAnswer).toBe("Model defense answer.");
  });

  it("scores 'i dont know next question' at 0% across all axes in Mock Interview", async () => {
    const res = await evaluateMockInterviewAnswer({
      questionId: "rzp-1",
      company: "Razorpay",
      role: "Full Stack Engineer",
      roundType: "Technical & Algorithms",
      difficulty: "Hard",
      question: "How do you prevent double-charging on webhook retries?",
      contextHint: "Focus on idempotency keys.",
      keyConcepts: ["Idempotency Key"],
      idealKeywords: ["idempotency", "redis lock"],
      benchmarkAnswer: "Use idempotency keys.",
      candidateAnswer: "i dont know next question",
      durationSeconds: 12,
      profile: DEFAULT_STUDENT_PROFILE,
    });
    expect(res.overallScore).toBe(0);
    expect(res.technicalPrecision).toBe(0);
    expect(res.communicationScore).toBe(0);
    expect(res.problemSolvingScore).toBe(0);
    expect(res.matchedKeywords).toEqual([]);
    expect(res.isNonAnswer).toBe(true);
  });
});
