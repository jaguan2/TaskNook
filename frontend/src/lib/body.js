/**
 * The resident's body — every number and curve the figure is built from,
 * in one importable place.
 *
 * Pure by design, exactly like `lib/profile.js`: no DOM, no React, so the
 * node-environment tests can assert on the geometry directly. The sprite in
 * `IsoItems.jsx`, the panel previews, and the tests all consume THESE values;
 * three hand-copied versions of the same numbers is how `ISO_ENVS` once
 * drifted, and a body has far more numbers than an env list.
 *
 * The rules this file encodes were paid for — the history lives in
 * docs/MODELS.md §2 "Persona proportions". The short version: the figure is
 * ~58px tall with the head a quarter of it (toddler proportion was the first
 * shipped bug), silhouette deltas must be BIG to read at this size (±1.5px is
 * documented invisible), and no combination of axes may produce shoulders
 * narrower than the head.
 */

// ---- proportions ---------------------------------------------------------- //
// Heights are screen px. The standing figure stacks legs, then a torso that
// overlaps them, then a head lifted off the shoulders — so the anchor offsets
// below are DERIVED, and retuning one constant moves everything that hangs
// off it instead of leaving hand-copied literals behind.
export const HEAD_R = 7.3;
// Legs up, torso down: at 22/22 the visible leg was 32% of the figure's
// height and the torso a near-square 23×22 block — which is what read as
// "chunky" however it was shaded. The owner's reference art (clay-toy 3D
// character kits) carries nearly HALF the figure as leg over a short torso;
// 29/17 brings the visible leg to 43% while keeping total height at ~58px
// so nothing seat- or camera-tuned moves. A first, timid pass at 25/20
// (37% leg) still read as the old body — proportion changes have to be big
// enough to survive 57px, same lesson as the model deltas.
export const LEG_H = 29;
export const TORSO_H = 17;
// How far the torso hem drops over the top of the legs.
export const TORSO_OVERLAP = 4;
// Head centre above the torso top — the neck-and-collar gap that stops the
// head sitting directly on the shoulders.
export const HEAD_LIFT = 8.5;
// Waist depth below the torso top — 60% of the torso's height. The waist is
// a property of the BODY, not of whatever garment happens to cover it — a
// longer hem must never move it.
export const WAIST_DROP = 10;

export const STAND_TORSO_Y = -(LEG_H - TORSO_OVERLAP + TORSO_H);
export const STAND_HEAD_Y = STAND_TORSO_Y - HEAD_LIFT;
// Seated, the torso's bottom edge belongs at the seat line, sinking 1px into
// the cushion — low enough that the thighs emerge from under it.
export const SEAT_TORSO_Y = 1 - TORSO_H;
// The same lift seated as standing — the seated 8.0 against the standing 8.5
// was a hand-tuned accident, unified when the proportions were retuned.
export const SEAT_HEAD_Y = SEAT_TORSO_Y - HEAD_LIFT;

// ---- the two bodies and the build axis ------------------------------------ //
// Every shoulder must clear the head, whatever build and model combine.
// Cheaper to assert once here than to rediscover it on one of the
// combinations: fem + slim once produced a body narrower than its own skull,
// which is exactly the top-heavy proportion docs/MODELS.md exists to prevent.
// The narrow read comes from the WAIST-to-hem contrast instead.
export const MIN_SHOULDER = 8.6;

/**
 * The two bodies, as offsets from the build's half-width.
 *
 * Silhouette only — at ~40px tall that's all that survives, and it's the
 * whole difference: `masc` is broad-shouldered and drops nearly straight;
 * `fem` has narrower shoulders, a drawn-in waist and a hem that flares back
 * out, so the outline alternates in/out instead of tapering once.
 *
 * The deltas have to be BIG. The first pass used ±1.5px between the two,
 * which is invisible on a 40px figure — both rows of the contact sheet
 * looked like the same body twice.
 */
export const MODEL_SHAPE = {
  // masc's shoulder came down from +2.6 in the chest-size pass: the
  // reference kits' shoulders sit at ~1.2–1.3× the head, and +2.6 on the
  // old widths put ours at 1.6×.
  masc: { shoulder: +2.2, waist: -0.4, hem: +0.4 },
  fem: { shoulder: +0.6, waist: -3.0, hem: +2.6 },
};

/**
 * The build axis. `halfW` is the base half-width every model offset applies
 * to; `waist` widens (or draws in) the waist on top of the model's own
 * offset; `limb` thickens or thins arms and legs together.
 *
 * `build` scales the body, `model` shapes it — the grid is models × builds
 * rather than one axis pretending to be two.
 */
export const BUILD_SHAPE = {
  // The chest-size pass scaled all three halfWs down TOGETHER — trimming
  // only average would have left it narrower than slim, which makes the
  // axis nonsense. These widths are final; the build axis still owes the
  // waist/limb deltas (and possibly a fourth build) on top of them.
  slim: { halfW: 6.6, waist: 0, limb: 0 },
  average: { halfW: 7.4, waist: 0, limb: 0 },
  sturdy: { halfW: 8.8, waist: 0, limb: 0 },
};

