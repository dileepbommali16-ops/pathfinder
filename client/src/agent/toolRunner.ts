// client/src/agent/toolRunner.ts
import { Type, FunctionDeclaration } from "@google/genai";
import { API_BASE } from "@/lib/apiClient";
import { toast } from "sonner";

export type VoicePipelineStage = "idle" | "listening" | "thinking" | "speaking" | "interrupted";

export interface ToolCallPayload {
  name: string;
  args: Record<string, any>;
  id?: string;
}

// Controllable reference to the opened Google window so "return back to your page" can close it!
let activeExternalWindow: Window | null = null;

// Shows or hides a Live Google Search Overlay right inside Pathfinder
export function showGoogleSearchOverlay(query: string, summaryText?: string) {
  if (typeof document === "undefined") return;
  let overlay = document.getElementById("das-google-live-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "das-google-live-overlay";
    overlay.style.cssText =
      "position:fixed;top:76px;right:24px;width:420px;max-width:92vw;z-index:99998;background:rgba(12,16,29,0.96);border:1px solid rgba(0,245,212,0.45);border-radius:18px;padding:18px;color:#f8fafc;box-shadow:0 16px 48px rgba(0,0,0,0.85);backdrop-filter:blur(16px);font-family:sans-serif;transition:all 0.3s ease;";
    document.body.appendChild(overlay);
  }

  const encoded = encodeURIComponent(query);
  overlay.style.display = "block";
  overlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="height:10px;width:10px;border-radius:50%;background:#00f5d4;display:inline-block;"></span>
        <strong style="font-size:13px;letter-spacing:0.4px;color:#00f5d4;">GOOGLE LIVE SEARCH · DAS AGENT</strong>
      </div>
      <button id="das-close-google-overlay" style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.5);color:#fca5a5;border-radius:8px;padding:3px 9px;font-size:11px;cursor:pointer;">
        Return Back ✕
      </button>
    </div>
    <div style="font-size:14px;font-weight:700;margin-bottom:6px;color:#ffffff;">
      🔍 "${query}"
    </div>
    <div id="das-google-overlay-summary" style="font-size:12.5px;line-height:1.55;color:#cbd5e1;background:rgba(255,255,255,0.04);padding:10px 12px;border-radius:10px;margin-bottom:12px;">
      ${summaryText || "Fetching live insights from Google and analyzing details for you, Boss..."}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="https://www.google.com/search?q=${encoded}" target="_blank" rel="noopener noreferrer"
         style="flex:1;text-align:center;background:#00f5d4;color:#070d1f;font-weight:700;font-size:12px;padding:8px 12px;border-radius:10px;text-decoration:none;">
        View Full Google Results ↗
      </a>
    </div>
    <div style="margin-top:8px;font-size:11px;color:#94a3b8;text-align:center;">
      💡 Say <b>"Okay good, return back to your page"</b> anytime to close this.
    </div>
  `;

  const closeBtn = document.getElementById("das-close-google-overlay");
  if (closeBtn) {
    closeBtn.onclick = () => closeGoogleAndReturnToPage();
  }
}

export function closeGoogleAndReturnToPage() {
  // 1. Close external Google popup/tab if open
  if (activeExternalWindow && !activeExternalWindow.closed) {
    try {
      activeExternalWindow.close();
    } catch { }
  }
  activeExternalWindow = null;

  // 2. Hide in-page Google overlay
  const overlay = document.getElementById("das-google-live-overlay");
  if (overlay) {
    overlay.style.display = "none";
  }

  // 3. Focus Pathfinder window
  if (typeof window !== "undefined") {
    window.focus();
  }
  toast.success("Returned back to your Pathfinder dashboard!");
}

// 0ms Instant Voice/Text Command Interceptor
export function tryInstantBrowserCommand(rawInput: string): {
  handled: boolean;
  isSearchQuery?: boolean;
  searchQuery?: string;
  actionSummary?: string;
} {
  const text = rawInput.toLowerCase().trim();

  // A. "return back to your page" / "go back to pathfinder" / "close google" / "return back"
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

  // B. "go to google and search X" / "search X on google" / "google search X"
  const searchMatch =
    text.match(
      /(?:go to google and search|open google and search|search on google for|google search|search google for|search for)\s+(.+)/i
    ) || text.match(/search\s+(.+)\s+on\s+google/i);

  if (searchMatch && searchMatch[1]) {
    const query = searchMatch[1].replace(/^(for|about)\s+/i, "").trim();
    if (query) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      // Open controllable popup window on the side so voice mic on Pathfinder stays active!
      activeExternalWindow = window.open(
        url,
        "PathfinderGoogleWindow",
        "width=960,height=720,left=80,top=80"
      );
      showGoogleSearchOverlay(query);
      toast.success(`Searching Google for "${query}"...`);
      return {
        handled: true,
        isSearchQuery: true,
        searchQuery: query,
        actionSummary: `searched Google for "${query}"`
      };
    }
  }

  // C. Direct "open google" / "open youtube" / "open linkedin"
  const siteMap: Record<string, { url: string; name: string }> = {
    google: { url: "https://www.google.com", name: "Google" },
    youtube: { url: "https://www.youtube.com", name: "YouTube" },
    linkedin: { url: "https://www.linkedin.com", name: "LinkedIn" },
    gmail: { url: "https://mail.google.com", name: "Gmail" },
    github: { url: "https://github.com", name: "GitHub" }
  };

  for (const [key, site] of Object.entries(siteMap)) {
    if (text === `open ${key}` || text === `go to ${key}`) {
      activeExternalWindow = window.open(
        site.url,
        "PathfinderGoogleWindow",
        "width=960,height=720,left=80,top=80"
      );
      showGoogleSearchOverlay(site.name, `Opened ${site.name} live window for you.`);
      toast.success(`Opened ${site.name}!`);
      return {
        handled: true,
        actionSummary: `opened ${site.name}`
      };
    }
  }

  return { handled: false };
}

export const PATHFINDER_TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: "open_external_website_or_google_search",
        description:
          "Searches anything on Google or opens an external site (Google, YouTube, LinkedIn, Gmail).",
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
        description:
          "Closes the external Google search window/overlay and returns focus back to the Pathfinder page.",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
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
          properties: {
            blueprintNumber: { type: Type.NUMBER, description: "Blueprint number 1 to 23" }
          },
          required: ["blueprintNumber"]
        }
      }
    ]
  }
];

export async function executeWebsiteTool(
  name: string,
  args: Record<string, any>
): Promise<Record<string, any>> {
  if (name === "return_to_pathfinder_page") {
    closeGoogleAndReturnToPage();
    return { status: "returned_to_pathfinder" };
  }

  if (name === "open_external_website_or_google_search") {
    const query = String(args.searchQuery || args.siteOrUrl || "").trim();
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    activeExternalWindow = window.open(
      url,
      "PathfinderGoogleWindow",
      "width=960,height=720,left=80,top=80"
    );
    showGoogleSearchOverlay(query);
    return { status: "searched_google", query };
  }

  window.dispatchEvent(
    new CustomEvent("pathfinder:agent-action", {
      detail: { toolName: name, args }
    })
  );

  return { status: "executed", tool: name, args };
}

// Synchronous tool runner interface required by AgentLayout.tsx
export function runTool(
  name: string,
  args: Record<string, any> = {},
  navigate?: (to: string) => void
): { navigated?: boolean; explain?: boolean; status: string } {
  void executeWebsiteTool(name, args);
  if (navigate && args.to) {
    navigate(String(args.to));
  }
  return {
    status: "executed",
    navigated: name === "navigate_dashboard_tab" || name === "navigate",
    explain: Boolean(args.explain)
  };
}

export async function executeToolCall(
  payload: ToolCallPayload | string,
  onNavigate?: (route: string) => void
): Promise<Record<string, any>> {
  if (typeof payload === "string") {
    return executeWebsiteTool(payload, {});
  }
  if (onNavigate && payload.args?.to) {
    onNavigate(String(payload.args.to));
  }
  return executeWebsiteTool(payload.name, payload.args || {});
}

export function snapshot(): Record<string, any> {
  return {
    url: window.location.href,
    title: document.title,
    activeTab: new URLSearchParams(window.location.search).get("tab") || "overview"
  };
}