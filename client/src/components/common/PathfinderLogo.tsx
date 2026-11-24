import React, { useId } from "react";

interface PathfinderLogoProps {
  size?: number;
  className?: string;
  showPulse?: boolean;
  variant?: "brand" | "monochrome";
}

/**
 * Unified Pathfinder 2.0 geometric trajectory emblem.
 * Shared across header, footer, auth entry, and browser favicon.
 */
export const PathfinderLogo: React.FC<PathfinderLogoProps> = ({
  size = 40,
  className = "",
  showPulse = false,
  variant = "brand",
}) => {
  const uid = useId().replace(/:/g, "");
  const frameBgId = `pf-frame-bg-${uid}`;
  const arcId = `pf-arc-${uid}`;
  const needleId = `pf-needle-${uid}`;
  const isMonochrome = variant === "monochrome";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Pathfinder logo mark"
      >
        <defs>
          <linearGradient id={frameBgId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14161b" />
            <stop offset="100%" stopColor="#07080a" />
          </linearGradient>
          <linearGradient id={arcId} x1="8" y1="32" x2="32" y2="8" gradientUnits="userSpaceOnUse">
            {isMonochrome ? (
              <>
                <stop offset="0%" stopColor="#64748B" />
                <stop offset="55%" stopColor="#CBD5E1" />
                <stop offset="100%" stopColor="#F7F8F8" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FD0053" />
                <stop offset="55%" stopColor="#FB7185" />
                <stop offset="100%" stopColor="#F7F8F8" />
              </>
            )}
          </linearGradient>
          <linearGradient id={needleId} x1="14" y1="26" x2="29" y2="11" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>

        {/* Obsidian squircle container with subtle hairline border */}
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="10"
          fill={`url(#${frameBgId})`}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1.25"
        />

        {/* Subtle trajectory orbit ring */}
        <circle
          cx="20"
          cy="20"
          r="12"
          stroke={`url(#${arcId})`}
          strokeWidth="1.4"
          strokeOpacity="0.45"
          strokeDasharray="44 14"
        />

        {/* Architectural delta/vector compass arrow */}
        <path
          d="M12.5 27.5L17.4 16.9L27.5 12.5L22.6 23.1L12.5 27.5Z"
          fill={`url(#${needleId})`}
          fillOpacity="0.95"
        />

        {/* Inner precision cutout */}
        <path
          d="M17.2 22.8L20 20L22.8 17.2L19.1 18.6L17.2 22.8Z"
          fill="#08090c"
        />

        {/* Beacon target node */}
        <circle cx="27.5" cy="12.5" r="2.2" fill={isMonochrome ? "#F7F8F8" : "#FD0053"} />
      </svg>

      {showPulse && !isMonochrome && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FD0053] opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FD0053] ring-2 ring-[#07080a]" />
        </span>
      )}
    </span>
  );
};

export default PathfinderLogo;
