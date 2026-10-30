import { useRef, useState, useCallback, useEffect } from "react";
import { Speaker } from "./audioIO";

export function useAudioAnalyser(getToken: () => string | null) {
  const speakerRef = useRef<Speaker | null>(null);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const syntheticSpeechUntil = useRef<number>(0);

  // Create the Speaker instance ONCE on mount so re-renders never call sp.stop()!
  useEffect(() => {
    const sp = new Speaker(
      () => getTokenRef.current?.() ?? null,
      (speakingState: boolean) => {
        setIsSpeaking(speakingState);
      }
    );
    speakerRef.current = sp;
    return () => {
      sp.stop();
    };
  }, []);

  /**
   * Real-time volume level (0.0 to ~0.35) measured from ElevenLabs PCM waveform / AnalyserNode.
   * Falls back to natural syllabic cadence during speech synthesis so avatar mouth never freezes.
   */
  const getAudioLevel = useCallback((): number => {
    const rawLevel = speakerRef.current?.level() ?? 0;
    if (rawLevel > 0.008) {
      return rawLevel;
    }
    const now = performance.now();
    if (isSpeaking || now < syntheticSpeechUntil.current) {
      const t = now * 0.001;
      const syllable =
        Math.max(0, Math.sin(t * 14.0) * 0.6 + Math.sin(t * 23.0) * 0.4) * 0.22;
      return syllable;
    }
    return 0;
  }, [isSpeaking]);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    const durationMs = Math.min(10000, Math.max(1200, text.trim().length * 55));
    syntheticSpeechUntil.current = Math.max(
      syntheticSpeechUntil.current,
      performance.now() + durationMs
    );
    speakerRef.current?.say(text);
  }, []);

  const stopSpeaking = useCallback(() => {
    syntheticSpeechUntil.current = 0;
    speakerRef.current?.stop();
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
