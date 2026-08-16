// Every hairstyle's ARTWORK — one registry entry per style.
//
// lib/profile.js's HAIR_STYLES owns the vocabulary (keys + labels); this
// registry owns the drawing, and a test pins the two key sets equal both
// ways. Before the registry a style was up to THREE switch cases across three
// functions, and nothing tied them together — the exact drift that once let a
// style ship with its crown but no hairline.
//
// A style may provide any of three LAYERS (each optional):
//
//   behind(ctx) — crown volume, drawn before the head circle but INSIDE the
//     gesture wrappers, so it turns with a glance or a yawn. Knots and
//     bunches that sit on the skull belong here, not in length — in the
//     static layer they stayed pinned while the head moved around them.
//
//   length(ctx) — everything that falls past the jaw, drawn BEFORE THE TORSO
//     so it hangs behind the body. Length must clear the SHOULDER, not the
//     head (a masc shoulder reaches ~12.6): drawn narrower it gets swallowed
//     and a long style renders as a bob. Not inside the gesture wrappers —
//     hair down your back barely moves when you glance sideways.
//
//   front(ctx) — the hairline over the skull. THE RULE, and the whole reason
//     the hair once read as a headscarf: it may cover the CROWN and stop at
//     the temples; nothing here descends past the eye line (headY + 2) at
//     the sides of the face. Omitted, a style gets the default cap+temples.
//
// ctx carries { headY, color, R, HR, cap, temples, brow }:
//   R — the skull's radius; HR — the LIFTED radius (R + HAIR_LIFT). Hair has
//   thickness: masses drawn on HR sit ON the head instead of being painted
//   onto it — the difference between a haircut and a decal. 1.2px is a real
//   layer at a 7.3px skull; 2px is a helmet.
//   cap — the default hairline dome (on HR) WITH its brow shadow;
//   temples — framing pieces that stop just below the eye line;
//   brow — the shadow an overhanging mass casts on the forehead, the lift
//   cue. Styles that draw their own mass (coils, an afro) add it themselves
//   or their volume reads painted-on while the capped styles float.
import { HEAD_R } from "../../lib/body";
import { HAIR_LIFT } from "./body";

