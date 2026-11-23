// client/src/agent/toolRunner.ts
import { Type, FunctionDeclaration } from "@google/genai";
import { codingStudioController } from "./codingStudioController";

export type VoicePipelineStage = "idle" | "listening" | "thinking" | "speaking" | "interrupted";

export interface ToolCallPayload {
  id?: string;
  name: string;
  args?: Record<string, any>;
  arguments?: Record<string, any>;
}

/* ------------------------------------------------------------------ */
/* DOM Helpers (Click, Type, Scroll, Read Page)                        */
/* ------------------------------------------------------------------ */
const CLICKABLE =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [data-das], input, textarea, select, summary, [onclick]';

const norm = (s?: string | null) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

function isVisible(el: HTMLElement): boolean {
  if (!el || typeof el.getBoundingClientRect !== "function") return false;
  if (el.closest("[data-das-ignore]")) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const st = getComputedStyle(el);
  return st.visibility !== "hidden" && st.display !== "none";
}

function labelOf(el: HTMLElement): string {
  const f = el as HTMLInputElement;
  return (
    el.getAttribute("data-das") ||
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    (el.innerText || "").trim().slice(0, 60) ||
    f.placeholder ||
    f.name ||
    ""
  ).trim();
}

function allClickables(): HTMLElement[] {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll<HTMLElement>(CLICKABLE)).filter(isVisible);
}

function emitCustomEvent(name: string, detail?: Record<string, any>) {
  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, detail ? { detail } : undefined));
  }
}

function findByLabel(label: string, pool?: HTMLElement[]): HTMLElement | null {
  const q = norm(label);
  if (!q) return null;
  let best: HTMLElement | null = null;
  let bestScore = 0;
  for (const el of pool || allClickables()) {
    const l = norm(labelOf(el));
    let score = 0;
    if (l === q) score = 3;
    else if (l.startsWith(q)) score = 2;
    else if (l && (l.includes(q) || (l.length >= 3 && q.includes(l)))) score = 1;
    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }
  return best;
}

const flashTimers = new WeakMap<HTMLElement, number>();

function flash(el: HTMLElement) {
  if (el.dataset.dasOrigOutline === undefined) {
    el.dataset.dasOrigOutline = el.style.outline || "";
  }
  const existingTimer = flashTimers.get(el);
  if (existingTimer !== undefined) {
    window.clearTimeout(existingTimer);
  }
  el.style.outline = "3px solid #FD0053";
  const tid = window.setTimeout(() => {
    const orig = el.dataset.dasOrigOutline ?? "";
    delete el.dataset.dasOrigOutline;
    flashTimers.delete(el);
    el.style.outline = orig;
  }, 900);
  flashTimers.set(el, tid);
}

