/**
 * Phonetic viseme synthesizer & live acoustic formant helper for FaceCap 3D lip-sync.
 * Generates 8 articulated facial visemes mapped onto ARKit morph weights.
 */

export type VisemeId =
  | "SIL"
  | "MBP"
  | "FV"
  | "TH_TD"
  | "SH_SZ"
  | "EE"
  | "OO"
  | "AA";

export interface VisemeWeights {
  jawOpen: number;
  close: number;
  press: number;
  pucker: number;
  funnel: number;
  stretch: number;
  upperUp: number;
  lowerDown: number;
  rollLower: number;
  smile: number;
}

export interface VisemeSegment {
  viseme: VisemeId;
  startNorm: number;
  endNorm: number;
  charOffset: number;
}

export interface VisemeTimeline {
  text: string;
  segments: VisemeSegment[];
  sampleAtFraction: (frac: number) => VisemeWeights;
  sampleAtCharIndex: (charIndex: number, subProgress?: number) => VisemeWeights;
}

export const VISEME_PRESETS: Record<VisemeId, VisemeWeights> = {
  SIL: {
    jawOpen: 0.0,
    close: 0.06,
    press: 0.0,
    pucker: 0.0,
    funnel: 0.0,
    stretch: 0.0,
    upperUp: 0.0,
    lowerDown: 0.0,
    rollLower: 0.0,
    smile: 0.05,
  },
  MBP: {
    jawOpen: 0.0,
    close: 0.78,
    press: 0.62,
    pucker: 0.0,
    funnel: 0.0,
    stretch: 0.0,
    upperUp: 0.0,
    lowerDown: 0.0,
    rollLower: 0.2,
    smile: 0.02,
  },
  FV: {
    jawOpen: 0.06,
    close: 0.08,
    press: 0.06,
    pucker: 0.0,
    funnel: 0.06,
    stretch: 0.22,
    upperUp: 0.34,
    lowerDown: 0.0,
    rollLower: 0.58,
    smile: 0.05,
  },
  TH_TD: {
    jawOpen: 0.14,
    close: 0.0,
    press: 0.0,
    pucker: 0.02,
    funnel: 0.1,
    stretch: 0.28,
    upperUp: 0.22,
    lowerDown: 0.18,
    rollLower: 0.0,
    smile: 0.07,
  },
  SH_SZ: {
    jawOpen: 0.09,
    close: 0.0,
    press: 0.0,
    pucker: 0.05,
    funnel: 0.32,
    stretch: 0.46,
    upperUp: 0.3,
    lowerDown: 0.16,
    rollLower: 0.0,
    smile: 0.12,
  },
  EE: {
    jawOpen: 0.22,
    close: 0.0,
    press: 0.0,
    pucker: 0.0,
    funnel: 0.0,
    stretch: 0.68,
    upperUp: 0.34,
    lowerDown: 0.26,
    rollLower: 0.0,
    smile: 0.26,
  },
  OO: {
    jawOpen: 0.26,
    close: 0.0,
    press: 0.0,
    pucker: 0.76,
    funnel: 0.56,
    stretch: 0.0,
    upperUp: 0.08,
    lowerDown: 0.12,
    rollLower: 0.0,
    smile: 0.0,
  },
  AA: {
    jawOpen: 0.44,
    close: 0.0,
    press: 0.0,
    pucker: 0.0,
    funnel: 0.06,
    stretch: 0.18,
    upperUp: 0.3,
    lowerDown: 0.44,
    rollLower: 0.0,
    smile: 0.08,
  },
};

