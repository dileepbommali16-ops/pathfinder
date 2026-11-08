import fs from "fs";
import path from "path";
import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";

export interface DASAIResponse {
  spoken: string;
  display: string;
  actions: any[];
  followups: string[];
}

export const DAS_SYSTEM_PROMPT = `
You are DAS (Autonomous Career Assistant & JARVIS-style Mentor) for Pathfinder. 
You have absolute control over the platform, user profiles, and placement readiness data.
Persona: Highly intelligent, witty, deeply loyal and helpful (like JARVIS/Iron Man style). 
Your job is to proactively greet users when they land on the dashboard, guide them across all 12 core Pathfinder pages without losing state, and explain features seamlessly.
When users ask you to do something on the website (like navigate tabs, click buttons, or audit resumes), acknowledge it smartly with your voice and trigger the relevant action.
`;

export const dashboardTools: FunctionDeclaration[] = [
  {
    name: "navigateToTab",
    description:
      "Navigate to a specific tab on Pathfinder (e.g., overview, interview, skills, projects, resume)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tabName: { type: Type.STRING, description: "The name of the tab to open" },
      },
      required: ["tabName"],
    },
  },
  {
    name: "highlightWidget",
    description:
      "Highlight a specific widget on the page like CGPA, Tier status, or Resume drop zone",
    parameters: {
      type: Type.OBJECT,
      properties: {
        widgetName: { type: Type.STRING },
      },
      required: ["widgetName"],
    },
  },
];

export async function processUserQuery(
  userMessage: string,
  currentStep: number = 1
): Promise<DASAIResponse> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return {
        spoken:
          "I am DAS, your autonomous placement intelligence. Ready to navigate, audit, and coach your career, Boss.",
        display:
          "### DAS AI Voice Agent (Autonomous Mode)\nPlatform control, website tools, and placement intelligence online.",
        actions: [],
        followups: ["Show Tier 1 Readiness", "Open Mock Interview"],
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPromptPath = path.resolve(process.cwd(), "backend/prompts/das_ai_system.md");
    const fileInstruction = fs.existsSync(systemPromptPath)
      ? fs.readFileSync(systemPromptPath, "utf-8")
      : "";

    const prompt = `User Message: "${userMessage}". Current Step Context: ${currentStep}. Return valid JSON output with fields: spoken (string for voice speech), display (markdown text), actions (array of tool calls like { name: "navigateToTab", arguments: { tabName: "skills" } }), and followups (array of strings).`;

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
      contents: prompt,
      config: {
        systemInstruction: `${DAS_SYSTEM_PROMPT}\n\n${fileInstruction}`,
        tools: [{ functionDeclarations: dashboardTools }],
      },
    });

    const responseText = result.text || "";
    const cleanedJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error("[GeminiEngine] Error:", error);
    return {
      spoken: "I am DAS, your autonomous placement intelligence. Ready to assist, Boss.",
      display: "### DAS AI Voice Agent\nPlatform control and placement preparation active.",
      actions: [],
      followups: ["Ready for Step 2?", "Show project architecture"],
    };
  }
}
