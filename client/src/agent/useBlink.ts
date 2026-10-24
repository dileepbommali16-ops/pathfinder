/**
 * useBlink - Controls natural random eye blinking for VRM Avatar
 * File: client/src/agent/useBlink.ts
 */

import { useEffect, useRef } from "react";
import type { VRM } from "@pixiv/three-vrm";

export function useBlink(vrmRef: React.MutableRefObject<VRM | null>) {
  const isBlinkingRef = useRef<boolean>(false);
  const blinkTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let animId: number;

    const triggerBlink = () => {
      if (!vrmRef.current || isBlinkingRef.current) return;
      isBlinkingRef.current = true;

      const vrm = vrmRef.current;
      const startTime = performance.now();
      const closeDuration = 60; // ms to shut eyes
      const openDuration = 90;  // ms to open eyes
      const totalDuration = closeDuration + openDuration;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        if (elapsed < closeDuration) {
          // Closing
          const val = elapsed / closeDuration;
          vrm.expressionManager?.setValue("blink", val);
          animId = requestAnimationFrame(animate);
        } else if (elapsed < totalDuration) {
          // Opening
          const val = 1.0 - (elapsed - closeDuration) / openDuration;
          vrm.expressionManager?.setValue("blink", Math.max(0, val));
          animId = requestAnimationFrame(animate);
        } else {
          // Finished blink
          vrm.expressionManager?.setValue("blink", 0);
          isBlinkingRef.current = false;
          scheduleNextBlink();
        }
      };

      animId = requestAnimationFrame(animate);
    };

    const scheduleNextBlink = () => {
      // Natural human blink interval: random between 2.5s and 5.5s
      const delay = 2500 + Math.random() * 3000;
      blinkTimerRef.current = window.setTimeout(triggerBlink, delay);
    };

    scheduleNextBlink();

    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      cancelAnimationFrame(animId);
      if (vrmRef.current) {
        vrmRef.current.expressionManager?.setValue("blink", 0);
      }
    };
  }, [vrmRef]);
}
