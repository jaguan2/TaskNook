import { TILE_H, TILE_W, project, isoBox, floorPatch } from "../lib/iso";

// Sprites for the isometric room. Each is drawn for its footprint anchored at
// grid (0,0) — the scene places it with translate(project(gx,gy)), which
// works because the projection is linear. Main materials use
// `var(--tint, <classic colour>)` exactly like the flat room's sprites.

const SKEW = (Math.atan(TILE_H / TILE_W) * 180) / Math.PI;
const tinted = (fallback) => ({ fill: `var(--tint, ${fallback})` });

function Rug() {
  return (
    <g>
      <polygon points={floorPatch(0, 0, 3.5, 2.5)} style={tinted("rgb(var(--color-rose))")} opacity="0.4" />
      <polygon
        points={floorPatch(0.25, 0.2, 3, 2.1)}
        fill="none"
        style={{ stroke: "rgb(var(--color-petal))" }}
        strokeWidth="2"
        opacity="0.3"
      />
    </g>
  );
}

function Desk() {
  const b = { top: "#caa07f", left: "#a87f5f", right: "#8f5d49" };
  const box = isoBox(0, 0, 2.5, 1.05, 40);
  return (
    <g>
      <polygon points={box.left} fill={b.left} />
      <polygon points={box.right} fill={b.right} />
      <polygon points={box.top} fill={b.top} />
      <g transform="translate(0,-40)">
        <ellipse cx={project(1.3, 0.55).x} cy={project(1.3, 0.55).y} rx="42" ry="11" fill="url(#lampPool)" opacity="0.4" />
        {(() => {
          const m = isoBox(0.7, 0.18, 1.2, 0.28, 30);
          return (
            <g transform="translate(0,-4)">
              <polygon points={m.left} fill="#2c2438" />
              <polygon points={m.right} fill="#241d33" />
              <polygon points={m.top} fill="#201a30" />
              <g transform={`translate(${project(0.7, 0.46).x}, ${project(0.7, 0.46).y - 34}) skewY(${SKEW})`}>
                <rect x="2" y="0" width="52" height="26" rx="2" fill="url(#isoScreen)" />
                <circle cx="7" cy="6" r="1.8" fill="#7faf8f" />
                <rect x="11" y="4.5" width="24" height="2.6" rx="1.3" fill="#f3c6c0" opacity="0.75" />
                <circle cx="7" cy="12" r="1.8" fill="none" stroke="#f3c6c0" strokeWidth="0.8" opacity="0.5" />
                <rect x="11" y="10.5" width="30" height="2.6" rx="1.3" fill="#f3c6c0" opacity="0.45" />
                <rect x="6" y="19" width="26" height="2.6" rx="1.3" fill="#7faf8f" opacity="0.9" />
              </g>
            </g>
          );
        })()}
        {(() => {
          const mug = isoBox(2.15, 0.35, 0.24, 0.24, 10);
          return (
            <g>
              <polygon points={mug.left} fill="#d98a93" />
              <polygon points={mug.right} fill="#c47882" />
              <polygon points={mug.top} fill="#e8a3a8" />
            </g>
          );
        })()}
        {(() => {
          const b1 = isoBox(0.15, 0.3, 0.55, 0.4, 5);
          const b2 = isoBox(0.2, 0.33, 0.45, 0.34, 4);
          return (
            <g>
              <polygon points={b1.left} fill="#8a7ac2" />
              <polygon points={b1.right} fill="#7568ad" />
              <polygon points={b1.top} fill="#9b8bd6" />
              <g transform="translate(0,-5)">
                <polygon points={b2.left} fill="#d98a93" />
                <polygon points={b2.right} fill="#c47882" />
                <polygon points={b2.top} fill="#e8a3a8" />
              </g>
            </g>
          );
        })()}
      </g>
    </g>
  );
}

function Stool() {
  const box = isoBox(0, 0, 0.8, 0.8, 20);
  return (
    <g>
      <polygon points={box.left} fill="#a87f5f" />
      <polygon points={box.right} fill="#8f5d49" />
      <polygon points={box.top} style={tinted("#d98a93")} />
    </g>
  );
}

