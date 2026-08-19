// The character's BODY: palette constants, the leg drawings (front and
// profile), the two faces, and the held-pose limb helper. The geometry itself
// (half-widths, torso curve, anchors) lives in lib/body.js — this file is the
// artwork that reads those numbers. See docs/MODELS.md for the silhouette
// rules it answers to.
import { HEAD_R, LEG_H, farColor } from "../../lib/body";
import { toneFor } from "../../lib/tint";

export const SKIN = "#edc39e";
export const HAIR = "#3a3142";
// Eyes and mouth are drawn in a fixed dark ink, NOT in the hair colour. They
// used to share it, which was invisible while hair was always near-black —
// but pick honey or mint in the profile and a face drawn in it disappears.
export const INK = "#3a3142";
// How far hair stands off the skull. See hair.jsx — hair drawn on the head's
// own radius is a decal, not a layer.
export const HAIR_LIFT = 1.2;
// How far an OUTER garment stands off the body it's worn over. See garments.jsx.
export const OUTER_BULK = 1.1;
// ---- THE LIGHT ---------------------------------------------------------- //
// One light for the whole figure: above, slightly in front, from screen
// RIGHT — where the hair sheen already sat. Every form shadow and highlight
// derives from it; a mark that disagrees reads as a part from another kit.
//   SHADE — form shadow (the side falling away from the light). Cool
//     violet-dark, NOT pure black: translucent black scales a colour toward
//     grey and reads washed-out, while a cool dark keeps the hue alive with
//     less value drop (and matches the app's plum nights). Still translucent,
//     so it survives every colour the picker offers.
//   GLINT — highlight. Warm off-white, not pure white — pure white overlays
//     desaturate toward chalk; warm reads as lamplight.
//   Crevices (where two forms touch: under a hem, inside a pocket mouth)
//   stay NEUTRAL #000 — occlusion is the absence of light, not cool light.
export const SHADE = "#221638";
export const GLINT = "#fff3e0";
// Fixed ANCHORS — tiny regions the tint never touches (the shoe-sole rule
// generalised): denim topstitch ochre, dungaree-buckle brass. A small fixed
// material is what makes a user recolour look designed instead of hue-shifted.
export const STITCH = "#c9995c";
export const BRASS = "#d9a05b";
export const TROUSER = "#4a3a5b";
// The far leg is derived, not hand-tuned — which is what let the trousers
// become user-colourable without a second palette: `farColor(trouser)` at the
// call site does for any hex what a constant did for one.
export const SHOE = "#2b2350";
export const SHOE_FAR = "#221c40";

/**
 * One seated leg: thigh forward to the knee, shin down to the floor.
 *
 * Drawn as round-capped strokes rather than boxes. The pose used to be two
 * axis-aligned rects stacked vertically, which is geometrically just a
 * shorter straight leg — a standing figure sunk into the seat, not a sitting
 * one. A joint you can actually see is the entire difference.
 *
 * `ankle` comes from the seat's height (the sprite is lifted by it, so the
 * floor sits at +seatH here) so the feet land on the floor instead of
 * dangling at cushion level.
 */
// The knee sits BELOW the torso's bottom edge and outside its width — a thigh
// tucked behind the body is a thigh nobody can see, which is how you end up
// back at a straight leg. But only just outside: 8.5 splayed the knees
// nearly a shoulder-width past the hips, a sofa manspread the VC2 reference
// never does — its seated figures keep the knees roughly under the
// shoulders (retuned 2026-08-19, judged seated on the Loft sofa).
export const SEAT_KNEE_Y = 5;
export const SEAT_KNEE_X = 6.9;

// The classic pair keeps its hand-tuned far tone byte-exact; any other
// colour derives one, same rule as the trousers.
const farShoe = (hex) => (hex === SHOE ? SHOE_FAR : farColor(hex));

/**
 * The shoe from the FRONT, per kind — REMODELLED (owner, twice: "just two
 * circles", then "they look around the same"). Every kind is now BUILT like
 * a shoe instead of restyled from one ellipse: a SOLE the upper sits on, an
 * UPPER with its own silhouette, and the hardware that names it. The sole is
 * a fixed light rubber tone — soles aren't dyed with the shoe, and the
 * two-material split is most of what makes a shoe read as modelled.
 * `cx` is the foot's centre; the floor is at y≈2.7.
 */
const SOLE = "#ded5c4";
const SOCK = "#f2ede4";

