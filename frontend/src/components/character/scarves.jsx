// Scarves — the second ACCESSORY slot (the HATS pattern, at the neck).
//
// Why a scarf earns a whole slot in this app: it sits at the neck, so it
// reads in every facing and composes with every top, coat and hat — one slot
// that multiplies against the entire wardrobe, and the coziest garment
// category there is. Unlike hats it carries its OWN colour (`scarfColor`):
// the scarf is the accent-colour accessory, the same argument that got shoes
// `shoeColor`.
//
// A scarf is TORSO-anchored: it draws after the body's neck and collar (the
// turtleneck's proven insertion point — the one place the torso pass can't
// reach) and must NOT live in the head's gesture group, where riding a
// glance would shear it off the shoulders. Marks per the §10 doctrine:
// translucent neutrals only over the scarf colour, a GLINT top edge on the
// roll, a #000 tuck-shadow where cloth crosses cloth, fringe as short ticks.
import { GLINT } from "./body";

export const SCARF_REGISTRY = {
  none: {},
  wrapped: {
    // A fat band swallowing the neck — bulkier than the turtleneck's roll,
    // with the tucked end's fringe peeking at one side.
    draw: ({ torsoY, color }) => (
      <>
        <rect x="-4.9" y={torsoY - 1.4} width="9.8" height="4" rx="2" fill={color} />
        <rect x="-4.9" y={torsoY - 1.4} width="9.8" height="1.4" rx="0.7" fill={GLINT} opacity="0.18" />
        {/* the wrap's crossing line, and the tucked end below it */}
        <path d={`M ${-3.4} ${torsoY + 0.6} Q 0 ${torsoY + 1.8} ${3.6} ${torsoY + 0.4}`} stroke="#000" strokeWidth="0.8" fill="none" opacity="0.18" strokeLinecap="round" />
        <path d={`M ${2.2} ${torsoY + 2.4} L ${3.4} ${torsoY + 5.6} L ${1} ${torsoY + 5.9} L ${0.6} ${torsoY + 2.6} z`} fill={color} />
        <path d={`M ${2.2} ${torsoY + 2.4} L ${3.4} ${torsoY + 5.6} L ${1} ${torsoY + 5.9} L ${0.6} ${torsoY + 2.6} z`} fill="#000" opacity="0.1" />
        {[1.5, 2.3, 3.1].map((x) => (
          <path key={x} d={`M ${x} ${torsoY + 5.8} L ${x - 0.2} ${torsoY + 7}`} stroke={color} strokeWidth="0.7" strokeLinecap="round" />
        ))}
      </>
    ),
    back: ({ torsoY, color }) => (
      <rect x="-4.7" y={torsoY - 1.2} width="9.4" height="3.6" rx="1.8" fill={color} />
    ),
    side: ({ torsoY, color }) => (
      <>
        <rect x="-4" y={torsoY - 1.4} width="8" height="4" rx="2" fill={color} />
        <rect x="-4" y={torsoY - 1.4} width="8" height="1.4" rx="0.7" fill={GLINT} opacity="0.18" />
      </>
    ),
  },
  loop: {
    // The infinity scarf: one thick drape hanging in a low U onto the chest.
    draw: ({ torsoY, color }) => (
      <>
        <rect x="-4.6" y={torsoY - 1} width="9.2" height="3" rx="1.5" fill={color} />
        <path
          d={`M ${-3.9} ${torsoY + 1.2} Q 0 ${torsoY + 8.6} ${3.9} ${torsoY + 1.2}`}
          stroke={color}
          strokeWidth="3.4"
          fill="none"
          strokeLinecap="round"
        />
        {/* the U's underside falls away from the light */}
        <path
          d={`M ${-3.6} ${torsoY + 1.8} Q 0 ${torsoY + 8.8} ${3.6} ${torsoY + 1.8}`}
          stroke="#000"
          strokeWidth="1.1"
          fill="none"
          opacity="0.14"
          strokeLinecap="round"
        />
        <rect x="-4.6" y={torsoY - 1} width="9.2" height="1.1" rx="0.55" fill={GLINT} opacity="0.16" />
      </>
    ),
    back: ({ torsoY, color }) => (
      <rect x="-4.5" y={torsoY - 0.8} width="9" height="2.8" rx="1.4" fill={color} />
    ),
    side: ({ torsoY, color }) => (
      <>
        <rect x="-3.9" y={torsoY - 1} width="7.8" height="3" rx="1.5" fill={color} />
        {/* the U edge-on: a short drape at the chest's front line */}
        <path d={`M ${-3.2} ${torsoY + 1.4} q -1.4 3.4 0.4 5.4`} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M ${-3.2} ${torsoY + 1.8} q -1 2.8 0.2 4.6`} stroke="#000" strokeWidth="0.9" fill="none" opacity="0.14" strokeLinecap="round" />
      </>
    ),
  },
  long: {
    // The band plus two tails to mid-torso — a vertical two-tone stripe over
    // any top, the strongest of the three. Tails deliberately asymmetric.
    draw: ({ torsoY, color }) => (
      <>
        <rect x="-4.7" y={torsoY - 1.2} width="9.4" height="3.2" rx="1.6" fill={color} />
        <rect x="-4.7" y={torsoY - 1.2} width="9.4" height="1.2" rx="0.6" fill={GLINT} opacity="0.18" />
        {/* two hanging tails, the near one longer */}
        <rect x="-3" y={torsoY + 1.4} width="2.4" height="10.4" rx="0.9" fill={color} />
        <rect x="0.8" y={torsoY + 1.4} width="2.2" height="8" rx="0.9" fill={color} />
        <rect x="0.8" y={torsoY + 1.4} width="2.2" height="8" rx="0.9" fill="#000" opacity="0.1" />
        {/* the tuck shadow where the tails leave the band */}
        <path d={`M ${-3} ${torsoY + 1.9} L ${3} ${torsoY + 1.9}`} stroke="#000" strokeWidth="0.9" opacity="0.16" strokeLinecap="round" />
        {/* fringe */}
        {[-2.6, -1.9, -1.2].map((x) => (
          <path key={x} d={`M ${x} ${torsoY + 11.7} L ${x} ${torsoY + 13}`} stroke={color} strokeWidth="0.7" strokeLinecap="round" />
        ))}
        {[1.2, 1.9, 2.6].map((x) => (
          <path key={x} d={`M ${x} ${torsoY + 9.3} L ${x} ${torsoY + 10.6}`} stroke={color} strokeWidth="0.7" strokeLinecap="round" />
        ))}
      </>
    ),
    back: ({ torsoY, color }) => (
      <rect x="-4.5" y={torsoY - 1} width="9" height="3" rx="1.5" fill={color} />
    ),
    side: ({ torsoY, color }) => (
      <>
        <rect x="-3.9" y={torsoY - 1.2} width="7.8" height="3.2" rx="1.6" fill={color} />
        <rect x="-3.9" y={torsoY - 1.2} width="7.8" height="1.2" rx="0.6" fill={GLINT} opacity="0.18" />
        {/* the near tail hangs at the front line */}
        <rect x="-3.6" y={torsoY + 1.4} width="2.3" height="9.6" rx="0.9" fill={color} />
        {[-3.2, -2.5, -1.8].map((x) => (
          <path key={x} d={`M ${x} ${torsoY + 10.9} L ${x} ${torsoY + 12.1}`} stroke={color} strokeWidth="0.7" strokeLinecap="round" />
        ))}
      </>
    ),
  },
};

/** The scarf being worn — after the neck and collar, in its own colour. */
export function Scarf({ kind, torsoY, color, view = "front" }) {
  const entry = SCARF_REGISTRY[kind];
  if (!entry?.draw) return null;
  const fn = view === "back" ? entry.back ?? entry.draw : view === "side" ? entry.side ?? null : entry.draw;
  return fn ? fn({ torsoY, color }) : null;
}
