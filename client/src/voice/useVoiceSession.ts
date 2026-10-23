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
import { clientBrain, checkIsOwner } from "./client_brain";

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
    "Ready for your questions. Tap the mic or type below."
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

  const greetingRef = useRef<string>("");
  const hasSpokenGreetingRef = useRef<boolean>(false);
  const pendingReplyTimerRef = useRef<any>(null);

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

  // Proactive automatic voice greeting upon dashboard load
  // Proactive automatic voice greeting upon dashboard load (STRICTLY ONCE per browser session!)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const alreadyGreeted = sessionStorage.getItem("das_boss_greeted");
      if (alreadyGreeted) {
        hasSpokenGreetingRef.current = true;
        return;
      }
    }

    const greetingTimer = setTimeout(() => {
      if (!hasSpokenGreetingRef.current) {
        hasSpokenGreetingRef.current = true;
        if (typeof window !== "undefined") {
          sessionStorage.setItem("das_boss_greeted", "true");
        }
        const isOwner = checkIsOwner();
        const nowHour = new Date().getHours();
        const tod = nowHour < 12 ? "morning" : (nowHour < 17 ? "afternoon" : "evening");
        const todTe = tod === "morning" ? "మార్నింగ్" : (tod === "afternoon" ? "ఆఫ్టర్నూన్" : "ఈవినింగ్");
        const initialGreeting =
          languageRef.current === "te"
            ? (isOwner
                ? `హాయ్ బాస్, గుడ్ ${todTe}! నేను మీ పర్సనల్ పాత్‌ఫైండర్ AI ఏజెంట్ దాస్ ని. సిస్టమ్స్ అన్నీ సిద్ధంగా ఉన్నాయి. ఈరోజు మన ప్లేస్‌మెంట్స్ కోసం ఏం మొదలుపెడదాం?`
                : `నమస్కారం, గుడ్ ${todTe}! పాత్‌ఫైండర్‌కి స్వాగతం. నేను DAS, మీ అటానమస్ ప్లేస్‌మెంట్ కో-పైలట్. ఈరోజు మీకు ఎలా సహాయపడగలను?`)
            : (isOwner
                ? `Hi Boss, Good ${tod}! I am DAS, your autonomous Pathfinder AI co-pilot. Systems online and calibrated. How can I assist you right now?`
                : `Hello, Good ${tod}! Welcome to Pathfinder. I am DAS, your autonomous placement co-pilot. Systems online and calibrated. How can I assist you today?`);
        greetingRef.current = initialGreeting;
        setCurrentSentence(initialGreeting);
        setMessages((prev) => {
          if (prev.length <= 1) {
            return [
              ...prev,
              {
                role: "assistant",
                content: initialGreeting,
                spokenSummary: initialGreeting,
                provider: "Pathfinder Autonomous Intelligence",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ];
          }
          return prev;
        });
        if (autoSpeakRef.current) {
          speakSentences([initialGreeting]);
        }
      }
    }, 700);
    return () => clearTimeout(greetingTimer);
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
            if (pendingReplyTimerRef.current) {
              clearTimeout(pendingReplyTimerRef.current);
              pendingReplyTimerRef.current = null;
            }
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
            if (pendingReplyTimerRef.current) {
              clearTimeout(pendingReplyTimerRef.current);
              pendingReplyTimerRef.current = null;
            }
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

      let resolved = false;

      // Local fallback trigger function
      const triggerClientFallback = (reason: string) => {
        if (resolved) return;
        resolved = true;
        if (pendingReplyTimerRef.current) {
          clearTimeout(pendingReplyTimerRef.current);
          pendingReplyTimerRef.current = null;
        }
        console.info(`[useVoiceSession] ${reason} Engaging local autonomous brain.`);
        const brainRes = clientBrain.process(clean, languageRef.current, { activeTab: options.actionContext?.activeTab || "coach" });
        const spoken = brainRes.spoken;
        const screen = brainRes.display;
        setCurrentSentence(spoken);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: screen || spoken,
            spokenSummary: spoken,
            screenDetails: screen,
            provider: "Pathfinder Autonomous Intelligence (Fast Local)",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        // Dispatch client actions if specified
        if (brainRes.actions && brainRes.actions.length > 0) {
          for (const act of brainRes.actions) {
            try {
              if (act.name === "navigate_to") {
                const targetTab = act.arguments?.page_id || act.arguments?.tab;
                if (targetTab) {
                  options.actionContext?.onNavigateTab?.(targetTab);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: targetTab } }));
                  }
                }
              } else if (act.name === "open_panel") {
                const panel = act.arguments?.name || act.arguments?.panel;
                if (panel === "resume_builder") {
                  options.actionContext?.onOpenResumeBuilder?.();
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("das-open-resume-builder"));
                  }
                } else if (panel === "mock_interview") {
                  options.actionContext?.onLaunchMockInterview?.("Google", "SDE");
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("das-open-mock-interview"));
                  }
                }
              } else if (act.name === "highlight") {
                const sectionId = act.arguments?.section_id || act.arguments?.target;
                if (sectionId && typeof window !== "undefined") {
                  const el = document.querySelector(`[data-das-id="${sectionId}"]`) || document.querySelector(`#${sectionId}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("ring-2", "ring-cyan-400", "ring-offset-2", "transition-all");
                    setTimeout(() => {
                      el.classList.remove("ring-2", "ring-cyan-400", "ring-offset-2");
                    }, 3000);
                  }
                }
              }
            } catch (actErr) {
              console.warn("[useVoiceSession] Error dispatching client action:", actErr);
            }
          }
        }

        if (autoSpeakRef.current && spoken) {
          speakSentences([spoken]);
        } else {
          setState("idle");
        }
      };

      // Guaranteed 2.2 second fallback timer - ensures agent NEVER gets stuck on THINKING
      if (pendingReplyTimerRef.current) clearTimeout(pendingReplyTimerRef.current);
      pendingReplyTimerRef.current = setTimeout(() => {
        triggerClientFallback("Backend response timer (2.2s) expired.");
      }, 2200);

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
        // Fallback to HTTP POST with 2-second hard timeout
        try {
          const { apiUrl } = getVoiceBackendUrls();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);

          let resp = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              text: clean,
              message: clean,
              language: languageRef.current,
            }),
          }).catch(() => null);

          clearTimeout(timeoutId);

          if (resp && resp.ok) {
            if (resolved) return;
            resolved = true;
            if (pendingReplyTimerRef.current) {
              clearTimeout(pendingReplyTimerRef.current);
              pendingReplyTimerRef.current = null;
            }
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
            triggerClientFallback("HTTP endpoint unavailable.");
          }
        } catch (fetchErr) {
          triggerClientFallback("Network exception caught.");
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

    // Release direct audioStream so SpeechRecognition can access mic on Windows without contention
    if (audioStream && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
      audioStream.getTracks().forEach((track) => track.stop());
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
            // For other transient errors, don't crash session if still listening
            if (!isListeningRef.current) {
              setIsMicActive(false);
              setState("idle");
            }
          }
        };

        recognition.onend = () => {
          if (isListeningRef.current) {
            const spoken = speechTranscriptRef.current.trim();
            if (spoken) {
              speechTranscriptRef.current = "";
              setInterimTranscript("");
              isListeningRef.current = false;
              setIsMicActive(false);
              sendMessage(spoken);
            } else {
              // User has not spoken yet or brief silence; restart recognition so mic stays active
              try {
                if (isListeningRef.current) {
                  recognition.start();
                  return;
                }
              } catch {
                // Ignore duplicate start errors
              }
              isListeningRef.current = false;
              setIsMicActive(false);
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

    // Start PCM streaming ONLY for Gemini Live if WebSocket is connected and open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && audioStream && audioStream.active) {
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
        onError: (err) => {
          console.warn("[useVoiceSession] PCM stream error:", err);
          // Only shutdown if Web Speech API is not active
          if (!SpeechRec) {
            setIsMicActive(false);
            isListeningRef.current = false;
            setState("idle");
          }
        },
      });

      micRef.current = mic;
      try {
        await mic.start(audioStream);
      } catch (e) {
        console.warn("[useVoiceSession] Failed to start PCM capture:", e);
      }
    }
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
