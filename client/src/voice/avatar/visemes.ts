/**
 * Multilingual Viseme & Lip-Sync Engine (client/src/voice/avatar/visemes.ts)
 * Pathfinder DAS Real-Time Morph Target Computation.
 * Fuses WebAudio RMS with multilingual transcript analysis (English, Telugu, Hindi).
 */

export interface VisemeMorphWeights {
  jawOpen: number;       // 0.0 to 1.0 (jaw drop)
  mouthWide: number;     // 0.0 to 1.0 (lip corner spread: i/e)
  mouthRound: number;    // 0.0 to 1.0 (lip rounding / pucker: o/u)
  mouthSmile: number;    // 0.0 to 1.0 (subtle corner smile)
  upperLipRaise: number; // 0.0 to 1.0 (f/v lip to teeth)
}

export const NEUTRAL_VISEMES: VisemeMorphWeights = {
  jawOpen: 0.0,
  mouthWide: 0.1,
  mouthRound: 0.0,
  mouthSmile: 0.05,
  upperLipRaise: 0.0,
};

// Parameter safety bounds to prevent grotesque facial warping
export const MORPH_BOUNDS = {
  jawOpen: [0.0, 0.85],
  mouthWide: [0.0, 0.75],
  mouthRound: [0.0, 0.80],
  mouthSmile: [-0.15, 0.35],
  upperLipRaise: [0.0, 0.45],
};

// 1. English Phoneme Maps
const EN_VISEME_MAP: Record<string, Partial<VisemeMorphWeights>> = {
  // Open Vowels (A, AA)
  a: { jawOpen: 0.75, mouthWide: 0.25, mouthRound: 0.1 },
  // Spread Vowels (E, I, EE)
  e: { jawOpen: 0.35, mouthWide: 0.65, mouthRound: 0.0, upperLipRaise: 0.15 },
  i: { jawOpen: 0.25, mouthWide: 0.75, mouthRound: 0.0 },
  // Rounded Vowels (O, U, OO)
  o: { jawOpen: 0.55, mouthWide: 0.0, mouthRound: 0.85 },
  u: { jawOpen: 0.25, mouthWide: 0.0, mouthRound: 0.80 },
  // Bilabials (B, P, M) -> Closed mouth
  b: { jawOpen: 0.02, mouthWide: 0.15, mouthRound: 0.0 },
  p: { jawOpen: 0.02, mouthWide: 0.15, mouthRound: 0.0 },
  m: { jawOpen: 0.0, mouthWide: 0.15, mouthRound: 0.0 },
  // Labiodentals (F, V) -> Lip to teeth
  f: { jawOpen: 0.15, mouthWide: 0.3, upperLipRaise: 0.4 },
  v: { jawOpen: 0.15, mouthWide: 0.3, upperLipRaise: 0.4 },
};

// 2. Telugu Unicode Characters
const TE_VISEME_MAP: Record<string, Partial<VisemeMorphWeights>> = {
  "అ": { jawOpen: 0.65, mouthWide: 0.2 },
  "ఆ": { jawOpen: 0.85, mouthWide: 0.3 },
  "ఇ": { jawOpen: 0.25, mouthWide: 0.7 },
  "ఈ": { jawOpen: 0.25, mouthWide: 0.75 },
  "ఉ": { jawOpen: 0.35, mouthRound: 0.8 },
  "ఊ": { jawOpen: 0.45, mouthRound: 0.85 },
  "ఎ": { jawOpen: 0.45, mouthWide: 0.6 },
  "ఏ": { jawOpen: 0.45, mouthWide: 0.65 },
  "ఒ": { jawOpen: 0.55, mouthRound: 0.75 },
  "ఓ": { jawOpen: 0.65, mouthRound: 0.85 },
  "ప": { jawOpen: 0.02, mouthWide: 0.1 },
  "బ": { jawOpen: 0.02, mouthWide: 0.1 },
  "మ": { jawOpen: 0.0, mouthWide: 0.1 },
};

// 3. Hindi Devanagari Characters
const HI_VISEME_MAP: Record<string, Partial<VisemeMorphWeights>> = {
  "अ": { jawOpen: 0.65, mouthWide: 0.2 },
  "आ": { jawOpen: 0.85, mouthWide: 0.3 },
  "इ": { jawOpen: 0.25, mouthWide: 0.7 },
  "ई": { jawOpen: 0.25, mouthWide: 0.75 },
  "उ": { jawOpen: 0.35, mouthRound: 0.8 },
  "ऊ": { jawOpen: 0.45, mouthRound: 0.85 },
  "ए": { jawOpen: 0.45, mouthWide: 0.6 },
  "ओ": { jawOpen: 0.65, mouthRound: 0.85 },
  "प": { jawOpen: 0.02, mouthWide: 0.1 },
  "ब": { jawOpen: 0.02, mouthWide: 0.1 },
  "म": { jawOpen: 0.0, mouthWide: 0.1 },
};

