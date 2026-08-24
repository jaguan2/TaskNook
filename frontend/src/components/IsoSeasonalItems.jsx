import { SKEW, TILE_W, floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { TintedBox } from "./IsoItemPrimitives";

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

export function MapleTree() {
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

export function LeafPile() {
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

export function HayBale() {
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

export function Pumpkin() {
  return <PumpkinBody />;
}

export function JackOLantern() {
  return <PumpkinBody carved />;
}

export function Rake() {
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

export function Wreath() {
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

// ---- winter ------------------------------------------------------------- //
// Same five rules as the autumn set above. The season's whole read is one
// colour — a near-white that has to stay legible against a light floor, so every
// snow mass carries a cool shadow tone underneath rather than relying on the
// background to define its edge.

const SNOW = "#eef4f8";
const SNOW_SHADE = "#b9cbd8";

export function SnowPine() {
  // A conifer is a stack of skirts, widest at the base. Snow sits on the TOP of
  // each skirt with the green showing beneath it — that alternation is what says
  // "laden" rather than "painted white".
  const c = project(0.65, 0.65);
  const skirt = (y, w, h) =>
    `M${c.x} ${c.y - y - h} L${c.x + w} ${c.y - y} L${c.x} ${c.y - y + h * 0.34} L${c.x - w} ${c.y - y} Z`;
  return (
    <g>
      <path
        d={`M${c.x - 4} ${c.y} L${c.x - 2.6} ${c.y - 26} L${c.x + 2.6} ${c.y - 26} L${c.x + 4} ${c.y} Z`}
        fill="#6b4a39"
      />
      <g className="room-sway">
        {[
          [22, 26, 22],
          [44, 20, 19],
          [64, 14, 15],
        ].map(([y, w, h]) => (
          <g key={y}>
            <path d={skirt(y, w, h)} style={tinted("#3f6b52")} />
            <path d={skirt(y, w, h)} fill="#000" opacity="0.16" />
            {/* the snow load: the upper edge of the same skirt, so it sits ON it */}
            <path
              d={`M${c.x} ${c.y - y - h} L${c.x + w} ${c.y - y} L${c.x + w * 0.45} ${c.y - y - h * 0.16} L${c.x} ${c.y - y - h * 0.1} L${c.x - w * 0.45} ${c.y - y - h * 0.16} L${c.x - w} ${c.y - y} Z`}
              fill={SNOW}
            />
            <path
              d={`M${c.x} ${c.y - y - h} L${c.x + w} ${c.y - y} L${c.x + w * 0.45} ${c.y - y - h * 0.16} Z`}
              fill={SNOW_SHADE}
              opacity="0.5"
            />
          </g>
        ))}
        <path d={skirt(80, 8, 11)} fill={SNOW} />
      </g>
    </g>
  );
}

export function Snowman() {
  // Three balls, decreasing — the silhouette alone names it, which is rule 1.
  // Everything else (nose, coal, scarf) is one large shape each, per rule 4.
  const c = project(0.4, 0.4);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="15" ry="6" fill="#000" opacity="0.16" />
      {[
        [-11, 14, 10],
        [-27, 11, 8],
        [-41, 8.4, 6.4],
      ].map(([cy, rx, ry]) => (
        <g key={cy}>
          <ellipse cx="0" cy={cy} rx={rx} ry={ry} fill={SNOW} />
          {/* cool tone on the away side, light catch on the near top */}
          <path d={`M0 ${cy - ry} a${rx} ${ry} 0 0 1 0 ${ry * 2} z`} fill={SNOW_SHADE} opacity="0.45" />
          <ellipse cx={-rx * 0.3} cy={cy - ry * 0.45} rx={rx * 0.45} ry={ry * 0.3} fill="#fff" opacity="0.7" />
        </g>
      ))}
      {/* scarf: one band and a tail, the only saturated colour on the piece */}
      <path d="M-9 -34 q9 4 18 0 l0 4 q-9 4 -18 0 z" style={tinted("#a8442f")} />
      <path d="M7 -31 q5 3 3 9 l-4 -1 q2 -5 -2 -7 z" style={tinted("#a8442f")} />
      <path d="M7 -31 q5 3 3 9 l-4 -1 q2 -5 -2 -7 z" fill="#000" opacity="0.18" />
      {/* the carrot points camera-left, so it reads in silhouette */}
      <path d="M-7.5 -41 l-6 1.6 l6 1.6 z" fill="#d98b3a" />
      <circle cx="-4.4" cy="-43.4" r="1" fill="#2b2350" />
      <circle cx="0.6" cy="-43.8" r="1" fill="#2b2350" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={-2 + i * 2.6} cy={-26 + i * 4.4} r="0.9" fill="#2b2350" opacity="0.8" />
      ))}
      {/* twig arms — a pole and two forks, same logic as the rake */}
      <path
        d="M13 -28 l9 -5 M20 -30 l4 -4 M20.5 -32.4 l4.6 0.6"
        fill="none"
        stroke="#6b4a39"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M-13 -28 l-8 -3" fill="none" stroke="#6b4a39" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

export function SnowDrift() {
  // Winter's answer to the leaf pile, and it follows the same lesson: low and
  // WIDE with a ragged edge. A tall white mound reads as a boulder.
  const c = project(0.6, 0.45);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="24" ry="9" fill="#000" opacity="0.1" />
      <path d="M-24 -1 q6 -8 14 -7 q6 -5 13 -1 q9 1 21 8 z" fill={SNOW} />
      <path d="M6 -8 q9 1 21 8 l-11 0 q-3 -6 -10 -8 z" fill={SNOW_SHADE} opacity="0.55" />
      <path d="M-17 -3 q6 -5 12 -4.6 q-5 2.6 -12 4.6 z" fill="#fff" opacity="0.75" />
      {/* a few flecks, so the mass isn't one flat field */}
      {[
        [-8, -6],
        [3, -8.6],
        [12, -4],
      ].map(([x, y]) => (
        <ellipse key={x} cx={x} cy={y} rx="2.4" ry="1" fill="#fff" opacity="0.6" />
      ))}
    </g>
  );
}

export function LogStack() {
  // Cut ends toward the camera: the rings are the whole read and they only work
  // if the round faces point at you. Doubles as a seat, like the hay bale.
  const c = project(0.45, 0.3);
  const ring = (x, y, r) => (
    <g key={`${x}-${y}`}>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.86} style={tinted("#a8794f")} />
      <ellipse cx={x} cy={y} rx={r * 0.72} ry={r * 0.6} fill="#e0c39a" />
      <ellipse cx={x} cy={y} rx={r * 0.36} ry={r * 0.3} fill="#c39a6b" />
    </g>
  );
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="17" ry="7" fill="#000" opacity="0.18" />
      {/* the bark side of the stack, behind the cut faces */}
      <path d="M-14 -6 l0 -12 q14 -5 28 0 l0 12 q-14 5 -28 0 z" style={tinted("#7d5636")} />
      <path d="M-14 -6 l0 -12 q14 -5 28 0 l0 12 q-14 5 -28 0 z" fill="#000" opacity="0.22" />
      {[
        [-7, -9, 5.2],
        [4, -8, 5.6],
        [-1, -19, 5.4],
        [10, -17, 4.6],
      ].map(([x, y, r]) => ring(x, y, r))}
    </g>
  );
}

export function IceLantern() {
  // A candle in a hollow of packed snow. The pool of light on the floor is the
  // scene's job (catalog `glow`) — this draws only the flame and the ice.
  const c = project(0.22, 0.22);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="8" ry="3.4" fill="#000" opacity="0.16" />
      <path d="M-7.5 -2 l0 -11 q7.5 -4 15 0 l0 11 q-7.5 4 -15 0 z" fill={SNOW} opacity="0.92" />
      <path d="M0 -2 l0 -15 q7.5 0 7.5 4 l0 11 q-3.8 2 -7.5 2 z" fill={SNOW_SHADE} opacity="0.5" />
      {/* the mouth of the hollow, with the flame inside it */}
      <ellipse cx="0" cy="-13.6" rx="4.4" ry="2.2" fill="#2b2350" opacity="0.55" />
      <path className="flame-dance" d="M0 -13 q-3.4 -4.4 0 -9.4 q3.4 5 0 9.4 z" fill="#ffd76a" />
      <path
        className="flame-dance"
        style={{ animationDelay: "calc(var(--phase, 0s) + 0.4s)" }}
        d="M0 -13.4 q-2 -3 0 -6.4 q2 3.4 0 6.4 z"
        fill="#fff3c4"
      />
      <ellipse cx="0" cy="-15" rx="6.4" ry="4.4" fill="#ffd76a" opacity="0.22" />
    </g>
  );
}

