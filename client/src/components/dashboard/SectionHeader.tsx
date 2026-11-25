import React from "react";

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
  helperLabel,
  action,
  onAskCoach,
}) => {
  return (
    <div className="mb-6 border-b border-[#222226] pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              className="text-xl font-semibold tracking-[-0.025em] text-[#FAFAFA] sm:text-2xl"
              style={{ textWrap: "balance" }}
            >
              {title}
            </h2>
            {badge && (
              <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA] tabular-nums">
                {badge}
              </span>
            )}
          </div>
          <p
            className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#A1A1AA] sm:text-sm"
            style={{ textWrap: "pretty" }}
          >
            {description}
          </p>
        </div>

        {(action || helperLabel || onAskCoach) && (
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {helperLabel && (
              <span className="inline-flex h-9 items-center rounded-lg border border-[#1F1F23] bg-[#0C0C0E] px-3 font-mono text-[11px] text-[#71717A]">
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
                className="inline-flex h-9 items-center rounded-lg border border-[#27272A] bg-[#101014] px-3.5 text-xs font-medium text-[#FAFAFA] transition-colors duration-150 hover:border-[#3F3F46] hover:bg-[#18181B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAFAFA]"
              >
                Ask DAS
              </button>
            )}
            {action}
          </div>
        )}
      </div>
    </div>
  );
};
