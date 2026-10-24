/**
 * agentSocket - Manages WebSocket connection to /agent/ws
 * Dispatches audio, text messages, tool calls, and interruption events.
 * File: client/src/agent/agentSocket.ts
 */

import { audioManager } from "./audioIO";
import { executeToolCall, ToolCallPayload } from "./toolRunner";

export interface AgentMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: number;
}

export interface AgentSocketCallbacks {
  onMessage: (msg: AgentMessage) => void;
  onStatusChange: (status: "connecting" | "connected" | "disconnected" | "error") => void;
  onRoleDetected: (role: string, isOwner: boolean) => void;
  onNavigate?: (route: string) => void;
}

export class AgentSocketClient {
  private ws: WebSocket | null = null;
  private url: string = "";
  private callbacks: AgentSocketCallbacks;
  private reconnectTimer: number | null = null;
  private isExplicitlyClosed: boolean = false;

  constructor(callbacks: AgentSocketCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(token?: string) {
    this.isExplicitlyClosed = false;
    this.callbacks.onStatusChange("connecting");

    // Construct WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    let wsUrl = `${protocol}//${host}/agent/ws`;

    // Support dev environment proxy or explicit backend url
    const apiUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL;
    if (apiUrl && apiUrl.startsWith("http")) {
      const cleanApi = apiUrl.replace(/^http/, "ws").replace(/\/$/, "");
      wsUrl = `${cleanApi}/agent/ws`;
    }

    if (token) {
      wsUrl += `?token=${encodeURIComponent(token)}`;
    }

    this.url = wsUrl;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.callbacks.onStatusChange("connected");
      };

      this.ws.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type } = payload;

          if (type === "connected") {
            this.callbacks.onRoleDetected(payload.role || "student", !!payload.is_owner);
            if (payload.greeting) {
              this.callbacks.onMessage({
                id: `greeting_${Date.now()}`,
                sender: "agent",
                text: payload.greeting,
                timestamp: Date.now(),
              });
            }
          } else if (type === "audio") {
            // Stream audio chunk to AudioManager for playback & lip sync
            if (payload.data) {
              await audioManager.playAudioChunk(payload.data);
            }
          } else if (type === "text") {
            // Spoken token or text message
            this.callbacks.onMessage({
              id: `msg_${Date.now()}_${Math.random()}`,
              sender: "agent",
              text: payload.text,
              timestamp: Date.now(),
            });
          } else if (type === "interrupted") {
            // User barge-in: clear playback queue immediately
            audioManager.clearPlaybackQueue();
          } else if (type === "tool_call") {
            const toolCall: ToolCallPayload = payload;
            const result = await executeToolCall(toolCall, this.callbacks.onNavigate);

            // Send tool result back to Gemini Live
            this.send({
              type: "tool_response",
              id: toolCall.id,
              name: toolCall.name,
              result,
            });
          }
        } catch (e) {
          console.error("[agentSocket] Message parse error:", e);
        }
      };

      this.ws.onclose = () => {
        this.callbacks.onStatusChange("disconnected");
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error("[agentSocket] WebSocket error:", err);
        this.callbacks.onStatusChange("error");
      };
    } catch (err) {
      this.callbacks.onStatusChange("error");
      this.scheduleReconnect();
    }
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  }

  public sendText(text: string) {
    this.send({ type: "text", text });
    this.callbacks.onMessage({
      id: `usr_${Date.now()}`,
      sender: "user",
      text,
      timestamp: Date.now(),
    });
  }

  public sendAudioChunk(base64Pcm: string) {
    this.send({ type: "audio_chunk", data: base64Pcm });
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, 4000);
  }
}
