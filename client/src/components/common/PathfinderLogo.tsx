import React, { useId } from "react";

interface PathfinderLogoProps {
  size?: number;
  className?: string;
  showPulse?: boolean;
  variant?: "brand" | "monochrome" | "studio";
}

/**
 * Pathfinder 2.0 machined isometric "P-Vector / North Prism" startup emblem.
 * Brushed dark-titanium squircle housing + 3-facet architectural monogram (zero purple/neon).
 */
export const PathfinderLogo: React.FC<PathfinderLogoProps> = ({
  size = 40,
  className = "",
  showPulse = false,
}) => {
  const uid = useId().replace(/:/g, "");
  const housingId = `pf-housing-${uid}`;
  const rimId = `pf-rim-${uid}`;
  const midId = `pf-mid-${uid}`;

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
          <linearGradient id={housingId} x1="20" y1="1" x2="20" y2="39" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16161B" />
            <stop offset="100%" stopColor="#09090C" />
          </linearGradient>
          <linearGradient id={rimId} x1="20" y1="1" x2="20" y2="39" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#52525B" />
            <stop offset="45%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#18181D" />
          </linearGradient>
          <linearGradient id={midId} x1="16" y1="22" x2="30" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#71717A" />
            <stop offset="100%" stopColor="#D4D4D8" />
          </linearGradient>
        </defs>

        {/* Machined dark titanium squircle */}
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="10"
          fill={`url(#${housingId})`}
          stroke={`url(#${rimId})`}
          strokeWidth="1.2"
        />

        {/* Top specular chamfer hairline */}
        <path
          d="M9 2.2H31"
          stroke="#FFFFFF"
          strokeOpacity="0.18"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* 3-facet architectural P-Vector prism mark */}
        <path d="M11.5 11.5L16.2 9.5V28.5L11.5 30.5V11.5Z" fill="#D4D4D8" />
        <path d="M16.2 9.5L29.5 13.8L24.8 18.6L16.2 15.8V9.5Z" fill="#FAFAFA" />
        <path
          d="M29.5 13.8V19.6L20.4 23.2L16.2 21.4L24.8 18.6L29.5 13.8Z"
          fill={`url(#${midId})`}
        />

        {/* North-east precision vector apex dot */}
        <circle cx="29.5" cy="10.5" r="1.65" fill="#FAFAFA" />
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
