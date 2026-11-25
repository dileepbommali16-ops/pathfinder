import React, { useId } from "react";

interface PathfinderLogoProps {
  size?: number;
  className?: string;
  showPulse?: boolean;
  variant?: "brand" | "monochrome" | "studio";
}

/**
 * Unified Pathfinder 2.0 geometric trajectory emblem.
 * Strictly achromatic architectural obsidian & platinum (zero neon/purple/pink).
 */
export const PathfinderLogo: React.FC<PathfinderLogoProps> = ({
  size = 40,
  className = "",
  showPulse = false,
}) => {
  const uid = useId().replace(/:/g, "");
  const arcId = `pf-arc-${uid}`;

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
          <linearGradient id={arcId} x1="8" y1="32" x2="32" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#52525B" />
            <stop offset="55%" stopColor="#A1A1AA" />
            <stop offset="100%" stopColor="#FAFAFA" />
          </linearGradient>
        </defs>

        {/* Matte obsidian architectural container with 1px zinc hairline */}
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="9"
          fill="#0C0C0E"
          stroke="#27272A"
          strokeWidth="1.25"
        />

        {/* Subtle trajectory orbit ring */}
        <circle
          cx="20"
          cy="20"
          r="12"
          stroke={`url(#${arcId})`}
          strokeWidth="1.35"
          strokeOpacity="0.65"
          strokeDasharray="44 14"
        />

        {/* Crisp platinum vector compass arrow */}
        <path
          d="M12.5 27.5L17.4 16.9L27.5 12.5L22.6 23.1L12.5 27.5Z"
          fill="#FAFAFA"
        />

        {/* Inner precision cutout */}
        <path
          d="M17.2 22.8L20 20L22.8 17.2L19.1 18.6L17.2 22.8Z"
          fill="#0C0C0E"
        />

        {/* Precision target node */}
        <circle cx="27.5" cy="12.5" r="2" fill="#FAFAFA" />
      </svg>

      {showPulse && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981] ring-2 ring-[#09090B]" />
        </span>
      )}
    </span>
  );
};

export default PathfinderLogo;