export class VisemeEngine {
  private currentWeights: VisemeMorphWeights = { ...NEUTRAL_VISEMES };
  private springVelocity: VisemeMorphWeights = {
    jawOpen: 0,
    mouthWide: 0,
    mouthRound: 0,
    mouthSmile: 0,
    upperLipRaise: 0,
  };

  /**
   * Evaluates the raw target viseme parameters before spring dynamics.
   */
  public getTargetViseme(char: string, audioRMS: number = 0.5): VisemeMorphWeights {
    let target = { ...NEUTRAL_VISEMES };
    const lowerChar = (char || "").toLowerCase();

    if (EN_VISEME_MAP[lowerChar]) {
      target = { ...target, ...EN_VISEME_MAP[lowerChar] };
    } else if (TE_VISEME_MAP[char]) {
      target = { ...target, ...TE_VISEME_MAP[char] };
    } else if (HI_VISEME_MAP[char]) {
      target = { ...target, ...HI_VISEME_MAP[char] };
    } else {
      target.jawOpen = Math.min(0.75, audioRMS * 1.5);
      target.mouthWide = 0.25;
    }

    const energyScale = Math.min(1.2, Math.max(0.3, audioRMS * 2.0));
    target.jawOpen *= energyScale;
    target.mouthWide *= energyScale;
    target.mouthRound *= energyScale;
    return target;
  }

  /**
   * Evaluates the active phoneme from text and blends with actual audio RMS.
   */
  public update(char: string, audioRMS: number, deltaTime: number): VisemeMorphWeights {
    // When no audio is playing, decay swiftly to neutral (<150ms)
    if (audioRMS <= 0.02) {
      return this.decayToNeutral(deltaTime);
    }

    // Determine target from character
    let target = { ...NEUTRAL_VISEMES };
    const lowerChar = (char || "").toLowerCase();

    if (EN_VISEME_MAP[lowerChar]) {
      target = { ...target, ...EN_VISEME_MAP[lowerChar] };
    } else if (TE_VISEME_MAP[char]) {
      target = { ...target, ...TE_VISEME_MAP[char] };
    } else if (HI_VISEME_MAP[char]) {
      target = { ...target, ...HI_VISEME_MAP[char] };
    } else {
      // Default vowel opening scaled by RMS
      target.jawOpen = Math.min(0.75, audioRMS * 1.5);
      target.mouthWide = 0.25;
    }

    // Scale target by live audio energy
    const energyScale = Math.min(1.2, Math.max(0.3, audioRMS * 2.0));
    target.jawOpen *= energyScale;
    target.mouthWide *= energyScale;
    target.mouthRound *= energyScale;

    // Apply spring smoothing
    this.currentWeights = this.applySpringSmoothing(this.currentWeights, target, deltaTime);
    return this.currentWeights;
  }

  public decayToNeutral(deltaTime: number): VisemeMorphWeights {
    this.currentWeights = this.applySpringSmoothing(this.currentWeights, NEUTRAL_VISEMES, deltaTime, 24.0);
    return this.currentWeights;
  }

  private applySpringSmoothing(
    current: VisemeMorphWeights,
    target: VisemeMorphWeights,
    dt: number,
    frequency: number = 18.0
  ): VisemeMorphWeights {
    const damping = 0.85; // Critically damped
    const result: any = {};

    const keys: (keyof VisemeMorphWeights)[] = ["jawOpen", "mouthWide", "mouthRound", "mouthSmile", "upperLipRaise"];
    for (const k of keys) {
      const curVal = current[k];
      const tarVal = target[k];
      let vel = this.springVelocity[k];

      const diff = tarVal - curVal;
      const force = diff * frequency * frequency;
      const dampForce = -2.0 * damping * frequency * vel;
      const accel = force + dampForce;

      vel += accel * dt;
      let nextVal = curVal + vel * dt;

      // Clamp to anatomical limits
      const [min, max] = MORPH_BOUNDS[k];
      nextVal = Math.max(min, Math.min(max, nextVal));

      this.springVelocity[k] = vel;
      result[k] = nextVal;
    }

    return result as VisemeMorphWeights;
  }
}
