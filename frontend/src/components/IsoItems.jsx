import { useEffect, useState } from "react";
import { TILE_H, TILE_W, project, isoBox, floorPatch } from "../lib/iso";
import { DEFAULT_CHARACTER, MOODS } from "../lib/profile";

// Every sprite in this room is now hand-drawn SVG. The Kenney Furniture Kit
// renders that used to live here are gone: the kit is TRUE isometric (base
// diamond 0.5774) while this room is 2:1 dimetric (0.5), so every PNG sat on
// a base ~15% taller than its floor tile and never landed on the grid; raster
// blurred the moment the camera zoomed; and a PNG can't read `--tint`, which
// cost 30 pre-shaded colourway files to fake four fixed colours.
//
// Drawing from project() fixes all three by construction — correct on the
// grid, sharp at any zoom, and every material takes a colour.

// Sprites for the isometric room. Each is drawn for its footprint anchored at
// grid (0,0) — the scene places it with translate(project(gx,gy)), which
// works because the projection is linear. Main materials use
// `var(--tint, <classic colour>)` exactly like the flat room's sprites.

const SKEW = (Math.atan(TILE_H / TILE_W) * 180) / Math.PI;
const tinted = (fallback) => ({ fill: `var(--tint, ${fallback})` });

/**
 * Fringe strands along one edge of a rug. `axis` is the grid axis the edge
 * runs along; `out` is how far the strands stick out on the OTHER axis, in
 * tiles — expressing it in grid space means the strands land at the correct
 * screen angle for free, instead of being hand-fudged per rug.
 */
function Fringe({ gx, gy, len, axis, out, n = 7, opacity = 0.26 }) {
  return Array.from({ length: n }, (_, i) => {
    const t = ((i + 0.5) / n) * len;
    const a = axis === "gy" ? project(gx, gy + t) : project(gx + t, gy);
    const b = axis === "gy" ? project(gx + out, gy + t) : project(gx + t, gy + out);
    return (
      <line
        key={i}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="#f7e9e2"
        strokeWidth="1.1"
        opacity={opacity}
      />
    );
  });
}

/**
 * The shared bones of a rectangular rug: a tinted ground, then a lighter
 * field inset from it so the BORDER is the rim left showing. Every base rug
 * used to be one flat polygon with a hairline stroke inside, which at room
 * scale read as a solid shape with no pattern at all — the border has to be
 * an area, not a line, to survive being seen from across the room.
 */
function RugGround({ w, d, m, fallback, ground = 0.46, field = 0.1 }) {
  return (
    <>
      <polygon points={floorPatch(0, 0, w, d)} style={tinted(fallback)} opacity={ground} />
      <polygon points={floorPatch(m, m, w - 2 * m, d - 2 * m)} fill="#f7e9e2" opacity={field} />
      <polygon
        points={floorPatch(m, m, w - 2 * m, d - 2 * m)}
        fill="none"
        stroke="#000"
        strokeWidth="1.2"
        opacity="0.15"
      />
    </>
  );
}

function Rug() {
  const W = 3.5;
  const D = 2.5;
  return (
    <g>
      <RugGround w={W} d={D} m={0.3} fallback="rgb(var(--color-rose))" />
      {/* Lattice of small diamonds, offset row to row. A diamond in plan is a
          diamond on screen, so the motif needs no special projection. */}
      {[0.62, 1.24, 1.86, 2.48].flatMap((gx, i) =>
        [0.72, 1.32].map((gy) => (
          <polygon
            key={`${gx}-${gy}`}
            points={floorPatch(gx - 0.15, gy - 0.15 + (i % 2 ? 0.22 : 0), 0.3, 0.3)}
            fill="#f7e9e2"
            opacity="0.15"
          />
        ))
      )}
      <Fringe gx={0} gy={0.3} len={D - 0.6} axis="gy" out={-0.14} />
      <Fringe gx={W} gy={0.3} len={D - 0.6} axis="gy" out={0.14} />
    </g>
  );
}


function Stool() {
  const c = project(0.4, 0.4);
  // A round pouf, not a crate: cheap cylinder (bottom ellipse, straight side
  // band, cushion top) with a stitch ring and a soft sheen.
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-3" rx="16" ry="8" style={tinted("#d98a93")} />
      <ellipse cx="0" cy="-3" rx="16" ry="8" fill="#000" opacity="0.35" />
      <rect x="-16" y="-20" width="32" height="17" style={tinted("#d98a93")} />
      <rect x="-16" y="-20" width="32" height="17" fill="#000" opacity="0.22" />
      <ellipse cx="0" cy="-20" rx="16" ry="8" style={tinted("#d98a93")} />
      <ellipse cx="0" cy="-20" rx="12.5" ry="6" fill="none" stroke="#000" opacity="0.14" strokeWidth="1" strokeDasharray="2.5 2.5" />
      <ellipse cx="-3" cy="-22" rx="7" ry="3" fill="#fff" opacity="0.14" />
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
        {/* A row of identical rectangles reads as a barcode. Real shelves have
            books of different widths, one leaning into the gap, a stack lying
            flat and something that isn't a book at all — that variety is most
            of what "detailed" means at this size. */}
        {[
          [3, -79, 5, "#7faf8f"], [8.5, -82, 4, "#e8a3a8"], [13, -77, 6, "#9b8bd6"],
          [19.5, -81, 3.5, "#cf8f93"], [23.5, -78, 5, "#e8b04b"],
          [3, -46, 4, "#cf8f93"], [7.5, -49, 5.5, "#5b6b9b"], [13.5, -45, 3.5, "#e8b04b"],
          [17.5, -48, 5, "#7faf8f"],
        ].map(([x, y, wd, c], i) => (
          <rect key={i} x={x} y={y} width={wd} height={y < -60 ? -60 - y : -28 - y} rx="1" fill={c} />
        ))}
        {/* one leaning against the end of each row */}
        <rect x="29" y="-73" width="4" height="13" rx="1" fill="#e8a3a8" transform="rotate(14 31 -60)" />
        <rect x="23.5" y="-41" width="4" height="13" rx="1" fill="#9b8bd6" transform="rotate(-11 25.5 -28)" />
        {/* a stack lying flat, and a little pot on the top shelf */}
        <rect x="28" y="-33" width="7" height="2.4" rx="0.8" fill="#7faf8f" />
        <rect x="28.5" y="-30.6" width="6" height="2.4" rx="0.8" fill="#e8b04b" />
        <rect x="18" y="-66" width="4.5" height="6" rx="1" fill="#a8563c" />
        <path d="M18.6 -66 q1.6 -5 3.4 0 z" fill="#4f8f6a" />
        <rect x="0" y="-60" width="34" height="3" fill="#8f5d49" />
        <rect x="0" y="-28" width="34" height="3" fill="#8f5d49" />
      </g>
    </g>
  );
}

/**
 * A plant pot: TAPERED, with a rim and visible soil.
 *
 * Every potted plant used to sit in a straight-sided cube, which reads as a
 * box with leaves in it. Three things make it a pot instead, and all three are
 * silhouette rather than surface:
 *   - the taper (the foot is ~70% of the rim, so the sides slope in),
 *   - a lip standing slightly proud of the body at the top,
 *   - soil sunk below the rim, so you're looking INTO something.
 *
 * `foot` is the rim's width in tiles; the drawn footprint is centred on it, so
 * callers keep passing the catalog footprint unchanged.
 */
function PlantPot({ foot, h, fallback = "#c0563f", rim = 3 }) {
  const body = h - rim;
  const shrink = foot * 0.15; // how far each side draws in toward the foot
  const P = (gx, gy, lift) => {
    const p = project(gx, gy);
    return `${p.x},${p.y - lift}`;
  };
  // rim corners (full width, at the top) and foot corners (drawn in, at 0)
  const rA = [0, 0];
  const rB = [foot, 0];
  const rC = [foot, foot];
  const rD = [0, foot];
  const fB = [foot - shrink, shrink];
  const fC = [foot - shrink, foot - shrink];
  const fD = [shrink, foot - shrink];
  const paint = { fill: `var(--tint, ${fallback})` };
  return (
    <g>
      {/* the two visible sloping faces */}
      <polygon
        points={`${P(...rD, body)} ${P(...rC, body)} ${P(...fC, 0)} ${P(...fD, 0)}`}
        style={paint}
      />
      <polygon
        points={`${P(...rD, body)} ${P(...rC, body)} ${P(...fC, 0)} ${P(...fD, 0)}`}
        fill="#000"
        opacity="0.2"
      />
      <polygon
        points={`${P(...rB, body)} ${P(...rC, body)} ${P(...fC, 0)} ${P(...fB, 0)}`}
        style={paint}
      />
      <polygon
        points={`${P(...rB, body)} ${P(...rC, body)} ${P(...fC, 0)} ${P(...fB, 0)}`}
        fill="#000"
        opacity="0.32"
      />
      {/* contact shading where it meets the floor, same idea as TintedBox */}
      <polygon
        points={`${P(...fD, 0)} ${P(...fC, 0)} ${P(...fC, 2.5)} ${P(...fD, 2.5)}`}
        fill="#000"
        opacity="0.16"
      />
      <polygon
        points={`${P(...fB, 0)} ${P(...fC, 0)} ${P(...fC, 2.5)} ${P(...fB, 2.5)}`}
        fill="#000"
        opacity="0.16"
      />
      {/* the lip: a short straight band standing proud of the body */}
      <polygon
        points={`${P(...rD, h)} ${P(...rC, h)} ${P(...rC, body)} ${P(...rD, body)}`}
        style={paint}
      />
      <polygon
        points={`${P(...rD, h)} ${P(...rC, h)} ${P(...rC, body)} ${P(...rD, body)}`}
        fill="#000"
        opacity="0.13"
      />
      <polygon
        points={`${P(...rB, h)} ${P(...rC, h)} ${P(...rC, body)} ${P(...rB, body)}`}
        style={paint}
      />
      <polygon
        points={`${P(...rB, h)} ${P(...rC, h)} ${P(...rC, body)} ${P(...rB, body)}`}
        fill="#000"
        opacity="0.26"
      />
      {/* rim top, then soil sunk below it */}
      <polygon
        points={`${P(...rA, h)} ${P(...rB, h)} ${P(...rC, h)} ${P(...rD, h)}`}
        style={paint}
      />
      <polygon points={floorPatch(foot * 0.11, foot * 0.11, foot * 0.78, foot * 0.78)} fill="#000" opacity="0.3" transform={`translate(0,${-h + 1.6})`} />
      <polygon points={floorPatch(foot * 0.11, foot * 0.11, foot * 0.78, foot * 0.78)} fill="#3a2a24" transform={`translate(0,${-h + 1.6})`} />
      {/* a light catch along the near rim edges */}
      <polyline
        points={`${P(...rD, h)} ${P(...rC, h)} ${P(...rB, h)}`}
        fill="none"
        stroke="#fff"
        opacity="0.14"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </g>
  );
}

function PlantBase({ foot, potH, leaves }) {
  const c = project(foot / 2, foot / 2);
  return (
    <g>
      <PlantPot foot={foot} h={potH} />
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

// Drawn rather than rendered, so the shade takes a colour and the pole stays
// crisp at any zoom. The pool and the warm bulb are what make a lamp read as
// LIT — that was always ours; now the whole thing is.
function FloorLamp() {
  const c = project(0.4, 0.4);
  const H = 76;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {/* weighted base + pole */}
      <ellipse cx="0" cy="0" rx="9" ry="4.5" fill="#6b4a39" />
      <ellipse cx="0" cy="0" rx="9" ry="4.5" fill="#000" opacity="0.3" />
      <rect x="-1.5" y={-H} width="3" height={H} fill="#6b4a39" />
      <rect x="-1.5" y={-H} width="3" height={H} fill="#000" opacity="0.15" />
      {/* shade: a truncated cone, wider at the bottom */}
      <path d={`M-9 ${-H} L9 ${-H} L14 ${-H + 21} L-14 ${-H + 21} Z`} style={tinted("#f2e0c8")} />
      <path d={`M0 ${-H} L9 ${-H} L14 ${-H + 21} L0 ${-H + 21} Z`} fill="#000" opacity="0.16" />
      <ellipse cx="0" cy={-H} rx="9" ry="3.4" style={tinted("#f7f2ea")} />
      {/* the light itself, spilling from the open bottom */}
      <ellipse
        cx="0"
        cy={-H + 21}
        rx="14"
        ry="5.4"
        fill="#ffe9b0"
        opacity="0.6"
        className="room-breathe"
      />
      <ellipse cx="0" cy={-H + 25} rx="9" ry="3.6" fill="#ffe9b0" opacity="0.3" className="room-breathe" />
    </g>
  );
}

// A cat's silhouette is the whole read at this size, so both poses get the
// same four things the old blob version lacked: a HAUNCH (the raised mound of
// the back leg — without it a curled cat is just an oval), a muzzle with a
// nose and whiskers, pink inner ears, and a belly shadow so it sits ON the
// floor rather than hovering over it.
function CatFace({ x, y, r, asleep }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={tinted("#3a3142")} />
      <ellipse cx={x - 2} cy={y - r * 0.4} rx={r * 0.6} ry={r * 0.34} fill="#fff" opacity="0.09" />
      {/* ears: outer wedge on the skull, pink inner wedge inside it */}
      <polygon points={`${x - r * 0.8},${y - r * 0.6} ${x - r * 0.5},${y - r * 1.75} ${x + r * 0.05},${y - r * 0.8}`} style={tinted("#3a3142")} />
      <polygon points={`${x - r * 0.62},${y - r * 0.75} ${x - r * 0.48},${y - r * 1.36} ${x - r * 0.17},${y - r * 0.87}`} fill="#e8a3a8" opacity="0.5" />
      <polygon points={`${x + r * 0.3},${y - r * 0.85} ${x + r * 1.1},${y - r * 1.2} ${x + r * 0.86},${y - r * 0.35}`} style={tinted("#3a3142")} />
      <polygon points={`${x + r * 0.44},${y - r * 0.84} ${x + r * 0.87},${y - r * 1.03} ${x + r * 0.74},${y - r * 0.58}`} fill="#e8a3a8" opacity="0.5" />
      {/* muzzle */}
      <ellipse cx={x - r * 0.25} cy={y + r * 0.45} rx={r * 0.6} ry={r * 0.4} fill="#fff" opacity="0.1" />
      <path d={`M${x - r * 0.32} ${y + r * 0.22} l${r * 0.18} ${r * 0.16} l${r * 0.18} ${-r * 0.16} z`} fill="#e8a3a8" opacity="0.85" />
      {asleep ? (
        <>
          <path d={`M${x - r * 0.72} ${y - r * 0.05} q${r * 0.24} ${r * 0.22} ${r * 0.48} 0`} fill="none" stroke="#0d0a12" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
          <path d={`M${x + r * 0.24} ${y - r * 0.1} q${r * 0.22} ${r * 0.2} ${r * 0.44} 0`} fill="none" stroke="#0d0a12" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
        </>
      ) : (
        <>
          <ellipse cx={x - r * 0.42} cy={y - r * 0.02} rx={r * 0.15} ry={r * 0.2} fill="#ffe9b0" />
          <ellipse cx={x + r * 0.42} cy={y - r * 0.06} rx={r * 0.15} ry={r * 0.2} fill="#ffe9b0" />
        </>
      )}
      {/* whiskers */}
      {[-0.1, 0.28].map((dy, i) => (
        <g key={i} stroke="#f7e9e2" strokeWidth="0.6" opacity="0.35" strokeLinecap="round">
          <line x1={x - r * 0.5} y1={y + r * (0.35 + dy)} x2={x - r * 1.5} y2={y + r * (0.15 + dy)} />
          <line x1={x + r * 0.1} y1={y + r * (0.38 + dy)} x2={x + r * 0.95} y2={y + r * (0.2 + dy)} />
        </g>
      ))}
    </g>
  );
}

function Cat({ awake = false }) {
  const c = project(0.6, 0.4);
  // Ground shadows come from the scene now (one soft ellipse per item), so
  // the poses draw only the cat.
  if (awake) {
    // On the prowl: body up on legs, head high, tail curled skyward. The
    // legs step in counter-phase and the body trots — walking, not sliding.
    // On the prowl: body up on legs, head high, tail curled skyward. The far
    // legs are drawn first and darkened, so the four of them read as depth
    // rather than as a fringe.
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
        {[
          ["leg-step-b", 7],
          ["leg-step-a", -12],
        ].map(([cls, x]) => (
          <g key={x} className={cls}>
            <rect x={x} y="-15" width="4.6" height="16" rx="2.3" style={tinted("#3a3142")} />
            <rect x={x} y="-15" width="4.6" height="16" rx="2.3" fill="#000" opacity="0.28" />
          </g>
        ))}
        <g className="resident-type">
          {/* haunch, then barrel — the two-mass body of a walking cat */}
          <ellipse cx="8" cy="-20" rx="10.5" ry="9.5" style={tinted("#3a3142")} />
          <ellipse cx="-1" cy="-18" rx="17" ry="9" style={tinted("#3a3142")} />
          <ellipse cx="-3" cy="-22" rx="10" ry="4" fill="#fff" opacity="0.09" />
          <ellipse cx="-1" cy="-12.5" rx="15" ry="3.6" fill="#000" opacity="0.16" />
          <rect x="-9.5" y="-16" width="4.6" height="16" rx="2.3" style={tinted("#3a3142")} />
          <rect x="9.5" y="-16" width="4.6" height="16" rx="2.3" style={tinted("#3a3142")} />
          <CatFace x={-15} y={-27} r={7.6} asleep={false} />
        </g>
        <path
          d="M16 -22 q11 -3 8 -17"
          fill="none"
          style={{ stroke: "var(--tint, #3a3142)" }}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    );
  }
  // Curled up asleep: the body breathes slowly from the belly, and once in a
  // long while the tail flicks (rarity is charm).
  return (
    <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
      {/* the tail wraps AROUND the curl and is drawn first, so the body sits
          on top of it — that overlap is what sells "curled up" */}
      <path
        className="tail-flick"
        d="M14 -3 q13 1 14 -8 q1 -8 -7 -9"
        fill="none"
        style={{ stroke: "var(--tint, #3a3142)" }}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <g className="cat-breathe">
        <ellipse cx="0" cy="-7" rx="22" ry="11.5" style={tinted("#3a3142")} />
        <ellipse cx="9" cy="-12" rx="12" ry="9" style={tinted("#3a3142")} />
        <ellipse cx="8" cy="-15" rx="7" ry="3.4" fill="#fff" opacity="0.07" />
        <ellipse cx="-3" cy="-11" rx="12" ry="4.5" fill="#fff" opacity="0.07" />
        <ellipse cx="0" cy="-2.5" rx="20" ry="5.5" fill="#000" opacity="0.2" />
        <CatFace x={-14} y={-13} r={8.2} asleep />
        {/* front paws tucked under the chin */}
        <ellipse cx="-8" cy="-3.6" rx="5" ry="2.8" style={tinted("#3a3142")} />
        <ellipse cx="-8" cy="-4.2" rx="4.4" ry="2.2" fill="#fff" opacity="0.08" />
      </g>
    </g>
  );
}

function SquareRug() {
  return (
    <g>
      <RugGround w={2.5} d={2} m={0.24} fallback="#8a7ac2" ground={0.42} />
      {/* Concentric bands — the simplest weave that still reads as woven. */}
      <polygon points={floorPatch(0.46, 0.4, 1.58, 1.2)} fill="#000" opacity="0.1" />
      <polygon points={floorPatch(0.68, 0.58, 1.14, 0.84)} fill="#f7e9e2" opacity="0.13" />
      <polygon points={floorPatch(0.95, 0.8, 0.6, 0.4)} fill="#f7e9e2" opacity="0.16" />
      <Fringe gx={0} gy={0.24} len={1.52} axis="gy" out={-0.12} n={6} />
      <Fringe gx={2.5} gy={0.24} len={1.52} axis="gy" out={0.12} n={6} />
    </g>
  );
}

// Shaded box helper: every face gets the tint, with translucent black
// overlays for depth so ANY chosen colour reads correctly. A thin light
// catch runs along the top-front edges — the cheap bevel that stops a
// flat-shaded box reading as cardboard (user feedback: "too blocky").
/**
 * The workhorse: an axis-aligned volume with its three visible faces at three
 * values (top lit, left mid, right dark), shaded by translucent black so the
 * depth survives ANY tint.
 *
 * `tint={false}` opts a part out of the colour picker. That matters more than
 * it sounds: a bed's tint is its DUVET, so the frame and headboard have to
 * stay wood — without this, picking purple gave you a purple headboard too.
 */
function TintedBox({ gx, gy, dx, dy, h, fallback, dark = 0.32, mid = 0.18, tint = true }) {
  const box = isoBox(gx, gy, dx, dy, h);
  const { B, C, D } = box.corners;
  const up = (p) => `${p.x},${p.y - h}`;
  const paint = { fill: tint ? `var(--tint, ${fallback})` : fallback };
  // How deep the contact shading runs, scaled to the box — a 3px chair seat
  // must not get the same 7px band as a wardrobe.
  const foot = Math.min(7, Math.max(1.5, h * 0.34));
  return (
    <g>
      <polygon points={box.left} style={paint} />
      <polygon points={box.left} fill="#000" opacity={mid} />
      <polygon points={box.right} style={paint} />
      <polygon points={box.right} fill="#000" opacity={dark} />
      <polygon points={box.top} style={paint} />
      {/* Contact shading where the box meets whatever it stands on. Nearly
          every piece in the catalog is built from these, so one band here
          gives the whole room weight at once — without it a box looks pasted
          onto the floor rather than resting on it. */}
      <polygon
        points={`${D.x},${D.y} ${C.x},${C.y} ${C.x},${C.y - foot} ${D.x},${D.y - foot}`}
        fill="#000"
        opacity="0.15"
      />
      <polygon
        points={`${B.x},${B.y} ${C.x},${C.y} ${C.x},${C.y - foot} ${B.x},${B.y - foot}`}
        fill="#000"
        opacity="0.15"
      />
      <polyline
        points={`${up(D)} ${up(C)} ${up(B)}`}
        fill="none"
        stroke="#fff"
        opacity="0.13"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </g>
  );
}

// ---- more greenery ------------------------------------------------------ //
// All of these hang off PlantBase, so the pot shades correctly against any
// tint and the foliage sways with everything else for free. What separates
// them is silhouette: a fern arches out, a palm goes up on bare stems, a
// snake plant is stiff verticals. Leaf shape alone reads at room scale where
// leaf DETAIL doesn't.

