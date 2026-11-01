/**
 * voice - Re-exports Speaker and startListening from audioIO and voiceManager
 * File: client/src/agent/voice.ts
 */

export { Speaker, startListening, speaker, audioManager } from "./audioIO";
export { playElevenLabs, speak, speakElevenLabs, onVoiceStateChange, getLiveAudioLevel } from "@/audio/voiceManager";
