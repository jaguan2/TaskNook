import { useEffect, useState } from "react";
import { TILE_H, TILE_W, project, isoBox, floorPatch } from "../lib/iso";

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

// Drawn rather than rendered, so the shade takes a colour and the pole stays
// crisp at any zoom. The pool and the warm bulb are what make a lamp read as
// LIT — that was always ours; now the whole thing is.
function FloorLamp() {
  const c = project(0.4, 0.4);
  const H = 76;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="4" rx="32" ry="11" fill="url(#lampPool)" className="room-breathe" opacity="0.5" />
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
  return (
    <g>
      <polygon points={box.left} style={paint} />
      <polygon points={box.left} fill="#000" opacity={mid} />
      <polygon points={box.right} style={paint} />
      <polygon points={box.right} fill="#000" opacity={dark} />
      <polygon points={box.top} style={paint} />
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
function Upholstered({ w, seats }) {
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
      </g>
    </g>
  );
}

const Sofa = () => <Upholstered w={2} seats={2} />;
const Armchair = () => <Upholstered w={1} seats={1} />;
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
  const lid = isoBox(0.62, 0.36, 0.52, 0.05, 13);
  return (
    <g>
      <TintedBox gx={0.58} gy={0.41} dx={0.6} dy={0.34} h={2.5} fallback="#3a3142" tint={false} dark={0.3} mid={0.16} />
      <polygon points={lid.left} fill="url(#isoScreen)" />
      <polygon className="animate-flicker" points={lid.left} fill="#9db4e8" opacity="0.35" />
      <polygon points={lid.right} fill="#2b2350" />
      <polygon points={lid.top} fill="#3a3142" />
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
      <g transform={`translate(0,${-H})`}>
        <TintedBox gx={0} gy={0} dx={W} dy={D} h={4} fallback="#a87f5f" dark={0.3} mid={0.16} />
      </g>
    </g>
  );
}
function Chair() {
  const W = 0.7;
  const D = 0.7;
  const SEAT = 17;
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
      <ellipse cx="0" cy="-2" rx="11" ry="5.5" style={tinted("#8f5d49")} />
      <ellipse cx="0" cy="-2" rx="11" ry="5.5" fill="#000" opacity="0.3" />
      <rect x="-3" y={-H + 2} width="6" height={H - 4} style={tinted("#8f5d49")} />
      <rect x="-3" y={-H + 2} width="6" height={H - 4} fill="#000" opacity="0.22" />
      <ellipse cx="0" cy={-H + 3.5} rx="25" ry="12.5" style={tinted("#a87f5f")} />
      <ellipse cx="0" cy={-H + 3.5} rx="25" ry="12.5" fill="#000" opacity="0.3" />
      <ellipse cx="0" cy={-H} rx="25" ry="12.5" style={tinted("#b58c6a")} />
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
          <rect x="2" y={-SET + 3} width="20" height={SET - 8} rx="1.5" fill="url(#isoScreen)" />
          <rect className="animate-flicker" x="2" y={-SET + 3} width="20" height={SET - 8} rx="1.5" fill="#9db4e8" opacity="0.3" />
          <rect x="4" y={-SET + 5} width="7" height="4" rx="1" fill="#fff" opacity="0.16" />
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
      <circle cx={c.x} cy={c.y - 13} r="2.4" fill="#000" opacity="0.25" />
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
// by checking whether they were dropped onto something with a seat. `moving`
// is true mid-glide: the legs step in counter-phase so they walk, not skate.
const SKIN = "#edc39e";
const HAIR = "#3a3142";
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
function Resident({ seated = false, lying = false, seatH = 0, working = false, moving = false }) {
  const c = project(0.4, 0.4);
  // Lying down is its own drawing, not a squashed sitting pose: dropped on a
  // bed the resident used to perch bolt upright on the duvet.
  if (lying) {
    return (
      <g transform={`translate(${c.x}, ${c.y})`}>
        <g className="room-breathe" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          {/* body along the bed, knees slightly raised */}
          <rect x="-20" y="-11" width="34" height="12" rx="6" style={tinted("#7faf8f")} />
          <rect x="-20" y="-5" width="34" height="6" rx="3" fill="#000" opacity="0.12" />
          <ellipse cx="12" cy="-9" rx="8" ry="6" style={tinted("#7faf8f")} />
          {/* arm resting on top of the covers */}
          <rect x="-12" y="-14" width="14" height="4.6" rx="2.3" style={tinted("#7faf8f")} />
          <circle cx="1" cy="-11.7" r="2.4" fill={SKIN} />
          {/* head on the pillow, eyes closed */}
          <circle cx="-23" cy="-13" r="7.4" fill={SKIN} />
          <path d={`M-30.4 -13 a7.4 7.4 0 0 1 14.8 0 q-2 -2.6 -5 -2.2 q-4.4 -3 -8.8 0.6 z`} fill={HAIR} />
          <path d="M-26.4 -12.4 q1.6 1.4 3.2 0" fill="none" stroke={HAIR} strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />
          <path d="M-21 -12.6 q1.5 1.3 3 0" fill="none" stroke={HAIR} strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />
          <ellipse cx="-27" cy="-10" rx="1.6" ry="1" fill="#e8a3a8" opacity="0.4" />
        </g>
      </g>
    );
  }
  // Seated, the body rests ON the seat, so the torso's bottom edge belongs at
  // the seat line (sinking a px into the cushion), not hovering above it —
  // and low enough that the thighs emerge from under it rather than behind it.
  const torsoY = seated ? -21 : -33;
  const headY = seated ? -29 : -41;
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
          <g className={moving ? "leg-step-a" : undefined}>
            <rect x="-6.8" y="-15" width="5.6" height="15" rx="2.6" fill={TROUSER} />
            <ellipse cx="-4" cy="0.4" rx="4.2" ry="2.1" fill={SHOE} />
          </g>
          <g className={moving ? "leg-step-b" : undefined}>
            <rect x="1.2" y="-15" width="5.6" height="15" rx="2.6" fill={TROUSER} />
            <ellipse cx="4" cy="0.4" rx="4.2" ry="2.1" fill={SHOE} />
          </g>
        </>
      )}
      <g className="room-breathe" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
        <rect x="-9" y={torsoY} width="18" height="22" rx="6.5" style={tinted("#7faf8f")} />
        {/* shoulders proud of the waist, and a soft shadow where they meet */}
        <ellipse cx="0" cy={torsoY + 4} rx="10" ry="5.4" style={tinted("#7faf8f")} />
        <rect x="-9" y={torsoY + 14} width="18" height="8" rx="4" fill="#000" opacity="0.1" />
        {/* arms — they type when a focus block is running and they're seated */}
        <g className={working && seated ? "resident-type" : undefined}>
          <g>
            <rect x="-13.4" y={torsoY + 5} width="5" height="12" rx="2.5" style={tinted("#7faf8f")} />
            <rect x="-13.4" y={torsoY + 5} width="5" height="12" rx="2.5" fill="#000" opacity="0.16" />
            <circle cx="-10.9" cy={torsoY + 17.5} r="2.5" fill={SKIN} />
          </g>
          <g>
            <rect x="8.4" y={torsoY + 5} width="5" height="12" rx="2.5" style={tinted("#7faf8f")} />
            <circle cx="10.9" cy={torsoY + 17.5} r="2.5" fill={SKIN} />
          </g>
        </g>
        <rect x="-2.3" y={headY + 4} width="4.6" height="5" fill={SKIN} />
        <rect x="-2.3" y={headY + 4} width="4.6" height="5" fill="#000" opacity="0.14" />
        <circle cx="0" cy={headY} r="7.8" fill={SKIN} />
        {/* hair with a parting and a sideburn, rather than a flat cap */}
        <path
          d={`M-7.8 ${headY} a7.8 7.8 0 0 1 15.6 0 q-2.2 -2.8 -5.4 -2.3 q-4.6 -3.4 -9.2 0.7 q-0.7 0.6 -1 1.6 z`}
          fill={HAIR}
        />
        <path d={`M-7.7 ${headY - 0.6} q-1.6 5.6 0.3 9.4 q-3.4 -3.2 -3 -9 z`} fill={HAIR} />
        <circle cx="-2.9" cy={headY + 2} r="0.95" fill={HAIR} />
        <circle cx="2.9" cy={headY + 2} r="0.95" fill={HAIR} />
        <path
          d={`M-1.9 ${headY + 4.7} q1.9 1.5 3.8 0`}
          fill="none"
          stroke={HAIR}
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.75"
        />
        <ellipse cx="-5.2" cy={headY + 3.3} rx="1.7" ry="1" fill="#e8a3a8" opacity="0.4" />
        <ellipse cx="5.2" cy={headY + 3.3} rx="1.7" ry="1" fill="#e8a3a8" opacity="0.4" />
      </g>
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
  const glow = project(0.85, 1.15);
  return (
    <g>
      <ellipse cx={glow.x} cy={glow.y} rx="36" ry="14" fill="url(#lampPool)" className="room-breathe" opacity="0.4" />
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
function DeskChair() {
  const c = project(0.4, 0.4);
  const SEAT = 19;
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
          <TintedBox gx={0.12} gy={0.1} dx={0.56} dy={0.11} h={22} fallback="#5b6b9b" dark={0.3} mid={0.16} />
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
      <ellipse cx="4" cy="5" rx="15" ry="6.5" fill="url(#lampPool)" className="room-breathe" opacity="0.45" />
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
      <TintedBox gx={0.02} gy={0.02} dx={0.46} dy={0.46} h={11} fallback="#c0563f" dark={0.32} mid={0.18} />
      <g transform="translate(0,-11)">
        <ellipse cx="0" cy="0" rx="9" ry="4.5" fill="#3a2a24" />
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
      <polygon points={floorPatch(0, 0, 3, 1)} style={tinted("rgb(var(--color-blush))")} opacity="0.45" />
      <polygon
        points={floorPatch(0.18, 0.14, 2.64, 0.72)}
        fill="none"
        style={{ stroke: "rgb(var(--color-petal))" }}
        strokeWidth="2"
        opacity="0.3"
      />
      {[0.6, 1.2, 1.8, 2.4].map((gx) => (
        <polygon key={gx} points={floorPatch(gx, 0.14, 0.08, 0.72)} fill="#000" opacity="0.1" />
      ))}
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
      <ellipse cx="0" cy="2" rx="14" ry="6" fill="url(#lampPool)" className="room-breathe" opacity="0.45" />
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
  const screen = isoBox(0.12, 0.34, 0.86, 0.06, 26);
  return (
    <g>
      {/* tower, set back and to the side */}
      <TintedBox gx={1.05} gy={0.12} dx={0.3} dy={0.5} h={22} fallback="#3a3142" tint={false} dark={0.32} mid={0.18} />
      {/* monitor: foot, neck, then the panel standing on the back edge */}
      <TintedBox gx={0.38} gy={0.36} dx={0.36} dy={0.22} h={2.5} fallback="#3a3142" tint={false} dark={0.3} mid={0.16} />
      <TintedBox gx={0.51} gy={0.42} dx={0.1} dy={0.08} h={9} fallback="#3a3142" tint={false} dark={0.3} mid={0.16} />
      <g transform="translate(0,-9)">
        <polygon points={screen.left} fill="url(#isoScreen)" />
        <polygon className="animate-flicker" points={screen.left} fill="#9db4e8" opacity="0.34" />
        <polygon points={screen.right} fill="#2b2350" />
        <polygon points={screen.top} fill="#3a3142" />
        {/* a window and a cursor line, so it reads as a screen in use */}
        <g transform={`translate(${project(0.12, 0.4).x}, ${project(0.12, 0.4).y}) skewY(${SKEW})`}>
          <rect x="1.6" y="-23" width="7.5" height="6" rx="0.8" fill="#f7e9e2" opacity="0.5" />
          <rect x="1.6" y="-15" width="5" height="1.2" rx="0.6" fill="#f7e9e2" opacity="0.4" />
          <rect x="1.6" y="-12" width="8" height="1.2" rx="0.6" fill="#f7e9e2" opacity="0.28" />
        </g>
      </g>
      {/* keyboard in front of it */}
      <TintedBox gx={0.22} gy={0.66} dx={0.7} dy={0.22} h={2} fallback="#4a4152" tint={false} dark={0.28} mid={0.14} />
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
      <g transform={`translate(0,${-H})`}>
        <TintedBox gx={0} gy={0} dx={W} dy={D} h={4.5} fallback="#a87f5f" dark={0.3} mid={0.16} />
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
      <ellipse cx="0" cy="0" rx="47" ry="23" style={tinted("rgb(var(--color-rose))")} opacity="0.45" />
      <ellipse cx="0" cy="0" rx="39" ry="18" fill="none" style={{ stroke: "rgb(var(--color-petal))" }} strokeWidth="2" opacity="0.3" />
      <ellipse cx="0" cy="0" rx="30" ry="13" fill="none" style={{ stroke: "rgb(var(--color-petal))" }} strokeWidth="1.4" opacity="0.2" />
    </g>
  );
}

function MatRug() {
  return (
    <g>
      <polygon points={floorPatch(0, 0, 1.4, 0.9)} style={tinted("rgb(var(--color-blush))")} opacity="0.5" />
      {[0.16, 0.38, 0.6].map((t) => (
        <polygon key={t} points={floorPatch(0.1, t, 1.2, 0.08)} fill="#000" opacity="0.09" />
      ))}
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
      <ellipse cx="0" cy="-2" rx="20" ry="10" fill="url(#lampPool)" opacity="0.3" />
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
