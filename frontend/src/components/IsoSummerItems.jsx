import { project } from "../lib/iso";
import { tinted } from "../lib/tint";

export { LongSwimmingPool, SwimmingPool } from "./IsoWaterItems";

// Summer is a whole activity zone rather than a colour swap: water to gather
// around, shade to sit under, and loose play pieces that make it inhabited.

function PalmFrond({ angle, length, drop, rise, spread, color, rear = false }) {
  const leaflets = [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82];
  const blades = leaflets.map((t, index) => {
    const x = length * t;
    const y = drop * t - Math.sin(Math.PI * t) * rise;
    const reach = (13 - index * 0.65) * spread;
    const lift = 9.5 - index * 0.48;
    return `M${x} ${y} Q${x + reach * 0.48} ${y - lift} ${x + reach} ${y - lift * 0.9}
      Q${x + reach * 0.58} ${y - 1} ${x} ${y} Z
      M${x} ${y} Q${x + reach * 0.52} ${y + lift * 0.78} ${x + reach} ${y + lift * 0.82}
      Q${x + reach * 0.52} ${y + 1} ${x} ${y} Z`;
  }).join(" ");
  return (
    <g transform={`rotate(${angle})`} opacity={rear ? 0.86 : 1}>
      <path d={`M0 0 Q${length * 0.45} ${drop - rise} ${length} ${drop}`}
        fill="none" stroke={rear ? "#315f45" : "#38684b"} strokeWidth="2.1" strokeLinecap="round" />
      <path d={`${blades}
        M${length * 0.82} ${drop * 0.82 - 4} Q${length} ${drop - 4} ${length + 5} ${drop}
        Q${length} ${drop + 4} ${length * 0.82} ${drop * 0.82 - 4} Z`} fill={color} />
    </g>
  );
}

export function CoconutPalm() {
  const c = project(0.75, 0.75);
  const fronds = [
    { angle: -155, length: 38, drop: 7, rise: 6, spread: 0.84, color: "#315f45", rear: true },
    { angle: -70, length: 42, drop: 10, rise: 6, spread: 0.88, color: "#376a4b", rear: true },
    { angle: 35, length: 39, drop: 8, rise: 7, spread: 0.84, color: "#315f45", rear: true },
    { angle: -178, length: 47, drop: 13, rise: 9, spread: 1.08, color: "#3a704e" },
    { angle: -125, length: 50, drop: 16, rise: 11, spread: 1.12, color: "#4a895e" },
    { angle: -62, length: 49, drop: 12, rise: 9, spread: 1.08, color: "#36734f" },
    { angle: 2, length: 48, drop: 11, rise: 8, spread: 1.06, color: "#4b8d60" },
    { angle: 67, length: 49, drop: 17, rise: 10, spread: 1.14, color: "#43845a" },
    { angle: 138, length: 47, drop: 14, rise: 9, spread: 1.08, color: "#3f7d55" },
  ];
  return (
    <g data-tree="coconut-palm">
      <path d={`M${c.x - 6} ${c.y} Q${c.x - 10} ${c.y - 44} ${c.x + 2} ${c.y - 79}
        L${c.x + 9} ${c.y - 77} Q${c.x - 1} ${c.y - 43} ${c.x + 6} ${c.y} Z`}
        style={tinted("#9b6c43")} />
      <path d={`M${c.x + 2} ${c.y - 8} Q${c.x - 3} ${c.y - 43} ${c.x + 5} ${c.y - 73}`}
        fill="none" stroke="#d2a066" strokeWidth="1.2" opacity="0.42" />
      {[18, 31, 44, 58].map((lift, index) => (
        <path key={lift} d={`M${c.x - 2 + index * 0.6} ${c.y - lift}
          Q${c.x + 4} ${c.y - lift - 2} ${c.x + 7 - index * 0.3} ${c.y - lift - 1}`}
          fill="none" stroke="#6f4931" strokeWidth="1" opacity="0.42" />
      ))}
      <g transform={`translate(${c.x + 5},${c.y - 79})`}>
        <g className="room-sway">
          {fronds.map((frond) => <PalmFrond key={frond.angle} {...frond} />)}
          <path d="M-12 3 Q0 -8 13 1 Q8 11 -2 12 Q-11 10 -12 3 Z" fill="#315f45" opacity="0.75" />
          <circle cx="-3" cy="3" r="4" fill="#6f4931" />
          <circle cx="4" cy="5" r="4.5" fill="#795037" />
          <circle cx="2" cy="-1" r="3.6" fill="#6a432d" />
        </g>
      </g>
    </g>
  );
}

