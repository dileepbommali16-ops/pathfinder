/**
 * Unified Voice Session State Machine & Controller (client/src/voice/useVoiceSession.ts)
 * Pathfinder DAS Real-Time Voice Architecture.
 * Implements:
 * 1. State machine: idle -> connecting -> listening -> thinking -> speaking -> error
 * 2. WebSocket gateway to /ws/voice with automatic reconnection
 * 3. Text pipeline fallback (/api/voice/chat)
 * 4. Central stopAll() with immediate audio cut-off and neutral mouth reset (<150ms)
 * 5. AudioContext unlock on first user interaction
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { AudioQueuePlayer } from "./audio/player";
import { MicrophoneCapture } from "./audio/mic";
import { EchoGateManager } from "./echo";

export type VoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface MessageTurn {
  role: "user" | "assistant";
  content: string;
  spokenSummary?: string;
  screenDetails?: string;
  provider?: string;
  timestamp: string;
}

export interface UseVoiceSessionOptions {
  onTranscript?: (text: string) => void;
  language?: string;
  autoSpeak?: boolean;
}

export function useVoiceSession(options: UseVoiceSessionOptions = {}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<MessageTurn[]>([]);
  const [currentSentence, setCurrentSentence] = useState<string>(
    "Hi sir, I'm your Pathfinder AI agent, how can I help you?"
  );
  const [activeProvider, setActiveProvider] = useState<string>("Gemini Live");
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [feedbackHint, setFeedbackHint] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<AudioQueuePlayer | null>(null);
  const micRef = useRef<MicrophoneCapture | null>(null);
  const echoRef = useRef<EchoGateManager | null>(null);
  const fullReplyRef = useRef<string>("");
  const autoSpeakRef = useRef<boolean>(options.autoSpeak ?? true);
  autoSpeakRef.current = options.autoSpeak ?? true;
  const greetingRef = useRef<string>("Hi sir, I'm your Pathfinder AI agent, how can I help you?");
  const hasSpokenGreetingRef = useRef<boolean>(false);

  /**
   * Browser SpeechSynthesis fallback for sentence-by-sentence audio
   */
  const speakSentences = useCallback((sentences: string[]) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setState("idle");
      return;
    }

    window.speechSynthesis.cancel();
    setState("speaking");

    let idx = 0;
    const playNext = () => {
      if (idx >= sentences.length) {
        setState("idle");
        return;
      }

      const text = sentences[idx++];
      setCurrentSentence(text);
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 0.95; // Confident male pitch

      const voices = window.speechSynthesis.getVoices();
      const maleVoice = voices.find(
        (v) =>
          (v.name.includes("Guy") ||
            v.name.includes("David") ||
            v.name.includes("Prabhat") ||
            v.name.includes("Christopher") ||
            v.name.includes("Male")) &&
          (v.lang.startsWith("en") || v.lang.includes("IN"))
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (maleVoice) utter.voice = maleVoice;

      utter.onend = playNext;
      utter.onerror = () => {
        setState("idle");
      };

      window.speechSynthesis.speak(utter);
    };

    playNext();
  }, []);

  /**
   * Central Stop Command
   * Stops audio, mic capture, and speech synthesis within <150ms.
   */
  const stopAll = useCallback(() => {
    // 1. Stop PCM audio queue player
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stopAll();
    }
    // 2. Stop browser speech synthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    // 3. Stop mic capture
    if (micRef.current) {
      micRef.current.stop();
      setIsMicActive(false);
    }
    // 4. Notify backend
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
    }
    fullReplyRef.current = "";
    setState("idle");
  }, []);

  // Browser Audio Unlock & Spoken Greeting on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.resumeContext().catch(() => {});
      }
      if (!hasSpokenGreetingRef.current && autoSpeakRef.current && greetingRef.current) {
        hasSpokenGreetingRef.current = true;
        speakSentences([greetingRef.current]);
      }
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [speakSentences]);

  // Initialize Audio Player & Echo Manager
  useEffect(() => {
    const player = new AudioQueuePlayer(() => {
      setState("idle");
    });
    audioPlayerRef.current = player;

    const echo = new EchoGateManager({
      onBargeIn: () => {
        stopAll();
        setState("listening");
      },
      onHeadphonesHint: () => {
        setFeedbackHint("For the best voice experience without feedback, please use headphones.");
      },
    });
    echoRef.current = echo;

    // Connect to WebSocket gateway
    connectWebSocket();

    return () => {
      stopAll();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Sync agent speaking state with Echo Manager
  useEffect(() => {
    if (echoRef.current) {
      echoRef.current.setAgentSpeaking(state === "speaking");
    }
  }, [state]);

  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/voice`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[useVoiceSession] Connected to /ws/voice");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "agent_greeting") {
            const greeting = data.text || "Hi sir, I'm your Pathfinder AI agent, how can I help you?";
            greetingRef.current = greeting;
            setCurrentSentence(greeting);
            if (data.provider) setActiveProvider(data.provider);
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: greeting,
                spokenSummary: greeting,
                provider: data.provider || "Gemini Live (Puck)",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
            if (autoSpeakRef.current && !hasSpokenGreetingRef.current) {
              hasSpokenGreetingRef.current = true;
              speakSentences([greeting]);
            }
          }

          if (data.type === "state_change") {
            setState(data.state);
          }

          if (data.type === "text_delta") {
            fullReplyRef.current += data.delta;
            setCurrentSentence((prev) => prev + data.delta);
          }

          if (data.type === "audio_chunk" && data.audio_base64) {
            if (autoSpeakRef.current && audioPlayerRef.current) {
              setState("speaking");
              audioPlayerRef.current.enqueuePCMChunk(data.audio_base64);
            }
          }

          if (data.type === "interrupted") {
            stopAll();
          }

          if (data.type === "turn_response") {
            const spoken = data.spoken_summary || "";
            const screen = data.screen_details || "";
            if (data.provider) setActiveProvider(data.provider);
            setCurrentSentence(spoken);

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: screen || spoken,
                spokenSummary: spoken,
                screenDetails: screen,
                provider: data.provider,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);

            // If sentences provided and autoSpeak enabled without Live audio, play with speech synthesis
            if (autoSpeakRef.current && data.sentences && data.sentences.length > 0) {
              speakSentences(data.sentences);
            } else {
              setState("idle");
            }
          }

          if (data.type === "turn_complete") {
            if (fullReplyRef.current) {
              const fullText = fullReplyRef.current;
              fullReplyRef.current = "";
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: fullText,
                  spokenSummary: fullText,
                  provider: activeProvider,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]);
            }
            if (!audioPlayerRef.current?.isPlaying) {
              setState("idle");
            }
          }
        } catch (e) {
          console.warn("[useVoiceSession] Message parsing error:", e);
        }
      };

      ws.onerror = () => {
        console.warn("[useVoiceSession] WebSocket error, operating in HTTP fallback mode.");
      };

      ws.onclose = () => {
        // Attempt soft reconnect after 3 seconds
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 3000);
      };
    } catch (e) {
      console.warn("[useVoiceSession] Could not initialize WebSocket:", e);
    }
  }, []);



  /**
   * Sends a user query (text or transcribed voice)
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Unlock AudioContext on click
      if (audioPlayerRef.current) {
        await audioPlayerRef.current.resumeContext();
      }

      // Check for voice command shortcuts
      const lower = text.toLowerCase().trim();
      if (lower === "stop" || lower === "shut up") {
        stopAll();
        return;
      }

      // Add to local message list
      const userTurn: MessageTurn = {
        role: "user",
        content: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, userTurn]);
      setState("thinking");

      // Send via WebSocket if open
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "user_text",
            text: text.trim(),
            language: options.language || "auto",
          })
        );
      } else {
        // Fallback to HTTP POST /api/voice/chat
        try {
          const resp = await fetch("/api/voice/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: text.trim(),
              language: options.language || "auto",
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            const spoken = data.spoken_summary || "";
            const screen = data.screen_details || "";
            if (data.provider) setActiveProvider(data.provider);
            setCurrentSentence(spoken);

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: screen || spoken,
                spokenSummary: spoken,
                screenDetails: screen,
                provider: data.provider,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);

            if (autoSpeakRef.current && data.sentences) {
              speakSentences(data.sentences);
            } else {
              setState("idle");
            }
          }
        } catch {
          setState("error");
        }
      }
    },
    [options.language, stopAll]
  );

  /**
   * Toggles microphone recording
   */
  const toggleMicrophone = useCallback(async () => {
    if (isMicActive) {
      if (micRef.current) micRef.current.stop();
      setIsMicActive(false);
      setState("idle");
      return;
    }

    // Unlock AudioContext
    if (audioPlayerRef.current) {
      await audioPlayerRef.current.resumeContext();
    }

    const mic = new MicrophoneCapture({
      onAudioChunk: (base64Chunk) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "user_mic_chunk",
              audio_base64: base64Chunk,
            })
          );
        }
      },
      onError: () => {
        setIsMicActive(false);
        setState("idle");
      },
    });

    micRef.current = mic;
    const started = await mic.start();
    if (started) {
      setIsMicActive(true);
      setState("listening");
    }
  }, [isMicActive]);

  return {
    state,
    messages,
    currentSentence,
    activeProvider,
    isMicActive,
    feedbackHint,
    audioAnalyser: audioPlayerRef.current?.analyserNode || null,
    sendMessage,
    toggleMicrophone,
    stopAll,
    clearMessages: () => setMessages([]),
    dismissFeedbackHint: () => setFeedbackHint(null),
  };
}
