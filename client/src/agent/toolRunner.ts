/**
 * toolRunner.ts - Website DOM Tool Executor + Real-Time Groq -> ElevenLabs Streaming Pipeline
 *
 * TASK 2 (Streaming Pipeline):
 * - Streams tokens from Groq LPU (`stream: true`) via Server-Sent Events (SSE).
 * - Does NOT wait for the full Groq response: as soon as Groq streams the first speakable
 *   chunk/clause, it is immediately dispatched to ElevenLabs (`/stream?optimize_streaming_latency=3`).
 * - Tracks and emits explicit pipeline state transitions: `listening` -> `thinking` -> `speaking`.
 */

import { speaker as globalSpeaker } from "./audioIO";
import { askDas } from "./careerAgent";

export type VoicePipelineStage = "idle" | "listening" | "thinking" | "speaking";

/**
 * Dispatches speakable text buffer directly to ElevenLabs streaming synthesizer
 */
export async function elevenLabsStream(text: string): Promise<void> {
  if (!text || !text.trim()) return;
  globalSpeaker.streamChunk(text.trim());
}

/**
 * Real-time Groq Streaming + ElevenLabs Streaming Pipeline:
 * Dispatches every 4 words to ElevenLabs without waiting for full Groq response.
 */
export async function handleMicResult(
  text: string,
  onStageChange?: (stage: VoicePipelineStage) => void
): Promise<string> {
  onStageChange?.("thinking");
  if (typeof window !== "undefined") {
    (window as any).DASFace?.setMood?.("thinking");
  }
  let buffer = "";
  let fullResponse = "";
  let spokenCount = 0;

  fullResponse = await askDas(text, async (token: string) => {
    buffer += token;
    // Prathi 4 words ki ElevenLabs ki pampu
    if (buffer.split(" ").length > 4) {
      if (spokenCount === 0) {
        onStageChange?.("speaking");
      }
      spokenCount++;
      await elevenLabsStream(buffer);
      buffer = "";
    }
  });

  if (buffer.trim()) {
    if (spokenCount === 0) {
      onStageChange?.("speaking");
    }
    await elevenLabsStream(buffer);
    buffer = "";
  }

  return fullResponse;
}

export interface ToolCallPayload {
  id: string;
  name: string;
  args: Record<string, any>;
  requires_confirmation?: boolean;
}

export interface ToolResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface ElevenLabsStreamDispatcherOptions {
  onSpeakChunk?: (chunk: string, chunkIndex: number) => void;
  onStageChange?: (stage: VoicePipelineStage) => void;
}

/**
 * Incremental First-Chunk Streaming Dispatcher for ElevenLabs TTS.
 * Sends the very first spoken clause to ElevenLabs as soon as it arrives from Groq SSE,
 * without waiting for the full LLM response to complete.
 */
export class ElevenLabsStreamingDispatcher {
  private fullBuffer = "";
  private spokenCursor = 0;
  private chunkCount = 0;
  private inThinkBlock = false;
  private reachedDetailsDelimiter = false;
  private onSpeakChunk: (chunk: string, chunkIndex: number) => void;
  private onStageChange?: (stage: VoicePipelineStage) => void;

  constructor(options: ElevenLabsStreamDispatcherOptions = {}) {
    this.onSpeakChunk =
      options.onSpeakChunk ||
      ((chunk: string) => {
        globalSpeaker.streamChunk(chunk);
      });
    this.onStageChange = options.onStageChange;
  }