export function lerpVisemeWeights(
  a: VisemeWeights,
  b: VisemeWeights,
  t: number
): VisemeWeights {
  const k = Math.max(0, Math.min(1, t));
  return {
    jawOpen: a.jawOpen + (b.jawOpen - a.jawOpen) * k,
    close: a.close + (b.close - a.close) * k,
    press: a.press + (b.press - a.press) * k,
    pucker: a.pucker + (b.pucker - a.pucker) * k,
    funnel: a.funnel + (b.funnel - a.funnel) * k,
    stretch: a.stretch + (b.stretch - a.stretch) * k,
    upperUp: a.upperUp + (b.upperUp - a.upperUp) * k,
    lowerDown: a.lowerDown + (b.lowerDown - a.lowerDown) * k,
    rollLower: a.rollLower + (b.rollLower - a.rollLower) * k,
    smile: a.smile + (b.smile - a.smile) * k,
  };
}

interface RawToken {
  viseme: VisemeId;
  weight: number;
  charOffset: number;
}

const SINGLE_CHAR_VISEME: Record<string, [VisemeId, number]> = {
  m: ["MBP", 0.9],
  b: ["MBP", 0.85],
  p: ["MBP", 0.85],
  f: ["FV", 0.9],
  v: ["FV", 0.9],
  s: ["SH_SZ", 0.85],
  z: ["SH_SZ", 0.85],
  x: ["SH_SZ", 0.95],
  c: ["SH_SZ", 0.75],
  j: ["SH_SZ", 0.8],
  o: ["OO", 1.25],
  u: ["OO", 1.15],
  w: ["OO", 1.0],
  q: ["OO", 0.9],
  e: ["EE", 1.15],
  i: ["EE", 1.1],
  y: ["EE", 1.0],
  a: ["AA", 1.35],
};

function tokenizeToVisemes(raw: string): RawToken[] {
  const lower = (raw || "").toLowerCase();
  const tokens: RawToken[] = [];
  let i = 0;

  while (i < lower.length) {
    const ch = lower[i];
    const next = lower[i + 1] || "";
    const pair = ch + next;

    if (/[.!?;:\n]/.test(ch)) {
      tokens.push({ viseme: "SIL", weight: 2.2, charOffset: i });
      i += 1;
      continue;
    }
    if (ch === ",") {
      tokens.push({ viseme: "SIL", weight: 1.4, charOffset: i });
      i += 1;
      continue;
    }
    if (/\s/.test(ch)) {
      if (tokens.length > 0 && tokens[tokens.length - 1].viseme !== "SIL") {
        tokens.push({ viseme: "SIL", weight: 0.45, charOffset: i });
      }
      i += 1;
      continue;
    }
    if (!/[a-z]/.test(ch)) {
      i += 1;
      continue;
    }

    // Digraph phonetic matches
    if (pair === "ph") {
      tokens.push({ viseme: "FV", weight: 0.95, charOffset: i });
      i += 2;
      continue;
    }
    if (pair === "sh" || pair === "ch" || pair === "zh") {
      tokens.push({ viseme: "SH_SZ", weight: 1.0, charOffset: i });
      i += 2;
      continue;
    }
    if (pair === "th") {
      tokens.push({ viseme: "TH_TD", weight: 0.95, charOffset: i });
      i += 2;
      continue;
    }
    if (pair === "oo" || pair === "ow" || pair === "ou" || pair === "oh") {
      tokens.push({ viseme: "OO", weight: 1.4, charOffset: i });
      i += 2;
      continue;
    }
    if (pair === "ee" || pair === "ea" || pair === "ey" || pair === "ie") {
      tokens.push({ viseme: "EE", weight: 1.35, charOffset: i });
      i += 2;
      continue;
    }
    if (pair === "aa" || pair === "ah" || pair === "au" || pair === "aw" || pair === "ai" || pair === "ar") {
      tokens.push({ viseme: "AA", weight: 1.45, charOffset: i });
      i += 2;
      continue;
    }

    const mapped = SINGLE_CHAR_VISEME[ch];
    if (mapped) {
      tokens.push({ viseme: mapped[0], weight: mapped[1], charOffset: i });
    } else {
      tokens.push({ viseme: "TH_TD", weight: 0.78, charOffset: i });
    }
    i += 1;
  }

  return tokens;
}