function realClick(el: HTMLElement) {
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  flash(el);
  const o = { bubbles: true, cancelable: true, view: window };
  el.dispatchEvent(new PointerEvent("pointerdown", o));
  el.dispatchEvent(new MouseEvent("mousedown", o));
  el.focus?.();
  el.dispatchEvent(new PointerEvent("pointerup", o));
  el.dispatchEvent(new MouseEvent("mouseup", o));
  el.dispatchEvent(new MouseEvent("click", o));
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const TAB_ALIASES: Record<string, string[]> = {
  overview: ["overview", "dashboard", "home", "readiness", "summary", "action center", "command hub", "next actions"],
  skills: ["skills", "skill gap", "sprint"],
  projects: ["projects", "project", "blueprints", "project blueprints", "capstone"],
  analytics: ["cohort & roadmap", "analytics", "cohort analytics", "cohort", "roadmap", "6-week roadmap", "statistics", "benchmarks", "972"],
  resume: ["jd & resume tailor", "jd tailor", "jd matcher", "jd", "resume", "ats resume studio", "resume studio", "ats", "cv"],
  branches: ["branches", "branches and courses", "department", "courses"],
  defense: ["live coding & viva arena", "interview & defense", "project defense", "defense", "viva"],
  profile: ["profile", "settings", "candidate profile", "profile / settings"],
  interview: ["live coding & viva arena", "live coding", "coding arena", "viva arena", "interview & defense", "mock interview", "interview", "viva interview", "live interview"],
  action: ["action", "action center", "ai action center", "command hub", "next actions"],
  roles: ["roles", "target role", "company radar", "companies"],
  missions: ["cohort & roadmap", "missions", "30-day mission", "mission tracker"],
  roadmap: ["cohort & roadmap", "roadmap", "6-week roadmap", "sprint"],
  "skill-gap": ["skill gap", "skills"],
  "what-if": ["what-if", "what if", "simulator"],
  cohort: ["cohort & roadmap", "cohort", "analytics"],
};

function goToTab(tabRaw: string, navigate?: (path: string) => void) {
  const tab = norm(tabRaw).replace(/\s+/g, "-");
  emitCustomEvent("pathfinder:agent-action", {
    toolName: "navigate_dashboard_tab",
    args: { tabName: tab }
  });

  if (navigate) navigate(`/?tab=${encodeURIComponent(tab)}`);

  const words = TAB_ALIASES[tab] || [tab.replace(/-/g, " ")];
  for (const w of words) {
    const el = findByLabel(w);
    if (el) {
      realClick(el);
      return { status: "navigated", ok: true, navigated: true, explain: `Switched tab to ${tab}` };
    }
  }
  return { status: "navigated", ok: true, navigated: true, explain: `Switched to ${tab}` };
}

const CLIENT_TAB_INTENTS: Array<{ route: string; patterns: RegExp[] }> = [
  { route: "focus_on_das", patterns: [/\bfocus\s+on\s+das\b/, /\bhide\s+dashboard\b/] },
  { route: "show_dashboard", patterns: [/\bshow\s+(?:the\s+)?dashboard\b/, /\bexit\s+focus\b/] },
  {
    route: "projects",
    patterns: [
      /\b(?:open|go\s+to|show|switch\s+to|navigate(?:\s+to)?)\s+(?:the\s+)?(?:project\s+)?blueprints?\b/,
      /\b(?:open|go\s+to|show|switch\s+to)\s+(?:the\s+)?projects\b/,
    ],
  },
  {
    route: "interview",
    patterns: [
      /\b(?:open|go\s+to|start|launch|show|switch\s+to)\s+(?:the\s+)?(?:live\s+coding(?:\s*&\s*viva)?(?:\s+arena)?|coding\s+arena|viva\s+arena|mock\s+interview)\b/,
      /\b(?:open|go\s+to|start|show|switch\s+to)\s+(?:the\s+)?(?:project\s+)?defense\b/,
    ],
  },
  {
    route: "resume",
    patterns: [
      /\b(?:open|go\s+to|show|switch\s+to)\s+(?:the\s+)?(?:1[\s-]?click\s+)?(?:jd(?:\s*&\s*resume)?(?:\s+tailor|\s+matcher)?|(?:ats\s+)?resume(?:\s+studio|\s+tailor)?)\b/,
    ],
  },
  {
    route: "analytics",
    patterns: [
      /\b(?:open|go\s+to|show|switch\s+to)\s+(?:the\s+)?(?:cohort(?:\s*&\s*roadmap|\s+analytics)?|(?:6-week\s+)?roadmap)\b/,
    ],
  },
  {
    route: "skills",
    patterns: [
      /\b(?:open|go\s+to|show|switch\s+to)\s+(?:the\s+)?skill\s+gap\b/,
    ],
  },
  {
    route: "branches",
    patterns: [/\b(?:open|go\s+to|show|switch\s+to)\s+(?:the\s+)?branches\b/],
  },
  {
    route: "roles",
    patterns: [/\b(?:open|go\s+to|show|switch\s+to)\s+(?:the\s+)?target\s+roles?\b/],
  },
  {
    route: "profile",
    patterns: [/\b(?:open|go\s+to|show|switch\s+to)\s+(?:my\s+|the\s+)?profile(?:\s+settings)?\b/],
  },
  {
    route: "overview",
    patterns: [/\b(?:open|go\s+to|return\s+to)\s+(?:the\s+)?(?:overview|dashboard)\b/],
  },
];

export function tryExecuteClientAutomationIntent(
  rawQuery: string,
  navigateFn?: (path: string) => void
): boolean {
  const clean = norm(rawQuery);
  if (!clean) return false;
  const cgpaMatch = clean.match(/\b(?:set|change|update|make)\s+(?:my\s+)?cgpa\s+(?:to|as|=)?\s*(\d+(?:\.\d+)?)\b/);
  if (cgpaMatch) {
    const val = Math.min(10, Math.max(0, parseFloat(cgpaMatch[1])));
    emitCustomEvent("das-update-profile", { field: "cgpa", value: val });
    return true;
  }
  const branchMatch = clean.match(
    /\b(?:set|change|update|switch)\s+(?:my\s+)?branch\s+(?:to\s+)?(cse|ece|eee|mech|mechanical|civil|it|aiml|csm|csd|iot|other)\b/
  );
  if (branchMatch) {
    const rawBranch = branchMatch[1].toLowerCase();
    const normalizedBranch = rawBranch === "mech" ? "Mechanical" : rawBranch === "iot" ? "IoT" : rawBranch === "other" ? "Other" : rawBranch.toUpperCase();
    emitCustomEvent("das-update-profile", { field: "branch", value: normalizedBranch });
    return true;
  }
  for (const intent of CLIENT_TAB_INTENTS) {
    if (intent.patterns.some((rx) => rx.test(clean))) {
      if (intent.route === "focus_on_das") {
        executeWebsiteControl({ action: "focus_das" as any, route: "focus_on_das" }, navigateFn);
      } else if (intent.route === "show_dashboard") {
        executeWebsiteControl({ action: "show_dashboard" as any, route: "show_dashboard" }, navigateFn);
      } else {
        executeWebsiteControl({ action: "navigate", route: intent.route }, navigateFn);
      }
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Tool Declarations (Website Control + Online Compiler + Profile)    */
/* ------------------------------------------------------------------ */
export const PATHFINDER_TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: "navigate_dashboard_tab",
        description: "Switches the active tab inside the Pathfinder dashboard.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            tabName: {
              type: Type.STRING,
              description:
                "'overview', 'projects', 'defense', 'interview', 'resume', 'roadmap', 'skill-gap', 'what-if', 'branches', 'roles', 'missions', 'profile', or 'cohort'."
            }
          },
          required: ["tabName"]
        }
      },
      {
        name: "open_blueprint",
        description: "Opens one of the 23 capstone blueprints (1 to 23).",
        parameters: {
          type: Type.OBJECT,
          properties: { blueprintNumber: { type: Type.NUMBER, description: "Blueprint 1 to 23" } },
          required: ["blueprintNumber"]
        }
      },
      {
        name: "list_clickables",
        description: "Lists visible buttons, links, tabs and inputs on the current page.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "click_element",
        description: "Clicks a button, link or tab on the page by its visible text.",
        parameters: {
          type: Type.OBJECT,
          properties: { label: { type: Type.STRING, description: "Visible text on button" } },
          required: ["label"]
        }
      },
      {
        name: "type_text",
        description: "Types text into an input box on the page.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            target: { type: Type.STRING },
            submit: { type: Type.BOOLEAN }
          },
          required: ["text"]
        }
      },
      {
        name: "scroll_page",
        description: "Scrolls the page: up, down, top or bottom.",
        parameters: {
          type: Type.OBJECT,
          properties: { direction: { type: Type.STRING } },
          required: ["direction"]
        }
      },
      {
        name: "read_page",
        description: "Reads visible headings and text of the current page.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "update_student_profile",
        description:
          "Directly updates the student's live Pathfinder profile fields (cgpa, branch, backlogs, coding, communication, internships, targetRole) and recalculates placement readiness.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            field: { type: Type.STRING, description: "Profile field: cgpa, branch, backlogs, coding, communication, internships, or targetRole" },
            value: { type: Type.STRING, description: "New value, e.g. '8.9' or 'AIML'" }
          },
          required: ["field", "value"]
        }
      }
    ]
  }
];

