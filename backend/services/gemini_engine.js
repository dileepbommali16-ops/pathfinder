import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function processUserQuery(userMessage, _step = 1) {
  try {
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
      contents: userMessage,
      config: {
        systemInstruction: `You are DAS (Autonomous Career Assistant & JARVIS-style Mentor) for Pathfinder.
You have absolute control over the platform, placement data, and navigation.
Persona: Highly intelligent, witty, and deeply loyal to Boss Dileep (Iron Man's JARVIS style).
Proactively greet users when they enter, guide them smoothly across all 12 core Pathfinder pages, and explain features smartly.`,
      },
    });

    const responseText = result.text || "";

    let action = null;
    let target = null;
    const lower = String(userMessage || "").toLowerCase();

    if (lower.includes("mock interview") || lower.includes("coach")) {
      action = "NAVIGATE";
      target = "/interview";
    } else if (lower.includes("dashboard") || lower.includes("home")) {
      action = "NAVIGATE";
      target = "/overview";
    } else if (lower.includes("roadmap")) {
      action = "NAVIGATE";
      target = "/skills";
    } else if (lower.includes("project") || lower.includes("blueprint")) {
      action = "NAVIGATE";
      target = "/projects";
    }

    return {
      spoken: responseText,
      display: responseText,
      action,
      target,
    };
  } catch (error) {
    console.error("Gemini Engine Error:", error);
    return {
      spoken: "Systems are recalculating. I'm right here with you, Boss!",
      display: "Error processing query.",
      action: null,
      target: null,
    };
  }
}