function Fern() {
  // Filled, tapering fronds rather than stroked spines: stroke-only read as a
  // spider. Each frond is one outline with the pinnae cut into its edge by
  // alternating short segments, which survives being 40px tall where drawing
  // individual leaflets does not.
  const frond = (rot, len, bow) => {
    // Finer, shallower teeth: at 7 deep serrations it read as an ALOE. A fern
    // frond is a soft comb, so the pinnae want to be many and small.
    const seg = 11;
    let out = `M0 0 Q ${bow * 0.5} ${-len * 0.55} ${bow} ${-len}`;
    for (let i = seg; i >= 1; i--) {
      const t = i / seg;
      const x = bow * t * t;
      const y = -len * t;
      const w = 4.4 * Math.sin(Math.PI * t) + 0.9;
      out += ` L${x - w} ${y + 1.6} L${x - w * 0.72} ${y + 3.2}`;
    }
    return (
      <g key={rot} transform={`rotate(${rot})`}>
        <path d={`${out} Z`} fill="#3f7f63" />
        <path
          d={`M0 0 Q ${bow * 0.5} ${-len * 0.55} ${bow} ${-len}`}
          fill="none"
          stroke="#56a07c"
          strokeWidth="1.1"
        />
      </g>
    );
  };
  return (
    <PlantBase
      foot={0.7}
      potH={13}
      leaves={
        <>
          {frond(-58, 25, -14)}
          {frond(-30, 33, -10)}
          {frond(-5, 37, -3)}
          {frond(22, 34, 9)}
          {frond(50, 27, 15)}
        </>
      }
    />
  );
}

function Palm() {
  // Bare stems with the crown up top — the empty middle is the whole point of
  // a parlour palm, and it's what keeps it from reading as a big shrub.
  return (
    <PlantBase
      foot={0.9}
      potH={18}
      leaves={
        <>
          {[-6, 0, 5].map((x, i) => (
            <path
              key={x}
              d={`M${x * 0.3} 0 Q ${x} ${-30 - i * 4} ${x * 1.6} ${-58 - i * 6}`}
              fill="none"
              stroke="#6b7f4a"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ))}
          {[[-26, -70, -20], [-13, -80, -8], [4, -82, 6], [20, -72, 18], [-20, -58, -26], [16, -56, 24]].map(
            ([x, y, tip]) => (
              <path
                key={`${x}-${y}`}
                d={`M${x * 0.35} ${y * 0.55} Q ${x} ${y} ${tip} ${y + 12}`}
                fill="none"
                stroke="#3f7f63"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.95"
              />
            )
          )}
        </>
      }
    />
  );
}

function SnakePlant() {
  // Stiff blades, each with a pale margin — sansevieria's stripe is the one
  // detail that survives being 60px tall.
  const blade = (x, h, lean, tone) => (
    <g key={`${x}-${h}`}>
      <path
        d={`M${x} 0 Q ${x + lean * 0.4} ${-h * 0.55} ${x + lean} ${-h} Q ${x + lean + 3} ${-h * 0.5} ${x + 4} 0 Z`}
        fill={tone}
      />
      <path
        d={`M${x + 1.5} -3 Q ${x + lean * 0.4 + 1} ${-h * 0.55} ${x + lean + 0.5} ${-h + 4}`}
        fill="none"
        stroke="#d8c46a"
        strokeWidth="0.9"
        opacity="0.5"
      />
    </g>
  );
  return (
    <PlantBase
      foot={0.6}
      potH={14}
      leaves={
        <>
          {blade(-10, 40, -7, "#356b52")}
          {blade(-4, 54, -3, "#3f7f63")}
          {blade(1, 58, 2, "#4b8f6e")}
          {blade(6, 44, 7, "#356b52")}
        </>
      }
    />
  );
}

function Bonsai() {
  // A shallow tray, a leaning trunk and two cloud-pads. Small enough that the
  // silhouette is all there is, so the lean does the work.
  return (
    <g>
      <TintedBox gx={0.03} gy={0.03} dx={0.44} dy={0.39} h={6} fallback="#6b4436" dark={0.34} mid={0.2} />
      <g transform={`translate(${project(0.25, 0.21).x}, ${project(0.25, 0.21).y - 6})`}>
        <ellipse cx="0" cy="0" rx="9" ry="4" fill="#3a2a24" />
        <g className="room-sway">
          <path d="M0 -1 q-2 -7 3 -11 q6 -5 4 -9" fill="none" stroke="#6b4436" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M2 -8 q4 -1 7 -4" fill="none" stroke="#6b4436" strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="8" cy="-22" rx="9" ry="5" fill="#3f7f63" />
          <ellipse cx="8" cy="-23.5" rx="6" ry="3" fill="#56a07c" />
          <ellipse cx="11" cy="-13" rx="6" ry="3.2" fill="#356b52" />
        </g>
      </g>
    </g>
  );
}

function Succulent() {
  // A rosette read from above-ish: overlapping petals, tightest in the middle.
  const c = project(0.175, 0.175);
  return (
    <g>
      <PlantPot foot={0.35} h={7} fallback="#c98a6b" rim={2} />
      <g transform={`translate(${c.x}, ${c.y - 7})`}>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-2.5"
            rx="5.5"
            ry="2.6"
            fill="#5f9b6f"
            transform={`rotate(${a}) translate(3.5,0)`}
          />
        ))}
        <ellipse cx="0" cy="-4" rx="3.2" ry="1.8" fill="#7cb886" />
      </g>
    </g>
  );
}

function Orchid() {
  // One arching stem with blooms stepping down it — an orchid is mostly empty
  // space, which is exactly what makes it read as an orchid.
  const c = project(0.2, 0.2);
  return (
    <g>
      <PlantPot foot={0.4} h={9} fallback="#cbd5e8" rim={2.5} />
      <g transform={`translate(${c.x}, ${c.y - 9})`}>
        <g className="room-sway">
          <path d="M-1 -1 q-2 -14 4 -20 q4 -4 3 -6" fill="none" stroke="#4f8f6a" strokeWidth="1.6" strokeLinecap="round" />
          {[[6, -27], [3.5, -21], [0.5, -15]].map(([x, y], i) => (
            <g key={y}>
              <circle cx={x} cy={y} r={3.4 - i * 0.4} fill="#e6a8c8" />
              <circle cx={x} cy={y} r={1.4 - i * 0.15} fill="#f7e9e2" opacity="0.8" />
            </g>
          ))}
          <ellipse cx="-4" cy="-4" rx="5" ry="2.4" fill="#3f7f63" transform="rotate(-16 -4 -4)" />
          <ellipse cx="4" cy="-3" rx="4.6" ry="2.2" fill="#4f8f6a" transform="rotate(14 4 -3)" />
        </g>
      </g>
    </g>
  );
}

// ---- more light --------------------------------------------------------- //
// None of these draw their own pool on the floor. Light is cast by the SCENE
// from the catalog's `glow` field, so every source dims together at noon —
// sprites that lit themselves stayed bright at midday and read as stickers.

function TableLamp() {
  // The small one that lives on a nightstand. Same drum-shade language as the
  // floor lamp, so a room using both reads as one set.
  const c = project(0.225, 0.225);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="7" ry="3.4" fill="#000" opacity="0.3" />
      <ellipse cx="0" cy="-2" rx="6.5" ry="3" style={tinted("#6b4436")} />
      <rect x="-1.4" y="-15" width="2.8" height="13" style={tinted("#6b4436")} />
      <path d="M-9 -15 L-6.5 -27 L6.5 -27 L9 -15 Z" fill="#f7e9e2" />
      <path d="M-9 -15 L-6.5 -27 L0 -27 L0 -15 Z" fill="#fff" opacity="0.25" />
      <ellipse cx="0" cy="-15" rx="9" ry="2.6" fill="#ffe9b0" opacity="0.55" />
    </g>
  );
}

function Candelabra() {
  // Three candles on a branched stand — the staggered heights are what stop it
  // reading as a fork.
  const c = project(0.25, 0.25);
  const arm = (x, h) => (
    <g key={x}>
      <path
        d={`M0 -12 Q ${x * 0.7} ${-14 - h * 0.3} ${x} ${-14 - h * 0.55}`}
        fill="none"
        stroke="#c9a227"
        strokeWidth="1.6"
      />
      <rect x={x - 2.2} y={-16 - h * 0.55} width="4.4" height={h * 0.4} rx="1" fill="#f7e9e2" />
      <path
        d={`M${x} ${-18 - h * 0.55} q2.2 2.2 0 4.4 q-2.2 -2.2 0 -4.4`}
        fill="#ffb347"
        className="room-flicker"
      />
    </g>
  );
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="7.5" ry="3.6" fill="#000" opacity="0.28" />
      <ellipse cx="0" cy="-2.5" rx="6.5" ry="3" fill="#c9a227" />
      <rect x="-1.2" y="-14" width="2.4" height="12" fill="#c9a227" />
      {arm(-7, 14)}
      {arm(7, 14)}
      {arm(0, 26)}
    </g>
  );
}

function PaperLantern() {
  // A standing rice-paper globe. It was a pointed bullet before, which read as
  // a missile — a lantern is a barrel: flat caps top and bottom with the
  // widest point in the middle, and horizontal ribs to say "paper over a
  // frame".
  const c = project(0.35, 0.35);
  const BOT = -15;
  const TOP = -66;
  const R = 13;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="8" ry="3.8" fill="#000" opacity="0.3" />
      <ellipse cx="0" cy="-2" rx="7" ry="3.2" fill="#3a2a24" />
      <rect x="-1.2" y={BOT} width="2.4" height={-BOT - 2} fill="#3a2a24" />
      <path
        d={`M-5 ${BOT} Q ${-R} ${BOT} ${-R} ${(BOT + TOP) / 2} Q ${-R} ${TOP} -5 ${TOP} L5 ${TOP} Q ${R} ${TOP} ${R} ${(BOT + TOP) / 2} Q ${R} ${BOT} 5 ${BOT} Z`}
        style={tinted("#f7e9e2")}
      />
      <path
        d={`M-5 ${BOT} Q ${-R} ${BOT} ${-R} ${(BOT + TOP) / 2} Q ${-R} ${TOP} -5 ${TOP} L-3 ${TOP} L-3 ${BOT} Z`}
        fill="#fff"
        opacity="0.22"
      />
      <path
        d={`M5 ${BOT} Q ${R} ${BOT} ${R} ${(BOT + TOP) / 2} Q ${R} ${TOP} 5 ${TOP} L3 ${TOP} L3 ${BOT} Z`}
        fill="#000"
        opacity="0.12"
      />
      {[0.2, 0.4, 0.6, 0.8].map((t) => {
        const y = BOT + (TOP - BOT) * t;
        const rr = R * (0.55 + 0.45 * Math.sin(Math.PI * t));
        return <ellipse key={t} cx="0" cy={y} rx={rr} ry="1.6" fill="none" stroke="#000" strokeWidth="0.7" opacity="0.14" />;
      })}
      <ellipse cx="0" cy={TOP} rx="5.5" ry="2" fill="#3a2a24" />
      <ellipse cx="0" cy={BOT} rx="5.5" ry="2" fill="#3a2a24" opacity="0.8" />
      <ellipse cx="0" cy={(BOT + TOP) / 2} rx="7" ry="14" fill="#ffe9b0" opacity="0.28" />
    </g>
  );
}

function Sconce() {
  // Drawn in the wall's own skewed plane, like a picture frame. It was a thin
  // bracket before and vanished at room scale; the readable version is a
  // half-cup uplighter with a bright rim, because the CUP is the silhouette.
  const cx = 10;
  const Y = -58;
  return (
    <g transform={`skewY(${SKEW})`}>
      {/* the wash up the wall above it, under everything else */}
      <path d={`M${cx - 9} ${Y} L${cx - 14} ${Y - 26} L${cx + 14} ${Y - 26} L${cx + 9} ${Y} Z`} fill="#ffe9b0" opacity="0.1" />
      <path d={`M${cx - 8} ${Y + 4} L${cx - 12} ${Y + 28} L${cx + 12} ${Y + 28} L${cx + 8} ${Y + 4} Z`} fill="#ffe9b0" opacity="0.07" />
      {/* backplate + arm */}
      <rect x={cx - 2.5} y={Y + 4} width="5" height="13" rx="1.5" style={tinted("#c9a227")} />
      <rect x={cx - 2.5} y={Y + 4} width="2" height="13" fill="#fff" opacity="0.2" />
      {/* the cup, open at the top */}
      <path d={`M${cx - 10} ${Y - 2} Q ${cx} ${Y + 12} ${cx + 10} ${Y - 2} Z`} style={tinted("#c9a227")} />
      <path d={`M${cx - 10} ${Y - 2} Q ${cx} ${Y + 12} ${cx} ${Y + 6} L${cx} ${Y - 2} Z`} fill="#000" opacity="0.18" />
      <ellipse cx={cx} cy={Y - 2} rx="10" ry="2.6" fill="#f7e9e2" />
      <ellipse cx={cx} cy={Y - 3} rx="7" ry="1.8" fill="#ffe9b0" />
      <ellipse cx={cx} cy={Y - 6} rx="4.5" ry="4" fill="#ffe9b0" opacity="0.55" />
    </g>
  );
}

function Pendant() {
  // Hangs from the top of the wall on a flex, like the hanging plant. A cone
  // shade, not the shallow dish it started as — that read as a flying saucer.
  const cx = 13;
  const Y = -62;
  return (
    <g transform={`skewY(${SKEW})`}>
      <rect x={cx - 0.7} y="-116" width="1.4" height={116 + Y - 16} fill="#3a2a24" opacity="0.85" />
      <path d={`M${cx - 13} ${Y} L${cx - 4} ${Y - 20} L${cx + 4} ${Y - 20} L${cx + 13} ${Y} Z`} style={tinted("#3a3142")} />
      <path d={`M${cx - 13} ${Y} L${cx - 4} ${Y - 20} L${cx} ${Y - 20} L${cx} ${Y} Z`} fill="#fff" opacity="0.13" />
      <ellipse cx={cx} cy={Y} rx="13" ry="3.6" fill="#f7e9e2" />
      <ellipse cx={cx} cy={Y} rx="9" ry="2.4" fill="#ffe9b0" />
      <circle cx={cx} cy={Y + 3} r="3.2" fill="#ffe9b0" opacity="0.9" />
      {/* the cone of light it drops onto whatever is under it */}
      <path d={`M${cx - 12} ${Y + 3} L${cx - 20} ${Y + 40} L${cx + 20} ${Y + 40} L${cx + 12} ${Y + 3} Z`} fill="#ffe9b0" opacity="0.08" />
    </g>
  );
}

// ---- structure ---------------------------------------------------------- //

function Stairs({ back }) {
  // A solid stepped mass: every tread is a box running from the FLOOR up to
  // its own height, not a slab floating at that height. Built as floating
  // slabs you see daylight under the flight; built solid, each nearer step
  // overlaps the base of the one behind and the whole thing reads as one
  // piece of joinery.
  //
  // It climbs AWAY from the camera. The first version ascended toward the
  // viewer, which put the top of the flight — and the dark landing it
  // disappears into — hanging in the middle of the room.
  //
  // Where it goes at the top is deliberately not modelled: a real upper floor
  // would mean giving every placement a level, and the depth sort and the drag
  // engine would both have to learn about height.
  // Six steps, not eight: at a full storey the flight was as tall as the wall
  // and swallowed whatever stood behind it. This reads as stairs up to a
  // mezzanine and lets the room breathe.
  const STEPS = 6;
  const W = 1;
  const D = 2.5;
  const RISE = 11;
  const run = D / STEPS;
  const treads = Array.from({ length: STEPS }, (_, i) => {
    // i = 0 is the far, tall end. Reversed for the away-facing rotations.
    const level = back ? i + 1 : STEPS - i;
    return (
      <g key={i}>
        <TintedBox
          gx={0}
          gy={i * run}
          dx={W}
          dy={run + 0.02}
          h={level * RISE}
          fallback="#a87f5f"
          dark={0.34}
          mid={0.18}
        />
      </g>
    );
  });
  return (
    <g>
      {/* The shadow the flight casts back onto itself at the head, so the top
          tread doesn't read as the top of a plain block. */}
      <g transform={`translate(0,${-(back ? 1 : STEPS) * RISE})`}>
        <polygon points={floorPatch(0, 0, W, 0.08)} fill="#000" opacity="0.22" />
      </g>
      {treads}
    </g>
  );
}

function Railing() {
  // Posts, a handrail, and thin balusters between them.
  const W = 2;
  const H = 32;
  return (
    <g>
      {[0.04, W / 2 - 0.07, W - 0.18].map((gx) => (
        <TintedBox key={gx} gx={gx} gy={0.05} dx={0.14} dy={0.14} h={H} fallback="#6b4436" dark={0.36} mid={0.2} />
      ))}
      {Array.from({ length: 9 }, (_, i) => {
        const gx = 0.18 + (i * (W - 0.42)) / 8;
        return (
          <TintedBox
            key={gx}
            gx={gx}
            gy={0.09}
            dx={0.05}
            dy={0.05}
            h={H - 4}
            fallback="#8f5d49"
            dark={0.38}
            mid={0.22}
          />
        );
      })}
      <g transform={`translate(0,${-H})`}>
        <TintedBox gx={0} gy={0.02} dx={W} dy={0.2} h={5} fallback="#a87f5f" dark={0.28} mid={0.14} />
      </g>
    </g>
  );
}

function Pillar() {
  // Base, shaft, capital. The two flares are the whole difference between a
  // column and a fencepost.
  const H = 92;
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={0.6} dy={0.6} h={9} fallback="#cbb6a0" dark={0.32} mid={0.18} />
      <g transform="translate(0,-9)">
        <TintedBox gx={0.1} gy={0.1} dx={0.4} dy={0.4} h={H} fallback="#e0cdb8" dark={0.3} mid={0.15} />
        <g transform={`translate(0,${-H})`}>
          <TintedBox gx={0} gy={0} dx={0.6} dy={0.6} h={10} fallback="#cbb6a0" dark={0.32} mid={0.18} />
        </g>
      </g>
    </g>
  );
}

// ---- autumn ------------------------------------------------------------- //
// A seasonal set. The rules these follow are the ones cozy isometric games
// (Animal Crossing, Stardew, Unpacking, Cozy Grove) all converge on, and they
// are what "clean" means here:
//
//   1. SILHOUETTE FIRST — the outline alone has to name the object at 30px.
//      A pumpkin is ribs-and-a-stem; a rake is a pole and a fan.
//   2. TWO OR THREE TONES per material, never a gradient ramp. TintedBox
//      already enforces this for boxes; the round items do it by hand.
//   3. ONE HERO COLOUR per object, everything else neutral, so a shelf of
//      them doesn't turn into confetti.
//   4. DETAIL AS FEW LARGE SHAPES — a toaster is a box, a slot and a lever.
//      Fine texture disappears at room scale and only costs nodes.
//   5. CHUNKY PROPORTIONS — cozy games oversize the readable part (a kettle's
//      spout, a mug's handle) rather than staying to scale.

function MapleTree() {
  // Same construction as Tree, dressed for the season: the canopy runs amber
  // through to deep red, warmest at the crown where the light is.
  const c = project(0.75, 0.75);
  return (
    <g>
      <path
        d={`M${c.x - 5} ${c.y} L${c.x - 3} ${c.y - 44} L${c.x + 3} ${c.y - 44} L${c.x + 5} ${c.y} Z`}
        fill="#6b4a39"
      />
      <g className="room-sway">
        <ellipse cx={c.x} cy={c.y - 56} rx="33" ry="21" style={tinted("#a8442f")} />
        <ellipse cx={c.x} cy={c.y - 56} rx="33" ry="21" fill="#000" opacity="0.14" />
        <ellipse cx={c.x - 7} cy={c.y - 73} rx="26" ry="17" style={tinted("#c0563f")} />
        <ellipse cx={c.x + 8} cy={c.y - 86} rx="17" ry="12" style={tinted("#d98b3a")} />
        <ellipse cx={c.x + 10} cy={c.y - 88} rx="9" ry="6" fill="#fff" opacity="0.14" />
      </g>
    </g>
  );
}

function LeafPile() {
  // Low and WIDE, with the leaves lying down. The first version stood them on
  // end over a tall red mound and the whole thing read as a campfire — the
  // give-away for a leaf pile is that it spreads sideways and its edge is
  // ragged, not that it's tall.
  const c = project(0.5, 0.4);
  const leaf = (x, y, r, s, fill) => (
    <path
      key={`${x}-${y}-${fill}`}
      d="M0 0 q5 -1.6 9 0 q-4 1.6 -9 0 z"
      fill={fill}
      transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}
    />
  );
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="21" ry="8.5" fill="#000" opacity="0.14" />
      {/* the mass: a shallow drift, barely taller than the leaves on it */}
      <path d="M-21 -1 q4 -7 12 -8 q9 -3 18 1 q7 2 12 7 z" style={tinted("#8f3d2c")} />
      <path d="M4 -8 q7 2 13 7 l-9 0 q-2 -5 -8 -7 z" fill="#000" opacity="0.16" />
      {/* leaves lying across it, angles kept shallow so nothing stands up */}
      {leaf(-16, -3, -12, 1, "#c0563f")}
      {leaf(-9, -6.5, 8, 1.1, "#d98b3a")}
      {leaf(-2, -9, -6, 1, "#e0a34a")}
      {leaf(5, -7, 14, 1.05, "#c0563f")}
      {leaf(11, -4, -10, 0.95, "#d98b3a")}
      {leaf(-13, -1.5, 20, 0.9, "#a8442f")}
      {leaf(3, -2, -18, 0.9, "#e0a34a")}
      {/* two strays on the floor beside it */}
      {leaf(-24, 0.5, -26, 0.8, "#c0563f")}
      {leaf(17, 0, 16, 0.8, "#d98b3a")}
    </g>
  );
}

function HayBale() {
  // A rectangular bale: straw texture as a few long strokes, two twine bands,
  // and cut ends that are lighter than the sides.
  const W = 0.9;
  const D = 0.7;
  const H = 26;
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#c9a24b" dark={0.3} mid={0.16} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {[-21, -16, -11, -6].map((y) => (
          <rect key={y} x="2" y={y} width={W * (TILE_W / 2) - 4} height="1" fill="#000" opacity="0.13" />
        ))}
        {[5, W * (TILE_W / 2) - 9].map((x) => (
          <rect key={x} x={x} y={-H + 2} width="2.4" height={H - 2} fill="#8a6a2f" opacity="0.7" />
        ))}
      </g>
      <g transform={`translate(0,${-H})`}>
        <polygon points={floorPatch(0.06, 0.06, W - 0.12, D - 0.12)} fill="#fff" opacity="0.09" />
      </g>
    </g>
  );
}

/** Shared pumpkin body: ribs and a stem. The carved face is the only thing
 *  that separates the two, so it's the only thing that differs. */
