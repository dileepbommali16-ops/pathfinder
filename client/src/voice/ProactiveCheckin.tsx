/**
 * ProactiveCheckin.tsx - Gentle, Non-Intrusive Student Progress Check-in
 * Follows Step 4 requirement:
 * "A gentle, non-intrusive prompt based on time/progress (e.g. 'haven't checked in on DSA in a while, want a quick set?')
 * -- must be easy to dismiss and not naggy."
 */

import React, { useState, useEffect } from "react";
import { Sparkles, X, ArrowRight, Clock } from "lucide-react";

interface ProactiveCheckinProps {
  onAccept: (prompt: string) => void;
  className?: string;
}

export const ProactiveCheckin: React.FC<ProactiveCheckinProps> = ({
  onAccept,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [suggestion, setSuggestion] = useState<{ topic: string; text: string } | null>(null);

  useEffect(() => {
    // Check if dismissed recently (cooldown: 4 hours)
    try {
      const lastDismissed = localStorage.getItem("pathfinder_proactive_dismissed");
      if (lastDismissed) {
        const diffHours = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60);
        if (diffHours < 4) return;
      }
    } catch {}

    // Pull student weak area / recent topic from storage or default to DSA
    const topics = [
      { topic: "DSA & Trees", text: "Haven't checked in on Binary Trees in a while, want a quick 5-minute set?" },
      { topic: "Mock Interview", text: "Ready for a 2-minute mock behavioral question for your SDE profile?" },
      { topic: "System Design", text: "It's been a few days since your last API design review. Want a quick refresher?" },
    ];

    const pick = topics[Math.floor(Math.random() * topics.length)];
    setSuggestion(pick);
    // Slight delay to appear gently after page settle
    const timer = setTimeout(() => setIsVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem("pathfinder_proactive_dismissed", Date.now().toString());
    } catch {}
  };

  const handleAccept = () => {
    if (!suggestion) return;
    setIsVisible(false);
    onAccept(`Let's do a quick session on ${suggestion.topic}: ${suggestion.text}`);
  };

  if (!isVisible || !suggestion) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-slate-900/90 px-4 py-2 text-xs shadow-lg backdrop-blur-md animate-fadeIn text-slate-200 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <p className="truncate font-medium">
          <strong className="text-cyan-300 font-semibold">{suggestion.topic}:</strong> {suggestion.text}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleAccept}
          className="flex items-center gap-1 rounded-xl bg-cyan-500/20 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 transition-all cursor-pointer"
        >
          <span>Quick Set</span>
          <ArrowRight className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
          title="Dismiss for today"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