export function Icicles() {
  // Wall decor, drawn in the same skewed space as a picture frame — and in the
  // same coordinate convention, which is the part that first went wrong: wall
  // sprites run UP the wall in negative y from the floor origin, and rightward in
  // positive x. Drawn from y=0 downward these hung at the skirting board, in a
  // puddle at the foot of the wall.
  //
  // Lengths VARY across the run: a row of equal spikes reads as a saw blade.
  const RAIL = -100;
  return (
    <g transform={`skewY(${SKEW})`}>
      {/* the ledge of packed snow they hang from, tying the run together */}
      <path d={`M0 ${RAIL} q22 -3 44 0 l0 3.4 q-22 2.6 -44 0 z`} fill={SNOW} />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const x = 3.5 + i * 7.4;
        const len = 7 + ((i * 5) % 4) * 3.4;
        const top = RAIL + 2.4;
        return (
          <g key={i}>
            <path d={`M${x - 2.6} ${top} L${x + 2.6} ${top} L${x} ${top + len} Z`} fill={SNOW} opacity="0.92" />
            <path d={`M${x} ${top} L${x + 2.6} ${top} L${x} ${top + len} Z`} fill={SNOW_SHADE} opacity="0.55" />
          </g>
        );
      })}
    </g>
  );
}

// ---- spring ------------------------------------------------------------- //
// The counterweight to winter: pastels, and everything is either growing or
// about to. Containers stay warm neutrals so the blossom keeps being the hero.

