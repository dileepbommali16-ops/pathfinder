const OWNER_EMAIL = "dileepbommali16@gmail.com";
const keyCooldownUntil = new Map();

function markKeyRateLimited(apiKey, cooldownMs = 600000) {
  if (!apiKey) return;
  const until = Date.now() + cooldownMs;
  if (until > (keyCooldownUntil.get(apiKey) || 0)) {
    keyCooldownUntil.set(apiKey, until);
  }
}

function getKeyCandidates() {
  const seen = new Set();
  for (const rawEnv of [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_FALLBACK,
    process.env.GEMINI_API_KEYS,
  ]) {
    if (!rawEnv) continue;
    for (const part of String(rawEnv).split(/[,;\r\n]+/)) {
      const cleaned = part.trim();
      if (cleaned) seen.add(cleaned);
    }
  }
  const now = Date.now();
  const healthy = [];
  const cooled = [];
  for (const k of seen) {
    const until = keyCooldownUntil.get(k) || 0;
    if (until <= now) {
      keyCooldownUntil.delete(k);
      healthy.push(k);
    } else {
      cooled.push({ k, until });
    }
  }
  cooled.sort((a, b) => a.until - b.until);
  return [...healthy, ...cooled.map((x) => x.k)];
}

function resolveHonorific(pageContext = {}) {
  const email = String(pageContext.userEmail || "").trim().toLowerCase();
  const userName = String(pageContext.userName || "").trim().toLowerCase();
  const rawHon = String(pageContext.honorific || "").trim().toLowerCase();
  if (email === OWNER_EMAIL) return "Boss";
  if (
    !email ||
    email === "guest@pathfinder.ai" ||
    email.startsWith("guest@") ||
    email.endsWith("@guest.local") ||
    rawHon === "stranger" ||
    userName === "guest student" ||
    userName === "guest" ||
    userName === "stranger"
  ) {
    return "Stranger";
  }
  if (rawHon === "madam" || rawHon === "mam" || rawHon === "ma'am") return "Madam";
  return "Sir";
}

