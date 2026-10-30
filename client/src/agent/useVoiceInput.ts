import { useState, useRef, useCallback, useEffect } from "react";

export interface UseVoiceInputOptions {
  lang?: string;
  onInterim?: (transcript: string) => void;
  onFinal?: (transcript: string) => void;
  onError?: (errorMsg: string) => void;
}

export type MicPermissionState = "prompt" | "granted" | "denied" | "unsupported" | "unknown";

export function useVoiceInput({
  lang = "en-IN",
  onInterim,
  onFinal,
  onError,
}: UseVoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unknown");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Pre-warm AudioContext on first user gesture so Web Audio never blocks TTS
  const ensureAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    audioContextRef.current = new AC();
    return audioContextRef.current;
  }, []);

  const startListening = useCallback(async () => {
    ensureAudioContext();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicPermission("unsupported");
      onError?.("Voice input requires Chrome or Edge browser with Web Speech API support.");
      return false;
    }

    // Check microphone permission without consuming the stream
    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
        setMicPermission(perm.state);
        if (perm.state === "denied") {
          onError?.("Microphone permission denied. Please enable it in browser settings and refresh.");
          return false;
        }
      } catch {
        // Permission API not fully supported, proceed anyway
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      finalTranscriptRef.current = "";
      setTranscript("");
      setMicPermission("granted");

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += piece;
          } else {
            interim += piece;
          }
        }
        const combined = (finalTranscriptRef.current + interim).trim();
        setTranscript(combined);
        onInterim?.(combined);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMicPermission("denied");
          onError?.("Microphone access denied. Click the lock icon in the address bar and allow microphone.");
        } else if (event.error === "no-speech") {
          // Normal silence, not an error
        } else if (event.error === "aborted") {
          // User stopped it
        } else {
          onError?.(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        const finalClean = finalTranscriptRef.current.trim();
        if (finalClean) {
          onFinal?.(finalClean);
          finalTranscriptRef.current = "";
        }
      };

      recognition.start();
      return true;
    } catch (e) {
      setIsListening(false);
      onError?.("Could not start voice recognition. Try refreshing the page.");
      return false;
    }
  }, [lang, onInterim, onFinal, onError, ensureAudioContext]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    micPermission,
    startListening,
    stopListening,
    toggleListening,
    ensureAudioContext,
  };
}

export default useVoiceInput;

