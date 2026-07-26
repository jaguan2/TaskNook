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
          const m = project(2.27, 0.47);
          return (
            <g>
              <polygon points={mug.left} fill="#d98a93" />
              <polygon points={mug.right} fill="#c47882" />
              <polygon points={mug.top} fill="#e8a3a8" />
              {/* steam curling off the coffee */}
              {[0, 1, 2].map((i) => (
                <circle
                  key={i}
                  className="steam-puff"
                  cx={m.x - 2 + i * 2.5}
                  cy={m.y - 12}
                  r={1.6 + (i % 2) * 0.6}
                  fill="#f7e9e2"
                  style={{ animationDelay: `${i * 1.1}s` }}
                />
              ))}
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

function Cat({ awake = false }) {
  const c = project(0.6, 0.4);
  if (awake) {
    // On the prowl: body up on legs, head high, tail curled skyward.
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
        <ellipse cx="0" cy="2" rx="22" ry="8" fill="#000" opacity="0.2" />
        <rect x="-14" y="-14" width="5" height="15" rx="2.4" style={tinted("#3a3142")} />
        <rect x="8" y="-14" width="5" height="15" rx="2.4" style={tinted("#3a3142")} />
        <ellipse cx="-1" cy="-18" rx="18" ry="9.5" style={tinted("#3a3142")} />
        <circle cx="-15" cy="-27" r="7.5" style={tinted("#3a3142")} />
        <polygon points="-21,-31 -19,-39 -14,-32" style={tinted("#3a3142")} />
        <polygon points="-12,-33 -8,-40 -5,-32" style={tinted("#3a3142")} />
        <circle cx="-17" cy="-27" r="0.9" fill="#ffe9b0" />
        <circle cx="-12" cy="-28" r="0.9" fill="#ffe9b0" />
        <path
          d="M15 -20 q10 -4 8 -18"
          fill="none"
          style={{ stroke: "var(--tint, #3a3142)" }}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    );
  }
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

function SquareRug() {
  return (
    <g>
      <polygon points={floorPatch(0, 0, 2.5, 2)} style={tinted("#8a7ac2")} opacity="0.38" />
      <polygon
        points={floorPatch(0.2, 0.18, 2.1, 1.64)}
        fill="none"
        style={{ stroke: "rgb(var(--color-petal))" }}
        strokeWidth="1.6"
        opacity="0.3"
      />
    </g>
  );
}

// Shaded box helper: every face gets the tint, with translucent black
// overlays for depth so ANY chosen colour reads correctly.
function TintedBox({ gx, gy, dx, dy, h, fallback, dark = 0.32, mid = 0.18 }) {
  const box = isoBox(gx, gy, dx, dy, h);
  return (
    <g>
      <polygon points={box.left} style={tinted(fallback)} />
      <polygon points={box.left} fill="#000" opacity={mid} />
      <polygon points={box.right} style={tinted(fallback)} />
      <polygon points={box.right} fill="#000" opacity={dark} />
      <polygon points={box.top} style={tinted(fallback)} />
    </g>
  );
}

function Sofa() {
  const f = "#b0687a";
  return (
    <g>
      {/* one low base, back INSET between the arms, cushions in front — the
          old stacked-slab version read as random boxes (user feedback) */}
      <TintedBox gx={0} gy={0} dx={2} dy={1} h={14} fallback={f} dark={0.4} mid={0.26} />
      <TintedBox gx={0.22} gy={0} dx={1.56} dy={0.3} h={44} fallback={f} />
      <TintedBox gx={0} gy={0} dx={0.26} dy={1} h={32} fallback={f} dark={0.36} mid={0.2} />
      <TintedBox gx={1.74} gy={0} dx={0.26} dy={1} h={32} fallback={f} dark={0.36} mid={0.2} />
      <TintedBox gx={0.24} gy={0.28} dx={0.74} dy={0.68} h={24} fallback={f} dark={0.26} mid={0.14} />
      <TintedBox gx={1.02} gy={0.28} dx={0.74} dy={0.68} h={24} fallback={f} dark={0.26} mid={0.14} />
      {/* soft top highlights so the cushions read plush */}
      <polygon points={floorPatch(0.3, 0.34, 0.6, 0.5)} transform="translate(0,-24)" fill="#fff" opacity="0.08" />
      <polygon points={floorPatch(1.08, 0.34, 0.6, 0.5)} transform="translate(0,-24)" fill="#fff" opacity="0.08" />
    </g>
  );
}

function CoffeeTable() {
  const A = project(0, 0);
  const B = project(1.4, 0);
  const C = project(1.4, 0.9);
  const D = project(0, 0.9);
  const up = (p, h) => `${p.x},${p.y - h}`;
  const legs = [project(0.18, 0.16), project(1.22, 0.16), project(1.22, 0.74), project(0.18, 0.74)];
  return (
    <g>
      {legs.map((p, i) => (
        <line key={i} x1={p.x} y1={p.y} x2={p.x} y2={p.y - 20} stroke="#6b4a39" strokeWidth="3" />
      ))}
      {/* slab top with a thin skirt, not a solid crate */}
      <polygon points={`${up(D, 26)} ${up(C, 26)} ${up(C, 19)} ${up(D, 19)}`} style={tinted("#a87f5f")} />
      <polygon points={`${up(D, 26)} ${up(C, 26)} ${up(C, 19)} ${up(D, 19)}`} fill="#000" opacity="0.2" />
      <polygon points={`${up(B, 26)} ${up(C, 26)} ${up(C, 19)} ${up(B, 19)}`} style={tinted("#a87f5f")} />
      <polygon points={`${up(B, 26)} ${up(C, 26)} ${up(C, 19)} ${up(B, 19)}`} fill="#000" opacity="0.32" />
      <polygon points={`${up(A, 26)} ${up(B, 26)} ${up(C, 26)} ${up(D, 26)}`} style={tinted("#a87f5f")} />
      {/* a small book resting on top */}
      <g transform="translate(0,-26)">
        <polygon points={floorPatch(0.5, 0.3, 0.42, 0.3)} fill="#7faf8f" />
      </g>
    </g>
  );
}

function Bed() {
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={2} dy={0.14} h={46} fallback="#8f5d49" dark={0.4} mid={0.24} />
      <TintedBox gx={0} gy={0.1} dx={2} dy={2.7} h={16} fallback="#8f5d49" dark={0.4} mid={0.24} />
      {/* blanket (the tintable material) */}
      <TintedBox gx={0.04} gy={0.6} dx={1.92} dy={2.14} h={26} fallback="#7f9ec9" />
      {/* fold line across the blanket */}
      <line
        x1={project(0.04, 1.3).x}
        y1={project(0.04, 1.3).y - 26}
        x2={project(1.96, 1.3).x}
        y2={project(1.96, 1.3).y - 26}
        stroke="#000"
        strokeWidth="1.6"
        opacity="0.18"
      />
      {/* pillow */}
      <TintedBox gx={0.35} gy={0.16} dx={1.3} dy={0.42} h={10} fallback="#f7e9e2" dark={0.14} mid={0.08} />
    </g>
  );
}

