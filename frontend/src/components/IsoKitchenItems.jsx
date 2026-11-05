import { SKEW, TILE_W, project, floorPatch } from "../lib/iso";
import { tinted } from "../lib/tint";
import { SteamWisps } from "./IsoAmbientEffects";
import { TintedBox } from "./IsoItemPrimitives";

// ---- kitchen ------------------------------------------------------------ //
// Same rules as the autumn set: silhouette first, few large shapes, one hero
// colour. Appliances are the easiest things in a catalog to turn into grey
// bricks, so each one gets exactly one feature that names it — a hob, a
// basin, a window, a slot, a spout.

/** A cylindrical vessel: bottom ellipse, straight side, top ellipse. The
 *  house idiom for anything round (see Stool, CafeTable) — worth sharing
 *  once four kitchen items wanted it. */
function Vessel({ r, h, fill, lid, ry = 0.45 }) {
  const e = r * ry;
  return (
    <g>
      {/* A manufactured vessel has a rolled rim, straight wall and planted
          base. Broad glossy highlights made every material look ballooned. */}
      <path d={`M${-r} ${-h} L${-r} -1 Q0 ${e * 0.55} ${r} -1 L${r} ${-h} Z`} fill={fill} />
      <path d={`M0 ${-h} L${r} ${-h} L${r} -1 Q${r * 0.55} ${e * 0.2} 0 0 Z`}
        fill="#000" opacity="0.16" />
      <path d={`M${-r + 1.2} ${-h + 1} V-2.2`} stroke="#fff" strokeWidth="0.8" opacity="0.1" />
      <ellipse cx="0" cy="-1" rx={r} ry={e} fill="#000" opacity="0.24" />
      <ellipse cx="0" cy={-h} rx={r} ry={e} fill={lid || fill} />
      <ellipse cx="0" cy={-h} rx={r - 0.9} ry={Math.max(0.7, e - 0.55)}
        fill="#000" opacity={lid ? 0.12 : 0.24} />
      <path d={`M${-r + 0.8} ${-h - 0.2} Q0 ${-h - e + 0.2} ${r - 0.8} ${-h - 0.2}`}
        fill="none" stroke="#fff" strokeWidth="0.65" opacity="0.18" />
    </g>
  );
}

export function Oven() {
  const W = 0.9;
  const D = 0.7;
  const H = 38;
  const face = W * (TILE_W / 2);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#cbc6c0" dark={0.3} mid={0.15} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {/* control strip with knobs, then the door and its window */}
        <rect x="2" y={-H + 2} width={face - 4} height="6" rx="1" fill="#000" opacity="0.14" />
        {[0.22, 0.38, 0.62, 0.78].map((t) => (
          <circle key={t} cx={face * t} cy={-H + 5} r="1.3" fill="#f7e9e2" opacity="0.7" />
        ))}
        <rect x="3" y={-H + 11} width={face - 6} height={H - 14} rx="1.5" fill="#000" opacity="0.2" />
        <rect x="6" y={-H + 16} width={face - 12} height={H - 24} rx="1" fill="#241d33" opacity="0.75" />
        <rect x="7.5" y={-H + 17.5} width={face - 15} height={H - 27} rx="0.8" fill="#e8b04b" opacity="0.16" />
        <rect x="5" y={-H + 12} width={face - 10} height="2.4" rx="1.2" fill="#f7e9e2" opacity="0.55" />
      </g>
      {/* four hob rings on the top — the one detail that says "cooker" */}
      <g transform={`translate(0,${-H})`}>
        {[
          [0.26, 0.22],
          [0.64, 0.22],
          [0.26, 0.5],
          [0.64, 0.5],
        ].map(([gx, gy]) => {
          const p = project(gx, gy);
          return (
            <g key={`${gx}-${gy}`}>
              <ellipse cx={p.x} cy={p.y} rx="6" ry="3" fill="#000" opacity="0.22" />
              <ellipse cx={p.x} cy={p.y - 0.6} rx="4.4" ry="2.2" fill="#000" opacity="0.3" />
            </g>
          );
        })}
      </g>
    </g>
  );
}

