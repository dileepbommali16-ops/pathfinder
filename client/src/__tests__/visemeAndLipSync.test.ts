import { describe, it, expect } from "vitest";
import {
  analyzeAcousticFrame,
  buildVisemeTimeline,
  VISEME_PRESETS,
} from "../agent/viseme";

describe("Real Phonetic Viseme & Acoustic Lip-Sync Engine", () => {
  it("tokenizes bilabial, rounded, spread, labiodental, and open phonemes cleanly", () => {
    const timeline = buildVisemeTimeline("Boss! Meet up.");
    expect(timeline.segments.length).toBeGreaterThan(6);

    // First char 'B' -> MBP (jaw shut, mouthClose & press engaged)
    const bPose = timeline.sampleAtCharIndex(0, 0);
    expect(bPose.jawOpen).toBe(0);
    expect(bPose.close).toBeGreaterThan(0.5);
    expect(bPose.press).toBeGreaterThan(0.4);

    // 'o' in Boss -> OO (pucker engaged without excessive jaw drop)
    const oPose = timeline.sampleAtCharIndex(1, 0);
    expect(oPose.pucker).toBeGreaterThan(0.45);
    expect(oPose.jawOpen).toBeLessThan(0.3);

    // 'ee' in Meet -> EE (wide stretch, zero pucker)
    const eePose = timeline.sampleAtCharIndex(7, 0);
    expect(eePose.stretch).toBeGreaterThan(0.45);
    expect(eePose.pucker).toBeLessThan(0.05);

    // Trailing exclamation mark -> SIL (closed rest pose)
    const endPose = timeline.sampleAtFraction(1.0);
    expect(endPose.jawOpen).toBe(0);
  });

  it("distinguishes F/V labiodental bite and AA open vowel without permanent O-pucker", () => {
    const fvTimeline = buildVisemeTimeline("fast voice");
    const fPose = fvTimeline.sampleAtCharIndex(0, 0);
    expect(fPose.rollLower).toBeGreaterThan(0.35);
    expect(fPose.pucker).toBe(0);

    const aaTimeline = buildVisemeTimeline("haha");
    const aPose = aaTimeline.sampleAtCharIndex(1, 0);
    expect(aPose.jawOpen).toBeGreaterThanOrEqual(0.35);
    expect(aPose.jawOpen).toBeLessThanOrEqual(0.45);
    expect(aPose.pucker).toBe(0);
  });

  it("computes silence vs low-ZCR voiced vowel vs high-ZCR sibilant accurately", () => {
    const fftSize = 1024;
    const silentTime = new Uint8Array(fftSize).fill(128);
    const silentFreq = new Uint8Array(fftSize / 2).fill(0);
    const s0 = analyzeAcousticFrame(silentTime, silentFreq, 48000, fftSize);
    expect(s0.rms).toBe(0);
    expect(s0.zcr).toBe(0);

    // ~200 Hz vowel wave at 48kHz
    const vowelTime = new Uint8Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      vowelTime[i] = Math.round(128 + 48 * Math.sin((2 * Math.PI * 200 * i) / 48000));
    }
    const vowelFreq = new Uint8Array(fftSize / 2);
    vowelFreq.fill(180, 4, 15);
    const vRes = analyzeAcousticFrame(vowelTime, vowelFreq, 48000, fftSize);
    expect(vRes.rms).toBeGreaterThan(0.2);
    expect(vRes.zcr).toBeLessThan(0.04);
    expect(vRes.low).toBeGreaterThan(vRes.high);

    // ~5500 Hz sibilant wave at 48kHz
    const sibTime = new Uint8Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      sibTime[i] = Math.round(128 + 32 * Math.sin((2 * Math.PI * 5500 * i) / 48000));
    }
    const sibFreq = new Uint8Array(fftSize / 2);
    sibFreq.fill(200, 60, 140);
    const sibRes = analyzeAcousticFrame(sibTime, sibFreq, 48000, fftSize);
    expect(sibRes.rms).toBeGreaterThan(0.12);
    expect(sibRes.zcr).toBeGreaterThan(0.18);
    expect(sibRes.high).toBeGreaterThan(sibRes.low);
  });

  it("keeps SIL neutral rest preset strictly closed", () => {
    expect(VISEME_PRESETS.SIL.jawOpen).toBe(0);
    expect(VISEME_PRESETS.SIL.pucker).toBe(0);
    expect(VISEME_PRESETS.SIL.funnel).toBe(0);
  });
});