export function FrontShoe({ cx, kind = "sneakers", color = SHOE, far = false }) {
  // Far depth comes from DERIVING each material darker (farColor), never
  // from a wash rect over the whole piece — a rect is wider than the leg,
  // and its spill painted a grey slab onto the floor beside the far foot
  // (owner screenshot: "a random shadow on the left leg").
  const c = far ? farShoe(color) : color;
  const sole = far ? farColor(SOLE) : SOLE;
  const sock = far ? farColor(SOCK) : SOCK;
  if (kind === "loafers") {
    return (
      <g>
        {/* sleek low vamp on a thin stacked sole */}
        <rect x={cx - 4.5} y="1.3" width="9" height="1.5" rx="0.7" fill={c} />
        <rect x={cx - 4.5} y="1.9" width="9" height="0.9" rx="0.45" fill="#000" opacity="0.3" />
        <path
          d={`M ${cx - 4.4} 1.5 Q ${cx - 4.6} -0.7 ${cx - 1.8} -1.3 L ${cx + 1.8} -1.3
              Q ${cx + 4.6} -0.7 ${cx + 4.4} 1.5 z`}
          fill={c}
        />
        <ellipse cx={cx} cy="-0.1" rx="2.7" ry="0.9" fill="#fff" opacity="0.22" />
        {/* the penny strap, with its slot */}
        <rect x={cx - 2.5} y="-1.15" width="5" height="1.1" rx="0.55" fill="#000" opacity="0.32" />
        <rect x={cx - 0.7} y="-0.95" width="1.4" height="0.7" rx="0.35" fill={c} />
      </g>
    );
  }
  if (kind === "boots") {
    return (
      <g>
        {/* shaft with a folded cuff, over a chunky block sole */}
        <rect x={cx - 3.2} y="-8.6" width="6.4" height="8.2" rx="1.1" fill={c} />
        <rect x={cx - 3.6} y="-9.2" width="7.2" height="2.5" rx="1.1" fill={c} />
        <rect x={cx - 3.6} y="-9.2" width="7.2" height="2.5" rx="1.1" fill="#fff" opacity="0.2" />
        <rect x={cx - 2.8} y="-6.2" width="1.1" height="4.6" fill="#fff" opacity="0.09" />
        <path
          d={`M ${cx - 4.5} 1.4 Q ${cx - 4.6} -1 ${cx - 1.6} -1.6 L ${cx + 1.6} -1.6
              Q ${cx + 4.6} -1 ${cx + 4.5} 1.4 z`}
          fill={c}
        />
        <rect x={cx - 4.7} y="1.2" width="9.4" height="1.7" rx="0.8" fill="#000" opacity="0.32" />
        <ellipse cx={cx} cy="-0.4" rx="2.6" ry="0.9" fill="#fff" opacity="0.16" />
      </g>
    );
  }
  if (kind === "heels") {
    return (
      <g>
        {/* a low pointed pump: shallow vamp, deep throat, spike behind */}
        <path
          d={`M ${cx - 4.3} 2 Q ${cx - 4} -0.4 ${cx - 1.4} -0.9 Q ${cx + 1.6} -1.2 ${cx + 3.2} 0.4
              Q ${cx + 3.9} 1.3 ${cx + 3.8} 2 z`}
          fill={c}
        />
        <path d={`M ${cx - 1.6} -0.7 q 1.7 -0.7 3.2 0.3 q -1.6 0.2 -3.2 -0.3 z`} fill="#000" opacity="0.28" />
        <ellipse cx={cx - 1.8} cy="0.6" rx="1.6" ry="0.7" fill="#fff" opacity="0.28" />
        <rect x={cx - 4.3} y="1.8" width="8.1" height="0.65" rx="0.3" fill="#000" opacity="0.24" />
        <rect x={cx + 1.9} y="1.4" width="1.05" height="2.1" rx="0.4" fill={c} />
        <rect x={cx + 1.9} y="1.4" width="1.05" height="2.1" rx="0.4" fill="#000" opacity="0.18" />
      </g>
    );
  }
  if (kind === "maryjanes") {
    return (
      <g>
        {/* the sock frill above a rounded strapped shoe */}
        <rect x={cx - 2.7} y="-3" width="5.4" height="1.8" rx="0.9" fill={sock} />
        <path
          d={`M ${cx - 4.3} 1.6 Q ${cx - 4.4} -0.9 ${cx} -1.5 Q ${cx + 4.4} -0.9 ${cx + 4.3} 1.6 z`}
          fill={c}
        />
        <rect x={cx - 4} y="-1.2" width="8" height="1.05" rx="0.5" fill={c} />
        <rect x={cx - 4} y="-0.5" width="8" height="0.4" fill="#000" opacity="0.22" />
        <circle cx={cx + 2.9} cy="-0.65" r="0.55" fill="#fff" opacity="0.75" />
        <ellipse cx={cx - 1} cy="0.2" rx="2" ry="0.8" fill="#fff" opacity="0.24" />
        <rect x={cx - 4.3} y="1.5" width="8.6" height="0.9" rx="0.45" fill="#000" opacity="0.24" />
      </g>
    );
  }
  // sneakers: a chunky light SOLE under a laced upper — the two-material
  // split that says "trainer" at any size
  return (
    <g>
      <rect x={cx - 4.9} y="0.8" width="9.8" height="2.1" rx="1" fill={sole} />
      <rect x={cx - 4.9} y="2.1" width="9.8" height="0.8" rx="0.4" fill="#000" opacity="0.2" />
      <path
        d={`M ${cx - 4.5} 1 Q ${cx - 4.7} -1.6 ${cx - 1.7} -2.4 Q ${cx + 1.7} -3 ${cx + 3.7} -1.2
            Q ${cx + 4.6} -0.2 ${cx + 4.5} 1 z`}
        fill={c}
      />
      <ellipse cx={cx + 0.4} cy="0.1" rx="2.7" ry="1" fill="#fff" opacity="0.26" />
      <path d={`M ${cx - 2.6} -1.5 q 2 -0.8 4 0`} stroke="#000" strokeWidth="0.7" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d={`M ${cx - 2.2} -0.5 q 1.8 -0.7 3.6 0`} stroke="#000" strokeWidth="0.7" fill="none" opacity="0.3" strokeLinecap="round" />
    </g>
  );
}

/**
 * The shoe in PROFILE, toe pointing -x — same modelled construction, and
 * the view where each silhouette really earns its name.
 */