/** Builds a normalized 0..1 coarticulated viseme timeline for any spoken phrase. */
export function buildVisemeTimeline(text: string): VisemeTimeline {
  const cleanText = text || "";
  const rawTokens = tokenizeToVisemes(cleanText);
  const totalWeight = rawTokens.reduce((acc, tok) => acc + tok.weight, 0);

  if (rawTokens.length === 0 || totalWeight <= 0) {
    return {
      text: cleanText,
      segments: [{ viseme: "SIL", startNorm: 0, endNorm: 1, charOffset: 0 }],
      sampleAtFraction: () => ({ ...VISEME_PRESETS.SIL }),
      sampleAtCharIndex: () => ({ ...VISEME_PRESETS.SIL }),
    };
  }

  const segments: VisemeSegment[] = [];
  let cursor = 0;
  for (const tok of rawTokens) {
    const startNorm = cursor / totalWeight;
    cursor += tok.weight;
    const endNorm = cursor / totalWeight;
    segments.push({
      viseme: tok.viseme,
      startNorm,
      endNorm,
      charOffset: tok.charOffset,
    });
  }

  const sampleAtFraction = (frac: number): VisemeWeights => {
    const f = Math.max(0, Math.min(1, frac));
    // Binary search for segment
    let lo = 0;
    let hi = segments.length - 1;
    let idx = hi;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const seg = segments[mid];
      if (f < seg.startNorm) {
        hi = mid - 1;
      } else if (f > seg.endNorm && mid < segments.length - 1) {
        lo = mid + 1;
      } else {
        idx = mid;
        break;
      }
    }

    const cur = segments[idx];
    const span = Math.max(0.0001, cur.endNorm - cur.startNorm);
    const localT = (f - cur.startNorm) / span;
    const curPose = VISEME_PRESETS[cur.viseme];

    // Smoothly coarticulate into next phoneme across trailing 38% of segment
    if (localT > 0.62 && idx + 1 < segments.length) {
      const nextPose = VISEME_PRESETS[segments[idx + 1].viseme];
      const blend = (localT - 0.62) / 0.38;
      return lerpVisemeWeights(curPose, nextPose, blend * blend * (3 - 2 * blend));
    }
    return { ...curPose };
  };

  const sampleAtCharIndex = (charIndex: number, subProgress = 0): VisemeWeights => {
    const safeChar = Math.max(0, charIndex);
    let idx = segments.findIndex((s) => s.charOffset >= safeChar);
    if (idx < 0) idx = segments.length - 1;
    const seg = segments[idx];
    const span = seg.endNorm - seg.startNorm;
    const frac = seg.startNorm + span * Math.max(0, Math.min(0.99, subProgress));
    return sampleAtFraction(frac);
  };

  return {
    text: cleanText,
    segments,
    sampleAtFraction,
    sampleAtCharIndex,
  };
}

/**
 * Computes time-domain RMS, zero-crossing rate (ZCR for sibilant/fricative detection),
 * and normalized vocal spectral bands (F1, F2, F3) from WebAudio Analyser buffers.
 */
export function analyzeAcousticFrame(
  timeData: Uint8Array,
  freqData: Uint8Array,
  sampleRate: number,
  fftSize: number
): {
  rms: number;
  zcr: number;
  low: number;
  mid: number;
  high: number;
  f2Low: number;
  f2High: number;
} {
  let sumSq = 0;
  let crossings = 0;
  let prevSample = 0;

  for (let i = 0; i < timeData.length; i++) {
    const s = (timeData[i] - 128) / 128;
    sumSq += s * s;
    if (i > 0 && ((s >= 0 && prevSample < 0) || (s < 0 && prevSample >= 0))) {
      crossings += 1;
    }
    prevSample = s;
  }

  const rms = timeData.length > 0 ? Math.sqrt(sumSq / timeData.length) : 0;
  const zcr = timeData.length > 1 ? crossings / (timeData.length - 1) : 0;

  const binHz = Math.max(8000, sampleRate) / Math.max(64, fftSize);
  const bandEnergy = (minHz: number, maxHz: number): number => {
    if (freqData.length === 0) return 0;
    const start = Math.max(1, Math.floor(minHz / binHz));
    const end = Math.min(freqData.length - 1, Math.max(start, Math.ceil(maxHz / binHz)));
    let total = 0;
    for (let i = start; i <= end; i++) {
      total += freqData[i];
    }
    return total / ((end - start + 1) * 255);
  };

  const low = bandEnergy(180, 750);
  const mid = bandEnergy(850, 2400);
  const high = bandEnergy(2500, 6800);
  const f2Low = bandEnergy(750, 1350);
  const f2High = bandEnergy(1650, 3100);

  return { rms, zcr, low, mid, high, f2Low, f2High };
}

