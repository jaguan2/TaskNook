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
  const masses = [
    { cy: -11, rx: 14, ry: 10, lean: -0.5 },
    { cy: -27, rx: 10.5, ry: 8, lean: 0.7 },
    { cy: -41, rx: 8.2, ry: 6.4, lean: -0.4 },
  ];
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-seasonal-structure="snowman">
      <ellipse cx="0" cy="-1" rx="15" ry="6" fill="#000" opacity="0.16" />
      {masses.map(({ cy, rx, ry, lean }) => (
        <g key={cy} data-seasonal-part="snow-mass">
          <path d={`M${-rx} ${cy} Q${-rx * 0.86} ${cy - ry * 0.72} ${lean} ${cy - ry}
            Q${rx * 0.86} ${cy - ry * 0.72} ${rx} ${cy + ry * 0.08}
            Q${rx * 0.72} ${cy + ry * 0.92} ${-rx * 0.22} ${cy + ry}
            Q${-rx * 0.9} ${cy + ry * 0.72} ${-rx} ${cy} Z`} fill={SNOW} />
          {/* cool tone on the away side, light catch on the near top */}
          <path d={`M${rx * 0.4} ${cy - ry * 0.78} Q${rx} ${cy - ry * 0.24} ${rx} ${cy + ry * 0.08}
            Q${rx * 0.7} ${cy + ry * 0.9} ${rx * 0.02} ${cy + ry * 0.92}
            Q${rx * 0.46} ${cy + ry * 0.18} ${rx * 0.4} ${cy - ry * 0.78} Z`}
            fill={SNOW_SHADE} opacity="0.45" />
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

export function ChristmasLights({ lit = true }) {
  const bulbs = ["#d85b52", "#e8b04b", "#6fb8cf", "#d98aa8", "#79a56f", "#e8b04b"];
  return (
    <g transform={`skewY(${SKEW})`} data-seasonal-structure="christmas-lights" data-lit={lit}>
      <path data-seasonal-part="light-cable" d="M0 -78 Q22 -65 44 -78"
        fill="none" stroke="#3e4851" strokeWidth="1.6" />
      {[0, 44].map((x) => <g key={x} data-seasonal-part="light-clip">
        <circle cx={x} cy="-78" r="2.2" fill="#6d6465" />
        <circle cx={x} cy="-78" r="0.8" fill="#d8cbb8" opacity="0.7" />
      </g>)}
      {bulbs.map((fill, i) => {
        const x = 3 + i * 7.6;
        const y = -75 + Math.sin((i / 5) * Math.PI) * 8;
        return <g key={x}>
          <path d={`M${x} ${y - 4} v3`} stroke="#3e4851" strokeWidth="1.2" />
          <path data-seasonal-part="light-socket" d={`M${x - 2.3} ${y - 1} L${x + 2.3} ${y - 1}
            L${x + 1.7} ${y + 2} L${x - 1.7} ${y + 2} Z`} fill="#4d4950" />
          <path data-seasonal-part="light-bulb" d={`M${x - 2.5} ${y + 2}
            Q${x - 2.8} ${y + 6} ${x} ${y + 7.5} Q${x + 2.8} ${y + 6} ${x + 2.5} ${y + 2} Z`}
            fill={lit ? fill : "#756f78"} opacity={lit ? 0.92 : 0.48} />
          <ellipse className={lit ? "pool-breathe" : undefined} cx={x - 0.5} cy={y + 4.3}
            rx="0.9" ry="1.5" fill={lit ? "#fff3c4" : "#918b91"} opacity={lit ? 0.86 : 0.32}
            style={lit ? { animationDelay: `calc(var(--phase, 0s) - ${i * 0.37}s)` } : undefined} />
        </g>;
      })}
    </g>
  );
}

export function Chimney() {
  const left = project(0.08, 0.66);
  const center = project(0.92, 0.66);
  const right = project(0.92, 0.06);
  return (
    <g data-seasonal-structure="snowy-chimney">
      <TintedBox gx={0.08} gy={0.06} dx={0.84} dy={0.6} h={68} fallback="#8b5546" dark={0.32} mid={0.18} />
      {[16, 32, 48, 64].map((lift, index) => <path key={lift}
        data-seasonal-part="brick-course"
        d={`M${left.x} ${left.y - lift} L${center.x} ${center.y - lift} L${right.x} ${right.y - lift}`}
        fill="none" stroke="#ead8c4" strokeWidth="1.2" opacity={0.28 + index * 0.025} />)}
      <g opacity="0.32" stroke="#4f332f" strokeWidth="1">
        <path d="M-4 -7 L-4 -23 M7 -23 L7 -39 M-6 -39 L-6 -55 M9 -55 L9 -67" />
        <path d="M15 1 L15 -15 M12 -15 L12 -31 M18 -31 L18 -47 M14 -47 L14 -63" />
      </g>
      <g transform="translate(0,-68)" data-seasonal-part="chimney-cap">
        <TintedBox gx={0} gy={0} dx={1} dy={0.72} h={6} fallback="#6e4038" dark={0.34} mid={0.2} />
        <polygon data-seasonal-part="smoke-opening" points={floorPatch(0.13, 0.1, 0.74, 0.43)}
          fill="#2f2930" transform="translate(0,-6)" />
        <path d={`M${project(0.03, 0.04).x} ${project(0.03, 0.04).y - 6}
          L${project(0.96, 0.04).x} ${project(0.96, 0.04).y - 6}
          L${project(0.76, 0.19).x} ${project(0.76, 0.19).y - 6}
          Q${project(0.46, 0.13).x} ${project(0.46, 0.13).y - 10} ${project(0.11, 0.18).x} ${project(0.11, 0.18).y - 6} Z`}
          fill={SNOW} />
      </g>
      <path data-seasonal-part="smoke-puff" d="M6 -82 Q1 -88 7 -93 Q14 -96 16 -89 Q17 -84 12 -81 Z"
        fill="#d8d9df" opacity="0.26" />
      <path data-seasonal-part="smoke-puff" d="M11 -94 Q5 -101 11 -107 Q20 -110 22 -102 Q22 -96 17 -93 Z"
        fill="#d8d9df" opacity="0.22" />
      <path data-seasonal-part="smoke-puff" d="M7 -108 Q1 -115 8 -122 Q18 -125 21 -116 Q21 -110 15 -107 Z"
        fill="#d8d9df" opacity="0.18" />
    </g>
  );
}

export function LogStack() {
  // Cut ends toward the camera: the rings are the whole read and they only work
  // if the round faces point at you. Doubles as a seat, like the hay bale.
  const c = project(0.45, 0.3);
  const ring = (x, y, r, tilt) => (
    <g key={`${x}-${y}`} transform={`rotate(${tilt} ${x} ${y})`} data-seasonal-part="split-log">
      <path d={`M${x - r} ${y} Q${x - r * 0.72} ${y - r * 0.92} ${x + r * 0.1} ${y - r * 0.78}
        Q${x + r} ${y - r * 0.62} ${x + r * 0.9} ${y + r * 0.16}
        Q${x + r * 0.5} ${y + r * 0.76} ${x - r * 0.28} ${y + r * 0.72}
        Q${x - r} ${y + r * 0.54} ${x - r} ${y} Z`} style={tinted("#a8794f")} />
      <path d={`M${x - r * 0.68} ${y - r * 0.02} Q${x - r * 0.42} ${y - r * 0.58} ${x + r * 0.14} ${y - r * 0.5}
        Q${x + r * 0.67} ${y - r * 0.35} ${x + r * 0.58} ${y + r * 0.13}
        Q${x + r * 0.24} ${y + r * 0.48} ${x - r * 0.25} ${y + r * 0.43}
        Q${x - r * 0.72} ${y + r * 0.34} ${x - r * 0.68} ${y - r * 0.02} Z`} fill="#e0c39a" />
      <path d={`M${x - r * 0.3} ${y - 0.2} Q${x} ${y - r * 0.32} ${x + r * 0.28} ${y}
        Q${x} ${y + r * 0.26} ${x - r * 0.3} ${y - 0.2} Z`} fill="none"
        stroke="#b88657" strokeWidth="0.8" />
    </g>
  );
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-seasonal-structure="firewood">
      <ellipse cx="0" cy="-1" rx="17" ry="7" fill="#000" opacity="0.18" />
      {/* Unequal bark bodies project behind the cut ends rather than merging
          into one smooth bundle. */}
      <g data-seasonal-part="bark" style={tinted("#6f4931")}>
        <path d="M-13 -5 L-12 -13 Q-2 -17 6 -12 L5 -5 Z" />
        <path d="M-2 -5 L0 -13 Q10 -16 16 -11 L15 -4 Z" opacity="0.86" />
        <path d="M-7 -15 L-5 -22 Q3 -25 9 -20 L8 -14 Z" opacity="0.92" />
      </g>
      {[
        [-8, -8, 5.4, -8],
        [4, -7, 5.8, 5],
        [-2, -18, 5.5, -4],
        [10, -16, 4.7, 9],
      ].map(([x, y, r, tilt]) => ring(x, y, r, tilt))}
    </g>
  );
}

export function IceLantern() {
  // A candle in a hollow of packed snow. The pool of light on the floor is the
  // scene's job (catalog `glow`) — this draws only the flame and the ice.
  const c = project(0.22, 0.22);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-seasonal-structure="ice-lantern">
      <ellipse cx="0" cy="-1" rx="8" ry="3.4" fill="#000" opacity="0.16" />
      <path data-seasonal-part="ice-shell"
        d="M-8 -2 L-8 -11 Q-7 -16 -3 -16 Q0 -19 3 -16 Q8 -16 8 -11 L8 -2 Q0 4 -8 -2 Z"
        fill={SNOW} opacity="0.84" stroke="#d7e7ee" strokeWidth="1" />
      <path d="M0 -1 L0 -17 Q5 -17 8 -12 L8 -2 Q4 1 0 1 Z" fill={SNOW_SHADE} opacity="0.44" />
      <path data-seasonal-part="ice-rim"
        d="M-7 -13 Q-5 -18 -2 -15 Q0 -19 3 -15 Q6 -18 7 -13 Q3 -15 0 -14 Q-3 -15 -7 -13 Z"
        fill="#e4f0f4" opacity="0.88" />
      {/* the mouth of the hollow, with a separate candle inside it */}
      <ellipse cx="0" cy="-13.2" rx="4.8" ry="2.5" fill="#2b2350" opacity="0.58" />
      <path data-seasonal-part="ice-candle" d="M-2 -13 L2 -13 L2 -7 Q0 -5 -2 -7 Z" fill="#f0dfbf" />
      <ellipse cx="0" cy="-15" rx="6.4" ry="4.4" fill="#ffd76a" opacity="0.22" />
      <g data-seasonal-part="ice-flame" className="flame-dance">
        <path d="M0 -13 q-3.4 -4.4 0 -9.4 q3.4 5 0 9.4 z" fill="#ffd76a" />
        <path d="M0 -13.4 q-2 -3 0 -6.4 q2 3.4 0 6.4 z" fill="#fff3c4" />
      </g>
      <path data-seasonal-part="ice-rim"
        d="M-7 -13 Q-4 -9 0 -10 Q4 -9 7 -13 L6 -10 Q0 -6 -6 -10 Z"
        fill={SNOW_SHADE} opacity="0.5" />
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
  const shards = [
    [3.5, 8, 5.2], [10.9, 17.2, 4.2], [18.3, 10.4, 5.8],
    [25.7, 20.6, 4.6], [33.1, 13.8, 5.4], [40.5, 7, 4.4],
  ];
  return (
    <g transform={`skewY(${SKEW})`} data-seasonal-structure="icicles">
      {/* the ledge of packed snow they hang from, tying the run together */}
      <path data-seasonal-part="snow-ledge"
        d={`M0 ${RAIL} q7 -4 14 -1 q8 -4 15 0 q8 -3 15 1 l0 3.4 q-22 2.6 -44 0 z`} fill={SNOW} />
      {shards.map(([x, len, width]) => {
        const top = RAIL + 2.4;
        return (
          <g key={x} data-seasonal-part="ice-shard">
            <path d={`M${x - width / 2} ${top} Q${x} ${top - 1.5} ${x + width / 2} ${top}
              L${x + width * 0.08} ${top + len} L${x - width * 0.08} ${top + len} Z`}
              fill={SNOW} opacity="0.9" />
            <path d={`M${x} ${top} L${x + width / 2} ${top} L${x + width * 0.08} ${top + len}
              L${x - width * 0.08} ${top + len} Z`} fill={SNOW_SHADE} opacity="0.5" />
          </g>
        );
      })}
    </g>
  );
}

