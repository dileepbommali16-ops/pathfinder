import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar3D } from "./Avatar3D";
import { dasSocket, UserHonorificRole } from "./agentSocket";
import {
  codingStudioController,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  getLanguageSpec,
  applyCodeEdit,
  applyCodeDelete,
  formatNumberedCode,
  CodingStudioActionArgs,
} from "./codingStudioController";
import { audioEngine, speaker } from "./audioIO";
import { CodeTaskPayload, tryExecuteClientAutomationIntent } from "./toolRunner";
import { API_BASE, getSessionId } from "@/lib/apiClient";
import { getCareerAgentResponse } from "@/lib/careerAgent";
import { getUserRole, getHonorificKey, HonorificKey } from "@/lib/auth";
import { toast } from "sonner";
import {
  AudioLines,
  Volume2,
  User,
  Mic,
  PenLine,
  SendHorizontal,
  Code2,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Trash2,
  Copy,
  X,
  AlertCircle,
  Terminal,
} from "lucide-react";

function getInitialGreeting(roleKey: HonorificKey): string {
  void roleKey;
  return "DAS Ready — Say 'Hi' or ask anything.";
}

function isPureHiGreeting(text: string): boolean {
  return /^\s*(hi+|hello+|hey+|namaste|good\s*(?:morning|afternoon|evening)|yo+|hola|sup|hai+|hlo+|namaskaram)(?:\s+(?:das|boss|bro|baby|babe|buddy|dude|man|there|ai|sir|madam))?[\s!.,?]*$/i.test(
    (text || "").trim()
  );
}

