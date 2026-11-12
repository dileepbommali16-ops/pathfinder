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
  private currentAgentTranscript = "";
  public isConnected = false;
  public currentRole: UserHonorificRole = "boss";

  // Persistent callback storage for auto-reconnection and multi-turn stability
  private savedRole: UserHonorificRole = "boss";
  private savedOnTranscript?: (text: string) => void;
  private savedOnStatusChange?: (connected: boolean) => void;
  private savedNavigateFn?: (path: string) => void;
  private savedOnUserTranscript?: (text: string) => void;
  private savedOnInterrupted?: () => void;
  private renderPingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private manualClose = false;

  public connect(
    role: UserHonorificRole = "boss",
    onTranscript?: (text: string) => void,
    onStatusChange?: (connected: boolean) => void,
    navigateFn?: (path: string) => void,
    onUserTranscript?: ((text: string) => void) | string,
    onInterrupted?: () => void
  ) {
    this.currentRole = role;
    this.savedRole = role;
    this.manualClose = false;
    if (onTranscript) this.savedOnTranscript = onTranscript;
    if (onStatusChange) this.savedOnStatusChange = onStatusChange;
    if (navigateFn) this.savedNavigateFn = navigateFn;
    if (typeof onUserTranscript === "function") this.savedOnUserTranscript = onUserTranscript;
    if (onInterrupted) this.savedOnInterrupted = onInterrupted;

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

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
        this.savedOnStatusChange?.(true);
        this.savedOnTranscript?.("DAS Online (Connected via Render Cloud)!");
        this.flushPendingMessages();

        // 20s keep-alive ping for Render backend (never send ping to Google AI Studio!)
        if (this.renderPingTimer) window.clearInterval(this.renderPingTimer);
        this.renderPingTimer = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 20000);
        return;
      }

      const systemPrompt =
        role === "boss"
          ? "You are DAS, the 3D AI Co-Pilot of PATHFINDER 2.0 created by Bommali Dileep. Always address him warmly as 'Boss'. Speak fluently in Telugu, English, or Hindi."
          : "You are DAS, the 3D AI Co-Pilot of PATHFINDER 2.0. Always address the user politely as 'Sir'. Speak fluently in Telugu, English, or Hindi.";

      const setupPayload = {
        setup: {
          model: "models/gemini-3.8-live",
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

        // Ignore keep-alive heartbeat pong
        if (data.type === "pong") return;

        // 1. Direct Google AI Studio Setup Complete
        if (data.setupComplete !== undefined) {
          this.isConnected = true;
          this.savedOnStatusChange?.(true);
          this.savedOnTranscript?.("DAS Online (Puck Voice Ready)! Speak or type now, Boss.");
          this.flushPendingMessages();
          return;
        }

        // 2. Render Backend Status / Audio / Transcript
        if (data.type === "status" && data.status === "connected") {
          this.isConnected = true;
          this.savedOnStatusChange?.(true);
          this.savedOnTranscript?.(`DAS Online (${data.voice || "Puck"} Voice Ready)!`);
          this.flushPendingMessages();
          return;
        }

        if (data.type === "audio" && data.pcm_base64) {
          audioEngine.playPcmChunk(data.pcm_base64, data.sample_rate || 24000);
          return;
        }

        if (data.type === "transcript" && data.text) {
          this.currentAgentTranscript += data.text;
          this.savedOnTranscript?.(this.currentAgentTranscript);
          return;
        }

        if (data.type === "turn_complete") {
          return;
        }

        if (data.type === "user_transcript" && data.text) {
          this.savedOnUserTranscript?.(data.text);
          return;
        }

        if (data.type === "interrupted") {
          this.currentAgentTranscript = "";
          audioEngine.clearAudioQueue();
          this.savedOnInterrupted?.();
          return;
        }

        if (data.type === "error" && data.message) {
          this.savedOnTranscript?.(`Server Error: ${data.message}`);
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
              this.currentAgentTranscript += part.text;
              this.savedOnTranscript?.(this.currentAgentTranscript);
            }
          }
        }

        if (data.serverContent?.turnComplete) {
          return;
        }

        if (data.serverContent?.interrupted) {
          this.currentAgentTranscript = "";
          audioEngine.clearAudioQueue();
          this.savedOnInterrupted?.();
        }

        const fnCalls = data.toolCall?.functionCalls;
        if (fnCalls && Array.isArray(fnCalls)) {
          for (const fc of fnCalls) {
            if (fc.name === "control_website" || fc.name === "navigate_ui") {
              executeWebsiteControl(fc.args as WebsiteControlArgs, this.savedNavigateFn);
            }
          }
        }
      } catch (err) {
        console.error("WS Message Parse Error:", err);
      }
    };

    this.ws.onerror = () => {
      this.isConnected = false;
      this.savedOnStatusChange?.(false);
      this.savedOnTranscript?.(
        apiKey
          ? "WebSocket connecting to Google AI Studio..."
          : "Connecting to Render backend..."
      );
    };

    this.ws.onclose = (e) => {
      this.isConnected = false;
      this.savedOnStatusChange?.(false);
      if (this.renderPingTimer) {
        window.clearInterval(this.renderPingTimer);
        this.renderPingTimer = null;
      }
      if (e.reason) {
        this.savedOnTranscript?.(`Connection: ${e.reason}`);
      }

      // Auto-reconnect so 2nd, 3rd, 50th question auto-reconnects seamlessly
      if (!this.manualClose) {
        if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = window.setTimeout(() => {
          this.ws = null;
          this.connect(
            this.savedRole,
            this.savedOnTranscript,
            this.savedOnStatusChange,
            this.savedNavigateFn,
            this.savedOnUserTranscript,
            this.savedOnInterrupted
          );
        }, 1000);
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
      if (nextText) this.sendImmediateText(nextText);
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
    this.currentAgentTranscript = "";
    audioEngine.initContext();
    audioEngine.clearAudioQueue();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) {
      this.pendingTexts.push(text);
      this.ws = null;
      this.connect(
        this.savedRole,
        this.savedOnTranscript,
        this.savedOnStatusChange,
        this.savedNavigateFn,
        this.savedOnUserTranscript,
        this.savedOnInterrupted
      );
      return;
    }

    this.sendImmediateText(text);
  }

  private sendImmediateText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

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
    this.savedRole = role;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.isDirectGoogle) {
        this.sendImmediateText(
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
    this.manualClose = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.renderPingTimer) {
      window.clearInterval(this.renderPingTimer);
      this.renderPingTimer = null;
    }
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
