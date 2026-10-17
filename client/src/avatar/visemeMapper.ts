/**
 * Multi-lingual Viseme and Lip-Sync Parameter Mapper
 * Supports English, Telugu (Unicode), and Hindi (Devanagari).
 * Implements critically damped smoothing, coarticulation, and speech state dynamics.
 */

export interface VisemeParams {
  jawOpen: number;       // 0.0 - 1.0 (jaw opening)
  mouthWide: number;     // 0.0 - 1.0 (lip corner spread)
  mouthRound: number;    // 0.0 - 1.0 (lip rounding / pucker)
  mouthSmile: number;    // 0.0 - 1.0 (subtle corner smile)
  upperLipRaise: number; // 0.0 - 1.0 (upper lip elevation)
  eyeBlink: number;      // 0.0 - 1.0 (0=open, 1=closed)
  browRaise: number;     // 0.0 - 1.0 (eyebrow lift)
  headYaw: number;       // -1.0 to 1.0 (left/right turn)
  headPitch: number;     // -1.0 to 1.0 (nod)
  headRoll: number;      // -1.0 to 1.0 (tilt)
}

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export const DEFAULT_VISEME_PARAMS: VisemeParams = {
  jawOpen: 0.0,
  mouthWide: 0.2,
  mouthRound: 0.0,
  mouthSmile: 0.05,
  upperLipRaise: 0.0,
  eyeBlink: 0.0,
  browRaise: 0.0,
  headYaw: 0.0,
  headPitch: 0.0,
  headRoll: 0.0,
};

// Parameter Limits for natural facial deformation without uncanny distortion
export const PARAM_LIMITS: Record<keyof VisemeParams, [number, number]> = {
  jawOpen: [0.0, 0.85],
  mouthWide: [0.0, 0.80],
  mouthRound: [0.0, 0.85],
  mouthSmile: [-0.2, 0.40],
  upperLipRaise: [0.0, 0.50],
  eyeBlink: [0.0, 1.0],
  browRaise: [-0.2, 0.60],
  headYaw: [-0.35, 0.35],
  headPitch: [-0.25, 0.25],
  headRoll: [-0.20, 0.20],
};

/**
 * Clamp a parameter to safe bounds
 */
export const clampParam = (key: keyof VisemeParams, value: number): number => {
  const [min, max] = PARAM_LIMITS[key];
  return Math.max(min, Math.min(max, value));
};

/**
 * Critically Damped Spring Smoothing
 * Blends current value towards target without robotic linear steps or overshooting.
 */
export const smoothParam = (current: number, target: number, deltaTime: number, speed: number = 18.0): number => {
  const factor = 1.0 - Math.exp(-speed * Math.max(0.001, Math.min(deltaTime, 0.1)));
  return current + (target - current) * factor;
};

/**
 * Telugu Unicode Syllable & Vowel Mapper
 */
const getTeluguViseme = (char: string): Partial<VisemeParams> => {
  const code = char.charCodeAt(0);

  // Open Vowels: అ (0x0C05), ఆ (0x0C06), ా (0x0C3E)
  if (code === 0x0C05 || code === 0x0C06 || code === 0x0C3E) {
    return { jawOpen: 0.75, mouthWide: 0.35, mouthRound: 0.05 };
  }
  // Spread Vowels: ఇ (0x0C07), ఈ (0x0C08), ఎ (0x0C0E), ఏ (0x0C0F), ఐ (0x0C10), ి, ీ, ె, ే, ై
  if ([0x0C07, 0x0C08, 0x0C0E, 0x0C0F, 0x0C10, 0x0C3F, 0x0C40, 0x0C46, 0x0C47, 0x0C48].includes(code)) {
    return { jawOpen: 0.35, mouthWide: 0.70, mouthRound: 0.0 };
  }
  // Rounded Vowels: ఉ (0x0C09), ఊ (0x0C0A), ఒ (0x0C12), ఓ (0x0C13), ఔ (0x0C14), ు, ూ, ొ, ో, ౌ
  if ([0x0C09, 0x0C0A, 0x0C12, 0x0C13, 0x0C14, 0x0C41, 0x0C42, 0x0C4A, 0x0C4B, 0x0C4C].includes(code)) {
    return { jawOpen: 0.50, mouthWide: 0.15, mouthRound: 0.80 };
  }
  // Bilabials (Fully Closed): ప, ఫ, బ, భ, మ (0x0C2A - 0x0C2E)
  if (code >= 0x0C2A && code <= 0x0C2E) {
    return { jawOpen: 0.0, mouthWide: 0.20, mouthRound: 0.0 };
  }
  // Dentals / Fricatives: త, థ, ద, ధ, న, స, శ, ష
  if ([0x0C24, 0x0C25, 0x0C26, 0x0C27, 0x0C28, 0x0C38, 0x0C36, 0x0C37].includes(code)) {
    return { jawOpen: 0.22, mouthWide: 0.45, mouthRound: 0.0 };
  }
  // Velars: క, ఖ, గ, ఘ, హ
  if ([0x0C15, 0x0C16, 0x0C17, 0x0C18, 0x0C39].includes(code)) {
    return { jawOpen: 0.42, mouthWide: 0.30, mouthRound: 0.10 };
  }

  // Default Telugu consonant opening
  return { jawOpen: 0.30, mouthWide: 0.35, mouthRound: 0.10 };
};

/**
 * Hindi Devanagari Syllable & Vowel Mapper
 */
