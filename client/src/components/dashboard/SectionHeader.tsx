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

const ACCENT_STYLES = {
  emerald: {
    badge: "border-[#FF6B4A]/30 bg-[#FF6B4A]/10 text-[#FF6B4A] shadow-[0_0_12px_rgba(255,107,74,0.18)]",
    icon: "bg-[#FF6B4A]/15 text-[#FF6B4A] border-[#FF6B4A]/30",
    titleTint: "text-[#F2F2F3]",
    line: "from-[#FF6B4A]/30 via-[#FF6B4A]/10 to-transparent",
  },
  purple: {
    badge: "border-[#FF6B4A]/30 bg-[#FF6B4A]/10 text-[#FF6B4A] shadow-[0_0_12px_rgba(255,107,74,0.18)]",
    icon: "bg-[#FF6B4A]/15 text-[#FF6B4A] border-[#FF6B4A]/30",
    titleTint: "text-[#F2F2F3]",
    line: "from-[#FF6B4A]/30 via-[#FF6B4A]/10 to-transparent",
  },
  cyan: {
    badge: "border-[#FF6B4A]/30 bg-[#FF6B4A]/10 text-[#FF6B4A] shadow-[0_0_12px_rgba(255,107,74,0.18)]",
    icon: "bg-[#FF6B4A]/15 text-[#FF6B4A] border-[#FF6B4A]/30",
    titleTint: "text-[#F2F2F3]",
    line: "from-[#FF6B4A]/30 via-[#FF6B4A]/10 to-transparent",
  },
  amber: {
    badge: "border-[#FF6B4A]/30 bg-[#FF6B4A]/10 text-[#FF6B4A] shadow-[0_0_12px_rgba(255,107,74,0.18)]",
    icon: "bg-[#FF6B4A]/15 text-[#FF6B4A] border-[#FF6B4A]/30",
    titleTint: "text-[#F2F2F3]",
    line: "from-[#FF6B4A]/30 via-[#FF6B4A]/10 to-transparent",
  },
  blue: {
    badge: "border-[#FF6B4A]/30 bg-[#FF6B4A]/10 text-[#FF6B4A] shadow-[0_0_12px_rgba(255,107,74,0.18)]",
    icon: "bg-[#FF6B4A]/15 text-[#FF6B4A] border-[#FF6B4A]/30",
    titleTint: "text-[#F2F2F3]",
    line: "from-[#FF6B4A]/30 via-[#FF6B4A]/10 to-transparent",
  },
  rose: {
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.18)]",
    icon: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    titleTint: "text-[#F2F2F3]",
    line: "from-rose-500/30 via-rose-500/10 to-transparent",
  },
  accent: {
    badge: "border-[#FF6B4A]/30 bg-[#FF6B4A]/10 text-[#FF6B4A] shadow-[0_0_12px_rgba(255,107,74,0.18)]",
    icon: "bg-[#FF6B4A]/15 text-[#FF6B4A] border-[#FF6B4A]/30",
    titleTint: "text-[#F2F2F3]",
    line: "from-[#FF6B4A]/30 via-[#FF6B4A]/10 to-transparent",
  },
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
    <div className="mb-6 sm:mb-8 pb-3 border-b border-[#2A2A30]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${styles.icon}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className={`text-lg sm:text-xl font-bold tracking-tight ${styles.titleTint}`}>{title}</h2>
              {badge && (
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}>
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">{description}</p>
          </div>
        </div>

        {(action || helperLabel || onAskCoach) && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {helperLabel && (
              <span className="text-[11px] font-medium text-[#A1A1AA] bg-white/[0.02] border border-[#2A2A30] px-2.5 py-1 rounded-lg">
                ℹ️ {helperLabel}
              </span>
            )}
            {onAskCoach && (
              <button
                type="button"
                onClick={() => onAskCoach(`Can you explain the '${title}' section? What is this showing and what should I do here?`)}
                className="flex items-center gap-1.5 rounded-lg border border-[#FF6B4A]/30 bg-[#FF6B4A]/10 px-2.5 py-1 text-[11px] font-semibold text-[#FF6B4A] hover:bg-[#FF6B4A]/20 hover:border-[#FF8A6E] transition-all active:scale-95 shadow-sm"
              >
                <Sparkles className="h-3 w-3 text-[#FF6B4A]" />
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
