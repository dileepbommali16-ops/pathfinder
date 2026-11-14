import { API_BASE, fetchWithTimeout } from "@/lib/apiClient";
import { StudentProfileState } from "@/types/profile";

export interface DefenseEvalInput {
  questionId: string;
  category: string;
  question: string;
  context: string;
  keyConcepts: string[];
  referenceAnswer: string;
  candidateAnswer: string;
  profile: StudentProfileState;
}

export interface DefenseEvalOutput {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  modelAnswer: string;
  evaluationSource: string;
  isNonAnswer: boolean;
}

export interface InterviewEvalInput {
  questionId: string;
  company: string;
  role: string;
  roundType: string;
  difficulty: string;
  question: string;
  contextHint: string;
  keyConcepts: string[];
  idealKeywords: string[];
  benchmarkAnswer: string;
  candidateAnswer: string;
  durationSeconds: number;
  profile: StudentProfileState;
}

export interface InterviewEvalOutput {
  overallScore: number;
  technicalPrecision: number;
  communicationScore: number;
  problemSolvingScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  coachVerdict: string;
  modelCritique: string;
  evaluationSource: string;
  isNonAnswer: boolean;
}

const NON_ANSWER_PATTERNS = [
  /\bi\s*don['’]?t\s*know\b/i,
  /\bdon['’]?t\s*know\b/i,
  /\bi\s*do\s*not\s*know\b/i,
  /\bno\s*idea\b/i,
  /\bidk\b/i,
  /\bskip\b/i,
  /\bnext\s*question\b/i,
  /\bpass\b/i,
  /\bnothing\b/i,
  /\bnot\s*sure\b/i,
  /\bcan['’]?t\s*answer\b/i,
  /\bwhat\s*is\s*the\s*answer\b/i,
  /\btell\s*me\s*the\s*answer\b/i,
];

function clampScore(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Detects abstentions ("i dont know", "skip", "next question") or non-substantive text
 * so they score 0 instead of receiving inflated rubric floors.
 */
export function assessAnswerSubstance(answer: string): {
  isNonAnswer: boolean;
  reason?: string;
} {
  const cleaned = (answer || "").replace(/\s+/g, " ").trim();
  const low = cleaned.toLowerCase();
  if (!cleaned) {
    return { isNonAnswer: true, reason: "No answer was submitted." };
  }

  const words = low.match(/[a-z0-9]+/g) || [];
  for (const rx of NON_ANSWER_PATTERNS) {
    if (rx.test(low) && words.length <= 14) {
      return {
        isNonAnswer: true,
        reason: `You explicitly passed or stated you did not know ("${cleaned.slice(0, 80)}").`,
      };
    }
  }

  const tokens = low.match(/[a-z0-9]{2,}/g) || [];
  const uniqueTokens = new Set(tokens);
  if (tokens.length < 4 || uniqueTokens.size < 3) {
    return {
      isNonAnswer: true,
      reason: "Response is too brief or lacks technical explanation to evaluate.",
    };
  }

  if (tokens.length >= 4 && uniqueTokens.size <= 2 && cleaned.length > 12) {
    return {
      isNonAnswer: true,
      reason: "Response appears repetitive or non-substantive.",
    };
  }

  return { isNonAnswer: false };
}

function matchExpectedKeywords(
  answer: string,
  expectedKeywords: string[]
): { matched: string[]; missing: string[] } {
  const lowAnswer = (answer || "").toLowerCase();
  const answerWords = lowAnswer.match(/[a-z0-9]+/g) || [];
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of expectedKeywords) {
    const cleanKw = (kw || "").trim();
    if (!cleanKw) continue;
    const lowKw = cleanKw.toLowerCase();
    const kwTokens = (lowKw.match(/[a-z0-9]+/g) || []).filter((t) => t.length >= 3);
    const direct = lowAnswer.includes(lowKw);
    const partial =
      kwTokens.length > 0 &&
      kwTokens.every((kt) =>
        answerWords.some((aw) => aw.startsWith(kt.slice(0, Math.min(5, kt.length))) || kt.includes(aw))
      );

    if (direct || partial) {
      matched.push(cleanKw);
    } else {
      missing.push(cleanKw);
    }
  }
  return { matched, missing };
}

function extractJsonObject(raw: string): Record<string, any> | null {
  let cleaned = (raw || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function serializeProfileForEval(profile: StudentProfileState) {
  return {
    full_name: profile.fullName || "Candidate",
    branch: profile.branch || "CSE",
    cgpa: profile.cgpa ?? 7.5,
    skills: profile.technicalSkills || profile.skills || [],
    projects_count: profile.projectsCount ?? 0,
    target_role: profile.targetRole || "Software Engineer",
    target_tier: profile.targetTier || "Tier-1 Product",
  };
}

function evaluateDefenseOfflineStrict(input: DefenseEvalInput): DefenseEvalOutput {
  const clean = input.candidateAnswer.trim();
  const concepts = input.keyConcepts.length
    ? input.keyConcepts
    : (input.context.match(/[A-Za-z][A-Za-z0-9-]{3,}/g) || []).slice(0, 6);
  const { matched, missing } = matchExpectedKeywords(clean, concepts);
  const wordCount = (clean.match(/[a-zA-Z0-9]+/g) || []).length;

  const conceptRatio = matched.length / Math.max(1, concepts.length);
  const hasReasoning = /\b(because|therefore|trade-?off|latency|overhead|avoid|prevent|guarantee|scale|throughput|bottleneck)\b/i.test(
    clean
  );
  const hasMetrics = /\b(\d+\s*(?:ms|s|x|%|req|rps|qps|mb|gb))\b/i.test(clean);

  let rawScore =
    conceptRatio * 58 +
    Math.min(22, wordCount * 0.4) +
    (hasReasoning ? 12 : 0) +
    (hasMetrics ? 8 : 0);
  if (matched.length === 0 && wordCount < 18) {
    rawScore = Math.min(rawScore, 18);
  }
  const score = clampScore(rawScore);

  const strengths: string[] = [];
  if (matched.length > 0) {
    strengths.push(`Addressed relevant technical concepts: ${matched.slice(0, 4).join(", ")}.`);
  }
  if (hasReasoning && wordCount >= 15) {
    strengths.push("Included cause-and-effect architectural reasoning or trade-off analysis.");
  }
  if (hasMetrics) {
    strengths.push("Quantified scale targets, limits, or latency thresholds.");
  }

  const gaps: string[] = [];
  if (missing.length > 0) {
    gaps.push(`Missed key concepts expected for ${input.category}: ${missing.slice(0, 4).join(", ")}.`);
  }
  if (!hasReasoning) {
    gaps.push("Explain WHY you chose this design and what trade-offs or overhead it introduces.");
  }
  if (!hasMetrics) {
    gaps.push("Add concrete operational numbers (e.g., latency ms, pool limits, retry caps, or failure behavior).");
  }

  const verdict =
    score >= 75
      ? "Solid defense covering core architectural mechanisms and trade-offs."
      : score >= 45
      ? "Partial defense — shows basic familiarity but misses deeper mechanisms or failure modes."
      : "Weak or incomplete defense. Core engineering concepts required by this question were not explained.";

  return {
    score,
    verdict,
    strengths,
    gaps,
    modelAnswer: input.referenceAnswer,
    evaluationSource: "Strict Offline Rubric (Live AI unreachable)",
    isNonAnswer: false,
  };
}

function evaluateInterviewOfflineStrict(input: InterviewEvalInput): InterviewEvalOutput {
  const clean = input.candidateAnswer.trim();
  const keywords = input.idealKeywords.length ? input.idealKeywords : input.keyConcepts;
  const { matched, missing } = matchExpectedKeywords(clean, keywords);
  const wordCount = (clean.match(/[a-zA-Z0-9]+/g) || []).length;

  const kwRatio = matched.length / Math.max(1, keywords.length);
  const depthRatio = Math.min(1, wordCount / 55);
  const hasStructure = /\b(first|then|finally|because|however|trade-?off|ensure|prevent)\b/i.test(clean);

  let techScore = clampScore(kwRatio * 75 + depthRatio * 15 + (hasStructure ? 10 : 0));
  if (matched.length === 0) {
    techScore = Math.min(techScore, 22);
  }
  const commScore = clampScore(depthRatio * 55 + (hasStructure ? 25 : 8) + kwRatio * 20);
  const probScore = clampScore(kwRatio * 65 + depthRatio * 20 + (hasStructure ? 15 : 0));
  const overall = clampScore(techScore * 0.45 + commScore * 0.25 + probScore * 0.3);

  const coachVerdict =
    overall >= 80
      ? "Strong technical depth addressing key primitives and structured execution steps."
      : overall >= 50
      ? "Partial technical coverage — address the missing core primitives and edge cases below."
      : "Insufficient technical depth for hiring bar. Most expected system/algorithm mechanisms were missing.";

  const modelCritique = `Matched ${matched.length}/${Math.max(1, keywords.length)} expected concepts across ${wordCount} words. ${
    missing.length > 0 ? `Focus next on: ${missing.slice(0, 4).join(", ")}. ` : ""
  }${input.contextHint}`;

  return {
    overallScore: overall,
    technicalPrecision: techScore,
    communicationScore: commScore,
    problemSolvingScore: probScore,
    matchedKeywords: matched,
    missingKeywords: missing,
    coachVerdict,
    modelCritique: modelCritique.trim(),
    evaluationSource: "Strict Offline Rubric (Live AI unreachable)",
    isNonAnswer: false,
  };
}

/**
 * Evaluates a Project Defense response via live AI backend with strict honesty and zero score inflation.
 */
export async function evaluateProjectDefenseAnswer(input: DefenseEvalInput): Promise<DefenseEvalOutput> {
  const screening = assessAnswerSubstance(input.candidateAnswer);
  if (screening.isNonAnswer) {
    return {
      score: 0,
      verdict: screening.reason || "No technical defense was provided.",
      strengths: [],
      gaps: [
        screening.reason || "You did not attempt a technical explanation.",
        `Required topics for ${input.category}: ${input.keyConcepts.join(", ") || input.context}.`,
        "Study the Model Interviewer Response below and try explaining it in your own words.",
      ],
      modelAnswer: input.referenceAnswer,
      evaluationSource: "Honest Screening",
      isNonAnswer: true,
    };
  }

  // 1. Primary Dedicated AI Evaluation Endpoint
  try {
    const resp = await fetchWithTimeout(
      `${API_BASE}/api/ai/evaluate-defense`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: input.questionId,
          category: input.category,
          question: input.question,
          context: input.context,
          key_concepts: input.keyConcepts,
          reference_answer: input.referenceAnswer,
          candidate_answer: input.candidateAnswer,
          profile: serializeProfileForEval(input.profile),
        }),
      },
      18000
    );

    if (resp.ok) {
      const data = await resp.json();
      if (typeof data?.score === "number") {
        return {
          score: clampScore(data.score),
          verdict: data.verdict || "",
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          gaps: Array.isArray(data.gaps) ? data.gaps : [],
          modelAnswer: data.model_answer || input.referenceAnswer,
          evaluationSource: data.evaluation_source || "Gemini AI",
          isNonAnswer: Boolean(data.is_non_answer),
        };
      }
    }
  } catch {
    // Fall through to /api/chat live LLM backup
  }

  // 2. Fallback to existing live /api/chat Gemini endpoint (handles staggered deploys)
  try {
    const prompt = [
      "STRICT INTERVIEW EVALUATION TASK. Return ONLY raw JSON (no markdown, no explanation outside JSON).",
      `Category: ${input.category}`,
      `Question: ${input.question}`,
      `Expected Concepts: ${input.keyConcepts.join(", ")}`,
      `Candidate Answer: """${input.candidateAnswer.slice(0, 1200)}"""`,
      'JSON keys required: {"score": int 0..100, "verdict": string, "strengths": string[], "gaps": string[], "model_answer": string}. Be strict: do NOT invent fake strengths if missing.',
    ].join("\n");

    const chatResp = await fetchWithTimeout(
      `${API_BASE}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          profile: serializeProfileForEval(input.profile),
          active_tab: "defense",
        }),
      },
      15000
    );

    if (chatResp.ok) {
      const chatData = await chatResp.json();
      if (chatData?.meta?.status !== "error" && typeof chatData?.reply === "string") {
        const parsed = extractJsonObject(chatData.reply);
        if (parsed && typeof parsed.score === "number") {
          return {
            score: clampScore(parsed.score),
            verdict: String(parsed.verdict || ""),
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
            gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : [],
            modelAnswer: String(parsed.model_answer || input.referenceAnswer),
            evaluationSource: chatData.source || "Live AI",
            isNonAnswer: false,
          };
        }
      }
    }
  } catch {
    // Fall through to strict offline rubric
  }

  return evaluateDefenseOfflineStrict(input);
}

/**
 * Evaluates a Mock Interview response via live AI backend with strict 0-100 multi-axis grading.
 */
export async function evaluateMockInterviewAnswer(input: InterviewEvalInput): Promise<InterviewEvalOutput> {
  const expectedKeywords = input.idealKeywords.length ? input.idealKeywords : input.keyConcepts;
  const screening = assessAnswerSubstance(input.candidateAnswer);
  if (screening.isNonAnswer) {
    return {
      overallScore: 0,
      technicalPrecision: 0,
      communicationScore: 0,
      problemSolvingScore: 0,
      matchedKeywords: [],
      missingKeywords: expectedKeywords,
      coachVerdict: screening.reason || "No technical interview answer was provided.",
      modelCritique: `You passed or submitted a non-answer. Review these required concepts (${expectedKeywords.join(
        ", "
      )}) and compare with the benchmark approach: ${input.benchmarkAnswer}`,
      evaluationSource: "Honest Screening",
      isNonAnswer: true,
    };
  }

  // 1. Primary Dedicated AI Evaluation Endpoint
  try {
    const resp = await fetchWithTimeout(
      `${API_BASE}/api/ai/evaluate-interview`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: input.questionId,
          company: input.company,
          role: input.role,
          round_type: input.roundType,
          difficulty: input.difficulty,
          question: input.question,
          context_hint: input.contextHint,
          key_concepts: input.keyConcepts,
          ideal_keywords: input.idealKeywords,
          benchmark_answer: input.benchmarkAnswer,
          candidate_answer: input.candidateAnswer,
          duration_seconds: input.durationSeconds,
          profile: serializeProfileForEval(input.profile),
        }),
      },
      18000
    );

    if (resp.ok) {
      const data = await resp.json();
      if (typeof data?.overall_score === "number") {
        return {
          overallScore: clampScore(data.overall_score),
          technicalPrecision: clampScore(data.technical_precision),
          communicationScore: clampScore(data.communication_score),
          problemSolvingScore: clampScore(data.problem_solving_score),
          matchedKeywords: Array.isArray(data.matched_keywords) ? data.matched_keywords : [],
          missingKeywords: Array.isArray(data.missing_keywords) ? data.missing_keywords : [],
          coachVerdict: data.coach_verdict || "",
          modelCritique: data.model_critique || input.contextHint,
          evaluationSource: data.evaluation_source || "Gemini AI",
          isNonAnswer: Boolean(data.is_non_answer),
        };
      }
    }
  } catch {
    // Fall through to /api/chat live LLM backup
  }

  // 2. Fallback to existing live /api/chat Gemini endpoint
  try {
    const prompt = [
      "STRICT MOCK INTERVIEW GRADING TASK. Return ONLY raw JSON (no markdown).",
      `Company: ${input.company} | Round: ${input.roundType}`,
      `Question: ${input.question}`,
      `Expected Keywords: ${expectedKeywords.join(", ")}`,
      `Candidate Answer: """${input.candidateAnswer.slice(0, 1200)}"""`,
      'JSON keys required: {"overall_score": int 0..100, "technical_precision": int, "communication_score": int, "problem_solving_score": int, "matched_keywords": string[], "missing_keywords": string[], "coach_verdict": string, "model_critique": string}. Do NOT inflate weak answers.',
    ].join("\n");

    const chatResp = await fetchWithTimeout(
      `${API_BASE}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          profile: serializeProfileForEval(input.profile),
          active_tab: "mockinterview",
        }),
      },
      15000
    );

    if (chatResp.ok) {
      const chatData = await chatResp.json();
      if (chatData?.meta?.status !== "error" && typeof chatData?.reply === "string") {
        const parsed = extractJsonObject(chatData.reply);
        if (parsed && typeof parsed.overall_score === "number") {
          return {
            overallScore: clampScore(parsed.overall_score),
            technicalPrecision: clampScore(parsed.technical_precision ?? parsed.overall_score),
            communicationScore: clampScore(parsed.communication_score ?? parsed.overall_score),
            problemSolvingScore: clampScore(parsed.problem_solving_score ?? parsed.overall_score),
            matchedKeywords: Array.isArray(parsed.matched_keywords) ? parsed.matched_keywords.map(String) : [],
            missingKeywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords.map(String) : expectedKeywords,
            coachVerdict: String(parsed.coach_verdict || ""),
            modelCritique: String(parsed.model_critique || input.contextHint),
            evaluationSource: chatData.source || "Live AI",
            isNonAnswer: false,
          };
        }
      }
    }
  } catch {
    // Fall through to strict offline rubric
  }

  return evaluateInterviewOfflineStrict(input);
}
