/**
 * Client for the Pathfinder agent (POST /api/agent/chat).
 * File: client/src/voice/agentClient.ts
 *
 *   const { getScreenPayload } = useScreenWatcher(activeTab);
 *   const reply = await askAgent({ message, getScreenPayload, userId, history, signal });
 *   speak(reply.spoken); showOnScreen(reply.display); runActions(reply.actions, handlers);
 *
 * The server is stateless, so tutor progress travels in agentState: askAgent loads it from
 * sessionStorage and saves the new one that comes back.
 */
import type { ScreenPayload } from "../hooks/useScreenWatcher";
import { loadMemory } from "./memory";

const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) || "https://pathfinder-1-xhme.onrender.com").replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 60_000; // Render free tier can take 30-60 s to wake up
const STATE_KEY = "das.agentState.v1";

export type AgentAction =
  | { type: "navigate_to"; target: string }
  | { type: "highlight"; target: string }
  | { type: "scroll_to"; target: string }
  | { type: "propose_profile_change"; field: string; value: string };

export interface AgentState {
  tutor?: { project_id: string; step: number };
}

export interface AgentReply {
  spoken: string;
  display: string;
  actions: AgentAction[];
  followups: string[];
  agentState: AgentState;
  mode?: "agent" | "simple";
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

export function loadAgentState(): AgentState {
  try {
    const raw = window.sessionStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as AgentState) : {};
  } catch {
    return {};
  }
}

export function saveAgentState(state: AgentState): void {
  try {
    window.sessionStorage.setItem(STATE_KEY, JSON.stringify(state ?? {}));
  } catch {
    /* storage blocked: the agent still works, it just forgets the step on refresh */
  }
}

export function clearAgentState(): void {
  try {
    window.sessionStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
}

export interface AskAgentArgs {
  message: string;
  getScreenPayload: () => ScreenPayload;
  userId?: string;
  history?: ChatTurn[];
  /** Only used by the server when the student is not signed in (demo/guest mode). */
  profile?: Record<string, unknown>;
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

export async function askAgent({ message, getScreenPayload, userId, history = [], profile, signal }: AskAgentArgs): Promise<AgentReply> {
  const screen = getScreenPayload();
  const memory = loadMemory(userId);

  const body = {
    message,
    screenContext: { activeTab: screen.activeTab, focusedWidget: screen.focusedWidget, userState: screen.userState },
    userMemory: {
      lastVisit: memory.lastVisitTimestamp ? new Date(memory.lastVisitTimestamp).toISOString() : "",
      lastDiscussedTopic: memory.lastDiscussedTopic,
      studentName: memory.studentName,
    },
    history: history.slice(-12),
    agentState: loadAgentState(),
    profile: profile ?? {},
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
    const res = await fetch(`${API_BASE}/api/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 429) throw new AgentRequestError("rate_limit", "Too many requests, or today's AI quota is used up. Please try again later.");
    if (!res.ok) throw new AgentRequestError("server", "The AI is busy right now. Please try again.");

    const data = (await res.json()) as Partial<AgentReply>;
    const reply: AgentReply = {
      spoken: String(data.spoken ?? ""),
      display: String(data.display ?? data.spoken ?? ""),
      actions: Array.isArray(data.actions) ? (data.actions as AgentAction[]) : [],
      followups: Array.isArray(data.followups) ? data.followups.map(String).slice(0, 3) : [],
      agentState: data.agentState && typeof data.agentState === "object" ? data.agentState : {},
      mode: data.mode,
      model: data.model,
    };
    saveAgentState(reply.agentState);
    return reply;
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