// Glasses — the third ACCESSORY slot (hats, scarves, and now the face).
//
// Why glasses earn a slot: they sit at the one spot every facing keeps in
// frame — the FACE — so one entry reads front-on and in profile, under every
// hat and over every hairstyle. Like hats they carry NO colour of their own,
// and more deliberately so: at ~1px of frame a sixth hex channel buys nothing
// you can see, and a fixed dark neutral is what makes them read as designed —
// the same argument that keeps shoe soles a fixed rubber tone (a fixed
// anchor, not a missing feature).
//
// Drawn ON THE FACE: after the hairline (HairFront) and the hat, inside the
// head's gesture group — they must turn with a glance and ride a yawn, and a
// fringe must not bury them. Lenses are a faint #fff wash so they read as
// GLASS rather than as goggles; frames are thin strokes of the neutral.
// Front-view signatures per the 7.3px-skull rule: round = two full rings;
// square = rects with the straight bar bridge; halfmoon = readers low on the
// nose, top rim OPEN so the eyes look over it. The back view draws NOTHING —
// glasses from behind are temple tips at most, which at this size is noise.

// The fixed frame neutral — the shoes' "ink", deliberately NOT the face's
// INK line colour: the frames are an object WORN on the face, and a whisker
// of separation from the eyes' own stroke is what keeps the rings from
// reading as more face. Fixed like STITCH and BRASS.
const FRAME = "#2b2350";
// Glass is a wash, not a colour — low-alpha white over whatever's behind.
const LENS = "#fff";
const LENS_OP = 0.16;

const frameStroke = { fill: "none", stroke: FRAME, strokeLinecap: "round" };

export const GLASSES_REGISTRY = {
  none: {},
  round: {
    // Two full rings on the eyes (front eyes sit at ±2.9, headY+2) with a
    // curved bridge — the classic. Temple hints run under the rings out to
    // the skull's edge, so the frame reads as anchored to the ears rather
    // than floating on the cheeks.
    front: ({ headY }) => (
      <>
        <path d={`M -6.9 ${headY + 1.1} L -5 ${headY + 1.7}`} {...frameStroke} strokeWidth="0.7" />
        <path d={`M 6.9 ${headY + 1.1} L 5 ${headY + 1.7}`} {...frameStroke} strokeWidth="0.7" />
        {[-2.9, 2.9].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy={headY + 2}
            r="2.3"
            fill={LENS}
            fillOpacity={LENS_OP}
            stroke={FRAME}
            strokeWidth="0.8"
          />
        ))}
        <path d={`M -0.7 ${headY + 1.3} q 0.7 -0.8 1.4 0`} {...frameStroke} strokeWidth="0.8" />
      </>
    ),
    // Profile: ONE lens over the one visible eye (-3.5, headY+1.9), and the
    // temple arm running back to the ear with a short down-hook — the arm is
    // what says "glasses" side-on, the way the nose says "profile".
    side: ({ headY }) => (
      <>
        <path d={`M -1.5 ${headY + 1.4} L 5.2 ${headY + 0.8} l 0.4 1.1`} {...frameStroke} strokeWidth="0.7" />
        <circle
          cx="-3.6"
          cy={headY + 1.9}
          r="2.2"
          fill={LENS}
          fillOpacity={LENS_OP}
          stroke={FRAME}
          strokeWidth="0.8"
        />
      </>
    ),
  },
  square: {
    // Rounded rects and a STRAIGHT bar bridge — the bar is the one mark that
    // separates square frames from round at this size, so it stays level
    // while the round pair's bridge arches.
    front: ({ headY }) => (
      <>
        <path d={`M -6.9 ${headY + 1.1} L -5.1 ${headY + 1.7}`} {...frameStroke} strokeWidth="0.7" />
        <path d={`M 6.9 ${headY + 1.1} L 5.1 ${headY + 1.7}`} {...frameStroke} strokeWidth="0.7" />
        {[-5.1, 0.7].map((x) => (
          <rect
            key={x}
            x={x}
            y={headY + 0.35}
            width="4.4"
            height="3.3"
            rx="0.7"
            fill={LENS}
            fillOpacity={LENS_OP}
            stroke={FRAME}
            strokeWidth="0.8"
          />
        ))}
        <path d={`M -0.7 ${headY + 1.5} L 0.7 ${headY + 1.5}`} {...frameStroke} strokeWidth="0.8" />
      </>
    ),
    side: ({ headY }) => (
      <>
        <path d={`M -1.6 ${headY + 1.4} L 5.2 ${headY + 0.8} l 0.4 1.1`} {...frameStroke} strokeWidth="0.7" />
        <rect
          x="-5.7"
          y={headY + 0.35}
          width="4.1"
          height="3.2"
          rx="0.6"
          fill={LENS}
          fillOpacity={LENS_OP}
          stroke={FRAME}
          strokeWidth="0.8"
        />
      </>
    ),
  },
  halfmoon: {
    // Reading glasses: half-disc lenses LOW on the nose — flat top at
    // headY+3.1, a full pupil-height under the eyes at +2, so the character
    // permanently looks OVER them. The top rim is OPEN (the fill's flat edge
    // carries no stroke); the temples slant UP from the lens tips to the
    // ears, which is what half-moons actually do on a face.
    front: ({ headY }) => (
      <>
        <path d={`M -4.8 ${headY + 3} L -6.9 ${headY + 1.6}`} {...frameStroke} strokeWidth="0.7" />
        <path d={`M 4.8 ${headY + 3} L 6.9 ${headY + 1.6}`} {...frameStroke} strokeWidth="0.7" />
        {[-2.9, 2.9].map((cx) => (
          <g key={cx}>
            <path
              d={`M ${cx - 1.9} ${headY + 3.1} A 1.9 1.9 0 0 0 ${cx + 1.9} ${headY + 3.1} Z`}
              fill={LENS}
              fillOpacity={LENS_OP}
            />
            <path
              d={`M ${cx - 1.9} ${headY + 3.1} A 1.9 1.9 0 0 0 ${cx + 1.9} ${headY + 3.1}`}
              {...frameStroke}
              strokeWidth="0.7"
            />
          </g>
        ))}
        <path d={`M -1 ${headY + 3.1} L 1 ${headY + 3.1}`} {...frameStroke} strokeWidth="0.7" />
      </>
    ),
    side: ({ headY }) => (
      <>
        <path d={`M -2.1 ${headY + 3} L 5.2 ${headY + 1.1} l 0.4 1.1`} {...frameStroke} strokeWidth="0.7" />
        <path
          d={`M -5.7 ${headY + 3.1} A 1.8 1.8 0 0 0 -2.1 ${headY + 3.1} Z`}
          fill={LENS}
          fillOpacity={LENS_OP}
        />
        <path
          d={`M -5.7 ${headY + 3.1} A 1.8 1.8 0 0 0 -2.1 ${headY + 3.1}`}
          {...frameStroke}
          strokeWidth="0.7"
        />
      </>
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
