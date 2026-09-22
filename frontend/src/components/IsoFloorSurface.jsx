import { memo } from "react";
import { floorPatch, project } from "../lib/iso";
import { tileOn } from "../lib/isoRoom";

/**
 * The painted floor as horizontal RUNS: `[gx, gy, length]` per unbroken stretch.
 *
 * Only the clip path wants this. It needs the same AREA, not the individual
 * tiles, and emitting one polygon per tile made it 2,304 nodes on a 48×48 lot —
 * for a shape that is usually a plain rectangle — with FOUR groups referencing
 * it, so the browser resolved that region four times over. Merging by row is the
 * same trick `lipRuns` uses, and it takes a rectangle to one polygon per row.
 */
export function floorClipRuns(size) {
  const runs = [];
  for (let ty = 0; ty < size.d; ty++) {
    let start = -1;
    // One past the end so a run reaching the far edge is still closed.
    for (let tx = 0; tx <= size.w; tx++) {
      const on = tx < size.w && tileOn(size, tx, ty);
      if (on && start < 0) start = tx;
      if (!on && start >= 0) {
        runs.push([start, ty, tx - start]);
        start = -1;
      }
    }
  }
  return runs;
}

/**
 * The floor's MATERIAL, drawn over its colour gradient and clipped to the
 * painted tiles.
 *
 * A flat gradient reads as a coloured plane, not a floor — it's the largest
 * surface on screen and it was the thing most obviously missing next to the
 * references. Grain is cheap: every line here is one `<line>` in grid space,
 * and `project()` puts it on the right plane for free.
 *
 * Everything is derived from the tile index, never Math.random — the scene
 * re-renders and a reshuffling floor would crawl.
 *
 * memo'd because `stone` is a w·d nested loop (2,304 polygons on a big terrace)
 * and `boards`/`tiles` are hundreds of lines. All three props are scalars, so the
 * comparison is exact and free.
 */
function FloorSurfaceInner({ w, d, style }) {
  const segmentD = (x1, y1, x2, y2) => {
    const a = project(x1, y1);
    const b = project(x2, y2);
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  };
  const line = (key, x1, y1, x2, y2, stroke, width, opacity) => {
    const a = project(x1, y1);
    const b = project(x2, y2);
    return (
      <line
        key={key}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={stroke}
        strokeWidth={width}
        opacity={opacity}
      />
    );
  };

  if (style === "grass") {
    // Mown stripes: the only thing a lawn needs to stop reading as felt.
    const out = [];
    for (let t = 0; t < d; t += 2) {
      out.push(
        <polygon
          key={`mow-${t}`}
          points={floorPatch(0, t, w, 1)}
          fill="#ffffff"
          opacity="0.045"
        />
      );
    }
    return <g>{out}</g>;
  }

  if (style === "stone") {
    // Flagstones: one inset slab per tile, its size nudged by the tile index
    // so the joints wander instead of forming a grid.
    const out = [];
    for (let ty = 0; ty < d; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const j = ((tx * 7 + ty * 13) % 5) / 100; // 0 … 0.04
        out.push(
          <polygon
            key={`slab-${tx}-${ty}`}
            points={floorPatch(tx + 0.06 + j, ty + 0.06 - j, 0.88 - j, 0.88 + j)}
            fill="#ffffff"
            opacity={0.05 + (((tx * 3 + ty * 5) % 4) / 100)}
          />
        );
      }
    }
    return <g>{out}</g>;
  }

  if (style === "tiles") {
    const out = [];
    for (let t = 0.5; t < d; t += 0.5) {
      out.push(line(`h${t}`, 0, t, w, t, "rgb(var(--color-night))", 0.8, t % 1 === 0 ? 0.15 : 0.07));
    }
    for (let t = 0.5; t < w; t += 0.5) {
      out.push(line(`v${t}`, t, 0, t, d, "rgb(var(--color-night))", 0.8, t % 1 === 0 ? 0.15 : 0.07));
    }
    return <g>{out}</g>;
  }

  // boards: planks running along +gx, half a tile wide, with staggered end
  // joints in a brick bond — a plain set of parallel lines reads as corduroy.
  const tones = [];
  const seams = [];
  const joints = [];
  let row = 0;
  for (let t = 0.5; t < d; t += 0.5, row++) {
    // Alternating half-planks add quiet colour variation. These are broad
    // strips rather than per-tile texture, so large rooms add rows instead of
    // thousands of SVG nodes.
    if (row % 2 === 0) {
      tones.push(
        <polygon
          key={`tone${t}`}
          points={floorPatch(0, t - 0.5, w, 0.5)}
          fill="rgb(var(--color-petal))"
          opacity="0.035"
        />
      );
    }
    seams.push(segmentD(0, t, w, t));
  }
  row = 0;
  for (let t = 0; t < d; t += 0.5, row++) {
    const stagger = (row % 2) * 1.25;
    for (let gx = stagger; gx < w; gx += 2.5) {
      if (gx <= 0) continue;
      joints.push(segmentD(gx, t, gx, Math.min(d, t + 0.5)));
    }
  }
  return (
    <g data-floor-surface="boards">
      {tones}
      <path
        data-floor-grain="seams"
        d={seams.join(" ")}
        fill="none"
        stroke="rgb(var(--color-night))"
        strokeWidth="0.9"
        opacity="0.14"
      />
      <path
        data-floor-grain="joints"
        d={joints.join(" ")}
        fill="none"
        stroke="rgb(var(--color-night))"
        strokeWidth="0.7"
        opacity="0.1"
      />
    </g>
  );
}

const FloorSurface = memo(FloorSurfaceInner);

export default FloorSurface;