export function PoolUmbrella() {
  const c = project(0.75, 0.75);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="1" rx="10" ry="3.8" fill="#000" opacity="0.14" />
      <ellipse cx="0" cy="-1.5" rx="8" ry="3.2" fill="#9f9384" />
      <ellipse cx="-1.5" cy="-2.4" rx="5.5" ry="1.7" fill="#fff" opacity="0.16" />
      <path d="M0 -3 L0 -58" stroke="#d8d1c6" strokeWidth="2.8" />
      <path d="M1.1 -3 L1.1 -58" stroke="#000" strokeWidth="1" opacity="0.18" />
      {/* A joined, scalloped canopy with four broad fabric panels. */}
      <path d="M-33 -56 Q-18 -76 0 -79 Q19 -76 33 -56
        Q25 -50 17 -55 Q9 -49 0 -55 Q-9 -49 -17 -55 Q-25 -50 -33 -56 Z"
        style={tinted("#e47762")} />
      <path d="M-33 -56 Q-18 -76 0 -79 Q-9 -64 -17 -55 Q-25 -50 -33 -56 Z"
        fill="#fff" opacity="0.25" />
      <path d="M0 -79 Q19 -76 33 -56 Q25 -50 17 -55 Q9 -64 0 -79 Z"
        fill="#000" opacity="0.13" />
      {/* Ribs meet at the underside hub, so the shade is supported rather
          than floating as one thin coloured sheet. */}
      <g fill="none" stroke="#756d66" strokeWidth="1.2" opacity="0.62">
        <path d="M0 -58 Q-11 -64 -17 -55" />
        <path d="M0 -58 Q11 -64 17 -55" />
        <path d="M0 -58 Q-22 -62 -33 -56" />
        <path d="M0 -58 Q22 -62 33 -56" />
      </g>
      <circle cx="0" cy="-58" r="2.2" fill="#8b8177" />
      <path d="M-33 -56 Q-18 -76 0 -79 Q19 -76 33 -56" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.3" />
      <circle cx="0" cy="-79" r="2" fill="#d8cdbb" />
    </g>
  );
}

export function BeachBall() {
  const c = project(0.3, 0.3);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="8" ry="3" fill="#000" opacity="0.14" />
      <circle cx="0" cy="-10" r="9" fill="#f7efe0" />
      <path d="M0 -19 Q8 -13 8 -5 Q1 -8 0 -10 Q-3 -15 0 -19 Z" fill="#e56e61" />
      <path d="M8 -5 Q0 -1 -7 -6 Q-2 -8 0 -10 Q5 -10 8 -5 Z" fill="#5eb4ce" />
      <path d="M-7 -6 Q-10 -14 0 -19 Q-1 -13 0 -10 Q-4 -9 -7 -6 Z" fill="#e7b84d" />
      <circle cx="0" cy="-10" r="2.2" fill="#fff" />
    </g>
  );
}

export function SunLounger() {
  const a = project(0.08, 0.1);
  const b = project(1.55, 0.1);
  const c = project(1.55, 0.75);
  const d = project(0.08, 0.75);
  const top = 18;
  return (
    <g>
      {/* Neutral frame first: two side rails, four planted legs and a visible
          reclining brace. The selected tint belongs to the sling, not metal. */}
      <g fill="none" stroke="#8b765d" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${a.x} ${a.y - top + 2} L${b.x} ${b.y - top + 2} L${c.x} ${c.y - top + 2}`} strokeWidth="3.2" />
        <path d={`M${d.x} ${d.y - top + 2} L${c.x} ${c.y - top + 2}`} strokeWidth="3.2" />
        <path d={`M${a.x} ${a.y - top + 2} L${a.x - 14} ${a.y - 47} L${d.x - 14} ${d.y - 47} L${d.x} ${d.y - top + 2}`} strokeWidth="3" />
        <path d={`M${a.x - 11} ${a.y - 43} L${a.x + 5} ${a.y - 8}`} strokeWidth="2" opacity="0.82" />
        <path d={`M${a.x} ${a.y - top + 1} V${a.y + 1} M${b.x} ${b.y - top + 1} V${b.y + 1}
          M${c.x} ${c.y - top + 1} V${c.y + 1} M${d.x} ${d.y - top + 1} V${d.y + 1}`} strokeWidth="2.8" />
      </g>
      {/* Tensioned fabric is inset from the rails and divided into broad
          stitched panels that remain visible at room scale. */}
      <path d={`M${a.x + 2} ${a.y - top} L${b.x - 2} ${b.y - top} L${c.x - 2} ${c.y - top} L${d.x + 2} ${d.y - top} Z`}
        style={tinted("#6fb8cf")} />
      <path d={`M${a.x + 1} ${a.y - top} L${d.x + 1} ${d.y - top} L${d.x - 12} ${d.y - 44} L${a.x - 12} ${a.y - 44} Z`}
        style={tinted("#6fb8cf")} />
      <path d={`M${a.x - 12} ${a.y - 44} L${d.x - 12} ${d.y - 44}`} stroke="#fff" strokeWidth="1.4" opacity="0.38" />
      {[0.4, 0.8, 1.2].map((gx) => {
        const p = project(gx, 0.1);
        const q = project(gx, 0.75);
        return <path key={gx} d={`M${p.x} ${p.y - top} L${q.x} ${q.y - top}`} stroke="#fff" strokeWidth="1.1" opacity="0.26" />;
      })}
      <circle cx={a.x} cy={a.y - top + 1} r="3" fill="#6f6255" />
      <circle cx={d.x} cy={d.y - top + 1} r="3" fill="#9b8973" />
      <circle cx={a.x - 0.7} cy={a.y - top} r="1" fill="#d9cbb8" />
      <circle cx={d.x - 0.7} cy={d.y - top} r="1" fill="#d9cbb8" />
    </g>
  );
}