export function Sink() {
  const W = 0.9;
  const D = 0.65;
  const H = 32;
  const face = W * (TILE_W / 2);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#b8ad9e" dark={0.32} mid={0.17} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {[4, face / 2 + 1].map((x) => (
          <rect key={x} x={x} y={-H + 5} width={face / 2 - 5} height={H - 10} rx="1.2" fill="#000" opacity="0.13" />
        ))}
        <circle cx={face / 2 - 3} cy={-H / 2} r="1.1" fill="#f7e9e2" opacity="0.6" />
        <circle cx={face / 2 + 3} cy={-H / 2} r="1.1" fill="#f7e9e2" opacity="0.6" />
      </g>
      <g transform={`translate(0,${-H})`}>
        {/* the basin: a recess, not a painted rectangle — the rim is what
            makes it read as sunk into the top */}
        <polygon points={floorPatch(0.1, 0.1, W - 0.2, D - 0.2)} fill="#000" opacity="0.3" />
        <polygon points={floorPatch(0.16, 0.15, W - 0.32, D - 0.3)} fill="#9aa3a8" />
        <polygon points={floorPatch(0.16, 0.15, W - 0.32, D - 0.3)} fill="#000" opacity="0.18" />
        <ellipse
          cx={project(W / 2, D / 2).x}
          cy={project(W / 2, D / 2).y}
          rx="2.4"
          ry="1.2"
          fill="#000"
          opacity="0.3"
        />
        {/* tap: a gooseneck rising from the back edge */}
        <g transform={`translate(${project(W / 2, 0.12).x}, ${project(W / 2, 0.12).y})`}>
          <path d="M0 0 L0 -11 q0 -4 5 -4 q4 0 4 3.5 L9 -6" fill="none" stroke="#cfd6da" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="0" cy="0" rx="3" ry="1.5" fill="#cfd6da" />
        </g>
      </g>
    </g>
  );
}

export function Microwave() {
  const W = 0.65;
  const D = 0.45;
  const H = 16;
  const face = W * (TILE_W / 2);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#4a4152" tint={false} dark={0.3} mid={0.16} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        <rect x="2" y={-H + 2} width={face * 0.62} height={H - 4} rx="1" fill="#241d33" />
        <rect x="3" y={-H + 3} width={face * 0.62 - 2} height={H - 6} rx="0.8" fill="#5b6b9b" opacity="0.4" />
        <rect x={face * 0.7} y={-H + 3} width={face * 0.24} height="4" rx="0.8" fill="#9db4e8" opacity="0.55" />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={face * 0.74 + i * 3} cy={-H + 10} r="0.9" fill="#f7e9e2" opacity="0.5" />
        ))}
        <rect x={face * 0.64} y={-H + 2} width="1.4" height={H - 4} rx="0.7" fill="#f7e9e2" opacity="0.4" />
      </g>
    </g>
  );
}

export function Toaster() {
  // Two slices poking out of the slots. Without them it is a white box with a
  // dot on it and reads as a bread bin — the toast IS the silhouette.
  const W = 0.4;
  const D = 0.35;
  const H = 13;
  const face = W * (TILE_W / 2);
  const slice = (gx) => {
    const p = project(gx, 0.175);
    return (
      <g key={gx} transform={`translate(${p.x}, ${p.y})`}>
        <path d="M-3.4 0 q0 -4.6 3.4 -4.6 q3.4 0 3.4 4.6 z" fill="#c98a4b" />
        <path d="M-3.4 0 q0 -4.6 3.4 -4.6 l0 4.6 z" fill="#fff" opacity="0.16" />
      </g>
    );
  };
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#cfd6da" tint={false} dark={0.28} mid={0.14} />
      <g transform={`translate(0,${-H})`}>
        <polygon points={floorPatch(0.07, 0.09, W - 0.14, 0.055)} fill="#000" opacity="0.45" />
        <polygon points={floorPatch(0.07, 0.2, W - 0.14, 0.055)} fill="#000" opacity="0.45" />
        {slice(0.14)}
        {slice(0.26)}
      </g>
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        <rect x={face - 3.2} y={-H + 2.5} width="2.2" height="6" rx="1.1" fill="#5b5166" />
        <circle cx="4" cy="-4" r="1.5" fill="#c0563f" opacity="0.85" />
      </g>
    </g>
  );
}

