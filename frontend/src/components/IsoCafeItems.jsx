import { SKEW, TILE_W, floorPatch, isoBox, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { SteamWisps } from "./IsoAmbientEffects";
import { TintedBox } from "./IsoItemPrimitives";

// Café-specific furniture is kept together so the main sprite registry remains
// a readable composition root. These exports stay code-drawn SVG and share the
// same grid/projection primitives as every other isometric item family.

function CafePlanks({ w, d, n = 2, opacity = 0.13 }) {
  return Array.from({ length: n }, (_, i) => (
    <polygon
      key={i}
      points={floorPatch(0.06, (d * (i + 1)) / (n + 1), w - 0.12, 0.02)}
      fill="#000"
      opacity={opacity}
    />
  ));
}

function CafeTable() {
  const c = project(0.6, 0.6);
  const H = 21;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {/* Base: two flares, not one disc — a single ellipse under a pole reads
          as a plate balanced on a stick. */}
      <ellipse cx="0" cy="-1" rx="13" ry="6.5" style={tinted("#8f5d49")} />
      <ellipse cx="0" cy="-1" rx="13" ry="6.5" fill="#000" opacity="0.36" />
      <ellipse cx="0" cy="-4" rx="9.5" ry="4.8" style={tinted("#8f5d49")} />
      <ellipse cx="0" cy="-4" rx="9.5" ry="4.8" fill="#000" opacity="0.24" />
      <rect x="-3" y={-H + 2} width="6" height={H - 4} style={tinted("#8f5d49")} />
      <rect x="-3" y={-H + 2} width="6" height={H - 4} fill="#000" opacity="0.22" />
      <ellipse cx="0" cy={-H + 3.5} rx="25" ry="12.5" style={tinted("#a87f5f")} />
      <ellipse cx="0" cy={-H + 3.5} rx="25" ry="12.5" fill="#000" opacity="0.3" />
      <ellipse cx="0" cy={-H} rx="25" ry="12.5" style={tinted("#b58c6a")} />
      {/* turned rings on the top, then the light catch */}
      <ellipse cx="0" cy={-H} rx="21" ry="10.5" fill="none" stroke="#000" strokeWidth="0.8" opacity="0.12" />
      <ellipse cx="0" cy={-H} rx="8" ry="4" fill="none" stroke="#000" strokeWidth="0.8" opacity="0.1" />
      <ellipse cx="-6" cy={-H - 2} rx="10" ry="4" fill="#fff" opacity="0.08" />
    </g>
  );
}
const COUNTER_H = 26;
const COUNTER_TOP = 3.5;

/** Cabinet with a stone worktop proud of it. The worktop opts out of the tint
 *  so a red counter still gets a stone top, not a red one. */
function Counter() {
  const W = 1;
  const D = 0.5;
  const face = W * (TILE_W / 2);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={COUNTER_H} fallback="#8f5d49" dark={0.36} mid={0.2} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        <rect x="2" y={-COUNTER_H + 3} width={face - 4} height={COUNTER_H - 7} rx="1.2" fill="#000" opacity="0.14" />
        <rect x={face / 2 - 4} y={-COUNTER_H + 8} width="8" height="1.5" rx="0.75" fill="#fff" opacity="0.2" />
      </g>
      <g transform={`translate(0,${-COUNTER_H})`}>
        <TintedBox
          gx={-0.03}
          gy={-0.03}
          dx={W + 0.06}
          dy={D + 0.06}
          h={COUNTER_TOP}
          fallback="#cfc4b4"
          tint={false}
          dark={0.24}
          mid={0.12}
        />
      </g>
    </g>
  );
}

/** The counter with an espresso machine on it — steam included, since that's
 *  what sells a café. */
function CoffeeCounter() {
  const lift = COUNTER_H + COUNTER_TOP;
  return (
    <g>
      <Counter />
      <g transform={`translate(0,${-lift})`}>
        <TintedBox gx={0.16} gy={0.06} dx={0.68} dy={0.32} h={16} fallback="#c6bca9" tint={false} dark={0.32} mid={0.18} />
        <g transform={`translate(${project(0.16, 0.38).x}, ${project(0.16, 0.38).y}) skewY(${SKEW})`}>
          {/* Control fascia over an open brewing bay, not a glowing screen. */}
          <rect x="1.2" y="-14.5" width="13.8" height="4.5" rx="0.7" fill="#403940" />
          <circle cx="4" cy="-12.2" r="1.5" fill="#ead9b6" />
          <path d="M4 -12.2 l0.5 -1" stroke="#665443" strokeWidth="0.7" />
          <circle cx="9" cy="-12.2" r="0.8" fill="#dfa951" />
          <circle cx="12" cy="-12.2" r="0.8" fill="#8aa68a" />
          <rect x="1.8" y="-9" width="12.5" height="7.5" rx="0.6" fill="#493c3b" />
          <path d="M7 -9 v2 h5" fill="none" stroke="#c9bda8" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14 -10 v5 l-1 1" fill="none" stroke="#ddd0b8" strokeWidth="1" />
          <rect x="1" y="-1.8" width="14.5" height="1.8" rx="0.4" fill="#d9ccba" />
          <path d="M3 -1 h10" stroke="#7c6e64" strokeWidth="0.7" strokeDasharray="1 1" />
          {/* Oversize cup handle and dark rim keep the cup readable. */}
          <path d="M8.5 -5.5 h2 q2 2 -1 3" fill="none" stroke="#eee1c8" strokeWidth="1.1" />
          <path d="M4.5 -6 h5 v2.5 q0 2 -2.5 2 q-2.5 0 -2.5 -2 z" fill="#eee1c8" />
          <ellipse cx="7" cy="-6" rx="2.5" ry="0.8" fill="#72513c" />
          <SteamWisps x={7} y={-7} scale={0.65} />
        </g>
      </g>
    </g>
  );
}

