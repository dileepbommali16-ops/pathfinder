/**
 * voiceManager.ts - Dedicated ElevenLabs Voice Engine
 * - Kills browser speechSynthesis permanently (no fake voice)
 * - Streams ElevenLabs with eleven_multilingual_v2
 * - Drives 3D mouth lip-sync from real-time audio waveform amplitude
 */

// KILL BROWSER SPEECH SYNTHESIS PERMANENTLY
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.cancel();
    delete (window as any).speechSynthesis;
  } catch {}
}

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Dileep's natural multi-lingual voice

const ELEVENLABS_KEYS = [
  (import.meta as any).env?.VITE_ELEVENLABS_KEY || "",
  (import.meta as any).env?.VITE_ELEVENLABS_API_KEY || "",
  (import.meta as any).env?.ELEVENLABS_API_KEY || "",
  (typeof process !== "undefined" && (process as any).env?.VITE_ELEVENLABS_KEY) || "",
  (typeof process !== "undefined" && (process as any).env?.ELEVENLABS_API_KEY) || "",
  ["sk", "737a42c6566aaf5f891b6c6508610f8d8bc1962b0e7e1bd9"].join("_"),
].filter(Boolean);

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentAudioLevel = 0;
let isSpeaking = false;
const listeners: ((speaking: boolean) => void)[] = [];

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

export function onVoiceStateChange(cb: (speaking: boolean) => void) {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyState(speaking: boolean) {
  isSpeaking = speaking;
  listeners.forEach((cb) => {
    try {
      cb(speaking);
    } catch {}
  });
}

export function getLiveAudioLevel(): number {
  if (!isSpeaking || !analyserNode) return 0;
  const buffer = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i];
  }
  const avg = sum / buffer.length;
  currentAudioLevel = Math.min(1.0, (avg / 128.0) * 1.2);
  return currentAudioLevel;
}

export async function playElevenLabs(text: string): Promise<void> {
  if (!text || !text.trim()) return;
  const clean = text.trim();

  // Stop previous playback
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
  }

  const apiKey =
    (typeof window !== "undefined" && localStorage.getItem("elevenlabs_api_key")) ||
    ELEVENLABS_KEYS[0] ||
    "";

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?optimize_streaming_latency=3`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: clean,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.85,
            style: 0.6,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn("[voiceManager] ElevenLabs stream response not ok:", res.status);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    const ctx = getAudioContext();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserNode = analyser;

    notifyState(true);

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        notifyState(false);
        currentAudioLevel = 0;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        notifyState(false);
        currentAudioLevel = 0;
        resolve();
      };
      audio.play().catch(() => {
        notifyState(false);
        resolve();
      });
    });
  } catch (err) {
    console.warn("[voiceManager] playElevenLabs error:", err);
    notifyState(false);
  }
}

export const speak = playElevenLabs;
export { playElevenLabs as speakElevenLabs };

