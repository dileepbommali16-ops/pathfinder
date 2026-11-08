/**
 * toolRunner.ts - Website DOM Tool Executor for Unified Gemini Live Agent
 *
 * Executes website control tools dispatched by the Gemini Live WebSocket session:
 * - navigate / navigate_to
 * - scroll / scroll_to
 * - click
 * - highlight / pick_project
 * - fill_field / read_page
 */

export type VoicePipelineStage = "idle" | "listening" | "thinking" | "speaking";

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

export const TOOLS = {
  navigate: (path: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: path } }));
    }
  },

  pick_blueprint: (size: "small" | "medium" | "large" = "small") => {
    if (typeof window === "undefined") return null;

    window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: "projects" } }));

    const cards = Array.from(
      document.querySelectorAll("[data-blueprint-size], [data-project-id]")
    ) as HTMLElement[];
    const filtered = cards.filter(
      (c) =>
        (c.getAttribute("data-blueprint-size") || c.getAttribute("data-size") || "").toLowerCase() ===
        size
    );
    const pool = filtered.length > 0 ? filtered : cards;

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
      const page = String(args.to || args.page || args.route || "").replace(/^\//, "");
      const tabTarget = page === "blueprints" ? "projects" : page;
      window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: tabTarget } }));
      const r = String(args.to || args.route || (page ? "/" + page : ""));
      if (r && r.startsWith("/") && !r.startsWith("//") && !r.includes(":")) {
        navigate(r);
      }
      return { success: true, navigated: true, explain: !!args.explain };
    }
    case "scroll": {
      const dir = String(args.dir || args.direction || "down").toLowerCase();
      if (dir === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else if (dir === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      else if (dir === "up") window.scrollBy({ top: -520, behavior: "smooth" });
      else window.scrollBy({ top: 520, behavior: "smooth" });
      return { success: true };
    }
    case "highlight":
    case "pick_project": {
      const target = String(args.target || args.size || "small").toLowerCase();
      window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: "projects" } }));
      window.dispatchEvent(new CustomEvent("das-highlight-project", { detail: { query: target } }));
      return { success: true, data: { target } };
    }
    case "open_blueprint": {
      const blueprintId = String(args.blueprintId || args.id || "1");
      window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: "projects" } }));
      window.dispatchEvent(
        new CustomEvent("das-highlight-project", { detail: { projectId: blueprintId, query: blueprintId } })
      );
      return { success: true, navigated: true, data: { blueprintId } };
    }
    case "highlight_section": {
      const sectionName = String(args.sectionName || args.target || "");
      const el =
        document.getElementById(sectionName) ||
        Array.from(document.querySelectorAll("h1,h2,h3,h4,section")).find((h) =>
          (h.textContent || "").toLowerCase().includes(sectionName.toLowerCase())
        );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      window.dispatchEvent(new CustomEvent("das-highlight-project", { detail: { query: sectionName } }));
      return { success: true, data: { sectionName } };
    }
    case "update_readiness_score": {
      const points = Number(args.points || 0);
      const feedback = String(args.feedback || "");
      window.dispatchEvent(
        new CustomEvent("das-update-readiness", { detail: { points, feedback } })
      );
      return { success: true, data: { points, feedback } };
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
      const agentId = String(args.agent_id || "");
      const textLabel = String(args.text || "").toLowerCase().trim();
      let el: HTMLElement | null = agentId ? byId(agentId) : null;
      if (!el && textLabel) {
        el =
          (Array.from(document.querySelectorAll("button, a, [role='tab'], [role='button']")).find(
            (b) => (b.textContent || "").toLowerCase().includes(textLabel)
          ) as HTMLElement) || null;
      }
      if (!el) return { success: false };
      if (
        el.hasAttribute("data-agent-danger") &&
        !window.confirm("Confirm this action requested by DAS?")
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
  const navigateFn =
    onNavigate ||
    ((to: string) => {
      window.location.pathname = to;
    });
  const result = runTool(call.name, call.args, navigateFn);
  return {
    success: result.success !== false,
    message: result.success !== false ? `Executed ${call.name}` : `Failed to execute ${call.name}`,
    data: result.data,
  };
}
