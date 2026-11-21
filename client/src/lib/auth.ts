/**
 * auth.ts - Smart Identity Authorization & Honorific Engine (Boss / Madam / Sir)
 */

export type HonorificTitle = "Boss" | "Madam" | "Sir" | "Stranger";
export type HonorificKey = "boss" | "madam" | "sir" | "stranger";

// ONLY Dileep's verified primary Google account is recognized as Boss (Owner).
export const OWNER_EMAIL = "dileepbommali16@gmail.com";
export const OWNER_EMAILS = [OWNER_EMAIL];

export function isGuestAccount(email?: string, username?: string): boolean {
  const e = (email || "").toLowerCase().trim();
  const u = (username || "").toLowerCase().trim();
  if (!e) return true;
  if (e === "guest@pathfinder.ai" || e.startsWith("guest@") || e.endsWith("@guest.local")) {
    return true;
  }
  if (u === "guest student" || u === "guest" || u === "stranger") {
    return true;
  }
  return false;
}

// Extensive female given names / tokens across Indian & international accounts
const FEMALE_NAME_TOKENS = new Set([
  "aanya", "abigail", "aishwarya", "alina", "alisha", "amelia", "ananya",
  "anitha", "anita", "anjali", "ankita", "aparna", "archana", "arpita",
  "aruna", "asha", "ashley", "ava", "ayushi", "bhavana", "bhavani", "bhavya",
  "chandana", "chandrika", "charlotte", "claire", "deepika", "deepthi", "deepti",
  "devi", "disha", "divya", "diya", "durga", "elena", "elizabeth", "emily",
  "emma", "evelyn", "gayatree", "gayathri", "gayatri", "geeta", "geetha",
  "gouri", "gowri", "haarika", "hannah", "harika", "harini", "haritha",
  "hema", "hemalatha", "indira", "indu", "isabella", "isha", "ishita",
  "jahnavi", "janaki", "jaya", "jennifer", "jessica", "jyothi", "jyoti",
  "kajal", "kalpana", "kalyani", "kamala", "kanaka", "karthika", "kaveri",
  "kavita", "kavitha", "kavya", "keerti", "keerthi", "khushi", "kiara",
  "kirti", "komali", "krishnaveni", "kriti", "kritika", "kumari", "lakshmi",
  "lata", "latha", "lauren", "lavanya", "laxmi", "leela", "madhavi",
  "madhuri", "mahalakshmi", "mahek", "malathi", "mamatha", "manasa",
  "manisha", "manjula", "maya", "meena", "meenakshi", "megan", "meghana",
  "meghna", "mehak", "mia", "mounika", "mrudula", "muskaan", "muskan",
  "myra", "nandini", "nandita", "natasha", "navya", "neelima", "neeraja",
  "neha", "nicole", "nikhita", "nikita", "nimisha", "nina", "nirmala",
  "nisha", "nithya", "nitya", "olivia", "padma", "padmavathi", "palak",
  "pallavi", "parul", "parvathi", "parvati", "pavani", "pavitra", "payal",
  "piya", "pooja", "poojitha", "prabhavati", "prachi", "pragathi", "prameela",
  "pranathi", "prasanthi", "prashanthi", "prathyusha", "pratyusha", "pravallika",
  "preethi", "preeti", "prerna", "priya", "priyanka", "puja", "purva",
  "pushpa", "rachana", "rachel", "radha", "radhika", "ragini", "rajani",
  "rajeswari", "rajitha", "ramani", "ramya", "ranjani", "rashi", "rashmi",
  "ratna", "ravali", "rekha", "renuka", "revathi", "revati", "rhea", "richa",
  "ritika", "riya", "rohini", "roja", "roopa", "roshani", "roshni",
  "rukmini", "rupa", "rupali", "sadhana", "sahiti", "sahithi", "sailaja",
  "sakshi", "saloni", "samantha", "samiksha", "sandhya", "sangeeta",
  "sangeetha", "sanika", "sanjana", "sanskriti", "sanya", "sara", "sarada",
  "sarah", "sarala", "saraswati", "sarita", "saritha", "sarojini", "satyavati",
  "saumya", "savita", "savitha", "savithri", "seetha", "shagun", "shailaja",
  "shakuntala", "shalini", "shamili", "shanthi", "shanti", "sharada",
  "sharmila", "sheela", "shilpa", "shivani", "shobha", "shraddha",
  "shravani", "shravanthi", "shreya", "shridevi", "shruti", "shruthi",
  "shubha", "shweta", "shyama", "simran", "sindhu", "sindhura", "sireesha",
  "siri", "sirisha", "sita", "smita", "smitha", "smriti", "sneha",
  "sobhana", "sonal", "sonali", "sonam", "sonia", "soniya", "sophia",
  "soujanya", "soumya", "sowjanya", "sowmya", "spandana", "sravani",
  "sravanthi", "sreeja", "sreelatha", "sreedevi", "sreya", "sridevi",
  "srija", "srilatha", "srishti", "srivalli", "srividya", "sruthi",
  "stephanie", "stuti", "subhadra", "subhashini", "sucheta", "sudha",
  "suguna", "suhasini", "sujata", "sujatha", "sukanya", "sukriti",
  "sulochana", "sumalatha", "sumathi", "sumitra", "sunanda", "sundari",
  "sunita", "sunitha", "supriya", "surekha", "susheela", "sushila", "sushma",
  "swapna", "swarna", "swaroopa", "swathi", "swati", "swetha", "tanisha",
  "tanu", "tanvi", "tanya", "tara", "taruni", "tejaswi", "tejaswini",
  "trisha", "trupti", "tulasi", "uma", "urmila", "urvashi", "usha",
  "vaidehi", "vaishnavi", "valli", "vandana", "vani", "vanita", "vanitha",
  "varalakshmi", "varnika", "varsha", "vasanta", "vasantha", "vasavi",
  "vasudha", "vasundhara", "vedavati", "veena", "vennela", "vibha", "vidhi",
  "vidya", "vijaya", "vijayalakshmi", "vimala", "vineela", "vinita",
  "vinitha", "vishala", "yamini", "yashoda", "yogita", "zoya",
]);

