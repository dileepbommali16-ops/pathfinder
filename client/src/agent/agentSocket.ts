import { audioEngine } from "./audioIO";
import { executeWebsiteControl, WebsiteControlArgs } from "./toolRunner";

export type UserHonorificRole = "boss" | "sir";

// Direct Google AI Studio Multimodal Live WebSocket URL (v1beta)
const GOOGLE_LIVE_WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

class DasAgentSocket {
  private ws: WebSocket | null = null;
  public isConnected = false;

  public connect(
    role: UserHonorificRole = "boss",
    onTranscript?: (text: string) => void,
    onStatusChange?: (connected: boolean) => void,
    navigateFn?: (path: string) => void
  ) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      onTranscript?.("ERROR: Vercel Environment Variables lo VITE_GEMINI_API_KEY set cheyyaledu Boss!");
      onStatusChange?.(false);
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const wsUrl = `${GOOGLE_LIVE_WS_BASE}?key=${apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      const honorificInstruction =
        role === "boss"
          ? "You are DAS, the 3D AI Voice Co-Pilot of PATHFINDER 2.0 created by Bommali Dileep. Always address him as 'Boss' in every response. Speak fluently in Telugu, English, or Hindi."
          : "You are DAS, the 3D AI Voice Co-Pilot of PATHFINDER 2.0. Always address the user politely as 'Sir'. Speak fluently in Telugu, English, or Hindi.";

      // Step 1 of Google AI Studio Live WebSocket: Send Setup Config with Puck Voice
      const setupMessage = {
        setup: {
          model: "models/gemini-2.0-flash-exp",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Puck",
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: honorificInstruction }],
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: "control_website",
                  description: "Navigate PATHFINDER 2.0 pages ('/', '/blueprints', '/resume-studio', '/mock-interview') or scroll to sections.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      action: { type: "STRING" },
                      route: { type: "STRING" },
                      selector: { type: "STRING" },
                    },
                    required: ["action"],
                  },
                },
              ],
            },
          ],
        },
      };

      this.ws?.send(JSON.stringify(setupMessage));
    };

    this.ws.onmessage = async (event) => {
      try {
        // Google AI Studio WebSocket sends messages as Blob in the browser!
        const rawText =
          event.data instanceof Blob ? await event.data.text() : event.data;
        const data = JSON.parse(rawText);

        // 1. Setup Complete -> Now truly ONLINE!
        if (data.setupComplete) {
          this.isConnected = true;
          onStatusChange?.(true);
          onTranscript?.("DAS Connected with Puck Voice! Speak or type below, Boss.");
          return;
        }

        // 2. Receive 24kHz Puck Voice Audio & Drive Robot Face Lip-Sync
        const parts = data.serverContent?.modelTurn?.parts;
        if (parts && Array.isArray(parts)) {
          for (const part of parts) {
            if (part.inlineData?.data) {
              audioEngine.playPcmChunk(part.inlineData.data, 24000);
            }
            if (part.text) {
              onTranscript?.(part.text);
            }
          }
        }

        // 3. Stop audio immediately if user interrupts
        if (data.serverContent?.interrupted) {
          audioEngine.clearAudioQueue();
        }

        // 4. Website Navigation Tool Call
        const fnCalls = data.toolCall?.functionCalls;
        if (fnCalls && Array.isArray(fnCalls)) {
          for (const fc of fnCalls) {
            if (fc.name === "control_website") {
              executeWebsiteControl(fc.args as WebsiteControlArgs, navigateFn);
              this.ws?.send(
                JSON.stringify({
                  toolResponse: {
                    functionResponses: [
                      {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "ok" },
                      },
                    ],
                  },
                })
              );
            }
          }
        }
      } catch (err) {
        console.error("DAS WS Parse Error:", err);
      }
    };

    this.ws.onerror = () => {
      onTranscript?.("WebSocket Error: Check VITE_GEMINI_API_KEY & vercel.json CSP.");
      this.isConnected = false;
      onStatusChange?.(false);
    };

    this.ws.onclose = (e) => {
      this.isConnected = false;
      onStatusChange?.(false);
      if (e.reason) {
        onTranscript?.(`Disconnected: ${e.reason}`);
      }
    };
  }

  // Send 16kHz Mic PCM Audio directly to Google AI Studio
  public sendAudioChunk(base64Pcm: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64Pcm,
              },
            ],
          },
        })
      );
    }
  }

  // Send Text Message (e.g. "hello") directly to Google AI Studio
  public sendTextCommand(text: string) {
    if (!text.trim()) return;
    audioEngine.initContext();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        },
      })
    );
  }

  public switchRole(role: UserHonorificRole) {
    const notice =
      role === "boss"
        ? "From now on, address me as Boss."
        : "From now on, address me as Sir.";
    this.sendTextCommand(notice);
  }

  public disconnect() {
    audioEngine.stopMicCapture();
    audioEngine.clearAudioQueue();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const dasSocket = new DasAgentSocket();