export function SideShoe({ cx, kind = "sneakers", color = SHOE, far = false }) {
  // Same far rule as FrontShoe: derive materials darker, no wash rect.
  const c = far ? farShoe(color) : color;
  const sole = far ? farColor(SOLE) : SOLE;
  const sock = far ? farColor(SOCK) : SOCK;
  if (kind === "loafers") {
    return (
      <g>
        <path
          d={`M ${cx - 7.3} 1.9 Q ${cx - 7.4} 0.3 ${cx - 5.2} -0.3 Q ${cx - 2.2} -1.2 ${cx + 0.4} -1.4
              L ${cx + 2.3} -1 Q ${cx + 2.7} 0.6 ${cx + 2.6} 1.9 z`}
          fill={c}
        />
        <rect x={cx - 7.3} y="1.7" width="9.9" height="0.9" rx="0.45" fill="#000" opacity="0.28" />
        <rect x={cx + 0.9} y="1.1" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.26" />
        <rect x={cx - 1.2} y="-1.6" width="2.3" height="1" rx="0.5" fill="#000" opacity="0.32" />
        <ellipse cx={cx - 4.8} cy="0.1" rx="2" ry="0.8" fill="#fff" opacity="0.24" />
      </g>
    );
  }
  if (kind === "boots") {
    return (
      <g>
        <rect x={cx - 2.7} y="-8.8" width="5.4" height="8.6" rx="1" fill={c} />
        <rect x={cx - 3.1} y="-9.4" width="6.2" height="2.4" rx="1" fill={c} />
        <rect x={cx - 3.1} y="-9.4" width="6.2" height="2.4" rx="1" fill="#fff" opacity="0.2" />
        <path
          d={`M ${cx - 7.2} 1.6 Q ${cx - 7.2} 0 ${cx - 4.6} -0.6 L ${cx + 2.7} -0.6 L ${cx + 2.7} 1.6 z`}
          fill={c}
        />
        <rect x={cx - 7.5} y="1.4" width="10.4" height="1.6" rx="0.7" fill="#000" opacity="0.3" />
        <ellipse cx={cx - 5} cy="0.3" rx="1.9" ry="0.8" fill="#fff" opacity="0.18" />
      </g>
    );
  }
  if (kind === "heels") {
    return (
      <g>
        {/* the pump: pointed toe, high arch, the spike doing the standing */}
        <path
          d={`M ${cx - 7.4} 2.4 Q ${cx - 6.4} 0.6 ${cx - 3.8} -0.6 Q ${cx - 1} -1.7 ${cx + 1.2} -1.5
              L ${cx + 2.4} -0.9 Q ${cx + 2.6} 0.4 ${cx + 1.8} 1 Q ${cx - 1} 1.2 ${cx - 3.2} 1.8
              Q ${cx - 5.6} 2.5 ${cx - 7.4} 2.4 z`}
          fill={c}
        />
        <path d={`M ${cx - 1.8} -1.2 q 1.9 -0.5 3.4 0.4 q -1.7 0.3 -3.4 -0.4 z`} fill="#000" opacity="0.26" />
        <ellipse cx={cx - 5.2} cy="0.7" rx="1.8" ry="0.7" fill="#fff" opacity="0.28" />
        <path d={`M ${cx + 0.9} 0.9 L ${cx + 2.1} 0.9 L ${cx + 1.9} 3 L ${cx + 1.3} 3 z`} fill={c} />
        <path d={`M ${cx + 0.9} 0.9 L ${cx + 2.1} 0.9 L ${cx + 1.9} 3 L ${cx + 1.3} 3 z`} fill="#000" opacity="0.18" />
      </g>
    );
  }
  if (kind === "maryjanes") {
    return (
      <g>
        <rect x={cx - 1.6} y="-3.2" width="3.4" height="1.9" rx="0.9" fill={sock} />
        <path
          d={`M ${cx - 7} 1.9 Q ${cx - 7.1} 0.1 ${cx - 4.4} -0.7 Q ${cx - 1.6} -1.5 ${cx + 1.2} -1.3
              L ${cx + 2.4} -0.7 Q ${cx + 2.6} 0.7 ${cx + 2.5} 1.9 z`}
          fill={c}
        />
        <rect x={cx - 1.4} y="-1.7" width="1.1" height="1.6" rx="0.5" fill={c} />
        <rect x={cx - 1.4} y="-1.7" width="1.1" height="1.6" rx="0.5" fill="#000" opacity="0.2" />
        <circle cx={cx - 0.85} cy="-1.15" r="0.5" fill="#fff" opacity="0.75" />
        <rect x={cx - 7} y="1.7" width="9.5" height="0.9" rx="0.45" fill="#000" opacity="0.26" />
        <ellipse cx={cx - 4.6} cy="0.1" rx="1.9" ry="0.8" fill="#fff" opacity="0.24" />
      </g>
    );
  }
  // sneakers: the light sole runs the whole length; laces cross the instep;
  // a heel tab finishes the back
  return (
    <g>
      <path
        d={`M ${cx - 7.8} 2.7 L ${cx + 2.9} 2.7 L ${cx + 2.9} 0.9 Q ${cx - 2.4} 0.5 ${cx - 7.3} 1.3 z`}
        fill={sole}
      />
      <rect x={cx - 7.7} y="2.3" width="10.5" height="0.7" rx="0.35" fill="#000" opacity="0.18" />
      <path
        d={`M ${cx - 7.1} 1.3 Q ${cx - 6.7} -0.3 ${cx - 4.4} -1.1 Q ${cx - 1.4} -2.2 ${cx + 0.9} -1.9
            L ${cx + 2.5} -1.1 Q ${cx + 2.8} 0.1 ${cx + 2.7} 1 Q ${cx - 2.4} 0.6 ${cx - 7.1} 1.3 z`}
        fill={c}
      />
      <ellipse cx={cx - 5.6} cy="0" rx="1.9" ry="1" fill="#fff" opacity="0.28" />
      <path d={`M ${cx - 3.2} -1.2 q 1.5 -0.6 2.9 -0.2`} stroke="#000" strokeWidth="0.65" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d={`M ${cx - 2.6} -0.3 q 1.3 -0.5 2.5 -0.1`} stroke="#000" strokeWidth="0.65" fill="none" opacity="0.3" strokeLinecap="round" />
      <rect x={cx + 1.7} y="-2.4" width="1.1" height="1.5" rx="0.5" fill={c} />
    </g>
  );
}