// A serving bar isn't a kitchen cabinet: it's taller, its top OVERHANGS on the
// customer side, and its front is panelled rather than a cupboard door.

function BarCounter() {
  const W = 1;
  const D = 0.6;
  const H = 33;
  const face = W * (TILE_W / 2);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#6b4a39" dark={0.38} mid={0.22} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {[2.5, 8, 13.5, 19].map((x) => (
          <rect key={x} x={x} y={-H + 5} width="3.4" height={H - 11} rx="1" fill="#000" opacity="0.14" />
        ))}
        <rect x="0" y={-H + 2} width={face} height="1.6" fill="#fff" opacity="0.08" />
        {/* a brass footrail, which is most of what says "bar" */}
        <rect x="0" y="-5" width={face} height="1.6" rx="0.8" fill="#e8b04b" opacity="0.55" />
      </g>
      <g transform={`translate(0,${-H})`}>
        {/* the top runs past the front so people can sit at it */}
        <TintedBox
          gx={-0.05}
          gy={-0.05}
          dx={W + 0.1}
          dy={D + 0.28}
          h={3.5}
          fallback="#4a3a2c"
          tint={false}
          dark={0.26}
          mid={0.13}
        />
        {/* grain on the counter top — projection is linear, so translating
            the Planks group by the top's origin keeps them in grid space */}
        <g transform={`translate(${project(-0.05, -0.05).x}, ${project(-0.05, -0.05).y - 3.5})`}>
          <CafePlanks w={W + 0.1} d={D + 0.28} n={2} />
        </g>
      </g>
    </g>
  );
}

/** Chalkboard menu — a wall item, so it hangs above the bar. */
function MenuBoard() {
  const face = 1.8 * (TILE_W / 2);
  return (
    <g transform={`skewY(${SKEW})`}>
      <rect x="0" y="-98" width={face} height="35" rx="1.5" style={tinted("#6b4a39")} />
      <rect x="0" y="-98" width={face} height="35" rx="1.5" fill="#000" opacity="0.16" />
      <rect x="2.2" y="-95.8" width={face - 4.4} height="30.6" fill="#2b2b26" />
      {/* heading, then items with prices ranged right */}
      <rect x="5" y="-92" width="17" height="2.6" rx="1.3" fill="#f7e9e2" opacity="0.85" />
      {[-85.5, -80.5, -75.5, -70.5].map((y, i) => (
        <g key={y}>
          <rect x="5" y={y} width={11 + (i % 3) * 5} height="1.7" rx="0.85" fill="#f7e9e2" opacity="0.42" />
          <rect x={face - 12} y={y} width="6.5" height="1.7" rx="0.85" fill="#e8b04b" opacity="0.6" />
        </g>
      ))}
    </g>
  );
}

function Till() {
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={0.5} dy={0.4} h={8} fallback="#3a3142" dark={0.32} mid={0.18} />
      <g transform="translate(0,-8)">
        <TintedBox gx={0.08} gy={0.05} dx={0.28} dy={0.28} h={7} fallback="#4a4152" tint={false} dark={0.3} mid={0.16} />
      </g>
      <g transform={`translate(${project(0, 0.4).x}, ${project(0, 0.4).y}) skewY(${SKEW})`}>
        <rect x="1.5" y="-6.5" width="6" height="4" rx="0.8" fill="#9db4e8" opacity="0.65" />
      </g>
    </g>
  );
}

/** Glass display case of cakes — sits on the bar top. */
function PastryCase() {
  const glass = isoBox(0.06, 0.06, 0.68, 0.38, 13);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={0.8} dy={0.5} h={4} fallback="#8f5d49" dark={0.34} mid={0.2} />
      <g transform="translate(0,-4)">
        {[
          [0.22, "#e8a3a8"],
          [0.42, "#e8b04b"],
          [0.62, "#cf8f93"],
        ].map(([gx, fill]) => {
          const p = project(gx, 0.25);
          return <ellipse key={gx} cx={p.x} cy={p.y - 3} rx="4.2" ry="2.8" fill={fill} />;
        })}
        <polygon points={glass.left} fill="#cbe8ef" opacity="0.2" />
        <polygon points={glass.right} fill="#cbe8ef" opacity="0.15" />
        <polygon points={glass.top} fill="#cbe8ef" opacity="0.26" />
        <polygon points={glass.top} fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.3" />
      </g>
    </g>
  );
}

export { BarCounter, CafeTable, CoffeeCounter, Counter, MenuBoard, PastryCase, Till };
