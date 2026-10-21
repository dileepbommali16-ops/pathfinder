import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function processUserQuery(userMessage, step = 1) {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: `You are DAS (Autonomous Career Assistant & JARVIS-style Mentor) for Pathfinder. 
      You have absolute control over the platform, placement data, and navigation. 
      Persona: Highly intelligent, witty, slightly sarcastic yet deeply loyal and helpful (Iron Man's JARVIS style). 
      Proactively greet users when they enter, guide them smoothly across all 11 core Pathfinder pages, and explain features smartly.
      If the user wants to go to a tab or page (like dashboard, mock interview, roadmap, blueprints), respond with spoken text and include an action target.`
        });

        const result = await model.generateContent(userMessage);
        const responseText = result.response.text();

        // Simple action parsing check for navigation
        let action = null;
        let target = null;
        const lower = userMessage.toLowerCase();

        if (lower.includes('mock interview') || lower.includes('coach')) {
            action = 'NAVIGATE';
            target = '/coach';
        } else if (lower.includes('dashboard') || lower.includes('home')) {
            action = 'NAVIGATE';
            target = '/dashboard';
        } else if (lower.includes('roadmap')) {
            action = 'NAVIGATE';
            target = '/roadmap';
        }

        return {
            spoken: responseText,
            display: responseText,
            action: action,
            target: target
        };
    } catch (error) {
        console.error('Gemini Engine Error:', error);
        return {
            spoken: "Systems are recalculating. I'm right here with you!",
            display: "Error processing query."
        };
    }
}