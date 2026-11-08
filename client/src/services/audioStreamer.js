import { speaker } from "@/agent/audioIO";

/**
 * audioStreamer.js — Real-time 16kHz Mic Input, 24kHz Audio Output & Lip-Sync Volume Analyser
 */
export function getAudioVolumeFromAnalyser() {
  return speaker.level();
}

export function playPcm24kChunk(base64Pcm24k) {
  if (!base64Pcm24k) return;
  speaker.playAudioChunk(base64Pcm24k);
}

export async function startMic16kStream(session) {
  return speaker.startLiveMicStream((base64Pcm16k) => {
    if (!session) return;
    try {
      session.sendRealtimeInput({
        audio: {
          data: base64Pcm16k,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (err) {
      console.warn("[audioStreamer] Mic stream notice:", err);
    }
  });
}

