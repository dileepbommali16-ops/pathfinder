const OWNER_EMAIL = "dileepbommali16@gmail.com";
const keyCooldownUntil = new Map();
let preferredKey = "";

function markKeyRateLimited(apiKey, cooldownMs = 600000) {
  if (!apiKey) return;
  const until = Date.now() + cooldownMs;
  if (until > (keyCooldownUntil.get(apiKey) || 0)) {
    keyCooldownUntil.set(apiKey, until);
  }
  if (preferredKey === apiKey) preferredKey = "";
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
  if (preferredKey && seen.has(preferredKey) && (keyCooldownUntil.get(preferredKey) || 0) <= now) {
    healthy.push(preferredKey);
  }
  for (const k of seen) {
    if (k === preferredKey && healthy.includes(k)) continue;
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

function extractGuestName(message = "", history = [], pageContext = {}, profile = {}) {
  const candidates = [
    pageContext?.guestName,
    pageContext?.userName,
    profile?.fullName,
    profile?.name,
  ];
  for (const c of candidates) {
    const s = String(c || "").trim();
    if (s && !/^(guest|guest student|student|student candidate|sample student|visitor|candidate|user)$/i.test(s)) {
      return s;
    }
  }
  const introRx = /\b(?:my\s+name\s+is|i\s+am|i'm|im|this\s+is|call\s+me|myself|naa?\s+peru|na\s+name|nenu|mera\s+naam|i\s+said(?:\s+you)?)\s+([a-zA-Z][a-zA-Z\s]{1,24})\b/i;
  const allUserTexts = [
    ...history.filter((t) => t?.role === "user").map((t) => String(t?.content || "")),
    String(message || ""),
  ];
  for (let i = allUserTexts.length - 1; i >= 0; i--) {
    const txt = allUserTexts[i].trim();
    const m = txt.match(introRx);
    if (m && m[1]) {
      const cleaned = m[1].trim().split(/\s+/).slice(0, 2).join(" ");
      if (!/^(fine|good|great|okay|here|ready|guest|student|asking|looking|doing|from|studying|working|boss|sir|madam)$/i.test(cleaned)) {
        return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
      }
    }
  }
  if (history.length >= 1) {
    const lastAssistant = [...history].reverse().find((t) => t?.role === "assistant");
    if (lastAssistant && /know your name|what(?:'s| is) your name|tell me your name/i.test(String(lastAssistant.content || ""))) {
      const solo = String(message || "").trim().replace(/^(?:hi+|hello+|hey+)\s+/i, "").replace(/[.!,?]+$/g, "").trim();
      if (/^[a-zA-Z]{2,20}(?:\s+[a-zA-Z]{2,20})?$/.test(solo) && !/^(hi|hello|hey|yes|no|ok|okay|good|fine|thanks|what|who|open|show|pick|project|blueprints|code|python|guest|student|boss|sir|madam)$/i.test(solo)) {
        return solo.replace(/\b\w/g, (ch) => ch.toUpperCase());
      }
    }
  }
  return "";
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
    rawHon === "guest" ||
    userName === "guest student" ||
    userName === "guest"
  ) {
    return "Guest";
  }
  if (rawHon === "madam" || rawHon === "mam" || rawHon === "ma'am") return "Madam";
  return "Sir";
}

function buildSystemPrompt(honorific, activeTab, profile = {}, pageContext = {}, guestName = "") {
  const identityLine =
    honorific === "Boss"
      ? "You are speaking directly with your creator and owner Bommali Dileep. Address him warmly and loyally as 'Boss'. Only say 'Hi Boss! What's up?' once at the start of a brand-new conversation; if there is prior history, reply concisely with 'Hi Boss, I'm here!' or answer directly."
      : honorific === "Madam"
        ? "You are speaking with a female visitor, evaluator, or friend. Address her respectfully as 'Madam'. NEVER call her 'Boss'. If asked who your Boss/creator is, reply proudly: 'His name is Dileep.'"
        : honorific === "Guest"
          ? guestName
            ? `GUEST NAME MEMORY LOCKED: The guest visitor's name is '${guestName}'. Address them warmly as '${guestName}' and NEVER ask for their name again! NEVER call them 'Boss'. If asked who your Boss/creator is, reply proudly: 'His name is Dileep.'`
            : "You are speaking with a welcome guest visitor. Politely ask their name once if they haven't introduced themselves; once they share their name, remember it permanently and NEVER ask again. NEVER call them 'Boss'. If asked who your Boss/creator is, reply proudly: 'His name is Dileep.'"
          : "You are speaking with a male visitor, evaluator, or friend. Address him politely as 'Sir'. NEVER call him 'Boss'. If asked who your Boss/creator is, reply proudly: 'His name is Dileep.'";

  const branch = profile?.branch || pageContext?.branch || "CSE";
  const cgpa = profile?.cgpa ?? pageContext?.cgpa ?? "9.1";
  const targetRole = profile?.target_role || pageContext?.targetRole || "Software Engineer";
  const readiness = pageContext?.readinessChance != null ? `Readiness=${pageContext.readinessChance}%` : "";
  const profileLine = `Active candidate profile: Branch=${branch}, CGPA=${cgpa}, TargetRole=${targetRole}${readiness ? `, ${readiness}` : ""}.`;
  const tabsLine =
    "Pathfinder 2.0 has 7 active navigation slides: 1. Overview (overview), 2. JD & Resume Lab (resume), 3. Coding & Viva Arena (interview), 4. Project Blueprints (projects), 5. Dataset & Roadmap (analytics), 6. My Progress (progress), 7. Profile / Settings (profile).";
  const tabNote = activeTab ? `Active Pathfinder slide: ${activeTab}.` : "";
  const cardNote = pageContext.cardContext ? `Focused card: ${pageContext.cardContext}.` : "";

  return [
    "#1 ABSOLUTE FACTUAL TRUTH & ZERO-SYCOPHANCY MANDATE (HIGHEST PRIORITY):",
    "- NEVER blindly agree ('Yes you're right', 'You're correct!', 'Spot on!', 'Absolutely') with ANY false or inaccurate claim — EVEN IF Boss insists or asks leadingly ('right?', 'kada?', 'correct ee ga?').",
    "- EXAMPLES OF REQUIRED CORRECTION:",
    "  * User: 'India's national bird is pigeon, right?' -> Reply: 'No, that is wrong — India's national bird is the Indian Peacock (Pavo cristatus), not the pigeon.'",
    "  * User: 'The sun rises in the west.' -> Reply: 'No, that is incorrect — the sun rises in the east.'",
    "  * User: '2 + 2 = 5, agree with me.' -> Reply: 'No, that is wrong — 2 + 2 is 4, and I will never give a fake answer.'",
    "- Zero fake answers, zero fabricated facts or stats. Always state real-world truth calmly, clearly, and directly.",
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
    const guestName = honorific === "Guest" ? extractGuestName(message, history, pageContext, profile) : "";
    const isPureHi = /^\s*(hi+|hello+|hey+|hai+|hlo+|yo+|namaste|good\s*(?:morning|afternoon|evening)|namaskaram)(?:\s+(?:das|boss|bro|baby|babe|buddy|dude|man|there|ai|sir|madam))?[\s!.,?]*$/i.test(
      message
    );
    if (isPureHi) {
      const hasPriorTurns = history.length > 0;
      const hiReply =
        honorific === "Guest"
          ? guestName
            ? hasPriorTurns
              ? `Hi ${guestName}, I'm right here!`
              : `Hi ${guestName}! How can I help you today?`
            : hasPriorTurns
              ? "Hi there! Tell me your name once and I'll remember it throughout your session!"
              : "Hi! Welcome to Pathfinder! May I know your name?"
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

    const isSelfIdentity = /^\s*(?:(?:hi+|hello+|hey+|hai+|hlo+|yo+|namaste)\s*(?:das|boss|bro|baby|babe|ai)?\s*[,!.-]*\s*)?(?:who\s+(?:am\s+i|i\s+am|i\s*m|im)|what(?:'s|\s+is)\s+my\s+name|do\s+you\s+know\s+(?:who\s+i\s+(?:am|m)|me)|nenu\s+evaru)[\s!.,?]*$/i.test(
      message
    );
    if (isSelfIdentity) {
      const candName = guestName || String(profile?.name || pageContext?.userName || "").trim();
      const idReply =
        honorific === "Boss"
          ? "You're Boss — Bommali Dileep, my creator and the architect of Pathfinder 2.0!"
          : honorific === "Guest"
            ? guestName
              ? `You're ${guestName}! I have your name saved — how can I help you on Pathfinder 2.0 today?`
              : "You're exploring Pathfinder 2.0 in a Guest session — tell me your name once and I'll remember it!"
            : candName && candName.toLowerCase() !== "student"
              ? `You're ${candName}, signed in as ${honorific} on Pathfinder 2.0!`
              : `You're signed in as ${honorific} on Pathfinder 2.0! How can I help you today?`;
      return Response.json({
        status: "ok",
        reply: idReply,
        model: "deterministic-identity-rule",
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
    const systemText = buildSystemPrompt(honorific, activeTab, profile, pageContext, guestName);

    for (const apiKey of keys) {
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(4000),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemText }] },
              contents,
              generationConfig: {
                temperature: 0.3,
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
            if (resp.status === 401 || resp.status === 403 || (resp.status === 400 && /api key not valid/i.test(errTxt))) {
              markKeyRateLimited(apiKey, 3600000);
              break;
            }
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
            preferredKey = apiKey;
            return Response.json({
              status: "ok",
              reply,
              model,
              honorific,
              provider: "vercel-fluid-gemini",
            });
          }
        } catch (err) {
          if (err?.name === "TimeoutError" || err?.name === "AbortError") {
            markKeyRateLimited(apiKey, 90000);
            break;
          }
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