  private cleanSpokenSlice(raw: string): string {
    return raw
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/[*_#`~]/g, "")
      .replace(/\s+/g, " ");
  }

  /**
   * Feeds a newly streamed token delta from Groq LPU and immediately dispatches
   * to ElevenLabs as soon as the first speakable clause/sentence boundary is ready.
   */
  feedToken(delta: string): string {
    if (!delta) return this.fullBuffer;
    this.fullBuffer += delta;

    // Handle <think>...</think> reasoning tags if present
    if (this.fullBuffer.includes("<think>") && !this.fullBuffer.includes("</think>")) {
      this.inThinkBlock = true;
      return this.fullBuffer;
    }
    if (this.inThinkBlock && this.fullBuffer.includes("</think>")) {
      this.inThinkBlock = false;
      this.fullBuffer = this.fullBuffer.replace(/<think>[\s\S]*?<\/think>/gi, "").trimStart();
    }

    if (this.reachedDetailsDelimiter) {
      return this.fullBuffer;
    }

    // Only speak content before ||| or markdown bullet lists or <!--ACTION:
    const delimIdx = this.fullBuffer.indexOf("|||");
    const actionIdx = this.fullBuffer.indexOf("<!--");
    const mdListIdx = this.fullBuffer.search(/\n\s*(?:\*\*|###|[-*•]\s|\d+\.\s)/);

    let cutoff = this.fullBuffer.length;
    if (delimIdx >= 0) cutoff = Math.min(cutoff, delimIdx);
    if (actionIdx >= 0) cutoff = Math.min(cutoff, actionIdx);
    if (mdListIdx > 0) cutoff = Math.min(cutoff, mdListIdx);

    if (delimIdx >= 0 || actionIdx >= 0 || mdListIdx > 0) {
      this.reachedDetailsDelimiter = true;
    }

    const speakableRegion = this.cleanSpokenSlice(this.fullBuffer.slice(0, cutoff));
    let unconsumed = speakableRegion.slice(this.spokenCursor);

    while (unconsumed.length > 0) {
      // Dispatch on complete sentence boundary (>= 24 chars) for smooth Deepgram Donovan prosody
      const sentenceMatch = unconsumed.match(/^([\s\S]{24,}?[.!?।\n]+)\s+/);
      if (sentenceMatch) {
        const chunk = sentenceMatch[1].trim();
        this.spokenCursor += sentenceMatch[0].length;
        unconsumed = speakableRegion.slice(this.spokenCursor);
        this.dispatchChunk(chunk);
      } else {
        break;
      }
    }

    // If we just hit the ||| delimiter, flush any remaining spoken words before ||| right away
    if (this.reachedDetailsDelimiter && unconsumed.trim()) {
      const remainder = unconsumed.trim();
      this.spokenCursor = speakableRegion.length;
      this.dispatchChunk(remainder);
    }

    return this.fullBuffer;
  }

  /**
   * Flushes any remaining unspoken text at the end of the Groq stream.
   */
  flush() {
    const delimIdx = this.fullBuffer.indexOf("|||");
    const actionIdx = this.fullBuffer.indexOf("<!--");
    const mdListIdx = this.fullBuffer.search(/\n\s*(?:\*\*|###|[-*•]\s|\d+\.\s)/);

    let cutoff = this.fullBuffer.length;
    if (delimIdx >= 0) cutoff = Math.min(cutoff, delimIdx);
    if (actionIdx >= 0) cutoff = Math.min(cutoff, actionIdx);
    if (mdListIdx > 0) cutoff = Math.min(cutoff, mdListIdx);

    const speakableRegion = this.cleanSpokenSlice(this.fullBuffer.slice(0, cutoff));
    const tail = speakableRegion.slice(this.spokenCursor).trim();
    if (tail) {
      this.spokenCursor = speakableRegion.length;
      this.dispatchChunk(tail);
    }
  }

  private dispatchChunk(chunk: string) {
    if (!chunk) return;
    const idx = this.chunkCount++;
    if (idx === 0) {
      this.onStageChange?.("speaking");
    }
    this.onSpeakChunk(chunk, idx);
  }

  getChunkCount(): number {
    return this.chunkCount;
  }
}

export interface StreamGroqToElevenLabsParams {
  apiKeys: string[];
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userQuery: string;
  model?: string;
  signal?: AbortSignal;
  onToken?: (fullTextSoFar: string, delta: string) => void;
  onSpeakChunk?: (chunk: string, chunkIndex: number) => void;
  onStageChange?: (stage: VoicePipelineStage) => void;
}

/**
 * Streams tokens from Groq LPU (`stream: true`) and pipes the very first chunk
 * directly into ElevenLabs TTS without waiting for the full Groq response.
 */
export async function streamGroqToElevenLabs({
  apiKeys,
  systemPrompt,
  history,
  userQuery,
  model = "openai/gpt-oss-120b",
  signal,
  onToken,
  onSpeakChunk,
  onStageChange,
}: StreamGroqToElevenLabsParams): Promise<string> {
  onStageChange?.("thinking");
  if (typeof window !== "undefined") {
    (window as any).DASFace?.setMood?.("thinking");
  }

  const dispatcher = new ElevenLabsStreamingDispatcher({
    onSpeakChunk,
    onStageChange,
  });

  for (const apiKey of apiKeys) {
    if (!apiKey) continue;
    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 7500);
      signal?.addEventListener("abort", () => ctrl.abort());

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0.65,
          max_tokens: 420,
          ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
          messages: [
            { role: "system", content: systemPrompt },
            ...history.slice(-6),
            { role: "user", content: userQuery },
          ],
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok || !res.body) {
        continue;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let carry = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += decoder.decode(value, { stream: true });
        const lines = carry.split("\n");
        carry = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payloadStr = line.slice(5).trim();
          if (!payloadStr || payloadStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payloadStr);
            const delta = parsed?.choices?.[0]?.delta?.content || "";
            if (delta) {
              fullText = dispatcher.feedToken(delta);
              onToken?.(fullText, delta);
            }
          } catch {
            // Ignore partial SSE JSON frames
          }
        }
      }

      if (fullText.trim()) {
        dispatcher.flush();
        return fullText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      }
    } catch (err: any) {
      if (signal?.aborted || err?.name === "AbortError") {
        throw err;
      }
      // Try next key in fallback pool
    }
  }

