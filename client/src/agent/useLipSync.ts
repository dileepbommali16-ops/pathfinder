/**
 * useLipSync - Real-time audio RMS level & frequency mapping to VRM mouth blend shapes
 * File: client/src/agent/useLipSync.ts
 */

import { useEffect, useRef } from "react";
import type { VRM } from "@pixiv/three-vrm";
import { speaker } from "./audioIO";

export function useLipSync(
  vrmRef: React.MutableRefObject<VRM | null>,
  analyserRef: React.MutableRefObject<AnalyserNode | null>,
  getLevel?: () => number
) {
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const dataArray = new Uint8Array(64);

    const updateLipSync = () => {
      const vrm = vrmRef.current;
      const analyser = analyserRef.current;

      if (vrm) {
        // Compute RMS level (0..~0.3)
        const rms = getLevel ? getLevel() : speaker.level();

        if (rms > 0.02) {
          // Calculate vowel distribution from frequency if analyser is active
          let lowSum = 0.5;
          let midSum = 0.3;
          if (analyser) {
            analyser.getByteFrequencyData(dataArray);
            lowSum = (dataArray[1] + dataArray[2] + dataArray[3]) / (3 * 255);
            midSum = (dataArray[5] + dataArray[6] + dataArray[7]) / (3 * 255);
          }

          const aaVal = Math.min(1.0, Math.max(0, rms * 3.8 * (lowSum + 0.3)));
          const ihVal = Math.min(0.7, Math.max(0, rms * 2.5 * (midSum + 0.2)));
          const ouVal = Math.min(0.6, Math.max(0, rms * 2.0));

          vrm.expressionManager?.setValue("aa", aaVal);
          vrm.expressionManager?.setValue("ih", ihVal);
          vrm.expressionManager?.setValue("ou", ouVal);
        } else {
          // Smooth decay to neutral closed lips
          const curAa = vrm.expressionManager?.getValue("aa") || 0;
          const curIh = vrm.expressionManager?.getValue("ih") || 0;
          const curOu = vrm.expressionManager?.getValue("ou") || 0;

          vrm.expressionManager?.setValue("aa", curAa * 0.7);
          vrm.expressionManager?.setValue("ih", curIh * 0.7);
          vrm.expressionManager?.setValue("ou", curOu * 0.7);
        }
      }

      animFrameRef.current = requestAnimationFrame(updateLipSync);
    };

    animFrameRef.current = requestAnimationFrame(updateLipSync);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (vrmRef.current) {
        vrmRef.current.expressionManager?.setValue("aa", 0);
        vrmRef.current.expressionManager?.setValue("ih", 0);
        vrmRef.current.expressionManager?.setValue("ou", 0);
      }
    };
  }, [vrmRef, analyserRef]);
}
