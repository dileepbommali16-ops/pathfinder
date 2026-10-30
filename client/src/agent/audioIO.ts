/**
 * audioIO - Speaker with streaming TTS, Barge-in, RMS level calculation,
 * and Web Speech Recognition listening.
 * File: client/src/agent/audioIO.ts
 */

const API = (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "";

export class Speaker {
  private ctxRef: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private gen = 0;
  private pending = 0;
  private current?: AudioBufferSourceNode;
  private buf = new Uint8Array(512);
  onState?: (speaking: boolean) => void;
  private initialized = false;

  constructor(
    private getToken: () => string | null = () => null,
    onState?: (speaking: boolean) => void
  ) {
    if (onState) this.onState = onState;
  }

  private ensureContext() {
    if (this.initialized) return this.ctxRef;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    this.ctxRef = new AC();
    this.analyser = this.ctxRef.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.connect(this.ctxRef.destination);
    this.initialized = true;
    return this.ctxRef;
  }

  private async resumeContext() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  private async fetchAudio(text: string): Promise<AudioBuffer | null> {
    try {
      await this.resumeContext();
      const t = this.getToken();
      // Try streaming TTS endpoint first for lower latency
      try {
        const r = await fetch(`${API}/api/voice/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          body: JSON.stringify({ text }),
        });
        if (r.ok && r.body) {
          // Collect SSE audio chunks and decode
          const reader = r.body.getReader();
          const decoder = new TextDecoder();
          let audioChunks: Uint8Array[] = [];
          let carry = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            carry += decoder.decode(value, { stream: true });
            const lines = carry.split("\n");
            carry = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const raw = trimmed.replace(/^data:\s*/, "").trim();
              if (!raw || raw === "[DONE]") continue;
              try {
                const chunk = JSON.parse(raw);
                if (chunk.data) {
                  audioChunks.push(Uint8Array.from(atob(chunk.data), (c) => c.charCodeAt(0)));
                }
              } catch {}
            }
          }
          if (audioChunks.length > 0) {
            const totalLen = audioChunks.reduce((a, b) => a + b.length, 0);
            const merged = new Uint8Array(totalLen);
            let offset = 0;
            for (const ch of audioChunks) {
              merged.set(ch, offset);
              offset += ch.length;
            }
            return await this.ctxRef!.decodeAudioData(merged.buffer);
          }
        }
      } catch {
        // Fall through to regular TTS
      }

      // Regular TTS fallback
      let r = await fetch(`${API}/agent/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        body: JSON.stringify({ text }),
      });
      if (!r.ok && (r.status === 404 || r.status === 502)) {
        r = await fetch(`${API}/api/voice/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          body: JSON.stringify({ text }),
        });
      }
      if (!r.ok) return null;
      return await this.ctxRef!.decodeAudioData(await r.arrayBuffer());
    } catch {
      return null;
    }
  }

  say(raw: string) {
    const text = raw.replace(/[*_#`>|~]/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return;
    const g = ++this.gen;
    this.pending++;
    this.onState?.(true);

    // Start playing immediately without chaining to previous for lower latency
    (async () => {
      try {
        const b = await this.fetchAudio(text);
        if (g === this.gen && b) {
          await this.play(b);
        } else if (g === this.gen && typeof window !== "undefined" && "speechSynthesis" in window) {
          await new Promise<void>((resolve) => {
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 1.1;
            u.onend = () => resolve();
            u.onerror = () => resolve();
            window.speechSynthesis.speak(u);
          });
        }
      } finally {
        if (--this.pending <= 0) {
          this.pending = 0;
          this.onState?.(false);
        }
      }
    })();
  }

  /** Plays raw 24kHz PCM linear audio chunks from Gemini Live */
  async playAudioChunk(base64Pcm: string): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    const binary = window.atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);

    const buffer = ctx.createBuffer(1, int16.length, 24000);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
      data[i] = int16[i] / 32768.0;
    }

    this.onState?.(true);
    await this.play(buffer);
    this.onState?.(false);
  }

  private play(b: AudioBuffer) {
    return new Promise<void>((res) => {
      const ctx = this.ensureContext();
      if (!ctx) { res(); return; }
      const s = ctx.createBufferSource();
      s.buffer = b;
      if (this.analyser) s.connect(this.analyser);
      s.onended = () => res();
      this.current = s;
      s.start();
    });
  }

  stop() {
    // barge-in: clear ongoing speech instantly
    this.gen++;
    try {
      this.current?.stop();
    } catch {}
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    this.pending = 0;
    this.onState?.(false);
  }

  level(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this.buf);
    let sum = 0;
    const len = this.buf.length;
    for (let i = 0; i < len; i++) {
      const v = this.buf[i];
      const x = (v - 128) / 128;
      sum += x * x;
    }
    return Math.sqrt(sum / len);
  }

  clearPlaybackQueue(): void {
    this.stop();
  }

  async initContext(): Promise<AudioContext | null> {
    await this.resumeContext();
    return this.ctxRef ?? null;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }
}

export function startListening(
  lang: string,
  onInterim: (t: string) => void,
  onFinal: (t: string) => void,
  onEnd: () => void,
): (() => void) | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = lang;
  r.interimResults = true;
  r.continuous = false;
  let finalText = "";
  r.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    onInterim(finalText + interim);
  };
  r.onend = () => {
    onEnd();
    if (finalText.trim()) onFinal(finalText.trim());
  };
  r.onerror = () => {};
  r.start();
  return () => r.stop();
}

export const speaker = new Speaker(() => localStorage.getItem("pathfinder_token") || sessionStorage.getItem("pathfinder_token"));
export const audioManager = speaker; // alias for drop-in compatibility
