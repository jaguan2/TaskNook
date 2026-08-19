// Hats — the first ACCESSORY registry, one entry per hat (same both-ways
// key contract with lib/profile.js's HATS as hair and garments).
//
// A hat is drawn INSIDE the head's gesture group, after the hair and its
// sheen, so it turns with a glance and rides a yawn — it is worn, not
// hovering. Fixed warm palettes per hat for now (a hat has its own colour
// the way shoes do); tinting can come later if anyone misses it.
//
// Front-view signatures only — the single thing that makes each hat read at
// a 7.3px skull. Three tones each, like every material in the catalog.
import { HEAD_R } from "../../lib/body";

export const HAT_REGISTRY = {
  none: {},
  beanie: {
    // The fold-up band hugging the skull IS the beanie; the dome above it
    // stays soft and slightly slouched.
    draw: ({ headY }) => (
      <>
        <path
          d={`M-8.2 ${headY - 1} a8.2 8.8 0 0 1 16.4 0 z`}
          fill="#c9a24b"
        />
        <path
          d={`M${-4.4} ${headY - 8.9} q4.4 -2.6 8.4 -0.6`}
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.14"
        />
        <rect x="-8.5" y={headY - 2.2} width="17" height="3.1" rx="1.5" fill="#c9a24b" />
        <rect x="-8.5" y={headY - 2.2} width="17" height="3.1" rx="1.5" fill="#000" opacity="0.14" />
      </>
    ),
  },
  cap: {
    // The bill jutting past the face is the whole hat. Sprites face left, so
    // the bill does too; the dome sits low on the brow.
    draw: ({ headY }) => (
      <>
        <ellipse cx="-10.2" cy={headY - 0.4} rx="5.6" ry="1.8" fill="#4d5d8c" />
        <ellipse cx="-10.2" cy={headY + 0.2} rx="5.6" ry="1.2" fill="#000" opacity="0.2" />
        <path d={`M-8.1 ${headY - 0.6} a8.1 8.4 0 0 1 16.2 0 z`} fill="#5b6b9b" />
        <path
          d={`M${-3.8} ${headY - 8.2} q4 -2.2 7.6 -0.4`}
          stroke="#fff"
          strokeWidth="1.7"
          strokeLinecap="round"
          fill="none"
          opacity="0.13"
        />
        <path
          d={`M0 ${headY - 8.8} L0 ${headY - 0.8}`}
          stroke="#000"
          strokeWidth="0.8"
          opacity="0.12"
        />
        <circle cx="0" cy={headY - 8.6} r="1" fill="#4d5d8c" />
      </>
    ),
  },
  bucket: {
    // A shallow crown and a brim sloping DOWN all the way round — the
    // downward flare is what separates it from the cap and the sun hat.
    draw: ({ headY }) => (
      <>
        <path
          d={`M-7.9 ${headY - 2.6} L-10.2 ${headY + 0.9} Q 0 ${headY + 2.6} 10.2 ${headY + 0.9}
              L7.9 ${headY - 2.6} z`}
          fill="#8a7a5c"
        />
        <path
          d={`M-10.2 ${headY + 0.9} Q 0 ${headY + 2.6} 10.2 ${headY + 0.9} Q 0 ${headY + 1.6} -10.2 ${headY + 0.9} z`}
          fill="#000"
          opacity="0.16"
        />
        <path d={`M-7.9 ${headY - 2.4} a7.9 6.6 0 0 1 15.8 0 z`} fill="#8a7a5c" />
        <path d={`M-7.9 ${headY - 2.4} a7.9 6.6 0 0 1 15.8 0 z`} fill="#fff" opacity="0.07" />
        <rect x="-7.9" y={headY - 3.4} width="15.8" height="1.1" fill="#000" opacity="0.13" />
      </>
    ),
  },
  beret: {
    // A soft disc slumped to one side, with its little stalk — the tilt is
    // the hat; straight-on it's a pancake.
    draw: ({ headY }) => (
      <>
        <path
          d={`M-7.6 ${headY - 3} q-2.6 -6.4 3.4 -8.6 q7.6 -2.6 11.6 2 q2.6 3.4 0.4 6.2
              q-4 1.6 -8 1.2 q-4.6 -0.2 -7.4 -0.8 z`}
          fill="#a05555"
        />
        <path
          d={`M${-4.2} ${headY - 9.4} q4.4 -2.4 8 -0.2`}
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.13"
        />
        <path
          d={`M-7.6 ${headY - 3} q7.4 1.9 15.4 -0.4 q-4 1.6 -8 1.2 q-4.6 -0.2 -7.4 -0.8 z`}
          fill="#000"
          opacity="0.15"
        />
        <circle cx="1.8" cy={headY - 11.6} r="1.1" fill="#7c3f3f" />
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
              d={`M ${s * 8.6} ${headY - 1.6} Q ${s * 9.6} ${headY + 3.4} ${s * 7.4} ${headY + 6.2}
                  L ${s * 4.9} ${headY + 5.4} Q ${s * 5.4} ${headY + 1} ${s * 6.2} ${headY - 2.2} z`}
              fill="#8a5b40"
            />
            {/* the pale fleece lining along the flap's front edge */}
            <path
              d={`M ${s * 7.4} ${headY + 6.2} L ${s * 4.9} ${headY + 5.4} Q ${s * 5.2} ${headY + 3.4} ${s * 5.6} ${headY + 1.6}
                  Q ${s * 6.6} ${headY + 3.8} ${s * 7.4} ${headY + 6.2} z`}
              fill="#fff"
              opacity="0.32"
            />
            {/* tie string */}
            <path
              d={`M ${s * 6.2} ${headY + 6} L ${s * 5.6} ${headY + 9}`}
              stroke="#000"
              strokeWidth="0.7"
              opacity="0.3"
              strokeLinecap="round"
            />
          </g>
        ))}
        {/* the dome, low on the brow, with a fleece front band */}
        <path d={`M-8.4 ${headY - 1.2} a8.4 8.8 0 0 1 16.8 0 z`} fill="#8a5b40" />
        <path
          d={`M${-4.4} ${headY - 8.9} q4.4 -2.6 8.4 -0.6`}
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.13"
        />
        <rect x="-8.6" y={headY - 2.6} width="17.2" height="3" rx="1.5" fill="#e9dcc9" />
        <rect x="-8.6" y={headY - 1.2} width="17.2" height="1.6" rx="0.8" fill="#000" opacity="0.12" />
      </>
    ),
  },
  straw: {
    // The wide flat brim and the ribbon band; the crown stays shallow.
    draw: ({ headY }) => (
      <>
        <ellipse cx="0" cy={headY - 3} rx="13.4" ry="3" fill="#d8b87a" />
        <ellipse cx="0" cy={headY - 2.4} rx="13.4" ry="2.2" fill="#000" opacity="0.12" />
        <path d={`M-6.9 ${headY - 4.4} a6.9 5.6 0 0 1 13.8 0 z`} fill="#d8b87a" />
        <path d={`M-6.9 ${headY - 4.4} a6.9 5.6 0 0 1 13.8 0 z`} fill="#fff" opacity="0.08" />
        <rect x="-6.9" y={headY - 6} width="13.8" height="1.7" fill="#8a5346" opacity="0.85" />
      </>
    ),
  },
};

/** The hat being worn, over the finished hair. */
export function Hat({ kind, headY }) {
  const entry = HAT_REGISTRY[kind];
  if (!entry?.draw) return null;
  return entry.draw({ headY, R: HEAD_R });
}
