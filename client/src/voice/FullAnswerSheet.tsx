/**
 * FullAnswerSheet.tsx: Slide-over drawer with full conversation history,
 * formatted code blocks, architecture steps, and copy capabilities.
 */

import React from "react";
import { X, Copy, Check, Bot, User, Trash2 } from "lucide-react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  spokenSummary?: string;
  screenDetails?: string;
  provider?: string;
  timestamp?: string;
}

export interface FullAnswerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onClearHistory: () => void;
}

export const FullAnswerSheet: React.FC<FullAnswerSheetProps> = ({
  isOpen,
  onClose,
  messages,
  onClearHistory,
}) => {
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-[#070b14] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold text-xs shadow-md">
              DAS
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Full Answer & Architecture History</h3>
              <p className="text-[11px] text-slate-400">Code snippets, roadmap deliverables, and transcripts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearHistory}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Clear transcript history"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
              No conversational turns recorded yet.
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col gap-2 rounded-2xl p-4 border transition-all ${
                  m.role === "assistant"
                    ? "bg-slate-900/60 border-cyan-500/20 text-slate-200"
                    : "bg-slate-950/80 border-white/5 text-slate-300"
                }`}
              >
                {/* Author & Controls */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    {m.role === "assistant" ? (
                      <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                        <Bot className="h-3.5 w-3.5" />
                        DAS Coach
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-bold text-slate-300">
                        <User className="h-3.5 w-3.5" />
                        You
                      </span>
                    )}
                    {m.provider && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-400">
                        {m.provider}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(m.screenDetails || m.content, idx)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedIdx === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                {/* Spoken Audio Summary */}
                {m.spokenSummary && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200 leading-relaxed font-medium">
                    🎙️ <strong>Spoken:</strong> {m.spokenSummary}
                  </div>
                )}

                {/* Detailed Screen Content & Code */}
                <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-200">
                  {m.screenDetails || m.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
