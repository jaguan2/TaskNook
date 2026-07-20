import { motion } from "framer-motion";

// SVG sprites for every placeable room item. Each is drawn around an ORIGIN at
// (0,0) — the point that touches its surface (base of a pot, centre of a wall
// frame) — so the scene can place it with a single translate. Items that were
// originally hand-placed in Cottage.jsx keep their exact artwork, wrapped in a
// translate that moves the old coordinates onto the origin; the "default"
// preset then reproduces the classic scene pixel-for-pixel.
//
// Every sprite receives `time` (the active TIME_PRESETS entry) so lamps and
// lights can dim with the sky.

/* ---------------- desk items ---------------- */

function DeskPlant() {
  return (
    <g transform="translate(-86,-302)">
      {/* The translate lives on a wrapper, NOT the animated path: the sway's
          CSS `transform` property overrides the SVG transform *attribute*, so
          putting both on one element silently drops the translate and the
          foliage falls 16px into the pot (measured, not theoretical). */}
      <g transform="translate(0,-16)">
        <path
          className="room-sway"
          d="M78 300 q-14 -40 -3 -68 q8 20 14 24 q-11 -27 1 -46 q6 27 13 32 q0 -22 9 -33 q3 32 -5 59 q-5 24 -18 32 z"
          fill="#3f7f63"
        />
      </g>
      <polygon points="70,282 104,282 100,305 74,305" fill="#c0563f" />
      <polygon points="70,282 104,282 102,287 72,287" fill="#a8412d" />
    </g>
  );
}

function Books() {
  return (
    <g transform="translate(-156,-300)">
      <rect x="128" y="286" width="58" height="14" rx="2" fill="#7faf8f" transform="rotate(-2 157 293)" />
      <rect x="132" y="274" width="54" height="13" rx="2" fill="#e8a3a8" transform="rotate(1.5 159 280)" />
      <rect x="126" y="262" width="56" height="13" rx="2" fill="#9b8bd6" transform="rotate(-1 154 268)" />
    </g>
  );
}

