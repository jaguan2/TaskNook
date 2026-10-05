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
 * ~58px tall with a deliberately generous illustrated head, silhouette
 * deltas must be BIG to read at this size (±1.5px is
 * documented invisible), and no combination of axes may produce shoulders
 * narrower than the head.
 */

// ---- proportions ---------------------------------------------------------- //
// Heights are screen px. The standing figure stacks legs, then a torso that
// overlaps them, then a head lifted off the shoulders — so the anchor offsets
// below are DERIVED, and retuning one constant moves everything that hangs
// off it instead of leaving hand-copied literals behind.
export const HEAD_R = 7.3;
// HEAD_R stays 7.3 because all hairstyles, hats, glasses and faces are
// authored against it. The earlier adult-proportion pass scaled that whole
// unit down to 0.75; reviewed beside the supplied Virtual Cottage 2 captures,
// that was precisely the wrong direction. Their people read through a large,
// soft head and a strong hair silhouette, especially in the seated rear view.
// The long-leg rebuild already solved the original toddler problem, so the
// head can now render at its authored size without making the body squat.
// A 1.07× lift puts the finished figure in the reference's 3.5–4-head band
// and makes the face/hair the identity carrier without drifting into a full
// super-deformed chibi. This scales the complete authored unit together.
export const HEAD_SCALE = 1.07;
export const HEAD_R_EFF = HEAD_R * HEAD_SCALE;
// Legs up, torso down: at 22/22 the visible leg was 32% of the figure's
// height and the torso a near-square 23×22 block — which is what read as
// "chunky" however it was shaded. The clay-toy retune took it to 29/17
// (~43% visible leg). That is the better reference fit: the later 31/17
// stack stretched the lower body back toward an illustrated child rather
// than a compact room-scale person.
export const LEG_H = 29;
export const TORSO_H = 17;
// How far the torso hem drops over the top of the legs.
export const TORSO_OVERLAP = 4;
// Head centre above the torso top — the neck-and-collar gap that stops the
// head sitting directly on the shoulders. Tuned WITH the head scale: the
// chin sits at headY + HEAD_R_EFF now, so the lift shrinks alongside it or
// the neck grows into a stalk. The shaped chin ends slightly above this
// radius, leaving a short visible neck instead of sinking into the collar.
export const HEAD_LIFT = 8;
// Waist depth below the torso top — 60% of the torso's height. The waist is
// a property of the BODY, not of whatever garment happens to cover it — a
// longer hem must never move it.
export const WAIST_DROP = 10;

// The default-height standing anchors. The sprite reads per-character
// values from figureMetrics (height is user-tunable); these exist for the
// tests and for anything that wants the classic figure.
export const STAND_TORSO_Y = -(LEG_H - TORSO_OVERLAP + TORSO_H);
export const STAND_HEAD_Y = STAND_TORSO_Y - HEAD_LIFT;
// Seated, the torso's bottom edge belongs at the seat line, sinking 1px into
// the cushion — low enough that the thighs emerge from under it.
export const SEAT_TORSO_Y = 1 - TORSO_H;
// The same lift seated as standing — the seated 8.0 against the standing 8.5
// was a hand-tuned accident, unified when the proportions were retuned.
export const SEAT_HEAD_Y = SEAT_TORSO_Y - HEAD_LIFT;

// ---- the two bodies and the build axis ------------------------------------ //
// The reference's head is deliberately wider than its narrow shoulder line.
// This floor keeps the torso readable beneath the effective 15.62px head
// without forcing it to equal the skull — the old 7.4px guard inflated
// chest even with the shoulder slider fully left. Arms still add a little
// outer width, so 6.45px is visually compact rather than fragile at room size.
export const MIN_SHOULDER = 6.45;

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
  // The compact-human pass keeps the two outlines distinct without turning
  // either into a geometric symbol. Masc is a soft V; fem has a narrower
  // shoulder and modest in/out waist rhythm, not the old triangular flare.
  // `limb` remains a model axis, but the delta is restrained now that the
  // shared limb bases themselves are visibly slender.
  masc: { shoulder: +1.5, waist: -0.8, hem: +0.3, limb: 0 },
  fem: { shoulder: 0, waist: -2.0, hem: +1.2, limb: -0.45 },
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
  // Scaled down together AGAIN in the slimming retune (same rule as the
  // chest-size pass: trimming only average would make the axis nonsense).
  // The blob read was mostly torso aspect — 19.2 wide × 17 tall at the old
  // average is nearly square, and no shading can rescue a square.
  slim: { halfW: 6.0, waist: 0, limb: 0 },
  average: { halfW: 6.8, waist: 0, limb: 0 },
  sturdy: { halfW: 8.0, waist: 0, limb: 0 },
};