const FEMALE_EMAIL_SUBSTRINGS = [
  "priyanka", "gayatri", "gayathri", "lakshmi", "divya", "kavya", "navya",
  "bhavya", "ramya", "sowmya", "soumya", "swathi", "sneha", "pooja",
  "anitha", "sunitha", "kavitha", "geetha", "radha", "rekha", "keerthi",
  "sruthi", "shruti", "swetha", "meghana", "harika", "tejaswi", "vaishnavi",
  "anjali", "aishwarya", "bhavani", "deepika", "janaki", "jyothi", "kalpana",
  "kalyani", "lavanya", "madhavi", "mamatha", "manasa", "meenakshi",
  "mounika", "nandini", "padma", "pallavi", "pavani", "pragathi",
  "prathyusha", "pravallika", "preethi", "rajitha", "renuka", "revathi",
  "rohini", "sandhya", "sangeetha", "sanjana", "shailaja", "shalini",
  "shilpa", "shivani", "shravani", "shreya", "sindhu", "sireesha", "sirisha",
  "sowjanya", "sravani", "sravanthi", "sreeja", "srivalli", "srividya",
  "sujatha", "supriya", "swapna", "tanvi", "trisha", "vaidehi", "vandana",
  "vanitha", "varsha", "vasavi", "vennela", "vijaya", "yamini", "madam", "girl",
];

function getOverrideMap(): Record<string, HonorificTitle> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("das_honorific_override_map");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isOwnerAccount(email?: string, _username?: string): boolean {
  const e = (email || "").toLowerCase().trim();
  // STRICT RULE: Only dileepbommali16@gmail.com is recognized as Boss (Owner).
  // Any other account, username, or guest (even with "dileep" in the name) is treated as a regular visitor.
  return e === OWNER_EMAIL;
}

