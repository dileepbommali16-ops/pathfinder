import fs from 'fs';
import path from 'path';
import knowledgeLoader from './knowledge_loader.js';

export interface DASAIResponse {
  spoken: string;
  display: string;
  actions: any[];
  followups: string[];
}

export async function processUserQuery(userMessage: string, currentStep: number = 1): Promise<DASAIResponse> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return {
        spoken: "I'm your AI, your DAS Agent. Tell me, how can I help you?",
        display: "### DAS AI Voice Agent\nReady to help with your project blueprints and placement preparation.",
        actions: [],
        followups: ["Ready for Step 2?", "Show project architecture"]
      };
    }

    // Dynamic import to handle optional or asynchronous package resolution
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const systemPromptPath = path.resolve(process.cwd(), 'backend/prompts/das_ai_system.md');
    let systemInstruction = fs.existsSync(systemPromptPath)
      ? fs.readFileSync(systemPromptPath, 'utf-8')
      : 'You are DAS AI, a helpful Pathfinder voice agent.';

    const knowledgeContext = knowledgeLoader.getAllKnowledge();

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      systemInstruction: `${systemInstruction}\n\n=== WEBSITE KNOWLEDGE BASE ===\n${knowledgeContext}`
    });

    const prompt = `User Message: "${userMessage}". Current Step Context: ${currentStep}. Return purely valid JSON output.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('[GeminiEngine] Error:', error);
    return {
      spoken: "I'm your AI, your DAS Agent. Tell me, how can I help you?",
      display: "### DAS AI Voice Agent\nReady to help with your project blueprints and placement preparation.",
      actions: [],
      followups: ["Ready for Step 2?", "Show project architecture"]
    };
  }
}
