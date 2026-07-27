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

function Cat({ awake = false }) {
  const c = project(0.6, 0.4);
  // Ground shadows come from the scene now (one soft ellipse per item), so
  // the poses draw only the cat.
  if (awake) {
    // On the prowl: body up on legs, head high, tail curled skyward. The
    // legs step in counter-phase and the body trots — walking, not sliding.
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
        <rect className="leg-step-a" x="-14" y="-14" width="5" height="15" rx="2.4" style={tinted("#3a3142")} />
        <rect className="leg-step-b" x="8" y="-14" width="5" height="15" rx="2.4" style={tinted("#3a3142")} />
        <g className="resident-type">
          <ellipse cx="-1" cy="-18" rx="18" ry="9.5" style={tinted("#3a3142")} />
          <ellipse cx="-4" cy="-21" rx="10" ry="4" fill="#fff" opacity="0.08" />
          <circle cx="-15" cy="-27" r="7.5" style={tinted("#3a3142")} />
          {/* both ear bases sit ON the head circle (the inner ear used to
              float off the far side of the skull) */}
          <polygon points="-21,-31 -19,-39 -14,-32" style={tinted("#3a3142")} />
          <polygon points="-12.4,-34 -6.1,-36.5 -8.2,-30.2" style={tinted("#3a3142")} />
          <circle cx="-17" cy="-27" r="0.9" fill="#ffe9b0" />
          <circle cx="-12" cy="-28" r="0.9" fill="#ffe9b0" />
        </g>
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
  // Curled up asleep: the body breathes slowly from the belly, and once in a
  // long while the tail flicks (rarity is charm).
  return (
    <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
      <g className="cat-breathe">
        <ellipse cx="0" cy="-6" rx="24" ry="12" style={tinted("#3a3142")} />
        <ellipse cx="-3" cy="-10" rx="13" ry="5" fill="#fff" opacity="0.07" />
        <circle cx="-16" cy="-13" r="8" style={tinted("#3a3142")} />
        <polygon points="-22,-18 -19,-26 -15,-19" style={tinted("#3a3142")} />
        <polygon points="-13.3,-20.5 -6.8,-23 -8.8,-16.4" style={tinted("#3a3142")} />
        {/* closed eye — a tiny sleeping arc */}
        <path d="M-19 -13 q2 1.6 4 0" fill="none" stroke="#0d0a12" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      </g>
      <path
        className="tail-flick"
        d="M22 -8 q11 -2 9 -12"
        fill="none"
        style={{ stroke: "var(--tint, #3a3142)" }}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
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
      <polygon points={lid.left} fill="#9db4e8" opacity="0.35" />
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
          <rect x="2" y={-SET + 3} width="20" height={SET - 8} rx="1.5" fill="#9db4e8" opacity="0.3" />
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
function Resident({ seated = false, working = false, moving = false }) {
  const c = project(0.4, 0.4);
  const torsoY = seated ? -28 : -34;
  const headY = seated ? -35 : -41;
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {seated ? (
        <>
          <rect x="-8" y="-10" width="6.5" height="13" rx="3" fill="#4a3a5b" />
          <rect x="2" y="-9" width="6.5" height="13" rx="3" fill="#4a3a5b" />
        </>
      ) : (
        <>
          <rect className={moving ? "leg-step-a" : undefined} x="-6.8" y="-15" width="5.6" height="16" rx="2.6" fill="#4a3a5b" />
          <rect className={moving ? "leg-step-b" : undefined} x="1.2" y="-15" width="5.6" height="16" rx="2.6" fill="#4a3a5b" />
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

function WallClock() {
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
      {/* ten past ten — the friendliest time a clock can show */}
      <line x1="10" y1="-86" x2="6.2" y2="-90" stroke="#3a3142" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="10" y1="-86" x2="14.4" y2="-90.8" stroke="#3a3142" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="10" cy="-86" r="1.1" fill="#3a3142" />
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
        <g key={x}>
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

export const ISO_SPRITES = {
  resident: Resident,
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
