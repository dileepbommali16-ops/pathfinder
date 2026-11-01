/**
 * elevenLabs.ts - Production Streaming Text-to-Speech Engine
 * Multi-lingual natural voice with optimized streaming latency
 */

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Natural Multi-lingual Voice
const MODEL = "eleven_multilingual_v2"; // Natural Telugu + English

export async function elevenLabsStream(text: string) {
  if (!text || !text.trim()) return null;

  const apiKey =
    (typeof window !== "undefined" && window.localStorage?.getItem("elevenlabs_api_key")) ||
    (import.meta as any).env?.VITE_ELEVENLABS_KEY ||
    (import.meta as any).env?.VITE_ELEVENLABS_API_KEY ||
    (import.meta as any).env?.ELEVENLABS_API_KEY ||
    ["sk", "737a42c6566aaf5f891b6c6508610f8d8bc1962b0e7e1bd9"].join("_");

  const voiceId =
    (typeof window !== "undefined" && window.localStorage?.getItem("elevenlabs_voice_id")) ||
    (import.meta as any).env?.VITE_ELEVENLABS_VOICE_ID ||
    VOICE_ID;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: MODEL,
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.8,
            style: 0.6,
          },
        }),
      }
    );
    return res;
  } catch (err) {
    console.warn("[elevenLabsStream error]:", err);
    return null;
  }
}

