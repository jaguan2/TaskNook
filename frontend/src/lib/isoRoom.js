// The isometric room's decoration model: a resizable W×D tile floor and
// items placed ON the grid as { id, item, gx, gy, tint? } (tile coordinates,
// half-tile snapping). Pure data + functions; projection math lives in
// lib/iso.js and the artwork in components/IsoItems.jsx.

export const ISO_SIZE_MIN = 3;
export const ISO_SIZE_MAX = 48;
export const DEFAULT_ISO_SIZE = { w: 9, d: 7 };
export const ISO_MAX_ITEMS = 60;
// Irregular floors, the full Sims way: a TILE MASK. `mask` is d row-strings
// of w chars ("1" = floor, "0" = void) painted in the panel's floor-plan
// grid; walls and the front lip are computed per tile edge, so ANY drawn
// shape gets correct geometry. A missing mask means a full rectangle (and
// an all-"1" mask normalises back to missing). Legacy corner-cut saves are
// converted to masks on validation.
export const ISO_CUT_MAX = 6;
export const CUT_CORNERS = ["back", "right", "left", "front"];
// Environments: what the scene AROUND the tiles is. "room" = the cutaway
// interior (walls, window, string lights); "garden" = outdoors (grass floor,
// open sky, no walls — so no wall items). VC2-style variety without new
// engines: same grid, different dressing.
export const ISO_ENVS = {
  room: { label: "Room", icon: "🏠", walls: true },
  garden: { label: "Garden", icon: "🌿", walls: false },
};
export const ISO_ENV_KEYS = Object.keys(ISO_ENVS);

const TINT_RE = /^#[0-9a-f]{6}$/i;

// foot: [tiles along +gx, tiles along +gy] — used for clamping AND depth.
// hitH: rough sprite height in px, for the edit-mode grab target.
// rot 0|1 on a placement mirrors the sprite (screen-mirror = grid-transpose,
// so the footprint swaps to [foot[1], foot[0]] and the item faces the other
// wall). wall: true items hang ON a wall instead of standing on the floor —
// rot picks the wall (0 = right wall along +gx, 1 = left wall along +gy) and
// clamping glues them to it.
export const ISO_ITEMS = {
  rug: { label: "Round rug", icon: "🟣", foot: [3.5, 2.5], layer: -1, hitH: 10 },
  squarerug: { label: "Square rug", icon: "🟪", foot: [2.5, 2], layer: -1, hitH: 10 },
  desk: { label: "Workstation", icon: "🖥️", foot: [2.5, 1.05], hitH: 84, tintable: false },
  stool: { label: "Stool", icon: "🪑", foot: [0.8, 0.8], hitH: 28, seat: 20 },
  sofa: { label: "Sofa", icon: "🛋️", foot: [2, 1], hitH: 62, seat: 24 },
  coffeetable: { label: "Coffee table", icon: "☕", foot: [1.4, 0.9], hitH: 30 },
  bed: { label: "Bed", icon: "🛏️", foot: [2, 2.8], hitH: 58, seat: 30 },
  cushion: { label: "Floor cushion", icon: "🧶", foot: [0.9, 0.9], hitH: 18, seat: 13 },
  bookshelf: { label: "Bookshelf", icon: "📖", foot: [1.5, 0.7], hitH: 96 },
  aquarium: { label: "Aquarium", icon: "🐠", foot: [1.4, 0.7], hitH: 66, tintable: false },
  monstera: { label: "Monstera", icon: "🌱", foot: [0.8, 0.8], hitH: 78 },
  plant: { label: "Potted plant", icon: "🪴", foot: [0.6, 0.6], hitH: 46 },
  floorlamp: { label: "Floor lamp", icon: "💡", hitH: 116, foot: [0.8, 0.8] },
  cat: { label: "Sleeping cat", icon: "🐈", foot: [1.2, 0.8], hitH: 34 },
  frame: { label: "Picture frame", icon: "🖼️", foot: [1.4, 0.3], wall: true, hitH: 100 },
  wallshelf: { label: "Wall shelf", icon: "📚", foot: [1.6, 0.3], wall: true, hitH: 96 },
  mirror: { label: "Round mirror", icon: "🪞", foot: [1.1, 0.3], wall: true, hitH: 96 },
  // outdoor set (at home in the garden, allowed anywhere)
  tree: { label: "Tree", icon: "🌳", foot: [1.5, 1.5], hitH: 128 },
  bush: { label: "Bush", icon: "🌲", foot: [1, 1], hitH: 40 },
  pond: { label: "Pond", icon: "🪷", foot: [3.5, 2.5], layer: -1, hitH: 12, tintable: false },
  picnic: { label: "Picnic blanket", icon: "🧺", foot: [2, 1.5], layer: -1, hitH: 10 },
  bench: { label: "Garden bench", icon: "🪑", foot: [1.6, 0.6], hitH: 34, seat: 16 },
  flowerbed: { label: "Flower patch", icon: "🌼", foot: [1, 0.6], hitH: 22 },
  // the resident — a little person you drop anywhere: onto a seat (they sit)
  // or the open floor (they idle-wander). Tint = their sweater.
  resident: { label: "Resident", icon: "🧍", foot: [0.8, 0.8], hitH: 56, persona: true },
};

