// client/src/agent/toolRunner.ts
import { Type, FunctionDeclaration } from "@google/genai";

export const PATHFINDER_TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: "navigate_dashboard_tab",
        description: "Switches the active tab on Pathfinder and optionally scrolls to a specific section.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            tabName: {
              type: Type.STRING,
              description:
                "Tab ID: 'overview', 'interview', 'action', 'skills', 'projects', 'analytics', 'resume', 'branches', 'defense', 'profile', 'roles', or 'missions'."
            },
            sectionId: {
              type: Type.STRING,
              description:
                "Optional section to scroll to on overview: 'hero-metrics', 'company-radar', 'career-twin', 'next-actions', 'action-center', 'whatif-simulator', 'live-verifier', or 'skill-gap'."
            }
          },
          required: ["tabName"]
        }
      },
      {
        name: "open_blueprint",
        description: "Opens one of the 23 capstone project blueprints by number (1 to 23).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            blueprintNumber: { type: Type.NUMBER, description: "Blueprint number (1-23)" }
          },
          required: ["blueprintNumber"]
        }
      },
      {
        name: "launch_mock_interview",
        description: "Opens the Live AI Mock Interview simulator for a specific company and role.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            company: { type: Type.STRING, description: "Target company name (e.g., Google, Razorpay, Amazon, TCS)" },
            role: { type: Type.STRING, description: "Target role title (e.g., Full Stack Engineer, SDE-1)" }
          },
          required: ["company", "role"]
        }
      },
      {
        name: "open_one_page_resume",
        description: "Opens the instant 1-Page FAANG/ATS PDF Resume Generator modal on screen.",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      },
      {
        name: "update_student_profile",
        description: "Updates a field in the student's profile (cgpa, backlogs, coding, communication, internships, branch, targetRole) and recalculates placement probability.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            field: {
              type: Type.STRING,
              description: "Field name: 'cgpa', 'backlogs', 'coding', 'communication', 'internships', 'branch', or 'targetRole'"
            },
            value: {
              type: Type.STRING,
              description: "New value for the field (e.g., '8.5', '0', 'CSE', 'Full Stack Engineer')"
            }
          },
          required: ["field", "value"]
        }
      },
      {
        name: "scroll_and_highlight",
        description: "Smoothly scrolls to and highlights any section or card on the current webpage.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            targetTextOrId: {
              type: Type.STRING,
              description: "data-das-id, element ID, or heading text to highlight"
            }
          },
          required: ["targetTextOrId"]
        }
      },
      {
        name: "update_readiness_score",
        description: "Adjusts the student's live placement readiness percentage after evaluating their viva or interview answer.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            scoreDelta: { type: Type.NUMBER, description: "Percentage points to add or subtract (e.g. +3 or -2)" },
            feedback: { type: Type.STRING, description: "Brief reason for the score change" }
          },
          required: ["scoreDelta", "feedback"]
        }
      }
    ]
  }
];

export async function executeWebsiteTool(
  name: string,
  args: Record<string, any>
): Promise<Record<string, any>> {
  console.log(`[Pathfinder ToolRunner] Executing: ${name}`, args);

  // 1. Existing Home.tsx DAS Events trigger cheyadam
  if (name === "navigate_dashboard_tab") {
    window.dispatchEvent(
      new CustomEvent("das-navigate-tab", {
        detail: { tab: args.tabName, scrollTarget: args.sectionId }
      })
    );
  } else if (name === "open_one_page_resume") {
    window.dispatchEvent(new CustomEvent("das-open-resume-builder"));
  } else if (name === "launch_mock_interview") {
    window.dispatchEvent(
      new CustomEvent("das-open-mock-interview", {
        detail: { company: args.company, role: args.role }
      })
    );
  } else if (name === "update_student_profile") {
    window.dispatchEvent(
      new CustomEvent("das-update-profile", {
        detail: { field: args.field, value: args.value }
      })
    );
  }

  // 2. Kotha pathfinder:agent-action event dispatch
  window.dispatchEvent(
    new CustomEvent("pathfinder:agent-action", {
      detail: { toolName: name, args }
    })
  );

  // 3. Scroll & Neon Highlight effect
  if (name === "scroll_and_highlight") {
    const query = String(args.targetTextOrId || "").toLowerCase();
    const directEl =
      document.getElementById(query) ||
      document.querySelector(`[data-das-id="${query}"]`);

    const elements = Array.from(
      document.querySelectorAll("section, [data-das-id], div[id], h1, h2, h3")
    );
    const match = (directEl ||
      elements.find(
        (el) =>
          el.id?.toLowerCase().includes(query) ||
          el.getAttribute("data-das-id")?.toLowerCase().includes(query) ||
          el.textContent?.toLowerCase().includes(query)
      )) as HTMLElement | undefined;

    if (match) {
      match.scrollIntoView({ behavior: "smooth", block: "center" });
      const prevOutline = match.style.outline;
      match.style.transition = "all 0.3s ease";
      match.style.outline = "2px solid #ef4444";
      match.style.boxShadow = "0 0 30px rgba(239, 68, 68, 0.45)";
      setTimeout(() => {
        match.style.outline = prevOutline;
        match.style.boxShadow = "none";
      }, 3500);
      return { status: "highlighted", target: args.targetTextOrId };
    }
  }

  return { status: "success", tool: name, args };
}

export type VoicePipelineStage = "idle" | "listening" | "thinking" | "speaking";

export interface ToolCallPayload {
  id: string;
  name: string;
  args: Record<string, any>;
  requires_confirmation?: boolean;
}

export function runTool(
  name: string,
  args: Record<string, any> = {},
  _navigate?: (to: string) => void
): { navigated?: boolean; explain?: boolean; success?: boolean } {
  void executeWebsiteTool(name, args);
  return { success: true, navigated: name.includes("navigate") || name === "open_blueprint" };
}

export async function executeToolCall(
  tool: ToolCallPayload,
  _navigate?: (route: string) => void
): Promise<{ success: boolean; data?: any }> {
  const data = await executeWebsiteTool(tool.name, tool.args || {});
  return { success: true, data };
}

export function snapshot() {
  return {
    route: typeof window !== "undefined" ? window.location.pathname : "/",
    title: typeof document !== "undefined" ? document.title : "Pathfinder 2.0",
    text: "",
    elements: [],
  };
}
