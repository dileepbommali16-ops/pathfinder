import { audioEngine } from "./audioIO";
import { executeWebsiteControl, WebsiteControlArgs, executeBrowserTool, ToolCallArgs } from "./toolRunner";

const PROD_WS_URL =
  import.meta.env.VITE_WS_URL ||
  "wss://pathfinder-backend-klrp.onrender.com/agent/ws";

const PROD_API_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://pathfinder-backend-klrp.onrender.com";

export type UserHonorificRole = "boss" | "sir";

class DasAgentSocket {
  private ws: WebSocket | null = null;
  private heartbeatInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private manualClose: boolean = false;
  public isConnected: boolean = false;

  // Non-blocking parallel wakeup for Render container
  private warmUpRenderBackend() {
    try {
      fetch(`${PROD_API_URL}/health`, { method: "GET" }).catch(() => {});
    } catch {
      // Ignore background warmup notices
    }
  }

  public connect(
    role: UserHonorificRole = "boss",
    onTranscript?: (text: string) => void,
    onStatusChange?: (connected: boolean) => void,
    navigateFn?: (path: string) => void
  ) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.manualClose = false;

    // Fire background warmup without blocking the WebSocket handshake
    this.warmUpRenderBackend();

    // Immediately open WebSocket for fast connection
    this.ws = new WebSocket(`${PROD_WS_URL}?role=${role}`);

    this.ws.onopen = () => {
      this.isConnected = true;
      onStatusChange?.(true);

      // Clear old timer and start 20-second Ping to prevent Render 60s timeout
      if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = window.setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "pong") return;

        // 1. Play 24kHz Gemini Puck Voice & Drive 3D Lip-Sync
        if (data.type === "audio" && data.pcm_base64) {
          audioEngine.playPcmChunk(data.pcm_base64, data.sample_rate || 24000);
        }

        // 2. Clear audio playback immediately if Boss interrupts DAS
        if (data.type === "interrupted") {
          audioEngine.clearAudioQueue();
        }

        // 3. Display Live Transcript
        if (data.type === "transcript" && data.text) {
          onTranscript?.(data.text);
        }

        // 4. Autonomous Website Control (Routes, Scroll, Click, Highlight)
        if (data.type === "tool_call" && (data.name === "control_website" || data.name === "navigate_ui")) {
          executeWebsiteControl(data.args as WebsiteControlArgs, navigateFn);
        }
      } catch (err) {
        console.warn("[DasAgentSocket] Failed to parse message:", err);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      onStatusChange?.(false);
      if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);

      // Auto-reconnect after 2.5 seconds if dropped unexpectedly by Render
      if (!this.manualClose) {
        this.reconnectTimeout = window.setTimeout(() => {
          this.connect(role, onTranscript, onStatusChange, navigateFn);
        }, 2500);
      }
    };

    this.ws.onerror = (err) => {
      console.warn("[DasAgentSocket] Connection notice:", err);
    };
  }

  public sendAudioChunk(base64Pcm: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "audio", pcm_base64: base64Pcm }));
    }
  }

  public sendTextCommand(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "text", text }));
    }
  }

  public switchRole(role: UserHonorificRole) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "role_switch", role }));
    }
  }

  public disconnect() {
    this.manualClose = true;
    audioEngine.stopMicCapture();
    audioEngine.clearAudioQueue();
    if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);
    if (this.reconnectTimeout) window.clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const dasSocket = new DasAgentSocket();
if (typeof window !== "undefined") {
  (window as any).dasSocket = dasSocket;
}
export { DasAgentSocket };
export default dasSocket;
