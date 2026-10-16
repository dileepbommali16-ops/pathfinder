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

const MONOCHROME_HEADER_STYLE = {
  badge: "border-[#ffffff]/30 bg-[#ffffff]/10 text-[#ffffff] shadow-sm",
  icon: "bg-[#11131c] text-[#ffffff] border-[rgba(255,255,255,0.08)]",
  titleTint: "text-[#f8fafc]",
  line: "from-[#ffffff]/30 via-[rgba(255,255,255,0.08)] to-transparent",
};

const ACCENT_STYLES = {
  emerald: MONOCHROME_HEADER_STYLE,
  purple: MONOCHROME_HEADER_STYLE,
  cyan: MONOCHROME_HEADER_STYLE,
  amber: MONOCHROME_HEADER_STYLE,
  blue: MONOCHROME_HEADER_STYLE,
  rose: MONOCHROME_HEADER_STYLE,
  accent: MONOCHROME_HEADER_STYLE,
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  accent = "accent",
  icon: Icon,
  helperLabel,
  action,
  onAskCoach,
}) => {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.accent;

  return (
    <div className="mb-6 sm:mb-8 pb-3 border-b border-[rgba(255,255,255,0.08)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${styles.icon}`}>
              <Icon className="h-5 w-5 text-[#ffffff]" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className={`text-lg sm:text-xl font-semibold tracking-tight ${styles.titleTint}`}>{title}</h2>
              {badge && (
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles.badge}`}>
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#94a3b8] leading-relaxed">{description}</p>
          </div>
        </div>

        {(action || helperLabel || onAskCoach) && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {helperLabel && (
              <span className="text-[11px] font-medium text-[#94a3b8] bg-[#11131c] border border-[rgba(255,255,255,0.08)] px-2.5 py-1 rounded-lg">
                ℹ️ {helperLabel}
              </span>
            )}
            {onAskCoach && (
              <button
                type="button"
                onClick={() => onAskCoach(`Can you explain the '${title}' section? What is this showing and what should I do here?`)}
                className="flex items-center gap-1.5 rounded-lg border border-[#ffffff]/30 bg-[#ffffff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#f8fafc] hover:bg-[#ffffff]/20 hover:border-[#ffffff] transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-[#ffffff]" />
                <span>Ask Coach about this</span>
              </button>
            )}
            {action}
          </div>
        )}
      </div>

      {/* Subtle Section Accent Underline */}
      <div className={`mt-3 h-[1px] w-full bg-gradient-to-r ${styles.line}`} />
    </div>
  );
};
