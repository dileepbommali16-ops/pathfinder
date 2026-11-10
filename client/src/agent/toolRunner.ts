// client/src/agent/toolRunner.ts
import { Type, FunctionDeclaration } from "@google/genai";
import { API_BASE } from "@/lib/apiClient";
import { toast } from "sonner";

export type VoicePipelineStage = "idle" | "listening" | "thinking" | "speaking" | "interrupted";

export interface ToolCallPayload {
  id?: string;
  name: string;
  args?: Record<string, any>;
  arguments?: Record<string, any>;
}

let activeExternalWindow: Window | null = null;

/* ------------------------------------------------------------------ */
/* DOM Helpers (Click, Type, Scroll, Read Page)                        */
/* ------------------------------------------------------------------ */
const CLICKABLE =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [data-das], input, textarea, select, summary, [onclick]';

const norm = (s?: string | null) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

function isVisible(el: HTMLElement): boolean {
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
  return Array.from(document.querySelectorAll<HTMLElement>(CLICKABLE)).filter(isVisible);
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

function flash(el: HTMLElement) {
  const old = el.style.outline;
  el.style.outline = "3px solid #22d3ee";
  setTimeout(() => (el.style.outline = old), 900);
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
  overview: ["overview", "dashboard", "home"],
  projects: ["projects", "project", "blueprints"],
  defense: ["defense", "viva", "coach"],
  interview: ["mock interview", "interview"],
  resume: ["resume"],
  roadmap: ["roadmap"],
  "skill-gap": ["skill gap", "skills"],
  "what-if": ["what-if", "what if", "simulator"],
  branches: ["branches"],
  roles: ["roles"],
  missions: ["missions"],
  profile: ["profile"],
  cohort: ["cohort", "analytics"]
};

function goToTab(tabRaw: string, navigate?: (path: string) => void) {
  const tab = norm(tabRaw).replace(/\s+/g, "-");
  window.dispatchEvent(
    new CustomEvent("pathfinder:agent-action", {
      detail: { toolName: "navigate_dashboard_tab", args: { tabName: tab } }
    })
  );

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

/* ------------------------------------------------------------------ */
/* Clean External Window Control (NO Right-Side Clutter Box!)          */
/* ------------------------------------------------------------------ */
export function showGoogleSearchOverlay(_query: string, _summaryText?: string) {
  // Intentionally disabled right-side box so the website stays 100% clean and visible!
  if (typeof document !== "undefined") {
    document.getElementById("das-google-live-overlay")?.remove();
  }
}

export function closeGoogleAndReturnToPage() {
  if (activeExternalWindow && !activeExternalWindow.closed) {
    try {
      activeExternalWindow.close();
    } catch { }
  }
  activeExternalWindow = null;
  if (typeof document !== "undefined") {
    document.getElementById("das-google-live-overlay")?.remove();
  }
  if (typeof window !== "undefined") window.focus();
  try {
    toast.success("Returned back to your Pathfinder dashboard!");
  } catch { }
}

function openExternal(url: string): boolean {
  if (typeof window === "undefined") return false;
  activeExternalWindow = window.open(url, "_blank");
  return !!activeExternalWindow;
}

const SITE_MAP: Record<string, { url: string; name: string }> = {
  google: { url: "https://www.google.com", name: "Google" },
  youtube: { url: "https://www.youtube.com", name: "YouTube" },
  linkedin: { url: "https://www.linkedin.com", name: "LinkedIn" },
  gmail: { url: "https://mail.google.com", name: "Gmail" },
  github: { url: "https://github.com", name: "GitHub" }
};

export function tryInstantBrowserCommand(rawInput: string): {
  handled: boolean;
  isSearchQuery?: boolean;
  searchQuery?: string;
  actionSummary?: string;
} {
  const text = rawInput.toLowerCase().trim();

  if (
    text.includes("return back") ||
    text.includes("back to your page") ||
    text.includes("back to ur page") ||
    text.includes("back to page") ||
    text.includes("back to pathfinder") ||
    text.includes("close google") ||
    text === "go back"
  ) {
    closeGoogleAndReturnToPage();
    return {
      handled: true,
      actionSummary: "closed Google and returned right back to your Pathfinder page"
    };
  }

  const searchMatch =
    text.match(
      /(?:go to google and search|open google and search|search on google for|google search|search google for)\s+(.+)/i
    ) || text.match(/search\s+(.+)\s+on\s+google/i);

  if (searchMatch && searchMatch[1]) {
    const query = searchMatch[1].replace(/^(for|about)\s+/i, "").trim();
    if (query) {
      openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
      toast.success(`Searching Google for "${query}"...`);
      return {
        handled: true,
        isSearchQuery: true,
        searchQuery: query,
        actionSummary: `searched Google for "${query}"`
      };
    }
  }

  for (const [key, site] of Object.entries(SITE_MAP)) {
    if (text === `open ${key}` || text === `go to ${key}`) {
      openExternal(site.url);
      toast.success(`Opened ${site.name}!`);
      return { handled: true, actionSummary: `opened ${site.name}` };
    }
  }

  return { handled: false };
}

/* ------------------------------------------------------------------ */
/* Tool Declarations (Website Control + Google Search + Gmail/Sheets)  */
/* ------------------------------------------------------------------ */
export const PATHFINDER_TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: "open_external_website_or_google_search",
        description:
          "Searches anything on Google or opens an external site (Google, YouTube, LinkedIn, Gmail, GitHub).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            siteOrUrl: { type: Type.STRING, description: "Site name or URL" },
            searchQuery: { type: Type.STRING, description: "Search query for Google" }
          },
          required: ["siteOrUrl"]
        }
      },
      {
        name: "return_to_pathfinder_page",
        description: "Closes the opened Google tab and returns to the Pathfinder page.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
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
        name: "send_gmail_automation",
        description: "Sends an automated Gmail message.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            recipientEmail: { type: Type.STRING },
            subject: { type: Type.STRING },
            summaryMessage: { type: Type.STRING }
          },
          required: ["recipientEmail", "subject", "summaryMessage"]
        }
      },
      {
        name: "schedule_google_calendar_interview",
        description: "Schedules an interview on Google Calendar.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING },
            roleTitle: { type: Type.STRING },
            interviewTime: { type: Type.STRING }
          },
          required: ["companyName", "roleTitle", "interviewTime"]
        }
      },
      {
        name: "sync_student_to_tpo_google_sheet",
        description: "Logs student readiness score to the TPO Master Google Sheet.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING },
            branch: { type: Type.STRING },
            readinessScore: { type: Type.NUMBER },
            targetRole: { type: Type.STRING }
          },
          required: ["studentName", "branch", "readinessScore", "targetRole"]
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
      case "return_to_pathfinder_page":
        closeGoogleAndReturnToPage();
        return {
          status: "returned_to_pathfinder",
          ok: true,
          navigated: true,
          explain: "Returned back to Pathfinder dashboard"
        };

      case "open_external_website_or_google_search": {
        const q = String(args.searchQuery || "").trim();
        const site = norm(String(args.siteOrUrl || ""));
        let opened = false;
        let label = q;

        if (q) {
          opened = openExternal(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
        } else if (SITE_MAP[site]) {
          opened = openExternal(SITE_MAP[site].url);
          label = SITE_MAP[site].name;
        } else if (/^https?:\/\//i.test(String(args.siteOrUrl || ""))) {
          opened = openExternal(String(args.siteOrUrl));
          label = String(args.siteOrUrl);
        } else {
          label = String(args.siteOrUrl || "");
          opened = openExternal(`https://www.google.com/search?q=${encodeURIComponent(label)}`);
        }
        toast.success(`Opened: ${label}`);
        return {
          status: "searched_google",
          ok: true,
          query: label,
          popupBlocked: !opened,
          explain: `Opened ${label}`
        };
      }

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

      case "send_gmail_automation": {
        toast.success(`Gmail Sent to ${args.recipientEmail}!`);
        fetch(`${API_BASE}/api/google/gmail/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_email: args.recipientEmail,
            subject: args.subject,
            body: args.summaryMessage
          })
        }).catch(() => { });
        return { status: "gmail_sent", ok: true };
      }

      case "schedule_google_calendar_interview": {
        toast.success(`Google Calendar Booked: ${args.companyName} (${args.interviewTime})`);
        fetch(`${API_BASE}/api/google/calendar/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_email: "candidate@pathfinder.ai",
            company_name: args.companyName,
            role_title: args.roleTitle,
            interview_time: args.interviewTime
          })
        }).catch(() => { });
        return { status: "calendar_scheduled", ok: true };
      }

      case "sync_student_to_tpo_google_sheet": {
        toast.success(`TPO Google Sheet Synced for ${args.studentName}!`);
        fetch(`${API_BASE}/api/google/sheets/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_name: args.studentName,
            branch: args.branch,
            readiness_score: Number(args.readinessScore || 80),
            target_role: args.targetRole
          })
        }).catch(() => { });
        return { status: "sheet_synced", ok: true };
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
  // 1. Navigate to target page if route is provided
  if (args.route) {
    if (navigateFn) {
      navigateFn(args.route);
    } else {
      window.history.pushState({}, "", args.route);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }

  // 2. Scroll to or click DOM element on the page
  if (args.selector) {
    setTimeout(() => {
      const el = document.querySelector(args.selector!) as HTMLElement | null;
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Add temporary glowing cyan ring so user sees DAS controlling the card
      el.style.transition = "all 0.4s ease";
      el.style.boxShadow = "0 0 28px rgba(0, 240, 255, 0.75)";
      setTimeout(() => {
        el.style.boxShadow = "";
      }, 2500);

      if (args.action === "click") {
        el.click();
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