export function Kettle() {
  // Spout on ONE side as a tapered cone, handle as a bail arcing over the
  // lid. Drawn as two thin strokes leaving the shoulders they read as horns.
  const c = project(0.175, 0.175);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-kitchen-material="brushed-metal">
      <ellipse cx="0" cy="-0.4" rx="7" ry="2.7" fill="#000" opacity="0.18" />
      {/* Faceted brushed-metal body and a planted heating ring. The old
          perfect cylinder + white stripe read as a soft plastic toy. */}
      <path d="M-5.8 -10.5 L-6.7 -2.4 Q0 0.4 6.7 -2.4 L5.8 -10.5 Z" fill="#8996a0" />
      <path d="M0 -10.5 H5.8 L6.7 -2.4 Q3.6 -0.8 0 -0.7 Z" fill="#000" opacity="0.16" />
      <path d="M-4.5 -9.5 L-5.2 -3.2" stroke="#fff" strokeWidth="0.8" opacity="0.12" />
      <ellipse cx="0" cy="-2" rx="6.6" ry="2.4" fill="none" stroke="#4f5960" strokeWidth="1" opacity="0.75" />
      {/* Long filled spout with a dark opening; one clear side silhouette. */}
      <path d="M4.5 -8.8 L13 -13.2 L13.4 -10.4 L5.3 -5.8 Z" fill="#71808b" />
      <path d="M12.2 -13.1 L13.7 -13.6 L13.4 -10.4 L12 -10.7 Z" fill="#343b41" />
      <ellipse cx="0" cy="-10.5" rx="5.8" ry="2.3" fill="#aab4bb" />
      <ellipse cx="0" cy="-10.6" rx="4.3" ry="1.55" fill="#606a72" opacity="0.45" />
      <ellipse cx="0" cy="-11.1" rx="3.3" ry="1.3" fill="#bbc3c8" />
      <circle cx="0" cy="-12.4" r="1.15" fill="#4e4557" />
      {/* Bail handle has visible hinge blocks rather than growing from the body. */}
      <rect x="-6.5" y="-9.8" width="2.2" height="3" rx="0.5" fill="#4e4557" />
      <rect x="4.3" y="-9.8" width="2.2" height="3" rx="0.5" fill="#4e4557" />
      <path d="M-5.4 -8.8 Q0 -19 5.4 -8.8" fill="none" stroke="#4e4557" strokeWidth="1.7" strokeLinecap="round" />
    </g>
  );
}

export function Pot() {
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-kitchen-material="riveted-metal">
      <ellipse cx="0" cy="-0.5" rx="8" ry="3.4" fill="#000" opacity="0.18" />
      <g transform="translate(0,-1)">
        <Vessel r={7} h={8} fill="#5b6b6b" lid="#7d8c8c" />
      </g>
      {/* Riveted handles and a separate lid keep the stockpot constructed. */}
      <path d="M-6.5 -7.2 H-10.5 V-4.8 H-7" fill="none" stroke="#344040" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6.5 -7.2 H10.5 V-4.8 H7" fill="none" stroke="#344040" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="-5.6" cy="-6.8" r="0.65" fill="#c7d0ce" />
      <circle cx="5.6" cy="-6.8" r="0.65" fill="#c7d0ce" />
      <ellipse cx="0" cy="-9.4" rx="5" ry="1.9" fill="none" stroke="#aeb9b7" strokeWidth="0.9" />
      <rect x="-1.5" y="-11.1" width="3" height="1.5" rx="0.45" fill="#344040" />
    </g>
  );
}

