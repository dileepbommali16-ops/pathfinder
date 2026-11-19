import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar3D } from "./Avatar3D";
import { dasSocket, UserHonorificRole } from "./agentSocket";
import { chromeBridge } from "./chromeBridge";
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
import { audioEngine, cameraEngine, speaker, MediaDeviceOption, LiveMotionMetrics } from "./audioIO";
import { CodeTaskPayload, tryExecuteClientAutomationIntent } from "./toolRunner";
import { API_BASE, getSessionId } from "@/lib/apiClient";
import { getCareerAgentResponse } from "@/lib/careerAgent";
import { getUserRole, getHonorificKey, setHonorificPreference, isOwnerAccount, HonorificKey } from "@/lib/auth";
import { toast } from "sonner";

function getInitialGreeting(roleKey: HonorificKey): string {
  void roleKey;
  return "DAS Ready — Say 'Hi' or ask anything.";
}

function isPureHiGreeting(text: string): boolean {
  return /^\s*(hi+|hello+|hey+|namaste|good\s*(morning|afternoon|evening)|yo|hola|sup|hai+|hlo+|namaskaram)(?:\s+(?:das|boss|bro|there|ai))?[\s!.,?]*$/i.test(
    (text || "").trim()
  );
}

function getExactHiReply(roleKey: HonorificKey, greetCount: number): string {
  if (greetCount <= 0) {
    if (roleKey === "madam") return "Hello Madam, what can I help you with today?";
    if (roleKey === "sir") return "Hello Sir, what can I help you with today?";
    return "Hi Boss! What's up?";
  }
  if (roleKey === "madam") return "Madam, I'm here.";
  if (roleKey === "sir") return "Sir, I'm here.";
  return "Boss, I'm here.";
}

