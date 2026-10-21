/**
 * Global DAS Voice Context & State Machine (client/src/contexts/DASVoiceContext.tsx)
 * Ensures:
 * 1. DAS AI never resets on page/tab changes.
 * 2. Speech recognition and audio playback continue seamlessly across routes.
 * 3. Greeting fires strictly ONCE per session on first user interaction.
 * 4. Message history and sessionId persist in sessionStorage across browser reloads.
 * 5. Full autonomous website action dispatching (navigation, highlight, modal triggers).
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { getApiBase, API_BASE } from "@/lib/apiClient";
import { clientBrain } from "@/voice/client_brain";

export type DASMode = "idle" | "listening" | "thinking" | "speaking" | "error";

export interface DASMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  spoken?: string;
  display?: string;
  actions?: Array<{ name: string; arguments?: Record<string, any> }>;
  followups?: string[];
  timestamp: string;
}

export interface PageContext {
  route: string;
  pageTitle: string;
  activeTab: string;
  visibleSections?: string[];
}

export interface DASVoiceContextType {
  sessionId: string;
  messages: DASMessage[];
  mode: DASMode;
  language: string;
  isMuted: boolean;
  isOpen: boolean;
  interimTranscript: string;
  currentSpokenText: string;
  pageContext: PageContext;
  setLanguage: (lang: string) => void;
  setIsMuted: (muted: boolean) => void;
  setIsOpen: (open: boolean) => void;
  setPageContext: (ctx: Partial<PageContext>) => void;
  startListening: () => void;
  stopListening: () => void;
  toggleMicrophone: () => void;
  cancelSpeech: () => void;
  sendMessage: (text: string) => Promise<void>;
  sendMessageToDAS?: (text: string) => Promise<void>;
  playJarvisSound?: (type: 'start' | 'action') => void;
  newConversation: () => void;
  clearHistory: () => void;
  onLogout: () => void;
}

const DASVoiceContext = createContext<DASVoiceContextType | null>(null);

const SESSION_KEY = "pathfinder_das_session_id";
const MESSAGES_KEY = "pathfinder_das_messages";
const GREETING_KEY = "pathfinder_das_greeting_done";

export const DASVoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Session ID (persisted across tab refreshes)
  const [sessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) return saved;
      const newId = "das_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
      sessionStorage.setItem(SESSION_KEY, newId);
      return newId;
    }
    return "das_ssr";
  });

  // 2. Messages (persisted in sessionStorage)
  const [messages, setMessages] = useState<DASMessage[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(MESSAGES_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [
      {
        id: "sys_init",
        role: "system",
        content: "DAS Autonomous Placement Intelligence initialized.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  // Sync messages to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-30)));
    }
  }, [messages]);

  const [mode, setMode] = useState<DASMode>("idle");
  const [language, setLanguage] = useState<string>("auto");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [currentSpokenText, setCurrentSpokenText] = useState<string>("");

  const [pageContext, setPageContextState] = useState<PageContext>({
    route: "/",
    pageTitle: "Executive Dashboard · Pathfinder 2.0",
    activeTab: "overview",
    visibleSections: ["hero-metrics", "skill-gap"],
  });

  // Central refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const utteranceQueueRef = useRef<SpeechSynthesisUtterance[]>([]);

  // Setup browser SpeechSynthesis reference
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Safe Speech Cancellation
  const cancelSpeech = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    utteranceQueueRef.current = [];
    isSpeakingRef.current = false;
    setCurrentSpokenText("");
    if (mode === "speaking") {
      setMode("idle");
    }
  }, [mode]);

  // Clean Natural Text-to-Speech with Sentence Chunking (prevents Chrome 15s cutoff)
  const speakNatural = useCallback(
    (textToSpeak: string, lang = "en") => {
      if (isMuted || !textToSpeak || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      // Cancel ongoing speech
      cancelSpeech();

      // Clean string
      const clean = textToSpeak
        .replace(/[*_~`#>]|\(http[^\)]+\)|http\S+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!clean) return;

      isSpeakingRef.current = true;
      setMode("speaking");
      setCurrentSpokenText(clean);

      // Break into 1-2 sentence chunks so Chrome Web Speech never freezes or times out
      const sentences = clean.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [clean];
      const voices = window.speechSynthesis.getVoices();

      // Find preferred natural voice
      let selectedVoice: SpeechSynthesisVoice | null = null;
      if (lang === "te") {
        selectedVoice = voices.find((v) => v.lang.startsWith("te")) || null;
      } else if (lang === "hi") {
        selectedVoice = voices.find((v) => v.lang.startsWith("hi")) || null;
      }
      if (!selectedVoice) {
        selectedVoice =
          voices.find(
            (v) =>
              (v.name.includes("Natural") ||
                v.name.includes("Guy") ||
                v.name.includes("Google") ||
                v.name.includes("David") ||
                v.name.includes("Prabhat")) &&
              v.lang.startsWith("en")
          ) || voices.find((v) => v.lang.startsWith("en")) || null;
      }

      sentences.forEach((chunk, index) => {
        const trimmed = chunk.trim();
        if (!trimmed) return;

        const utter = new SpeechSynthesisUtterance(trimmed);
        utter.rate = 1.0;
        utter.pitch = 0.98;
        if (selectedVoice) utter.voice = selectedVoice;

        if (index === sentences.length - 1) {
          utter.onend = () => {
            isSpeakingRef.current = false;
            setMode("idle");
          };
          utter.onerror = () => {
            isSpeakingRef.current = false;
            setMode("idle");
          };
        }

        window.speechSynthesis.speak(utter);
      });
    },
    [isMuted, cancelSpeech]
  );

  // Feature 3: Futuristic Beep Sound Effects (JARVIS Web Audio API without external files)
  const playJarvisSound = useCallback((type: 'start' | 'action') => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'start') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
      }

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // AudioContext gestures handled safely
    }
  }, []);

  // Central DAS Action Dispatcher
  const executeDASAction = useCallback((action: { name: string; arguments?: Record<string, any> }) => {
    if (!action || !action.name) return;
    const name = action.name;
    const args = action.arguments || {};

    try {
      playJarvisSound('action');
      if (name === "navigate_to" || name === "navigate" || name === "navigateToTab") {
        const targetTab = args.page_id || args.tab || args.tabName;
        if (targetTab && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("das-navigate-tab", { detail: { tab: targetTab } })
          );
        }
      } else if (name === "highlight" || name === "highlightWidget") {
        const sectionId = args.section_id || args.target || args.widgetName;
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
      } else if (name === "open_panel") {
        const panel = args.name || args.panel;
        if (panel === "resume_builder" && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("das-open-resume-builder"));
        } else if (panel === "mock_interview" && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("das-open-mock-interview"));
        }
      }
    } catch (e) {
      console.warn("[DAS Action Dispatcher] Error executing action:", action, e);
    }
  }, [playJarvisSound]);

  // Update Page Context without interrupting voice
  const setPageContext = useCallback((ctx: Partial<PageContext>) => {
    setPageContextState((prev) => ({ ...prev, ...ctx }));
  }, []);

  // Send Message & Receive Structured Response
  const sendMessage = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      const lower = clean.toLowerCase();

      // Voice Command: Stop
      if (lower === "stop" || lower === "cancel" || lower === "pause" || lower === "aapu") {
        cancelSpeech();
        setMode("idle");
        return;
      }

      // Voice Command: Mute
      if (lower === "mute") {
        cancelSpeech();
        setIsMuted(true);
        setMode("idle");
        return;
      }

      // Voice Command: Unmute
      if (lower === "unmute") {
        setIsMuted(false);
        setMode("idle");
        return;
      }

      // Voice Command: Repeat
      if (lower === "repeat" || lower === "say again" || lower === "malli cheppu") {
        if (currentSpokenText) {
          speakNatural(currentSpokenText);
        }
        return;
      }

      // User interrupted ongoing speech with a new question
      cancelSpeech();
      playJarvisSound('start');

      const userMsg: DASMessage = {
        id: "msg_" + Date.now(),
        role: "user",
        content: clean,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setMode("thinking");

      // Grab student profile from storage
      let profileDraft = {};
      try {
        const saved = localStorage.getItem("pathfinder_profile_draft");
        if (saved) profileDraft = JSON.parse(saved);
      } catch {}

      try {
        const endpoint = `${API_BASE}/api/chat`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message: clean,
            session_id: sessionId,
            currentPage: pageContext.route || (typeof window !== "undefined" ? window.location.pathname : "/"),
            currentTab: pageContext.activeTab || "overview",
            page_context: pageContext,
            profile: profileDraft,
            language: language,
            history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          const spokenText = data.spoken || data.reply || "I have updated your placement recommendations.";
          const displayText = data.display || data.reply || spokenText;
          const actions = data.actions || [];
          const followups = data.followups || [];

          const dasMsg: DASMessage = {
            id: "msg_" + Date.now(),
            role: "assistant",
            content: displayText,
            spoken: spokenText,
            display: displayText,
            actions: actions,
            followups: followups,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setMessages((prev) => [...prev, dasMsg]);

          // Execute returned UI actions
          actions.forEach((act: any) => executeDASAction(act));

          // Speak response
          speakNatural(spokenText);
        } else {
          throw new Error("HTTP error " + resp.status);
        }
      } catch (err) {
        console.info("[DASVoiceContext] Autonomous client-side AI brain answering:", err);
        const brainRes = clientBrain.process(clean, language);
        const dasMsg: DASMessage = {
          id: "msg_brain_" + Date.now(),
          role: "assistant",
          content: brainRes.display,
          spoken: brainRes.spoken,
          display: brainRes.display,
          actions: brainRes.actions,
          followups: brainRes.followups,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, dasMsg]);
        brainRes.actions.forEach((act: any) => executeDASAction(act));
        speakNatural(brainRes.spoken);
      }
    },
    [cancelSpeech, sessionId, pageContext, language, messages, executeDASAction, speakNatural, playJarvisSound]
  );

  // Stop Listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    isListeningRef.current = false;
    setInterimTranscript("");
    if (mode === "listening") {
      setMode("idle");
    }
  }, [mode]);

  // Start Listening with Echo-Prevention (turns off during speaking)
  const startListening = useCallback(() => {
    // If speaking, interrupt speech immediately
    cancelSpeech();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Microphone recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-US";

      rec.onstart = () => {
        isListeningRef.current = true;
        setMode("listening");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript.trim();
            if (finalTranscript) {
              stopListening();
              sendMessage(finalTranscript);
              return;
            }
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim);
      };

      rec.onerror = (e: any) => {
        console.warn("[SpeechRecognition] Error:", e.error);
        isListeningRef.current = false;
        setMode("idle");
        if (e.error === "not-allowed") {
          alert("Microphone access is blocked! Please click the camera/mic icon in your address bar and allow microphone permissions.");
        }
      };

      rec.onend = () => {
        isListeningRef.current = false;
        if (mode === "listening") {
          setMode("idle");
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("[SpeechRecognition] Start error:", err);
      isListeningRef.current = false;
      setMode("idle");
    }
  }, [cancelSpeech, language, stopListening, sendMessage, mode]);

  // Toggle Microphone
  const toggleMicrophone = useCallback(() => {
    if (isListeningRef.current || mode === "listening") {
      stopListening();
    } else {
      startListening();
    }
  }, [mode, startListening, stopListening]);

  // Initial Greeting (Strictly ONCE per session on first user open)
  const triggerInitialGreeting = useCallback(() => {
    if (typeof window === "undefined") return;
    const alreadyGreeted = sessionStorage.getItem(GREETING_KEY);
    if (!alreadyGreeted) {
      sessionStorage.setItem(GREETING_KEY, "true");
      let candidateName = "sir";
      try {
        const saved = localStorage.getItem("pathfinder_profile_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fullName) candidateName = parsed.fullName.split(" ")[0];
        }
      } catch {}
      const greeting = `Hi ${candidateName}! I'm DAS, your Pathfinder AI agent. How can I help with your placements today?`;
      speakNatural(greeting);
    }
  }, [speakNatural]);

  // When panel is opened for the first time in a session, trigger greeting
  useEffect(() => {
    if (isOpen) {
      triggerInitialGreeting();
    }
  }, [isOpen, triggerInitialGreeting]);

  // New Conversation & Clear History
  const newConversation = useCallback(() => {
    cancelSpeech();
    stopListening();
    const newId = "das_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    sessionStorage.setItem(SESSION_KEY, newId);
    sessionStorage.removeItem(GREETING_KEY);
    const freshMessages: DASMessage[] = [
      {
        id: "sys_init",
        role: "system",
        content: "New conversation initialized. Ask me anything about Pathfinder, roadmaps, or projects!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setMessages(freshMessages);
    sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(freshMessages));
    setMode("idle");
  }, [cancelSpeech, stopListening]);

  const clearHistory = useCallback(() => {
    newConversation();
  }, [newConversation]);

  // Logout clean-up
  const onLogout = useCallback(() => {
    cancelSpeech();
    stopListening();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(MESSAGES_KEY);
      sessionStorage.removeItem(GREETING_KEY);
    }
    setIsOpen(false);
    setMode("idle");
  }, [cancelSpeech, stopListening]);

  return (
    <DASVoiceContext.Provider
      value={{
        sessionId,
        messages,
        mode,
        language,
        isMuted,
        isOpen,
        interimTranscript,
        currentSpokenText,
        pageContext,
        setLanguage,
        setIsMuted,
        setIsOpen,
        setPageContext,
        startListening,
        stopListening,
        toggleMicrophone,
        cancelSpeech,
        sendMessage,
        sendMessageToDAS: sendMessage,
        playJarvisSound,
        newConversation,
        clearHistory,
        onLogout,
      }}
    >
      {children}
    </DASVoiceContext.Provider>
  );
};

export const useDASVoice = (): DASVoiceContextType => {
  const context = useContext(DASVoiceContext);
  if (!context) {
    throw new Error("useDASVoice must be used within a DASVoiceProvider");
  }
  return context;
};