export const HAIR_REGISTRY = {
  // The default cap+temples IS the style.
  short: {},
  buzz: {
    // Close-cropped: a thin shadow ON the skull, not a cap over it — the one
    // style that deliberately skips the lift, because showing the skull's own
    // shape is what a buzz cut is. It used to be the `short` cap minus its
    // temple tabs, which at 57px is the same silhouette — two picker entries
    // drawing one head.
    front: ({ R, headY, color }) => (
      <path
        d={`M${-R + 1.1} ${headY - 3} a${R - 1.1} ${R - 1.1} 0 0 1 ${(R - 1.1) * 2} 0
            q-1.2 -1.1 -${R - 1.1} -1.1 q-${R - 1.1} 0 -${R - 1.1} 1.1 z`}
        fill={color}
      />
    ),
  },
  messy: {
    behind: ({ headY, color }) => (
      <ellipse cx="0" cy={headY - 1.4} rx="8.6" ry="7.8" fill={color} />
    ),
    // A few tufts breaking the dome.
    front: ({ R, headY, color, cap, temples }) => (
      <>
        {cap}
        {temples}
        {[
          [-4.6, -1.4],
          [-0.8, -2.6],
          [3.4, -1.8],
        ].map(([cx, dy]) => (
          <path
            key={cx}
            d={`M${cx} ${headY - R + 1} q${dy} -3.4 ${dy * 1.6} -1.2 q-0.4 1.6 -${Math.abs(dy) * 0.5} 2.4 z`}
            fill={color}
          />
        ))}
      </>
    ),
  },
  bob: {
    // Stops at the jaw and flicks OUT, which is what makes a bob a bob — and
    // the flick has to reach past the shoulder to be seen at all.
    length: ({ headY, color }) => (
      <path
        d={`M-8.6 ${headY - 3} q-5 9 -4.6 13.4 l26.4 0 q0.4 -4.4 -4.6 -13.4 z`}
        fill={color}
      />
    ),
    // A bob's fringe is its signature: a straight edge across the brow.
    front: ({ R, headY, color, cap, temples }) => (
      <>
        {cap}
        <path d={`M${-R} ${headY - 1.6} q${R} 2.4 ${R * 2} 0 l0 -2 l${-R * 2} 0 z`} fill={color} />
        {temples}
      </>
    ),
  },
  long: {
    // Must clear the SHOULDER, not just the head. At ±11.4 it sat inside a
    // masc shoulder (up to 12.6) and the torso swallowed everything below the
    // jaw, so long hair rendered as a bob. It flares wider than any body.
    length: ({ headY, color }) => (
      <path
        d={`M-9 ${headY - 3} q-6 15 -5.4 25 l28.8 0 q0.6 -10 -5.4 -25 z`}
        fill={color}
      />
    ),
  },
  ponytail: {
    // The gathering knot lives in BEHIND, not in length: it sits on the
    // skull, and the behind layer rides the gesture wrappers, so it moves
    // with a glance or a yawn. In the static layer it stayed pinned while the
    // head shifted 2-3px around it — hair visibly sliding off the crown.
    behind: ({ headY, color }) => (
      <>
        <ellipse cx="0" cy={headY - 0.8} rx="8" ry="7.5" fill={color} />
        <circle cx="-1" cy={headY - 6.8} r="3.1" fill={color} />
      </>
    ),
    // The tail hangs to ONE SIDE. Centred it was drawn before both the head
    // and the torso and disappeared entirely behind them — the style rendered
    // as short hair with a small nub above the crown. The path starts inside
    // the knot's radius so a turned head never opens a gap at the join.
    length: ({ headY, color }) => (
      <path
        d={`M-2.2 ${headY - 7} q-9 6 -9.6 15 q-0.4 4.4 2.6 5.2 q3 0.6 3.4 -3.6 q0.6 -7.6 7 -12.4 z`}
        fill={color}
      />
    ),
  },
  bun: {
    // High enough to break the skull's silhouette; tucked behind it was a
    // nub you couldn't tell from short hair.
    behind: ({ headY, color }) => (
      <circle cx="0" cy={headY - 8.6} r="4.4" fill={color} />
    ),
  },
  curly: {
    behind: ({ headY, color }) => (
      <ellipse cx="0" cy={headY - 1} rx="9.2" ry="8.4" fill={color} />
    ),
    // Overlapping circles read as volume; a single lumpy path reads as a
    // badly drawn cap. All of them stay on the crown, and the brow shadow
    // underneath is what lifts the coils off the skull.
    front: ({ headY, color, brow }) => (
      <>
        {[
          [-5.6, -3.4, 3.2],
          [-2.0, -5.4, 3.3],
          [1.8, -5.4, 3.3],
          [5.2, -3.4, 3.2],
          [6.6, -0.6, 2.6],
          [-6.8, -0.6, 2.6],
        ].map(([cx, dy, r]) => (
          <circle key={`${cx},${dy}`} cx={cx} cy={headY + dy} r={r} fill={color} />
        ))}
        {brow}
      </>
    ),
  },
  braids: {
    // Same rule as the ponytail knot: the gathered roots at the skull's
    // sides belong to the head and turn with it; only the plaits hang back.
    behind: ({ headY, color }) => (
      <>
        <ellipse cx="0" cy={headY - 0.8} rx="8" ry="7.5" fill={color} />
        {[-1, 1].map((s) => (
          <circle key={s} cx={s * 6.6} cy={headY + 1} r="2.3" fill={color} />
        ))}
      </>
    ),
    // Only the hanging plaits — the strands start a touch below the roots,
    // still under their cover, so the moving anchor always overlaps the
    // static plait top.
    length: ({ headY, color }) => (
      <>
        {[-1, 1].map((s) => (
          <g key={s}>
            <path
              d={`M${s * 6.6} ${headY + 2.5} q${s * 3} 6.5 ${s * 1.4} 12.5`}
              stroke={color}
              strokeWidth="3.6"
              strokeLinecap="round"
              fill="none"
            />
            {/* the knots that separate a braid from a rope */}
            {[5, 9.5, 13].map((dy) => (
              <circle key={dy} cx={s * (6.8 + dy * 0.16)} cy={headY + 1 + dy} r="2.2" fill={color} />
            ))}
          </g>
        ))}
      </>
    ),
  },
  undercut: {
    // Volume on top swept to one side, sides taken right down — the shape
    // `short` and `buzz` were both circling without either landing on it.
    // No temple pieces: bare sides ARE the style.
    front: ({ HR, headY, color }) => (
      <>
        <path
          d={`M${-HR + 0.6} ${headY - 1.6} a${HR - 0.6} ${HR - 0.6} 0 0 1 ${(HR - 0.6) * 2} 0
              q-1 -1.4 -3.2 -1.3 q-3.4 -3.6 -8 -1 q-1.4 0.8 -2 2.3 z`}
          fill={color}
        />
        <path
          d={`M${-2.4} ${headY - HR + 0.6} q5.4 -3.4 8.6 -1.2 q-2.6 0.4 -4.4 2.2 z`}
          fill={color}
        />
      </>
    ),
  },
  afro: {
    behind: ({ headY, color }) => (
      <ellipse cx="0" cy={headY - 2.4} rx="10.6" ry="9.6" fill={color} />
    ),
    // A big scalloped round mass — the widest silhouette in the set, and the
    // one shape none of the original nine was reaching for.
    front: ({ headY, color, brow }) => (
      <>
        {[
          [-7.4, -4.2, 3.6],
          [-3.4, -7.4, 3.9],
          [1.4, -7.6, 3.9],
          [6.2, -4.6, 3.7],
          [8.2, -0.6, 3.2],
          [-8.8, -0.8, 3.2],
          [0, -5.2, 5.4],
        ].map(([cx, dy, r]) => (
          <circle key={`${cx},${dy}`} cx={cx} cy={headY + dy} r={r} fill={color} />
        ))}
        {brow}
      </>
    ),
  },
  pigtails: {
    // The bunches sit on the SKULL and turn with it, same rule the ponytail
    // knot follows; only the tails below hang back in length.
    behind: ({ headY, color }) => (
      <>
        <ellipse cx="0" cy={headY - 0.8} rx="8" ry="7.5" fill={color} />
        {[-1, 1].map((side) => (
          <circle key={side} cx={side * 8.2} cy={headY - 2.6} r="3.4" fill={color} />
        ))}
      </>
    ),
    // Two short bunches either side, well clear of the shoulders — shorter and
    // wider-set than the braids, so the two read as different styles rather
    // than as one style at two lengths.
    length: ({ headY, color }) => (
      <>
        {[-1, 1].map((side) => (
          <path
            key={side}
            d={`M${side * 8.2} ${headY - 1} q${side * 3.6} 4.4 ${side * 2.2} 9.4
                q${-side * 2.6} 1.6 ${-side * 4.4} -0.6 q${side * 1.4} -4.6 ${-side * 0.4} -8.8 z`}
            fill={color}
          />
        ))}
      </>
    ),
  },
  twoblock: {
    behind: ({ headY, color }) => (
      <ellipse cx="0" cy={headY - 1.6} rx="8.8" ry="8.2" fill={color} />
    ),
    // Two levels: a full top with SQUARE sideburn blocks under it, and a step
    // between them. The mark is the shelf, NOT a fringe — a first attempt drew
    // a heavy curtain to the brow and it covered the eyes like a visor, which
    // is the hairline rule being broken exactly as it warns.
    front: ({ HR, headY, color, cap }) => (
      <>
        {cap}
        <path d={`M${-HR + 0.1} ${headY - 1.8} l-0.9 0 l0 4.6 l2.4 0 l0 -4.2 z`} fill={color} />
        <path d={`M${HR - 0.1} ${headY - 1.8} l0.9 0 l0 4.6 l-2.4 0 l0 -4.2 z`} fill={color} />
        <path
          d={`M${-HR + 0.4} ${headY - 1.6} q4 1.5 ${HR * 2 - 0.8} 0`}
          fill="none"
          stroke="#000"
          strokeWidth="1"
          opacity="0.22"
          strokeLinecap="round"
        />
      </>
    ),
  },
  wolf: {
    behind: ({ headY, color }) => (
      <ellipse cx="0" cy={headY - 2} rx="9.2" ry="8.6" fill={color} />
    ),
    // The shag at the nape — short and ragged, nothing like the bob's clean
    // curtain. Stops at the collar: a wolf cut is layered, not long.
    length: ({ headY, color }) => (
      <path
        d={`M-8.4 ${headY - 1} q-2.6 7 -1.6 11.4 q1.8 -2.6 3.2 -1
            q0.6 2.6 2.4 3.2 q1.2 -2.4 2.8 -2.4 q1.6 0 2.8 2.4
            q1.8 -0.6 2.4 -3.2 q1.4 -1.6 3.2 1 q1 -4.4 -1.6 -11.4 z`}
        fill={color}
      />
    ),
    // Layered and shaggy, not spiked. A first attempt threw four tall points
    // off the crown and read as punk; a wolf cut's mark is that the outline
    // BREAKS into pieces, not that it stands up — so these are low and uneven,
    // and the length lives in the nape.
    front: ({ headY, color, cap, temples }) => (
      <>
        {cap}
        {temples}
        {[
          [-6.2, -1.6, -2.2, -1.5],
          [-2.4, -3.4, -1.8, -1.2],
          [2.2, -3.6, 1.8, -1.2],
          [6, -1.8, 2.2, -1.4],
        ].map(([cx, cy, dx, dy]) => (
          <path
            key={cx}
            d={`M${cx} ${headY + cy} q${dx * 0.6} ${dy * 1.4} ${dx} ${dy * 1.9}
                q${dx * 0.5} ${-dy * 0.4} ${dx * 0.2} ${-dy * 1.5} z`}
            fill={color}
          />
        ))}
      </>
    ),
  },
  curtains: {
    behind: ({ headY, color }) => (
      <ellipse cx="0" cy={headY - 1.2} rx="8.4" ry="7.8" fill={color} />
    ),
    // A centre part: two drapes framing the face, and between them a notch of
    // bare forehead — the notch IS the silhouette. The drapes stop AT the eye
    // line, the absolute floor the headscarf rule allows, and each shades the
    // temple it hangs over (the split brow cue — the shared crescent would
    // shade the bare notch too and give the game away).
    front: ({ HR, headY, color }) => (
      <>
        <path
          d={`M${-HR} ${headY - 0.4}
              a${HR} ${HR} 0 0 1 ${HR * 2} 0
              Q ${HR - 1.2} ${headY + 0.8} 2.4 ${headY + 2}
              Q 0.8 ${headY - 4.4} 0 ${headY - 5.2}
              Q -0.8 ${headY - 4.4} -2.4 ${headY + 2}
              Q ${-(HR - 1.2)} ${headY + 0.8} ${-HR} ${headY - 0.4} z`}
          fill={color}
        />
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M${s * 5.4} ${headY - 0.2} q${s * 0.8} 1.6 ${s * 0.2} 2.2 q${-s * 2} -0.2 ${-s * 2.6} -1.6 z`}
            fill="#000"
            opacity="0.15"
          />
        ))}
      </>
    ),
  },
  mullet: {
    behind: ({ headY, color }) => (
      <ellipse cx="0" cy={headY - 1.2} rx="8.4" ry="7.8" fill={color} />
    ),
    // Business in front (the default cap), party in the back: a nape curtain
    // LONGER than the wolf's shag, squared off across the shoulders with the
    // corners flicking out. The clean cap is what separates it from the wolf
    // — same neighbourhood, opposite temperament.
    length: ({ headY, color }) => (
      <path
        d={`M-8 ${headY - 1} q-3.6 8 -3.8 15.6 q2.6 -1.8 4.2 -0.4
            q2.2 1.4 7.6 1.4 q5.4 0 7.6 -1.4 q1.6 -1.4 4.2 0.4 q-0.2 -7.6 -3.8 -15.6 z`}
        fill={color}
      />
    ),
  },
  spacebuns: {
    // Two buns HIGH on the crown — the double break in the skull's outline is
    // the whole style. Behind-layer only: they sit on the head and turn with
    // it, same rule as the single bun they refuse to be confused with.
    behind: ({ headY, color }) => (
      <>
        <ellipse cx="0" cy={headY - 0.8} rx="8" ry="7.5" fill={color} />
        {[-1, 1].map((s) => (
          <circle key={s} cx={s * 5.6} cy={headY - 8.2} r="3.3" fill={color} />
        ))}
      </>
    ),
  },
  locs: {
    behind: ({ headY, color }) => (
      <ellipse cx="0" cy={headY - 1.6} rx="9" ry="8.2" fill={color} />
    ),
    // Thick clean ropes falling past the jaw — four of them, alternating
    // lengths, no knots. The braids keep their two knotted plaits; the count
    // and the clean line are what make these read as a different style.
    length: ({ headY, color }) => (
      <>
        {[
          [-8.6, 10.8],
          [-5.6, 13.2],
          [5.6, 12.4],
          [8.6, 10],
        ].map(([x, len]) => (
          <path
            key={x}
            d={`M${x} ${headY + 1} q${x > 0 ? 1.4 : -1.4} ${len * 0.5} ${x > 0 ? 0.6 : -0.6} ${len}`}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </>
    ),
  },
  highpony: {
    // The tail whips UP off a high knot before falling — drawn entirely in
    // the behind layer because the whole style is attached at the crown and
    // must ride a head turn (the low ponytail's tail hangs from the nape and
    // stays put, which is why that one splits across two layers).
    behind: ({ headY, color }) => (
      <>
        <ellipse cx="0" cy={headY - 0.8} rx="8" ry="7.5" fill={color} />
        <circle cx="1.6" cy={headY - 8.4} r="2.9" fill={color} />
        <path
          d={`M1.6 ${headY - 8.4} q7.4 -3.4 9.8 2.6 q1.6 4.6 -1.6 9.6 q-1.6 2.4 -3.4 1.2
              q-1.6 -1.2 -0.4 -3.4 q2.4 -4.4 -0.6 -7.2 q-2 -1.8 -3.8 -2.8 z`}
          fill={color}
        />
      </>
    ),
  },
};

/** The shared pieces every front branch may compose from. */
function frontCtx(headY, color) {
  const R = HEAD_R;
  const HR = R + HAIR_LIFT;
  const brow = (
    <path
      d={`M${-R + 0.6} ${headY - 1.2} q4.4 3.2 ${R * 2 - 1.2} 0 q-4.4 1.9 -${R * 2 - 1.2} 0 z`}
      fill="#000"
      opacity="0.16"
    />
  );
  // A hairline sits ABOVE the equator and dips lower at the temples than at
  // the centre, leaving forehead visible — that gap is what reads as a face.
  const cap = (
    <>
      <path
        d={`M${-HR} ${headY - 0.4} a${HR} ${HR} 0 0 1 ${HR * 2} 0 q-1.4 -1.2 -3.4 -1.1 q-3.6 -3.4 -8.2 -0.9 q-1.6 0.8 -2.4 2 z`}
        fill={color}
      />
      {brow}
    </>
  );
  // Temple pieces: they STOP just below the eye line, framing rather than
  // enclosing. Any longer and the hood is back. On the lifted radius too, so
  // they sit outside the cheek rather than inside it.
  const temples = (
    <>
      <path d={`M${-HR + 0.2} ${headY - 1.4} q-1.5 2.6 -0.7 4.4 q-1.7 -1.6 -1.3 -4.2 z`} fill={color} />
      <path d={`M${HR - 0.2} ${headY - 1.4} q1.5 2.6 0.7 4.4 q1.7 -1.6 1.3 -4.2 z`} fill={color} />
    </>
  );
  return { headY, color, R, HR, cap, temples, brow };
}

/** Crown volume — behind the head circle, inside the gesture wrappers. */
export function HairBehind({ style, headY, color }) {
  return HAIR_REGISTRY[style]?.behind?.({ headY, color }) ?? null;
}

/** Everything past the jaw — before the torso, so it falls behind the body. */
export function HairLength({ style, headY, color }) {
  return HAIR_REGISTRY[style]?.length?.({ headY, color }) ?? null;
}

/** The hairline over the skull. Styles without their own get the default cap. */
export function HairFront({ style, headY, color }) {
  const ctx = frontCtx(headY, color);
  const draw = HAIR_REGISTRY[style]?.front;
  if (draw) return draw(ctx);
  return (
    <>
      {ctx.cap}
      {ctx.temples}
    </>
  );
}
