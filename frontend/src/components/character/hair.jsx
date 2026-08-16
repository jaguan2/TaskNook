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
//   * Interior budget: at most three marks — the brow shadow under the
//     fringe, one crown shine following the dome, and the odd anchored line.
//
// Layers (see index.jsx): `front` draws over the head inside the gesture
// wrappers; `length` draws before the torso so it hangs behind the body;
// `back` replaces everything when the figure turns away. The old `behind`
// layer is retired — crown volume welds into `front` now.
import { HEAD_R, farColor } from "../../lib/body";
import { HAIR_LIFT } from "./body";

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

/** One crown shine, concentric with the dome — the only highlight allowed. */
const shine = (headY, apex, color = "#fff") => (
  <path
    d={`M${-R * 0.62} ${headY - apex * 0.62} q${R * 0.62} ${-apex * 0.4} ${R * 1.24} 0`}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    fill="none"
    opacity="0.12"
  />
);

/** The shadow an overhanging fringe casts on the forehead — the lift cue. */
const brow = (headY) => (
  <path
    d={`M${-R + 0.8} ${headY - 1.1} q4.2 2.3 ${R * 2 - 1.6} 0 q-4.2 1.4 -${R * 2 - 1.6} 0 z`}
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
    front: ({ headY, color }) => (
      <>
        <path d={wigPath(headY, SHORT_CFG, SHORT_CLUMPS)} fill={color} />
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
    front: ({ headY, color }) => (
      <>
        <path
          d={wigPath(headY, { sideX: 8.3, apex: 9.7, baseY: 0.1 }, [
            [2.3, 2.3],
            [3.9, 1],
            [3, 2.1],
            [4.5, 1.4],
            [2.9, 2.4],
          ])}
          fill={color}
        />
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
    length: ({ headY, color }) => (
      <path
        d={`M-8.8 ${headY - 3} q-4.4 6.6 -3.2 11.6 q0.9 2.5 3.2 2.8
            L8.8 ${headY + 11.4} q2.3 -0.3 3.2 -2.8 q1.2 -5 -3.2 -11.6 z`}
        fill={farColor(color)}
      />
    ),
    front: ({ headY, color }) => (
      <>
        <path
          d={wigPath(headY, { sideX: 8.5, apex: 9.5, baseY: 0.9 }, [
            [2.1, 2.8],
            [3.5, 1.2],
            [5, 1.7],
            [4.1, 1.1],
            [2.3, 2.9],
          ])}
          fill={color}
        />
        {shine(headY, 9.5)}
        {brow(headY)}
      </>
    ),
  },
  long: {
    // Dark back sheet to below the shoulders + two base-tone curtains riding
    // over it — the tone split is what makes it deep instead of a slab.
    length: ({ headY, color }) => (
      <>
        <path
          d={`M-9 ${headY - 3} q-6 15 -5.4 25 l28.8 0 q0.6 -10 -5.4 -25 z`}
          fill={farColor(color)}
        />
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M${s * 8.6} ${headY - 1.5} q${s * 3.6} 8.5 ${s * 2.9} 20.5
                q${-s * 2.4} 1.4 ${-s * 4.6} 0.4 q${s * 0.4} -12 ${-s * 1.4} -19.4 z`}
            fill={color}
          />
        ))}
      </>
    ),
    front: ({ headY, color }) => (
      <>
        <path
          d={wigPath(headY, { sideX: 8.4, apex: 9.6, baseY: 0.8 }, [
            [2, 2.6],
            [3.8, 1.3],
            [5.2, 1.8],
            [3.6, 1.1],
            [2.2, 2.7],
          ])}
          fill={color}
        />
        {shine(headY, 9.6)}
        {brow(headY)}
      </>
    ),
  },
  ponytail: {
    // Slick wig with the gathering knot welded at the crown; the tail hangs
    // to one side in the shadow tone.
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
        {shine(headY, 10)}
        {brow(headY)}
      </>
    ),
  },
  braids: {
    // Tight crown, roots at the temples, two plaits behind the body in the
    // shadow tone with their knots reading as segments.
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
        <path
          d={wigPath(headY, { sideX: 8, apex: 9, baseY: 0.6 }, [
            [2.4, 2.2],
            [5.4, 1.1],
            [5.8, 1.4],
            [2.4, 2.3],
          ])}
          fill={color}
        />
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
    front: ({ headY, color }) => (
      <>
        <path
          d={wigPath(headY, { sideX: 7.9, apex: 9.6, baseY: -1.2 }, [
            [10.6, 1.7],
            [5.2, 0.7],
          ])}
          fill={color}
        />
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
        {shine(headY, 10.4)}
        {brow(headY)}
      </>
    ),
  },
  pigtails: {
    // Crown wig with the side bunches welded on; the tails beneath hang in
    // the shadow tone, well clear of the shoulders.
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
        <path
          d={wigPath(headY, { sideX: 8, apex: 9.1, baseY: 0.3 }, [
            [2.3, 2],
            [5.2, 1.2],
            [5.9, 1.6],
            [2.6, 2.1],
          ])}
          fill={color}
        />
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
    front: ({ headY, color }) => (
      <>
        <path
          d={wigPath(headY, { sideX: 8.6, apex: 9.7, baseY: -0.2 }, [
            [1.9, 1.2],
            [3.1, 2.4],
            [3.6, 2.7],
            [3.5, 2.5],
            [3.2, 2.3],
            [1.9, 1.3],
          ])}
          fill={color}
        />
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
        <path
          d={wigPath(headY, { sideX: 8.3, apex: 10.3, baseY: 0.3 }, [
            [2.2, 2.5],
            [3.3, 1.1],
            [2.8, 2.2],
            [2.6, 1],
            [3, 2.3],
            [2.7, 1.2],
          ])}
          fill={color}
        />
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
    front: ({ headY, color }) => (
      <>
        <path
          d={wigPath(headY, { sideX: 8.2, apex: 9.4, baseY: 0.5 }, [
            [2.9, 2.1],
            [3.5, 1.3],
            [3.6, -5.8],
            [3.5, 1.3],
            [2.9, 2.1],
          ])}
          fill={color}
        />
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
    length: ({ headY, color }) => (
      <path
        d={`M-8 ${headY - 1} q-3.6 8 -3.8 15.6 q2.6 -1.8 4.2 -0.4
            q2.2 1.4 7.6 1.4 q5.4 0 7.6 -1.4 q1.6 -1.4 4.2 0.4 q-0.2 -7.6 -3.8 -15.6 z`}
        fill={farColor(color)}
      />
    ),
    front: ({ headY, color }) => (
      <>
        <path d={wigPath(headY, SHORT_CFG, SHORT_CLUMPS)} fill={color} />
        {shine(headY, SHORT_CFG.apex)}
        {brow(headY)}
      </>
    ),
  },
  spacebuns: {
    // The tight wig with two balls breaking the top silhouette and the part
    // groove between them — both signatures, per the research.
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
        <path
          d={wigPath(headY, { sideX: 8.4, apex: 9.8, baseY: 0.4 }, [
            [2.2, 1.8],
            [2.9, 1],
            [3.2, 1.9],
            [3.1, 0.9],
            [2.8, 1.7],
            [2.6, 1],
          ])}
          fill={color}
        />
        {brow(headY)}
      </>
    ),
  },
  highpony: {
    // Slick tension toward a high knot, the tail whipping up and over in the
    // shadow tone — from the front a high pony is mostly its silhouette.
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
      <path d={wigPath(headY, SHORT_CFG, SHORT_CLUMPS)} fill={color} />
      {shine(headY, SHORT_CFG.apex)}
      {brow(headY)}
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
