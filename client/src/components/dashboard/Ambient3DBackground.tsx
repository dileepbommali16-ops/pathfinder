import React from "react";

interface Ambient3DBackgroundProps {
  className?: string;
  activeTab?: string;
}

/**
 * Pure Black (#000000) 3D Backdrop Canvas
 * Keeps #das-singleton-avatar at z-[1] vivid, sharp, and unobscured behind all slides.
 */
export const Ambient3DBackground: React.FC<Ambient3DBackgroundProps> = ({ className = "" }) => {
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-transparent ${className}`}
      aria-hidden="true"
    />
  );
};

export default Ambient3DBackground;
