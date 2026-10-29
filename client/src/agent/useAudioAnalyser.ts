import { useRef, useState, useCallback, useEffect } from "react";
import { Speaker } from "./audioIO";

export function useAudioAnalyser(getToken: () => string | null) {
  const speakerRef = useRef<Speaker | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const syntheticSpeechUntil = useRef<number>(0);

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
   * Includes a natural syllabic cadence fallback if audio is playing via Web Speech synthesis
   * or during active speech state so the avatar mouth never stays frozen while speaking.
   */
  const getAudioLevel = useCallback((): number => {
    const rawLevel = speakerRef.current?.level() ?? 0;
    if (rawLevel > 0.008) {
      return rawLevel;
    }
    const now = performance.now();
    if (isSpeaking || now < syntheticSpeechUntil.current) {
      // Natural syllabic envelope (4Hz + 9Hz modulation) when speaking
      const t = now * 0.001;
      const syllable =
        Math.max(0, Math.sin(t * 14.0) * 0.6 + Math.sin(t * 23.0) * 0.4) * 0.22;
      return syllable;
    }
    return 0;
  }, [isSpeaking]);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    // Estimate speech duration (~65ms per character) to guarantee lip-sync window
    const durationMs = Math.min(12000, Math.max(1200, text.trim().length * 62));
    syntheticSpeechUntil.current = Math.max(
      syntheticSpeechUntil.current,
      performance.now() + durationMs
    );
    speakerRef.current?.say(text);

    // Clear speaking indicator when estimated duration finishes if WebAudio resolved early
    setTimeout(() => {
      if (performance.now() >= syntheticSpeechUntil.current && (speakerRef.current?.level() ?? 0) < 0.01) {
        setIsSpeaking(false);
      }
    }, durationMs + 150);
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

