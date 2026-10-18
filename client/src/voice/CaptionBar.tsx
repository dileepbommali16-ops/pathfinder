/**
 * CaptionBar.tsx: Live 2-line subtitle banner with "View full answer" slide-over trigger.
 */

import React from "react";
import { FileText, ChevronRight } from "lucide-react";

export interface CaptionBarProps {
  currentSentence: string;
  hasFullAnswer: boolean;
  messageCount: number;
  onOpenFullAnswer: () => void;
}

export const CaptionBar: React.FC<CaptionBarProps> = ({
  currentSentence,
  hasFullAnswer,
  messageCount,
  onOpenFullAnswer,
}) => {
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-2 px-4">
      {/* 2-Line Subtitle Banner */}
      <div className="w-full min-h-[44px] flex items-center justify-center text-center">
        <p className="text-xs sm:text-sm font-medium text-cyan-100 line-clamp-2 leading-relaxed tracking-wide transition-opacity duration-200">
          {currentSentence || "Hi sir, I'm your Pathfinder AI agent, how can I help you?"}
        </p>
      </div>

      {/* "View Full Answer" Chip */}
      {hasFullAnswer && (
        <button
          type="button"
          onClick={onOpenFullAnswer}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 transition-all active:scale-95 shadow-md group cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>View full answer & code</span>
          <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300 font-bold">
            {messageCount}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
