/**
 * audioIO - DAS Voice Engine + 3D Lip-Sync Analyser
 * - All speech is synthesized by the backend `/agent/tts` endpoint, which uses the
 *   configured ElevenLabs voice (with an automatic neural-voice fallback when the
 *   ElevenLabs quota is exhausted). No API keys ship in the browser bundle.
 * - Eager parallel pre-fetching: each sentence is synthesized as soon as Groq streams it,
 *   so sentence-to-sentence playback has minimal gap.
 * - Decodes the PCM waveform so the 3D avatar mouth follows the real voice amplitude,
 *   and the mouth only moves while audio is actually playing.
 * - Auto-replays a blocked greeting on the first user click/tap (browser autoplay policy).
 */

// Browser speechSynthesis is disabled so DAS never falls back to a robotic system voice.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.cancel();
    delete (window as any).speechSynthesis;
  } catch {}
}

import { getApiBase } from "@/lib/apiClient";

const API = getApiBase().replace(/\/$/, "");

// Render free instances can take a while to wake up, so allow a generous timeout.
const TTS_TIMEOUT_MS = 30_000;

export class Speaker {
  private ctxRef: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private gen = 0;
  private pending = 0;
  private currentSource?: AudioBufferSourceNode;
  private currentAudio?: HTMLAudioElement;
  private currentAudioUrl?: string;
  private currentPcmData: Float32Array | null = null;
  private currentSampleRate = 44100;
  private buf = new Uint8Array(512);
  onState?: (speaking: boolean) => void;
  private initialized = false;
  private playChain: Promise<void> = Promise.resolve();
  private blockedAutoplayBuffer: ArrayBuffer | null = null;
  private blockedAutoplayText: string | null = null;
  private activeSpeaking = false;
  private ttsCache = new Map<string, ArrayBuffer>();

  constructor(
    private getToken: () => string | null = () => null,
    onState?: (speaking: boolean) => void
  ) {
    if (onState) this.onState = onState;
    this.installAutoplayUnlock();
  }

