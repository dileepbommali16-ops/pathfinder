import React from "react";
import { Sparkles } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description: string;
  badge?: string;
  accent?: "emerald" | "purple" | "cyan" | "amber" | "blue" | "rose" | "accent";
  icon?: React.ElementType;
  helperLabel?: string;
  action?: React.ReactNode;
  onAskCoach?: (query: string) => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  icon: Icon,
  helperLabel,
  action,
  onAskCoach,
}) => {
  return (
    <div className="mb-6 border-b border-[#1F1F23] pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#242429] bg-[#0C0C0E]">
              <Icon className="h-4 w-4 text-[#FAFAFA]" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#FAFAFA] sm:text-xl">
                {title}
              </h2>
              {badge && (
                <span className="rounded border border-[#27272A] bg-[#111114] px-2 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA] tabular-nums">
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        {(action || helperLabel || onAskCoach) && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {helperLabel && (
              <span className="inline-flex items-center rounded-md border border-[#1F1F23] bg-[#0C0C0E] px-2.5 py-1 font-mono text-[11px] text-[#71717A]">
                {helperLabel}
              </span>
            )}
            {onAskCoach && (
              <button
                type="button"
                onClick={() =>
                  onAskCoach(
                    `Can you explain the '${title}' section? What is this showing and what should I do here?`
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#0C0C0E] px-2.5 text-[11px] font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
              >
                <Sparkles className="h-3 w-3 text-[#A1A1AA]" />
                <span>Ask DAS</span>
              </button>
            )}
            {action}
          </div>
        )}
      </div>
    </div>
  );
};
