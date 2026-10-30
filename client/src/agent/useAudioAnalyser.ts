import { useRef, useState, useCallback, useEffect } from "react";
import { Speaker } from "./audioIO";

export function useAudioAnalyser(getToken: () => string | null) {
  const speakerRef = useRef<Speaker | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const syntheticSpeechUntil = useRef<number>(0);
  const speakQueue = useRef<string[]>([]);
  const isProcessing = useRef(false);

  useEffect(() => {
    const sp = new Speaker(getToken, (speakingState: boolean) => {
      setIsSpeaking(speakingState);
    });
    sp.onState = (speakingState: boolean) => {
      setIsSpeaking(speakingState);
    };
    speakerRef.current = sp;
    return () => {
      sp.stop();
    };
  }, [getToken]);

  /**
   * Real-time volume level (0.0 to ~0.35) measured from Web Audio API AnalyserNode.
   * Falls back to syllabic cadence during Web Speech synthesis so avatar mouth never freezes.
   */
  const getAudioLevel = useCallback((): number => {
    const rawLevel = speakerRef.current?.level() ?? 0;
    if (rawLevel > 0.008) {
      return rawLevel;
    }
    const now = performance.now();
    if (isSpeaking || now < syntheticSpeechUntil.current) {
      // Natural syllabic envelope for lip-sync during synthesis playback
      const t = now * 0.001;
      const syllable =
        Math.max(0, Math.sin(t * 14.0) * 0.6 + Math.sin(t * 23.0) * 0.4) * 0.22;
      return syllable;
    }
    return 0;
  }, [isSpeaking]);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    // Shorter estimated duration for faster lip-sync response (~50ms per char)
    const durationMs = Math.min(8000, Math.max(800, text.trim().length * 50));
    syntheticSpeechUntil.current = Math.max(
      syntheticSpeechUntil.current,
      performance.now() + durationMs
    );
    speakerRef.current?.say(text);

    // Clear speaking indicator when estimated duration finishes
    setTimeout(() => {
      if (performance.now() >= syntheticSpeechUntil.current && (speakerRef.current?.level() ?? 0) < 0.01) {
        setIsSpeaking(false);
      }
    }, durationMs + 100);
  }, []);

  const stopSpeaking = useCallback(() => {
    syntheticSpeechUntil.current = 0;
    speakerRef.current?.stop();
    speakQueue.current = [];
    isProcessing.current = false;
    setIsSpeaking(false);
  }, []);

  return {
    speakerRef,
    isSpeaking,
    getAudioLevel,
    speak,
    stopSpeaking,
  };
}

export default useAudioAnalyser;

