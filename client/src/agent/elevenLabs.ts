/**
 * elevenLabs.ts - Production Streaming Text-to-Speech Client
 * Routes synthesis through the backend `/agent/tts` endpoint (Deepgram v2 `flux-donovan-en`).
 */

import { getApiBase } from "@/lib/apiClient";

export async function elevenLabsStream(text: string) {
  if (!text || !text.trim()) return null;
  const api = getApiBase().replace(/\/$/, "");
  try {
    const res = await fetch(`${api}/agent/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text: text.trim().slice(0, 600) }),
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}