  return "";
}

// FULL JARVIS CONTROLLER TOOLS (Autonomous Navigation, Smart Blueprint Selection, Deep Lifecycle Explainer)
export const TOOLS = {
  navigate: (path: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: path } }));
    }
  },

  pick_blueprint: (size: "small" | "medium" | "large" = "small") => {
    if (typeof window === "undefined") return null;

    // Switch to projects tab first if not already there
    window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: "projects" } }));

    const cards = Array.from(document.querySelectorAll("[data-blueprint-size], [data-project-id]")) as HTMLElement[];
    const filtered = cards.filter(
      (c) => (c.getAttribute("data-blueprint-size") || c.getAttribute("data-size") || "").toLowerCase() === size
    );
    const pool = filtered.length > 0 ? filtered : cards;

    // Retrieve previous selections from memory so same project is never repeated
    let history: string[] = [];
    try {
      history = JSON.parse(localStorage.getItem("project_history") || "[]");
    } catch {}
    const lastPicked = localStorage.getItem("last_bp");

    let available = pool.filter((c) => c.id !== lastPicked && !history.includes(c.id));
    if (available.length === 0) {
      available = pool.filter((c) => c.id !== lastPicked);
      if (available.length === 0) available = pool;
    }

    const pick = available[Math.floor(Math.random() * available.length)];
    if (pick) {
      localStorage.setItem("last_bp", pick.id);
      try {
        const nextHistory = [pick.id, ...history.filter((id) => id !== pick.id)].slice(0, 20);
        localStorage.setItem("project_history", JSON.stringify(nextHistory));
      } catch {}

      pick.scrollIntoView({ behavior: "smooth", block: "center" });
      pick.click();

      // Trigger custom highlight glow
      window.dispatchEvent(
        new CustomEvent("das-highlight-project", {
          detail: { projectId: pick.getAttribute("data-project-id") || pick.id, query: size },
        })
      );

      return pick.getAttribute("data-blueprint-data") || pick.id;
    }
    return null;
  },

  explain_deep: (projectData: any) => {
    return `Explain this project like Jarvis - Step 1 to Deployment: VS Code Setup, UI/UX in Figma, Frontend (React+Tailwind), Backend (Supabase), ML Lifecycle (Data->Embed->Search), Deployment (Vercel). Why this is ${
      projectData?.size || "small"
    } project: ${projectData?.reason || "Focused scope with high system design value"}`;
  },
};