/** The seat a persona is placed on, if their centre is over one. */
export function seatFor(placement, placements) {
  const item = ISO_ITEMS[placement.item];
  if (!item?.persona) return null;
  const f = footOf(placement.item, placement.rot);
  const cx = placement.gx + f[0] / 2;
  const cy = placement.gy + f[1] / 2;
  for (const other of placements) {
    if (other.id === placement.id) continue;
    const seatItem = ISO_ITEMS[other.item];
    if (!seatItem?.seat) continue;
    const of = footOf(other.item, other.rot);
    if (cx >= other.gx && cx <= other.gx + of[0] && cy >= other.gy && cy <= other.gy + of[1]) {
      return { placement: other, height: seatItem.seat };
    }
  }
  return null;
}

export const ISO_ITEM_KEYS = Object.keys(ISO_ITEMS);

/** The placement's effective footprint: rot transposes it. */
export const footOf = (itemKey, rot = 0) => {
  const f = ISO_ITEMS[itemKey]?.foot || [1, 1];
  return rot ? [f[1], f[0]] : f;
};

/** Half-tile snapping: fine enough to feel free, aligned enough to feel tidy. */
export const snapHalf = (v) => Math.round(v * 2) / 2;

export const clampIsoSize = (v) =>
  Math.max(ISO_SIZE_MIN, Math.min(ISO_SIZE_MAX, Math.round(Number(v) || DEFAULT_ISO_SIZE.w)));

const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** The grid-space rectangle a corner cut removes, as {x0,y0,x1,y1}. */
export function cutRect(cut, size) {
  const { w, d } = size;
  switch (cut.corner) {
    case "back":
      return { x0: 0, y0: 0, x1: cut.cw, y1: cut.cd };
    case "right":
      return { x0: w - cut.cw, y0: 0, x1: w, y1: cut.cd };
    case "left":
      return { x0: 0, y0: d - cut.cd, x1: cut.cw, y1: d };
    case "front":
      return { x0: w - cut.cw, y0: d - cut.cd, x1: w, y1: d };
    default:
      return { x0: 0, y0: 0, x1: 0, y1: 0 };
  }
}

/** Is integer tile (x,y) part of the floor? */
export function tileOn(size, x, y) {
  if (x < 0 || y < 0 || x >= size.w || y >= size.d) return false;
  if (!size.mask) return true;
  return size.mask[y]?.[x] === "1";
}

/** Is a whole footprint on floor (in bounds, every overlapped tile on)? */
export function footprintFree(gx, gy, foot, size) {
  if (gx < 0 || gy < 0 || gx + foot[0] > size.w || gy + foot[1] > size.d) return false;
  const x1 = Math.ceil(gx + foot[0]) - 1;
  const y1 = Math.ceil(gy + foot[1]) - 1;
  for (let x = Math.floor(gx); x <= x1; x++) {
    for (let y = Math.floor(gy); y <= y1; y++) {
      if (!tileOn(size, x, y)) return false;
    }
  }
  return true;
}

/** Merged wall/lip runs computed per tile edge — correct for ANY mask.
 *  kind "wall": far-facing edges (void behind); kind "lip": near-facing.
 *  plane "gy": along a gy line at `at`, spanning gx from→to; "gx" mirrored. */
