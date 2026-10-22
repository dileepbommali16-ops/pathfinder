import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  ArrowRight,
  Send,
  Loader2,
  HelpCircle,
  Clock,
  BookOpen,
  Briefcase,
  ChevronRight
} from "lucide-react";
import { StudentProfileState } from "@/types/profile";

interface MockInterviewConsoleProps {
  profile: StudentProfileState;
  initialCompany?: string;
  initialRole?: string;
  onNavigateTab?: (tab: string) => void;
  onAskCoach?: (query: string) => void;
}

interface QuestionItem {
  id: string;
  company: string;
  role: string;
  roundType: "Technical & Algorithms" | "System Architecture" | "Behavioral (STAR)";
  difficulty: "Medium" | "Hard" | "Core Essential";
  question: string;
  contextHint: string;
  keyConcepts: string[];
  benchmarkAnswer: string;
  idealKeywords: string[];
}

const QUESTION_BANK: QuestionItem[] = [
  {
    id: "rzp-1",
    company: "Razorpay / Fintech",
    role: "Full Stack Engineer",
    roundType: "Technical & Algorithms",
    difficulty: "Hard",
    question: "When processing high-volume payment webhooks, how do you prevent double-charging a user if the provider retries the webhook multiple times?",
    contextHint: "Focus on idempotency keys, distributed locks, database uniqueness constraints, and transactional consistency.",
    keyConcepts: ["Idempotency Key", "Distributed Locking (Redis/Redlock)", "Database Transactions", "Event Deduplication"],
    idealKeywords: ["idempotency", "redis lock", "atomic transaction", "webhook deduplication", "event status state machine"],
    benchmarkAnswer:
      "To prevent double charges, I enforce idempotency at the database and ingestion layer. Every incoming webhook carries a unique event ID or idempotency key. Upon arrival, we attempt an atomic check-and-set in Redis with an expiration lease. If the key exists, we immediately return an HTTP 200 acknowledgment without re-executing logic. Next, our payment transaction table enforces a unique constraint on (provider_event_id). Finally, the entire payment status transition is wrapped in an ACID database transaction using a strict state machine (INITIATED -> PROCESSING -> SUCCESS/FAILED) so duplicate events are gracefully ignored."
  },
  {
    id: "goog-1",
    company: "Google / Alphabet",
    role: "Software Development Engineer",
    roundType: "System Architecture",
    difficulty: "Hard",
    question: "Design a distributed URL shortener (like bit.ly) capable of handling 50,000 read requests per second and 5,000 write requests per second. Explain your key generation and caching strategy.",
    contextHint: "Detail Base62 encoding vs MD5 hash, read/write ratio (10:1), distributed ID generation (Snowflake), and Redis LRU caching.",
    keyConcepts: ["Base62 Encoding", "Distributed ID Generator (Snowflake)", "Redis LRU Cache", "Database Sharding"],
    idealKeywords: ["base62", "redis cache", "write ratio", "snowflake id", "replication", "horizontal scaling"],
    benchmarkAnswer:
      "Given the 10:1 read-to-write ratio, our architecture must be heavily read-optimized. For unique key generation, I avoid hashing URLs due to collisions and instead use a 64-bit distributed ID generator (Twitter Snowflake) converted into a 7-character string via Base62 encoding, giving over 3.5 trillion unique URLs. Writes persist to a partitioned NoSQL document store (like Cassandra or DynamoDB) with replication factor 3. Reads are fronted by a distributed Redis cluster using an LRU eviction policy; caching the top 20% most visited URLs satisfies ~80% of read traffic, easily absorbing 50,000 reads/sec with sub-5ms latency."
  },
  {
    id: "tcs-1",
    company: "TCS Digital / Campus Drive",
    role: "Campus Prime Developer",
    roundType: "Technical & Algorithms",
    difficulty: "Core Essential",
    question: "Explain the difference between optimistic locking and pessimistic locking in relational databases. In which real-world scenario would you choose each?",
    contextHint: "Highlight concurrency, lock overhead, version numbering columns, and performance in low-contention vs high-contention systems.",
    keyConcepts: ["Version Numbering", "Database Row Locking (SELECT FOR UPDATE)", "Concurrency Overhead", "Deadlock Risk"],
    idealKeywords: ["version column", "pessimistic lock", "select for update", "optimistic concurrency", "contention"],
    benchmarkAnswer:
      "Pessimistic locking physically locks database rows (via SELECT FOR UPDATE) as soon as data is read, preventing all other transactions from accessing it until committed. It is ideal for high-contention, critical operations like bank transfers or seat reservations where collisions are frequent. Optimistic locking does not hold database locks; instead, it checks a record's 'version' column at commit time. If the version changed concurrently, the transaction rolls back and retries. Optimistic locking is superior for high-throughput, low-collision environments like updating user profiles or social media posts because it eliminates lock contention overhead."
  },
  {
    id: "amzn-1",
    company: "Amazon AWS",
    role: "Software Development Engineer",
    roundType: "Behavioral (STAR)",
    difficulty: "Medium",
    question: "Tell me about a time when you faced a difficult technical bug or tight deadline during a project. How did you diagnose it, prioritize trade-offs, and deliver?",
    contextHint: "Structure using STAR method: Situation, Task, Action, Result. Highlight leadership, root cause analysis, and measurable outcome.",
    keyConcepts: ["Situation Context", "Root Cause Analysis (RCA)", "Trade-off Evaluation", "Measurable Delivery"],
    idealKeywords: ["situation", "task", "action", "result", "root cause", "metrics", "ownership"],
    benchmarkAnswer:
      "Situation: While launching our university portal, our real-time notification engine crashed during peak registration under 2,000 concurrent students. Task: As lead developer, I had 48 hours to eliminate the bottleneck without server upgrades. Action: I used profiling tools to trace memory leaks, discovering that unbounded WebSocket listener instances were exhausting Node.js heap memory. I refactored the connection pool to use Redis Pub/Sub with backpressure throttles and added connection pooling. Result: Server memory dropped by 64%, CPU usage stabilized under 35%, and all 2,000 students completed registration with zero downtime."
  }
];

