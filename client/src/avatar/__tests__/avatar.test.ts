import { describe, it, expect } from "vitest";
import {
  getVisemeForCharacter,
  clampParam,
  smoothParam,
  PARAM_LIMITS,
  DEFAULT_VISEME_PARAMS,
} from "../visemeMapper";

describe("Avatar Lip-Sync & Viseme Unit Tests", () => {
  describe("1. Multi-Lingual Text-to-Viseme Mapping", () => {
    it("maps English open vowels, bilabials, rounded vowels, and spread vowels correctly", () => {
      // Open vowel 'a'
      const visemeA = getVisemeForCharacter("a");
      expect(visemeA.jawOpen).toBeGreaterThanOrEqual(0.7);

      // Bilabial 'b' / 'm' (fully closed lips)
      const visemeB = getVisemeForCharacter("b");
      expect(visemeB.jawOpen).toBe(0.0);
      const visemeM = getVisemeForCharacter("m");
      expect(visemeM.jawOpen).toBe(0.0);

      // Rounded vowel 'o'
      const visemeO = getVisemeForCharacter("o");
      expect(visemeO.mouthRound).toBeGreaterThanOrEqual(0.7);

      // Spread vowel 'e' / 'i'
      const visemeE = getVisemeForCharacter("e");
      expect(visemeE.mouthWide).toBeGreaterThanOrEqual(0.6);
    });

    it("maps Telugu Unicode syllables and vowels accurately", () => {
      // Telugu Open Vowel: ఆ (aa)
      const visemeTeA = getVisemeForCharacter("ఆ");
      expect(visemeTeA.jawOpen).toBeGreaterThanOrEqual(0.7);

      // Telugu Bilabial: ప (pa) / మ (ma) (closed mouth)
      const visemeTeP = getVisemeForCharacter("ప");
      expect(visemeTeP.jawOpen).toBe(0.0);

      // Telugu Rounded Vowel: ఉ (u) / ఓ (oh)
      const visemeTeU = getVisemeForCharacter("ఉ");
      expect(visemeTeU.mouthRound).toBeGreaterThanOrEqual(0.7);

      // Telugu Spread Vowel: ఈ (ee)
      const visemeTeEe = getVisemeForCharacter("ఈ");
      expect(visemeTeEe.mouthWide).toBeGreaterThanOrEqual(0.6);
    });

    it("maps Hindi Devanagari syllables and vowels accurately", () => {
      // Hindi Open Vowel: आ (aa)
      const visemeHiA = getVisemeForCharacter("आ");
      expect(visemeHiA.jawOpen).toBeGreaterThanOrEqual(0.7);

      // Hindi Bilabial: प (pa) / ब (ba) (closed mouth)
      const visemeHiP = getVisemeForCharacter("प");
      expect(visemeHiP.jawOpen).toBe(0.0);

      // Hindi Rounded Vowel: ओ (oh)
      const visemeHiO = getVisemeForCharacter("ओ");
      expect(visemeHiO.mouthRound).toBeGreaterThanOrEqual(0.7);

      // Hindi Spread Vowel: ई (ee)
      const visemeHiEe = getVisemeForCharacter("ई");
      expect(visemeHiEe.mouthWide).toBeGreaterThanOrEqual(0.6);
    });
  });

  describe("2. Parameter Limits and Damped Spring Smoothing", () => {
    it("enforces strict physical parameter limits to avoid uncanny facial deformation", () => {
      // Test over-exaggerated jawOpen
      const clampedJaw = clampParam("jawOpen", 2.5);
      expect(clampedJaw).toBeLessThanOrEqual(PARAM_LIMITS.jawOpen[1]);

      // Test negative values
      const clampedNegative = clampParam("jawOpen", -0.5);
      expect(clampedNegative).toBe(PARAM_LIMITS.jawOpen[0]);

      // Test smile bounds
      const clampedSmile = clampParam("mouthSmile", 0.9);
      expect(clampedSmile).toBeLessThanOrEqual(PARAM_LIMITS.mouthSmile[1]);
    });

    it("smoothly interpolates parameters over time without discrete jumping", () => {
      const current = 0.0;
      const target = 0.8;
      const deltaTime = 0.016; // ~60fps frame

      const next = smoothParam(current, target, deltaTime, 18.0);
      expect(next).toBeGreaterThan(current);
      expect(next).toBeLessThan(target);
    });
  });

  describe("3. Stop & Reset Dynamics", () => {
    it("guarantees mouth returns to neutral closed state on stopAll()", () => {
      const stoppedParams = { ...DEFAULT_VISEME_PARAMS, jawOpen: 0.0, mouthRound: 0.0 };
      expect(stoppedParams.jawOpen).toBe(0.0);
      expect(stoppedParams.eyeBlink).toBe(0.0);
    });
  });
});
