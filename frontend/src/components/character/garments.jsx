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
  hoodie: {
    // The hood hangs DOWN THE BACK — the one garment whose rear view says
    // more than its front.
    back: ({ sh, top, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        <path
          d={`M${-sh + 2.6} ${top + 0.5} Q 0 ${top - 2} ${sh - 2.6} ${top + 0.5}
              L ${sh - 3.6} ${top + 9.5} Q 0 ${top + 12.5} ${-sh + 3.6} ${top + 9.5} z`}
          style={outfit}
        />
        <path
          d={`M${-sh + 3.6} ${top + 9.5} Q 0 ${top + 12.5} ${sh - 3.6} ${top + 9.5}
              Q 0 ${top + 10.7} ${-sh + 3.6} ${top + 9.5} z`}
          fill="#000"
          opacity="0.18"
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

/** What makes this garment that garment, drawn OVER the plain torso. */
export function Garment({ kind, sh, wa, hem, top, bot, waistY, inner, outfit, away = false }) {
  const entry = GARMENT_REGISTRY[kind];
  if (!entry) return null;
  // waistY arrives from the body's own metrics (the torso is user-tunable
  // now); the WAIST_DROP default keeps previews and tests that don't pass
  // one on the classic figure.
  const ctx = { sh, wa, hem, top, bot, waistY: waistY ?? top + WAIST_DROP, inner, outfit };
  ctx.shell = shellFor(ctx);
  // Turned away, a garment shows its `back` when it has one; garments whose
  // artwork is symmetric (overalls' straps, the dress, the puffer's seams)
  // simply draw the same both ways.
  const drawFn = away ? entry.back ?? entry.draw : entry.draw;
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
