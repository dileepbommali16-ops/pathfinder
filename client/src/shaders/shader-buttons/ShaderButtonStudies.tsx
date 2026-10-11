import React from "react";
import type { NeuformIsolatedEffectProps } from "../neuform-isolated/NeuformIsolatedEffects";

export type ShaderButtonStudyVariant =
  | "liquid-glass"
  | "intelligence"
  | "holo-foil"
  | "particles"
  | "voice-orb"
  | "water"
  | "dither-hold"
  | "lava-lamp"
  | "gold"
  | "ink";

export function ShaderButtonStudy(props: NeuformIsolatedEffectProps & { variant: ShaderButtonStudyVariant }) {
  return (
    <div className={`threeui-shader-button-study ${props.className || ""}`} style={props.style}>
      <span className="sr-only">{props.variant}</span>
    </div>
  );
}
