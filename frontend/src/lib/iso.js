// Isometric (2:1 dimetric) projection math — the seed of the future
// Sims-style room. Pure functions only; the artwork lives in components.
//
// Grid convention: (gx, gy) are floor-tile coordinates. +gx runs toward the
// viewer's lower-RIGHT, +gy toward the lower-LEFT, so the room's back corner
// is (0,0) and the front corner is (W,H) — the classic cutaway view with two
// visible wall planes meeting at the top.
//
//   screenX = (gx - gy) · TILE_W/2
//   screenY = (gx + gy) · TILE_H/2
//
// The matrix is invertible, which is what will make dragging possible later:
// pointer → scene px (via getScreenCTM, as today) → unproject → grid tile.

export const TILE_W = 48; // a floor diamond is twice as wide…
export const TILE_H = 24; // …as it is tall (2:1 isometric)
export const WALL_H = 118; // wall height in screen px
// The wall plane's skew in degrees — atan(TILE_H / TILE_W), the projection's
// own angle. Every wall sprite skews by it, and the lying pose lies along it.
export const SKEW = (Math.atan(TILE_H / TILE_W) * 180) / Math.PI;

/** Grid → scene coordinates (the top corner of tile (gx,gy)'s diamond). */
export function project(gx, gy) {
  return {
    x: ((gx - gy) * TILE_W) / 2,
    y: ((gx + gy) * TILE_H) / 2,
  };
}

/** Scene → grid coordinates (fractional; callers round/clamp as needed). */
export function unproject(x, y) {
  return {
    gx: y / TILE_H + x / TILE_W,
    gy: y / TILE_H - x / TILE_W,
  };
}

// (No depthOf() here on purpose. Painter's depth is a property of a whole
// PLACEMENT, not a point — sortIso in lib/isoRoom.js sorts on the footprint's
// front corner, gx+dx + gy+dy. A point-based helper only ever tempted callers
// into the wrong rule.)

const pts = (list) => list.map((p) => `${p.x},${p.y}`).join(" ");

/** The floor diamond for a w×d tile room, as SVG polygon points. */
export function floorPoints(w, d) {
  return pts([project(0, 0), project(w, 0), project(w, d), project(0, d)]);
}

/**
 * An axis-aligned box on the floor: footprint from (gx,gy) spanning dx×dy
 * tiles, extruded `h` screen-px tall. Returns the three visible faces as
 * SVG polygon point strings — `top`, `left` (front-left, toward +gy) and
 * `right` (front-right, toward +gx) — ready to fill with three shades.
 * This is the primitive most iso furniture is assembled from.
 */
export function isoBox(gx, gy, dx, dy, h) {
  const A = project(gx, gy); // back corner
  const B = project(gx + dx, gy); // right corner
  const C = project(gx + dx, gy + dy); // front corner (lowest on screen)
  const D = project(gx, gy + dy); // left corner
  const up = (p) => ({ x: p.x, y: p.y - h });
  return {
    top: pts([up(A), up(B), up(C), up(D)]),
    right: pts([up(B), up(C), C, B]),
    left: pts([up(D), up(C), C, D]),
    corners: { A, B, C, D },
  };
}

/** A flat diamond patch on the floor (rugs, light pools). */
export function floorPatch(gx, gy, dx, dy) {
  return pts([project(gx, gy), project(gx + dx, gy), project(gx + dx, gy + dy), project(gx, gy + dy)]);
}

/**
 * A rectangle ON a wall plane (windows, frames, clocks). `wall` is "left"
 * (the plane along gy, at gx=0) or "right" (along gx, at gy=0). `t` is the
 * distance along the wall in tiles, `len` its length in tiles; `bottom` and
 * `height` are screen-px above the floor line.
 */
export function wallRect(wall, t, len, bottom, height) {
  const a = wall === "left" ? project(0, t) : project(t, 0);
  const b = wall === "left" ? project(0, t + len) : project(t + len, 0);
  return pts([
    { x: a.x, y: a.y - bottom - height },
    { x: b.x, y: b.y - bottom - height },
    { x: b.x, y: b.y - bottom },
    { x: a.x, y: a.y - bottom },
  ]);
}
