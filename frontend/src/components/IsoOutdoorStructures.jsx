import { useId } from "react";
import { floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { TintedBox } from "./IsoItemPrimitives";

// Built outdoor pieces: places to rest, gather and light a path. Planted
// scenery stays in IsoOutdoorItems so a later structure pass does not turn
// the foliage module into another mixed registry.

export function Picnic() {
  const clothClipId = useId();
  const edge = [
    [0.04, 0.08], [0.74, 0.02], [1.42, 0.06], [1.96, 0.18],
    [1.98, 1.14], [1.83, 1.46], [1.08, 1.48], [0.42, 1.43],
    [0.02, 1.28], [0.06, 0.62],
  ];
  const points = (dx = 0, dy = 0) => edge.map(([gx, gy]) => project(gx + dx, gy + dy))
    .map(({ x, y }) => `${x},${y}`).join(" ");
  const fold = [[1.72, 1.43], [1.98, 1.14], [1.77, 1.18]].map(([gx, gy]) => project(gx, gy))
    .map(({ x, y }) => `${x},${y}`).join(" ");
  return (
    <g data-ground-material="picnic-cloth">
      <defs>
        <clipPath id={clothClipId}>
          <polygon points={points()} />
        </clipPath>
      </defs>
      <polygon points={points(0.03, 0.06)} fill="#000" opacity="0.16" />
      <polygon points={points()} style={tinted("#d98a93")} opacity="0.88" />
      <g data-ground-part="checks" clipPath={`url(#${clothClipId})`}>
        {[0, 1, 2, 3].map((i) =>
          [0, 1, 2].map((j) =>
            (i + j) % 2 === 0 ? (
              <polygon key={`${i}-${j}`} points={floorPatch(i * 0.5, j * 0.5, 0.5, 0.5)}
                fill="#fff" opacity="0.22" />
            ) : null
          )
        )}
      </g>
      <polygon data-ground-part="binding" points={points()} fill="none"
        stroke="#f7e9e2" strokeWidth="1.6" opacity="0.38" strokeLinejoin="round" />
      <polygon data-ground-part="gathered-corner" points={fold} fill="#000" opacity="0.18" />
      {[0.35, 0.7, 1.05].map((gy) => {
        const start = project(0.03, gy);
        const end = project(-0.08, gy + 0.04);
        return <line key={gy} x1={start.x} y1={start.y} x2={end.x} y2={end.y}
          stroke="#f7e9e2" strokeWidth="1" opacity="0.45" strokeLinecap="round" />;
      })}
    </g>
  );
}

export function Bench({ back = false }) {
  const restGy = back ? 0.49 : 0.02;
  const rest = <g>
    {[0.1, 1.4].map((gx) => <TintedBox key={gx} gx={gx} gy={restGy}
      dx={0.1} dy={0.09} h={31} fallback="#6b4a39" tint={false} dark={0.4} mid={0.22} />)}
    {[20, 25, 30].map((h) => <g key={h} transform={`translate(0,${-h})`}>
      <TintedBox gx={0.04} gy={restGy} dx={1.52} dy={0.09} h={3.2}
        fallback="#8f5d49" dark={0.34} mid={0.18} />
    </g>)}
  </g>;
  const braceStart = project(0.22, 0.46);
  const braceEnd = project(1.38, 0.1);
  return <g data-outdoor-structure="bench">
    {!back && rest}
    {[[0.12, 0.08], [1.38, 0.08], [0.12, 0.43], [1.38, 0.43]].map(([gx, gy]) =>
      <TintedBox key={`${gx}-${gy}`} gx={gx} gy={gy} dx={0.1} dy={0.1} h={14}
        fallback="#6b4a39" tint={false} dark={0.4} mid={0.22} />)}
    <g transform="translate(0,-10)">
      <TintedBox gx={0.1} gy={0.43} dx={1.4} dy={0.09} h={3}
        fallback="#6b4a39" tint={false} dark={0.4} mid={0.22} />
    </g>
    <g data-outdoor-part="joinery" fill="none" stroke="#5a3b30" strokeLinecap="round">
      <path d={`M${braceStart.x} ${braceStart.y - 2} L${braceEnd.x} ${braceEnd.y - 12}`}
        strokeWidth="2.2" opacity="0.72" />
      {[project(0.16, 0.48), project(1.44, 0.48)].map((p, index) => (
        <circle key={index} cx={p.x} cy={p.y - 15} r="1.4" fill="#d3a969"
          stroke="#5a3b30" strokeWidth="0.7" />
      ))}
    </g>
    <g transform="translate(0,-14)">
      {[0.04, 0.22, 0.4].map((gy) => <TintedBox key={gy} gx={0} gy={gy} dx={1.6} dy={0.15} h={2}
        fallback="#a87f5f" dark={0.3} mid={0.16} />)}
    </g>
    {back && rest}
  </g>;
}

export function Log() {
  const c = project(0.7, 0.35);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-outdoor-structure="log">
      <ellipse cx="0" cy="0" rx="23" ry="5.5" fill="#000" opacity="0.14" />
      {/* Unequal top and lower bark edges keep the trunk from reading as a
          rounded rectangle. The cut face sits proud at the camera-left end. */}
      <path d="M-20 -7 Q-17 -15 -10 -13 Q-2 -16 5 -13 Q13 -15 20 -10
        L21 -4 Q15 1 7 -1 Q0 2 -8 0 Q-16 2 -21 -3 Z" style={tinted("#8f5d49")} />
      <path d="M-21 -3 Q-16 2 -8 0 Q0 2 7 -1 Q15 1 21 -4 L19 0
        Q7 5 -4 3 Q-15 5 -21 -1 Z" fill="#000" opacity="0.2" />
      <path d="M4 -13 Q8 -19 12 -16 L10 -11 Z" style={tinted("#8f5d49")} />
      <path d="M8 -16 Q10 -18 12 -16" fill="none" stroke="#c9a06f" strokeWidth="1" opacity="0.7" />
      <g data-outdoor-part="end-grain">
        <path d="M-21 -3 Q-24 -7 -21 -12 Q-18 -16 -15 -11 Q-13 -6 -16 -2 Q-18 0 -21 -3 Z"
          fill="#c9a06f" />
        <path d="M-20 -4 Q-22 -7 -20 -11 Q-18 -13 -16 -10 Q-15 -6 -17 -3"
          fill="none" stroke="#8f5d49" strokeWidth="1" />
        <path d="M-19 -5 Q-20 -7 -19 -9" fill="none" stroke="#7b4f3e" strokeWidth="1" />
      </g>
      {[-8, 3, 15].map((x, index) => (
        <path key={x} d={`M${x} ${-12 + index} q${index % 2 ? -2 : 2} 5 0 10`}
          stroke="#4e332c" strokeWidth="1" fill="none" opacity="0.32" strokeLinecap="round" />
      ))}
      <ellipse cx="3" cy="-7" rx="2.4" ry="1.7" fill="#4e332c" opacity="0.54" />
      <ellipse cx="2.7" cy="-7.3" rx="1" ry="0.7" fill="#c9a06f" opacity="0.38" />
    </g>
  );
}

