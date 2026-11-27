import React, { useEffect, useRef, useState } from "react";

interface SpotlightSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Linear/21st.dev-inspired dark titanium surface with zero-re-render radial cursor sheen.
 */
export const SpotlightSurface: React.FC<SpotlightSurfaceProps> = ({
  children,
  className = "",
  onMouseMove,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    }
    if (onMouseMove) onMouseMove(e);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`pf-titanium-card group/spot relative overflow-hidden ${className}`}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(480px circle at var(--spot-x, 50%) var(--spot-y, 0%), rgba(255,255,255,0.055), transparent 70%)",
        }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
};

interface AnimatedMetricProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
 * Motion-Primitives numeric ticker using rAF ease-out (prefers-reduced-motion aware).
 */
export const AnimatedMetric: React.FC<AnimatedMetricProps> = ({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className = "",
}) => {
  const [display, setDisplay] = useState<number>(value);
  const prevRef = useRef<number>(value);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDisplay(value);
      return;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const from = prevRef.current === value ? 0 : prevRef.current;
    const to = value;
    const duration = 650;
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        prevRef.current = to;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
};

/**
 * Architectural silver top-light shader + faint masked coordinate grid (zero purple/pink).
 */
export const ShaderBackdrop: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${className}`}
    >
      <div
        className="h-[540px] w-full"
        style={{
          background:
            "radial-gradient(ellipse 75% 42% at 50% -6%, rgba(255,255,255,0.09), rgba(255,255,255,0.02) 48%, transparent 80%)",
        }}
      />
      <div
        className="absolute inset-0 h-[520px] opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          WebkitMaskImage: "radial-gradient(ellipse 65% 50% at 50% 0%, black 20%, transparent 78%)",
          maskImage: "radial-gradient(ellipse 65% 50% at 50% 0%, black 20%, transparent 78%)",
        }}
      />
    </div>
  );
};

export interface WorkspaceSlideItem {
  id: string;
  index: string;
  label: string;
  subtitle: string;
}

export const WORKSPACE_SLIDES: WorkspaceSlideItem[] = [
  {
    id: "overview",
    index: "01",
    label: "Overview",
    subtitle: "ML readiness probability, skill gap axes & company cutoffs",
  },
  {
    id: "resume",
    index: "02",
    label: "JD & Resume Lab",
    subtitle: "Job-description keyword alignment & Google X-Y-Z ATS audit",
  },
  {
    id: "interview",
    index: "03",
    label: "Coding & Viva Arena",
    subtitle: "11-language compiler sandbox & voice architecture defense",
  },
  {
    id: "projects",
    index: "04",
    label: "Project Blueprints",
    subtitle: "28 production software & hardware system architectures",
  },
  {
    id: "analytics",
    index: "05",
    label: "Dataset & Roadmap",
    subtitle: "972-record synthetic placement dataset (215-record public baseline) & 6-week sprint",
  },
  {
    id: "progress",
    index: "06",
    label: "My Progress",
    subtitle: "Real ML score trend, ATS scans, arena verdicts & interview scorecards",
  },
  {
    id: "profile",
    index: "07",
    label: "Profile & Settings",
    subtitle: "Academic scores, skills & target company calibration",
  },
];

interface SlideTransitionBarProps {
  activeSlideId: string;
  onSelectSlide: (slideId: any) => void;
}

export const SlideTransitionBar: React.FC<SlideTransitionBarProps> = ({
  activeSlideId,
  onSelectSlide,
}) => {
  const currentIdx = Math.max(
    0,
    WORKSPACE_SLIDES.findIndex((s) => s.id === activeSlideId)
  );
  const current = WORKSPACE_SLIDES[currentIdx] || WORKSPACE_SLIDES[0];
  const prevSlide = currentIdx > 0 ? WORKSPACE_SLIDES[currentIdx - 1] : null;
  const nextSlide =
    currentIdx < WORKSPACE_SLIDES.length - 1 ? WORKSPACE_SLIDES[currentIdx + 1] : null;

  const jump = (id: string) => {
    onSelectSlide(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      aria-label="Workspace slide pager"
      className="pf-titanium-card mt-16 flex flex-col items-center justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:px-7 sm:py-6"
    >
      <div className="w-full sm:w-auto">
        {prevSlide ? (
          <button
            type="button"
            onClick={() => jump(prevSlide.id)}
            className="pf-btn-secondary inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-xs font-medium transition-colors sm:w-auto"
          >
            Prev: {prevSlide.index} · {prevSlide.label}
          </button>
        ) : (
          <span className="inline-flex h-10 items-center font-mono text-xs text-[#8A8A92]">
            Start of {WORKSPACE_SLIDES.length}-Slide Workspace
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-[11px] text-[#A1A1AA] tabular-nums">
          Slide {current.index} of {String(WORKSPACE_SLIDES.length).padStart(2, "0")} · {current.label}
        </span>
        <div className="flex items-center gap-2">
          {WORKSPACE_SLIDES.map((s) => {
            const active = s.id === current.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${s.index}: ${s.label}`}
                onClick={() => jump(s.id)}
                className={`h-2 rounded-full transition-all duration-200 ${active ? "w-7 bg-[#FAFAFA]" : "w-2 bg-[#3F3F46] hover:bg-[#8A8A92]"
                  }`}
              />
            );
          })}
        </div>
      </div>

      <div className="w-full sm:w-auto">
        {nextSlide ? (
          <button
            type="button"
            onClick={() => jump(nextSlide.id)}
            className="pf-btn-primary inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-xs font-medium transition-colors sm:w-auto"
          >
            Next: {nextSlide.index} · {nextSlide.label}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => jump(WORKSPACE_SLIDES[0].id)}
            className="pf-btn-secondary inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-xs font-medium transition-colors sm:w-auto"
          >
            Back to Slide 01 · Overview
          </button>
        )}
      </div>
    </nav>
  );
};
