import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Mic,
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  Code2,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";
import { StudentProfileState } from "./ProfileEvaluator";
import { evaluateProjectDefenseAnswer } from "@/lib/interviewEvaluator";

interface ProjectDefenseConsoleProps {
  profile: StudentProfileState;
  onAskCoach: (query: string) => void;
}

interface DefenseQuestion {
  id: string;
  category: "Architecture" | "Database & Scale" | "Security & Auth" | "Edge Cases & Failure";
  prompt: string;
  context: string;
  keyConcepts: string[];
  referenceAnswer: string;
}

const DEFENSE_QUESTIONS: DefenseQuestion[] = [
  {
    id: "def-1",
    category: "Architecture",
    prompt: "Why did you choose a microservices/decoupled REST architecture instead of a monolith for this project, and what network overhead does that introduce?",
    context: "Evaluates architectural trade-offs, network latency, and service boundary decisions.",
    keyConcepts: ["service boundary", "independent scaling", "network latency", "serialization", "circuit breaker", "deployment isolation"],
    referenceAnswer:
      'In STAR format: "We decoupled high-throughput AI inference and analytics workers from the core web/session API so each could scale independently without blocking request threads. That introduces HTTP/JSON serialization hops (~8-15ms internal network overhead) and partial failure risks, which we mitigated with connection pooling, bounded timeouts, and circuit breakers around downstream dependencies."'
  },
  {
    id: "def-2",
    category: "Database & Scale",
    prompt: "What happens if your application experiences a 10x spike in concurrent requests? Where will the database bottleneck occur first, and how would you resolve it?",
    context: "Tests connection pooling, read-replicas, caching with Redis, and indexing strategies.",
    keyConcepts: ["connection pool", "read replica", "redis cache", "database index", "lock contention", "rate limiting"],
    referenceAnswer:
      'In STAR format: "The first bottleneck is database connection exhaustion and slow full-table read queries competing with write locks. To absorb a 10x spike, we place PgBouncer/connection pooling in front of Postgres, cache hot read endpoints in Redis with short TTL + invalidation, route analytics/read queries to read replicas, and verify composite B-tree indexes eliminate sequential scans under EXPLAIN ANALYZE."'
  },
  {
    id: "def-3",
    category: "Security & Auth",
    prompt: "How did you prevent SQL injection, prompt injection, and Cross-Site Scripting (XSS) in your user input pipelines?",
    context: "Probes security hygiene, parameterized queries, input sanitization, and token security.",
    keyConcepts: ["parameterized queries", "prepared statements", "input validation", "output encoding", "csp", "prompt isolation"],
    referenceAnswer:
      'In STAR format: "For SQL injection we strictly use parameterized queries/ORM bindings and schema validation via Pydantic—never string concatenation. For XSS we rely on React JSX contextual escaping, strict Content-Security-Policy headers, and HttpOnly SameSite cookies for tokens. For LLM prompt injection, untrusted user text is isolated inside structured user messages with length limits, stripped control markers, and output validation rather than trusting model prose to trigger privileged actions."'
  },
  {
    id: "def-4",
    category: "Edge Cases & Failure",
    prompt: "If an external API dependency or background task fails halfway through a transaction, how does your system guarantee consistency without leaving dirty state?",
    context: "Tests idempotency, database transactions (ACID), dead-letter queues, and rollback strategies.",
    keyConcepts: ["acid transaction", "idempotency key", "outbox pattern", "dead letter queue", "exponential backoff", "rollback"],
    referenceAnswer:
      'In STAR format: "We keep external network calls outside open database locks and persist state transitions atomically using ACID transactions plus an idempotency key and transactional outbox table. If the background worker or third-party API fails mid-flight, the database rolls back cleanly, idempotent retries with exponential backoff re-drive the event without duplicate side effects, and exhausted messages land in a Dead-Letter Queue (DLQ) for alerted replay."'
  }
];