export function isFemaleAccount(email?: string, username?: string): boolean {
  const e = (email || "").toLowerCase().trim();
  const u = (username || "").toLowerCase().trim();
  const localPart = (e.split("@")[0] || "").replace(/[0-9]+/g, " ");

  if (/\b(ms|mrs|miss|smt|kumari|madam|mam|ma'am|female)\b/.test(`${u} ${e}`)) {
    return true;
  }

  const nameTokens = `${u} ${localPart}`.split(/[\s._+-]+/).filter(Boolean);
  for (const tok of nameTokens) {
    if (FEMALE_NAME_TOKENS.has(tok)) return true;
  }

  // Handle concatenated local parts like "priyankabommali12"
  const rawLocal = (e.split("@")[0] || "").toLowerCase();
  if (FEMALE_EMAIL_SUBSTRINGS.some((sub) => rawLocal.includes(sub))) {
    return true;
  }
  return false;
}

export function inferHonorific(
  email?: string,
  username?: string,
  explicitPref?: string
): HonorificTitle {
  if (isOwnerAccount(email, username)) return "Boss";
  if (isGuestAccount(email, username)) return "Stranger";
  if (explicitPref) {
    const norm = explicitPref.toLowerCase().trim();
    if (norm === "madam" || norm === "mam" || norm === "ma'am") return "Madam";
    if (norm === "sir") return "Sir";
  }
  if (isFemaleAccount(email, username)) return "Madam";
  return "Sir";
}

export function toHonorificKey(title: HonorificTitle | string): HonorificKey {
  const lower = (title || "").toLowerCase().trim();
  if (lower === "boss") return "boss";
  if (lower === "madam" || lower === "mam" || lower === "ma'am") return "madam";
  if (lower === "sir") return "sir";
  return "stranger";
}

export function getUserRole(email?: string, username?: string): HonorificTitle {
  const storedPathfinder =
    typeof window !== "undefined" ? localStorage.getItem("pathfinder_user") || "" : "";
  let parsedPf: { email?: string; username?: string; name?: string } | null = null;
  if (storedPathfinder) {
    try {
      parsedPf = JSON.parse(storedPathfinder);
    } catch { }
  }

  const effectiveEmail =
    email ??
    ((typeof window !== "undefined" ? localStorage.getItem("userEmail") : "") ||
      parsedPf?.email ||
      "");
  const effectiveName =
    username ??
    ((typeof window !== "undefined" ? localStorage.getItem("userName") : "") ||
      parsedPf?.username ||
      parsedPf?.name ||
      "");

  if (isOwnerAccount(effectiveEmail)) return "Boss";
  if (isGuestAccount(effectiveEmail, effectiveName)) return "Stranger";

  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = (urlParams.get("mode") || urlParams.get("role") || "").toLowerCase().trim();
    if (urlMode === "madam") return "Madam";
    if (urlMode === "sir") return "Sir";

    const key = (effectiveEmail || effectiveName || "").toLowerCase().trim();
    const overrideMap = getOverrideMap();
    if (key && overrideMap[key]) {
      if (overrideMap[key] === "Madam" || overrideMap[key] === "Sir") {
        return overrideMap[key];
      }
    }
  }

  return inferHonorific(effectiveEmail, effectiveName);
}

export function getHonorificKey(email?: string, username?: string): HonorificKey {
  return toHonorificKey(getUserRole(email, username));
}

export function setHonorificPreference(role: HonorificTitle | "Auto", email?: string): HonorificTitle {
  if (typeof window === "undefined") {
    return role === "Auto" ? "Stranger" : role;
  }

  const activeEmail = email || localStorage.getItem("userEmail") || "";
  const activeName = localStorage.getItem("userName") || "";
  const ownerVerified = isOwnerAccount(activeEmail);
  const guestVerified = isGuestAccount(activeEmail, activeName);
  const key = (activeEmail || activeName || "").toLowerCase().trim();
  const overrideMap = getOverrideMap();

  let resolved: HonorificTitle;
  if (ownerVerified) {
    resolved = "Boss";
  } else if (guestVerified) {
    resolved = "Stranger";
    if (key) {
      delete overrideMap[key];
      try {
        localStorage.setItem("das_honorific_override_map", JSON.stringify(overrideMap));
      } catch { }
    }
  } else if (role === "Auto") {
    if (key) {
      delete overrideMap[key];
      try {
        localStorage.setItem("das_honorific_override_map", JSON.stringify(overrideMap));
      } catch { }
    }
    resolved = inferHonorific(activeEmail, activeName);
  } else if (role === "Boss" || role === "Stranger") {
    // Non-owner signed-in accounts can never escalate to Boss
    resolved = inferHonorific(activeEmail, activeName);
  } else {
    resolved = role;
    if (key) {
      overrideMap[key] = resolved;
      try {
        localStorage.setItem("das_honorific_override_map", JSON.stringify(overrideMap));
      } catch { }
    }
  }

  localStorage.setItem("userRole", resolved);
  localStorage.setItem("isOwner", resolved === "Boss" ? "true" : "false");
  localStorage.setItem("das_mode", resolved.toUpperCase());
  localStorage.setItem("das_honorific_override", resolved);

  window.dispatchEvent(
    new CustomEvent("das:honorific-change", {
      detail: { role: resolved, honorificKey: toHonorificKey(resolved), email: activeEmail, username: activeName },
    })
  );
  return resolved;
}

