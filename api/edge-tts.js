function getKeyCandidates() {
  const raw = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_FALLBACK,
  ]
    .map((k) => (k || "").trim())
    .filter(Boolean);
  return [...new Set(raw)];
}

function stripWavHeaderToPcm(rawBuf) {
  if (!rawBuf || rawBuf.length === 0) {
    return { pcm: Buffer.alloc(0), sampleRate: 24000 };
  }
  let sampleRate = 24000;
  let pcm = rawBuf;
  if (
    rawBuf.length > 44 &&
    rawBuf.toString("ascii", 0, 4) === "RIFF" &&
    rawBuf.toString("ascii", 8, 12) === "WAVE"
  ) {
    let pos = 12;
    let foundData = null;
    while (pos + 8 <= rawBuf.length) {
      const chunkId = rawBuf.toString("ascii", pos, pos + 4);
      const chunkSize = rawBuf.readUInt32LE(pos + 4);
      const bodyStart = pos + 8;
      const bodyEnd = Math.min(rawBuf.length, bodyStart + chunkSize);
      if (chunkId === "fmt " && bodyEnd - bodyStart >= 16) {
        const parsedRate = rawBuf.readUInt32LE(bodyStart + 4);
        if (parsedRate >= 8000 && parsedRate <= 96000) {
          sampleRate = parsedRate;
        }
      } else if (chunkId === "data") {
        foundData = rawBuf.subarray(bodyStart, bodyEnd);
        break;
      }
      pos = bodyStart + chunkSize + (chunkSize % 2);
    }
    pcm = foundData || rawBuf.subarray(44);
  }
  const evenLen = pcm.length - (pcm.length % 2);
  const cleanPcm = Buffer.from(pcm.subarray(0, evenLen));
  // Smooth 5ms fade-in and 15ms fade-out so playback ends at clean zero with no click or buzz
  const totalSamples = Math.floor(cleanPcm.length / 2);
  const fadeInSamples = Math.min(Math.floor(totalSamples / 4), Math.round(sampleRate * 0.005));
  const fadeOutSamples = Math.min(Math.floor(totalSamples / 4), Math.round(sampleRate * 0.015));
  for (let i = 0; i < fadeInSamples; i++) {
    const s = cleanPcm.readInt16LE(i * 2);
    cleanPcm.writeInt16LE(Math.round(s * (i / Math.max(1, fadeInSamples))), i * 2);
  }
  for (let i = 0; i < fadeOutSamples; i++) {
    const idx = totalSamples - 1 - i;
    const s = cleanPcm.readInt16LE(idx * 2);
    cleanPcm.writeInt16LE(Math.round(s * (i / Math.max(1, fadeOutSamples))), idx * 2);
  }
  return { pcm: cleanPcm, sampleRate };
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = String(body?.text || "").trim().slice(0, 800);
    if (!text) {
      return Response.json({ status: "error", detail: "Text is required." }, { status: 400 });
    }

    const keys = getKeyCandidates();
    if (keys.length === 0) {
      console.error("[edge-tts] GEMINI_API_KEY is not configured in Vercel environment.");
      return Response.json({ status: "unavailable", detail: "API key not configured." }, { status: 503 });
    }

    const ttsModels = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"];

    for (const apiKey of keys) {
      for (const model of ttsModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(9500),
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: "Puck",
                    },
                  },
                },
              },
            }),
          });
          if (!resp.ok) {
            const errTxt = await resp.text().catch(() => "");
            console.error(`[edge-tts] ${model} HTTP ${resp.status}: ${errTxt.slice(0, 160)}`);
            if (resp.status === 400 && /api key not valid/i.test(errTxt)) break;
            continue;
          }

          const data = await resp.json();
          const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
          const pcmParts = [];
          let sampleRate = 24000;

          for (const cand of candidates) {
            const parts = Array.isArray(cand?.content?.parts) ? cand.content.parts : [];
            for (const part of parts) {
              const b64 = part?.inlineData?.data;
              if (typeof b64 === "string" && b64.length > 0) {
                const rawBuf = Buffer.from(b64, "base64");
                const { pcm, sampleRate: detectedRate } = stripWavHeaderToPcm(rawBuf);
                if (pcm.length > 0) {
                  sampleRate = detectedRate;
                  pcmParts.push(pcm);
                }
              }
            }
          }

          if (pcmParts.length > 0) {
            const merged = Buffer.concat(pcmParts);
            return Response.json({
              status: "ok",
              pcm_base64: merged.toString("base64"),
              sample_rate: sampleRate,
              voice: "Puck",
              provider: "gemini-3.8-edge-puck",
              model,
            });
          }
        } catch (err) {
          console.error(`[edge-tts] ${model} exception:`, err?.message || err);
        }
      }
    }

    return Response.json({ status: "fallback_live", text, voice: "Puck", provider: "gemini-3.8-edge-puck" });
  } catch (err) {
    console.error("[edge-tts] Unhandled error:", err?.message || err);
    return Response.json({ status: "error", detail: "Internal edge TTS error." }, { status: 500 });
  }
}