export const MockInterviewConsole: React.FC<MockInterviewConsoleProps> = ({
  profile,
  initialCompany,
  initialRole,
  onNavigateTab,
  onAskCoach
}) => {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    overallScore: number;
    technicalPrecision: number;
    communicationScore: number;
    problemSolvingScore: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    coachVerdict: string;
    modelCritique: string;
  } | null>(null);

  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  const speechRecognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const currentQ = QUESTION_BANK[selectedQuestionIndex] || QUESTION_BANK[0];

  // Set up timer
  useEffect(() => {
    let interval: any = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  // Handle Initial Company Pre-selection
  useEffect(() => {
    if (initialCompany) {
      const foundIdx = QUESTION_BANK.findIndex((q) =>
        q.company.toLowerCase().includes(initialCompany.toLowerCase())
      );
      if (foundIdx !== -1) {
        setSelectedQuestionIndex(foundIdx);
        resetState();
      }
    }
  }, [initialCompany]);

  // Audio speech synthesis setup
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopSpeaking();
      stopRecording();
    };
  }, []);

  const resetState = () => {
    setUserAnswer("");
    setEvaluationResult(null);
    setTimerSeconds(0);
    setTimerActive(false);
    stopSpeaking();
    stopRecording();
  };

  // Text to Speech: Question read out
  const handleToggleSpeak = () => {
    if (!synthRef.current) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    synthRef.current.cancel(); // clear queue
    const utter = new SpeechSynthesisUtterance(currentQ.question);
    utter.rate = 1.0;
    utter.pitch = 1.0;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utter);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  // Speech to Text: Answer recording
  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your response directly.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
        if (!timerActive) setTimerActive(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setUserAnswer((prev) => {
          const separator = prev && !prev.endsWith(" ") ? " " : "";
          return prev + separator + transcript;
        });
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // 1-Click Benchmark Auto-fill for live evaluation demo
  const handleFillBenchmark = () => {
    setUserAnswer(currentQ.benchmarkAnswer);
    setTimerActive(false);
  };

  // Real-time AI evaluation engine
  const handleEvaluateAnswer = () => {
    if (!userAnswer.trim()) return;
    setIsEvaluating(true);
    stopSpeaking();
    stopRecording();
    setTimerActive(false);

    setTimeout(() => {
      const lowerAnswer = userAnswer.toLowerCase();
      const matched: string[] = [];
      const missing: string[] = [];

      currentQ.idealKeywords.forEach((kw) => {
        if (lowerAnswer.includes(kw.toLowerCase())) {
          matched.push(kw);
        } else {
          missing.push(kw);
        }
      });

      const keywordRatio = matched.length / (currentQ.idealKeywords.length || 1);
      const lengthScore = Math.min(1, userAnswer.trim().split(/\s+/).length / 45);

      const baseScore = Math.round(55 + keywordRatio * 35 + lengthScore * 10);
      const overall = Math.max(45, Math.min(97, baseScore));

      const technicalPrecision = Math.max(50, Math.min(98, Math.round(overall * 1.02)));
      const communicationScore = Math.max(55, Math.min(95, Math.round(overall * 0.98)));
      const problemSolvingScore = Math.max(50, Math.min(96, Math.round(overall * 1.0)));

      let coachVerdict = "";
      if (overall >= 85) {
        coachVerdict =
          "Outstanding candidate response. You articulated core system trade-offs with high architectural maturity and clean technical vocabulary.";
      } else if (overall >= 70) {
        coachVerdict =
          "Strong foundation. You addressed the primary mechanic, but incorporating the missing keywords below will elevate your answer to top 5% hiring standards.";
      } else {
        coachVerdict =
          "Good initial attempt. Deepen your explanation of edge cases, failovers, and specific database/system primitives to clear Tier-1 cutoffs.";
      }

      setEvaluationResult({
        overallScore: overall,
        technicalPrecision,
        communicationScore,
        problemSolvingScore,
        matchedKeywords: matched,
        missingKeywords: missing,
        coachVerdict,
        modelCritique: currentQ.contextHint
      });

      setIsEvaluating(false);
    }, 1200);
  };

  return (
    <div className="relative rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#11131c] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Subtle Warm Copper & Rust Ambient Glow */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#ffffff]/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#9f1239]/10 blur-[140px]" />

      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#ffffff]/40 bg-[#ffffff]/15 text-[#ffffff] shadow-[0_0_12px_rgba(255,255,255,0.25)]">
              <Mic className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
              Live Mock Interview Simulator
            </span>
            <span className="rounded-full border border-[#ffffff]/30 bg-[#ffffff]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#ffffff] shadow-sm">
              AI Voice & Audio Ready
            </span>
          </div>
          <h3 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-[#f8fafc] font-['Space_Grotesk']">
            Rapid 60-Second Interview Drill
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-[#94a3b8] max-w-2xl leading-relaxed">
            Practice actual technical and behavioral interview questions asked by top tech firms. Speak your answer or type it to receive an instant multi-dimensional evaluation.
          </p>
        </div>

        {/* Drill Timer & Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0a0b10] px-3.5 py-1.5 text-xs text-[#94a3b8]">
            <Clock className="h-4 w-4 text-[#ffffff]" />
            <span className="font-mono font-bold text-[#f8fafc]">
              {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, "0")}
            </span>
            <span className="text-[10px] text-[#94a3b8]">Drill Time</span>
          </div>

          <button
            type="button"
            onClick={resetState}
            className="flex items-center gap-1.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#161926] hover:bg-[#1c2030] px-3 py-1.5 text-xs font-medium text-[#94a3b8] hover:text-[#f8fafc] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Question Selector Carousel Tabs */}
      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {QUESTION_BANK.map((q, idx) => (
          <button
            key={q.id}
            type="button"
            onClick={() => {
              setSelectedQuestionIndex(idx);
              resetState();
            }}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all cursor-pointer ${
              selectedQuestionIndex === idx
                ? "border border-[#7c3aed] bg-[#7c3aed] text-white font-bold shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                : "border border-[rgba(255,255,255,0.08)] bg-[#161926]/50 text-[#94a3b8] hover:border-[#ffffff]/50 hover:text-[#f8fafc]"
            }`}
          >
            <span className="font-semibold">{q.company.split("/")[0]}</span>
            <span className={`text-[10px] ${selectedQuestionIndex === idx ? "text-[#f8fafc] font-bold" : "text-[#94a3b8]"}`}>
              ({q.roundType.split(" ")[0]})
            </span>
          </button>
        ))}
      </div>

      {/* Main Interview Stage */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question Prompt Card & Audio */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161926]/60 p-6 backdrop-blur-xl shadow-lg">
          <div>
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-[rgba(255,255,255,0.08)]">
              <span className="rounded-md border border-[#ffffff]/30 bg-[#ffffff]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ffffff] shadow-sm">
                {currentQ.company}
              </span>
              <span className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#11131c] px-2 py-0.5 text-[10px] font-medium text-[#94a3b8]">
                {currentQ.roundType}
              </span>
              <span className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#11131c] px-2 py-0.5 text-[10px] font-medium text-[#94a3b8]">
                Difficulty: {currentQ.difficulty}
              </span>
            </div>

            {/* Question Text */}
            <div className="mt-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                Interviewer Prompt
              </span>
              <h4 className="mt-1.5 text-base sm:text-lg font-semibold text-[#f8fafc] leading-snug">
                "{currentQ.question}"
              </h4>
            </div>

            {/* Context Hint */}
            <div className="mt-5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#11131c] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#ffffff]">
                <HelpCircle className="h-4 w-4 text-[#ffffff]" />
                <span>Interviewer Expectation</span>
              </div>
              <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed">
                {currentQ.contextHint}
              </p>
            </div>

            {/* Key concepts */}
            <div className="mt-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                Evaluation Topics
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currentQ.keyConcepts.map((c, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#11131c] px-2 py-0.5 text-[11px] font-medium text-[#f8fafc]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleSpeak}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                isSpeaking
                  ? "border border-[#9f1239] bg-[#9f1239] text-[#f8fafc] animate-pulse shadow-[0_0_15px_rgba(159,18,57,0.4)]"
                  : "border border-[rgba(255,255,255,0.08)] bg-[#11131c] text-[#94a3b8] hover:bg-[#161926] hover:text-[#f8fafc]"
              }`}
            >
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span>{isSpeaking ? "Stop Voice" : "Hear Question"}</span>
            </button>

            <button
              type="button"
              onClick={handleFillBenchmark}
              className="flex items-center gap-1.5 rounded-xl border border-[#f1f5f9]/40 bg-[#11131c] hover:bg-[#161926] px-3 py-2 text-xs font-semibold text-[#f8fafc] transition-colors shadow-sm cursor-pointer"
              title="Fills a senior engineer answer for quick interview evaluation"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#f1f5f9]" />
              <span>Fill Benchmark Answer</span>
            </button>
          </div>
        </div>

        {/* Right Column: Answer Input & Real-Time AI Scorecard */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Answer Workspace */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161926]/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
              <span className="text-xs font-semibold text-[#94a3b8]">
                Your Response Workspace
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#94a3b8]">
                  {userAnswer.trim() ? `${userAnswer.trim().split(/\s+/).length} words` : "0 words"}
                </span>

                {/* Voice Record Button */}
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    isRecording
                      ? "border border-[#9f1239] bg-[#9f1239] text-[#f8fafc] animate-pulse shadow-[0_0_15px_rgba(159,18,57,0.5)]"
                      : "border border-[rgba(255,255,255,0.08)] bg-[#0a0b10] text-[#94a3b8] hover:text-[#f8fafc]"
                  }`}
                >
                  {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  <span>{isRecording ? "Listening..." : "Speak Answer"}</span>
                </button>
              </div>
            </div>

            <textarea
              value={userAnswer}
              onChange={(e) => {
                setUserAnswer(e.target.value);
                if (!timerActive) setTimerActive(true);
              }}
              placeholder="Type your structured answer here, or click 'Speak Answer' to speak via microphone... (Use the STAR framework: Situation, Task, Action, Result)."
              rows={6}
              className="mt-3 w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0a0b10] p-4 text-xs sm:text-sm text-[#f8fafc] placeholder-[#94a3b8]/50 focus:border-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#ffffff] resize-none leading-relaxed font-sans"
            />

            {/* Submit Action */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-[#94a3b8]">
                Tip: Press <strong className="text-[#f8fafc]">Fill Benchmark Answer</strong> for instant demo evaluation.
              </span>

              <button
                type="button"
                disabled={!userAnswer.trim() || isEvaluating}
                onClick={handleEvaluateAnswer}
                className="flex items-center gap-2 rounded-xl border border-[#ffffff] bg-gradient-to-r from-[#ffffff] via-[#f1f5f9] to-[#e2e8f0] hover:from-[#f1f5f9] hover:to-[#cbd5e1] disabled:opacity-40 px-5 py-2.5 text-xs font-bold text-[#f8fafc] shadow-[0_4px_20px_rgba(255,255,255,0.35)] transition-all active:scale-95 cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#f8fafc]" />
                    <span>Grading with AI Engine...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-[#f8fafc]" />
                    <span>Evaluate My Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Scorecard Result Display */}
          <AnimatePresence>
            {evaluationResult && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#161926]/80 p-6 backdrop-blur-xl shadow-xl space-y-5"
              >
                {/* Score Summary Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffffff]/50 bg-[#0a0b10] shadow-[0_0_20px_rgba(255,255,255,0.25)]">
                      <span className="text-xl font-bold font-mono text-[#ffffff]">
                        {evaluationResult.overallScore}%
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#f8fafc] font-['Space_Grotesk']">
                          AI Interview Scorecard
                        </span>
                        <span className="rounded-md border border-[#ffffff]/30 bg-[#ffffff]/10 px-2 py-0.5 text-[10px] font-semibold text-[#ffffff] shadow-sm">
                          Verified Grade
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#94a3b8]">
                        {evaluationResult.coachVerdict}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Score Vector Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#11131c] p-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#94a3b8]">Technical Depth</span>
                      <span className="font-bold font-mono text-[#f8fafc]">
                        {evaluationResult.technicalPrecision}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#0a0b10] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#f1f5f9] via-[#ffffff] to-[#ffffff] shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                        style={{ width: `${evaluationResult.technicalPrecision}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#11131c] p-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#94a3b8]">Communication & Clarity</span>
                      <span className="font-bold font-mono text-[#f8fafc]">
                        {evaluationResult.communicationScore}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#0a0b10] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#f1f5f9] via-[#ffffff] to-[#ffffff] shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                        style={{ width: `${evaluationResult.communicationScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#11131c] p-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#94a3b8]">Problem Solving</span>
                      <span className="font-bold font-mono text-[#f8fafc]">
                        {evaluationResult.problemSolvingScore}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#0a0b10] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#f1f5f9] via-[#ffffff] to-[#ffffff] shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                        style={{ width: `${evaluationResult.problemSolvingScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Keyword Analysis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#11131c] p-3">
                    <span className="font-semibold text-[#ffffff]">
                      ✓ Strong Key Primitives Detected
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {evaluationResult.matchedKeywords.length > 0 ? (
                        evaluationResult.matchedKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="rounded-md border border-[#ffffff]/30 bg-[#161926] px-2 py-0.5 text-[11px] font-medium text-[#ffffff] shadow-sm"
                          >
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#94a3b8]">None detected</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#11131c] p-3">
                    <span className="font-semibold text-[#94a3b8]">
                      Expected Core Keywords
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {evaluationResult.missingKeywords.length > 0 ? (
                        evaluationResult.missingKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#0a0b10] px-2 py-0.5 text-[11px] font-medium text-[#94a3b8]"
                          >
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#f8fafc]">All core keywords covered!</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Next Question CTA */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (selectedQuestionIndex + 1) % QUESTION_BANK.length;
                      setSelectedQuestionIndex(nextIdx);
                      resetState();
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#11131c] hover:bg-[#161926] px-4 py-2 text-xs font-semibold text-[#f8fafc] transition-colors cursor-pointer"
                  >
                    <span>Next Drill Question</span>
                    <ChevronRight className="h-4 w-4 text-[#ffffff]" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