function Cushion() {
  const c = project(0.45, 0.45);
  return (
    <g>
      <TintedBox gx={0.05} gy={0.05} dx={0.8} dy={0.8} h={13} fallback="#e8b04b" />
      <circle cx={c.x} cy={c.y - 13} r="2.4" fill="#000" opacity="0.25" />
    </g>
  );
}

function Aquarium() {
  const glass = isoBox(0.06, 0.06, 1.28, 0.58, 32);
  const c = project(0.7, 0.35);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={1.4} dy={0.7} h={24} fallback="#3a3142" dark={0.35} mid={0.2} />
      <g transform="translate(0,-24)">
        <ellipse cx={c.x} cy={c.y - 16} rx="26" ry="12" fill="#6fb8cf" opacity="0.18" className="room-breathe" />
        <polygon points={glass.left} fill="#6fb8cf" opacity="0.22" />
        <polygon points={glass.right} fill="#6fb8cf" opacity="0.32" />
        {/* seaweed + fish inside */}
        <path
          d={`M ${c.x - 14} ${c.y} q -3 -12 2 -22 q 4 8 1 22 z`}
          fill="#3f7f63"
          opacity="0.85"
        />
        <g className="room-sway" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <ellipse cx={c.x + 4} cy={c.y - 18} rx="5" ry="3" fill="#e8b04b" />
          <polygon points={`${c.x + 9},${c.y - 18} ${c.x + 13},${c.y - 21} ${c.x + 13},${c.y - 15}`} fill="#e8b04b" />
          <ellipse cx={c.x - 4} cy={c.y - 9} rx="4" ry="2.4" fill="#d98a93" />
          <polygon points={`${c.x},${c.y - 9} ${c.x + 4},${c.y - 11.5} ${c.x + 4},${c.y - 6.5}`} fill="#d98a93" />
        </g>
        {/* bubbles drifting up the tank */}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="bubble-rise"
            cx={c.x - 10 + i * 9}
            cy={c.y - 4}
            r={1.3 + (i % 2) * 0.5}
            fill="#cbe8ef"
            style={{ animationDelay: `${i * 1.6}s` }}
          />
        ))}
        <polygon points={glass.top} fill="#cbe8ef" opacity="0.4" />
      </g>
    </g>
  );
}

