/**
 * InputBar.tsx: Clean, dedicated conversational input panel.
 * Features a text typing box, live microphone trigger, send button, and voice toggle options.
 * Enter key submits query. Audio unlocks on user click.
 */

import React, { useState } from "react";
import { Mic, MicOff, Send, Volume2, VolumeX, Shield } from "lucide-react";

export interface InputBarProps {
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  isMicActive: boolean;
  isLoading: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  disabled?: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  onToggleMic,
  isMicActive,
  isLoading,
  autoSpeak,
  onToggleAutoSpeak,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || disabled) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Privacy note */}
      <div className="flex items-center justify-between px-2 text-[11px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-cyan-500" />
          Microphone audio streams directly to AI memory; zero audio stored to disk.
        </span>
        <button
          type="button"
          onClick={onToggleAutoSpeak}
          className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          {autoSpeak ? <Volume2 className="h-3 w-3 text-cyan-400" /> : <VolumeX className="h-3 w-3" />}
          <span>{autoSpeak ? "Voice replies ON" : "Muted"}</span>
        </button>
      </div>

      {/* Input Bar Form */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 p-1.5 backdrop-blur-xl shadow-xl focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all"
      >
        {/* Microphone Toggle Button */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all shadow-md cursor-pointer ${
            isMicActive
              ? "bg-red-500 text-white animate-pulse shadow-red-500/30"
              : "bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950"
          }`}
          title={isMicActive ? "Microphone active (click to mute)" : "Click to speak aloud"}
        >
          {isMicActive ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {/* Text Input Box */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder="Ask DAS about placements, 23 project blueprints, DSA roadmap, or this website..."
          className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
          autoComplete="off"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading || disabled}
          className="flex h-10 px-4 items-center justify-center rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