export function handleAuthLoginDetected(
  email?: string,
  username?: string,
  explicitPref?: string
): HonorificTitle {
  const effectiveEmail = (email || "").trim();
  const effectiveName = (username || "").trim();
  const prevEmail =
    typeof window !== "undefined" ? (localStorage.getItem("userEmail") || "").trim().toLowerCase() : "";
  const accountChanged = Boolean(effectiveEmail && prevEmail && prevEmail !== effectiveEmail.toLowerCase());
  const ownerVerified = isOwnerAccount(effectiveEmail);
  const guestVerified = isGuestAccount(effectiveEmail, effectiveName);

  if (typeof window !== "undefined" && (accountChanged || guestVerified)) {
    localStorage.removeItem("das_honorific_override");
    localStorage.removeItem("das_mode");
    localStorage.removeItem("isOwner");
    localStorage.removeItem("userRole");
    if (guestVerified) {
      const overrideMap = getOverrideMap();
      delete overrideMap["guest@pathfinder.ai"];
      delete overrideMap["guest student"];
      try {
        localStorage.setItem("das_honorific_override_map", JSON.stringify(overrideMap));
      } catch { }
    }
  }

  const key = (effectiveEmail || effectiveName).toLowerCase().trim();
  const overrideMap = getOverrideMap();
  const savedPerAccount = key && !explicitPref && !guestVerified ? overrideMap[key] : undefined;
  const safeSaved =
    savedPerAccount && (savedPerAccount === "Madam" || savedPerAccount === "Sir")
      ? savedPerAccount
      : undefined;
  const requestedExplicit =
    !ownerVerified && !guestVerified && explicitPref && explicitPref !== "Auto"
      ? inferHonorific(effectiveEmail, effectiveName, explicitPref)
      : undefined;
  const safeExplicit =
    requestedExplicit && (requestedExplicit === "Madam" || requestedExplicit === "Sir")
      ? requestedExplicit
      : undefined;

  const role: HonorificTitle = ownerVerified
    ? "Boss"
    : guestVerified
      ? "Stranger"
      : safeExplicit || safeSaved || inferHonorific(effectiveEmail, effectiveName);

  if (typeof window !== "undefined") {
    if (effectiveEmail) localStorage.setItem("userEmail", effectiveEmail);
    else localStorage.removeItem("userEmail");
    if (effectiveName) localStorage.setItem("userName", effectiveName);
    localStorage.setItem("userRole", role);
    localStorage.setItem("isOwner", role === "Boss" ? "true" : "false");
    localStorage.setItem("das_mode", role.toUpperCase());
    localStorage.setItem("das_honorific_override", role);

    if (safeExplicit && key) {
      overrideMap[key] = role;
      try {
        localStorage.setItem("das_honorific_override_map", JSON.stringify(overrideMap));
      } catch { }
    }

    window.dispatchEvent(
      new CustomEvent("das:honorific-change", {
        detail: { role, honorificKey: toHonorificKey(role), email: effectiveEmail, username: effectiveName },
      })
    );
  }

  return role;
}

export function initAuthMode(): HonorificTitle {
  if (typeof window === "undefined") return "Stranger";

  const storedEmail = (localStorage.getItem("userEmail") || "").trim();
  const storedName = (localStorage.getItem("userName") || "").trim();
  const pathfinderUserRaw = localStorage.getItem("pathfinder_user");
  let parsedUser: { email?: string; username?: string; name?: string } | null = null;
  if (pathfinderUserRaw) {
    try {
      parsedUser = JSON.parse(pathfinderUserRaw);
    } catch { }
  }

  const email = storedEmail || (parsedUser?.email || "").trim();
  const username = storedName || (parsedUser?.username || parsedUser?.name || "").trim();

  if (email || username) {
    return handleAuthLoginDetected(email, username);
  }

  localStorage.setItem("userRole", "Stranger");
  localStorage.setItem("isOwner", "false");
  localStorage.setItem("das_mode", "STRANGER");
  localStorage.setItem("das_honorific_override", "Stranger");
  return "Stranger";
}