export function runTool(
  name: string,
  args: Record<string, any>,
  navigate?: (path: string) => void
): { status: string; navigated?: boolean; explain?: string;[key: string]: any } {
  try {
    switch (name) {
      case "navigate_dashboard_tab":
        return goToTab(String(args.tabName || ""), navigate);

      case "open_blueprint": {
        const n = Number(args.blueprintNumber);
        window.dispatchEvent(
          new CustomEvent("pathfinder:agent-action", { detail: { toolName: name, args } })
        );
        const el = findByLabel(`blueprint ${n}`);
        if (el) realClick(el);
        return { status: "executed", ok: true, explain: `Opened blueprint ${n}` };
      }

      case "list_clickables": {
        const items = allClickables()
          .slice(0, 50)
          .map((el) => labelOf(el))
          .filter(Boolean);
        return { status: "ok", ok: true, items };
      }

      case "click_element": {
        const el = findByLabel(String(args.label || ""));
        if (!el)
          return {
            status: "not_found",
            ok: false,
            explain: `"${args.label}" not found on screen.`
          };
        realClick(el);
        return { status: "clicked", ok: true, explain: `Clicked "${labelOf(el)}"` };
      }

      case "type_text": {
        const inputs = Array.from(document.querySelectorAll<HTMLElement>("input, textarea")).filter(
          isVisible
        );
        const el = ((args.target && findByLabel(String(args.target), inputs)) || inputs[0]) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | undefined;
        if (!el) return { status: "not_found", ok: false, explain: "Input box not found" };
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        flash(el);
        el.focus();
        setNativeValue(el, String(args.text || ""));
        if (args.submit) {
          ["keydown", "keypress", "keyup"].forEach((t) =>
            el.dispatchEvent(
              new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, bubbles: true })
            )
          );
        }
        return { status: "typed", ok: true, explain: `Typed in "${labelOf(el)}"` };
      }

      case "scroll_page": {
        const d = norm(String(args.direction || "down"));
        if (d === "top") window.scrollTo({ top: 0, behavior: "smooth" });
        else if (d === "bottom")
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        else
          window.scrollBy({
            top: (d === "up" ? -1 : 1) * window.innerHeight * 0.8,
            behavior: "smooth"
          });
        return { status: "scrolled", ok: true, explain: `Scrolled ${d}` };
      }

      case "update_student_profile": {
        const field = String(args.field || "").trim();
        const value = args.value;
        if (typeof window !== "undefined" && field && value !== undefined) {
          window.dispatchEvent(
            new CustomEvent("das-update-profile", { detail: { field, value } })
          );
        }
        return { status: "updated", ok: true, updated: true, field, value, explain: `Updated ${field} to ${value}` };
      }

      case "read_page": {
        const heads = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3"))
          .filter(isVisible)
          .map((h) => h.innerText.trim())
          .filter(Boolean)
          .slice(0, 15);
        const root = (document.querySelector("main") as HTMLElement | null) || document.body;
        return {
          status: "ok",
          ok: true,
          title: document.title,
          headings: heads,
          text: root.innerText.replace(/\s+/g, " ").slice(0, 1500)
        };
      }

      default:
        window.dispatchEvent(
          new CustomEvent("pathfinder:agent-action", { detail: { toolName: name, args } })
        );
        return {
          status: "executed",
          ok: true,
          tool: name,
          args,
          navigated: false,
          explain: `Executed ${name}`
        };
    }
  } catch (e: any) {
    return { status: "error", ok: false, explain: `Tool error: ${e?.message || e}` };
  }
}

