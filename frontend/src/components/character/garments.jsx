// The wardrobe's ARTWORK — one registry entry per garment.
//
// lib/profile.js's OUTFITS owns the vocabulary (keys, labels, `sleeves`,
// `inner`, `outer` — what the validator and the panel need); this registry
// owns the drawing. A test pins the two key sets equal both ways, so a
// garment can't exist in the picker without artwork or vice versa — the same
// catalog-vs-artwork contract the furniture already lives under.
//
// THE RULE FOR ADDING ONE (from OUTFITS): a garment earns a slot only if it
// changes the OUTLINE or the TWO-TONE SPLIT. At 57px a garment that changes
// neither is the same sprite in a different word. Every entry draws OVER the
// unchanged torso path, so a new one can't break the silhouette rules the
// body already satisfies.
//
// Each `draw(ctx)` receives:
//   sh / wa / hem — the body's half-widths at shoulder, waist, hem
//   top / bot / waistY — torso top, bottom, and waistline in figure space
//   inner — the layered second colour (shirt front, bib)
//   outfit — the tinted() style carrying the outfit colour ({fill}, never
//     `color`: currentColor resolves to inherited cream — a trap already hit)
//   shell() — the OUTER-layer helper below
import { OUTER_BULK } from "./body";
import { WAIST_DROP, torsoGeom } from "../../lib/body";

/**
 * An OUTER layer is worn over the body, so it has to be BIGGER than it. A
 * jacket or a hoodie drawn on the torso's own outline is a pattern printed on
 * the shirt; drawn a shade wider, with an under-shadow where it hangs off the
 * hips, it becomes a garment with a person inside. Same idea as the hair
 * lift — thickness is what reads as three-dimensional at this size.
 *
 * The shell inherits its fill (wrap it in `<g style={outfit}>`), and carries
 * its own UNDERSIDE: the shell is usually the same colour as the torso it
 * covers, so its extra width is invisible without the hem band — same #000
 * 0.15 as every box's contact band.
 */
const shellFor = ({ sh, wa, hem, top, bot }) => (scale = 1) => {
  // `scale` fattens the layer for garments whose bulk IS the point — the
  // puffer wears nearly double the standard step.
  const bulk = OUTER_BULK * scale;
  return (
    <>
      <path
        d={torsoGeom({
          sh: sh + bulk,
          wa: wa + bulk,
          hem: hem + bulk,
          top: top - bulk * 0.5,
          bot: bot + bulk,
        }).body}
      />
      <rect
        x={-(hem + bulk) + 1.4}
        y={bot + bulk - 2.2}
        width={(hem + bulk - 1.4) * 2}
        height="2.2"
        rx="1.1"
        fill="#000"
        opacity="0.15"
      />
    </>
  );
};

