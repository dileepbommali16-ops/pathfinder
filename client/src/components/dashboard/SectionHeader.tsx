import React from "react";

interface SectionHeaderProps {
  title: string;
  description: string;
  badge?: string;
  accent?: "emerald" | "purple" | "cyan" | "amber" | "blue" | "rose";
  icon?: React.ElementType;
  helperLabel?: string;
  action?: React.ReactNode;
}

const ACCENT_STYLES = {
  emerald: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.18)]",
    icon: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    titleTint: "text-white",
    line: "from-emerald-500/30 via-emerald-500/10 to-transparent",
  },
  purple: {
    badge: "border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.18)]",
    icon: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    titleTint: "text-white",
    line: "from-purple-500/30 via-purple-500/10 to-transparent",
  },
  cyan: {
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.18)]",
    icon: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    titleTint: "text-white",
    line: "from-cyan-500/30 via-cyan-500/10 to-transparent",
  },
  amber: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.18)]",
    icon: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    titleTint: "text-white",
    line: "from-amber-500/30 via-amber-500/10 to-transparent",
  },
  blue: {
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.18)]",
    icon: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    titleTint: "text-white",
    line: "from-blue-500/30 via-blue-500/10 to-transparent",
  },
  rose: {
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.18)]",
    icon: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    titleTint: "text-white",
    line: "from-rose-500/30 via-rose-500/10 to-transparent",
  },
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  accent = "cyan",
  icon: Icon,
  helperLabel,
  action,
}) => {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.cyan;

  return (
    <div className="mb-6 sm:mb-8 pb-3 border-b border-white/[0.06]">
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
            <p className="mt-0.5 text-xs sm:text-sm text-slate-400 leading-relaxed">{description}</p>
          </div>
        </div>

        {(action || helperLabel) && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {helperLabel && (
              <span className="text-[11px] font-medium text-slate-500 bg-white/[0.02] border border-white/[0.05] px-2.5 py-1 rounded-lg">
                ℹ️ {helperLabel}
              </span>
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
