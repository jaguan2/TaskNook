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
// glass rather than goggles. Keep the lens rims and ONE short bridge centred
// over the nose; temple strokes still turn into stray face lines at resident
// scale. The back view draws nothing.

const FRAME = "#51465b";
const LENS = "#fff";
const LENS_OP = 0.06;

function Bridge({ headY, y, halfSpan, lift = 0.5 }) {
  const baseline = headY + y;
  return (
    <path
      data-glasses-bridge
      d={`M ${-halfSpan} ${baseline} Q 0 ${baseline - lift} ${halfSpan} ${baseline}`}
      fill="none"
      stroke={FRAME}
      strokeWidth="0.48"
      strokeLinecap="round"
    />
  );
}

export const GLASSES_REGISTRY = {
  none: {},
  round: {
    // Two clean rings over the front eyes joined only across the nose.
    front: ({ headY, eyeX, eyeY }) => (
      <>
        {[-eyeX, eyeX].map((cx) => (
          <circle
            key={cx}
            data-glasses-lens
            cx={cx}
            cy={headY + eyeY}
            r="1.75"
            fill={LENS}
            fillOpacity={LENS_OP}
            stroke={FRAME}
            strokeWidth="0.5"
          />
        ))}
        <Bridge headY={headY} y={eyeY - 0.35} halfSpan={Math.max(0.7, eyeX - 1.75)} />
      </>
    ),
    side: ({ headY, eyeY }) => (
      <circle
        data-glasses-lens
        cx="-3.2"
        cy={headY + eyeY}
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
    front: ({ headY, eyeX, eyeY }) => (
      <>
        {[-eyeX, eyeX].map((cx) => (
          <rect
            key={cx}
            data-glasses-lens
            x={cx - 2}
            y={headY + eyeY - 1.65}
            width="4"
            height="3"
            rx="0.7"
            fill={LENS}
            fillOpacity={LENS_OP}
            stroke={FRAME}
            strokeWidth="0.55"
          />
        ))}
        <Bridge headY={headY} y={eyeY - 0.35} halfSpan={Math.max(0.7, eyeX - 2)} />
      </>
    ),
    side: ({ headY, eyeY }) => (
      <rect
        data-glasses-lens
        x="-5.25"
        y={headY + eyeY - 1.65}
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
    // Small circular readers sit low on the nose. Closed rims and a shallow
    // centre bridge keep the lightweight reading-glasses idea without the
    // old open arcs resembling a moustache.
    front: ({ headY, eyeX, eyeY }) => (
      <>
        {[-eyeX, eyeX].map((cx) => (
          <circle
            key={cx}
            data-glasses-lens
            cx={cx}
            cy={headY + eyeY + 0.75}
            r="1.75"
            fill={LENS}
            fillOpacity={LENS_OP}
            stroke={FRAME}
            strokeWidth="0.5"
          />
        ))}
        <Bridge headY={headY} y={eyeY + 0.35} halfSpan={Math.max(0.7, eyeX - 1.75)} lift={0.45} />
      </>
    ),
    side: ({ headY, eyeY }) => (
      <circle
        data-glasses-lens
        cx="-3.7"
        cy={headY + eyeY + 0.65}
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
export function Glasses({ kind, headY, view = "front", eyeX = 3.3, eyeY = 2 }) {
  const entry = GLASSES_REGISTRY[kind];
  if (!entry) return null;
  const fn = view === "side" ? entry.side : view === "front" ? entry.front : null;
  return fn ? fn({ headY, eyeX, eyeY }) : null;
}
