// Every hairstyle's ARTWORK — one registry entry per style, built with the
// WIG METHOD (researched 2026-08-16 from professional stylized-hair craft and
// the avataaars/OpenPeeps production SVG sources):
//
//   * A style is ONE inflated silhouette — a shell that hugs the skull at the
//     ears and grows away toward the crown — CARVED into clumps, never pieces
//     appended onto a bald cap. Assembled cap-plus-temple-tabs was this file's
//     old construction and is the #1 amateur tell ("floating hair", "the wig
//     look"): the eye reads seams, not hair. Same-tone shapes may still
//     compose freely (a bun ball over the dome) — a seam only exists where
//     tones meet.
//   * The lower edge is a walk of VARIED round teeth (the clump grammar):
//     odd-ish counts, one dominant clump, uneven widths and depths. Even
//     teeth read as a comb. A tooth with negative depth cuts UP — that's how
//     the curtains' parting notch is carved from the same grammar.
//   * BACK masses (everything hanging behind the figure) are painted in the
//     SHADOW TONE (`farColor`) — the single cheapest depth move in the
//     research: the back sheet separates from the front for free.
//   * THE TEXTURE PASS (researched 2026-08-17 — Roblox UGC craft bakes all
//     strand detail as streaks over chunky geometry; stylized-hair doctrine
//     gives the flat-vector recipe): every carved wig also carries
//     (a) a shadow WEDGE tucked into a couple of its hem notches — locks
//     overlap, and without the wedge the carving reads as outline only;
//     (b) 2–3 tapered FLOW LINES radiating from the crown, following the
//     locks, unequal, stopping short of every edge (lines that touch the
//     silhouette flatten it — "grass" strands off the mass are banned);
//     (c) a NOTCHED light band across the crown instead of a blob sheen —
//     a blob says plastic dome, broken dashes say strands catching light;
//     (d) the UNDER-LAYER value step (VC2 reference pass, 2026-08-19): a
//     soft dark crescent under each clump's lower lip, giving every wig
//     the three-value read (crown light / base / dark underside) the
//     reference's chunky locks carry.
//     Budget stays capped: wedges + lines + band + brow + hem crescents
//     and nothing else.
//
// Layers (see index.jsx): `front` draws over the head inside the gesture
// wrappers; `length` draws before the torso so it hangs behind the body;
// `back` replaces everything when the figure turns away. The old `behind`
// layer is retired — crown volume welds into `front` now.
import { HEAD_R, farColor } from "../../lib/body";
import { GLINT, HAIR_LIFT } from "./body";

const R = HEAD_R;

/** The inflated dome: left base → elliptical arc over the apex → right base. */
const domeArc = (headY, { sideX, apex, baseY }) =>
  `M ${-sideX} ${headY + baseY} A ${sideX} ${apex} 0 0 1 ${sideX} ${headY + baseY}`;

/**
 * The carved lower edge, walking right→left: each [width, depth] is one
 * round tooth (a clump); negative depth carves upward. Widths must sum to
 * the dome's full span — the kit throws in dev if a style's clumps don't
 * close their own outline.
 */
const teeth = (clumps) =>
  clumps.map(([w, d]) => `q ${-w * 0.38} ${d} ${-w} 0`).join(" ");

const wigPath = (headY, cfg, clumps) => {
  const span = clumps.reduce((s, [w]) => s + w, 0);
  if (Math.abs(span - cfg.sideX * 2) > 0.05) {
    throw new Error(`wig clumps span ${span}, dome needs ${cfg.sideX * 2}`);
  }
  return `${domeArc(headY, cfg)} ${teeth(clumps)} z`;
};

/**
 * The crown light — a NOTCHED band, not one arc: one major dash rising to
 * the crown, a smaller one falling on the light side (screen right), and a
 * short third below, each aligned with the flow. The zigzag break between
 * them is what reads as many strands catching light.
 */
const shine = (headY, apex, color = GLINT) => (
  <g stroke={color} strokeLinecap="round" fill="none">
    <path
      d={`M${-R * 0.66} ${headY - apex * 0.48} q ${R * 0.4} ${-apex * 0.26} ${R * 0.86} ${-apex * 0.14}`}
      strokeWidth="1.9"
      opacity="0.16"
    />
    <path
      d={`M${R * 0.36} ${headY - apex * 0.6} q ${R * 0.3} ${apex * 0.1} ${R * 0.44} ${apex * 0.26}`}
      strokeWidth="1.4"
      opacity="0.13"
    />
    <path
      d={`M${-R * 0.16} ${headY - apex * 0.34} q ${R * 0.22} ${-apex * 0.1} ${R * 0.44} ${-apex * 0.08}`}
      strokeWidth="0.9"
      opacity="0.1"
    />
  </g>
);

/**
 * Shadow wedges tucked into a wig's hem notches — the mark that says one
 * lock lies OVER its neighbour. `picks` indexes the junctions between
 * clumps, walking right→left like the teeth themselves.
 */
const notchShadows = (headY, { sideX, baseY }, clumps, picks) => {
  let x = sideX;
  const notches = [];
  for (const [w] of clumps.slice(0, -1)) {
    x -= w;
    notches.push(x);
  }
  return (
    <g fill="#000" opacity="0.13">
      {[...new Set(picks)]
        .filter((i) => i >= 0 && i < notches.length)
        .map((i) => (
          <path
            key={i}
            d={`M ${notches[i] - 1.2} ${headY + baseY + 0.3} q 1.2 -2.3 2.4 0 q -1.2 0.8 -2.4 0 z`}
          />
        ))}
    </g>
  );
};

/**
 * 2–3 tapered flow lines radiating from the crown — unequal lengths, widths
 * and drifts (uniform lines read as a comb), each stopping short of the
 * silhouette and the hem. `lean` sweeps the whole set sideways for combed
 * styles.
 */
const flowLines = (headY, { sideX, apex }, { lines = 3, lean = 0 } = {}) => {
  if (!lines) return null;
  const specs = [
    { x: -sideX * 0.52, len: apex * 0.6, w: 0.75, drift: -0.5 },
    { x: sideX * 0.54, len: apex * 0.68, w: 0.75, drift: 0.6 },
    { x: sideX * 0.08, len: apex * 0.48, w: 0.6, drift: 0.3 },
  ].slice(0, lines);
  return (
    <g stroke="#000" strokeLinecap="round" fill="none" opacity="0.11">
      {specs.map((s) => {
        const ox = s.x * 0.34 + lean * 2;
        const oy = headY - apex * 0.66 + Math.abs(s.x) * 0.14;
        return (
          <path
            key={s.x}
            strokeWidth={s.w}
            d={`M ${ox} ${oy} Q ${s.x * 0.82 + lean * 1.6} ${oy + s.len * 0.5} ${
              s.x + s.drift + lean * 2.2
            } ${oy + s.len}`}
          />
        );
      })}
    </g>
  );
};

/**
 * The UNDER-LAYER value step (VC2 reference pass, 2026-08-19): a soft dark
 * crescent hugging each clump's lower lip, so a wig reads as THREE values —
 * notched crown light, base, dark underside — the chunky-locks read the
 * reference carries. Inside the silhouette by construction: each crescent's
 * far edge is the tooth's own curve, its near edge the same curve pulled
 * shallower, so nothing can spill onto the face. Upward cuts (negative
 * depth) carve air, not a lock, and take no shade.
 */
