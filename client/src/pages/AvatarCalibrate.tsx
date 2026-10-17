import React, { useState, useRef, useEffect } from "react";
import defaultLandmarks from "@/avatar/landmarks.json";

interface Point {
  x: number;
  y: number;
}

export const AvatarCalibrate: React.FC = () => {
  const [landmarks, setLandmarks] = useState<Record<string, Point>>({
    ...defaultLandmarks.landmarks,
  });
  const [selectedKey, setSelectedKey] = useState<string>("mouth_inner_center");
  const [copied, setCopied] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const keys = Object.keys(landmarks);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !selectedKey) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setLandmarks((prev) => ({
      ...prev,
      [selectedKey]: { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) },
    }));
  };

  const copyJson = () => {
    const jsonStr = JSON.stringify(
      {
        imageWidth: 287,
        imageHeight: 346,
        landmarks,
      },
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07080f] text-white p-6 flex flex-col items-center">
      <div className="max-w-4xl w-full">
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse" />
              Avatar Landmark Calibration Tool
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Click a landmark key below, then click on the face image to fine-tune its position.
            </p>
          </div>
          <button
            onClick={copyJson}
            className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold hover:bg-violet-500 transition-colors cursor-pointer"
          >
            {copied ? "✓ Copied JSON!" : "Copy landmarks.json"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Landmark Key Selector */}
          <div className="rounded-xl border border-white/10 bg-[#0d0e17] p-4 flex flex-col gap-2">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Select Landmark to Place:
            </h2>
            <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
              {keys.map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKey(k)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    selectedKey === k
                      ? "bg-violet-600 text-white shadow-sm font-bold"
                      : "bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  <span>{k}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    ({landmarks[k].x}, {landmarks[k].y})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Face Canvas */}
          <div className="md:col-span-2 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0a0b12] p-6">
            <div
              ref={containerRef}
              onClick={handleImageClick}
              className="relative cursor-crosshair rounded-xl overflow-hidden border border-violet-500/30 shadow-2xl"
              style={{ width: "287px", height: "346px" }}
            >
              <img
                ref={imgRef}
                src="/avatar/mentor.webp"
                alt="Mentor calibration"
                className="w-full h-full object-cover select-none pointer-events-none"
              />

              {/* Render Landmark Dots */}
              {keys.map((k) => {
                const pt = landmarks[k];
                const isSelected = selectedKey === k;
                return (
                  <div
                    key={k}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-transform pointer-events-none ${
                      isSelected
                        ? "h-4 w-4 bg-yellow-400 border-white ring-2 ring-violet-500 scale-125 z-20"
                        : "h-2.5 w-2.5 bg-red-500 border-white/80 z-10"
                    }`}
                    style={{
                      left: `${pt.x * 100}%`,
                      top: `${pt.y * 100}%`,
                    }}
                    title={`${k} (${pt.x}, ${pt.y})`}
                  />
                );
              })}
            </div>
            <div className="mt-4 text-[11px] text-zinc-400">
              Active: <span className="font-bold text-yellow-400">{selectedKey}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarCalibrate;
