// client/src/agent/toolRunner.ts
import { Type, FunctionDeclaration } from "@google/genai";
import { API_BASE } from "@/lib/apiClient";
import { toast } from "sonner";

export type VoicePipelineStage = "idle" | "listening" | "thinking" | "speaking" | "interrupted";

export interface ToolCallPayload {
  name: string;
  args: Record<string, any>;
}

let activeExternalWindow: Window | null = null;

// Clean cleanup: removes the old right-side overlay if it ever existed in DOM
export function closeGoogleAndReturnToPage() {
  if (activeExternalWindow && !activeExternalWindow.closed) {
    try {
      activeExternalWindow.close();
    } catch { }
  }
  activeExternalWindow = null;

  const oldOverlay = document.getElementById("das-google-live-overlay");
  if (oldOverlay) {
    oldOverlay.remove();
  }

  if (typeof window !== "undefined") {
    window.focus();
  }
  toast.success("Returned back to your Pathfinder page!");
}

export function tryInstantBrowserCommand(rawInput: string): {
  handled: boolean;
  isSearchQuery?: boolean;
  searchQuery?: string;
  actionSummary?: string;
} {
  const text = rawInput.toLowerCase().trim();

  // Remove any leftover overlay immediately
  const oldOverlay = document.getElementById("das-google-live-overlay");
  if (oldOverlay) oldOverlay.remove();

  // 1. "return back to your page" / "close google" / "go back"
  if (
    text.includes("return back") ||
    text.includes("back to your page") ||
    text.includes("back to ur page") ||
    text.includes("back to page") ||
    text.includes("close google") ||
    text === "go back"
  ) {
    closeGoogleAndReturnToPage();
    return {
      handled: true,
      actionSummary: "closed Google and returned back to your Pathfinder page"
    };
  }

  // 2. Explicit Google Search ONLY when user clearly says "go to google and search..." or "search ... on google"
  const searchMatch =
    text.match(
      /(?:go to google and search|open google and search|search on google for|google search|search google for)\s+(.+)/i
    ) || text.match(/search\s+(.+)\s+on\s+google/i);

  if (searchMatch && searchMatch[1]) {
    const query = searchMatch[1].replace(/^(for|about)\s+/i, "").trim();
    if (query) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      activeExternalWindow = window.open(url, "_blank");
      toast.success(`Searching Google for "${query}"`);
      return {
        handled: true,
        isSearchQuery: true,
        searchQuery: query,
        actionSummary: `searched Google for "${query}"`
      };
    }
  }

  // 3. Direct site open ("open google", "open youtube", "open linkedin", "open gmail")
  const siteMap: Record<string, { url: string; name: string }> = {
    google: { url: "https://www.google.com", name: "Google" },
    youtube: { url: "https://www.youtube.com", name: "YouTube" },
    linkedin: { url: "https://www.linkedin.com", name: "LinkedIn" },
    gmail: { url: "https://mail.google.com", name: "Gmail" },
    github: { url: "https://github.com", name: "GitHub" }
  };

  for (const [key, site] of Object.entries(siteMap)) {
    if (text === `open ${key}` || text === `go to ${key}`) {
      activeExternalWindow = window.open(site.url, "_blank");
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
        description: "Opens Google, searches on Google, or opens YouTube/LinkedIn/Gmail in a new tab.",
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
    activeExternalWindow = window.open(url, "_blank");
    toast.success(`Opened Google Search: ${query}`);
    return { status: "searched_google", query };
  }

  window.dispatchEvent(
    new CustomEvent("pathfinder:agent-action", {
      detail: { toolName: name, args }
    })
  );

  return { status: "executed", tool: name, args };
}

export const runTool = executeWebsiteTool;
export const executeToolCall = executeWebsiteTool;

export function snapshot(): Record<string, any> {
  return {
    url: window.location.href,
    title: document.title,
    activeTab: new URLSearchParams(window.location.search).get("tab") || "overview"
  };
}