function edgeRuns(size, kind) {
  const runs = [];
  for (let y = 0; y <= size.d; y++) {
    let start = null;
    for (let x = 0; x <= size.w; x++) {
      const here = kind === "wall" ? tileOn(size, x, y) : tileOn(size, x, y - 1);
      const beyond = kind === "wall" ? tileOn(size, x, y - 1) : tileOn(size, x, y);
      const edge = x < size.w && here && !beyond;
      if (edge && start === null) start = x;
      if (!edge && start !== null) {
        runs.push({ plane: "gy", at: y, from: start, to: x });
        start = null;
      }
    }
  }
  for (let x = 0; x <= size.w; x++) {
    let start = null;
    for (let y = 0; y <= size.d; y++) {
      const here = kind === "wall" ? tileOn(size, x, y) : tileOn(size, x - 1, y);
      const beyond = kind === "wall" ? tileOn(size, x - 1, y) : tileOn(size, x, y);
      const edge = y < size.d && here && !beyond;
      if (edge && start === null) start = y;
      if (!edge && start !== null) {
        runs.push({ plane: "gx", at: x, from: start, to: y });
        start = null;
      }
    }
  }
  return runs;
}

/** Wall planes to draw, farthest first. */
export function wallRuns(size) {
  return edgeRuns(size, "wall").sort((a, b) => a.at - b.at);
}

/** Front-lip edges (the floor's viewer-facing rim). */
export function lipRuns(size) {
  return edgeRuns(size, "lip");
}

/** The longest wall run sitting on the ORIGINAL wall line (gy 0 for the
 *  right wall, gx 0 for the left) — where wall items may slide. */
export function wallSegment(side, size) {
  const plane = side === "right" ? "gy" : "gx";
  const candidates = wallRuns(size).filter((r) => r.plane === plane && r.at === 0);
  if (!candidates.length) return { from: 0, to: 0 };
  return candidates.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
}

/** Bounds/wall clamp only — mask validity is the caller's job (drags simply
 *  refuse to enter void tiles; validation relocates or drops). */
export function clampIsoPlacement(itemKey, gx, gy, size, rot = 0) {
  const item = ISO_ITEMS[itemKey];
  if (!item) return { gx, gy };
  const f = footOf(itemKey, rot);
  if (item.wall) {
    if (rot) {
      const seg = wallSegment("left", size);
      return { gx: 0, gy: clampNum(gy, seg.from, Math.max(seg.from, seg.to - f[1])) };
    }
    const seg = wallSegment("right", size);
    return { gx: clampNum(gx, seg.from, Math.max(seg.from, seg.to - f[0])), gy: 0 };
  }
  return {
    gx: clampNum(gx, 0, size.w - f[0]),
    gy: clampNum(gy, 0, size.d - f[1]),
  };
}

/** Nearest half-snapped spot whose footprint is fully on floor, or null. */
export function findFreeSpot(itemKey, rot, size, nearGx, nearGy) {
  const f = footOf(itemKey, rot);
  let best = null;
  let bestDist = Infinity;
  for (let x = 0; x <= (size.w - f[0]) * 2; x++) {
    for (let y = 0; y <= (size.d - f[1]) * 2; y++) {
      const gx = x / 2;
      const gy = y / 2;
      if (!footprintFree(gx, gy, f, size)) continue;
      const dist = (gx - nearGx) ** 2 + (gy - nearGy) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = { gx, gy };
      }
    }
  }
  return best;
}

const fullRow = (w) => "1".repeat(w);

/** Coerce a mask into d rows × w chars of 0/1, or undefined for full floor. */
export function normalizeMask(raw, w, d) {
  if (!Array.isArray(raw)) return undefined;
  const rows = [];
  let anyOn = false;
  let anyOff = false;
  for (let y = 0; y < d; y++) {
    const src = typeof raw[y] === "string" ? raw[y] : "";
    let row = "";
    for (let x = 0; x < w; x++) {
      const on = src[x] !== "0";
      row += on ? "1" : "0";
      if (on) anyOn = true;
      else anyOff = true;
    }
    rows.push(row);
  }
  if (!anyOn) return undefined; // an all-void floor is no floor at all
  return anyOff ? rows : undefined;
}