function PumpkinBody({ carved }) {
  const c = project(0.25, 0.25);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="11" ry="5" fill="#000" opacity="0.18" />
      <ellipse cx="0" cy="-8" rx="11" ry="8.5" style={tinted("#d9782f")} />
      {/* ribs: three arcs, the outer two darker so the body turns away */}
      <path d="M-6 -15.5 q-3.5 7.5 0 15" fill="none" stroke="#000" strokeWidth="1.1" opacity="0.16" />
      <path d="M6 -15.5 q3.5 7.5 0 15" fill="none" stroke="#000" strokeWidth="1.1" opacity="0.16" />
      <path d="M0 -16.5 q-2 8 0 16" fill="none" stroke="#000" strokeWidth="0.9" opacity="0.1" />
      <ellipse cx="-4.5" cy="-11" rx="3.5" ry="2.6" fill="#fff" opacity="0.13" />
      <path d="M-1.6 -16 q0 -4 -2.5 -6 q4 0.5 5.5 5.5 z" fill="#4f6b3a" />
      <rect x="-1.4" y="-19" width="2.8" height="4" rx="1.2" fill="#6b7f4a" />
      {carved && (
        <g fill="#ffe9b0">
          <path d="M-6 -11 l4 0 l-2 3.2 z" />
          <path d="M2 -11 l4 0 l-2 3.2 z" />
          <path d="M-5.5 -6 l11 0 l-1.6 2.6 l-2 -1.4 l-2 1.4 l-2 -1.4 l-2 1.4 z" />
        </g>
      )}
    </g>
  );
}

function Pumpkin() {
  return <PumpkinBody />;
}

function JackOLantern() {
  return <PumpkinBody carved />;
}

function Rake() {
  // Leans, because a rake standing bolt upright reads as a broom. The fan of
  // tines is the whole silhouette.
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="2" cy="-1" rx="7" ry="3" fill="#000" opacity="0.16" />
      <path d="M6 -2 L-3 -56" stroke="#a87f5f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M6 -2 L-3 -56" stroke="#000" strokeWidth="1" opacity="0.14" strokeLinecap="round" />
      <g transform="translate(6,-2)">
        <path d="M-9 0 q9 -5 18 0" fill="none" stroke="#5b5166" strokeWidth="1.8" />
        {[-9, -5.5, -2, 1.5, 5, 8.5].map((x, i) => (
          <path
            key={x}
            d={`M${x} ${-1.6 + Math.abs(i - 2.5) * 0.5} l${(x + 1) * 0.14} 5.5`}
            stroke="#5b5166"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        ))}
      </g>
      <rect x="-4.4" y="-58" width="3" height="5" rx="1.4" fill="#6b4436" transform="rotate(-9 -3 -56)" />
    </g>
  );
}

function Wreath() {
  // A wall piece, so it lives in the wall's skewed plane like a picture frame.
  const cx = 14;
  const cy = -58;
  return (
    <g transform={`skewY(${SKEW})`}>
      <circle cx={cx} cy={cy} r="11" fill="none" stroke="#3f5f3a" strokeWidth="6" />
      <circle cx={cx} cy={cy} r="11" fill="none" stroke="#000" strokeWidth="6" opacity="0.12" />
      {/* sprigs and berries around the ring, placed by angle so it stays even */}
      {[20, 70, 130, 190, 250, 310].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <ellipse
            key={a}
            cx={cx + Math.cos(r) * 11}
            cy={cy + Math.sin(r) * 11}
            rx="4.5"
            ry="3"
            fill="#4f8f6a"
            transform={`rotate(${a} ${cx + Math.cos(r) * 11} ${cy + Math.sin(r) * 11})`}
          />
        );
      })}
      {[0, 100, 210, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        return <circle key={a} cx={cx + Math.cos(r) * 10} cy={cy + Math.sin(r) * 10} r="1.7" fill="#c0563f" />;
      })}
      <path d={`M${cx - 5} ${cy + 12} q5 -4 10 0 q-5 5 -10 0 z`} fill="#a8442f" />
      <path d={`M${cx - 3} ${cy + 13} l-2 7 M${cx + 3} ${cy + 13} l2 7`} stroke="#a8442f" strokeWidth="1.8" />
    </g>
  );
}

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

