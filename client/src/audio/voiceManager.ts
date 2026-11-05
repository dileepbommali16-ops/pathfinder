/**
 * voiceManager.ts - Unified DAS Voice Facade
 * - Delegates all speech synthesis and real-time audio amplitude analysis to the
 *   central `speaker` instance in `audioIO.ts` (Deepgram v2 `flux-donovan-en`).
 */

import { speaker } from "@/agent/audioIO";

const listeners: ((speaking: boolean) => void)[] = [];

const prevOnState = speaker.onState;
speaker.onState = (speaking: boolean) => {
  prevOnState?.(speaking);
  listeners.forEach((cb) => {
    try {
      cb(speaking);
    } catch {}
  });
};

export function onVoiceStateChange(cb: (speaking: boolean) => void) {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getLiveAudioLevel(): number {
  return speaker.level();
}

export async function playElevenLabs(text: string): Promise<void> {
  if (!text || !text.trim()) return;
  speaker.say(text.trim());
}

export const speak = playElevenLabs;
export { playElevenLabs as speakElevenLabs };