// ---- food & drink ------------------------------------------------------- //
// These are the smallest things in the catalog — 10 to 14px tall — so they get
// ONE idea each and nothing more. At this size a second idea is just noise:
// the cake is a cylinder with a cherry, the ramen is a bowl with a swirl.
// All of them `stacks`, because food belongs on a table.

export function Teapot() {
  const c = project(0.2, 0.175);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-kitchen-material="thrown-ceramic">
      <ellipse cx="0" cy="-0.5" rx="7.5" ry="3.2" fill="#000" opacity="0.18" />
      {/* Ceramic body: foot, belly, shoulder and neck. A single ellipse made
          it look like an inflated ball instead of thrown pottery. */}
      <ellipse cx="0" cy="-2.3" rx="5.3" ry="1.8" style={tinted("#b8798a")} />
      <path d="M-5.3 -3 Q-7.2 -6.2 -5.2 -9.2 Q-3.8 -11.2 -2.6 -11.6 H2.6 Q3.8 -11.2 5.2 -9.2 Q7.2 -6.2 5.3 -3 Q0 -0.5 -5.3 -3 Z"
        style={tinted("#c98a9b")} />
      <path d="M0 -11.6 H2.6 Q3.8 -11.2 5.2 -9.2 Q7.2 -6.2 5.3 -3 Q2.7 -1.6 0 -1.4 Z"
        fill="#000" opacity="0.11" />
      <path d="M-4.6 -8.9 Q-3.4 -10.2 -2.3 -10.3" fill="none" stroke="#fff" strokeWidth="0.85" opacity="0.16" />
      {/* Filled spout and hollow handle show wall thickness and attachment. */}
      <path d="M4.6 -8.5 L12 -12.3 L11.3 -8.8 L5.2 -5.8 Z" style={tinted("#c98a9b")} />
      <path d="M10.8 -12.2 L12 -12.6 L11.3 -8.8 L10.4 -9.1 Z" fill="#6f4650" />
      <path d="M-5.1 -9.5 Q-11 -11.8 -10.2 -6.3 Q-9.8 -3.4 -5.4 -4.1" fill="none"
        style={{ stroke: "var(--tint, #c98a9b)" }} strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="0" cy="-11.7" rx="3.5" ry="1.45" style={tinted("#d9a0ad")} />
      <ellipse cx="0" cy="-11.8" rx="2.4" ry="0.9" fill="#7e505b" opacity="0.3" />
      <rect x="-1.1" y="-13.2" width="2.2" height="1.5" rx="0.45" fill="#704751" />
      <SteamWisps x={9} y={-13} scale={0.65} />
    </g>
  );
}