const getHindiViseme = (char: string): Partial<VisemeParams> => {
  const code = char.charCodeAt(0);

  // Open Vowels: अ (0x0905), आ (0x0906), ा (0x093E)
  if (code === 0x0905 || code === 0x0906 || code === 0x093E) {
    return { jawOpen: 0.75, mouthWide: 0.35, mouthRound: 0.05 };
  }
  // Spread Vowels: इ, ई, ए, ऐ, ि, ी, े, ै
  if ([0x0907, 0x0908, 0x090F, 0x0910, 0x093F, 0x0940, 0x0947, 0x0948].includes(code)) {
    return { jawOpen: 0.35, mouthWide: 0.70, mouthRound: 0.0 };
  }
  // Rounded Vowels: उ, ऊ, ओ, औ, ु, ू, ो, ौ
  if ([0x0909, 0x090A, 0x0913, 0x0914, 0x0941, 0x0942, 0x094B, 0x094C].includes(code)) {
    return { jawOpen: 0.50, mouthWide: 0.15, mouthRound: 0.80 };
  }
  // Bilabials: प, फ, ब, भ, म (0x092A - 0x092E)
  if (code >= 0x092A && code <= 0x092E) {
    return { jawOpen: 0.0, mouthWide: 0.20, mouthRound: 0.0 };
  }
  // Dentals: त, थ, द, ध, न, स, श, ष
  if ([0x0924, 0x0925, 0x0926, 0x0927, 0x0928, 0x0938, 0x0936, 0x0937].includes(code)) {
    return { jawOpen: 0.22, mouthWide: 0.45, mouthRound: 0.0 };
  }
  // Velars: क, ख, ग, घ, ह
  if ([0x0915, 0x0916, 0x0917, 0x0918, 0x0939].includes(code)) {
    return { jawOpen: 0.42, mouthWide: 0.30, mouthRound: 0.10 };
  }

  // Default Hindi consonant
  return { jawOpen: 0.30, mouthWide: 0.35, mouthRound: 0.10 };
};

/**
 * English Character & Phoneme Mapper
 */
const getEnglishViseme = (char: string): Partial<VisemeParams> => {
  const c = char.toLowerCase();

  // Wide Open Vowels (a, aa, ah)
  if (c === "a") {
    return { jawOpen: 0.75, mouthWide: 0.40, mouthRound: 0.05, upperLipRaise: 0.15 };
  }
  // Spread Vowels (e, i, y)
  if (c === "e" || c === "i" || c === "y") {
    return { jawOpen: 0.35, mouthWide: 0.70, mouthRound: 0.0, upperLipRaise: 0.10 };
  }
  // Rounded Vowels (o, u, w)
  if (c === "o" || c === "u" || c === "w") {
    return { jawOpen: 0.45, mouthWide: 0.15, mouthRound: 0.85, upperLipRaise: 0.05 };
  }
  // Bilabials (b, p, m) -> Fully closed lips
  if (c === "b" || c === "p" || c === "m") {
    return { jawOpen: 0.0, mouthWide: 0.20, mouthRound: 0.0, upperLipRaise: 0.0 };
  }
  // Labiodentals (f, v) -> lower lip to upper teeth
  if (c === "f" || c === "v") {
    return { jawOpen: 0.15, mouthWide: 0.35, mouthRound: 0.10, upperLipRaise: 0.20 };
  }
  // Dentals / Alveolars (t, d, s, z, c, j, n, l, r)
  if (["t", "d", "s", "z", "c", "j", "n", "l", "r"].includes(c)) {
    return { jawOpen: 0.22, mouthWide: 0.45, mouthRound: 0.05, upperLipRaise: 0.05 };
  }
  // Velars / Back consonants (k, g, q, x, h)
  if (["k", "g", "q", "x", "h"].includes(c)) {
    return { jawOpen: 0.40, mouthWide: 0.30, mouthRound: 0.10, upperLipRaise: 0.05 };
  }

  // Spaces and punctuation -> Closed mouth natural pause
  if ([" ", ".", ",", "!", "?", ";", ":", "-", "\n"].includes(c)) {
    return { jawOpen: 0.02, mouthWide: 0.20, mouthRound: 0.0, upperLipRaise: 0.0 };
  }

  // Generic fallback consonant
  return { jawOpen: 0.25, mouthWide: 0.30, mouthRound: 0.05 };
};

/**
 * Universal Text-to-Viseme Estimator
 * Automatically determines script (Telugu, Hindi, English) and maps to viseme parameters.
 */
export const getVisemeForCharacter = (char: string): Partial<VisemeParams> => {
  if (!char) return DEFAULT_VISEME_PARAMS;

  const code = char.charCodeAt(0);

  // Telugu Unicode Block (0x0C00 - 0x0C7F)
  if (code >= 0x0C00 && code <= 0x0C7F) {
    return getTeluguViseme(char);
  }

  // Devanagari Hindi Block (0x0900 - 0x097F)
  if (code >= 0x0900 && code <= 0x097F) {
    return getHindiViseme(char);
  }

  // Default to English / Latin
  return getEnglishViseme(char);
};

/**
 * Blend RMS audio amplitude with character viseme (Audio Source A)
 */
export const shapeVisemeWithAudioAmplitude = (
  baseViseme: Partial<VisemeParams>,
  rmsAmplitude: number,
  intensity: number = 1.0
): VisemeParams => {
  const amp = Math.max(0.0, Math.min(1.0, rmsAmplitude * 2.2 * intensity));
  const baseJaw = baseViseme.jawOpen ?? 0.35;

  return {
    ...DEFAULT_VISEME_PARAMS,
    ...baseViseme,
    jawOpen: clampParam("jawOpen", Math.max(baseJaw * 0.4, amp * baseJaw * 1.5)),
    mouthWide: clampParam("mouthWide", (baseViseme.mouthWide ?? 0.2) * (0.8 + amp * 0.4)),
    mouthRound: clampParam("mouthRound", (baseViseme.mouthRound ?? 0.0) * (0.9 + amp * 0.3)),
  };
};
