import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import Avatar3D, { AvatarState } from "./Avatar3D";
import PathfinderFace from "./PathfinderFace";
import { useAudioAnalyser } from "./useAudioAnalyser";
import { useVoiceInput } from "./useVoiceInput";
import {
  runTool,
  snapshot,
  VoicePipelineStage,
} from "./toolRunner";
import { geminiLive } from "./geminiLive";
import {
  useAgentController,
  resolveHonorific,
  normalizeTabId,
} from "./useAgentController";
import { initAuthMode } from "@/lib/auth";
import { getApiBase } from "@/lib/apiClient";
import {
  getCareerAgentResponse,
  semanticSearchPathfinderRAG,
  buildRagGeminiSystemPrompt,
  estimatePromptTokens,
} from "@/lib/careerAgent";
import {
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Square,
  Sparkles,
  LayoutDashboard,
  Pencil,
  Send,
  X,
} from "lucide-react";

const API = getApiBase();
const API_BASE = API.replace(/\/$/, "");

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
  focusOnDas?: boolean;
  onToggleFocus?: () => void;
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
  focusOnDas = false,
  onToggleFocus,
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
  const [isEditingLast, setIsEditingLast] = useState(false);
  const lastUserCommandRef = useRef<string>("");
  const inputElementRef = useRef<HTMLInputElement>(null);
  const [honorific, setHonorific] = useState<"Boss" | "Sir">(() => {
    const autoRole = initAuthMode();
    if (autoRole === "Boss") return "Boss";
    return resolveHonorific(propProfile, propUserEmail, propUsername);
  });

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
    const autoRole = initAuthMode();
    if (autoRole === "Boss") {
      setHonorific("Boss");
      return;
    }
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

    const greeting =
      currentHonorific === "Boss"
        ? "Hello Boss, welcome to your dashboard! All website controls and placement intelligence systems are online. Tell me what you'd like to explore or control today!"
        : "Hello Sir, welcome to Pathfinder! I'm DAS, your autonomous AI voice co-pilot. Ask me about any project, readiness score, or tell me which section to open!";

    if (msgsRef.current.length === 0) {
      push({ role: "assistant", content: greeting });
    }

    if (Date.now() >= backendCooldownUntilRef.current) {
      const t = getToken();
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 2200);
      fetch(`${API_BASE}/agent/me`, {
        signal: ctrl.signal,
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      })
        .then(async (r) => {
          clearTimeout(tid);
          if (r.ok) {
            const data = await r.json();
            if (typeof data.is_owner === "boolean" && !localStorage.getItem("das_honorific_override")) {
              const serverHonorific = data.is_owner || data.role === "owner" ? "Boss" : currentHonorific;
              setHonorific(serverHonorific);
            }
          } else {
            backendCooldownUntilRef.current = Date.now() + 45_000;
          }
        })
        .catch(() => {
          clearTimeout(tid);
          backendCooldownUntilRef.current = Date.now() + 45_000;
        });
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
      const currentTab = propActiveTab || "overview";
      const readinessStr = propPrediction?.chance ? `${propPrediction.chance}%` : "78%";

      try {
        // TASK 1: Instant <1ms Semantic Vector Search (Top 3 from 23 Blueprints + 972 Placements)
        const top3Matches = await semanticSearchPathfinderRAG(q, currentProfile, 3);
        const ragSystemPrompt = buildRagGeminiSystemPrompt({
          query: q,
          profile: currentProfile,
          honorific: activeHonorific,
          activeTab: currentTab,
          readinessChance: readinessStr,
          topMatches: top3Matches,
        });
        setLastPromptTokens(estimatePromptTokens(ragSystemPrompt));

        // 1. Primary Unified Gemini Live WebSocket Session (@google/genai)
        // Combines Brain (LLM + RAG + Tools) + Native 24kHz Voice Audio in ONE WebSocket session!
        try {
          const liveReply = await geminiLive.sendTurn(q, {
            systemPrompt: ragSystemPrompt,
            history: priorHistory,
            signal: ac.signal,
            muteAudio: voiceMuted,
            callbacks: {
              onToken: (fullSoFar) => {
                setThinking(false);
                full = fullSoFar;
                patchLast(fullSoFar);
              },
              onToolCall: (name, args) => {
                const res = runTool(name, args, navigate);
                if (res.navigated && res.explain) followUp = true;
                return res;
              },
              onStageChange: (stage) => {
                if (stage === "speaking") {
                  setThinking(false);
                  setPipelineStage("speaking");
                } else {
                  setPipelineStage(stage);
                }
              },
            },
          });
          if (liveReply && liveReply.trim()) {
            full = liveReply;
            patchLast(full);
          }
        } catch (liveErr) {
          console.warn("[AgentLayout] Gemini Live WebSocket notice, falling back:", liveErr);
        }

        // 2. Secondary Fallback: Backend Gemini Stream if direct WebSocket was interrupted
        if (!full.trim() && Date.now() >= backendCooldownUntilRef.current) {
          try {
            const t = getToken();
            const pageSnap = snapshot();
            const streamCtrl = new AbortController();
            const streamTid = setTimeout(() => streamCtrl.abort(), 3500);
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
                      full += tok;
                      patchLast(full);
                    } else if (ev.t === "tool") {
                      const res = runTool(ev.name, ev.args, navigate);
                      if (res.navigated && res.explain) followUp = true;
                    }
                  } catch {}
                }
              }
              if (full.trim() && !voiceMuted) {
                speak(extractSpoken(full.split("|||")[0] || full).slice(0, 280));
              }
            } else {
              backendCooldownUntilRef.current = Date.now() + 45_000;
            }
          } catch {
            backendCooldownUntilRef.current = Date.now() + 45_000;
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
          if (!voiceMuted) {
            speak(extractSpoken(fallbackReply.split("|||")[0] || fallbackReply).slice(0, 280));
          }
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

  const isDashboard = propActiveTab === "overview";
  const [showHistory, setShowHistory] = useState(false);

  const liveSubtitle = (() => {
    if (isListening || pipelineStage === "listening") {
      return input.trim() ? `Hearing: "${input}"` : `Listening to ${honorific}... Speak now`;
    }
    if (thinking || pipelineStage === "thinking") {
      return "Thinking... Gemini Live Multimodal Brain processing";
    }
    if (isSpeaking || pipelineStage === "speaking") {
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        if (last.role === "assistant") {
          return last.content.replace(/<!--[\s\S]*?-->/g, "").trim().slice(0, 180);
        }
      }
      return "DAS is speaking...";
    }
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      if (last.role === "assistant") {
        return last.content.replace(/<!--[\s\S]*?-->/g, "").trim().slice(0, 180);
      }
      return `You: ${last.content.slice(0, 160)}`;
    }
    return `DAS 3D AI ready • Speak or type below, ${honorific}`;
  })();

  // 1. 24/7 Full-Website Living 3D Cyborg Face Background
  const renderBackgroundFace = () => (
    <div
      data-das-id="full-website-background-avatar"
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        width: "100vw",
        height: "100vh",
      }}
      aria-hidden="true"
    >
      {/* Deep Space Atmosphere with subtle crimson ambient glow */}
      <div
        className="absolute inset-0 bg-[#000000]"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(220, 20, 20, 0.12) 0%, rgba(8, 9, 15, 0.88) 55%, #000000 100%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[75vh] w-[75vh] rounded-full blur-[120px] pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.06) 50%, transparent 75%)",
        }}
      />

      {/* Living 3D Face: Desktop scale(1.2), Mobile scale(1.5), centered */}
      <div className="relative w-screen h-screen flex items-center justify-center  transition-transform duration-300">
        <PathfinderFace
          getLevel={getAudioLevel}
          state={avatarState}
          isListening={isListening || pipelineStage === "listening"}
          className="w-full h-full"
        />
      </div>
    </div>
  );

  // 2. Minimal Black Translucent Slidebar: DAS BOSS MODE Title, Pencil Edit Button, Typing Input
  const renderSlidebar = () => (
    <aside
      data-agent-ignore
      data-das-id="dashboard-chat-bar"
      aria-label="DAS Boss Mode Command Center"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[720px] rounded-2xl bg-black/85 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-2xl text-zinc-100 flex flex-col overflow-hidden transition-all duration-300"
      style={{
        paddingBottom: "max(6px, env(safe-area-inset-bottom, 6px))",
      }}
    >
      {/* Top Header: ONLY "DAS BOSS MODE" Title & Minimal Active Indicator */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-black/60 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
          <span className="font-mono font-bold tracking-widest text-red-300">
            DAS BOSS MODE
          </span>
          {isEditingLast && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-200 animate-pulse flex items-center gap-1">
              <span>Editing Command</span>
              <button
                type="button"
                onClick={() => {
                  setIsEditingLast(false);
                  setInput("");
                }}
                className="hover:text-white cursor-pointer"
                title="Cancel Edit"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Focus on DAS / Show Cards Toggle if available */}
          {onToggleFocus && (
            <button
              type="button"
              onClick={onToggleFocus}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                focusOnDas
                  ? "bg-red-500/25 border-red-400/50 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                  : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300"
              }`}
              title={focusOnDas ? "Show Dashboard Cards" : "Focus on Fullscreen DAS Face"}
            >
              {focusOnDas ? (
                <>
                  <LayoutDashboard className="w-3 h-3" />
                  <span>Show Cards</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-red-400" />
                  <span>Focus on DAS</span>
                </>
              )}
            </button>
          )}

          {/* Toggle Log Drawer */}
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded bg-white/5 border border-white/5"
            title={showHistory ? "Collapse Message Log" : "View Message Log"}
          >
            <span>{showHistory ? "Hide Log" : "Log"}</span>
            {showHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Clean Text-Only History Log (NO status images) */}
      {showHistory && (
        <div className="overflow-y-auto px-4 py-3 space-y-2.5 border-b border-white/10 bg-black/95 text-xs max-h-56 sm:max-h-72">
          {msgs.length === 0 ? (
            <p className="text-[11px] text-zinc-500 italic text-center py-2">
              No previous commands in this session. Type below to execute.
            </p>
          ) : (
            msgs.slice(-8).map((m, idx) => (
              <div key={idx} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-1.5 leading-relaxed text-xs shadow-sm ${
                    m.role === "user"
                      ? "bg-red-600/90 text-white font-medium shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                      : "bg-zinc-900/95 text-zinc-200 border border-white/10"
                  }`}
                >
                  <span className="font-semibold text-[10px] block opacity-70 mb-0.5">
                    {m.role === "user" ? "Boss (Command)" : "DAS"}
                  </span>
                  {m.content.replace(/<!--[\s\S]*?-->/g, "").trim()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Primary Command Typing Form + Small Pencil Edit Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const cmd = input.trim();
          if (!cmd) return;
          lastUserCommandRef.current = cmd;
          setInput("");
          setIsEditingLast(false);
          send(cmd);
        }}
        className="flex items-center gap-2 p-2 sm:p-2.5 bg-black/40"
      >
        {/* Small Pencil Icon for Edit Option */}
        <button
          type="button"
          onClick={() => {
            let prevCmd = lastUserCommandRef.current;
            if (!prevCmd) {
              const userMsgs = msgs.filter((m) => m.role === "user");
              if (userMsgs.length > 0) {
                prevCmd = userMsgs[userMsgs.length - 1].content;
              }
            }
            if (prevCmd) {
              setInput(prevCmd);
              setIsEditingLast(true);
              inputElementRef.current?.focus();
            }
          }}
          title="Edit last typed command (small pencil icon)"
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 transition-all shrink-0 cursor-pointer active:scale-95"
        >
          <Pencil className="w-4 h-4 text-red-400" />
        </button>

        {/* Primary Typing Input Field: Command Execution */}
        <input
          ref={inputElementRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isEditingLast
              ? "Edit your command and press Execute..."
              : "Type your command, Boss (e.g. 'open interview', 'check resume', 'show roadmap')..."
          }
          className="h-10 flex-1 min-w-0 rounded-xl bg-white/5 px-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-red-500 border border-white/10 font-sans"
        />

        {/* Execute / Send Button */}
        <button
          type="submit"
          disabled={!input.trim()}
          className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-white transition-all shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer active:scale-95 flex items-center gap-1.5"
        >
          <span>Execute</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </aside>
  );

  return (
    <>
      {renderBackgroundFace()}
      {renderSlidebar()}
    </>
  );
}

export { AgentLayout };
