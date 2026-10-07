// Hats — the first ACCESSORY registry, one entry per hat (same both-ways
// key contract with lib/profile.js's HATS as hair and garments).
//
// A hat is drawn INSIDE the head's gesture group, after the hair and its
// sheen, so it turns with a glance and rides a yawn — it is worn, not
// hovering. Fixed warm palettes per hat for now (a hat has its own colour
// the way shoes do); tinting can come later if anyone misses it.
//
// Each entry keeps one strong signature at a 7.3px skull. Most hats are
// symmetrical and reuse it in every view; direction-dependent pieces may add
// a `side` renderer. Three tones each, like every material in the catalog.
import { HEAD_R } from "../../lib/body";

export const HAT_REGISTRY = {
  none: {},
  beanie: {
    // The fold-up band hugging the skull IS the beanie. Keep the knit crown
    // inside the face width and slightly asymmetric; a full head-sized dome
    // made it read as a smooth helmet in the preset sheets.
    draw: ({ headY }) => (
      <>
        <path
          d={`M-7.4 ${headY - 2.1} Q-6.6 ${headY - 8.1} -1.2 ${headY - 9.2}
              Q4.5 ${headY - 10.1} 7 ${headY - 5.2} Q7.6 ${headY - 3.4} 7.4 ${headY - 2.1} Z`}
          fill="#c9a24b"
        />
        <path
          d={`M${-3.7} ${headY - 8.1} q3.9 -1.8 7.1 -0.4`}
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.12"
        />
        <rect x="-7.7" y={headY - 3} width="15.4" height="2.5" rx="1.25" fill="#c9a24b" />
        <rect x="-7.7" y={headY - 3} width="15.4" height="2.5" rx="1.25" fill="#000" opacity="0.14" />
      </>
    ),
  },
  cap: {
    // Front-on, the visor is a shallow centred curve. The old permanently
    // left-pointing bill made every front-facing preset look sideways.
    draw: ({ headY }) => (
      <>
        <path data-cap-bill="front"
          d={`M-9 ${headY - 1.2} Q0 ${headY + 0.3} 9 ${headY - 1.2}
              Q0 ${headY - 2.5} -9 ${headY - 1.2} Z`} fill="#4d5d8c" />
        <path d={`M-7.5 ${headY - 1.5} a7.5 7.8 0 0 1 15 0 z`} fill="#5b6b9b" />
        <path
          d={`M${-3.5} ${headY - 7.8} q3.7 -1.8 6.8 -0.3`}
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.12"
        />
        <path
          d={`M0 ${headY - 8.2} L0 ${headY - 1.5}`}
          stroke="#000"
          strokeWidth="0.7"
          opacity="0.1"
        />
        <circle cx="0" cy={headY - 8} r="0.75" fill="#4d5d8c" />
      </>
    ),
    side: ({ headY }) => (
      <>
        <ellipse data-cap-bill="side" cx="-9.2" cy={headY - 1.1} rx="4.4" ry="1.25" fill="#4d5d8c" />
        <path d={`M-7.3 ${headY - 1.4} a7.3 7.7 0 0 1 14.6 0 z`} fill="#5b6b9b" />
        <path d={`M0 ${headY - 8} L0 ${headY - 1.4}`} stroke="#000" strokeWidth="0.7" opacity="0.1" />
        <circle cx="0" cy={headY - 7.8} r="0.75" fill="#4d5d8c" />
      </>
    ),
  },
  bucket: {
    // A shallow crown and a brim sloping DOWN all the way round — the
    // downward flare is what separates it from the cap and the sun hat.
    draw: ({ headY }) => (
      <>
        <path
          d={`M-7.3 ${headY - 2.8} L-9.2 ${headY + 0.4} Q 0 ${headY + 1.8} 9.2 ${headY + 0.4}
              L7.3 ${headY - 2.8} z`}
          fill="#8a7a5c"
        />
        <path
          d={`M-9.2 ${headY + 0.4} Q 0 ${headY + 1.8} 9.2 ${headY + 0.4} Q 0 ${headY + 1.1} -9.2 ${headY + 0.4} z`}
          fill="#000"
          opacity="0.16"
        />
        <path d={`M-7.3 ${headY - 2.7} a7.3 6.3 0 0 1 14.6 0 z`} fill="#8a7a5c" />
        <path d={`M-7.3 ${headY - 2.7} a7.3 6.3 0 0 1 14.6 0 z`} fill="#fff" opacity="0.07" />
        <rect x="-7.3" y={headY - 3.5} width="14.6" height="1" rx="0.5" fill="#000" opacity="0.13" />
      </>
    ),
  },
  beret: {
    // A soft disc slumped to one side, with its little stalk — the tilt is
    // the hat; straight-on it's a pancake.
    draw: ({ headY }) => (
      <>
        <path
          d={`M-7.2 ${headY - 3} q-1.8 -5.1 3.2 -7 q6.5 -2 10.1 1.5 q2.1 2.6 0.3 4.7
              q-3.5 1.4 -7.2 1.1 q-4.1 -0.2 -6.8 -0.7 z`}
          fill="#a05555"
        />
        <path
          d={`M${-3.7} ${headY - 8.6} q3.8 -1.6 6.9 -0.2`}
          stroke="#fff"
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
          opacity="0.13"
        />
        <path
          d={`M-7.2 ${headY - 3} q6.9 1.6 13.9 -0.3 q-3.5 1.4 -7.2 1.1 q-4.1 -0.2 -6.8 -0.7 z`}
          fill="#000"
          opacity="0.15"
        />
        <circle cx="1.5" cy={headY - 10.3} r="0.8" fill="#7c3f3f" />
      </>
    ),
  },
  trapper: {
    // The ushanka: the one hat that changes the HEAD-TO-SHOULDER outline —
    // its ear flaps drop past the jaw, where every other hat stops at the
    // skull. Fleece edges on the flaps are what say trapper rather than
    // toque; the tie strings hang from the flap tips.
    draw: ({ headY }) => (
      <>
        {/* ear flaps first, falling from under the dome to chin level */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <path
              d={`M ${s * 8} ${headY - 1.8} Q ${s * 8.8} ${headY + 2.8} ${s * 6.9} ${headY + 5.5}
                  L ${s * 4.9} ${headY + 4.8} Q ${s * 5.3} ${headY + 0.8} ${s * 5.9} ${headY - 2.4} z`}
              fill="#8a5b40"
            />
            {/* the pale fleece lining along the flap's front edge */}
            <path
              d={`M ${s * 6.9} ${headY + 5.5} L ${s * 4.9} ${headY + 4.8} Q ${s * 5.2} ${headY + 3} ${s * 5.5} ${headY + 1.4}
                  Q ${s * 6.2} ${headY + 3.5} ${s * 6.9} ${headY + 5.5} z`}
              fill="#fff"
              opacity="0.32"
            />
            {/* tie string */}
            <path
              d={`M ${s * 5.9} ${headY + 5.2} L ${s * 5.5} ${headY + 7.8}`}
              stroke="#000"
              strokeWidth="0.7"
              opacity="0.3"
              strokeLinecap="round"
            />
          </g>
        ))}
        {/* the dome, low on the brow, with a fleece front band */}
        <path d={`M-7.9 ${headY - 1.8} a7.9 8.1 0 0 1 15.8 0 z`} fill="#8a5b40" />
        <path
          d={`M${-4} ${headY - 8.2} q4 -2 7.6 -0.4`}
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.13"
        />
        <rect x="-8" y={headY - 3} width="16" height="2.5" rx="1.25" fill="#e9dcc9" />
        <rect x="-8" y={headY - 1.8} width="16" height="1.3" rx="0.65" fill="#000" opacity="0.12" />
      </>
    ),
  },
  straw: {
    // The wide flat brim and the ribbon band; the crown stays shallow.
    draw: ({ headY }) => (
      <>
        <ellipse cx="0" cy={headY - 3.1} rx="11.4" ry="2.5" fill="#d8b87a" />
        <ellipse cx="0" cy={headY - 2.6} rx="11.4" ry="1.8" fill="#000" opacity="0.12" />
        <path d={`M-6.5 ${headY - 4.3} a6.5 5.2 0 0 1 13 0 z`} fill="#d8b87a" />
        <path d={`M-6.5 ${headY - 4.3} a6.5 5.2 0 0 1 13 0 z`} fill="#fff" opacity="0.08" />
        <rect x="-6.5" y={headY - 5.7} width="13" height="1.5" rx="0.4" fill="#8a5346" opacity="0.82" />
      </>
    ),
  },
  headphones: {
    // A close padded band and compact ear cups, drawn over (not instead of)
    // the hair. The former halo rose a full head above the crown and its cups
    // dropped to the jaw, so it read as earmuffs in standing/seated sheets.
    draw: ({ headY }) => (
      <>
        <path
          data-headphone-band="front"
          d={`M -8.1 ${headY + 0.8} Q -8.2 ${headY - 8.3} 0 ${headY - 9.3}
              Q 8.2 ${headY - 8.3} 8.1 ${headY + 0.8}`}
          fill="none"
          stroke="#2b2942"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d={`M -6.4 ${headY - 5.7} Q 0 ${headY - 9.8} 6.4 ${headY - 5.7}`}
          fill="none"
          stroke="#fff"
          strokeWidth="0.65"
          strokeLinecap="round"
          opacity="0.13"
        />
        {[-1, 1].map((side) => (
          <g key={side}>
            <rect
              data-headphone-cup={side < 0 ? "left" : "right"}
              x={side < 0 ? -9.1 : 6.5}
              y={headY - 0.7}
              width="2.6"
              height="5.2"
              rx="1.3"
              fill="#2b2942"
            />
            <rect
              x={side < 0 ? -8.35 : 7.05}
              y={headY + 0.15}
              width="1.55"
              height="3.35"
              rx="0.78"
              fill="#a88643"
            />
          </g>
        ))}
      </>
    ),
    side: ({ headY }) => (
      <>
        <path
          data-headphone-band="side"
          d={`M -5.8 ${headY - 0.2} Q -5.3 ${headY - 8.7} 1.1 ${headY - 9.2}
              Q 6.5 ${headY - 8.4} 6.8 ${headY + 0.6}`}
          fill="none"
          stroke="#2b2942"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect data-headphone-cup="side" x="1.8" y={headY - 0.7} width="3" height="5.2" rx="1.4" fill="#2b2942" />
        <rect x="2.45" y={headY + 0.15} width="1.7" height="3.35" rx="0.8" fill="#a88643" />
      </>
    ),
  },
};

/** The hat being worn, over the finished hair. */
export function Hat({ kind, headY, view = "front" }) {
  const entry = HAT_REGISTRY[kind];
  if (!entry) return null;
  const draw = entry[view] || entry.draw;
  return draw ? draw({ headY, R: HEAD_R }) : null;
}
