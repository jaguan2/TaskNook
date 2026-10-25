import { SKEW, floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { TintedBox } from "./IsoItemPrimitives";
import { EvergreenCrown } from "./IsoTreePrimitives";

// Same five rules as the autumn set above. The season's whole read is one
// colour — a near-white that has to stay legible against a light floor, so every
// snow mass carries a cool shadow tone underneath rather than relying on the
// background to define its edge.

const SNOW = "#eef4f8";
const SNOW_SHADE = "#b9cbd8";

const SNOW_LOADS = Object.freeze([
  Object.freeze({ left: 0.58, right: 0.34 }),
  Object.freeze({ left: 0.34, right: 0.62 }),
  Object.freeze({ left: 0.68, right: 0.42 }),
  Object.freeze({ left: 0.4, right: 0.68 }),
  Object.freeze({ left: 0.56, right: 0.38 }),
]);

function SnowShelves({ center: c, tier, load }) {
  const baseY = c.y - tier.y;
  const shelves = [
    {
      x: c.x - tier.left * 0.38,
      y: baseY - tier.lift * 0.34,
      width: tier.left * (0.34 + load.left * 0.34),
    },
    {
      x: c.x + tier.right * 0.4,
      y: baseY - tier.lift * 0.3,
      width: tier.right * (0.34 + load.right * 0.34),
    },
  ];
  return (
    <>{shelves.map(({ x, y, width }, index) => (
      <g key={index}>
        <path d={`M${x - width / 2} ${y}
          Q${x - width * 0.16} ${y - 6} ${x + width / 2} ${y - 1}
          Q${x + width * 0.2} ${y + 4} ${x - width / 2} ${y} Z`}
          fill={SNOW} />
        <path d={`M${x - width / 2} ${y}
          Q${x + width * 0.12} ${y + 4} ${x + width / 2} ${y - 1}`}
          fill="none" stroke={SNOW_SHADE} strokeWidth="1.8" opacity="0.5" />
      </g>
    ))}</>
  );
}

export function SnowPine() {
  const c = project(0.65, 0.65);
  return (
    <g data-tree="snow-pine">
      <path
        d={`M${c.x - 4} ${c.y} L${c.x - 2.6} ${c.y - 26} L${c.x + 2.6} ${c.y - 26} L${c.x + 4} ${c.y} Z`}
        fill="#6b4a39"
      />
      <EvergreenCrown center={c}
        rearPalette={["#365f4b", "#2f5845"]}
        frontPalette={["#3f6b52", "#365f4b"]}
        renderTierDetail={(tier, index) => (
          <SnowShelves center={c} tier={tier} load={SNOW_LOADS[index]} />
        )} />
    </g>
  );
}

export function Snowman() {
  // Three balls, decreasing — the silhouette alone names it, which is rule 1.
  // Everything else (nose, coal, scarf) is one large shape each, per rule 4.
  const c = project(0.4, 0.4);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="15" ry="6" fill="#000" opacity="0.16" />
      {[
        [-11, 14, 10],
        [-27, 11, 8],
        [-41, 8.4, 6.4],
      ].map(([cy, rx, ry]) => (
        <g key={cy}>
          <ellipse cx="0" cy={cy} rx={rx} ry={ry} fill={SNOW} />
          {/* cool tone on the away side, light catch on the near top */}
          <path d={`M0 ${cy - ry} a${rx} ${ry} 0 0 1 0 ${ry * 2} z`} fill={SNOW_SHADE} opacity="0.45" />
          <ellipse cx={-rx * 0.3} cy={cy - ry * 0.45} rx={rx * 0.45} ry={ry * 0.3} fill="#fff" opacity="0.7" />
        </g>
      ))}
      {/* scarf: one band and a tail, the only saturated colour on the piece */}
      <path d="M-9 -34 q9 4 18 0 l0 4 q-9 4 -18 0 z" style={tinted("#a8442f")} />
      <path d="M7 -31 q5 3 3 9 l-4 -1 q2 -5 -2 -7 z" style={tinted("#a8442f")} />
      <path d="M7 -31 q5 3 3 9 l-4 -1 q2 -5 -2 -7 z" fill="#000" opacity="0.18" />
      {/* the carrot points camera-left, so it reads in silhouette */}
      <path d="M-7.5 -41 l-6 1.6 l6 1.6 z" fill="#d98b3a" />
      <circle cx="-4.4" cy="-43.4" r="1" fill="#2b2350" />
      <circle cx="0.6" cy="-43.8" r="1" fill="#2b2350" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={-2 + i * 2.6} cy={-26 + i * 4.4} r="0.9" fill="#2b2350" opacity="0.8" />
      ))}
      {/* twig arms — a pole and two forks, same logic as the rake */}
      <path
        d="M13 -28 l9 -5 M20 -30 l4 -4 M20.5 -32.4 l4.6 0.6"
        fill="none"
        stroke="#6b4a39"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M-13 -28 l-8 -3" fill="none" stroke="#6b4a39" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

