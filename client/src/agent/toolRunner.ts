// client/src/agent/toolRunner.ts
import { Type, FunctionDeclaration } from "@google/genai";

// Voice Pipeline Stages used by AgentLayout
export type VoicePipelineStage = "idle" | "listening" | "thinking" | "speaking";

export interface ToolCallPayload {
  id?: string;
  name: string;
  args: Record<string, any>;
}

// 1. Gemini ki cheppe Website Automation Tools list
export const PATHFINDER_TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: "navigate_dashboard_tab",
        description: "Switches the active module or tab on the Pathfinder website screen.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            tabName: {
              type: Type.STRING,
              description:
                "Tab ID to open: 'overview', 'projects', 'defense', 'interview', 'resume', 'roadmap', 'skill-gap', 'what-if', or 'cohort'."
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
        description: "Opens one of the 23 flagship capstone project blueprints by its number (1 to 23).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            blueprintNumber: {
              type: Type.NUMBER,
              description: "Blueprint number from 1 to 23"
            }
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
        description: "Scrolls the webpage smoothly and highlights a specific section or card on screen.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            targetTextOrId: {
              type: Type.STRING,
              description: "Section ID or visible heading text on screen"
            }
          },
          required: ["targetTextOrId"]
        }
      },
      {
        name: "click_button_on_screen",
        description: "Clicks any button on the website automatically based on its label text.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            buttonText: {
              type: Type.STRING,
              description: "Visible text on the button to click"
            }
          },
          required: ["buttonText"]
        }
      },
      {
        name: "update_readiness_score",
        description: "Updates the student's live placement readiness score after answering a viva question.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            scoreDelta: {
              type: Type.NUMBER,
              description: "Points to add or subtract"
            },
            feedback: {
              type: Type.STRING,
              description: "Short evaluation note"
            }
          },
          required: ["scoreDelta", "feedback"]
        }
      }
    ]
  }
];

// 2. Gemini tool call pampagane Website meedha action chese executor
export async function executeWebsiteTool(
  name: string,
  args: Record<string, any>
): Promise<Record<string, any>> {
  console.log(`[Pathfinder Automation] Running tool: ${name}`, args);

  // Trigger existing Home.tsx DAS Events
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

  window.dispatchEvent(
    new CustomEvent("pathfinder:agent-action", {
      detail: { toolName: name, args }
    })
  );

  if (name === "scroll_and_highlight") {
    const query = String(args.targetTextOrId || "").toLowerCase();
    const directEl =
      document.getElementById(query) ||
      document.querySelector(`[data-das-id="${query}"]`);
    const elements = Array.from(document.querySelectorAll("section, [data-das-id], div[id], h1, h2, h3, button"));
    const match = (directEl ||
      elements.find(
        (el) =>
          el.id?.toLowerCase().includes(query) ||
          el.getAttribute("data-das-id")?.toLowerCase().includes(query) ||
          el.textContent?.toLowerCase().includes(query)
      )) as HTMLElement | undefined;

    if (match) {
      match.scrollIntoView({ behavior: "smooth", block: "center" });
      match.style.transition = "all 0.3s ease";
      match.style.outline = "3px solid #00f5d4";
      match.style.boxShadow = "0 0 25px rgba(0, 245, 212, 0.6)";
      setTimeout(() => {
        match.style.outline = "";
        match.style.boxShadow = "";
      }, 3500);
      return { status: "highlighted", target: args.targetTextOrId };
    }
  }

  if (name === "click_button_on_screen") {
    const targetLabel = String(args.buttonText || "").toLowerCase();
    const buttons = Array.from(document.querySelectorAll("button, a[role='button']"));
    const btn = buttons.find((b) => b.textContent?.toLowerCase().includes(targetLabel)) as HTMLElement | undefined;

    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", block: "center" });
      btn.click();
      return { status: "clicked", button: args.buttonText };
    }
    return { status: "not_found", button: args.buttonText };
  }

  return { status: "executed", tool: name, args };
}

// Aliases and Exports required by AgentLayout.tsx & agentSocket.ts
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
  payload: ToolCallPayload,
  onNavigate?: (route: string) => void
): Promise<Record<string, any>> {
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


// Aliases and Exports required by AgentLayout.tsx & agentSocket.ts
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
  payload: ToolCallPayload,
  onNavigate?: (route: string) => void
): Promise<Record<string, any>> {
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