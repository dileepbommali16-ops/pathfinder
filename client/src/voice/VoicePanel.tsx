/**
 * VoicePanel.tsx: Production Studio Layout for Pathfinder DAS Voice Agent
 * Adheres strictly to the architectural layout specifications:
 * 1. Slim header with Language selector (Auto / EN / తెలుగు / हिन्दी), mute toggle, stop button, overflow menu, and real Provider badge.
 * 2. Center stage: ONLY the 3D Cybernetic Face (55-65% height), status word, live 2-line subtitles, and "View Full Answer" trigger.
 * 3. Right side: Ask me column with 8 clickable questions (collapses to horizontal chips on mobile).
 * 4. Bottom: Single unified input bar with mic trigger, text typing box, and send button.
 */

import React, { useState } from "react";
import { Bot, Volume2, VolumeX, Square, MoreVertical, Globe, RefreshCw, AlertCircle, Radio } from "lucide-react";
import { FaceAvatar } from "./avatar/FaceAvatar";
import { CaptionBar } from "./CaptionBar";
import { AskMeColumn, DEFAULT_ASK_ME_QUESTIONS } from "./AskMeColumn";
import { InputBar } from "./InputBar";
import { FullAnswerSheet } from "./FullAnswerSheet";
import { useVoiceSession } from "./useVoiceSession";
import { MicSetupModal } from "./MicSetupModal";
import { ConfirmationGate, PendingAction } from "./ConfirmationGate";
import { ProactiveCheckin } from "./ProactiveCheckin";

export interface VoicePanelProps {
  className?: string;
  onNavigateTab?: (tab: string) => void;
  onOpenResumeBuilder?: () => void;
}

