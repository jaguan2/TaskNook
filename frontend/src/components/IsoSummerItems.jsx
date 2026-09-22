import { floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";

// Summer is a whole activity zone rather than a colour swap: water to gather
// around, shade to sit under, and loose play pieces that make it inhabited.

export function SwimmingPool() {
  return (
    <g>
      <polygon points={floorPatch(0, 0, 3.5, 2.5)} fill="#e8dfcf" opacity="0.96" />
      <polygon points={floorPatch(0.18, 0.18, 3.14, 2.14)} fill="#55b8cf" opacity="0.92" />
      <polygon points={floorPatch(0.34, 0.34, 2.82, 1.82)} fill="#80d4df" opacity="0.62" />
      {[0.65, 1.35].map((gy) => (
        <path key={gy} className="pond-ripple" d={`M${project(0.65, gy).x} ${project(0.65, gy).y} Q${project(1.75, gy - 0.18).x} ${project(1.75, gy - 0.18).y} ${project(2.8, gy).x} ${project(2.8, gy).y}`} fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.46" />
      ))}
      <g fill="none" stroke="#d7dce0" strokeWidth="2.2" strokeLinecap="round">
        <path d={`M${project(0.35, 0.55).x} ${project(0.35, 0.55).y - 13} v13 M${project(0.55, 0.75).x} ${project(0.55, 0.75).y - 13} v13`} />
        <path d={`M${project(0.35, 0.55).x} ${project(0.35, 0.55).y - 13} Q${project(0.45, 0.65).x} ${project(0.45, 0.65).y - 18} ${project(0.55, 0.75).x} ${project(0.55, 0.75).y - 13}`} />
      </g>
    </g>
  );
}

export function CoconutPalm() {
  const c = project(0.75, 0.75);
  return (
    <g>
      <path d={`M${c.x - 5} ${c.y} Q${c.x - 10} ${c.y - 46} ${c.x + 3} ${c.y - 78} L${c.x + 9} ${c.y - 76} Q${c.x - 2} ${c.y - 44} ${c.x + 5} ${c.y} Z`} style={tinted("#9b6c43")} />
      {[18, 74, 132, 190, 244, 306].map((a) => (
        <g key={a} transform={`translate(${c.x + 5},${c.y - 78}) rotate(${a})`}>
          {/* Animation owns transform, so it needs its own wrapper or it
              erases the rotation that fans the canopy out. */}
          <g className="room-sway">
            <path d="M0 0 Q17 -9 34 0 Q17 5 0 0 Z" fill="#3f7d55" />
            <path d="M2 0 Q18 -2 32 0" fill="none" stroke="#79a56f" strokeWidth="1.2" />
          </g>
        </g>
      ))}
      <circle cx={c.x} cy={c.y - 75} r="4" fill="#6f4931" /><circle cx={c.x + 7} cy={c.y - 73} r="4" fill="#795037" />
    </g>
  );
}

export function PoolUmbrella() {
  const c = project(0.75, 0.75);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="9" ry="3.5" fill="#000" opacity="0.14" />
      <path d="M0 -3 L0 -57" stroke="#ddd5c7" strokeWidth="2.4" />
      <path d="M-31 -55 Q0 -79 31 -55 Q15 -47 0 -55 Q-15 -47 -31 -55 Z" style={tinted("#e47762")} />
      <path d="M0 -75 Q16 -70 31 -55 Q15 -47 0 -55 Z" fill="#fff" opacity="0.34" />
      <path d="M-31 -55 Q0 -79 31 -55" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.35" />
      <circle cx="0" cy="-76" r="2" fill="#d8cdbb" />
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
  return (
    <g>
      <path d={`M${a.x} ${a.y - 12} L${b.x} ${b.y - 12} L${c.x} ${c.y - 12} L${d.x} ${d.y - 12} Z`} style={tinted("#6fb8cf")} />
      <path d={`M${a.x} ${a.y - 12} L${d.x} ${d.y - 12} L${d.x - 13} ${d.y - 40} L${a.x - 13} ${a.y - 40} Z`} style={tinted("#6fb8cf")} />
      <path d={`M${a.x - 13} ${a.y - 40} L${d.x - 13} ${d.y - 40}`} stroke="#fff" strokeWidth="1.2" opacity="0.42" />
      <path d={`M${a.x} ${a.y - 12} v13 M${b.x} ${b.y - 12} v13 M${c.x} ${c.y - 12} v13`} stroke="#8b765d" strokeWidth="2.4" />
      {[0.35, 0.75, 1.15].map((gx) => {
        const p = project(gx, 0.1);
        const q = project(gx, 0.75);
        return <path key={gx} d={`M${p.x} ${p.y - 12} L${q.x} ${q.y - 12}`} stroke="#fff" strokeWidth="1.1" opacity="0.3" />;
      })}
    </g>
  );
}

