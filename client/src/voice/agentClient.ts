/**
 * Calls the voice-agent brain on the backend.
 * File: client/src/voice/agentClient.ts
 *
 *   const { getScreenPayload } = useScreenWatcher(activeTab);
 *   const reply = await askAgent({ message, getScreenPayload, userId, history, signal });
 *   speak(reply.spoken); showOnScreen(reply.display); runActions(reply.actions);
 */
import type { ScreenPayload } from "../hooks/useScreenWatcher";
import { loadMemory } from "./memory";

const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) || "https://pathfinder-backend-klrp.onrender.com").replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 15000; // Fail-fast to autonomous client brain on Vercel without waiting

export interface AgentAction {
  type: "navigate_to" | "highlight" | "scroll_to" | "open_panel";
  target: string;
}

export interface AgentReply {
  spoken: string;
  display: string;
  actions: AgentAction[];
  model?: string;
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export type AgentErrorKind = "timeout" | "rate_limit" | "server" | "network" | "cancelled";

export class AgentRequestError extends Error {
  constructor(public readonly kind: AgentErrorKind, message: string) {
    super(message);
    this.name = "AgentRequestError";
  }
}

export interface AskAgentArgs {
  message: string;
  getScreenPayload: () => ScreenPayload;
  userId?: string;
  history?: ChatTurn[];
  /** Pass your stopAll() AbortController signal so Stop cancels the request. */
  signal?: AbortSignal;
}

function authHeader(): Record<string, string> {
  try {
    const token = window.localStorage.getItem("pathfinder_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function askAgent({ message, getScreenPayload, userId, history = [], signal }: AskAgentArgs): Promise<AgentReply> {
  const screen = getScreenPayload();
  const memory = loadMemory(userId);

  let userEmail = "";
  try {
    const storedUser = window.localStorage.getItem("pathfinder_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      userEmail = parsed.email || parsed.username || "";
    }
  } catch {}

  const body = {
    message,
    screenContext: {
      activeTab: screen.activeTab,
      focusedWidget: screen.focusedWidget,
      userState: screen.userState,
    },
    userMemory: {
      lastVisit: memory.lastVisitTimestamp ? new Date(memory.lastVisitTimestamp).toISOString() : "",
      lastDiscussedTopic: memory.lastDiscussedTopic,
      studentName: memory.studentName,
      email: userEmail,
    },
    history: history.slice(-12),
  };

  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort);

  try {
    const res = await fetch(`${API_BASE}/api/agent/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 429) throw new AgentRequestError("rate_limit", "Too many requests. Please wait a moment.");
    if (!res.ok) throw new AgentRequestError("server", "The AI is busy right now. Please try again.");

    const data = (await res.json()) as AgentReply;
    return {
      spoken: String(data.spoken ?? ""),
      display: String(data.display ?? data.spoken ?? ""),
      actions: Array.isArray(data.actions) ? data.actions : [],
      model: data.model,
    };
  } catch (err) {
    if (err instanceof AgentRequestError) throw err;
    if ((err as Error)?.name === "AbortError") {
      if (timedOut) throw new AgentRequestError("timeout", "The server is waking up. Please try again in a few seconds.");
      throw new AgentRequestError("cancelled", "Cancelled");
    }
    throw new AgentRequestError("network", "Could not reach the server. Check your connection.");
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

export interface StreamAgentArgs {
  message: string;
  sessionId: string;
  pageContext?: {
    route?: string;
    activeTab?: string;
    visibleSectionIds?: string[];
  };
  language?: string;
  mode?: string;
  onToken?: (text: string) => void;
  onAction?: (action: any) => void;
  onToolResult?: (tool: string, result: any) => void;
  onSpoken?: (sentence: string) => void;
  onDisplay?: (markdown: string) => void;
  onDone?: (data: { runId: string; status: string; followups: string[] }) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

/**
 * Autonomous Multi-Step SSE Agent Stream:
 * Streams tokens, actions, tool results, spoken chunks, and full screen display markdown.
 * UI actions dispatched by the backend are automatically executed by actionDispatcher
 * and observations are posted back to resume the agent reasoning loop.
 */
export async function streamAgent({
  message,
  sessionId,
  pageContext,
  language = "auto",
  mode = "agent",
  onToken,
  onAction,
  onToolResult,
  onSpoken,
  onDisplay,
  onDone,
  onError,
  signal,
}: StreamAgentArgs): Promise<void> {
  const { uiRegistry } = await import("./uiRegistry");
  const { actionDispatcher } = await import("./actionDispatcher");

  const snapshot = uiRegistry.getRegistrySnapshot();
  const body = {
    message,
    sessionId,
    pageContext: {
      route: pageContext?.route || (typeof window !== "undefined" ? window.location.pathname : "/"),
      activeTab: pageContext?.activeTab || "overview",
      visibleSectionIds: pageContext?.visibleSectionIds || [],
      registrySnapshot: snapshot,
    },
    language,
    mode,
  };

  try {
    const res = await fetch(`${API_BASE}/api/agent/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      throw new Error(`SSE stream failed with HTTP ${res.status}`);
    }

    if (!res.body) {
      throw new Error("No response stream body available");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const ev of events) {
        if (!ev.trim()) continue;
        const lines = ev.split("\n");
        let eventType = "message";
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            eventData = line.slice(6).trim();
          }
        }

        try {
          const parsed = JSON.parse(eventData);
          if (eventType === "token" && onToken) {
            onToken(parsed.text || "");
          } else if (eventType === "action") {
            onAction?.(parsed);
            await actionDispatcher.executeUIAction(parsed);
          } else if (eventType === "tool_result" && onToolResult) {
            onToolResult(parsed.tool, parsed.result);
          } else if (eventType === "spoken" && onSpoken) {
            onSpoken(parsed.sentence || "");
          } else if (eventType === "display" && onDisplay) {
            onDisplay(parsed.markdown || "");
          } else if (eventType === "done" && onDone) {
            onDone(parsed);
          }
        } catch {}
      }
    }
  } catch (err: any) {
    if (signal?.aborted) return;
    onError?.(err);
    throw err;
  }
}

