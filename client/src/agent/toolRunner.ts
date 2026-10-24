/**
 * toolRunner - Agent ki website control. data-agent-id pettina elements matrame control avthayi.
 * Destructive buttons ki data-agent-danger pettu => confirm adugutundi.
 * File: client/src/agent/toolRunner.ts
 */

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
      label: (el.getAttribute("aria-label") || el.textContent || (el as HTMLInputElement).placeholder || "")
        .trim().slice(0, 50),
    }));
  return { route: location.pathname, title: document.title, text, elements };
}

const byId = (id: string) =>
  document.querySelector(`[data-agent-id="${CSS.escape(id)}"]`) as HTMLElement | null;

export function runTool(
  name: string,
  args: any,
  navigate: (to: string) => void,
): { navigated?: boolean; explain?: boolean; success?: boolean; data?: any } {
  switch (name) {
    case "navigate_to": {
      const r = String(args.route || "");
      if (!r.startsWith("/") || r.startsWith("//") || r.includes(":")) return { success: false };
      navigate(r);
      return { success: true, navigated: true, explain: !!args.explain };
    }
    case "scroll_to": {
      const t = String(args.target || args.section || "");
      let el: Element | null = byId(t) || document.getElementById(t);
      if (!el) {
        el = Array.from(document.querySelectorAll("h1,h2,h3,h4,section"))
          .find((h) => (h.textContent || "").toLowerCase().includes(t.toLowerCase())) || null;
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
      if (el.hasAttribute("data-agent-danger") && !window.confirm("Agent ee action cheyyamantunnadu. Sure na?")) {
        return { success: false };
      }
      el.click();
      return { success: true };
    }
    case "fill_field": {
      const el = byId(String(args.agent_id || "")) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) return { success: false };
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
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
  const navigateFn = onNavigate || ((to: string) => { window.location.pathname = to; });
  const result = runTool(call.name, call.args, navigateFn);
  return {
    success: result.success !== false,
    message: result.success !== false ? `Executed ${call.name}` : `Failed to execute ${call.name}`,
    data: result.data,
  };
}
