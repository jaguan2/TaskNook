// Derive TaskNook's whole colour ramp from a single base colour.
//
// Only the base HUE and SATURATION are taken from the picked colour — the
// lightness stops are fixed, modelled on the hand-tuned presets in index.css.
// That's deliberate: the dark surfaces (void→wine) and the light text/accents
// (rose→petal) always keep their contrast relationship, so no pick can produce
// an illegible theme. Saturation is clamped to a cozy band so nothing goes neon.

// [css variable, lightness %, role]
const RAMP = [
  ["--color-void", 8.5, "dark"], // deepest background (body gradient edge)
  ["--color-night", 13.5, "dark"],
  ["--color-plum", 18, "dark"], // panel surfaces
  ["--color-wine", 24, "dark"], // gradient centre
  ["--color-rose", 63, "accent"],
  ["--color-blush", 74, "accent"],
  ["--color-petal", 85, "accent"], // lightest — body/label text
];

export const PALETTE_VARS = RAMP.map(([name]) => name);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function hexToHsl(hex) {
  let clean = String(hex).replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Returns [r, g, b] in 0-255.
export function hslToRgb(h, s, l) {
  const sN = s / 100;
  const lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const k = (n) => (n + h / 30) % 12;
  const f = (n) => lN - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

export function hslToHex(h, s, l) {
  return (
    "#" +
    hslToRgb(h, s, l)
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** "#abc" / "abcdef" -> "#aabbcc"; returns null if it isn't a valid hex colour. */
export function normalizeHex(input) {
  const clean = String(input).trim().replace(/^#/, "");
  if (!/^[0-9a-f]{3}$/i.test(clean) && !/^[0-9a-f]{6}$/i.test(clean)) return null;
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return "#" + full.toLowerCase();
}

/**
 * Build the CSS custom properties for a base colour.
 * @returns {Record<string, string>} e.g. { "--color-night": "26 43 34", ... }
 *   Values are space-separated RGB channels so Tailwind's `<alpha-value>`
 *   opacity modifiers (bg-rose/40) keep working.
 */
export function derivePalette(hex) {
  const { h, s } = hexToHsl(hex);
  const darkSat = clamp(s, 18, 45);
  const accentSat = clamp(s + 12, 32, 70);

  const vars = {};
  for (const [name, lightness, role] of RAMP) {
    const sat = role === "dark" ? darkSat : accentSat;
    vars[name] = hslToRgb(h, sat, lightness).join(" ");
  }
  return vars;
}

/** Convenience: the three swatch colours shown on the Custom button. */
export function paletteSwatch(hex) {
  const vars = derivePalette(hex);
  return ["--color-night", "--color-rose", "--color-petal"].map(
    (k) => `rgb(${vars[k]})`
  );
}