function Mug() {
  return (
    <g transform="translate(-394,-300)">
      <path d="M380 300 h30 v-20 h-30 z" fill="#d98a93" />
      <path d="M410 286 q10 -2 10 6 t-10 8" fill="none" stroke="#d98a93" strokeWidth="3" />
      <motion.path
        d="M388 276 q4 -10 0 -18 M398 276 q4 -10 0 -18"
        stroke="#f7e9e2"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        animate={{ opacity: [0, 0.6, 0], y: [0, -10, -16] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
      />
    </g>
  );
}

function PencilCup() {
  return (
    <g transform="translate(-438,-304)">
      <path d="M425 286 h26 l-3 26 h-20 z" fill="#cf8f93" transform="translate(0,-8)" />
      <line x1="431" y1="278" x2="427" y2="250" stroke="#e8b04b" strokeWidth="3" strokeLinecap="round" />
      <line x1="439" y1="278" x2="443" y2="244" stroke="#7faf8f" strokeWidth="3" strokeLinecap="round" />
      <line x1="445" y1="278" x2="450" y2="254" stroke="#9b8bd6" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Notebook() {
  return (
    <g transform="translate(-500,-306)">
      <polygon points="463,296 535,296 545,306 453,306" fill="#e7d9c9" />
      <polygon points="463,296 499,296 504,301 468,301" fill="#f7e9e2" opacity="0.7" />
      <polygon points="499,296 535,296 540,301 504,301" fill="#f7e9e2" opacity="0.5" />
      <line x1="499" y1="296" x2="504" y2="306" stroke="#c9b8a4" strokeWidth="1.5" />
    </g>
  );
}

function DeskLamp({ time }) {
  return (
    <g transform="translate(-566,-296)">
      {/* the warm pool the lamp throws on the desk travels with it */}
      <ellipse cx="530" cy="299" rx="78" ry="12" fill="url(#lampPool)" opacity={time.lampGlow} />
      <ellipse cx="566" cy="296" rx="18" ry="5" fill="#3a3142" />
      <line x1="566" y1="294" x2="552" y2="258" stroke="#3a3142" strokeWidth="4" strokeLinecap="round" />
      <line x1="552" y1="258" x2="528" y2="240" stroke="#3a3142" strokeWidth="4" strokeLinecap="round" />
      <circle cx="552" cy="258" r="3.5" fill="#2c2438" />
      <path d="M512 232 h32 l8 18 h-48 z" fill="#e8b04b" stroke="#c98f3a" />
      <circle cx="528" cy="252" r="4" fill="#ffe9b0" opacity={Math.max(0.4, time.lampGlow)} />
      <polygon
        className="animate-flicker"
        points="516,254 540,254 566,294 490,294"
        fill="url(#lampCone)"
        opacity={time.lampGlow * 0.55}
      />
    </g>
  );
}

function Cactus() {
  return (
    <g>
      <path d="M0 -14 q-7 0 -7 -9 q0 -8 7 -8 q7 0 7 8 q0 9 -7 9 z" fill="#56a07c" />
      <path d="M-6 -22 q-7 -1 -7 -8 q5 -1 8 3 z" fill="#56a07c" />
      <path d="M6 -24 q7 -2 7 -8 q-5 -1 -8 3 z" fill="#56a07c" />
      <path d="M-2 -26 v4 M2 -22 v3" stroke="#cbe6d3" strokeWidth="1" strokeLinecap="round" />
      <polygon points="-10,-14 10,-14 8,0 -8,0" fill="#d98a93" />
      <polygon points="-10,-14 10,-14 9,-10 -9,-10" fill="#c47882" />
    </g>
  );
}

function Headphones() {
  return (
    <g>
      <path d="M-16 -4 a16 14 0 0 1 32 0" fill="none" stroke="#3a3142" strokeWidth="4" strokeLinecap="round" />
      <rect x="-22" y="-8" width="9" height="12" rx="3" fill="#4a3a6b" stroke="#3a3142" />
      <rect x="13" y="-8" width="9" height="12" rx="3" fill="#4a3a6b" stroke="#3a3142" />
      <path d="M-18 4 q-4 4 -2 7 q10 5 20 0" fill="none" stroke="#2c2438" strokeWidth="1.5" opacity="0.6" />
    </g>
  );
}

/* ---------------- wall items ---------------- */

function Frame() {
  return (
    <g transform="translate(-496,-88)">
      <rect x="474" y="58" width="46" height="60" rx="4" style={{ fill: "rgb(var(--color-petal))" }} opacity="0.9" />
      <rect x="481" y="65" width="32" height="46" rx="2" fill="#7a5a6e" />
    </g>
  );
}

function HangPlant() {
  return (
    <g transform="translate(-544,-76)">
      <line x1="544" y1="50" x2="544" y2="70" stroke="#8a5346" strokeWidth="1.5" />
      <g className="room-sway-hanging">
        <ellipse cx="544" cy="76" rx="12" ry="7" fill="#c0563f" />
        <path
          d="M535 74 q3 22 -2 32 M544 78 q1 26 0 38 M553 74 q-2 22 3 30"
          stroke="#56a07c"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

function Clock() {
  return (
    <g transform="translate(-496,-158)">
      <circle cx="497" cy="158" r="17" fill="#f7e9e2" stroke="#8a5346" strokeWidth="3" />
      <line x1="497" y1="144" x2="497" y2="147" stroke="#8a5346" strokeWidth="1.5" />
      <line x1="497" y1="169" x2="497" y2="172" stroke="#8a5346" strokeWidth="1.5" />
      <line x1="483" y1="158" x2="486" y2="158" stroke="#8a5346" strokeWidth="1.5" />
      <line x1="508" y1="158" x2="511" y2="158" stroke="#8a5346" strokeWidth="1.5" />
      <line x1="497" y1="158" x2="497" y2="148" stroke="#4a2238" strokeWidth="2" strokeLinecap="round" />
      <line x1="497" y1="158" x2="504" y2="161" stroke="#4a2238" strokeWidth="2" strokeLinecap="round" />
      <circle cx="497" cy="158" r="1.5" fill="#4a2238" />
    </g>
  );
}

function Poster() {
  return (
    <g>
      <rect x="-21" y="-28" width="42" height="56" rx="3" fill="#f7e9e2" />
      <rect x="-17" y="-24" width="34" height="48" rx="2" fill="#3d2f52" />
      <circle cx="0" cy="-10" r="8" fill="#ffa958" />
      <path d="M-17 12 l10 -12 l7 8 l6 -7 l11 13 z" fill="#2a2038" />
      <path d="M-17 12 l10 -12 l7 8 l6 -7 l11 13" fill="none" stroke="#d9784f" strokeWidth="1.5" />
      <rect x="-12" y="16" width="24" height="3" rx="1.5" fill="#f3c6c0" opacity="0.7" />
    </g>
  );
}

function Polaroids() {
  return (
    <g>
      <line x1="-24" y1="-14" x2="24" y2="-14" stroke="#8a5346" strokeWidth="1.5" />
      {[-16, 2].map((x, i) => (
        <g key={i} transform={`rotate(${i === 0 ? -4 : 3} ${x + 8} 0)`}>
          <rect x={x} y="-12" width="17" height="20" rx="1" fill="#f7e9e2" />
          <rect x={x + 2} y="-10" width="13" height="12" fill={i === 0 ? "#7a5a6e" : "#5b6b9b"} />
          <rect x={x + 6} y="-15" width="5" height="4" fill="#e8b04b" opacity="0.8" />
        </g>
      ))}
    </g>
  );
}

function Shelf() {
  return (
    <g>
      <rect x="-34" y="0" width="68" height="6" rx="2" fill="#8a5346" />
      <rect x="-30" y="-16" width="10" height="16" rx="1" fill="#7faf8f" />
      <rect x="-18" y="-14" width="9" height="14" rx="1" fill="#e8a3a8" />
      <path d="M14 -8 q-5 0 -5 -6 q0 -5 5 -5 q5 0 5 5 q0 6 -5 6 z" fill="#56a07c" />
      <polygon points="8,-8 20,-8 19,0 9,0" fill="#c0563f" />
    </g>
  );
}

/* ---------------- floor items ---------------- */

function Rug() {
  return (
    <g transform="translate(-320,-440)">
      <ellipse cx="320" cy="440" rx="225" ry="24" style={{ fill: "rgb(var(--color-rose))" }} opacity="0.4" />
      <ellipse cx="320" cy="440" rx="200" ry="18" fill="none" style={{ stroke: "rgb(var(--color-petal))" }} strokeWidth="3" opacity="0.3" />
    </g>
  );
}

function RugStripe() {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="105" ry="19" style={{ fill: "rgb(var(--color-rose))" }} opacity="0.45" />
      <ellipse cx="0" cy="0" rx="82" ry="14" fill="none" style={{ stroke: "rgb(var(--color-petal))" }} strokeWidth="4" opacity="0.35" />
      <ellipse cx="0" cy="0" rx="55" ry="9" fill="none" style={{ stroke: "rgb(var(--color-blush))" }} strokeWidth="4" opacity="0.4" />
    </g>
  );
}

function Monstera() {
  return (
    <g>
      <g className="room-sway">
        <path d="M-4 -34 q-26 -10 -26 -40 q18 0 26 16 z" fill="#3f7f63" />
        <path d="M4 -34 q26 -12 24 -44 q-18 2 -26 20 z" fill="#56a07c" />
        <path d="M0 -30 q-4 -34 6 -58 q12 18 4 44 z" fill="#3f7f63" />
        <path d="M-2 -64 l8 -6 M-16 -52 l-8 -4 M16 -56 l8 -8" stroke="#2c5b46" strokeWidth="1.5" opacity="0.6" />
        <path d="M-3 -30 q1 -20 3 -34 M1 -30 q6 -14 14 -24" stroke="#2c5b46" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <polygon points="-18,-32 18,-32 14,0 -14,0" fill="#c0563f" />
      <polygon points="-18,-32 18,-32 17,-26 -17,-26" fill="#a8412d" />
    </g>
  );
}

function FloorLamp({ time }) {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="16" ry="4" fill="#3a3142" />
      <line x1="0" y1="-2" x2="0" y2="-96" stroke="#3a3142" strokeWidth="4" />
      <polygon points="-18,-96 18,-96 12,-122 -12,-122" fill="#e8b04b" stroke="#c98f3a" />
      <circle cx="0" cy="-92" r="5" fill="#ffe9b0" opacity={Math.max(0.35, time.lampGlow)} />
      <ellipse
        className="room-breathe"
        cx="0"
        cy="-84"
        rx="26"
        ry="14"
        fill="url(#lampPool)"
        opacity={time.lampGlow * 0.8}
      />
    </g>
  );
}

function Cat() {
  return (
    <g>
      <ellipse cx="0" cy="-8" rx="26" ry="13" fill="#3a3142" />
      <circle cx="-18" cy="-16" r="9" fill="#3a3142" />
      <polygon points="-25,-21 -22,-30 -17,-23" fill="#3a3142" />
      <polygon points="-13,-24 -9,-31 -6,-22" fill="#3a3142" />
      <path d="M24 -10 q12 -2 10 -14" fill="none" stroke="#3a3142" strokeWidth="5" strokeLinecap="round" />
      <path d="M-24 -15 q2 2 4 0 M-16 -15 q2 2 4 0" stroke="#1e1926" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <motion.g animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 4, repeat: Infinity }}>
        <path d="M6 -26 q2 -4 0 -7 M11 -24 q2 -4 0 -7" stroke="#f3c6c0" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
      </motion.g>
    </g>
  );
}

function Bookshelf() {
  return (
    <g>
      <rect x="-40" y="-100" width="80" height="100" rx="4" fill="#a87f5f" stroke="#8a5346" />
      <rect x="-33" y="-92" width="66" height="36" fill="#6e4435" />
      <rect x="-33" y="-48" width="66" height="38" fill="#6e4435" />
      {[[-31, -78, "#7faf8f"], [-21, -80, "#e8a3a8"], [-12, -76, "#9b8bd6"], [-2, -79, "#e8b04b"], [8, -77, "#cf8f93"]].map(([x, y, c], i) => (
        <rect key={`t-${i}`} x={x} y={y} width="8" height={-56 - y} rx="1" fill={c} />
      ))}
      <rect x="20" y="-64" width="12" height="8" rx="1" fill="#f7e9e2" opacity="0.85" />
      {[[-31, -34, "#e8b04b"], [-22, -38, "#7faf8f"], [-13, -33, "#d98a93"], [-3, -36, "#5b6b9b"]].map(([x, y, c], i) => (
        <rect key={`b-${i}`} x={x} y={y} width="8" height={-12 - y} rx="1" fill={c} />
      ))}
      <path d="M18 -20 q-4 0 -4 -5 q0 -4 4 -4 q4 0 4 4 q0 5 -4 5 z" fill="#56a07c" />
      <polygon points="13,-20 23,-20 22,-13 14,-13" fill="#c0563f" />
    </g>
  );
}

function Beanbag() {
  return (
    <g>
      <path
        d="M-38 0 q-4 -22 12 -28 q4 -8 26 -8 q22 0 26 8 q16 6 12 28 q-38 8 -76 0 z"
        style={{ fill: "rgb(var(--color-rose))" }}
        opacity="0.75"
      />
      <path d="M-24 -26 q24 -8 48 0" fill="none" style={{ stroke: "rgb(var(--color-petal))" }} strokeWidth="2" opacity="0.4" />
      <ellipse cx="-12" cy="-18" rx="10" ry="5" style={{ fill: "rgb(var(--color-petal))" }} opacity="0.25" />
    </g>
  );
}

/* ---------------- ceiling ---------------- */

const GARLAND_BULBS = [
  [77, 33], [138, 39], [198, 44], [259, 47], [320, 48],
  [381, 47], [442, 44], [502, 39], [563, 33],
];

function Garland({ time }) {
  // Fixed position: drawn in absolute scene coordinates (its placement x/y is
  // ignored — the swag is shaped to the room's full width).
  return (
    <g transform="translate(-320,-24)">
      <path d="M16 24 Q320 72 624 24" stroke="#2b2350" strokeWidth="2" fill="none" />
      {GARLAND_BULBS.map(([x, y], i) => (
        <g key={`bulb-${i}`}>
          <line x1={x} y1={y} x2={x} y2={y + 5} stroke="#2b2350" strokeWidth="1.5" />
          {/* Staggered so the string shimmers along its length rather than
              pulsing as one block. */}
          <g className="room-twinkle" style={{ animationDelay: `${(i % 5) * 0.8}s` }}>
            <circle cx={x} cy={y + 8} r="7" fill="#ffe9b0" opacity={time.bulbGlow * 0.22} />
            <circle cx={x} cy={y + 8} r="3.5" fill="#ffe9b0" opacity={time.bulbGlow} />
          </g>
        </g>
      ))}
    </g>
  );
}

export const ITEM_SPRITES = {
  deskplant: DeskPlant,
  books: Books,
  mug: Mug,
  pencilcup: PencilCup,
  notebook: Notebook,
  desklamp: DeskLamp,
  cactus: Cactus,
  headphones: Headphones,
  frame: Frame,
  hangplant: HangPlant,
  clock: Clock,
  poster: Poster,
  polaroids: Polaroids,
  shelf: Shelf,
  rug: Rug,
  rugstripe: RugStripe,
  monstera: Monstera,
  floorlamp: FloorLamp,
  cat: Cat,
  bookshelf: Bookshelf,
  beanbag: Beanbag,
  garland: Garland,
};
