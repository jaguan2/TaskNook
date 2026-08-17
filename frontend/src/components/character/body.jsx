// The character's BODY: palette constants, the leg drawings (front and
// profile), the two faces, and the held-pose limb helper. The geometry itself
// (half-widths, torso curve, anchors) lives in lib/body.js — this file is the
// artwork that reads those numbers. See docs/MODELS.md for the silhouette
// rules it answers to.
import { HEAD_R, LEG_H, farColor } from "../../lib/body";

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
// back at a straight leg.
export const SEAT_KNEE_Y = 5;
export const SEAT_KNEE_X = 8.5;

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
  jeans: { turnup: true },
  joggers: { slim: -0.5, cuffBand: true },
  wide: { wide: 2.4, straight: true },
  shorts: { shorts: true },
  jorts: { shorts: true, turnup: true },
  skirt: { bare: true },
  pleats: { bare: true },
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
      <ellipse cx={knee} cy={ankle + 1.4} rx="4.8" ry="2.4" fill={far ? SHOE_FAR : SHOE} />
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
  const line = (d, paint, width, opacity) => (
    <path
      d={d}
      stroke={paint}
      strokeWidth={width}
      strokeLinecap="round"
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
        {line(bent(-(legW - 0.5) / 4), "#000", (legW - 0.5) / 3, 0.08)}
        <ellipse cx={K.x - side * 1.2} cy={K.y + 0.5} rx="1.1" ry="0.7" fill="#000" opacity="0.09" />
        <ellipse cx={cx + side * 0.5} cy="0.3" rx="4.9" ry="2.5" fill={far ? SHOE_FAR : SHOE} />
        <ellipse cx={cx + side * 0.5} cy="1.1" rx="4.9" ry="1.5" fill="#fff" opacity={far ? 0.09 : 0.16} />
        <ellipse cx={cx + side * 0.7} cy="-1" rx="3.3" ry="1" fill="#fff" opacity={far ? 0.12 : 0.2} />
      </g>
    );
  }
  return (
    <g>
      {form.shorts && line(bent(0), skinTone, legW - 0.7)}
      {line(clothD(0), cloth, w)}
      {/* Every box in the catalog carries three tones: one lit edge, one
          falling away — each a single stroke riding the same bent path.
          Translucent overlays, never fixed hues (docs/MODELS.md). */}
      {line(clothD(w / 4), "#fff", w / 2.9, far ? 0.05 : 0.09)}
      {line(clothD(-w / 4), "#000", w / 2.9, 0.11)}
      {/* dress pants press a CREASE down the front of each leg */}
      {form.crease && line(clothD(0), "#fff", 0.9, far ? 0.1 : 0.16)}
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
      {/* The shoe has to TERMINATE the leg. It was #2b2350 under #4a3a5b
          trousers — both dark, near the same hue, so on a dark floor the foot
          dissolved into the trouser and the leg ran unbroken to the ground.
          A brighter sole edge and a stronger top catch give it its own
          silhouette without making the foot bigger. */}
      <ellipse cx={cx + side * 0.5} cy="0.3" rx="4.9" ry="2.5" fill={far ? SHOE_FAR : SHOE} />
      <ellipse
        cx={cx + side * 0.5}
        cy="1.1"
        rx="4.9"
        ry="1.5"
        fill="#fff"
        opacity={far ? 0.09 : 0.16}
      />
      <ellipse cx={cx + side * 0.7} cy="-1" rx="3.3" ry="1" fill="#fff" opacity={far ? 0.12 : 0.2} />
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
  const line = (d, paint, width, opacity) => (
    <path
      d={d}
      stroke={paint}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={opacity}
    />
  );
  const shoe = (
    <>
      {/* toe forward, heel behind — the asymmetry is the profile */}
      <ellipse cx={cx - 2.3} cy="0.3" rx="5.3" ry="2.4" fill={far ? SHOE_FAR : SHOE} />
      <ellipse cx={cx - 2.3} cy="1" rx="5.3" ry="1.4" fill="#fff" opacity={far ? 0.09 : 0.16} />
      <ellipse cx={cx - 4.2} cy="-0.9" rx="2.5" ry="0.9" fill="#fff" opacity={far ? 0.12 : 0.2} />
    </>
  );
  if (form.bare) {
    return (
      <g>
        {line(bent(0), skinTone, legW - 0.5)}
        {line(bent(-(legW - 0.5) / 4), "#000", (legW - 0.5) / 3, 0.08)}
        <ellipse cx={K.x + 1.3} cy={K.y + 0.5} rx="1.1" ry="0.7" fill="#000" opacity="0.09" />
        {shoe}
      </g>
    );
  }
  return (
    <g>
      {form.shorts && line(bent(0), skinTone, legW - 0.7)}
      {line(clothD(0), cloth, w)}
      {line(clothD(w / 4), "#fff", w / 2.9, far ? 0.05 : 0.09)}
      {line(clothD(-w / 4), "#000", w / 2.9, 0.11)}
      {form.crease && line(clothD(0), "#fff", 0.9, far ? 0.1 : 0.16)}
      {/* the crease sits BEHIND the knee in profile — inside the bend */}
      <ellipse cx={K.x + 1.3} cy={K.y + 0.5} rx="1.1" ry="0.8" fill="#000" opacity="0.11" />
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
      {/* the nose: a soft wedge riding the circle's front edge */}
      <path
        d={`M ${-R + 0.5} ${headY - 0.4} q -2.4 0.4 -1.9 2.6 q 0.4 1.7 2.1 1.3 z`}
        fill={skin}
      />
      {expression === "happy" ? (
        <path d={`M-4.7 ${headY + 2} q1.2 -1.6 2.4 0`} {...stroke} />
      ) : expression === "sleepy" ? (
        <path d={`M-4.7 ${headY + 2} q1.2 0.9 2.4 0`} {...stroke} />
      ) : (
        <circle cx="-3.5" cy={headY + 1.9} r="0.95" fill={INK} />
      )}
      <path d={`M-6.3 ${headY + 4.3} q0.9 0.9 1.9 0.3`} {...stroke} opacity="0.75" />
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
export function Arm({ side, sh, torsoY, skin, outfit, shortSleeve = false, bulk = 0, far = false }) {
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
  const line = (d, paint, width, opacity) => (
    <path
      d={d}
      stroke={paint}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={opacity}
    />
  );
  return (
    <g>
      {/* skin under, sleeve over — a short sleeve simply stops at the elbow */}
      {line(whole, skin, 4.1)}
      <SleeveSeg d={shortSleeve ? upper : whole} w={w} outfit={outfit} />
      {/* ONE light logic across the whole body: lit on the outer edge, the
          same edge-tone treatment the legs carry — full-limb washes gave the
          arms their own shading language and made them read as parts from a
          different kit. The far arm still takes the overall depth wash on
          top (its whole limb falls away), same rule as the far trouser leg. */}
      {line(`M ${S.x + side * (w / 4)} ${S.y + 1} L ${E.x + side * (w / 4)} ${E.y} L ${H.x + side * (w / 4)} ${H.y - 1}`, "#fff", w / 2.7, far ? 0.05 : 0.09)}
      {line(`M ${S.x - side * (w / 4)} ${S.y + 1.4} L ${E.x - side * (w / 4)} ${E.y} L ${H.x - side * (w / 4)} ${H.y - 1}`, "#000", w / 2.9, 0.1)}
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
