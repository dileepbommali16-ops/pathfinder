import { audioEngine } from "./audioIO";
import { executeWebsiteControl, WebsiteControlArgs } from "./toolRunner";

export type UserHonorificRole = "boss" | "sir";

const DEFAULT_WS_URL =
  (import.meta as any).env?.VITE_WS_URL ||
  "wss://pathfinder-backend-klrp.onrender.com/agent/ws";

export interface AgentSocketCallbacks {
  onTranscript?: (text: string) => void;
  onUserTranscript?: (text: string) => void;
  onStatusChange?: (connected: boolean) => void;
  navigateFn?: (path: string) => void;
  onInterrupted?: () => void;
  onError?: (err: string) => void;
}

class DasAgentSocket {
  private ws: WebSocket | null = null;
  public isConnected = false;
  private pingInterval: any = null;
  private preConnectAudioQueue: string[] = [];
  public currentRole: UserHonorificRole = "boss";

  private callbacks: AgentSocketCallbacks = {};

  public connect(
    role: UserHonorificRole = "boss",
    onTranscript?: (text: string) => void,
    onStatusChange?: (connected: boolean) => void,
    navigateFn?: (path: string) => void,
    onUserTranscript?: (text: string) => void,
    onInterrupted?: () => void
  ) {
    this.currentRole = role;
    this.callbacks = {
      onTranscript,
      onUserTranscript,
      onStatusChange,
      navigateFn,
      onInterrupted,
    };

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const baseWs = (import.meta as any).env?.VITE_WS_URL || DEFAULT_WS_URL;
    let wsUrl: string;
    try {
      const url = new URL(baseWs);
      url.searchParams.set("role", role);
      wsUrl = url.toString();
    } catch {
      wsUrl = `${baseWs}?role=${role}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e: any) {
      this.callbacks.onError?.(e?.message || "Failed to create WebSocket");
      this.callbacks.onStatusChange?.(false);
      return;
    }

    this.ws.onopen = () => {
      // Start ping heartbeat every 15s to keep Render connection warm
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 15000);
    };

    this.ws.onmessage = async (event) => {
      try {
        const rawText =
          event.data instanceof Blob ? await event.data.text() : event.data;
        const msg = JSON.parse(rawText);

        switch (msg.type) {
          case "status":
            if (msg.status === "connected") {
              this.isConnected = true;
              this.callbacks.onStatusChange?.(true);
              this.callbacks.onTranscript?.(
                `DAS Online (Model: ${msg.model || "gemini-3.8-live"}, Voice: ${msg.voice || "Puck"})`
              );
              this.flushPreConnectAudio();
            }
            break;

          case "audio":
            if (msg.pcm_base64) {
              audioEngine.playPcmChunk(msg.pcm_base64, msg.sample_rate || 24000);
            }
            break;

          case "transcript":
            if (msg.text) {
              this.callbacks.onTranscript?.(msg.text);
            }
            break;

          case "user_transcript":
            if (msg.text) {
              this.callbacks.onUserTranscript?.(msg.text);
            }
            break;

          case "interrupted":
            audioEngine.clearAudioQueue();
            this.callbacks.onInterrupted?.();
            break;

          case "tool_call":
            if (msg.name === "control_website" || msg.name === "navigate_ui") {
              executeWebsiteControl(
                msg.args as WebsiteControlArgs,
                this.callbacks.navigateFn
              );
            }
            break;

          case "error":
            this.callbacks.onError?.(msg.message);
            this.callbacks.onTranscript?.(`Server Error: ${msg.message}`);
            break;

          case "pong":
          case "turn_complete":
          case "automation_status":
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("DAS WS Message Parse Error:", err);
      }
    };

    this.ws.onerror = (e) => {
      console.warn("DAS WebSocket error:", e);
      this.callbacks.onTranscript?.(
        "WebSocket Error: Backend live stream unreachable. Verify Render backend status."
      );
      this.callbacks.onError?.("WebSocket connection error");
    };

    this.ws.onclose = (e) => {
      this.isConnected = false;
      this.callbacks.onStatusChange?.(false);
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      if (e.reason) {
        this.callbacks.onTranscript?.(`Disconnected: ${e.reason}`);
      }
    };
  }

  private flushPreConnectAudio() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      while (this.preConnectAudioQueue.length > 0) {
        const chunk = this.preConnectAudioQueue.shift();
        if (chunk) {
          this.ws.send(JSON.stringify({ type: "audio", pcm_base64: chunk }));
        }
      }
    }
  }

  // Send 16kHz Mic PCM Audio to Render FastAPI /agent/ws
  public sendAudioChunk(base64Pcm: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: "audio",
          pcm_base64: base64Pcm,
        })
      );
    } else {
      // Buffer chunk to fix microphone startup race
      if (this.preConnectAudioQueue.length < 100) {
        this.preConnectAudioQueue.push(base64Pcm);
      }
    }
  }

  // Send JPEG frame (1 FPS) for camera/video input
  public sendVideoFrame(base64Jpeg: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      this.ws.send(
        JSON.stringify({
          type: "frame",
          jpeg_base64: base64Jpeg,
        })
      );
    }
  }

  // Send Text command to Render FastAPI /agent/ws
  public sendTextCommand(text: string) {
    if (!text.trim()) return;
    audioEngine.initContext();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "text",
        text,
      })
    );
  }

  public switchRole(role: UserHonorificRole) {
    this.currentRole = role;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "role_switch", role }));
    }
  }

  public disconnect() {
    audioEngine.stopMicCapture();
    audioEngine.clearAudioQueue();
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.preConnectAudioQueue = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const dasSocket = new DasAgentSocket();
