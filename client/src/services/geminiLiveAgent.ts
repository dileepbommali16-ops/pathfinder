// @ts-nocheck
import { GoogleGenAI, Modality } from "@google/genai";
import { pathfinderTools } from "./pathfinderTools";
import { playPcm24kChunk } from "./audioStreamer";
import { runTool } from "@/agent/toolRunner";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
  apiVersion: "v1beta",
});

/**
 * Starts a unified Gemini Live WebSocket session (Voice + Brain + Website Tools).
 */
export async function startPathfinderAgent(onAudioChunk, onUiAction) {
  const session = await ai.live.connect({
    model:
      import.meta.env.VITE_GEMINI_LIVE_MODEL ||
      "gemini-2.5-flash-native-audio-latest",
    config: {
      responseModalities: [Modality.AUDIO],
      outputAudioTranscription: {},
      inputAudioTranscription: {},
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Puck", // Options: Puck, Charon, Kore, Fenrir, Aoede
          },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: "You are Pathfinder DAS, an AI Placement Coach with a 3D avatar created by Boss Dileep Bommali. Always address Dileep as Boss. Take live project vivas on the 23 capstone blueprints. Whenever a user mentions a project or tab, automatically call open_blueprint, highlight_section, or navigate to control the website screen.",
          },
        ],
      },
      tools: pathfinderTools,
    },
    callbacks: {
      onmessage: async (message) => {
        // 1. VOICE OUTPUT: Stream 24kHz PCM audio chunks to Speaker + 3D Avatar Lip-Sync
        const parts = message.serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          const audioData = part.inlineData?.data;
          if (audioData) {
            playPcm24kChunk(audioData);
            if (typeof onAudioChunk === "function") {
              onAudioChunk(audioData);
            }
          }
        }

        // 2. WEBSITE AUTOMATION: Execute tool calls in React UI and send response back
        if (message.toolCall?.functionCalls) {
          for (const call of message.toolCall.functionCalls) {
            const result =
              typeof onUiAction === "function"
                ? await onUiAction(call.name, call.args)
                : runTool(call.name, call.args || {}, (to) => {
                    window.location.hash = to;
                  });

            await session.sendToolResponse({
              functionResponses: [
                {
                  id: call.id,
                  name: call.name,
                  response: { status: "success", result },
                },
              ],
            });
          }
        }
      },
    },
  });

  return session;
}

