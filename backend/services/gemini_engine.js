let GoogleGenerativeAI;
try {
    GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch {
    GoogleGenerativeAI = null;
}
const fs = require('fs');
const path = require('path');
const knowledgeLoader = require('./knowledge_loader');

const genAI = GoogleGenerativeAI ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '') : null;


async function processUserQuery(userMessage, currentStep = 1) {
    try {
        const systemPromptPath = path.join(__dirname, '../prompts/das_ai_system.md');
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
            followups: []
        };
    }
}

module.exports = { processUserQuery };
