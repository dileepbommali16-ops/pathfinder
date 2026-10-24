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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
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

  const fallbackUtterance = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;

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
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!text || typeof window === 'undefined') return;
    stopSpeaking();

    // 1. Try ElevenLabs server-side studio TTS
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "";
      const resp = await fetch(`${apiBase}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: "en-IN" }),
      });
      if (resp.ok && resp.headers.get("content-type")?.includes("audio")) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            setAudioLevel(Math.random() * 0.75 + 0.25);
          }, 90);
        };
        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setAudioLevel(0);
          setIsSpeaking(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          fallbackUtterance(text);
        };
        await audio.play();
        return;
      }
    } catch {
      // Fallback
    }

    fallbackUtterance(text);
  }, [stopSpeaking, fallbackUtterance]);

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