/** Garden hammock slung between two posts. `lie` seating, so a resident
 * dropped on it stretches out instead of perching. */
export function Hammock() {
  const H = 40;
  const left = project(0.18, 0.45);
  const right = project(2.02, 0.45);
  const fabricLeft = { x: left.x + 8, y: left.y - H + 11 };
  const fabricRight = { x: right.x - 8, y: right.y - H + 11 };
  const middleX = (fabricLeft.x + fabricRight.x) / 2;
  const middleY = (fabricLeft.y + fabricRight.y) / 2;
  return (
    <g data-outdoor-structure="hammock">
      {[left, right].map((p, i) => (
        <g key={i} data-outdoor-part="post">
          <ellipse cx={p.x} cy={p.y} rx="7" ry="3.3" fill="#000" opacity="0.18" />
          <path d={`M${p.x - 2.8} ${p.y} L${p.x - 2.1} ${p.y - H}
            L${p.x + 2.5} ${p.y - H} L${p.x + 3.2} ${p.y} Z`} fill="#8f5d49" />
          <path d={`M${p.x} ${p.y} L${p.x + 0.4} ${p.y - H} L${p.x + 2.5} ${p.y - H}
            L${p.x + 3.2} ${p.y} Z`} fill="#000" opacity={i ? 0.28 : 0.16} />
          <ellipse cx={p.x + 0.2} cy={p.y - H} rx="3.2" ry="1.5" fill="#b98d68" />
        </g>
      ))}
      <g data-outdoor-part="rope" fill="none" stroke="#d9c19a" strokeLinecap="round">
        <path d={`M${left.x} ${left.y - H + 1} L${fabricLeft.x} ${fabricLeft.y}`} strokeWidth="1.8" />
        <path d={`M${right.x} ${right.y - H + 1} L${fabricRight.x} ${fabricRight.y}`} strokeWidth="1.8" />
        <circle cx={left.x} cy={left.y - H + 1} r="2.1" strokeWidth="1.2" />
        <circle cx={right.x} cy={right.y - H + 1} r="2.1" strokeWidth="1.2" />
      </g>
      <path data-outdoor-part="sling" d={`M${fabricLeft.x} ${fabricLeft.y}
          Q${middleX} ${middleY + 20} ${fabricRight.x} ${fabricRight.y}
          L${fabricRight.x} ${fabricRight.y + 8} Q${middleX} ${middleY + 31} ${fabricLeft.x} ${fabricLeft.y + 8} Z`}
        style={tinted("#c98a4b")} />
      <path d={`M${fabricLeft.x} ${fabricLeft.y + 8} Q${middleX} ${middleY + 31} ${fabricRight.x} ${fabricRight.y + 8}`}
        fill="none" stroke="#000" opacity="0.22" strokeWidth="2.5" />
      {[0.25, 0.4, 0.55, 0.7].map((t) => {
        const x = fabricLeft.x + (fabricRight.x - fabricLeft.x) * t;
        const sag = 20 * Math.sin(Math.PI * t);
        const y = fabricLeft.y + (fabricRight.y - fabricLeft.y) * t + sag;
        return <line key={t} x1={x} y1={y} x2={x} y2={y + 7} stroke="#f7e9e2" strokeWidth="1.1" opacity="0.3" />;
      })}
    </g>
  );
}

