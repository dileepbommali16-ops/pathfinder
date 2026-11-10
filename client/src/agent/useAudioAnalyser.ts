import { useEffect, useRef, useState, useCallback } from "react";
import { audioEngine, speaker as globalSpeaker, Speaker } from "./audioIO";

/**
 * useAudioAnalyser
 * Calculates real-time speech frequency energy at 60 FPS
 * and computes mouthOpen value (0 to 1) for natural 3D avatar lip-sync.
 */
export function useAudioAnalyser(_getToken?: () => string | null) {
  const mouthOpenRef = useRef<number>(0);
  const energyRef = useRef<number>(0);
  const speakerRef = useRef<Speaker>(globalSpeaker);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    speakerRef.current = globalSpeaker;
    const prevHandler = globalSpeaker.onState;
    globalSpeaker.onState = (speakingState: boolean) => {
      setIsSpeaking(speakingState);
      prevHandler?.(speakingState);
    };
    return () => {
      if (globalSpeaker.onState !== prevHandler) {
        globalSpeaker.onState = prevHandler;
      }
    };
  }, []);

  useEffect(() => {
    let animId: number;
    const dataArray = new Uint8Array(128);

    const updateAudioMetrics = () => {
      const activeAnalyser = audioEngine.analyser || globalSpeaker.analyser;
      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(dataArray);

        // Human voice fundamental & vowel frequencies (bins 2 to 40)
        let sum = 0;
        const voiceBins = 38;
        for (let i = 2; i < 2 + voiceBins; i++) {
          sum += dataArray[i];
        }
        const avg = sum / voiceBins;
        const normalized = Math.min(1, Math.max(0, (avg - 12) / 110));

        // Smooth interpolation for natural lip-sync
        mouthOpenRef.current += (normalized - mouthOpenRef.current) * 0.35;
        energyRef.current = normalized;
      } else {
        const fallbackLevel = globalSpeaker.level();
        if (fallbackLevel > 0) {
          mouthOpenRef.current += (fallbackLevel - mouthOpenRef.current) * 0.35;
          energyRef.current = fallbackLevel;
        } else {
          mouthOpenRef.current *= 0.85;
          energyRef.current *= 0.85;
        }
      }
      animId = requestAnimationFrame(updateAudioMetrics);
    };

    animId = requestAnimationFrame(updateAudioMetrics);
    return () => cancelAnimationFrame(animId);
  }, []);

  const getAudioLevel = useCallback((): number => {
    return mouthOpenRef.current > 0.01 ? mouthOpenRef.current : globalSpeaker.level();
  }, []);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    globalSpeaker.say(text);
  }, []);

  const stopSpeaking = useCallback(() => {
    globalSpeaker.stop();
    setIsSpeaking(false);
  }, []);

  return {
    mouthOpenRef,
    energyRef,
    speakerRef,
    isSpeaking,
    getAudioLevel,
    speak,
    stopSpeaking,
  };
}

export default useAudioAnalyser;
