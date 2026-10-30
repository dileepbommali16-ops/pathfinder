/**
 * audioIO - Speaker with sequential streaming TTS queue, instant Barge-in,
 * RMS level calculation for 3D jaw lip-sync, and Web Speech Recognition listening.
 * File: client/src/agent/audioIO.ts
 */

import { getApiBase } from "@/lib/apiClient";

const API = getApiBase().replace(/\/$/, "");

export class Speaker {
  private ctxRef: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private gen = 0;
  private pending = 0;
  private current?: AudioBufferSourceNode;
  private buf = new Uint8Array(512);
  onState?: (speaking: boolean) => void;
  private initialized = false;
  private playChain: Promise<void> = Promise.resolve();
  private backendTtsCooldownUntil = 0;

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
      try {
        await ctx.resume();
      } catch {
        // Ignore autoplay policy suspension until user gesture
      }
    }
  }

  private async fetchAudio(text: string): Promise<AudioBuffer | null> {
    try {
      await this.resumeContext();
      const t = this.getToken();
      const now = Date.now();

      // Only attempt backend TTS if it hasn't recently timed out / 503'd
      if (now >= this.backendTtsCooldownUntil) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 2800);
          const r = await fetch(`${API}/agent/tts`, {
            method: "POST",
            signal: ctrl.signal,
            headers: {
              "Content-Type": "application/json",
              ...(t ? { Authorization: `Bearer ${t}` } : {}),
            },
            body: JSON.stringify({ text }),
          });
          clearTimeout(tid);
          if (r.ok && this.ctxRef) {
            return await this.ctxRef.decodeAudioData(await r.arrayBuffer());
          }
          this.backendTtsCooldownUntil = now + 60_000;
        } catch {
          this.backendTtsCooldownUntil = now + 60_000;
        }
      }

      // Direct ElevenLabs Cloud TTS fallback when Render backend is sleeping
      const elKey = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY || "";
      if (elKey && this.ctxRef) {
        try {
          const voiceId =
            (import.meta as any).env?.VITE_ELEVENLABS_VOICE_ID ||
            "iP95p4xoKVk53GoZ742B";
          const elCtrl = new AbortController();
          const elTid = setTimeout(() => elCtrl.abort(), 3500);
          const elRes = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: "POST",
              signal: elCtrl.signal,
              headers: {
                "xi-api-key": elKey,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
              },
              body: JSON.stringify({
                text: text.slice(0, 500),
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                  stability: 0.45,
                  similarity_boost: 0.8,
                  style: 0.35,
                  use_speaker_boost: true,
                },
              }),
            }
          );
          clearTimeout(elTid);
          if (elRes.ok) {
            return await this.ctxRef.decodeAudioData(await elRes.arrayBuffer());
          }
        } catch {
          // Fall through to Web Speech synthesis
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  say(raw: string) {
    // Strip action tags, detail blocks after |||, and markdown symbols before speaking
    const beforeDetails = raw.split("|||")[0] || "";
    const text = beforeDetails
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/[*_#`>|~]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return;

    const g = this.gen;
    this.pending++;
    this.onState?.(true);

    // Fetch audio immediately in parallel, then play sequentially in order
    const audioPromise = this.fetchAudio(text);

    this.playChain = this.playChain
      .catch(() => {})
      .then(async () => {
        if (g !== this.gen) return;
        try {
          const b = await audioPromise;
          if (g !== this.gen) return;
          if (b) {
            await this.play(b);
          } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
            await new Promise<void>((resolve) => {
              try {
                const u = new SpeechSynthesisUtterance(text);
                u.rate = 1.06;
                u.onend = () => resolve();
                u.onerror = () => resolve();
                window.speechSynthesis.speak(u);
              } catch {
                resolve();
              }
            });
          }
        } finally {
          if (g === this.gen && --this.pending <= 0) {
            this.pending = 0;
            this.onState?.(false);
          }
        }
      });
  }

  /** Plays raw 24kHz PCM linear audio chunks from Gemini Live */
  async playAudioChunk(base64Pcm: string): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {}
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
      if (!ctx) {
        res();
        return;
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      if (this.analyser) s.connect(this.analyser);
      s.onended = () => res();
      this.current = s;
      try {
        s.start();
      } catch {
        res();
      }
    });
  }

  stop() {
    // Barge-in: clear ongoing and queued speech instantly
    this.gen++;
    this.playChain = Promise.resolve();
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
  onEnd: () => void
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

export const speaker = new Speaker(
  () => localStorage.getItem("pathfinder_token") || sessionStorage.getItem("pathfinder_token")
);
export const audioManager = speaker; // alias for drop-in compatibility
