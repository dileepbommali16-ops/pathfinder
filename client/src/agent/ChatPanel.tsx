/**
 * ChatPanel - Right interactive panel for DAS AI Agent
 * Handles:
 * - Spoken & typed transcript display
 * - Mic 16kHz toggle with active audio animation
 * - "Wake up DAS" button for browser autoplay unlock
 * - Text prompt submission
 * File: client/src/agent/ChatPanel.tsx
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { AgentMessage } from "./agentSocket";

interface ChatPanelProps {
  messages: AgentMessage[];
  isRecording: boolean;
  isConnected: boolean;
  role: string;
  isOwner: boolean;
  stage?: "idle" | "listening" | "thinking" | "speaking";
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  onWakeUpAudio: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isRecording,
  isConnected,
  role,
  isOwner,
  stage = "idle",
  onSendMessage,
  onToggleMic,
  onWakeUpAudio,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/95 text-slate-100 backdrop-blur-xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-900/40 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              DAS AI Voice Agent
              {isOwner && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  BOSS
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              {isConnected
                ? isOwner
                  ? "Connected • Ready for your command, Boss"
                  : "Connected • English / Telugu / Hindi"
                : "Connecting to Gemini Live..."}
            </p>
          </div>
        </div>

        {/* Audio Wake Up Button */}
        <button
          onClick={onWakeUpAudio}
          data-agent-id="wake-up-das"
          title="Click once to enable browser audio autoplay"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-all hover:scale-105"
        >
          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Wake up DAS</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-medium text-slate-200">
              {isOwner
                ? "“Hi boss, I'm your DAS agent, how can I assist you?”"
                : "“Hello sir, I'm your DAS agent, how can I assist you?”"}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Tap the microphone to speak in English, Telugu, or Hindi, or type your query below.
            </p>

            <div className="grid grid-cols-1 gap-2 w-full max-w-sm pt-4">
              {[
                "Explain the 23 placement blueprints",
                "How does my ATS resume score calculate?",
                "What are the top skills for SDE roles in 2026?",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(suggestion)}
                  className="text-left text-xs px-3.5 py-2.5 rounded-lg bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/30 text-slate-300 transition-all flex items-center justify-between group"
                >
                  <span>{suggestion}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${
                m.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                  m.sender === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-indigo-400 border border-indigo-500/30"
                }`}
              >
                {m.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                  m.sender === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-slate-900/90 text-slate-200 border border-indigo-900/30 rounded-tl-none"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input / Control Bar */}
      <div className="p-4 border-t border-indigo-900/30 bg-slate-900/50">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          {/* Big Mic Button - 3-State Animations: Red (Listening), Blue (Thinking), Green (Speaking) */}
          <button
            type="button"
            onClick={onToggleMic}
            data-agent-id="mic-toggle-btn"
            title={
              isRecording || stage === "listening"
                ? "Stop listening (User speaking - Red)"
                : stage === "thinking"
                ? "DAS is thinking... (Blue)"
                : stage === "speaking"
                ? "DAS is speaking... (Green)"
                : "Start speaking"
            }
            className={`relative p-3 rounded-xl flex items-center justify-center transition-all ${
              isRecording || stage === "listening"
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/50 ring-4 ring-rose-500/30 scale-105 animate-pulse"
                : stage === "thinking"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50 ring-4 ring-cyan-500/30 scale-105 animate-pulse"
                : stage === "speaking"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 ring-4 ring-emerald-500/30 scale-105 animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-indigo-500/50"
            }`}
          >
            {isRecording || stage === "listening" ? (
              <>
                <Mic className="w-5 h-5 animate-pulse text-white" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
              </>
            ) : stage === "thinking" ? (
              <>
                <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              </>
            ) : stage === "speaking" ? (
              <>
                <Volume2 className="w-5 h-5 animate-bounce text-white" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              </>
            ) : (
              <Mic className="w-5 h-5 text-indigo-400" />
            )}
          </button>

          {/* Typing Box */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isRecording
                ? "Listening live (16kHz PCM)..."
                : "Ask about placement predictions, blueprints, or ATS..."
            }
            data-agent-id="agent-chat-input"
            className="flex-1 bg-slate-900/90 border border-indigo-900/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            data-agent-id="agent-send-btn"
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-all shadow-md shadow-indigo-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