export function SnowDrift() {
  // Winter's answer to the leaf pile, and it follows the same lesson: low and
  // WIDE with a ragged edge. A tall white mound reads as a boulder.
  const c = project(0.6, 0.45);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {/* A cool compressed underside grounds the snow without a black oval. */}
      <path d="M-25 -1 Q-18 5 -7 2 Q3 6 12 2 Q19 4 25 -1 L21 3 Q0 9 -22 3 Z"
        fill={SNOW_SHADE} opacity="0.5" />
      <path d="M-25 -1 Q-22 -8 -14 -7 Q-9 -13 -2 -9 Q4 -14 10 -8 Q19 -9 25 -1
        Q17 2 9 0 Q1 4 -8 1 Q-18 4 -25 -1 Z" fill={SNOW} />
      <path d="M4 -11 Q10 -9 16 -7 Q22 -6 25 -1 Q16 2 9 0 Q7 -6 4 -11 Z"
        fill={SNOW_SHADE} opacity="0.42" />
      <path d="M-19 -3 Q-15 -9 -9 -8 Q-12 -4 -19 -3 Z" fill="#fff" opacity="0.72" />
    </g>
  );
}

export function Snowballs() {
  const c = project(0.45, 0.35);
  const balls = [
    { x: -8.5, y: -6.5, rx: 7.8, ry: 6.3, tilt: -7, dent: 0.12, shoulder: 0.72 },
    { x: 7.2, y: -7.2, rx: 8.3, ry: 6.8, tilt: 6, dent: -0.08, shoulder: 0.58 },
    { x: -0.5, y: -15.3, rx: 6.7, ry: 5.8, tilt: -3, dent: 0.18, shoulder: 0.66 },
  ];
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="17" ry="4.5" fill={SNOW_SHADE} opacity="0.34" />
      {balls.map(({ x, y, rx, ry, tilt, dent, shoulder }, index) => (
        <g key={`${x}-${y}`} transform={`rotate(${tilt} ${x} ${y})`}>
          {/* Hand-packed snow is lumpy and slightly flat where it meets the pile;
              a perfect ellipse made this prop read as three eggs. */}
          <path d={`M${x - rx} ${y + ry * 0.08}
            Q${x - rx * 0.94} ${y - ry * shoulder} ${x - rx * 0.34} ${y - ry * 0.94}
            Q${x + rx * dent} ${y - ry * 1.08} ${x + rx * 0.62} ${y - ry * 0.62}
            Q${x + rx * 1.04} ${y - ry * 0.2} ${x + rx * 0.88} ${y + ry * 0.42}
            Q${x + rx * 0.34} ${y + ry * 0.82} ${x - rx * 0.42} ${y + ry * 0.78}
            Q${x - rx * 0.92} ${y + ry * 0.66} ${x - rx} ${y + ry * 0.08} Z`}
            fill={SNOW} />
          <path d={`M${x + rx * 0.54} ${y - ry * 0.46}
            Q${x + rx * 0.94} ${y - ry * 0.14} ${x + rx * 0.88} ${y + ry * 0.42}
            Q${x + rx * 0.34} ${y + ry * 0.94} ${x - rx * 0.04} ${y + ry * 0.8}
            Q${x + rx * 0.5} ${y + ry * 0.24} ${x + rx * 0.54} ${y - ry * 0.46} Z`}
            fill={SNOW_SHADE} opacity="0.42" />
          <path d={`M${x - rx * 0.62} ${y - ry * 0.32}
            Q${x - rx * 0.34} ${y - ry * 0.65} ${x - rx * 0.02} ${y - ry * 0.52}`}
            fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.66" />
          <path d={`M${x - rx * 0.35} ${y + ry * 0.7} Q${x} ${y + ry * 0.82} ${x + rx * 0.28} ${y + ry * 0.68}`}
            fill="none" stroke={SNOW_SHADE} strokeWidth="1.1" strokeLinecap="round" opacity="0.36" />
          {index !== 1 && <circle cx={x + rx * 0.3} cy={y - ry * 0.18}
            r="0.8" fill={SNOW_SHADE} opacity="0.38" />}
        </g>
      ))}
    </g>
  );
}