function Oven() {
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

function Sink() {
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

function Microwave() {
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

function Toaster() {
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

function Kettle() {
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

function Pot() {
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

function Teapot() {
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
      <g className="steam-puff">
        <ellipse cx="9" cy="-15" rx="1.6" ry="2.6" fill="#fff" opacity="0.25" />
      </g>
    </g>
  );
}

function FruitBowl() {
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

function Bread() {
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

function Cake() {
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

function Pie() {
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

function Ramen() {
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
      <g className="steam-puff">
        <ellipse cx="0" cy="-13" rx="1.8" ry="2.8" fill="#fff" opacity="0.25" />
      </g>
    </g>
  );
}

// ---- upholstery (hand-drawn again, on purpose) -------------------------- //
// These three came back from the Kenney kit to SVG. The kit's renders are
// TRUE isometric (base-diamond ratio 0.5774) while this room is 2:1 dimetric
// (0.5), so every PNG sat on a base ~15% taller than the tile beneath it and
// never quite landed on the grid; they also blurred the moment the camera
// zoomed, and a PNG can't take `--tint` (hence 30 pre-shaded colourway files
// for what is now just "any colour you like"). Drawing them from project()
// fixes all three at once — correct on the grid by construction, sharp at any
// zoom, tintable.
//
// Every part is a real VOLUME — three faces at three values, stacked by
// translating up by the height of whatever it rests on. The first attempt
// drew soft flat pads instead, and a stack of flat pads reads as cards lying
// on the floor, not as furniture (user feedback, and they were right).
// What makes these read: a headboard far taller than the foot, a mattress
// inset so the frame shows as a lip, a duvet drawn from the FRAME up and
// wider than the mattress so it drapes over the edge, cushions inset from the
// arms, and legs leaving a shadow gap under the frame.

function Bed() {
  const W = 2;
  const D = 2.8;
  // Deliberately shallow. A bed is ~115px across on screen, so a 27px-thick
  // stack of frame + mattress + duvet read as a crate; at 19 it reads as a
  // bed seen from above. Height is for the HEADBOARD to spend, not the base.
  const FRAME = 7;
  const MAT = 8;
  return (
    <g>
      {/* Woodwork is tint={false}: the picked colour belongs to the duvet, so
          a purple bed must not arrive with a purple headboard. */}
      <TintedBox gx={0} gy={0} dx={W} dy={0.22} h={32} fallback="#8f5d49" tint={false} dark={0.38} mid={0.22} />
      <TintedBox gx={0} gy={0.22} dx={W} dy={D - 0.22} h={FRAME} fallback="#a87f5f" tint={false} dark={0.34} mid={0.2} />
      <g transform={`translate(0,${-FRAME})`}>
        {/* mattress, inset all round so the frame reads as a lip beneath it */}
        <TintedBox gx={0.13} gy={0.35} dx={W - 0.26} dy={D - 0.5} h={MAT} fallback="#e9e0d4" tint={false} dark={0.2} mid={0.1} />
        <g transform={`translate(0,${-MAT})`}>
          {/* pillows: small and flat. Chunky ones stopped reading as bedding
              and started reading as boxes stacked on the bed. */}
          <TintedBox gx={0.24} gy={0.5} dx={0.6} dy={0.42} h={5} fallback="#f7f2ea" tint={false} dark={0.16} mid={0.08} />
          <TintedBox gx={1.16} gy={0.5} dx={0.6} dy={0.42} h={5} fallback="#f7f2ea" tint={false} dark={0.16} mid={0.08} />
        </g>
        {/* Duvet: drawn from the FRAME top (not the mattress top) and wider
            than the mattress, so its sides fall past the mattress edge —
            that's the drape. Stops short of the pillows. */}
        <TintedBox gx={0.05} gy={1.15} dx={W - 0.1} dy={D - 1.3} h={MAT + 4} fallback="#f2e9dd" dark={0.28} mid={0.15} />
      </g>
    </g>
  );
}

/**
 * Sofa and armchair are one piece of furniture at two widths: a back slab,
 * two arms, a plinth between them, and ONE cushion per seat. Widening it adds
 * a cushion rather than a second drawing.
 *
 * There used to be a second row of cushions standing against the back. They
 * made the sofa read as a stack of blocks rather than a seat, so the back
 * slab carries that job alone now and the whole piece sits lower.
 *
 * Draw order is depth order: back (farthest), left arm, plinth, cushions,
 * right arm (nearest).
 */
function Upholstered({ w, seats, back = false }) {
  // Slimmer than a full tile front-to-back, with thin arms and a thin back:
  // at 1.0 deep with 0.28 arms the frame ate the seat and the whole thing read
  // bulky. `d` must match the catalog's foot[1] or the sprite won't fill its
  // own footprint.
  const D = 0.85;
  const ARM = 0.2;
  const BACK = 0.22;
  const PLINTH = 11;
  const inner = w - ARM * 2;
  const gap = 0.06;
  const cw = (inner - gap * (seats - 1)) / seats;
  const at = (i) => ARM + i * (cw + gap);
  const foot = (gx, gy) => (
    <TintedBox
      key={`${gx}-${gy}`}
      gx={gx}
      gy={gy}
      dx={0.14}
      dy={0.14}
      h={4}
      fallback="#6b4a39"
      tint={false}
      dark={0.42}
      mid={0.26}
    />
  );
  return (
    <g>
      {/* Legs stay wood, and the gap they leave is what stops a sofa looking
          like it was poured into the floor. */}
      {foot(0.06, 0.08)}
      {foot(w - 0.2, 0.08)}
      {foot(0.06, 0.63)}
      {foot(w - 0.2, 0.63)}
      <g transform="translate(0,-4)">
        {/* Seen from BEHIND, the order flips: the seat is at the far edge and
            the backrest stands at the near one, hiding the cushions almost
            entirely. That occlusion is the whole read — it's what stops a
            turned-around sofa looking like a sofa you can see into. */}
        {back ? (
          <>
            <TintedBox gx={0} gy={0} dx={ARM} dy={D - BACK} h={19} fallback="#d98a93" dark={0.34} mid={0.19} />
            <TintedBox gx={ARM} gy={0} dx={inner} dy={D - BACK} h={PLINTH} fallback="#d98a93" dark={0.3} mid={0.16} />
            <g transform={`translate(0,${-PLINTH})`}>
              {Array.from({ length: seats }, (_, i) => (
                <TintedBox
                  key={`seat-${i}`}
                  gx={at(i) + 0.02}
                  gy={0.05}
                  dx={cw - 0.04}
                  dy={D - BACK - 0.12}
                  h={7}
                  fallback="#e8a3a8"
                  dark={0.2}
                  mid={0.1}
                />
              ))}
            </g>
            <TintedBox gx={w - ARM} gy={0} dx={ARM} dy={D - BACK} h={19} fallback="#d98a93" dark={0.34} mid={0.19} />
            {/* the backrest, now nearest the camera: one clean unbroken slab */}
            <TintedBox gx={0} gy={D - BACK} dx={w} dy={BACK} h={29} fallback="#d98a93" dark={0.36} mid={0.2} />
          </>
        ) : (
          <>
            <TintedBox gx={0} gy={0} dx={w} dy={BACK} h={29} fallback="#d98a93" dark={0.36} mid={0.2} />
            <TintedBox gx={0} gy={BACK} dx={ARM} dy={D - BACK} h={19} fallback="#d98a93" dark={0.34} mid={0.19} />
            <TintedBox gx={ARM} gy={BACK} dx={inner} dy={D - BACK} h={PLINTH} fallback="#d98a93" dark={0.3} mid={0.16} />
            {/* Cushions are the same fabric read LIGHTER (weaker black overlays),
                so they separate from the frame under any tint. With the back row
                gone they run the full depth of the seat. */}
            <g transform={`translate(0,${-PLINTH})`}>
              {Array.from({ length: seats }, (_, i) => (
                <TintedBox
                  key={`seat-${i}`}
                  gx={at(i) + 0.02}
                  gy={BACK + 0.05}
                  dx={cw - 0.04}
                  dy={D - BACK - 0.12}
                  h={7}
                  fallback="#e8a3a8"
                  dark={0.2}
                  mid={0.1}
                />
              ))}
            </g>
            <TintedBox gx={w - ARM} gy={BACK} dx={ARM} dy={D - BACK} h={19} fallback="#d98a93" dark={0.34} mid={0.19} />
          </>
        )}
      </g>
    </g>
  );
}

const Sofa = ({ back }) => <Upholstered w={2} seats={2} back={back} />;
const Armchair = ({ back }) => <Upholstered w={1} seats={1} back={back} />;
/** Drawer fronts on a carcass's front-left face. The skew is what turns a
 *  flat rect into something lying on that plane — same trick as the books. */
function Drawers({ gx, gy, dy, width, rows, top, height, gap = 2 }) {
  const o = project(gx, gy + dy);
  return (
    <g transform={`translate(${o.x}, ${o.y}) skewY(${SKEW})`}>
      {Array.from({ length: rows }, (_, i) => {
        const y = top + i * (height + gap);
        return (
          <g key={i}>
            <rect x="2" y={y} width={width - 4} height={height} rx="1.2" fill="#000" opacity="0.14" />
            <rect
              x={width / 2 - 3}
              y={y + height / 2 - 0.75}
              width="6"
              height="1.5"
              rx="0.75"
              fill="#fff"
              opacity="0.22"
            />
          </g>
        );
      })}
    </g>
  );
}

function Nightstand() {
  const W = 0.7;
  const D = 0.7;
  const H = 24;
  return (
    <g>
      <TintedBox gx={0.04} gy={0.04} dx={W - 0.08} dy={D - 0.08} h={H} fallback="#a87f5f" dark={0.34} mid={0.2} />
      <Drawers gx={0.04} gy={0.04} dy={D - 0.08} width={(W - 0.08) * (TILE_W / 2)} rows={2} top={-H + 3} height={8} />
    </g>
  );
}
// A desk is a TOP on supports, not a solid block — the gap under it is what
// separates it from a counter at this size. Side panels rather than four legs:
// four 3px legs turn to mush, a panel reads at any zoom.
function Desk() {
  const W = 2.2;
  const D = 1.2;
  const TOP = 26;
  return (
    <g>
      <TintedBox gx={0.05} gy={0.12} dx={0.16} dy={D - 0.24} h={TOP} fallback="#8f5d49" dark={0.36} mid={0.2} />
      {/* drawer stack under the right end, set back from the top's edge */}
      <TintedBox gx={1.38} gy={0.16} dx={0.7} dy={D - 0.32} h={TOP - 3} fallback="#a87f5f" dark={0.34} mid={0.2} />
      <g transform={`translate(${project(1.38, D - 0.16).x}, ${project(1.38, D - 0.16).y}) skewY(${SKEW})`}>
        {[-19, -12, -5].map((y) => (
          <g key={y}>
            <rect x="2" y={y - 4} width="12.8" height="6" rx="1.2" fill="#000" opacity="0.13" />
            <rect x="6" y={y - 1.6} width="5" height="1.4" rx="0.7" fill="#fff" opacity="0.2" />
          </g>
        ))}
      </g>
      <g transform={`translate(0,${-TOP})`}>
        <TintedBox gx={0} gy={0} dx={W} dy={D} h={4} fallback="#b58c6a" dark={0.3} mid={0.16} />
        <g transform="translate(0,-4)">
          <Laptop />
        </g>
      </g>
    </g>
  );
}

// Screen toward the chair (+gy), which is the face isoBox calls `left`.
function Laptop() {
  // Drawn around gx 0..0.7 so it works both as a placeable item and as the
  // thing sitting on the Desk sprite.
  const X = 0.06;
  const BASE_H = 3;
  const lid = isoBox(X + 0.02, 0.17, 0.56, 0.045, 16);
  const keyRow = (gy, n, w) =>
    Array.from({ length: n }, (_, i) => (
      <polygon
        key={`${gy}-${i}`}
        points={floorPatch(X + 0.06 + i * w, gy, w * 0.72, 0.032)}
        fill="#000"
        opacity="0.28"
      />
    ));
  return (
    <g>
      {/* wedge base */}
      <TintedBox gx={X} gy={0.2} dx={0.6} dy={0.34} h={BASE_H} fallback="#3a3142" tint={false} dark={0.3} mid={0.16} />
      <g transform={`translate(0,${-BASE_H})`}>
        {/* Keys and a trackpad. Without them the base is a slab and the whole
            thing reads as a folded card. */}
        {keyRow(0.25, 8, 0.06)}
        {keyRow(0.3, 8, 0.06)}
        {keyRow(0.35, 8, 0.06)}
        <polygon points={floorPatch(X + 0.2, 0.42, 0.2, 0.07)} fill="#000" opacity="0.2" />
        <polygon points={floorPatch(X + 0.2, 0.42, 0.2, 0.07)} fill="none" stroke="#fff" strokeWidth="0.4" opacity="0.12" />
      </g>
      {/* lid: bezel first, then the panel inset into it */}
      <polygon points={lid.left} fill="#2b2350" />
      <polygon points={lid.right} fill="#241d33" />
      <polygon points={lid.top} fill="#3a3142" />
      <g transform={`translate(${project(X + 0.05, 0.215).x}, ${project(X + 0.05, 0.215).y}) skewY(${SKEW})`}>
        <rect x="0" y="-14" width="11.5" height="12" rx="0.6" fill="url(#isoScreen)" />
        <rect className="animate-flicker" x="0" y="-14" width="11.5" height="12" rx="0.6" fill="#9db4e8" opacity="0.32" />
        <rect x="1.2" y="-12.4" width="5" height="3.4" rx="0.5" fill="#f7e9e2" opacity="0.42" />
        <rect x="1.2" y="-8" width="7.5" height="0.9" rx="0.45" fill="#f7e9e2" opacity="0.3" />
        <rect x="1.2" y="-6" width="5.5" height="0.9" rx="0.45" fill="#f7e9e2" opacity="0.22" />
      </g>
    </g>
  );
}

function CoffeeTable() {
  const W = 1.4;
  const D = 0.9;
  const H = 15;
  return (
    <g>
      {[
        [0.08, 0.08],
        [W - 0.2, 0.08],
        [0.08, D - 0.2],
        [W - 0.2, D - 0.2],
      ].map(([gx, gy]) => (
        <TintedBox
          key={`${gx}-${gy}`}
          gx={gx}
          gy={gy}
          dx={0.12}
          dy={0.12}
          h={H}
          fallback="#8f5d49"
          dark={0.4}
          mid={0.24}
        />
      ))}
      {/* Lower shelf — the thing that makes a coffee table a coffee table. */}
      <g transform={`translate(0,${-5})`}>
        <TintedBox gx={0.14} gy={0.14} dx={W - 0.28} dy={D - 0.28} h={2.5} fallback="#8f5d49" dark={0.48} mid={0.32} />
      </g>
      <g transform={`translate(0,${-H})`}>
        <TintedBox gx={0} gy={0} dx={W} dy={D} h={4} fallback="#a87f5f" dark={0.3} mid={0.16} />
        <g transform="translate(0,-4)">
          <Planks w={W} d={D} n={2} />
        </g>
      </g>
    </g>
  );
}
function Chair({ back = false }) {
  const W = 0.7;
  const D = 0.7;
  const SEAT = 17;
  // Turned around, the backrest moves to the NEAR edge and is drawn last, so
  // it stands in front of the seat instead of behind it.
  if (back) {
    return (
      <g>
        {[
          [0.07, 0.09],
          [0.53, 0.09],
          [0.07, 0.53],
          [0.53, 0.53],
        ].map(([gx, gy]) => (
          <TintedBox key={`${gx}-${gy}`} gx={gx} gy={gy} dx={0.1} dy={0.1} h={SEAT} fallback="#8f5d49" dark={0.42} mid={0.26} />
        ))}
        <g transform={`translate(0,${-SEAT})`}>
          <TintedBox gx={0.04} gy={0.04} dx={W - 0.08} dy={D - 0.08} h={3.5} fallback="#b58c6a" dark={0.28} mid={0.15} />
        </g>
        {/* The backrest STARTS at the seat rather than the floor. Drawn from
            the floor it was one unbroken 42px slab that hid the seat and both
            front legs, and a row of them read as fence panels rather than
            chairs — you need to see under it for the shape to say "chair". */}
        <g transform={`translate(0,${-SEAT})`}>
          <TintedBox gx={0.07} gy={D - 0.15} dx={W - 0.14} dy={0.09} h={26} fallback="#a87f5f" dark={0.36} mid={0.22} />
        </g>
      </g>
    );
  }
  return (
    <g>
      {/* backrest first: it stands at the far edge, so everything else is in
          front of it */}
      <TintedBox gx={0.07} gy={0.06} dx={W - 0.14} dy={0.09} h={42} fallback="#a87f5f" dark={0.36} mid={0.22} />
      {[
        [0.07, 0.09],
        [0.53, 0.09],
        [0.07, 0.53],
        [0.53, 0.53],
      ].map(([gx, gy]) => (
        <TintedBox
          key={`${gx}-${gy}`}
          gx={gx}
          gy={gy}
          dx={0.1}
          dy={0.1}
          h={SEAT}
          fallback="#8f5d49"
          dark={0.42}
          mid={0.26}
        />
      ))}
      <g transform={`translate(0,${-SEAT})`}>
        <TintedBox gx={0.04} gy={0.04} dx={W - 0.08} dy={D - 0.08} h={3.5} fallback="#b58c6a" dark={0.28} mid={0.15} />
      </g>
    </g>
  );
}

/** Open shelving: no doors, so the recess and what's ON the shelves is the
 *  whole read. */
function Shelf() {
  const W = 1;
  const D = 0.5;
  const H = 54;
  const face = W * (TILE_W / 2);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#a87f5f" dark={0.34} mid={0.2} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        <rect x="2" y={-H + 2.5} width={face - 4} height={H - 5} fill="#000" opacity="0.2" />
        {[-40, -26, -12].map((y) => (
          <rect key={y} x="2" y={y} width={face - 4} height="2.2" fill="#8f5d49" />
        ))}
        <rect x="4" y="-52" width="3.4" height="10" rx="0.6" fill="#7faf8f" />
        <rect x="8" y="-53" width="3.4" height="11" rx="0.6" fill="#e8a3a8" />
        <rect x="12" y="-51" width="3.4" height="9" rx="0.6" fill="#9b8bd6" />
        <rect x="4" y="-38" width="3.4" height="10" rx="0.6" fill="#e8b04b" />
        <circle cx="15" cy="-31" r="3.4" fill="#5b6b9b" />
        <rect x="5" y="-23" width="9" height="9" rx="1" fill="#cf8f93" />
        <path d="M16 -14 q-3 -8 0 -10 q3 2 0 10 z" fill="#3f7f63" />
      </g>
    </g>
  );
}
// The wide sibling of Bookshelf, in the same idiom: a carcass with the books
// drawn on its front face through the skew, which is what gives it depth
// without needing a second drawing.
function Bookcase() {
  const W = 2;
  const D = 0.6;
  const H = 58;
  const SHELVES = [-44, -28, -12];
  const BOOKS = [
    [3, "#7faf8f", 12],
    [9, "#e8a3a8", 14],
    [16, "#9b8bd6", 11],
    [22, "#e8b04b", 13],
    [30, "#cf8f93", 12],
    [37, "#5b6b9b", 14],
  ];
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#a87f5f" dark={0.34} mid={0.2} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {/* the recessed interior, so the carcass reads as having a front */}
        <rect x="2.5" y={-H + 3} width="43" height={H - 6} fill="#000" opacity="0.16" />
        {SHELVES.map((y) => (
          <rect key={y} x="2.5" y={y} width="43" height="2.6" fill="#8f5d49" />
        ))}
        {SHELVES.map((shelf, row) =>
          BOOKS.filter((_, i) => (i + row) % 3 !== 2).map(([x, c, h]) => (
            <rect
              key={`${shelf}-${x}`}
              x={x + (row % 2 ? 4 : 0)}
              y={shelf - h}
              width="4.6"
              height={h}
              rx="0.8"
              fill={c}
            />
          ))
        )}
      </g>
    </g>
  );
}
function SideTable() {
  const W = 1.2;
  const D = 0.5;
  const H = 25;
  return (
    <g>
      <TintedBox gx={0.05} gy={0.05} dx={W - 0.1} dy={D - 0.1} h={H} fallback="#a87f5f" dark={0.34} mid={0.2} />
      <Drawers gx={0.05} gy={0.05} dy={D - 0.1} width={(W - 0.1) * (TILE_W / 2)} rows={2} top={-H + 3} height={8} />
      <g transform={`translate(0,${-H})`}>
        <TintedBox gx={0} gy={0} dx={W} dy={D} h={3} fallback="#b58c6a" dark={0.28} mid={0.15} />
      </g>
    </g>
  );
}

function Radio() {
  const W = 0.7;
  const D = 0.25;
  const H = 15;
  const face = W * (TILE_W / 2);
  const top = project(0.55, 0.12);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#8a5346" dark={0.34} mid={0.2} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {/* speaker grille + dial: the two things that say "radio" */}
        <rect x="1.5" y={-H + 2.5} width={face * 0.5} height={H - 5} rx="1" fill="#241d33" opacity="0.5" />
        {[0, 1, 2].map((i) => (
          <line
            key={i}
            x1="2.5"
            y1={-H + 4.5 + i * 3}
            x2={face * 0.5}
            y2={-H + 4.5 + i * 3}
            stroke="#f7e9e2"
            strokeWidth="0.7"
            opacity="0.3"
          />
        ))}
        <circle cx={face * 0.75} cy={-H + 5} r="1.9" fill="#e8b04b" />
        <circle cx={face * 0.75} cy={-H + 10} r="1.4" fill="#f7e9e2" opacity="0.45" />
      </g>
      <line
        x1={top.x}
        y1={top.y - H}
        x2={top.x + 5}
        y2={top.y - H - 13}
        stroke="#3a3142"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </g>
  );
}

function Fridge() {
  const W = 1;
  const D = 0.7;
  const H = 42;
  const face = W * (TILE_W / 2);
  return (
    <g>
      {/* enamel white by default, and it opts out of the tint like the other
          appliances — but stays tintable for a retro mint or coral one */}
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#e6e2dc" dark={0.3} mid={0.16} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        <line x1="0" y1={-H + 13} x2={face} y2={-H + 13} stroke="#000" strokeWidth="1" opacity="0.2" />
        <rect x={face - 5} y={-H + 4} width="1.8" height="7" rx="0.9" fill="#000" opacity="0.3" />
        <rect x={face - 5} y={-H + 16} width="1.8" height="15" rx="0.9" fill="#000" opacity="0.3" />
        {/* magnets — a bare fridge is a filing cabinet */}
        <rect x="4" y={-H + 19} width="4.5" height="5.5" rx="0.6" fill="#e8a3a8" />
        <circle cx="12" cy={-H + 22} r="1.7" fill="#7faf8f" />
      </g>
    </g>
  );
}
// Round, so it's built from ellipses rather than boxes (same cylinder recipe
// as the stool): foot disc, pedestal, then the top as a side band with the
// surface sitting on it.
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
  const spout = project(0.43, 0.28);
  return (
    <g>
      <Counter />
      <g transform={`translate(0,${-lift})`}>
        <TintedBox gx={0.2} gy={0.08} dx={0.5} dy={0.3} h={16} fallback="#3a3142" tint={false} dark={0.32} mid={0.18} />
        <g transform={`translate(${project(0.2, 0.38).x}, ${project(0.2, 0.38).y}) skewY(${SKEW})`}>
          <rect x="1.5" y="-13.5" width="9" height="5" rx="1" fill="#e8b04b" opacity="0.85" />
          <rect x="3" y="-5.5" width="6" height="4.5" rx="0.8" fill="#241d33" />
        </g>
        <g className="steam-puff">
          <ellipse cx={spout.x} cy={spout.y - 19} rx="3" ry="4.5" fill="#fff" opacity="0.22" />
        </g>
      </g>
    </g>
  );
}
// Cabinet with a set on top. The screen is the whole point, so it gets the
// same lit treatment as the laptop and the cottage monitor — a glowing face,
// not a grey rectangle.
/**
 * The lit face of a screen, drawn inside an already-positioned `skewY(SKEW)`
 * group: the glass inset into its bezel, a flicker pass, and a suggestion of
 * a picture. Shared so the television, the TV unit's set and the monitor all
 * read as the same technology — the set on the unit was noticeably plainer
 * than the standalone TV once that existed.
 */
function ScreenFace({ w, h, picture = true }) {
  return (
    <g>
      <rect x="1.6" y={-h + 2.2} width={w - 3.2} height={h - 4.6} rx="0.8" fill="url(#isoScreen)" />
      <rect
        className="animate-flicker"
        x="1.6"
        y={-h + 2.2}
        width={w - 3.2}
        height={h - 4.6}
        rx="0.8"
        fill="#9db4e8"
        opacity="0.28"
      />
      {picture && (
        <>
          {/* horizon and a warm sun: enough to read as "something is on" */}
          <rect x="1.6" y={-h / 2 - 0.8} width={w - 3.2} height={h / 2 - 3.4} fill="#2b2350" opacity="0.45" />
          <circle cx={w * 0.32} cy={-h + h * 0.34} r={Math.max(1.6, h * 0.09)} fill="#ffe9b0" opacity="0.5" />
        </>
      )}
      <rect x="1.6" y={-h + 2.2} width={w - 3.2} height="1.3" fill="#fff" opacity="0.1" />
    </g>
  );
}

function Tv() {
  // A flat set on a pedestal: a wide thin panel with a real bezel, the screen
  // inset into it, and a foot that reads from the front. Meant to stand on a
  // cabinet or a sideboard — it `stacks`.
  const W = 1.3;
  const PANEL_H = 30;
  const NECK = 7;
  const panel = isoBox(0.06, 0.16, W - 0.12, 0.05, PANEL_H);
  const faceW = (W - 0.12) * (TILE_W / 2);
  return (
    <g>
      <g transform={`translate(${project(W / 2, 0.24).x}, ${project(W / 2, 0.24).y})`}>
        <ellipse cx="0" cy="-0.5" rx="13" ry="5.2" fill="#171220" />
        <ellipse cx="0" cy="-2" rx="13" ry="5.2" fill="#3a3142" />
      </g>
      <TintedBox gx={W / 2 - 0.07} gy={0.2} dx={0.14} dy={0.08} h={NECK} fallback="#3a3142" tint={false} dark={0.3} mid={0.16} />
      <g transform={`translate(0,${-NECK})`}>
        <polygon points={panel.left} fill="#241d33" />
        <polygon points={panel.right} fill="#171220" />
        <polygon points={panel.top} fill="#4a4152" />
        <g transform={`translate(${project(0.06, 0.21).x}, ${project(0.06, 0.21).y}) skewY(${SKEW})`}>
          <ScreenFace w={faceW} h={PANEL_H} />
          <circle cx={faceW / 2} cy="-1.3" r="0.7" fill="#e8b04b" opacity="0.8" />
        </g>
      </g>
    </g>
  );
}

function TvUnit() {
  const W = 2;
  const D = 0.6;
  const CAB = 20;
  const SET = 24;
  const setX = 0.5;
  const setW = 1;
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={CAB} fallback="#8f5d49" dark={0.36} mid={0.2} />
      {/* two cupboard doors on the front face */}
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {[3, 25].map((x) => (
          <g key={x}>
            <rect x={x} y={-CAB + 3} width="20" height={CAB - 6} rx="1.5" fill="#000" opacity="0.14" />
            <circle cx={x + 17} cy={-CAB / 2} r="1.1" fill="#fff" opacity="0.3" />
          </g>
        ))}
      </g>
      <g transform={`translate(0,${-CAB})`}>
        <TintedBox gx={setX} gy={0.12} dx={setW} dy={0.36} h={SET} fallback="#3a3142" tint={false} dark={0.32} mid={0.18} />
        <g
          transform={`translate(${project(setX, 0.48).x}, ${project(setX, 0.48).y}) skewY(${SKEW})`}
        >
          <ScreenFace w={setW * (TILE_W / 2)} h={SET} />
          {/* little feet + a knob, so it reads as a set and not a monolith */}
          <rect x="3" y="-3" width="3" height="3" fill="#241d33" />
          <rect x="18" y="-3" width="3" height="3" fill="#241d33" />
        </g>
      </g>
    </g>
  );
}



function Cushion() {
  const c = project(0.45, 0.45);
  return (
    <g>
      <TintedBox gx={0.05} gy={0.05} dx={0.8} dy={0.8} h={13} fallback="#e8b04b" />
      <g transform="translate(0,-13)">
        {/* Piping round the top edge and a tufted centre — a floor cushion is
            sewn, and the seam is the only thing separating it from a crate. */}
        <polygon
          points={floorPatch(0.14, 0.14, 0.62, 0.62)}
          fill="none"
          stroke="#000"
          strokeWidth="0.9"
          opacity="0.16"
        />
      </g>
      <circle cx={c.x} cy={c.y - 13} r="2.6" fill="#000" opacity="0.22" />
      <circle cx={c.x} cy={c.y - 14} r="1.3" fill="#fff" opacity="0.12" />
    </g>
  );
}

function Aquarium() {
  // A glass box of WATER, not a glowing plate: solid water faces inside a
  // barely-there glass shell, the top just a thin bright rim with a small
  // shimmer — the old filled top + big breathing oval read as a weird
  // floating disc (user feedback).
  const glass = isoBox(0.06, 0.06, 1.28, 0.58, 34);
  const water = isoBox(0.12, 0.12, 1.16, 0.46, 27);
  const c = project(0.7, 0.35);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={1.4} dy={0.7} h={24} fallback="#3a3142" dark={0.35} mid={0.2} />
      <g transform="translate(0,-24)">
        {/* the water volume */}
        <polygon points={water.left} fill="#3d7c9e" opacity="0.85" />
        <polygon points={water.right} fill="#346a88" opacity="0.9" />
        {/* seaweed + fish live inside it */}
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
        {/* water surface + a soft shimmer drifting on it */}
        <polygon points={water.top} fill="#7fc4d8" opacity="0.5" />
        <ellipse cx={c.x + 3} cy={c.y - 26} rx="8" ry="3" fill="#fff" opacity="0.16" className="room-breathe" />
        {/* the glass shell: faint faces, a bright rim, a corner glint */}
        <polygon points={glass.left} fill="#cbe8ef" opacity="0.07" />
        <polygon points={glass.right} fill="#cbe8ef" opacity="0.12" />
        <polygon points={glass.top} fill="none" stroke="#cbe8ef" strokeWidth="1.3" opacity="0.55" />
        <line
          x1={glass.corners.C.x}
          y1={glass.corners.C.y}
          x2={glass.corners.C.x}
          y2={glass.corners.C.y - 34}
          stroke="#fff"
          strokeWidth="1"
          opacity="0.25"
        />
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

// ---- architecture ------------------------------------------------------ //
// Openings, not decoration. A room made only of flat walls reads as a box;
// the reference art always has an arch or a door giving the eye somewhere
// else to go. These are drawn as RECESSES rather than holes punched through
// the wall geometry: a real hole would show the sky behind an interior wall,
// which is wrong, whereas a dark reveal with a sliver of floor beyond reads
// as another room and costs one sprite.

/** The shape of an opening with a rounded top, in wall space. */
function archPath(x, w, h) {
  const r = w / 2;
  return `M${x} 0 L${x} ${-(h - r)} A ${r} ${r} 0 0 1 ${x + w} ${-(h - r)} L${x + w} 0 Z`;
}

function Archway() {
  const W = 48;
  const H = 96;
  const r = W / 2;
  return (
    <g transform={`skewY(${SKEW})`}>
      {/* Outer moulding, then a second ring stepped in from it. Two rings
          rather than one is what gives the opening a REVEAL — a single ring
          reads as a shape cut out of the wall with scissors. */}
      <path d={archPath(0, W, H)} style={tinted("#a87f5f")} />
      <path d={archPath(0, W, H)} fill="#000" opacity="0.14" />
      <path d={archPath(3, W - 6, H - 4)} style={tinted("#a87f5f")} />
      <path d={archPath(3, W - 6, H - 4)} fill="#000" opacity="0.3" />
      {/* the jamb the light falls on, offset so one side stays bright */}
      <path d={archPath(6, W - 12, H - 8)} fill="#fff" opacity="0.07" />
      <path d={archPath(8, W - 15, H - 10)} fill="#100a17" opacity="0.93" />
      {/* Space beyond: a far wall catching a little light, then a lit floor
          strip at its foot. Nothing is punched through the wall geometry — a
          real hole would show the SKY behind an interior wall. */}
      <rect x={10} y={-46} width={W - 20} height={46} fill="#ffe9b0" opacity="0.11" />
      <rect x={10} y={-15} width={W - 20} height={15} fill="#ffe9b0" opacity="0.19" />
      <rect x={W / 2 - 5} y={-H + 16} width={10} height={H - 30} fill="#fff" opacity="0.045" />
      {/* keystone at the crown */}
      <path d={`M${W / 2 - 5} ${-(H - r) - r + 1} l10 0 l2 9 l-14 0 Z`} style={tinted("#cbb6a0")} />
      <path d={`M${W / 2 - 5} ${-(H - r) - r + 1} l10 0 l2 9 l-14 0 Z`} fill="#000" opacity="0.1" />
      {/* threshold: the strip of floor you'd step over */}
      <rect x="4" y="-3" width={W - 8} height="3" style={tinted("#cbb6a0")} />
      <rect x="4" y="-3" width={W - 8} height="3" fill="#000" opacity="0.18" />
    </g>
  );
}

function Doorway() {
  const W = 29;
  const H = 88;
  return (
    <g transform={`skewY(${SKEW})`}>
      {/* architrave: a moulding standing PROUD of the wall, which is what a
          door surround actually is */}
      <rect x="-3" y={-H - 3} width={W + 6} height={H + 3} rx="1" style={tinted("#8f5d49")} />
      <rect x="-3" y={-H - 3} width={W + 6} height={H + 3} rx="1" fill="#000" opacity="0.26" />
      <rect x="-1" y={-H - 1} width={W + 2} height={H + 1} style={tinted("#8f5d49")} />
      <rect x="-1" y={-H - 1} width={W + 2} height={H + 1} fill="#fff" opacity="0.06" />
      {/* the leaf, set back into its frame */}
      <rect x="2.5" y={-H + 3} width={W - 5} height={H - 3} style={tinted("#a87f5f")} />
      {/* Sunk panels get a light top edge and a dark bottom one — a flat dark
          rectangle reads as a sticker, the two edges make it a recess. */}
      {[[-H + 9, 30], [-H + 45, 32]].map(([y, h]) => (
        <g key={y}>
          <rect x="6" y={y} width={W - 12} height={h} rx="0.5" fill="#000" opacity="0.17" />
          <rect x="6" y={y} width={W - 12} height="1.2" fill="#000" opacity="0.16" />
          <rect x="6" y={y + h - 1.2} width={W - 12} height="1.2" fill="#fff" opacity="0.1" />
        </g>
      ))}
      {/* hinges, handle on a backplate, and a threshold under it all */}
      {[-H + 14, -22].map((y) => (
        <rect key={y} x="1.5" y={y} width="2" height="7" rx="0.6" fill="#c9a227" opacity="0.75" />
      ))}
      <rect x={W - 10} y="-45" width="5" height="11" rx="1.5" fill="#c9a227" opacity="0.6" />
      <circle cx={W - 7.5} cy="-40" r="2.1" fill="#e8b04b" />
      <rect x="-3" y="-3" width={W + 6} height="3" fill="#000" opacity="0.22" />
    </g>
  );
}

function BigWindow() {
  const W = 43;
  const H = 78;
  const top = -H - 12;
  return (
    <g transform={`skewY(${SKEW})`}>
      {/* Outer casing, then the reveal stepped in from it — the same two-ring
          trick the archway uses, so the glass sits INSIDE the wall rather than
          on it. */}
      <rect x="-2.5" y={top - 2.5} width={W + 5} height={H + 5} rx="1" style={tinted("#46396f")} />
      <rect x="-2.5" y={top - 2.5} width={W + 5} height={H + 5} rx="1" fill="#000" opacity="0.28" />
      <rect x="0" y={top} width={W} height={H} rx="1" style={tinted("#46396f")} />
      <rect x="0" y={top} width={W} height={H} rx="1" fill="#fff" opacity="0.07" />
      <rect x="3" y={top + 3} width={W - 6} height={H - 6} fill="url(#isoSky)" />
      {/* glazing bars: two lights over two, like the built-in window, each bar
          with its own shadow so the glass reads as set back */}
      <rect x={W / 2 - 1.5} y={top + 3} width="3" height={H - 6} style={tinted("#46396f")} />
      <rect x="3" y={top + H / 2 - 1.5} width={W - 6} height="3" style={tinted("#46396f")} />
      <rect x={W / 2 + 1.5} y={top + 3} width="1.2" height={H - 6} fill="#000" opacity="0.18" />
      <rect x="3" y={top + H / 2 + 1.5} width={W - 6} height="1.2" fill="#000" opacity="0.18" />
      {/* a transom bar near the head, then the sill with its return */}
      <rect x="3" y={top + 14} width={W - 6} height="2.4" style={tinted("#46396f")} />
      <rect x="-4" y={top + H} width={W + 8} height="4" rx="1" style={tinted("#cbb6a0")} />
      <rect x="-4" y={top + H} width={W + 8} height="4" rx="1" fill="#000" opacity="0.12" />
      <rect x="-2.5" y={top + H + 4} width={W + 5} height="3" fill="#000" opacity="0.24" />
      {/* the light it throws down the wall below the sill */}
      <rect x="2" y={top + H + 7} width={W - 4} height="18" fill="#ffe9b0" opacity="0.06" />
    </g>
  );
}

// ---- outdoor set ------------------------------------------------------- //

function Tree() {
  const c = project(0.75, 0.75);
  return (
    <g>
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

function Bench({ back = false }) {
  const slat = <TintedBox gx={0} gy={back ? 0 : 0.12} dx={1.6} dy={0.45} h={16} fallback="#a87f5f" />;
  const rest = (
    <TintedBox gx={0} gy={back ? 0.45 : 0} dx={1.6} dy={0.12} h={30} fallback="#8f5d49" dark={0.38} mid={0.22} />
  );
  // Whichever of the two is NEARER the camera has to be painted last.
  return back ? (
    <g>
      {slat}
      {rest}
    </g>
  ) : (
    <g>
      {rest}
      {slat}
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
// by checking whether they were dropped onto something with a seat. `moving`
// is true mid-glide: the legs step in counter-phase so they walk, not skate.
const SKIN = "#edc39e";
const HAIR = "#3a3142";
// Eyes and mouth are drawn in a fixed dark ink, NOT in the hair colour. They
// used to share it, which was invisible while hair was always near-black —
// but pick honey or mint in the profile and a face drawn in it disappears.
const INK = "#3a3142";
const TROUSER = "#4a3a5b";
// the far leg, so the two read as depth rather than one wide blob
const TROUSER_FAR = "#3c2f4a";
const SHOE = "#2b2350";
const SHOE_FAR = "#221c40";

/**
 * One seated leg: thigh forward to the knee, shin down to the floor.
 *
 * Drawn as round-capped strokes rather than boxes. The pose used to be two
 * axis-aligned rects stacked vertically, which is geometrically just a
 * shorter straight leg — a standing figure sunk into the seat, not a sitting
 * one. A joint you can actually see is the entire difference.
 *
 * `ankle` comes from the seat's height (the sprite is lifted by it, so the
 * floor sits at +seatH here) so the feet land on the floor instead of
 * dangling at cushion level.
 */
// The knee sits BELOW the torso's bottom edge and outside its width — a thigh
// tucked behind the body is a thigh nobody can see, which is how you end up
// back at a straight leg.
const SEAT_KNEE_Y = 5;
const SEAT_KNEE_X = 8.5;

function SeatedLeg({ side, ankle, far = false }) {
  const knee = side * SEAT_KNEE_X;
  const cloth = far ? TROUSER_FAR : TROUSER;
  return (
    <g>
      <path
        d={`M${side * 3.6} 0 L${knee} ${SEAT_KNEE_Y}`}
        stroke={cloth}
        strokeWidth="7.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${knee} ${SEAT_KNEE_Y} L${knee} ${ankle}`}
        stroke={cloth}
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx={knee} cy={ankle + 1.4} rx="4.3" ry="2.1" fill={far ? SHOE_FAR : SHOE} />
    </g>
  );
}

/**
 * The resident. Small enough that only the silhouette carries, so what got
 * added over the first pass is all outline work: shoes distinct from trouser
 * legs, a bent knee when seated (a seated figure without one is a person
 * standing in a hole), a neck, shoulders wider than the waist, hands on the
 * ends of the arms, and a face that actually has an expression.
 */
/**
 * Hair that falls BEHIND the head — drawn before the face so the head circle
 * paints over it. Only the styles with mass behind the skull have one; the
 * rest return null rather than an empty <g>, so the common case costs nothing.
 */
function HairBack({ style, headY, color }) {
  // Long hair is VOLUME behind the skull plus strands at the sides (see
  // HairFront), never one slab down to the shoulders — drawn that way it
  // enveloped the head and read as a hood rather than hair.
  if (style === "long")
    return <ellipse cx="0" cy={headY + 2.2} rx="8.9" ry="10.6" fill={color} />;
  // Sits high enough to break the skull's silhouette — tucked behind the head
  // it was a nub you couldn't tell from short hair.
  if (style === "bun") return <circle cx="0" cy={headY - 9.2} r="4.6" fill={color} />;
  if (style === "curly")
    return <ellipse cx="0" cy={headY - 1.5} rx="9.4" ry="8.6" fill={color} />;
  return null;
}

/** The hairline itself, over the face. */
function HairFront({ style, headY, color }) {
  // The classic cap: a dome across the crown with a parting swept into it.
  const cap = `M-7.8 ${headY} a7.8 7.8 0 0 1 15.6 0 q-2.2 -2.8 -5.4 -2.3 q-4.6 -3.4 -9.2 0.7 q-0.7 0.6 -1 1.6 z`;
  const sideburn = `M-7.7 ${headY - 0.6} q-1.6 5.6 0.3 9.4 q-3.4 -3.2 -3 -9 z`;
  switch (style) {
    case "buzz":
      // Close-cropped: the dome hugs the skull and there's no parting to sweep.
      return (
        <path
          d={`M-7.6 ${headY} a7.6 7.6 0 0 1 15.2 0 q-3 -3.6 -7.6 -3.6 q-4.6 0 -7.6 3.6 z`}
          fill={color}
        />
      );
    case "bob":
      return (
        <>
          <path d={cap} fill={color} />
          <path d={`M-8.4 ${headY - 1} q-1.2 6.6 0.5 10.2 l3.5 0 q-1.9 -4.8 -1.1 -10.2 z`} fill={color} />
          <path d={`M8.4 ${headY - 1} q1.2 6.6 -0.5 10.2 l-3.5 0 q1.9 -4.8 1.1 -10.2 z`} fill={color} />
        </>
      );
    case "curly":
      // Overlapping circles read as volume at this size; a single lumpy path
      // just reads as a badly drawn cap.
      return (
        <>
          {[
            [-6.2, -3.2, 3.4],
            [-2.4, -5.6, 3.5],
            [1.8, -5.8, 3.5],
            [5.6, -3.4, 3.4],
            [7.2, 0.4, 2.9],
            [-7.4, 0.4, 2.9],
          ].map(([cx, dy, r]) => (
            <circle key={`${cx},${dy}`} cx={cx} cy={headY + dy} r={r} fill={color} />
          ))}
        </>
      );
    case "long":
      // Strands fall in FRONT of the shoulders on both sides; the mass behind
      // the head is HairBack's ellipse.
      return (
        <>
          <path d={cap} fill={color} />
          <path d={`M-7.9 ${headY - 1} q-2.3 8.4 -1.1 13.6 l3.7 0.5 q-1.5 -6.9 -0.7 -13.6 z`} fill={color} />
          <path d={`M7.9 ${headY - 1} q2.3 8.4 1.1 13.6 l-3.7 0.5 q1.5 -6.9 0.7 -13.6 z`} fill={color} />
        </>
      );
    case "bun":
    case "short":
    default:
      return (
        <>
          <path d={cap} fill={color} />
          <path d={sideburn} fill={color} />
        </>
      );
  }
}

/** Eyes and mouth. Expression is the cheapest personality per pixel here. */
function Face({ expression, headY }) {
  const stroke = {
    fill: "none",
    stroke: INK,
    strokeWidth: 0.9,
    strokeLinecap: "round",
  };
  if (expression === "happy")
    return (
      <>
        {/* closed, upturned eyes — the "^ ^" that reads as delight at 8px */}
        <path d={`M-4.1 ${headY + 2.2} q1.2 -1.6 2.4 0`} {...stroke} />
        <path d={`M1.7 ${headY + 2.2} q1.2 -1.6 2.4 0`} {...stroke} />
        <path d={`M-2.4 ${headY + 4.6} q2.4 2.4 4.8 0`} {...stroke} strokeWidth={1} />
      </>
    );
  if (expression === "sleepy")
    return (
      <>
        <path d={`M-4.1 ${headY + 2.2} q1.2 0.9 2.4 0`} {...stroke} />
        <path d={`M1.7 ${headY + 2.2} q1.2 0.9 2.4 0`} {...stroke} />
        <ellipse cx="0" cy={headY + 5} rx="1" ry="1.3" fill={INK} opacity="0.7" />
      </>
    );
  return (
    <>
      <circle cx="-2.9" cy={headY + 2} r="0.95" fill={INK} />
      <circle cx="2.9" cy={headY + 2} r="0.95" fill={INK} />
      <path d={`M-1.9 ${headY + 4.7} q1.9 1.5 3.8 0`} {...stroke} opacity="0.75" />
    </>
  );
}

// How wide the torso is per build. Everything hung off the body — shoulders,
// arms, hands — is derived from this half-width rather than hard-coded, so a
// build change can't leave the arms floating beside the chest.
const BUILD_HALF_W = { slim: 8, average: 9, sturdy: 10 };

// Proportions. The figure used to be head 15.6px against a 15px leg — a
// third of its height was skull, which is toddler proportion however nicely
// it's shaded. Cozy isometric characters (Unpacking, Cozy Grove) sit nearer a
// quarter, so the head came down and the legs went up. `HEAD_R` is shared by
// every pose; `LEG_H` and the standing torso/head offsets move together.
const HEAD_R = 7.3;
const LEG_H = 22;
const STAND_TORSO_Y = -40;
const STAND_HEAD_Y = -48.5;

function Resident({
  seated = false,
  lying = false,
  seatH = 0,
  working = false,
  moving = false,
  character,
}) {
  const c = project(0.4, 0.4);
  // The character is validated at the store boundary, but this sprite is also
  // rendered by panel previews and tests, so it stands alone with the classic
  // resident as its default.
  const ch = character || DEFAULT_CHARACTER;
  const skin = ch.skin || SKIN;
  const hairColor = ch.hairColor || HAIR;
  // The sweater stays the placement's --tint when one is set, falling back to
  // the profile's outfit colour. That ordering is deliberate: your profile
  // dresses every resident, and tinting ONE of them still overrides it.
  const outfit = tinted(ch.outfit || "#7faf8f");
  const halfW = BUILD_HALF_W[ch.build] ?? BUILD_HALF_W.average;
  // Lying down is its own drawing, not a squashed sitting pose: dropped on a
  // bed the resident used to perch bolt upright on the duvet.
  if (lying) {
    return (
      <g transform={`translate(${c.x}, ${c.y})`}>
        <g className="room-breathe" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          {/* body along the bed, knees slightly raised */}
          <rect x="-20" y="-11" width="34" height="12" rx="6" style={outfit} />
          {/* Lit along the top, falling away underneath — the same two-tone
              treatment the standing figure got. Without it this pose stayed
              the one flat-green shape it always was while the other two
              picked up volume. */}
          <rect x="-19" y="-10.4" width="32" height="4" rx="2" fill="#fff" opacity="0.12" />
          <rect x="-20" y="-5" width="34" height="6" rx="3" fill="#000" opacity="0.12" />
          <ellipse cx="12" cy="-9" rx="8" ry="6" style={outfit} />
          {/* arm resting on top of the covers */}
          <rect x="-12" y="-14" width="14" height="4.6" rx="2.3" style={outfit} />
          <rect x="-12" y="-14" width="14" height="4.6" rx="2.3" fill="#fff" opacity="0.1" />
          <circle cx="1" cy="-11.7" r="2.4" fill={skin} />
          {/* head on the pillow, eyes closed whatever the waking expression.
              A collar at the neck end so the head doesn't read as set down
              beside the body. */}
          <ellipse cx="-16.5" cy="-11.5" rx="3.2" ry="4.4" style={outfit} />
          <circle cx="-23" cy="-13" r={HEAD_R} fill={skin} />
          <path d={`M-30.4 -13 a7.4 7.4 0 0 1 14.8 0 q-2 -2.6 -5 -2.2 q-4.4 -3 -8.8 0.6 z`} fill={hairColor} />
          <path d="M-26.4 -12.4 q1.6 1.4 3.2 0" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />
          <path d="M-21 -12.6 q1.5 1.3 3 0" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />
          <ellipse cx="-27" cy="-10" rx="1.6" ry="1" fill="#e8a3a8" opacity="0.4" />
        </g>
      </g>
    );
  }
  // Seated, the body rests ON the seat, so the torso's bottom edge belongs at
  // the seat line (sinking a px into the cushion), not hovering above it —
  // and low enough that the thighs emerge from under it rather than behind it.
  const torsoY = seated ? -21 : STAND_TORSO_Y;
  const headY = seated ? -29 : STAND_HEAD_Y;
  // The floor is at +seatH (the scene lifts a seated resident by exactly
  // that), less a couple of px so the sole meets it instead of sinking
  // through. The floor keeps a low cushion from reducing the shin to a stub.
  const ankle = Math.max(SEAT_KNEE_Y + 6, seatH - 2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {seated ? (
        <>
          <SeatedLeg side={-1} ankle={ankle} far />
          <SeatedLeg side={1} ankle={ankle} />
        </>
      ) : (
        <>
          {/* Legs run the full LEG_H — at 15px they were stubs under a long
              torso, which is most of what made the figure read as a toddler.
              The far one uses the depth colours the seated pose already had
              (TROUSER_FAR/SHOE_FAR) so two legs don't merge into one block. */}
          <g className={moving ? "leg-step-a" : undefined}>
            <rect x="-6.8" y={-LEG_H} width="5.6" height={LEG_H} rx="2.6" fill={TROUSER_FAR} />
            <ellipse cx="-4" cy="0.4" rx="4.2" ry="2.1" fill={SHOE_FAR} />
          </g>
          <g className={moving ? "leg-step-b" : undefined}>
            <rect x="1.2" y={-LEG_H} width="5.6" height={LEG_H} rx="2.6" fill={TROUSER} />
            <ellipse cx="4" cy="0.4" rx="4.2" ry="2.1" fill={SHOE} />
          </g>
        </>
      )}
      <g className="room-breathe" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
        {/* The torso TAPERS: shoulders proud, waist drawn in. As a plain rect
            it was the same width top to bottom, which is what made the body
            read as a pill with a head on it rather than a person. */}
        {(() => {
          const sh = halfW + 1; // shoulder half-width
          const wa = halfW - 1.7; // waist half-width
          const top = torsoY;
          const bot = torsoY + 22;
          const body = `M ${-sh} ${top + 7}
            Q ${-sh} ${top + 0.5} ${-sh + 3.5} ${top}
            L ${sh - 3.5} ${top} Q ${sh} ${top + 0.5} ${sh} ${top + 7}
            L ${wa} ${bot - 3} Q ${wa} ${bot} ${wa - 3} ${bot}
            L ${-wa + 3} ${bot} Q ${-wa} ${bot} ${-wa} ${bot - 3} Z`;
          // The lower band is its own tapered path rather than a rect or a
          // gradient: it has to follow the taper to stay inside the
          // silhouette, and MODELS.md wants flat tones, not a ramp.
          const bandY = torsoY + 14;
          const t = (bandY - (top + 7)) / (bot - 3 - (top + 7));
          const bx = sh + (wa - sh) * t;
          const band = `M ${-bx} ${bandY} L ${bx} ${bandY}
            L ${wa} ${bot - 3} Q ${wa} ${bot} ${wa - 3} ${bot}
            L ${-wa + 3} ${bot} Q ${-wa} ${bot} ${-wa} ${bot - 3} Z`;
          return (
            <>
              <path d={body} style={outfit} />
              {/* Volume the same way every box in the catalog gets it: the top
                  faces the light, the lower body falls away. The character was
                  the one object in the room with a single flat tone, which is
                  most of why it looked lifeless beside furniture that has
                  three. */}
              <ellipse cx="0" cy={top + 3.5} rx={sh - 1.5} ry="4.6" fill="#fff" opacity="0.13" />
              <path d={band} fill="#000" opacity="0.14" />
            </>
          );
        })()}
        {/* arms — they type when a focus block is running and they're seated */}
        <g className={working && seated ? "resident-type" : undefined}>
          <g>
            <rect x={-halfW - 4.4} y={torsoY + 5} width="5" height="12" rx="2.5" style={outfit} />
            <rect x={-halfW - 4.4} y={torsoY + 5} width="5" height="12" rx="2.5" fill="#000" opacity="0.16" />
            <circle cx={-halfW - 1.9} cy={torsoY + 17.5} r="2.5" fill={skin} />
          </g>
          <g>
            <rect x={halfW - 0.6} y={torsoY + 5} width="5" height="12" rx="2.5" style={outfit} />
            {/* the near arm catches the light instead of vanishing into the
                torso it shares a colour with */}
            <rect x={halfW - 0.6} y={torsoY + 5} width="5" height="12" rx="2.5" fill="#fff" opacity="0.1" />
            <circle cx={halfW + 1.9} cy={torsoY + 17.5} r="2.5" fill={skin} />
          </g>
        </g>
        {/* Neck, then a collar sitting on the shoulders. The head used to
            meet the torso directly, which is a large part of why the figure
            read as a bundle rather than a body — the neck is short, but the
            collar is what actually sells it. It reaches from under the chin to
            just inside the torso top so no pose can leave a gap. */}
        <rect x="-2.6" y={headY + HEAD_R - 1} width="5.2" height={torsoY - headY - HEAD_R + 4} fill={skin} />
        <rect
          x="-2.6"
          y={headY + HEAD_R - 1}
          width="5.2"
          height={torsoY - headY - HEAD_R + 4}
          fill="#000"
          opacity="0.16"
        />
        <ellipse cx="0" cy={torsoY + 1.5} rx={halfW - 2.4} ry="2.4" style={outfit} />
        <ellipse cx="0" cy={torsoY + 1.5} rx={halfW - 2.4} ry="2.4" fill="#fff" opacity="0.1" />
        <HairBack style={ch.hair} headY={headY} color={hairColor} />
        <circle cx="0" cy={headY} r={HEAD_R} fill={skin} />
        <HairFront style={ch.hair} headY={headY} color={hairColor} />
        {/* A sheen on the crown. The hair is the biggest single shape on the
            figure and it was one flat colour, so it read as a helmet — this is
            the same white light-catch the shoulders and the boxes get, aimed
            up-right at the light. */}
        <ellipse
          cx="2.4"
          cy={headY - 4.1}
          rx="3.1"
          ry="1.6"
          fill="#fff"
          opacity="0.16"
          transform={`rotate(-22 2.4 ${headY - 4.1})`}
        />
        <Face expression={ch.expression} headY={headY} />
        <ellipse cx="-5.2" cy={headY + 3.3} rx="1.7" ry="1" fill="#e8a3a8" opacity="0.4" />
        <ellipse cx="5.2" cy={headY + 3.3} rx="1.7" ry="1" fill="#e8a3a8" opacity="0.4" />
      </g>
    </g>
  );
}

/**
 * The little cloud over your character's head, the way The Sims does it: a
 * puff of thought with one readable icon in it.
 *
 * Drawn ABOVE the resident's head and inside the same group, so when they're
 * seated (and the whole sprite is lifted by the seat height) the bubble rides
 * up with them instead of hanging in the air where they used to stand.
 *
 * One icon, no text — at room scale a word would be unreadable, and the whole
 * point is that you can tell at a glance from across the room.
 */
function ThoughtBubble({ mood, x = 10, y = -58, mirrored = false }) {
  const icon = MOODS[mood];
  if (!icon) return null;
  return (
    // The attribute transform goes on a WRAPPER and the animation on the
    // child: a CSS animation's `transform` property overrides an SVG
    // `transform` attribute outright, so with both on one element the offset
    // was thrown away and the cloud rendered on the character's chest.
    // (docs/MODELS.md §6 — third time this has bitten.)
    //
    // On an odd rotation the scene mirrors the whole persona, which would
    // hand you a backwards book and a mug with the handle on the wrong side —
    // lit from the left while the rest of the room is lit from the right.
    // Flipping again here cancels it, and the negated offset keeps the cloud
    // on the same side of the head on SCREEN.
    <g
      transform={mirrored ? `translate(${-x},${y}) scale(-1,1)` : `translate(${x},${y})`}
      aria-hidden="true"
    >
      {/* keyed by mood so switching book → mug REMOUNTS this group and the
          pop plays again; without it React swapped the icon in place and the
          transition passed by unannounced */}
      <g key={mood} className="thought-pop">
      {/* the two trailing puffs, smallest nearest the head */}
      <circle cx="-9" cy="12" r="1.5" fill="#f7f2ea" opacity="0.85" />
      <circle cx="-6" cy="7.5" r="2.3" fill="#f7f2ea" opacity="0.92" />
      {/* the cloud: four overlapping ellipses rather than one, so the outline
          is lumpy the way a thought bubble should be */}
      <ellipse cx="0" cy="-1" rx="11" ry="7.5" fill="#f7f2ea" />
      <ellipse cx="-7.5" cy="1" rx="5.5" ry="4.5" fill="#f7f2ea" />
      <ellipse cx="7.5" cy="1" rx="5.5" ry="4.5" fill="#f7f2ea" />
      <ellipse cx="-1" cy="-6" rx="7" ry="5" fill="#f7f2ea" />
      {icon === "book" ? (
        // an open book: two leaves either side of a spine
        <g>
          <path d="M-6 -1.5 q3 -2.2 5.4 0 l0 5 q-2.4 -1.8 -5.4 0 z" fill="#5b6b9b" />
          <path d="M6 -1.5 q-3 -2.2 -5.4 0 l0 5 q2.4 -1.8 5.4 0 z" fill="#7f8fc0" />
          <rect x="-0.5" y="-2.4" width="1" height="6.4" rx="0.5" fill="#3a3142" opacity="0.55" />
        </g>
      ) : (
        // a mug, with steam — the same read as the `mug` catalog item
        <g>
          <rect x="-4" y="-2.5" width="7.5" height="6" rx="1.2" fill="#c9847e" />
          <path d="M3.5 -1 q3 1 0 3.4" fill="none" stroke="#c9847e" strokeWidth="1.4" />
          <ellipse cx="-0.25" cy="-2.5" rx="3.75" ry="1.3" fill="#f2e2cf" />
          <path d="M-1.5 -5.5 q1.5 -1.6 0 -3.2" fill="none" stroke="#cbb6a0" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        </g>
      )}
      </g>
    </g>
  );
}

/**
 * You — the resident drawn with the character from your profile, and the only
 * one that thinks. Everyone else in the room stays generic on purpose.
 */
function You({ mood, mirrored = false, ...rest }) {
  // The cloud hangs just above the head — and the head is somewhere different
  // in each pose. One fixed offset left it a whole head-height clear of a
  // SEATED character, which is the pose this feature exists for (you only
  // type while sitting), and stranded over the headboard when lying down.
  const spot = rest.lying
    ? { x: -14, y: -30 }
    : rest.seated
    ? { x: 10, y: -46 }
    : { x: 10, y: -64 }; // standing head rose with the new proportions
  return (
    <g>
      <Resident {...rest} />
      <ThoughtBubble mood={mood} x={spot.x} y={spot.y} mirrored={mirrored} />
    </g>
  );
}

// ---- newer decorations -------------------------------------------------- //

function Fireplace() {
  // Stone body with a wooden mantel slab; the firebox opening sits on the
  // front-left face (same skew trick as the bookshelf's books). Flames are
  // CSS one-shots; the warm pool on the floor breathes with them.
  const up = (p, h) => `${p.x},${p.y - h}`;
  const A = project(-0.05, -0.05);
  const B = project(1.65, -0.05);
  const C = project(1.65, 0.75);
  const D = project(-0.05, 0.75);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={1.6} dy={0.7} h={56} fallback="#8d8178" dark={0.36} mid={0.2} />
      {/* mantel slab, slightly proud of the body */}
      <polygon points={`${up(D, 64)} ${up(C, 64)} ${up(C, 58)} ${up(D, 58)}`} style={tinted("#6b4a39")} />
      <polygon points={`${up(D, 64)} ${up(C, 64)} ${up(C, 58)} ${up(D, 58)}`} fill="#000" opacity="0.18" />
      <polygon points={`${up(B, 64)} ${up(C, 64)} ${up(C, 58)} ${up(B, 58)}`} style={tinted("#6b4a39")} />
      <polygon points={`${up(B, 64)} ${up(C, 64)} ${up(C, 58)} ${up(B, 58)}`} fill="#000" opacity="0.3" />
      <polygon points={`${up(A, 64)} ${up(B, 64)} ${up(C, 64)} ${up(D, 64)}`} style={tinted("#6b4a39")} />
      {/* front face: stones + the arched firebox */}
      <g transform={`translate(${project(0, 0.7).x}, ${project(0, 0.7).y}) skewY(${SKEW})`}>
        <rect x="3" y="-52" width="10" height="5" rx="2" fill="#000" opacity="0.1" />
        <rect x="24" y="-50" width="11" height="5" rx="2" fill="#000" opacity="0.1" />
        <rect x="14" y="-45" width="10" height="5" rx="2" fill="#000" opacity="0.08" />
        <path d="M8 -6 v-22 a11 11 0 0 1 22 0 v22 z" fill="#1c1210" />
        <path d="M8 -6 v-22 a11 11 0 0 1 22 0 v22 z" fill="none" stroke="#000" strokeWidth="1.5" opacity="0.3" />
        {/* embers + logs */}
        <rect x="12" y="-10" width="15" height="3.5" rx="1.7" fill="#4a3226" />
        <rect x="14" y="-13" width="11" height="3.5" rx="1.7" fill="#5a3d2c" />
        <ellipse cx="19" cy="-12" rx="9" ry="6" fill="#ff9c5a" opacity="0.28" />
        {/* the flames dance out of phase */}
        <path className="flame-dance" d="M19 -13 q-6 -9 0 -20 q6 11 0 20 z" fill="#ffb45e" />
        <path className="flame-dance" style={{ animationDelay: "0.5s" }} d="M14.5 -13 q-4 -5 -1.5 -12 q4.5 7 1.5 12 z" fill="#e8874b" />
        <path className="flame-dance" style={{ animationDelay: "0.9s" }} d="M23.5 -13 q4 -6 1.5 -13 q-4.5 7 -1.5 13 z" fill="#ffd76a" />
      </g>
    </g>
  );
}

/**
 * The wall clock tells the REAL time.
 *
 * It owns its own 30-second interval rather than being driven from above:
 * IsoRoom is memo'd precisely so the scene doesn't re-render on a timer, and
 * a component's own state updates re-render only itself, so this costs one
 * tiny subtree a minute and only when a clock is actually placed.
 *
 * The hands rotate about (0,0) inside a translated group — no CSS
 * transform-origin, which on SVG would fight the `transform` attribute the
 * parent already carries (see the note in index.css about that class of bug).
 */
function WallClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const minutes = now.getMinutes() + now.getSeconds() / 60;
  const minuteAngle = minutes * 6;
  const hourAngle = ((now.getHours() % 12) + minutes / 60) * 30;
  return (
    <g transform={`skewY(${SKEW})`}>
      <circle cx="10" cy="-86" r="11" style={tinted("#8a5346")} />
      <circle cx="10" cy="-86" r="11" fill="#000" opacity="0.12" />
      <circle cx="10" cy="-86" r="8.6" fill="#f7e9e2" />
      {[
        [10, -93.4],
        [17.4, -86],
        [10, -78.6],
        [2.6, -86],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.7" fill="#3a3142" />
      ))}
      <g transform="translate(10,-86)">
        <g className="clock-tick" transform={`rotate(${hourAngle})`}>
          <line x1="0" y1="0" x2="0" y2="-5" stroke="#3a3142" strokeWidth="1.7" strokeLinecap="round" />
        </g>
        <g className="clock-tick" transform={`rotate(${minuteAngle})`}>
          <line x1="0" y1="0" x2="0" y2="-7.6" stroke="#3a3142" strokeWidth="1.2" strokeLinecap="round" />
        </g>
        <circle cx="0" cy="0" r="1.1" fill="#3a3142" />
      </g>
    </g>
  );
}

function RecordPlayer() {
  const c = project(0.55, 0.32);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={1.2} dy={0.7} h={22} fallback="#6b4a39" />
      {/* the disc spins lazily in the iso plane (rotation inside a squashed
          group) — the label's highlight dot is what makes the spin visible */}
      <g transform={`translate(${c.x}, ${c.y - 22}) scale(1, 0.5)`}>
        <g className="disc-spin">
          <circle cx="0" cy="0" r="15" fill="#241d33" />
          <circle cx="0" cy="0" r="12.5" fill="none" stroke="#3a3142" strokeWidth="0.9" opacity="0.8" />
          <circle cx="0" cy="0" r="9.5" fill="none" stroke="#3a3142" strokeWidth="0.9" opacity="0.8" />
          <circle cx="0" cy="0" r="4.6" fill="#d98a93" />
          <circle cx="3.1" cy="-1.2" r="1" fill="#f7e9e2" opacity="0.85" />
        </g>
      </g>
      {/* tonearm resting over the edge of the disc */}
      <circle cx={c.x + 17} cy={c.y - 26} r="2.4" fill="#3a3142" />
      <line x1={c.x + 17} y1={c.y - 26} x2={c.x + 5} y2={c.y - 24} stroke="#3a3142" strokeWidth="1.7" strokeLinecap="round" />
    </g>
  );
}

function Candle() {
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-19" rx="9" ry="11" fill="#ffe9b0" opacity="0.14" />
      <ellipse cx="0" cy="-1" rx="5" ry="2.6" style={tinted("#f2e0c8")} />
      <ellipse cx="0" cy="-1" rx="5" ry="2.6" fill="#000" opacity="0.3" />
      <rect x="-5" y="-13" width="10" height="12" style={tinted("#f2e0c8")} />
      <rect x="-5" y="-13" width="10" height="12" fill="#000" opacity="0.12" />
      <ellipse cx="0" cy="-13" rx="5" ry="2.6" style={tinted("#f2e0c8")} />
      {/* a wax drip down the front */}
      <path d="M-2.5 -12 q-0.8 3.5 0 5.5 q1.4 -0.5 1.2 -3 z" fill="#fff" opacity="0.35" />
      <path className="flame-dance" d="M0 -15 q-2.6 -4.5 0 -9 q2.6 4.5 0 9 z" fill="#ffd76a" />
    </g>
  );
}

// ---- new decor ---------------------------------------------------------- //
// Storage, seating and the small stuff a room needs to look lived in. All of
// it draws from the same vocabulary as everything above: TintedBox volumes,
// ellipses for anything round, and the skewY(SKEW) group for detail that has
// to lie on a front face.

function Wardrobe() {
  const W = 1.4;
  const D = 0.7;
  const H = 84;
  const face = W * (TILE_W / 2);
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#8f5d49" dark={0.36} mid={0.2} />
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {/* cornice: a tall flat box needs a break near the top or it reads as
            a monolith */}
        <rect x="0" y={-H} width={face} height="3.5" fill="#fff" opacity="0.09" />
        {[2, face / 2 + 1].map((x) => (
          <rect
            key={x}
            x={x}
            y={-H + 6}
            width={face / 2 - 3}
            height={H - 11}
            rx="1.5"
            fill="#000"
            opacity="0.13"
          />
        ))}
        <circle cx={face / 2 - 2} cy={-H / 2} r="1.2" fill="#e8b04b" />
        <circle cx={face / 2 + 3} cy={-H / 2} r="1.2" fill="#e8b04b" />
      </g>
    </g>
  );
}

function Dresser() {
  const W = 1.6;
  const D = 0.6;
  const H = 34;
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#a87f5f" dark={0.34} mid={0.2} />
      <Drawers gx={0} gy={0} dy={D} width={W * (TILE_W / 2)} rows={3} top={-H + 4} height={7.5} />
    </g>
  );
}

/** Swivel chair: a star base on castors, which is the silhouette that
 *  separates it from the wooden one at a glance. */
function DeskChair({ back = false }) {
  const c = project(0.4, 0.4);
  const SEAT = 19;
  // The pedestal and star base are symmetric, so only the backrest moves.
  const restGy = back ? 0.57 : 0.1;
  return (
    <g>
      <g transform={`translate(${c.x}, ${c.y})`}>
        {[0, 72, 144, 216, 288].map((deg) => {
          const r = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1="0"
              y1="-2"
              x2={Math.cos(r) * 13}
              y2={-2 + Math.sin(r) * 6.5}
              stroke="#3a3142"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          );
        })}
        <rect x="-1.6" y={-SEAT} width="3.2" height={SEAT - 2} fill="#3a3142" />
      </g>
      <g transform={`translate(0,${-SEAT})`}>
        <TintedBox gx={0.1} gy={0.12} dx={0.6} dy={0.56} h={5} fallback="#5b6b9b" dark={0.28} mid={0.15} />
        <g transform="translate(0,-5)">
          <TintedBox gx={0.12} gy={restGy} dx={0.56} dy={0.11} h={22} fallback="#5b6b9b" dark={0.3} mid={0.16} />
        </g>
      </g>
    </g>
  );
}

