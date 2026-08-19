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
import { BRASS, GLINT, OUTER_BULK, SHADE } from "./body";
import { WAIST_DROP, torsoGeom } from "../../lib/body";

/**
 * A garment's FINISH: how strongly the assembly's shared form shadow and
 * highlight land on it. This is material as an axis separate from colour —
 * the same user hex reads as matte cotton on a tee and sheeny nylon on the
 * puffer purely from these two numbers, which is how one recolour system
 * serves every fabric (the GW2 dye lesson). Opacities, multiplied by the
 * luminance tone at the assembly.
 */
export const DEFAULT_FINISH = { shade: 0.16, glint: 0.1 };
const KNIT = { shade: 0.15, glint: 0.07 };
const MATTE = { shade: 0.14, glint: 0.05 };
const CRISP = { shade: 0.18, glint: 0.15 };

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
  // The sweater used to be the bare torso, which meant "sweater vs tee" was
  // a collar-line apart (owner: "there feels like no difference"). Knitwear
  // reads from its RIBBING: a crew band at the neck, a ribbed hem, ribbed
  // cuffs on the sleeves' wrists via the arm — here, the two bands.
  sweater: {
    finish: KNIT,
    cuffs: true,
    draw: ({ hem, top, bot }) => (
      <>
        <path
          d={`M ${-4} ${top + 0.6} Q 0 ${top + 3.4} ${4} ${top + 0.6}`}
          fill="none"
          stroke="#000"
          strokeWidth="1.7"
          opacity="0.2"
          strokeLinecap="round"
        />
        <rect x={-hem + 1.6} y={bot - 2.3} width={(hem - 1.6) * 2} height="2.3" fill="#000" opacity="0.15" />
        {[-hem + 3, -hem + 5.4, -hem + 7.8, hem - 7.8, hem - 5.4, hem - 3].map((x) => (
          <path
            key={x}
            d={`M ${x} ${bot - 2.1} L ${x} ${bot - 0.3}`}
            stroke="#000"
            strokeWidth="0.7"
            opacity="0.26"
            strokeLinecap="round"
          />
        ))}
      </>
    ),
    back: ({ hem, bot }) => (
      <rect x={-hem + 1.6} y={bot - 2.3} width={(hem - 1.6) * 2} height="2.3" fill="#000" opacity="0.15" />
    ),
  },
  tee: {
    finish: MATTE,
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
        opacity="0.2"
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
          opacity="0.24"
          strokeLinecap="round"
        />
        {[6.5, 10.5, 14.5].map((dy) => (
          <circle key={dy} cx="-1.2" cy={top + dy} r="0.75" fill="#000" opacity="0.5" />
        ))}
        {/* the untucked shirt-tail curve at the hem */}
        <path
          d={`M ${-6} ${bot - 0.4} Q 0 ${bot + 1.8} ${6} ${bot - 0.4}`}
          fill="none"
          stroke="#000"
          strokeWidth="0.9"
          opacity="0.16"
          strokeLinecap="round"
        />
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
    // A hoodie from the front is three things at once: the hood's BULK
    // rising above the shoulder line (not just a shaded lens), the kangaroo
    // pocket, and the drawstrings. The old version had only the lens, which
    // left it a shell like every other coat (owner: "no difference").
    draw: ({ sh, top, waistY, outfit, shell }) => (
      <>
        {/* the hood's two lobes peek OVER the shoulders behind the neck */}
        <path
          d={`M ${-sh + 0.6} ${top + 2} Q ${-sh + 0.6} ${top - 3.4} ${-1.2} ${top - 3.2}
              L ${1.2} ${top - 3.2} Q ${sh - 0.6} ${top - 3.4} ${sh - 0.6} ${top + 2} z`}
          style={outfit}
        />
        <g style={outfit}>{shell()}</g>
        <path
          d={`M ${-sh + 1} ${top + 1.5} Q 0 ${top - 5.5} ${sh - 1} ${top + 1.5}
              Q 0 ${top + 4.5} ${-sh + 1} ${top + 1.5} Z`}
          fill="#000"
          opacity="0.18"
        />
        {/* the crevice under the hood's bulk — the hood lies ON the chest,
            and without a contact line its lens read as a painted yoke */}
        <path
          d={`M ${-sh + 1.6} ${top + 1.8} Q 0 ${top + 4.9} ${sh - 1.6} ${top + 1.8}`}
          stroke="#000"
          strokeWidth="0.8"
          fill="none"
          opacity="0.2"
          strokeLinecap="round"
        />
        {/* drawstrings */}
        {[-1.7, 1.7].map((x) => (
          <path
            key={x}
            d={`M ${x} ${top + 3.6} L ${x * 1.15} ${top + 7.4}`}
            stroke="#000"
            strokeWidth="0.8"
            opacity="0.28"
            strokeLinecap="round"
          />
        ))}
        {/* The kangaroo pocket: a soft POUCH — filled a step darker with
            rounded bottom corners, its mouths two angled slits. The first
            cut was a sharp-cornered trapezoid outline, which read as a
            drawn-on box in a wardrobe where every other mark is soft. */}
        <path
          d={`M ${-4.7} ${waistY - 0.4} L ${4.7} ${waistY - 0.4} L ${4} ${waistY + 3.2}
              Q ${3.8} ${waistY + 4.9} ${2.2} ${waistY + 4.9} L ${-2.2} ${waistY + 4.9}
              Q ${-3.8} ${waistY + 4.9} ${-4} ${waistY + 3.2} z`}
          fill="#000"
          opacity="0.12"
        />
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M ${s * 4.7} ${waistY - 0.2} L ${s * 3.4} ${waistY + 3.4}`}
            stroke="#000"
            strokeWidth="0.9"
            opacity="0.26"
            strokeLinecap="round"
          />
        ))}
      </>
    ),
    finish: DEFAULT_FINISH,
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
        {/* LAPELS folding back from the opening — the mark that makes a
            jacket a jacket instead of "shell with a slot". Each catches the
            light along its top fold: a lapel is cloth turned TOWARD the
            light, which is what separates it from a shadow. */}
        <path d={`M ${-4.6} ${top + 1.2} L ${-2.6} ${top + 5.5} L ${-6.2} ${top + 4.6} z`} fill="#000" opacity="0.24" />
        <path d={`M ${4.6} ${top + 1.2} L ${2.6} ${top + 5.5} L ${6.2} ${top + 4.6} z`} fill="#000" opacity="0.24" />
        <path d={`M ${-4.6} ${top + 1.2} L ${-6.2} ${top + 4.6}`} stroke={GLINT} strokeWidth="0.7" fill="none" opacity="0.3" strokeLinecap="round" />
        <path d={`M ${4.6} ${top + 1.2} L ${6.2} ${top + 4.6}`} stroke={GLINT} strokeWidth="0.7" fill="none" opacity="0.3" strokeLinecap="round" />
      </>
    ),
    finish: CRISP,
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
        {/* brass buckles where the straps meet the bib — the fixed-anchor
            rule (the shoe-sole split): a spot of hardware the tint never
            touches is what makes any strap colour read as dungarees */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <circle cx={s * (wa - 1.9)} cy={waistY - 5} r="1" fill={BRASS} />
            <circle cx={s * (wa - 1.9)} cy={waistY - 5} r="1" fill="none" stroke="#000" strokeWidth="0.45" opacity="0.35" />
          </g>
        ))}
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
    draw: ({ hem, top, bot, inner, outfit, shell }) => (
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
        {/* a column of buttons where the fronts meet, and a ribbed hem a
            knit length LONGER than the body — a cardigan hangs, a jacket
            stops (the length difference is the two coats' split) */}
        {[13.6, 16.6].map((dy) => (
          <circle key={dy} cx="0" cy={top + dy} r="0.9" fill="#000" opacity="0.44" />
        ))}
        <path
          d={`M ${-hem - 1} ${bot + 1} Q 0 ${bot + 3.2} ${hem + 1} ${bot + 1}
              L ${hem + 1} ${bot + 3.2} Q 0 ${bot + 5.2} ${-hem - 1} ${bot + 3.2} z`}
          style={outfit}
        />
        <path
          d={`M ${-hem - 1} ${bot + 1} Q 0 ${bot + 3.2} ${hem + 1} ${bot + 1}
              L ${hem + 1} ${bot + 3.2} Q 0 ${bot + 5.2} ${-hem - 1} ${bot + 3.2} z`}
          fill="#000"
          opacity="0.14"
        />
      </>
    ),
    finish: KNIT,
    cuffs: true,
    // The knit hem hangs BELOW the body — the assembly's hem-onto-trousers
    // shadow would paint across it, so this entry opts out.
    drape: true,
  },
  turtleneck: {
    finish: KNIT,
    cuffs: true,
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
    // The fattest shell in the set — bulk IS the garment — quilted into
    // TUBES. Two seams, not five (at 57px more segments read as stripes),
    // but the seams alone read as pinstripes on a sweatshirt: what says
    // "inflated" is each tube catching its own light along the top and
    // pinching dark INTO the seam below — per-bulge modelling, the one
    // fabric whose sheen is the material. A zip in fixed neutral closes it.
    // Profile: the same tubes wrap the body, so the story survives side-on.
    finish: { shade: 0.19, glint: 0.2 },
    side: ({ wa, top, outfit, shell }) => (
      <>
        <g style={outfit}>{shell(1.9)}</g>
        {[top + 6.5, top + 11.5].map((y) => (
          <g key={y}>
            <path
              d={`M ${-wa - 2} ${y - 3} Q 0 ${y - 1.4} ${wa + 2} ${y - 3}`}
              fill="none"
              stroke={GLINT}
              strokeWidth="1.5"
              opacity="0.14"
              strokeLinecap="round"
            />
            <path
              d={`M ${-wa - 2.2} ${y} Q 0 ${y + 1.8} ${wa + 2.2} ${y}`}
              fill="none"
              stroke={SHADE}
              strokeWidth="1.1"
              opacity="0.3"
              strokeLinecap="round"
            />
          </g>
        ))}
      </>
    ),
    draw: ({ wa, top, bot, outfit, shell }) => (
      <>
        <g style={outfit}>{shell(1.9)}</g>
        {[top + 6.5, top + 11.5].map((y) => (
          <g key={y}>
            {/* the tube above each seam: lit along its crown… */}
            <path
              d={`M ${-wa - 2} ${y - 3} Q 0 ${y - 1.4} ${wa + 2} ${y - 3}`}
              fill="none"
              stroke={GLINT}
              strokeWidth="1.5"
              opacity="0.14"
              strokeLinecap="round"
            />
            {/* …pinching dark into the quilt seam below it */}
            <path
              d={`M ${-wa - 2.2} ${y} Q 0 ${y + 1.8} ${wa + 2.2} ${y}`}
              fill="none"
              stroke={SHADE}
              strokeWidth="1.1"
              opacity="0.3"
              strokeLinecap="round"
            />
          </g>
        ))}
        {/* the bottom tube's crown, so the last segment inflates too */}
        <path
          d={`M ${-wa - 1.8} ${bot - 2.6} Q 0 ${bot - 1} ${wa + 1.8} ${bot - 2.6}`}
          fill="none"
          stroke={GLINT}
          strokeWidth="1.4"
          opacity="0.12"
          strokeLinecap="round"
        />
        {/* the zip: fixed neutral, its pull at the collar */}
        <path d={`M 0 ${top + 1.6} L 0 ${bot + 0.8}`} stroke="#000" strokeWidth="0.8" opacity="0.3" />
        <circle cx="0" cy={top + 3.4} r="0.65" fill="#000" opacity="0.42" />
      </>
    ),
  },
  vest: {
    // The sweater vest: knit over the shirt, and the first garment whose
    // SLEEVES belong to the layer underneath — the assembly paints the arms
    // in the INNER colour (profile.js `sleeves: "inner"`), so the split this
    // earns its slot with is torso-vs-arms, one no other top has. On the
    // torso: the shirt's collar wings above a ribbed V, armhole ribbing
    // where knit gives way to shirt sleeve, and a sweater hem.
    finish: KNIT,
    draw: ({ sh, hem, top, bot, inner }) => (
      <>
        {/* the shirt's collar wings, poking out above the V */}
        <path d={`M ${-4.2} ${top + 0.4} L ${-0.4} ${top + 2.6} L ${-4.8} ${top + 4.2} z`} fill={inner} />
        <path d={`M ${4.2} ${top + 0.4} L ${0.4} ${top + 2.6} L ${4.8} ${top + 4.2} z`} fill={inner} />
        {/* the V-notch shows the shirt */}
        <path d={`M ${-3} ${top + 1} L 0 ${top + 6.6} L ${3} ${top + 1} z`} fill={inner} />
        {/* ribbed V edging */}
        <path d={`M ${-3.5} ${top + 0.9} L 0 ${top + 7}`} stroke="#000" strokeWidth="1.1" opacity="0.24" strokeLinecap="round" fill="none" />
        <path d={`M ${3.5} ${top + 0.9} L 0 ${top + 7}`} stroke="#000" strokeWidth="1.1" opacity="0.24" strokeLinecap="round" fill="none" />
        {/* armhole ribbing — where the knit stops and the shirt sleeve starts */}
        <path d={`M ${-sh + 1} ${top + 2} Q ${-sh + 2.8} ${top + 4.5} ${-sh + 1.8} ${top + 7.5}`} stroke="#000" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round" />
        <path d={`M ${sh - 1} ${top + 2} Q ${sh - 2.8} ${top + 4.5} ${sh - 1.8} ${top + 7.5}`} stroke="#000" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round" />
        {/* ribbed hem, sweater-style */}
        <rect x={-hem + 1.6} y={bot - 2.3} width={(hem - 1.6) * 2} height="2.3" fill="#000" opacity="0.15" />
        {[-hem + 3.2, -hem + 5.6, hem - 5.6, hem - 3.2].map((x) => (
          <path key={x} d={`M ${x} ${bot - 2.1} L ${x} ${bot - 0.3}`} stroke="#000" strokeWidth="0.7" opacity="0.26" strokeLinecap="round" />
        ))}
      </>
    ),
    back: ({ sh, hem, top, bot }) => (
      <>
        {/* armholes read from behind too; the V is a front story */}
        <path d={`M ${-sh + 1} ${top + 2} Q ${-sh + 2.8} ${top + 4.5} ${-sh + 1.8} ${top + 7.5}`} stroke="#000" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round" />
        <path d={`M ${sh - 1} ${top + 2} Q ${sh - 2.8} ${top + 4.5} ${sh - 1.8} ${top + 7.5}`} stroke="#000" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round" />
        <rect x={-hem + 1.6} y={bot - 2.3} width={(hem - 1.6) * 2} height="2.3" fill="#000" opacity="0.15" />
      </>
    ),
    side: ({ top, hem, bot }) => (
      <>
        {/* the armhole edge is the vest's whole story seen side-on */}
        <path d={`M ${-1.2} ${top + 1.8} Q ${1.4} ${top + 4.5} ${0.4} ${top + 8}`} stroke="#000" strokeWidth="1" opacity="0.2" fill="none" strokeLinecap="round" />
        <rect x={-hem + 1.2} y={bot - 2.3} width={(hem - 1.2) * 2} height="2.3" fill="#000" opacity="0.15" />
      </>
    ),
  },
  varsity: {
    // The varsity jacket: a coat whose SLEEVES are the second colour — the
    // classic wool-body / leather-arms split (the assembly wires the arms to
    // the inner colour). The shell keeps the coat colour; the ribbed collar
    // and hem borrow the SLEEVE colour, which is what ties the two halves
    // into one garment; a snap placket closes it down the middle.
    finish: CRISP,
    cuffs: true,
    back: ({ hem, bot, inner, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        <rect x={-(hem + OUTER_BULK) + 1.4} y={bot + OUTER_BULK - 2.3} width={(hem + OUTER_BULK - 1.4) * 2} height="2.3" rx="1.1" fill={inner} opacity="0.92" />
      </>
    ),
    side: ({ hem, top, bot, inner, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        {/* the front edge, and the ribbed hem in the sleeve colour */}
        <path d={`M ${-hem + 1.2} ${top + 3.8} L ${-hem + 1.6} ${bot + 0.6}`} stroke="#000" strokeWidth="1" opacity="0.2" strokeLinecap="round" />
        <rect x={-(hem + OUTER_BULK) + 1.2} y={bot + OUTER_BULK - 2.3} width={(hem + OUTER_BULK - 1.2) * 2} height="2.3" rx="1.1" fill={inner} opacity="0.92" />
      </>
    ),
    draw: ({ sh, hem, top, bot, inner, outfit, shell }) => (
      <>
        <g style={outfit}>{shell()}</g>
        {/* ribbed hem band in the sleeve colour, with knit ticks */}
        <rect x={-(hem + OUTER_BULK) + 1.4} y={bot + OUTER_BULK - 2.3} width={(hem + OUTER_BULK - 1.4) * 2} height="2.3" rx="1.1" fill={inner} opacity="0.92" />
        {[-hem + 2.6, -hem + 5, hem - 5, hem - 2.6].map((x) => (
          <path key={x} d={`M ${x} ${bot + OUTER_BULK - 2}` + ` L ${x} ${bot + OUTER_BULK - 0.4}`} stroke="#000" strokeWidth="0.7" opacity="0.3" strokeLinecap="round" />
        ))}
        {/* ribbed collar band at the neckline */}
        <path d={`M ${-3.9} ${top + 0.5} Q 0 ${top + 3.2} ${3.9} ${top + 0.5} L ${3.4} ${top + 2.6} Q 0 ${top + 5} ${-3.4} ${top + 2.6} z`} fill={inner} opacity="0.92" />
        {/* the snap placket: centre seam + three snaps in fixed neutral */}
        <path d={`M 0 ${top + 4.4} L 0 ${bot + OUTER_BULK - 2.4}`} stroke="#000" strokeWidth="0.9" opacity="0.26" />
        {[7.5, 11, 14.5].map((dy) => (
          <circle key={dy} cx="0" cy={top + dy} r="0.7" fill="#000" opacity="0.45" />
        ))}
        {/* the chest patch — the little felt letter block, in the trim colour */}
        <rect x={-sh + 1.8} y={top + 6.2} width="3" height="3.2" rx="0.7" fill={inner} opacity="0.9" />
        <rect x={-sh + 1.8} y={top + 6.2} width="3" height="3.2" rx="0.7" fill="#000" opacity="0.12" />
      </>
    ),
  },
  raincoat: {
    // The raincoat: the LONGEST layer in the set — the shell keeps falling
    // past the hem in one straight drop, the one coat that changes where the
    // legs start reading from (the dress rule, on a coat). A storm flap
    // across the chest, patch-flap pockets, and the sheeniest finish in the
    // registry: wet nylon models by highlight.
    finish: { shade: 0.17, glint: 0.22 },
    drape: true,
    back: ({ hem, top, bot, outfit, shell }) => {
      const w = hem + OUTER_BULK;
      return (
        <>
          <g style={outfit}>{shell()}</g>
          <g style={outfit}>
            <path d={`M ${-w + 0.3} ${bot} L ${w - 0.3} ${bot} L ${w + 0.7} ${bot + 6.5} L ${-w - 0.7} ${bot + 6.5} z`} />
          </g>
          {/* the centre vent, and the skirt's own hem shadow */}
          <path d={`M 0 ${bot + 2} L 0 ${bot + 6.3}`} stroke="#000" strokeWidth="0.9" opacity="0.2" />
          <rect x={-w - 0.5} y={bot + 5.1} width={(w + 0.5) * 2} height="1.5" rx="0.7" fill="#000" opacity="0.15" />
          {/* the yoke seam rain rolls off */}
          <path d={`M ${-w + 1.2} ${top + 5} Q 0 ${top + 7} ${w - 1.2} ${top + 5}`} stroke="#000" strokeWidth="0.8" opacity="0.16" fill="none" />
        </>
      );
    },
    side: ({ hem, top, bot, outfit, shell }) => {
      const w = hem + OUTER_BULK;
      return (
        <>
          <g style={outfit}>{shell()}</g>
          <g style={outfit}>
            <path d={`M ${-w + 0.3} ${bot} L ${w - 0.3} ${bot} L ${w + 0.5} ${bot + 6.5} L ${-w - 0.5} ${bot + 6.5} z`} />
          </g>
          <rect x={-w - 0.3} y={bot + 5.1} width={(w + 0.3) * 2} height="1.5" rx="0.7" fill="#000" opacity="0.15" />
          {/* front edge + the near pocket's flap */}
          <path d={`M ${-w + 1.4} ${top + 4.5} L ${-w + 1.8} ${bot + 5.8}`} stroke="#000" strokeWidth="1" opacity="0.2" strokeLinecap="round" />
          <path d={`M ${-w + 3} ${bot - 3.5} L ${-w + 7} ${bot - 3.5} L ${-w + 6.7} ${bot - 1.9} L ${-w + 3.3} ${bot - 1.9} z`} fill="#000" opacity="0.14" />
        </>
      );
    },
    draw: ({ wa, hem, top, bot, waistY, outfit, shell }) => {
      const w = hem + OUTER_BULK;
      return (
        <>
          <g style={outfit}>{shell()}</g>
          {/* the drop below the hem — a raincoat's whole outline story */}
          <g style={outfit}>
            <path d={`M ${-w + 0.3} ${bot} L ${w - 0.3} ${bot} L ${w + 0.7} ${bot + 6.5} L ${-w - 0.7} ${bot + 6.5} z`} />
          </g>
          <rect x={-w - 0.5} y={bot + 5.1} width={(w + 0.5) * 2} height="1.5" rx="0.7" fill="#000" opacity="0.15" />
          {/* the storm flap: a yoke seam with the light catching above it */}
          <path d={`M ${-w + 1.2} ${top + 5.6} Q 0 ${top + 7.6} ${w - 1.2} ${top + 5.6}`} stroke="#000" strokeWidth="0.9" opacity="0.18" fill="none" />
          <path d={`M ${-w + 1.6} ${top + 4.6} Q 0 ${top + 6.6} ${w - 1.6} ${top + 4.6}`} stroke={GLINT} strokeWidth="0.8" opacity="0.24" fill="none" />
          {/* the closed placket, buttons hidden under it (it's a rain seam) */}
          <path d={`M 0 ${top + 3} L 0 ${bot + 5.6}`} stroke="#000" strokeWidth="0.9" opacity="0.2" />
          {/* two patch pockets with flaps, low where hands actually go */}
          {[-1, 1].map((s) => (
            <g key={s}>
              <path
                d={`M ${s * (wa - 1.2) - 2} ${waistY + 3.4} L ${s * (wa - 1.2) + 2} ${waistY + 3.4} L ${s * (wa - 1.2) + 1.8} ${waistY + 5} L ${s * (wa - 1.2) - 1.8} ${waistY + 5} z`}
                fill="#000"
                opacity="0.16"
              />
              <path
                d={`M ${s * (wa - 1.2) - 2} ${waistY + 3.5} L ${s * (wa - 1.2) + 2} ${waistY + 3.5}`}
                stroke={GLINT}
                strokeWidth="0.6"
                opacity="0.2"
                strokeLinecap="round"
              />
            </g>
          ))}
        </>
      );
    },
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
        {/* Two pipe folds falling from the waist — hanging cloth gathers
            where it's suspended, and these are the only two folds the whole
            figure gets (chibi budget: folds at real gather points only,
            each distinct, never parallel repeats). Shadow WEDGES, not lines. */}
        {[-0.5, 0.58].map((f) => (
          <path
            key={f}
            d={`M ${f * wa} ${waistY + 0.5} L ${f * (hem + 3.5) - 0.9} ${bot + 7.2}
                L ${f * (hem + 3.5) + 0.9} ${bot + 7.2} z`}
            fill={SHADE}
            opacity="0.13"
          />
        ))}
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
    // The flare replaces the hem-on-trousers story outright.
    drape: true,
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