const hemShade = (headY, { sideX, baseY }, clumps) => {
  let x = sideX;
  const lenses = [];
  for (const [w, depth] of clumps) {
    if (depth >= 1) {
      lenses.push(
        `M ${x} ${headY + baseY} q ${-w * 0.38} ${depth} ${-w} 0 q ${w * 0.5} ${
          depth * 0.45
        } ${w} 0 z`
      );
    }
    x -= w;
  }
  return lenses.length ? (
    <path d={lenses.join(" ")} fill="#000" opacity="0.12" />
  ) : null;
};

/**
 * A carved wig WITH its texture pass — the standard way to draw a wig-method
 * style's mass. Slick gathered styles (bun, ponytails) skip this and keep
 * their bare path + tension lines: pulled-tight hair has no loose flow.
 */
const wig = (headY, color, cfg, clumps, opts = {}) => (
  <>
    <path d={wigPath(headY, cfg, clumps)} fill={color} />
    {opts.hem !== false && hemShade(headY, cfg, clumps)}
    {notchShadows(headY, cfg, clumps, opts.notch ?? [0, clumps.length - 2])}
    {flowLines(headY, cfg, opts)}
  </>
);

/** The shadow an overhanging fringe casts on the forehead — the lift cue. */
const brow = (headY) => (
  <path
    d={`M${-R + 0.8} ${headY - 1.1} q4.2 2.3 ${R * 2 - 1.6} 0 q-4.2 1.4 -${R * 2 - 1.6} 0 z`}
    fill="#000"
    opacity="0.1"
  />
);

// ---- the PROFILE kit -------------------------------------------------------
// The side view follows the same wig method in profile space (the figure
// faces -x; the scene's mirror covers the other way): ONE closed silhouette
// from the fringe tip on the forehead, up over the inflated crown, down the
// BACK of the skull — where most of any haircut's mass lives — then carved
// forward along the nape to cover the ear, and up the cheek line to close.
// `sideLength` is `length`'s profile counterpart: masses hanging behind the
// shoulders, drawn before the torso. A style's front `length` must NEVER be
// reused sideways — it's symmetric, so half of it would fall across the face.
const sideWigPath = (headY, cfg = {}) => {
  const {
    fringeX = -6.3, // where the fringe tip touches the forehead
    fringeY = -1.7, // its height on it (offset from headY)
    apex = 9.7, // crown height above the head centre
    backX = 8.5, // how far the mass stands off the back of the skull
    napeY = 4.4, // where the back edge ends below the head centre
    earX = 0.8, // how far forward the lower edge reaches (ear coverage)
    earY = 3,
  } = cfg;
  return [
    `M ${fringeX} ${headY + fringeY}`,
    `Q ${fringeX - 2} ${headY - apex * 0.52} ${-2.4} ${headY - apex}`,
    `Q ${backX * 0.6} ${headY - apex} ${backX} ${headY - apex * 0.26}`,
    `Q ${backX + 0.4} ${headY + 1.2} ${backX - 1.1} ${headY + napeY}`,
    `q ${-(backX - 1.1 - earX) * 0.5} 1.7 ${-(backX - 1.1 - earX)} ${earY - napeY}`,
    `Q ${earX - 2.8} ${headY + earY - 1.4} ${(fringeX + earX) / 2 - 0.6} ${headY + 0.7}`,
    `Q ${fringeX + 0.9} ${headY - 0.5} ${fringeX} ${headY + fringeY}`,
    "z",
  ].join(" ");
};

/**
 * The profile crown's texture: the notched light band tilted for the side
 * dome, plus ONE tapered flow line following the back of the skull — the
 * side masses are big enough to need the same fluid read as the front.
 */
const sideShine = (headY, apex) => (
  <>
    <g stroke={GLINT} strokeLinecap="round" fill="none">
      <path d={`M ${-3.2} ${headY - apex + 2} q 3 -1.4 5.2 0.2`} strokeWidth="1.8" opacity="0.16" />
      <path d={`M ${3.2} ${headY - apex + 3} q 1.7 1 2.4 2.6`} strokeWidth="1.3" opacity="0.12" />
    </g>
    <path
      d={`M 2.8 ${headY - apex + 3.4} Q 6.2 ${headY - apex * 0.34} 5.2 ${headY + 1.6}`}
      stroke="#000"
      strokeWidth="0.7"
      strokeLinecap="round"
      fill="none"
      opacity="0.11"
    />
  </>
);

/** The fringe's forehead shadow, front half only — that's all a profile shows. */
const sideBrow = (headY) => (
  <path
    d={`M${-R + 1} ${headY - 1} q 3.6 1.7 7.6 1.2 q -4 1.3 -7.6 -0.2 z`}
    fill="#000"
    opacity="0.1"
  />
);

// The default wig — a soft short cut. Also what unknown styles fall back to.
const SHORT_CFG = { sideX: 8.1, apex: 9.3, baseY: 0.2 };
const SHORT_CLUMPS = [
  [2.6, 1.9],
  [3.7, 1.1],
  [4.6, 1.7],
  [3.1, 0.9],
  [2.2, 1.8],
];

