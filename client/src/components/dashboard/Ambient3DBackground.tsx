import React from "react";

interface Ambient3DBackgroundProps {
  className?: string;
}

/**
 * Clean Deep Dark-Blue Cybernetic Backdrop
 * Replaces legacy 3D background shader motions so the 3D JARVIS AI Voice Agent
 * serves as the primary interactive 3D centerpiece on the Main Dashboard.
 */
export const Ambient3DBackground: React.FC<Ambient3DBackgroundProps> = ({ className = "" }) => {
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#060a16] ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(15, 37, 87, 0.42) 0%, rgba(8, 15, 34, 0.85) 55%, rgba(5, 8, 18, 1) 100%)",
        }}
      />
    </div>
  );
};

export default Ambient3DBackground;