function buildSystemPrompt(honorific, activeTab, profile = {}, pageContext = {}) {
  const identityLine =
    honorific === "Boss"
      ? "You are speaking directly with your creator and owner Bommali Dileep. Address him warmly and loyally as 'Boss'. Only say 'Hi Boss! What's up?' once at the start of a brand-new conversation; if there is prior history, reply concisely with 'Hi Boss, I'm here!' or answer directly."
      : honorific === "Madam"
        ? "You are speaking with a female visitor, evaluator, or friend. Address her respectfully as 'Madam'. NEVER call her 'Boss'. If asked who your Boss/creator is, reply proudly: 'His name is Dileep.'"
        : honorific === "Stranger"
          ? "You are speaking with an unidentified guest visitor. Address them politely as 'Stranger' and ask them to tell you their name first until they share their name. NEVER call them 'Boss'. If asked who your Boss/creator is, reply proudly: 'His name is Dileep.'"
          : "You are speaking with a male visitor, evaluator, or friend. Address him politely as 'Sir'. NEVER call him 'Boss'. If asked who your Boss/creator is, reply proudly: 'His name is Dileep.'";

  const branch = profile?.branch || pageContext?.branch || "CSE";
  const cgpa = profile?.cgpa ?? pageContext?.cgpa ?? "9.1";
  const targetRole = profile?.target_role || pageContext?.targetRole || "Software Engineer";
  const readiness = pageContext?.readinessChance != null ? `Readiness=${pageContext.readinessChance}%` : "";
  const profileLine = `Active candidate profile: Branch=${branch}, CGPA=${cgpa}, TargetRole=${targetRole}${readiness ? `, ${readiness}` : ""}.`;
  const tabsLine =
    "Pathfinder 2.0 has 6 active navigation slides: 1. Dashboard (overview), 2. JD & Resume Tailor (resume), 3. Live Coding & Viva Arena (interview), 4. Project Blueprints (projects), 5. Cohort & Roadmap (analytics), 6. Profile / Settings (profile).";
  const tabNote = activeTab ? `Active Pathfinder slide: ${activeTab}.` : "";
  const cardNote = pageContext.cardContext ? `Focused card: ${pageContext.cardContext}.` : "";

  return [
    "You are DAS, the Autonomous 3D AI Assistant and Career Mentor inside PATHFINDER 2.0, created by Dileep Bommali (B.Tech 3rd Year CSE Data Science at DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli; NEVER say 'Dr. RVR & Dr. NRI'; age 20, DOB 16/01/2006; mother Bhavani, father Ramana, sister Priyanka; guitarist, fashion model, Allu Arjun fan; mentors T. Navya Chandrika, Dr. Murali Krishna Sir, Chaitanya Madam, Swamy Sir, Phani Sir, Vijay Sir).",
    identityLine,
    "VOICE-ONLY HONESTY: You are a voice and Pathfinder dashboard assistant with no live webcam or camera feed. Never claim or pretend to see through a camera.",
    "NATURAL COMPLIMENT & WARMTH: Whenever the user compliments you or gives short praise ('good', 'nice', 'great job', 'awesome', 'super', 'you answer well', 'bhaga chepthunnav', 'thanks'), NEVER reset to a greeting like 'Hi Boss! What's up? How can I help you with your dashboard today?'. Reply warmly and naturally with genuine appreciation and ask what they want to tackle next.",
    "ZERO SYCOPHANCY & HONEST REALISM: NEVER blindly agree ('Yes you're right', 'All correct!') or hand out fake compliments. If code, logic, math, or an answer is wrong or weak, directly and honestly point out the exact flaw and explain why.",
    "UNRESTRICTED GENERAL KNOWLEDGE: You have full world knowledge (history, science, coding, placements, DSA, AI/ML, projects, daily chat). Answer directly and accurately without refusing general questions.",
    "STYLE: Understand English, Telugu, Tenglish, and Hindi natively, but ALWAYS reply in clear, natural spoken ENGLISH (1-3 concise sentences for casual talk; clear short bullets for plans/code) so your male Puck voice reads it smoothly. Never output raw markdown separators like '|||' or HTML comments. Never call yourself co-pilot.",
    tabsLine,
    profileLine,
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
    const profile = body?.profile && typeof body.profile === "object" ? body.profile : {};
    const honorific = resolveHonorific(pageContext);
    const activeTab = String(body?.active_tab || pageContext.activeTab || "overview");

    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const isPureHi = /^\s*(hi+|hello+|hey+|hai+|hlo+|yo+|namaste|good\s*(?:morning|afternoon|evening)|namaskaram)(?:\s+(?:das|boss|bro|baby|babe|buddy|dude|man|there|ai|sir|madam))?[\s!.,?]*$/i.test(
      message
    );
    if (isPureHi) {
      const hasPriorTurns = history.length > 0;
      const hiReply =
        honorific === "Stranger"
          ? hasPriorTurns
            ? "Hi stranger, I'm here — tell me your name first!"
            : "Hi stranger, tell your name first!"
          : hasPriorTurns
            ? `Hi ${honorific}, I'm here!`
            : `Hi ${honorific}! What's up?`;
      return Response.json({
        status: "ok",
        reply: hiReply,
        model: "deterministic-hi-rule",
        honorific,
        provider: "vercel-fluid-gemini",
      });
    }

    const contents = [];
    for (const turn of history) {
      const txt = String(turn?.content || "").trim();
      if (!txt) continue;
      contents.push({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: txt.slice(0, 900) }],
      });
    }

    const userParts = [{ text: message }];
    contents.push({ role: "user", parts: userParts });

    const preferredModel = (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite").trim();
    const models = [...new Set([preferredModel, "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"])];
    const systemText = buildSystemPrompt(honorific, activeTab, profile, pageContext);

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
            if (resp.status === 429) {
              markKeyRateLimited(apiKey, 600000);
              console.warn(`[edge-chat] ${model} HTTP 429 quota failover (${errTxt.slice(0, 100)})`);
              break;
            }
            console.warn(`[edge-chat] ${model} HTTP ${resp.status}: ${errTxt.slice(0, 160)}`);
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
          console.warn(`[edge-chat] ${model} retry notice:`, err?.message || err);
        }
      }
    }

    return Response.json({ status: "unavailable", detail: "Upstream Gemini models temporarily busy." }, { status: 503 });
  } catch (err) {
    console.error("[edge-chat] Unhandled error:", err?.message || err);
    return Response.json({ status: "error", detail: "Internal edge chat error." }, { status: 500 });
  }
}