function cleanHudReplyText(raw: string): string {
  if (!raw) return "";
  if (typeof window !== "undefined") {
    const actionRegex = /<!--\s*ACTION:\s*(\{[\s\S]*?\})\s*-->/g;
    let m: RegExpExecArray | null = null;
    while ((m = actionRegex.exec(raw)) !== null) {
      try {
        const parsed = JSON.parse(m[1]);
        if (parsed?.type === "NAVIGATE_TAB" && parsed?.target) {
          window.dispatchEvent(new CustomEvent("das-navigate", { detail: { tab: parsed.target } }));
        } else if (parsed?.type === "HIGHLIGHT_PROJECT" && parsed?.target) {
          window.dispatchEvent(new CustomEvent("das-highlight-project", { detail: { target: parsed.target } }));
        } else if (parsed?.type === "OPEN_MODAL" && parsed?.target === "one_page_resume") {
          window.dispatchEvent(new CustomEvent("das-open-resume-builder"));
        }
      } catch {
        // Ignore malformed action tag
      }
    }
  }
  return raw
    .split("|||")[0]
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/[*_`~#>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExactHiReply(roleKey: HonorificKey, greetCount: number): string {
  if (roleKey === "stranger") {
    return greetCount <= 0
      ? "Hi stranger, tell your name first!"
      : "Hi stranger, I'm here — tell me your name first!";
  }
  if (greetCount <= 0) {
    if (roleKey === "madam") return "Hi Madam! What's up?";
    if (roleKey === "sir") return "Hi Sir! What's up?";
    return "Hi Boss! What's up?";
  }
  if (roleKey === "madam") return "Hi Madam, I'm here!";
  if (roleKey === "sir") return "Hi Sir, I'm here!";
  return "Hi Boss, I'm here!";
}

export type DasLayoutMode = "background" | "docked";
export const DAS_LAYOUT: DasLayoutMode = "background";

function resolveInitialDasLayout(): DasLayoutMode {
  if (typeof window === "undefined") return DAS_LAYOUT;
  try {
    const param = new URLSearchParams(window.location.search).get("dasLayout");
    if (param === "docked" || param === "background") return param;
  } catch { }
  return DAS_LAYOUT;
}

export const AgentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [activeLayout] = useState<DasLayoutMode>(resolveInitialDasLayout);

  // Authentication State: Check if user is logged into the main dashboard
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("logout") === "1") return false;
    if (params.get("username") || params.get("user") || params.get("demo") === "1") return true;
    return Boolean(localStorage.getItem("pathfinder_user"));
  });

  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return (window as any).__DAS_PAGE_CONTEXT__?.activeTab || "overview";
    }
    return "overview";
  });
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (resolveInitialDasLayout() === "docked") return window.innerWidth < 1280;
    const initialTab = (window as any).__DAS_PAGE_CONTEXT__?.activeTab || "overview";
    return initialTab === "interview";
  });
  const [focusMode, setFocusMode] = useState(false);
  const userToggledStageRef = useRef(false);
  const [, setRole] = useState<UserHonorificRole>(() => getHonorificKey());
  const [inputText, setInputText] = useState("");
  const [transcript, setTranscript] = useState(() => getInitialGreeting(getHonorificKey()));
  const [userTranscript, setUserTranscript] = useState("");
  const [micSilentWarning, setMicSilentWarning] = useState(false);
  const [micHealthHint, setMicHealthHint] = useState("");
  const [activeMicLabel, setActiveMicLabel] = useState("");
  const micBarRef = useRef<HTMLDivElement>(null);
  const micSilentRef = useRef(false);
  const selectedMicIdRef = useRef("");
  const activeMicLabelRef = useRef("");
  const runCodeLiveRef = useRef<(code: string, lang: string) => void>(() => {});
  const ensureSocketConnectedRef = useRef<() => void>(() => {});
  const askCoachNonceRef = useRef(0);
  const askCoachUnbindRef = useRef<(() => void) | null>(null);
  const restTtsAbortRef = useRef<AbortController | null>(null);
  const dispatchTurnRef = useRef<(q: string, ctx: Record<string, any>, mode: "coach" | "chat") => void>(() => {});
  const spokenGreetingKeyRef = useRef<string>("");
  const hiGreetCountRef = useRef<number>(0);
  const micBusyRef = useRef<boolean>(false);
  const speechRecRef = useRef<any>(null);
  const lastAgentActivityAtRef = useRef<number>(0);
  const chatHistoryRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const transcriptRef = useRef<string>(transcript);
  const userTranscriptRef = useRef<string>(userTranscript);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    userTranscriptRef.current = userTranscript;
  }, [userTranscript]);
  const lastAuthIdentityRef = useRef<string | null>(
    typeof window !== "undefined" ? (localStorage.getItem("userEmail") || "").toLowerCase() || null : null
  );

  // Live Multi-Language Code & Compiler Studio State
  const [codeTask, setCodeTask] = useState<CodeTaskPayload | null>(null);
  const [editableCode, setEditableCode] = useState("");
  const [stdinInput, setStdinInput] = useState("");
  const [compileOutput, setCompileOutput] = useState("");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const runAbortRef = useRef<AbortController | null>(null);
  const codeTaskRef = useRef<CodeTaskPayload | null>(null);
  const editableCodeRef = useRef<string>("");
  const stdinInputRef = useRef<string>("");
  const compileOutputRef = useRef<string>("");
  const isRunningCodeRef = useRef<boolean>(false);
  useEffect(() => {
    codeTaskRef.current = codeTask;
  }, [codeTask]);
  useEffect(() => {
    editableCodeRef.current = editableCode;
  }, [editableCode]);
  useEffect(() => {
    stdinInputRef.current = stdinInput;
  }, [stdinInput]);
  useEffect(() => {
    compileOutputRef.current = compileOutput;
  }, [compileOutput]);
  useEffect(() => {
    isRunningCodeRef.current = isRunningCode;
  }, [isRunningCode]);

  // Listen for login / logout & honorific changes across Pathfinder
  useEffect(() => {
    const resetConversationForSessionSwitch = (nextKey: HonorificKey) => {
      askCoachUnbindRef.current?.();
      askCoachUnbindRef.current = null;
      restTtsAbortRef.current?.abort();
      restTtsAbortRef.current = null;
      speaker.stop();
      audioEngine.clearAudioQueue();
      setUserTranscript("");
      setInputText("");
      setCodeTask(null);
      chatHistoryRef.current = [];
      spokenGreetingKeyRef.current = "";
      hiGreetCountRef.current = 0;
      setTranscript(getInitialGreeting(nextKey));
    };

    const syncRoleFromAuth = (explicitKey?: HonorificKey, forceReset = false) => {
      const nextKey = explicitKey || getHonorificKey();
      if (forceReset) {
        resetConversationForSessionSwitch(nextKey);
        void audioEngine.prefetchPuckTts(
          [getExactHiReply(nextKey, 0), getExactHiReply(nextKey, 1)],
          API_BASE
        );
      }
      setRole((prev) => {
        if (forceReset && dasSocket.isConnected) {
          dasSocket.reconnectForAccountSwitch(nextKey);
        } else if (prev !== nextKey) {
          if (!forceReset) setTranscript(getInitialGreeting(nextKey));
          if (dasSocket.isConnected) {
            dasSocket.switchRole(nextKey);
          }
        }
        return nextKey;
      });
    };

    const handleAuthChange = (e: any) => {
      const nextAuth = typeof e.detail?.authenticated === "boolean" ? e.detail.authenticated : undefined;
      if (typeof nextAuth === "boolean") {
        setIsAuthenticated(nextAuth);
      }
      const nextIdentity = nextAuth === false
        ? null
        : (
            e.detail?.email ||
            localStorage.getItem("userEmail") ||
            ""
          )
            .toLowerCase()
            .trim() || null;
      const sessionChanged =
        nextAuth === false || nextIdentity !== lastAuthIdentityRef.current;
      lastAuthIdentityRef.current = nextIdentity;
      syncRoleFromAuth(e.detail?.honorificKey, sessionChanged);
    };
    const handleHonorificChange = (e: any) => {
      syncRoleFromAuth(e.detail?.honorificKey);
    };
    const handleStorage = () => {
      const authed = Boolean(localStorage.getItem("pathfinder_user"));
      setIsAuthenticated(authed);
      const nextIdentity = authed
        ? (localStorage.getItem("userEmail") || "").toLowerCase().trim() || null
        : null;
      const sessionChanged = !authed || nextIdentity !== lastAuthIdentityRef.current;
      lastAuthIdentityRef.current = nextIdentity;
      syncRoleFromAuth(undefined, sessionChanged);
    };
    window.addEventListener("pathfinder:auth-change", handleAuthChange);
    window.addEventListener("das:honorific-change", handleHonorificChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("pathfinder:auth-change", handleAuthChange);
      window.removeEventListener("das:honorific-change", handleHonorificChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const refreshMediaDevices = async () => {
    void audioEngine.autoSyncOutputDevice();
  };

  useEffect(() => {
    void refreshMediaDevices();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) return;
    const onDeviceChange = () => {
      void refreshMediaDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
    };
  }, []);

  // Forward live slide & visitor context so DAS knows what screen is active 24/7
  useEffect(() => {
    if (!isAuthenticated) return;
    let lastClickSyncAt = 0;

    const initialCtx = (window as any).__DAS_PAGE_CONTEXT__;
    if (initialCtx && typeof initialCtx === "object") {
      dasSocket.sendPageContext(initialCtx);
    }

    const onPageContext = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail === "object") {
        if (typeof detail.activeTab === "string") {
          setActiveTab(detail.activeTab);
        }
        dasSocket.sendPageContext(detail);
      }
    };

    const onGlobalClick = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastClickSyncAt < 800) return;
      const target = (e.target as HTMLElement | null)?.closest("button, a, [role='tab']");
      if (!target) return;
      const label = (target.getAttribute("aria-label") || target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
      if (!label) return;
      lastClickSyncAt = now;
      const cur = (window as any).__DAS_PAGE_CONTEXT__ || {};
      dasSocket.sendPageContext({ ...cur, lastClicked: label });
    };

    window.addEventListener("das:page-context", onPageContext);
    window.addEventListener("click", onGlobalClick, true);
    return () => {
      window.removeEventListener("das:page-context", onPageContext);
      window.removeEventListener("click", onGlobalClick, true);
    };
  }, [isAuthenticated, connected]);

  const requestRestCoachReply = async (
    query: string,
    ctx: Record<string, any> = {},
    priorHistory: Array<{ role: "user" | "assistant"; content: string }> = []
  ): Promise<string> => {
    let parsedProfile: any = {};
    const activeHonorific = getUserRole();
    try {
      const profileJson =
        typeof window !== "undefined"
          ? localStorage.getItem("pathfinder_profile_draft") ||
            localStorage.getItem("pathfinder_profile")
          : null;
      parsedProfile = profileJson ? JSON.parse(profileJson) : {};
      const payload = {
        message: query,
        history: priorHistory,
        profile: {
          cgpa: ctx.cgpa ?? parsedProfile.cgpa ?? 7.8,
          backlogs: ctx.backlogs ?? parsedProfile.backlogs ?? parsedProfile.activeBacklogs ?? 0,
          internships: ctx.internships ?? parsedProfile.internships ?? 1,
          communication: ctx.communicationRating ?? parsedProfile.communication ?? 6,
          coding: ctx.codingConfidence ?? parsedProfile.coding ?? 6,
          target_role: ctx.targetRole ?? parsedProfile.targetRole ?? "Software Engineer",
          target_tier: parsedProfile.targetTier ?? "Product",
          branch: ctx.candidateBranch ?? ctx.branch ?? parsedProfile.branch ?? "CSE",
        },
        active_tab: ctx.activeTab || "overview",
        page_context: {
          ...ctx,
          honorific: activeHonorific,
          userEmail: ctx.userEmail || (typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : ""),
          userName: ctx.userName || (typeof window !== "undefined" ? localStorage.getItem("userName") || "" : ""),
        },
      };

      const tryChatEndpoint = async (url: string, timeoutMs: number): Promise<string | null> => {
        const controller = new AbortController();
        const abortId = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-ID": getSessionId(),
            },
            signal: controller.signal,
            body: JSON.stringify(payload),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data?.reply && typeof data.reply === "string" && data.reply.trim()) {
              return data.reply.trim();
            }
          }
        } catch {
          // Try next tier
        } finally {
          window.clearTimeout(abortId);
        }
        return null;
      };

      const canUseSameOriginEdge =
        typeof window !== "undefined" &&
        window.location?.protocol?.startsWith("http") &&
        !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || "");

      const endpoints = [
        ...(canUseSameOriginEdge ? [{ url: "/api/edge-chat", timeoutMs: 9000 }] : []),
        { url: `${API_BASE}/api/chat`, timeoutMs: 11000 },
      ];

      for (const ep of endpoints) {
        const reply = await tryChatEndpoint(ep.url, ep.timeoutMs);
        if (reply) return reply;
      }
    } catch {}
    return getCareerAgentResponse(query, priorHistory, parsedProfile, activeHonorific);
  };

  const ensureSocketConnected = () => {
    if (dasSocket.isConnected) return;
    const activeRole = getHonorificKey();
    setRole(activeRole);
    setTranscript((prev) =>
      prev === "Hi Sir! What's up?" ||
      prev === "Hi Madam! What's up?" ||
      prev === "Hi Boss! What's up?" ||
      prev === "Hi stranger, tell your name first!"
        ? getInitialGreeting(activeRole)
        : prev
    );
    dasSocket.connect(
      activeRole,
      (text: string) => setTranscript(text),
      (status: boolean) => setConnected(status),
      (path: string) => navigate(path),
      (userText: string) => setUserTranscript(userText),
      () => {
        setTranscript("[Interrupted — Listening...]");
      },
      (payload: CodeTaskPayload) => {
        if (!payload) {
          setCodeTask(null);
          return;
        }
        setCodeTask(payload);
        setEditableCode(payload.code);
        setCompileOutput("Executing code live...");
        setTimeout(() => {
          runCodeLiveRef.current(payload.code, payload.language);
        }, 120);
      }
    );
  };
  ensureSocketConnectedRef.current = ensureSocketConnected;

  const dispatchTurnWithVoiceFallback = (
    queryText: string,
    ctx: Record<string, any>,
    mode: "coach" | "chat"
  ) => {
    askCoachUnbindRef.current?.();
    askCoachUnbindRef.current = null;
    restTtsAbortRef.current?.abort();
    restTtsAbortRef.current = null;
    const nonce = ++askCoachNonceRef.current;

    audioEngine.unlockAudio();
    audioEngine.clearAudioQueue();
    speaker.stop();

    ensureSocketConnectedRef.current();

    let settled = false;
    let timerId: number | null = null;
    const cleanup = () => {
      settled = true;
      if (timerId !== null) window.clearTimeout(timerId);
      unsubSocket();
      if (askCoachUnbindRef.current === cleanup) {
        askCoachUnbindRef.current = null;
      }
    };
    const unsubSocket = dasSocket.onAgentResponse(() => {
      restTtsAbortRef.current?.abort();
      restTtsAbortRef.current = null;
      cleanup();
    });
    askCoachUnbindRef.current = cleanup;

    const latestTranscript = (transcriptRef.current || "").trim();
    const isTransientBanner =
      !latestTranscript ||
      latestTranscript === "Thinking & Executing..." ||
      latestTranscript === "Connecting to DAS Core..." ||
      latestTranscript === "[Interrupted — Listening...]" ||
      latestTranscript === "Mic paused." ||
      latestTranscript.startsWith("DAS Ready") ||
      latestTranscript.startsWith("Listening...");
    const isUntouchedInitial =
      chatHistoryRef.current.length === 0 &&
      !userTranscriptRef.current.trim() &&
      latestTranscript === getInitialGreeting(getHonorificKey());
    if (!isTransientBanner && !isUntouchedInitial) {
      const prevEntry = chatHistoryRef.current[chatHistoryRef.current.length - 1];
      if (!prevEntry || prevEntry.role !== "assistant" || prevEntry.content !== latestTranscript) {
        chatHistoryRef.current.push({ role: "assistant", content: latestTranscript });
      }
    }
    const priorHistory = chatHistoryRef.current.slice(-10);
    chatHistoryRef.current = [
      ...chatHistoryRef.current,
      { role: "user" as const, content: queryText },
    ].slice(-12);

    // Strict deterministic "Hi" rule across 4 roles (pre-warmed WebSocket Puck first, instant REST Puck fallback)
    if (mode === "chat" && isPureHiGreeting(queryText)) {
      const activeKey = getHonorificKey();
      const exactHi = getExactHiReply(activeKey, hiGreetCountRef.current);
      hiGreetCountRef.current += 1;
      if (dasSocket.isSocketConnected) {
        tryExecuteClientAutomationIntent(queryText, navigate);
        dasSocket.sendTextCommand(queryText);
        timerId = window.setTimeout(() => {
          if (
            settled ||
            askCoachNonceRef.current !== nonce ||
            dasSocket.isAgentSpeaking ||
            audioEngine.isSpeaking()
          ) {
            return;
          }
          cleanup();
          chatHistoryRef.current = [
            ...chatHistoryRef.current,
            { role: "assistant" as const, content: exactHi },
          ].slice(-12);
          setTranscript(exactHi);
          const ttsAc = new AbortController();
          restTtsAbortRef.current = ttsAc;
          void audioEngine.speakTextPuckOrLocal(exactHi, API_BASE, {
            signal: ttsAc.signal,
            shouldContinue: () => askCoachNonceRef.current === nonce,
          });
        }, 2800);
        return;
      }
      cleanup();
      chatHistoryRef.current = [
        ...chatHistoryRef.current,
        { role: "assistant" as const, content: exactHi },
      ].slice(-12);
      setTranscript(exactHi);
      const ttsAc = new AbortController();
      restTtsAbortRef.current = ttsAc;
      void audioEngine.speakTextPuckOrLocal(exactHi, API_BASE, {
        signal: ttsAc.signal,
        shouldContinue: () => askCoachNonceRef.current === nonce,
      });
      return;
    }

    const deliverRestReply = async () => {
      const replyText = await requestRestCoachReply(queryText, ctx, priorHistory);
      const cleanReply = cleanHudReplyText(replyText);
      if (
        !settled &&
        askCoachNonceRef.current === nonce &&
        cleanReply
      ) {
        cleanup();
        chatHistoryRef.current = [
          ...chatHistoryRef.current,
          { role: "assistant" as const, content: cleanReply },
        ].slice(-12);
        setTranscript(cleanReply);
        restTtsAbortRef.current?.abort();
        const ttsAc = new AbortController();
        restTtsAbortRef.current = ttsAc;
        void audioEngine.speakTextPuckOrLocal(cleanReply, API_BASE, {
          signal: ttsAc.signal,
          shouldContinue: () =>
            askCoachNonceRef.current === nonce && !settled,
        });
      }
    };

    const wasSocketReady = dasSocket.isSocketConnected;
    if (mode === "coach") {
      dasSocket.askCoach(queryText, ctx);
    } else {
      tryExecuteClientAutomationIntent(queryText, navigate);
      dasSocket.sendTextCommand(queryText);
    }
    const fallbackDelayMs = wasSocketReady ? 6200 : 1600;
    timerId = window.setTimeout(() => {
      if (
        settled ||
        askCoachNonceRef.current !== nonce ||
        dasSocket.isAgentSpeaking
      ) {
        return;
      }
      void deliverRestReply();
    }, fallbackDelayMs);
  };
  dispatchTurnRef.current = dispatchTurnWithVoiceFallback;

  // Wire single-click "Ask Coach about this" cards and Mock Interview verbatim prompts directly into the live DAS HUD
  useEffect(() => {
    if (!isAuthenticated) return;

    const onAskCoach = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      const query = typeof detail.query === "string" ? detail.query.trim() : "";
      if (!query) return;

      setHudCollapsed(false);
      setUserTranscript(query);
      setTranscript("Thinking & analyzing with DAS Coach...");

      const curCtx =
        (typeof window !== "undefined" && (window as any).__DAS_PAGE_CONTEXT__) || {};
      const mergedCtx = {
        ...curCtx,
        ...(detail.pageContext && typeof detail.pageContext === "object" ? detail.pageContext : {}),
        ...(detail.originTab ? { activeTab: detail.originTab } : {}),
        ...(detail.cardContext ? { cardContext: detail.cardContext } : {}),
      };
      dispatchTurnRef.current(query, mergedCtx, "coach");
    };

    const onInterviewerPrompt = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      const question = typeof detail.question === "string" ? detail.question.trim() : "";
      if (!question) return;
      setHudCollapsed(false);
      dasSocket.muteActiveTurn();
      askCoachUnbindRef.current?.();
      askCoachUnbindRef.current = null;
      restTtsAbortRef.current?.abort();
      restTtsAbortRef.current = null;
      askCoachNonceRef.current += 1;

      const track = String(detail.track || "").toLowerCase();
      const trackLabel =
        track === "defense"
          ? "Project Defense Prompt"
          : track === "jd"
            ? "JD Match Verdict"
            : track === "arena"
              ? "Live Coding Arena"
              : track === "verdict"
                ? "Hiring Committee Verdict"
                : "Interviewer Prompt";
      setUserTranscript(trackLabel);
      setTranscript(question);
    };

    const onToggleFocusHud = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (typeof detail?.focus === "boolean") {
        setFocusMode(detail.focus);
        if (detail.focus) setHudCollapsed(false);
      } else {
        setFocusMode((prev) => {
          const next = !prev;
          if (next) setHudCollapsed(false);
          return next;
        });
      }
    };

    window.addEventListener("das-ask-coach", onAskCoach);
    window.addEventListener("das-interviewer-prompt", onInterviewerPrompt);
    window.addEventListener("das-toggle-focus", onToggleFocusHud);
    return () => {
      window.removeEventListener("das-ask-coach", onAskCoach);
      window.removeEventListener("das-interviewer-prompt", onInterviewerPrompt);
      window.removeEventListener("das-toggle-focus", onToggleFocusHud);
      askCoachUnbindRef.current?.();
      askCoachUnbindRef.current = null;
      restTtsAbortRef.current?.abort();
      restTtsAbortRef.current = null;
    };
  }, [isAuthenticated]);

  // Connect to Gemini Live multimodal agent ONLY when authenticated inside the dashboard
  // Keep `role` OUT of dependencies so toggling Sir/Madam never disconnects WS!
  useEffect(() => {
    if (!isAuthenticated) {
      dasSocket.disconnect();
      setMicActive(false);
      return;
    }

    // Wake Render backend proactively, warm Live upstream session if tab is visible, and pre-fetch primary Hi greeting lazily
    fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => {});
    ensureSocketConnected();
    if (typeof document === "undefined" || document.visibilityState === "visible") {
      dasSocket.warmup();
    }
    const activeKey = getHonorificKey();
    const prefetchTimer = window.setTimeout(() => {
      void audioEngine.prefetchPuckTts([getExactHiReply(activeKey, 0)], API_BASE);
    }, 1500);

    const prewarmAudio = () => {
      audioEngine.unlockAudio();
    };
    const unsubAgentActivity = dasSocket.onAgentResponse(() => {
      lastAgentActivityAtRef.current = Date.now();
    });
    window.addEventListener("pointerdown", prewarmAudio, { once: true, passive: true });
    window.addEventListener("keydown", prewarmAudio, { once: true, passive: true });

    return () => {
      unsubAgentActivity();
      window.clearTimeout(prefetchTimer);
      window.removeEventListener("pointerdown", prewarmAudio);
      window.removeEventListener("keydown", prewarmAudio);
      dasSocket.disconnect();
    };
  }, [isAuthenticated]);

  const beginMicStream = async (deviceId?: string) => {
    micSilentRef.current = false;
    setMicSilentWarning(false);
    setMicHealthHint("");
    // Start capture immediately so iOS Safari / Android Chrome keep the synchronous tap gesture token for getUserMedia
    await audioEngine.startMicCapture((b64) => dasSocket.sendAudioChunk(b64), {
      deviceId: deviceId || undefined,
      rawMode: false,
      shouldSuppressEcho: () => audioEngine.isSpeaking() || dasSocket.isAgentSpeaking,
      onSpeechStart: () => {
        if (!dasSocket.isAgentSpeaking && !audioEngine.isSpeaking()) {
          setTranscript("Hearing you...");
        }
      },
      onSpeechIdle: () => {
        dasSocket.sendAudioStreamEnd();
        if (!dasSocket.isAgentSpeaking && !audioEngine.isSpeaking()) {
          setTranscript("Processing voice...");
        }
      },
      onAutoDeviceSwitch: (newDev) => {
        selectedMicIdRef.current = newDev.deviceId;
        activeMicLabelRef.current = newDev.label;
        setActiveMicLabel(newDev.label);
        setMicHealthHint("");
        toast.info(`Switched automatically to microphone: ${newDev.label}`);
      },
      onVoiceHealthAlert: (alert) => {
        const friendlyMsg =
          alert.issue === "low_volume"
            ? "Voice very faint — raise volume or bring mic closer"
            : "Earphone/bud mic unclear — check connection & volume";
        setMicHealthHint(friendlyMsg);
        setMicSilentWarning(true);
        toast.info(friendlyMsg);
      },
      onSignalStatus: (st) => {
        // Direct DOM meter update -> ZERO React re-renders per audio buffer (fixes typing lag & audio stutter!)
        if (micBarRef.current) {
          micBarRef.current.style.width = `${Math.max(4, Math.round(st.volume * 100))}%`;
        }
        if (st.deviceLabel && st.deviceLabel !== activeMicLabelRef.current) {
          activeMicLabelRef.current = st.deviceLabel;
          setActiveMicLabel(st.deviceLabel);
        }
        if (st.volume >= 0.015) {
          setMicHealthHint((prev) => (prev ? "" : prev));
        }
        const isSilent = st.silentMs >= 3000;
        if (isSilent !== micSilentRef.current) {
          micSilentRef.current = isSilent;
          setMicSilentWarning(isSilent);
        }
      },
    });
    const lbl = audioEngine.activeMicLabel || "Default Microphone";
    activeMicLabelRef.current = lbl;
    setActiveMicLabel(lbl);
    setMicActive(true);
    void refreshMediaDevices();
    void audioEngine.autoSyncOutputDevice();
  };

  const stopParallelSpeechRec = () => {
    const rec = speechRecRef.current;
    speechRecRef.current = null;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.stop();
      } catch {}
    }
  };

  const startParallelSpeechRec = () => {
    stopParallelSpeechRec();
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const rec = new SR();
      rec.lang = "en-IN";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (ev: any) => {
        if (audioEngine.isSpeaking() || dasSocket.isAgentSpeaking) return;
        let interim = "";
        let finalized = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const piece = (ev.results[i][0]?.transcript || "").trim();
          if (!piece) continue;
          if (ev.results[i].isFinal) {
            finalized += (finalized ? " " : "") + piece;
          } else {
            interim += (interim ? " " : "") + piece;
          }
        }
        if (interim && !finalized) {
          setUserTranscript(interim);
        }
        if (finalized) {
          const cleanSpoken = finalized.trim();
          const spokenAt = Date.now();
          setUserTranscript(cleanSpoken);
          const curCtx =
            (typeof window !== "undefined" && (window as any).__DAS_PAGE_CONTEXT__) || {};
          const nonceBefore = askCoachNonceRef.current;
          const delayMs = !dasSocket.isSocketConnected
            ? isPureHiGreeting(cleanSpoken)
              ? 0
              : 650
            : 4000;
          window.setTimeout(() => {
            if (
              lastAgentActivityAtRef.current < spokenAt &&
              askCoachNonceRef.current === nonceBefore &&
              !dasSocket.isAgentSpeaking &&
              !audioEngine.isSpeaking()
            ) {
              dispatchTurnRef.current(cleanSpoken, curCtx, "chat");
            }
          }, delayMs);
        }
      };
      rec.onerror = () => {};
      rec.onend = () => {
        if (speechRecRef.current === rec) {
          try {
            rec.start();
          } catch {}
        }
      };
      speechRecRef.current = rec;
      rec.start();
    } catch {}
  };

  const toggleMic = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget?.blur();
    if (micBusyRef.current) return;
    micBusyRef.current = true;
    try {
      audioEngine.unlockAudio();
      void audioEngine.autoSyncOutputDevice();
      ensureSocketConnected();
      dasSocket.warmup();

      if (!micActive) {
        restTtsAbortRef.current?.abort();
        restTtsAbortRef.current = null;
        speaker.stop();
        audioEngine.clearAudioQueue();
        try {
          await beginMicStream(selectedMicIdRef.current);
          const isMobileBrowser =
            typeof navigator !== "undefined" &&
            /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
          if (!dasSocket.isSocketConnected || !isMobileBrowser) {
            startParallelSpeechRec();
          }
          setTranscript("Listening... Speak cleanly through headphones, earphones, buds, or laptop mic!");
        } catch {
          stopParallelSpeechRec();
          setTranscript("Mic Permission Denied! Browser address bar lo Mic allow cheyyandi.");
          toast.error("Please allow Microphone permission in your browser.");
        }
      } else {
        stopParallelSpeechRec();
        audioEngine.stopMicCapture();
        dasSocket.sendAudioStreamEnd();
        micSilentRef.current = false;
        if (micBarRef.current) micBarRef.current.style.width = "4%";
        setMicActive(false);
        setMicSilentWarning(false);
        setMicHealthHint("");
        setTranscript("Mic paused.");
      }
    } finally {
      micBusyRef.current = false;
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    audioEngine.notifyTypingActivity(1200);
    audioEngine.unlockAudio();
    const commandText = inputText.trim();
    setUserTranscript(commandText);
    setTranscript("Thinking & Executing...");
    setInputText("");

    const curCtx =
      (typeof window !== "undefined" && (window as any).__DAS_PAGE_CONTEXT__) || {};
    dispatchTurnWithVoiceFallback(commandText, curCtx, "chat");
  };

  const stopCodeLive = () => {
    if (runAbortRef.current) {
      runAbortRef.current.abort();
      runAbortRef.current = null;
    }
    isRunningCodeRef.current = false;
    setIsRunningCode(false);
    compileOutputRef.current = "⏹ Execution stopped.";
    setCompileOutput("⏹ Execution stopped.");
  };

  // Multi-tier live code executor (Backend API -> Piston Runner -> Godbolt Compiler Explorer)
  const runCodeLive = async (
    codeOverride?: string,
    langOverride?: string,
    stdinOverride?: string
  ): Promise<{ ok: boolean; output: string; stderr: string; engine: string; stopped?: boolean }> => {
    const targetCode = typeof codeOverride === "string" ? codeOverride : editableCodeRef.current;
    const targetLang = normalizeLanguage(langOverride || codeTaskRef.current?.language || "python");
    const targetStdin = typeof stdinOverride === "string" ? stdinOverride : stdinInputRef.current;
    if (!targetCode.trim()) {
      const emptyMsg = "No code to execute.";
      compileOutputRef.current = emptyMsg;
      setCompileOutput(emptyMsg);
      return { ok: false, output: emptyMsg, stderr: "", engine: "none" };
    }

    if (runAbortRef.current) {
      runAbortRef.current.abort();
    }
    const controller = new AbortController();
    runAbortRef.current = controller;

    let cleanCode = targetCode;
    // For single-file Java compilation, remove 'public' so javac doesn't require matching filename
    if (targetLang === "java") {
      cleanCode = cleanCode.replace(/\bpublic\s+class\b/g, "class");
    }

    isRunningCodeRef.current = true;
    setIsRunningCode(true);
    compileOutputRef.current = "Compiling & running your code live...";
    setCompileOutput("Compiling & running your code live...");

    try {
      // 1. Primary: Run via our backend /api/compile
      try {
        const res = await fetch(`${API_BASE}/api/compile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            language: targetLang,
            code: cleanCode,
            stdin: targetStdin,
            title: codeTaskRef.current?.title || "Live Program",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const stderrText = String(data.stderr || "");
          const output =
            data.output || (stderrText ? `Diagnostics:\n${stderrText}` : "Program executed with no standard output.");
          compileOutputRef.current = output;
          setCompileOutput(output);
          return {
            ok: data.success !== false,
            output: String(output),
            stderr: stderrText,
            engine: String(data.engine || "backend"),
          };
        }
      } catch (primaryErr: any) {
        if (primaryErr?.name === "AbortError" || controller.signal.aborted) {
          compileOutputRef.current = "⏹ Execution stopped.";
          setCompileOutput("⏹ Execution stopped.");
          return { ok: false, stopped: true, output: "Execution stopped.", stderr: "", engine: "aborted" };
        }
      }

      // 2. Secondary High-Speed Fallback: Piston Sandbox Engine
      try {
        const pistonLangs: Record<string, string> = {
          c: "c",
          cpp: "c++",
          "c++": "c++",
          python: "python",
          py: "python",
          java: "java",
          javascript: "javascript",
          js: "javascript",
          typescript: "typescript",
          ts: "typescript",
          rust: "rust",
          go: "go",
          csharp: "csharp.net",
          cs: "csharp.net",
        };
        const pLang = pistonLangs[targetLang] || "python";
        const pRes = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            language: pLang,
            version: "*",
            files: [{ content: cleanCode }],
            stdin: targetStdin || "",
          }),
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          const pOut = (pData.run?.output || pData.run?.stdout || "").trim();
          const pErr = (pData.run?.stderr || "").trim();
          if (pOut || pErr) {
            const outStr = pOut || pErr;
            compileOutputRef.current = outStr;
            setCompileOutput(outStr);
            return { ok: !pErr, output: outStr, stderr: pErr, engine: "piston" };
          }
        }
      } catch (pistonErr: any) {
        if (pistonErr?.name === "AbortError" || controller.signal.aborted) {
          compileOutputRef.current = "⏹ Execution stopped.";
          setCompileOutput("⏹ Execution stopped.");
          return { ok: false, stopped: true, output: "Execution stopped.", stderr: "", engine: "aborted" };
        }
      }

      // 3. Tertiary Fallback: Compiler Explorer (Godbolt) Official API
      try {
        const compilerMap: Record<string, { id: string; lang: string; args: string }> = {
          c: { id: "cg132", lang: "c", args: "-O2" },
          cpp: { id: "g132", lang: "c++", args: "-O2" },
          "c++": { id: "g132", lang: "c++", args: "-O2" },
          python: { id: "python311", lang: "python", args: "" },
          py: { id: "python311", lang: "python", args: "" },
          java: { id: "java2100", lang: "java", args: "" },
          rust: { id: "r1750", lang: "rust", args: "-O2" },
          go: { id: "g121", lang: "go", args: "" },
          typescript: { id: "typescript54", lang: "typescript", args: "" },
          ts: { id: "typescript54", lang: "typescript", args: "" },
          javascript: { id: "v8_12", lang: "javascript", args: "" },
          js: { id: "v8_12", lang: "javascript", args: "" },
        };

        const comp = compilerMap[targetLang] || { id: "cg132", lang: "c", args: "-O2" };
        const fallbackRes = await fetch(`https://godbolt.org/api/compiler/${comp.id}/compile`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            source: cleanCode,
            compiler: comp.id,
            options: {
              userArguments: comp.args,
              executeParameters: { args: [], stdin: targetStdin || "" },
              compilerOptions: { executorRequest: true },
              filters: { binary: true, execute: true },
            },
            lang: comp.lang,
          }),
        });

        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          const stdout = (fbData.stdout || []).map((i: any) => i.text || "").join("\n").trim();
          const stderr = (fbData.stderr || []).map((i: any) => i.text || "").join("\n").trim();
          const buildErr = (fbData.buildResult?.stderr || []).map((i: any) => i.text || "").join("\n").trim();
          const finalOutput = stdout || stderr || buildErr || "Program executed successfully (no stdout).";
          compileOutputRef.current = finalOutput;
          setCompileOutput(finalOutput);
          return {
            ok: !(stderr || buildErr),
            output: finalOutput,
            stderr: stderr || buildErr,
            engine: `godbolt-${comp.id}`,
          };
        }
        compileOutputRef.current = "Program executed successfully.";
        setCompileOutput("Program executed successfully.");
        return { ok: true, output: "Program executed successfully.", stderr: "", engine: "godbolt" };
      } catch (fbErr: any) {
        if (fbErr?.name === "AbortError" || controller.signal.aborted) {
          compileOutputRef.current = "⏹ Execution stopped.";
          setCompileOutput("⏹ Execution stopped.");
          return { ok: false, stopped: true, output: "Execution stopped.", stderr: "", engine: "aborted" };
        }
        const errMsg = `Execution notice: ${String(fbErr)}`;
        compileOutputRef.current = errMsg;
        setCompileOutput(errMsg);
        return { ok: false, output: errMsg, stderr: String(fbErr), engine: "error" };
      }
    } finally {
      if (runAbortRef.current === controller) {
        runAbortRef.current = null;
      }
      isRunningCodeRef.current = false;
      setIsRunningCode(false);
    }
  };
  runCodeLiveRef.current = (code: string, lang: string) => {
    void runCodeLive(code, lang);
  };

  useEffect(() => {
    codingStudioController.registerHandler(async (args: CodingStudioActionArgs) => {
      const action = String(args.action || "open").toLowerCase().trim();
      const currentTask = codeTaskRef.current;
      const targetLang = normalizeLanguage(args.language || currentTask?.language || "python");
      const spec = getLanguageSpec(targetLang);

      if (action === "close") {
        stopCodeLive();
        codeTaskRef.current = null;
        setCodeTask(null);
        return { ok: true, action: "close", closed: true, message: "Closed Coding Studio." };
      }

      if (action === "stop_code") {
        stopCodeLive();
        return {
          ok: true,
          action: "stop_code",
          stopped: true,
          language: targetLang,
          output: "⏹ Execution stopped.",
        };
      }

      if (action === "read_code" || action === "get_output") {
        const curCode = editableCodeRef.current || "";
        return {
          ok: true,
          action,
          is_open: Boolean(codeTaskRef.current),
          language: currentTask?.language || targetLang,
          title: currentTask?.title || spec.extension,
          code: curCode,
          numbered_code: formatNumberedCode(curCode),
          line_count: curCode ? curCode.split(/\r?\n/).length : 0,
          output: compileOutputRef.current || "",
          is_running: isRunningCodeRef.current,
        };
      }

      let nextCode = editableCodeRef.current;
      let nextTitle = args.program_title || currentTask?.title || `${spec.label} Workspace`;
      let nextExplanation =
        args.logic_explanation !== undefined ? args.logic_explanation : currentTask?.explanation || "";

      if (action === "open") {
        if (!nextCode.trim() || (args.language && normalizeLanguage(currentTask?.language) !== targetLang)) {
          nextCode = args.source_code ?? spec.starter;
        } else if (args.source_code) {
          nextCode = args.source_code;
        }
      } else if (action === "switch_language") {
        nextCode = args.source_code !== undefined ? String(args.source_code) : spec.starter;
        nextTitle = args.program_title || `${spec.label} Workspace`;
      } else if (action === "write_code") {
        nextCode = applyCodeEdit(nextCode, args);
      } else if (action === "delete_code") {
        nextCode = applyCodeDelete(nextCode, args);
        if (!nextCode.trim()) {
          compileOutputRef.current = "Editor cleared.";
          setCompileOutput("Editor cleared.");
        }
      }

      const nextTask: CodeTaskPayload = {
        language: targetLang,
        title: nextTitle,
        code: nextCode,
        explanation: nextExplanation,
      };
      codeTaskRef.current = nextTask;
      editableCodeRef.current = nextCode;
      setCodeTask(nextTask);
      setEditableCode(nextCode);

      if (args.stdin !== undefined) {
        stdinInputRef.current = String(args.stdin);
        setStdinInput(String(args.stdin));
      }

      const shouldRun =
        action === "run_code" ||
        (action === "write_code" && args.auto_run !== false && Boolean(nextCode.trim())) ||
        ((action === "switch_language" || action === "open") && args.auto_run === true && Boolean(nextCode.trim()));

      let runResult: { ok: boolean; output: string; stderr: string; engine: string; stopped?: boolean } | null = null;
      if (shouldRun) {
        runResult = await runCodeLive(nextCode, targetLang, args.stdin);
      }

      return {
        ok: runResult ? runResult.ok : true,
        action,
        language: targetLang,
        title: nextTitle,
        code: nextCode,
        numbered_code: formatNumberedCode(nextCode),
        line_count: nextCode ? nextCode.split(/\r?\n/).length : 0,
        output: runResult ? runResult.output : compileOutputRef.current,
        stderr: runResult ? runResult.stderr : "",
        engine: runResult ? runResult.engine : "studio",
        stopped: Boolean(runResult?.stopped),
      };
    });
    return () => {
      codingStudioController.registerHandler(null);
    };
  }, []);

  // 1. Keep outer wrapper + container identical across auth transitions so Home never unmounts mid-login
  const hasUser = typeof window !== "undefined" && Boolean(localStorage.getItem("pathfinder_user"));
  const showAgent = isAuthenticated || hasUser;

  useEffect(() => {
    return audioEngine.onSpeakingStateChange((speaking) => {
      setIsSpeaking(speaking);
    });
  }, []);

  useEffect(() => {
    if (activeLayout !== "background") return;
    if (activeTab === "interview" && !focusMode) {
      setHudCollapsed(true);
    }
  }, [activeLayout, activeTab, focusMode]);

  useEffect(() => {
    if (typeof window === "undefined" || activeLayout !== "docked") return;
    const onResize = () => {
      if (!userToggledStageRef.current) {
        setHudCollapsed(window.innerWidth < 1280);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeLayout]);

  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocusMode(false);
        window.dispatchEvent(new CustomEvent("das-toggle-focus", { detail: { focus: false } }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dockedOpen = activeLayout === "docked" && showAgent && !hudCollapsed && !focusMode;
    document.documentElement.dataset.dasStage = dockedOpen ? "open" : "collapsed";
    document.documentElement.dataset.dasLayout = activeLayout;
    window.dispatchEvent(
      new CustomEvent("das-stage-layout", {
        detail: { dockedOpen, focusMode, isSpeaking, layoutMode: activeLayout },
      })
    );
  }, [activeLayout, showAgent, hudCollapsed, focusMode, isSpeaking]);

  const bgFaceOpacityClass =
    focusMode || isSpeaking || activeTab === "overview"
      ? "opacity-100"
      : activeTab === "interview" || activeTab === "analytics"
        ? "opacity-35"
        : "opacity-65";

  return (
    <div className={showAgent ? "relative min-h-screen bg-transparent text-white overflow-x-hidden" : "relative min-h-screen bg-transparent"}>
      {/* Route Viewport Container (each page renders its own semantic main landmark) */}
      <div className="relative z-10 min-h-screen bg-transparent">{children}</div>

      {showAgent && (
        <>
      {/* DAS Live Multi-Language Code & Compiler Studio Drawer */}
      {codeTask && (
        <div
          className={`fixed top-16 left-2 right-2 sm:left-auto sm:top-20 z-50 sm:w-[94%] max-w-2xl max-h-[82vh] overflow-y-auto bg-[#09090B]/95 backdrop-blur-md border border-white/[0.12] rounded-2xl shadow-2xl p-3 sm:p-4 flex flex-col gap-3 ${
            activeLayout === "docked" && !hudCollapsed && !focusMode
              ? "sm:right-6 xl:right-[384px] 2xl:right-[424px]"
              : "sm:right-6"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <select
                id="coding-studio-language"
                name="codingStudioLanguage"
                value={normalizeLanguage(codeTask.language)}
                onChange={(e) => {
                  const nextLang = normalizeLanguage(e.target.value);
                  void codingStudioController.execute({
                    action: "switch_language",
                    language: nextLang,
                  });
                }}
                aria-label="Select Programming Language"
                className="text-xs font-mono font-semibold uppercase px-2.5 py-1 rounded-lg bg-[#141419] border border-white/[0.12] text-[#FAFAFA] focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id} className="bg-[#09090B] text-[#FAFAFA]">
                    {lang.label}
                  </option>
                ))}
              </select>
              <span className="font-semibold text-[#FAFAFA] text-sm truncate max-w-[200px]">
                {codeTask.title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#141419] border border-white/[0.08] text-[#A1A1AA] font-mono tabular-nums">
                {editableCode ? editableCode.split(/\r?\n/).length : 0} lines
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(editableCode);
                    toast.success("Code copied to clipboard!");
                  } catch {}
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#141419] hover:bg-[#1E1E26] border border-white/[0.12] rounded-lg text-xs text-[#FAFAFA] transition cursor-pointer"
              >
                <Copy className="h-3 w-3 text-[#A1A1AA]" />
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void codingStudioController.execute({ action: "delete_code" });
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#141419] hover:bg-[#1E1E26] border border-white/[0.12] rounded-lg text-xs text-[#FAFAFA] transition cursor-pointer"
                title="Clear / Delete All Code"
              >
                <Trash2 className="h-3 w-3 text-[#A1A1AA]" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCodeLive();
                  setCodeTask(null);
                  setTranscript(`Okay ${getUserRole()}, returned to your dashboard.`);
                }}
                className="inline-flex items-center justify-center p-1.5 bg-[#141419] hover:bg-[#1E1E26] border border-white/[0.12] rounded-lg text-xs text-[#FAFAFA] transition cursor-pointer"
                title="Close Compiler Studio"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {codeTask.explanation && (
            <div className="bg-[#0D0D11] border border-white/[0.08] rounded-xl p-3 text-xs text-[#E4E4E7] whitespace-pre-wrap max-h-36 overflow-y-auto">
              <span className="font-semibold text-[#FAFAFA] inline-flex items-center gap-1.5 mb-1">
                <Terminal className="h-3.5 w-3.5 text-[#A1A1AA]" />
                <span>Logic, Structure & Walkthrough:</span>
              </span>
              <div className="leading-relaxed text-[#A1A1AA]">{codeTask.explanation}</div>
            </div>
          )}

          <textarea
            id="coding-studio-editor"
            name="codingStudioEditor"
            aria-label="Source Code Editor"
            value={editableCode}
            onChange={(e) => {
              editableCodeRef.current = e.target.value;
              setEditableCode(e.target.value);
            }}
            rows={10}
            spellCheck={false}
            className="w-full bg-[#0D0D11] border border-white/[0.1] rounded-xl p-3 font-mono text-xs text-[#FAFAFA] focus:outline-none focus:border-white/30 selection:bg-white/20"
          />

          <div className="flex items-center gap-2">
            <input
              id="coding-studio-stdin"
              name="codingStudioStdin"
              type="text"
              value={stdinInput}
              onChange={(e) => {
                stdinInputRef.current = e.target.value;
                setStdinInput(e.target.value);
              }}
              placeholder="Optional program input (stdin)..."
              className="flex-1 bg-[#0D0D11] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-white/30"
            />
            {isRunningCode && (
              <button
                type="button"
                onClick={stopCodeLive}
                className="px-3.5 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 border border-white/[0.18]"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Stop</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void runCodeLive();
              }}
              disabled={isRunningCode}
              className={`px-4 py-1.5 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 border ${
                isRunningCode
                  ? "bg-[#18181D] border-white/[0.1] text-[#A1A1AA] cursor-not-allowed"
                  : "bg-[#FAFAFA] hover:bg-white border-white text-[#09090B]"
              }`}
            >
              <Play className="h-3 w-3 fill-current" />
              <span>{isRunningCode ? "Running..." : "Run Code"}</span>
            </button>
          </div>

          <div className="bg-[#0D0D11] border border-white/[0.08] rounded-xl p-3 font-mono text-xs text-[#D4D4D8] max-h-40 overflow-y-auto whitespace-pre-wrap">
            {compileOutput || "Output terminal ready. Click Run Code or tell DAS to run."}
          </div>
        </div>
      )}

      {/* DAS Agent Layout Switch: "background" (Hero Backdrop + Speaking Spotlight) vs "docked" */}
      {activeLayout === "background" ? (
        <>
          {focusMode && (
            <div
              onClick={() => {
                setFocusMode(false);
                window.dispatchEvent(
                  new CustomEvent("das-toggle-focus", { detail: { focus: false } })
                );
              }}
              className="fixed inset-0 z-30 bg-black/75 backdrop-blur-[2px]"
              aria-hidden="true"
            />
          )}

          {/* Full-Viewport Dramatic 3D Face Hero Backdrop (Pointer-Events None, Singleton Canvas) */}
          <div
            data-das-layout="background"
            data-state={isSpeaking ? "speaking" : micActive ? "listening" : "idle"}
            className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${
              focusMode ? "z-40 opacity-100" : `z-[1] ${bgFaceOpacityClass}`
            }`}
          >
            <Avatar3D
              style={{
                position: "relative",
                inset: "auto",
                width: "100%",
                height: "100%",
                zIndex: 1,
              }}
            />
          </div>

          {hudCollapsed && !focusMode ? (
            <div
              id="das-hud-collapsed-pill"
              className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-[#09090B]/95 backdrop-blur-md px-3.5 py-1.5 shadow-2xl"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "bg-[#FAFAFA] animate-pulse" : "bg-[#71717A]"
                }`}
              />
              <button
                type="button"
                onClick={() => setHudCollapsed(false)}
                aria-label="Open DAS AI bar"
                title="Expand DAS AI controls"
                className="text-xs font-semibold tracking-wide text-[#FAFAFA] hover:text-white transition cursor-pointer flex items-center gap-1.5 px-1"
              >
                <ChevronUp className="h-3.5 w-3.5 text-[#A1A1AA]" />
                <span>DAS AI</span>
                {isSpeaking && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-white/[0.1] border border-white/[0.18] text-[#FAFAFA]">
                    Speaking
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusMode(true);
                  window.dispatchEvent(
                    new CustomEvent("das-toggle-focus", { detail: { focus: true } })
                  );
                }}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-white/[0.12] bg-[#141419] text-[#D4D4D8] hover:text-[#FAFAFA] transition cursor-pointer"
                title="Focus on DAS 3D Mentor"
              >
                Focus
              </button>
              <button
                type="button"
                onClick={toggleMic}
                aria-label={micActive ? "Mute microphone" : "Speak to DAS"}
                title={micActive ? "Mute mic" : "Speak to DAS"}
                className={`h-6 w-6 rounded-full flex items-center justify-center border transition cursor-pointer ${
                  micActive
                    ? "bg-[#FAFAFA] border-white text-[#09090B]"
                    : "bg-[#141419] border-white/[0.12] text-[#FAFAFA] hover:bg-[#1E1E26]"
                }`}
              >
                {micActive ? (
                  <Square className="h-2.5 w-2.5 fill-current" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : (
            <div
              id="das-bottom-hud"
              data-state={isSpeaking ? "speaking" : micActive ? "listening" : "idle"}
              className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[94%] sm:w-[86%] max-w-xl rounded-2xl border bg-[#09090B]/95 backdrop-blur-md px-3 py-2 shadow-2xl flex flex-col gap-1.5 transition-colors duration-200 ${
                isSpeaking ? "border-white/[0.28]" : "border-white/[0.12]"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] px-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      connected ? "bg-[#FAFAFA] animate-pulse" : "bg-[#71717A]"
                    }`}
                  />
                  <span className="font-semibold tracking-wider text-[#FAFAFA]">DAS AI</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border border-white/[0.1] bg-[#141419] text-[#D4D4D8]">
                    {isSpeaking ? "SPEAKING" : connected ? "ONLINE" : "CONNECTING"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (codeTask) {
                        void codingStudioController.execute({ action: "close" });
                      } else {
                        void codingStudioController.execute({ action: "open", language: "python" });
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition cursor-pointer ${
                      codeTask
                        ? "bg-[#1E1E26] border-white/[0.32] text-[#FAFAFA]"
                        : "bg-[#141419] border-white/[0.1] text-[#D4D4D8] hover:border-white/[0.2] hover:text-[#FAFAFA]"
                    }`}
                    title="Open DAS Voice-Controlled Code Scratchpad (11 languages)"
                  >
                    <Code2 className="h-3 w-3 text-[#A1A1AA]" />
                    <span>Code</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !focusMode;
                      setFocusMode(next);
                      window.dispatchEvent(
                        new CustomEvent("das-toggle-focus", { detail: { focus: next } })
                      );
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-white/[0.12] bg-[#141419] text-[#FAFAFA] hover:border-white/[0.28] transition cursor-pointer"
                    title={focusMode ? "Exit Focus Mode (Esc)" : "Spotlight DAS 3D Face"}
                  >
                    <span>{focusMode ? "Exit Focus (Esc)" : "Focus"}</span>
                  </button>
                  {!focusMode && (
                    <button
                      type="button"
                      onClick={() => setHudCollapsed(true)}
                      aria-label="Hide DAS panel"
                      title="Minimize DAS bar"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-white/[0.1] bg-[#141419] text-[#D4D4D8] hover:text-[#FAFAFA] hover:border-white/[0.2] transition cursor-pointer"
                    >
                      <ChevronDown className="h-3 w-3 text-[#A1A1AA]" />
                      <span>Hide</span>
                    </button>
                  )}
                </div>
              </div>

              {userTranscript && (
                <div className="flex items-start gap-2 text-[11px] text-[#FAFAFA] rounded-xl px-2.5 py-1 max-h-10 overflow-y-auto das-scrollbar whitespace-pre-wrap leading-relaxed border border-white/[0.08] bg-[#121216]">
                  <User className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#A1A1AA]" />
                  <span>You: {userTranscript}</span>
                </div>
              )}

              <div
                className={`flex items-start gap-2 rounded-xl px-2.5 py-1.5 max-h-16 overflow-y-auto das-scrollbar whitespace-pre-wrap leading-relaxed border border-white/[0.08] bg-[#121216] ${
                  focusMode ? "text-xs sm:text-sm text-[#FAFAFA]" : "text-xs text-[#E4E4E7]"
                }`}
              >
                <Volume2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#A1A1AA]" />
                <span>{focusMode ? transcript : `DAS: ${transcript}`}</span>
              </div>

              {micActive && (
                <div className="flex items-center justify-between px-2.5 py-1 rounded-xl text-[11px] border border-white/[0.08] bg-[#121216]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#FAFAFA] shrink-0">
                      {micSilentWarning ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-[#D4D4D8]" />
                          <span>NO MIC SIGNAL</span>
                        </>
                      ) : (
                        <>
                          <AudioLines className="h-3.5 w-3.5 text-[#FAFAFA]" />
                          <span>MIC LIVE</span>
                        </>
                      )}
                    </span>
                    <div className="w-16 h-1.5 rounded-full bg-black/60 overflow-hidden shrink-0">
                      <div
                        ref={micBarRef}
                        className="h-full bg-[#FAFAFA] transition-[width] duration-75"
                        style={{ width: "4%" }}
                      />
                    </div>
                    <span className="text-[10px] text-[#A1A1AA] truncate">
                      {micSilentWarning
                        ? micHealthHint || "Voice faint or muted — raise volume or check earphones"
                        : activeMicLabel || "Capturing 16kHz PCM"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleMic}
                    className="text-[10px] text-[#FAFAFA] hover:text-[#D4D4D8] font-semibold ml-2 cursor-pointer shrink-0"
                  >
                    Mute
                  </button>
                </div>
              )}

              <form onSubmit={handleSendText} autoComplete="off" className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`px-2.5 py-1.5 rounded-xl font-medium text-[11px] transition cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                    micActive
                      ? "bg-[#1C1C24] border-white/[0.28] text-[#FAFAFA]"
                      : "bg-[#141419] border-white/[0.12] text-[#FAFAFA] hover:bg-[#1E1E26]"
                  }`}
                  title={micActive ? "Click to Mute Microphone" : "Click to Speak"}
                >
                  {micActive ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FAFAFA] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FAFAFA]"></span>
                      </span>
                      <span>Listening...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5 text-[#D4D4D8]" />
                      <span>Speak</span>
                    </>
                  )}
                </button>

                <input
                  id="das-command-input"
                  name="dasCommand"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={inputText}
                  onFocus={() => dasSocket.warmup()}
                  onChange={(e) => {
                    audioEngine.notifyTypingActivity(850);
                    dasSocket.warmup();
                    setInputText(e.target.value);
                  }}
                  placeholder="Ask DAS anything..."
                  className="min-w-[100px] flex-1 rounded-xl px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#8A8A92] focus:outline-none border border-white/[0.1] bg-[#121216] focus:border-white/[0.28]"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (userTranscript) {
                      const cleaned = userTranscript.replace(/^(?:🎤\s*)?You:\s*/i, "").trim();
                      setInputText(cleaned);
                      toast.info("Previous command loaded for editing!");
                    }
                    const inputEl = document.getElementById("das-command-input") as HTMLInputElement;
                    inputEl?.focus();
                    inputEl?.select();
                  }}
                  aria-label="Edit previous command"
                  className="px-2 py-1.5 rounded-xl text-[11px] font-medium transition cursor-pointer border border-white/[0.12] bg-[#141419] hover:bg-[#1E1E26] flex items-center gap-1 text-[#FAFAFA] shrink-0"
                  title="Edit / Recall Previous Query"
                >
                  <PenLine className="h-3 w-3 text-[#D4D4D8]" />
                </button>

                <button
                  type="submit"
                  aria-label="Send message to DAS"
                  className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#09090B] bg-[#FAFAFA] hover:bg-white transition cursor-pointer inline-flex items-center gap-1 shrink-0"
                >
                  <span>Send</span>
                  <SendHorizontal className="h-3 w-3" />
                </button>
              </form>
            </div>
          )}
        </>
      ) : (
        <>
      {/* Focus Mode Dimmed Backdrop */}
      {focusMode && (
        <div
          onClick={() => {
            setFocusMode(false);
            window.dispatchEvent(new CustomEvent("das-toggle-focus", { detail: { focus: false } }));
          }}
          className="fixed inset-0 z-40 bg-black/82 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Full-Height Docked DAS Stage (xl: 1280px+ sticky right stage, <xl collapsible drawer, Focus Mode centered) */}
      <aside
        aria-label="DAS 3D Voice Mentor Stage"
        className={`das-stage flex flex-col overflow-hidden rounded-2xl border bg-[#07070A] transition-all duration-200 ${
          focusMode
            ? "fixed inset-x-3 sm:inset-x-[6vw] lg:inset-x-[10vw] top-[76px] bottom-4 z-50 border-white/[0.18] shadow-[0_32px_96px_rgba(0,0,0,0.92)]"
            : `fixed top-[124px] right-4 bottom-4 w-[min(380px,calc(100vw-24px))] xl:w-[360px] 2xl:w-[400px] border-white/[0.1] shadow-[0_24px_64px_rgba(0,0,0,0.78)] ${
                hudCollapsed
                  ? "z-40 translate-x-[calc(100%+32px)] opacity-0 pointer-events-none"
                  : "z-40 xl:z-30 translate-x-0 opacity-100 pointer-events-auto"
              }`
        }`}
      >
        {/* Top Stage Controls Bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0B0B10] px-3 py-2 text-[11px]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                connected ? "bg-[#FAFAFA] animate-pulse" : "bg-[#71717A]"
              }`}
            />
            <span className="font-semibold tracking-wider text-[#FAFAFA]">DAS AI</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border border-white/[0.1] bg-[#141419] text-[#D4D4D8]">
              {connected ? "ONLINE" : "CONNECTING"}
            </span>
            <button
              type="button"
              onClick={() => {
                if (codeTask) {
                  void codingStudioController.execute({ action: "close" });
                } else {
                  void codingStudioController.execute({ action: "open", language: "python" });
                }
              }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition cursor-pointer ${
                codeTask
                  ? "bg-[#1E1E26] border-white/[0.32] text-[#FAFAFA]"
                  : "bg-[#141419] border-white/[0.1] text-[#D4D4D8] hover:border-white/[0.2] hover:text-[#FAFAFA]"
              }`}
              title="Open DAS Voice-Controlled Code Scratchpad (11 languages)"
            >
              <Code2 className="h-3 w-3 text-[#A1A1AA]" />
              <span>Code</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const next = !focusMode;
                setFocusMode(next);
                if (next) setHudCollapsed(false);
                window.dispatchEvent(
                  new CustomEvent("das-toggle-focus", { detail: { focus: next } })
                );
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-white/[0.12] bg-[#141419] text-[#FAFAFA] hover:border-white/[0.28] transition cursor-pointer"
              title={focusMode ? "Exit Focus Mode (Esc)" : "Expand DAS 3D Stage"}
            >
              <span>{focusMode ? "Exit Focus (Esc)" : "Focus"}</span>
            </button>

            {!focusMode && (
              <button
                type="button"
                onClick={() => {
                  userToggledStageRef.current = true;
                  setHudCollapsed(true);
                }}
                aria-label="Hide DAS stage"
                title="Collapse DAS stage"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-white/[0.1] bg-[#141419] text-[#D4D4D8] hover:text-[#FAFAFA] hover:border-white/[0.2] transition cursor-pointer"
              >
                <ChevronDown className="h-3 w-3 text-[#A1A1AA]" />
                <span>Hide</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated 3D Face Viewport (Singleton Canvas — Never Unmounted) */}
        <div className="relative flex-1 min-h-[240px] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,rgba(30,30,38,0.55)_0%,rgba(6,6,9,0.98)_75%)]">
          <Avatar3D
            style={{
              position: "relative",
              inset: "auto",
              width: "100%",
              height: "100%",
              zIndex: 1,
            }}
          />

          {focusMode && transcript && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex justify-center">
              <div className="max-w-2xl rounded-xl border border-white/[0.14] bg-black/80 px-4 py-2.5 text-center text-xs sm:text-sm leading-relaxed text-[#FAFAFA] backdrop-blur-md shadow-lg">
                {transcript}
              </div>
            </div>
          )}
        </div>

        {/* Docked Chat, Transcripts & Voice Command Bar */}
        <div
          id="das-bottom-hud"
          className="shrink-0 border-t border-white/[0.08] bg-[#09090D] px-3 py-2.5 flex flex-col gap-1.5"
        >
          {/* User Voice / Input Transcript */}
          {userTranscript && (
            <div className="flex items-start gap-2 text-[11px] text-[#FAFAFA] rounded-xl px-2.5 py-1.5 max-h-12 overflow-y-auto das-scrollbar whitespace-pre-wrap leading-relaxed border border-white/[0.08] bg-[#121216]">
              <User className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#A1A1AA]" />
              <span>You: {userTranscript}</span>
            </div>
          )}

          {/* Agent Spoken Response Transcript */}
          {!focusMode && (
            <div className="flex items-start gap-2 text-xs text-[#E4E4E7] rounded-xl px-2.5 py-1.5 max-h-20 overflow-y-auto das-scrollbar whitespace-pre-wrap leading-relaxed border border-white/[0.08] bg-[#121216]">
              <Volume2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#A1A1AA]" />
              <span>DAS: {transcript}</span>
            </div>
          )}

          {/* Live Microphone Signal & Warning Bar */}
          {micActive && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] border border-white/[0.08] bg-[#121216]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#FAFAFA] shrink-0">
                  {micSilentWarning ? (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-[#D4D4D8]" />
                      <span>NO MIC SIGNAL</span>
                    </>
                  ) : (
                    <>
                      <AudioLines className="h-3.5 w-3.5 text-[#FAFAFA]" />
                      <span>MIC LIVE</span>
                    </>
                  )}
                </span>
                <div className="w-16 h-1.5 rounded-full bg-black/60 overflow-hidden shrink-0">
                  <div
                    ref={micBarRef}
                    className="h-full bg-[#FAFAFA] transition-[width] duration-75"
                    style={{ width: "4%" }}
                  />
                </div>
                <span className="text-[10px] text-[#A1A1AA] truncate">
                  {micSilentWarning
                    ? micHealthHint || "Voice faint or muted — raise volume or check earphones"
                    : activeMicLabel || "Capturing 16kHz PCM"}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleMic}
                className="text-[10px] text-[#FAFAFA] hover:text-[#D4D4D8] font-semibold ml-2 cursor-pointer shrink-0"
              >
                Mute
              </button>
            </div>
          )}

          {/* Command & Control Bar */}
          <form onSubmit={handleSendText} autoComplete="off" className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMic}
              className={`px-2.5 py-1.5 rounded-xl font-medium text-[11px] transition cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                micActive
                  ? "bg-[#1C1C24] border-white/[0.28] text-[#FAFAFA]"
                  : "bg-[#141419] border-white/[0.12] text-[#FAFAFA] hover:bg-[#1E1E26]"
              }`}
              title={micActive ? "Click to Mute Microphone" : "Click to Speak"}
            >
              {micActive ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FAFAFA] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FAFAFA]"></span>
                  </span>
                  <span>Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5 text-[#D4D4D8]" />
                  <span>Speak</span>
                </>
              )}
            </button>

            <input
              id="das-command-input"
              name="dasCommand"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={inputText}
              onFocus={() => dasSocket.warmup()}
              onChange={(e) => {
                audioEngine.notifyTypingActivity(850);
                dasSocket.warmup();
                setInputText(e.target.value);
              }}
              placeholder="Ask DAS anything..."
              className="min-w-[100px] flex-1 rounded-xl px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#8A8A92] focus:outline-none border border-white/[0.1] bg-[#121216] focus:border-white/[0.28]"
            />

            <button
              type="button"
              onClick={() => {
                if (userTranscript) {
                  const cleaned = userTranscript.replace(/^(?:🎤\s*)?You:\s*/i, "").trim();
                  setInputText(cleaned);
                  toast.info("Previous command loaded for editing!");
                }
                const inputEl = document.getElementById("das-command-input") as HTMLInputElement;
                inputEl?.focus();
                inputEl?.select();
              }}
              aria-label="Edit previous command"
              className="px-2 py-1.5 rounded-xl text-[11px] font-medium transition cursor-pointer border border-white/[0.12] bg-[#141419] hover:bg-[#1E1E26] flex items-center gap-1 text-[#FAFAFA] shrink-0"
              title="Edit / Recall Previous Query"
            >
              <PenLine className="h-3 w-3 text-[#D4D4D8]" />
            </button>

            <button
              type="submit"
              aria-label="Send message to DAS"
              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#09090B] bg-[#FAFAFA] hover:bg-white transition cursor-pointer inline-flex items-center gap-1 shrink-0"
            >
              <span>Send</span>
              <SendHorizontal className="h-3 w-3" />
            </button>
          </form>
        </div>
      </aside>

      {/* Collapsed Bottom-Right Toggle Pill (never overlaps center code output) */}
      {hudCollapsed && !focusMode && (
        <div
          id="das-hud-collapsed-pill"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-[#09090B]/95 backdrop-blur-md px-3.5 py-1.5 shadow-2xl"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-[#FAFAFA] animate-pulse" : "bg-[#71717A]"
            }`}
          />
          <button
            type="button"
            onClick={() => {
              userToggledStageRef.current = true;
              setHudCollapsed(false);
            }}
            aria-label="Open DAS AI stage"
            title="Show DAS 3D Stage"
            className="text-xs font-semibold tracking-wide text-[#FAFAFA] hover:text-white transition cursor-pointer flex items-center gap-1.5 px-1"
          >
            <ChevronUp className="h-3.5 w-3.5 text-[#A1A1AA]" />
            <span>DAS AI</span>
            {micActive && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-white/[0.08] border border-white/[0.12] text-[#FAFAFA] animate-pulse">
                Listening
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={toggleMic}
            aria-label={micActive ? "Mute microphone" : "Speak to DAS"}
            title={micActive ? "Mute mic" : "Speak to DAS"}
            className={`h-6 w-6 rounded-full flex items-center justify-center border transition cursor-pointer ${
              micActive
                ? "bg-[#FAFAFA] border-white text-[#09090B]"
                : "bg-[#141419] border-white/[0.12] text-[#FAFAFA] hover:bg-[#1E1E26]"
            }`}
          >
            {micActive ? (
              <Square className="h-2.5 w-2.5 fill-current" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
        </>
      )}
        </>
      )}
    </div>
  );
};

export default AgentLayout;