export const ProjectDefenseConsole: React.FC<ProjectDefenseConsoleProps> = ({
  profile,
  onAskCoach,
}) => {
  const [activeQuestion, setActiveQuestion] = useState<DefenseQuestion>(DEFENSE_QUESTIONS[0]);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<{
    score: number;
    verdict: string;
    strengths: string[];
    gaps: string[];
    modelAnswer: string;
    evaluationSource: string;
    isNonAnswer: boolean;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEvaluateAnswer = async () => {
    if (!candidateAnswer.trim() || isEvaluating) return;
    setIsEvaluating(true);
    try {
      const result = await evaluateProjectDefenseAnswer({
        questionId: activeQuestion.id,
        category: activeQuestion.category,
        question: activeQuestion.prompt,
        context: activeQuestion.context,
        keyConcepts: activeQuestion.keyConcepts,
        referenceAnswer: activeQuestion.referenceAnswer,
        candidateAnswer,
        profile,
      });
      setEvaluation({
        score: result.score,
        verdict: result.verdict,
        strengths: result.strengths,
        gaps: result.gaps,
        modelAnswer: result.modelAnswer,
        evaluationSource: result.evaluationSource,
        isNonAnswer: result.isNonAnswer,
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCopyModelAnswer = () => {
    if (evaluation?.modelAnswer) {
      navigator.clipboard.writeText(evaluation.modelAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner — Strictly #000000 and #060608 */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#060608] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-[#000000] text-[#f8fafc] shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-[#f8fafc] sm:text-2xl">
                  Project Defense & Mock Interview Simulator
                </h2>
                <span className="rounded-full border border-white/15 bg-[#000000] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f8fafc]">
                  STAR Evaluation
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#94a3b8]">
                Simulate tough technical rounds where senior interviewers dissect your project architecture, scaling limits, and security trade-offs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAskCoach("Let's do an interactive mock technical interview for my role. Ask me question 1.")}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-[#000000] px-4 py-2 text-xs font-bold text-white hover:bg-[#060608] hover:border-white/40 transition-colors shadow-lg cursor-pointer"
          >
            <Mic className="h-4 w-4" />
            <span>Launch Live AI Voice/Chat Interview</span>
          </button>
        </div>

        {/* Defense Question Selector */}
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {DEFENSE_QUESTIONS.map(q => {
            const isSelected = q.id === activeQuestion.id;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setActiveQuestion(q);
                  setEvaluation(null);
                  setCandidateAnswer("");
                }}
                className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-white/35 bg-[#000000] shadow-md ring-1 ring-white/20"
                    : "border-white/10 bg-[#000000] hover:border-white/25 hover:bg-[#060608]"
                }`}
              >
                <span className="rounded-md border border-white/15 bg-[#060608] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f8fafc]">
                  {q.category}
                </span>
                <p className="mt-2 text-xs font-medium text-[#f8fafc] line-clamp-2">
                  {q.prompt}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Defense Question & Response Arena */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Interrogation Arena */}
        <div className="rounded-3xl border border-white/10 bg-[#060608] p-6 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-[#f8fafc]">
              <Bot className="h-5 w-5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Interviewer Technical Challenge</h3>
            </div>
            <span className="rounded-lg border border-white/15 bg-[#000000] px-2 py-0.5 text-[10px] font-bold text-[#f8fafc]">
              {activeQuestion.category}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#000000] p-4 text-xs font-semibold text-[#f8fafc] leading-relaxed">
            "{activeQuestion.prompt}"
          </div>

          <p className="mt-2 text-[11px] text-[#94a3b8]">
            🔍 <strong>Context:</strong> {activeQuestion.context}
          </p>

          <div className="mt-5 space-y-2">
            <label className="text-xs font-bold text-[#f8fafc] flex items-center justify-between">
              <span>Your Technical Defense Answer:</span>
              <span className="text-[11px] text-[#94a3b8] font-normal">Use STAR format</span>
            </label>
            <textarea
              rows={5}
              value={candidateAnswer}
              onChange={e => setCandidateAnswer(e.target.value)}
              placeholder="State your technical justification: Why this decision? What trade-offs were considered? How did you verify latency or consistency?..."
              className="w-full rounded-2xl border border-white/10 bg-[#000000] p-4 text-xs font-medium text-[#f8fafc] placeholder:text-neutral-600 outline-none focus:border-white/30 focus:ring-1 focus:ring-white/15"
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setCandidateAnswer("")}
              className="rounded-xl border border-white/10 bg-[#000000] px-3 py-2 text-xs font-medium text-[#94a3b8] hover:text-[#f8fafc] transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleEvaluateAnswer}
              disabled={!candidateAnswer.trim() || isEvaluating}
              className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-[#000000] px-5 py-2 text-xs font-bold text-white hover:bg-[#060608] hover:border-white/45 transition-colors disabled:opacity-50 shadow-md cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isEvaluating ? "Evaluating..." : "Evaluate My Defense"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Defense Evaluation */}
        <div className="rounded-3xl border border-white/10 bg-[#060608] p-6 backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-[#f8fafc]">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Interviewer Evaluation & Feedback</h3>
            </div>
            {evaluation && (
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-white/10 bg-[#000000] px-2 py-0.5 text-[10px] font-medium text-[#94a3b8]">
                  {evaluation.evaluationSource}
                </span>
                <span
                  className={`rounded-lg border px-2.5 py-0.5 text-xs font-black ${
                    evaluation.score >= 70
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : evaluation.score >= 40
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  Score: {evaluation.score}/100
                </span>
              </div>
            )}
          </div>

          {!evaluation ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[#94a3b8]">
              <Bot className="h-10 w-10 text-[#94a3b8]/60 mb-3" />
              <h4 className="text-sm font-bold text-[#f8fafc]">No Answer Evaluated Yet</h4>
              <p className="mt-1 max-w-xs text-xs text-[#94a3b8]">
                Type your technical answer on the left and click "Evaluate My Defense" to get graded by live AI without inflated scores.
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-4"
            >
              {evaluation.verdict && (
                <div className="rounded-2xl border border-white/10 bg-[#000000] px-4 py-3 text-xs text-[#f8fafc]">
                  <span className="font-bold text-[#94a3b8] uppercase tracking-wider text-[10px] block mb-1">
                    Interviewer Verdict
                  </span>
                  {evaluation.verdict}
                </div>
              )}

              {/* Strengths */}
              <div className="rounded-2xl border border-white/10 bg-[#000000] p-4">
                <div className="flex items-center gap-2 text-[#f8fafc] text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Strong Points</span>
                </div>
                {evaluation.strengths.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-xs text-[#f8fafc]">
                    {evaluation.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#f8fafc] font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[#94a3b8]">
                    No verified technical points demonstrated in this response yet.
                  </p>
                )}
              </div>

              {/* Gaps */}
              <div className="rounded-2xl border border-white/15 bg-[#000000] p-4">
                <div className="flex items-center gap-2 text-[#f8fafc] text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Missing Technical Nuances</span>
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-[#f8fafc]">
                  {evaluation.gaps.map((g, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#f8fafc] font-bold">•</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Model Answer */}
              <div className="rounded-2xl border border-white/10 bg-[#000000] p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-[#f8fafc]">Model Interviewer Response</span>
                  <button
                    type="button"
                    onClick={handleCopyModelAnswer}
                    className="flex items-center gap-1 text-[11px] text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-[#f8fafc]" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#f8fafc] leading-relaxed font-mono text-[11px]">
                  {evaluation.modelAnswer}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
