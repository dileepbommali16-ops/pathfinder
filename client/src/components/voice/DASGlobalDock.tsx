/**
 * DASGlobalDock.tsx - Website-Wide Floating DAS AI Voice Assistant
 * Mounted ONCE at the application root outside the router outlet.
 * Never unmounts across route/page transitions.
 * Supports:
 * - Collapsible floating orb & expanded glassmorphic studio
 * - Responsive from 375px mobile to 4K desktop
 * - Real-time state indicators (idle, listening, thinking, speaking)
 * - Language selection (Auto, English, Telugu, Hindi)
 * - Mute, Stop Speech, New Conversation, and Clear buttons
 * - Quick topic prompt pills
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Sparkles,
  Send,
  X,
  ChevronDown,
  RotateCcw,
  Trash2,
  Globe,
  Radio,
  Layers,
  ArrowRight,
  Bot,
} from "lucide-react";
import { useDASVoice } from "@/contexts/DASVoiceContext";

export const DASGlobalDock: React.FC = () => {
  const {
    sessionId,
    messages,
    mode,
    language,
    isMuted,
    isOpen,
    interimTranscript,
    currentSpokenText,
    pageContext,
    setLanguage,
    setIsMuted,
    setIsOpen,
    toggleMicrophone,
    cancelSpeech,
    sendMessage,
    newConversation,
    clearHistory,
  } = useDASVoice();

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat log
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, interimTranscript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <>
      {/* 1. COLLAPSED FLOATING ORB (Always visible when dock is closed) */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2"
        >
          {/* Ongoing Spoken Hint Toast if DAS is speaking while collapsed */}
          {mode === "speaking" && currentSpokenText && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden sm:flex max-w-[280px] items-center gap-2 rounded-2xl border border-cyan-500/30 bg-[#11131c]/95 px-3.5 py-2 text-xs text-white shadow-xl backdrop-blur-md"
            >
              <Radio className="h-4 w-4 text-cyan-400 animate-pulse shrink-0" />
              <p className="truncate text-[11px] text-[#94a3b8]">{currentSpokenText}</p>
            </motion.div>
          )}

          <motion.button
            type="button"
            onClick={() => setIsOpen(true)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border shadow-2xl backdrop-blur-xl cursor-pointer transition-all ${
              mode === "listening"
                ? "border-rose-500 bg-rose-950/80 text-rose-300 ring-4 ring-rose-500/20"
                : mode === "thinking"
                ? "border-amber-400 bg-amber-950/80 text-amber-300 ring-4 ring-amber-400/20"
                : mode === "speaking"
                ? "border-cyan-400 bg-cyan-950/80 text-cyan-300 ring-4 ring-cyan-400/30"
                : "border-cyan-500/40 bg-[#11131c]/90 text-cyan-400 hover:border-cyan-400"
            }`}
            title="Open DAS AI Placement Coach"
          >
            {/* Ambient Pulsing Glow Rings */}
            {mode === "speaking" && (
              <span className="absolute inset-0 rounded-full bg-cyan-400 opacity-25 animate-ping" />
            )}
            {mode === "listening" && (
              <span className="absolute inset-0 rounded-full bg-rose-500 opacity-30 animate-pulse" />
            )}

            <div className="relative flex flex-col items-center justify-center">
              {mode === "listening" ? (
                <Mic className="h-6 w-6 text-rose-400 animate-bounce" />
              ) : mode === "thinking" ? (
                <Sparkles className="h-6 w-6 text-amber-300 animate-spin" />
              ) : mode === "speaking" ? (
                <Radio className="h-6 w-6 text-cyan-300 animate-pulse" />
              ) : (
                <Bot className="h-6 w-6 text-cyan-400" />
              )}
              <span className="text-[9px] font-bold tracking-tight uppercase mt-0.5">
                {mode === "listening" ? "Listening" : mode === "speaking" ? "Speaking" : "DAS AI"}
              </span>
            </div>
          </motion.button>
        </motion.div>
      )}

      {/* 2. EXPANDED FULL VOICE PANEL (Fixed right/bottom glassmorphic overlay) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 flex flex-col w-[calc(100vw-24px)] sm:w-[440px] h-[580px] max-h-[85vh] rounded-3xl border border-white/10 bg-[#0a0b10]/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#11131c]/60">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-md">
                  D
                  {mode === "speaking" && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#f8fafc] tracking-wide flex items-center gap-1.5">
                    DAS AI Voice Coach
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 font-mono">
                      Persistent
                    </span>
                  </h3>
                  <p className="text-[10px] text-[#94a3b8] truncate max-w-[180px]">
                    {pageContext.pageTitle ? pageContext.pageTitle.split("·")[0] : "Dashboard"}
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1">
                {/* Language Switch */}
                <select
                  aria-label="Select Language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#161926] px-2 py-1 text-[10px] text-[#94a3b8] focus:text-white focus:outline-none"
                >
                  <option value="auto">🌐 Auto</option>
                  <option value="en">English</option>
                  <option value="te">తెలుగు</option>
                  <option value="hi">हिंदी</option>
                </select>

                {/* Mute Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-lg border border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title={isMuted ? "Unmute Voice" : "Mute Voice"}
                >
                  {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>

                {/* New Conversation Button */}
                <button
                  type="button"
                  onClick={newConversation}
                  className="p-1.5 rounded-lg border border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title="Start New Conversation"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                {/* Clear History Button */}
                <button
                  type="button"
                  onClick={clearHistory}
                  className="p-1.5 rounded-lg border border-white/10 text-[#94a3b8] hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                  title="Clear Chat History"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Minimize / Close */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg border border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-1"
                  title="Minimize to Floating Orb"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Live Spoken Caption Bar (when speaking) */}
            {mode === "speaking" && currentSpokenText && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/20 bg-cyan-950/30 text-xs text-cyan-200">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <p className="truncate text-[11px] font-mono">{currentSpokenText}</p>
                </div>
                <button
                  type="button"
                  onClick={cancelSpeech}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 text-[10px] text-rose-300 hover:bg-rose-900/50 cursor-pointer shrink-0"
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                  Stop
                </button>
              </div>
            )}

            {/* Chat Transcript Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-[#f8fafc]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 items-start ${m.role === "user" ? "justify-end" : ""}`}
                >
                  {m.role === "assistant" && (
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 text-slate-950 text-[10px] font-bold">
                      D
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-3 max-w-[85%] leading-relaxed ${
                      m.role === "user"
                        ? "bg-cyan-500 text-slate-950 font-medium rounded-tr-sm shadow-md"
                        : "bg-[#161926] border border-white/10 text-[#f8fafc] rounded-tl-sm shadow-md"
                    }`}
                  >
                    <p className="whitespace-pre-line text-xs">{m.display || m.content}</p>
                    <span className="block text-[9px] text-[#94a3b8] text-right mt-1 opacity-70">
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Interim Real-time speech input */}
              {mode === "listening" && interimTranscript && (
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-rose-950/40 border border-rose-500/30 text-rose-200 p-2.5 text-xs italic">
                    {interimTranscript}...
                  </div>
                </div>
              )}

              {/* Thinking Indicator */}
              {mode === "thinking" && (
                <div className="flex items-center gap-2 text-xs text-amber-300">
                  <Sparkles className="h-4 w-4 animate-spin text-amber-400" />
                  <span>DAS is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-3 py-1.5 border-t border-white/5 bg-[#11131c]/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => handleQuickPrompt("How to build projects step by step?")}
                className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-950/40 text-[10px] text-[#94a3b8] hover:text-cyan-300 transition-all shrink-0 cursor-pointer"
              >
                🛠️ Build Projects
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt("Why should students use Pathfinder in the real world?")}
                className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-950/40 text-[10px] text-[#94a3b8] hover:text-cyan-300 transition-all shrink-0 cursor-pointer"
              >
                🎯 Why Pathfinder?
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt("Explain all components of Pathfinder")}
                className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-950/40 text-[10px] text-[#94a3b8] hover:text-cyan-300 transition-all shrink-0 cursor-pointer"
              >
                ⚡ All Components
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt("What is the 6-week DSA roadmap?")}
                className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-950/40 text-[10px] text-[#94a3b8] hover:text-cyan-300 transition-all shrink-0 cursor-pointer"
              >
                📚 DSA Roadmap
              </button>
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-white/10 bg-[#11131c]/80 flex flex-col gap-2">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                {/* Microphone Button */}
                <button
                  type="button"
                  onClick={toggleMicrophone}
                  className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer ${
                    mode === "listening"
                      ? "border-rose-500 bg-rose-500 text-white animate-pulse"
                      : "border-cyan-500/30 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950"
                  }`}
                  title={mode === "listening" ? "Click to stop listening" : "Click to speak with microphone"}
                >
                  {mode === "listening" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                {/* Text Field */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    mode === "listening"
                      ? "🔴 Listening... Speak into microphone..."
                      : "Ask DAS about cutoffs, roadmaps, or projects..."
                  }
                  className="flex-1 rounded-xl border border-white/10 bg-[#161926] px-3.5 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-cyan-500/60 transition-all"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="h-10 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>

              {/* Status Hint */}
              <div className="flex items-center justify-between text-[10px] text-[#94a3b8] px-1 font-mono">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      mode === "listening"
                        ? "bg-rose-400 animate-ping"
                        : mode === "speaking"
                        ? "bg-cyan-400 animate-pulse"
                        : "bg-emerald-400"
                    }`}
                  />
                  {mode === "listening"
                    ? "Microphone Active"
                    : mode === "speaking"
                    ? "Playing Speech"
                    : "Ready"}
                </span>
                <span>Active Page: {pageContext.activeTab || "overview"}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
