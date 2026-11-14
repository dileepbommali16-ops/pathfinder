import React from "react";

interface Ambient3DBackgroundProps {
  className?: string;
  activeTab?: string;
}

/**
 * Subtle Translucent 3D Backdrop Filter
 * Never covers the singleton 3D Face Agent (#das-singleton-avatar at z-[1]),
 * keeping DAS visible calmly behind EVERY dashboard slide and modal.
 */
export const Ambient3DBackground: React.FC<Ambient3DBackgroundProps> = ({ className = "" }) => {
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-transparent ${className}`}
      aria-hidden="true"
    >
      <div className="absolute -top-28 left-1/2 h-[380px] w-[580px] -translate-x-1/2 rounded-full bg-cyan-500/[0.045] blur-[110px]" />
      <div className="absolute bottom-0 right-1/4 h-[260px] w-[420px] rounded-full bg-indigo-500/[0.04] blur-[110px]" />
    </div>
  );
};

export default Ambient3DBackground;
