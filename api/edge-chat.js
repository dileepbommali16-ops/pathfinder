const OWNER_EMAIL = "dileepbommali16@gmail.com";

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

function resolveHonorific(pageContext = {}) {
  const email = String(pageContext.userEmail || "").trim().toLowerCase();
  if (email === OWNER_EMAIL) return "Boss";
  const rawHon = String(pageContext.honorific || "").trim().toLowerCase();
  if (rawHon === "madam" || rawHon === "mam" || rawHon === "ma'am") return "Madam";
  return "Sir";
}

function buildSystemPrompt(honorific, activeTab, cameraActive, pageContext = {}) {
  const identityLine =
    honorific === "Boss"
      ? "You are speaking directly with your creator and owner Bommali Dileep. Address him warmly and loyally as 'Boss'. Only say 'Hi Boss! What's up?' once at the start of a brand-new conversation; if there is prior history, reply naturally without repeating that greeting."
      : honorific === "Madam"
        ? "You are speaking with a female visitor, evaluator, or friend. Address her politely as 'Madam'. NEVER call her 'Boss'. If asked who your Boss/creator is, reply proudly: 'His name is Dileep.'"
        : "You are speaking with a male visitor, evaluator, or friend. Address him politely as 'Sir'. NEVER call him 'Boss'. If asked who your Boss/creator is, reply proudly: 'His name is Dileep.'";

  const camRule = cameraActive
    ? "LIVE CAMERA IS ON and the latest camera JPEG is attached. Describe ONLY the actual colors, hairstyle, hand motion, or objects visible in this exact frame right now — never guess old memories."
    : "CAMERA IS OFF (no image attached). Never pretend or claim to see the user; if asked if you can see them, honestly say your camera is turned off and suggest tapping Cam.";

  const tabNote = activeTab ? `Active Pathfinder slide: ${activeTab}.` : "";
  const cardNote = pageContext.cardContext ? `Focused card: ${pageContext.cardContext}.` : "";

  return [
    "You are DAS, the Autonomous 3D AI Assistant and Career Mentor inside PATHFINDER 2.0, created by Dileep Bommali (B.Tech 3rd Year CSE Data Science at Dr. RVR & Dr. NRI University, age 20, DOB 16/01/2006; mother Bhavani, father Ramana, sister Priyanka; guitarist, fashion model, Allu Arjun fan; mentors T. Navya Chandrika, Dr. Murali Krishna Sir, Chaitanya Madam, Swamy Sir, Phani Sir, Vijay Sir).",
    identityLine,
    "ZERO SYCOPHANCY & HONEST REALISM: NEVER blindly agree ('Yes you're right', 'All correct!') or hand out fake compliments. If code, logic, math, hairstyle, or an answer is wrong or weak, directly and honestly point out the exact flaw and explain why.",
    "UNRESTRICTED GENERAL KNOWLEDGE: You have full world knowledge (history, science, coding, placements, DSA, AI/ML, projects, daily chat). Answer directly and accurately without refusing general questions.",
    "STYLE: Understand English, Telugu, Tenglish, and Hindi natively, but ALWAYS reply in clear, natural spoken ENGLISH (1-3 concise sentences for casual talk; clear short bullets for plans/code) so your male Puck voice reads it smoothly. Never call yourself co-pilot.",
    camRule,
    tabNote,
    cardNote,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = String(body?.message || "").trim().slice(0, 2000);
    if (!message) {
      return Response.json({ status: "error", detail: "Message is required." }, { status: 400 });
    }

    const keys = getKeyCandidates();
    if (keys.length === 0) {
      console.error("[edge-chat] GEMINI_API_KEY is not configured in Vercel environment.");
      return Response.json({ status: "unavailable", detail: "API key not configured." }, { status: 503 });
    }

    const pageContext = body?.page_context && typeof body.page_context === "object" ? body.page_context : {};
    const honorific = resolveHonorific(pageContext);
    const activeTab = String(body?.active_tab || pageContext.activeTab || "overview");
    const liveFrameB64 =
      typeof body?.live_frame_base64 === "string" && body.live_frame_base64.length > 200
        ? body.live_frame_base64.replace(/^data:image\/\w+;base64,/, "")
        : null;
    const cameraActive = Boolean(body?.camera_active && liveFrameB64);

    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const contents = [];
    for (const turn of history) {
      const txt = String(turn?.content || "").trim();
      if (!txt) continue;
      contents.push({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: txt.slice(0, 900) }],
      });
    }

    const userParts = [];
    if (cameraActive && liveFrameB64) {
      userParts.push({ inlineData: { mimeType: "image/jpeg", data: liveFrameB64 } });
    }
    userParts.push({ text: message });
    contents.push({ role: "user", parts: userParts });

    const preferredModel = (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite").trim();
    const models = [...new Set([preferredModel, "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"])];
    const systemText = buildSystemPrompt(honorific, activeTab, cameraActive, pageContext);

    for (const apiKey of keys) {
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemText }] },
              contents,
              generationConfig: {
                temperature: 0.45,
                maxOutputTokens: 360,
              },
            }),
          });
          if (!resp.ok) {
            const errTxt = await resp.text().catch(() => "");
            console.error(`[edge-chat] ${model} HTTP ${resp.status}: ${errTxt.slice(0, 160)}`);
            if (resp.status === 400 && /api key not valid/i.test(errTxt)) break;
            continue;
          }
          const data = await resp.json();
          const parts = data?.candidates?.[0]?.content?.parts || [];
          const reply = parts
            .filter((p) => typeof p?.text === "string" && !p?.thought)
            .map((p) => p.text)
            .join("")
            .trim();
          if (reply) {
            return Response.json({
              status: "ok",
              reply,
              model,
              honorific,
              provider: "vercel-fluid-gemini",
            });
          }
        } catch (err) {
          console.error(`[edge-chat] ${model} exception:`, err?.message || err);
        }
      }
    }

    return Response.json({ status: "unavailable", detail: "Upstream Gemini models temporarily busy." }, { status: 503 });
  } catch (err) {
    console.error("[edge-chat] Unhandled error:", err?.message || err);
    return Response.json({ status: "error", detail: "Internal edge chat error." }, { status: 500 });
  }
}
