import React, { useState, useRef, useEffect, startTransition } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  Copy,
  Check,
  User,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Activity,
  Radio,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Code2,
  Layers,
  HelpCircle,
  Square,
  RotateCcw,
  RefreshCw,
  Globe,
  FileText,
  AlertCircle,
  Headphones,
  MoreVertical,
  X
} from "lucide-react";
import { Streamdown } from "streamdown";
import { StudentProfileState } from "@/types/profile";
import { API_BASE } from "@/lib/apiClient";
import { AvatarCanvas } from "@/avatar/AvatarCanvas";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export type VoiceLanguage = "auto" | "en-IN" | "te-IN" | "hi-IN";

export interface VoiceTutorState {
  currentProjectId?: string;
  projectTitle?: string;
  stepIndex: number;
  totalSteps: number;
  language?: string;
  lastUpdated?: number;
}

interface AICoachConsoleProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onStopGeneration?: () => void;
  onRegenerate?: () => void;
  isLoading: boolean;
  isServerWakingUp?: boolean;
  targetRole: string;
  profile?: StudentProfileState;
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
  onOpenResumeBuilder?: () => void;
}

export const cleanTtsSpokenText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\[\[PROVIDER:[^\]]+\]\]/g, "")
    .replace(/\[\[NAVIGATE:[^\]]+\]\]/g, "")
    .replace(/\[\[ACTION:[^\]]+\]\]/g, "")
    .replace(/\[\[TUTOR:[^\]]+\]\]/g, "")
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/`+/g, "")
    .replace(/[#*_~>|\\{}[\]()]/g, "")
    .replace(/^\s*[-•+*]\s*/gm, "")
    .replace(/^\s*\d+\.\s*/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\bCGPA\b/g, "C G P A")
    .replace(/\bDSA\b/g, "D S A")
    .replace(/\bDBMS\b/g, "D B M S")
    .replace(/\bSQL\b/g, "Sequel")
    .replace(/\bATS\b/g, "A T S")
    .replace(/\bSDE\b/g, "S D E")
    .replace(/\bML\b/g, "M L")
    .replace(/\bAI\b/g, "A I")
    .replace(/\bO\(n log n\)/gi, "O of N log N")
    .replace(/\bO\(n\)/gi, "O of N")
    .replace(/\bO\(1\)/gi, "O of 1")
    .replace(/\s+/g, " ")
    .trim();
};

export const detectTextLanguage = (text: string): "te-IN" | "hi-IN" | "en-IN" => {
  if (!text) return "en-IN";
  // Telugu Unicode block
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN";
  // Devanagari (Hindi) Unicode block
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
  return "en-IN";
};

export const parseTutorState = (content: string): VoiceTutorState | null => {
  if (!content) return null;
  const match = content.match(/\[\[TUTOR:([\s\S]*?)\]\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      return {
        currentProjectId: parsed.projectId || parsed.currentProjectId,
        projectTitle: parsed.projectTitle,
        stepIndex: typeof parsed.stepIndex === "number" ? parsed.stepIndex : 1,
        totalSteps: typeof parsed.totalSteps === "number" ? parsed.totalSteps : (parsed.stepCount || 9),
        lastUpdated: Date.now(),
      };
    } catch {
      return null;
    }
  }
  return null;
};

export const parseScreenMarker = (content: string): { spoken: string; screen: string; hasScreen: boolean } => {
  if (content.includes("---SCREEN---")) {
    const parts = content.split("---SCREEN---");
    return {
      spoken: parts[0].trim(),
      screen: parts.slice(1).join("---SCREEN---").trim(),
      hasScreen: true,
    };
  }
  return {
    spoken: content.trim(),
    screen: "",
    hasScreen: false,
  };
};

export const splitSentences = (text: string): string[] => {
  if (!text.trim()) return [];
  const raw = text.split(/(?<=[.!?])\s+|\n\n+/);
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
};

export const isAssistantEcho = (transcript: string, assistantReply: string): boolean => {
  if (!transcript || !assistantReply) return false;
  const normT = transcript.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  const normA = assistantReply.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  if (normT.length < 5 || normA.length < 5) return false;

  // Exact substring match
  if (normT.length >= 8 && normA.includes(normT)) {
    return true;
  }
  // Word overlap match (65%+)
  const wordsT = normT.split(/\s+/).filter((w) => w.length > 2);
  if (wordsT.length >= 3) {
    const matchingWords = wordsT.filter((w) => normA.includes(w));
    if (matchingWords.length / wordsT.length >= 0.65) {
      return true;
    }
  }
  return false;
};

export const extractShortSpokenReply = (
  text: string,
  lang: "te-IN" | "hi-IN" | "en-IN" = "en-IN"
): string => {
  if (!text) return "";
  const { spoken } = parseScreenMarker(text);
  const clean = cleanTtsSpokenText(spoken || text);
  if (!clean) return "";

  const sentences = splitSentences(clean);
  const offer =
    lang === "te-IN"
      ? "నేను ముందుకు కొనసాగించమంటారా?"
      : lang === "hi-IN"
      ? "क्या मैं आगे जारी रखूं?"
      : "Want me to continue?";

  // Strictly cap at 2-3 sentences and offer to continue
  if (sentences.length > 3) {
    const shortList = sentences.slice(0, 3);
    const joined = shortList.join(" ").trim();
    if (!joined.toLowerCase().includes("continue") && !joined.includes("కొనసాగించ") && !joined.includes("जारी")) {
      return `${joined} ${offer}`;
    }
    return joined;
  }

  const joined = sentences.join(" ").trim();
  if (sentences.length >= 2 && !joined.endsWith("?") && !joined.toLowerCase().includes("continue") && !joined.includes("కొనసాగించ") && !joined.includes("जारी")) {
    return `${joined} ${offer}`;
  }
  return joined;
};

const PROMPT_SUGGESTIONS = [
  "Analyze my career path 🚀",
  "Find my skill gaps",
  "Start a mock interview",
  "Create my 6-week roadmap",
  "Suggest an AI project",
  "Prepare me for placements",
  "Naku job kavali bro",
  "Why am I not getting shortlisted?",
  "Python or Java for campus drives?",
  "naaku python baaga istam"
];

const QUICK_ACTIONS = [
  { label: "💡 Explain Pathfinder simply", prompt: "Explain Pathfinder simply in 5 lines and what it does." },
  { label: "🤝 Explain to a non-technical person", prompt: "Explain Pathfinder and how its AI works to a non-technical person with a real-life analogy." },
  { label: "🚀 Project ideas for my branch", prompt: "Give me project ideas (small, medium, hard) for my branch with realistic architectures." },
  { label: "🛠️ Build this project step by step", prompt: "Take the project we discussed and let's build it step by step. Start with Step 1." },
  { label: "🎙️ Start Mock Interview", prompt: "Let's do an interactive mock interview for my role. Ask me question 1." },
  { label: "🗺️ Build 6-Week Roadmap", prompt: "Can you create a detailed 6-week milestone roadmap for my placement preparation?" },
];

const ASK_ME_QUESTIONS = [
  {
    icon: "🎯",
    title: "Placement chances",
    desc: "Tier-1 readiness & odds",
    prompt: "Evaluate my placement readiness score and odds for Tier-1 companies.",
  },
  {
    icon: "📄",
    title: "Resume builder",
    desc: "ATS optimization tips",
    prompt: "How do I optimize my resume to pass ATS filters at top tech companies?",
  },
  {
    icon: "🚀",
    title: "Project ideas for my branch",
    desc: "Capstone architectures",
    prompt: "Suggest top production project architectures suitable for campus placements for my branch.",
  },
  {
    icon: "🛠️",
    title: "Build a project step by step",
    desc: "Interactive tutor",
    prompt: "Take the hardest project architecture and teach me how to build it step by step. Start with Step 1.",
  },
  {
    icon: "🎙️",
    title: "Mock interview",
    desc: "STAR technical practice",
    prompt: "Start an interactive technical mock interview for an SDE role. Ask me question 1.",
  },
  {
    icon: "🌐",
    title: "Explain the website",
    desc: "Tour all tools & tabs",
    prompt: "Explain the Pathfinder website, its key tools, and how to use them.",
  },
  {
    icon: "🗣️",
    title: "తెలుగులో ప్రిపరేషన్ టిప్స్",
    desc: "ప్లేస్‌మెంట్ గైడెన్స్",
    prompt: "నా ప్లేస్‌మెంట్ ప్రిపరేషన్ ఎలా మొదలుపెట్టాలో తెలుగులో వివరించండి.",
  },
  {
    icon: "🇮🇳",
    title: "प्लेसमेंट की तैयारी कैसे करें?",
    desc: "कोडिंग और कोर तैयारी",
    prompt: "कैंपस प्लेसमेंट के लिए सबसे महत्वपूर्ण कोडिंग और कोर टॉपिक्स क्या हैं?",
  },
];

const MOCK_QUESTIONS = [
  {
    category: "Coding & DSA",
    prompt: "Mock Interview Question 1: Given an array of integers, how would you find the maximum subarray sum in O(n) time? Explain Kadane's algorithm.",
  },
  {
    category: "System Design",
    prompt: "Mock Interview Question 2: How would you design a URL shortener like TinyURL that handles 100M redirects/day with caching?",
  },
  {
    category: "Behavioral (STAR)",
    prompt: "Mock Interview Question 3: Tell me about a time you faced a difficult technical bug in a project and how you resolved it using the STAR method.",
  },
];

export const AICoachConsole: React.FC<AICoachConsoleProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  onStopGeneration,
  onRegenerate,
  isLoading,
  isServerWakingUp,
  targetRole,
  profile,
  activeTab,
  onNavigateTab,
  onOpenResumeBuilder,
}) => {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "interview">("chat");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastActionTimeRef = useRef(0);

  // Voice Pipeline States (auto, en-IN, te-IN, hi-IN)
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pathfinder_voice_lang");
        if (stored === "auto" || stored === "en-IN" || stored === "te-IN" || stored === "hi-IN") {
          return stored as VoiceLanguage;
        }
      } catch {}
    }
    return "auto";
  });
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [currentSpokenSentence, setCurrentSpokenSentence] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [collapsedScreenMap, setCollapsedScreenMap] = useState<Record<number, boolean>>({});

  // Tutor state with persistent local storage
  const [tutorState, setTutorState] = useState<VoiceTutorState | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pathfinder_voice_tutor_state");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.stepIndex === "number") return parsed;
        }
      } catch {}
    }
    return null;
  });

  const updateTutorState = (st: VoiceTutorState | null) => {
    setTutorState(st);
    if (typeof window !== "undefined") {
      try {
        if (st) {
          localStorage.setItem("pathfinder_voice_tutor_state", JSON.stringify(st));
        } else {
          localStorage.removeItem("pathfinder_voice_tutor_state");
        }
      } catch {}
    }
  };

  const setVoiceLanguage = (lang: VoiceLanguage) => {
    setVoiceLang(lang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pathfinder_voice_lang", lang);
      } catch {}
    }
  };

  // Audio & Speech References
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const speechStartTimeRef = useRef<number>(0);
  const firstTokenLoggedRef = useRef<boolean>(false);
  const firstAudioLoggedRef = useRef<boolean>(false);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingSentenceRef = useRef<boolean>(false);
  const teluguVoiceWarnedRef = useRef<boolean>(false);
  const serverAudioRef = useRef<HTMLAudioElement | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Incremental generation token for 100% reliable instantaneous cancellation (Barge-in / Stop)
  const generationIdRef = useRef<number>(0);

  // Utterance Reference to prevent Chromium V8 garbage collection mid-speech
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  // Track if query was triggered by voice so assistant response always auto-speaks
  const isVoiceTriggeredRef = useRef<boolean>(false);

  // Critical Voice Agent Loop & Echo Prevention Refs
  const isSpeakingRef = useRef<boolean>(false);
  const userTurnedListeningOnRef = useRef<boolean>(false);
  const lastSentTranscriptRef = useRef<string>("");
  const lastSentTimeRef = useRef<number>(0);
  const lastAssistantReplyRef = useRef<string>("");
  const voiceStreamHandledRef = useRef<boolean>(false);
  const [hasTeluguVoice, setHasTeluguVoice] = useState<boolean>(true);
  const [dismissTeluguNotice, setDismissTeluguNotice] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("pathfinder_dismiss_te_notice") === "1";
      } catch {}
    }
    return false;
  });

  useEffect(() => {
    if (voiceError) {
      const timer = setTimeout(() => setVoiceError(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [voiceError]);

  // Speaker Diagnostic Test States
  const [speakerTestState, setSpeakerTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [speakerTestMsg, setSpeakerTestMsg] = useState<string | null>(null);

  // Real Provider Badge, Overflow Menu, and Full History Sheet States
  const [activeProvider, setActiveProvider] = useState<string>("Gemini 2.0 Flash");
  const [isOverflowOpen, setIsOverflowOpen] = useState<boolean>(false);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

  // Audio Unlock on First User Interaction
  const unlockAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  };

  // Fallback Audio Reader & Persistent Auto-Speak (default true: face speaks every answer)
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pathfinder_voice_reply_enabled");
        if (stored !== null) return stored === "true";
      } catch {}
    }
    return true; // Default true: voice reply is ON by default so the face speaks every answer
  });

  const toggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pathfinder_voice_reply_enabled", String(next));
      } catch {}
    }
  };

  // Listen for voices asynchronously and check Telugu availability
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        voicesRef.current = v;
        const te = v.some(
          (voice) =>
            voice.lang.toLowerCase().includes("te-in") ||
            voice.lang.toLowerCase().includes("te_in") ||
            voice.lang.toLowerCase().startsWith("te-") ||
            voice.name.toLowerCase().includes("telugu")
        );
        setHasTeluguVoice(te);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // Chrome 15s SpeechSynthesis freeze prevention: periodically pause & resume if speaking
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Keep-alive ping to /api/health every 4 minutes to keep Render alive
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE}/api/health`).catch(() => {});
    }, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Cancel any active speech when changing page tabs or when tab is hidden
  useEffect(() => {
    handleStopAll();
  }, [activeTab]);

  useEffect(() => {
    const handleVisChange = () => {
      if (document.hidden) {
        handleStopAll();
      }
    };
    document.addEventListener("visibilitychange", handleVisChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisChange);
    };
  }, []);

  // Diagnostic: Tests browser audio hardware and speech synthesis on demand
  const testSpeakerAudio = async () => {
    if (typeof window === "undefined") return;
    setSpeakerTestState("testing");
    setSpeakerTestMsg("Testing audio hardware & speakers...");

    try {
      // 1. Play diagnostic 3-tone chime (C5-E5-G5) via Web Audio API to verify physical sound card & speakers
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
        const now = ctx.currentTime;

        // Tone 1: C5 (523.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Tone 2: E5 (659.25 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(659.25, now + 0.15);
        gain2.gain.setValueAtTime(0.18, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.45);

        // Tone 3: G5 (783.99 Hz)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = "sine";
        osc3.frequency.setValueAtTime(783.99, now + 0.3);
        gain3.gain.setValueAtTime(0.22, now + 0.3);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now + 0.3);
        osc3.stop(now + 0.8);
      }

      // 2. Play speech test via SpeechSynthesis
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const testPhrase =
          voiceLang === "te-IN"
            ? "స్పీకర్ మరియు ఆడియో ఖచ్చితంగా పనిచేస్తున్నాయి. Pathfinder వాయిస్ ఏజెంట్ సిద్ధంగా ఉంది."
            : voiceLang === "hi-IN"
            ? "स्पीकर और ऑडियो बिल्कुल सही काम कर रहे हैं। पाथफाइंडर वॉइस एजेंट तैयार है।"
            : "Speaker test successful. Pathfinder voice agent audio is loud and clear.";

        const utt = new SpeechSynthesisUtterance(testPhrase);
        activeUtterancesRef.current.push(utt);
        utt.rate = 1.0;
        utt.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        if (voiceLang === "te-IN") {
          const teVoice = voices.find(
            (v) => v.lang.toLowerCase().includes("te") || v.name.toLowerCase().includes("telugu")
          );
          if (teVoice) utt.voice = teVoice;
        } else if (voiceLang === "hi-IN") {
          const hiVoice = voices.find(
            (v) => v.lang.toLowerCase().includes("hi") || v.name.toLowerCase().includes("hindi")
          );
          if (hiVoice) utt.voice = hiVoice;
        } else {
          const enVoice = voices.find(
            (v) => v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("india")
          );
          if (enVoice) utt.voice = enVoice;
        }

        utt.onend = () => {
          activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utt);
          setSpeakerTestState("success");
          setSpeakerTestMsg("✅ Speaker Working! Sound chime and speech played successfully.");
          setTimeout(() => setSpeakerTestState("idle"), 5000);
        };
        utt.onerror = () => {
          activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utt);
          setSpeakerTestState("success");
          setSpeakerTestMsg("✅ Audio Chime Played! Device speakers are operational.");
          setTimeout(() => setSpeakerTestState("idle"), 5000);
        };

        window.speechSynthesis.speak(utt);
      } else {
        setSpeakerTestState("success");
        setSpeakerTestMsg("✅ Audio Chime Played! Device speakers are operational.");
        setTimeout(() => setSpeakerTestState("idle"), 5000);
      }
    } catch (err: any) {
      console.error("[SpeakerTest] Error:", err);
      setSpeakerTestState("error");
      setSpeakerTestMsg("❌ Audio blocked or muted. Please check Windows speaker volume in taskbar.");
      setTimeout(() => setSpeakerTestState("idle"), 6000);
    }
  };

  // Analyze filler words and speech cadence in real-time
  const analyzeCandidateSpeech = (text: string) => {
    if (!text.trim()) return { fillers: 0, words: 0, list: [] as string[], score: 100 };
    const words = text.trim().split(/\s+/).length;
    const fillerMatches = text.match(/\b(um|umm|uh|uhh|like|actually|basically|you know|sort of|kind of|i mean)\b/gi) || [];
    const fillers = fillerMatches.length;
    const uniqueFillers = Array.from(new Set(fillerMatches.map((f) => f.toLowerCase())));
    const penalty = Math.min(50, Math.round((fillers / Math.max(words, 1)) * 100));
    const score = Math.max(30, 100 - penalty);
    return { fillers, words, list: uniqueFillers, score };
  };

  const speechMetrics = analyzeCandidateSpeech(input);

  // Clean navigation / action / tutor / provider markers from user-facing text
  const cleanDisplayContent = (content: string) => {
    return content
      .replace(/\[\[PROVIDER:[^\]]+\]\]/g, "")
      .replace(/\[\[NAVIGATE:[^\]]+\]\]/g, "")
      .replace(/\[\[ACTION:[^\]]+\]\]/g, "")
      .replace(/\[\[TUTOR:[^\]]+\]\]/g, "");
  };

  // Voice selection helper matching language code and regional pronunciations
  const selectVoiceForLanguage = (targetLang: "te-IN" | "hi-IN" | "en-IN"): SpeechSynthesisVoice | null => {
    const list = voicesRef.current.length > 0
      ? voicesRef.current
      : (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices() : []);
    if (!list || list.length === 0) return null;

    if (targetLang === "te-IN") {
      const te = list.find(
        (v) =>
          v.lang.toLowerCase() === "te-in" ||
          v.lang.toLowerCase() === "te_in" ||
          v.lang.toLowerCase().startsWith("te-") ||
          v.name.toLowerCase().includes("telugu")
      );
      if (te) return te;
      const inEn = list.find((v) => v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("india"));
      if (inEn) return inEn;
    } else if (targetLang === "hi-IN") {
      const hi = list.find(
        (v) =>
          v.lang.toLowerCase() === "hi-in" ||
          v.lang.toLowerCase() === "hi_in" ||
          v.lang.toLowerCase().startsWith("hi-") ||
          v.name.toLowerCase().includes("hindi") ||
          v.name.toLowerCase().includes("kalpana") ||
          v.name.toLowerCase().includes("hemant")
      );
      if (hi) return hi;
      const inEn = list.find((v) => v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("india"));
      if (inEn) return inEn;
    } else {
      const enIn = list.find(
        (v) =>
          v.lang.toLowerCase().includes("en-in") ||
          v.name.toLowerCase().includes("india") ||
          v.name.toLowerCase().includes("neerja") ||
          v.name.toLowerCase().includes("prabhat")
      );
      if (enIn) return enIn;
      const anyEn = list.find((v) => v.lang.toLowerCase().startsWith("en"));
      if (anyEn) return anyEn;
    }
    return list[0] || null;
  };

  // Safe microphone abort helper
  const stopMicrophone = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        if (typeof recognitionRef.current.abort === "function") {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch {}
      recognitionRef.current = null;
    }
  };

  // Immediate Stop & Barge-in with Incremental Generation Cancellation
  const handleStopAll = () => {
    generationIdRef.current += 1;
    speechQueueRef.current = [];
    isSpeakingSentenceRef.current = false;
    isSpeakingRef.current = false;
    userTurnedListeningOnRef.current = false;
    isVoiceTriggeredRef.current = false;

    stopMicrophone();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn("[VoiceAgent] cancel error:", err);
      }
      activeUtterancesRef.current = [];
    }

    if (voiceAbortRef.current) {
      try {
        voiceAbortRef.current.abort();
      } catch {}
      voiceAbortRef.current = null;
    }

    if (serverAudioRef.current) {
      try {
        serverAudioRef.current.pause();
        serverAudioRef.current.currentTime = 0;
      } catch {}
      serverAudioRef.current = null;
    }

    setVoiceStatus("idle");
    setCurrentSpokenSentence("");
    setSpeakingIndex(null);

    if (onStopGeneration) {
      try {
        onStopGeneration();
      } catch {}
    }
  };

  // Speech Queue Processor: Speaks sentences sequentially in correct language
  const processSpeechQueue = async (targetLang: "te-IN" | "hi-IN" | "en-IN", genId: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (genId !== generationIdRef.current) return;
    if (isSpeakingSentenceRef.current || speechQueueRef.current.length === 0) return;

    const nextText = speechQueueRef.current.shift();
    if (!nextText) return;

    isSpeakingSentenceRef.current = true;
    isSpeakingRef.current = true;
    stopMicrophone();

    const sentenceScript = detectTextLanguage(nextText);
    const effectiveLang = sentenceScript !== "en-IN" ? sentenceScript : targetLang;

    const matchedVoice = selectVoiceForLanguage(effectiveLang);
    const isTelugu = effectiveLang === "te-IN";
    const hasTeluguVoice =
      matchedVoice &&
      (matchedVoice.lang.toLowerCase().includes("te") || matchedVoice.name.toLowerCase().includes("telugu"));

    // If Telugu and device lacks local Telugu voice, try server-side TTS fallback
    if (isTelugu && !hasTeluguVoice) {
      try {
        const resp = await fetch(`${API_BASE}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nextText, language: "te-IN" }),
        });
        if (resp.ok && resp.headers.get("content-type")?.includes("audio") && genId === generationIdRef.current) {
          const blob = await resp.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          serverAudioRef.current = audio;

          audio.onplay = () => {
            stopMicrophone();
            isSpeakingRef.current = true;
            setVoiceStatus("speaking");
          };
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            serverAudioRef.current = null;
            isSpeakingSentenceRef.current = false;
            if (genId === generationIdRef.current && speechQueueRef.current.length > 0) {
              processSpeechQueue(targetLang, genId);
            } else {
              isSpeakingRef.current = false;
              setVoiceStatus("idle");
              setSpeakingIndex(null);
              if (userTurnedListeningOnRef.current) {
                setTimeout(() => {
                  if (!isSpeakingRef.current && userTurnedListeningOnRef.current) {
                    toggleListening(true);
                  }
                }, 600);
              }
            }
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            serverAudioRef.current = null;
            isSpeakingSentenceRef.current = false;
            fallbackSpeakUtterance(nextText, effectiveLang, matchedVoice, targetLang, genId);
          };
          await audio.play();
          return;
        }
      } catch {
        // Fallback to browser utterance
      }
    }

    fallbackSpeakUtterance(nextText, effectiveLang, matchedVoice, targetLang, genId);
  };

  const fallbackSpeakUtterance = (
    text: string,
    lang: "te-IN" | "hi-IN" | "en-IN",
    voice: SpeechSynthesisVoice | null,
    targetLang: "te-IN" | "hi-IN" | "en-IN",
    genId: number
  ) => {
    if (genId !== generationIdRef.current) return;

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterancesRef.current.push(utterance);
    utterance.lang = lang;
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = lang === "en-IN" ? 1.05 : 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      if (genId !== generationIdRef.current) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
        return;
      }
      stopMicrophone();
      isSpeakingRef.current = true;
      setCurrentSpokenSentence(text);
      if (!firstAudioLoggedRef.current) {
        firstAudioLoggedRef.current = true;
        const ttfa = Math.round(performance.now() - speechStartTimeRef.current);
        console.log(`[VoiceAgent] Time to first audio: ${ttfa}ms`);
      }
      setVoiceStatus("speaking");
    };

    utterance.onboundary = (event: any) => {
      if (event && event.name === "word") {
        const word = text.slice(event.charIndex).split(/\s+/)[0];
        if (word) {
          setCurrentSpokenSentence(word);
        }
      }
    };

    utterance.onend = () => {
      activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
      isSpeakingSentenceRef.current = false;
      setCurrentSpokenSentence("");
      if (genId === generationIdRef.current && speechQueueRef.current.length > 0) {
        processSpeechQueue(targetLang, genId);
      } else {
        isSpeakingRef.current = false;
        setVoiceStatus("idle");
        setSpeakingIndex(null);
        if (userTurnedListeningOnRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current && userTurnedListeningOnRef.current) {
              toggleListening(true);
            }
          }, 600);
        }
      }
    };

    utterance.onerror = () => {
      activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
      isSpeakingSentenceRef.current = false;
      setCurrentSpokenSentence("");
      if (genId === generationIdRef.current && speechQueueRef.current.length > 0) {
        processSpeechQueue(targetLang, genId);
      } else {
        isSpeakingRef.current = false;
        setVoiceStatus("idle");
        setSpeakingIndex(null);
        if (userTurnedListeningOnRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current && userTurnedListeningOnRef.current) {
              toggleListening(true);
            }
          }, 600);
        }
      }
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  };

  const queueSentenceForTts = (sentence: string, targetLang: "te-IN" | "hi-IN" | "en-IN", genId: number) => {
    const cleaned = cleanTtsSpokenText(sentence);
    if (!cleaned) return;
    speechQueueRef.current.push(cleaned);
    processSpeechQueue(targetLang, genId);
  };

  // Streaming Voice Query Handler: POST /api/voice/stream with Sentence-by-Sentence TTS
  const handleVoiceQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    // Reject echo of previous assistant message
    if (isAssistantEcho(trimmed, lastAssistantReplyRef.current)) {
      console.log("[VoiceAgent] Ignored query matching assistant reply (echo):", trimmed);
      return;
    }

    handleStopAll();
    stopMicrophone();

    const currentGen = generationIdRef.current;
    const abortCtrl = new AbortController();
    voiceAbortRef.current = abortCtrl;

    voiceStreamHandledRef.current = true;
    isVoiceTriggeredRef.current = true;
    speechStartTimeRef.current = performance.now();
    firstTokenLoggedRef.current = false;
    firstAudioLoggedRef.current = false;
    setVoiceStatus("thinking");
    setVoiceError(null);

    // Warm backend & voices
    fetch(`${API_BASE}/api/health`).catch(() => {});
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }

    const queryScript = detectTextLanguage(trimmed);
    const streamLang: "auto" | "en-IN" | "te-IN" | "hi-IN" =
      voiceLang === "auto" ? (queryScript !== "en-IN" ? queryScript : "auto") : voiceLang;
    const targetAudioLang: "te-IN" | "hi-IN" | "en-IN" =
      streamLang === "auto" ? queryScript : streamLang;

    const cleanHistory = messages
      .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    const payload = {
      message: trimmed,
      language: streamLang,
      history: cleanHistory,
      profile: profile
        ? {
            cgpa: profile.cgpa,
            backlogs: profile.backlogs,
            internships: profile.internships,
            communication: profile.communication,
            coding: profile.coding,
            target_role: profile.targetRole,
            target_tier: profile.targetTier,
            branch: profile.branch,
          }
        : undefined,
      active_tab: activeTab || "coach",
      tutor_state: tutorState,
    };

    // Feed user message immediately to the console
    startTransition(() => {
      onSendMessage(trimmed);
    });

    try {
      const resp = await fetch(`${API_BASE}/api/voice/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortCtrl.signal,
      });

      if (!resp.ok) {
        throw new Error(`Voice streaming responded with status ${resp.status}`);
      }

      if (!resp.body) {
        throw new Error("No response body available for streaming");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedSpoken = "";
      let hitScreenMarker = false;
      let spokenSentenceCount = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (currentGen !== generationIdRef.current) {
          reader.cancel().catch(() => {});
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;

          const jsonStr = trimmedLine.replace(/^data:\s*/, "").trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const token = parsed.token || "";

            if (token && !firstTokenLoggedRef.current) {
              firstTokenLoggedRef.current = true;
              const ttft = Math.round(performance.now() - speechStartTimeRef.current);
              console.log(`[VoiceAgent] Time to first token: ${ttft}ms`);
            }

            // Check provider tag
            if (token.includes("[[PROVIDER:")) {
              const match = token.match(/\[\[PROVIDER:([^\]]+)\]\]/);
              if (match) {
                setActiveProvider(match[1]);
              }
            }

            // Check tutor marker
            if (token.includes("[[TUTOR:")) {
              const tutor = parseTutorState(token);
              if (tutor) {
                updateTutorState(tutor);
              }
            }

            // Check actions & navigation
            if (token.includes("[[NAVIGATE:")) {
              const match = token.match(/\[\[NAVIGATE:([a-z0-9_-]+)\]\]/);
              if (match && onNavigateTab) {
                onNavigateTab(match[1]);
              }
            }
            if (token.includes("[[ACTION:BUILD_RESUME]]")) {
              if (onOpenResumeBuilder) {
                onOpenResumeBuilder();
              }
            }

            // Split sentence-by-sentence for TTS before ---SCREEN---
            // Strict cap of 3 sentences max for spoken voice
            if (!hitScreenMarker && spokenSentenceCount < 3) {
              if (token.includes("---SCREEN---")) {
                hitScreenMarker = true;
                const beforeMarker = token.split("---SCREEN---")[0];
                accumulatedSpoken += beforeMarker;
                if (accumulatedSpoken.trim()) {
                  spokenSentenceCount += 1;
                  queueSentenceForTts(accumulatedSpoken.trim(), targetAudioLang, currentGen);
                  accumulatedSpoken = "";
                }
              } else {
                accumulatedSpoken += token;
                const sentenceMatch = accumulatedSpoken.match(/^(.*?[.!?])(?:\s+|$)([\s\S]*)$/);
                if (sentenceMatch) {
                  const completedSentence = sentenceMatch[1];
                  accumulatedSpoken = sentenceMatch[2];
                  spokenSentenceCount += 1;
                  queueSentenceForTts(completedSentence, targetAudioLang, currentGen);
                  if (spokenSentenceCount >= 3) {
                    accumulatedSpoken = "";
                  }
                }
              }
            } else if (token.includes("---SCREEN---")) {
              hitScreenMarker = true;
            }

            if (parsed.done) {
              break;
            }
          } catch {}
        }
      }

      if (!hitScreenMarker && accumulatedSpoken.trim() && spokenSentenceCount < 3 && currentGen === generationIdRef.current) {
        queueSentenceForTts(accumulatedSpoken.trim(), targetAudioLang, currentGen);
      }
    } catch (err: any) {
      if (abortCtrl.signal.aborted) return;
      console.warn("[VoiceAgent] Voice stream notice:", err.message);
      setVoiceError(
        targetAudioLang === "te-IN"
          ? "వాయిస్ కనెక్ట్ అవుతోంది. AI సమాధానం వచ్చిన వెంటనే చదువుతుంది."
          : "Voice connection notice. Assistant will speak once the response completes."
      );
      setVoiceStatus("idle");
    }
  };

  // Toggle browser microphone speech recognition with ~1.5s silence detection
  const toggleListening = (autoRestart = false) => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice recognition is supported in Google Chrome and Microsoft Edge. Please use a supported browser.");
      return;
    }

    // If already listening and user clicked mic button, turn off listening
    if (voiceStatus === "listening" && !autoRestart) {
      userTurnedListeningOnRef.current = false;
      handleStopAll();
      return;
    }

    // Never listen while agent is actively speaking
    if (isSpeakingRef.current) {
      return;
    }

    handleStopAll();
    userTurnedListeningOnRef.current = true;

    try {
      fetch(`${API_BASE}/api/health`).catch(() => {});
      if ("speechSynthesis" in window) {
        window.speechSynthesis.getVoices();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        voiceLang === "auto"
          ? ((typeof navigator !== "undefined" && navigator.language) ? navigator.language : "en-IN")
          : voiceLang;

      let recognizedText = "";

      recognition.onstart = () => {
        setVoiceStatus("listening");
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        // Drop any results if agent started speaking
        if (isSpeakingRef.current) return;

        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + " ";
        }
        const cleaned = transcript.trim();

        // Echo rejection: reject if transcript is echo of assistant reply
        if (isAssistantEcho(cleaned, lastAssistantReplyRef.current)) {
          console.log("[VoiceAgent] Mic heard assistant echo, ignored");
          return;
        }

        recognizedText = cleaned;
        setInput(cleaned);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          try {
            recognition.stop();
          } catch {}
        }, 1500);
      };

      recognition.onerror = (e: any) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (e.error === "not-allowed" || e.error === "permission-denied") {
          userTurnedListeningOnRef.current = false;
          setVoiceError("Microphone permission was denied. Please allow microphone access in your browser settings to speak.");
        } else if (e.error === "no-speech") {
          // Waiting for user to speak
        } else if (e.error !== "aborted") {
          setVoiceError(`Voice input notice (${e.error || "interrupted"}). Click mic to retry.`);
        }
        if (!isSpeakingRef.current) {
          setVoiceStatus("idle");
        }
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (!isSpeakingRef.current) {
          setVoiceStatus((prev) => (prev === "listening" ? "idle" : prev));
        }

        if (isSpeakingRef.current) return;

        const finalQuery = recognizedText.trim();
        if (finalQuery) {
          setInput("");

          // 1. Debounce rapid duplicate sends (< 1500ms)
          const now = Date.now();
          if (now - lastSentTimeRef.current < 1500) {
            console.log("[VoiceAgent] Debounced rapid duplicate send:", finalQuery);
            return;
          }

          // 2. Reject repeated transcript
          if (finalQuery.toLowerCase() === lastSentTranscriptRef.current.toLowerCase()) {
            console.log("[VoiceAgent] Ignored repeated transcript:", finalQuery);
            return;
          }

          // 3. Reject echo of assistant answer
          if (isAssistantEcho(finalQuery, lastAssistantReplyRef.current)) {
            console.log("[VoiceAgent] Ignored echo of assistant reply:", finalQuery);
            return;
          }

          lastSentTranscriptRef.current = finalQuery;
          lastSentTimeRef.current = now;
          handleVoiceQuery(finalQuery);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setVoiceStatus("idle");
    }
  };

  // Text-to-Speech audio reader for individual messages
  const speakText = async (text: string, index?: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingIndex === (index ?? -1)) {
      handleStopAll();
      return;
    }

    handleStopAll();
    stopMicrophone();

    const currentGen = generationIdRef.current;
    const textLang = detectTextLanguage(text);
    const targetLang: "te-IN" | "hi-IN" | "en-IN" =
      voiceLang === "auto" ? textLang : (voiceLang as "te-IN" | "hi-IN" | "en-IN");

    // Strictly SHORT spoken reply (2-4 sentences max, no markdown, no URLs, offer to continue)
    const shortSpoken = extractShortSpokenReply(text, targetLang);
    if (!shortSpoken) return;

    const sentences = splitSentences(shortSpoken);
    if (sentences.length === 0) return;

    isSpeakingRef.current = true;
    setSpeakingIndex(index ?? -1);
    speechQueueRef.current = sentences;
    processSpeechQueue(targetLang, currentGen);
  };

  // Cleanup speech synthesis and listeners on unmount
  useEffect(() => {
    return () => {
      handleStopAll();
    };
  }, []);

  // When a new assistant message arrives:
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        // Record last assistant reply for echo rejection
        lastAssistantReplyRef.current = last.content;

        const tutor = parseTutorState(last.content);
        if (tutor) {
          updateTutorState(tutor);
        }

        // If this turn was already streamed and spoken by voice, do NOT speak it again!
        if (voiceStreamHandledRef.current) {
          voiceStreamHandledRef.current = false;
          isVoiceTriggeredRef.current = false;
          return;
        }

        let isBlueprintTrigger = false;
        try {
          if (sessionStorage.getItem("pathfinder_blueprint_voice_trigger") === "true") {
            isBlueprintTrigger = true;
            sessionStorage.removeItem("pathfinder_blueprint_voice_trigger");
          }
        } catch {}

        // Strictly speak ONLY if this turn was explicitly initiated by microphone voice or interactive voice trigger
        const shouldSpeak = (isVoiceTriggeredRef.current || isBlueprintTrigger) && !isSpeakingRef.current;

        if (shouldSpeak && voiceStatus === "idle") {
          isVoiceTriggeredRef.current = false;
          speakText(last.content, messages.length - 1);
        }
      }
    }
  }, [messages, isLoading, voiceStatus]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSafeSend = (text: string) => {
    const trimmed = text.trim();
    const now = Date.now();
    if (!trimmed || isLoading || now - lastActionTimeRef.current < 600) return;
    lastActionTimeRef.current = now;
    startTransition(() => {
      onSendMessage(trimmed);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;
    if (voiceStatus === "listening") {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setVoiceStatus("idle");
    }
    setInput("");
    handleSafeSend(query);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(cleanDisplayContent(text));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="relative flex h-[760px] flex-col overflow-hidden rounded-3xl border border-[#161926] bg-[#11131c] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      {/* 1. Slim Header Bar */}
      <div className="flex items-center justify-between border-b border-[#161926] bg-[#0a0b10]/95 px-4 sm:px-6 py-2.5 shrink-0 z-20">
        {/* Left: Title & Real Provider Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate">
              DAS AI: Voice-First Placement Coach
            </h2>
            {/* Real Provider Badge (Never hardcoded) */}
            <span className="shrink-0 flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-950/60 px-2.5 py-0.5 text-[10px] font-bold text-violet-300 font-mono shadow-[0_0_10px_rgba(124,58,237,0.25)]">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span>{activeProvider}</span>
            </span>
          </div>
        </div>

        {/* Right: Language Selector, Mute Toggle, Stop, and Overflow Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Selector Chips */}
          <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-0.5">
            {[
              { id: "auto", label: "Auto" },
              { id: "en-IN", label: "EN" },
              { id: "te-IN", label: "తెలుగు" },
              { id: "hi-IN", label: "हिंदी" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setVoiceLanguage(item.id as VoiceLanguage)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                  voiceLang === item.id
                    ? "bg-violet-600/30 text-white border border-violet-500/40 shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Voice Reply Mute Toggle */}
          <button
            type="button"
            onClick={toggleAutoSpeak}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              autoSpeak
                ? "border-violet-500/40 bg-violet-600/20 text-violet-300 shadow-[0_0_10px_rgba(124,58,237,0.2)]"
                : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
            }`}
            title={autoSpeak ? "Voice replies are ON — Click to mute" : "Voice replies are MUTED — Click to enable"}
          >
            {autoSpeak ? <Volume2 className="h-3.5 w-3.5 text-violet-400" /> : <VolumeX className="h-3.5 w-3.5 text-zinc-500" />}
            <span className="hidden sm:inline">{autoSpeak ? "Voice Reply ON" : "Muted"}</span>
          </button>

          {/* Stop Button */}
          <button
            type="button"
            onClick={handleStopAll}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-600/20 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-600/30 active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Stop speaking and audio immediately"
          >
            <Square className="h-3 w-3 fill-current" />
            <span className="hidden sm:inline">Stop</span>
          </button>

          {/* Overflow Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOverflowOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              title="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Overflow Dropdown Card */}
            {isOverflowOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-[#11131c] p-2 shadow-2xl z-30 space-y-1"
                onClick={() => setIsOverflowOpen(false)}
              >
                {/* Chat vs Interview Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setMode((prev) => (prev === "chat" ? "interview" : "chat"))}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    {mode === "chat" ? <MessageSquare className="h-3.5 w-3.5 text-violet-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
                    <span>Mode: {mode === "chat" ? "Chat Mode" : "Mock Interview"}</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-violet-400">Switch</span>
                </button>

                {/* Test Speaker */}
                <button
                  type="button"
                  onClick={testSpeakerAudio}
                  disabled={speakerTestState === "testing"}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                >
                  <Volume2 className="h-3.5 w-3.5 text-violet-400" />
                  <span>{speakerTestState === "testing" ? "Testing Audio..." : "Test Speaker"}</span>
                </button>

                {/* View Full History Sheet */}
                <button
                  type="button"
                  onClick={() => setIsSheetOpen(true)}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 transition-colors text-left"
                >
                  <FileText className="h-3.5 w-3.5 text-violet-400" />
                  <span>View Full Answers & Code</span>
                </button>

                {/* Reset Conversation */}
                <button
                  type="button"
                  onClick={() => {
                    handleStopAll();
                    onClearChat();
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left border-t border-white/5 pt-2"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  <span>Reset Conversation</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Speaker Diagnostic Status Banner */}
      {speakerTestMsg && (
        <div
          className={`flex items-center justify-between border-b px-6 py-2 text-xs font-semibold ${
            speakerTestState === "error"
              ? "border-[#6d28d9]/30 bg-[#6d28d9]/10 text-[#6d28d9]"
              : "border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#7c3aed]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 shrink-0 text-[#7c3aed]" />
            <span>{speakerTestMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeakerTestMsg(null)}
            className="text-[#7c3aed] hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice Warning Banner (Friendly Fallback) */}
      {voiceError && (
        <div className="flex items-center justify-between border-b border-[#6d28d9]/30 bg-[#6d28d9]/10 px-6 py-2 text-xs text-[#6d28d9]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#6d28d9]" />
            <span>{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="text-[#6d28d9] hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Telugu Voice Fallback Banner */}
      {voiceLang === "te-IN" && !hasTeluguVoice && !dismissTeluguNotice && (
        <div className="flex items-center justify-between border-b border-[#6d28d9]/30 bg-[#6d28d9]/10 px-6 py-2 text-xs text-[#6d28d9]">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-[#6d28d9]" />
            <span>
              ℹ️ <strong>Telugu Mode Active:</strong> Full Telugu responses are displayed in chat.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDismissTeluguNotice(true);
              try {
                localStorage.setItem("pathfinder_dismiss_te_notice", "1");
              } catch {}
            }}
            className="text-[#6d28d9] hover:text-white font-bold ml-2 cursor-pointer"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mock Interview Ribbon */}
      {mode === "interview" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#161926] bg-[#0a0b10] px-6 py-2.5 gap-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-white animate-pulse" />
            <span className="text-xs font-bold text-white">
              Live Mock Interview Simulator:
            </span>
            <span className="text-xs text-[#94a3b8] hidden md:inline">
              Answer aloud or type your solution. The AI evaluates with STAR scoring.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {MOCK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSafeSend(q.prompt)}
                disabled={isLoading}
                className="rounded-lg border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-white/20 transition-all disabled:opacity-50"
              >
                {q.category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Main Body: Face-First Center Stage + Desktop "Ask Me" Sidebar */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden min-h-0 relative">
        {/* Center Stage: ONLY the human face (55-65% height), Status Word, Live Captions, and "View Full Answer" Chip */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-0 overflow-y-auto bg-radial from-[#151726]/40 via-transparent to-transparent">
          {/* Large Human Face Avatar (55-65% of panel height) */}
          <div className="flex items-center justify-center w-full my-auto py-2">
            <AvatarCanvas
              state={voiceStatus}
              spokenText={currentSpokenSentence}
              isSpeaking={voiceStatus === "speaking"}
              width={280}
              height={336}
              className="w-auto max-h-[50vh] sm:max-h-[55vh] drop-shadow-[0_16px_48px_rgba(124,58,237,0.25)] border-violet-500/20"
            />
          </div>

          {/* Status Word under Face: Ready / Listening / Thinking / Speaking */}
          <div className="mt-2 flex items-center gap-2 shrink-0">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                voiceStatus === "speaking"
                  ? "bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20"
                  : voiceStatus === "listening"
                  ? "bg-violet-400 animate-ping ring-4 ring-violet-400/20"
                  : voiceStatus === "thinking"
                  ? "bg-amber-400 animate-spin ring-4 ring-amber-400/20"
                  : "bg-zinc-500"
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              {voiceStatus === "speaking"
                ? "Speaking"
                : voiceStatus === "listening"
                ? "Listening"
                : voiceStatus === "thinking"
                ? "Thinking"
                : "Ready"}
            </span>
            {isLoading && voiceStatus !== "speaking" && (
              <span className="text-xs text-zinc-400 font-normal">
                ({isServerWakingUp ? "Waking up server..." : "Synthesizing answer..."})
              </span>
            )}
          </div>

          {/* Live Captions (Maximum 2 lines, smooth fading) */}
          <div className="mt-2 w-full max-w-xl px-4 text-center min-h-[44px] flex items-center justify-center shrink-0">
            <p className="text-xs sm:text-sm font-medium text-zinc-200 line-clamp-2 leading-relaxed transition-opacity duration-300">
              {currentSpokenSentence ? (
                currentSpokenSentence
              ) : messages.length > 0 && messages[messages.length - 1].role === "assistant" ? (
                parseScreenMarker(cleanDisplayContent(messages[messages.length - 1].content)).spoken || "Answer completed. Ask me anything!"
              ) : (
                "Hello! Ask any question about placements, resumes, projects, or this website."
              )}
            </p>
          </div>

          {/* "View full answer" Chip (Opens slide-over sheet with full text, code, lists & history) */}
          {messages.length > 0 && (
            <div className="mt-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  setIsSheetOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/15 hover:bg-violet-600/25 px-3.5 py-1.5 text-xs font-semibold text-violet-200 transition-all active:scale-95 shadow-sm cursor-pointer hover:border-violet-400 group"
              >
                <FileText className="h-3.5 w-3.5 text-violet-400 group-hover:scale-110 transition-transform" />
                <span>View full answer & details</span>
                <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300 font-bold">
                  {messages.length} msg{messages.length > 1 ? "s" : ""}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Right Side Column (Desktop): "Ask me" Column with 6 to 8 Clickable Questions */}
        <div className="hidden lg:flex w-72 lg:w-80 border-l border-[#161926] bg-[#0c0d16]/70 p-4 flex-col gap-2 shrink-0 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Ask me
            </span>
            <span className="text-[10px] text-zinc-500 font-medium">Click to ask</span>
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            {ASK_ME_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  unlockAudio();
                  handleSafeSend(q.prompt);
                }}
                disabled={isLoading}
                className="w-full text-left rounded-xl border border-white/5 bg-white/[0.03] hover:bg-violet-600/15 hover:border-violet-500/30 p-2.5 transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-sm shrink-0 group-hover:scale-110 transition-transform">{q.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">{q.title}</p>
                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{q.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Scrollable "Ask me" Chips Row (Above input on mobile/tablet) */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto border-t border-[#161926] bg-[#0c0d16] px-4 py-2 scrollbar-none shrink-0">
        <span className="text-[11px] font-bold text-violet-400 shrink-0 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Ask me:
        </span>
        {ASK_ME_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              unlockAudio();
              handleSafeSend(q.prompt);
            }}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-violet-600/20 hover:border-violet-500/30 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            <span>{q.icon}</span>
            <span>{q.title}</span>
          </button>
        ))}
      </div>

      {/* 3. Bottom: ONE input bar only, full width, with a send button and a small mic button inside the bar. Enter sends. No other controls down there. */}
      <div className="border-t border-[#161926] bg-[#0a0b12] p-3 sm:p-4 shrink-0">
        <form onSubmit={(e) => { unlockAudio(); handleSubmit(e); }} className="w-full">
          <div className="relative flex items-center w-full">
            <input
              id="chat-console-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={unlockAudio}
              placeholder={
                voiceStatus === "listening"
                  ? "Listening... Speak your question into the microphone..."
                  : "Ask anything about placement, resume, projects, or this website..."
              }
              className={`w-full rounded-2xl border bg-[#0a0b10] py-3 pl-4 pr-24 text-xs sm:text-sm font-medium text-[#f8fafc] outline-none transition-all placeholder:text-[#94a3b8] ${
                voiceStatus === "listening"
                  ? "border-[#7c3aed] ring-2 ring-[#7c3aed]/25"
                  : "border-[#161926] focus:border-white/40 focus:ring-1 focus:ring-white/20"
              }`}
            />

            {/* Small Mic Button inside input bar */}
            <button
              id="chat-console-mic"
              type="button"
              onClick={() => {
                unlockAudio();
                toggleListening();
              }}
              className={`absolute right-12 flex h-8 w-8 items-center justify-center rounded-xl transition-all shadow-sm cursor-pointer ${
                voiceStatus === "listening"
                  ? "bg-violet-600 text-white animate-pulse ring-2 ring-violet-500/50"
                  : "bg-white/10 text-white hover:bg-white/20 active:scale-95"
              }`}
              title={voiceStatus === "listening" ? "Stop listening" : "Click to speak with microphone"}
            >
              {voiceStatus === "listening" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Send Button inside input bar */}
            <button
              id="chat-console-send"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-950 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-40 shadow-sm cursor-pointer"
              title="Send text message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* 4. Slide-over Sheet: Full Answer & Complete Conversation History */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSheetOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-full sm:w-[540px] md:w-[620px] bg-[#0c0d16] border-l border-zinc-800 shadow-2xl flex flex-col h-full z-10">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#161926] bg-[#0a0b12]">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-violet-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Full Answers & History</h3>
                  <p className="text-[11px] text-zinc-400">Complete architectural blueprints & conversation records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Close sheet"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages Scroll Area inside Drawer */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 py-12">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-xs">No conversation yet. Speak or type to start!</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const { spoken, screen, hasScreen } = parseScreenMarker(cleanDisplayContent(m.content));
                  return (
                    <div
                      key={idx}
                      className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {m.role === "assistant" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 shadow-sm mt-0.5">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div
                        className={`group relative max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                          m.role === "user"
                            ? "rounded-tr-none bg-gradient-to-r from-[#f8fafc] to-[#f8fafc] text-zinc-950 font-medium shadow-md shadow-white/10"
                            : "rounded-tl-none border border-[#161926] bg-[#0a0b10] text-[#f8fafc] shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <div className="space-y-3">
                            {hasScreen ? (
                              <>
                                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs sm:text-sm font-medium text-white shadow-sm flex items-start gap-2.5">
                                  <Volume2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                                  <div className="flex-1 leading-relaxed">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 block mb-1">
                                      🎙️ Spoken Summary
                                    </span>
                                    {spoken}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-[#161926] bg-[#11131c]/70 p-4 prose prose-sm dark:prose-invert max-w-none text-[#f8fafc] leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-xs [&>strong]:text-white [&>code]:bg-white/10 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded">
                                  <Streamdown>{screen}</Streamdown>
                                </div>
                              </>
                            ) : (
                              <div className="prose prose-sm dark:prose-invert max-w-none text-[#f8fafc] leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-xs [&>strong]:text-white [&>code]:bg-white/10 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded">
                                <Streamdown>{cleanDisplayContent(m.content)}</Streamdown>
                              </div>
                            )}

                            {/* Action Triggers in Assistant Message */}
                            {(m.content.toLowerCase().includes("resume") ||
                              m.content.includes("[[ACTION:BUILD_RESUME]]")) &&
                              onOpenResumeBuilder && (
                                <div className="pt-2 border-t border-[#161926] flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsSheetOpen(false);
                                      onOpenResumeBuilder();
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-3 py-1.5 text-xs font-bold text-[#7c3aed] hover:bg-[#7c3aed]/20 active:scale-95 transition-all shadow-sm cursor-pointer"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>Open One-Page ATS Resume Builder</span>
                                  </button>
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        )}

                        {/* Actions (Copy / Read Aloud) */}
                        {m.role === "assistant" && (
                          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => speakText(m.content, idx)}
                              className="rounded p-1 text-zinc-400 hover:text-white"
                              title="Listen aloud"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(m.content, idx)}
                              className="rounded p-1 text-zinc-400 hover:text-white"
                              title="Copy text"
                            >
                              {copiedIndex === idx ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

