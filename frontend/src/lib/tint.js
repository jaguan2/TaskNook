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