// ---- wall decor — drawn for the RIGHT wall (the plane along +gx at gy=0)
// inside a skewY group; the scene mirrors the whole sprite for the left wall.

function Frame() {
  return (
    <g transform={`skewY(${SKEW})`}>
      <rect x="1" y="-98" width="32" height="42" rx="2" style={tinted("#8a5346")} />
      <rect x="1" y="-98" width="32" height="42" rx="2" fill="#000" opacity="0.15" />
      <rect x="4.5" y="-94.5" width="25" height="35" fill="url(#isoSky)" />
      <circle cx="22" cy="-87" r="4" fill="#f7e9e2" opacity="0.9" />
      <path d="M4.5 -66 q6 -9 12 -3 q7 -8 12.5 -1 l0 10.5 l-24.5 0 z" fill="#2b2350" />
    </g>
  );
}

function WallShelf() {
  return (
    <g transform={`skewY(${SKEW})`}>
      <rect x="0" y="-78" width="38" height="5" rx="1.5" style={tinted("#a87f5f")} />
      <rect x="0" y="-78" width="38" height="5" rx="1.5" fill="#000" opacity="0.12" />
      <polygon points="4,-73 10,-73 4,-66" fill="#6b4a39" />
      <polygon points="30,-73 36,-73 30,-66" fill="#6b4a39" />
      <rect x="4" y="-92" width="5" height="14" rx="1" fill="#7faf8f" />
      <rect x="10" y="-90" width="5" height="12" rx="1" fill="#d98a93" />
      <rect x="16" y="-93" width="5" height="15" rx="1" fill="#8a7ac2" />
      {/* trailing plant spilling over the edge */}
      <path d="M30 -80 q4 2 3 10 q-4 -2 -3 -10 z M33 -79 q5 4 3 14 q-5 -4 -3 -14 z" fill="#56a07c" />
    </g>
  );
}

function Mirror() {
  return (
    <g transform={`skewY(${SKEW})`}>
      <circle cx="11" cy="-80" r="13" style={tinted("#e8b04b")} />
      <circle cx="11" cy="-80" r="10" fill="#cbe8ef" opacity="0.85" />
      <path d="M6 -86 q4 -3 8 -1" stroke="#fff" strokeWidth="1.6" fill="none" opacity="0.7" />
    </g>
  );
}

// ---- outdoor set ------------------------------------------------------- //

