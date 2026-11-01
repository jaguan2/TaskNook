import { describe, expect, it } from "vitest";
import { normalizeChimeVolume, normalizeSoundMix } from "./audio";

describe("normalizeChimeVolume", () => {
  it("supports mute and a continuous volume range", () => {
    expect(normalizeChimeVolume(0)).toBe(0);
    expect(normalizeChimeVolume(0.4)).toBe(0.4);
    expect(normalizeChimeVolume(2)).toBe(1);
  });

  it("keeps the original quiet default when no preference exists", () => {
    expect(normalizeChimeVolume(null)).toBe(1);
    expect(normalizeChimeVolume("broken")).toBe(1);
  });
});

describe("normalizeSoundMix", () => {
  it("keeps only known channels and clamps persisted gains", () => {
    expect(normalizeSoundMix({ rain: 2, snow: -1, cafe: 0.4, intruder: 1 })).toEqual({
      rain: 1,
      snow: 0,
      cafe: 0.4,
    });
    expect(normalizeSoundMix([])).toEqual({});
  });
});