/**
 * Maps instantaneous acoustic formants (F1/F2/F3 + ZCR + syllable valleys) into blended
 * ARKit viseme weights so live streaming speech articulates distinct rounded, spread,
 * fricative, bilabial-closed, and open-vowel shapes even before/without text alignment.
 */
export function estimateAcousticViseme(params: {
  volume: number;
  low: number;
  mid: number;
  high: number;
  zcr: number;
  f2Low: number;
  f2High: number;
  valleyClose?: number;
}): VisemeWeights {
  const { volume, low, mid, high, zcr, f2Low, f2High, valleyClose = 0 } = params;
  if (volume <= 0.015) {
    return { ...VISEME_PRESETS.SIL };
  }

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const bandSum = low + mid + high + 0.001;
  const wLow = low / bandSum;
  const wMid = mid / bandSum;
  const wHigh = high / bandSum;
  const f2Sum = f2Low + f2High + 0.001;
  const roundDom = clamp01((f2Low / f2Sum - 0.36) * 2.2);
  const spreadDom = clamp01((f2High / f2Sum - 0.36) * 2.2 + wMid * 0.35);
  const sibScore = clamp01((zcr - 0.065) * 6.5 + (wHigh - 0.16) * 3.4);
  const openScore = clamp01(wLow * 1.45 * (1 - sibScore * 0.65));

  // Weighted mixture across core viseme prototypes
  let wMBP = clamp01(valleyClose * 1.15);
  let wSib = sibScore * (1 - wMBP * 0.8);
  let wOO = roundDom * (1 - wSib * 0.7) * (1 - wMBP * 0.8);
  let wEE = spreadDom * (1 - wOO * 0.65) * (1 - wMBP * 0.8);
  let wAA = openScore * (1 - wMBP * 0.85) * (1 - wSib * 0.45);

  const totalW = wMBP + wSib + wOO + wEE + wAA;
  if (totalW <= 0.001) {
    wAA = 1;
  } else {
    wMBP /= totalW;
    wSib /= totalW;
    wOO /= totalW;
    wEE /= totalW;
    wAA /= totalW;
  }

  const sibPreset = zcr > 0.14 ? VISEME_PRESETS.SH_SZ : VISEME_PRESETS.FV;
  const amp = clamp01(0.42 + volume * 0.82);

  const mix = (k: keyof VisemeWeights, scaleWithAmp = true) => {
    const raw =
      VISEME_PRESETS.MBP[k] * wMBP +
      sibPreset[k] * wSib +
      VISEME_PRESETS.OO[k] * wOO +
      VISEME_PRESETS.EE[k] * wEE +
      VISEME_PRESETS.AA[k] * wAA;
    return scaleWithAmp ? raw * amp : raw;
  };

  return {
    jawOpen: mix("jawOpen", true),
    close: mix("close", false),
    press: mix("press", false),
    pucker: mix("pucker", true),
    funnel: mix("funnel", true),
    stretch: mix("stretch", true),
    upperUp: mix("upperUp", true),
    lowerDown: mix("lowerDown", true),
    rollLower: mix("rollLower", false),
    smile: mix("smile", true),
  };
}
