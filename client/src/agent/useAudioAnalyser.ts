import { useRef, useState, useCallback, useEffect } from "react";
import { Speaker, speaker as globalSpeaker } from "./audioIO";

export function useAudioAnalyser(_getToken?: () => string | null) {
  const speakerRef = useRef<Speaker>(globalSpeaker);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const syntheticSpeechUntil = useRef<number>(0);

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

  /**
   * Real-time volume level (0.0 to ~0.35) measured from ElevenLabs PCM waveform / AnalyserNode.
   * Falls back to natural syllabic cadence during speech synthesis so avatar mouth never freezes.
   */
  const getAudioLevel = useCallback((): number => {
    const rawLevel = globalSpeaker.level();
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
    globalSpeaker.say(text);
  }, []);

  const stopSpeaking = useCallback(() => {
    syntheticSpeechUntil.current = 0;
    globalSpeaker.stop();
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
