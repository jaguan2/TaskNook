// Derive TaskNook's whole colour ramp from a single base colour.
//
// The picked colour maps onto the ROSE stop (the main accent) as faithfully
// as legibility allows — its hue, its saturation, and its lightness within a
// cozy band — so the theme visibly IS the colour that was picked, instead of
// a sat-boosted cousin of it. Everything else grades off that: blush/petal
// lighten and desaturate toward text duty, and the dark surfaces (void→wine)
// keep FIXED low lightness stops with muted saturation, which is what
// guarantees text stays readable for any pick. Nothing can go neon or
// illegible.

// [css variable, lightness %, role]
const RAMP = [
  ["--color-void", 8.5, "dark"], // deepest background (body gradient edge)
  ["--color-night", 13.5, "dark"],
  ["--color-plum", 18, "dark"], // panel surfaces
  ["--color-wine", 24, "dark"], // gradient centre
  ["--color-rose", 0, "accent"], // lightness comes from the pick (bounded)
  ["--color-blush", 0, "accent2"],
  ["--color-petal", 85, "text"], // lightest — body/label text
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
  // Total function: garbage in must not mean "NaN NaN NaN" out — these values
  // land directly on <html> as CSS variables, and one bad set unstyles the
  // entire app with no in-app way back.
  const { h, s, l } = hexToHsl(normalizeHex(hex) || "#d98a93");
  const darkSat = clamp(s * 0.6, 14, 40);
  const accentSat = clamp(s, 22, 68);
  const roseL = clamp(l, 52, 72); // the pick itself, kept off the extremes

  const vars = {};
  for (const [name, lightness, role] of RAMP) {
    if (role === "dark") {
      vars[name] = hslToRgb(h, darkSat, lightness).join(" ");
    } else if (role === "accent") {
      vars[name] = hslToRgb(h, accentSat, roseL).join(" ");
    } else if (role === "accent2") {
      vars[name] = hslToRgb(h, accentSat * 0.85, clamp(roseL + 11, 62, 80)).join(" ");
    } else {
      // text — calm saturation so labels never look tinted-neon
      vars[name] = hslToRgb(h, clamp(s * 0.7, 18, 50), lightness).join(" ");
    }
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
