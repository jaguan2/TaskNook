import { project } from './iso';

// Outward extrusion in floor-grid units. Interior planes, wall mounts and
// furniture footprints remain on their existing coordinates.
export const WALL_THICKNESS = 0.42;

const ends = run => run.plane === 'gy'
  ? [{ gx: run.from, gy: run.at }, { gx: run.to, gy: run.at }]
  : [{ gx: run.at, gy: run.from }, { gx: run.at, gy: run.to }];
const normal = run => run.plane === 'gy'
  ? { gx: 0, gy: -WALL_THICKNESS } : { gx: -WALL_THICKNESS, gy: 0 };
const same = (a, b) => a.gx === b.gx && a.gy === b.gy;
const raised = (point, height) => ({ x: point.x, y: point.y - height });
export const wallPoints = points => points.map(p => `${p.x},${p.y}`).join(' ');

/** Visible section of a solid wall. Perpendicular neighbours share the same
 * outer corner (a miter), so their caps meet without a gap or doubled post.
 * Neighbours may supply their actual height for a full/low cutaway junction. */
export function wallSection(run, height, runs = []) {
  const n = normal(run);
  const corners = ends(run).map(point => {
    const neighbour = runs.find(other => other.plane !== run.plane && ends(other).some(end => same(end, point)));
    const otherNormal = neighbour ? normal(neighbour) : { gx: 0, gy: 0 };
    const inner = project(point.gx, point.gy);
    const outer = project(point.gx + n.gx + otherNormal.gx, point.gy + n.gy + otherNormal.gy);
    const base = neighbour ? Math.min(height, neighbour.height ?? height) : 0;
    return { inner, outer, top: raised(inner, height), outerTop: raised(outer, height),
      end: base < height ? [raised(inner, base), raised(outer, base), raised(outer, height), raised(inner, height)] : null };
  });
  const [a, b] = corners;
  return { corners, cap: [a.top, b.top, b.outerTop, a.outerTop],
    // Start sections face away from the camera; only the near end is visible.
    end: b.end, innerEdge: [a.top, b.top] };
}