  private installAutoplayUnlock() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      if (this.ctxRef && this.ctxRef.state === "suspended") {
        this.ctxRef.resume().catch(() => {});
      }
      if (this.blockedAutoplayBuffer && !this.activeSpeaking && this.pending === 0) {
        const buf = this.blockedAutoplayBuffer;
        this.blockedAutoplayBuffer = null;
        this.blockedAutoplayText = null;
        const g = this.gen;
        this.pending++;
        this.activeSpeaking = true;
        this.onState?.(true);
        this.playMp3ArrayBuffer(buf, g).finally(() => {
          if (g === this.gen && --this.pending <= 0) {
            this.pending = 0;
            this.activeSpeaking = false;
            this.onState?.(false);
          }
        });
      }
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
  }

  private ensureContext() {
    if (this.initialized) return this.ctxRef;
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctxRef = new AC();
      this.analyser = this.ctxRef.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.connect(this.ctxRef.destination);
      this.initialized = true;
    } catch {
      this.ctxRef = null;
    }
    return this.ctxRef;
  }

  private async resumeContext() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // Autoplay policy until user gesture
      }
    }
  }

  /**
   * Fetches MP3 bytes for one sentence from the backend `/agent/tts` endpoint
   * (ElevenLabs voice, neural fallback). Called eagerly so synthesis overlaps with
   * Groq token streaming and the playback of earlier sentences.
   */
  private async fetchMp3Bytes(text: string): Promise<ArrayBuffer | null> {
    const cacheKey = text.trim().slice(0, 600);
    const cached = this.ttsCache.get(cacheKey);
    if (cached && cached.byteLength > 200) {
      return cached.slice(0);
    }

    const token = this.getToken();
    for (let attempt = 0; attempt < 3; attempt++) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), TTS_TIMEOUT_MS);
      try {
        const r = await fetch(`${API}/agent/tts`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: cacheKey }),
        });
        if (r.ok) {
          const ab = await r.arrayBuffer();
          if (ab.byteLength > 200) {
            if (this.ttsCache.size > 60) this.ttsCache.clear();
            this.ttsCache.set(cacheKey, ab.slice(0));
            return ab;
          }
          return null;
        }
        // Retry only on rate limiting / transient server errors.
        if (r.status !== 429 && r.status < 500) {
          console.warn(`[DAS voice] TTS request rejected (HTTP ${r.status})`);
          return null;
        }
      } catch (err) {
        if (attempt === 2) console.warn("[DAS voice] TTS request failed:", err);
      } finally {
        clearTimeout(tid);
      }
      await new Promise((res) => setTimeout(res, 600 * (attempt + 1)));
    }
    return null;
  }

  private async playMp3ArrayBuffer(ab: ArrayBuffer, genAtStart: number): Promise<boolean> {
    if (genAtStart !== this.gen) return true;

    try {
      const ctx = this.ensureContext();
      if (ctx) {
        ctx
          .decodeAudioData(ab.slice(0))
          .then((decoded) => {
            if (genAtStart === this.gen) {
              this.currentPcmData = decoded.getChannelData(0);
              this.currentSampleRate = decoded.sampleRate;
            }
          })
          .catch(() => {});
      }
    } catch {}

    return new Promise<boolean>((resolve) => {
      if (genAtStart !== this.gen) {
        resolve(true);
        return;
      }

      const blob = new Blob([ab.slice(0)], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      this.currentAudioUrl = url;

      const audio = new Audio(url);
      audio.volume = 1.0;
      audio.preload = "auto";
      this.currentAudio = audio;

      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (this.currentAudio === audio) {
          this.currentAudio = undefined;
          this.currentPcmData = null;
        }
        try {
          URL.revokeObjectURL(url);
        } catch {}
        resolve(ok);
      };

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err && (err.name === "NotAllowedError" || String(err).includes("interact"))) {
            this.blockedAutoplayBuffer = ab.slice(0);
            finish(true);
          } else {
            finish(false);
          }
        });
      }
    });
  }



  /**
   * Immediately kicks off ElevenLabs streaming synthesis in parallel (before previous
   * audio chunks finish playing) and queues gapless sequential playback.
   */
  say(raw: string) {
    const beforeDetails = raw.split("|||")[0] || "";
    const text = beforeDetails
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/[*_#`>|~]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return;

    this.blockedAutoplayBuffer = null;
    this.blockedAutoplayText = null;

    const g = this.gen;
    this.pending++;
    this.activeSpeaking = true;
    this.onState?.(true);

    // EAGER PARALLEL STREAMING FETCH:
    // Start ElevenLabs /stream request right now, without waiting for prior chunks to finish playing!
    const eagerMp3Promise = this.fetchMp3Bytes(text);

    this.playChain = this.playChain
      .catch(() => {})
      .then(async () => {
        if (g !== this.gen) return;
        try {
          const mp3Bytes = await eagerMp3Promise;
          if (g !== this.gen) return;
          if (mp3Bytes) {
            await this.playMp3ArrayBuffer(mp3Bytes, g);
          }
        } finally {
          if (g === this.gen && --this.pending <= 0) {
            this.pending = 0;
            this.activeSpeaking = false;
            this.onState?.(false);
          }
        }
      });
  }

  /** Alias for streaming chunk dispatch from toolRunner.ts */
  streamChunk(chunkText: string) {
    this.say(chunkText);
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

    this.activeSpeaking = true;
    this.onState?.(true);
    await this.playBufferNode(buffer);
    this.activeSpeaking = false;
    this.onState?.(false);
  }

  private playBufferNode(b: AudioBuffer) {
    return new Promise<void>((res) => {
      const ctx = this.ensureContext();
      if (!ctx) {
        res();
        return;
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      if (this.analyser) s.connect(this.analyser);
      const timer = setTimeout(() => {
        if (this.currentSource === s) this.currentSource = undefined;
        res();
      }, b.duration * 1000 + 300);
      s.onended = () => {
        clearTimeout(timer);
        if (this.currentSource === s) this.currentSource = undefined;
        res();
      };
      this.currentSource = s;
      try {
        s.start();
      } catch {
        clearTimeout(timer);
        res();
      }
    });
  }

  stop() {
    this.gen++;
    this.playChain = Promise.resolve();
    this.blockedAutoplayBuffer = null;
    this.blockedAutoplayText = null;
    try {
      this.currentSource?.stop();
    } catch {}
    try {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.src = "";
        this.currentAudio = undefined;
      }
      if (this.currentAudioUrl) {
        URL.revokeObjectURL(this.currentAudioUrl);
        this.currentAudioUrl = undefined;
      }
    } catch {}
    this.currentPcmData = null;
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    this.pending = 0;
    this.activeSpeaking = false;
    this.onState?.(false);
  }

  level(): number {
    const audio = this.currentAudio;
    // Mouth moves only while DAS audio is actually audible.
    if (audio && !audio.paused && !audio.ended) {
      if (this.currentPcmData) {
        const sampleIdx = Math.floor(audio.currentTime * this.currentSampleRate);
        const windowSize = 512;
        if (sampleIdx >= 0 && sampleIdx < this.currentPcmData.length) {
          let sum = 0;
          const end = Math.min(this.currentPcmData.length, sampleIdx + windowSize);
          const count = end - sampleIdx;
          for (let i = sampleIdx; i < end; i++) {
            const v = this.currentPcmData[i];
            sum += v * v;
          }
          if (count > 0) {
            return Math.min(0.45, Math.sqrt(sum / count) * 1.65);
          }
        }
        return 0;
      }
      // Waveform still decoding: use a natural syllable cadence for the first few ms.
      const t = performance.now() * 0.001;
      return Math.max(0.02, (Math.sin(t * 13.5) * 0.55 + Math.sin(t * 21.0) * 0.45) * 0.22);
    }

    // Raw PCM playback path (Web Audio buffer sources).
    if (this.analyser && this.currentSource) {
      this.analyser.getByteTimeDomainData(this.buf);
      let sum = 0;
      const len = this.buf.length;
      for (let i = 0; i < len; i++) {
        const x = (this.buf[i] - 128) / 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / len);
      if (rms > 0.008) return rms;
    }

    return 0;
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
export const audioManager = speaker;
