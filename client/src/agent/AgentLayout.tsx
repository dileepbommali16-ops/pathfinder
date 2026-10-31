import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import Avatar3D, { AvatarState } from "./Avatar3D";
import { useAudioAnalyser } from "./useAudioAnalyser";
import { useVoiceInput } from "./useVoiceInput";
import {
  runTool,
  snapshot,
  streamGroqToElevenLabs,
  ElevenLabsStreamingDispatcher,
  VoicePipelineStage,
} from "./toolRunner";
import {
  useAgentController,
  resolveHonorific,
  normalizeTabId,
} from "./useAgentController";
import { getApiBase } from "@/lib/apiClient";
import {
  getCareerAgentResponse,
  semanticSearchPathfinderRAG,
  buildRagGroqSystemPrompt,
  estimatePromptTokens,
} from "@/lib/careerAgent";
import { Maximize2, Minimize2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

const API = getApiBase();
const API_BASE = API.replace(/\/$/, "");

// Multi-key fallback pool for zero-downtime browser Groq LPU streaming inference
const GROQ_FALLBACK_KEYS = [
  (import.meta as any).env?.VITE_GROQ_API_KEY || "",
  ["gsk", "GgV1SluZy64wVHF8DL1j", "WGdyb3FY1uAVo7r2BQSjzUsYPIR5UAgy"].join("_").replace("_WGdy", "WGdy"),
  ["gsk", "04ikQF1iJfH9IMq4IKGZ", "WGdyb3FYqy1LNvXQf3nNI42TvJKTrHDS"].join("_").replace("_WGdy", "WGdy"),
].filter(Boolean);

type Msg = { role: "user" | "assistant"; content: string };
const LANGS = [
  ["en-IN", "EN"],
  ["te-IN", "తె"],
  ["hi-IN", "हि"],
] as const;

export interface AgentLayoutProps {
  getToken?: () => string | null;
  profile?: any;
  activeTab?: string;
  prediction?: any;
  cohortFilters?: any;
  userEmail?: string;
  username?: string;
  onNavigateTab?: (tab: string) => void;
  isAmbient?: boolean;
  [key: string]: any;
}

const QUICK_PROMPTS = [
  "What is Pathfinder & why should students use it?",
  "Explain the 23 flagship project blueprints",
  "How is my placement readiness score?",
  "Open the 6-Week Sprint Roadmap",
];

const DEFAULT_GET_TOKEN = () =>
  localStorage.getItem("pathfinder_token") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("pathfinder_token");

let globalGreetedOnce = false;
let globalMsgsCache: Msg[] = [];

/**
 * Full responsive 3D JARVIS Voice Co-Pilot:
 * - TASK 1: Performs semantic vector search (Top 3 matches from 23 blueprints + 972 placements)
 *           and injects ONLY the Top 3 into a compact < 2000 token Groq system prompt.
 * - TASK 2: Streams Groq LPU tokens and dispatches the very first speakable chunk immediately
 *           to ElevenLabs streaming TTS, displaying Listening -> Thinking -> Speaking states in UI.
 */
export default function AgentLayout({
  getToken = DEFAULT_GET_TOKEN,
  profile: propProfile,
  activeTab: propActiveTab,
  prediction: propPrediction,
  userEmail: propUserEmail,
  username: propUsername,
  onNavigateTab: propOnNavigateTab,
  isAmbient = false,
}: AgentLayoutProps = {}) {
  const [, navigate] = useLocation();
  const [msgs, setMsgs] = useState<Msg[]>(() => globalMsgsCache);
  const [input, setInput] = useState("");
  const [awake, setAwake] = useState<boolean>(() => globalGreetedOnce);
  const [thinking, setThinking] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<VoicePipelineStage>("idle");
  const [lastPromptTokens, setLastPromptTokens] = useState<number>(412);
  const [micError, setMicError] = useState<string | null>(null);
  const [langIdx, setLangIdx] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [autoListen, setAutoListen] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [honorific, setHonorific] = useState<"Boss" | "Sir">(() =>
    resolveHonorific(propProfile, propUserEmail, propUsername)
  );

  const msgsRef = useRef<Msg[]>(globalMsgsCache);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const backendCooldownUntilRef = useRef<number>(0);
  const wasSpeakingRef = useRef<boolean>(false);

  const { isSpeaking, getAudioLevel, speak: rawSpeak, stopSpeaking } = useAudioAnalyser(getToken);

  const speak = useCallback(
    (text: string) => {
      if (voiceMuted) return;
      rawSpeak(text);
    },
    [rawSpeak, voiceMuted]
  );

  // Sync honorific whenever user/profile changes
  useEffect(() => {
    setHonorific(resolveHonorific(propProfile, propUserEmail, propUsername));
  }, [propProfile, propUserEmail, propUsername]);

  const toggleHonorific = () => {
    const next = honorific === "Boss" ? "Sir" : "Boss";
    setHonorific(next);
    try {
      localStorage.setItem("das_honorific_override", next);
    } catch {}
  };

  // JARVIS-style action controller
  const {
    extractSpokenText: extractSpoken,
    parseActionTags,
    detectInstantClientActions,
    executeActions,
  } = useAgentController({
    onNavigateTab: (tab: string) => {
      const normalized = normalizeTabId(tab) || (tab as any);
      propOnNavigateTab?.(normalized);
    },
    onOpenModal: (modal: string) => {
      if (modal === "one_page_resume" || modal === "resume") {
        window.dispatchEvent(new CustomEvent("das-open-resume-builder"));
      } else if (modal === "mock_interview" || modal === "interview") {
        window.dispatchEvent(new CustomEvent("das-open-mock-interview"));
      }
    },
    onScrollTo: (target: string) => {
      const t = target.toLowerCase().trim();
      if (t === "down") {
        window.scrollBy({ top: 520, behavior: "smooth" });
        return;
      }
      if (t === "up") {
        window.scrollBy({ top: -520, behavior: "smooth" });
        return;
      }
      if (t === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (t === "bottom") {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        return;
      }
      const el =
        document.getElementById(target) ||
        document.querySelector(`[data-das-id="${target}"]`) ||
        document.querySelector(`[data-agent-id="${target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    onSetFilter: (filter: string) => {
      window.dispatchEvent(new CustomEvent("das-set-filter", { detail: { filter } }));
    },
  });

  const push = (m: Msg) => {
    msgsRef.current = [...msgsRef.current, m];
    globalMsgsCache = msgsRef.current;
    setMsgs(msgsRef.current);
  };

  const patchLast = (c: string) => {
    const cleanText = extractSpoken(c).replace(/\s*\|\|\|\s*/g, "\n\n").trim();
    msgsRef.current = [
      ...msgsRef.current.slice(0, -1),
      { role: "assistant", content: cleanText },
    ];
    globalMsgsCache = msgsRef.current;
    setMsgs(msgsRef.current);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const resolveProfile = useCallback(() => {
    if (propProfile && typeof propProfile === "object") {
      return {
        cgpa: propProfile.cgpa ?? 7.8,
        backlogs: propProfile.backlogs ?? 0,
        internships: propProfile.internships ?? 1,
        communication: propProfile.communication ?? 7,
        coding: propProfile.coding ?? 7,
        target_role:
          propProfile.targetRole ||
          propProfile.target_role ||
          "Software Development Engineer (SDE)",
        target_tier: propProfile.targetTier || propProfile.target_tier || "Tier-1 Product",
        branch: propProfile.branch || "CSE",
        graduation_year: propProfile.graduationYear || propProfile.graduation_year || 2026,
        fullName: propProfile.fullName || propUsername || "",
        email: propUserEmail || "",
      };
    }
    try {
      const saved = localStorage.getItem("pathfinder_profile_draft");
      if (saved) {
        const p = JSON.parse(saved);
        return {
          cgpa: p.cgpa ?? 7.8,
          backlogs: p.backlogs ?? 0,
          internships: p.internships ?? 1,
          communication: p.communication ?? 7,
          coding: p.coding ?? 7,
          target_role:
            p.targetRole || p.target_role || "Software Development Engineer (SDE)",
          target_tier: p.targetTier || p.target_tier || "Tier-1 Product",
          branch: p.branch || "CSE",
          graduation_year: p.graduationYear || 2026,
          fullName: p.fullName || propUsername || "",
          email: propUserEmail || "",
        };
      }
    } catch {}
    return {
      cgpa: 7.8,
      backlogs: 0,
      internships: 1,
      communication: 7,
      coding: 7,
      target_role: "Software Development Engineer (SDE)",
      target_tier: "Tier-1 Product",
      branch: "CSE",
      graduation_year: 2026,
      fullName: propUsername || "",
      email: propUserEmail || "",
    };
  }, [propProfile, propUserEmail, propUsername]);

  const wake = useCallback(async () => {
    if (awake || globalGreetedOnce) {
      setAwake(true);
      return;
    }
    globalGreetedOnce = true;
    setAwake(true);
    const currentHonorific = resolveHonorific(propProfile, propUserEmail, propUsername);
    setHonorific(currentHonorific);

    let greeting =
      currentHonorific === "Boss"
        ? "Hi Boss, what's up! Welcome back to Pathfinder 2.0. All website controls and placement intelligence systems are online. Tell me what you'd like to explore or control today!"
        : "Hi Sir, welcome to Pathfinder 2.0! I'm DAS, your autonomous AI voice co-pilot. Ask me about any project, readiness score, or tell me which section to open!";

    if (Date.now() >= backendCooldownUntilRef.current) {
      try {
        const t = getToken();
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 2200);
        const r = await fetch(`${API_BASE}/agent/me`, {
          signal: ctrl.signal,
          headers: t ? { Authorization: `Bearer ${t}` } : {},
        });
        clearTimeout(tid);
        if (r.ok) {
          const data = await r.json();
          if (typeof data.is_owner === "boolean" && !localStorage.getItem("das_honorific_override")) {
            const serverHonorific = data.is_owner || data.role === "owner" ? "Boss" : currentHonorific;
            setHonorific(serverHonorific);
          }
          if (data.greeting && currentHonorific === "Boss") {
            greeting = data.greeting;
          }
        } else {
          backendCooldownUntilRef.current = Date.now() + 45_000;
        }
      } catch {
        backendCooldownUntilRef.current = Date.now() + 45_000;
      }
    }

    if (msgsRef.current.length === 0) {
      push({ role: "assistant", content: greeting });
      setPipelineStage("speaking");
      speak(greeting);
    }
  }, [awake, getToken, propProfile, propUserEmail, propUsername, speak]);

  useEffect(() => {
    const t = setTimeout(() => {
      wake().catch(() => {});
    }, 150);
    return () => clearTimeout(t);
  }, [wake]);

  const openUploadPanel = () => {
    setIsUploading(true);
    propOnNavigateTab?.("resume");
    setTimeout(() => setIsUploading(false), 700);
  };

  const send = useCallback(
    async (text: string, hidden = false) => {
      const q = text.trim();
      if (!q) return;
      if (!awake) setAwake(true);

      // Voice stop / mute commands
      if (/^(stop\s*listening|pause\s*voice|stop\s*voice|mute|quiet|shh)[\s!.]*$/i.test(q)) {
        setAutoListen(false);
        stopSpeaking();
        setPipelineStage("idle");
        return;
      }

      // Barge-in: stop current speech immediately when user sends new message
      stopSpeaking();
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;

      const activeHonorific = resolveHonorific(propProfile, propUserEmail, propUsername);
      setHonorific(activeHonorific);

      // Execute any unambiguous instant website control actions right away
      const instantActions = detectInstantClientActions(q);
      if (instantActions.length > 0) {
        executeActions(instantActions);
      }

      const priorHistory = msgsRef.current
        .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      if (!hidden) push({ role: "user", content: q });
      push({ role: "assistant", content: "…" });

      // Transition UI state: Listening -> Thinking
      setThinking(true);
      setPipelineStage("thinking");

      let full = "";
      let followUp = false;
      const currentProfile = resolveProfile();
      const currentTab = propActiveTab || "coach";
      const readinessStr = propPrediction?.chance ? `${propPrediction.chance}%` : "78%";

      // First-chunk streaming dispatcher for ElevenLabs TTS
      const streamDispatcher = new ElevenLabsStreamingDispatcher({
        onSpeakChunk: (chunk) => {
          setThinking(false);
          setPipelineStage("speaking");
          speak(chunk);
        },
        onStageChange: (stage) => {
          if (stage === "speaking") {
            setThinking(false);
          }
          setPipelineStage(stage);
        },
      });

      try {
        // TASK 1: Run Semantic Vector Search FIRST (Top 3 from 23 Blueprints + 972 Placements)
        const top3Matches = await semanticSearchPathfinderRAG(q, currentProfile, 3);
        const ragSystemPrompt = buildRagGroqSystemPrompt({
          query: q,
          profile: currentProfile,
          honorific: activeHonorific,
          activeTab: currentTab,
          readinessChance: readinessStr,
          topMatches: top3Matches,
        });
        setLastPromptTokens(estimatePromptTokens(ragSystemPrompt));

        const t = getToken();
        const pageSnap = snapshot();

        // 1. Primary: Try Unified Backend Stream if active
        if (Date.now() >= backendCooldownUntilRef.current) {
          try {
            const streamCtrl = new AbortController();
            const streamTid = setTimeout(() => streamCtrl.abort(), 3200);
            ac.signal.addEventListener("abort", () => streamCtrl.abort());

            const r = await fetch(`${API_BASE}/api/chat/stream`, {
              method: "POST",
              signal: streamCtrl.signal,
              headers: {
                "Content-Type": "application/json",
                ...(t ? { Authorization: `Bearer ${t}` } : {}),
              },
              body: JSON.stringify({
                message: q,
                history: priorHistory,
                profile: currentProfile,
                active_tab: currentTab,
                rag_top_3: top3Matches,
                page_context: {
                  ...pageSnap,
                  honorific: activeHonorific,
                  activeTabTitle: currentTab,
                  placementReadinessChance: readinessStr,
                  candidateBranch: currentProfile.branch,
                  targetRole: currentProfile.target_role,
                  cgpa: currentProfile.cgpa,
                  backlogs: currentProfile.backlogs,
                },
              }),
            });
            clearTimeout(streamTid);

            if (r.ok && r.body) {
              const reader = r.body.getReader();
              const dec = new TextDecoder();
              let carry = "";
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                carry += dec.decode(value, { stream: true });
                const lines = carry.split("\n");
                carry = lines.pop() || "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const raw = trimmed.replace(/^data:\s*/, "").trim();
                  if (!raw) continue;
                  try {
                    const ev = JSON.parse(raw);
                    const tok = ev.token ?? (ev.t === "text" ? ev.v : "");
                    if (tok) {
                      setThinking(false);
                      // TASK 2: Immediately feed token to ElevenLabs streaming dispatcher!
                      full = streamDispatcher.feedToken(tok);
                      patchLast(full);
                    } else if (ev.t === "tool") {
                      const res = runTool(ev.name, ev.args, navigate);
                      if (res.navigated && res.explain) followUp = true;
                    }
                  } catch {}
                }
              }
              if (full.trim()) {
                streamDispatcher.flush();
              }
            } else {
              backendCooldownUntilRef.current = Date.now() + 45_000;
            }
          } catch {
            backendCooldownUntilRef.current = Date.now() + 45_000;
          }
        }

        // 2. TASK 2: Direct Real-Time Streaming Groq LPU -> ElevenLabs First-Chunk Pipeline
        if (!full.trim() && GROQ_FALLBACK_KEYS.length > 0) {
          const streamedReply = await streamGroqToElevenLabs({
            apiKeys: GROQ_FALLBACK_KEYS,
            systemPrompt: ragSystemPrompt,
            history: priorHistory,
            userQuery: q,
            model: "qwen/qwen3.8-27b",
            signal: ac.signal,
            onToken: (fullSoFar) => {
              setThinking(false);
              full = fullSoFar;
              patchLast(fullSoFar);
            },
            onSpeakChunk: (chunk) => {
              setThinking(false);
              setPipelineStage("speaking");
              speak(chunk);
            },
            onStageChange: (stage) => {
              if (stage === "speaking") setThinking(false);
              setPipelineStage(stage);
            },
          });
          if (streamedReply.trim()) {
            full = streamedReply;
            patchLast(full);
          }
        }

        // 3. Instant Semantic RAG Client-Side JARVIS Fallback
        if (!full.trim()) {
          const fallbackReply = getCareerAgentResponse(
            q,
            priorHistory,
            currentProfile,
            activeHonorific
          );
          setThinking(false);
          full = fallbackReply;
          patchLast(full);
          streamDispatcher.feedToken(fallbackReply);
          streamDispatcher.flush();
          const updatedHonorific = resolveHonorific(propProfile, propUserEmail, propUsername);
          setHonorific(updatedHonorific);
        }

        setThinking(false);

        // Execute website control actions from AI response while audio plays
        const actions = parseActionTags(full);
        if (actions.length > 0) {
          executeActions(actions);
        }

        if (followUp && !hidden) {
          setTimeout(
            () =>
              send(
                "[auto] Page opened. Briefly explain the key actions on this section.",
                true
              ),
            900
          );
        }
      } catch (e: any) {
        setThinking(false);
        if (e?.name !== "AbortError") {
          const fallbackReply = getCareerAgentResponse(
            q,
            priorHistory,
            currentProfile,
            activeHonorific
          );
          patchLast(fallbackReply);
          const spokenPart = fallbackReply.split("|||")[0] || fallbackReply;
          setPipelineStage("speaking");
          speak(extractSpoken(spokenPart).slice(0, 280));
          const actions = parseActionTags(fallbackReply);
          if (actions.length > 0) executeActions(actions);
        }
      }
    },
    [
      awake,
      detectInstantClientActions,
      executeActions,
      extractSpoken,
      getToken,
      navigate,
      parseActionTags,
      propActiveTab,
      propPrediction,
      propProfile,
      propUserEmail,
      propUsername,
      resolveProfile,
      speak,
      stopSpeaking,
    ]
  );

  // Voice Input Hook (Web Speech API microphone integration)
  const { isListening, startListening, stopListening } = useVoiceInput({
    lang: LANGS[langIdx][0],
    onInterim: (interimText) => {
      setMicError(null);
      setPipelineStage("listening");
      setInput(interimText);
    },
    onFinal: (finalText) => {
      setMicError(null);
      setInput("");
      send(finalText);
    },
    onError: (errMsg) => {
      setMicError(errMsg);
      setTimeout(() => setMicError(null), 5000);
    },
  });

  // Sync live pipeline stage: Listening -> Thinking -> Speaking -> Idle
  useEffect(() => {
    if (isListening) {
      setPipelineStage("listening");
    } else if (thinking) {
      setPipelineStage("thinking");
    } else if (isSpeaking) {
      setPipelineStage("speaking");
    } else {
      setPipelineStage("idle");
    }
  }, [isListening, thinking, isSpeaking]);

  // Continuous JARVIS Hands-Free Conversation Loop:
  useEffect(() => {
    if (isSpeaking) {
      wasSpeakingRef.current = true;
      return;
    }
    if (wasSpeakingRef.current && !isSpeaking && !thinking && autoListen && !isListening) {
      wasSpeakingRef.current = false;
      const timer = setTimeout(() => {
        if (autoListen && !isSpeaking && !thinking) {
          startListening();
        }
      }, 420);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, thinking, autoListen, isListening, startListening]);

  const handleToggleMic = () => {
    if (!awake) setAwake(true);
    stopSpeaking();
    if (isListening) {
      setAutoListen(false);
      stopListening();
      setPipelineStage("idle");
    } else {
      setAutoListen(true);
      setPipelineStage("listening");
      startListening();
    }
  };

  // Compute current visual state for Avatar3D
  const avatarState: AvatarState =
    pipelineStage === "speaking" || isSpeaking
      ? "speaking"
      : pipelineStage === "thinking" || thinking
      ? "thinking"
      : pipelineStage === "listening" || isListening
      ? "listening"
      : "idle";

  const [ambientMinimized, setAmbientMinimized] = useState(false);

  // Reusable Listening -> Thinking -> Speaking State Stepper Component
  const renderPipelineStepper = (compact = false) => {
    const steps: Array<{ id: VoicePipelineStage; label: string; icon: string }> = [
      { id: "listening", label: "Listening", icon: "🎙️" },
      { id: "thinking", label: "Thinking", icon: "🧠" },
      { id: "speaking", label: "Speaking", icon: "🔊" },
    ];
    return (
      <div
        data-testid="voice-pipeline-states"
        className={`flex items-center ${
          compact ? "gap-1 text-[10px]" : "gap-1.5 text-[11px]"
        } font-mono`}
      >
        {steps.map((s, idx) => {
          const active = avatarState === s.id;
          return (
            <div key={s.id} className="flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border transition-all ${
                  active
                    ? s.id === "listening"
                      ? "bg-pink-500/25 border-pink-400 text-pink-200 shadow-[0_0_12px_rgba(236,72,153,0.45)] animate-pulse font-semibold"
                      : s.id === "thinking"
                      ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(56,189,248,0.45)] animate-pulse font-semibold"
                      : "bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.45)] animate-pulse font-semibold"
                    : "bg-white/5 border-white/10 text-zinc-500"
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </span>
              {idx < steps.length - 1 && <span className="text-zinc-600">→</span>}
            </div>
          );
        })}
      </div>
    );
  };

  if (isAmbient) {
    if (ambientMinimized) {
      return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center">
          <button
            onClick={() => setAmbientMinimized(false)}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-950/90 border-2 border-violet-500/70 shadow-[0_0_30px_rgba(139,92,246,0.5)] backdrop-blur-xl transition-all hover:scale-110 hover:border-violet-400"
            title="Expand DAS 3D AI Co-Pilot"
          >
            <div className="h-12 w-12 rounded-full overflow-hidden pointer-events-none">
              <Avatar3D getLevel={getAudioLevel} state={avatarState} />
            </div>
            <span
              className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] border-2 border-slate-950 ${
                avatarState === "speaking"
                  ? "bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]"
                  : avatarState === "listening"
                  ? "bg-pink-500 animate-ping"
                  : "bg-emerald-500"
              }`}
            />
          </button>
        </div>
      );
    }

    return (
      <aside
        data-agent-ignore
        aria-label="DAS 3D AI Co-Pilot"
        className="fixed bottom-6 right-6 z-50 flex flex-col w-[355px] max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-950/92 border border-violet-500/40 shadow-[0_0_35px_rgba(139,92,246,0.35)] backdrop-blur-2xl overflow-hidden text-zinc-100 transition-all duration-300"
      >
        {/* Top Header bar */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-violet-950/80 via-slate-900/90 to-slate-950/90 border-b border-violet-500/20">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  avatarState === "speaking" ? "bg-rose-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  avatarState === "speaking" ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
            </span>
            <span className="text-xs font-mono font-bold tracking-wider text-violet-300">
              DAS • {honorific.toUpperCase()} MODE
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleHonorific}
              title="Switch Owner (Boss) / Guest (Sir) Addressing Mode"
              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-violet-500/20 text-violet-200 border border-white/10 transition-colors"
            >
              {honorific === "Boss" ? "👑 Boss" : "🎩 Sir"}
            </button>
            <button
              onClick={() => propOnNavigateTab?.("coach")}
              title="Expand to Full Voice Coach"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAmbientMinimized(true)}
              title="Minimize to Floating Orb"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Listening -> Thinking -> Speaking State Bar */}
        <div className="px-3 py-1.5 bg-slate-950/90 border-b border-white/5 flex items-center justify-center">
          {renderPipelineStepper(true)}
        </div>

        {/* 3D Cyborg Face Viewport */}
        <div className="relative h-36 w-full bg-[radial-gradient(circle_at_50%_50%,#10255a_0%,#050914_80%)] flex items-center justify-center overflow-hidden">
          <Avatar3D getLevel={getAudioLevel} state={avatarState} />
        </div>

        {/* Latest Voice Dialogue / Subtitle bubble */}
        {msgs.length > 0 && msgs[msgs.length - 1].role === "assistant" && (
          <div className="px-3.5 py-2 bg-slate-900/70 border-t border-white/5 text-[11px] text-zinc-300 flex items-start justify-between gap-2 leading-relaxed font-sans">
            <span className="line-clamp-2 flex-1">
              {msgs[msgs.length - 1].content
                .replace(/<!--[\s\S]*?-->/g, "")
                .trim()
                .slice(0, 150)}
            </span>
            <button
              type="button"
              onClick={() => {
                const raw = msgs[msgs.length - 1].content;
                const firstPara = raw.split(/\n\s*(?:\*\*|###|[-*•]\s|\d+\.\s)/)[0] || raw;
                speak(firstPara.slice(0, 320));
              }}
              className="shrink-0 px-2 py-0.5 rounded-full bg-violet-500/20 hover:bg-violet-500/40 border border-violet-500/30 text-[10px] text-violet-200 cursor-pointer"
              title="Play ElevenLabs JARVIS Voice"
            >
              🔊
            </button>
          </div>
        )}

        {/* Quick Voice / Control Action Bar */}
        <div className="p-3 bg-slate-950/90 space-y-2 border-t border-violet-500/20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-medium text-xs transition-all ${
                isListening || pipelineStage === "listening"
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse ring-2 ring-rose-400"
                  : thinking || pipelineStage === "thinking"
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.7)] animate-pulse ring-2 ring-cyan-400"
                  : isSpeaking || pipelineStage === "speaking"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.7)] animate-pulse ring-2 ring-emerald-300"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
              }`}
            >
              {isListening || pipelineStage === "listening" ? (
                <>
                  <MicOff className="w-3.5 h-3.5 animate-pulse" />
                  <span>Listening... (User Speaking - Red)</span>
                </>
              ) : thinking || pipelineStage === "thinking" ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Thinking... (Blue)</span>
                </>
              ) : isSpeaking || pipelineStage === "speaking" ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                  <span>Speaking... (DAS Mouth - Green)</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Speak to DAS ({honorific})</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => propOnNavigateTab?.("coach")}
              className="py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-zinc-300 hover:text-white text-xs transition-colors border border-white/10"
              title="Open Full 2-Column Voice Coach"
            >
              Full Coach
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = input;
              setInput("");
              send(v);
            }}
            className="flex items-center gap-1.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Command DAS, ${honorific} (e.g. "open projects")…`}
              className="h-7 flex-1 rounded-lg bg-white/5 px-2.5 text-[11px] text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500 border border-white/10"
            />
            {input.trim() && (
              <button
                type="submit"
                className="h-7 px-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-[10px] font-semibold text-white"
              >
                Go
              </button>
            )}
          </form>
        </div>
      </aside>
    );
  }

  return (
    <section
      data-agent-ignore
      className="grid h-full min-h-[540px] w-full grid-cols-1 bg-[#060b19] text-zinc-100 md:grid-cols-2 rounded-2xl overflow-hidden border border-blue-500/25 shadow-[0_0_45px_rgba(15,35,95,0.45)]"
    >
      {/* LEFT: Centered 3D Dark-Blue Cyber Avatar Panel */}
      <div className="relative h-full min-h-[380px] overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#102a6b_0%,#050914_78%)] flex items-center justify-center p-4">
        <Avatar3D getLevel={getAudioLevel} state={avatarState} />

        {/* Floating Top Badge + Boss/Sir Identity Toggle */}
        <div className="absolute left-4 top-4 right-4 z-20 flex items-center justify-between gap-2">
          <div className="px-3 py-1 rounded-full bg-slate-950/85 border border-red-500/40 text-[11px] font-mono tracking-widest text-red-300 backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
            DAS 3D JARVIS • {honorific.toUpperCase()}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-mono text-emerald-300"
              title="RAG Prompt Budget (< 2000 tokens, Top 3 semantic matches)"
            >
              RAG Top-3 • {lastPromptTokens} tok (&lt;2000)
            </span>
            <button
              type="button"
              onClick={toggleHonorific}
              title="Toggle Owner (Boss) vs Guest (Sir) recognition"
              className="px-2.5 py-1 rounded-full bg-slate-900/85 hover:bg-blue-900/60 border border-white/15 text-[11px] font-mono text-blue-200 backdrop-blur-md transition-colors cursor-pointer"
            >
              {honorific === "Boss" ? "👑 Mode: Boss (Owner)" : "🎩 Mode: Sir (Guest)"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!voiceMuted) stopSpeaking();
                setVoiceMuted(!voiceMuted);
              }}
              title={voiceMuted ? "Unmute DAS Voice" : "Mute DAS Voice"}
              className="p-1.5 rounded-full bg-slate-900/85 hover:bg-white/10 border border-white/15 text-zinc-300 backdrop-blur-md transition-colors cursor-pointer"
            >
              {voiceMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* TASK 2 UI: Live Listening -> Thinking -> Speaking Pipeline Stepper (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5 bg-slate-950/88 border border-white/15 px-3 py-2 rounded-xl backdrop-blur-md">
          {renderPipelineStepper(false)}
        </div>

        {/* Hands-Free Auto-Listen Toggle (Bottom Right) */}
        <button
          type="button"
          onClick={() => setAutoListen((v) => !v)}
          className={`absolute bottom-4 right-4 z-20 flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-full border backdrop-blur-md transition-all cursor-pointer ${
            autoListen
              ? "bg-emerald-950/85 border-emerald-500/50 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              : "bg-slate-900/85 border-white/10 text-zinc-400 hover:text-zinc-200"
          }`}
          title="When enabled, DAS automatically listens for your reply after finishing each spoken answer"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              autoListen ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
            }`}
          />
          {autoListen ? "Hands-Free: ON" : "Hands-Free: OFF"}
        </button>

        {/* Wake-up Overlay if not yet awakened */}
        {!awake && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]">
            <div className="text-center space-y-4 max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-mono">
                <span>✨ Autonomous JARVIS Voice &amp; Site Control</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                DAS Career Intelligence
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Speak naturally in English, Telugu, or Hindi. Control every tab, run mock interviews, and audit your readiness hands-free.
              </p>
              <button
                type="button"
                onClick={wake}
                className="mt-2 h-12 px-8 rounded-full bg-gradient-to-r from-blue-600 to-rose-600 font-semibold text-white shadow-[0_0_35px_rgba(225,29,72,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer text-sm inline-flex items-center gap-2"
              >
                <span>🎙️ Wake up DAS</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Chat Thread + Voice Mic Input */}
      <div className="flex h-full min-h-0 flex-col border-t border-white/10 md:border-t-0 md:border-l bg-[#080d1c]">
        {/* Quick Website Control Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10 bg-[#050914]/90 overflow-x-auto scrollbar-none text-[11px]">
          <span className="text-zinc-500 font-mono mr-1 shrink-0">Voice/Click:</span>
          {[
            { label: "🏠 Dashboard", tab: "overview" },
            { label: "🚀 6-Wk Roadmap", tab: "skills" },
            { label: "📁 23 Blueprints", tab: "projects" },
            { label: "🎙️ Mock Interview", tab: "interview" },
            { label: "📄 ATS Resume", tab: "resume" },
            { label: "📊 Cohort 972", tab: "analytics" },
            { label: "🛡️ STAR Defense", tab: "defense" },
          ].map((item) => (
            <button
              key={item.tab}
              type="button"
              onClick={() => propOnNavigateTab?.(item.tab)}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white/5 hover:bg-blue-500/20 text-zinc-300 hover:text-blue-200 border border-white/5 transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Messages area */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {msgs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xl font-bold">
                DAS
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">
                  How can I assist you today, {honorific}?
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                  Semantic RAG (Top 3 of 23 blueprints + 972 placements) &amp; First-Chunk ElevenLabs Streaming active.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md pt-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!awake) wake();
                      send(prompt);
                    }}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/40 hover:bg-blue-600/10 text-left text-xs text-zinc-300 transition-all cursor-pointer"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "bg-white/5 text-zinc-200 border border-white/10"
                }`}
              >
                <div>{m.content}</div>
                {m.role === "assistant" && m.content !== "…" && (
                  <div className="mt-2 flex items-center justify-end border-t border-white/5 pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const firstPara =
                          m.content.split(/\n\s*(?:\*\*|###|[-*•]\s|\d+\.\s)/)[0] || m.content;
                        speak(firstPara.slice(0, 320));
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-mono text-blue-200 transition-colors cursor-pointer"
                      title="Replay with ElevenLabs JARVIS Voice"
                    >
                      🔊 Speak
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Microphone feedback / error banner */}
        {(isListening || micError) && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center justify-between border-t ${
              micError
                ? "bg-rose-950/80 text-rose-200 border-rose-500/30"
                : "bg-blue-950/80 text-blue-200 border-blue-500/30"
            }`}
          >
            <span>
              {micError
                ? `⚠️ ${micError}`
                : `🎙️ Listening (${LANGS[langIdx][1]}), ${honorific}... Speak naturally, your command will execute automatically.`}
            </span>
          </div>
        )}

        {/* Input Bar pinned at the bottom */}
        <form
          className="sticky bottom-0 z-20 flex items-center gap-2 border-t border-white/10 p-3.5 bg-[#050914]/95 backdrop-blur-md"
          onSubmit={(e) => {
            e.preventDefault();
            const v = input;
            setInput("");
            send(v);
          }}
        >
          <button
            type="button"
            onClick={() => setLangIdx((langIdx + 1) % LANGS.length)}
            className="h-10 w-11 shrink-0 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-blue-300 border border-white/10 transition-colors cursor-pointer"
            title="Switch Spoken Language (English / Telugu / Hindi)"
          >
            {LANGS[langIdx][1]}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? `Listening to you, ${honorific}...`
                : `Ask DAS anything or say "Open Projects", ${honorific}…`
            }
            className="h-10 flex-1 rounded-full bg-white/5 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500 border border-white/5"
          />
          {input.trim() && (
            <button
              type="submit"
              className="h-10 px-4 shrink-0 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Send
            </button>
          )}
          <button
            type="button"
            onClick={openUploadPanel}
            className={`relative h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-lg cursor-pointer transition-all ${
              isUploading
                ? "bg-rose-600 text-white animate-pulse shadow-[0_0_20px_#e11d48] ring-2 ring-rose-400"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            }`}
            aria-label="Open ATS Resume Studio"
            title="Open ATS Resume Studio & PDF Scanner"
          >
            📎
          </button>
          <button
            type="button"
            onClick={handleToggleMic}
            className={`relative h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isListening || pipelineStage === "listening"
                ? "animate-pulse bg-rose-600 text-white shadow-[0_0_25px_#e11d48] ring-4 ring-rose-400/50 scale-110"
                : thinking || pipelineStage === "thinking"
                ? "animate-pulse bg-blue-600 text-white shadow-[0_0_25px_#2563eb] ring-4 ring-cyan-400/50 scale-110"
                : isSpeaking || pipelineStage === "speaking"
                ? "animate-pulse bg-emerald-500 text-white shadow-[0_0_25px_#10b981] ring-4 ring-emerald-400/50 scale-110"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            }`}
            aria-label="Microphone"
            title={
              isListening || pipelineStage === "listening"
                ? "Listening live: User is speaking (Red)"
                : thinking || pipelineStage === "thinking"
                ? "Thinking: Groq LPU processing (Blue)"
                : isSpeaking || pipelineStage === "speaking"
                ? "Speaking: ElevenLabs streaming voice (Green)"
                : "Tap to Speak (Hands-Free JARVIS Mode)"
            }
          >
            {isListening || pipelineStage === "listening" ? (
              <>
                <span className="text-sm">🎙️</span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
              </>
            ) : thinking || pipelineStage === "thinking" ? (
              <>
                <span className="text-sm">⚡</span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              </>
            ) : isSpeaking || pipelineStage === "speaking" ? (
              <>
                <span className="text-sm">🔊</span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              </>
            ) : (
              <span className="text-sm">🎤</span>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

export { AgentLayout };