function Tree() {
  const c = project(0.75, 0.75);
  return (
    <g>
      <ellipse cx={c.x} cy={c.y} rx="30" ry="11" fill="#000" opacity="0.2" />
      <path
        d={`M${c.x - 5} ${c.y} L${c.x - 3} ${c.y - 46} L${c.x + 3} ${c.y - 46} L${c.x + 5} ${c.y} Z`}
        fill="#6b4a39"
      />
      <g className="room-sway">
        <ellipse cx={c.x} cy={c.y - 58} rx="34" ry="22" style={tinted("#3f7f63")} />
        <ellipse cx={c.x} cy={c.y - 58} rx="34" ry="22" fill="#000" opacity="0.12" />
        <ellipse cx={c.x - 6} cy={c.y - 76} rx="27" ry="18" style={tinted("#3f7f63")} />
        <ellipse cx={c.x + 8} cy={c.y - 90} rx="18" ry="13" style={tinted("#3f7f63")} />
        <ellipse cx={c.x + 10} cy={c.y - 92} rx="10" ry="7" fill="#fff" opacity="0.12" />
      </g>
    </g>
  );
}

function Bush() {
  const c = project(0.5, 0.5);
  return (
    <g>
      <ellipse cx={c.x} cy={c.y + 2} rx="20" ry="8" fill="#000" opacity="0.18" />
      <ellipse cx={c.x - 8} cy={c.y - 10} rx="14" ry="11" style={tinted("#3f7f63")} />
      <ellipse cx={c.x + 8} cy={c.y - 9} rx="13" ry="10" style={tinted("#3f7f63")} />
      <ellipse cx={c.x + 8} cy={c.y - 9} rx="13" ry="10" fill="#000" opacity="0.12" />
      <ellipse cx={c.x} cy={c.y - 18} rx="12" ry="9" style={tinted("#3f7f63")} />
      <ellipse cx={c.x - 3} cy={c.y - 21} rx="6" ry="4" fill="#fff" opacity="0.12" />
    </g>
  );
}

function Pond() {
  const c = project(1.75, 1.25);
  return (
    <g>
      <ellipse cx={c.x} cy={c.y} rx="76" ry="38" fill="#2c4a52" />
      <ellipse cx={c.x} cy={c.y - 1.5} rx="70" ry="34" fill="#4a90ac" opacity="0.9" />
      <ellipse cx={c.x - 8} cy={c.y - 4} rx="46" ry="21" fill="#6fb8cf" opacity="0.45" />
      <path
        d={`M${c.x - 30} ${c.y + 6} q14 4 30 1`}
        stroke="#cbe8ef"
        strokeWidth="1.6"
        fill="none"
        opacity="0.5"
      />
      {/* a ripple ring slowly spreading */}
      <ellipse
        className="pond-ripple"
        cx={c.x - 12}
        cy={c.y + 2}
        rx="16"
        ry="7"
        fill="none"
        stroke="#cbe8ef"
        strokeWidth="1.4"
      />
      {/* lilypads */}
      <g className="room-sway" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <ellipse cx={c.x + 26} cy={c.y - 8} rx="9" ry="5" fill="#56a07c" />
        <ellipse cx={c.x + 34} cy={c.y + 4} rx="6" ry="3.5" fill="#3f7f63" />
        <ellipse cx={c.x - 34} cy={c.y + 8} rx="7" ry="4" fill="#56a07c" />
        <circle cx={c.x + 24} cy={c.y - 10} r="2" fill="#e8a3a8" />
      </g>
    </g>
  );
}

function Picnic() {
  return (
    <g>
      <polygon points={floorPatch(0, 0, 2, 1.5)} style={tinted("#d98a93")} opacity="0.85" />
      {[0, 1, 2, 3].map((i) =>
        [0, 1, 2].map((j) =>
          (i + j) % 2 === 0 ? (
            <polygon
              key={`${i}-${j}`}
              points={floorPatch(i * 0.5, j * 0.5, 0.5, 0.5)}
              fill="#fff"
              opacity="0.22"
            />
          ) : null
        )
      )}
      <polygon
        points={floorPatch(0.06, 0.06, 1.88, 1.38)}
        fill="none"
        stroke="#fff"
        strokeWidth="1.2"
        opacity="0.3"
      />
    </g>
  );
}

