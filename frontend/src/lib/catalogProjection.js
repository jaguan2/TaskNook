import { project, TILE_W } from './iso';

// Authoring uses tile units; seat/surface contracts use logical SVG pixels.
export const MODEL_PIXELS_PER_UNIT = TILE_W / Math.SQRT2;
// The camera projects vertical lengths by sqrt(3)/2. Undo that shortening so
// model cushions and tabletops land on the existing pixel-height anchors.
export const MODEL_VERTICAL_SCALE = 2 / Math.sqrt(3);

// Saved rotations use a grid transpose for odd turns and a real rear for 2/3.
// Keep that convention instead of changing the meaning of existing room JSON.
export function orientModelPoint({ x, y, z }, rotation = 0) {
  const sign = rotation >= 2 ? -1 : 1;
  return rotation % 2 ? { x: z * sign, y, z: x * sign } : { x: x * sign, y, z: z * sign };
}

// Row-major Matrix4 elements consumed by the real renderer. Keep reflection
// for the saved odd turns: replacing it with yaw would mirror asymmetric saves.
export function modelOrientationMatrix(rotation = 0) {
  const sign = rotation >= 2 ? -1 : 1;
  return rotation % 2
    ? [0, 0, sign, 0, 0, 1, 0, 0, sign, 0, 0, 0, 0, 0, 0, 1]
    : [sign, 0, 0, 0, 0, 1, 0, 0, 0, 0, sign, 0, 0, 0, 0, 1];
}

export function projectModelPoint(point, rotation = 0) {
  const { x, y, z } = orientModelPoint(point, rotation);
  const at = project(x, z);
  return { x: at.x, y: at.y - y * MODEL_PIXELS_PER_UNIT };
}

export function modelOrigin(spec, rotation = 0) {
  const at = project((rotation % 2 ? spec.depth : spec.width) / 2,
    (rotation % 2 ? spec.width : spec.depth) / 2);
  return { x: at.x, y: at.y - (spec.wall ? Math.max(0, spec.controlHeight - spec.height * MODEL_PIXELS_PER_UNIT) : 0) };
}