export const HAIR_REGISTRY = {
  short: {
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY)} fill={color} />
        {sideShine(headY, 9.7)}
        {sideBrow(headY)}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, SHORT_CFG, SHORT_CLUMPS)}
        {shine(headY, SHORT_CFG.apex)}
        {brow(headY)}
      </>
    ),
  },
  buzz: {
    // The one style with no wig: the hairline band IS the haircut, scalp
    // reading through. A crescent alone read as balding (research).
    back: ({ headY, color }) => (
      <circle cx="0" cy={headY - 0.3} r={R + 0.3} fill={color} opacity="0.55" />
    ),
    // Profile: the same three marks as the front — stubble (back half),
    // hairline band, and the SOLID crescent along the crown. Without the
    // crescent the side read as a bald halo (sheet, 2026-08-17).
    side: ({ headY, color }) => (
      <>
        <path
          d={`M 0.4 ${headY - R + 0.3} A ${R - 0.3} ${R - 0.3} 0 0 1 0.4 ${headY + R - 0.3} q 3.4 -0.4 4.9 -3.4 z`}
          fill={color}
          opacity="0.5"
        />
        <path
          d={`M${-R + 0.4} ${headY + 1.6} A ${R - 0.4} ${R - 0.4} 0 0 1 ${R - 0.4} ${headY + 1.6}`}
          stroke={color}
          strokeWidth="1.7"
          fill="none"
          opacity="0.8"
        />
        <path
          d={`M${-R + 1.1} ${headY - 3} a${R - 1.1} ${R - 1.1} 0 0 1 ${(R - 1.1) * 2} 0
              q-1.2 -1.1 -${R - 1.1} -1.1 q-${R - 1.1} 0 -${R - 1.1} 1.1 z`}
          fill={color}
          opacity="0.9"
        />
      </>
    ),
    front: ({ headY, color }) => (
      <>
        <path
          d={`M${-R + 0.4} ${headY + 1.6} A ${R - 0.4} ${R - 0.4} 0 0 1 ${R - 0.4} ${headY + 1.6}`}
          stroke={color}
          strokeWidth="1.7"
          fill="none"
          opacity="0.8"
        />
        <path
          d={`M${-R + 1.1} ${headY - 3} a${R - 1.1} ${R - 1.1} 0 0 1 ${(R - 1.1) * 2} 0
              q-1.2 -1.1 -${R - 1.1} -1.1 q-${R - 1.1} 0 -${R - 1.1} 1.1 z`}
          fill={color}
          opacity="0.9"
        />
      </>
    ),
  },
  messy: {
    // The short wig with a rougher edge, plus two tufts CROSSING the top
    // silhouette — a wobbly outline alone reads as "short" (research).
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY, { apex: 10, fringeY: -1.3, napeY: 4.8 })} fill={color} />
        <path d={`M-3.4 ${headY - 9.6} q1.5 -2.6 3.5 -2.1 q-1.2 1.4 -1.1 2.7 z`} fill={color} />
        <path d={`M2.8 ${headY - 9.4} q2.2 -1.9 3.7 -0.7 q-1.6 0.8 -2 2.2 z`} fill={color} />
        {sideBrow(headY)}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 8.3, apex: 9.7, baseY: 0.1 }, [ [2.3, 2.3], [3.9, 1], [3, 2.1], [4.5, 1.4], [2.9, 2.4], ], { lean: 0.35 })}
        <path
          d={`M-4.2 ${headY - 9.1} q1.6 -2.6 3.6 -2 q-1.2 1.4 -1.1 2.6 z`}
          fill={color}
        />
        <path
          d={`M2.2 ${headY - 9.3} q2.2 -2 3.8 -0.8 q-1.7 0.8 -2.1 2.2 z`}
          fill={color}
        />
        {brow(headY)}
      </>
    ),
  },
  bob: {
    // The dark back sheet curls IN under the jaw (the make-or-break — a
    // flared hem reads as a lampshade); the front wig carries the blunt
    // fringe. Two masses, two tones, per the method's long-hair form.
    // Profile: ONE helmet mass — skull, ear and all — its bottom edge
    // tucking inward under the jaw, the same make-or-break curl.
    side: ({ headY, color }) => (
      <>
        <path
          d={`M -6.4 ${headY - 1.4}
              Q -8.4 ${headY - 6} -2.6 ${headY - 9.6}
              Q 4.4 ${headY - 10.4} 8.4 ${headY - 5}
              Q 10.2 ${headY + 1} 8 ${headY + 6.4}
              Q 6.6 ${headY + 9} 3.4 ${headY + 8.6}
              Q 0.4 ${headY + 8.4} -1.2 ${headY + 6.6}
              Q -4.8 ${headY + 5} -5.2 ${headY + 1.6}
              Q -5.4 ${headY - 0.2} -6.4 ${headY - 1.4} z`}
          fill={color}
        />
        {sideShine(headY, 9.9)}
        {sideBrow(headY)}
      </>
    ),
    length: ({ headY, color }) => (
      <path
        d={`M-8.8 ${headY - 3} q-4.4 6.6 -3.2 11.6 q0.9 2.5 3.2 2.8
            L8.8 ${headY + 11.4} q2.3 -0.3 3.2 -2.8 q1.2 -5 -3.2 -11.6 z`}
        fill={farColor(color)}
      />
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 8.5, apex: 9.5, baseY: 0.9 }, [ [2.1, 2.8], [3.5, 1.2], [5, 1.7], [4.1, 1.1], [2.3, 2.9], ])}
        {shine(headY, 9.5)}
        {brow(headY)}
      </>
    ),
  },
  long: {
    // Dark back sheet to below the shoulders + two base-tone curtains riding
    // over it — the tone split is what makes it deep instead of a slab.
    // Profile: the whole fall hangs BEHIND the figure — dark sheet plus one
    // base-tone strand riding it, before the torso so it drapes down the back.
    sideLength: ({ headY, color }) => (
      <>
        <path
          d={`M -1.6 ${headY - 7.2} Q 9.4 ${headY - 5.4} 9.8 ${headY + 4}
              Q 10.6 ${headY + 14} 8.6 ${headY + 22} q -5 2.4 -9.2 0.6
              Q 1.8 ${headY + 8} -1.6 ${headY - 7.2} z`}
          fill={farColor(color)}
        />
        <path
          d={`M 5.4 ${headY - 3.6} q 3.6 9.2 2.4 21.6 q -2.6 1.4 -4.6 0.4 q 1.6 -12.4 -1 -18.6 z`}
          fill={color}
        />
        {/* the same hem value step the front curtains carry */}
        <path
          d={`M 8.3 ${headY + 20.8} q -3.2 2.2 -7.4 1.5 q 3.9 1.5 7.7 -0.7 z`}
          fill="#000"
          opacity="0.13"
        />
      </>
    ),
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY, { apex: 9.8, napeY: 5.2, earY: 3.6 })} fill={color} />
        {sideShine(headY, 9.8)}
        {sideBrow(headY)}
      </>
    ),
    length: ({ headY, color }) => (
      <>
        <path
          d={`M-9 ${headY - 3} q-6 15 -5.4 25 l28.8 0 q0.6 -10 -5.4 -25 z`}
          fill={farColor(color)}
        />
        {[-1, 1].map((s) => (
          <g key={s}>
            <path
              d={`M${s * 8.6} ${headY - 1.5} q${s * 3.6} 8.5 ${s * 2.9} 20.5
                  q${-s * 2.4} 1.4 ${-s * 4.6} 0.4 q${s * 0.4} -12 ${-s * 1.4} -19.4 z`}
              fill={color}
            />
            {/* the texture pass the curtains were missing — the one flat,
                markless mass left in the set read as a cape, not hair: a
                hem crescent (the under-layer value step every other wig
                carries) and one tapered flow line following the fall,
                stopping short of both edges per the doctrine above. */}
            <path
              d={`M${s * 11.4} ${headY + 18.6} q${-s * 1.6} 2 ${-s * 4.2} 1.7
                  q${s * 2.5} 0.9 ${s * 4.3} -0.7 z`}
              fill="#000"
              opacity="0.13"
            />
            <path
              d={`M${s * 9.4} ${headY + 2.4} q${s * 1.5} 7.6 ${s * 1} 14.4`}
              stroke="#000"
              strokeWidth="0.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.11"
            />
          </g>
        ))}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 8.4, apex: 9.6, baseY: 0.8 }, [ [2, 2.6], [3.8, 1.3], [5.2, 1.8], [3.6, 1.1], [2.2, 2.7], ])}
        {shine(headY, 9.6)}
        {brow(headY)}
      </>
    ),
  },
  ponytail: {
    // Slick wig with the gathering knot welded at the crown; the tail hangs
    // to one side in the shadow tone.
    // Profile is this style's best angle: the tail swings clear behind the
    // head, gathered at a knot the tension lines converge on.
    sideLength: ({ headY, color }) => (
      <path
        d={`M 6.4 ${headY - 6} q 6.8 2.4 6 12.2 q -0.5 5.6 -3.8 8.4 q -2.4 2 -3.5 -0.2
            q -0.9 -2 0.7 -4.2 q 2.6 -3.8 1.6 -8.8 q -0.7 -3.4 -3.6 -5.2 z`}
        fill={farColor(color)}
      />
    ),
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY, { apex: 8.9, napeY: 2.6, earY: 2, fringeY: -2.4 })} fill={color} />
        <circle cx="5.6" cy={headY - 6.2} r="2.9" fill={color} />
        <path
          d={`M -3 ${headY - 7.4} Q 1.6 ${headY - 8.2} 4.4 ${headY - 6.8}`}
          stroke="#000"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.15"
        />
      </>
    ),
    length: ({ headY, color }) => (
      <path
        d={`M-2.2 ${headY - 7} q-9 6 -9.6 15 q-0.4 4.4 2.6 5.2 q3 0.6 3.4 -3.6 q0.6 -7.6 7 -12.4 z`}
        fill={farColor(color)}
      />
    ),
    front: ({ headY, color }) => (
      <>
        <path
          d={wigPath(headY, { sideX: 8, apex: 9.2, baseY: 0.1 }, [
            [4.9, 1],
            [6.1, 1.5],
            [5, 0.9],
          ])}
          fill={color}
        />
        <circle cx="-1" cy={headY - 8.6} r="3" fill={color} />
        {shine(headY, 9.2)}
      </>
    ),
  },
  bun: {
    // Pulled tight: minimal inflation, exposed hairline, the ball welded
    // onto the apex (avataaars welds its bun into the same path — same-tone
    // overlap achieves it here), tension lines converging on it.
    // From behind a bun IS its ball — the default dome erased it, so a
    // resident walking away lost the hairstyle (sheet, 2026-08-17).
    back: ({ headY, color }) => (
      <>
        <circle cx="0" cy={headY - 0.5} r={R + HAIR_LIFT} fill={color} />
        <circle cx="0" cy={headY - 9.4} r="3.9" fill={color} />
        <path
          d={`M-2.8 ${headY - 7.2} a3.9 3.9 0 0 0 5.6 0 q-1.6 1.9 -5.6 0 z`}
          fill="#000"
          opacity="0.13"
        />
        {shine(headY, R + 2)}
      </>
    ),
    // Profile: the ball sits high at the BACK of the crown — from the side a
    // topknot's position is the style.
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY, { apex: 8.6, napeY: 2, earY: 1.6, fringeY: -2.6 })} fill={color} />
        <circle cx="4.6" cy={headY - 8.4} r="3.7" fill={color} />
        <path
          d={`M 2 ${headY - 6.6} a 3.7 3.7 0 0 0 5.2 -0.6 q -2 2.2 -5.2 0.6 z`}
          fill="#000"
          opacity="0.13"
        />
        <path
          d={`M -3.6 ${headY - 6.6} Q 0.6 ${headY - 8.4} 3 ${headY - 7.8}`}
          stroke="#000"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.15"
        />
      </>
    ),
    front: ({ headY, color }) => (
      <>
        <path
          d={wigPath(headY, { sideX: 7.8, apex: 8.7, baseY: -0.4 }, [
            [5, 0.7],
            [5.7, 1.2],
            [4.9, 0.6],
          ])}
          fill={color}
        />
        <circle cx="0" cy={headY - 9.4} r="3.9" fill={color} />
        <path
          d={`M-2.8 ${headY - 7.2} a3.9 3.9 0 0 0 5.6 0 q-1.6 1.9 -5.6 0 z`}
          fill="#000"
          opacity="0.13"
        />
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M${s * 4.8} ${headY - 4.2} Q ${s * 1.8} ${headY - 6.8} ${s * 0.9} ${headY - 8.2}`}
            stroke="#000"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.15"
          />
        ))}
      </>
    ),
  },
  curly: {
    // A same-tone backing dome with coils riding its edge — the coils ARE
    // the outline's teeth, in circle form.
    // From behind the coils still tooth the outline down to the nape — the
    // default dome smoothed the cloud into a swim cap (sheet, 2026-08-19).
    back: ({ headY, color }) => (
      <>
        <circle cx="0" cy={headY - 0.8} r={R + 1.6} fill={color} />
        {[
          [-5.8, -3.8, 3.3],
          [-2, -5.8, 3.4],
          [1.9, -5.7, 3.4],
          [5.4, -3.7, 3.3],
          [7, -0.4, 2.7],
          [-7, -0.4, 2.7],
          [4.6, 4.8, 2.4],
          [-4.6, 4.8, 2.4],
        ].map(([cx, dy, r]) => (
          <circle key={`${cx},${dy}`} cx={cx} cy={headY + dy} r={r} fill={color} />
        ))}
        {/* interior curl marks — the same C-arc grammar as the front */}
        {[
          [-3.4, -2.6, 2],
          [2.8, -4, 2.2],
          [-0.4, 1.8, 1.7],
        ].map(([x, dy, r]) => (
          <path
            key={`${x},${dy}`}
            d={`M ${x - r} ${headY + dy} a ${r} ${r} 0 0 1 ${r * 1.5} ${-r * 0.6}`}
            stroke="#000"
            strokeWidth="0.7"
            fill="none"
            opacity="0.13"
            strokeLinecap="round"
          />
        ))}
        {/* coil-top glints on the light side, never a straight band */}
        {[
          [2, -6.4, 2.4],
          [5.4, -2.4, 2],
        ].map(([x, dy, r]) => (
          <path
            key={`g${x},${dy}`}
            d={`M ${x - r} ${headY + dy} a ${r} ${r} 0 0 1 ${r * 1.6} ${-r * 0.4}`}
            stroke={GLINT}
            strokeWidth="1.3"
            fill="none"
            opacity="0.16"
            strokeLinecap="round"
          />
        ))}
      </>
    ),
    // Profile: the cloud shifts back off the face; coils walk the outline
    // from the fringe over the crown down to the nape.
    side: ({ headY, color }) => (
      <>
        <circle cx="1" cy={headY - 1.4} r={R + 1.5} fill={color} />
        {[
          [-5.4, -4.4, 3.2],
          [-1.4, -6.2, 3.4],
          [3, -5.8, 3.4],
          [6.6, -3.2, 3.2],
          [8.2, 0.6, 2.8],
          [7.4, 4.2, 2.6],
        ].map(([cx, dy, r]) => (
          <circle key={`${cx},${dy}`} cx={cx} cy={headY + dy} r={r} fill={color} />
        ))}
        {sideBrow(headY)}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        <circle cx="0" cy={headY - 1.2} r={R + 1.6} fill={color} />
        {[
          [-5.8, -3.6, 3.3],
          [-2, -5.6, 3.4],
          [1.9, -5.5, 3.4],
          [5.4, -3.5, 3.3],
          [7, -0.6, 2.7],
          [-7, -0.7, 2.7],
        ].map(([cx, dy, r]) => (
          <circle key={`${cx},${dy}`} cx={cx} cy={headY + dy} r={r} fill={color} />
        ))}
        {/* interior curl marks — small C-arcs echoing the outline's coils;
            straight flow lines are the wrong grammar for curls */}
        {[
          [-3.6, -2.4, 2],
          [2.6, -3.8, 2.2],
          [0.2, 0.4, 1.7],
        ].map(([x, dy, r]) => (
          <path
            key={`${x},${dy}`}
            d={`M ${x - r} ${headY + dy} a ${r} ${r} 0 0 1 ${r * 1.5} ${-r * 0.6}`}
            stroke="#000"
            strokeWidth="0.7"
            fill="none"
            opacity="0.13"
            strokeLinecap="round"
          />
        ))}
{/* the light catches coil TOPS — arcs on the light side, never a
            straight band across a cloud of curls */}
        {[
          [2.2, -6.2, 2.4],
          [5.2, -2.6, 2],
        ].map(([x, dy, r]) => (
          <path
            key={`g${x},${dy}`}
            d={`M ${x - r} ${headY + dy} a ${r} ${r} 0 0 1 ${r * 1.6} ${-r * 0.4}`}
            stroke={GLINT}
            strokeWidth="1.3"
            fill="none"
            opacity="0.16"
            strokeLinecap="round"
          />
        ))}
        {brow(headY)}
      </>
    ),
  },
  braids: {
    // Tight crown, roots at the temples, two plaits behind the body in the
    // shadow tone with their knots reading as segments.
    // Profile: ONE plait shows — the near one hides the far one exactly.
    sideLength: ({ headY, color }) => (
      <>
        <path
          d={`M 5.8 ${headY + 2} q 3.4 5.8 2.2 12.6`}
          stroke={farColor(color)}
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />
        {[4.6, 9, 12.6].map((dy) => (
          <circle key={dy} cx={6.6 + dy * 0.1} cy={headY + 1.2 + dy} r="2.2" fill={farColor(color)} />
        ))}
      </>
    ),
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY, { apex: 9.1, napeY: 3, earY: 2.2 })} fill={color} />
        <circle cx="5.6" cy={headY + 1.6} r="2.2" fill={color} />
        {sideShine(headY, 9.1)}
      </>
    ),
    length: ({ headY, color }) => (
      <>
        {[-1, 1].map((s) => (
          <g key={s}>
            <path
              d={`M${s * 6.6} ${headY + 2.5} q${s * 3} 6.5 ${s * 1.4} 12.5`}
              stroke={farColor(color)}
              strokeWidth="3.6"
              strokeLinecap="round"
              fill="none"
            />
            {[5, 9.5, 13].map((dy) => (
              <circle
                key={dy}
                cx={s * (6.8 + dy * 0.16)}
                cy={headY + 1 + dy}
                r="2.2"
                fill={farColor(color)}
              />
            ))}
          </g>
        ))}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 8, apex: 9, baseY: 0.6 }, [ [2.4, 2.2], [5.4, 1.1], [5.8, 1.4], [2.4, 2.3], ], { lines: 2 })}
        {[-1, 1].map((s) => (
          <circle key={s} cx={s * 6.7} cy={headY + 1.2} r="2.2" fill={color} />
        ))}
        {shine(headY, 9)}
      </>
    ),
  },
  undercut: {
    // All the mass combed one way over a HIGH rim — bare skin below is the
    // style; the razor part is the one allowed line.
    // The shaved band shows from behind too: the combed mass ends on its
    // high rim with stubble below it down to the nape — the default dome
    // grew the clipped sides back out (sheet, 2026-08-19).
    back: ({ headY, color }) => (
      <>
        <circle cx="0" cy={headY - 0.3} r={R + 0.3} fill={color} opacity="0.4" />
        {wig(headY, color, { sideX: 7.9, apex: 9.6, baseY: -2 }, [ [9.8, 1.6], [6, 0.8], ], { lines: 2, lean: 0.8 })}
        {shine(headY, 9.6)}
      </>
    ),
    // Profile is the undercut's money shot: the heavy top sweeps back and
    // ends on a hard rim well ABOVE the ear, clipped skin under it.
    side: ({ headY, color }) => (
      <>
        <path
          d={`M -6.8 ${headY - 1}
              Q -8.6 ${headY - 6.2} -2.8 ${headY - 9.4}
              Q 4.2 ${headY - 10.8} 8.2 ${headY - 5.2}
              Q 9.2 ${headY - 3.2} 8.6 ${headY - 1.6}
              q -4.6 1.4 -9.2 0.6
              Q -3.2 ${headY - 1.4} -6.8 ${headY - 1} z`}
          fill={color}
        />
        <path
          d={`M -6.4 ${headY - 0.6} q 7.4 1.5 14.6 -0.8`}
          stroke="#fff"
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
          opacity="0.28"
        />
        <path
          d={`M 2.6 ${headY + 0.2} A ${R - 0.6} ${R - 0.6} 0 0 1 ${R - 1} ${headY + 2.8} q -2.2 -0.4 -4.1 -1.6 z`}
          fill={color}
          opacity="0.35"
        />
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 7.9, apex: 9.6, baseY: -1.2 }, [ [10.6, 1.7], [5.2, 0.7], ], { lines: 2, lean: 0.8 })}
        <path
          d={`M${-2.6} ${headY - 9.6} q5.6 -3 8.8 -0.8 q-2.7 0.3 -4.5 2 z`}
          fill={color}
        />
        <path
          d={`M${-6.9} ${headY - 3.2} q2.6 -1.9 5.4 -2.5`}
          stroke="#fff"
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
          opacity="0.28"
        />
      </>
    ),
  },
  afro: {
    // The widest silhouette: a scalloped cloud, one tone, its own hairline
    // arc across the forehead — afros sit ON the hairline, they don't drape.
    // From behind the cloud is unchanged — an afro is round from every
    // angle, and the default dome clipped the widest cut in the set to a
    // skull cap (sheet, 2026-08-19). No hairline arc: that's a face mark.
    back: ({ headY, color }) => (
      <>
        <circle cx="0" cy={headY - 2.5} r={R + 3.1} fill={color} />
        {[
          [-8.2, -5.4, 3.8],
          [-2.8, -8.2, 4],
          [2.8, -8.2, 4],
          [8.2, -5.4, 3.8],
          [9.6, -0.8, 3.3],
          [-9.6, -0.8, 3.3],
        ].map(([cx, dy, r]) => (
          <circle key={`${cx},${dy}`} cx={cx} cy={headY + dy} r={r} fill={color} />
        ))}
        {/* coil marks, spread wide — same C-arc grammar as the front */}
        {[
          [-5.2, -4.4, 2.2],
          [1.4, -6.8, 2.4],
          [5.6, -1.6, 2],
        ].map(([x, dy, r]) => (
          <path
            key={`${x},${dy}`}
            d={`M ${x - r} ${headY + dy} a ${r} ${r} 0 0 1 ${r * 1.5} ${-r * 0.6}`}
            stroke="#000"
            strokeWidth="0.7"
            fill="none"
            opacity="0.13"
            strokeLinecap="round"
          />
        ))}
        {/* coil-top glints on the light side, never a straight band */}
        {[
          [2, -7.6, 2.6],
          [6.6, -3, 2.2],
        ].map(([x, dy, r]) => (
          <path
            key={`g${x},${dy}`}
            d={`M ${x - r} ${headY + dy} a ${r} ${r} 0 0 1 ${r * 1.6} ${-r * 0.4}`}
            stroke={GLINT}
            strokeWidth="1.3"
            fill="none"
            opacity="0.16"
            strokeLinecap="round"
          />
        ))}
      </>
    ),
    // Profile: the same cloud, shifted a touch back; the hairline arc only
    // shows on the face side.
    side: ({ headY, color }) => (
      <>
        <circle cx="0.8" cy={headY - 2.8} r={R + 3} fill={color} />
        {[
          [-7, -6, 3.7],
          [-2.4, -8.4, 4],
          [3, -8.2, 4],
          [7.6, -5.4, 3.8],
          [9.6, -0.8, 3.3],
          [8, 3.6, 3],
        ].map(([cx, dy, r]) => (
          <circle key={`${cx},${dy}`} cx={cx} cy={headY + dy} r={r} fill={color} />
        ))}
        <path
          d={`M ${-R + 0.6} ${headY + 0.8} a ${R - 0.6} ${R - 0.6} 0 0 1 6.4 -6.8 l -1.2 -2.4
              a ${R + 1} ${R + 1} 0 0 0 -6.6 7.4 z`}
          fill={color}
        />
        {sideBrow(headY)}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        <circle cx="0" cy={headY - 2.6} r={R + 3.1} fill={color} />
        {[
          [-8, -5.4, 3.7],
          [-3.6, -8, 4],
          [1.6, -8.2, 4],
          [6.6, -5.6, 3.8],
          [9, -1, 3.3],
          [-9.4, -1.2, 3.3],
        ].map(([cx, dy, r]) => (
          <circle key={`${cx},${dy}`} cx={cx} cy={headY + dy} r={r} fill={color} />
        ))}
        <path
          d={`M${-R + 0.6} ${headY + 0.6} a${R - 0.6} ${R - 0.6} 0 0 1 ${(R - 0.6) * 2} 0 l0 -2.6
              a${R - 0.6} ${R + 1} 0 0 0 ${-(R - 0.6) * 2} 0 z`}
          fill={color}
        />
        {/* coil marks, spread wider than the curly cut's — same grammar */}
        {[
          [-5.6, -4.6, 2.2],
          [1.2, -6.6, 2.4],
          [5.8, -2.2, 2],
          [-1.8, -1.6, 1.8],
        ].map(([x, dy, r]) => (
          <path
            key={`${x},${dy}`}
            d={`M ${x - r} ${headY + dy} a ${r} ${r} 0 0 1 ${r * 1.5} ${-r * 0.6}`}
            stroke="#000"
            strokeWidth="0.7"
            fill="none"
            opacity="0.13"
            strokeLinecap="round"
          />
        ))}
{/* the light catches coil TOPS — arcs on the light side, never a
            straight band across a cloud of curls */}
        {[
          [1.6, -7.8, 2.6],
          [6.4, -3.4, 2.2],
        ].map(([x, dy, r]) => (
          <path
            key={`g${x},${dy}`}
            d={`M ${x - r} ${headY + dy} a ${r} ${r} 0 0 1 ${r * 1.6} ${-r * 0.4}`}
            stroke={GLINT}
            strokeWidth="1.3"
            fill="none"
            opacity="0.16"
            strokeLinecap="round"
          />
        ))}
        {brow(headY)}
      </>
    ),
  },
  pigtails: {
    // Crown wig with the side bunches welded on; the tails beneath hang in
    // the shadow tone, well clear of the shoulders.
    // Profile: the NEAR bunch faces the viewer, sitting behind the ear, its
    // tail below it; the far pair hides behind the head exactly.
    sideLength: ({ headY, color }) => (
      <path
        d={`M 5 ${headY + 0.5} q 3.4 4.2 2.2 9.2 q -2.6 1.6 -4.4 -0.6 q 1.4 -4.4 -0.2 -8.2 z`}
        fill={farColor(color)}
      />
    ),
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY, { apex: 9.2, napeY: 2.6, earY: 2 })} fill={color} />
        <circle cx="4.8" cy={headY - 1.4} r="3.3" fill={color} />
        {sideShine(headY, 9.2)}
      </>
    ),
    length: ({ headY, color }) => (
      <>
        {[-1, 1].map((side) => (
          <path
            key={side}
            d={`M${side * 8.2} ${headY - 1} q${side * 3.6} 4.4 ${side * 2.2} 9.4
                q${-side * 2.6} 1.6 ${-side * 4.4} -0.6 q${side * 1.4} -4.6 ${-side * 0.4} -8.8 z`}
            fill={farColor(color)}
          />
        ))}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 8, apex: 9.1, baseY: 0.3 }, [ [2.3, 2], [5.2, 1.2], [5.9, 1.6], [2.6, 2.1], ], { lines: 2 })}
        {[-1, 1].map((side) => (
          <circle key={side} cx={side * 8.3} cy={headY - 2.2} r="3.3" fill={color} />
        ))}
        {shine(headY, 9.1)}
      </>
    ),
  },
  twoblock: {
    // The Korean cap cut: a full brow-grazing fringe carved from the dome,
    // rims ending ABOVE the ears with bare skin below — mass where the cut
    // grows it, skin where it's clipped (research; two failed attempts are
    // recorded in git history: a visor, then sideburn blocks).
    // From behind the cut IS its nape: the cap stops on a high, LEVEL rim
    // with clipped skin below it — the default dome buried the shaved band
    // (sheet, 2026-08-19).
    back: ({ headY, color }) => (
      <>
        <circle cx="0" cy={headY - 0.3} r={R + 0.3} fill={color} opacity="0.4" />
        {wig(headY, color, { sideX: 8.2, apex: 9.4, baseY: -1.8 }, [ [3.1, 1.1], [4.4, 1.5], [3.6, 1], [2.6, 1.3], [2.7, 0.9], ])}
        {shine(headY, 9.4)}
      </>
    ),
    // Profile: the deep fringe grazes the brow and the rim runs high and
    // LEVEL, bare skin between it and the ear — the "two blocks" seen
    // edge-on. Its own path rather than the generic wig: the generic's
    // lower edge dips toward the cheek, which at this fringe depth painted
    // a blindfold across the eyes (sheet, 2026-08-17).
    side: ({ headY, color }) => (
      <>
        <path
          d={`M -6.6 ${headY - 1.2}
              Q -8.5 ${headY - 6} -2.6 ${headY - 9.5}
              Q 4.4 ${headY - 10.2} 8.3 ${headY - 4.6}
              Q 9 ${headY - 2.6} 8.5 ${headY - 0.9}
              q -4.6 1.5 -9.4 1
              Q -4.6 ${headY + 0.2} -6.6 ${headY - 1.2} z`}
          fill={color}
        />
        {sideShine(headY, 9.9)}
        <path
          d={`M 3.4 ${headY + 0.7} q 2.4 0.6 4.6 -0.1`}
          stroke="#000"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.16"
        />
        {sideBrow(headY)}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 8.6, apex: 9.7, baseY: -0.2 }, [ [1.9, 1.2], [3.1, 2.4], [3.6, 2.7], [3.5, 2.5], [3.2, 2.3], [1.9, 1.3], ])}
        {shine(headY, 9.7)}
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M${s * 8.4} ${headY - 0.1} q${-s * 0.3} 1.2 ${-s * 1.5} 1.5`}
            stroke="#000"
            strokeWidth="1"
            opacity="0.16"
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </>
    ),
  },
  wolf: {
    // Tall broken crown over thin dark shag — the identity is the contrast
    // between the lifted choppy top and the ragged ends (research).
    // Profile: the tall broken crown, with the shag flicking out at the nape.
    sideLength: ({ headY, color }) => (
      <>
        <path
          d={`M 6.6 ${headY + 0.5} q 2.4 3 4.4 3.8 q -2.6 1.2 -4.2 -0.4 z`}
          fill={farColor(color)}
        />
        <path
          d={`M 7 ${headY + 4.6} q 2 3.8 4 4.8 q -2.6 1 -4 -0.6 z`}
          fill={farColor(color)}
        />
        <path
          d={`M 5.6 ${headY + 8.6} q 1.4 3.4 3.2 4.4 q -2.4 0.8 -3.6 -0.8 z`}
          fill={farColor(color)}
        />
      </>
    ),
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY, { apex: 10.4, fringeY: -1.2, napeY: 4.4 })} fill={color} />
        <path d={`M-4.6 ${headY - 9.4} q1.1 -3 3.1 -2.7 q-1 1.6 -0.9 3 z`} fill={color} />
        <path d={`M0.4 ${headY - 10.4} q1.8 -2.4 3.4 -1.4 q-1.3 1.1 -1.5 2.6 z`} fill={color} />
        <path d={`M4.8 ${headY - 9.2} q2.2 -1.6 3.6 -0.4 q-1.5 0.7 -1.9 2 z`} fill={color} />
        {sideBrow(headY)}
      </>
    ),
    length: ({ headY, color }) => (
      <>
        <path
          d={`M-8.2 ${headY - 1} q-2.4 6.6 -1.5 10.8 q1.7 -2.4 3 -0.9
              q0.6 2.4 2.3 3 q1.1 -2.2 2.6 -2.2 q1.5 0 2.6 2.2
              q1.7 -0.6 2.3 -3 q1.3 -1.5 3 0.9 q0.9 -4.2 -1.5 -10.8 z`}
          fill={farColor(color)}
        />
        {[-1, 1].map((s) => (
          <g key={s}>
            <path
              d={`M${s * 8} ${headY - 2} q${s * 1.4} 3.6 ${s * 3.4} 4.6 q${-s * 2.6} 1 ${-s * 3.6} -0.6 z`}
              fill={farColor(color)}
            />
            <path
              d={`M${s * 8.6} ${headY + 2.6} q${s * 1.2} 4 ${s * 3.2} 5.2 q${-s * 2.4} 1 ${-s * 3.4} -0.8 z`}
              fill={farColor(color)}
            />
          </g>
        ))}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 8.3, apex: 10.3, baseY: 0.3 }, [ [2.2, 2.5], [3.3, 1.1], [2.8, 2.2], [2.6, 1], [3, 2.3], [2.7, 1.2], ], { lean: -0.2 })}
        {/* the crown BREAKS into pieces — tufts crossing the top */}
        <path d={`M-5.6 ${headY - 9.2} q1.2 -3 3.2 -2.6 q-1 1.6 -0.9 3 z`} fill={color} />
        <path d={`M-0.6 ${headY - 10.2} q1.8 -2.4 3.4 -1.4 q-1.3 1.1 -1.5 2.6 z`} fill={color} />
        <path d={`M3.8 ${headY - 9.4} q2.2 -1.6 3.6 -0.4 q-1.5 0.7 -1.9 2 z`} fill={color} />
        {brow(headY)}
      </>
    ),
  },
  curtains: {
    // The centre part carved with the same tooth grammar — one wide tooth
    // cutting UP forms the notch of bare forehead; the deep side teeth are
    // the drapes, kicked slightly outward at the tips.
    // Profile: the near drape falls PAST the temple toward the eye — the
    // deep fringe point — with the part groove running back from it.
    side: ({ headY, color }) => (
      <>
        <path
          d={sideWigPath(headY, { fringeX: -6.6, fringeY: 1.2, apex: 9.5, napeY: 3.6 })}
          fill={color}
        />
        <path
          d={`M -5.4 ${headY - 7.6} Q -1 ${headY - 9.9} 3 ${headY - 9.2}`}
          stroke="#000"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.15"
        />
        <path
          d={`M -6.2 ${headY + 0.6} q 0.8 1.4 0.2 2 q -1.8 -0.4 -2.3 -1.6 z`}
          fill="#000"
          opacity="0.14"
        />
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 8.2, apex: 9.4, baseY: 0.5 }, [ [2.9, 2.1], [3.5, 1.3], [3.6, -5.8], [3.5, 1.3], [2.9, 2.1], ], { lines: 2 })}
        {shine(headY, 9.4)}
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M${s * 5.6} ${headY} q${s * 0.8} 1.5 ${s * 0.2} 2.1 q${-s * 2} -0.2 ${-s * 2.6} -1.5 z`}
            fill="#000"
            opacity="0.14"
          />
        ))}
      </>
    ),
  },
  mullet: {
    // Business in front — a crisp short wig — party behind: the squared nape
    // curtain in the shadow tone, corners flicking out past the shoulders.
    // Profile shows the mullet's whole joke at once: crisp on the face side,
    // the curtain pouring off the nape behind.
    sideLength: ({ headY, color }) => (
      <path
        d={`M 4.6 ${headY - 2} Q 9.4 ${headY + 1} 9.6 ${headY + 8}
            q 0.2 4.6 -1.6 7.4 q 2.4 -0.6 3.4 0.8 q -3.4 1.8 -7 0.6
            q -2.2 -0.8 -1.8 -3.4 q 0.6 -7 -2.6 -12 z`}
        fill={farColor(color)}
      />
    ),
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY)} fill={color} />
        {sideShine(headY, 9.7)}
        {sideBrow(headY)}
      </>
    ),
    length: ({ headY, color }) => (
      <path
        d={`M-8 ${headY - 1} q-3.6 8 -3.8 15.6 q2.6 -1.8 4.2 -0.4
            q2.2 1.4 7.6 1.4 q5.4 0 7.6 -1.4 q1.6 -1.4 4.2 0.4 q-0.2 -7.6 -3.8 -15.6 z`}
        fill={farColor(color)}
      />
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, SHORT_CFG, SHORT_CLUMPS)}
        {shine(headY, SHORT_CFG.apex)}
        {brow(headY)}
      </>
    ),
  },
  spacebuns: {
    // The tight wig with two balls breaking the top silhouette and the part
    // groove between them — both signatures, per the research.
    // From behind both buns still break the dome — same rule as the bun.
    back: ({ headY, color }) => (
      <>
        <circle cx="0" cy={headY - 0.5} r={R + HAIR_LIFT} fill={color} />
        {[-1, 1].map((s) => (
          <circle key={s} cx={s * 5.6} cy={headY - 8.6} r="3.2" fill={color} />
        ))}
        <path
          d={`M0 ${headY - 8.6} L0 ${headY - 5.2}`}
          stroke="#000"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.2"
        />
        {shine(headY, R + 2)}
      </>
    ),
    // Profile: the near bun breaks the top; the far one hides behind it.
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY, { apex: 8.7, napeY: 2.2, earY: 1.6, fringeY: -2.4 })} fill={color} />
        <circle cx="1.6" cy={headY - 8.8} r="3.2" fill={color} />
        <path
          d={`M -0.8 ${headY - 7.4} a 3.2 3.2 0 0 0 4.6 -0.4 q -1.8 1.8 -4.6 0.4 z`}
          fill="#000"
          opacity="0.13"
        />
      </>
    ),
    front: ({ headY, color }) => (
      <>
        <path
          d={wigPath(headY, { sideX: 7.9, apex: 8.8, baseY: -0.2 }, [
            [5, 0.8],
            [5.9, 1.3],
            [4.9, 0.7],
          ])}
          fill={color}
        />
        {[-1, 1].map((s) => (
          <circle key={s} cx={s * 5.6} cy={headY - 8.6} r="3.2" fill={color} />
        ))}
        <path
          d={`M0 ${headY - 8.8} L0 ${headY - 5.9}`}
          stroke="#000"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.2"
        />
      </>
    ),
  },
  locs: {
    // Rounded crown breaking into ropes of varied thickness and staggered
    // length — alternating tones so the strands separate (uniform clean
    // ropes read as a wig, the research's exact warning).
    // Profile: the ropes gather at the back of the skull and the nape,
    // staggered and tone-alternating same as the front.
    sideLength: ({ headY, color }) => (
      <>
        {[
          [2.6, 10, 2.4, 0.4, true],
          [4.8, 13, 3.2, 0.9, false],
          [6.8, 11, 2.4, 1.3, true],
          [8.4, 12.8, 3, 1.7, false],
        ].map(([x, len, w, drift, dark]) => (
          <path
            key={x}
            d={`M${x} ${headY + 0.8} q${drift} ${len * 0.55} ${drift * 0.5} ${len}`}
            stroke={dark ? farColor(color) : color}
            strokeWidth={w}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </>
    ),
    side: ({ headY, color }) => (
      <>
        <path d={sideWigPath(headY, { apex: 9.9, napeY: 3.8 })} fill={color} />
        {sideBrow(headY)}
      </>
    ),
    length: ({ headY, color }) => (
      <>
        {[
          [-9.2, 9.6, 2.6, -1.6, true],
          [-6.6, 13, 3.4, -1, false],
          [-3.8, 11, 2.4, -0.5, true],
          [3.8, 12.2, 3.2, 0.5, false],
          [6.6, 10, 2.4, 1, true],
          [9.2, 12.6, 3, 1.6, false],
        ].map(([x, len, w, drift, dark]) => (
          <path
            key={x}
            d={`M${x} ${headY + 0.6} q${drift} ${len * 0.55} ${drift * 0.5} ${len}`}
            stroke={dark ? farColor(color) : color}
            strokeWidth={w}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        {wig(headY, color, { sideX: 8.4, apex: 9.8, baseY: 0.4 }, [ [2.2, 1.8], [2.9, 1], [3.2, 1.9], [3.1, 0.9], [2.8, 1.7], [2.6, 1], ], { lines: 0 })}
        {brow(headY)}
      </>
    ),
  },
  highpony: {
    // Slick tension toward a high knot, the tail whipping up and over in the
    // shadow tone — from the front a high pony is mostly its silhouette.
    // From behind: the knot on the crown and the tail falling straight down
    // the back of the head — the default dome erased both.
    back: ({ headY, color }) => (
      <>
        <circle cx="0" cy={headY - 0.5} r={R + HAIR_LIFT} fill={color} />
        <path
          d={`M 0.6 ${headY - 7.6} q 2.8 6.2 1.2 12.4`}
          stroke={farColor(color)}
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="0.8" cy={headY - 8.8} r="2.9" fill={color} />
        {shine(headY, R + 2)}
      </>
    ),
    // Profile: the whip arcs up off the crown and falls behind the head —
    // drawn first so the crown wig sits over its root.
    side: ({ headY, color }) => (
      <>
        <path
          d={`M 2.8 ${headY - 8.8} q 7.6 -3.2 9.8 3 q 1.5 4.8 -1.8 9.6 q -1.7 2.3 -3.4 1.1
              q -1.5 -1.2 -0.3 -3.4 q 2.3 -4.4 -0.7 -7.2 q -1.9 -1.8 -3.6 -2.7 z`}
          fill={farColor(color)}
        />
        <path d={sideWigPath(headY, { apex: 8.7, napeY: 1.8, earY: 1.4, fringeY: -2.6 })} fill={color} />
        <circle cx="2.9" cy={headY - 8.7} r="2.9" fill={color} />
        <path
          d={`M -3.4 ${headY - 6.4} Q 0 ${headY - 8.4} 1.8 ${headY - 8}`}
          stroke="#000"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.15"
        />
      </>
    ),
    front: ({ headY, color }) => (
      <>
        <path
          d={`M1.6 ${headY - 8.6} q7.4 -3.4 9.8 2.6 q1.6 4.6 -1.6 9.6 q-1.6 2.4 -3.4 1.2
              q-1.6 -1.2 -0.4 -3.4 q2.4 -4.4 -0.6 -7.2 q-2 -1.8 -3.8 -2.8 z`}
          fill={farColor(color)}
        />
        <path
          d={wigPath(headY, { sideX: 7.9, apex: 8.9, baseY: -0.3 }, [
            [4.9, 0.6],
            [6, 1.1],
            [4.9, 0.5],
          ])}
          fill={color}
        />
        <circle cx="1.6" cy={headY - 8.8} r="2.9" fill={color} />
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M${s * 5} ${headY - 3.8} Q ${s * 2.6} ${headY - 6.4} ${s * 1.2} ${headY - 7.8}`}
            stroke="#000"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.15"
          />
        ))}
      </>
    ),
  },
};