export interface ToolCallArgs {
  route?: string;
  selector?: string;
  action?: "navigate" | "scroll" | "click";
}

export function executeBrowserTool(
  args: ToolCallArgs,
  navigateFn?: (path: string) => void
) {
  if (args.route && navigateFn) {
    navigateFn(args.route);
  } else if (args.route) {
    window.history.pushState({}, "", args.route);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  if (args.selector) {
    setTimeout(() => {
      const el = document.querySelector(args.selector!);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (args.action === "click" && el instanceof HTMLElement) {
          el.click();
        }
      }
    }, 350);
  }
}

export interface WebsiteControlArgs {
  action: "navigate" | "scroll" | "click" | "highlight";
  route?: string;
  selector?: string;
}

export function executeWebsiteControl(
  args: WebsiteControlArgs,
  navigateFn?: (route: string) => void
) {
  const act = (args.action || "").toLowerCase().trim();
  const rawRoute = (args.route || "").trim();
  const routeNorm = rawRoute.toLowerCase().replace(/^\/+/, "");

  // 0. Focus on DAS / Show Dashboard automation
  if (act === "focus_das" || routeNorm === "focus_on_das" || routeNorm === "focus-on-das") {
    emitCustomEvent("das-toggle-focus", { focus: true });
    return;
  }
  if (act === "show_dashboard" || routeNorm === "show_dashboard" || routeNorm === "show-dashboard") {
    emitCustomEvent("das-toggle-focus", { focus: false });
    return;
  }

  // 1. Navigate to target slide / tab / route cleanly
  if (rawRoute) {
    const knownRouteToTab: Record<string, string> = {
      dashboard: "overview",
      overview: "overview",
      blueprints: "projects",
      "resume-studio": "resume",
      "jd-tailor": "resume",
      "jd-matcher": "resume",
      "mock-interview": "interview",
      "live-coding": "interview",
      "coding-arena": "interview",
      skills: "skills",
      projects: "projects",
      analytics: "analytics",
      "cohort-roadmap": "analytics",
      roadmap: "analytics",
      resume: "resume",
      branches: "branches",
      defense: "interview",
      profile: "profile",
      interview: "interview",
      action: "overview",
      roles: "roles",
      missions: "analytics",
    };
    const mappedTab = knownRouteToTab[routeNorm];
    if (mappedTab) {
      emitCustomEvent("das-toggle-focus", { focus: false });
      goToTab(mappedTab, navigateFn);
    } else if (rawRoute.startsWith("/")) {
      if (navigateFn) {
        navigateFn(rawRoute);
      } else if (typeof window !== "undefined") {
        window.history.pushState({}, "", rawRoute);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    } else {
      emitCustomEvent("das-toggle-focus", { focus: false });
      goToTab(rawRoute, navigateFn);
    }
  }

  // 2. Scroll to or click DOM element on the page (supports CSS selector OR visible label)
  if (args.selector) {
    setTimeout(() => {
      let el: HTMLElement | null = null;
      try {
        el = document.querySelector(args.selector!) as HTMLElement | null;
      } catch {
        el = null;
      }
      if (!el) {
        el = findByLabel(args.selector!);
      }
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      el.style.transition = "all 0.4s ease";
      el.style.boxShadow = "0 0 28px rgba(253, 0, 83, 0.65)";
      setTimeout(() => {
        el.style.boxShadow = "";
      }, 2500);

      if (act === "click") {
        realClick(el);
      }
    }, 350);
  }
}

export async function executeWebsiteTool(
  name: string,
  args: Record<string, any>,
  navigate?: any
): Promise<{ status: string; navigated?: boolean; explain?: string;[key: string]: any }> {
  return runTool(name, args, navigate);
}

export async function executeToolCall(
  toolCall: ToolCallPayload | string,
  navigate?: any,
  args?: Record<string, any>
): Promise<any> {
  const name = typeof toolCall === "string" ? toolCall : toolCall.name;
  const toolArgs =
    typeof toolCall === "string"
      ? args || {}
      : toolCall.args || (toolCall as any).arguments || {};
  return runTool(name, toolArgs, navigate);
}

export function snapshot(): Record<string, any> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { url: "", title: "", activeTab: "overview" };
  }
  return {
    url: window.location.href,
    title: document.title,
    activeTab: new URLSearchParams(window.location.search).get("tab") || "overview"
  };
}

/* ------------------------------------------------------------------ */
/* Built-In Multi-Language Online Compiler Tool                       */
/* ------------------------------------------------------------------ */

export interface CodeTaskPayload {
  language: string;
  title: string;
  code: string;
  explanation: string;
  compilerUrl?: string;
}

// Built-In Multi-Language Live Online Compiler Studio
export async function handleCodeGenerationAndCompiler(
  args: {
    action?: string;
    language: string;
    program_title?: string;
    source_code?: string;
    logic_explanation?: string;
  },
  _onCodeReady?: (payload: CodeTaskPayload) => void
): Promise<Record<string, any>> {
  const langKey = (args.language || "python").toLowerCase().trim();
  const studioAction = args.action === "clear" ? "delete_code" : "write_code";
  return await codingStudioController.execute({
    action: studioAction,
    language: langKey,
    program_title: args.program_title || `${langKey.toUpperCase()} Program`,
    source_code: args.source_code || "",
    logic_explanation: args.logic_explanation || "",
    auto_run: studioAction === "write_code",
  });
}
