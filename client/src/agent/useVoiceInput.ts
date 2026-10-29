import { useState, useRef, useCallback, useEffect } from "react";

export interface UseVoiceInputOptions {
  lang?: string;
  onInterim?: (transcript: string) => void;
  onFinal?: (transcript: string) => void;
  onError?: (errorMsg: string) => void;
}

export function useVoiceInput({
  lang = "en-IN",
  onInterim,
  onFinal,
  onError,
}: UseVoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.("Voice input requires Chrome or Edge browser with Web Speech API support.");
      return false;
    }

    // Request microphone access explicitly first so browser prompts permission cleanly
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release raw stream immediately so SpeechRecognition can bind to mic
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        onError?.("Microphone access denied. Please allow microphone permission in browser settings.");
        return false;
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
        if (event.error && event.error !== "no-speech" && event.error !== "aborted") {
          onError?.(`Microphone notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
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
      onError?.("Could not start voice recognition.");
      return false;
    }
  }, [lang, onInterim, onFinal, onError]);

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
    startListening,
    stopListening,
    toggleListening,
  };
}

export default useVoiceInput;