function Bench() {
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={1.6} dy={0.12} h={30} fallback="#8f5d49" dark={0.38} mid={0.22} />
      <TintedBox gx={0} gy={0.12} dx={1.6} dy={0.45} h={16} fallback="#a87f5f" />
    </g>
  );
}

function Flowerbed() {
  const c = project(0.5, 0.3);
  return (
    <g>
      <polygon points={floorPatch(0, 0, 1, 0.6)} fill="#2e5540" opacity="0.8" />
      {[
        [-12, -6],
        [-2, -12],
        [8, -5],
        [0, -2],
        [14, -10],
      ].map(([dx, dy], i) => (
        <g key={i}>
          <circle cx={c.x + dx} cy={c.y + dy} r="3" style={tinted("#e8b04b")} />
          <circle cx={c.x + dx} cy={c.y + dy} r="1.2" fill="#fff" opacity="0.8" />
        </g>
      ))}
    </g>
  );
}

// The resident: a little person. `seated` swaps the pose — the scene decides
// by checking whether they were dropped onto something with a seat.
function Resident({ seated = false, working = false }) {
  const c = project(0.4, 0.4);
  const torsoY = seated ? -28 : -34;
  const headY = seated ? -35 : -41;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {!seated && <ellipse cx="0" cy="2" rx="13" ry="5.5" fill="#000" opacity="0.22" />}
      {seated ? (
        <>
          <rect x="-8" y="-10" width="6.5" height="13" rx="3" fill="#4a3a5b" />
          <rect x="2" y="-9" width="6.5" height="13" rx="3" fill="#4a3a5b" />
        </>
      ) : (
        <>
          <rect x="-6.8" y="-15" width="5.6" height="16" rx="2.6" fill="#4a3a5b" />
          <rect x="1.2" y="-15" width="5.6" height="16" rx="2.6" fill="#4a3a5b" />
        </>
      )}
      <g className="room-breathe" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
        <rect x="-9.5" y={torsoY} width="19" height="22" rx="8" style={tinted("#7faf8f")} />
        {/* arms — they type when a focus block is running and they're seated */}
        <g className={working && seated ? "resident-type" : undefined}>
          <rect x="-13" y={torsoY + 5} width="5" height="13" rx="2.5" style={tinted("#7faf8f")} />
          <rect x="8" y={torsoY + 5} width="5" height="13" rx="2.5" style={tinted("#7faf8f")} />
          <rect x="-13" y={torsoY + 5} width="5" height="13" rx="2.5" fill="#000" opacity="0.12" />
        </g>
        <circle cx="0" cy={headY} r="7.6" fill="#edc39e" />
        <path d={`M-7.6 ${headY} a7.6 7.6 0 0 1 15.2 0 l-2 -1.4 q-5.6 -3.4 -11.2 0 z`} fill="#3a3142" />
        <circle cx="-3" cy={headY + 2} r="0.9" fill="#3a3142" />
        <circle cx="3" cy={headY + 2} r="0.9" fill="#3a3142" />
      </g>
    </g>
  );
}

export const ISO_SPRITES = {
  resident: Resident,
  tree: Tree,
  bush: Bush,
  pond: Pond,
  picnic: Picnic,
  bench: Bench,
  flowerbed: Flowerbed,
  rug: Rug,
  squarerug: SquareRug,
  desk: Desk,
  stool: Stool,
  sofa: Sofa,
  coffeetable: CoffeeTable,
  bed: Bed,
  cushion: Cushion,
  bookshelf: Bookshelf,
  aquarium: Aquarium,
  monstera: Monstera,
  plant: Plant,
  floorlamp: FloorLamp,
  cat: Cat,
  frame: Frame,
  wallshelf: WallShelf,
  mirror: Mirror,
};
