/**
 * Unified Voice Session State Machine & Controller (client/src/voice/useVoiceSession.ts)
 * Pathfinder DAS Real-Time Voice Architecture with Autonomous Website Control & Persistent Memory.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { AudioQueuePlayer } from "./audio/player";
import { MicrophoneCapture } from "./audio/mic";
import { EchoGateManager } from "./echo";
import { actionEngine, WebsiteActionContext, ActionResult } from "./actions";
import { memoryManager } from "./memory";

export type VoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface MessageTurn {
  role: "user" | "assistant" | "system";
  content: string;
  spokenSummary?: string;
  screenDetails?: string;
  provider?: string;
  timestamp: string;
  action?: string;
}

export interface UseVoiceSessionOptions {
  onTranscript?: (text: string) => void;
  language?: string;
  autoSpeak?: boolean;
  speechRate?: number;
  actionContext?: WebsiteActionContext;
}

export function getVoiceBackendUrls() {
  if (typeof window === "undefined") {
    return { wsUrl: "ws://127.0.0.1:8000/ws/voice", apiUrl: "http://127.0.0.1:8000/api/voice/chat" };
  }
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (isLocal) {
    return {
      wsUrl: "ws://127.0.0.1:8000/ws/voice",
      apiUrl: "http://127.0.0.1:8000/api/voice/chat",
    };
  }
  // Production / Vercel cloud environment -> directly target Render Cloud API
  const renderHost = "pathfinder-backend-klrp.onrender.com";
  return {
    wsUrl: `wss://${renderHost}/ws/voice`,
    apiUrl: `https://${renderHost}/api/voice/chat`,
  };
}

export function useVoiceSession(options: UseVoiceSessionOptions = {}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<MessageTurn[]>(() => {
    return [
      {
        role: "system",
        content: "DAS Placement Intelligence Online. Persistent memory and website control linked.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });
  const [currentSentence, setCurrentSentence] = useState<string>(
    "Hi sir, I'm your Pathfinder AI agent. Speak or tap the mic to control any part of our website."
  );
  const [activeProvider, setActiveProvider] = useState<string>("Pathfinder Knowledge Engine");
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [feedbackHint, setFeedbackHint] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>("System Initialized");

  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<AudioQueuePlayer | null>(null);
  const micRef = useRef<MicrophoneCapture | null>(null);
  const recognitionRef = useRef<any>(null);
  const echoRef = useRef<EchoGateManager | null>(null);
  const fullReplyRef = useRef<string>("");
  const autoSpeakRef = useRef<boolean>(options.autoSpeak ?? true);
  autoSpeakRef.current = options.autoSpeak ?? true;
  const languageRef = useRef<string>(options.language || "auto");
  languageRef.current = options.language || "auto";
  const speechRateRef = useRef<number>(options.speechRate || 1.0);
  speechRateRef.current = options.speechRate || 1.0;

  const greetingRef = useRef<string>("Hi sir, I'm your Pathfinder AI agent. How can I help you with your placements today?");
  const hasSpokenGreetingRef = useRef<boolean>(false);

  // References to keep utterances alive against Chromium V8 garbage collection
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const speechTranscriptRef = useRef<string>("");
  const silenceTimerRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

  /**
   * Browser SpeechSynthesis fallback for sentence-by-sentence audio
   * Hardened against Chromium V8 garbage collection bugs and queue stalls.
   */
  const speakSentences = useCallback((sentences: string[]) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setState("idle");
      return;
    }

    const cleanSentences = sentences
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (cleanSentences.length === 0) {
      setState("idle");
      return;
    }

    // Cancel previous speech and resume in case Chrome paused
    try {
      window.speechSynthesis.cancel();
    } catch {}
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    setState("speaking");
    let idx = 0;

    const playNext = () => {
      if (idx >= cleanSentences.length) {
        activeUtterancesRef.current = [];
        setState("idle");
        return;
      }

      const text = cleanSentences[idx++];
      setCurrentSentence(text);

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = speechRateRef.current || 1.0;
      utter.pitch = 0.95;
      utter.volume = 1.0;

      const isTe = languageRef.current === "te" || /[\u0C00-\u0C7F]/.test(text);
      if (isTe) {
        utter.lang = "te-IN";
      } else {
        utter.lang = "en-US";
      }

      const voices = window.speechSynthesis.getVoices();
      if (isTe) {
        const teluguVoice = voices.find((v) => v.lang.includes("te") || v.lang.includes("IN"));
        if (teluguVoice) utter.voice = teluguVoice;
      } else {
        const maleVoice = voices.find(
          (v) =>
            (v.name.includes("Guy") ||
              v.name.includes("David") ||
              v.name.includes("Prabhat") ||
              v.name.includes("Christopher") ||
              v.name.includes("Natural") ||
              v.name.includes("Male")) &&
            (v.lang.startsWith("en") || v.lang.includes("IN"))
        ) || voices.find((v) => v.lang.startsWith("en"));
        if (maleVoice) utter.voice = maleVoice;
      }

      // Retain utterance in ref so V8 does not GC it
      activeUtterancesRef.current = [utter];

      utter.onend = () => {
        playNext();
      };
      utter.onerror = (e) => {
        console.warn("[useVoiceSession] Utterance error:", e);
        playNext();
      };

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utter);
    };

    // 40ms micro-delay prevents Chromium cancel-and-speak conflict
    setTimeout(() => {
      playNext();
    }, 40);
  }, []);

  /**
   * Central Stop Command
   * Stops audio, mic capture, and speech synthesis within <100ms.
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
    activeUtterancesRef.current = [];

    // 3. Clear silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // 4. Stop mic capture and speech recognition
    isListeningRef.current = false;
    speechTranscriptRef.current = "";
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setInterimTranscript("");
    if (micRef.current) {
      micRef.current.stop();
      setIsMicActive(false);
    }
    // 5. Notify backend
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
    }
    fullReplyRef.current = "";
    setState("idle");
  }, []);

  // Browser Audio Unlock on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.resumeContext().catch(() => {});
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.resume();
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

  // Connect to WebSocket gateway
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
      const { wsUrl } = getVoiceBackendUrls();
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
                provider: data.provider || "Pathfinder Knowledge Engine",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
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

            const sentencesToSpeak =
              data.sentences && data.sentences.length > 0
                ? data.sentences
                : spoken
                ? [spoken]
                : [];

            if (autoSpeakRef.current && sentencesToSpeak.length > 0) {
              speakSentences(sentencesToSpeak);
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
        console.warn("[useVoiceSession] WebSocket error, operating in fallback mode.");
      };

      ws.onclose = () => {
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 3000);
      };
    } catch (e) {
      console.warn("[useVoiceSession] Could not initialize WebSocket:", e);
    }
  }, [speakSentences]);

  /**
   * Sends a user query (text or transcribed voice)
   * Autonomous Action Engine intercepts website control actions.
   */
  const sendMessage = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      // Unlock AudioContext and SpeechSynthesis on interaction
      if (audioPlayerRef.current) {
        await audioPlayerRef.current.resumeContext();
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }

      // Check for voice command shortcuts
      const lower = clean.toLowerCase();
      if (lower === "stop" || lower === "shut up" || lower === "quiet") {
        stopAll();
        return;
      }

      // Record user turn in Activity Log
      const userTurn: MessageTurn = {
        role: "user",
        content: clean,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, userTurn]);

      // 1. AUTONOMOUS WEBSITE ACTION ENGINE CHECK
      if (options.actionContext) {
        const actionResult = actionEngine.executeCommand(clean, options.actionContext);
        if (actionResult && actionResult.handled) {
          setLastAction(actionResult.actionType);
          const actionTurn: MessageTurn = {
            role: "assistant",
            content: actionResult.feedbackText,
            spokenSummary: actionResult.spokenFeedback,
            action: actionResult.actionType,
            provider: "Autonomous Action Dispatcher",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, actionTurn]);
          setCurrentSentence(actionResult.spokenFeedback || actionResult.feedbackText);

          if (autoSpeakRef.current && actionResult.spokenFeedback) {
            speakSentences([actionResult.spokenFeedback]);
          } else {
            setState("idle");
          }
          return;
        }
      }

      // 2. KNOWLEDGE ENGINE / GEMINI LIVE RELAY
      setState("thinking");

      // Send via WebSocket if open
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "user_text",
            text: clean,
            language: languageRef.current,
          })
        );
      } else {
        // Fallback to HTTP POST /api/voice/chat or /api/chat
        try {
          const { apiUrl } = getVoiceBackendUrls();
          let resp = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: clean,
              message: clean,
              language: languageRef.current,
            }),
          });

          // Secondary fallback to /api/chat if /api/voice/chat fails
          if (!resp.ok) {
            resp = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: clean,
                message: clean,
                language: languageRef.current,
              }),
            });
          }

          if (resp.ok) {
            const data = await resp.json();
            const spoken = data.spoken_summary || data.spoken || data.reply || "";
            const screen = data.screen_details || data.display || spoken;
            if (data.provider) setActiveProvider(data.provider);
            setCurrentSentence(spoken);

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: screen || spoken,
                spokenSummary: spoken,
                screenDetails: screen,
                provider: data.provider || "Pathfinder Autonomous Core",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);

            const sentencesToSpeak =
              data.sentences && data.sentences.length > 0
                ? data.sentences
                : spoken
                ? [spoken]
                : [];

            if (autoSpeakRef.current && sentencesToSpeak.length > 0) {
              speakSentences(sentencesToSpeak);
            } else {
              setState("idle");
            }
          } else {
            const fallbackMsg = "I am connected to your Pathfinder candidate profile. Ask me about cutoffs, DSA roadmaps, or projects!";
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: fallbackMsg,
                spokenSummary: fallbackMsg,
                screenDetails: fallbackMsg,
                provider: "Pathfinder Autonomous Core",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
            speakSentences([fallbackMsg]);
          }
        } catch (fetchErr) {
          console.warn("[useVoiceSession] Voice query fallback:", fetchErr);
          const fallbackMsg = "I am DAS, your Pathfinder Career Coach. Ask me about cutoffs, DSA roadmaps, or resumes!";
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: fallbackMsg,
              spokenSummary: fallbackMsg,
              screenDetails: fallbackMsg,
              provider: "Pathfinder Autonomous Core",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
          speakSentences([fallbackMsg]);
        }
      }
    },
    [options.actionContext, stopAll, speakSentences]
  );

  /**
   * Toggles microphone recording
   * Safely captures transcript and sends on button click or natural pause.
   */
  const toggleMicrophone = useCallback(async () => {
    // IF CURRENTLY LISTENING -> FINISH AND SUBMIT
    if (isListeningRef.current || isMicActive) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      const textToSend = speechTranscriptRef.current.trim();
      speechTranscriptRef.current = "";
      isListeningRef.current = false;
      setIsMicActive(false);
      setInterimTranscript("");

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      if (micRef.current) {
        micRef.current.stop();
      }

      if (textToSend) {
        sendMessage(textToSend);
      } else {
        setState("idle");
      }
      return;
    }

    // IF AGENT IS CURRENTLY SPEAKING -> INTERRUPT FIRST
    if (state === "speaking") {
      stopAll();
    }

    // Unlock AudioContext and speech synthesis on user interaction
    if (audioPlayerRef.current) {
      await audioPlayerRef.current.resumeContext();
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }

    // 1. Explicitly request getUserMedia first.
    // This triggers Chrome's native "Allow/Block" dialog if pending, and verifies hardware access.
    let audioStream: MediaStream | null = null;
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
        } catch {
          // Fallback to basic audio constraint if advanced audio processing fails
          audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }
    } catch (permErr: any) {
      console.warn("[useVoiceSession] Microphone getUserMedia denied/blocked:", permErr);
      const errName = permErr?.name || "Error";
      const errMessage = permErr?.message || "";
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Microphone blocked (${errName}: ${errMessage || "Permission denied"}). Please reload the tab (Ctrl+F5) or restart Chrome.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsMicActive(false);
      isListeningRef.current = false;
      setState("error");
      return;
    }

    speechTranscriptRef.current = "";
    setInterimTranscript("");
    isListeningRef.current = true;
    setIsMicActive(true);
    setState("listening");

    // Initialize Web Speech API for immediate hands-free speech-to-text
    const SpeechRec =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          languageRef.current === "te"
            ? "te-IN"
            : languageRef.current === "hi"
            ? "hi-IN"
            : "en-IN";

        recognition.onstart = () => {
          setIsMicActive(true);
          isListeningRef.current = true;
          setState("listening");
        };

        recognition.onresult = (event: any) => {
          let accumulated = "";
          for (let i = 0; i < event.results.length; ++i) {
            accumulated += event.results[i][0].transcript + " ";
          }
          const cleanText = accumulated.trim();
          speechTranscriptRef.current = cleanText;
          setInterimTranscript(cleanText);

          // Auto-submit silence timeout (1.6s pause after speaking)
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current && speechTranscriptRef.current.trim()) {
              const toSubmit = speechTranscriptRef.current.trim();
              speechTranscriptRef.current = "";
              isListeningRef.current = false;
              setIsMicActive(false);
              setInterimTranscript("");
              try {
                recognition.stop();
              } catch {}
              if (micRef.current) micRef.current.stop();
              sendMessage(toSubmit);
            }
          }, 1600);
        };

        recognition.onerror = (event: any) => {
          console.warn("[useVoiceSession] Speech recognition error:", event.error);
          if (event.error === "not-allowed" || event.error === "permission-denied") {
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: "Microphone permission is blocked. 1) Click the 🔒 lock icon next to the address bar -> set Microphone to 'Allow' -> Press F5 to reload. 2) In Windows Settings > Privacy & security > Microphone, turn ON 'Let desktop apps access your microphone'.",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
            setIsMicActive(false);
            isListeningRef.current = false;
            setState("error");
          } else if (event.error !== "no-speech" && event.error !== "aborted") {
            setIsMicActive(false);
            isListeningRef.current = false;
            setState("idle");
          }
        };

        recognition.onend = () => {
          if (isListeningRef.current) {
            const spoken = speechTranscriptRef.current.trim();
            speechTranscriptRef.current = "";
            setInterimTranscript("");
            isListeningRef.current = false;
            setIsMicActive(false);

            if (spoken) {
              sendMessage(spoken);
            } else {
              setState("idle");
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("[useVoiceSession] Could not start speech recognition:", err);
      }
    }

    // Start PCM streaming for Gemini Live
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
        isListeningRef.current = false;
        setState("idle");
      },
    });

    micRef.current = mic;
    await mic.start(audioStream || undefined);
  }, [isMicActive, state, sendMessage, stopAll]);

  return {
    state,
    messages,
    currentSentence,
    interimTranscript,
    activeProvider,
    isMicActive,
    feedbackHint,
    lastAction,
    audioAnalyser: audioPlayerRef.current?.analyserNode || null,
    sendMessage,
    toggleMicrophone,
    stopAll,
    clearMessages: () => setMessages([]),
    dismissFeedbackHint: () => setFeedbackHint(null),
  };
}