export function ChristmasTree() {
  const c = project(0.7, 0.7);
  return (
    <g data-tree="christmas">
      <path d={`M${c.x - 4} ${c.y} L${c.x - 3} ${c.y - 30} L${c.x + 3} ${c.y - 30} L${c.x + 4} ${c.y} Z`} fill="#6b4a39" />
      <EvergreenCrown center={c}
        rearPalette={["#2f5944", "#284f3d"]}
        frontPalette={["#35634b", "#2f5d47"]}>
        {[
          [-16, -32, "#d85b52"], [10, -38, "#e8b04b"], [-5, -51, "#7da5d8"],
          [14, -59, "#d85b52"], [-8, -69, "#e8b04b"], [3, -82, "#e8a3a8"],
        ].map(([x, y, fill]) => <circle key={`${x}-${y}`} cx={c.x + x} cy={c.y + y} r="2.5" fill={fill} />)}
        <path d={`M${c.x} ${c.y - 106} l3 6 l6.5 1 l-4.8 4.5 l1.4 6.5 l-6.1 -3.2 l-6.1 3.2 l1.4 -6.5 l-4.8 -4.5 l6.5 -1 z`} fill="#f2c45d" />
        <path className="pool-breathe" d={`M${c.x - 20} ${c.y - 26} Q${c.x} ${c.y - 38} ${c.x + 20} ${c.y - 28} M${c.x - 15} ${c.y - 51} Q${c.x} ${c.y - 61} ${c.x + 15} ${c.y - 52}`} fill="none" stroke="#ffe3a3" strokeWidth="1.5" opacity="0.7" />
      </EvergreenCrown>
    </g>
  );
}

export function SnowAngel() {
  const c = project(1.2, 0.8);
  return (
    <g transform={`translate(${c.x}, ${c.y}) rotate(26) scale(1,0.5)`} strokeLinecap="round" strokeLinejoin="round">
      {/* Broad depressed fields plus broken rim catches read as packed snow;
          a single continuous double outline looked chalked onto the floor. */}
      <ellipse cx="0" cy="-24" rx="9" ry="8" fill={SNOW_SHADE} opacity="0.3" />
      <ellipse cx="-0.5" cy="-24.8" rx="6.2" ry="5.3" fill={SNOW} opacity="0.52" />
      <path d="M0 -17 Q-8 -5 -5 12 Q0 19 5 12 Q8 -5 0 -17 Z" fill={SNOW_SHADE} opacity="0.28" />
      <path d="M-3 -11 Q-19 -29 -34 -13 Q-27 6 -6 10 Q-13 -4 -3 -11 Z" fill={SNOW_SHADE} opacity="0.24" />
      <path d="M3 -11 Q19 -29 34 -13 Q27 6 6 10 Q13 -4 3 -11 Z" fill={SNOW_SHADE} opacity="0.24" />
      <g fill="none" stroke={SNOW_SHADE} strokeWidth="6" opacity="0.42">
        <path d="M-2 13 Q-12 25 -18 38" />
        <path d="M2 13 Q12 25 18 38" />
      </g>
      <g fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.58">
        <path d="M-7 -29 Q-2 -34 4 -31" />
        <path d="M-29 -15 Q-21 -25 -12 -22" />
        <path d="M12 -22 Q22 -25 29 -14" />
        <path d="M-15 31 Q-12 25 -8 21 M8 21 Q13 27 16 33" />
      </g>
    </g>
  );
}

export function ChristmasLights() {
  const bulbs = ["#d85b52", "#e8b04b", "#6fb8cf", "#d98aa8", "#79a56f", "#e8b04b"];
  return (
    <g transform={`skewY(${SKEW})`}>
      <path d="M0 -78 Q22 -65 44 -78" fill="none" stroke="#3e4851" strokeWidth="1.6" />
      {bulbs.map((fill, i) => {
        const x = 3 + i * 7.6;
        const y = -75 + Math.sin((i / 5) * Math.PI) * 8;
        return <g key={x}><path d={`M${x} ${y - 3} v3`} stroke="#3e4851" strokeWidth="1.2" /><ellipse className="pool-breathe" cx={x} cy={y + 2} rx="2.2" ry="3.2" fill={fill} /></g>;
      })}
    </g>
  );
}

