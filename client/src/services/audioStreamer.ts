import { speaker } from "@/agent/audioIO";

/**
 * audioStreamer.ts — Real-time 16kHz Mic Input, 24kHz Audio Output & Lip-Sync Volume Analyser
 */
export function getAudioVolumeFromAnalyser(): number {
  return speaker.level();
}

export function playPcm24kChunk(base64Pcm24k: string): void {
  if (!base64Pcm24k) return;
  speaker.playAudioChunk(base64Pcm24k);
}

export async function startMic16kStream(session: any): Promise<(() => void) | null | undefined> {
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
