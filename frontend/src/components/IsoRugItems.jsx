import { floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";

// Rugs are flat ground materials with no furniture depth contract. Keeping
// their shared field, fringe, and pattern construction together makes new
// textiles consistent without growing the root furniture registry.

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

export function Rug() {
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


export function SquareRug() {
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

export function Runner() {
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

export function OvalRug() {
  const c = project(1.1, 0.85);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-ground-material="braided-rug">
      <ellipse cx="2" cy="2" rx="47" ry="23" fill="#000" opacity="0.13" />
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

export function MatRug() {
  return (
    <g data-ground-material="coir-mat">
      <polygon points={floorPatch(0.03, 0.05, 1.4, 0.9)} fill="#000" opacity="0.12" />
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
export function PersianRug() {
  const c = project(1.5, 1.1);
  const ink = { stroke: "rgb(var(--color-petal))", fill: "none" };
  return (
    <g data-ground-material="woven-rug">
      <polygon points={floorPatch(0.04, 0.06, 3, 2.2)} fill="#000" opacity="0.14" />
      <polygon points={floorPatch(0, 0, 3, 2.2)} style={tinted("#8f4a3c")} opacity="0.5" />
      <polygon data-ground-part="binding" points={floorPatch(0, 0, 3, 2.2)} fill="none"
        stroke="#4d302b" strokeWidth="1.4" opacity="0.5" strokeLinejoin="round" />
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
      {/* fringe on the short ends — the one rug whose referent always has it */}
      <Fringe gx={0} gy={0.26} len={1.68} axis="gy" out={-0.14} n={6} />
      <Fringe gx={3} gy={0.26} len={1.68} axis="gy" out={0.14} n={6} />
    </g>
  );
}

/** Stripes run along +gx, so they read as bands across the floor rather than
 *  as a grid — the alternating widths are what stop it looking like a barcode. */
export function StripedRug() {
  const bands = [0, 0.28, 0.52, 0.84, 1.12, 1.44];
  return (
    <g data-ground-material="woven-rug">
      <polygon points={floorPatch(0.04, 0.06, 2.6, 1.8)} fill="#000" opacity="0.14" />
      <polygon points={floorPatch(0, 0, 2.6, 1.8)} style={tinted("#5b6b9b")} opacity="0.45" />
      <polygon data-ground-part="binding" points={floorPatch(0, 0, 2.6, 1.8)} fill="none"
        stroke="#34314a" strokeWidth="1.3" opacity="0.5" strokeLinejoin="round" />
      {bands.map((t, i) => (
        <polygon
          key={t}
          points={floorPatch(0.12, t + 0.1, 2.36, i % 2 ? 0.1 : 0.17)}
          fill="#f7e9e2"
          opacity={i % 2 ? 0.12 : 0.2}
        />
      ))}
      {/* fringe at both short ends — through the shared helper, so the
          strands land at the correct screen angle instead of hand-fudged
          per-rug pixel offsets (the exact case Fringe's docstring names) */}
      <Fringe gx={0} gy={0.15} len={1.5} axis="gy" out={-0.14} n={6} opacity={0.25} />
      <Fringe gx={2.6} gy={0.15} len={1.5} axis="gy" out={0.14} n={6} opacity={0.25} />
    </g>
  );
}

/** Sheepskin: no straight edges anywhere. A ring of overlapping soft blobs,
 *  which is also what makes it read as pile rather than as a flat shape. */
export function Sheepskin() {
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