/** Nothing in the room is squashy, so this is all ellipses — no flat faces
 *  anywhere, which is exactly what makes it read as beans and not a box. */
function Beanbag() {
  const c = project(0.55, 0.55);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-4" rx="24" ry="12" style={tinted("#9b8bd6")} />
      <ellipse cx="0" cy="-4" rx="24" ry="12" fill="#000" opacity="0.3" />
      <ellipse cx="0" cy="-10" rx="23" ry="11.5" style={tinted("#9b8bd6")} />
      <ellipse cx="-3" cy="-15" rx="15.5" ry="7.5" style={tinted("#9b8bd6")} />
      <ellipse cx="-3" cy="-15" rx="15.5" ry="7.5" fill="#fff" opacity="0.1" />
      <path d="M-19 -11 q19 -9 38 0" fill="none" stroke="#000" strokeWidth="0.9" opacity="0.15" />
    </g>
  );
}

function Guitar() {
  const c = project(0.25, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y}) rotate(-9)`}>
      <ellipse cx="0" cy="-12" rx="11" ry="12.5" style={tinted("#c98a4b")} />
      <ellipse cx="0" cy="-21" rx="8.5" ry="9" style={tinted("#c98a4b")} />
      <ellipse cx="-4" cy="-16" rx="5" ry="7" fill="#fff" opacity="0.07" />
      <circle cx="0" cy="-16" r="3.4" fill="#241d33" />
      <rect x="-2.2" y="-52" width="4.4" height="33" fill="#6b4a39" />
      <rect x="-3.4" y="-58" width="6.8" height="7" rx="1.4" fill="#3a3142" />
      <line x1="0" y1="-50" x2="0" y2="-7" stroke="#f7e9e2" strokeWidth="0.5" opacity="0.45" />
    </g>
  );
}

/** Deliberately `tintable: false` in the catalog — a stack of books whose
 *  spines are all one colour is a brick. */
function BookStack() {
  const layer = (gx, gy, dx, dy, h, fill) => (
    <TintedBox gx={gx} gy={gy} dx={dx} dy={dy} h={h} fallback={fill} tint={false} dark={0.3} mid={0.16} />
  );
  return (
    <g>
      {layer(0.02, 0.02, 0.46, 0.36, 3.4, "#5b6b9b")}
      <g transform="translate(0,-3.4)">
        {layer(0.06, 0.05, 0.4, 0.32, 3, "#7faf8f")}
        <g transform="translate(0,-3)">
          {layer(0.03, 0.04, 0.44, 0.34, 3.2, "#cf8f93")}
          <g transform="translate(0,-3.2)">
            {layer(0.08, 0.07, 0.36, 0.28, 2.8, "#e8b04b")}
          </g>
        </g>
      </g>
    </g>
  );
}

function VinylCrate() {
  const W = 0.7;
  const D = 0.5;
  const H = 17;
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#8f5d49" dark={0.36} mid={0.2} />
      {/* sleeves poking out of the top, flicked through */}
      <g transform={`translate(0,${-H})`}>
        {["#e8a3a8", "#5b6b9b", "#e8b04b", "#7faf8f"].map((fill, i) => {
          const p = project(0.14 + i * 0.14, 0.25);
          return (
            <g key={fill} transform={`translate(${p.x}, ${p.y})`}>
              <rect x="-6" y="-9" width="12" height="9" rx="0.6" fill={fill} />
              <rect x="-6" y="-9" width="12" height="9" rx="0.6" fill="#000" opacity={0.08 * i} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

function Basket() {
  const c = project(0.3, 0.3);
  const H = 17;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-2" rx="11" ry="5.5" style={tinted("#c98a4b")} />
      <ellipse cx="0" cy="-2" rx="11" ry="5.5" fill="#000" opacity="0.32" />
      <rect x="-11" y={-H} width="22" height={H - 2} style={tinted("#c98a4b")} />
      <rect x="-11" y={-H} width="22" height={H - 2} fill="#000" opacity="0.18" />
      {[-5, -9, -13].map((y) => (
        <line key={y} x1="-11" y1={y} x2="11" y2={y} stroke="#000" strokeWidth="0.8" opacity="0.13" />
      ))}
      <ellipse cx="0" cy={-H} rx="11" ry="5.5" style={tinted("#c98a4b")} />
      <ellipse cx="0" cy={-H} rx="8.5" ry="4" fill="#000" opacity="0.32" />
      {/* laundry spilling over the rim — the thing that makes it a basket */}
      <ellipse cx="-2" cy={-H - 1} rx="7" ry="3.2" fill="#f7f2ea" opacity="0.85" />
      <ellipse cx="3" cy={-H - 3} rx="4.5" ry="2.2" fill="#e8e2d8" opacity="0.8" />
    </g>
  );
}

function DeskLamp() {
  const c = project(0.2, 0.2);
  const H = 23;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="0" rx="6" ry="3" style={tinted("#3a3142")} />
      <ellipse cx="0" cy="0" rx="6" ry="3" fill="#000" opacity="0.3" />
      <path
        d={`M0 -1 L-3 ${-H} L7 ${-H - 4}`}
        fill="none"
        style={{ stroke: "var(--tint, #3a3142)" }}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={`M2 ${-H - 9} L12 ${-H - 3} L8 ${-H + 3} L-1 ${-H - 3} Z`} style={tinted("#3a3142")} />
      <ellipse cx="8" cy={-H + 2} rx="5" ry="2.6" fill="#ffe9b0" opacity="0.75" className="room-breathe" />
    </g>
  );
}

function StandMirror() {
  const c = project(0.3, 0.2);
  const H = 62;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="0" rx="10" ry="4.5" style={tinted("#8f5d49")} />
      <ellipse cx="0" cy="0" rx="10" ry="4.5" fill="#000" opacity="0.32" />
      <rect x="-11" y={-H} width="22" height={H - 3} rx="10" style={tinted("#8f5d49")} />
      <rect x="-11" y={-H} width="22" height={H - 3} rx="10" fill="#000" opacity="0.15" />
      <rect x="-8.5" y={-H + 3} width="17" height={H - 9} rx="8" fill="url(#isoSky)" opacity="0.9" />
      <path d={`M-6 ${-H + 13} q6 -6 12 -2`} stroke="#fff" strokeWidth="1.6" fill="none" opacity="0.3" />
    </g>
  );
}

// ---- new wall decor ----------------------------------------------------- //
// Same rule as the frame and the clock: drawn inside a skewY(SKEW) group for
// the RIGHT wall, and the scene mirrors it onto the left one.

function Poster() {
  return (
    <g transform={`skewY(${SKEW})`}>
      <rect x="2" y="-92" width="20" height="27" style={tinted("#5b6b9b")} />
      <rect x="2" y="-92" width="20" height="27" fill="#000" opacity="0.12" />
      <circle cx="12" cy="-83" r="4.5" fill="#e8b04b" />
      <path d="M2 -71 q5 -8 10 -3 q5 -6 10 1 l0 6 l-20 0 z" fill="#3f7f63" />
      <rect x="2" y="-92" width="20" height="27" fill="none" stroke="#f7e9e2" strokeWidth="0.8" opacity="0.22" />
    </g>
  );
}

function Curtain() {
  return (
    <g transform={`skewY(${SKEW})`}>
      <rect x="0" y="-104" width="38.4" height="2.6" rx="1.3" fill="#6b4a39" />
      {[1, 26].map((x) => (
        <g key={x} className="curtain-sway" style={{ animationDelay: `${x * 0.09}s` }}>
          <path d={`M${x} -102 q-1.5 24 0.5 47 l11 0 q2 -23 0.5 -47 z`} style={tinted("#d98a93")} />
          <path d={`M${x + 3.5} -102 q-1 24 0 47 l3 0 q1 -23 0 -47 z`} fill="#000" opacity="0.13" />
          <path d={`M${x + 8} -102 q1 24 0 47 l2.5 0 q-1 -23 0 -47 z`} fill="#fff" opacity="0.08" />
        </g>
      ))}
    </g>
  );
}

function HangingPlant() {
  return (
    <g transform={`skewY(${SKEW})`}>
      <line x1="8" y1="-104" x2="8" y2="-88" stroke="#6b4a39" strokeWidth="1" />
      {/* the sway class sits on a group with NO transform attribute of its
          own — a CSS transform on an element that also has one would win
          outright and drop the pot through the wall */}
      <g className="room-sway-hanging">
        <path d="M2 -88 l12 0 l-2 10 l-8 0 z" style={tinted("#c0563f")} />
        <path d="M8 -88 l6 0 l-2 10 l-4 0 z" fill="#000" opacity="0.18" />
        <path d="M4 -88 q-4 12 -2 23 q4 -11 3 -23 z" fill="#3f7f63" />
        <path d="M11 -88 q5 10 3 21 q-5 -10 -4 -21 z" fill="#56a07c" />
        <path d="M8 -88 q0 15 1 25 q2 -13 1 -25 z" fill="#3f7f63" />
      </g>
    </g>
  );
}

// ---- cosmetics ---------------------------------------------------------- //
// Small things whose only job is to make a room feel occupied. Most are
// under a tile across, so they lean on ONE recognisable shape each rather
// than on detail that would vanish.

function CoatRack() {
  const c = project(0.25, 0.25);
  const H = 68;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="0" rx="8" ry="4" style={tinted("#6b4a39")} />
      <ellipse cx="0" cy="0" rx="8" ry="4" fill="#000" opacity="0.32" />
      <rect x="-1.4" y={-H} width="2.8" height={H} style={tinted("#6b4a39")} />
      <rect x="-1.4" y={-H} width="2.8" height={H} fill="#000" opacity="0.15" />
      {[-1, 1].map((s) => (
        <line
          key={s}
          x1="0"
          y1={-H + 4}
          x2={s * 7}
          y2={-H + 9}
          style={{ stroke: "var(--tint, #6b4a39)" }}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      {/* a coat and a scarf, because an empty rack is a pole */}
      <path d="M-7 -55 q-5 12 -3 24 l10 0 q2 -12 -2 -24 z" fill="#5b6b9b" />
      <path d="M-7 -55 q-2 12 -1 24 l3 0 q-1 -12 -0.5 -24 z" fill="#000" opacity="0.14" />
      <path d="M6 -57 q4 6 3 13 q-1 7 -4 10 q1 -11 1 -23 z" fill="#e8a3a8" />
    </g>
  );
}

function Cactus() {
  const c = project(0.25, 0.25);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <g transform={`translate(${-c.x}, ${-c.y})`}>
        <PlantPot foot={0.5} h={11} />
      </g>
      <g transform="translate(0,-11)">
        <rect x="-4.5" y="-27" width="9" height="27" rx="4.5" fill="#4f8f6a" />
        <rect x="-4.5" y="-27" width="4" height="27" rx="4" fill="#fff" opacity="0.09" />
        <rect x="-11" y="-19" width="6.5" height="6" rx="3" fill="#4f8f6a" />
        <rect x="-11" y="-22" width="4.5" height="8" rx="2.2" fill="#4f8f6a" />
        <rect x="4.5" y="-15" width="6" height="5.5" rx="2.7" fill="#3f7f63" />
        <rect x="7" y="-21" width="4.5" height="8" rx="2.2" fill="#3f7f63" />
        {[-22, -16, -10].map((y) => (
          <line key={y} x1="-3" y1={y} x2="3" y2={y} stroke="#eaf3ec" strokeWidth="0.6" opacity="0.4" />
        ))}
      </g>
    </g>
  );
}

function Terrarium() {
  const c = project(0.3, 0.3);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="10" ry="5" style={tinted("#8f5d49")} />
      <ellipse cx="0" cy="-1" rx="10" ry="5" fill="#000" opacity="0.3" />
      {/* soil, then the glass dome over it */}
      <path d="M-9 -3 a9 4.5 0 0 0 18 0 l0 -4 a9 4.5 0 0 1 -18 0 z" fill="#3a2a24" />
      <path d="M-6 -6 q3 -7 6 -1 q2 -6 5 0 q-1 4 -5 5 q-5 -1 -6 -4 z" fill="#3f7f63" />
      <circle cx="2" cy="-9" r="1.6" fill="#e8a3a8" />
      <path d="M-10 -6 a10 13 0 0 1 20 0 l0 1 a10 5 0 0 1 -20 0 z" fill="#cbe8ef" opacity="0.22" />
      <path d="M-7 -8 a10 13 0 0 1 4 -8" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.35" strokeLinecap="round" />
    </g>
  );
}

/** layer -1 in the catalog, which puts it on the cat's list of soft spots —
 *  drop one down and the cat will eventually curl up in it. */
function PetBed() {
  const c = project(0.55, 0.45);
  return (
    <g>
      <g transform={`translate(${c.x}, ${c.y})`}>
        <ellipse cx="0" cy="0" rx="26" ry="14" style={tinted("#9b8bd6")} />
        <ellipse cx="0" cy="0" rx="26" ry="14" fill="#000" opacity="0.2" />
        <ellipse cx="0" cy="-2.5" rx="26" ry="14" style={tinted("#9b8bd6")} />
        <ellipse cx="0" cy="-3" rx="19" ry="9.5" fill="#000" opacity="0.22" />
        <ellipse cx="0" cy="-3.5" rx="18" ry="9" fill="#f2e9dd" opacity="0.5" />
        <ellipse cx="-4" cy="-6" rx="9" ry="4" fill="#fff" opacity="0.12" />
      </g>
    </g>
  );
}

function Runner() {
  return (
    <g>
      <RugGround w={3} d={1} m={0.16} fallback="rgb(var(--color-blush))" ground={0.48} />
      {/* A hall runner's motif repeats along its length. */}
      {[0.45, 1.05, 1.65, 2.25].map((gx) => (
        <g key={gx}>
          <polygon points={floorPatch(gx - 0.16, 0.34, 0.32, 0.32)} fill="#f7e9e2" opacity="0.16" />
          <polygon points={floorPatch(gx - 0.07, 0.43, 0.14, 0.14)} fill="#000" opacity="0.12" />
        </g>
      ))}
      <Fringe gx={0} gy={0.16} len={0.68} axis="gy" out={-0.12} n={4} />
      <Fringe gx={3} gy={0.16} len={0.68} axis="gy" out={0.12} n={4} />
    </g>
  );
}

function Crates() {
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={0.8} dy={0.7} h={16} fallback="#c98a4b" dark={0.34} mid={0.2} />
      <g transform={`translate(${project(0, 0.7).x}, ${project(0, 0.7).y}) skewY(${SKEW})`}>
        <line x1="2" y1="-8" x2="17" y2="-8" stroke="#000" strokeWidth="1" opacity="0.2" />
      </g>
      <g transform="translate(0,-16)">
        <TintedBox gx={0.08} gy={0.06} dx={0.62} dy={0.56} h={14} fallback="#c98a4b" dark={0.34} mid={0.2} />
        {/* tape across the top, so it reads as packed rather than as a plinth */}
        <g transform="translate(0,-14)">
          <polygon points={floorPatch(0.3, 0.06, 0.08, 0.56)} fill="#e8d9b8" opacity="0.75" />
        </g>
      </g>
    </g>
  );
}

function Mug() {
  const c = project(0.15, 0.15);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="5" ry="2.6" style={tinted("#f2e9dd")} />
      <ellipse cx="0" cy="-1" rx="5" ry="2.6" fill="#000" opacity="0.3" />
      <rect x="-5" y="-9" width="10" height="8" style={tinted("#f2e9dd")} />
      <rect x="-5" y="-9" width="10" height="8" fill="#000" opacity="0.14" />
      <path d="M5 -7.5 q4 1.5 0 5" fill="none" style={{ stroke: "var(--tint, #f2e9dd)" }} strokeWidth="1.6" />
      <ellipse cx="0" cy="-9" rx="5" ry="2.6" style={tinted("#f7f2ea")} />
      <ellipse cx="0" cy="-9" rx="3.6" ry="1.8" fill="#5a3a24" />
      <g className="steam-puff">
        <ellipse cx="0" cy="-13" rx="2" ry="3" fill="#fff" opacity="0.3" />
      </g>
    </g>
  );
}

function LightJar() {
  const c = project(0.2, 0.2);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="6" ry="3" fill="#cbe8ef" opacity="0.3" />
      <path d="M-6 -2 l0 -10 a6 3 0 0 1 12 0 l0 10 a6 3 0 0 1 -12 0 z" fill="#cbe8ef" opacity="0.22" />
      {[
        [-2.5, -5],
        [2, -7],
        [-1, -9],
        [3, -11],
        [-3, -12],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="#ffe9b0" className="room-twinkle" />
      ))}
      <ellipse cx="0" cy="-12" rx="6" ry="3" fill="none" stroke="#fff" strokeWidth="1" opacity="0.35" />
      <rect x="-4.5" y="-15" width="9" height="3" rx="1.2" style={tinted("#c98a4b")} />
    </g>
  );
}

/** A leaning ladder shelf: the diagonal is the whole silhouette, and nothing
 *  else in the room has one. */
function LadderShelf() {
  const D = 0.5;
  const H = 62;
  return (
    <g>
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {[0, 18].map((x) => (
          <path key={x} d={`M${x + 2} 0 L${x + 5} ${-H} l2.4 0 L${x + 4.4} 0 z`} style={tinted("#a87f5f")} />
        ))}
        {[-14, -29, -44].map((y, i) => {
          const inset = 2.6 + i * 0.7;
          return (
            <g key={y}>
              <rect x={inset} y={y} width={22 - inset * 2 + 4} height="2.4" style={tinted("#b58c6a")} />
              <rect x={inset} y={y} width={22 - inset * 2 + 4} height="2.4" fill="#000" opacity="0.12" />
            </g>
          );
        })}
        <rect x="6" y="-52" width="3.6" height="8" rx="0.6" fill="#7faf8f" />
        <rect x="10" y="-51" width="3.6" height="7" rx="0.6" fill="#e8a3a8" />
        <circle cx="12" cy="-33" r="3" fill="#e8b04b" />
        <path d="M8 -14 q-3 -7 0 -9 q3 2 0 9 z" fill="#3f7f63" />
      </g>
    </g>
  );
}

function NeonSign() {
  return (
    <g transform={`skewY(${SKEW})`}>
      {/* the glow is drawn twice: a wide soft pass, then the tube itself */}
      <path
        d="M4 -80 q6 -12 12 0 q6 12 12 0"
        fill="none"
        style={{ stroke: "var(--tint, #e8a3a8)" }}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.25"
        className="room-breathe"
      />
      <path
        d="M4 -80 q6 -12 12 0 q6 12 12 0"
        fill="none"
        style={{ stroke: "var(--tint, #e8a3a8)" }}
        strokeWidth="2.4"
        strokeLinecap="round"
        className="room-breathe"
      />
      <path
        d="M4 -80 q6 -12 12 0 q6 12 12 0"
        fill="none"
        stroke="#fff"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.55"
      />
    </g>
  );
}

function Corkboard() {
  const NOTES = [
    [3, -92, "#e8b04b", 8, 7],
    [13, -93, "#7faf8f", 7, 8],
    [21, -90, "#e8a3a8", 6, 6],
    [4, -80, "#cbe8ef", 7, 6],
    [14, -82, "#9b8bd6", 9, 7],
  ];
  return (
    <g transform={`skewY(${SKEW})`}>
      <rect x="0" y="-96" width="29" height="32" rx="1.5" style={tinted("#c98a4b")} />
      <rect x="0" y="-96" width="29" height="32" rx="1.5" fill="#000" opacity="0.2" />
      <rect x="1.5" y="-94.5" width="26" height="29" fill="#b5844f" />
      {NOTES.map(([x, y, fill, w, h]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={w} height={h} fill={fill} opacity="0.9" />
          <circle cx={x + w / 2} cy={y + 1.2} r="0.8" fill="#d96a6a" />
        </g>
      ))}
    </g>
  );
}

function Pennant() {
  return (
    <g transform={`skewY(${SKEW})`}>
      <line x1="2" y1="-94" x2="20" y2="-94" stroke="#6b4a39" strokeWidth="1.2" />
      <g className="room-sway-hanging">
        <path d="M3 -93 l16 0 l-8 20 z" style={tinted("#5b6b9b")} />
        <path d="M11 -93 l8 0 l-8 20 z" fill="#000" opacity="0.16" />
        <circle cx="11" cy="-85" r="3.2" fill="#ffe9b0" opacity="0.85" />
      </g>
    </g>
  );
}

// ---- things that sit ON surfaces --------------------------------------- //
// All `stacks: true` in the catalog, so dropping one on a desk or table lifts
// it onto the top instead of leaving it on the floor.

/** An actual computer: monitor on a stand, keyboard in front, tower beside
 *  it. The lit screen is the point — a dark rectangle reads as a box. */
function Computer() {
  const screen = isoBox(0.1, 0.32, 0.9, 0.055, 24);
  const panelW = 0.9 * (TILE_W / 2);
  return (
    <g>
      {/* Monitor first: it is the FURTHEST back thing here. The tower used to
          be drawn before it and sat at a nearer front corner, so the panel
          painted over the machine it belongs to. */}
      <g transform={`translate(${project(0.56, 0.46).x}, ${project(0.56, 0.46).y})`}>
        <ellipse cx="0" cy="0" rx="11" ry="5" fill="#241d33" />
        <ellipse cx="0" cy="-1.6" rx="11" ry="5" fill="#4a4152" />
      </g>
      <TintedBox gx={0.51} gy={0.42} dx={0.1} dy={0.08} h={9} fallback="#3a3142" tint={false} dark={0.3} mid={0.16} />
      <g transform="translate(0,-9)">
        <polygon points={screen.left} fill="#241d33" />
        <polygon points={screen.right} fill="#171220" />
        <polygon points={screen.top} fill="#4a4152" />
        <g transform={`translate(${project(0.1, 0.375).x}, ${project(0.1, 0.375).y}) skewY(${SKEW})`}>
          <ScreenFace w={panelW} h={24} picture={false} />
          {/* a window with a title bar, then a couple of text lines */}
          <rect x="3" y="-20" width="10" height="7.5" rx="0.8" fill="#f7e9e2" opacity="0.5" />
          <rect x="3" y="-20" width="10" height="1.8" rx="0.8" fill="#f7e9e2" opacity="0.7" />
          <rect x="3" y="-10.5" width="12" height="1.1" rx="0.55" fill="#f7e9e2" opacity="0.38" />
          <rect x="3" y="-8.1" width="8" height="1.1" rx="0.55" fill="#f7e9e2" opacity="0.26" />
          <rect x="3" y="-5.7" width="14" height="1.1" rx="0.55" fill="#f7e9e2" opacity="0.2" />
        </g>
      </g>
      {/* Tower: a vent grille, a slot and a power light are the difference
          between a PC and a black box. */}
      <TintedBox gx={1.05} gy={0.12} dx={0.3} dy={0.5} h={24} fallback="#3a3142" tint={false} dark={0.32} mid={0.18} />
      <g transform={`translate(${project(1.05, 0.62).x}, ${project(1.05, 0.62).y}) skewY(${SKEW})`}>
        <rect x="1.5" y="-21" width="4.5" height="1.4" rx="0.5" fill="#000" opacity="0.35" />
        {[-17, -15.4, -13.8, -12.2].map((y) => (
          <rect key={y} x="1.5" y={y} width="4.5" height="0.8" fill="#000" opacity="0.28" />
        ))}
        <circle cx="3.7" cy="-4" r="0.9" fill="#7faf8f" />
      </g>
      {/* Keyboard with key rows, and a mouse beside it — both nearer still. */}
      <TintedBox gx={0.22} gy={0.66} dx={0.7} dy={0.22} h={2} fallback="#4a4152" tint={false} dark={0.28} mid={0.14} />
      <g transform="translate(0,-2)">
        {[0.69, 0.745, 0.8].map((gy) =>
          Array.from({ length: 9 }, (_, i) => (
            <polygon
              key={`${gy}-${i}`}
              points={floorPatch(0.26 + i * 0.072, gy, 0.05, 0.03)}
              fill="#000"
              opacity="0.26"
            />
          ))
        )}
      </g>
      <g transform={`translate(${project(1.02, 0.8).x}, ${project(1.02, 0.8).y})`}>
        <ellipse cx="0" cy="-2" rx="4.2" ry="2.6" fill="#241d33" />
        <ellipse cx="0" cy="-3.2" rx="4.2" ry="2.6" fill="#5b5166" />
        <rect x="-0.4" y="-5.6" width="0.8" height="2" rx="0.4" fill="#000" opacity="0.3" />
      </g>
    </g>
  );
}

// ---- outdoors ----------------------------------------------------------- //
// The garden had exactly one tree. Silhouette does the work at this size, so
// each of these is a different OUTLINE rather than a different green.

function Pine() {
  const c = project(0.6, 0.6);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <rect x="-3" y="-16" width="6" height="16" fill="#6b4a39" />
      <rect x="0" y="-16" width="3" height="16" fill="#000" opacity="0.2" />
      <g className="room-sway">
        {[
          [-14, 34, 24],
          [-32, 27, 20],
          [-48, 19, 16],
          [-62, 12, 12],
        ].map(([y, w, h]) => (
          <g key={y}>
            <path d={`M${-w / 2} ${y} L0 ${y - h} L${w / 2} ${y} Z`} style={tinted("#2f6b4f")} />
            <path d={`M0 ${y} L0 ${y - h} L${w / 2} ${y} Z`} fill="#000" opacity="0.16" />
          </g>
        ))}
      </g>
    </g>
  );
}

function Birch() {
  const c = project(0.6, 0.6);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <rect x="-3.5" y="-52" width="7" height="52" fill="#ddd6cc" />
      <rect x="1" y="-52" width="2.5" height="52" fill="#000" opacity="0.14" />
      {[-8, -19, -30, -41].map((y, i) => (
        <rect key={y} x={i % 2 ? -3.5 : -1} y={y} width="4" height="2.2" rx="0.6" fill="#3a3142" opacity="0.55" />
      ))}
      <g className="room-sway">
        <ellipse cx="-4" cy="-60" rx="17" ry="13" style={tinted("#7fb08a")} />
        <ellipse cx="9" cy="-53" rx="12" ry="10" style={tinted("#7fb08a")} />
        <ellipse cx="9" cy="-53" rx="12" ry="10" fill="#000" opacity="0.12" />
        <ellipse cx="-8" cy="-66" rx="10" ry="7" fill="#fff" opacity="0.12" />
      </g>
    </g>
  );
}

function Hedge() {
  return (
    <g>
      <TintedBox gx={0} gy={0} dx={1.6} dy={0.6} h={22} fallback="#3f7f63" dark={0.3} mid={0.16} />
      {/* clipped-top texture: a row of soft lobes along the crown */}
      <g transform="translate(0,-22)">
        {[0.2, 0.6, 1.0, 1.4].map((gx) => {
          const p = project(gx, 0.3);
          return <ellipse key={gx} cx={p.x} cy={p.y} rx="9" ry="4.5" style={tinted("#4f8f6a")} />;
        })}
      </g>
    </g>
  );
}

function Rock() {
  const c = project(0.45, 0.4);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <path d="M-16 0 q-4 -11 4 -16 q10 -7 18 0 q8 6 3 16 z" style={tinted("#8d8178")} />
      <path d="M2 -20 q8 5 3 20 l-5 0 q4 -12 2 -20 z" fill="#000" opacity="0.22" />
      <path d="M-12 -6 q4 -9 10 -11" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.14" strokeLinecap="round" />
      <ellipse cx="-4" cy="-1" rx="15" ry="3" fill="#000" opacity="0.16" />
    </g>
  );
}

function Log() {
  const c = project(0.7, 0.35);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <rect x="-20" y="-13" width="40" height="13" rx="6.5" style={tinted("#8f5d49")} />
      <rect x="-20" y="-7" width="40" height="7" rx="3.5" fill="#000" opacity="0.2" />
      <ellipse cx="-20" cy="-6.5" rx="4" ry="6.5" fill="#c9a06f" />
      <ellipse cx="-20" cy="-6.5" rx="2.4" ry="4" fill="none" stroke="#8f5d49" strokeWidth="0.9" />
      <ellipse cx="-20" cy="-6.5" rx="1" ry="1.7" fill="#8f5d49" />
      {[-8, 4, 14].map((x) => (
        <path key={x} d={`M${x} -12 q1.5 6 0 11`} stroke="#000" strokeWidth="0.8" fill="none" opacity="0.16" />
      ))}
    </g>
  );
}

function Flowers() {
  const c = project(0.35, 0.3);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {[
        [-9, -2, "#e8a3a8"],
        [0, -5, "#e8b04b"],
        [8, -1, "#9b8bd6"],
        [-3, 1, "#f2e9dd"],
      ].map(([x, dy, fill]) => (
        <g key={`${x}-${dy}`}>
          <path d={`M${x} ${dy} q1 -8 0 -13`} stroke="#3f7f63" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <g className="room-sway">
            {[0, 72, 144, 216, 288].map((deg) => {
              const r = (deg * Math.PI) / 180;
              return (
                <ellipse
                  key={deg}
                  cx={x + Math.cos(r) * 2.6}
                  cy={dy - 13 + Math.sin(r) * 2}
                  rx="2.2"
                  ry="1.6"
                  style={tinted(fill)}
                />
              );
            })}
            <circle cx={x} cy={dy - 13} r="1.5" fill="#ffe9b0" />
          </g>
        </g>
      ))}
    </g>
  );
}

// ---- more of what the room already had ---------------------------------- //

/**
 * Plank seams across a tabletop. A bare slab reads as flat-pack; two or three
 * seams running the length of the top are what say "boards". Drawn in the
 * floor plane and lifted by the caller, so the perspective is free.
 */
function Planks({ w, d, n = 3, opacity = 0.13 }) {
  return Array.from({ length: n }, (_, i) => (
    <polygon
      key={i}
      points={floorPatch(0.06, (d * (i + 1)) / (n + 1), w - 0.12, 0.02)}
      fill="#000"
      opacity={opacity}
    />
  ));
}

function DiningTable() {
  const W = 1.8;
  const D = 1.1;
  const H = 22;
  return (
    <g>
      {[
        [0.12, 0.12],
        [W - 0.26, 0.12],
        [0.12, D - 0.26],
        [W - 0.26, D - 0.26],
      ].map(([gx, gy]) => (
        <TintedBox key={`${gx}-${gy}`} gx={gx} gy={gy} dx={0.14} dy={0.14} h={H} fallback="#8f5d49" dark={0.42} mid={0.26} />
      ))}
      {/* Apron rail. Four legs under a floating slab is the flat-pack look —
          the rail is what ties them into a piece of furniture. */}
      <g transform={`translate(0,${-(H - 7)})`}>
        <TintedBox gx={0.1} gy={0.1} dx={W - 0.2} dy={D - 0.2} h={4.5} fallback="#8f5d49" dark={0.46} mid={0.3} />
      </g>
      <g transform={`translate(0,${-H})`}>
        <TintedBox gx={0} gy={0} dx={W} dy={D} h={4.5} fallback="#a87f5f" dark={0.3} mid={0.16} />
        <g transform="translate(0,-4.5)">
          <Planks w={W} d={D} />
        </g>
      </g>
    </g>
  );
}

function WoodStool() {
  const c = project(0.35, 0.35);
  const H = 19;
  return (
    <g>
      {[
        [0.1, 0.1],
        [0.5, 0.1],
        [0.1, 0.5],
        [0.5, 0.5],
      ].map(([gx, gy]) => (
        <TintedBox key={`${gx}-${gy}`} gx={gx} gy={gy} dx={0.1} dy={0.1} h={H} fallback="#8f5d49" dark={0.42} mid={0.26} />
      ))}
      <g transform={`translate(${c.x}, ${c.y - H})`}>
        <ellipse cx="0" cy="3" rx="13" ry="6.5" style={tinted("#a87f5f")} />
        <ellipse cx="0" cy="3" rx="13" ry="6.5" fill="#000" opacity="0.3" />
        <ellipse cx="0" cy="0" rx="13" ry="6.5" style={tinted("#b58c6a")} />
        <ellipse cx="-3" cy="-1.5" rx="6" ry="2.6" fill="#fff" opacity="0.08" />
      </g>
    </g>
  );
}

function OvalRug() {
  const c = project(1.1, 0.85);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="0" rx="47" ry="23" style={tinted("rgb(var(--color-rose))")} opacity="0.46" />
      {/* A braided oval is rings of alternating tone, not hairlines on a
          solid disc — filled bands are what make the braid visible. */}
      <ellipse cx="0" cy="0" rx="40" ry="19.5" fill="#f7e9e2" opacity="0.11" />
      <ellipse cx="0" cy="0" rx="33" ry="16" fill="#000" opacity="0.09" />
      <ellipse cx="0" cy="0" rx="24" ry="11.5" fill="#f7e9e2" opacity="0.12" />
      <ellipse cx="0" cy="0" rx="13" ry="6" fill="#000" opacity="0.08" />
      {[47, 33, 13].map((rx) => (
        <ellipse
          key={rx}
          cx="0"
          cy="0"
          rx={rx}
          ry={rx * 0.49}
          fill="none"
          stroke="#000"
          strokeWidth="0.9"
          opacity="0.14"
        />
      ))}
    </g>
  );
}

function MatRug() {
  return (
    <g>
      <RugGround w={1.4} d={0.9} m={0.12} fallback="rgb(var(--color-blush))" ground={0.52} field={0.08} />
      {/* Coir bristle: short strokes across the weave, dense enough to read as
          texture rather than as three painted stripes. */}
      {[0.16, 0.3, 0.44, 0.58, 0.72].map((t) =>
        [0.24, 0.52, 0.8, 1.08].map((gx) => (
          <polygon
            key={`${t}-${gx}`}
            points={floorPatch(gx - 0.09, t, 0.18, 0.05)}
            fill="#000"
            opacity="0.11"
          />
        ))
      )}
    </g>
  );
}

// ---- more rugs ---------------------------------------------------------- //
// Rugs are the cheapest way to change a room's character, and every one of
// these is a flat diamond (layer -1) with a pattern painted inside it — no
// height, no depth rules, and the cat treats all of them as a place to sleep.

/** Bordered medallion rug: field, inner border, centre medallion, corner
 *  lozenges. Reads "patterned" at postage-stamp size, which is the only size
 *  that matters in the picker. */
function PersianRug() {
  const c = project(1.5, 1.1);
  const ink = { stroke: "rgb(var(--color-petal))", fill: "none" };
  return (
    <g>
      <polygon points={floorPatch(0, 0, 3, 2.2)} style={tinted("#8f4a3c")} opacity="0.5" />
      <polygon points={floorPatch(0.16, 0.12, 2.68, 1.96)} {...ink} strokeWidth="2.4" opacity="0.32" />
      <polygon points={floorPatch(0.34, 0.26, 2.32, 1.68)} {...ink} strokeWidth="1.2" opacity="0.22" />
      <g transform={`translate(${c.x}, ${c.y})`}>
        {/* medallion: a diamond in plan is an ellipse on screen */}
        <ellipse cx="0" cy="0" rx="26" ry="13" style={tinted("#e8b04b")} opacity="0.4" />
        <ellipse cx="0" cy="0" rx="17" ry="8.5" {...ink} strokeWidth="1.4" opacity="0.3" />
        <ellipse cx="0" cy="0" rx="7" ry="3.5" style={tinted("#e8b04b")} opacity="0.45" />
      </g>
      {[
        [0.5, 0.38],
        [2.5, 0.38],
        [0.5, 1.82],
        [2.5, 1.82],
      ].map(([gx, gy]) => {
        const p = project(gx, gy);
        return (
          <ellipse key={`${gx}-${gy}`} cx={p.x} cy={p.y} rx="9" ry="4.5" style={tinted("#e8b04b")} opacity="0.3" />
        );
      })}
    </g>
  );
}

/** Stripes run along +gx, so they read as bands across the floor rather than
 *  as a grid — the alternating widths are what stop it looking like a barcode. */
function StripedRug() {
  const bands = [0, 0.28, 0.52, 0.84, 1.12, 1.44];
  return (
    <g>
      <polygon points={floorPatch(0, 0, 2.6, 1.8)} style={tinted("#5b6b9b")} opacity="0.45" />
      {bands.map((t, i) => (
        <polygon
          key={t}
          points={floorPatch(0.12, t + 0.1, 2.36, i % 2 ? 0.1 : 0.17)}
          fill="#f7e9e2"
          opacity={i % 2 ? 0.12 : 0.2}
        />
      ))}
      {/* fringe at both short ends */}
      {[0, 1].map((end) =>
        [0.2, 0.5, 0.8, 1.1, 1.4, 1.7].map((t) => {
          const a = project(end ? 2.6 : 0, t);
          return (
            <line
              key={`${end}-${t}`}
              x1={a.x}
              y1={a.y}
              x2={a.x + (end ? 5 : -5)}
              y2={a.y + (end ? 2.5 : -2.5)}
              stroke="#f7e9e2"
              strokeWidth="1.2"
              opacity="0.25"
            />
          );
        })
      )}
    </g>
  );
}

/** Sheepskin: no straight edges anywhere. A ring of overlapping soft blobs,
 *  which is also what makes it read as pile rather than as a flat shape. */
function Sheepskin() {
  const c = project(0.9, 0.75);
  const puffs = [
    [-30, -2, 15, 9],
    [-14, -9, 17, 10],
    [6, -10, 16, 9.5],
    [24, -3, 14, 8],
    [16, 6, 15, 8.5],
    [-4, 9, 17, 9],
    [-24, 6, 14, 8],
    [0, 0, 26, 13],
  ];
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {puffs.map(([x, y, rx, ry]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} style={tinted("#f2e7dc")} opacity="0.62" />
      ))}
      {puffs.slice(0, 5).map(([x, y, rx, ry]) => (
        <ellipse key={`s${x}-${y}`} cx={x - 1} cy={y - 2} rx={rx * 0.6} ry={ry * 0.5} fill="#fff" opacity="0.18" />
      ))}
    </g>
  );
}

// ---- pets --------------------------------------------------------------- //
// Roamers, same engine as the cat: they wander on a visual-only offset and
// settle once they find something flat (`layer: -1`) to lie on. Each needs a
// distinct SILHOUETTE, since at this size that's all you get — the dog is long
// and low with a plumed tail, the rabbit is a vertical teardrop with ears.

function DogHead({ x, y, r, asleep }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.88} style={tinted("#c98a4b")} />
      {/* folded ears hang beside the skull rather than standing up */}
      <ellipse cx={x - r * 0.85} cy={y + r * 0.1} rx={r * 0.32} ry={r * 0.6} style={tinted("#c98a4b")} />
      <ellipse cx={x - r * 0.85} cy={y + r * 0.1} rx={r * 0.32} ry={r * 0.6} fill="#000" opacity="0.22" />
      <ellipse cx={x + r * 0.85} cy={y + r * 0.05} rx={r * 0.3} ry={r * 0.58} style={tinted("#c98a4b")} />
      <ellipse cx={x + r * 0.85} cy={y + r * 0.05} rx={r * 0.3} ry={r * 0.58} fill="#000" opacity="0.12" />
      {/* cream muzzle + black nose: the two marks that say "dog" fastest */}
      <ellipse cx={x - r * 0.1} cy={y + r * 0.5} rx={r * 0.62} ry={r * 0.42} fill="#f2e7dc" opacity="0.85" />
      <ellipse cx={x - r * 0.28} cy={y + r * 0.34} rx={r * 0.18} ry={r * 0.13} fill="#2b2350" />
      {asleep ? (
        <>
          <path d={`M${x - r * 0.62} ${y - r * 0.05} q${r * 0.2} ${r * 0.2} ${r * 0.4} 0`} fill="none" stroke="#2b2350" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
          <path d={`M${x + r * 0.22} ${y - r * 0.08} q${r * 0.2} ${r * 0.2} ${r * 0.4} 0`} fill="none" stroke="#2b2350" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
        </>
      ) : (
        <>
          <circle cx={x - r * 0.4} cy={y - r * 0.08} r={r * 0.15} fill="#2b2350" />
          <circle cx={x + r * 0.42} cy={y - r * 0.12} r={r * 0.15} fill="#2b2350" />
          <circle cx={x - r * 0.36} cy={y - r * 0.14} r={r * 0.06} fill="#fff" opacity="0.85" />
        </>
      )}
    </g>
  );
}

function Dog({ awake = false }) {
  const c = project(0.55, 0.35);
  if (awake) {
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.9)`}>
        {[
          ["leg-step-b", 8],
          ["leg-step-a", -11],
        ].map(([cls, x]) => (
          <g key={x} className={cls}>
            <rect x={x} y="-13" width="4.8" height="14" rx="2.4" style={tinted("#c98a4b")} />
            <rect x={x} y="-13" width="4.8" height="14" rx="2.4" fill="#000" opacity="0.3" />
          </g>
        ))}
        <g className="resident-type">
          <ellipse cx="6" cy="-19" rx="11" ry="9" style={tinted("#c98a4b")} />
          <ellipse cx="-3" cy="-18" rx="16" ry="8.5" style={tinted("#c98a4b")} />
          {/* cream chest + belly shadow */}
          <ellipse cx="-9" cy="-15" rx="8" ry="5" fill="#f2e7dc" opacity="0.5" />
          <ellipse cx="-2" cy="-12" rx="14" ry="3.4" fill="#000" opacity="0.16" />
          <rect x="-9" y="-14" width="4.8" height="14" rx="2.4" style={tinted("#c98a4b")} />
          <rect x="10" y="-14" width="4.8" height="14" rx="2.4" style={tinted("#c98a4b")} />
          <DogHead x={-16} y={-26} r={7.8} asleep={false} />
        </g>
        {/* the plume: a thick curl over the back, the dog's whole read at range */}
        <path d="M15 -23 q12 -2 10 -13" fill="none" style={{ stroke: "var(--tint, #c98a4b)" }} strokeWidth="5.5" strokeLinecap="round" />
        <path d="M15 -23 q12 -2 10 -13" fill="none" stroke="#f2e7dc" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      </g>
    );
  }
  return (
    <g transform={`translate(${c.x}, ${c.y}) scale(0.9)`}>
      <path className="tail-flick" d="M13 -4 q14 2 15 -8" fill="none" style={{ stroke: "var(--tint, #c98a4b)" }} strokeWidth="5.5" strokeLinecap="round" />
      <g className="cat-breathe">
        <ellipse cx="0" cy="-7" rx="21" ry="10.5" style={tinted("#c98a4b")} />
        <ellipse cx="8" cy="-11" rx="11" ry="8" style={tinted("#c98a4b")} />
        <ellipse cx="-6" cy="-9" rx="12" ry="5" fill="#f2e7dc" opacity="0.4" />
        <ellipse cx="0" cy="-2.5" rx="19" ry="5" fill="#000" opacity="0.2" />
        <DogHead x={-14} y={-12} r={8} asleep />
        {/* muzzle resting on the front paws — the pose that reads as content */}
        <ellipse cx="-9" cy="-3.4" rx="5.4" ry="2.8" style={tinted("#c98a4b")} />
        <ellipse cx="-9" cy="-4" rx="4.6" ry="2.2" fill="#f2e7dc" opacity="0.35" />
      </g>
    </g>
  );
}