export const GARMENT_REGISTRY = {
  // The base garment: the torso path IS a plain sweater. Nothing to add.
  sweater: {},
  tee: {
    // From behind there's no collar — the bare forearms carry the garment.
    back: () => null,
    // A collar: with bare forearms (`sleeves: "short"`) doing the outline
    // work, the torso only needs to stop looking knitted.
    draw: ({ top }) => (
      <path
        d={`M ${-3.6} ${top + 0.5} Q 0 ${top + 4} ${3.6} ${top + 0.5}`}
        fill="none"
        stroke="#000"
        strokeWidth="1.1"
        opacity="0.18"
        strokeLinecap="round"
      />
    ),
  },
  shirt: {
    // A button-up reads from its NECK and CENTRE: two collar wings, the
    // placket line, a few buttons. From behind, just the collar's band.
    back: ({ top }) => (
      <path
        d={`M ${-3.8} ${top + 0.3} Q 0 ${top + 2} ${3.8} ${top + 0.3} L ${3.4} ${top + 2.2}
            Q 0 ${top + 3.8} ${-3.4} ${top + 2.2} z`}
        fill="#fff"
        opacity="0.28"
      />
    ),
    // Profile: the collar wing nearest the camera, and the placket's edge
    // at the front line.
    side: ({ hem, top, bot }) => (
      <>
        <path d={`M ${-3.4} ${top + 0.4} L ${0.2} ${top + 2.8} L ${-3.8} ${top + 4} z`} fill="#fff" opacity="0.45" />
        <path
          d={`M ${-hem + 1.3} ${top + 4.4} L ${-hem + 1.7} ${bot}`}
          stroke="#000"
          strokeWidth="0.9"
          opacity="0.14"
          strokeLinecap="round"
        />
      </>
    ),
    draw: ({ top, bot }) => (
      <>
        <path d={`M ${-4.2} ${top + 0.4} L ${-0.4} ${top + 2.6} L ${-4.8} ${top + 4.2} z`} fill="#fff" opacity="0.45" />
        <path d={`M ${4.2} ${top + 0.4} L ${0.4} ${top + 2.6} L ${4.8} ${top + 4.2} z`} fill="#fff" opacity="0.45" />
        <path
          d={`M 0 ${top + 2.8} L 0 ${bot - 0.5}`}
          stroke="#000"
          strokeWidth="0.9"
          opacity="0.2"
          strokeLinecap="round"
        />
        {[6.5, 10.5, 14.5].map((dy) => (
          <circle key={dy} cx="-1.2" cy={top + dy} r="0.75" fill="#000" opacity="0.38" />
        ))}
      </>
    ),
  },
  hoodie: {
    // The hood hangs DOWN THE BACK — the one garment whose rear view says
    // more than its front.
    // Profile: the shell plus the hood bunched at the back of the neck —
    // seen side-on a hood is a lump behind the collar, nothing else.
    side: ({ sh, top, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        <path
          d={`M ${sh - 3.4} ${top + 0.6} q 4.6 -1.4 4.8 3.4 q 0.1 3.4 -3.4 4
              q -2.6 0.4 -3.2 -2.2 q 1.6 -0.4 1.8 -2.6 z`}
          style={outfit}
        />
        <path
          d={`M ${sh - 3.4} ${top + 0.6} q 4.6 -1.4 4.8 3.4 q 0.1 3.4 -3.4 4
              q -2.6 0.4 -3.2 -2.2 q 1.6 -0.4 1.8 -2.6 z`}
          fill="#000"
          opacity="0.14"
        />
      </>
    ),
    // The hood hangs from the NECKLINE as a rounded pouch about half the
    // shoulders wide. It used to be a full-width panel with straight sides,
    // which read as a strange pocket sewn across the back (owner screenshot,
    // 2026-08-17) — a hood is narrow where it meets the neck and bells out,
    // and its bottom edge is a CURVE with a shadow tucked under it.
    back: ({ top, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        <path
          d={`M -4.4 ${top - 0.4} Q 0 ${top - 2.4} 4.4 ${top - 0.4}
              Q 5.8 ${top + 3.2} 3.6 ${top + 6.6}
              Q 0 ${top + 8.8} -3.6 ${top + 6.6}
              Q -5.8 ${top + 3.2} -4.4 ${top - 0.4} z`}
          style={outfit}
        />
        <path
          d={`M -3.6 ${top + 6.6} Q 0 ${top + 8.8} 3.6 ${top + 6.6}
              Q 0 ${top + 7.4} -3.6 ${top + 6.6} z`}
          fill="#000"
          opacity="0.22"
        />
        <path
          d={`M -3.8 ${top + 0.2} Q 0 ${top - 1.4} 3.8 ${top + 0.2}`}
          stroke="#fff"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.12"
        />
      </>
    ),
    draw: ({ sh, wa, top, waistY, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        {/* The hood: a collar bunched behind the neck. It's the outline change
            — a hoodie reads from the shoulders up, not from a drawstring
            nobody can see at this size. */}
        <path
          d={`M ${-sh + 1} ${top + 1.5} Q 0 ${top - 5.5} ${sh - 1} ${top + 1.5}
              Q 0 ${top + 4.5} ${-sh + 1} ${top + 1.5} Z`}
          fill="#000"
          opacity="0.18"
        />
        <path
          d={`M ${-wa + 1.5} ${waistY + 3} Q 0 ${waistY + 6} ${wa - 1.5} ${waistY + 3}`}
          fill="none"
          stroke="#000"
          strokeWidth="1.1"
          opacity="0.16"
          strokeLinecap="round"
        />
      </>
    ),
  },
  jacket: {
    // From behind a jacket is just its shell — the open front is a front.
    back: ({ outfit, shell }) => <g style={outfit}>{shell()}</g>,
    // Profile: the shell with the open front's EDGE at the body's front
    // line. The shirt's sliver runs to the shell's own front edge — stopped
    // short, coat colour showed AHEAD of it and the opening read as a
    // racing stripe down the chest (sheet, 2026-08-17).
    side: ({ hem, top, bot, inner, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        <path
          d={`M ${-hem - 1.5} ${top + 4.6} L ${-hem + 1.1} ${top + 4.6} L ${-hem + 1.4} ${bot + 1} L ${-hem - 1.1} ${bot + 0.9} Z`}
          fill={inner}
        />
        <path
          d={`M ${-hem + 1.1} ${top + 4.2} L ${-hem + 1.5} ${bot + 1}`}
          stroke="#000"
          strokeWidth="1"
          opacity="0.2"
          strokeLinecap="round"
        />
      </>
    ),
    // Open front: the inner layer shows as a panel down the middle — the
    // two-tone split. It starts BELOW the shoulder curve; drawn from the very
    // top its square corners poked out through the neckline as two pale spurs.
    draw: ({ top, bot, inner, outfit, shell }) => (
      <>
        {/* the shell, one step proud of the body all the way round */}
        <g style={outfit}>{shell()}</g>
        {/* the shirt in the opening — drawn AFTER the shell so the shell's own
            edge reads as the jacket front lying over it */}
        <path
          d={`M ${-2.6} ${top + 4.5} L ${2.6} ${top + 4.5} L ${2.2} ${bot} L ${-2.2} ${bot} Z`}
          fill={inner}
        />
        {/* the shadow the jacket edge casts onto the shirt */}
        <path
          d={`M ${-2.6} ${top + 4.5} L ${-1.5} ${top + 4.5} L ${-1.2} ${bot} L ${-2.2} ${bot} Z`}
          fill="#000"
          opacity="0.2"
        />
        <path
          d={`M ${2.6} ${top + 4.5} L ${1.5} ${top + 4.5} L ${1.2} ${bot} L ${2.2} ${bot} Z`}
          fill="#000"
          opacity="0.12"
        />
        {/* the two jacket edges meeting at the collar */}
        <path
          d={`M ${-4.4} ${top + 1.4} L ${-2.6} ${top + 5.5} L ${-2.6} ${bot}`}
          fill="none"
          stroke="#000"
          strokeWidth="1"
          opacity="0.2"
          strokeLinejoin="round"
        />
        <path
          d={`M ${4.4} ${top + 1.4} L ${2.6} ${top + 5.5} L ${2.6} ${bot}`}
          fill="none"
          stroke="#000"
          strokeWidth="1"
          opacity="0.2"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  overalls: {
    // Dungarees OVER the shirt: the bib and straps take the INNER colour and
    // the torso stays the outfit, which is the way round that actually splits
    // the chest in two. Drawn the other way (bib in the outfit colour) the bib
    // was the same green as the torso underneath it and vanished, leaving two
    // cream slivers at the collarbone that read as a mistake.
    // Profile: one strap arcing over the shoulder, the bib's front edge, and
    // the denim below the waist — the near half of the front view, honestly.
    side: ({ sh, wa, hem, top, bot, waistY, inner }) => (
      <g fill={inner}>
        <path
          d={`M ${-sh + 2} ${top + 3.5} Q 0 ${top - 0.5} ${sh - 2} ${top + 3.5} L ${sh - 2} ${waistY - 2}
              L ${sh - 4.4} ${waistY - 2} L ${sh - 4.4} ${top + 4.9} Q 0 ${top + 1.9} ${-sh + 4.4} ${top + 4.9}
              L ${-sh + 4.4} ${waistY - 2} L ${-sh + 2} ${waistY - 2} Z`}
        />
        <path
          d={`M ${-wa + 0.7} ${waistY - 5.6} L ${-wa + 3} ${waistY - 5.6} L ${-wa + 3} ${waistY} L ${-wa + 0.7} ${waistY} Z`}
          fill="#000"
          opacity="0.18"
        />
        <path
          d={`M ${-wa} ${waistY - 1} L ${wa} ${waistY - 1} L ${hem} ${bot - 3}
              Q ${hem} ${bot} ${hem - 3} ${bot} L ${-hem + 3} ${bot}
              Q ${-hem} ${bot} ${-hem} ${bot - 3} Z`}
        />
      </g>
    ),
    draw: ({ sh, wa, hem, top, bot, waistY, inner }) => (
      <g fill={inner}>
        {/* The straps and bib are a LAYER over the shirt, so each drops a
            shadow onto it — offset down-left, the way every contact shadow in
            the scene leans. Painted-on was exactly how they read without it. */}
        <g fill="#000" opacity="0.18">
          <rect x={-sh + 1.1} y={top + 1.8} width="2.6" height={waistY - top - 1} rx="1" />
          <rect x={sh - 4.7} y={top + 1.8} width="2.6" height={waistY - top - 1} rx="1" />
          <rect x={-wa + 0.5} y={waistY - 5.2} width={(wa - 1) * 2} height="6" rx="1" />
        </g>
        <rect x={-sh + 1.6} y={top + 1} width="2.6" height={waistY - top - 1} rx="1" />
        <rect x={sh - 4.2} y={top + 1} width="2.6" height={waistY - top - 1} rx="1" />
        <rect x={-wa + 1} y={waistY - 6} width={(wa - 1) * 2} height="6" rx="1" />
        {/* below the waist it's all denim, following the body's own hem */}
        <path
          d={`M ${-wa} ${waistY - 1} L ${wa} ${waistY - 1} L ${hem} ${bot - 3}
              Q ${hem} ${bot} ${hem - 3} ${bot} L ${-hem + 3} ${bot}
              Q ${-hem} ${bot} ${-hem} ${bot - 3} Z`}
        />
      </g>
    ),
  },
  cardigan: {
    back: ({ outfit, shell }) => <g style={outfit}>{shell()}</g>,
    // Profile: the shell with the front edge line — the V is a front story.
    side: ({ hem, top, bot, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        <path
          d={`M ${-hem + 1.2} ${top + 3.5} L ${-hem + 1.7} ${bot + 0.4}`}
          stroke="#000"
          strokeWidth="1"
          opacity="0.2"
          strokeLinecap="round"
        />
      </>
    ),
    // Open over the shirt like the jacket, but the split is a V — the two
    // fronts lean apart at the collar and meet low, where the jacket's panel
    // runs parallel top to bottom. Different split shape = different garment,
    // which is the whole two-tone rule.
    draw: ({ top, bot, inner, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        {/* the shirt in the V, widest at the collar, closing at mid-chest */}
        <path
          d={`M ${-4.2} ${top + 1.6} L ${4.2} ${top + 1.6} L ${1.1} ${top + 12}
              L ${1.1} ${bot} L ${-1.1} ${bot} L ${-1.1} ${top + 12} Z`}
          fill={inner}
        />
        {/* the two front edges, and the shadow the near one casts */}
        <path
          d={`M ${-4.2} ${top + 1.6} L ${-1.1} ${top + 12} L ${-1.1} ${bot}`}
          fill="none"
          stroke="#000"
          strokeWidth="1"
          opacity="0.2"
          strokeLinejoin="round"
        />
        <path
          d={`M ${4.2} ${top + 1.6} L ${1.1} ${top + 12} L ${1.1} ${bot}`}
          fill="none"
          stroke="#000"
          strokeWidth="1"
          opacity="0.2"
          strokeLinejoin="round"
        />
        {/* one button where the fronts meet — the knitwear tell */}
        <circle cx="0" cy={top + 13.6} r="0.9" fill="#000" opacity="0.3" />
      </>
    ),
  },
  turtleneck: {
    // The one garment that changes the NECK line: the rolled collar swallows
    // it (see `collar` below — drawn after the body's own neck, which would
    // otherwise paint skin over it). The torso itself needs nothing.
    collar: ({ headY, torsoY, outfit }) => {
      const y = headY + 6.2;
      const h = torsoY - y + 3.6;
      return (
        <>
          <rect x="-4.4" y={y} width="8.8" height={h} rx="2.2" style={outfit} />
          {/* the roll: lit on top, tucked dark underneath */}
          <rect x="-4.4" y={y} width="8.8" height="2.4" rx="1.2" fill="#fff" opacity="0.14" />
          <rect x="-4.4" y={y + h - 1.6} width="8.8" height="1.6" rx="0.8" fill="#000" opacity="0.16" />
        </>
      );
    },
  },
  puffer: {
    // The fattest shell in the set — bulk IS the garment — plus the quilt
    // seams that name it. Two seams, not five: at 57px more segments read as
    // stripes, not stitching.
    // Profile: same story — the seams wrap the body, so they show side-on too.
    side: ({ wa, top, outfit, shell }) => (
      <>
        <g style={outfit}>{shell(1.9)}</g>
        {[top + 6.5, top + 11.5].map((y) => (
          <path
            key={y}
            d={`M ${-wa - 1.8} ${y} Q 0 ${y + 1.8} ${wa + 1.8} ${y}`}
            fill="none"
            stroke="#000"
            strokeWidth="1.1"
            opacity="0.16"
            strokeLinecap="round"
          />
        ))}
      </>
    ),
    draw: ({ wa, top, outfit, shell }) => (
      <>
        <g style={outfit}>{shell(1.9)}</g>
        {[top + 6.5, top + 11.5].map((y) => (
          <path
            key={y}
            d={`M ${-wa - 1.8} ${y} Q 0 ${y + 1.8} ${wa + 1.8} ${y}`}
            fill="none"
            stroke="#000"
            strokeWidth="1.1"
            opacity="0.16"
            strokeLinecap="round"
          />
        ))}
      </>
    ),
  },
  dress: {
    // The hem flares past the hips instead of tucking in — the strongest
    // outline change in the set, and the only one that changes where the legs
    // start reading from.
    // Profile: the skirt is a cone seen edge-on — it still flares, front and
    // back, just narrower than the front view's spread.
    side: ({ wa, hem, bot, waistY, outfit }) => (
      <>
        <path
          style={outfit}
          d={`M ${-wa + 0.5} ${waistY - 1} L ${wa - 0.5} ${waistY - 1}
              L ${hem + 3.4} ${bot + 8.5} Q 0 ${bot + 11} ${-hem - 3.4} ${bot + 8.5} Z`}
        />
        <path
          d={`M ${-hem - 3.4} ${bot + 8.5} Q 0 ${bot + 11} ${hem + 3.4} ${bot + 8.5}
              L ${hem + 2} ${bot + 6.9} Q 0 ${bot + 9.2} ${-hem - 2} ${bot + 6.9} Z`}
          fill="#000"
          opacity="0.14"
        />
      </>
    ),
    draw: ({ wa, hem, bot, waistY, outfit }) => (
      <>
        <path
          style={outfit}
          d={`M ${-wa + 0.5} ${waistY - 1} L ${wa - 0.5} ${waistY - 1}
              L ${hem + 5.2} ${bot + 8.5} Q 0 ${bot + 11} ${-hem - 5.2} ${bot + 8.5} Z`}
        />
        {/* The skirt is a cone standing off the legs, so its hem carries the
            same shaded band every box's base does — without it the flare read
            as a flat pennant pinned to the waist. */}
        <path
          d={`M ${-hem - 5.2} ${bot + 8.5} Q 0 ${bot + 11} ${hem + 5.2} ${bot + 8.5}
              L ${hem + 3.6} ${bot + 6.9} Q 0 ${bot + 9.2} ${-hem - 3.6} ${bot + 6.9} Z`}
          fill="#000"
          opacity="0.14"
        />
      </>
    ),
  },
};

/** Pick the right drawing for the view: front, back, or profile. */
const viewDraw = (entry, view) => {
  if (view === "back") return entry.back ?? entry.draw;
  // Profile: a garment without its own side view shows nothing extra — the
  // coloured torso IS the garment edge-on. Reusing the front here painted
  // front-view collars and panels across a body half the width.
  if (view === "side") return entry.side ?? null;
  return entry.draw;
};

/**
 * What makes this garment that garment, drawn OVER the plain torso.
 *
 * `view` is which side of the figure faces the camera ("front" | "back" |
 * "side"); garments whose artwork is symmetric (overalls' straps, the
 * puffer's seams) simply draw the same both ways.
 */
export function Garment({ kind, sh, wa, hem, top, bot, waistY, inner, outfit, view = "front" }) {
  const entry = GARMENT_REGISTRY[kind];
  if (!entry) return null;
  // waistY arrives from the body's own metrics (the torso is user-tunable
  // now); the WAIST_DROP default keeps previews and tests that don't pass
  // one on the classic figure.
  const ctx = { sh, wa, hem, top, bot, waistY: waistY ?? top + WAIST_DROP, inner, outfit };
  ctx.shell = shellFor(ctx);
  const drawFn = viewDraw(entry, view);
  return drawFn ? drawFn(ctx) : null;
}

/**
 * The coat, drawn over the finished top. Same registry, different colour
 * wiring — that's the whole two-slot split: the shell paints in the COAT's
 * colour, and what shows through an open front (`ctx.inner`) is the TOP's
 * colour, so a red jacket over a cream shirt is exactly what it says.
 */
export function Coat({ kind, sh, wa, hem, top, bot, waistY, topColor, coatStyle, view = "front" }) {
  if (!kind || kind === "none") return null;
  const entry = GARMENT_REGISTRY[kind];
  if (!entry) return null;
  const ctx = {
    sh,
    wa,
    hem,
    top,
    bot,
    waistY: waistY ?? top + WAIST_DROP,
    inner: topColor,
    outfit: coatStyle,
  };
  ctx.shell = shellFor(ctx);
  const drawFn = viewDraw(entry, view);
  return drawFn ? drawFn(ctx) : null;
}

/**
 * A garment's NECK piece, drawn after the body's own neck and collar — the
 * one place the torso pass can't reach, because the skin neck paints over
 * everything the torso drew. Only garments that change the neckline use it
 * (the turtleneck); everyone else returns nothing.
 */
export function GarmentCollar({ kind, headY, torsoY, outfit }) {
  const entry = GARMENT_REGISTRY[kind];
  if (!entry?.collar) return null;
  return entry.collar({ headY, torsoY, outfit });
}
