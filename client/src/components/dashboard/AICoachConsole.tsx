import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  Copy,
  Check,
  User,
  Lightbulb,
  CornerDownLeft,
  Loader2
} from "lucide-react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AICoachConsoleProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  isLoading: boolean;
  targetRole: string;
}

const PROMPT_SUGGESTIONS = [
  "How can I raise my placement chance above 85%?",
  "Top 5 DSA patterns asked in campus rounds",
  "STAR framework story for 'Describe a challenging bug'",
  "What projects stand out most for an SDE placement?",
  "Can you guide me in Telugu / English mix?",
];

export const AICoachConsole: React.FC<AICoachConsoleProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isLoading,
  targetRole,
}) => {
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="relative flex h-[680px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-1 ring-white/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">AI Placement Coach</h2>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                Gemini 3.5
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Personalized for target: <span className="font-semibold text-emerald-300">{targetRole}</span>
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-red-500/40 hover:text-red-300"
            title="Clear chat history"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">How can I guide your preparation today?</h3>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              Ask about campus eligibility cutoffs, high-yield DSA patterns, system design, or STAR behavioral interview answers.
            </p>

            {/* Starter Suggestion Chips */}
            <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
              {PROMPT_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(s)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 hover:shadow-[0_0_12px_rgba(16,185,129,0.18)] active:scale-95"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`group relative max-w-[82%] rounded-2xl px-4.5 py-3 text-xs sm:text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-tr-none bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-950/40"
                    : "rounded-tl-none border border-white/[0.08] bg-slate-950/70 text-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-xl"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(m.content, idx)}
                    className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 text-slate-400 hover:text-white"
                    title="Copy advice"
                  >
                    {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-slate-300">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-slate-950/80 px-4 py-3 text-xs text-slate-400 shadow-md">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Gemini AI is crafting structured guidance...</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="border-t border-white/[0.06] bg-black/20 p-4">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a placement question (e.g. 'How to solve two pointers?', 'STAR answer for conflict')..."
            className="w-full rounded-2xl border border-white/[0.08] bg-slate-950/80 py-3.5 pl-4 pr-12 text-xs font-medium text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