export const AgentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // Authentication State: Check if user is logged into the main dashboard
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("logout") === "1") return false;
    if (params.get("username") || params.get("user") || params.get("demo") === "1") return true;
    return Boolean(localStorage.getItem("pathfinder_user"));
  });

  const [connected, setConnected] = useState(false);
  const [chromeBridgeReady, setChromeBridgeReady] = useState(false);
  const [desktopBridgeOnline, setDesktopBridgeOnline] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [role, setRole] = useState<UserHonorificRole>(() => getHonorificKey());
  const [inputText, setInputText] = useState("");
  const [transcript, setTranscript] = useState(() => getInitialGreeting(getHonorificKey()));
  const [userTranscript, setUserTranscript] = useState("");
  const [micSilentWarning, setMicSilentWarning] = useState(false);
  const [micHealthHint, setMicHealthHint] = useState("");
  const [activeMicLabel, setActiveMicLabel] = useState("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [mirrorCamera, setMirrorCamera] = useState(true);
  const [minimizedCamPreview, setMinimizedCamPreview] = useState(false);
  const [expandedCamPreview, setExpandedCamPreview] = useState(false);
  const [camMotion, setCamMotion] = useState<LiveMotionMetrics>({
    motionScore: 0,
    activeMotion: false,
    label: "Live Feed Clear",
    resolution: "640x360",
    fps: 2,
  });
  const [visionStatusNote, setVisionStatusNote] = useState("2.0 FPS Synced");
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
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
  const camBusyRef = useRef<boolean>(false);
  const speechRecRef = useRef<any>(null);
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

  // File / Media & Resume Upload State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [attachedType, setAttachedType] = useState<"image" | "video" | "resume" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      const cams = await cameraEngine.listVideoDevices();
      setVideoDevices(cams);
    } catch {}
  };

  useEffect(() => {
    const unsubBridge = chromeBridge.onStatusChange((isReady) => {
      setChromeBridgeReady(isReady);
    });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("workspace_connected") === "1") {
        setGmailConnected(true);
        toast.success("Gmail, Calendar & Sheets OAuth connected! DAS now has full Workspace access.");
        params.delete("workspace_connected");
        params.delete("workspace_email");
        const cleanQuery = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);
      }
    }
    return () => {
      unsubBridge();
    };
  }, []);

  const refreshDesktopBridgeStatus = async () => {
    if (typeof window === "undefined") return false;
    const email = (localStorage.getItem("userEmail") || "").trim();
    if (!email || !isOwnerAccount(email)) {
      setDesktopBridgeOnline(false);
      return false;
    }
    try {
      const r = await fetch(`${API_BASE}/api/bridge/status?email=${encodeURIComponent(email)}`, {
        cache: "no-store",
      });
      if (!r.ok) return false;
      const data = await r.json();
      const online = Boolean(data?.connected);
      setDesktopBridgeOnline(online);
      return online;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const email = (typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "").trim();
    if (!email) return;
    fetch(`${API_BASE}/api/google/workspace/status?email=${encodeURIComponent(email)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.connected === "boolean") {
          setGmailConnected(Boolean(data.connected));
        }
      })
      .catch(() => {});

    if (isOwnerAccount(email)) {
      void refreshDesktopBridgeStatus();
      const intervalId = window.setInterval(() => {
        void refreshDesktopBridgeStatus();
      }, 20000);
      return () => window.clearInterval(intervalId);
    }
  }, [isAuthenticated, connected]);

  useEffect(() => {
    refreshMediaDevices();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) return;
    const onDeviceChange = () => {
      refreshMediaDevices();
      audioEngine.autoSyncOutputDevice();
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
    const unsubVision = dasSocket.onVisionTelemetry((telemetry) => {
      if (telemetry?.status === "inspected") {
        const tag =
          telemetry.reason === "dance_or_motion"
            ? "Motion Seen"
            : telemetry.focus
              ? `Inspected: ${telemetry.focus}`
              : "AI Frame Synced";
        setVisionStatusNote(tag);
      }
    });
    return () => {
      window.removeEventListener("das:page-context", onPageContext);
      window.removeEventListener("click", onGlobalClick, true);
      unsubVision();
    };
  }, [isAuthenticated, connected]);

  // Strictly NEVER speak automatically on website entry / login — wait until user says 'Hi' or speaks/types!
  useEffect(() => {
    if (cameraActive && cameraPreviewRef.current) {
      cameraEngine.attachPreviewElement(cameraPreviewRef.current);
    }
  }, [cameraActive]);

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
          cgpa: parsedProfile.cgpa ?? 7.8,
          backlogs: parsedProfile.backlogs ?? parsedProfile.activeBacklogs ?? 0,
          internships: parsedProfile.internships ?? 1,
          communication: parsedProfile.communication ?? 6,
          coding: parsedProfile.coding ?? 6,
          target_role: parsedProfile.targetRole ?? "Software Engineer",
          target_tier: parsedProfile.targetTier ?? "Product",
          branch: parsedProfile.branch ?? "CSE",
        },
        active_tab: ctx.activeTab || "overview",
        camera_active: Boolean(cameraEngine.isStreaming),
        live_frame_base64: cameraEngine.isStreaming ? cameraEngine.getLatestFrameBase64() : null,
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

      const endpoints = dasSocket.isSocketConnected
        ? [
            { url: `${API_BASE}/api/chat`, timeoutMs: 6500 },
            ...(canUseSameOriginEdge ? [{ url: "/api/edge-chat", timeoutMs: 7500 }] : []),
          ]
        : [
            ...(canUseSameOriginEdge ? [{ url: "/api/edge-chat", timeoutMs: 7500 }] : []),
            { url: `${API_BASE}/api/chat`, timeoutMs: 6500 },
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
      prev === "Hello Sir, what can I help you with today?" ||
      prev === "Hello Madam, what can I help you with today?" ||
      prev === "Hi Boss! What's up?"
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

    // Strict deterministic "Hi" rule: 1st time -> "Hi Boss! What's up?", 2nd+ time -> "Boss, I'm here."
    if (mode === "chat" && isPureHiGreeting(queryText)) {
      const activeKey = getHonorificKey();
      const exactHi = getExactHiReply(activeKey, hiGreetCountRef.current);
      hiGreetCountRef.current += 1;
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
      if (
        !settled &&
        askCoachNonceRef.current === nonce &&
        replyText &&
        !dasSocket.isAgentSpeaking &&
        !audioEngine.isSpeaking()
      ) {
        cleanup();
        chatHistoryRef.current = [
          ...chatHistoryRef.current,
          { role: "assistant" as const, content: replyText },
        ].slice(-12);
        setTranscript(replyText);
        restTtsAbortRef.current?.abort();
        const ttsAc = new AbortController();
        restTtsAbortRef.current = ttsAc;
        void audioEngine.speakTextPuckOrLocal(replyText, API_BASE, {
          signal: ttsAc.signal,
          shouldContinue: () =>
            askCoachNonceRef.current === nonce &&
            !dasSocket.isAgentSpeaking &&
            !audioEngine.isSpeaking(),
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
    const fallbackDelayMs = wasSocketReady ? 6000 : 1600;
    timerId = window.setTimeout(() => {
      if (
        settled ||
        askCoachNonceRef.current !== nonce ||
        dasSocket.isAgentSpeaking ||
        audioEngine.isSpeaking()
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
      const trackLabel = detail.track === "defense" ? "Project Defense Prompt" : "Interviewer Question";
      setUserTranscript(`🎤 ${trackLabel}`);
      setTranscript(question);
    };

    window.addEventListener("das-ask-coach", onAskCoach);
    window.addEventListener("das-interviewer-prompt", onInterviewerPrompt);
    return () => {
      window.removeEventListener("das-ask-coach", onAskCoach);
      window.removeEventListener("das-interviewer-prompt", onInterviewerPrompt);
      askCoachUnbindRef.current?.();
      askCoachUnbindRef.current = null;
      restTtsAbortRef.current?.abort();
      restTtsAbortRef.current = null;
    };
  }, [isAuthenticated]);

  // Connect to Gemini Live multimodal agent ONLY when authenticated inside the dashboard
  // Keep `role` OUT of dependencies so toggling Boss/Sir/Madam never disconnects WS or stops camera!
  useEffect(() => {
    if (!isAuthenticated) {
      dasSocket.setCameraActive(false);
      dasSocket.disconnect();
      cameraEngine.stopCameraCapture();
      setCameraActive(false);
      setMicActive(false);
      return;
    }

    // Wake Render backend proactively for returning sessions that bypass the login screen
    fetch(`${API_BASE}/api/health`, { cache: "no-store" }).catch(() => {});
    ensureSocketConnected();

    const prewarmAudio = () => {
      audioEngine.unlockAudio();
    };
    window.addEventListener("pointerdown", prewarmAudio, { once: true, passive: true });
    window.addEventListener("keydown", prewarmAudio, { once: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", prewarmAudio);
      window.removeEventListener("keydown", prewarmAudio);
      dasSocket.setCameraActive(false);
      dasSocket.disconnect();
      cameraEngine.stopCameraCapture();
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
      onSpeechIdle: () => dasSocket.sendAudioStreamEnd(),
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
    if (cameraEngine.isStreaming) {
      const snap = cameraEngine.getLatestFrameBase64();
      if (snap) dasSocket.sendVideoFrame(snap);
    }
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
          setUserTranscript(cleanSpoken);
          const curCtx =
            (typeof window !== "undefined" && (window as any).__DAS_PAGE_CONTEXT__) || {};
          if (isPureHiGreeting(cleanSpoken)) {
            dispatchTurnRef.current(cleanSpoken, curCtx, "chat");
          } else {
            const nonceBefore = askCoachNonceRef.current;
            window.setTimeout(() => {
              if (
                askCoachNonceRef.current === nonceBefore &&
                !dasSocket.isAgentSpeaking &&
                !audioEngine.isSpeaking()
              ) {
                dispatchTurnRef.current(cleanSpoken, curCtx, "chat");
              }
            }, 950);
          }
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
          startParallelSpeechRec();
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

  const startCameraFeed = async (deviceId?: string) => {
    setVisionStatusNote("2.0 FPS Synced");
    return cameraEngine.startCameraCapture(
      (b64Jpeg) => {
        dasSocket.sendVideoFrame(b64Jpeg);
      },
      2.0,
      {
        deviceId: deviceId || undefined,
        previewEl: cameraPreviewRef.current,
        onFirstFrame: () => {
          dasSocket.setCameraActive(true);
          dasSocket.sendVisionGreet();
        },
        onSceneChanged: (hdB64, meta) => {
          setVisionStatusNote(
            meta?.reason === "dance_or_motion"
              ? `Motion React (${meta.motionScore}%)`
              : "Scene Updated"
          );
          dasSocket.sendAutoVisionCheck(hdB64, meta);
        },
        onMotionMetrics: (metrics) => {
          setCamMotion(metrics);
        },
        shouldPauseMonitor: () =>
          dasSocket.isAgentSpeaking || dasSocket.isAwaitingResponse || audioEngine.isSpeaking(),
      }
    );
  };

  const toggleCamera = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget?.blur();
    if (camBusyRef.current) return;
    camBusyRef.current = true;
    try {
      audioEngine.unlockAudio();
      void audioEngine.autoSyncOutputDevice();

      if (!cameraActive) {
        ensureSocketConnected();
        dasSocket.warmup();
        setMinimizedCamPreview(false);
        dasSocket.setCameraActive(true);

        const started = await startCameraFeed(selectedCameraId);
        if (started) {
          dasSocket.setCameraActive(true);
          setCameraActive(true);
          await refreshMediaDevices();
          toast.success("24/7 HD Vision active! Show yourself, outfit, or 3+ objects to DAS!");
        } else {
          dasSocket.setCameraActive(false);
          setTranscript("Camera access was denied or is unavailable.");
          toast.error("Please allow Camera permission in browser settings.");
        }
      } else {
        dasSocket.setCameraActive(false);
        cameraEngine.stopCameraCapture();
        setCameraActive(false);
        setExpandedCamPreview(false);
        setVisionStatusNote("Camera Paused");
        toast.info("Camera paused.");
      }
    } finally {
      camBusyRef.current = false;
    }
  };

  const handleCameraDeviceChange = async (newDeviceId: string) => {
    setSelectedCameraId(newDeviceId);
    if (cameraActive) {
      const started = await startCameraFeed(newDeviceId);
      if (started) toast.success("Switched camera feed!");
    }
  };

  const handleRoleToggle = (newRole: UserHonorificRole) => {
    audioEngine.unlockAudio();
    audioEngine.autoSyncOutputDevice();
    setHonorificPreference(newRole === "boss" ? "Boss" : newRole === "madam" ? "Madam" : "Sir");
    setRole(newRole);
    dasSocket.switchRole(newRole);
    setTranscript(getInitialGreeting(newRole));
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    audioEngine.notifyTypingActivity(1200);
    audioEngine.unlockAudio();
    const commandText = inputText.trim() || (attachedFile ? `Look at this attached ${attachedType || "file"}: ${attachedFile.name}` : "");
    setUserTranscript(commandText);
    setTranscript("Thinking & Executing...");
    setInputText("");

    if (attachedFile && attachedType === "image" && attachedPreview) {
      const commaIdx = attachedPreview.indexOf(",");
      if (commaIdx !== -1) {
        const b64 = attachedPreview.substring(commaIdx + 1);
        dasSocket.sendVideoFrame(b64);
      }
    }

    const curCtx =
      (typeof window !== "undefined" && (window as any).__DAS_PAGE_CONTEXT__) || {};
    dispatchTurnWithVoiceFallback(commandText, curCtx, "chat");
  };

  // Handle Media & Resume File Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType.startsWith("image/")) {
      setAttachedType("image");
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setAttachedPreview(result);
        const commaIdx = result.indexOf(",");
        if (commaIdx !== -1) {
          const b64 = result.substring(commaIdx + 1);
          dasSocket.sendVideoFrame(b64);
        }
      };
      reader.readAsDataURL(file);
      toast.success(`Photo attached: ${file.name}. DAS can now inspect it!`);
    } else if (
      fileType.startsWith("video/") ||
      fileName.endsWith(".mp4") ||
      fileName.endsWith(".webm") ||
      fileName.endsWith(".mov")
    ) {
      setAttachedType("video");
      const url = URL.createObjectURL(file);
      setAttachedPreview(url);
      toast.success(`Video attached: ${file.name}`);
    } else {
      // Resume / PDF / DOCX
      setAttachedType("resume");
      setAttachedPreview(null);
      toast.success(`Resume attached: ${file.name}! Opening ATS Resume Studio...`);
      window.dispatchEvent(new CustomEvent("das-navigate", { detail: { tab: "resume" } }));
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setAttachedPreview(null);
    setAttachedType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        compilerUrl: spec.programizUrl,
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

  // 1. Keep outer wrapper + <main>{children}</main> identical across auth transitions so Home never unmounts mid-login
  const hasUser = typeof window !== "undefined" && Boolean(localStorage.getItem("pathfinder_user"));
  const showAgent = isAuthenticated || hasUser;

  return (
    <div className={showAgent ? "relative min-h-screen bg-transparent text-white overflow-x-hidden" : "relative min-h-screen bg-transparent"}>
      {/* Background 3D Robot Face */}
      {showAgent && <Avatar3D />}

      {/* Main Dashboard Content */}
      <main className={showAgent ? "relative z-10 pb-56 sm:pb-44 bg-transparent" : "relative min-h-screen bg-transparent"}>{children}</main>

      {showAgent && (
        <>
      {/* Hidden File Input for Photos, Videos, and Resumes */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        accept="image/*,video/*,.pdf,.docx,.txt"
        className="hidden"
      />

      {/* DAS Live Multi-Language Code & Compiler Studio Drawer */}
      {codeTask && (
        <div className="fixed top-16 left-2 right-2 sm:left-auto sm:top-20 sm:right-6 z-50 sm:w-[94%] max-w-2xl max-h-[82vh] overflow-y-auto bg-[#000000]/95 border border-[#050606] rounded-2xl shadow-2xl p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#050606] pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <select
                value={normalizeLanguage(codeTask.language)}
                onChange={(e) => {
                  const nextLang = normalizeLanguage(e.target.value);
                  void codingStudioController.execute({
                    action: "switch_language",
                    language: nextLang,
                  });
                }}
                aria-label="Select Programming Language"
                className="text-xs font-bold uppercase px-2.5 py-1 rounded-lg bg-[#050606] border border-[#050606] text-[#050606] focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id} className="bg-[#000000] text-[#050606]">
                    {lang.label}
                  </option>
                ))}
              </select>
              <span className="font-bold text-[#050606] text-sm truncate max-w-[200px]">
                {codeTask.title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#050606] text-[#050606] font-mono">
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
                className="px-2.5 py-1 bg-[#050606] hover:brightness-110 border border-[#050606] rounded-lg text-xs text-[#050606] transition cursor-pointer"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => {
                  void codingStudioController.execute({ action: "delete_code" });
                }}
                className="px-2.5 py-1 bg-[#000000] hover:bg-[#050606] border border-[#050606] rounded-lg text-xs text-[#050606] transition cursor-pointer"
                title="Clear / Delete All Code"
              >
                🗑 Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCodeLive();
                  setCodeTask(null);
                  setTranscript(`Okay ${getUserRole()}, returned to your dashboard.`);
                }}
                className="px-2.5 py-1 bg-[#050606] hover:brightness-110 rounded-lg text-xs text-[#050606] font-bold transition cursor-pointer"
                title="Close Compiler Studio"
              >
                ✕
              </button>
            </div>
          </div>

          {codeTask.explanation && (
            <div className="bg-[#000000] border border-[#050606] rounded-xl p-3 text-xs text-[#050606] whitespace-pre-wrap max-h-36 overflow-y-auto">
              <span className="font-bold text-[#050606] block mb-1">💡 Logic, Structure & Walkthrough:</span>
              {codeTask.explanation}
            </div>
          )}

          <textarea
            value={editableCode}
            onChange={(e) => {
              editableCodeRef.current = e.target.value;
              setEditableCode(e.target.value);
            }}
            rows={10}
            spellCheck={false}
            className="w-full bg-[#000000] border border-[#050606] rounded-xl p-3 font-mono text-xs text-[#050606] focus:outline-none focus:border-[#050606] selection:bg-[#050606]"
          />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={stdinInput}
              onChange={(e) => {
                stdinInputRef.current = e.target.value;
                setStdinInput(e.target.value);
              }}
              placeholder="Optional program input (stdin)..."
              className="flex-1 bg-[#000000] border border-[#050606] rounded-lg px-3 py-1.5 text-xs text-[#050606] focus:outline-none focus:border-[#050606]"
            />
            {isRunningCode && (
              <button
                type="button"
                onClick={stopCodeLive}
                className="px-3.5 py-1.5 bg-[#050606] hover:brightness-110 text-[#050606] font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 border border-[#050606]"
              >
                ⏹ Stop
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void runCodeLive();
              }}
              disabled={isRunningCode}
              className="px-4 py-1.5 text-[#050606] font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 border shadow-lg hover:brightness-110"
              style={{
                backgroundColor: "#050606",
                borderColor: "#050606",
              }}
            >
              {isRunningCode ? "Running..." : "▶ Run Code"}
            </button>
          </div>

          <div className="bg-[#000000] border border-[#050606] rounded-xl p-3 font-mono text-xs text-[#050606] max-h-40 overflow-y-auto whitespace-pre-wrap">
            {compileOutput || "Output terminal ready. Click ▶ Run Code or tell DAS to run."}
          </div>
        </div>
      )}

      {/* Live HD Camera Preview & Real-Time Motion/Vision Visualizer Card */}
      {cameraActive && (
        <div
          className={`fixed bottom-52 sm:bottom-44 left-2 sm:left-6 z-40 rounded-2xl overflow-hidden border shadow-2xl transition-all ${
            minimizedCamPreview
              ? "w-40 sm:w-44"
              : expandedCamPreview
                ? "w-72 sm:w-96"
                : "w-44 sm:w-60"
          }`}
          style={{
            backgroundColor: "#000000",
            borderColor: "#050606",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.85)",
          }}
        >
          <div className={`relative w-full bg-[#000000] ${minimizedCamPreview ? "h-8" : "aspect-video"}`}>
            <video
              ref={cameraPreviewRef}
              muted
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${mirrorCamera ? "-scale-x-100" : ""} ${
                minimizedCamPreview ? "opacity-25" : ""
              }`}
            />
            <div
              className="absolute top-1.5 left-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#050606] border"
              style={{ backgroundColor: "rgba(0,0,0,0.82)", borderColor: "#050606" }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-[#050606]" />
              <span>24/7 VISION</span>
            </div>
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
              {!minimizedCamPreview && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setExpandedCamPreview((v) => !v);
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#000000]/80 text-[10px] text-[#050606] border border-[#050606] cursor-pointer"
                    title={expandedCamPreview ? "Compact Camera View" : "Larger Real View"}
                    aria-label={expandedCamPreview ? "Shrink camera preview" : "Expand camera preview"}
                  >
                    {expandedCamPreview ? "↙" : "⤢"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setMirrorCamera((v) => !v);
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#000000]/80 text-[10px] text-[#050606] border border-[#050606] cursor-pointer"
                    title="Mirror / Flip Preview"
                    aria-label="Mirror camera preview"
                  >
                    ⇄
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setMinimizedCamPreview((v) => !v);
                }}
                className="px-1.5 py-0.5 rounded bg-[#000000]/80 text-[10px] text-[#050606] border border-[#050606] cursor-pointer"
                title={minimizedCamPreview ? "Expand Camera Preview" : "Minimize Camera Preview"}
                aria-label={minimizedCamPreview ? "Expand camera preview" : "Minimize camera preview"}
              >
                {minimizedCamPreview ? "▢" : "–"}
              </button>
            </div>
          </div>

          {/* Live Motion & AI Perception Visualizer Strip */}
          {!minimizedCamPreview && (
            <div className="px-2.5 py-1.5 border-t border-[#050606] bg-[#000000] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#050606] font-semibold">
                  {camMotion.label}
                </span>
                <span className="text-[#050606] font-mono">{visionStatusNote}</span>
              </div>
              <div className="flex items-end gap-0.5 h-3" aria-label="Live motion visualizer">
                {[0.25, 0.45, 0.7, 1.0, 0.85, 0.6, 0.4, 0.2].map((w, idx) => {
                  const pct = Math.max(18, Math.min(100, Math.round(camMotion.motionScore * w + (camMotion.activeMotion ? 18 : 8))));
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-sm transition-all duration-150 bg-[#050606]"
                      style={{ height: `${pct}%` }}
                    />
                  );
                })}
              </div>
            </div>
          )}
          {!minimizedCamPreview && videoDevices.length > 1 && (
            <div className="px-2 py-1.5 border-t border-[#050606] bg-[#000000]">
              <select
                value={selectedCameraId}
                onChange={(e) => handleCameraDeviceChange(e.target.value)}
                aria-label="Select Camera"
                className="w-full rounded bg-[#000000] border border-[#050606] text-[10px] text-[#050606] px-1.5 py-1 focus:outline-none"
              >
                <option value="">Default Camera</option>
                {videoDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Bottom Center DAS HUD — Responsive across Phone, Tablet, Laptop & MacBook */}
      <div
        id="das-bottom-hud"
        className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[96%] sm:w-[92%] max-w-3xl rounded-2xl p-2 sm:p-3 shadow-2xl flex flex-col gap-1.5 sm:gap-2 border"
        style={{
          backgroundColor: "#000000",
          borderColor: "#050606",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.92)"
        }}
      >
        {/* Top Status & Role Select Bar */}
        <div className="flex items-center justify-between text-xs px-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#050606]" />
            <span className="font-bold tracking-wider text-[#050606]">DAS AI</span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-semibold border text-[#050606]"
              style={{ backgroundColor: "#050606", borderColor: "#050606" }}
            >
              {connected ? "ONLINE" : "CONNECTING..."}
            </span>
            {isOwnerAccount(typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "") && (
              <button
                type="button"
                onClick={async () => {
                  const live = await refreshDesktopBridgeStatus();
                  if (live) {
                    toast.success("Laptop Desktop Bridge LIVE — Real Chrome, Real Gmail & VS Code ready from Phone & Laptop!");
                  } else {
                    toast.info("Run desktop-agent\\start_bridge.bat on your laptop to connect Real Chrome, Real Gmail & VS Code.");
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border text-[#050606] transition cursor-pointer hover:brightness-110"
                style={{
                  backgroundColor: "#050606",
                  borderColor: "#050606",
                }}
                title={
                  desktopBridgeOnline
                    ? "Laptop Desktop Bridge Online (Real Chrome + Real Gmail + VS Code)"
                    : "Click to check status — run desktop-agent\\start_bridge.bat on laptop"
                }
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "#050606" }}
                />
                <span>{desktopBridgeOnline ? "💻 Bridge Live" : "💻 Bridge Off"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                chromeBridge.ping();
                if (chromeBridgeReady) {
                  toast.success("DAS Chrome Automation Bridge active — Programiz, Google & Tab control ready!");
                } else {
                  toast.info("Open chrome://extensions -> Developer mode ON -> Load unpacked -> select 'das-chrome-extension' folder, then refresh this tab.");
                }
              }}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border text-[#050606] transition cursor-pointer hover:brightness-110"
              style={{ backgroundColor: "#050606", borderColor: "#050606" }}
              title={
                chromeBridgeReady
                  ? "Real Chrome Automation Extension Connected"
                  : "Click for 30-sec Chrome Extension setup steps"
              }
            >
              <span>⚡</span>
              <span>{chromeBridgeReady ? "Chrome Live" : "Chrome Bridge"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (codeTask) {
                  void codingStudioController.execute({ action: "close" });
                } else {
                  void codingStudioController.execute({ action: "open", language: "c" });
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border text-[#050606] transition cursor-pointer hover:brightness-110"
              style={{ backgroundColor: "#050606", borderColor: "#050606" }}
              title="Open Multi-Language Live Coding Studio (C, C++, Python, Java, JS, TS, SQL, Go, Rust)"
            >
              <span>&lt;/&gt;</span>
              <span>Code</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!gmailConnected) {
                  const origin =
                    typeof window !== "undefined"
                      ? window.location.origin
                      : "https://pathfinder-client-fzom.vercel.app";
                  window.location.href = `${API_BASE}/api/auth/google/workspace/start?origin=${encodeURIComponent(origin)}`;
                  return;
                }
                const res = await chromeBridge.openGmailVisualTab({ view: "inbox" });
                if (res?.ok) {
                  toast.success("Opened your real Gmail (mail.google.com) directly!");
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border text-[#050606] transition cursor-pointer hover:brightness-110"
              style={{ backgroundColor: "#050606", borderColor: "#050606" }}
              title={
                gmailConnected
                  ? "Open your REAL Gmail (mail.google.com) directly"
                  : "Connect Gmail, Contacts & Calendar OAuth in 1 click"
              }
            >
              <span>✉️</span>
              <span>{gmailConnected ? "Gmail Live" : "Connect Gmail"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Single Unified Role Pill */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                const storedEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
                const canBeBoss = isOwnerAccount(storedEmail);
                const nextRole: UserHonorificRole = canBeBoss
                  ? (role === "boss" ? "sir" : role === "sir" ? "madam" : "boss")
                  : (role === "sir" ? "madam" : "sir");
                handleRoleToggle(nextRole);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition cursor-pointer border shadow-sm hover:brightness-110 active:scale-95 text-[#050606]"
              style={{
                backgroundColor: "#050606",
                borderColor: "#050606",
              }}
              title={
                isOwnerAccount(typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "")
                  ? "Click to switch identity mode: Boss Mode / Sir Mode / Madam Mode"
                  : "Click to switch addressing mode: Sir Mode / Madam Mode"
              }
            >
              <span>
                {role === "boss"
                  ? "✨ Boss Mode"
                  : role === "sir"
                  ? "🎩 Sir Mode"
                  : "🌸 Madam Mode"}
              </span>
              <span className="text-[10px] text-[#050606]">⇄</span>
            </button>
          </div>
        </div>

        {/* User Voice / Input Transcript */}
        {userTranscript && (
          <div
            className="text-xs text-[#050606] rounded-xl px-3 py-1.5 max-h-16 overflow-y-auto das-scrollbar whitespace-pre-wrap leading-relaxed border"
            style={{ backgroundColor: "#050606", borderColor: "#050606" }}
          >
            🎤 You: {userTranscript}
          </div>
        )}

        {/* Agent Spoken Response Transcript */}
        <div
          className="text-sm text-[#050606] rounded-xl px-3 py-2 max-h-24 overflow-y-auto das-scrollbar whitespace-pre-wrap leading-relaxed border"
          style={{ backgroundColor: "#050606", borderColor: "#050606" }}
        >
          🔊 DAS: {transcript}
        </div>

        {/* Attached Media / Resume Pill Preview */}
        {attachedFile && (
          <div
            className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs border"
            style={{ backgroundColor: "#050606", borderColor: "#050606" }}
          >
            <div className="flex items-center gap-2 truncate">
              <span>{attachedType === "image" ? "🖼️" : attachedType === "video" ? "🎬" : "📄"}</span>
              <span className="font-semibold text-[#050606] truncate max-w-xs">{attachedFile.name}</span>
              <span className="text-[10px] text-[#050606]">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
            </div>
            <div className="flex items-center gap-2">
              {attachedType === "resume" && (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("das-navigate", { detail: { tab: "resume" } }))}
                  className="px-2 py-0.5 bg-[#000000] hover:bg-[#050606] text-[#050606] rounded text-[10px] font-bold border border-[#050606]"
                >
                  Open ATS Studio
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-[#050606] hover:text-[#050606]"
                title="Change File"
              >
                ✏️ Change
              </button>
              <button
                type="button"
                onClick={removeAttachment}
                className="text-xs text-[#050606] hover:text-[#050606] font-bold ml-1"
                title="Remove File"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Live Microphone Signal & Warning Bar */}
        {micActive && (
          <div
            className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs border"
            style={{
              backgroundColor: "#050606",
              borderColor: "#050606",
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-bold text-[#050606] shrink-0">
                {micSilentWarning ? "⚠️ NO MIC SIGNAL" : "🎙️ MIC LIVE"}
              </span>
              <div className="w-24 h-2 rounded-full bg-[#000000] overflow-hidden shrink-0">
                <div
                  ref={micBarRef}
                  className="h-full bg-[#050606] transition-[width] duration-75"
                  style={{ width: "4%" }}
                />
              </div>
              <span className="text-[10px] text-[#050606] truncate">
                {micSilentWarning
                  ? micHealthHint || "Voice faint or muted — raise volume or check earphones/buds (auto-tuning...)"
                  : activeMicLabel || "Capturing 16kHz PCM"}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleMic}
              className="text-[11px] text-[#050606] hover:text-[#050606] font-bold ml-2 cursor-pointer shrink-0"
            >
              Mute
            </button>
          </div>
        )}

        {/* Live Camera Active Status Badge */}
        {cameraActive && (
          <div
            className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs border"
            style={{ backgroundColor: "#050606", borderColor: "#050606" }}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="h-2 w-2 rounded-full bg-[#050606] animate-pulse" />
              <span className="font-bold text-[#050606]">● 24/7 LIVE CAMERA</span>
              <span className="text-[10px] text-[#050606] truncate">
                (Auto-monitoring face, outfit & multi-objects continuously)
              </span>
            </div>
            <button
              type="button"
              onClick={toggleCamera}
              className="text-[11px] text-[#050606] hover:text-[#050606] font-bold ml-2 cursor-pointer shrink-0"
            >
              Stop Cam
            </button>
          </div>
        )}

        {/* Command & Control Bar */}
        <form onSubmit={handleSendText} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2">
          {/* Hands-free Voice Speak / Mute Button */}
          <button
            type="button"
            onClick={toggleMic}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 border text-[#050606] hover:brightness-110 shrink-0"
            style={{
              backgroundColor: micActive ? "#000000" : "#050606",
              borderColor: "#050606",
            }}
            title={micActive ? "Click to Mute Microphone" : "Click to Speak (Supports all Headphones, Earphones & Buds)"}
          >
            {micActive ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#050606] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#050606]"></span>
                </span>
                <span>Listening...</span>
              </>
            ) : (
              <span>🎙️ Speak</span>
            )}
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={toggleCamera}
            className="px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 border text-[#050606] hover:brightness-110 shrink-0"
            style={{
              backgroundColor: cameraActive ? "#050606" : "#000000",
              borderColor: "#050606",
            }}
            title="Toggle Camera (Live Video Streaming to DAS)"
          >
            {cameraActive ? "📹 On" : "📷 Cam"}
          </button>

          {/* Media / Resume Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 border text-[#050606] hover:brightness-110 shrink-0"
            style={{ backgroundColor: "#000000", borderColor: "#050606" }}
            title="Upload Photo, Video, or Resume for Instant Review"
          >
            📎
          </button>

          {/* Input Text Box */}
          <input
            id="das-command-input"
            name="dasCommand"
            type="text"
            value={inputText}
            onChange={(e) => {
              audioEngine.notifyTypingActivity(850);
              setInputText(e.target.value);
            }}
            placeholder="Ask DAS: 'Who is your boss?', 'Write QuickSort in C', 'Look at my hands'..."
            className="min-w-[140px] flex-1 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-[#050606] placeholder-[#050606] focus:outline-none border"
            style={{ backgroundColor: "#050606", borderColor: "#050606" }}
          />

          {/* Dedicated Edit Option Beside Send */}
          <button
            type="button"
            onClick={() => {
              if (userTranscript) {
                const cleaned = userTranscript.replace(/^🎤 You:\s*/i, "").trim();
                setInputText(cleaned);
                toast.info("Previous command loaded for editing!");
              }
              const inputEl = document.getElementById("das-command-input") as HTMLInputElement;
              inputEl?.focus();
              inputEl?.select();
            }}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow flex items-center gap-1 hover:brightness-110 text-[#050606] shrink-0"
            style={{
              backgroundColor: "#000000",
              borderColor: "#050606",
            }}
            title="Edit / Recall Previous Query"
          >
            ✏️ Edit
          </button>

          {/* Send Button */}
          <button
            type="submit"
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#050606] transition cursor-pointer border shadow hover:brightness-110 shrink-0"
            style={{
              backgroundColor: "#050606",
              borderColor: "#050606",
            }}
          >
            Send
          </button>
        </form>
      </div>
        </>
      )}
    </div>
  );
};

export default AgentLayout;
