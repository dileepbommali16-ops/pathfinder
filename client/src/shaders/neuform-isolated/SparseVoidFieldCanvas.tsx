import React from "react";
import SphereShieldTiled, { SphereShieldTiledProps } from "../SphereShieldTiled";

export interface SparseVoidFieldCanvasProps {
  className?: string;
  speed?: number;
  brightness?: number;
  hue?: number;
  saturation?: number;
  style?: React.CSSProperties;
}

export const SparseVoidFieldCanvas: React.FC<SparseVoidFieldCanvasProps> = ({
  className = "",
  speed = 1.0,
  style,
  ...rest
}) => {
  return (
    <div className={`threeui-background sparse-void-field-mount ${className}`} style={{ width: "100%", height: "100%", ...style }}>
      <SphereShieldTiled
        speed={speed * 50}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}
        {...(rest as Record<string, unknown>)}
      />
    </div>
  );
};