export function BlossomTree() {
  // Same construction as the maple, in blossom: deep rose through to near-white
  // at the crown, with a few petals below the mass so it reads as dropping
  // rather than as a solid pink cloud.
  const c = project(0.75, 0.75);
  return (
    <g>
      <path
        d={`M${c.x - 5} ${c.y} L${c.x - 3} ${c.y - 42} L${c.x + 3} ${c.y - 42} L${c.x + 5} ${c.y} Z`}
        fill="#7a5a4a"
      />
      <g className="room-sway">
        <ellipse cx={c.x} cy={c.y - 54} rx="32" ry="20" style={tinted("#d98aa8")} />
        <ellipse cx={c.x} cy={c.y - 54} rx="32" ry="20" fill="#000" opacity="0.12" />
        <ellipse cx={c.x - 7} cy={c.y - 70} rx="25" ry="16" style={tinted("#eaa7c0")} />
        <ellipse cx={c.x + 8} cy={c.y - 83} rx="16" ry="11" style={tinted("#f7cddd")} />
        <ellipse cx={c.x + 10} cy={c.y - 85} rx="8" ry="5" fill="#fff" opacity="0.55" />
      </g>
      {/* petals on the way down, OUTSIDE the swaying canopy so they read loose */}
      {[
        [-18, -30],
        [12, -24],
        [-4, -16],
      ].map(([dx, dy]) => (
        <ellipse key={dx} cx={c.x + dx} cy={c.y + dy} rx="2.2" ry="1.2" fill="#f7cddd" opacity="0.75" />
      ))}
    </g>
  );
}

export function Tulips() {
  // Cup-shaped heads on straight stems in a terracotta pot. The cup IS the read:
  // three notches at the top, oversized per rule 5.
  const c = project(0.3, 0.3);
  const stem = (x, h, fill) => (
    <g key={x}>
      <path
        d={`M${x} -6 q${x * 0.14} ${-h * 0.55} 0 ${-h}`}
        fill="none"
        stroke="#4f7d52"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d={`M${x - 3.2} ${-6 - h} q0 -4.6 3.2 -5.4 q3.2 0.8 3.2 5.4 q-1.6 1.8 -3.2 0.4 q-1.6 1.4 -3.2 -0.4 z`}
        fill={fill}
      />
      <path d={`M${x} ${-11.4 - h} q3.2 0.8 3.2 5.4 q-1.6 1.8 -3.2 0.4 z`} fill="#000" opacity="0.16" />
    </g>
  );
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="9" ry="4" fill="#000" opacity="0.18" />
      {stem(-4.4, 11, "#e0607f")}
      {stem(4.2, 14, "#f0a2b8")}
      {stem(0, 18, "#e8546f")}
      {/* two leaves, wide and low, so the pot isn't a bare cylinder */}
      <path d="M-2 -7 q-8 -3 -10 -10 q8 2 10 10 z" fill="#4f7d52" />
      <path d="M2 -7 q8 -2 10 -8 q-8 1 -10 8 z" fill="#5d8f5f" />
      <path d="M-7.4 -2 l1.4 -7 l12 0 l1.4 7 q-7.4 3 -14.8 0 z" style={tinted("#b5673f")} />
      <path d="M0 -2 l0 -9 l6 0 l1.4 7 q-3.7 1.6 -7.4 2 z" fill="#000" opacity="0.2" />
      <path d="M-8 -9.4 q8 -3 16 0 l0 2 q-8 3 -16 0 z" style={tinted("#c67a4e")} />
    </g>
  );
}

