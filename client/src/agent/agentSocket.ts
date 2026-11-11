import { audioEngine } from "./audioIO";
import { executeWebsiteControl, WebsiteControlArgs } from "./toolRunner";

export type UserHonorificRole = "boss" | "sir";

const GOOGLE_LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

const RENDER_WS_URL =
  import.meta.env.VITE_WS_URL ||
  "wss://pathfinder-backend-klrp.onrender.com/agent/ws";

class DasAgentSocket {
  private ws: WebSocket | null = null;
  private isDirectGoogle = false;
  private preConnectAudioQueue: string[] = [];
  private pendingTexts: string[] = [];
  public isConnected = false;
  public currentRole: UserHonorificRole = "boss";

  public connect(
    role: UserHonorificRole = "boss",
    onTranscript?: (text: string) => void,
    onStatusChange?: (connected: boolean) => void,
    navigateFn?: (path: string) => void,
    onUserTranscript?: ((text: string) => void) | string,
    onInterrupted?: () => void
  ) {
    this.currentRole = role;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const userTranscriptCb = typeof onUserTranscript === "function" ? onUserTranscript : undefined;

    if (apiKey) {
      this.isDirectGoogle = true;
      this.ws = new WebSocket(`${GOOGLE_LIVE_WS_URL}?key=${apiKey}`);
    } else {
      this.isDirectGoogle = false;
      this.ws = new WebSocket(`${RENDER_WS_URL}?role=${encodeURIComponent(role)}`);
    }

    this.ws.onopen = () => {
      if (!this.isDirectGoogle) {
        this.isConnected = true;
        onStatusChange?.(true);
        onTranscript?.("DAS Online (Connected via Render Cloud)!");
        this.flushPendingMessages();
        return;
      }

      const systemPrompt =
        role === "boss"
          ? "You are DAS, the 3D AI Co-Pilot of PATHFINDER 2.0 created by Bommali Dileep. Always address him warmly as 'Boss'. Speak fluently in Telugu, English, or Hindi."
          : "You are DAS, the 3D AI Co-Pilot of PATHFINDER 2.0. Always address the user politely as 'Sir'. Speak fluently in Telugu, English, or Hindi.";

      const setupPayload = {
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
            parts: [{ text: systemPrompt }],
          },
        },
      };

      this.ws?.send(JSON.stringify(setupPayload));
    };

    this.ws.onmessage = async (event) => {
      try {
        const rawText =
          event.data instanceof Blob ? await event.data.text() : event.data;
        const data = JSON.parse(rawText);

        // 1. Direct Google AI Studio Setup Complete
        if (data.setupComplete !== undefined) {
          this.isConnected = true;
          onStatusChange?.(true);
          onTranscript?.("DAS Online (Puck Voice Ready)! Speak or type now, Boss.");
          this.flushPendingMessages();
          return;
        }

        // 2. Render Backend Status / Audio / Transcript
        if (data.type === "status" && data.status === "connected") {
          this.isConnected = true;
          onStatusChange?.(true);
          onTranscript?.(`DAS Online (${data.voice || "Puck"} Voice Ready)!`);
          this.flushPendingMessages();
          return;
        }

        if (data.type === "audio" && data.pcm_base64) {
          audioEngine.playPcmChunk(data.pcm_base64, data.sample_rate || 24000);
          return;
        }

        if (data.type === "transcript" && data.text) {
          onTranscript?.(data.text);
          return;
        }

        if (data.type === "user_transcript" && data.text) {
          userTranscriptCb?.(data.text);
          return;
        }

        if (data.type === "interrupted") {
          audioEngine.clearAudioQueue();
          onInterrupted?.();
          return;
        }

        if (data.type === "error" && data.message) {
          onTranscript?.(`Server Error: ${data.message}`);
          return;
        }

        // 3. Direct Google AI Studio Audio & Text Stream
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

        if (data.serverContent?.interrupted) {
          audioEngine.clearAudioQueue();
          onInterrupted?.();
        }

        const fnCalls = data.toolCall?.functionCalls;
        if (fnCalls && Array.isArray(fnCalls)) {
          for (const fc of fnCalls) {
            if (fc.name === "control_website" || fc.name === "navigate_ui") {
              executeWebsiteControl(fc.args as WebsiteControlArgs, navigateFn);
            }
          }
        }
      } catch (err) {
        console.error("WS Message Parse Error:", err);
      }
    };

    this.ws.onerror = () => {
      onStatusChange?.(false);
      onTranscript?.(
        apiKey
          ? "WebSocket connecting to Google AI Studio..."
          : "Connecting to Render backend... (Free-tier servers take ~15s to wake up on first connection)"
      );
    };

    this.ws.onclose = (e) => {
      this.isConnected = false;
      onStatusChange?.(false);
      if (e.reason) {
        onTranscript?.(`Connection: ${e.reason}`);
      }
    };
  }

  private flushPendingMessages() {
    while (this.preConnectAudioQueue.length > 0) {
      const chunk = this.preConnectAudioQueue.shift();
      if (chunk) this.sendAudioChunk(chunk);
    }
    while (this.pendingTexts.length > 0) {
      const nextText = this.pendingTexts.shift();
      if (nextText) this.sendTextCommand(nextText);
    }
  }

  public sendAudioChunk(base64Pcm: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) {
      if (this.preConnectAudioQueue.length < 100) {
        this.preConnectAudioQueue.push(base64Pcm);
      }
      return;
    }

    if (this.isDirectGoogle) {
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
    } else {
      this.ws.send(JSON.stringify({ type: "audio", pcm_base64: base64Pcm }));
    }
  }

  public sendVideoFrame(base64Jpeg: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) return;
    if (this.isDirectGoogle) {
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "image/jpeg",
                data: base64Jpeg,
              },
            ],
          },
        })
      );
    } else {
      this.ws.send(JSON.stringify({ type: "frame", jpeg_base64: base64Jpeg }));
    }
  }

  public sendTextCommand(text: string) {
    if (!text.trim()) return;
    audioEngine.initContext();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) {
      this.pendingTexts.push(text);
      return;
    }

    if (this.isDirectGoogle) {
      this.ws.send(
        JSON.stringify({
          clientContent: {
            turns: [{ role: "user", parts: [{ text }] }],
            turnComplete: true,
          },
        })
      );
    } else {
      this.ws.send(JSON.stringify({ type: "text", text }));
    }
  }

  public switchRole(role: UserHonorificRole) {
    this.currentRole = role;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.isDirectGoogle) {
        this.sendTextCommand(
          role === "boss"
            ? "Address me as Boss from now on."
            : "Address me as Sir from now on."
        );
      } else {
        this.ws.send(JSON.stringify({ type: "role_switch", role }));
      }
    }
  }

  public disconnect() {
    audioEngine.stopMicCapture();
    audioEngine.clearAudioQueue();
    this.preConnectAudioQueue = [];
    this.pendingTexts = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const dasSocket = new DasAgentSocket();