/** Garden lantern: post and a glazed head. The scene owns its light pool. */
export function GardenLantern() {
  const c = project(0.25, 0.25);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="6.5" ry="3.2" fill="#2f2540" />
      <rect x="-1.8" y="-34" width="3.6" height="33" style={tinted("#2f2540")} />
      <rect x="-1.8" y="-34" width="3.6" height="33" fill="#000" opacity="0.2" />
      <path d="M-7 -34 L7 -34 L5.5 -48 L-5.5 -48 z" fill="#ffe9b0" opacity="0.85"
        className="room-breathe" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      <path d="M-7 -34 L7 -34 L5.5 -48 L-5.5 -48 z" fill="none"
        style={{ stroke: "var(--tint, #2f2540)" }} strokeWidth="1.6" />
      <line x1="0" y1="-34" x2="0" y2="-48" style={{ stroke: "var(--tint, #2f2540)" }}
        strokeWidth="1.1" opacity="0.8" />
      <path d="M-8.5 -48 L8.5 -48 L0 -55 z" style={tinted("#2f2540")} />
      <path d="M-8.5 -48 L8.5 -48 L0 -55 z" fill="#000" opacity="0.15" />
      <circle cx="0" cy="-56" r="1.6" style={tinted("#2f2540")} />
    </g>
  );
}