function Bunny({ awake = false }) {
  const c = project(0.35, 0.3);
  const ear = (x, tilt, dark) => (
    <g transform={`rotate(${tilt} ${x} ${awake ? -20 : -9})`}>
      <ellipse cx={x} cy={awake ? -27 : -12} rx="2.9" ry={awake ? 9.5 : 6} style={tinted("#d9d2e4")} />
      <ellipse cx={x} cy={awake ? -27 : -12} rx="1.5" ry={awake ? 7 : 4.2} fill="#e8a3a8" opacity={dark ? 0.25 : 0.5} />
      {dark && <ellipse cx={x} cy={awake ? -27 : -12} rx="2.9" ry={awake ? 9.5 : 6} fill="#000" opacity="0.18" />}
    </g>
  );
  if (awake) {
    // Sitting up on the haunches: a vertical teardrop, ears apart and alert.
    return (
      <g transform={`translate(${c.x}, ${c.y})`}>
        {ear(-4.5, -14, true)}
        {ear(3.5, 12, false)}
        <g className="resident-type">
          <ellipse cx="0" cy="-8" rx="9.5" ry="8.5" style={tinted("#d9d2e4")} />
          <ellipse cx="-0.5" cy="-16" rx="7" ry="6.2" style={tinted("#d9d2e4")} />
          <ellipse cx="-2" cy="-18" rx="4" ry="2.4" fill="#fff" opacity="0.2" />
          <circle cx="-3.4" cy="-16.5" r="1.15" fill="#2b2350" />
          <circle cx="2.6" cy="-16.8" r="1.15" fill="#2b2350" />
          <ellipse cx="-0.4" cy="-13.8" rx="1.1" ry="0.8" fill="#e8a3a8" />
          {/* forepaws tucked to the chest */}
          <ellipse cx="-3.5" cy="-6" rx="2.6" ry="3.4" style={tinted("#d9d2e4")} />
          <ellipse cx="3" cy="-6" rx="2.6" ry="3.4" style={tinted("#d9d2e4")} />
        </g>
        <ellipse cx="0" cy="-1" rx="10" ry="3.4" fill="#000" opacity="0.16" />
        <circle cx="9" cy="-6" r="3.4" fill="#f7e9e2" opacity="0.85" />
      </g>
    );
  }
  // Loafed: legs folded away, ears laid back along the spine.
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {ear(6, 62, true)}
      {ear(7.5, 78, false)}
      <g className="cat-breathe">
        <ellipse cx="0" cy="-6" rx="13" ry="7.5" style={tinted("#d9d2e4")} />
        <ellipse cx="-8" cy="-8.5" rx="6.5" ry="5.6" style={tinted("#d9d2e4")} />
        <ellipse cx="-3" cy="-9.5" rx="7" ry="3" fill="#fff" opacity="0.18" />
        <ellipse cx="0" cy="-2" rx="12" ry="3.6" fill="#000" opacity="0.18" />
        <path d="M-11.4 -8.8 q1.4 1.3 2.8 0" fill="none" stroke="#2b2350" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        <ellipse cx="-13" cy="-7.4" rx="1" ry="0.75" fill="#e8a3a8" />
      </g>
      <circle cx="11" cy="-5" r="3.2" fill="#f7e9e2" opacity="0.8" />
    </g>
  );
}