function Bookshelf() {
  const box = isoBox(0, 0, 1.5, 0.7, 86);
  return (
    <g>
      <polygon points={box.left} style={tinted("#a87f5f")} />
      <polygon points={box.right} fill="#8f5d49" />
      <polygon points={box.top} fill="#b58c6a" />
      <g transform={`translate(${project(0, 0.7).x}, ${project(0, 0.7).y}) skewY(${SKEW})`}>
        {[[4, -78, "#7faf8f"], [11, -80, "#e8a3a8"], [18, -76, "#9b8bd6"], [27, -79, "#e8b04b"], [4, -46, "#cf8f93"], [12, -44, "#5b6b9b"], [20, -47, "#e8b04b"]].map(([x, y, c], i) => (
          <rect key={i} x={x} y={y} width="6" height={y < -60 ? -60 - y : -28 - y} rx="1" fill={c} />
        ))}
        <rect x="0" y="-60" width="34" height="3" fill="#8f5d49" />
        <rect x="0" y="-28" width="34" height="3" fill="#8f5d49" />
      </g>
    </g>
  );
}

function PlantBase({ foot, potH, leaves }) {
  const box = isoBox(0, 0, foot, foot, potH);
  const c = project(foot / 2, foot / 2);
  return (
    <g>
      {/* pot faces: the tint everywhere, shaded with translucent black
          overlays so ANY chosen colour keeps correct depth */}
      <polygon points={box.left} style={tinted("#c0563f")} />
      <polygon points={box.left} fill="#000" opacity="0.2" />
      <polygon points={box.right} style={tinted("#c0563f")} />
      <polygon points={box.right} fill="#000" opacity="0.32" />
      <polygon points={box.top} style={tinted("#c0563f")} />
      <g transform={`translate(${c.x}, ${c.y - potH})`}>
        <g className="room-sway">{leaves}</g>
      </g>
    </g>
  );
}

function Monstera() {
  return (
    <PlantBase
      foot={0.8}
      potH={16}
      leaves={
        <>
          <path d="M-4 -6 q-24 -10 -24 -38 q17 0 24 15 z" fill="#3f7f63" />
          <path d="M4 -6 q24 -12 22 -42 q-17 2 -24 19 z" fill="#56a07c" />
          <path d="M0 -4 q-4 -32 6 -54 q11 17 4 42 z" fill="#3f7f63" />
        </>
      }
    />
  );
}

function Plant() {
  return (
    <PlantBase
      foot={0.6}
      potH={12}
      leaves={
        <path
          d="M-2 -2 q-9 -22 -2 -36 q5 10 8 13 q-6 -15 1 -26 q4 15 8 18 q0 -12 5 -18 q2 18 -3 32 q-3 13 -10 17 z"
          fill="#3f7f63"
        />
      }
    />
  );
}

function FloorLamp() {
  const c = project(0.4, 0.4);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="14" rx="32" ry="11" fill="url(#lampPool)" className="room-breathe" opacity="0.5" />
      <ellipse cx="0" cy="0" rx="11" ry="4.5" fill="#3a3142" />
      <line x1="0" y1="-2" x2="0" y2="-82" stroke="#3a3142" strokeWidth="3.5" />
      <polygon points="-14,-82 14,-82 9,-104 -9,-104" style={tinted("#e8b04b")} stroke="rgba(0,0,0,0.28)" />
      <circle cx="0" cy="-78" r="4.5" fill="#ffe9b0" opacity="0.6" />
    </g>
  );
}

function Cat() {
  const c = project(0.6, 0.4);
  return (
    <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
      <ellipse cx="0" cy="2" rx="26" ry="9" fill="#000" opacity="0.2" />
      <ellipse cx="0" cy="-6" rx="24" ry="12" style={tinted("#3a3142")} />
      <circle cx="-16" cy="-13" r="8" style={tinted("#3a3142")} />
      <polygon points="-22,-18 -19,-26 -15,-19" style={tinted("#3a3142")} />
      <polygon points="-12,-20 -8,-27 -5,-19" style={tinted("#3a3142")} />
      <path d="M22 -8 q11 -2 9 -12" fill="none" style={{ stroke: "var(--tint, #3a3142)" }} strokeWidth="4.5" strokeLinecap="round" />
    </g>
  );
}

export const ISO_SPRITES = {
  rug: Rug,
  desk: Desk,
  stool: Stool,
  bookshelf: Bookshelf,
  monstera: Monstera,
  plant: Plant,
  floorlamp: FloorLamp,
  cat: Cat,
};
