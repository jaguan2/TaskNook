import { furnitureDimensions, snapFurnitureDimensions } from './furnitureDimensions';

// Names follow the projected floor diamond; saved rotation changes model axes,
// never the screen corner a person grabbed.
export const FURNITURE_RESIZE_CORNERS = {
  back: { x: 0, y: 0, cursor: 'ns-resize' },
  right: { x: 1, y: 0, cursor: 'ew-resize' },
  front: { x: 1, y: 1, cursor: 'ns-resize' },
  left: { x: 0, y: 1, cursor: 'ew-resize' },
};
const half = value => Math.round(value * 2) / 2;
const spans = (dimensions, rot) => rot % 2 ? [dimensions.d, dimensions.w] : [dimensions.w, dimensions.d];

/** Resize on canonical axes and retain the opposite floor corner. Legacy
 * authored spans can be off-grid; their fixed edge snaps once onto the same
 * half grid as saved positions, so reload never shifts a resized piece. */
export function resizeFurnitureAtCorner(placement, w, d, corner = 'front') {
  const edge = FURNITURE_RESIZE_CORNERS[corner], old = furnitureDimensions(placement);
  if (!edge || !old || !Number.isFinite(w) || !Number.isFinite(d)) return null;
  const dimensions = snapFurnitureDimensions(placement.item, w, d);
  const before = spans(old, placement.rot || 0), after = spans(dimensions, placement.rot || 0);
  return { dimensions, origin: {
    gx: edge.x ? placement.gx : half(placement.gx + before[0] - after[0]),
    gy: edge.y ? placement.gy : half(placement.gy + before[1] - after[1]),
  } };
}

export function resizeFurnitureFromCorner(placement, dx, dy, corner = 'front') {
  const edge = FURNITURE_RESIZE_CORNERS[corner], old = furnitureDimensions(placement);
  if (!edge || !old) return null;
  const foot = spans(old, placement.rot || 0);
  const width = foot[0] + (edge.x ? dx : -dx), depth = foot[1] + (edge.y ? dy : -dy);
  return placement.rot % 2 ? resizeFurnitureAtCorner(placement, depth, width, corner)
    : resizeFurnitureAtCorner(placement, width, depth, corner);
}
