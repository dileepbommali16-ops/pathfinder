import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StudentProfileState } from "@/types/profile";
import { audioEngine, speaker } from "@/agent/audioIO";
import { onVoiceStateChange } from "@/audio/voiceManager";
import { API_BASE } from "@/lib/apiClient";
import { toast } from "sonner";
import { evaluateMockInterviewAnswer } from "@/lib/interviewEvaluator";

interface MockInterviewConsoleProps {
  profile: StudentProfileState;
  initialCompany?: string;
  initialRole?: string;
  initialMode?: "company" | "defense";
  onNavigateTab?: (tab: string) => void;
  onAskCoach?: (query: string) => void;
}

interface QuestionItem {
  id: string;
  track: "company" | "defense";
  company: string;
  role: string;
  roundType:
  | "Technical & Algorithms"
  | "System Architecture"
  | "Behavioral (STAR)"
  | "Project Architecture"
  | "Database & Scale"
  | "Security & Auth"
  | "Failure & Recovery";
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
    track: "company",
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
    track: "company",
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
    track: "company",
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
    track: "company",
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
  },
  {
    id: "def-1",
    track: "defense",
    company: "Project Viva · Architecture",
    role: "Project Owner",
    roundType: "Project Architecture",
    difficulty: "Hard",
    question: "Why did you choose a microservices/decoupled REST architecture instead of a monolith for this project, and what network overhead does that introduce?",
    contextHint: "Evaluates service boundary decisions, serialization overhead (~ms), deployment isolation, and resilience via circuit breakers.",
    keyConcepts: ["Service Boundary", "Independent Scaling", "Network Latency", "Circuit Breaker"],
    idealKeywords: ["service boundary", "independent scaling", "network latency", "serialization", "circuit breaker"],
    benchmarkAnswer:
      "In STAR format: We decoupled high-throughput AI inference workers from the core web/session API so heavy model CPU load never blocks login or dashboard requests. This adds ~8-15ms HTTP/JSON serialization hops and partial failure modes across network boundaries, which we mitigated using persistent connection pooling, bounded request timeouts, and circuit breakers around downstream AI dependencies."
  },
  {
    id: "def-2",
    track: "defense",
    company: "Project Viva · Scale",
    role: "Project Owner",
    roundType: "Database & Scale",
    difficulty: "Hard",
    question: "What happens if your application experiences a 10x spike in concurrent requests? Where will the database bottleneck occur first, and how would you resolve it?",
    contextHint: "Tests connection pooling, read replicas, Redis caching with TTL, and composite database indexing.",
    keyConcepts: ["Connection Pooling", "Read Replicas", "Redis Cache", "B-Tree Indexing"],
    idealKeywords: ["connection pool", "read replica", "redis cache", "database index", "rate limiting"],
    benchmarkAnswer:
      "Under a 10x traffic surge, the primary database connection pool saturates first while full-table reads contend with write locks. To resolve this, we place PgBouncer connection pooling in front of Postgres, cache hot read endpoints in Redis with short TTL invalidation, route heavy analytical queries to read replicas, and add composite B-tree indexes verified via EXPLAIN ANALYZE alongside API rate limiting."
  },
  {
    id: "def-3",
    track: "defense",
    company: "Project Viva · Security",
    role: "Project Owner",
    roundType: "Security & Auth",
    difficulty: "Core Essential",
    question: "How did you prevent SQL injection, prompt injection, and Cross-Site Scripting (XSS) in your user input pipelines?",
    contextHint: "Probes parameterized queries, Pydantic schema validation, XSS output escaping, CSP headers, and LLM prompt boundaries.",
    keyConcepts: ["Parameterized Queries", "Schema Validation", "CSP & Output Escaping", "Prompt Isolation"],
    idealKeywords: ["parameterized queries", "prepared statements", "input validation", "xss", "prompt isolation"],
    benchmarkAnswer:
      "For SQL injection we strictly enforce parameterized queries and Pydantic schema validation rather than string interpolation. For XSS we rely on React contextual escaping, Content-Security-Policy headers, and HttpOnly SameSite cookies. For LLM prompt injection, untrusted user input is length-bounded, sanitized of control markers, and strictly separated from privileged backend tools."
  },
  {
    id: "def-4",
    track: "defense",
    company: "Project Viva · Reliability",
    role: "Project Owner",
    roundType: "Failure & Recovery",
    difficulty: "Hard",
    question: "If an external API dependency or background task fails halfway through a transaction, how does your system guarantee consistency without leaving dirty state?",
    contextHint: "Tests ACID database rollbacks, idempotency keys, transactional outbox pattern, retries, and dead-letter queues.",
    keyConcepts: ["ACID Transaction", "Idempotency Key", "Dead-Letter Queue", "Exponential Backoff"],
    idealKeywords: ["acid transaction", "idempotency key", "outbox pattern", "dead letter queue", "rollback"],
    benchmarkAnswer:
      "We keep external API calls outside open database locks and persist state transitions atomically using ACID transactions plus an idempotency key and transactional outbox record. If a downstream job fails mid-flight, the database transaction rolls back cleanly, exponential backoff retries replay safely without duplicate side effects, and exhausted jobs move into a Dead-Letter Queue (DLQ) for inspection."
  }
];