/** Legacy corner-cut saves → the equivalent mask. */
export function cutsToMask(cuts, w, d) {
  if (!Array.isArray(cuts) || !cuts.length) return undefined;
  const rows = Array.from({ length: d }, () => fullRow(w).split(""));
  for (const c of cuts) {
    if (!c || !CUT_CORNERS.includes(c.corner)) continue;
    const r = cutRect({ ...c, cw: Number(c.cw) || 0, cd: Number(c.cd) || 0 }, { w, d });
    for (let y = Math.max(0, r.y0); y < Math.min(d, r.y1); y++) {
      for (let x = Math.max(0, r.x0); x < Math.min(w, r.x1); x++) {
        rows[y][x] = "0";
      }
    }
  }
  return normalizeMask(rows.map((r) => r.join("")), w, d);
}

/** Painter's order: wall decor first (it hangs behind everything), then flat
 *  rugs, then by the front corner's depth. */
export function sortIso(placements) {
  const depth = (p) => {
    const f = footOf(p.item, p.rot);
    return p.gx + f[0] + p.gy + f[1];
  };
  const layer = (p) => {
    const item = ISO_ITEMS[p.item];
    return item.wall ? -2 : item.layer || 0;
  };
  return [...placements].sort(
    (a, b) =>
      layer(a) - layer(b) ||
      depth(a) - depth(b) ||
      String(a.id).localeCompare(String(b.id))
  );
}

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `i${Date.now().toString(36)}${idCounter}`;
}

export function newIsoPlacement(itemKey, existing = [], size = DEFAULT_ISO_SIZE) {
  const item = ISO_ITEMS[itemKey];
  if (!item) return null;
  const n = existing.length;
  // Wall items spawn on the right wall, fanned along it; floor items spawn
  // near the room centre, fanning repeated adds so copies don't stack.
  // clampIsoPlacement pushes the spawn off any corner cut.
  const want = item.wall
    ? { gx: size.w / 2 - item.foot[0] / 2 + ((n % 4) - 1.5), gy: 0 }
    : {
        gx: size.w / 2 - item.foot[0] / 2 + ((n % 4) - 1.5),
        gy: size.d / 2 - item.foot[1] / 2 + ((Math.floor(n / 4) % 3) - 1),
      };
  const { gx, gy } = clampIsoPlacement(itemKey, snapHalf(want.gx), snapHalf(want.gy), size);
  return { id: makeId(), item: itemKey, gx: snapHalf(gx), gy: snapHalf(gy) };
}

/** Coerce anything (old saves, server data, garbage) into a valid iso layout,
 *  or null if it isn't one. Same tolerance rules as the flat room. */
export function validateIsoLayout(raw) {
  if (!raw || typeof raw !== "object") return null;
  const w = clampIsoSize(raw.w);
  const d = clampIsoSize(raw.d);
  const mask = normalizeMask(raw.mask, w, d) ?? cutsToMask(raw.cuts, w, d);
  // "room" is the default and stored implicitly.
  const env = ISO_ENV_KEYS.includes(raw.env) && raw.env !== "room" ? raw.env : undefined;
  const size = { w, d, ...(env && { env }), ...(mask && { mask }) };
  const seen = new Set();
  const clean = [];
  for (const p of Array.isArray(raw.placements) ? raw.placements : []) {
    if (!p || typeof p !== "object") continue;
    if (!ISO_ITEMS[p.item]) continue;
    if (!Number.isFinite(p.gx) || !Number.isFinite(p.gy)) continue;
    let id = typeof p.id === "string" && p.id.length <= 32 ? p.id : makeId();
    while (seen.has(id)) id = makeId();
    seen.add(id);
    const tint = typeof p.tint === "string" && TINT_RE.test(p.tint) ? p.tint : undefined;
    const rot = p.rot === 1 || p.rot === true ? 1 : 0;
    // No walls outdoors — wall decor can't exist in a wall-less env.
    if (ISO_ITEMS[p.item].wall && env && !ISO_ENVS[env].walls) continue;
    let { gx, gy } = clampIsoPlacement(p.item, snapHalf(p.gx), snapHalf(p.gy), size, rot);
    // An item over void tiles is relocated to the nearest floor spot, or
    // dropped if the drawn shape has no room for it at all.
    if (!ISO_ITEMS[p.item].wall && !footprintFree(gx, gy, footOf(p.item, rot), size)) {
      const spot = findFreeSpot(p.item, rot, size, gx, gy);
      if (!spot) continue;
      ({ gx, gy } = spot);
    }
    clean.push({ id, item: p.item, gx, gy, ...(rot && { rot }), ...(tint && { tint }) });
    if (clean.length >= ISO_MAX_ITEMS) break;
  }
  return { w, d, ...(env && { env }), ...(mask && { mask }), placements: clean };
}

