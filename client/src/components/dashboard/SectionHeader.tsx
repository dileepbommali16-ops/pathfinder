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
    badge: "border-[#9CE5E0]/30 bg-[#9CE5E0]/10 text-[#9CE5E0] shadow-[0_0_12px_rgba(156,229,224,0.18)]",
    icon: "bg-[#B8A1FF]/15 text-[#B8A1FF] border-[#B8A1FF]/30",
    titleTint: "text-[#E5E1EF]",
    line: "from-[#B8A1FF]/30 via-[#9CE5E0]/10 to-transparent",
  },
  purple: {
    badge: "border-[#9CE5E0]/30 bg-[#9CE5E0]/10 text-[#9CE5E0] shadow-[0_0_12px_rgba(156,229,224,0.18)]",
    icon: "bg-[#B8A1FF]/15 text-[#B8A1FF] border-[#B8A1FF]/30",
    titleTint: "text-[#E5E1EF]",
    line: "from-[#B8A1FF]/30 via-[#9CE5E0]/10 to-transparent",
  },
  cyan: {
    badge: "border-[#9CE5E0]/30 bg-[#9CE5E0]/10 text-[#9CE5E0] shadow-[0_0_12px_rgba(156,229,224,0.18)]",
    icon: "bg-[#B8A1FF]/15 text-[#B8A1FF] border-[#B8A1FF]/30",
    titleTint: "text-[#E5E1EF]",
    line: "from-[#B8A1FF]/30 via-[#9CE5E0]/10 to-transparent",
  },
  amber: {
    badge: "border-[#9CE5E0]/30 bg-[#9CE5E0]/10 text-[#9CE5E0] shadow-[0_0_12px_rgba(156,229,224,0.18)]",
    icon: "bg-[#B8A1FF]/15 text-[#B8A1FF] border-[#B8A1FF]/30",
    titleTint: "text-[#E5E1EF]",
    line: "from-[#B8A1FF]/30 via-[#9CE5E0]/10 to-transparent",
  },
  blue: {
    badge: "border-[#9CE5E0]/30 bg-[#9CE5E0]/10 text-[#9CE5E0] shadow-[0_0_12px_rgba(156,229,224,0.18)]",
    icon: "bg-[#B8A1FF]/15 text-[#B8A1FF] border-[#B8A1FF]/30",
    titleTint: "text-[#E5E1EF]",
    line: "from-[#B8A1FF]/30 via-[#9CE5E0]/10 to-transparent",
  },
  rose: {
    badge: "border-[#9CE5E0]/30 bg-[#9CE5E0]/10 text-[#9CE5E0] shadow-[0_0_12px_rgba(156,229,224,0.18)]",
    icon: "bg-[#B8A1FF]/15 text-[#B8A1FF] border-[#B8A1FF]/30",
    titleTint: "text-[#E5E1EF]",
    line: "from-[#B8A1FF]/30 via-[#9CE5E0]/10 to-transparent",
  },
  accent: {
    badge: "border-[#9CE5E0]/30 bg-[#9CE5E0]/10 text-[#9CE5E0] shadow-[0_0_12px_rgba(156,229,224,0.18)]",
    icon: "bg-[#B8A1FF]/15 text-[#B8A1FF] border-[#B8A1FF]/30",
    titleTint: "text-[#E5E1EF]",
    line: "from-[#B8A1FF]/30 via-[#9CE5E0]/10 to-transparent",
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
              <h2 className={`text-lg sm:text-xl font-semibold tracking-tight ${styles.titleTint}`}>{title}</h2>
              {badge && (
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles.badge}`}>
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#B9B5C7] leading-relaxed">{description}</p>
          </div>
        </div>

        {(action || helperLabel || onAskCoach) && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {helperLabel && (
              <span className="text-[11px] font-medium text-[#B9B5C7] bg-white/[0.02] border border-[#2A2A30] px-2.5 py-1 rounded-lg">
                ℹ️ {helperLabel}
              </span>
            )}
            {onAskCoach && (
              <button
                type="button"
                onClick={() => onAskCoach(`Can you explain the '${title}' section? What is this showing and what should I do here?`)}
                className="flex items-center gap-1.5 rounded-lg border border-[#B8A1FF]/30 bg-[#B8A1FF]/10 px-2.5 py-1 text-[11px] font-semibold text-[#9CE5E0] hover:bg-[#B8A1FF]/20 hover:border-[#B8A1FF] transition-all active:scale-95 shadow-sm"
              >
                <Sparkles className="h-3 w-3 text-[#B8A1FF]" />
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