/**
 * What each bottom DOES to a leg drawing — artwork knowledge, so it lives
 * beside the drawings rather than in the catalog. `shorts` ends the cloth at
 * the knee; `bare` removes it entirely (the skirt kinds — the flare itself is
 * drawn by the assembly at hip level); `slim`/`wide` adjust the column;
 * `straight` drops the knee bow (a wide drape hides the knee); the rest are
 * MARKS: a pressed crease, a turned-up hem, a jogger's elastic ankle cuff.
 */
const PANTS_FORM = {
  trousers: {},
  dress: { slim: -0.7, crease: true, cleanHem: true },
  // `stitch` = the contrast topstitch that NAMES denim — one dashed ochre
  // line above the hem, in fixed STITCH so it contrasts any wash the user
  // dyes the denim.
  jeans: { turnup: true, stitch: true },
  joggers: { slim: -0.5, cuffBand: true },
  wide: { wide: 2.4, straight: true },
  shorts: { shorts: true },
  jorts: { shorts: true, turnup: true, stitch: true },
  skirt: { bare: true },
  pleats: { bare: true },
  // The maxi's legs are entirely covered — bare wiring, with the assembly
  // extending its flare cone to the ankle.
  maxi: { bare: true },
};
export const pantsFormOf = (key) => PANTS_FORM[key] || PANTS_FORM.trousers;

