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
      <ellipse cx="0" cy="0" rx={r} ry={e} fill={fill} />
      <ellipse cx="0" cy="0" rx={r} ry={e} fill="#000" opacity="0.3" />
      <rect x={-r} y={-h} width={r * 2} height={h} fill={fill} />
      <rect x={-r} y={-h} width={r * 0.55} height={h} fill="#fff" opacity="0.13" />
      <rect x={r * 0.45} y={-h} width={r * 0.55} height={h} fill="#000" opacity="0.14" />
      <ellipse cx="0" cy={-h} rx={r} ry={e} fill={lid || fill} />
      {lid && <ellipse cx="0" cy={-h} rx={r * 0.6} ry={e * 0.6} fill="#000" opacity="0.12" />}
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
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.5" rx="7" ry="3" fill="#000" opacity="0.18" />
      {/* spout first, so the body overlaps its root */}
      <path d="M4 -11 L13 -13.5 L12.5 -10.5 L4 -6.5 Z" fill="#7d8c99" />
      <path d="M4 -11 L13 -13.5 L12.8 -12 L4 -9 Z" fill="#fff" opacity="0.14" />
      <g transform="translate(0,-1)">
        <Vessel r={6} h={9} fill="#8d99a6" lid="#a8b3bd" />
      </g>
      {/* bail handle, over the top */}
      <path d="M-5.5 -11.5 q5.5 -8 11 0" fill="none" stroke="#5b5166" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="0" cy="-11.4" r="1.5" fill="#5b5166" />
    </g>
  );
}

export function Pot() {
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.5" rx="8" ry="3.4" fill="#000" opacity="0.18" />
      <g transform="translate(0,-1)">
        <Vessel r={7} h={8} fill="#5b6b6b" lid="#7d8c8c" />
      </g>
      {/* two ear handles */}
      <rect x="-10.5" y="-7" width="3" height="2.2" rx="1.1" fill="#3f4a4a" />
      <rect x="7.5" y="-7" width="3" height="2.2" rx="1.1" fill="#3f4a4a" />
      <circle cx="0" cy="-10.5" r="1.5" fill="#3f4a4a" />
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
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.5" rx="7.5" ry="3.2" fill="#000" opacity="0.18" />
      {/* rounder than the kettle — that roundness IS the difference */}
      <ellipse cx="0" cy="-6" rx="7" ry="5.6" style={tinted("#c98a9b")} />
      <ellipse cx="-2.2" cy="-7.5" rx="3" ry="2.2" fill="#fff" opacity="0.18" />
      <ellipse cx="0" cy="-6" rx="7" ry="5.6" fill="#000" opacity="0.06" />
      <path d="M6 -7 q5 0 5.5 -4" fill="none" style={{ stroke: "var(--tint, #c98a9b)" }} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M-6.5 -8 q-4.5 -2 -1 -5.5" fill="none" style={{ stroke: "var(--tint, #c98a9b)" }} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="0" cy="-11" rx="3.6" ry="1.6" style={tinted("#d9a0ad")} />
      <circle cx="0" cy="-12.6" r="1.3" fill="#8a5a66" />
      <SteamWisps x={9} y={-13} scale={0.65} />
    </g>
  );
}

export function FruitBowl() {
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.5" rx="8" ry="3.4" fill="#000" opacity="0.18" />
      {/* fruit first, then the bowl in front — they sit INSIDE it */}
      <circle cx="-3" cy="-7" r="3.2" fill="#c0563f" />
      <circle cx="2.5" cy="-7.5" r="3" fill="#d98b3a" />
      <circle cx="0" cy="-9" r="2.6" fill="#7faf8f" />
      <circle cx="-3.6" cy="-8" r="1" fill="#fff" opacity="0.3" />
      <path d="M-8.5 -5 q8.5 6 17 0 q-2 -3.5 -8.5 -3.5 q-6.5 0 -8.5 3.5 z" style={tinted("#e2d6c4")} />
      <path d="M0 -1.6 q6 -0.6 8.5 -3.4 q-2 3.6 -8.5 3.8 z" fill="#000" opacity="0.16" />
    </g>
  );
}

export function Bread() {
  const c = project(0.2, 0.15);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.5" rx="8" ry="3" fill="#000" opacity="0.16" />
      {/* board */}
      <ellipse cx="0" cy="-1.5" rx="8" ry="3.4" fill="#a87f5f" />
      <ellipse cx="0" cy="-2.4" rx="8" ry="3.4" fill="#b58c6a" />
      {/* loaf: a dome with three slashes, which is the whole silhouette */}
      <path d="M-6.5 -3 q0 -6 6.5 -6 q6.5 0 6.5 6 z" fill="#c98a4b" />
      <path d="M-6.5 -3 q0 -6 6.5 -6 q0 6 0 6 z" fill="#fff" opacity="0.14" />
      {[-3.4, 0, 3.4].map((x) => (
        <path key={x} d={`M${x - 1.4} -5.6 l2.4 -1.8`} stroke="#8a5a2f" strokeWidth="1.2" strokeLinecap="round" />
      ))}
    </g>
  );
}

export function Cake() {
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.5" rx="8" ry="3.4" fill="#000" opacity="0.18" />
      {/* stand */}
      <ellipse cx="0" cy="-1.5" rx="8" ry="3.4" fill="#cbd5e8" />
      <rect x="-1.2" y="-4" width="2.4" height="3" fill="#cbd5e8" />
      <ellipse cx="0" cy="-4" rx="7" ry="3" fill="#dfe6f2" />
      {/* two tiers of sponge with a cream band between */}
      <g transform="translate(0,-4)">
        <Vessel r={6.5} h={7} fill="#c98a4b" lid="#f2e2cf" />
        <rect x="-6.5" y="-4.4" width="13" height="2" fill="#f7e9e2" opacity="0.85" />
      </g>
      <circle cx="0" cy="-12" r="1.6" fill="#c0563f" />
      <circle cx="-0.5" cy="-12.5" r="0.5" fill="#fff" opacity="0.5" />
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
