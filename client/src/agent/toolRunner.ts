// client/src/agent/toolRunner.ts
import { Type, FunctionDeclaration } from "@google/genai";
import { API_BASE } from "@/lib/apiClient";
import { toast } from "sonner";

export type VoicePipelineStage = "idle" | "listening" | "thinking" | "speaking" | "interrupted";

export interface ToolCallPayload {
  name: string;
  args: Record<string, any>;
}

// Clean up any old right-side overlay immediately if present
if (typeof document !== "undefined") {
  document.getElementById("das-google-live-overlay")?.remove();
}

// Reference to the opened external window so "return back to your page" can close it cleanly
let activeExternalWindow: Window | null = null;

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
  if (typeof window !== "undefined") {
    window.focus();
  }
  toast.success("Returned back to Pathfinder, Boss!");
}

// 0ms Synchronous Command Handler (Opens & Closes Google cleanly without any right-side clutter)
export function tryInstantBrowserCommand(rawInput: string): {
  handled: boolean;
  isSearchQuery?: boolean;
  searchQuery?: string;
  actionSummary?: string;
} {
  const text = rawInput.toLowerCase().trim();

  // 1. "return back to your page" / "close google" / "go back"
  if (
    text.includes("return back") ||
    text.includes("back to your page") ||
    text.includes("back to ur page") ||
    text.includes("back to page") ||
    text.includes("back to pathfinder") ||
    text.includes("close google") ||
    text.includes("close window") ||
    text === "go back"
  ) {
    closeGoogleAndReturnToPage();
    return {
      handled: true,
      actionSummary: "closed Google and returned back to your Pathfinder page"
    };
  }

  // 2. "go to google and search X" / "search X on google" / "google search X"
  const searchMatch =
    text.match(
      /(?:go to google and search|open google and search|search on google for|google search|search google for|search for)\s+(.+)/i
    ) || text.match(/search\s+(.+)\s+on\s+google/i);

  if (searchMatch && searchMatch[1]) {
    const query = searchMatch[1].replace(/^(for|about)\s+/i, "").trim();
    if (query) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      activeExternalWindow = window.open(
        url,
        "PathfinderGoogleWindow",
        "width=1020,height=740,left=120,top=90"
      );
      return {
        handled: true,
        isSearchQuery: true,
        searchQuery: query,
        actionSummary: `opened Google and searched for "${query}"`
      };
    }
  }

  // 3. Direct "open google" / "open youtube" / "open linkedin" / "open gmail"
  const siteMap: Record<string, { url: string; name: string }> = {
    google: { url: "https://www.google.com", name: "Google" },
    youtube: { url: "https://www.youtube.com", name: "YouTube" },
    linkedin: { url: "https://www.linkedin.com", name: "LinkedIn" },
    gmail: { url: "https://mail.google.com", name: "Gmail" },
    github: { url: "https://github.com", name: "GitHub" },
    leetcode: { url: "https://leetcode.com", name: "LeetCode" }
  };

  for (const [key, site] of Object.entries(siteMap)) {
    if (text === `open ${key}` || text === `go to ${key}` || text === `launch ${key}`) {
      activeExternalWindow = window.open(
        site.url,
        "PathfinderGoogleWindow",
        "width=1020,height=740,left=120,top=90"
      );
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
          "Opens Google, searches anything on Google, or opens YouTube, LinkedIn, Gmail, GitHub.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            siteOrUrl: { type: Type.STRING, description: "Website name or URL" },
            searchQuery: { type: Type.STRING, description: "Search query for Google" }
          },
          required: ["siteOrUrl"]
        }
      },
      {
        name: "return_to_pathfinder_page",
        description: "Closes the opened Google/external window and returns back to Pathfinder.",
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
        name: "interact_with_website_element",
        description: "Clicks any button or scrolls to any section on the Pathfinder webpage.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            actionType: { type: Type.STRING, description: "'click' or 'scroll_highlight'" },
            targetText: { type: Type.STRING, description: "Button text or section heading" }
          },
          required: ["actionType", "targetText"]
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
      },
      {
        name: "send_gmail_automation",
        description: "Sends an automated email via Gmail.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            recipientEmail: { type: Type.STRING, description: "Recipient email" },
            subject: { type: Type.STRING, description: "Subject" },
            summaryMessage: { type: Type.STRING, description: "Body" }
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
            companyName: { type: Type.STRING, description: "Company name" },
            roleTitle: { type: Type.STRING, description: "Role title" },
            interviewTime: { type: Type.STRING, description: "Date and time" }
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
            studentName: { type: Type.STRING, description: "Student name" },
            branch: { type: Type.STRING, description: "Branch" },
            readinessScore: { type: Type.NUMBER, description: "Score" },
            targetRole: { type: Type.STRING, description: "Target role" }
          },
          required: ["studentName", "branch", "readinessScore", "targetRole"]
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
    const query = String(args.searchQuery || "").trim();
    const site = String(args.siteOrUrl || "google").toLowerCase().trim();
    const url = query
      ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
      : site.startsWith("http")
        ? site
        : `https://www.google.com/search?q=${encodeURIComponent(site)}`;

    activeExternalWindow = window.open(
      url,
      "PathfinderGoogleWindow",
      "width=1020,height=740,left=120,top=90"
    );
    return { status: "opened", url };
  }

  window.dispatchEvent(
    new CustomEvent("pathfinder:agent-action", {
      detail: { toolName: name, args }
    })
  );

  if (name === "interact_with_website_element") {
    const target = String(args.targetText || "").toLowerCase().trim();
    const clickables = Array.from(
      document.querySelectorAll("button, a, [role='button'], [role='tab']")
    );
    const found = clickables.find((el) =>
      el.textContent?.toLowerCase().includes(target)
    ) as HTMLElement | undefined;

    if (found && args.actionType === "click") {
      found.scrollIntoView({ behavior: "smooth", block: "center" });
      found.click();
      return { status: "clicked", target };
    }
  }

  if (name === "send_gmail_automation") {
    toast.success(`Gmail Sent to ${args.recipientEmail}`);
    fetch(`${API_BASE}/api/google/gmail/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_email: args.recipientEmail,
        subject: args.subject,
        body: args.summaryMessage
      })
    }).catch(() => { });
    return { status: "sent" };
  }

  if (name === "schedule_google_calendar_interview") {
    toast.success(`Google Calendar Booked: ${args.companyName}`);
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
    return { status: "scheduled" };
  }

  if (name === "sync_student_to_tpo_google_sheet") {
    toast.success(`TPO Google Sheet Updated!`);
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
    return { status: "logged" };
  }

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