export function SeatedLeg({
  side,
  ankle,
  thighW = 7.5,
  shinW = 6.5,
  far = false,
  trouser = TROUSER,
  pants = "trousers",
  skin = SKIN,
  shoes = "sneakers",
  shoeColor = SHOE,
}) {
  const knee = side * SEAT_KNEE_X;
  const cloth = far ? farColor(trouser) : trouser;
  // Pants styles reach every pose. Seated, shorts and skirts read the same
  // honest way: cloth drapes the thigh (a skirt covers a lap), the shin is
  // skin. The wide leg thickens both segments.
  const form = pantsFormOf(pants);
  const bareShin = form.shorts || form.bare;
  const extra = (form.wide || 0) * 0.75 + (form.slim || 0);
  return (
    <g>
      <path
        d={`M${side * 3.6} 0 L${knee} ${SEAT_KNEE_Y}`}
        stroke={cloth}
        strokeWidth={thighW + extra}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${knee} ${SEAT_KNEE_Y} L${knee} ${ankle}`}
        stroke={bareShin ? (far ? farColor(skin) : skin) : cloth}
        strokeWidth={bareShin ? shinW - 1.4 : shinW + extra}
        strokeLinecap="round"
        fill="none"
      />
      {form.cuffBand && !bareShin && (
        <rect x={knee - (shinW + extra) / 2 + 0.4} y={ankle - 2.6} width={shinW + extra - 0.8} height="1.8" fill="#fff" opacity="0.18" />
      )}
      <g transform={`translate(0, ${ankle + 1.1})`}>
        <FrontShoe cx={knee} kind={shoes} color={shoeColor} far={far} />
      </g>
    </g>
  );
}

/**
 * One standing trouser leg: a garment, not a stick. It tapers from the hip
 * to a cuff just above the shoe — the cuff's shade band is what makes the
 * hem read as a hem — and ends in a deliberately CHUNKY shoe. In the
 * reference art the oversized rounded shoe carries half the toy-like read;
 * drawn to scale it disappears into the trouser leg.
 *
 * `legW` comes from figureMetrics so the build axis thickens both trouser
 * and shoe together when limb deltas land.
 */
export function StandingLeg({
  side,
  legW = 5.6,
  legH = LEG_H,
  far = false,
  trouser = TROUSER,
  pants = "trousers",
  skin = SKIN,
  shoes = "sneakers",
  shoeColor = SHOE,
}) {
  const cx = side * 4;
  const cloth = far ? farColor(trouser) : trouser;
  const form = pantsFormOf(pants);
  const skinTone = far ? farColor(skin) : skin;
  // ONE CONTINUOUS POLYLINE bent at the knee — same lesson as the arm: v2
  // built the leg from two capsules with per-segment washes, and the caps
  // overlapping at the joint banded the trousers into plates. The knee sits
  // a hair OUTWARD of the hip-ankle line (the Sims-soft rest pose: a leg is
  // never a straight column), 0.46 up from the ankle, where a knee actually
  // sits; the BEND is the articulation, and the edge tones follow the same
  // bent path as single strokes so no layer ever overlaps another.
  const K = { x: cx + (form.straight ? 0 : side * 0.9), y: -legH * 0.46 };
  const w = legW + 0.4 + (form.wide || 0) + (form.slim || 0);
  const bent = (off) =>
    `M ${cx + off} ${-legH + 1.5} L ${K.x + off} ${K.y} L ${cx + off} ${-3.2}`;
  // Shorts: the cloth stops just past the knee; the shin below is skin.
  const upper = (off) => `M ${cx + off} ${-legH + 1.5} L ${K.x + off} ${K.y + 1.2}`;
  const clothD = form.shorts ? upper : bent;
  // Edge tones ride a TRIMMED copy of the path with FLAT caps: a round cap
  // sticks a half-circle of wash past each end, which at 4x read as light
  // blobs floating at the ankle and hip — the "glass tube" look (VC2
  // reference pass, 2026-08-19). Flush ends tucked inside the cloth are
  // what let a translucent stroke read as form instead of cellophane.
  const bentEdge = (off) =>
    `M ${cx + off} ${-legH + 2.8} L ${K.x + off} ${K.y} L ${cx + off} ${-3.6}`;
  const upperEdge = (off) => `M ${cx + off} ${-legH + 2.8} L ${K.x + off} ${K.y + 0.8}`;
  const edgeD = form.shorts ? upperEdge : bentEdge;
  const line = (d, paint, width, opacity, cap = "round") => (
    <path
      d={d}
      stroke={paint}
      strokeWidth={width}
      strokeLinecap={cap}
      strokeLinejoin="round"
      fill="none"
      opacity={opacity}
    />
  );
  // The skirt kinds: the LEG is just a leg — skin, knee, shoe — and the
  // flare above it belongs to the assembly.
  if (form.bare) {
    return (
      <g>
        {line(bent(0), skinTone, legW - 0.5)}
        {line(bentEdge(-(legW - 0.5) / 4), "#000", (legW - 0.5) / 3, 0.08, "butt")}
        <ellipse cx={K.x - side * 1.2} cy={K.y + 0.5} rx="1.1" ry="0.7" fill="#000" opacity="0.09" />
        <FrontShoe cx={cx + side * 0.5} kind={shoes} color={shoeColor} far={far} />
      </g>
    );
  }
  const tone = toneFor(trouser);
  return (
    <g>
      {form.shorts && line(bent(0), skinTone, legW - 0.7)}
      {line(clothD(0), cloth, w)}
      {/* ONE shade down the away-from-light edge and nothing else — the
          trousers used to also carry a GLINT stripe, and a light bar down
          the middle of a dark leg is what made every pair read as a glass
          tube (VC2 reference: trousers are a matte mass; the lit read
          belongs to the torso and the knee's crease). Luminance-scaled so
          near-black denim still models. */}
      {line(edgeD(-w / 4), SHADE, w / 2.9, 0.14 * tone.shade, "butt")}
      {/* dress pants press a CREASE down the front of each leg */}
      {form.crease && line(edgeD(0), GLINT, 0.9, (far ? 0.1 : 0.17) * tone.glint, "butt")}
      {/* the crease inside the bend — the knee's only mark */}
      <ellipse
        cx={K.x - side * 1.2}
        cy={K.y + 0.5}
        rx="1.2"
        ry="0.8"
        fill="#000"
        opacity="0.11"
      />
      {/* The hem, per form: shorts hem at the knee; a turn-up is a LIGHT
          band (rolled denim shows its underside); joggers cinch to an
          elastic cuff; dress pants break clean with no band at all. */}
      {form.shorts ? (
        <rect
          x={K.x - w / 2 + 0.3}
          y={K.y - 0.6}
          width={w - 0.6}
          height={form.turnup ? 2.1 : 1.6}
          fill={form.turnup ? "#fff" : "#000"}
          opacity={form.turnup ? 0.2 : 0.14}
        />
      ) : form.turnup ? (
        <rect x={cx - w / 2 + 0.4} y={-6.4} width={w - 0.8} height="2.6" fill="#fff" opacity="0.2" />
      ) : form.cuffBand ? (
        <rect x={cx - w / 2 + 0.6} y={-6} width={w - 1.2} height="2.2" fill="#fff" opacity="0.18" />
      ) : form.cleanHem ? null : (
        <rect x={cx - w / 2 + 0.4} y={-4.9} width={w - 0.8} height="1.7" fill="#000" opacity="0.14" />
      )}
      {/* denim's contrast topstitch, riding above the hem or shorts hem */}
      {form.stitch && (
        <path
          d={`M ${(form.shorts ? K.x : cx) - w / 2 + 0.7} ${form.shorts ? K.y - 1.2 : -7}
              L ${(form.shorts ? K.x : cx) + w / 2 - 0.7} ${form.shorts ? K.y - 1.2 : -7}`}
          stroke={STITCH}
          strokeWidth="0.55"
          strokeDasharray="0.9 0.8"
          fill="none"
          opacity={far ? 0.5 : 0.85}
        />
      )}
      {/* The shoe has to TERMINATE the leg (the sneaker's bright sole and
          top catch exist so the foot doesn't dissolve into a dark trouser
          on a dark floor) — and it's a wardrobe slot now, see FrontShoe. */}
      <FrontShoe cx={cx + side * 0.5} kind={shoes} color={shoeColor} far={far} />
    </g>
  );
}

/**
 * One PROFILE leg — the side-view counterpart of StandingLeg, same one-
 * continuous-polyline construction. The differences ARE the profile: both
 * legs stand near the body's centre line (a person seen side-on is one leg
 * wide), the near one a half-step ahead of the far one; the knee bows
 * FORWARD, toward the face — knees bend the way you walk, and a knee bowed
 * outward here would read as a leg on backwards; and the shoe points where
 * the body faces, long toe forward with a stub of heel behind, instead of
 * the front view's symmetric oval.
 */
export function SideLeg({
  far = false,
  legW = 5.6,
  legH = LEG_H,
  trouser = TROUSER,
  pants = "trousers",
  skin = SKIN,
  shoes = "sneakers",
  shoeColor = SHOE,
}) {
  const cx = far ? 1.7 : -0.8;
  const cloth = far ? farColor(trouser) : trouser;
  const form = pantsFormOf(pants);
  const skinTone = far ? farColor(skin) : skin;
  const K = { x: cx - (form.straight ? 0 : 1.3), y: -legH * 0.46 };
  const w = legW + 0.4 + (form.wide || 0) + (form.slim || 0);
  const bent = (off) =>
    `M ${cx + off} ${-legH + 1.5} L ${K.x + off} ${K.y} L ${cx + off} ${-3.2}`;
  const upper = (off) => `M ${cx + off} ${-legH + 1.5} L ${K.x + off} ${K.y + 1.2}`;
  const clothD = form.shorts ? upper : bent;
  // Trimmed flat-capped copies for the edge tones — same de-glassing rule
  // as StandingLeg: round caps stick wash blobs past the hem.
  const bentEdge = (off) =>
    `M ${cx + off} ${-legH + 2.8} L ${K.x + off} ${K.y} L ${cx + off} ${-3.6}`;
  const upperEdge = (off) => `M ${cx + off} ${-legH + 2.8} L ${K.x + off} ${K.y + 0.8}`;
  const edgeD = form.shorts ? upperEdge : bentEdge;
  const line = (d, paint, width, opacity, cap = "round") => (
    <path
      d={d}
      stroke={paint}
      strokeWidth={width}
      strokeLinecap={cap}
      strokeLinejoin="round"
      fill="none"
      opacity={opacity}
    />
  );
  // toe forward, heel behind — the asymmetry is the profile
  const shoe = <SideShoe cx={cx} kind={shoes} color={shoeColor} far={far} />;
  if (form.bare) {
    return (
      <g>
        {line(bent(0), skinTone, legW - 0.5)}
        {line(bentEdge(-(legW - 0.5) / 4), "#000", (legW - 0.5) / 3, 0.08, "butt")}
        <ellipse cx={K.x + 1.3} cy={K.y + 0.5} rx="1.1" ry="0.7" fill="#000" opacity="0.09" />
        {shoe}
      </g>
    );
  }
  const tone = toneFor(trouser);
  return (
    <g>
      {form.shorts && line(bent(0), skinTone, legW - 0.7)}
      {line(clothD(0), cloth, w)}
      {/* shade only, flush-capped — the glint stripe made glass tubes of
          the trousers (same call as StandingLeg) */}
      {line(edgeD(-w / 4), SHADE, w / 2.9, 0.14 * tone.shade, "butt")}
      {form.crease && line(edgeD(0), GLINT, 0.9, (far ? 0.1 : 0.17) * tone.glint, "butt")}
      {/* the crease sits BEHIND the knee in profile — inside the bend */}
      <ellipse cx={K.x + 1.3} cy={K.y + 0.5} rx="1.1" ry="0.8" fill="#000" opacity="0.11" />
      {form.stitch && (
        <path
          d={`M ${(form.shorts ? K.x : cx) - w / 2 + 0.7} ${form.shorts ? K.y - 1.2 : -7}
              L ${(form.shorts ? K.x : cx) + w / 2 - 0.7} ${form.shorts ? K.y - 1.2 : -7}`}
          stroke={STITCH}
          strokeWidth="0.55"
          strokeDasharray="0.9 0.8"
          fill="none"
          opacity={far ? 0.5 : 0.85}
        />
      )}
      {form.shorts ? (
        <rect
          x={K.x - w / 2 + 0.3}
          y={K.y - 0.6}
          width={w - 0.6}
          height={form.turnup ? 2.1 : 1.6}
          fill={form.turnup ? "#fff" : "#000"}
          opacity={form.turnup ? 0.2 : 0.14}
        />
      ) : form.turnup ? (
        <rect x={cx - w / 2 + 0.4} y={-6.4} width={w - 0.8} height="2.6" fill="#fff" opacity="0.2" />
      ) : form.cuffBand ? (
        <rect x={cx - w / 2 + 0.6} y={-6} width={w - 1.2} height="2.2" fill="#fff" opacity="0.18" />
      ) : form.cleanHem ? null : (
        <rect x={cx - w / 2 + 0.4} y={-4.9} width={w - 0.8} height="1.7" fill="#000" opacity="0.14" />
      )}
      {shoe}
    </g>
  );
}

/**
 * The PROFILE face: a nose breaking the skull's front edge (the single mark
 * that says "side view" — a profile without one is a blank circle), one eye,
 * one brow-less lid line per expression, a small mouth tucked near the front
 * edge, and one cheek's blush. Drawn for a figure facing -x; the scene's
 * mirror handles the other way.
 */
export function SideFace({ expression, headY, skin }) {
  const R = HEAD_R;
  const stroke = { fill: "none", stroke: INK, strokeWidth: 0.9, strokeLinecap: "round" };
  return (
    <>
      {/* The face's front edge as ONE continuous profile — brow, a small
          nose, the under-nose step, a lip hint, a chin that curves back to
          the jaw. It used to be a bolt-on nose wedge on a bare circle, and
          the wedge's return edge cut a beak-like notch under the nose
          (owner screenshot, 2026-08-19: "the side model is really bad").
          A profile is a LINE, not a circle plus a bump. */}
      <path
        d={`M ${-R + 1.3} ${headY - 4.4}
            Q ${-R - 0.2} ${headY - 2.4} ${-R + 0.1} ${headY - 0.7}
            Q ${-R - 2.1} ${headY + 0.5} ${-R - 1.5} ${headY + 1.9}
            Q ${-R - 1.1} ${headY + 2.6} ${-R + 0.1} ${headY + 2.6}
            Q ${-R - 0.7} ${headY + 3.7} ${-R + 0.5} ${headY + 4.4}
            Q ${-R + 0.2} ${headY + 5.5} ${-R + 2.1} ${headY + 6.1}
            L ${-R + 3.2} ${headY - 3.2} Z`}
        fill={skin}
      />
      {expression === "happy" ? (
        <path d={`M-4.7 ${headY + 2} q1.2 -1.6 2.4 0`} {...stroke} />
      ) : expression === "sleepy" ? (
        <path d={`M-4.7 ${headY + 2} q1.2 0.9 2.4 0`} {...stroke} />
      ) : (
        <circle cx="-3.5" cy={headY + 1.9} r="0.95" fill={INK} />
      )}
      {/* the mouth sits ON the face, small and soft — the old longer stroke
          started so far back it read as a cut across the cheek */}
      <path d={`M${-R + 1.1} ${headY + 4.5} q0.75 0.55 1.6 0.2`} {...stroke} opacity="0.7" />
      <ellipse cx="-2.4" cy={headY + 3.5} rx="1.6" ry="1" fill="#e8a3a8" opacity="0.4" />
    </>
  );
}

/**
 * One arm: TWO segments meeting at an elbow, the way Roblox split R6 limbs
 * into R15 parts — the joint is what makes a low-fi body read as 3D, and it
 * reads from the seam and the angle, not from anatomical detail. The upper
 * arm bows slightly OUT from the shoulder and the forearm returns IN to the
 * hand, the Sims-style relaxed rest pose: a limb that is never a straight
 * column. (Owner call, 2026-08-16 — this replaces the one-rect arm and
 * revises the old "no joints" doctrine.)
 *
 * The HAND stays at the same anchor the one-rect arm ended at, on purpose:
 * the mug, the typing bob, the walk swing and the held-pose dangle all hang
 * off that point, so the bend redistributes the path without moving anything
 * downstream.
 *
 * Sleeves: a long sleeve clothes both segments; a short one stops AT THE
 * ELBOW — the joint is the natural hemline, which is what makes bare
 * forearms finally read as short sleeves rather than as a shrunken garment.
 */
export function Arm({
  side,
  sh,
  torsoY,
  skin,
  outfit,
  shortSleeve = false,
  bulk = 0,
  far = false,
  // Ribbed cuff at the wrist — knitwear's tell, declared by the outermost
  // garment's registry entry (`cuffs: true`), never inferred by name here.
  cuff = false,
  // Luminance-adaptive strengths from toneFor(the sleeve's colour) — the
  // assembly computes it once, since only it knows which hex is outermost.
  tone = { shade: 1, glint: 1 },
  // The PROFILE arm rests ON a like-coloured torso: edge tones there turn
  // the limb into a painted stripe (owner screenshot, twice), so the side
  // view switches them off and lets the contact shadow do the separating.
  edges = true,
}) {
  // The shoulder is BURIED in the torso — the arm grows out of the body
  // rather than standing beside it. Started outside the torso edge, the
  // capsule left a step at the armpit where the shoulder curve ended and a
  // separate part began ("the joints look separate… it should look like one
  // cohesive piece", owner). Overlap is what welds low-poly parts: each
  // piece's root nests inside the piece it hangs from, and only its far end
  // shows.
  const S = { x: side * (sh - 0.5), y: torsoY + 4.4 }; // shoulder, inside the torso
  const E = { x: side * (sh + 1.9), y: torsoY + 12 }; // elbow, bowed out
  const H = { x: side * (sh + 0.9), y: torsoY + 17.5 }; // hand (fixed anchor)
  // ONE CONTINUOUS POLYLINE per layer, bent at the elbow — the joint reads
  // from the BEND in the outline, nothing else. Per-segment capsules with
  // per-segment washes grew a lens blob at every joint (owner screenshot);
  // clean low-poly bodies keep each part ONE flat tone.
  const whole = `M ${S.x} ${S.y} L ${E.x} ${E.y} L ${H.x} ${H.y}`;
  const upper = `M ${S.x} ${S.y} L ${E.x} ${E.y}`;
  const w = 4.3 + bulk;
  const line = (d, paint, width, opacity, cap = "round") => (
    <path
      d={d}
      stroke={paint}
      strokeWidth={width}
      strokeLinecap={cap}
      strokeLinejoin="round"
      fill="none"
      opacity={opacity}
    />
  );
  // A crossbar ACROSS the limb at fraction t of segment P→Q — the hem of a
  // short sleeve, the ribbed cuff of a long one. Perpendicular to the
  // segment so it follows the arm's own bend.
  const bar = (P, Q, t, extra, paint, sw, op) => {
    const x = P.x + (Q.x - P.x) * t;
    const y = P.y + (Q.y - P.y) * t;
    const dx = Q.x - P.x;
    const dy = Q.y - P.y;
    const L = Math.hypot(dx, dy) || 1;
    const px = (-dy / L) * (w / 2 + extra);
    const py = (dx / L) * (w / 2 + extra);
    return line(`M ${x - px} ${y - py} L ${x + px} ${y + py}`, paint, sw, op);
  };
  return (
    <g>
      {/* skin under, sleeve over — a short sleeve simply stops at the elbow */}
      {line(whole, skin, 4.1)}
      <SleeveSeg d={shortSleeve ? upper : whole} w={w} outfit={outfit} />
      {/* ONE light logic across the whole body: lit on the screen-right edge,
          shaded screen-left — the same single light the legs and torso answer
          to. It used to be "lit on the outer edge", which lit the two arms
          from opposite sides of the room. The far arm still takes the overall
          depth wash on top (its whole limb falls away), same rule as the far
          trouser leg. */}
      {/* flush flat caps, tucked inside both ends — round caps stuck wash
          blobs past the shoulder and wrist (the glass-tube read, same
          de-glassing pass as the legs) */}
      {edges && line(`M ${S.x + w / 4} ${S.y + 2.4} L ${E.x + w / 4} ${E.y} L ${H.x + w / 4} ${H.y - 2}`, GLINT, w / 2.7, far ? 0.05 : 0.1 * tone.glint, "butt")}
      {edges && line(`M ${S.x - w / 4} ${S.y + 2.6} L ${E.x - w / 4} ${E.y} L ${H.x - w / 4} ${H.y - 2}`, SHADE, w / 2.9, 0.13 * tone.shade, "butt")}
      {/* a short sleeve's HEM — the crossbar is what makes the bare forearm
          read as a hemline rather than a glitch in the sleeve */}
      {shortSleeve && bar(S, E, 0.94, 0.3, "#000", 1.2, 0.16)}
      {/* the knit cuff, cinched just above the hand */}
      {cuff && !shortSleeve && bar(E, H, 0.78, 0.1, "#000", 1.5, 0.15)}
      {far && line(whole, "#000", w, 0.12)}
      {/* the crease inside the bend, barely there */}
      <ellipse
        cx={E.x - side * 1.1}
        cy={E.y + 0.2}
        rx="1"
        ry="0.7"
        fill="#000"
        opacity="0.09"
      />
      {/* the armpit's occlusion — the one mark that says these two parts
          MEET: a soft shade tucked where the arm leaves the torso, the same
          contact shading every box in the catalog gets where it touches. */}
      <path
        d={`M ${side * (sh - 0.6)} ${torsoY + 7.6} q ${side * 1.6} 0.8 ${side * 2.2} 2.6`}
        stroke="#000"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.1"
      />
      <circle cx={H.x} cy={H.y} r="2.5" fill={skin} />
      {far && <circle cx={H.x} cy={H.y} r="2.5" fill="#000" opacity="0.12" />}
    </g>
  );
}

/**
 * A sleeve segment in the outfit's tint. Strokes can't take a `{fill}` style,
 * so this is the one place the tint var is spelled as a stroke — keep it
 * beside Arm, which is its only caller.
 */
function SleeveSeg({ d, w, outfit }) {
  const colour = outfit?.fill || "var(--tint, #7faf8f)";
  return <path d={d} stroke={colour} strokeWidth={w} strokeLinecap="round" fill="none" />;
}

/** Eyes and mouth. Expression is the cheapest personality per pixel here. */
export function Face({ expression, headY }) {
  const stroke = {
    fill: "none",
    stroke: INK,
    strokeWidth: 0.9,
    strokeLinecap: "round",
  };
  if (expression === "happy")
    return (
      <>
        {/* closed, upturned eyes — the "^ ^" that reads as delight at 8px */}
        <path d={`M-4.1 ${headY + 2.2} q1.2 -1.6 2.4 0`} {...stroke} />
        <path d={`M1.7 ${headY + 2.2} q1.2 -1.6 2.4 0`} {...stroke} />
        <path d={`M-2.4 ${headY + 4.6} q2.4 2.4 4.8 0`} {...stroke} strokeWidth={1} />
      </>
    );
  if (expression === "sleepy")
    return (
      <>
        <path d={`M-4.1 ${headY + 2.2} q1.2 0.9 2.4 0`} {...stroke} />
        <path d={`M1.7 ${headY + 2.2} q1.2 0.9 2.4 0`} {...stroke} />
        <ellipse cx="0" cy={headY + 5} rx="1" ry="1.3" fill={INK} opacity="0.7" />
      </>
    );
  return (
    <>
      <circle cx="-2.9" cy={headY + 2} r="0.95" fill={INK} />
      <circle cx="2.9" cy={headY + 2} r="0.95" fill={INK} />
      <path d={`M-1.9 ${headY + 4.7} q1.9 1.5 3.8 0`} {...stroke} opacity="0.75" />
    </>
  );
}

/**
 * A limb going limp while its owner dangles: a few degrees off vertical from
 * the joint at its top, dead still.
 *
 * Always on its OWN wrapper, never on the element carrying a walk class — an
 * animation and a transform can't share an element (the animation wins outright
 * and the offset is silently lost). `held` and `moving` happen to be mutually
 * exclusive, but structure beats an invariant a reader has to go and verify.
 * The CSS property rather than the attribute, so `transform-origin` definitely
 * applies to it.
 */
export const hangLimb = (held, deg) =>
  held
    ? {
        transform: `rotate(${deg}deg)`,
        transformBox: "fill-box",
        transformOrigin: "center top",
      }
    : undefined;
