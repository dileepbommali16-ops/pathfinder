import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import Avatar3D from "./Avatar3D";
import { Speaker, startListening } from "./voice";
import { runTool, snapshot } from "./toolRunner";

const API =
  ((import.meta as any).env?.VITE_API_URL as string) ||
  ((import.meta as any).env?.VITE_API_BASE_URL as string) ||
  "";

type Msg = { role: "user" | "assistant"; content: string };
const LANGS = [["en-IN", "EN"], ["te-IN", "తె"], ["hi-IN", "हि"]] as const;

export interface AgentLayoutProps {
  getToken?: () => string | null;
  [key: string]: any;
}

const QUICK_PROMPTS = [
  "How is my placement readiness score?",
  "Explain the 23 project blueprints",
  "Audit my ATS resume against recruiter cutoffs",
  "What skills should I master this week?",
];

/** Full responsive slide: left = 3D face, right = chat + typing + mic. */
export default function AgentLayout({
  getToken = () =>
    localStorage.getItem("pathfinder_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("pathfinder_token"),
}: AgentLayoutProps = {}) {
  const [, navigate] = useLocation();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [awake, setAwake] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [langIdx, setLangIdx] = useState(0);
  const msgsRef = useRef<Msg[]>([]);
  const speaker = useRef<Speaker | null>(null);
  const abort = useRef<AbortController | null>(null);
  const stopMic = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const push = (m: Msg) => {
    msgsRef.current = [...msgsRef.current, m];
    setMsgs(msgsRef.current);
  };

  const patchLast = (content: string) => {
    const a = [...msgsRef.current];
    if (a.length > 0) {
      a[a.length - 1] = { ...a[a.length - 1], content };
      msgsRef.current = a;
      setMsgs(a);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const wake = async () => {
    const sp = new Speaker(getToken);
    sp.onState = setSpeaking;
    speaker.current = sp;
    await sp.initContext();
    setAwake(true);

    const t = getToken();
    let greeting = "Hello sir, I'm your DAS agent, how can I assist you?";
    try {
      const r = await fetch(`${API}/agent/me`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (r.ok) greeting = (await r.json()).greeting;
    } catch {}
    push({ role: "assistant", content: greeting });
    sp.say(greeting);
  };

  const send = useCallback(
    async (text: string, hidden = false) => {
      const q = text.trim();
      if (!q) return;
      abort.current?.abort();
      speaker.current?.stop(); // barge-in
      const ac = new AbortController();
      abort.current = ac;

      if (!hidden) push({ role: "user", content: q });
      const history = hidden
        ? [...msgsRef.current, { role: "user" as const, content: q }]
        : msgsRef.current;
      push({ role: "assistant", content: "…" });

      let full = "",
        spoken = 0,
        followUp = false;
      const say = (s: string) => speaker.current?.say(s);
      const take = (final: boolean) => {
        const c = full.indexOf("|||");
        const sp = c >= 0 ? full.slice(0, c) : full;
        const isFinal = final || c >= 0;
        let buf = sp.slice(spoken);
        for (;;) {
          const m = buf.match(/^[\s\S]*?[.!?।\n]+(?:\s+|$)/);
          if (!m || (!isFinal && !/\s$/.test(m[0]))) break;
          say(m[0]);
          spoken += m[0].length;
          buf = buf.slice(m[0].length);
        }
        if (isFinal && buf.trim()) {
          say(buf);
          spoken += buf.length;
        }
      };

      try {
        const t = getToken();
        let isFallback = false;
        let r = await fetch(`${API}/agent/chat`, {
          method: "POST",
          signal: ac.signal,
          headers: {
            "Content-Type": "application/json",
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          body: JSON.stringify({ messages: history, page: snapshot() }),
        });

        if (!r.ok && (r.status === 404 || r.status === 502)) {
          // Seamless fallback to /api/chat/stream
          r = await fetch(`${API}/api/chat/stream`, {
            method: "POST",
            signal: ac.signal,
            headers: {
              "Content-Type": "application/json",
              ...(t ? { Authorization: `Bearer ${t}` } : {}),
            },
            body: JSON.stringify({
              message: q,
              history: history.slice(0, -1),
              profile: {},
              page_context: snapshot(),
            }),
          });
          isFallback = true;
        }

        if (!r.ok || !r.body) throw new Error(String(r.status));
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let carry = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          carry += dec.decode(value, { stream: true });
          const parts = carry.split("\n\n");
          carry = parts.pop() || "";
          for (const p of parts) {
            const trimmed = p.trim();
            if (!trimmed.startsWith("data:")) continue;
            try {
              const raw = trimmed.replace(/^data:\s*/, "").trim();
              const ev = JSON.parse(raw);
              if (isFallback) {
                if (ev.token) {
                  full += ev.token;
                  patchLast(full.replace("|||", "\n\n"));
                  take(false);
                }
              } else {
                if (ev.t === "text") {
                  full += ev.v;
                  patchLast(full.replace("|||", "\n\n"));
                  take(false);
                } else if (ev.t === "tool") {
                  const res = runTool(ev.name, ev.args, navigate);
                  if (res.navigated && res.explain) followUp = true;
                } else if (ev.t === "error") {
                  full += ev.v;
                  patchLast(full);
                  say(ev.v);
                }
              }
            } catch {}
          }
        }
        take(true);
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
        if (e?.name !== "AbortError") {
          patchLast("Oops, connection problem. Malli try chey boss.");
        }
      }
    },
    [getToken, navigate]
  );

  const toggleMic = () => {
    if (listening) {
      stopMic.current?.();
      return;
    }
    speaker.current?.stop();
    const stop = startListening(
      LANGS[langIdx][0],
      (t) => setInput(t),
      (t) => {
        setInput("");
        send(t);
      },
      () => setListening(false)
    );
    if (!stop) {
      alert("Ee browser lo voice input support ledu, Chrome vaadu.");
      return;
    }
    stopMic.current = stop;
    setListening(true);
  };

  return (
    <section
      data-agent-ignore
      className="grid h-full min-h-[580px] w-full grid-cols-1 bg-[#0a0a0f] text-zinc-100 md:grid-cols-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
    >
      {/* LEFT: 3D face */}
      <div className="relative h-full min-h-[340px] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#3b0a45_0%,#0a0a0f_75%)] flex items-center justify-center">
        <Avatar3D getLevel={() => speaker.current?.level() ?? 0} />
        
        {/* Floating Top Badge */}
        <div className="absolute left-5 top-5 z-20 flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-violet-950/80 border border-violet-500/40 text-[11px] font-mono tracking-widest text-violet-300 backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            DAS 3D AGENT
          </div>
        </div>

        {/* Audio State Badge */}
        <div
          className={`absolute bottom-5 left-5 z-20 flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md ${
            speaking ? "text-pink-300 border-pink-500/40" : "text-zinc-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              speaking
                ? "animate-pulse bg-pink-400"
                : listening
                ? "animate-ping bg-violet-400"
                : "bg-emerald-500"
            }`}
          />
          {speaking ? "speaking" : listening ? "listening" : "online"}
        </div>

        {/* Activation Modal when not awake */}
        {!awake && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]">
            <div className="text-center space-y-4 max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-mono">
                <span>⚡ Interactive Voice & 3D Avatar</span>
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
                <span>🚀 Wake up DAS</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: chat */}
      <div className="flex h-full min-h-0 flex-col border-t border-white/10 md:border-t-0 md:border-l bg-[#0d0e15]">
        {/* Messages Scroll Area */}
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
              {/* Quick Prompt Chips */}
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
            className="h-10 w-11 shrink-0 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-violet-300 border border-white/10 transition-colors"
            title="Switch Spoken Language"
          >
            {LANGS[langIdx][1]}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!awake}
            placeholder={awake ? "Ask DAS anything, or tap the mic…" : "Click 'Wake up DAS' to begin…"}
            className="h-10 flex-1 rounded-full bg-white/5 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500 border border-white/5 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleMic}
            disabled={!awake}
            className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              listening
                ? "animate-pulse bg-pink-600 text-white shadow-[0_0_20px_#db2777]"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            } disabled:opacity-50`}
            aria-label="Microphone"
          >
            🎤
          </button>
        </form>
      </div>
    </section>
  );
}

export { AgentLayout };
