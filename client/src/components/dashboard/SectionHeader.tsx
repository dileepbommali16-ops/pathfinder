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
    <div className="mb-8 border-b border-white/[0.08] pb-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {badge && (
              <span className="rounded-md border border-white/[0.1] bg-[#121216] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA] tabular-nums">
                {badge}
              </span>
            )}
          </div>
          <h2
            className="mt-2.5 text-2xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-[28px]"
            style={{ textWrap: "balance" }}
          >
            {title}
          </h2>
          <p
            className="mt-2 max-w-2xl text-xs leading-[1.65] text-[#A1A1AA] sm:text-sm"
            style={{ textWrap: "pretty" }}
          >
            {description}
          </p>
        </div>

        {(action || helperLabel || onAskCoach) && (
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {helperLabel && (
              <span className="inline-flex h-10 items-center rounded-lg border border-white/[0.07] bg-[#0D0D11]/90 px-3.5 font-mono text-[11px] text-[#71717A]">
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
                className="pf-btn-secondary inline-flex h-10 items-center rounded-lg px-4 text-xs font-medium active:scale-[0.98]"
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
