/**
 * Style for a sprite's main material: the placement's `--tint` when one is
 * set, else the classic colour. One copy, shared by the furniture catalog
 * (IsoItems) and the character package.
 *
 * Returns `{fill}` and deliberately NOT `color` — `currentColor` inside a
 * sprite silently resolves to the app's inherited cream, a trap the wardrobe
 * work hit for real (CLAUDE.md records it). Pass the style object around
 * instead of reaching for currentColor.
 */
export const tinted = (fallback) => ({ fill: `var(--tint, ${fallback})` });

/** Relative luminance of a #rrggbb hex, 0..1. Anything unparseable is 0.5. */
export const lumOf = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return 0.5;
  const v = parseInt(m[1], 16);
  return (
    (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255
  );
};

/**
 * Luminance-adaptive shading strengths for a user-picked colour: a dark
 * overlay dies on a near-black garment and a light one on cream, so the pair
 * rebalances — dark fills lean on the highlight to carry the form, light
 * fills on the shadow. Multiply a mark's base opacity by the matching
 * factor. (Industry rule: shading must survive ANY colour the picker
 * offers; a fixed opacity only survives mid-tones.)
 */
export const toneFor = (hex) => {
  const L = lumOf(hex);
  return { shade: 0.7 + L * 0.9, glint: 1.9 - L * 1.2 };
};