/**
 * Everything hung off the body — shoulders, arms, hands, legs, the seated
 * knee — derives from these metrics rather than from hard-coded widths, so a
 * build or model change can't leave an arm floating beside the chest.
 *
 * `armW`/`legW`/`thighW`/`shinW` are limb thicknesses; `kneeX` is where a
 * seated knee lands (wide hems push it out so the thigh isn't tucked
 * invisibly under the torso — a thigh nobody can see is how you end up back
 * at a straight leg).
 */
export function figureMetrics(ch = {}) {
  const build = BUILD_SHAPE[ch.build] ?? BUILD_SHAPE.average;
  const shape = MODEL_SHAPE[ch.model] ?? MODEL_SHAPE.masc;
  const sh = Math.max(MIN_SHOULDER, build.halfW + shape.shoulder);
  const wa = build.halfW + shape.waist + build.waist;
  const hem = build.halfW + shape.hem;
  return {
    sh,
    wa,
    hem,
    armW: 5 + build.limb,
    legW: 5.6 + build.limb,
    thighW: 7.5 + build.limb,
    shinW: 6.5 + build.limb,
    kneeX: Math.max(8.5, hem - 0.5),
  };
}

// ---- the torso ------------------------------------------------------------ //
/**
 * The torso outline and its shade band, as SVG path data.
 *
 * The sides are ONE quadratic through the waist to the hem rather than a
 * straight taper, so `fem` can come in and flare back out — a straight line
 * can only narrow, which is why both bodies used to be the same wedge at
 * different widths.
 *
 * The band is its own path rather than a rect or a gradient: it has to
 * follow the silhouette to stay inside it, and MODELS.md wants flat tones,
 * not a ramp. Its top corners must sit ON the body's curve, not at `wa` —
 * `wa` is the quadratic's CONTROL point, which the curve never reaches; the
 * actual edge at the halfway point is the Bezier midpoint. Using `wa` left a
 * ~2px unshaded crescent down each hip, worst exactly where fem's waist is
 * most drawn in.
 *
 * `bot` and `waistY` are parameters (defaulting to the body's own) so a
 * longer garment can extend the hem and still get a correctly-seated band —
 * but the waist never moves with the hem (see WAIST_DROP).
 *
 * The template literals' line breaks and indentation are part of the emitted
 * path data — kept exactly as the sprite always wrote them, so renders
 * byte-compare across the extraction.
 */
export function torsoGeom({ sh, wa, hem, top, bot = top + TORSO_H, waistY = top + WAIST_DROP }) {
  // Non-integer half-widths accumulate float dust (8.4 + 0.4 − 3 prints as
  // 5.800000000000001), and that dust would land verbatim in the DOM's path
  // data. Three decimals is 1/1000px — far below anything visible.
  const n = (v) => +v.toFixed(3);
  const body = `M ${n(-sh)} ${n(top + 7)}
            Q ${n(-sh)} ${n(top + 0.5)} ${n(-sh + 3.5)} ${n(top)}
            L ${n(sh - 3.5)} ${n(top)} Q ${n(sh)} ${n(top + 0.5)} ${n(sh)} ${n(top + 7)}
            Q ${n(wa)} ${n(waistY)} ${n(hem)} ${n(bot - 3)}
            Q ${n(hem)} ${n(bot)} ${n(hem - 3)} ${n(bot)}
            L ${n(-hem + 3)} ${n(bot)} Q ${n(-hem)} ${n(bot)} ${n(-hem)} ${n(bot - 3)}
            Q ${n(-wa)} ${n(waistY)} ${n(-sh)} ${n(top + 7)} Z`;
  const mid = (a, b, c) => 0.25 * a + 0.5 * b + 0.25 * c;
  const edgeX = mid(sh, wa, hem);
  const edgeY = mid(top + 7, waistY, bot - 3);
  // Second half of the same curve, so the band's sides ARE the body's.
  const ctrlX = 0.5 * wa + 0.5 * hem;
  const ctrlY = 0.5 * waistY + 0.5 * (bot - 3);
  const band = `M ${n(-edgeX)} ${n(edgeY)} L ${n(edgeX)} ${n(edgeY)}
            Q ${n(ctrlX)} ${n(ctrlY)} ${n(hem)} ${n(bot - 3)}
            Q ${n(hem)} ${n(bot)} ${n(hem - 3)} ${n(bot)}
            L ${n(-hem + 3)} ${n(bot)} Q ${n(-hem)} ${n(bot)} ${n(-hem)} ${n(bot - 3)}
            Q ${n(-ctrlX)} ${n(ctrlY)} ${n(-edgeX)} ${n(edgeY)} Z`;
  return { body, band };
}

// ---- depth colour --------------------------------------------------------- //
/**
 * The far-limb colour for a user-pickable material.
 *
 * Two limbs in one colour read as one block, so the far leg has always been
 * a darker pair (docs/MODELS.md §2) — but a FIXED darker hue only works for
 * the colour it was tuned against, which is fine for constants and wrong the
 * moment the material becomes user-pickable. Deriving it keeps the pairing
 * for any colour.
 *
 * Floor, not round: floor is what reproduces the hand-tuned trouser pair
 * (#4a3a5b → #3c2f4a) exactly, so switching to the derivation changed no
 * pixels. The shoes keep their fixed pair — they aren't user-colourable and
 * their hand-tuned values are not an exact ×0.82.
 */
export function farColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.floor(c * 0.82);
  const rgb = (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255);
  return `#${rgb.toString(16).padStart(6, "0")}`;
}
