import React, { createContext, useState, useRef, useEffect, useCallback } from 'react';

export interface DasVoiceContextType {
  audioLevel: number;
  isSpeaking: boolean;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
}

export const DasVoiceContext = createContext<DasVoiceContextType>({
  audioLevel: 0,
  isSpeaking: false,
  speakText: () => {},
  stopSpeaking: () => {},
});

export const DasVoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const intervalRef = useRef<any>(null);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setAudioLevel(0);
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;

    // Select natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        (v.name.includes("Guy") ||
          v.name.includes("David") ||
          v.name.includes("Natural") ||
          v.name.includes("Male")) &&
        v.lang.startsWith("en")
    ) || voices.find((v) => v.lang.startsWith("en"));
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setAudioLevel(0);
          setIsSpeaking(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          // Dynamic audio frequency simulation for real-time lip sync
          setAudioLevel(Math.random() * 0.75 + 0.25);
        }
      }, 90);
    };

    utterance.onend = () => {
      setAudioLevel(0);
      setIsSpeaking(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    utterance.onerror = () => {
      setAudioLevel(0);
      setIsSpeaking(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [stopSpeaking]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <DasVoiceContext.Provider value={{ audioLevel, isSpeaking, speakText, stopSpeaking }}>
      {children}
    </DasVoiceContext.Provider>
  );
};
