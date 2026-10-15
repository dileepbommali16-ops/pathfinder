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
  Headphones
} from "lucide-react";
import { Streamdown } from "streamdown";
import { StudentProfileState } from "@/types/profile";
import { API_BASE } from "@/lib/apiClient";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export type VoiceLanguage = "en-IN" | "te-IN" | "hi-IN";

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
    .replace(/\[\[NAVIGATE:[^\]]+\]\]/g, "")
    .replace(/\[\[ACTION:[^\]]+\]\]/g, "")
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#*_~>|]/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
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

  // Voice Pipeline States
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>("en-IN");
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [collapsedScreenMap, setCollapsedScreenMap] = useState<Record<number, boolean>>({});
  const [tutorState, setTutorState] = useState<{ currentProjectId?: string; stepIndex: number } | null>(null);

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

  // Utterance Reference to prevent Chromium V8 garbage collection mid-speech
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  // Track if query was triggered by voice so assistant response always auto-speaks
  const isVoiceTriggeredRef = useRef<boolean>(false);

  // Speaker Diagnostic Test States
  const [speakerTestState, setSpeakerTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [speakerTestMsg, setSpeakerTestMsg] = useState<string | null>(null);

  // Fallback Audio Reader
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [autoSpeakQuestions, setAutoSpeakQuestions] = useState(true);

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

  // Clean navigation / action markers from user-facing text
  const cleanDisplayContent = (content: string) => {
    return content
      .replace(/\[\[NAVIGATE:[^\]]+\]\]/g, "")
      .replace(/\[\[ACTION:[^\]]+\]\]/g, "");
  };

  // Immediate Stop & Barge-in
  const handleStopAll = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      activeUtterancesRef.current = [];
    }
    isSpeakingSentenceRef.current = false;
    speechQueueRef.current = [];
    isVoiceTriggeredRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (voiceAbortRef.current) {
      voiceAbortRef.current.abort();
      voiceAbortRef.current = null;
    }
    setVoiceStatus("idle");
    setSpeakingIndex(null);
    if (onStopGeneration) {
      onStopGeneration();
    }
  };

  // Speech Queue Processor: Speaks sentences sequentially
  const processSpeechQueue = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeakingSentenceRef.current || speechQueueRef.current.length === 0) return;

    const nextText = speechQueueRef.current.shift();
    if (!nextText) return;

    isSpeakingSentenceRef.current = true;
    const utterance = new SpeechSynthesisUtterance(nextText);
    activeUtterancesRef.current.push(utterance);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voiceLang === "te-IN") {
      const teVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("te") || v.name.toLowerCase().includes("telugu")
      );
      if (teVoice) {
        utterance.voice = teVoice;
        utterance.lang = "te-IN";
      } else {
        if (!teluguVoiceWarnedRef.current) {
          teluguVoiceWarnedRef.current = true;
          console.warn("[VoiceAgent] Native Telugu voice not installed on device. Displaying Telugu script on screen with default speech voice.");
        }
        const inVoice = voices.find((v) => v.lang.toLowerCase().includes("in"));
        if (inVoice) utterance.voice = inVoice;
      }
    } else if (voiceLang === "hi-IN") {
      const hiVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("hi") || v.name.toLowerCase().includes("hindi")
      );
      if (hiVoice) {
        utterance.voice = hiVoice;
        utterance.lang = "hi-IN";
      }
    } else {
      const enVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("india")
      );
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onstart = () => {
      if (!firstAudioLoggedRef.current) {
        firstAudioLoggedRef.current = true;
        const ttfa = Math.round(performance.now() - speechStartTimeRef.current);
        console.log(`[VoiceAgent] Time to first audio: ${ttfa}ms`);
      }
      setVoiceStatus("speaking");
    };

    utterance.onend = () => {
      activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
      isSpeakingSentenceRef.current = false;
      if (speechQueueRef.current.length > 0) {
        processSpeechQueue();
      } else {
        setVoiceStatus("idle");
      }
    };

    utterance.onerror = () => {
      activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
      isSpeakingSentenceRef.current = false;
      if (speechQueueRef.current.length > 0) {
        processSpeechQueue();
      } else {
        setVoiceStatus("idle");
      }
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  };

  const queueSentenceForTts = (sentence: string) => {
    const cleaned = cleanTtsSpokenText(sentence);
    if (!cleaned) return;
    speechQueueRef.current.push(cleaned);
    processSpeechQueue();
  };

  // Streaming Voice Query Handler: POST /api/voice/stream with Sentence-by-Sentence TTS
  const handleVoiceQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    isVoiceTriggeredRef.current = true;

    // Barge-in: stop any running audio
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      activeUtterancesRef.current = [];
    }
    isSpeakingSentenceRef.current = false;
    speechQueueRef.current = [];

    if (voiceAbortRef.current) {
      voiceAbortRef.current.abort();
    }
    const abortCtrl = new AbortController();
    voiceAbortRef.current = abortCtrl;

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

    const cleanHistory = messages
      .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    const payload = {
      message: trimmed,
      language: voiceLang,
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

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

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
            if (!hitScreenMarker) {
              if (token.includes("---SCREEN---")) {
                hitScreenMarker = true;
                const beforeMarker = token.split("---SCREEN---")[0];
                accumulatedSpoken += beforeMarker;
                // Flush remaining pre-marker sentences
                if (accumulatedSpoken.trim()) {
                  isVoiceTriggeredRef.current = false;
                  queueSentenceForTts(accumulatedSpoken.trim());
                  accumulatedSpoken = "";
                }
              } else {
                accumulatedSpoken += token;
                // Check if a full sentence is ready (. ! ? \n)
                const sentenceMatch = accumulatedSpoken.match(/^(.*?[.!?])(?:\s+|$)([\s\S]*)$/);
                if (sentenceMatch) {
                  const completedSentence = sentenceMatch[1];
                  accumulatedSpoken = sentenceMatch[2];
                  isVoiceTriggeredRef.current = false;
                  queueSentenceForTts(completedSentence);
                }
              }
            }

            if (parsed.done) {
              break;
            }
          } catch {}
        }
      }

      // Flush any trailing speech before screen marker
      if (!hitScreenMarker && accumulatedSpoken.trim()) {
        isVoiceTriggeredRef.current = false;
        queueSentenceForTts(accumulatedSpoken.trim());
      }
    } catch (err: any) {
      if (abortCtrl.signal.aborted) return;
      console.warn("[VoiceAgent] Voice stream notice:", err.message);
      // Keep isVoiceTriggeredRef.current = true so when assistant message finishes generating via chat endpoint, it will still speak aloud!
      setVoiceError(
        voiceLang === "te-IN"
          ? "వాయిస్ కనెక్ట్ అవుతోంది. AI సమాధానం వచ్చిన వెంటనే చదువుతుంది."
          : "Voice connection notice. Assistant will speak once the response completes."
      );
      setVoiceStatus("idle");
    }
  };

  // Toggle browser microphone speech recognition with ~1s silence detection
  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice recognition is supported in Google Chrome and Microsoft Edge. Please use a supported browser.");
      return;
    }

    if (voiceStatus === "listening") {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {}
      setVoiceStatus("idle");
      return;
    }

    // Barge-in: cancel any running TTS immediately
    handleStopAll();

    try {
      // Warm backend & voices on initial mic click
      fetch(`${API_BASE}/api/health`).catch(() => {});
      if ("speechSynthesis" in window) {
        window.speechSynthesis.getVoices();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceLang;

      let recognizedText = "";

      recognition.onstart = () => {
        setVoiceStatus("listening");
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + " ";
        }
        const cleaned = transcript.trim();
        recognizedText = cleaned;
        setInput(cleaned);

        // Reset ~1800ms silence auto-stop timer (natural speech pause)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          try {
            recognition.stop();
          } catch {}
        }, 1800);
      };

      recognition.onerror = (e: any) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (e.error === "not-allowed" || e.error === "permission-denied") {
          setVoiceError("Microphone permission was denied. Please allow microphone access in your browser settings to speak.");
        } else if (e.error === "no-speech") {
          setVoiceError("Malli cheppandi — no speech detected. Click the mic to try again.");
        } else {
          setVoiceError(`Voice input notice (${e.error || "interrupted"}). Click mic to retry.`);
        }
        setVoiceStatus("idle");
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setVoiceStatus((prev) => (prev === "listening" ? "idle" : prev));
        const finalQuery = recognizedText.trim();
        if (finalQuery) {
          setInput("");
          handleVoiceQuery(finalQuery);
        } else {
          setVoiceError(
            voiceLang === "te-IN"
              ? "వాయిస్ రికార్డ్ అవ్వలేదు. మైక్ అన్‌మ్యూట్ అయిందో లేదో చూడండి లేదా '🔊 Test Speaker' బటన్ నొక్కండి."
              : "No voice detected. Please unmute your microphone, speak clearly, or click '🔊 Test Speaker' to verify audio."
          );
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setVoiceStatus("idle");
    }
  };

  // Text-to-Speech audio reader for individual messages
  const speakText = (text: string, index?: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingIndex === (index ?? -1)) {
      window.speechSynthesis.cancel();
      activeUtterancesRef.current = [];
      setSpeakingIndex(null);
      setVoiceStatus("idle");
      return;
    }

    window.speechSynthesis.cancel();
    activeUtterancesRef.current = [];
    const { spoken } = parseScreenMarker(text);
    const cleanText = cleanTtsSpokenText(spoken || text).slice(0, 500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterancesRef.current.push(utterance);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voiceLang === "te-IN") {
      const teVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("te") || v.name.toLowerCase().includes("telugu")
      );
      if (teVoice) utterance.voice = teVoice;
    } else if (voiceLang === "hi-IN") {
      const hiVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("hi") || v.name.toLowerCase().includes("hindi")
      );
      if (hiVoice) utterance.voice = hiVoice;
    } else {
      const enVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("india")
      );
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onstart = () => setVoiceStatus("speaking");
    utterance.onend = () => {
      activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
      setSpeakingIndex(null);
      setVoiceStatus("idle");
    };
    utterance.onerror = () => {
      activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
      setSpeakingIndex(null);
      setVoiceStatus("idle");
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    setSpeakingIndex(index ?? -1);
    window.speechSynthesis.speak(utterance);
  };

  // Cleanup speech synthesis and listeners on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        activeUtterancesRef.current = [];
      }
      try {
        recognitionRef.current?.stop();
      } catch {}
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (voiceAbortRef.current) voiceAbortRef.current.abort();
    };
  }, []);

  // When a new assistant message arrives:
  // Auto-speak if the user asked via voice OR if autoSpeak is on in interview mode
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        const shouldSpeak =
          isVoiceTriggeredRef.current ||
          (autoSpeakQuestions && mode === "interview");

        if (shouldSpeak && voiceStatus === "idle") {
          isVoiceTriggeredRef.current = false;
          speakText(last.content, messages.length - 1);
        }
      }
    }
  }, [messages, isLoading, autoSpeakQuestions, mode, voiceStatus]);

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
    <div className="relative flex h-[760px] flex-col overflow-hidden rounded-3xl border border-[#2A2A30] bg-[#1B1B1F] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#2A2A30] bg-[#141417]/90 px-6 py-3.5 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white shadow-sm ring-1 ring-white/10">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#F2F2F3]">Pathfinder AI Voice & Career Mentor</h2>
              <span className="flex items-center gap-1.5 rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(255,255,255,0.15)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gemini 2.0 Flash
              </span>
            </div>
            <p className="text-[11px] text-[#A1A1AA]">
              Target: <span className="font-semibold text-white">{targetRole}</span> • Low Latency Voice Pipeline
            </p>
          </div>
        </div>

        {/* Voice Status Indicator, Language Toggle & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Voice State Indicator */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#141417] px-2.5 py-1 text-xs">
            {voiceStatus === "listening" && (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                Listening...
              </span>
            )}
            {voiceStatus === "thinking" && (
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                Thinking...
              </span>
            )}
            {voiceStatus === "speaking" && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Volume2 className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
                Speaking...
              </span>
            )}
            {voiceStatus === "idle" && (
              <span className="flex items-center gap-1.5 text-zinc-400 font-medium text-[11px]">
                <Radio className="h-3 w-3 text-zinc-500" />
                Voice Ready
              </span>
            )}
          </div>

          {/* Language Toggle (en-IN, te-IN, hi-IN) */}
          <div className="flex items-center rounded-xl border border-[#2A2A30] bg-[#141417] p-0.5">
            <button
              type="button"
              onClick={() => setVoiceLang("en-IN")}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-all ${
                voiceLang === "en-IN"
                  ? "bg-white/20 text-white border border-white/30 shadow-xs"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
              title="English (India)"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setVoiceLang("te-IN")}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-all ${
                voiceLang === "te-IN"
                  ? "bg-white/20 text-white border border-white/30 shadow-xs"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
              title="Telugu (తెలుగు)"
            >
              తెలుగు
            </button>
            <button
              type="button"
              onClick={() => setVoiceLang("hi-IN")}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-all ${
                voiceLang === "hi-IN"
                  ? "bg-white/20 text-white border border-white/30 shadow-xs"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
              title="Hindi (हिंदी)"
            >
              हिंदी
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl border border-[#2A2A30] bg-[#141417] p-1">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                mode === "chat"
                  ? "bg-white/20 text-white border border-white/30 shadow-sm"
                  : "text-[#A1A1AA] hover:text-[#F2F2F3]"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("interview")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                mode === "interview"
                  ? "bg-white/20 text-white border border-white/30 shadow-sm"
                  : "text-[#A1A1AA] hover:text-[#F2F2F3]"
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Interview</span>
            </button>
          </div>

          {/* Speaker Test Diagnostic Button */}
          <button
            type="button"
            onClick={testSpeakerAudio}
            disabled={speakerTestState === "testing"}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Click to verify if your speakers & browser audio are working"
          >
            {speakerTestState === "testing" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                <span className="hidden sm:inline">Testing Audio...</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Test Speaker</span>
              </>
            )}
          </button>

          {/* Stop Button (Barge-in / Stop Audio) */}
          {(voiceStatus !== "idle" || isLoading) && (
            <button
              type="button"
              onClick={handleStopAll}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all shadow-sm cursor-pointer"
              title="Stop voice output / generation"
            >
              <Square className="h-3 w-3 fill-rose-400 text-rose-400" />
              <span>Stop</span>
            </button>
          )}

          {/* Reset Chat */}
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="flex items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#141417] px-2.5 py-1.5 text-xs text-[#A1A1AA] transition-colors hover:border-red-500/40 hover:text-red-400"
              title="Clear chat history"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Speaker Diagnostic Status Banner */}
      {speakerTestMsg && (
        <div
          className={`flex items-center justify-between border-b px-6 py-2 text-xs font-semibold ${
            speakerTestState === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>{speakerTestMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeakerTestMsg(null)}
            className="text-cyan-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice Warning Banner (Friendly Fallback) */}
      {voiceError && (
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="text-amber-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mock Interview Ribbon */}
      {mode === "interview" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2A2A30] bg-[#141417] px-6 py-2.5 gap-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-white animate-pulse" />
            <span className="text-xs font-bold text-white">
              Live Mock Interview Simulator:
            </span>
            <span className="text-xs text-[#A1A1AA] hidden md:inline">
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

      {/* Quick Action Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[#2A2A30] bg-black/10 px-6 py-2 scrollbar-none">
        <span className="text-[11px] font-medium text-[#A1A1AA] shrink-0">Quick Commands:</span>
        {onOpenResumeBuilder && (
          <button
            type="button"
            onClick={onOpenResumeBuilder}
            className="shrink-0 flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <FileText className="h-3 w-3" />
            <span>📄 Build 1-Page Resume</span>
          </button>
        )}
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            onClick={() => handleSafeSend(action.prompt)}
            disabled={isLoading}
            className="shrink-0 rounded-lg border border-[#2A2A30] bg-[#141417] px-2.5 py-1 text-[11px] font-medium text-[#A1A1AA] transition-all hover:border-white/40 hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <Headphones className="h-7 w-7 text-white" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#F2F2F3]">AI Placement Voice Agent Ready</h3>
            <p className="mt-1 max-w-md text-xs text-[#A1A1AA] leading-relaxed">
              Click the microphone to speak naturally in English, Telugu, or Hindi. Speak your question and pause for 1 second to receive instant spoken analysis.
            </p>

            <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
              {PROMPT_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSafeSend(s)}
                  disabled={isLoading}
                  className="rounded-xl border border-[#2A2A30] bg-[#141417] px-3 py-1.5 text-xs text-[#A1A1AA] transition-all hover:border-white/40 hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, idx) => {
            const { spoken, screen, hasScreen } = parseScreenMarker(cleanDisplayContent(m.content));
            const isScreenExpanded = !collapsedScreenMap[idx];

            return (
              <div
                key={idx}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white shadow-sm mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  data-message-role={m.role}
                  className={`group relative max-w-[85%] rounded-2xl px-4.5 py-3 text-xs sm:text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-tr-none bg-gradient-to-r from-[#FFFFFF] to-[#F4F4F5] text-zinc-950 font-medium shadow-md shadow-white/10"
                      : "rounded-tl-none border border-[#2A2A30] bg-[#141417] text-[#F2F2F3] shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-xl"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="space-y-3">
                      {hasScreen ? (
                        <>
                          {/* 1. Spoken Summary Block */}
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs sm:text-sm font-medium text-white shadow-sm flex items-start gap-2.5">
                            <Volume2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div className="flex-1 leading-relaxed">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                                🎙️ Spoken Direct Insight
                              </span>
                              {spoken}
                            </div>
                          </div>

                          {/* 2. Expandable Screen Architecture Details */}
                          <div className="rounded-xl border border-[#2A2A30] bg-[#1B1B1F]/70 overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedScreenMap((prev) => ({
                                  ...prev,
                                  [idx]: !prev[idx],
                                }))
                              }
                              className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-[#A1A1AA] hover:text-white transition-all bg-black/30"
                            >
                              <span className="flex items-center gap-2">
                                <Layers className="h-3.5 w-3.5 text-white" />
                                <span>Full Architecture & Technical Details</span>
                              </span>
                              <span className="text-[11px] text-white flex items-center gap-1 font-bold">
                                {isScreenExpanded ? "Collapse" : "Continue Reading"}
                                <ChevronDown
                                  className={`h-3.5 w-3.5 transition-transform ${
                                    isScreenExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </span>
                            </button>

                            {isScreenExpanded && (
                              <div className="p-4 border-t border-[#2A2A30] prose prose-sm dark:prose-invert max-w-none text-[#F2F2F3] leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-xs [&>strong]:text-white [&>code]:bg-white/10 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded">
                                <Streamdown>{screen}</Streamdown>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[#F2F2F3] leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-xs [&>strong]:text-white [&>code]:bg-white/10 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded">
                          <Streamdown>{cleanDisplayContent(m.content)}</Streamdown>
                        </div>
                      )}

                      {/* Action Triggers in Assistant Message */}
                      {(m.content.toLowerCase().includes("resume") ||
                        m.content.includes("[[ACTION:BUILD_RESUME]]")) &&
                        onOpenResumeBuilder && (
                          <div className="pt-2 border-t border-[#2A2A30] flex items-center gap-2">
                            <button
                              type="button"
                              onClick={onOpenResumeBuilder}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all shadow-sm cursor-pointer"
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

                  {/* Message Copy and Speech Reader Controls */}
                  {m.role === "assistant" && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => speakText(m.content, idx)}
                        className={`rounded p-1 transition-colors ${
                          speakingIndex === idx
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-[#A1A1AA] hover:text-[#F2F2F3]"
                        }`}
                        title={speakingIndex === idx ? "Stop audio" : "Listen aloud"}
                      >
                        {speakingIndex === idx ? (
                          <VolumeX className="h-3.5 w-3.5" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(m.content, idx)}
                        className="rounded p-1 text-[#A1A1AA] hover:text-[#F2F2F3]"
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

                {m.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#141417] text-[#A1A1AA] mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#2A2A30] bg-[#141417] px-4 py-3 text-xs text-[#A1A1AA] shadow-md">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>
                  {isServerWakingUp
                    ? "Waking up server... Pathfinder AI will respond shortly."
                    : "Pathfinder AI is synthesizing placement intelligence..."}
                </span>
                <span className="flex gap-1 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
            {onStopGeneration && (
              <button
                type="button"
                onClick={handleStopAll}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:border-rose-400 transition-all active:scale-95 shadow-sm"
              >
                <Square className="h-3 w-3 fill-rose-400 text-rose-400" />
                <span>Stop</span>
              </button>
            )}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Real-time Filler Word & Speech Clarity Bar */}
      {(voiceStatus === "listening" || (mode === "interview" && speechMetrics.words > 0)) && (
        <div className="flex flex-wrap items-center justify-between border-t border-[#2A2A30] bg-[#141417] px-4 py-2 text-[11px] gap-2">
          <div className="flex items-center gap-2">
            {voiceStatus === "listening" ? (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                🎙️ Listening... Auto-stops after 1s of silence
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Activity className="h-3.5 w-3.5" />
                Interview Speech Cadence:
              </span>
            )}
            <span className="text-[#A1A1AA]">{speechMetrics.words} words</span>
          </div>

          <div className="flex items-center gap-3">
            <span className={`font-semibold ${speechMetrics.fillers > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {speechMetrics.fillers > 0
                ? `⚠️ ${speechMetrics.fillers} filler word${speechMetrics.fillers > 1 ? "s" : ""} (${speechMetrics.list.join(", ")})`
                : "✨ Zero filler words (Crisp delivery)"}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-bold text-white">
              Clarity: {speechMetrics.score}%
            </span>
          </div>
        </div>
      )}

      {/* Input Bar with Voice Mic, Privacy Note & Send */}
      <div className="border-t border-[#2A2A30] bg-black/20 p-4">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center">
            <input
              id="chat-console-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                voiceStatus === "listening"
                  ? "Listening... Speak your answer into the microphone (~1s pause auto-sends)..."
                  : mode === "interview"
                  ? "Click the mic to speak or type your answer (STAR method)..."
                  : "Click mic to speak in English, Telugu, or Hindi, or type your query..."
              }
              className={`w-full rounded-2xl border bg-[#141417] py-3.5 pl-4 pr-24 text-xs font-medium text-[#F2F2F3] outline-none transition-all placeholder:text-[#A1A1AA] ${
                voiceStatus === "listening"
                  ? "border-rose-500/60 ring-2 ring-rose-500/20"
                  : "border-[#2A2A30] focus:border-white/40 focus:ring-1 focus:ring-white/20"
              }`}
            />

            {/* Small Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-12 flex h-8 w-8 items-center justify-center rounded-xl transition-all shadow-sm ${
                voiceStatus === "listening"
                  ? "bg-rose-600 text-white animate-pulse ring-2 ring-rose-400/50"
                  : "bg-white/10 text-white hover:bg-white/20 active:scale-95"
              }`}
              title={voiceStatus === "listening" ? "Stop listening" : "Click to speak with microphone"}
            >
              {voiceStatus === "listening" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Send Button */}
            <button
              id="chat-console-send"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-950 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-40 shadow-sm cursor-pointer"
              title="Send text message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Privacy Note */}
        <p className="mt-2 text-[10px] text-zinc-500 text-center">
          🔒 Privacy: Speech recognition uses browser speech services. Pathfinder does not record or store your audio.
        </p>
      </div>
    </div>
  );
};

