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

/** Full-height slide: left = 3D face, right = chat + typing + mic.
 *  Usage: <AgentLayout getToken={() => localStorage.getItem("token")} /> */
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
        const r = await fetch(`${API}/agent/chat`, {
          method: "POST",
          signal: ac.signal,
          headers: {
            "Content-Type": "application/json",
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          body: JSON.stringify({ messages: history, page: snapshot() }),
        });
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
            if (!p.startsWith("data:")) continue;
            try {
              const ev = JSON.parse(p.slice(5));
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
      className="grid h-[100dvh] w-full grid-cols-1 bg-[#0a0a0f] text-zinc-100 md:grid-cols-2"
    >
      {/* LEFT: 3D face */}
      <div className="relative min-h-[40vh] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#3b0a45_0%,#0a0a0f_70%)]">
        <Avatar3D getLevel={() => speaker.current?.level() ?? 0} />
        <div className="absolute left-4 top-4 text-xs font-mono tracking-[0.3em] text-violet-300/70">
          DAS AGENT
        </div>
        <div
          className={`absolute bottom-4 left-4 flex items-center gap-2 text-xs ${
            speaking ? "text-pink-300" : "text-zinc-500"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              speaking
                ? "animate-pulse bg-pink-400"
                : listening
                ? "animate-ping bg-violet-400"
                : "bg-zinc-600"
            }`}
          />
          {speaking ? "speaking" : listening ? "listening" : "online"}
        </div>
        {!awake && (
          <button
            onClick={wake}
            className="absolute inset-0 m-auto h-14 w-56 rounded-full bg-violet-600 font-medium text-white shadow-[0_0_40px_#7c3aed] transition-all hover:bg-violet-500 hover:scale-105 active:scale-95 cursor-pointer z-20"
          >
            Wake up DAS
          </button>
        )}
      </div>

      {/* RIGHT: chat */}
      <div className="flex min-h-0 flex-col border-l border-white/10">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {msgs.length === 0 && awake && (
            <div className="text-center text-sm text-zinc-500 mt-10">
              DAS is awake and listening. Speak or type a query!
            </div>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-violet-600/80 text-white"
                  : "bg-white/5 text-zinc-200 border border-white/5"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form
          className="flex items-center gap-2 border-t border-white/10 p-3"
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
            className="h-10 w-10 rounded-full bg-white/5 text-xs font-semibold hover:bg-white/10 transition-colors text-violet-300"
            title="Voice language"
          >
            {LANGS[langIdx][1]}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!awake}
            placeholder={awake ? "Type or tap the mic…" : "Mundu Wake up DAS nokku"}
            className="h-10 flex-1 rounded-full bg-white/5 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleMic}
            disabled={!awake}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              listening
                ? "animate-pulse bg-pink-600 text-white"
                : "bg-violet-600 hover:bg-violet-500 text-white"
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
