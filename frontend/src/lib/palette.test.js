import { describe, it, expect } from "vitest";
import { derivePalette, hexToHsl, hslToHex, normalizeHex, PALETTE_VARS } from "./palette";

// Lightness (0-100) of a "r g b" channel string — the same HSL definition
// the module uses, so the assertions measure what the CSS actually gets.
function lightnessOf(channels) {
  const [r, g, b] = channels.split(" ").map((v) => Number(v) / 255);
  return ((Math.max(r, g, b) + Math.min(r, g, b)) / 2) * 100;
}

const PICKS = ["#d98a93", "#e0a53f", "#63c07a", "#4fa3e3", "#9b8bd6", "#c47b5a"];

describe("hex <-> hsl round trip", () => {
  // One colour per hue sextant plus the primaries — the three-branch hue
  // math (and its g<b wraparound) breaks silently and plausibly.
  const cases = [...PICKS, "#ff0000", "#00ff00", "#0000ff", "#f7e9e2", "#111111"];
  it.each(cases)("round-trips %s within rounding error", (hex) => {
    const { h, s, l } = hexToHsl(hex);
    const back = hslToHex(h, s, l);
    for (let i = 1; i < 7; i += 2) {
      const a = parseInt(hex.slice(i, i + 2), 16);
      const b = parseInt(back.slice(i, i + 2), 16);
      expect(Math.abs(a - b)).toBeLessThanOrEqual(2);
    }
  });
});

describe("normalizeHex", () => {
  it("expands shorthand and lowercases", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("ABC123")).toBe("#abc123");
    expect(normalizeHex("  #D98A93 ")).toBe("#d98a93");
  });
  it("rejects everything else", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("#ab")).toBeNull();
    expect(normalizeHex("#abcd")).toBeNull();
    expect(normalizeHex("not-a-color")).toBeNull();
    expect(normalizeHex(null)).toBeNull();
  });
});

describe("derivePalette — the dark-floor legibility guarantee", () => {
  // DESIGN.md: "surface stops (void→wine) keep fixed low lightness in every
  // theme, preset or custom. Accents may roam; backgrounds may not." This is
  // the promise that text stays readable for ANY picked colour.
  const extremes = [...PICKS, "#ffffff", "#000000", "#ff0000", "#00ffff"];
  it.each(extremes)("keeps dark surfaces dark for %s", (hex) => {
    const vars = derivePalette(hex);
    expect(lightnessOf(vars["--color-void"])).toBeLessThanOrEqual(11);
    expect(lightnessOf(vars["--color-night"])).toBeLessThanOrEqual(16);
    expect(lightnessOf(vars["--color-plum"])).toBeLessThanOrEqual(21);
    expect(lightnessOf(vars["--color-wine"])).toBeLessThanOrEqual(27);
    // …and the text stop stays light.
    expect(lightnessOf(vars["--color-petal"])).toBeGreaterThanOrEqual(80);
  });

  it.each(extremes)("keeps the rose accent inside its cozy band for %s", (hex) => {
    const l = lightnessOf(derivePalette(hex)["--color-rose"]);
    expect(l).toBeGreaterThanOrEqual(49);
    expect(l).toBeLessThanOrEqual(75);
  });

  it("emits every palette variable, and never NaN — even for garbage input", () => {
    for (const input of ["#d98a93", "garbage", "", null, undefined, "#12"]) {
      const vars = derivePalette(input);
      for (const name of PALETTE_VARS) {
        expect(vars[name]).toMatch(/^\d+ \d+ \d+$/);
      }
    }
  });
});
