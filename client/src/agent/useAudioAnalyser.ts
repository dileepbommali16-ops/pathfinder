import { useRef, useState, useCallback, useEffect } from "react";
import { Speaker, speaker as globalSpeaker } from "./audioIO";

export function useAudioAnalyser(_getToken?: () => string | null) {
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

  /**
   * Real-time volume level (0.0 to ~0.45) measured from the playing voice waveform.
   * Returns 0 when no audio is audible, so the avatar mouth never moves silently.
   */
  const getAudioLevel = useCallback((): number => globalSpeaker.level(), []);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    globalSpeaker.say(text);
  }, []);

  const stopSpeaking = useCallback(() => {
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