export const MockInterviewConsole: React.FC<MockInterviewConsoleProps> = ({
  profile,
  initialCompany,
  initialRole,
  initialMode = "company",
  onNavigateTab,
  onAskCoach
}) => {
  const [selectedTrack, setSelectedTrack] = useState<"company" | "defense">(initialMode);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState<boolean>(false);
  const [showAgentAnswer, setShowAgentAnswer] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [copiedBenchmark, setCopiedBenchmark] = useState<boolean>(false);
  const speakGenRef = useRef<number>(0);
  const ttsCacheRef = useRef<Map<string, { pcm: string; rate: number }>>(new Map());
  const [evaluationResult, setEvaluationResult] = useState<{
    overallScore: number;
    technicalPrecision: number;
    communicationScore: number;
    problemSolvingScore: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    coachVerdict: string;
    modelCritique: string;
    evaluationSource: string;
  } | null>(null);

  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  const speechRecognitionRef = useRef<any>(null);

  const visibleQuestions = QUESTION_BANK.filter((q) => q.track === selectedTrack);
  const currentQ = visibleQuestions[selectedQuestionIndex] || visibleQuestions[0] || QUESTION_BANK[0];

  useEffect(() => {
    setSelectedTrack(initialMode);
    setSelectedQuestionIndex(0);
    setUserAnswer("");
    setShowAgentAnswer(false);
    setEvaluationResult(null);
  }, [initialMode]);

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

  // Handle Initial Company Pre-selection when in company track
  useEffect(() => {
    if (initialMode !== "company" || !initialCompany) return;
    const companyQuestions = QUESTION_BANK.filter((q) => q.track === "company");
    const foundIdx = companyQuestions.findIndex((q) =>
      q.company.toLowerCase().includes(initialCompany.toLowerCase())
    );
    if (foundIdx !== -1) {
      setSelectedTrack("company");
      setSelectedQuestionIndex(foundIdx);
      resetState();
    }
  }, [initialCompany, initialMode]);

  // Subscribe to WebAudio engine & fallback speaker state
  useEffect(() => {
    const syncSpeaking = () => {
      setIsSpeaking(audioEngine.isSpeaking());
    };
    const unsubEngine = audioEngine.onSpeakingStateChange(syncSpeaking);
    const unsubVoice = onVoiceStateChange((legacySpeaking) => {
      setIsSpeaking(legacySpeaking || audioEngine.isSpeaking());
    });
    return () => {
      unsubEngine();
      unsubVoice();
      stopSpeaking();
      stopRecording();
    };
  }, []);

  const resetState = () => {
    setUserAnswer("");
    setShowAgentAnswer(false);
    setEvaluationResult(null);
    setTimerSeconds(0);
    setTimerActive(false);
    stopSpeaking();
    stopRecording();
  };

  // Reveal Agent Model Answer & read concise walkthrough aloud via Gemini Puck TTS (isolated from webcam/vision)
  const handleSeeAgentAnswer = async () => {
    if (isSpeaking || isLoadingVoice) {
      stopSpeaking();
      return;
    }

    setShowAgentAnswer(true);
    const answerText = currentQ.benchmarkAnswer.trim();
    if (!answerText) return;

    audioEngine.unlockAudio();
    window.dispatchEvent(
      new CustomEvent("das-interviewer-prompt", {
        detail: {
          question: answerText,
          track: selectedTrack === "defense" ? "defense" : "interview",
        },
      })
    );
    const gen = ++speakGenRef.current;

    const cached = ttsCacheRef.current.get(answerText);
    if (cached) {
      setIsSpeaking(true);
      const ok = await audioEngine.playWholePcmBase64(
        cached.pcm,
        cached.rate,
        () => {
          if (speakGenRef.current === gen) setIsSpeaking(false);
        },
        answerText
      );
      if (!ok && speakGenRef.current === gen) {
        (window as any).dasSocket?.speakVerbatim?.(answerText);
      }
      return;
    }

    setIsLoadingVoice(true);
    const canUseSameOriginEdge =
      typeof window !== "undefined" &&
      Boolean(window.location?.hostname?.endsWith(".vercel.app"));
    const ttsUrls = [
      `${API_BASE}/api/voice/tts`,
      ...(canUseSameOriginEdge ? ["/api/edge-tts"] : []),
    ];
    for (const url of ttsUrls) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: answerText, voice: "Puck" }),
        });
        if (speakGenRef.current !== gen) return;
        if (resp.ok) {
          const data = await resp.json();
          if (data?.status === "ok" && data?.pcm_base64) {
            const rate = Number(data.sample_rate) || 24000;
            ttsCacheRef.current.set(answerText, { pcm: data.pcm_base64, rate });
            setIsLoadingVoice(false);
            setIsSpeaking(true);
            const played = await audioEngine.playWholePcmBase64(
              data.pcm_base64,
              rate,
              () => {
                if (speakGenRef.current === gen) setIsSpeaking(false);
              },
              answerText
            );
            if (played) return;
          }
        }
      } catch {
        // Try next strictly-Puck endpoint
      }
    }

    if (speakGenRef.current !== gen) return;
    setIsLoadingVoice(false);
    (window as any).dasSocket?.speakVerbatim?.(answerText);
  };

  const stopSpeaking = () => {
    speakGenRef.current += 1;
    setIsLoadingVoice(false);
    audioEngine.stopWholePcmPlayback();
    audioEngine.clearAudioQueue();
    speaker.stop();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch { }
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
      toast.error("Speech recognition is not supported in this browser. Please type your response directly.");
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
      } catch { }
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
  const handleEvaluateAnswer = async () => {
    if (!userAnswer.trim() || isEvaluating) return;
    setIsEvaluating(true);
    stopSpeaking();
    stopRecording();
    setTimerActive(false);

    try {
      const result = await evaluateMockInterviewAnswer({
        questionId: currentQ.id,
        company: currentQ.company,
        role: currentQ.role,
        roundType: currentQ.roundType,
        difficulty: currentQ.difficulty,
        question: currentQ.question,
        contextHint: currentQ.contextHint,
        keyConcepts: currentQ.keyConcepts,
        idealKeywords: currentQ.idealKeywords,
        benchmarkAnswer: currentQ.benchmarkAnswer,
        candidateAnswer: userAnswer,
        durationSeconds: timerSeconds,
        profile,
      });

      setEvaluationResult({
        overallScore: result.overallScore,
        technicalPrecision: result.technicalPrecision,
        communicationScore: result.communicationScore,
        problemSolvingScore: result.problemSolvingScore,
        matchedKeywords: result.matchedKeywords,
        missingKeywords: result.missingKeywords,
        coachVerdict: result.coachVerdict,
        modelCritique: result.modelCritique,
        evaluationSource: result.evaluationSource,
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="pf-titanium-card space-y-8 rounded-2xl p-8 sm:p-10">
      {/* Header bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 lg:flex-row lg:items-center">
        <div>
          <span className="inline-block rounded-md border border-white/[0.1] bg-[#141418] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA]">
            AI Voice &amp; Grading
          </span>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[#FAFAFA]">
            {selectedTrack === "defense"
              ? "Project Architecture & Viva Defense"
              : "Company Hiring Rounds & Technical Drill"}
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-[1.65] text-[#A1A1AA] sm:text-sm">
            Practice company technical rounds or defend your project architecture trade-offs. Speak
            or type your response for uninflated evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="pf-subpanel flex h-10 items-center gap-2.5 rounded-xl px-4 text-xs text-[#A1A1AA]">
            <span className="font-mono font-semibold text-[#FAFAFA] tabular-nums">
              {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, "0")}
            </span>
            <span className="font-mono text-[10px] text-[#8A8A92]">Drill Time</span>
          </div>

          <button
            type="button"
            onClick={resetState}
            className="pf-btn-secondary inline-flex h-10 items-center rounded-xl px-4 text-xs font-medium cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedTrack("company");
            setSelectedQuestionIndex(0);
            resetState();
          }}
          className={`h-10 rounded-xl border px-4.5 text-xs font-medium transition-colors cursor-pointer ${selectedTrack === "company"
            ? "border-[#FAFAFA] bg-[#FAFAFA] text-[#09090B]"
            : "pf-btn-secondary"
            }`}
        >
          Company Rounds (4)
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedTrack("defense");
            setSelectedQuestionIndex(0);
            resetState();
          }}
          className={`h-10 rounded-xl border px-4.5 text-xs font-medium transition-colors cursor-pointer ${selectedTrack === "defense"
            ? "border-[#FAFAFA] bg-[#FAFAFA] text-[#09090B]"
            : "pf-btn-secondary"
            }`}
        >
          Project Defense &amp; Viva (4)
        </button>
      </div>

      {/* Question Selector Carousel Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {visibleQuestions.map((q, idx) => (
          <button
            key={q.id}
            type="button"
            onClick={() => {
              setSelectedQuestionIndex(idx);
              resetState();
            }}
            className={`flex h-9 shrink-0 items-center gap-2 rounded-lg border px-4 text-xs font-medium transition-colors cursor-pointer ${selectedQuestionIndex === idx
              ? "border-white/[0.28] bg-[#18181F] text-[#FAFAFA]"
              : "border-white/[0.07] bg-[#0E0E12] text-[#A1A1AA] hover:border-white/[0.16] hover:text-[#FAFAFA]"
              }`}
          >
            <span>{selectedTrack === "defense" ? q.roundType : q.company.split("/")[0]}</span>
            <span className="font-mono text-[10px] text-[#8A8A92]">({q.difficulty})</span>
          </button>
        ))}
      </div>

      {/* Main Interview Stage */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left Column: Question Prompt Card */}
        <div className="pf-subpanel flex min-w-0 flex-col justify-between rounded-2xl p-6 sm:p-7 lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] pb-4">
              <span className="rounded-md border border-white/[0.1] bg-black/50 px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#FAFAFA]">
                {currentQ.company}
              </span>
              <span className="rounded-md border border-white/[0.07] bg-black/45 px-2.5 py-0.5 text-[10px] text-[#A1A1AA]">
                {currentQ.roundType}
              </span>
              <span className="rounded-md border border-white/[0.07] bg-black/45 px-2.5 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
                {currentQ.difficulty}
              </span>
            </div>

            <div className="mt-5">
              <span className="font-mono text-[10px] text-[#8A8A92]">Interviewer Prompt</span>
              <h4 className="mt-2 text-base font-semibold leading-snug text-[#FAFAFA] sm:text-lg">
                "{currentQ.question}"
              </h4>
            </div>

            <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/45 p-4.5">
              <span className="block text-xs font-medium text-[#FAFAFA]">
                Interviewer Expectation
              </span>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
                {currentQ.contextHint}
              </p>
            </div>

            <div className="mt-5">
              <span className="font-mono text-[10px] text-[#8A8A92]">Evaluation Topics</span>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {currentQ.keyConcepts.map((c, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-white/[0.08] bg-black/45 px-2.5 py-1 text-[11px] font-medium text-[#D4D4D8]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {showAgentAnswer && (
              <div
                data-agent-id="agent-model-answer-panel"
                className="mt-5 rounded-xl border border-white/[0.12] bg-black/50 p-4.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#FAFAFA]">
                    DAS Agent Model Answer
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAgentAnswer(false)}
                    className="text-[11px] font-medium text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#D4D4D8]">
                  {currentQ.benchmarkAnswer}
                </p>
              </div>
            )}
          </div>

          {/* Audio Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
            <button
              type="button"
              onClick={handleSeeAgentAnswer}
              data-agent-id="see-agent-answer-btn"
              className={`inline-flex h-10 items-center rounded-xl border px-4 text-xs font-medium transition-colors cursor-pointer ${isSpeaking || isLoadingVoice
                ? "border-white/[0.3] bg-[#1A1A22] text-[#FAFAFA]"
                : "pf-btn-secondary"
                }`}
            >
              {isLoadingVoice
                ? "Loading answer..."
                : isSpeaking
                  ? "Stop agent audio"
                  : "See answer from agent"}
            </button>

            <button
              type="button"
              onClick={handleFillBenchmark}
              className="pf-btn-secondary inline-flex h-10 items-center rounded-xl px-4 text-xs font-medium cursor-pointer"
              title="Fills a senior engineer answer for quick interview evaluation"
            >
              Fill benchmark answer
            </button>
          </div>
        </div>

        {/* Right Column: Clean Answer Workspace */}
        <div className="flex min-w-0 flex-col justify-between space-y-6 lg:col-span-7">
          <div className="pf-subpanel rounded-2xl p-6 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <span className="text-xs font-medium text-[#D4D4D8]">Your Response Workspace</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-[#8A8A92] tabular-nums">
                  {userAnswer.trim() ? `${userAnswer.trim().split(/\s+/).length} words` : "0 words"}
                </span>

                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer ${isRecording
                    ? "border-[#FAFAFA] bg-[#FAFAFA] text-[#09090B]"
                    : "pf-btn-secondary"
                    }`}
                >
                  {isRecording ? "Listening..." : "Speak answer"}
                </button>
              </div>
            </div>

            <textarea
              id="mock-interview-answer"
              name="mockInterviewAnswer"
              value={userAnswer}
              onChange={(e) => {
                setUserAnswer(e.target.value);
                if (!timerActive) setTimerActive(true);
              }}
              placeholder="Type your structured answer here, or click 'Speak answer' to speak via microphone... (Use the STAR framework: Situation, Task, Action, Result)."
              rows={7}
              className="pf-input mt-5 w-full resize-none rounded-xl p-4 text-xs leading-relaxed text-[#FAFAFA] placeholder-[#8A8A92] sm:text-sm"
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-[#8A8A92]">
                Tip: Use <strong className="font-medium text-[#D4D4D8]">Fill benchmark answer</strong>{" "}
                for instant demo evaluation.
              </span>

              <button
                type="button"
                disabled={!userAnswer.trim() || isEvaluating}
                onClick={handleEvaluateAnswer}
                className="pf-btn-primary inline-flex h-11 items-center rounded-xl px-6 text-xs font-medium active:scale-[0.98] disabled:opacity-45 cursor-pointer"
              >
                {isEvaluating ? "Grading response..." : "Evaluate answer"}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {evaluationResult && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5 rounded-xl border border-[#222226] bg-[#101014] p-6"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#27272A] bg-[#0B0B0E]">
                      <span className="font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
                        {evaluationResult.overallScore}%
                      </span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#FAFAFA]">
                          AI Interview Scorecard
                        </span>
                        <span className="rounded border border-[#27272A] bg-[#0B0B0E] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8]">
                          {evaluationResult.evaluationSource}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#A1A1AA]">
                        {evaluationResult.coachVerdict}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Score Vector Bars */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#1F1F23] bg-[#0B0B0E] p-3.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#A1A1AA]">Technical Depth</span>
                      <span className="font-mono font-semibold text-[#FAFAFA] tabular-nums">
                        {evaluationResult.technicalPrecision}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-[#18181B]">
                      <div
                        className="h-full bg-[#FAFAFA]"
                        style={{ width: `${evaluationResult.technicalPrecision}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#1F1F23] bg-[#0B0B0E] p-3.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#A1A1AA]">Communication</span>
                      <span className="font-mono font-semibold text-[#FAFAFA] tabular-nums">
                        {evaluationResult.communicationScore}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-[#18181B]">
                      <div
                        className="h-full bg-[#FAFAFA]"
                        style={{ width: `${evaluationResult.communicationScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#1F1F23] bg-[#0B0B0E] p-3.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#A1A1AA]">Problem Solving</span>
                      <span className="font-mono font-semibold text-[#FAFAFA] tabular-nums">
                        {evaluationResult.problemSolvingScore}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-[#18181B]">
                      <div
                        className="h-full bg-[#FAFAFA]"
                        style={{ width: `${evaluationResult.problemSolvingScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 text-xs sm:grid-cols-2">
                  <div className="rounded-lg border border-[#1F1F23] bg-[#0B0B0E] p-3.5">
                    <span className="font-medium text-[#FAFAFA]">Key Primitives Detected</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {evaluationResult.matchedKeywords.length > 0 ? (
                        evaluationResult.matchedKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="rounded border border-[#3F3F46] bg-[#141418] px-2 py-0.5 text-[11px] text-[#FAFAFA]"
                          >
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#8A8A92]">None detected</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#1F1F23] bg-[#0B0B0E] p-3.5">
                    <span className="font-medium text-[#A1A1AA]">Expected Core Keywords</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {evaluationResult.missingKeywords.length > 0 ? (
                        evaluationResult.missingKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="rounded border border-[#27272A] bg-[#09090B] px-2 py-0.5 text-[11px] text-[#A1A1AA]"
                          >
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#FAFAFA]">All core keywords covered</span>
                      )}
                    </div>
                  </div>
                </div>

                {evaluationResult.modelCritique && (
                  <div className="rounded-lg border border-[#1F1F23] bg-[#0B0B0E] p-4 text-xs">
                    <span className="mb-1 block font-medium text-[#FAFAFA]">
                      Interviewer Critique &amp; Guidance
                    </span>
                    <p className="leading-relaxed text-[#A1A1AA]">
                      {evaluationResult.modelCritique}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-[#1F1F23] bg-[#0B0B0E] p-4 text-xs">
                  <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2">
                    <span className="font-medium text-[#FAFAFA]">
                      Model Interviewer STAR Response
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentQ.benchmarkAnswer);
                        setCopiedBenchmark(true);
                        setTimeout(() => setCopiedBenchmark(false), 2000);
                      }}
                      className="text-[11px] font-medium text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
                    >
                      {copiedBenchmark ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-2.5 font-mono text-[11px] leading-relaxed text-[#A1A1AA]">
                    {currentQ.benchmarkAnswer}
                  </p>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (selectedQuestionIndex + 1) % visibleQuestions.length;
                      setSelectedQuestionIndex(nextIdx);
                      resetState();
                    }}
                    className="inline-flex h-9 items-center rounded-lg border border-[#27272A] bg-[#141418] px-4 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#1C1C22] cursor-pointer"
                  >
                    Next Drill Question
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