export function Chimney() {
  return (
    <g>
      <TintedBox gx={0.08} gy={0.06} dx={0.84} dy={0.6} h={68} fallback="#8b5546" dark={0.32} mid={0.18} />
      <g transform="translate(0,-68)">
        <polygon points={floorPatch(0, 0, 1, 0.72)} fill="#6e4038" />
        <polygon points={floorPatch(0.08, 0.06, 0.84, 0.58)} fill="#2f2930" />
        <path d={`M${project(0.08, 0.06).x} ${project(0.08, 0.06).y} L${project(0.92, 0.06).x} ${project(0.92, 0.06).y} L${project(0.72, 0.22).x} ${project(0.72, 0.22).y} Q${project(0.45, 0.16).x} ${project(0.45, 0.16).y - 4} ${project(0.15, 0.2).x} ${project(0.15, 0.2).y} Z`} fill={SNOW} />
      </g>
      <g opacity="0.32" fill="#d8d9df">
        <circle cx="12" cy="-83" r="5" /><circle cx="16" cy="-94" r="7" /><circle cx="11" cy="-107" r="8" />
      </g>
    </g>
  );
}

export function LogStack() {
  // Cut ends toward the camera: the rings are the whole read and they only work
  // if the round faces point at you. Doubles as a seat, like the hay bale.
  const c = project(0.45, 0.3);
  const ring = (x, y, r) => (
    <g key={`${x}-${y}`}>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.86} style={tinted("#a8794f")} />
      <ellipse cx={x} cy={y} rx={r * 0.72} ry={r * 0.6} fill="#e0c39a" />
      <ellipse cx={x} cy={y} rx={r * 0.36} ry={r * 0.3} fill="#c39a6b" />
    </g>
  );
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="17" ry="7" fill="#000" opacity="0.18" />
      {/* the bark side of the stack, behind the cut faces */}
      <path d="M-14 -6 l0 -12 q14 -5 28 0 l0 12 q-14 5 -28 0 z" style={tinted("#7d5636")} />
      <path d="M-14 -6 l0 -12 q14 -5 28 0 l0 12 q-14 5 -28 0 z" fill="#000" opacity="0.22" />
      {[
        [-7, -9, 5.2],
        [4, -8, 5.6],
        [-1, -19, 5.4],
        [10, -17, 4.6],
      ].map(([x, y, r]) => ring(x, y, r))}
    </g>
  );
}

export function IceLantern() {
  // A candle in a hollow of packed snow. The pool of light on the floor is the
  // scene's job (catalog `glow`) — this draws only the flame and the ice.
  const c = project(0.22, 0.22);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="8" ry="3.4" fill="#000" opacity="0.16" />
      <path d="M-7.5 -2 l0 -11 q7.5 -4 15 0 l0 11 q-7.5 4 -15 0 z" fill={SNOW} opacity="0.92" />
      <path d="M0 -2 l0 -15 q7.5 0 7.5 4 l0 11 q-3.8 2 -7.5 2 z" fill={SNOW_SHADE} opacity="0.5" />
      {/* the mouth of the hollow, with the flame inside it */}
      <ellipse cx="0" cy="-13.6" rx="4.4" ry="2.2" fill="#2b2350" opacity="0.55" />
      <path className="flame-dance" d="M0 -13 q-3.4 -4.4 0 -9.4 q3.4 5 0 9.4 z" fill="#ffd76a" />
      <path
        className="flame-dance"
        style={{ animationDelay: "calc(var(--phase, 0s) + 0.4s)" }}
        d="M0 -13.4 q-2 -3 0 -6.4 q2 3.4 0 6.4 z"
        fill="#fff3c4"
      />
      <ellipse cx="0" cy="-15" rx="6.4" ry="4.4" fill="#ffd76a" opacity="0.22" />
    </g>
  );
}

export function Icicles() {
  // Wall decor, drawn in the same skewed space as a picture frame — and in the
  // same coordinate convention, which is the part that first went wrong: wall
  // sprites run UP the wall in negative y from the floor origin, and rightward in
  // positive x. Drawn from y=0 downward these hung at the skirting board, in a
  // puddle at the foot of the wall.
  //
  // Lengths VARY across the run: a row of equal spikes reads as a saw blade.
  const RAIL = -100;
  return (
    <g transform={`skewY(${SKEW})`}>
      {/* the ledge of packed snow they hang from, tying the run together */}
      <path d={`M0 ${RAIL} q22 -3 44 0 l0 3.4 q-22 2.6 -44 0 z`} fill={SNOW} />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const x = 3.5 + i * 7.4;
        const len = 7 + ((i * 5) % 4) * 3.4;
        const top = RAIL + 2.4;
        return (
          <g key={i}>
            <path d={`M${x - 2.6} ${top} L${x + 2.6} ${top} L${x} ${top + len} Z`} fill={SNOW} opacity="0.92" />
            <path d={`M${x} ${top} L${x + 2.6} ${top} L${x} ${top + len} Z`} fill={SNOW_SHADE} opacity="0.55" />
          </g>
        );
      })}
    </g>
  );
}

