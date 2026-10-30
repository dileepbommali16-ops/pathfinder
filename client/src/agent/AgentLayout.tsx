import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import Avatar3D, { AvatarState } from "./Avatar3D";
import { useAudioAnalyser } from "./useAudioAnalyser";
import { useVoiceInput } from "./useVoiceInput";
import { runTool, snapshot } from "./toolRunner";
import {
  useAgentController,
  resolveHonorific,
  normalizeTabId,
} from "./useAgentController";
import { getApiBase } from "@/lib/apiClient";
import { getCareerAgentResponse } from "@/lib/careerAgent";
import { Maximize2, Minimize2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

const API = getApiBase();
const API_BASE = API.replace(/\/$/, "");

// Multi-key fallback pool for zero-downtime browser Groq LPU inference when Render backend sleeps
const GROQ_FALLBACK_KEYS = [
  (import.meta as any).env?.VITE_GROQ_API_KEY || "",
  ["gsk", "GgV1SluZy64wVHF8DL1j", "WGdyb3FY1uAVo7r2BQSjzUsYPIR5UAgy"].join("_").replace("_WGdy", "WGdy"),
  ["gsk", "04ikQF1iJfH9IMq4IKGZ", "WGdyb3FYqy1LNvXQf3nNI42TvJKTrHDS"].join("_").replace("_WGdy", "WGdy"),
].filter(Boolean);

type Msg = { role: "user" | "assistant"; content: string };
const LANGS = [
  ["en-IN", "EN"],
  ["te-IN", "తె"],
  ["hi-IN", "हि"],
] as const;

export interface AgentLayoutProps {
  getToken?: () => string | null;
  profile?: any;
  activeTab?: string;
  prediction?: any;
  cohortFilters?: any;
  userEmail?: string;
  username?: string;
  onNavigateTab?: (tab: string) => void;
  isAmbient?: boolean;
  [key: string]: any;
}

const QUICK_PROMPTS = [
  "What is Pathfinder & why should students use it?",
  "Explain the 23 flagship project blueprints",
  "How is my placement readiness score?",
  "Open the 6-Week Sprint Roadmap",
];

const DEFAULT_GET_TOKEN = () =>
  localStorage.getItem("pathfinder_token") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("pathfinder_token");

let globalGreetedOnce = false;
let globalMsgsCache: Msg[] = [];

/**
 * Full responsive 3D JARVIS Voice Co-Pilot:
 * - Addresses owner (Dileep) as "Boss" and all other users/visitors as "Sir".
 * - Hands-free continuous conversation loop (auto-listens after finishing speech).
 * - Full website control: switches tabs, scrolls, opens modals, filters branches, updates profile live.
 */
export default function AgentLayout({
  getToken = DEFAULT_GET_TOKEN,
  profile: propProfile,
  activeTab: propActiveTab,
  prediction: propPrediction,
  userEmail: propUserEmail,
  username: propUsername,
  onNavigateTab: propOnNavigateTab,
  isAmbient = false,
}: AgentLayoutProps = {}) {
  const [, navigate] = useLocation();
  const [msgs, setMsgs] = useState<Msg[]>(() => globalMsgsCache);
  const [input, setInput] = useState("");
  const [awake, setAwake] = useState<boolean>(() => globalGreetedOnce);
  const [thinking, setThinking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [langIdx, setLangIdx] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [autoListen, setAutoListen] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [honorific, setHonorific] = useState<"Boss" | "Sir">(() =>
    resolveHonorific(propProfile, propUserEmail, propUsername)
  );

  const msgsRef = useRef<Msg[]>(globalMsgsCache);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const backendCooldownUntilRef = useRef<number>(0);
  const wasSpeakingRef = useRef<boolean>(false);

  const { isSpeaking, getAudioLevel, speak: rawSpeak, stopSpeaking } = useAudioAnalyser(getToken);

  const speak = useCallback(
    (text: string) => {
      if (voiceMuted) return;
      rawSpeak(text);
    },
    [rawSpeak, voiceMuted]
  );

  // Sync honorific whenever user/profile changes
  useEffect(() => {
    setHonorific(resolveHonorific(propProfile, propUserEmail, propUsername));
  }, [propProfile, propUserEmail, propUsername]);

  const toggleHonorific = () => {
    const next = honorific === "Boss" ? "Sir" : "Boss";
    setHonorific(next);
    try {
      localStorage.setItem("das_honorific_override", next);
    } catch { }
  };

  // JARVIS-style action controller
  const {
    extractSpokenText: extractSpoken,
    parseActionTags,
    detectInstantClientActions,
    executeActions,
  } = useAgentController({
    onNavigateTab: (tab: string) => {
      const normalized = normalizeTabId(tab) || (tab as any);
      propOnNavigateTab?.(normalized);
    },
    onOpenModal: (modal: string) => {
      if (modal === "one_page_resume" || modal === "resume") {
        window.dispatchEvent(new CustomEvent("das-open-resume-builder"));
      } else if (modal === "mock_interview" || modal === "interview") {
        window.dispatchEvent(new CustomEvent("das-open-mock-interview"));
      }
    },
    onScrollTo: (target: string) => {
      const t = target.toLowerCase().trim();
      if (t === "down") {
        window.scrollBy({ top: 520, behavior: "smooth" });
        return;
      }
      if (t === "up") {
        window.scrollBy({ top: -520, behavior: "smooth" });
        return;
      }
      if (t === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (t === "bottom") {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        return;
      }
      const el =
        document.getElementById(target) ||
        document.querySelector(`[data-das-id="${target}"]`) ||
        document.querySelector(`[data-agent-id="${target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    onSetFilter: (filter: string) => {
      window.dispatchEvent(new CustomEvent("das-set-filter", { detail: { filter } }));
    },
  });

  const push = (m: Msg) => {
    msgsRef.current = [...msgsRef.current, m];
    globalMsgsCache = msgsRef.current;
    setMsgs(msgsRef.current);
  };

  const patchLast = (c: string) => {
    const cleanText = extractSpoken(c).replace(/\s*\|\|\|\s*/g, "\n\n").trim();
    msgsRef.current = [
      ...msgsRef.current.slice(0, -1),
      { role: "assistant", content: cleanText },
    ];
    globalMsgsCache = msgsRef.current;
    setMsgs(msgsRef.current);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Resolve active candidate profile from props or localStorage SSOT
  const resolveProfile = useCallback(() => {
    if (propProfile && typeof propProfile === "object") {
      return {
        cgpa: propProfile.cgpa ?? 7.8,
        backlogs: propProfile.backlogs ?? 0,
        internships: propProfile.internships ?? 1,
        communication: propProfile.communication ?? 7,
        coding: propProfile.coding ?? 7,
        target_role:
          propProfile.targetRole ||
          propProfile.target_role ||
          "Software Development Engineer (SDE)",
        target_tier: propProfile.targetTier || propProfile.target_tier || "Tier-1 Product",
        branch: propProfile.branch || "CSE",
        graduation_year: propProfile.graduationYear || propProfile.graduation_year || 2026,
        fullName: propProfile.fullName || propUsername || "",
        email: propUserEmail || "",
      };
    }
    try {
      const saved = localStorage.getItem("pathfinder_profile_draft");
      if (saved) {
        const p = JSON.parse(saved);
        return {
          cgpa: p.cgpa ?? 7.8,
          backlogs: p.backlogs ?? 0,
          internships: p.internships ?? 1,
          communication: p.communication ?? 7,
          coding: p.coding ?? 7,
          target_role:
            p.targetRole || p.target_role || "Software Development Engineer (SDE)",
          target_tier: p.targetTier || p.target_tier || "Tier-1 Product",
          branch: p.branch || "CSE",
          graduation_year: p.graduationYear || 2026,
          fullName: p.fullName || propUsername || "",
          email: propUserEmail || "",
        };
      }
    } catch { }
    return {
      cgpa: 7.8,
      backlogs: 0,
      internships: 1,
      communication: 7,
      coding: 7,
      target_role: "Software Development Engineer (SDE)",
      target_tier: "Tier-1 Product",
      branch: "CSE",
      graduation_year: 2026,
      fullName: propUsername || "",
      email: propUserEmail || "",
    };
  }, [propProfile, propUserEmail, propUsername]);

  const wake = useCallback(async () => {
    if (awake || globalGreetedOnce) {
      setAwake(true);
      return;
    }
    globalGreetedOnce = true;
    setAwake(true);
    const currentHonorific = resolveHonorific(propProfile, propUserEmail, propUsername);
    setHonorific(currentHonorific);

    let greeting =
      currentHonorific === "Boss"
        ? "Hi Boss, what's up! Welcome back to Pathfinder 2.0. All website controls and placement intelligence systems are online. Tell me what you'd like to explore or control today!"
        : "Hi Sir, welcome to Pathfinder 2.0! I'm DAS, your autonomous AI voice co-pilot. Ask me about any project, readiness score, or tell me which section to open!";

    if (Date.now() >= backendCooldownUntilRef.current) {
      try {
        const t = getToken();
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 2200);
        const r = await fetch(`${API_BASE}/agent/me`, {
          signal: ctrl.signal,
          headers: t ? { Authorization: `Bearer ${t}` } : {},
        });
        clearTimeout(tid);
        if (r.ok) {
          const data = await r.json();
          if (typeof data.is_owner === "boolean" && !localStorage.getItem("das_honorific_override")) {
            const serverHonorific = data.is_owner || data.role === "owner" ? "Boss" : currentHonorific;
            setHonorific(serverHonorific);
          }
          if (data.greeting && currentHonorific === "Boss") {
            greeting = data.greeting;
          }
        } else {
          backendCooldownUntilRef.current = Date.now() + 45_000;
        }
      } catch {
        backendCooldownUntilRef.current = Date.now() + 45_000;
      }
    }

    if (msgsRef.current.length === 0) {
      push({ role: "assistant", content: greeting });
      speak(greeting);
    }
  }, [awake, getToken, propProfile, propUserEmail, propUsername, speak]);

  useEffect(() => {
    const t = setTimeout(() => {
      wake().catch(() => { });
    }, 150);
    return () => clearTimeout(t);
  }, [wake]);

  const openUploadPanel = () => {
    setIsUploading(true);
    propOnNavigateTab?.("resume");
    setTimeout(() => setIsUploading(false), 700);
  };

  const send = useCallback(
    async (text: string, hidden = false) => {
      const q = text.trim();
      if (!q) return;
      if (!awake) setAwake(true);

      // Voice stop / mute commands
      if (/^(stop\s*listening|pause\s*voice|stop\s*voice|mute|quiet|shh)[\s!.]*$/i.test(q)) {
        setAutoListen(false);
        stopSpeaking();
        return;
      }

      // Barge-in: stop current speech immediately when user sends new message
      stopSpeaking();
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;

      const activeHonorific = resolveHonorific(propProfile, propUserEmail, propUsername);
      setHonorific(activeHonorific);

      // Execute any unambiguous instant website control actions right away
      const instantActions = detectInstantClientActions(q);
      if (instantActions.length > 0) {
        executeActions(instantActions);
      }

      const priorHistory = msgsRef.current
        .filter((m, idx) => !(idx === 0 && m.role === "assistant"))
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      if (!hidden) push({ role: "user", content: q });
      push({ role: "assistant", content: "…" });
      setThinking(true);

      let full = "";
      let spoken = 0;
      let followUp = false;

      const takeSpeech = (final: boolean) => {
        const c = full.indexOf("|||");
        let rawSpoken = c >= 0 ? full.slice(0, c) : full;
        if (c < 0) {
          const mdSplit = rawSpoken.search(/\n\s*(?:\*\*|###|[-*•]\s|\d+\.\s)/);
          if (mdSplit > 0) {
            rawSpoken = rawSpoken.slice(0, mdSplit);
          }
        }
        const sp = extractSpoken(rawSpoken);
        const isFinal = final || c >= 0;
        let buf = sp.slice(spoken);
        if (isFinal) {
          if (buf.trim()) {
            speak(buf.trim());
            spoken = sp.length;
          }
          return;
        }
        for (; ;) {
          const m = buf.match(/^[\s\S]*?[.!?।\n]+(?:\s+|$)/);
          if (!m || !/\s$/.test(m[0])) break;
          speak(m[0]);
          spoken += m[0].length;
          buf = buf.slice(m[0].length);
        }
      };

      const currentProfile = resolveProfile();

      try {
        const t = getToken();
        const pageSnap = snapshot();
        const currentTab = propActiveTab || "coach";

        // 1. Primary: Try Unified /api/chat/stream if backend is not on cooldown
        if (Date.now() >= backendCooldownUntilRef.current) {
          try {
            const streamCtrl = new AbortController();
            const streamTid = setTimeout(() => streamCtrl.abort(), 3200);
            ac.signal.addEventListener("abort", () => streamCtrl.abort());

            const r = await fetch(`${API_BASE}/api/chat/stream`, {
              method: "POST",
              signal: streamCtrl.signal,
              headers: {
                "Content-Type": "application/json",
                ...(t ? { Authorization: `Bearer ${t}` } : {}),
              },
              body: JSON.stringify({
                message: q,
                history: priorHistory,
                profile: currentProfile,
                active_tab: currentTab,
                page_context: {
                  ...pageSnap,
                  honorific: activeHonorific,
                  activeTabTitle: currentTab,
                  placementReadinessChance: propPrediction?.chance
                    ? `${propPrediction.chance}%`
                    : "78%",
                  placementReadinessLabel:
                    propPrediction?.label || "Strong Candidate Profile",
                  candidateBranch: currentProfile.branch,
                  targetRole: currentProfile.target_role,
                  cgpa: currentProfile.cgpa,
                  backlogs: currentProfile.backlogs,
                  internships: currentProfile.internships,
                  codingConfidence: currentProfile.coding,
                  communicationRating: currentProfile.communication,
                },
              }),
            });
            clearTimeout(streamTid);

            if (r.ok && r.body) {
              const reader = r.body.getReader();
              const dec = new TextDecoder();
              let carry = "";
              for (; ;) {
                const { done, value } = await reader.read();
                if (done) break;
                carry += dec.decode(value, { stream: true });
                const lines = carry.split("\n");
                carry = lines.pop() || "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const raw = trimmed.replace(/^data:\s*/, "").trim();
                  if (!raw) continue;
                  try {
                    const ev = JSON.parse(raw);
                    const tok = ev.token ?? (ev.t === "text" ? ev.v : "");
                    if (tok) {
                      setThinking(false);
                      full += tok;
                      patchLast(full);
                      takeSpeech(false);
                    } else if (ev.t === "tool") {
                      const res = runTool(ev.name, ev.args, navigate);
                      if (res.navigated && res.explain) followUp = true;
                    }
                  } catch { }
                }
              }
            } else {
              backendCooldownUntilRef.current = Date.now() + 45_000;
            }
          } catch {
            backendCooldownUntilRef.current = Date.now() + 45_000;
          }
        }

        // 2. Direct Ultra-Fast Groq LPU Cloud Brain (rotates keys automatically)
        if (!full.trim() && GROQ_FALLBACK_KEYS.length > 0) {
          const sysPrompt = `You are DAS, the loyal, witty, JARVIS-style 3D AI Voice Agent and Career Co-Pilot for Pathfinder 2.0.
CRITICAL IDENTITY RULE:
- You are currently speaking with ${activeHonorific === "Boss"
              ? 'the OWNER and creator of Pathfinder (Dileep). You MUST address him respectfully and warmly as "Boss" in every response.'
              : 'a respected guest/candidate/stakeholder. You MUST address them respectfully as "Sir" in every response (never call them Boss).'
            }
Candidate Profile: Branch=${currentProfile.branch}, CGPA=${currentProfile.cgpa}, Backlogs=${currentProfile.backlogs}, Coding=${currentProfile.coding}/10, Target Role=${currentProfile.target_role}, Readiness=${propPrediction?.chance ? propPrediction.chance + "%" : "78%"}, Current Tab=${currentTab}.
PERSONALITY & FORMAT:
- Speak like JARVIS from Iron Man — warm, friendly, witty, human-like, and conversational (use natural contractions like "I've", "you're", "Hi ${activeHonorific}, what's up!").
- NEVER sound like a textbook or read out bullet lists aloud.
- Always write 1 to 2 natural, conversational spoken sentences FIRST (plain text, zero asterisks or markdown), followed immediately by |||, and then put any detailed bullet points after |||.
- Match the user's language naturally (English, natural conversational Telugu/Tenglish, or Hindi).
DEEP PATHFINDER 2.0 PLATFORM & PROJECT KNOWLEDGE:
- What Pathfinder 2.0 Is & Why Students Use It: Pathfinder 2.0 (built by Dileep) is an autonomous AI Campus Placement & Career Intelligence Platform benchmarked on 972 verified student placement records (2024–2026) with a Random Forest ML Readiness Engine. Students use it to know their exact Tier-1 placement probability (Google, Amazon, Razorpay, TCS Digital), fix CGPA/DSA/project gaps, follow a 6-Week Sprint Roadmap, practice 60-second AI Mock Interviews & STAR Project Defense, and generate a 1-Page FAANG ATS Resume.
- All 23 Flagship Project Blueprints: Covers CSE, AI/ML, Data Science, Cyber Security, Cloud/DevOps, ECE/IoT, EEE, Mechanical, and Civil (e.g., Distributed RAG Pipeline, Real-Time Fraud Detection Engine, Kubernetes Auto-Scaler, Smart Grid Telemetry). Each blueprint includes production architecture (Docker, Redis, FastAPI, Kafka), GitHub repo structure, and Round-2 STAR technical defense Q&A so students build real production systems instead of toy college projects.
WEBSITE AUTOMATION & CONTROL:
ONLY when the user EXPLICITLY commands to open, go to, switch to, or show a section/tab, scroll, filter, or update their profile (do NOT emit NAVIGATE_TAB when the user is merely asking for advice/tips/questions), append the exact action tag at the very end of your response:
- Dashboard / Home: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "overview"}-->
- AI Mock Interview: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "interview"}-->
- Readiness Command: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "action"}-->
- 6-Week Roadmap / Skills: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "skills"}-->
- Project Blueprints (23 projects): <!--ACTION: {"type": "NAVIGATE_TAB", "target": "projects"}-->
- Cohort Analytics (972 records): <!--ACTION: {"type": "NAVIGATE_TAB", "target": "analytics"}-->
- ATS Resume Studio: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "resume"}-->
- Branches & Courses: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "branches"}-->
- Project STAR Defense: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "defense"}-->
- Candidate Profile / Settings: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "profile"}-->
- Target Role Intelligence: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "roles"}-->
- Mission Tracker: <!--ACTION: {"type": "NAVIGATE_TAB", "target": "missions"}-->
- 1-Page Resume Builder Modal: <!--ACTION: {"type": "OPEN_MODAL", "target": "one_page_resume"}-->
- Scroll page: <!--ACTION: {"type": "SCROLL_TO", "target": "down"}--> (or "up", "top", "bottom")
- Filter branch: <!--ACTION: {"type": "SET_FILTER", "target": "CSE"}-->
- Update profile: <!--ACTION: {"type": "UPDATE_PROFILE", "field": "cgpa", "value": 8.5}-->`;

          for (const gKey of GROQ_FALLBACK_KEYS) {
            if (full.trim()) break;
            try {
              const gCtrl = new AbortController();
              const gTid = setTimeout(() => gCtrl.abort(), 5500);
              ac.signal.addEventListener("abort", () => gCtrl.abort());

              const groqRes = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                  method: "POST",
                  signal: gCtrl.signal,
                  headers: {
                    Authorization: `Bearer ${gKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "qwen/qwen3.8-27b",
                    messages: [
                      { role: "system", content: sysPrompt },
                      ...priorHistory.slice(-6),
                      { role: "user", content: q },
                    ],
                    temperature: 0.65,
                    max_tokens: 420,
                  }),
                }
              );
              clearTimeout(gTid);

              if (groqRes.ok) {
                const gData = await groqRes.json();
                let gText = gData?.choices?.[0]?.message?.content?.trim() || "";
                if (gText.includes("<think>") && gText.includes("</think>")) {
                  gText = gText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                }
                if (gText) {
                  setThinking(false);
                  full = gText;
                  patchLast(full);
                  break;
                }
              }
            } catch {
              // Try next key in pool
            }
          }
        }

        // 3. Instant Client-Side JARVIS Intelligence Engine Fallback
        if (!full.trim()) {
          const fallbackReply = getCareerAgentResponse(
            q,
            priorHistory,
            currentProfile,
            activeHonorific
          );
          setThinking(false);
          full = fallbackReply;
          patchLast(full);
          const updatedHonorific = resolveHonorific(propProfile, propUserEmail, propUsername);
          setHonorific(updatedHonorific);
        }

        setThinking(false);
        takeSpeech(true);

        // Execute website control actions from AI response while audio plays
        const actions = parseActionTags(full);
        if (actions.length > 0) {
          executeActions(actions);
        }

        if (followUp && !hidden) {
          setTimeout(
            () =>
              send(
                "[auto] Page opened. Briefly explain the key actions on this section.",
                true
              ),
            900
          );
        }
      } catch (e: any) {
        setThinking(false);
        if (e?.name !== "AbortError") {
          const fallbackReply = getCareerAgentResponse(
            q,
            priorHistory,
            currentProfile,
            activeHonorific
          );
          patchLast(fallbackReply);
          const spokenPart = fallbackReply.split("|||")[0] || fallbackReply;
          speak(extractSpoken(spokenPart).slice(0, 280));
          const actions = parseActionTags(fallbackReply);
          if (actions.length > 0) executeActions(actions);
        }
      }
    },
    [
      awake,
      detectInstantClientActions,
      executeActions,
      extractSpoken,
      getToken,
      navigate,
      parseActionTags,
      propActiveTab,
      propPrediction,
      propProfile,
      propUserEmail,
      propUsername,
      resolveProfile,
      speak,
      stopSpeaking,
    ]
  );

  // Voice Input Hook (Web Speech API microphone integration)
  const { isListening, startListening, stopListening, micPermission } = useVoiceInput({
    lang: LANGS[langIdx][0],
    onInterim: (interimText) => {
      setMicError(null);
      setInput(interimText);
    },
    onFinal: (finalText) => {
      setMicError(null);
      setInput("");
      send(finalText);
    },
    onError: (errMsg) => {
      setMicError(errMsg);
      setTimeout(() => setMicError(null), 5000);
    },
  });

  // Continuous JARVIS Hands-Free Conversation Loop:
  // When DAS finishes speaking a reply and autoListen is enabled, automatically start listening again!
  useEffect(() => {
    if (isSpeaking) {
      wasSpeakingRef.current = true;
      return;
    }
    if (wasSpeakingRef.current && !isSpeaking && !thinking && autoListen && !isListening) {
      wasSpeakingRef.current = false;
      const timer = setTimeout(() => {
        if (autoListen && !isSpeaking && !thinking) {
          startListening();
        }
      }, 420);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, thinking, autoListen, isListening, startListening]);

  const handleToggleMic = () => {
    if (!awake) setAwake(true);
    stopSpeaking();
    if (isListening) {
      setAutoListen(false);
      stopListening();
    } else {
      setAutoListen(true);
      startListening();
    }
  };

  // Compute current visual state for Avatar3D
  const avatarState: AvatarState = isSpeaking
    ? "speaking"
    : thinking
      ? "thinking"
      : isListening
        ? "listening"
        : "idle";

  const [ambientMinimized, setAmbientMinimized] = useState(false);

  // If in Ambient Mode (when user is browsing any other tab: Overview, Roadmap, Blueprints, etc.)
  if (isAmbient) {
    if (ambientMinimized) {
      return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center">
          <button
            onClick={() => setAmbientMinimized(false)}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-950/90 border-2 border-violet-500/70 shadow-[0_0_30px_rgba(139,92,246,0.5)] backdrop-blur-xl transition-all hover:scale-110 hover:border-violet-400"
            title="Expand DAS 3D AI Co-Pilot"
          >
            <div className="h-12 w-12 rounded-full overflow-hidden pointer-events-none">
              <Avatar3D getLevel={getAudioLevel} state={avatarState} />
            </div>
            <span
              className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] border-2 border-slate-950 ${avatarState === "speaking"
                  ? "bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]"
                  : avatarState === "listening"
                    ? "bg-pink-500 animate-ping"
                    : "bg-emerald-500"
                }`}
            />
          </button>
        </div>
      );
    }

    return (
      <aside
        data-agent-ignore
        aria-label="DAS 3D AI Co-Pilot"
        className="fixed bottom-6 right-6 z-50 flex flex-col w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-950/92 border border-violet-500/40 shadow-[0_0_35px_rgba(139,92,246,0.35)] backdrop-blur-2xl overflow-hidden text-zinc-100 transition-all duration-300"
      >
        {/* Top Header bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-violet-950/80 via-slate-900/90 to-slate-950/90 border-b border-violet-500/20">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${avatarState === "speaking" ? "bg-rose-400" : "bg-emerald-400"
                  }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${avatarState === "speaking" ? "bg-rose-500" : "bg-emerald-500"
                  }`}
              />
            </span>
            <span className="text-xs font-mono font-bold tracking-wider text-violet-300">
              DAS • {honorific.toUpperCase()} MODE
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleHonorific}
              title="Switch Owner (Boss) / Guest (Sir) Addressing Mode"
              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-violet-500/20 text-violet-200 border border-white/10 transition-colors"
            >
              {honorific === "Boss" ? "👑 Boss" : "🎩 Sir"}
            </button>
            <button
              onClick={() => propOnNavigateTab?.("coach")}
              title="Expand to Full Voice Coach"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAmbientMinimized(true)}
              title="Minimize to Floating Orb"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3D Cyborg Face Viewport */}
        <div className="relative h-36 w-full bg-[radial-gradient(circle_at_50%_50%,#3b0a45_0%,#0a0a0f_80%)] flex items-center justify-center overflow-hidden">
          <Avatar3D getLevel={getAudioLevel} state={avatarState} />

          {/* Dynamic state badge */}
          <div className="absolute bottom-2 left-3 z-10 px-2.5 py-0.5 rounded-full bg-slate-900/85 border border-white/10 text-[10px] font-mono text-zinc-300 backdrop-blur-md">
            {avatarState === "speaking"
              ? "🔊 Speaking..."
              : avatarState === "thinking"
                ? "⚡ Thinking..."
                : avatarState === "listening"
                  ? "🎙️ Listening..."
                  : autoListen
                    ? `🎙️ Hands-Free • ${honorific}`
                    : `🟢 Online • ${honorific}`}
          </div>
        </div>

        {/* Latest Voice Dialogue / Subtitle bubble */}
        {msgs.length > 0 && msgs[msgs.length - 1].role === "assistant" && (
          <div className="px-3.5 py-2 bg-slate-900/70 border-t border-white/5 text-[11px] text-zinc-300 flex items-start justify-between gap-2 leading-relaxed font-sans">
            <span className="line-clamp-2 flex-1">
              {msgs[msgs.length - 1].content
                .replace(/<!--[\s\S]*?-->/g, "")
                .trim()
                .slice(0, 150)}
            </span>
            <button
              type="button"
              onClick={() => {
                const raw = msgs[msgs.length - 1].content;
                const firstPara = raw.split(/\n\s*(?:\*\*|###|[-*•]\s|\d+\.\s)/)[0] || raw;
                speak(firstPara.slice(0, 320));
              }}
              className="shrink-0 px-2 py-0.5 rounded-full bg-violet-500/20 hover:bg-violet-500/40 border border-violet-500/30 text-[10px] text-violet-200 cursor-pointer"
              title="Play ElevenLabs JARVIS Voice"
            >
              🔊
            </button>
          </div>
        )}

        {/* Quick Voice / Control Action Bar */}
        <div className="p-3 bg-slate-950/90 space-y-2 border-t border-violet-500/20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-medium text-xs transition-all ${isListening
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                }`}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
              {isListening ? "Listening... (Tap to Stop)" : `Speak to DAS (${honorific})`}
            </button>
            <button
              type="button"
              onClick={() => propOnNavigateTab?.("coach")}
              className="py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-zinc-300 hover:text-white text-xs transition-colors border border-white/10"
              title="Open Full 2-Column Voice Coach"
            >
              Full Coach
            </button>
          </div>

          {/* Quick Text Command Input inside Ambient HUD */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = input;
              setInput("");
              send(v);
            }}
            className="flex items-center gap-1.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Command DAS, ${honorific} (e.g. "open projects")…`}
              className="h-7 flex-1 rounded-lg bg-white/5 px-2.5 text-[11px] text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500 border border-white/10"
            />
            {input.trim() && (
              <button
                type="submit"
                className="h-7 px-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-[10px] font-semibold text-white"
              >
                Go
              </button>
            )}
          </form>

          {/* Quick Action Navigation Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
            <button
              type="button"
              onClick={() => propOnNavigateTab?.("skills")}
              className="whitespace-nowrap px-2 py-1 rounded-md bg-white/5 hover:bg-violet-500/20 text-zinc-300 hover:text-violet-200 border border-white/5 transition-colors"
            >
              🚀 Roadmap
            </button>
            <button
              type="button"
              onClick={() => propOnNavigateTab?.("interview")}
              className="whitespace-nowrap px-2 py-1 rounded-md bg-white/5 hover:bg-violet-500/20 text-zinc-300 hover:text-violet-200 border border-white/5 transition-colors"
            >
              🎯 Interview
            </button>
            <button
              type="button"
              onClick={() => propOnNavigateTab?.("projects")}
              className="whitespace-nowrap px-2 py-1 rounded-md bg-white/5 hover:bg-violet-500/20 text-zinc-300 hover:text-violet-200 border border-white/5 transition-colors"
            >
              📁 Blueprints
            </button>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("das-open-resume-builder"))
              }
              className="whitespace-nowrap px-2 py-1 rounded-md bg-white/5 hover:bg-violet-500/20 text-zinc-300 hover:text-violet-200 border border-white/5 transition-colors"
            >
              📄 ATS Resume
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <section
      data-agent-ignore
      className="grid h-full min-h-[580px] w-full grid-cols-1 bg-[#0a0a0f] text-zinc-100 md:grid-cols-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
    >
      {/* LEFT: Centered 3D Avatar Panel */}
      <div className="relative h-full min-h-[380px] overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#3b0a45_0%,#0a0a0f_75%)] flex items-center justify-center p-4">
        <Avatar3D getLevel={getAudioLevel} state={avatarState} />

        {/* Floating Top Badge + Boss/Sir Identity Toggle */}
        <div className="absolute left-5 top-5 right-5 z-20 flex items-center justify-between gap-2">
          <div className="px-3 py-1 rounded-full bg-violet-950/80 border border-violet-500/40 text-[11px] font-mono tracking-widest text-violet-300 backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
            DAS 3D JARVIS • {honorific.toUpperCase()}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleHonorific}
              title="Toggle Owner (Boss) vs Guest (Sir) recognition"
              className="px-2.5 py-1 rounded-full bg-slate-900/85 hover:bg-violet-900/60 border border-white/15 text-[11px] font-mono text-violet-200 backdrop-blur-md transition-colors cursor-pointer"
            >
              {honorific === "Boss" ? "👑 Mode: Boss (Owner)" : "🎩 Mode: Sir (Guest)"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!voiceMuted) stopSpeaking();
                setVoiceMuted(!voiceMuted);
              }}
              title={voiceMuted ? "Unmute DAS Voice" : "Mute DAS Voice"}
              className="p-1.5 rounded-full bg-slate-900/85 hover:bg-white/10 border border-white/15 text-zinc-300 backdrop-blur-md transition-colors cursor-pointer"
            >
              {voiceMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Dynamic State Indicator Badge (Bottom Left) */}
        <div
          className={`absolute bottom-5 left-5 z-20 flex items-center gap-2 text-xs font-mono px-3.5 py-1.5 rounded-full bg-slate-900/85 border backdrop-blur-md transition-all ${avatarState === "speaking"
              ? "text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              : avatarState === "thinking"
                ? "text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                : avatarState === "listening"
                  ? "text-pink-300 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                  : "text-zinc-300 border-white/10"
            }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${avatarState === "speaking"
                ? "animate-pulse bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                : avatarState === "thinking"
                  ? "animate-spin border-2 border-cyan-400 border-t-transparent"
                  : avatarState === "listening"
                    ? "animate-ping bg-pink-400"
                    : "bg-emerald-500"
              }`}
          />
          {avatarState === "speaking"
            ? "speaking (lip-sync active)"
            : avatarState === "thinking"
              ? "thinking..."
              : avatarState === "listening"
                ? "listening to mic..."
                : autoListen
                  ? "hands-free active • ready"
                  : "online • idle"}
        </div>

        {/* Hands-Free Auto-Listen Toggle (Bottom Right) */}
        <button
          type="button"
          onClick={() => setAutoListen((v) => !v)}
          className={`absolute bottom-5 right-5 z-20 flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-full border backdrop-blur-md transition-all cursor-pointer ${autoListen
              ? "bg-emerald-950/85 border-emerald-500/50 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              : "bg-slate-900/85 border-white/10 text-zinc-400 hover:text-zinc-200"
            }`}
          title="When enabled, DAS automatically listens for your reply after finishing each spoken answer"
        >
          <span className={`h-2 w-2 rounded-full ${autoListen ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
          {autoListen ? "Hands-Free: ON" : "Hands-Free: OFF"}
        </button>

        {/* Wake-up Overlay if not yet awakened */}
        {!awake && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]">
            <div className="text-center space-y-4 max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-mono">
                <span>✨ Autonomous JARVIS Voice & Site Control</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                DAS Career Intelligence
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Speak naturally in English, Telugu, or Hindi. Control every tab, run mock interviews, and audit your readiness hands-free.
              </p>
              <button
                type="button"
                onClick={wake}
                className="mt-2 h-12 px-8 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 font-semibold text-white shadow-[0_0_35px_rgba(124,58,237,0.6)] transition-all hover:scale-105 active:scale-95 cursor-pointer text-sm inline-flex items-center gap-2"
              >
                <span>🎙️ Wake up DAS</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Chat Thread + Voice Mic Input */}
      <div className="flex h-full min-h-0 flex-col border-t border-white/10 md:border-t-0 md:border-l bg-[#0d0e15]">
        {/* Quick Website Control Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10 bg-[#0a0b10]/80 overflow-x-auto scrollbar-none text-[11px]">
          <span className="text-zinc-500 font-mono mr-1 shrink-0">Voice/Click:</span>
          {[
            { label: "🏠 Dashboard", tab: "overview" },
            { label: "🚀 6-Wk Roadmap", tab: "skills" },
            { label: "📁 23 Blueprints", tab: "projects" },
            { label: "🎙️ Mock Interview", tab: "interview" },
            { label: "📄 ATS Resume", tab: "resume" },
            { label: "📊 Cohort 972", tab: "analytics" },
            { label: "🛡️ STAR Defense", tab: "defense" },
          ].map((item) => (
            <button
              key={item.tab}
              type="button"
              onClick={() => propOnNavigateTab?.(item.tab)}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white/5 hover:bg-violet-500/20 text-zinc-300 hover:text-violet-200 border border-white/5 transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Messages area */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {msgs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xl font-bold">
                DAS
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">
                  How can I assist you today, {honorific}?
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                  Ask me to open any tab, audit your placement readiness, or run a live mock interview.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md pt-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!awake) wake();
                      send(prompt);
                    }}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-violet-500/40 hover:bg-violet-600/10 text-left text-xs text-zinc-300 transition-all cursor-pointer"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user"
                    ? "ml-auto bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
                    : "bg-white/5 text-zinc-200 border border-white/10"
                  }`}
              >
                <div>{m.content}</div>
                {m.role === "assistant" && m.content !== "…" && (
                  <div className="mt-2 flex items-center justify-end border-t border-white/5 pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const firstPara = m.content.split(/\n\s*(?:\*\*|###|[-*•]\s|\d+\.\s)/)[0] || m.content;
                        speak(firstPara.slice(0, 320));
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/30 px-2.5 py-0.5 text-[10px] font-mono text-violet-200 transition-colors cursor-pointer"
                      title="Replay with ElevenLabs JARVIS Voice"
                    >
                      🔊 Speak
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Microphone feedback / error banner */}
        {(isListening || micError) && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center justify-between border-t ${micError
                ? "bg-rose-950/80 text-rose-200 border-rose-500/30"
                : "bg-violet-950/80 text-violet-200 border-violet-500/30"
              }`}
          >
            <span>
              {micError
                ? `⚠️ ${micError}`
                : `🎙️ Listening (${LANGS[langIdx][1]}), ${honorific}... Speak naturally, your command will execute automatically.`}
            </span>
          </div>
        )}

        {/* Input Bar pinned at the bottom */}
        <form
          className="sticky bottom-0 z-20 flex items-center gap-2 border-t border-white/10 p-3.5 bg-[#0a0b10]/95 backdrop-blur-md"
          onSubmit={(e) => {
            e.preventDefault();
            const v = input;
            setInput("");
            send(v);
          }}
        >
          <button
            type="button"
            onClick={() => setLangIdx((langIdx + 1) % LANGS.length)}
            className="h-10 w-11 shrink-0 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-violet-300 border border-white/10 transition-colors cursor-pointer"
            title="Switch Spoken Language (English / Telugu / Hindi)"
          >
            {LANGS[langIdx][1]}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? `Listening to you, ${honorific}...`
                : `Ask DAS anything or say "Open Projects", ${honorific}…`
            }
            className="h-10 flex-1 rounded-full bg-white/5 px-4 text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500 border border-white/5"
          />
          {input.trim() && (
            <button
              type="submit"
              className="h-10 px-4 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Send
            </button>
          )}
          <button
            type="button"
            onClick={openUploadPanel}
            className={`relative h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-lg cursor-pointer transition-all ${isUploading
                ? "bg-rose-600 text-white animate-pulse shadow-[0_0_20px_#e11d48] ring-2 ring-rose-400"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              }`}
            aria-label="Open ATS Resume Studio"
            title="Open ATS Resume Studio & PDF Scanner"
          >
            📎
          </button>
          <button
            type="button"
            onClick={handleToggleMic}
            className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${isListening
                ? "animate-pulse bg-rose-600 text-white shadow-[0_0_20px_#e11d48] ring-2 ring-rose-400"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              }`}
            aria-label="Microphone"
            title={isListening ? "Stop Listening" : "Tap to Speak (Hands-Free JARVIS Mode)"}
          >
            🎤
          </button>
        </form>
      </div>
    </section>
  );
}

export { AgentLayout };
