import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import Avatar3D, { AvatarState } from "./Avatar3D";
import { useAudioAnalyser } from "./useAudioAnalyser";
import { useVoiceInput } from "./useVoiceInput";
import { runTool, snapshot } from "./toolRunner";

const API =
  ((import.meta as any).env?.VITE_API_URL as string) ||
  ((import.meta as any).env?.VITE_API_BASE_URL as string) ||
  "";

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
  [key: string]: any;
}

const QUICK_PROMPTS = [
  "How is my placement readiness score?",
  "Explain the 23 project blueprints",
  "Audit my ATS resume against recruiter cutoffs",
  "What skills should I master this week?",
];

/**
 * Full responsive 3D Voice Coach panel:
 * Left = Centered 3D Avatar with eye glow, breathing idle motion, and audio lip-sync.
 * Right = Context-aware chat unified with the main Pathfinder AI Career Coach pipeline + live mic input.
 */
export default function AgentLayout({
  getToken = () =>
    localStorage.getItem("pathfinder_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("pathfinder_token"),
  profile: propProfile,
  activeTab: propActiveTab,
  prediction: propPrediction,
}: AgentLayoutProps = {}) {
  const [, navigate] = useLocation();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [awake, setAwake] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [langIdx, setLangIdx] = useState(0);

  const msgsRef = useRef<Msg[]>([]);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { isSpeaking, getAudioLevel, speak, stopSpeaking } = useAudioAnalyser(getToken);

  const push = (m: Msg) => {
    msgsRef.current = [...msgsRef.current, m];
    setMsgs(msgsRef.current);
  };

  const patchLast = (c: string) => {
    msgsRef.current = [...msgsRef.current.slice(0, -1), { role: "assistant", content: c }];
    setMsgs(msgsRef.current);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Resolve active candidate profile from props or localStorage SSOT
  const resolveProfile = useCallback(() => {
    if (propProfile && typeof propProfile === "object") {
      return {
        cgpa: propProfile.cgpa ?? 7.8,
        backlogs: propProfile.backlogs ?? 0,
        internships: propProfile.internships ?? 1,
        communication: propProfile.communication ?? 7,
        coding: propProfile.coding ?? 7,
        target_role: propProfile.targetRole || propProfile.target_role || "Software Development Engineer (SDE)",
        target_tier: propProfile.targetTier || propProfile.target_tier || "Tier-1 Product",
        branch: propProfile.branch || "CSE",
        graduation_year: propProfile.graduationYear || propProfile.graduation_year || 2026,
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
          target_role: p.targetRole || p.target_role || "Software Development Engineer (SDE)",
          target_tier: p.targetTier || p.target_tier || "Tier-1 Product",
          branch: p.branch || "CSE",
          graduation_year: p.graduationYear || 2026,
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
    };
  }, [propProfile]);

  const wake = useCallback(async () => {
    if (awake) return;
    setAwake(true);
    let greeting = "Hello sir, I'm your DAS agent, how can I assist you?";
    try {
      const t = getToken();
      const r = await fetch(`${API}/agent/me`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (r.ok) {
        const data = await r.json();
        if (data.greeting) greeting = data.greeting;
      }
    } catch {}
    if (msgsRef.current.length === 0) {
      push({ role: "assistant", content: greeting });
      speak(greeting);
    }
  }, [awake, getToken, speak]);

  useEffect(() => {
    const t = setTimeout(() => {
      wake().catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [wake]);

  const send = useCallback(
    async (text: string, hidden = false) => {
      const q = text.trim();
      if (!q) return;
      if (!awake) setAwake(true);

      abort.current?.abort();
      stopSpeaking();
      const ac = new AbortController();
      abort.current = ac;

      const priorHistory = msgsRef.current
        .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      if (!hidden) push({ role: "user", content: q });
      push({ role: "assistant", content: "…" });
      setThinking(true);

      let full = "";
      let spoken = 0;
      let followUp = false;

      const takeSpeech = (final: boolean) => {
        const c = full.indexOf("|||");
        const sp = c >= 0 ? full.slice(0, c) : full;
        const isFinal = final || c >= 0;
        let buf = sp.slice(spoken);
        for (;;) {
          const m = buf.match(/^[\s\S]*?[.!?।\n]+(?:\s+|$)/);
          if (!m || (!isFinal && !/\s$/.test(m[0]))) break;
          speak(m[0]);
          spoken += m[0].length;
          buf = buf.slice(m[0].length);
        }
        if (isFinal && buf.trim()) {
          speak(buf);
          spoken += buf.length;
        }
      };

      try {
        const t = getToken();
        const currentProfile = resolveProfile();
        const pageSnap = snapshot();
        const currentTab = propActiveTab || "coach";

        // UNIFIED PAYLOAD matching the main Pathfinder AI Career Coach pipeline
        const unifiedChatPayload = {
          message: q,
          history: priorHistory,
          profile: currentProfile,
          active_tab: currentTab,
          page_context: {
            ...pageSnap,
            activeTabTitle: "DAS AI Voice Coach",
            screenName: "DAS AI Voice Coach",
            screenPurpose:
              "Interactive 3D AI Career Coach with live voice, lip-sync, and personalized placement mentorship",
            placementReadinessChance: propPrediction?.chance ? `${propPrediction.chance}%` : "78%",
            placementReadinessLabel: propPrediction?.label || "Strong Candidate Profile",
            candidateBranch: currentProfile.branch,
            targetRole: currentProfile.target_role,
            cgpa: currentProfile.cgpa,
            backlogs: currentProfile.backlogs,
            internships: currentProfile.internships,
            codingConfidence: currentProfile.coding,
            communicationRating: currentProfile.communication,
          },
        };

        // 1. Primary: Unified /api/chat/stream (same personality, profile, and context as text coach)
        let r = await fetch(`${API}/api/chat/stream`, {
          method: "POST",
          signal: ac.signal,
          headers: {
            "Content-Type": "application/json",
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          body: JSON.stringify(unifiedChatPayload),
        });

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
                  patchLast(full.replace("|||", "\n\n"));
                  takeSpeech(false);
                } else if (ev.t === "tool") {
                  const res = runTool(ev.name, ev.args, navigate);
                  if (res.navigated && res.explain) followUp = true;
                }
              } catch {}
            }
          }
        }

        // 2. Fallback: Non-streaming /api/chat if stream returned empty
        if (!full.trim()) {
          const syncRes = await fetch(`${API}/api/chat`, {
            method: "POST",
            signal: ac.signal,
            headers: {
              "Content-Type": "application/json",
              ...(t ? { Authorization: `Bearer ${t}` } : {}),
            },
            body: JSON.stringify(unifiedChatPayload),
          });
          if (syncRes.ok) {
            const data = await syncRes.json();
            const replyText = data.reply || data.response || data.message || "";
            if (replyText) {
              setThinking(false);
              full = replyText;
              patchLast(full);
            }
          }
        }

        setThinking(false);
        takeSpeech(true);

        if (followUp && !hidden) {
          setTimeout(
            () =>
              send(
                "[auto] Page open ayyindi. Ippudu ee page ni snapshot batti clear ga explain chey.",
                true
              ),
            900
          );
        }
      } catch (e: any) {
        setThinking(false);
        if (e?.name !== "AbortError") {
          patchLast("Oops, connection problem. Malli try chey boss.");
        }
      }
    },
    [awake, getToken, navigate, propActiveTab, propPrediction, resolveProfile, speak, stopSpeaking]
  );

  // Voice Input Hook (Bug 6: Web Speech API microphone integration)
  const { isListening, toggleListening } = useVoiceInput({
    lang: LANGS[langIdx][0],
    onInterim: (interimText) => {
      setMicError(null);
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

  const handleToggleMic = () => {
    if (!awake) setAwake(true);
    stopSpeaking();
    toggleListening();
  };

  // Compute current visual state for Avatar3D (State Indicators: idle, listening, thinking, speaking)
  const avatarState: AvatarState = isSpeaking
    ? "speaking"
    : thinking
    ? "thinking"
    : isListening
    ? "listening"
    : "idle";

  return (
    <section
      data-agent-ignore
      className="grid h-full min-h-[580px] w-full grid-cols-1 bg-[#0a0a0f] text-zinc-100 md:grid-cols-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
    >
      {/* LEFT: Centered 3D Avatar Panel */}
      <div className="relative h-full min-h-[380px] overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#3b0a45_0%,#0a0a0f_75%)] flex items-center justify-center p-4">
        <Avatar3D getLevel={getAudioLevel} state={avatarState} />

        {/* Floating Top Badge */}
        <div className="absolute left-5 top-5 z-20 flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-violet-950/80 border border-violet-500/40 text-[11px] font-mono tracking-widest text-violet-300 backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
            DAS 3D AGENT
          </div>
        </div>

        {/* Dynamic State Indicator Badge (Bottom Left) */}
        <div
          className={`absolute bottom-5 left-5 z-20 flex items-center gap-2 text-xs font-mono px-3.5 py-1.5 rounded-full bg-slate-900/85 border backdrop-blur-md transition-all ${
            avatarState === "speaking"
              ? "text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              : avatarState === "thinking"
              ? "text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
              : avatarState === "listening"
              ? "text-pink-300 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
              : "text-zinc-300 border-white/10"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              avatarState === "speaking"
                ? "animate-pulse bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                : avatarState === "thinking"
                ? "animate-spin border-2 border-cyan-400 border-t-transparent"
                : avatarState === "listening"
                ? "animate-ping bg-pink-400"
                : "bg-emerald-500"
            }`}
          />
          {avatarState === "speaking"
            ? "speaking (lip-sync active)"
            : avatarState === "thinking"
            ? "thinking..."
            : avatarState === "listening"
            ? "listening to mic..."
            : "online • idle"}
        </div>

        {/* Wake-up Overlay if not yet awakened */}
        {!awake && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]">
            <div className="text-center space-y-4 max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-mono">
                <span>✨ Interactive Voice & 3D Avatar</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                DAS Career Intelligence
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect with Pathfinder's autonomous 3D agent. Speak naturally in Telugu, English, or Hindi.
              </p>
              <button
                type="button"
                onClick={wake}
                className="mt-2 h-12 px-8 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 font-semibold text-white shadow-[0_0_35px_rgba(124,58,237,0.6)] transition-all hover:scale-105 active:scale-95 cursor-pointer text-sm inline-flex items-center gap-2"
              >
                <span>🎙️ Wake up DAS</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Chat Thread + Voice Mic Input */}
      <div className="flex h-full min-h-0 flex-col border-t border-white/10 md:border-t-0 md:border-l bg-[#0d0e15]">
        {/* Messages area */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {msgs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xl font-bold">
                DAS
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">How can I assist you today?</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                  Ask questions about your placement odds, resume score, or project blueprints.
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
                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-violet-500/40 hover:bg-violet-600/10 text-left text-xs text-zinc-300 transition-all cursor-pointer"
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
                    ? "ml-auto bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
                    : "bg-white/5 text-zinc-200 border border-white/10"
                }`}
              >
                {m.content}
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
                : "bg-violet-950/80 text-violet-200 border-violet-500/30"
            }`}
          >
            <span>
              {micError
                ? `⚠️ ${micError}`
                : `🎙️ Listening (${LANGS[langIdx][1]})... Speak now, your words will send automatically.`}
            </span>
          </div>
        )}

        {/* Input Bar pinned at the bottom */}
        <form
          className="sticky bottom-0 z-20 flex items-center gap-2 border-t border-white/10 p-3.5 bg-[#0a0b10]/95 backdrop-blur-md"
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
            className="h-10 w-11 shrink-0 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-violet-300 border border-white/10 transition-colors cursor-pointer"
            title="Switch Spoken Language"
          >
            {LANGS[langIdx][1]}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? "Listening to your voice..."
                : "Ask DAS anything, or tap the mic…"
            }
            className="h-10 flex-1 rounded-full bg-white/5 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500 border border-white/5"
          />
          {input.trim() && (
            <button
              type="submit"
              className="h-10 px-4 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Send
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isListening
                ? "animate-pulse bg-rose-600 text-white shadow-[0_0_20px_#e11d48] ring-2 ring-rose-400"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            }`}
            aria-label="Microphone"
            title={isListening ? "Stop Listening" : "Tap to Speak"}
          >
            🎤
          </button>
        </form>
      </div>
    </section>
  );
}

export { AgentLayout };