export function WateringCan() {
  // Body, spout, handle — the spout carries the silhouette, so it is long and
  // rises ABOVE the rim rather than poking out the side.
  const c = project(0.25, 0.22);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="8" ry="3.4" fill="#000" opacity="0.18" />
      <path d="M-6 -2 l-0.6 -11 q6.6 -2.6 13.2 0 l-0.6 11 q-6 2.6 -12 0 z" style={tinted("#7f9bb0")} />
      <path d="M0 -2 l0 -13.4 q4 0.4 6.6 2.4 l-0.6 11 q-3 1.4 -6 0.6 z" fill="#000" opacity="0.22" />
      <ellipse cx="0" cy="-13" rx="6.6" ry="2.6" style={tinted("#93b0c4")} />
      <ellipse cx="0" cy="-13" rx="4.6" ry="1.6" fill="#2b2350" opacity="0.3" />
      {/* spout, from the low side up past the rim */}
      <path
        d="M-6 -8 q-7 -1 -8.4 -10"
        fill="none"
        style={{ stroke: "var(--tint, #7f9bb0)" }}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <ellipse cx="-14.4" cy="-18.4" rx="2.6" ry="1.4" style={tinted("#93b0c4")} />
      <path
        d="M-2.6 -14 q4 -7 9.6 -2.6"
        fill="none"
        style={{ stroke: "var(--tint, #7f9bb0)" }}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </g>
  );
}

export function BirdBath() {
  // A pedestal and a dish. The water is the only bright thing and it shimmers
  // like the pond does — `room-breathe` pulses opacity, which is right for water
  // and wrong for anything alive.
  const c = project(0.4, 0.4);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="11" ry="4.6" fill="#000" opacity="0.2" />
      <ellipse cx="0" cy="-2" rx="9" ry="3.8" style={tinted("#9d9aa8")} />
      <path d="M-3.6 -4 l1 -14 l5.2 0 l1 14 q-3.6 1.6 -7.2 0 z" style={tinted("#b0adba")} />
      <path d="M0 -4 l0 -18 l2.6 0 l1 14 q-1.8 1.2 -3.6 0.8 z" fill="#000" opacity="0.2" />
      <path d="M-11 -18 q11 -4 22 0 l-2.6 5 q-8.4 3 -16.8 0 z" style={tinted("#b0adba")} />
      <ellipse cx="0" cy="-18" rx="11" ry="4.4" style={tinted("#c2bfca")} />
      <ellipse className="room-breathe" cx="0" cy="-18" rx="8.4" ry="3.2" fill="#7fc4d8" opacity="0.75" />
      <ellipse className="pond-ripple" cx="1.4" cy="-18.4" rx="3.4" ry="1.3" fill="#fff" opacity="0.4" />
    </g>
  );
}

export function SeedTray() {
  // Goes ON a table (`stacks`), so it is small and its read is the ROW: six
  // identical shoots in a shallow box. One shoot would be a weed.
  const c = project(0.35, 0.25);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.6" rx="10" ry="3.6" fill="#000" opacity="0.16" />
      <path d="M-9 -1.4 l0 -5 q9 -3 18 0 l0 5 q-9 3 -18 0 z" style={tinted("#8a6a4e")} />
      <path d="M0 -1.4 l0 -8 q5 0.6 9 2.6 l0 5 q-4.4 2 -9 2.4 z" fill="#000" opacity="0.22" />
      <ellipse cx="0" cy="-6.4" rx="9" ry="3" fill="#4a3628" />
      {[-6, -3.6, -1.2, 1.2, 3.6, 6].map((x, i) => (
        <path
          key={x}
          d={`M${x} -7 q${i % 2 ? 1.6 : -1.6} -3 0 -5.6`}
          fill="none"
          stroke="#5d8f5f"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ))}
      {[-6, -1.2, 3.6].map((x) => (
        <ellipse key={x} cx={x} cy={-12.4} rx="1.6" ry="0.9" fill="#79ab6b" />
      ))}
    </g>
  );
}

export function Bunting() {
  // Wall decor: up the wall in negative y, rightward in positive x (see Icicles —
  // both were first drawn downward from zero and ended up lying on the floor).
  //
  // The SAG is what makes it read as string rather than as a painted zigzag, so
  // the pennants hang from a curve instead of a straight run.
  const COLOURS = ["#f0a2b8", "#ffe9b0", "#a8d5c2", "#e8c7f0"];
  const RAIL = -98;
  const SPAN = 64;
  const SAG = 11;
  return (
    <g transform={`skewY(${SKEW})`}>
      <path
        d={`M0 ${RAIL} q${SPAN / 2} ${SAG * 1.6} ${SPAN} 0`}
        fill="none"
        stroke="#f7e9e2"
        strokeWidth="1"
        opacity="0.55"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const t = (i + 0.5) / 8;
        const x = t * SPAN;
        const y = RAIL + SAG * Math.sin(Math.PI * t); // level at the ends, lowest mid-run
        return (
          <g key={i}>
            <path d={`M${x - 3.2} ${y} L${x + 3.2} ${y} L${x} ${y + 8.5} Z`} fill={COLOURS[i % 4]} />
            <path d={`M${x} ${y} L${x + 3.2} ${y} L${x} ${y + 8.5} Z`} fill="#000" opacity="0.14" />
          </g>
        );
      })}
    </g>
  );
}