/** Ready-made rooms. Decorating rules that make these read as REAL rooms
 *  (learned from user feedback — floating mid-room furniture looks terrible):
 *  big furniture sits FLUSH against a wall (gy 0 or gx 0, or the room edge);
 *  seating groups share a centreline with their table; rugs go UNDER a
 *  furniture group, not beside it; small accents (plants, lamps) take
 *  corners; the centre stays walkable. Coordinates must be half-snapped and
 *  in-bounds as written — the preset test asserts clamp-stability. */
export const ISO_PRESETS = {
  classic: {
    label: "Cozy study",
    icon: "⭐",
    size: { w: 9, d: 7 },
    items: [
      // work wall: desk flush against the right wall, stool on its centre —
      // and the resident seated on it, studying (VC2-style)
      { item: "desk", gx: 3, gy: 0 },
      { item: "stool", gx: 4, gy: 1.5 },
      { item: "resident", gx: 4, gy: 1.5 },
      { item: "frame", gx: 1, gy: 0 },
      { item: "wallshelf", gx: 6, gy: 0 },
      { item: "floorlamp", gx: 8, gy: 0.5 },
      // left wall: bookshelf faces into the room, clear of the window
      { item: "bookshelf", gx: 0, gy: 3, rot: 1 },
      // centre: rug + cat
      { item: "rug", gx: 3, gy: 2.5 },
      { item: "cat", gx: 4, gy: 3.5 },
      // green corners
      { item: "monstera", gx: 0.5, gy: 5.5 },
      { item: "plant", gx: 8, gy: 5.5 },
    ],
  },
  cabin: {
    label: "Cozy cabin",
    icon: "🪵",
    size: { w: 9, d: 8 },
    items: [
      // sleeping corner: bed flush to the right wall, stool as a nightstand
      { item: "bed", gx: 6.5, gy: 0, tint: "#c98a4b" },
      { item: "stool", gx: 5.5, gy: 0, tint: "#9a6a45" },
      // hearth wall: bookshelf flush, shelf + frame hung over it
      { item: "bookshelf", gx: 1.5, gy: 0 },
      { item: "wallshelf", gx: 3.5, gy: 0, tint: "#8a5a3b" },
      // frame hangs over the sofa (the window owns gy 1–2.5 of this wall)
      { item: "frame", gx: 0, gy: 4, rot: 1, tint: "#6b4a39" },
      // sitting nook on the left wall: sofa faces its table across the rug
      { item: "squarerug", gx: 0.5, gy: 3.5, tint: "#9a6a45" },
      { item: "sofa", gx: 0, gy: 3.5, rot: 1, tint: "#8a5a3b" },
      { item: "coffeetable", gx: 1.5, gy: 4, rot: 1 },
      { item: "cat", gx: 2, gy: 5.5, tint: "#8a5a3b" },
      { item: "floorlamp", gx: 0.5, gy: 6.5 },
      // loose warmth
      { item: "cushion", gx: 4, gy: 4.5, tint: "#c98a4b" },
      { item: "plant", gx: 0.5, gy: 0.5 },
      { item: "monstera", gx: 8, gy: 7 },
    ],
  },
  loft: {
    label: "Loft",
    icon: "🌙",
    // L-shaped attic: the front-right corner is cut away.
    size: { w: 10, d: 8, cuts: [{ corner: "front", cw: 4, cd: 3 }] },
    items: [
      // bed tucked into the far right corner, nightstand beside it
      { item: "bed", gx: 8, gy: 0, tint: "#5b6b9b" },
      { item: "stool", gx: 7, gy: 0, tint: "#3a3142" },
      // back wall: aquarium + shelf
      { item: "aquarium", gx: 4.5, gy: 0 },
      { item: "wallshelf", gx: 2, gy: 0, tint: "#3a3142" },
      { item: "frame", gx: 5.5, gy: 0, tint: "#3a3142" },
      // lounge against the left wall: sofa + table on one centreline, on a rug
      { item: "squarerug", gx: 0.5, gy: 2.5, tint: "#8a7ac2" },
      { item: "sofa", gx: 0, gy: 2.5, rot: 1, tint: "#7568ad" },
      { item: "coffeetable", gx: 1.5, gy: 3, rot: 1, tint: "#4a3a5b" },
      { item: "mirror", gx: 0, gy: 5.5, rot: 1, tint: "#cbd5e8" },
      // the open nook the cut leaves behind
      { item: "floorlamp", gx: 5, gy: 4, tint: "#cbd5e8" },
      { item: "cushion", gx: 4, gy: 5.5, tint: "#8a7ac2" },
      { item: "cat", gx: 2, gy: 5.5, tint: "#2c2438" },
      { item: "monstera", gx: 0.5, gy: 7 },
    ],
  },
  cafe: {
    label: "Morning café",
    icon: "☕",
    size: { w: 10, d: 7 },
    items: [
      // the counter row along the back wall
      { item: "bookshelf", gx: 0, gy: 0.5, rot: 1 },
      { item: "desk", gx: 3.5, gy: 0 },
      { item: "frame", gx: 1.5, gy: 0, tint: "#9a6a45" },
      { item: "wallshelf", gx: 6.5, gy: 0, tint: "#9a6a45" },
      { item: "aquarium", gx: 8.5, gy: 0 },
      // seating set A on the big rug: stools flank the table's centreline
      { item: "rug", gx: 0.5, gy: 2.5, tint: "#c98a4b" },
      { item: "coffeetable", gx: 2, gy: 3 },
      { item: "stool", gx: 1, gy: 3, tint: "#e8b04b" },
      { item: "stool", gx: 3.5, gy: 3, tint: "#e8b04b" },
      // seating set B, same geometry, shifted right and forward
      { item: "coffeetable", gx: 6, gy: 4 },
      { item: "stool", gx: 5, gy: 4, tint: "#d98a93" },
      { item: "stool", gx: 7.5, gy: 4, tint: "#d98a93" },
      // life
      { item: "floorlamp", gx: 9, gy: 2.5, tint: "#c98a4b" },
      { item: "cat", gx: 6, gy: 5.5 },
      { item: "cushion", gx: 8.5, gy: 5.5, tint: "#d98a93" },
      { item: "monstera", gx: 9, gy: 6 },
      { item: "plant", gx: 0.5, gy: 5.5 },
    ],
  },
  garden: {
    label: "Secret garden",
    icon: "🌿",
    size: { w: 11, d: 9, env: "garden" },
    items: [
      // tree line along the back, pond nestled between them
      { item: "tree", gx: 0.5, gy: 0.5 },
      { item: "bush", gx: 2.5, gy: 0.5 },
      { item: "pond", gx: 5.5, gy: 0.5 },
      { item: "tree", gx: 9, gy: 0.5 },
      { item: "bench", gx: 6, gy: 3.5 },
      { item: "resident", gx: 6.5, gy: 3.5, tint: "#c98a4b" },
      // study spot: desk + stool on the open lawn, like VC2's picnic table
      { item: "desk", gx: 2.5, gy: 2.5 },
      { item: "stool", gx: 3.5, gy: 4 },
      // picnic corner with the cat
      { item: "picnic", gx: 1.5, gy: 5.5, tint: "#d98a93" },
      { item: "cat", gx: 2, gy: 6, tint: "#8a5a3b" },
      // greenery + colour
      { item: "bush", gx: 10, gy: 3.5 },
      { item: "flowerbed", gx: 0.5, gy: 8, tint: "#e8b04b" },
      { item: "flowerbed", gx: 9.5, gy: 8, tint: "#d98a93" },
      { item: "plant", gx: 0.5, gy: 3.5 },
      { item: "monstera", gx: 8, gy: 6.5 },
    ],
  },
  empty: {
    label: "Empty room",
    icon: "🫙",
    size: DEFAULT_ISO_SIZE,
    items: [],
  },
};

export const ISO_PRESET_KEYS = Object.keys(ISO_PRESETS);

export function isoPresetLayout(key) {
  const preset = ISO_PRESETS[key] || ISO_PRESETS.classic;
  return {
    w: preset.size.w,
    d: preset.size.d,
    ...(preset.size.env && { env: preset.size.env }),
    ...(preset.size.cuts && { cuts: preset.size.cuts.map((c) => ({ ...c })) }),
    placements: preset.items.map((p) => ({ ...p, id: makeId() })),
  };
}

/** The starter arrangement (the original mock scene). */
export function defaultIsoLayout() {
  return isoPresetLayout("classic");
}
