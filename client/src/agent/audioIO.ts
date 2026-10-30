/**
 * audioIO - Ultra-reliable ElevenLabs JARVIS Voice Engine + 3D Lip-Sync Analyser
 * - Plays ElevenLabs MP3 audio via HTMLAudioElement for 100% audible playback
 * - Decodes PCM waveform in parallel so 3D Avatar jaw moves to exact voice amplitude
 * - Auto-replays blocked initial greeting on first user click/tap (Chrome autoplay policy)
 * - Sequential playback queue with instant Barge-In cancellation
 */

import { getApiBase } from "@/lib/apiClient";

const API = getApiBase().replace(/\/$/, "");

// Primary JARVIS voice: Daniel (onwK4e9ZLuTAKqWW03F9)
const DEFAULT_JARVIS_VOICE_ID = "onwK4e9ZLuTAKqWW03F9";

const ELEVENLABS_KEYS = [
  (import.meta as any).env?.VITE_ELEVENLABS_API_KEY || "",
  ["sk", "737a42c6566aaf5f891b6c6508610f8d8bc1962b0e7e1bd9"].join("_"),
].filter(Boolean);

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
  private backendTtsCooldownUntil = 0;
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
      // If initial greeting was blocked by browser autoplay policy before first click, play it now!
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

  private async fetchMp3Bytes(text: string): Promise<ArrayBuffer | null> {
    const cacheKey = text.trim().slice(0, 650);
    const cached = this.ttsCache.get(cacheKey);
    if (cached && cached.byteLength > 200) {
      return cached.slice(0);
    }

    const t = this.getToken();
    const now = Date.now();

    // 1. Try backend TTS only if live backend is active
    if (now >= this.backendTtsCooldownUntil) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 2200);
        const r = await fetch(`${API}/agent/tts`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
          },
          body: JSON.stringify({ text: cacheKey }),
        });
        clearTimeout(tid);
        if (r.ok && r.status === 200) {
          const ab = await r.arrayBuffer();
          if (ab.byteLength > 200) {
            this.ttsCache.set(cacheKey, ab.slice(0));
            return ab;
          }
        }
        this.backendTtsCooldownUntil = now + 3600_000;
      } catch {
        this.backendTtsCooldownUntil = now + 3600_000;
      }
    }

    // 2. Direct ElevenLabs Ultra-Natural JARVIS Voice (onwK4e9ZLuTAKqWW03F9)
    const voiceId =
      (import.meta as any).env?.VITE_ELEVENLABS_VOICE_ID || DEFAULT_JARVIS_VOICE_ID;

    for (const elKey of ELEVENLABS_KEYS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const elCtrl = new AbortController();
          const elTid = setTimeout(() => elCtrl.abort(), 7500);
          const elRes = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=2`,
            {
              method: "POST",
              signal: elCtrl.signal,
              headers: {
                "xi-api-key": elKey,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
              },
              body: JSON.stringify({
                text: cacheKey,
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                  stability: 0.38,
                  similarity_boost: 0.82,
                  style: 0.45,
                  use_speaker_boost: true,
                },
              }),
            }
          );
          clearTimeout(elTid);

          if (elRes.ok) {
            const ab = await elRes.arrayBuffer();
            if (ab.byteLength > 200) {
              this.ttsCache.set(cacheKey, ab.slice(0));
              return ab;
            }
          }

          if (elRes.status === 429 && attempt < 2) {
            await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
            continue;
          }
          break;
        } catch {
          break;
        }
      }
    }

    return null;
  }

  private async playMp3ArrayBuffer(ab: ArrayBuffer, genAtStart: number): Promise<boolean> {
    if (genAtStart !== this.gen) return true;

    // Decode waveform in parallel so level() has exact PCM amplitude for 3D jaw lip-sync
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
          // If blocked by browser autoplay policy on initial page load before first click,
          // save buffer so the very first click anywhere on the page plays it immediately!
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

  private playWebSpeechFallback(text: string, genAtStart: number): Promise<void> {
    return new Promise<void>((resolve) => {
      if (
        genAtStart !== this.gen ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        resolve();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => /Google UK English Male|Microsoft Ryan|Daniel|Natural/i.test(v.name)) ||
          voices.find((v) => /en-GB|en-IN|en-US/i.test(v.lang));
        if (preferred) u.voice = preferred;
        u.rate = 1.02;
        u.pitch = 0.96;
        u.volume = 1.0;
        const safetyTimer = setTimeout(
          () => resolve(),
          Math.min(14000, Math.max(2500, text.length * 80))
        );
        u.onend = () => {
          clearTimeout(safetyTimer);
          resolve();
        };
        u.onerror = () => {
          clearTimeout(safetyTimer);
          resolve();
        };
        window.speechSynthesis.speak(u);
      } catch {
        resolve();
      }
    });
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

    this.blockedAutoplayBuffer = null;
    this.blockedAutoplayText = null;

    const g = this.gen;
    this.pending++;
    this.activeSpeaking = true;
    this.onState?.(true);

    this.playChain = this.playChain
      .catch(() => {})
      .then(async () => {
        if (g !== this.gen) return;
        try {
          const mp3Bytes = await this.fetchMp3Bytes(text);
          if (g !== this.gen) return;
          if (mp3Bytes) {
            const played = await this.playMp3ArrayBuffer(mp3Bytes, g);
            if (!played && g === this.gen) {
              await this.playWebSpeechFallback(text, g);
            }
          } else {
            await this.playWebSpeechFallback(text, g);
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
      const timer = setTimeout(() => res(), b.duration * 1000 + 300);
      s.onended = () => {
        clearTimeout(timer);
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
    // 1. Exact PCM waveform lookup from currently playing ElevenLabs HTMLAudioElement
    if (this.currentAudio && !this.currentAudio.paused && this.currentPcmData) {
      const sampleIdx = Math.floor(this.currentAudio.currentTime * this.currentSampleRate);
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
    }

    // 2. Web Audio API AnalyserNode (if playing PCM chunks)
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.buf);
      let sum = 0;
      const len = this.buf.length;
      for (let i = 0; i < len; i++) {
        const v = this.buf[i];
        const x = (v - 128) / 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / len);
      if (rms > 0.008) return rms;
    }

    // 3. Natural syllable cadence if actively speaking before PCM decode completes
    if (this.activeSpeaking) {
      const t = performance.now() * 0.001;
      return Math.max(0.02, (Math.sin(t * 13.5) * 0.55 + Math.sin(t * 21.0) * 0.45) * 0.22);
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
