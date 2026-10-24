/**
 * audioIO - Speaker with TTS prefetch, Barge-in, RMS level calculation,
 * and Web Speech Recognition listening.
 * File: client/src/agent/audioIO.ts
 */

const API = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL || "";

export class Speaker {
  ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  analyser = this.ctx.createAnalyser();
  private chain: Promise<void> = Promise.resolve();
  private gen = 0;
  private pending = 0;
  private current?: AudioBufferSourceNode;
  private buf = new Uint8Array(512);
  onState?: (speaking: boolean) => void;

  constructor(private getToken: () => string | null = () => null) {
    this.analyser.fftSize = 512;
    this.analyser.connect(this.ctx.destination);
  }

  private async fetchAudio(text: string): Promise<AudioBuffer | null> {
    try {
      const t = this.getToken();
      const r = await fetch(`${API}/agent/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) return null;
      return await this.ctx.decodeAudioData(await r.arrayBuffer());
    } catch {
      return null;
    }
  }

  say(raw: string) {
    const text = raw.replace(/[*_#`>|~]/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return;
    this.ctx.resume();
    const g = this.gen;
    const p = this.fetchAudio(text); // prefetch parallel, play in order
    this.pending++;
    this.onState?.(true);
    this.chain = this.chain.then(async () => {
      try {
        const b = await p;
        if (b && g === this.gen) await this.play(b);
      } finally {
        if (--this.pending <= 0) {
          this.pending = 0;
          this.onState?.(false);
        }
      }
    });
  }

  /** Plays raw 24kHz PCM linear audio chunks from Gemini Live */
  async playAudioChunk(base64Pcm: string): Promise<void> {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    const binary = window.atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);

    const buffer = this.ctx.createBuffer(1, int16.length, 24000);
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
      const s = this.ctx.createBufferSource();
      s.buffer = b;
      s.connect(this.analyser);
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
    this.pending = 0;
    this.onState?.(false);
  }

  level(): number {
    // 0..~0.3 RMS, avatar mouth ki
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

  async initContext(): Promise<AudioContext> {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  getAnalyser(): AnalyserNode {
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
