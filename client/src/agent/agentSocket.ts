import { audioEngine } from "./audioIO";
import { executeBrowserTool, ToolCallArgs } from "./toolRunner";

const PROD_WS_URL =
  (import.meta as any).env?.VITE_WS_URL ||
  "wss://pathfinder-backend-klrp.onrender.com/agent/ws";

export type UserHonorificRole = "boss" | "sir";

class DasAgentSocket {
  private ws: WebSocket | null = null;
  public isConnected: boolean = false;

  public connect(
    role: UserHonorificRole = "boss",
    onTranscript?: (text: string) => void,
    onStatusChange?: (connected: boolean) => void,
    navigateFn?: (path: string) => void
  ) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`${PROD_WS_URL}?role=${role}`);

    this.ws.onopen = () => {
      this.isConnected = true;
      onStatusChange?.(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 1. Play 24kHz Gemini Voice & Drive 3D Lip-Sync
        if (data.type === "audio" && data.pcm_base64) {
          audioEngine.playPcmChunk(data.pcm_base64, data.sample_rate || 24000);
        }

        // 2. Display Live Transcript
        if (data.type === "transcript" && data.text) {
          onTranscript?.(data.text);
        }

        // 3. Autonomous Browser Tool Execution
        if (data.type === "tool_call" && data.name === "navigate_ui") {
          executeBrowserTool(data.args as ToolCallArgs, navigateFn);
        }
      } catch (err) {
        console.warn("[DasAgentSocket] Failed to parse message:", err);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      onStatusChange?.(false);
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
    audioEngine.stopMicCapture();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const dasSocket = new DasAgentSocket();
export { DasAgentSocket };
export default dasSocket;