/** Crown volume behind the head — retired for styles (kept for the layer API). */
export function HairBehind({ style, headY, color }) {
  return HAIR_REGISTRY[style]?.behind?.({ headY, color }) ?? null;
}

/** Everything past the jaw — before the torso, so it falls behind the body. */
export function HairLength({ style, headY, color }) {
  return HAIR_REGISTRY[style]?.length?.({ headY, color }) ?? null;
}

/** The hair over the skull. Styles without their own get the short wig. */
export function HairFront({ style, headY, color }) {
  const draw = HAIR_REGISTRY[style]?.front;
  if (draw) return draw({ headY, color });
  return (
    <>
      {wig(headY, color, SHORT_CFG, SHORT_CLUMPS)}
      {shine(headY, SHORT_CFG.apex)}
      {brow(headY)}
    </>
  );
}

/** Profile masses hanging behind the shoulders — before the torso. */
export function HairSideLength({ style, headY, color }) {
  return HAIR_REGISTRY[style]?.sideLength?.({ headY, color }) ?? null;
}

/** The profile hair over the skull. Styles without one get the generic wig. */
export function HairSide({ style, headY, color }) {
  const draw = HAIR_REGISTRY[style]?.side;
  if (draw) return draw({ headY, color });
  return (
    <>
      <path d={sideWigPath(headY)} fill={color} />
      {sideShine(headY, 9.7)}
      {sideBrow(headY)}
    </>
  );
}

/**
 * The BACK of the head — what replaces the face and hairline when a persona
 * turns away. From behind, nearly every style is simply hair: a full cover a
 * touch wider than the skull. Styles whose backs genuinely differ override
 * `back` (the buzz's stubble); everyone else gets the default.
 */
export function HairBack({ style, headY, color }) {
  const entry = HAIR_REGISTRY[style];
  if (entry?.back) return entry.back({ headY, color, R });
  return (
    <>
      <circle cx="0" cy={headY - 0.5} r={R + HAIR_LIFT} fill={color} />
      {shine(headY, R + 2)}
      <path
        d={`M${-6.2} ${headY + 4.6} q6.2 3.4 12.4 0 q-6.2 1.9 -12.4 0 z`}
        fill="#000"
        opacity="0.12"
      />
    </>
  );
}
