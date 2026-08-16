// The character's BODY: palette constants, the two leg drawings, the face,
// and the held-pose limb helper. The geometry itself (half-widths, torso
// curve, anchors) lives in lib/body.js — this file is the artwork that reads
// those numbers. See docs/MODELS.md for the silhouette rules it answers to.
import { LEG_H, farColor } from "../../lib/body";

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

export function SeatedLeg({ side, ankle, thighW = 7.5, shinW = 6.5, far = false, trouser = TROUSER }) {
  const knee = side * SEAT_KNEE_X;
  const cloth = far ? farColor(trouser) : trouser;
  return (
    <g>
      <path
        d={`M${side * 3.6} 0 L${knee} ${SEAT_KNEE_Y}`}
        stroke={cloth}
        strokeWidth={thighW}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${knee} ${SEAT_KNEE_Y} L${knee} ${ankle}`}
        stroke={cloth}
        strokeWidth={shinW}
        strokeLinecap="round"
        fill="none"
      />
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
export function StandingLeg({ side, legW = 5.6, legH = LEG_H, far = false, trouser = TROUSER }) {
  const cx = side * 4;
  const cloth = far ? farColor(trouser) : trouser;
  const hipW = legW / 2 + 0.4;
  const ankW = legW / 2 - 0.2;
  // The knee, as a proportion of the leg. Not a bend — a tonal break. At this
  // scale a bent joint is invisible noise (docs/MODELS.md), but the eye still
  // needs SOMETHING to split thigh from shin, or the two legs read as one
  // undivided column and the figure looks like 70% leg however good the ratio
  // is. 0.46 up from the ankle is where a knee actually sits.
  const kneeY = -legH * 0.46;
  const kneeW = ankW + (hipW - ankW) * 0.46;
  return (
    <g>
      <path
        d={`M ${cx - hipW} ${-legH} L ${cx + hipW} ${-legH} L ${cx + ankW} ${-2.2}
            Q ${cx + ankW} ${-1.4} ${cx + ankW - 0.8} ${-1.4}
            L ${cx - ankW + 0.8} ${-1.4} Q ${cx - ankW} ${-1.4} ${cx - ankW} ${-2.2} Z`}
        fill={cloth}
      />
      {/* Every box in the catalog carries three tones; the legs carried ONE
          flat fill, which is most of why they read as a single dark mass. A lit
          edge and a shadowed one give the limb a round side, and they're
          translucent overlays rather than fixed hues so they survive any
          trouser colour (docs/MODELS.md). Light comes from the upper right,
          same as the contact shadows. */}
      <path
        d={`M ${cx + hipW - 1.5} ${-legH} L ${cx + hipW} ${-legH} L ${cx + ankW} ${-2.4}
            L ${cx + ankW - 1.3} ${-2.4} Z`}
        fill="#fff"
        opacity={far ? 0.05 : 0.1}
      />
      <path
        d={`M ${cx - hipW} ${-legH} L ${cx - hipW + 1.3} ${-legH} L ${cx - ankW + 1.1} ${-2.4}
            L ${cx - ankW} ${-2.4} Z`}
        fill="#000"
        opacity="0.13"
      />
      {/* The knee: the soft shadow that falls UNDER a kneecap, and nothing
          else. Drawn as an ellipse INSET from both edges — a full-width bar
          spanning the leg reads as a seam or a cropped hem, which is a garment
          detail, not a joint. One mark, but it's what turns a column into thigh
          and shin. */}
      <ellipse
        cx={cx}
        cy={kneeY}
        rx={kneeW - 0.7}
        ry="1.5"
        fill="#000"
        opacity={far ? 0.1 : 0.13}
      />
      <rect x={cx - ankW} y={-4.6} width={ankW * 2} height="1.7" fill="#000" opacity="0.14" />
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
