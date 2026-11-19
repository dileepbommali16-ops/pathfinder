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
    const parsedRate = rawBuf.readUInt32LE(24);
    if (parsedRate >= 8000 && parsedRate <= 96000) {
      sampleRate = parsedRate;
    }
    const scanLimit = Math.min(rawBuf.length, 256);
    const dataIdx = rawBuf.subarray(0, scanLimit).indexOf(Buffer.from("data", "ascii"), 12);
    if (dataIdx !== -1 && dataIdx + 8 < rawBuf.length) {
      pcm = rawBuf.subarray(dataIdx + 8);
    } else {
      pcm = rawBuf.subarray(44);
    }
  }
  const evenLen = pcm.length - (pcm.length % 2);
  return { pcm: pcm.subarray(0, evenLen), sampleRate };
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