// ---- user-tunable ranges -------------------------------------------------- //
// The panel exposes body WIDTH (the half-width the model shapes apply to),
// LEG height and TORSO height as sliders — legs and torso are separate axes
// (owner call, 2026-08-16: "there is torso height and leg height, not just
// both"). The endpoints are not taste — each sits just inside a guard:
// width's floor keeps the trouser stance tucked under the narrowest hem, its
// ceiling keeps shoulders under the 1.55×-head chunky ceiling; the leg
// range keeps the DEFAULT-torso figure's leg share ≥ 40%; the torso range is
// bounded so no combination drops the leg share under 33% (the anti-toddler
// floor) or grows past the resident's hit region.
// The floor is where masc's hem still tucks the ±4 trouser stance; the ceiling
// keeps the broadest user-selected chest beneath the 1.6×-head guard even at
// the shoulder slider's maximum. Old saves stored up to 9;
// clampNum folds them to 8.4, which is the retune applied, not data loss.
export const WIDTH_RANGE = [6.2, 8.4];
// Independent upper-body shaping. Width still owns waist, hem and limb mass;
// this axis moves only the shoulder/chest anchor so a narrow chest does not
// also force narrow hips and stick limbs. A slightly inset default corrects
// the broad classic sweater while preserving room-scale legibility.
export const SHOULDER_RANGE = [-1.6, 1.0];
export const DEFAULT_SHOULDER = -0.6;
export const HEIGHT_RANGE = [26, 32];
export const TORSO_RANGE = [14, 20];

// Neutral starting proportions for the four body axes. These are templates,
// not identities: applying one changes only geometry and deliberately leaves
// model, skin, face, hair, and every wardrobe choice untouched.
export const BODY_SIZE_PRESETS = [
  { key: "compact", label: "Compact", width: 6.2, shoulders: -0.8, height: 26, torso: 14.5 },
  { key: "balanced", label: "Balanced", width: 6.8, shoulders: -0.6, height: 29, torso: 17 },
  { key: "tall", label: "Tall", width: 6.6, shoulders: -0.6, height: 32, torso: 18.5 },
  { key: "broad", label: "Broad", width: 8.2, shoulders: 0.2, height: 30, torso: 18 },
];

export function bodySizePresetPatch(preset) {
  if (!preset) return {};
  const { width, shoulders, height, torso } = preset;
  return { width, shoulders, height, torso };
}

export function bodySizePresetMatches(character, preset) {
  return ["width", "shoulders", "height", "torso"].every(
    (key) => Number(character?.[key]) === preset[key]
  );
}

function clampNum(value, [lo, hi], fallback) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(hi, Math.max(lo, value))
    : fallback;
}

/**
 * Everything hung off the body — shoulders, arms, hands, legs, the seated
 * knee — derives from these metrics rather than from hard-coded widths, so a
 * build or model change can't leave an arm floating beside the chest.
 *
 * A stored `width`/`height` wins; a character without one (or with junk)
 * falls back to the build's width and the classic leg, so pre-slider saves
 * and the preset residents render exactly as they always did.
 *
 * `armW`/`legW`/`thighW`/`shinW` are limb thicknesses — they scale gently
 * with width, because a wide torso on unchanged stick legs reads as parts
 * pasted together. `kneeX` is where a seated knee lands (wide hems push it
 * out so the thigh isn't tucked invisibly under the torso). `standTorsoY`/
 * `standHeadY` are per-character now that height is: the standing anchors
 * stack off the leg.
 */
export function figureMetrics(ch = {}) {
  const build = BUILD_SHAPE[ch.build] ?? BUILD_SHAPE.average;
  const shape = MODEL_SHAPE[ch.model] ?? MODEL_SHAPE.masc;
  const halfW = clampNum(ch.width, WIDTH_RANGE, build.halfW);
  const legH = clampNum(ch.height, HEIGHT_RANGE, LEG_H);
  const torsoH = clampNum(ch.torso, TORSO_RANGE, TORSO_H);
  const shoulder = clampNum(ch.shoulders, SHOULDER_RANGE, DEFAULT_SHOULDER);
  // The waist rides the torso proportionally (the classic 10-of-17), so a
  // long torso doesn't wear its waist at the chest.
  const waistDrop = torsoH * (WAIST_DROP / TORSO_H);
  const limb =
    build.limb +
    (shape.limb || 0) +
    Math.max(-0.6, Math.min(0.8, (halfW - BUILD_SHAPE.average.halfW) * 0.4));
  const sh = Math.max(MIN_SHOULDER, halfW + shape.shoulder + shoulder);
  const wa = halfW + shape.waist + build.waist;
  const hem = halfW + shape.hem;
  const standTorsoY = -(legH - TORSO_OVERLAP + torsoH);
  return {
    sh,
    wa,
    hem,
    legH,
    torsoH,
    waistDrop,
    standTorsoY,
    standHeadY: standTorsoY - HEAD_LIFT,
    // Seated anchors are per-character too, now that the torso is: the
    // torso's bottom edge stays at the seat line whatever its height.
    seatTorsoY: 1 - torsoH,
    seatHeadY: 1 - torsoH - HEAD_LIFT,
    // Limbs stay visibly slimmer than the torso. The old 4.1px arm plus its
    // outward elbow added nearly another head-width to the figure and made
    // every coat look padded. These bases retain a readable model/build delta
    // without overpowering the face at miniature room scale.
    armW: 3.5 + limb,
    legW: 4.9 + limb,
    thighW: 6.5 + limb,
    shinW: 5.7 + limb,
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
            Q ${n(-sh)} ${n(top + 1)} ${n(-sh + 3.8)} ${n(top)}
            Q 0 ${n(top - 1.15)} ${n(sh - 3.8)} ${n(top)}
            Q ${n(sh)} ${n(top + 1)} ${n(sh)} ${n(top + 7)}
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
