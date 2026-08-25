import { SKEW, floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { TintedBox } from "./IsoItemPrimitives";

// Same five rules as the autumn set above. The season's whole read is one
// colour — a near-white that has to stay legible against a light floor, so every
// snow mass carries a cool shadow tone underneath rather than relying on the
// background to define its edge.

const SNOW = "#eef4f8";
const SNOW_SHADE = "#b9cbd8";

export function SnowPine() {
  // A conifer is a stack of skirts, widest at the base. Snow sits on the TOP of
  // each skirt with the green showing beneath it — that alternation is what says
  // "laden" rather than "painted white".
  const c = project(0.65, 0.65);
  const skirt = (y, w, h) =>
    `M${c.x} ${c.y - y - h} L${c.x + w} ${c.y - y} L${c.x} ${c.y - y + h * 0.34} L${c.x - w} ${c.y - y} Z`;
  return (
    <g>
      <path
        d={`M${c.x - 4} ${c.y} L${c.x - 2.6} ${c.y - 26} L${c.x + 2.6} ${c.y - 26} L${c.x + 4} ${c.y} Z`}
        fill="#6b4a39"
      />
      <g className="room-sway">
        {[
          [22, 26, 22],
          [44, 20, 19],
          [64, 14, 15],
        ].map(([y, w, h]) => (
          <g key={y}>
            <path d={skirt(y, w, h)} style={tinted("#3f6b52")} />
            <path d={skirt(y, w, h)} fill="#000" opacity="0.16" />
            {/* the snow load: the upper edge of the same skirt, so it sits ON it */}
            <path
              d={`M${c.x} ${c.y - y - h} L${c.x + w} ${c.y - y} L${c.x + w * 0.45} ${c.y - y - h * 0.16} L${c.x} ${c.y - y - h * 0.1} L${c.x - w * 0.45} ${c.y - y - h * 0.16} L${c.x - w} ${c.y - y} Z`}
              fill={SNOW}
            />
            <path
              d={`M${c.x} ${c.y - y - h} L${c.x + w} ${c.y - y} L${c.x + w * 0.45} ${c.y - y - h * 0.16} Z`}
              fill={SNOW_SHADE}
              opacity="0.5"
            />
          </g>
        ))}
        <path d={skirt(80, 8, 11)} fill={SNOW} />
      </g>
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
      <ellipse cx="0" cy="-1" rx="24" ry="9" fill="#000" opacity="0.1" />
      <path d="M-24 -1 q6 -8 14 -7 q6 -5 13 -1 q9 1 21 8 z" fill={SNOW} />
      <path d="M6 -8 q9 1 21 8 l-11 0 q-3 -6 -10 -8 z" fill={SNOW_SHADE} opacity="0.55" />
      <path d="M-17 -3 q6 -5 12 -4.6 q-5 2.6 -12 4.6 z" fill="#fff" opacity="0.75" />
      {/* a few flecks, so the mass isn't one flat field */}
      {[
        [-8, -6],
        [3, -8.6],
        [12, -4],
      ].map(([x, y]) => (
        <ellipse key={x} cx={x} cy={y} rx="2.4" ry="1" fill="#fff" opacity="0.6" />
      ))}
    </g>
  );
}

export function Snowballs() {
  const c = project(0.45, 0.35);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="16" ry="5" fill="#000" opacity="0.1" />
      {[
        [-8, -7, 7], [7, -7, 7.5], [0, -16, 6.5],
      ].map(([x, y, r]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={r} fill={SNOW} />
          <path d={`M${x} ${y - r} a${r} ${r} 0 0 1 0 ${r * 2} z`} fill={SNOW_SHADE} opacity="0.42" />
          <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.25} fill="#fff" opacity="0.7" />
        </g>
      ))}
    </g>
  );
}

export function ChristmasTree() {
  const c = project(0.7, 0.7);
  const tiers = [[27, 28], [46, 22], [63, 16], [77, 10]];
  return (
    <g>
      <path d={`M${c.x - 4} ${c.y} L${c.x - 3} ${c.y - 30} L${c.x + 3} ${c.y - 30} L${c.x + 4} ${c.y} Z`} fill="#6b4a39" />
      {tiers.map(([y, w]) => (
        <path key={y} d={`M${c.x} ${c.y - y - 18} L${c.x + w} ${c.y - y} L${c.x} ${c.y - y + 7} L${c.x - w} ${c.y - y} Z`} style={tinted("#35634b")} />
      ))}
      {[
        [-16, -32, "#d85b52"], [10, -38, "#e8b04b"], [-5, -51, "#7da5d8"],
        [14, -59, "#d85b52"], [-8, -69, "#e8b04b"], [3, -82, "#e8a3a8"],
      ].map(([x, y, fill]) => <circle key={`${x}-${y}`} cx={c.x + x} cy={c.y + y} r="2.5" fill={fill} />)}
      <path d={`M${c.x} ${c.y - 102} l3 6 l6.5 1 l-4.8 4.5 l1.4 6.5 l-6.1 -3.2 l-6.1 3.2 l1.4 -6.5 l-4.8 -4.5 l6.5 -1 z`} fill="#f2c45d" />
      <path className="pool-breathe" d={`M${c.x - 20} ${c.y - 26} Q${c.x} ${c.y - 38} ${c.x + 20} ${c.y - 28} M${c.x - 15} ${c.y - 51} Q${c.x} ${c.y - 61} ${c.x + 15} ${c.y - 52}`} fill="none" stroke="#ffe3a3" strokeWidth="1.5" opacity="0.7" />
    </g>
  );
}

export function SnowAngel() {
  const c = project(1.2, 0.8);
  return (
    <g transform={`translate(${c.x}, ${c.y}) rotate(26) scale(1,0.5)`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* An imprint, never a raised snow sculpture: one broad cool furrow
          with a narrow white catch, repeated over the same human outline. */}
      {[{ stroke: SNOW_SHADE, width: 5, opacity: 0.62 }, { stroke: SNOW, width: 2, opacity: 0.9 }].map((pass) => (
        <g key={pass.width} stroke={pass.stroke} strokeWidth={pass.width} opacity={pass.opacity}>
          <circle cx="0" cy="-24" r="7" />
          <path d="M0 -16 Q-6 0 0 16 Q6 0 0 -16" />
          <path d="M-3 -10 Q-20 -24 -31 -13 Q-24 3 -5 8" />
          <path d="M3 -10 Q20 -24 31 -13 Q24 3 5 8" />
          <path d="M-2 14 Q-12 24 -17 37 M2 14 Q12 24 17 37" />
        </g>
      ))}
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

