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
  Loader2,
  Mic,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Code2,
  Layers,
  HelpCircle,
  Square,
  RotateCcw
} from "lucide-react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AICoachConsoleProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onStopGeneration?: () => void;
  onRegenerate?: () => void;
  isLoading: boolean;
  isServerWakingUp?: boolean;
  targetRole: string;
}

const PROMPT_SUGGESTIONS = [
  "Analyze my career path 🚀",
  "Find my skill gaps",
  "Start a mock interview",
  "Create my 6-week roadmap",
  "Suggest an AI project",
  "Prepare me for placements",
  "Naku job kavali bro",
  "Why am I not getting shortlisted?",
  "Python or Java for campus drives?",
  "naaku python baaga istam"
];

const QUICK_ACTIONS = [
  { label: "🎙️ Start Mock Interview", prompt: "Let's do an interactive mock interview for my role. Ask me question 1." },
  { label: "🔍 Find My Skill Gaps", prompt: "Na skills lo gaps enti? Analyze against my target role." },
  { label: "🗺️ Build 6-Week Roadmap", prompt: "Can you create a detailed 6-week milestone roadmap for my placement preparation?" },
  { label: "📄 Review My Resume (ATS)", prompt: "Review my resume bullet points using the Google X-Y-Z formula." },
  { label: "💡 Suggest Flagship Project", prompt: "Suggest a production-grade flagship project to close my technical gaps." },
  { label: "🎯 Placement Preparation Plan", prompt: "naaku placement kosam em nerchukovali?" },
];

const MOCK_QUESTIONS = [
  {
    category: "Coding & DSA",
    prompt: "Mock Interview Question 1: Given an array of integers, how would you find the maximum subarray sum in O(n) time? Explain Kadane's algorithm.",
  },
  {
    category: "System Design",
    prompt: "Mock Interview Question 2: How would you design a URL shortener like TinyURL that handles 100M redirects/day with caching?",
  },
  {
    category: "Behavioral (STAR)",
    prompt: "Mock Interview Question 3: Tell me about a time you faced a difficult technical bug in a project and how you resolved it using the STAR method.",
  },
];

export const AICoachConsole: React.FC<AICoachConsoleProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  onStopGeneration,
  onRegenerate,
  isLoading,
  isServerWakingUp,
  targetRole,
}) => {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "interview">("chat");
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
    <div className="relative flex h-[740px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] bg-black/20 px-6 py-3.5 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500 text-slate-950 shadow-md shadow-cyan-500/25 ring-1 ring-white/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Pathfinder AI Career Coach</h2>
              <span className="flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Gemini AI Agent
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Personalized for: <span className="font-semibold text-cyan-300">{targetRole}</span> • English, తెలుగు & Roman Telugu
            </p>
          </div>
        </div>

        {/* Mode Switcher & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                mode === "chat"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Strategy Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("interview")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                mode === "interview"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Mock Interview</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 1 && !isLoading && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                title="Regenerate last response"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
            )}

            {messages.length > 0 && (
              <button
                onClick={onClearChat}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-red-500/40 hover:text-red-300"
                title="Clear chat history"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mock Interview Ribbon (When in Interview Mode) */}
      {mode === "interview" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyan-500/20 bg-cyan-950/20 px-6 py-2.5 gap-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-cyan-200">
              Live Mock Interview Simulator:
            </span>
            <span className="text-xs text-slate-300 hidden md:inline">
              Answer aloud or type your solution. The AI evaluates with STAR scoring.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {MOCK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(q.prompt)}
                disabled={isLoading}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
              >
                {q.category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/[0.04] bg-black/10 px-6 py-2.5 scrollbar-none">
        <span className="text-[11px] font-medium text-slate-500 shrink-0">Quick Actions:</span>
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(action.prompt)}
            disabled={isLoading}
            className="shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300 active:scale-95 disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">How can I guide your career today?</h3>
            <p className="mt-1 max-w-md text-xs text-slate-400 leading-relaxed">
              Talk naturally in English, Telugu script, or Roman Telugu. Ask about placement strategy, mock interviews, skill gaps, or just chat.
            </p>

            {/* Starter Suggestion Chips */}
            <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
              {PROMPT_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(s)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300 hover:shadow-[0_0_12px_rgba(6,182,212,0.18)] active:scale-95"
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500 text-slate-950 shadow-sm mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                data-message-role={m.role}
                className={`group relative max-w-[85%] rounded-2xl px-4.5 py-3 text-xs sm:text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-tr-none bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 text-white shadow-lg shadow-cyan-950/40"
                    : "rounded-tl-none border border-white/[0.08] bg-slate-950/70 text-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-xl"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.role === "assistant" && idx === messages.length - 1 && (() => {
                  const hasExplicitOptions = /options?:|suggestions?:|you can:|choose one:|which one:|\?$/i.test(m.content);
                  if (!hasExplicitOptions) return null;
                  const chips: string[] = [];
                  const lines = m.content.split("\n");
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (/^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
                      const cleaned = trimmed.replace(/^[-*•\d.]+\s+/, "").replace(/\*\*/g, "").trim();
                      if (cleaned.length > 3 && cleaned.length < 55) {
                        chips.push(cleaned);
                      }
                    }
                  }
                  if (chips.length === 0 || chips.length > 3) return null;
                  return (
                    <div className="mt-3.5 flex flex-wrap gap-2 pt-2.5 border-t border-white/[0.08]">
                      {chips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => onSendMessage(chip)}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 hover:border-cyan-400 active:scale-95 disabled:opacity-50 shadow-sm"
                        >
                          <Sparkles className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                          <span>{chip}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {m.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(m.content, idx)}
                    className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 text-slate-400 hover:text-white"
                    title="Copy response"
                  >
                    {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-cyan-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-slate-300 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-slate-950/80 px-4 py-3 text-xs text-slate-300 shadow-md">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                <span>
                  {isServerWakingUp
                    ? "Waking up the server, this can take up to a minute... Pathfinder AI will respond shortly."
                    : "Pathfinder AI is analyzing & reasoning..."}
                </span>
                <span className="flex gap-1 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
            {onStopGeneration && (
              <button
                type="button"
                onClick={onStopGeneration}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:border-rose-400 transition-all active:scale-95 shadow-sm"
              >
                <Square className="h-3 w-3 fill-rose-400 text-rose-400" />
                <span>Stop</span>
              </button>
            )}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="border-t border-white/[0.06] bg-black/20 p-4">
        <div className="relative flex items-center">
          <input
            id="chat-console-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "interview"
                ? "Type your interview answer here or ask for feedback..."
                : "Talk in English, Telugu, or Roman Telugu (e.g. 'Naku job kavali bro', 'Take my mock interview')..."
            }
            className="w-full rounded-2xl border border-white/[0.08] bg-slate-950/80 py-3.5 pl-4 pr-12 text-xs font-medium text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          />
          <button
            id="chat-console-send"
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
