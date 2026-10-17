/**
 * DASRightChatPanel: Sleek Floating Right-Side Chat Interface
 * Supports Dual-Mode Interaction:
 * 1. Live Mic Speech-to-Text (Web Speech API)
 * 2. Keyboard Text Input with architectural prompt shortcuts
 */

import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, Sparkles, ShieldCheck, Cpu } from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: "user" | "das";
  text: string;
  timestamp: string;
}

interface DASRightChatPanelProps {
  messages: ChatMessage[];
  streamingText: string;
  agentState: "idle" | "listening" | "thinking" | "speaking";
  onSendMessage: (text: string) => void;
  onMicToggle: (isRecording: boolean) => void;
  isMicActive: boolean;
}

export const DASRightChatPanel: React.FC<DASRightChatPanelProps> = ({
  messages,
  streamingText,
  agentState,
  onSendMessage,
  onMicToggle,
  isMicActive
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const quickChips = [
    "Explain this slide step-by-step",
    "How does the Cognee Graph RAG work?",
    "What are the main system bottlenecks?",
    "Telugu lo explain cheppu"
  ];

  return (
    <aside className="w-full lg:w-[420px] xl:w-[460px] h-full flex flex-col bg-[#0b0f19]/85 backdrop-blur-2xl border-l border-white/10 shadow-2xl relative z-20">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0b0f19] ${
                agentState === "speaking"
                  ? "bg-emerald-400 animate-pulse"
                  : agentState === "thinking"
                  ? "bg-amber-400 animate-spin"
                  : agentState === "listening"
                  ? "bg-cyan-400 animate-ping"
                  : "bg-zinc-400"
              }`}
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              DAS Agent <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">v2.0</span>
            </h2>
            <p className="text-[11px] text-zinc-400">Senior AI Systems Architect</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ollama + Cognee</span>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
          >
            <span className="text-[10px] font-mono text-zinc-500 mb-1 px-1">
              {m.sender === "user" ? "You" : "DAS"} • {m.timestamp}
            </span>
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed ${
                m.sender === "user"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-md"
                  : "bg-white/[0.06] border border-white/10 text-zinc-200 rounded-tl-xs backdrop-blur-md"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {/* Live Streaming Assistant Output */}
        {streamingText && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-mono text-cyan-400 mb-1 px-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" /> DAS is answering...
            </span>
            <div className="max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed bg-white/[0.06] border border-cyan-500/30 text-zinc-100 rounded-tl-xs shadow-lg shadow-cyan-500/5">
              {streamingText}
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Architecture Prompt Chips */}
      <div className="px-3 py-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(chip)}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Dual Input: Live Mic Audio & Text Box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-[#070a12]/90">
        <div className="flex items-center gap-2">
          {/* Live Mic Toggle */}
          <button
            type="button"
            onClick={() => onMicToggle(!isMicActive)}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
              isMicActive
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse ring-2 ring-rose-400/30"
                : "bg-white/10 hover:bg-white/15 text-zinc-300"
            }`}
            title={isMicActive ? "Stop Live Mic" : "Start Live Mic"}
          >
            {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isMicActive ? "Listening to your voice..." : "Ask DAS about this architecture slide..."}
            className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </aside>
  );
};