export const VoicePanel: React.FC<VoicePanelProps> = ({
  className = "",
  onNavigateTab,
  onOpenResumeBuilder,
}) => {
  const [language, setLanguage] = useState<string>("auto");
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState<boolean>(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const {
    state,
    messages,
    currentSentence,
    activeProvider,
    isMicActive,
    feedbackHint,
    audioAnalyser,
    sendMessage,
    toggleMicrophone,
    stopAll,
    clearMessages,
    dismissFeedbackHint,
  } = useVoiceSession({ language, autoSpeak });

  const handleSelectPrompt = (prompt: string) => {
    // Action intent detection for Confirmation Gate
    const lower = prompt.toLowerCase();
    if (lower.includes("resume") && onOpenResumeBuilder) {
      setPendingAction({
        id: "act_resume",
        type: "open_resume_builder",
        label: "Open Resume Builder",
        description: "Agent proposed opening Pathfinder ATS Resume Builder.",
      });
    } else if (lower.includes("project") || lower.includes("blueprint")) {
      setPendingAction({
        id: "act_projects",
        type: "navigate_tab",
        label: "Navigate to Blueprints",
        description: "Agent proposed navigating to Flagship Industry Blueprints tab.",
        targetTab: "projects",
      });
    }
    sendMessage(prompt);
  };

  const handleConfirmAction = (action: PendingAction, uiToken: string) => {
    console.log(`[ConfirmationGate] Action approved with UI Token ${uiToken}:`, action);
    if (action.type === "open_resume_builder" && onOpenResumeBuilder) {
      onOpenResumeBuilder();
    } else if (action.type === "navigate_tab" && onNavigateTab && action.targetTab) {
      onNavigateTab(action.targetTab);
    }
    setPendingAction(null);
  };

  return (
    <div
      className={`relative flex h-[780px] w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#060a14] shadow-2xl backdrop-blur-2xl select-none ${className}`}
    >
      {/* 1. SLIM HEADER BAR */}
      <header className="flex items-center justify-between border-b border-white/5 bg-slate-950/70 px-4 sm:px-6 py-3 z-30 shrink-0">
        {/* Left: Branding & Dynamic Provider Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20">
            P
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-bold tracking-wide text-white">
              PATHFINDER <span className="text-cyan-400 font-mono text-xs">DAS AGENT</span>
            </h2>
            {/* Real Provider Badge */}
            <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/70 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{activeProvider}</span>
            </span>
          </div>
        </div>

        {/* Right: Controls (Language Selector, Mute, Stop, Overflow) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Selector */}
          <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-0.5">
            {[
              { id: "auto", label: "Auto" },
              { id: "en", label: "EN" },
              { id: "te", label: "తెలుగు" },
              { id: "hi", label: "हिंदी" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLanguage(item.id)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                  language === item.id
                    ? "bg-cyan-500/30 text-white border border-cyan-400/40 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Test Mic & Speaker Diagnostics Button */}
          <button
            type="button"
            onClick={() => setIsMicModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400 transition-all cursor-pointer"
            title="Open Microphone & Speaker Setup / Diagnostics"
          >
            <Radio className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Test Audio</span>
          </button>

          {/* Voice Reply Mute Toggle */}
          <button
            type="button"
            onClick={() => setAutoSpeak((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              autoSpeak
                ? "border-cyan-500/40 bg-cyan-950/60 text-cyan-300 shadow-sm"
                : "border-white/10 bg-black/40 text-slate-400 hover:text-white"
            }`}
            title={autoSpeak ? "Voice reply is ON" : "Voice reply is MUTED"}
          >
            {autoSpeak ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
            <span className="hidden sm:inline">{autoSpeak ? "Voice ON" : "Muted"}</span>
          </button>

          {/* Stop Button */}
          <button
            type="button"
            onClick={stopAll}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-600/20 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-600/30 active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Stop speaking and streams immediately"
          >
            <Square className="h-3 w-3 fill-current" />
            <span className="hidden sm:inline">Stop</span>
          </button>

          {/* Overflow Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOverflowOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isOverflowOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl z-40 space-y-1"
                onClick={() => setIsOverflowOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsSheetOpen(true)}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 text-left cursor-pointer"
                >
                  <span>View Transcript History</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMicModalOpen(true)}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 text-left cursor-pointer"
                >
                  <span>Test Mic & Speaker</span>
                </button>
                <button
                  type="button"
                  onClick={clearMessages}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 text-left cursor-pointer"
                >
                  <span>Clear Conversation</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Proactive Check-in Banner */}
      <ProactiveCheckin onAccept={(p) => sendMessage(p)} className="mx-4 mt-2 shrink-0 z-20" />

      {/* Headphone Hint Banner if Echo Detected */}
      {feedbackHint && (
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-950/40 px-6 py-2 text-xs text-amber-200 z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{feedbackHint}</span>
          </div>
          <button type="button" onClick={dismissFeedbackHint} className="text-amber-300 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Action Confirmation Gate */}
      {pendingAction && (
        <div className="mx-4 mt-2 shrink-0 z-30">
          <ConfirmationGate
            pendingAction={pendingAction}
            onConfirm={handleConfirmAction}
            onDismiss={() => setPendingAction(null)}
          />
        </div>
      )}

      {/* 2. MAIN DUAL PANE WORKSPACE */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden relative min-h-0">
        
        {/* CENTER STAGE: ONLY THE HUMAN FACE + CAPTION BANNER */}
        <section className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-0 relative overflow-hidden">
          
          {/* Ambient Lighting Ring */}
          <div className="pointer-events-none absolute h-[440px] w-[440px] rounded-full border border-cyan-500/15 bg-cyan-500/5 blur-3xl" />

          {/* Large Dead-Center 3D Avatar (55-65% height) */}
          <div className="flex items-center justify-center w-full my-auto py-2 z-10">
            <FaceAvatar
              state={state}
              spokenText={currentSentence}
              isSpeaking={state === "speaking"}
              audioAnalyser={audioAnalyser}
              width={340}
              height={420}
              className="w-full max-w-[360px] max-h-[55vh] drop-shadow-[0_20px_50px_rgba(56,189,248,0.3)]"
            />
          </div>

          {/* Status Word under Face */}
          <div className="mt-2 flex items-center gap-2 shrink-0 z-10">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                state === "speaking"
                  ? "bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20"
                  : state === "listening"
                  ? "bg-cyan-400 animate-ping ring-4 ring-cyan-400/20"
                  : state === "thinking"
                  ? "bg-amber-400 animate-spin ring-4 ring-amber-400/20"
                  : "bg-slate-500"
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {state === "speaking"
                ? "Speaking"
                : state === "listening"
                ? "Listening"
                : state === "thinking"
                ? "Thinking"
                : "Ready"}
            </span>
          </div>

          {/* Live Captions (2 Lines max) + View Full Answer Button */}
          <div className="mt-2 shrink-0 z-10 w-full flex justify-center">
            <CaptionBar
              currentSentence={currentSentence}
              hasFullAnswer={messages.length > 0}
              messageCount={messages.length}
              onOpenFullAnswer={() => setIsSheetOpen(true)}
            />
          </div>
        </section>

        {/* RIGHT SIDE: DESKTOP "ASK ME" COLUMN (6 to 8 questions) */}
        <aside className="hidden lg:flex w-72 lg:w-80 border-l border-white/5 bg-slate-950/60 p-4 flex-col shrink-0 overflow-y-auto">
          <AskMeColumn
            onSelectPrompt={handleSelectPrompt}
            disabled={state === "thinking"}
          />
        </aside>
      </div>

      {/* MOBILE HORIZONTAL CHIPS ROW (shown above input on mobile) */}
      <div className="lg:hidden flex items-center gap-1.5 px-4 py-2 border-t border-white/5 overflow-x-auto bg-slate-950/80 z-20">
        {DEFAULT_ASK_ME_QUESTIONS.slice(0, 5).map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => handleSelectPrompt(q.prompt)}
            className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-all shrink-0"
          >
            {q.title}
          </button>
        ))}
      </div>

      {/* 3. BOTTOM: UNIFIED INPUT BAR */}
      <div className="p-4 border-t border-white/10 bg-slate-950/90 z-20">
        <InputBar
          onSendMessage={sendMessage}
          onToggleMic={toggleMicrophone}
          isMicActive={isMicActive}
          isLoading={state === "thinking"}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={() => setAutoSpeak((prev) => !prev)}
        />
      </div>

      {/* Slide-over Full Answer Sheet */}
      <FullAnswerSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        messages={messages}
        onClearHistory={clearMessages}
      />

      {/* Microphone & Speaker Diagnostic Modal */}
      <MicSetupModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
      />
    </div>
  );
};
