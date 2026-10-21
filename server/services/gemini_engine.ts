import fs from 'fs';
import path from 'path';
import knowledgeLoader from './knowledge_loader.js';

export interface DASAIResponse {
  spoken: string;
  display: string;
  actions: any[];
  followups: string[];
}

export const DAS_SYSTEM_PROMPT = `
You are DAS (Autonomous Career Assistant & JARVIS-style Mentor) for Pathfinder. 
You have absolute control over the platform, user profiles, and placement readiness data.
Persona: Highly intelligent, witty, slightly sarcastic yet deeply loyal and helpful (like JARVIS/Iron Man style). 
Your job is to proactively greet users when they land on the dashboard, guide them across all 11 core Pathfinder pages without losing state, and explain features seamlessly.
When users ask you to do something on the website (like navigate tabs, click buttons, or audit resumes), acknowledge it smartly with your voice and trigger the relevant action.
`;

// Define tools that Gemini can call to control the browser UI (Function Calling / MCP Style)
export const dashboardTools = [
  {
    name: "navigateToTab",
    description: "Navigate to a specific tab on Pathfinder (e.g., dashboard, mock-interview, roadmap, blueprints)",
    parameters: {
      type: "OBJECT",
      properties: {
        tabName: { type: "STRING", description: "The name of the tab to open" }
      },
      required: ["tabName"]
    }
  },
  {
    name: "highlightWidget",
    description: "Highlight a specific widget on the page like CGPA, Tier status, or Resume drop zone",
    parameters: {
      type: "OBJECT",
      properties: {
        widgetName: { type: "STRING" }
      },
      required: ["widgetName"]
    }
  }
];

export async function processUserQuery(userMessage: string, currentStep: number = 1): Promise<DASAIResponse> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return {
        spoken: "I am DAS, your autonomous placement intelligence. Ready to navigate, audit, and coach your career, sir.",
        display: "### DAS AI Voice Agent (Autonomous Mode)\nPlatform control, website tools, and placement intelligence online.",
        actions: [],
        followups: ["Show Tier 1 Readiness", "Open Mock Interview"]
      };
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const systemPromptPath = path.resolve(process.cwd(), 'backend/prompts/das_ai_system.md');
    let fileInstruction = fs.existsSync(systemPromptPath)
      ? fs.readFileSync(systemPromptPath, 'utf-8')
      : '';

    const knowledgeContext = knowledgeLoader.getAllKnowledge();

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      systemInstruction: `${DAS_SYSTEM_PROMPT}\n\n${fileInstruction}\n\n=== WEBSITE KNOWLEDGE BASE ===\n${knowledgeContext}`,
      tools: [{ functionDeclarations: dashboardTools as any }]
    });

    const prompt = `User Message: "${userMessage}". Current Step Context: ${currentStep}. Return valid JSON output with fields: spoken (string for voice speech), display (markdown text), actions (array of tool calls like { name: "navigateToTab", arguments: { tabName: "roadmap" } }), and followups (array of strings).`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('[GeminiEngine] Error:', error);
    return {
      spoken: "I am DAS, your autonomous placement intelligence. Ready to assist, sir.",
      display: "### DAS AI Voice Agent\nPlatform control and placement preparation active.",
      actions: [],
      followups: ["Ready for Step 2?", "Show project architecture"]
    };
  }
}