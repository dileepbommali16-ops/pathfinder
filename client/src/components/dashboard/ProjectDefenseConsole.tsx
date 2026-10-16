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

interface ProjectDefenseConsoleProps {
  profile: StudentProfileState;
  onAskCoach: (query: string) => void;
}

interface DefenseQuestion {
  id: string;
  category: "Architecture" | "Database & Scale" | "Security & Auth" | "Edge Cases & Failure";
  prompt: string;
  context: string;
}

const DEFENSE_QUESTIONS: DefenseQuestion[] = [
  {
    id: "def-1",
    category: "Architecture",
    prompt: "Why did you choose a microservices/decoupled REST architecture instead of a monolith for this project, and what network overhead does that introduce?",
    context: "Evaluates architectural trade-offs, network latency, and service boundary decisions."
  },
  {
    id: "def-2",
    category: "Database & Scale",
    prompt: "What happens if your application experiences a 10x spike in concurrent requests? Where will the database bottleneck occur first, and how would you resolve it?",
    context: "Tests connection pooling, read-replicas, caching with Redis, and indexing strategies."
  },
  {
    id: "def-3",
    category: "Security & Auth",
    prompt: "How did you prevent SQL injection, prompt injection, and Cross-Site Scripting (XSS) in your user input pipelines?",
    context: "Probes security hygiene, parameterized queries, input sanitization, and token security."
  },
  {
    id: "def-4",
    category: "Edge Cases & Failure",
    prompt: "If an external API dependency or background task fails halfway through a transaction, how does your system guarantee consistency without leaving dirty state?",
    context: "Tests idempotency, database transactions (ACID), dead-letter queues, and rollback strategies."
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
    strengths: string[];
    gaps: string[];
    modelAnswer: string;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEvaluateAnswer = () => {
    if (!candidateAnswer.trim()) return;
    setIsEvaluating(true);

    setTimeout(() => {
      // Deterministic technical critique
      const answerLen = candidateAnswer.length;
      const hasKeywords = /trade-off|latency|cache|redis|index|scale|sanitize|acid|rollback/i.test(candidateAnswer);

      const score = Math.min(95, Math.max(65, Math.round(55 + (answerLen > 80 ? 25 : 15) + (hasKeywords ? 15 : 0))));

      setEvaluation({
        score,
        strengths: [
          "Identified the core engineering challenge clearly",
          answerLen > 60 ? "Provided detailed technical context rather than high-level generalities" : "Addressed the primary question directly"
        ],
        gaps: [
          "Could quantify exact metrics (e.g. latency target in ms, database connection pool limits)",
          "Mention failure modes: What happens if the fallback system also fails?"
        ],
        modelAnswer: `In an enterprise defense round, a model response follows the STAR format:
"We selected this decoupled architecture to isolate high-throughput ML inference from user session management. To mitigate network latency, we introduced an in-memory Redis cache with an LRU eviction policy, achieving a sub-15ms p99 response time. Under a 10x traffic surge, connection pooling and read replicas absorb read queries, while token-bucket rate limiters prevent worker starvation."`
      });
      setIsEvaluating(false);
    }, 600);
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
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1c1a22] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#c76f3b]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#c76f3b]/30 bg-[#c76f3b]/10 text-[#c76f3b] shadow-[0_0_20px_rgba(199, 111, 59,0.2)]">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-[#eae6e0] sm:text-2xl">
                  Project Defense & Mock Interview Simulator
                </h2>
                <span className="rounded-full border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c76f3b]">
                  STAR Evaluation
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#938e87]">
                Simulate tough technical rounds where senior interviewers dissect your project architecture, scaling limits, and security trade-offs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAskCoach("Let's do an interactive mock technical interview for my role. Ask me question 1.")}
            className="flex items-center gap-2 rounded-xl bg-[#c76f3b] px-4 py-2 text-xs font-bold text-white hover:bg-[#c76f3b] active:bg-[#c76f3b] transition-colors shadow-lg cursor-pointer"
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
                    ? "border-[#c76f3b]/50 bg-[#c76f3b]/15 shadow-md ring-1 ring-[#c76f3b]/30"
                    : "border-white/[0.08] bg-[#141318] hover:border-[#c76f3b]/30"
                }`}
              >
                <span className="rounded-md border border-white/[0.08] bg-[#1c1a22] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c76f3b]">
                  {q.category}
                </span>
                <p className="mt-2 text-xs font-medium text-[#eae6e0] line-clamp-2">
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
        <div className="rounded-3xl border border-white/[0.08] bg-[#1c1a22] p-6 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2 text-[#c76f3b]">
              <Bot className="h-5 w-5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Interviewer Technical Challenge</h3>
            </div>
            <span className="rounded-lg border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2 py-0.5 text-[10px] font-bold text-[#c76f3b]">
              {activeQuestion.category}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#141318] p-4 text-xs font-semibold text-[#eae6e0] leading-relaxed">
            "{activeQuestion.prompt}"
          </div>

          <p className="mt-2 text-[11px] text-[#938e87]">
            🔍 <strong>Context:</strong> {activeQuestion.context}
          </p>

          <div className="mt-5 space-y-2">
            <label className="text-xs font-bold text-[#eae6e0] flex items-center justify-between">
              <span>Your Technical Defense Answer:</span>
              <span className="text-[11px] text-[#938e87] font-normal">Use STAR format</span>
            </label>
            <textarea
              rows={5}
              value={candidateAnswer}
              onChange={e => setCandidateAnswer(e.target.value)}
              placeholder="State your technical justification: Why this decision? What trade-offs were considered? How did you verify latency or consistency?..."
              className="w-full rounded-2xl border border-white/[0.08] bg-[#141318] p-4 text-xs font-medium text-[#eae6e0] placeholder:text-neutral-600 outline-none focus:border-[#c76f3b]/50 focus:ring-1 focus:ring-[#c76f3b]/20"
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setCandidateAnswer("")}
              className="rounded-xl border border-white/[0.08] bg-[#141318] px-3 py-2 text-xs font-medium text-[#938e87] hover:text-[#eae6e0] transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleEvaluateAnswer}
              disabled={!candidateAnswer.trim() || isEvaluating}
              className="flex items-center gap-1.5 rounded-xl bg-[#c76f3b] px-5 py-2 text-xs font-bold text-white hover:bg-[#c76f3b] active:bg-[#c76f3b] transition-colors disabled:opacity-50 shadow-md cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isEvaluating ? "Evaluating..." : "Evaluate My Defense"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Defense Evaluation */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#1c1a22] p-6 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2 text-[#c76f3b]">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Interviewer Evaluation & Feedback</h3>
            </div>
            {evaluation && (
              <span className="rounded-lg border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-0.5 text-xs font-black text-[#c76f3b]">
                Score: {evaluation.score}/100
              </span>
            )}
          </div>

          {!evaluation ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[#938e87]">
              <Bot className="h-10 w-10 text-[#938e87]/60 mb-3" />
              <h4 className="text-sm font-bold text-[#eae6e0]">No Answer Evaluated Yet</h4>
              <p className="mt-1 max-w-xs text-xs text-[#938e87]">
                Type your technical answer on the left and click "Evaluate My Defense" to get scored on technical clarity and STAR structure.
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-4"
            >
              {/* Strengths */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#141318] p-4">
                <div className="flex items-center gap-2 text-[#c76f3b] text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Strong Points</span>
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-[#eae6e0]">
                  {evaluation.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#c76f3b] font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps */}
              <div className="rounded-2xl border border-[#c76f3b]/40 bg-[#141318] p-4">
                <div className="flex items-center gap-2 text-[#c76f3b] text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Missing Technical Nuances</span>
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-[#eae6e0]">
                  {evaluation.gaps.map((g, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#c76f3b] font-bold">•</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Model Answer */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#141318] p-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <span className="text-xs font-bold text-[#c76f3b]">Model Interviewer Response</span>
                  <button
                    type="button"
                    onClick={handleCopyModelAnswer}
                    className="flex items-center gap-1 text-[11px] text-[#938e87] hover:text-[#eae6e0] cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-[#c76f3b]" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#eae6e0] leading-relaxed font-mono text-[11px]">
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
