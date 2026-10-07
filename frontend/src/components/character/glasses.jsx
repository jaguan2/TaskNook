// Glasses — the third ACCESSORY slot (hats, scarves, and now the face).
//
// Why glasses earn a slot: they sit at the one spot every facing keeps in
// frame — the FACE — so one entry reads front-on and in profile, under every
// hat and over every hairstyle. Like hats they carry NO colour of their own:
// at roughly 1px of frame a sixth hex channel buys nothing visible, while a
// fixed dark neutral makes them read as designed.
//
// Drawn ON THE FACE: after the hairline (HairFront) and the hat, inside the
// head's gesture group — they must turn with a glance and ride a yawn, and a
// fringe must not bury them. Lenses are a faint white wash so they read as
// glass rather than goggles. Keep ONLY the lens rims: bridge and temple
// strokes turn into stray lines across a face at resident scale. The back
// view draws nothing.

const FRAME = "#51465b";
const LENS = "#fff";
const LENS_OP = 0.06;

export const GLASSES_REGISTRY = {
  none: {},
  round: {
    // Two clean rings over the front eyes. Their shared spacing is enough to
    // read as a pair without drawing a dark bar over the nose and cheeks.
    front: ({ headY }) => (
      <>
        {[-2.45, 2.45].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy={headY + 2}
            r="1.75"
            fill={LENS}
            fillOpacity={LENS_OP}
            stroke={FRAME}
            strokeWidth="0.5"
          />
        ))}
      </>
    ),
    side: ({ headY }) => (
      <circle
        cx="-3.2"
        cy={headY + 1.9}
        r="1.72"
        fill={LENS}
        fillOpacity={LENS_OP}
        stroke={FRAME}
        strokeWidth="0.5"
      />
    ),
  },
  square: {
    // Rounded rectangles alone remain visibly distinct from the round pair.
    front: ({ headY }) => (
      <>
        {[-4.65, 0.65].map((x) => (
          <rect
            key={x}
            x={x}
            y={headY + 0.35}
            width="4"
            height="3"
            rx="0.7"
            fill={LENS}
            fillOpacity={LENS_OP}
            stroke={FRAME}
            strokeWidth="0.55"
          />
        ))}
      </>
    ),
    side: ({ headY }) => (
      <rect
        x="-5.25"
        y={headY + 0.35}
        width="3.8"
        height="3"
        rx="0.6"
        fill={LENS}
        fillOpacity={LENS_OP}
        stroke={FRAME}
        strokeWidth="0.55"
      />
    ),
  },
  halfmoon: {
    // Small circular readers sit low on the nose. The old open arcs looked
    // like a moustache once bridges and temple strokes were removed; closed
    // rims keep the lightweight reading-glasses idea without face-lines.
    front: ({ headY }) => (
      <>
        {[-2.9, 2.9].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy={headY + 2.75}
            r="1.75"
            fill={LENS}
            fillOpacity={LENS_OP}
            stroke={FRAME}
            strokeWidth="0.5"
          />
        ))}
      </>
    ),
    side: ({ headY }) => (
      <circle
        cx="-3.7"
        cy={headY + 2.65}
        r="1.7"
        fill={LENS}
        fillOpacity={LENS_OP}
        stroke={FRAME}
        strokeWidth="0.5"
      />
    ),
  },
};

/** The glasses being worn — on the finished face, after fringe and hat. */
export function Glasses({ kind, headY, view = "front" }) {
  const entry = GLASSES_REGISTRY[kind];
  if (!entry) return null;
  const fn = view === "side" ? entry.side : view === "front" ? entry.front : null;
  return fn ? fn({ headY }) : null;
}