// ---- new decoration ----------------------------------------------------- //

/** Upright piano: case, fallboard, keys on the front-left face, candlesticks. */
function Piano() {
  const box = isoBox(0, 0, 2, 0.8, 62);
  const face = project(0, 0.8);
  return (
    <g>
      <polygon points={box.left} style={tinted("#4a3a5b")} />
      <polygon points={box.left} fill="#000" opacity="0.16" />
      <polygon points={box.right} style={tinted("#4a3a5b")} />
      <polygon points={box.right} fill="#000" opacity="0.34" />
      <polygon points={box.top} style={tinted("#4a3a5b")} />
      <polygon points={box.top} fill="#fff" opacity="0.07" />
      {/* everything below lives on the front-left face */}
      <g transform={`translate(${face.x}, ${face.y}) skewY(${SKEW})`}>
        <rect x="3" y="-56" width="42" height="20" rx="1.5" fill="#000" opacity="0.18" />
        {/* fallboard, then the keybed jutting out over it */}
        <rect x="2" y="-34" width="44" height="5" rx="1.5" fill="#2f2540" />
        <rect x="1" y="-29" width="46" height="7" rx="1" fill="#f7e9e2" />
        {Array.from({ length: 15 }, (_, i) => (
          <rect key={i} x={2.5 + i * 3} y="-29" width="0.7" height="7" fill="#2b2350" opacity="0.55" />
        ))}
        {[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map((i) => (
          <rect key={`b${i}`} x={4.1 + i * 3} y="-29" width="1.8" height="4.2" fill="#2b2350" />
        ))}
        <rect x="1" y="-22" width="46" height="3" rx="1" fill="#000" opacity="0.25" />
        {/* pedals */}
        <rect x="20" y="-6" width="3" height="4" fill="#e8b04b" opacity="0.7" />
        <rect x="25" y="-6" width="3" height="4" fill="#e8b04b" opacity="0.7" />
      </g>
    </g>
  );
}

/** Artist's easel: two front legs and a rear strut, canvas on the ledge. */
function Easel() {
  const c = project(0.45, 0.4);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <g stroke="var(--tint, #a87f5f)" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M-11 0 L-2 -54" />
        <path d="M11 2 L2 -54" />
        <path d="M4 -2 L1 -50" opacity="0.55" />
      </g>
      {/* canvas, tilted back a touch, with a half-finished sky on it */}
      <g transform="translate(0,-34) rotate(-3)">
        <rect x="-17" y="-20" width="34" height="28" rx="1" fill="#f7e9e2" />
        <rect x="-17" y="-20" width="34" height="28" rx="1" fill="none" stroke="#000" opacity="0.16" strokeWidth="1.2" />
        <rect x="-15" y="-18" width="30" height="13" fill="#8ec9ea" opacity="0.55" />
        <ellipse cx="7" cy="-14" rx="4" ry="4" fill="#ffe9b0" opacity="0.8" />
        <path d="M-15 -5 q8 -6 15 0 q7 -5 15 0 l0 11 l-30 0 z" fill="#7faf8f" opacity="0.6" />
      </g>
      {/* ledge + a palette hooked over its end */}
      <rect x="-19" y="-21" width="38" height="3.6" rx="1.6" style={tinted("#a87f5f")} />
      <rect x="-19" y="-21" width="38" height="3.6" rx="1.6" fill="#000" opacity="0.2" />
      <ellipse cx="17" cy="-15" rx="6" ry="4.2" fill="#c98a4b" />
      {[["#e8a3a8", 14.5], ["#7faf8f", 17], ["#5b6b9b", 19.5]].map(([col, x]) => (
        <circle key={col} cx={x} cy={-15.5} r="1.2" fill={col} />
      ))}
    </g>
  );
}