export function FruitBowl() {
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-kitchen-material="ceramic-bowl">
      <ellipse cx="0" cy="-0.5" rx="8" ry="3.4" fill="#000" opacity="0.18" />
      {/* The interior sits behind the fruit. Only the near rim is reinforced
          later; a full pale outline looked like a floating ring. */}
      <ellipse cx="0" cy="-6.1" rx="7.8" ry="2.8" fill="#5f5148" opacity="0.34" />
      <path d="M-7.6 -6.2 Q0 -9.2 7.6 -6.2" fill="none"
        style={{ stroke: "var(--tint, #a88e76)" }} strokeWidth="1.15" />
      {/* Broad overlapping fruit profiles, not identical glossy balls. Their
          lower halves extend behind the basin painted below, so the near rim
          visibly contains them instead of leaving them floating above it. */}
      <g transform="translate(0,2.1) scale(1.08)">
        <path d="M-6.2 -6.5 Q-6.6 -10 -3.4 -10.6 Q-0.2 -10 -0.5 -6.4 Z" fill="#b94e3c" />
        <path d="M-3.8 -10.5 q0.4 -2 2 -2.6" fill="none" stroke="#526b45" strokeWidth="1" />
        <path d="M0.2 -6.2 Q0 -10 3.1 -10.5 Q6 -9.7 5.5 -6 Z" fill="#d18435" />
        <path d="M-1.2 -8 Q-0.6 -11.7 1.6 -12.4 Q4.1 -11.3 3.5 -8 Z" fill="#769a65" />
        <path d="M1 -12.2 q1.5 -1.4 3 -0.4" fill="none" stroke="#4d704c" strokeWidth="1" />
      </g>
      {/* A solid basin, weighty near rim and small planted foot. */}
      <path d="M-8.2 -5.8 Q-6.8 -0.8 0 -0.4 Q6.8 -0.8 8.2 -5.8 Q4.5 -3.6 0 -3.4 Q-4.5 -3.6 -8.2 -5.8 Z"
        style={tinted("#a88e76")} />
      <path d="M0 -0.4 Q5.8 -0.8 8.2 -5.8 Q6 -3.8 3.2 -3.5 L1.8 -0.6 Z" fill="#000" opacity="0.14" />
      <path d="M-8.2 -5.8 Q0 -2.8 8.2 -5.8" fill="none"
        style={{ stroke: "var(--tint, #a88e76)" }} strokeWidth="1.5" />
      <path d="M-6.6 -5.7 Q0 -3.5 6.6 -5.7" fill="none" stroke="#fff" strokeWidth="0.55" opacity="0.16" />
      <ellipse cx="0" cy="-0.4" rx="3.8" ry="1.15" fill="#8f7b69" opacity="0.55" />
    </g>
  );
}

export function Bread() {
  const c = project(0.2, 0.15);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-kitchen-material="bread-and-board">
      <ellipse cx="0" cy="-0.5" rx="8" ry="3" fill="#000" opacity="0.16" />
      {/* A thin timber board has corners and end grain; the old oval looked
          like a second inflated loaf underneath the bread. */}
      <path d="M-9 -3 L-1 -7.2 L9 -2.2 L1.2 2 Z" fill="#8b6548" />
      <path d="M-9 -4.2 L-1 -8.4 L9 -3.4 L1.2 0.8 Z" fill="#b58c6a" />
      <path d="M6.8 -4.5 L9 -3.4 L1.2 0.8 L-1 0" fill="#000" opacity="0.1" />
      {/* Loaf has a planted side, uneven crown and a cut heel. */}
      <path d="M-6.7 -4.3 Q-6.1 -9.6 -1.8 -10.4 Q3.7 -10 6.4 -6.5 L6.1 -3.1 Q0 -0.8 -6.7 -4.3 Z" fill="#bd793d" />
      <path d="M-6.7 -4.3 Q-6.1 -9.6 -1.8 -10.4 Q0 -8.2 -0.4 -2.5 Q-3.6 -2.8 -6.7 -4.3 Z" fill="#d79a56" />
      {[-3.7, -0.6, 2.5].map((x) => (
        <path key={x} d={`M${x - 1} -7 l2.3 -1.7`} stroke="#8d542e" strokeWidth="1.1" strokeLinecap="round" />
      ))}
      <path d="M5.8 -6.1 q2 -1 3.2 0 v3.5 q-1.7 1.1 -3.1 -0.4 z" fill="#e0ad6a" />
      <path d="M6.6 -5.4 q0.8 -0.4 1.5 0" stroke="#a26738" strokeWidth="0.7" />
    </g>
  );
}

