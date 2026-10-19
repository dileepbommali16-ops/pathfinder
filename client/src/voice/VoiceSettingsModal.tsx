/**
 * VoiceSettingsModal.tsx - Pathfinder DAS Customization Drawer
 * Allows users to adjust speech rate, accent preferences, wake-word toggles,
 * and persistent student parameters.
 */

import React, { useState } from "react";
import { X, Sliders, Volume2, Mic, Building2, Check, Sparkles, User, RefreshCw } from "lucide-react";
import { memoryManager, StudentMemory } from "./memory";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wakeWordEnabled: boolean;
  onToggleWakeWord: (enabled: boolean) => void;
  speechRate: number;
  onChangeSpeechRate: (rate: number) => void;
  onMemoryUpdate?: (memory: StudentMemory) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  wakeWordEnabled,
  onToggleWakeWord,
  speechRate,
  onChangeSpeechRate,
  onMemoryUpdate,
}) => {
  const [memory, setMemory] = useState<StudentMemory>(() => memoryManager.getMemory());
  const [dreamCompany, setDreamCompany] = useState(memory.dreamCompany);
  const [cgpa, setCgpa] = useState(memory.cgpa.toString());

  if (!isOpen) return null;

  const handleSave = () => {
    const parsedCgpa = parseFloat(cgpa) || memory.cgpa;
    memoryManager.updateProfile({
      dreamCompany: dreamCompany.trim() || memory.dreamCompany,
      cgpa: parsedCgpa,
    });
    const updated = memoryManager.getMemory();
    setMemory(updated);
    if (onMemoryUpdate) onMemoryUpdate(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#060b18] p-5 shadow-[0_0_50px_rgba(6,182,212,0.2)] font-mono text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-wider text-white uppercase">
              DAS Agent & Voice Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* 1. Wake Word Toggle ("Hey Pathfinder") */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3">
            <div>
              <span className="font-bold text-white block flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-cyan-400" />
                Hands-Free Wake Word ("Hey Pathfinder")
              </span>
              <span className="text-[11px] text-slate-400">
                Wakes DAS automatically when you speak "Hey Pathfinder" or "Hey DAS" without touching the mic.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onToggleWakeWord(!wakeWordEnabled)}
              className={`rounded-lg px-3 py-1.5 font-bold text-xs transition-all cursor-pointer ${
                wakeWordEnabled
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "bg-black/50 text-slate-500 border border-white/10"
              }`}
            >
              {wakeWordEnabled ? "ENABLED" : "DISABLED"}
            </button>
          </div>

          {/* 2. Voice Playback Speed */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                Voice Speed ({speechRate}x)
              </span>
              <span className="text-[10px] text-cyan-400 font-bold">Standard: 1.0x</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0.8, 1.0, 1.2, 1.4].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onChangeSpeechRate(rate)}
                  className={`rounded-lg py-1.5 text-center font-bold text-xs transition-all cursor-pointer ${
                    speechRate === rate
                      ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-sm"
                      : "bg-black/50 text-slate-400 border border-white/10 hover:text-white"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* 3. Persistent Memory: Student Profile Sync */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-cyan-400" />
              Persistent Placement Targets
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">DREAM COMPANY</label>
                <input
                  type="text"
                  value={dreamCompany}
                  onChange={(e) => setDreamCompany(e.target.value)}
                  placeholder="e.g. Google, Razorpay"
                  className="w-full rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">CURRENT CGPA</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder="e.g. 8.4"
                  className="w-full rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-cyan-500/20 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 px-4 py-1.5 text-xs font-bold text-cyan-200 hover:scale-105 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