export function snapshot() {
  const clone = document.body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-agent-ignore], script, style").forEach((n) => n.remove());
  const text = (clone.textContent || "").replace(/\s+/g, " ").trim().slice(0, 2500);
  const elements = Array.from(document.querySelectorAll("[data-agent-id]"))
    .filter((el) => !el.closest("[data-agent-ignore]"))
    .slice(0, 60)
    .map((el) => ({
      id: el.getAttribute("data-agent-id"),
      kind: el.tagName.toLowerCase(),
      label: (
        el.getAttribute("aria-label") ||
        el.textContent ||
        (el as HTMLInputElement).placeholder ||
        ""
      )
        .trim()
        .slice(0, 50),
    }));
  return { route: location.pathname, title: document.title, text, elements };
}

const byId = (id: string) =>
  document.querySelector(`[data-agent-id="${CSS.escape(id)}"]`) as HTMLElement | null;

export function runTool(
  name: string,
  args: any,
  navigate: (to: string) => void
): { navigated?: boolean; explain?: boolean; success?: boolean; data?: any } {
  switch (name) {
    case "navigate":
    case "navigate_to": {
      const page = String(args.page || args.route || "").replace(/^\//, "");
      const tabTarget = page === "blueprints" ? "projects" : page;
      window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: tabTarget } }));
      const r = String(args.route || (page ? "/" + page : ""));
      if (r && r.startsWith("/") && !r.startsWith("//") && !r.includes(":")) {
        navigate(r);
      }
      return { success: true, navigated: true, explain: !!args.explain };
    }
    case "pick_project": {
      const size = String(args.size || "small").toLowerCase();
      window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: "projects" } }));
      window.dispatchEvent(new CustomEvent("das-highlight-project", { detail: { query: size } }));
      return { success: true, data: { size } };
    }
    case "explain_deep": {
      return { success: true, explain: true, data: args };
    }
    case "control_ui": {
      const action = String(args.action || "").toLowerCase();
      const target = String(args.target || "").toLowerCase();
      if (action === "scroll" || action === "scroll_to") {
        if (target === "top") window.scrollTo({ top: 0, behavior: "smooth" });
        else if (target === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        else {
          const el = document.getElementById(target) || document.querySelector(target);
          el?.scrollIntoView({ behavior: "smooth" });
        }
      }
      return { success: true };
    }
    case "_legacy_navigate_to": {
      const r = String(args.route || "");
      if (!r.startsWith("/") || r.startsWith("//") || r.includes(":")) return { success: false };
      navigate(r);
      return { success: true, navigated: true, explain: !!args.explain };
    }
    case "scroll_to": {
      const t = String(args.target || args.section || "");
      let el: Element | null = byId(t) || document.getElementById(t);
      if (!el) {
        el =
          Array.from(document.querySelectorAll("h1,h2,h3,h4,section")).find((h) =>
            (h.textContent || "").toLowerCase().includes(t.toLowerCase())
          ) || null;
      }
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return { success: true };
      }
      return { success: false };
    }
    case "click": {
      const el = byId(String(args.agent_id || ""));
      if (!el) return { success: false };
      if (
        el.hasAttribute("data-agent-danger") &&
        !window.confirm("Agent ee action cheyyamantunnadu. Sure na?")
      ) {
        return { success: false };
      }
      el.click();
      return { success: true };
    }
    case "fill_field": {
      const el = byId(String(args.agent_id || "")) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) return { success: false };
      const proto =
        el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, String(args.value ?? ""));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return { success: true };
    }
    case "read_page": {
      const snap = snapshot();
      return { success: true, data: snap };
    }
    case "explain_page": {
      const r = String(args.route || "");
      if (r.startsWith("/")) {
        navigate(r);
      }
      return { success: true, navigated: true, explain: true };
    }
  }
  return { success: false };
}

export async function executeToolCall(
  call: ToolCallPayload,
  onNavigate?: (route: string) => void
): Promise<ToolResult> {
  const navigateFn = onNavigate || ((to: string) => {
    window.location.pathname = to;
  });
  const result = runTool(call.name, call.args, navigateFn);
  return {
    success: result.success !== false,
    message: result.success !== false ? `Executed ${call.name}` : `Failed to execute ${call.name}`,
    data: result.data,
  };
}