export function Cake() {
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-kitchen-material="layered-cake">
      <ellipse cx="0" cy="-0.5" rx="8" ry="3.4" fill="#000" opacity="0.18" />
      {/* Thin ceramic stand; the cake itself exposes a cut face and layers. */}
      <ellipse cx="0" cy="-1.2" rx="7.8" ry="3" fill="#b9c6d9" />
      <rect x="-1.1" y="-4" width="2.2" height="3" fill="#b9c6d9" />
      <ellipse cx="0" cy="-4" rx="7.4" ry="2.8" fill="#dfe6f2" />
      <path d="M-6 -9.5 Q-4 -12 0 -12.4 L6 -9.8 V-4.8 Q0 -2.6 -6 -5 Z" fill="#bb783d" />
      <path d="M0 -12.4 L6 -9.8 V-4.8 L0 -6.5 Z" fill="#9e5c32" opacity="0.75" />
      <path d="M-6 -9.5 Q-4 -12 0 -12.4 L6 -9.8 Q0 -7.4 -6 -9.5 Z" fill="#f0dfc9" />
      <path d="M-5.8 -6.6 Q0 -4.6 6 -6.3 V-7.8 Q0 -5.8 -5.9 -7.9 Z" fill="#f7e9e2" />
      <path d="M0.4 -12.1 L6 -9.8 L2.8 -8.7 L-0.6 -10.3 Z" fill="#e6cdb0" />
      <path d="M0.4 -12.1 L2.8 -8.7" stroke="#a46d43" strokeWidth="0.8" opacity="0.55" />
      <path d="M-1.2 -12.2 q1.2 -2 2.4 0" fill="none" stroke="#59744e" strokeWidth="1" />
      <path d="M-1.6 -12.4 Q0 -14.2 1.6 -12.4 Q0 -11.4 -1.6 -12.4 Z" fill="#b94e3c" />
    </g>
  );
}

export function Pie() {
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.5" rx="8" ry="3.4" fill="#000" opacity="0.18" />
      {/* dish */}
      <ellipse cx="0" cy="-1" rx="8" ry="3.4" style={tinted("#b8ad9e")} />
      <ellipse cx="0" cy="-1" rx="8" ry="3.4" fill="#000" opacity="0.24" />
      <ellipse cx="0" cy="-4" rx="8" ry="3.4" style={tinted("#cbc6c0")} />
      {/* crust + a lattice, drawn as three crossing bands */}
      <ellipse cx="0" cy="-5.5" rx="6.6" ry="2.8" fill="#c98a4b" />
      <ellipse cx="0" cy="-6.2" rx="6.6" ry="2.8" fill="#d99f5f" />
      {[-3, 0, 3].map((x) => (
        <path key={x} d={`M${x - 3} -7.4 l6 2.4`} stroke="#a86a2f" strokeWidth="1.1" opacity="0.65" />
      ))}
      {[-3, 0, 3].map((x) => (
        <path key={`b${x}`} d={`M${x - 3} -5 l6 -2.4`} stroke="#a86a2f" strokeWidth="1.1" opacity="0.5" />
      ))}
    </g>
  );
}

export function Ramen() {
  const c = project(0.175, 0.175);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.5" rx="7.5" ry="3.2" fill="#000" opacity="0.18" />
      {/* bowl */}
      <path d="M-7.5 -4 q7.5 6.5 15 0 q-1.5 -4 -7.5 -4 q-6 0 -7.5 4 z" style={tinted("#8f4a3c")} />
      <path d="M0 0.4 q5.5 -0.6 7.5 -4.4 q-1.5 4.2 -7.5 4.4 z" fill="#000" opacity="0.18" />
      <ellipse cx="0" cy="-8" rx="7.2" ry="3" style={tinted("#a85a4c")} />
      {/* broth, a noodle swirl, an egg half and two chopsticks */}
      <ellipse cx="0" cy="-8.2" rx="6" ry="2.4" fill="#c9a24b" />
      <path d="M-3.5 -8.4 q3.5 -1.6 7 0" fill="none" stroke="#f2e2cf" strokeWidth="1.1" opacity="0.85" />
      <path d="M-3 -7.2 q3 -1.4 6 0" fill="none" stroke="#f2e2cf" strokeWidth="1" opacity="0.6" />
      <ellipse cx="3" cy="-9" rx="2.2" ry="1.3" fill="#f7f2ea" />
      <ellipse cx="3" cy="-9.1" rx="1.1" ry="0.7" fill="#e8b04b" />
      <path d="M-6 -11 l7 -4 M-4.6 -10.2 l7 -4" stroke="#b58c6a" strokeWidth="0.9" strokeLinecap="round" />
      <SteamWisps y={-10} scale={0.8} />
    </g>
  );
}
