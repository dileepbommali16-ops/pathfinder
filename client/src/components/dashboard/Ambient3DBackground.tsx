import React from "react";

interface Ambient3DBackgroundProps {
  className?: string;
  activeTab?: string;
}

/**
 * Clean Deep Dark Graphite Theme Fallback
 * On Dashboard ("overview" tab), the 3D Face Agent layer is the live background.
 * Other pages cleanly fall back to this quiet theme background (var(--bg-0) / #070913).
 */
export const Ambient3DBackground: React.FC<Ambient3DBackgroundProps> = ({ className = "", activeTab }) => {
  if (activeTab === "overview") {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#070913] ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(15, 23, 42, 0.42) 0%, rgba(8, 12, 24, 0.85) 55%, #070913 100%)",
        }}
      />
    </div>
  );
};

export default Ambient3DBackground;
