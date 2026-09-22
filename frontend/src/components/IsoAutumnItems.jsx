import { SKEW, TILE_W, floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { TintedBox } from "./IsoItemPrimitives";

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

export function Scarecrow() {
  const c = project(0.55, 0.45);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="13" ry="5" fill="#000" opacity="0.15" />
      <path d="M0 -2 L0 -58" stroke="#765039" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M-20 -42 L20 -42" stroke="#765039" strokeWidth="3" strokeLinecap="round" />
      <path d="M-18 -42 l-5 -4 M-18 -42 l-6 1 M18 -42 l5 -4 M18 -42 l6 1" stroke="#d2ad62" strokeWidth="1.5" />
      <path d="M-13 -44 Q0 -49 13 -44 L10 -24 Q0 -20 -10 -24 Z" style={tinted("#a85a43")} />
      <path d="M0 -24 L0 -42" stroke="#000" strokeWidth="1.2" opacity="0.16" />
      <circle cx="0" cy="-56" r="9" fill="#d8b96f" />
      <circle cx="-3" cy="-57" r="1" fill="#4b3b39" />
      <circle cx="3" cy="-57" r="1" fill="#4b3b39" />
      <path d="M-3 -52 q3 2 6 0" fill="none" stroke="#7b5038" strokeWidth="1" />
      <path d="M-12 -65 q12 -7 24 0 l-3 4 h-18 z" fill="#8a5b39" />
      <path d="M-16 -62 q16 -3 32 0" fill="none" stroke="#6b442f" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

export function Turkey() {
  const c = project(0.45, 0.4);
  const feathers = [-58, -36, -14, 8, 30, 52];
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="13" ry="5" fill="#000" opacity="0.15" />
      <g transform="translate(3,-17)">
        {feathers.map((a, i) => (
          <ellipse key={a} cx="0" cy="-11" rx="5.2" ry="13" fill={i % 2 ? "#b85c35" : "#d58b3f"} transform={`rotate(${a})`} />
        ))}
      </g>
      <ellipse cx="0" cy="-12" rx="11" ry="9" style={tinted("#7f4e37")} />
      <circle cx="-7" cy="-23" r="5.2" fill="#9d5438" />
      <circle cx="-8.5" cy="-24" r="1" fill="#2b2350" />
      <path d="M-12 -22 l-6 2 l5 2 z" fill="#d8a13f" />
      <path d="M-6 -19 q4 4 0 8" fill="none" stroke="#b8433c" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M-5 -4 l-2 5 M3 -4 l2 5" stroke="#9b6b3c" strokeWidth="1.5" />
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

