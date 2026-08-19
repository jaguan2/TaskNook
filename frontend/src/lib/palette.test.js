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

  // The separate backdrop hue (2026-08-19): the dark stops may take their own
  // hue, but the legibility guarantee is lightness, and lightness never moves.
  it.each(extremes)("a backdrop pick keeps the same dark floor for %s", (hex) => {
    const vars = derivePalette("#4fa3e3", hex);
    expect(lightnessOf(vars["--color-void"])).toBeLessThanOrEqual(11);
    expect(lightnessOf(vars["--color-night"])).toBeLessThanOrEqual(16);
    expect(lightnessOf(vars["--color-plum"])).toBeLessThanOrEqual(21);
    expect(lightnessOf(vars["--color-wine"])).toBeLessThanOrEqual(27);
    expect(lightnessOf(vars["--color-petal"])).toBeGreaterThanOrEqual(80);
  });

  it("the backdrop hue changes only the dark stops, and garbage means follow-accent", () => {
    const plain = derivePalette("#4fa3e3");
    const surfaced = derivePalette("#4fa3e3", "#6b5544");
    // accents and text untouched…
    for (const name of ["--color-rose", "--color-blush", "--color-petal"]) {
      expect(surfaced[name]).toBe(plain[name]);
    }
    // …while the surfaces actually moved.
    expect(surfaced["--color-night"]).not.toBe(plain["--color-night"]);
    // Garbage (or null) backdrop = the classic one-colour behaviour, exactly.
    expect(derivePalette("#4fa3e3", "not-a-color")).toEqual(plain);
    expect(derivePalette("#4fa3e3", null)).toEqual(plain);
  });
});

// --------------------------------------------------------------------------
// The PRESET themes in index.css aren't built by derivePalette — they're
// hand-authored — so nothing enforced its rules on them. Four of the five
// drifted: surfaces up at 71–100% saturation, a blue accent inside a gold
// palette, text tinted 68%. These pin the discipline that made Sea Breeze the
// only one worth using.
// --------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseThemes() {
  const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
  const themes = {};
  for (const [, name, body] of css.matchAll(
    /(?::root|\[data-theme="(\w+)"\])\s*\{([^}]*)\}/g
  )) {
    const vars = {};
    for (const m of body.matchAll(/--color-(\w+):\s*(\d+)\s+(\d+)\s+(\d+)/g)) {
      vars[m[1]] = [+m[2], +m[3], +m[4]];
    }
    if (vars.rose) themes[name || "plum"] = vars;
  }
  return themes;
}

const relLum = (rgb) => {
  const c = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const satOf = ([r, g, b]) => hexToHsl(`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`).s;

const THEMES = parseThemes();
const NAMES = Object.keys(THEMES);

describe("preset themes hold the same line as the custom ramp", () => {
  it("ships every theme the picker offers", () => {
    expect(NAMES.sort()).toEqual(["abyss", "linen", "plum", "shore", "walnut"]);
  });

  it.each(NAMES)("%s keeps its dark surfaces near-neutral", (name) => {
    // Colour belongs to the accent. Surfaces at 71–100% saturation (the old
    // abyss) aren't dark surfaces, they're a light show.
    for (const stop of ["void", "night", "plum", "wine"]) {
      expect(satOf(THEMES[name][stop]), `${name}.${stop} saturation`).toBeLessThanOrEqual(30);
    }
  });

  it.each(NAMES)("%s keeps body text legible on its panels", (name) => {
    const t = THEMES[name];
    // petal is the body/label colour; plum is the panel surface it sits on.
    expect(contrast(t.petal, t.plum), `${name} petal on plum`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.petal, t.night), `${name} petal on night`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NAMES)("%s keeps its accent distinguishable from the surface", (name) => {
    const t = THEMES[name];
    // 3:1 is the WCAG threshold for UI components and large text, which is
    // what rose is used for (pills, borders, headings).
    expect(contrast(t.rose, t.plum), `${name} rose on plum`).toBeGreaterThanOrEqual(3);
  });

  it.each(NAMES)("%s never puts two SATURATED opposing hues in one ramp", (name) => {
    // walnut used to pair a khaki rose (23%) with a BLUE blush (24%) — both
    // saturated enough to read as colour, and opposite each other.
    //
    // But Sea Breeze pairs a cool rose with a warm blush and looks great, so
    // "same hue family" is the wrong rule: its rose is only 13% saturated, so
    // its hue doesn't read and the warm blush is simply the colour of the
    // theme. The rule is about two hues COMPETING, not two hues existing.
    const t = THEMES[name];
    const hue = (rgb) =>
      hexToHsl(`#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`).h;
    if (satOf(t.rose) < 18 || satOf(t.blush) < 18) return; // one reads as neutral
    const gap = Math.abs(hue(t.rose) - hue(t.blush));
    expect(Math.min(gap, 360 - gap), `${name} rose→blush hue gap`).toBeLessThanOrEqual(40);
  });

  it.each(NAMES)("%s gets lighter from void to petal, with no reversals", (name) => {
    const t = THEMES[name];
    const ladder = ["void", "night", "plum", "wine"].map((s) => relLum(t[s]));
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i], `${name} stop ${i} vs ${i - 1}`).toBeGreaterThan(ladder[i - 1]);
    }
    expect(relLum(t.petal)).toBeGreaterThan(relLum(t.blush));
  });
});