/** Birdcage on a stand — domed, with a live little occupant. */
function Birdcage() {
  const c = project(0.3, 0.3);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="9" ry="4.5" style={tinted("#8a7ac2")} />
      <ellipse cx="0" cy="-1" rx="9" ry="4.5" fill="#000" opacity="0.3" />
      <rect x="-1.6" y="-34" width="3.2" height="33" style={tinted("#8a7ac2")} />
      <rect x="-1.6" y="-34" width="3.2" height="33" fill="#000" opacity="0.22" />
      {/* cage: floor pan, dome, bars, ring on top */}
      <ellipse cx="0" cy="-34" rx="13" ry="6" style={tinted("#8a7ac2")} />
      <path d="M-13 -34 a13 13 0 0 1 26 0" fill="#2f2540" opacity="0.22" />
      <path d="M-13 -34 a13 13 0 0 1 26 0" fill="none" style={{ stroke: "var(--tint, #8a7ac2)" }} strokeWidth="2" />
      {[-9, -4.5, 0, 4.5, 9].map((x) => (
        <line
          key={x}
          x1={x}
          y1={-34}
          x2={x * 0.62}
          y2={-34 - Math.sqrt(Math.max(0, 169 - x * x)) * 0.78}
          style={{ stroke: "var(--tint, #8a7ac2)" }}
          strokeWidth="1.1"
          opacity="0.75"
        />
      ))}
      <path d="M-3 -47 a3 3 0 0 1 6 0" fill="none" style={{ stroke: "var(--tint, #8a7ac2)" }} strokeWidth="1.6" />
      {/* perch + bird */}
      <line x1="-7" y1="-40" x2="7" y2="-40" stroke="#a87f5f" strokeWidth="1.4" />
      <g className="room-breathe" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <ellipse cx="1" cy="-43.5" rx="4" ry="3.4" fill="#e8b04b" />
        <circle cx="-2.2" cy="-46" r="2.6" fill="#e8b04b" />
        <circle cx="-3" cy="-46.6" r="0.7" fill="#2b2350" />
        <path d="M-4.6 -45.8 l-2 0.9 l2 0.9 z" fill="#cf8f93" />
        <path d="M2 -44 q4 1 5 3" fill="none" stroke="#e8b04b" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </g>
  );
}

/** Folding screen: three hinged panels, so it zig-zags across the tile rather
 *  than standing as one flat wall. */
function FoldingScreen() {
  const H = 58;
  // Panel corners in GRID space — the zig-zag is real geometry, which is what
  // makes it read as folded from any camera angle.
  const pts = [
    [0, 0.34],
    [0.55, 0.06],
    [1.1, 0.34],
    [1.6, 0.06],
  ];
  return (
    <g>
      {pts.slice(0, -1).map(([gx, gy], i) => {
        const a = project(gx, gy);
        const b = project(pts[i + 1][0], pts[i + 1][1]);
        return (
          <g key={i}>
            <polygon
              points={`${a.x},${a.y - H} ${b.x},${b.y - H} ${b.x},${b.y} ${a.x},${a.y}`}
              style={tinted("#7faf8f")}
            />
            <polygon
              points={`${a.x},${a.y - H} ${b.x},${b.y - H} ${b.x},${b.y} ${a.x},${a.y}`}
              fill="#000"
              opacity={i % 2 ? 0.3 : 0.12}
            />
            {/* paper inset + a branch motif on the lighter panels */}
            <polygon
              points={`${a.x + 3},${a.y - H + 6} ${b.x - 3},${b.y - H + 6} ${b.x - 3},${b.y - 8} ${a.x + 3},${a.y - 8}`}
              fill="#f7e9e2"
              opacity={i % 2 ? 0.12 : 0.22}
            />
            {i % 2 === 0 && (
              <path
                d={`M${a.x + 6} ${a.y - 12} q6 -14 12 -20`}
                fill="none"
                stroke="#2f2540"
                strokeWidth="1.1"
                opacity="0.28"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Desk globe: sphere, tilted meridian ring, little foot. Stacks onto a desk. */
function Globe() {
  const c = project(0.22, 0.22);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="6" ry="3" fill="#5c3a2c" />
      <rect x="-1.2" y="-8" width="2.4" height="7" fill="#5c3a2c" />
      <g transform="rotate(-16)">
        <circle cx="0" cy="-16" r="8.2" style={tinted("#5b6b9b")} />
        {/* continents: three blobs, no geography implied */}
        <path d="M-5 -19 q3 -3 6 -1 q2 3 -1 4 q-4 1 -5 -3 z" fill="#7faf8f" opacity="0.9" />
        <path d="M1 -13 q4 -2 5 1 q0 3 -3 3 q-3 0 -2 -4 z" fill="#7faf8f" opacity="0.9" />
        <ellipse cx="-4" cy="-12.5" rx="2.6" ry="1.6" fill="#7faf8f" opacity="0.8" />
        <ellipse cx="-3" cy="-19" rx="3" ry="1.8" fill="#fff" opacity="0.16" />
        <circle cx="0" cy="-16" r="8.2" fill="none" stroke="#000" opacity="0.18" strokeWidth="0.8" />
        {/* meridian ring, open at the front so it reads as a ring not an outline */}
        <path d="M0 -25.4 a9.6 9.6 0 1 0 0.01 0" fill="none" stroke="#e8b04b" strokeWidth="1.6" opacity="0.9" />
      </g>
    </g>
  );
}

/** Chess set mid-game. Inherently two-coloured, hence tintable: false. */
function ChessSet() {
  const S = 0.6;
  const D = 0.5;
  return (
    <g>
      <polygon points={floorPatch(0, 0, S, D)} fill="#f2e7dc" />
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, f) =>
          (r + f) % 2 ? (
            <polygon
              key={`${r}-${f}`}
              points={floorPatch((f * S) / 4, (r * D) / 4, S / 4, D / 4)}
              fill="#4a3a5b"
            />
          ) : null
        )
      )}
      <polygon points={floorPatch(0, 0, S, D)} fill="none" stroke="#5c3a2c" strokeWidth="1.4" />
      {/* a handful of pieces, light and dark, mid-game rather than set up */}
      {[
        [0.1, 0.12, "#f7e9e2", 7],
        [0.3, 0.1, "#f7e9e2", 5],
        [0.44, 0.3, "#2b2350", 7],
        [0.22, 0.38, "#2b2350", 5],
        [0.5, 0.14, "#f7e9e2", 5],
      ].map(([gx, gy, fill, h]) => {
        const p = project(gx, gy);
        return (
          <g key={`${gx}-${gy}`}>
            <ellipse cx={p.x} cy={p.y} rx="2.6" ry="1.3" fill="#000" opacity="0.22" />
            <path
              d={`M${p.x - 2.2} ${p.y} q0.6 -${h * 0.5} 2.2 -${h} q1.6 ${h * 0.5} 2.2 ${h} z`}
              fill={fill}
            />
            <circle cx={p.x} cy={p.y - h} r="1.5" fill={fill} />
          </g>
        );
      })}
    </g>
  );
}

/** Garden hammock slung between two posts. `lie` seating, so a resident
 *  dropped on it stretches out instead of perching. */
function Hammock() {
  const H = 40;
  const left = project(0.18, 0.45);
  const right = project(2.02, 0.45);
  return (
    <g>
      {[left, right].map((p, i) => (
        <g key={i}>
          <ellipse cx={p.x} cy={p.y} rx="6" ry="3" fill="#000" opacity="0.18" />
          <rect x={p.x - 2.2} y={p.y - H} width="4.4" height={H} rx="1.6" fill="#8f5d49" />
          <rect x={p.x - 2.2} y={p.y - H} width="4.4" height={H} rx="1.6" fill="#000" opacity={i ? 0.28 : 0.1} />
        </g>
      ))}
      {/* the sling: one filled curve, with a slat pattern following the sag */}
      <path
        d={`M${left.x} ${left.y - H + 4} Q${(left.x + right.x) / 2} ${(left.y + right.y) / 2 - H + 30} ${right.x} ${right.y - H + 4}
            L${right.x} ${right.y - H + 12} Q${(left.x + right.x) / 2} ${(left.y + right.y) / 2 - H + 40} ${left.x} ${left.y - H + 12} z`}
        style={tinted("#c98a4b")}
      />
      <path
        d={`M${left.x} ${left.y - H + 12} Q${(left.x + right.x) / 2} ${(left.y + right.y) / 2 - H + 40} ${right.x} ${right.y - H + 12}`}
        fill="none"
        stroke="#000"
        opacity="0.22"
        strokeWidth="2.5"
      />
      {[0.25, 0.4, 0.55, 0.7].map((t) => {
        const x = left.x + (right.x - left.x) * t;
        const sag = 26 * Math.sin(Math.PI * t);
        const y = left.y + (right.y - left.y) * t - H + 4 + sag * 0.62;
        return <line key={t} x1={x} y1={y} x2={x} y2={y + 7} stroke="#f7e9e2" strokeWidth="1.1" opacity="0.3" />;
      })}
    </g>
  );
}

/** Garden lantern: post, glazed head, warm pool on the ground beneath it. */
function GardenLantern() {
  const c = project(0.25, 0.25);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="6.5" ry="3.2" fill="#2f2540" />
      <rect x="-1.8" y="-34" width="3.6" height="33" style={tinted("#2f2540")} />
      <rect x="-1.8" y="-34" width="3.6" height="33" fill="#000" opacity="0.2" />
      {/* head: a tapered glass box under a little pitched cap */}
      <path d="M-7 -34 L7 -34 L5.5 -48 L-5.5 -48 z" fill="#ffe9b0" opacity="0.85" className="room-breathe" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      <path d="M-7 -34 L7 -34 L5.5 -48 L-5.5 -48 z" fill="none" style={{ stroke: "var(--tint, #2f2540)" }} strokeWidth="1.6" />
      <line x1="0" y1="-34" x2="0" y2="-48" style={{ stroke: "var(--tint, #2f2540)" }} strokeWidth="1.1" opacity="0.8" />
      <path d="M-8.5 -48 L8.5 -48 L0 -55 z" style={tinted("#2f2540")} />
      <path d="M-8.5 -48 L8.5 -48 L0 -55 z" fill="#000" opacity="0.15" />
      <circle cx="0" cy="-56" r="1.6" style={tinted("#2f2540")} />
    </g>
  );
}

// ---- the café bar ------------------------------------------------------- //
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

export const ISO_SPRITES = {
  you: You,
  mapletree: MapleTree,
  leafpile: LeafPile,
  haybale: HayBale,
  pumpkin: Pumpkin,
  jackolantern: JackOLantern,
  rake: Rake,
  wreath: Wreath,
  oven: Oven,
  sink: Sink,
  microwave: Microwave,
  toaster: Toaster,
  kettle: Kettle,
  pot: Pot,
  teapot: Teapot,
  fruitbowl: FruitBowl,
  bread: Bread,
  cake: Cake,
  pie: Pie,
  ramen: Ramen,
  tv: Tv,
  laptop: Laptop,
  fern: Fern,
  palm: Palm,
  snakeplant: SnakePlant,
  bonsai: Bonsai,
  succulent: Succulent,
  orchid: Orchid,
  tablelamp: TableLamp,
  candelabra: Candelabra,
  paperlantern: PaperLantern,
  sconce: Sconce,
  pendant: Pendant,
  stairs: Stairs,
  railing: Railing,
  pillar: Pillar,
  resident: Resident,
  barcounter: BarCounter,
  menuboard: MenuBoard,
  till: Till,
  pastrycase: PastryCase,
  computer: Computer,
  pine: Pine,
  birch: Birch,
  hedge: Hedge,
  rock: Rock,
  log: Log,
  flowers: Flowers,
  diningtable: DiningTable,
  woodstool: WoodStool,
  ovalrug: OvalRug,
  archway: Archway,
  doorway: Doorway,
  bigwindow: BigWindow,
  matrug: MatRug,
  persianrug: PersianRug,
  stripedrug: StripedRug,
  sheepskin: Sheepskin,
  dog: Dog,
  bunny: Bunny,
  piano: Piano,
  easel: Easel,
  birdcage: Birdcage,
  screen: FoldingScreen,
  globe: Globe,
  chess: ChessSet,
  hammock: Hammock,
  lantern: GardenLantern,
  coatrack: CoatRack,
  cactus: Cactus,
  terrarium: Terrarium,
  petbed: PetBed,
  runner: Runner,
  crates: Crates,
  mug: Mug,
  lightjar: LightJar,
  ladder: LadderShelf,
  neon: NeonSign,
  corkboard: Corkboard,
  pennant: Pennant,
  wardrobe: Wardrobe,
  dresser: Dresser,
  deskchair: DeskChair,
  beanbag: Beanbag,
  guitar: Guitar,
  bookstack: BookStack,
  vinylcrate: VinylCrate,
  basket: Basket,
  desklamp: DeskLamp,
  standmirror: StandMirror,
  poster: Poster,
  curtain: Curtain,
  hangplant: HangingPlant,
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
  fireplace: Fireplace,
  wallclock: WallClock,
  recordplayer: RecordPlayer,
  candle: Candle,
  armchair: Armchair,
  nightstand: Nightstand,
  chair: Chair,
  shelf: Shelf,
  bookcase: Bookcase,
  sidetable: SideTable,
  radio: Radio,
  fridge: Fridge,
  cafetable: CafeTable,
  counter: Counter,
  coffeecounter: CoffeeCounter,
  tvunit: TvUnit,
};
