import { project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { PlantPot } from "./IsoPlantItems";
import { TintedBox } from "./IsoItemPrimitives";

// Smaller harvest-season objects live apart from the autumn anchors. The
// maple, scarecrow and cornstalk bundle establish a landscape; these pieces
// fill porch, table and garden-edge roles without turning IsoAutumnItems into
// another all-purpose catalog module.

export function LeafWheelbarrow() {
  const c = project(0.58, 0.38);
  const leaves = [
    [-10, -25, -18, "#b34f35"], [-2, -30, 12, "#d18a3c"],
    [7, -27, -8, "#c35e36"], [13, -22, 20, "#e0a34a"],
  ];
  return <g transform={`translate(${c.x},${c.y})`} data-harvest-structure="leaf-wheelbarrow">
    <ellipse cx="-10" cy="1" rx="10" ry="4" fill="#000" opacity="0.15" />
    <circle data-seasonal-part="wheel" cx="-15" cy="-5" r="8" fill="#453a3b" />
    <circle cx="-15" cy="-5" r="4.2" fill="#a87f5f" />
    <circle cx="-15" cy="-5" r="1.7" fill="#453a3b" />
    <path d="M-18 -28 Q-4 -34 17 -25 L12 -10 Q0 -4 -14 -11 Z" style={tinted("#71805c")} />
    <path d="M-14 -11 Q0 -4 12 -10 L9 -6 Q-1 -1 -13 -7 Z" fill="#000" opacity="0.22" />
    <path d="M-18 -28 Q-4 -34 17 -25" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.16" />
    {leaves.map(([x, y, turn, fill]) => <g key={`${x}-${y}`} data-seasonal-part="barrow-leaf"
      transform={`translate(${x},${y}) rotate(${turn})`}>
      <path d="M-7 0 Q-4 -6 0 -3 Q4 -7 7 0 Q3 5 0 8 Q-3 5 -7 0 Z" fill={fill} />
      <path d="M0 -2 L0 9" stroke="#6f3828" strokeWidth="0.8" opacity="0.55" />
    </g>)}
    <path d="M10 -10 L31 0 M13 -15 L34 -5" fill="none" stroke="#765039" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M5 -8 L12 2" stroke="#765039" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M30 0 l5 0 M33 -5 l5 0" stroke="#4e332c" strokeWidth="3.4" strokeLinecap="round" />
  </g>;
}

const MumBloom = ({ x, y, color, scale = 1 }) => <g transform={`translate(${x},${y}) scale(${scale})`}
  data-seasonal-part="mum-bloom">
  {[0, 60, 120].map((angle) => <ellipse key={angle} cx="0" cy="0" rx="5.2" ry="2.4"
    transform={`rotate(${angle})`} fill={color} />)}
  <circle r="2.1" fill="#d8a94f" />
</g>;

export function MumPlanter() {
  const c = project(0.3, 0.3);
  return <g data-harvest-structure="mum-planter">
    <PlantPot foot={0.6} h={12} fallback="#9b5d42" rim={3} />
    <g transform={`translate(${c.x},${c.y - 12})`}>
      <g fill="none" stroke="#556b42" strokeWidth="1.4" strokeLinecap="round">
        <path d="M0 0 L-10 -20 M0 0 L0 -26 M0 0 L10 -21 M-2 -5 L-16 -12 M3 -6 L16 -13" />
      </g>
      <path d="M-3 -5 Q-14 -16 -16 -9 Q-13 -3 -3 -5 M3 -5 Q14 -16 16 -9 Q13 -3 3 -5" fill="#65784a" />
      <MumBloom x={-11} y={-21} color="#b44f43" />
      <MumBloom x={0} y={-27} color="#d18a3c" scale={1.08} />
      <MumBloom x={11} y={-22} color="#c45d49" />
      <MumBloom x={-17} y={-13} color="#d8a34d" scale={0.86} />
      <MumBloom x={17} y={-14} color="#9f493e" scale={0.88} />
    </g>
  </g>;
}

export function HarvestBasket() {
  const c = project(0.35, 0.28);
  return <g transform={`translate(${c.x},${c.y})`} data-harvest-structure="gourd-basket">
    <ellipse cx="0" cy="0" rx="15" ry="5" fill="#000" opacity="0.14" />
    <path d="M-15 -15 Q0 -7 15 -15 L12 -2 Q0 4 -12 -2 Z" style={tinted("#9b6a45")} />
    <path d="M-12 -2 Q0 4 12 -2 L10 1 Q0 6 -10 1 Z" fill="#000" opacity="0.2" />
    <path data-seasonal-part="basket-handle" d="M-11 -14 Q0 -36 11 -14" fill="none"
      stroke="#765039" strokeWidth="2.7" strokeLinecap="round" />
    <path d="M-15 -15 Q0 -8 15 -15" fill="none" stroke="#d5ad73" strokeWidth="2" />
    {[-8, -2, 5, 10].map((x) => <path key={x} d={`M${x} -12 L${x * 0.8} 0`}
      stroke="#6b4436" strokeWidth="1" opacity="0.45" />)}
    <g data-seasonal-part="basket-gourds">
      <ellipse cx="-7" cy="-15" rx="7" ry="5" fill="#c86b35" />
      <ellipse cx="2" cy="-18" rx="8" ry="6" fill="#d89c45" />
      <path d="M5 -16 Q13 -21 13 -13 Q12 -8 4 -10 Z" fill="#e2c878" />
      <path d="M-7 -20 l1 -4 M2 -24 l1 -4 M10 -18 l2 -3" stroke="#53663a" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  </g>;
}

export function AcornBowl() {
  const c = project(0.2, 0.18);
  const acorns = [[-5, -8, -16], [1, -10, 8], [6, -7, 24]];
  return <g transform={`translate(${c.x},${c.y})`} data-harvest-structure="acorn-bowl">
    <path d="M-11 -7 Q0 1 11 -7 L8 0 Q0 6 -8 0 Z" style={tinted("#b97955")} />
    <path d="M-8 0 Q0 6 8 0" fill="none" stroke="#000" strokeWidth="1" opacity="0.18" />
    <ellipse cx="0" cy="-7" rx="11" ry="4" fill="#000" opacity="0.12" />
    {acorns.map(([x, y, turn]) => <g key={x} transform={`translate(${x},${y}) rotate(${turn})`}
      data-seasonal-part="acorn">
      <ellipse cx="0" cy="1" rx="3.2" ry="4.4" fill="#9b633e" />
      <path d="M-3 -1 Q0 -5 3 -1 L2 1 Q0 0 -2 1 Z" fill="#5f4b34" />
      <path d="M0 -4 L1 -7" stroke="#5f4b34" strokeWidth="1.2" strokeLinecap="round" />
    </g>)}
  </g>;
}

export function HarvestSign() {
  const post = project(0.33, 0.23);
  return <g data-harvest-structure="harvest-sign">
    <TintedBox gx={0.28} gy={0.18} dx={0.1} dy={0.1} h={43} fallback="#79513b" dark={0.36} mid={0.2} />
    <g transform={`translate(${post.x},${post.y - 43})`}>
      <path data-seasonal-part="sign-board" d="M-17 -8 L15 -8 L18 7 L-14 9 Q-19 1 -17 -8 Z"
        style={tinted("#9b6a45")} />
      <path d="M-15 -6 L13 -6" stroke="#fff" strokeWidth="1" opacity="0.15" />
      <path d="M-11 0 L6 0 M-8 4 L10 4" stroke="#4e332c" strokeWidth="1.5" strokeLinecap="round" opacity="0.62" />
      <path d="M12 -3 Q16 -7 19 -3 Q16 1 12 -3 Z" fill="#c86539" />
    </g>
    <path d={`M${post.x - 8} ${post.y} Q${post.x} ${post.y + 4} ${post.x + 8} ${post.y}`}
      fill="#000" opacity="0.14" />
  </g>;
}

export function CiderSet() {
  const c = project(0.28, 0.22);
  return <g transform={`translate(${c.x},${c.y})`} data-harvest-structure="cider-set">
    <ellipse cx="-3" cy="0" rx="14" ry="4" fill="#000" opacity="0.12" />
    <path d="M-8 -4 Q-11 -12 -7 -19 L-4 -23 L5 -23 L8 -19 Q11 -10 7 -3 Q0 1 -8 -4 Z"
      style={tinted("#d4b28a")} />
    <ellipse cx="0" cy="-22.5" rx="4.8" ry="2" fill="#fff" opacity="0.2" />
    <path data-seasonal-part="jug-handle" d="M7 -18 Q17 -17 14 -9 Q12 -5 8 -7" fill="none"
      style={{ stroke: "var(--tint, #d4b28a)" }} strokeWidth="3" strokeLinecap="round" />
    <path d="M-8 -10 Q0 -6 8 -10" fill="none" stroke="#b86a38" strokeWidth="2.2" opacity="0.72" />
    {[[-12, -1], [12, 0]].map(([x, y]) => <g key={x} transform={`translate(${x},${y})`}
      data-seasonal-part="cider-cup">
      <path d="M-4 -8 L4 -8 L3 0 Q0 2 -3 0 Z" fill="#b86a38" />
      <ellipse cx="0" cy="-8" rx="4" ry="1.8" fill="#e0a24d" />
      <path d="M4 -6 Q9 -5 6 -1" fill="none" stroke="#b86a38" strokeWidth="1.7" strokeLinecap="round" />
    </g>)}
  </g>;
}
