// The freeform room-decoration model: which items exist, where they're allowed
// to sit, and how a layout is ordered for drawing. Pure data + functions — the
// SVG artwork itself lives in components/RoomItems.jsx.
//
// A layout ("placements") is an array of { id, item, x, y } in the scene's
// 640x480 viewBox coordinates. (x, y) is the item's ORIGIN — the point of the
// sprite that touches its surface (base of a plant pot, centre of a wall
// frame) — so clamping the origin to a zone keeps items on believable
// surfaces while leaving arrangement completely free.

export const SCENE = { width: 640, height: 480 };

// Dragging snaps to a fine grid: loose enough to feel freeform, tight enough
// that nudged items line up.
export const GRID = 4;

// Where each kind of item may sit (bounds for the item ORIGIN, pre-padded so
// sprites stay inside the room's rounded frame).
//   wall  — the free wall right of the window
//   desk  — along the desktop surface (y is a shallow band: desk depth)
//   floor — the floor in front of the desk
export const ZONES = {
  wall: { x: 450, y: 52, w: 158, h: 158 },
  desk: { x: 66, y: 294, w: 516, h: 14 },
  floor: { x: 46, y: 404, w: 548, h: 58 },
};

// layer: flat things (rugs) always draw first within their zone so standing
// items can never be overpainted by a rug edge; everything else sorts by y
// (painter's algorithm — lower on screen = nearer = drawn later).
export const ITEMS = {
  // ---- wall ----
  frame: { label: "Picture frame", icon: "🖼️", zone: "wall", hit: { x: -24, y: -32, w: 48, h: 64 } },
  clock: { label: "Wall clock", icon: "🕰️", zone: "wall", hit: { x: -20, y: -20, w: 40, h: 40 } },
  hangplant: { label: "Hanging plant", icon: "🌿", zone: "wall", hit: { x: -15, y: -32, w: 30, h: 72 } },
  poster: { label: "Sunrise poster", icon: "🌄", zone: "wall", hit: { x: -22, y: -29, w: 44, h: 58 } },
  polaroids: { label: "Polaroids", icon: "📸", zone: "wall", hit: { x: -26, y: -18, w: 52, h: 40 } },
  shelf: { label: "Floating shelf", icon: "🪵", zone: "wall", hit: { x: -36, y: -26, w: 72, h: 32 } },

  // ---- desk ----
  deskplant: { label: "Potted plant", icon: "🪴", zone: "desk", hit: { x: -20, y: -74, w: 42, h: 76 } },
  books: { label: "Book stack", icon: "📚", zone: "desk", hit: { x: -32, y: -42, w: 64, h: 44 } },
  mug: { label: "Steaming mug", icon: "☕", zone: "desk", hit: { x: -18, y: -44, w: 42, h: 46 } },
  pencilcup: { label: "Pencil cup", icon: "✏️", zone: "desk", hit: { x: -16, y: -58, w: 32, h: 60 } },
  notebook: { label: "Open notebook", icon: "📓", zone: "desk", hit: { x: -46, y: -12, w: 92, h: 14 } },
  desklamp: { label: "Desk lamp", icon: "💡", zone: "desk", hit: { x: -56, y: -64, w: 78, h: 66 } },
  cactus: { label: "Tiny cactus", icon: "🌵", zone: "desk", hit: { x: -12, y: -34, w: 24, h: 36 } },
  headphones: { label: "Headphones", icon: "🎧", zone: "desk", hit: { x: -24, y: -22, w: 48, h: 24 } },

  // ---- floor ----
  rug: { label: "Round rug", icon: "🟣", zone: "floor", layer: -1, hit: { x: -110, y: -26, w: 220, h: 52 } },
  rugstripe: { label: "Striped rug", icon: "🧶", zone: "floor", layer: -1, hit: { x: -105, y: -20, w: 210, h: 40 } },
  monstera: { label: "Monstera", icon: "🌱", zone: "floor", hit: { x: -34, y: -96, w: 68, h: 98 } },
  floorlamp: { label: "Floor lamp", icon: "🛋️", zone: "floor", hit: { x: -26, y: -128, w: 52, h: 130 } },
  cat: { label: "Sleeping cat", icon: "🐈", zone: "floor", hit: { x: -30, y: -26, w: 60, h: 28 } },
  bookshelf: { label: "Bookshelf", icon: "📖", zone: "floor", hit: { x: -42, y: -104, w: 84, h: 106 } },
  beanbag: { label: "Beanbag", icon: "🫘", zone: "floor", hit: { x: -40, y: -34, w: 80, h: 36 } },

  // ---- ceiling (fixed position; can be added/removed but not dragged) ----
  garland: { label: "String lights", icon: "✨", zone: "ceiling", fixed: true, hit: { x: -304, y: -6, w: 608, h: 30 } },
};

export const ITEM_KEYS = Object.keys(ITEMS);

const ZONE_DRAW_ORDER = { ceiling: 0, wall: 1, desk: 2, floor: 3 };

export const snap = (v) => Math.round(v / GRID) * GRID;

export function clampToZone(itemKey, x, y) {
  const item = ITEMS[itemKey];
  if (!item || item.fixed) return { x, y };
  const z = ZONES[item.zone];
  return {
    x: Math.min(Math.max(x, z.x), z.x + z.w),
    y: Math.min(Math.max(y, z.y), z.y + z.h),
  };
}

/** Painter's ordering: ceiling, wall, desk, floor; rugs before standing items;
 *  then nearer (larger y) drawn later. Returns a NEW array. */
export function sortForRender(placements) {
  return [...placements].sort(
    (a, b) =>
      ZONE_DRAW_ORDER[ITEMS[a.item].zone] - ZONE_DRAW_ORDER[ITEMS[b.item].zone] ||
      (ITEMS[a.item].layer || 0) - (ITEMS[b.item].layer || 0) ||
      a.y - b.y ||
      a.x - b.x ||
      String(a.id).localeCompare(String(b.id))
  );
}

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `p${Date.now().toString(36)}${idCounter}`;
}

/** Spawn points per zone; repeated adds fan out so copies don't stack. */
const SPAWN = {
  wall: { x: 520, y: 120 },
  desk: { x: 200, y: 300 },
  floor: { x: 200, y: 434 },
  ceiling: { x: 320, y: 24 },
};

export function newPlacement(itemKey, existing = []) {
  const item = ITEMS[itemKey];
  if (!item) return null;
  const base = SPAWN[item.zone];
  // Fixed items are singletons pinned to their one home position. Fanning
  // them out like normal items would spawn a copy offset from its artwork's
  // anchor — and since fixed items can't be dragged, it could never be
  // nudged back.
  if (item.fixed) {
    if (existing.some((p) => p.item === itemKey)) return null;
    return { id: makeId(), item: itemKey, x: snap(base.x), y: snap(base.y) };
  }
  const siblings = existing.filter((p) => ITEMS[p.item]?.zone === item.zone).length;
  const { x, y } = clampToZone(
    itemKey,
    base.x + (siblings % 6) * 36,
    base.y + (siblings % 3) * 10
  );
  return { id: makeId(), item: itemKey, x: snap(x), y: snap(y) };
}

/** Highest count of items we'll keep in a layout — a sanity bound for both
 *  rendering cost and the persisted payload, far above any real room. */
export const MAX_ITEMS = 60;

/** Coerce anything (old saves, server data, garbage) into a valid layout, or
 *  null if it isn't a layout at all. Unknown items are dropped so removing a
 *  catalog entry can never brick a saved room. */
export function validatePlacements(raw) {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  const fixedSeen = new Set();
  const clean = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const item = ITEMS[p.item];
    if (!item) continue;
    if (typeof p.x !== "number" || typeof p.y !== "number") continue;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    let id = typeof p.id === "string" && p.id.length <= 32 ? p.id : makeId();
    while (seen.has(id)) id = makeId();
    seen.add(id);
    if (item.fixed) {
      // Singletons, and always at their home position — this also heals
      // layouts saved before that rule existed (an offset duplicate could
      // never be dragged back, so it would be stuck forever).
      if (fixedSeen.has(p.item)) continue;
      fixedSeen.add(p.item);
      const home = SPAWN[item.zone];
      clean.push({ id, item: p.item, x: snap(home.x), y: snap(home.y) });
    } else {
      const { x, y } = clampToZone(p.item, snap(p.x), snap(p.y));
      clean.push({ id, item: p.item, x, y });
    }
    if (clean.length >= MAX_ITEMS) break;
  }
  return clean;
}

// --------------------------------------------------------------------------- #
// Presets — starting points, not limits. "default" reproduces the classic
// hand-arranged scene exactly (each position matches the original artwork).
// --------------------------------------------------------------------------- #
export const PRESETS = {
  default: {
    label: "Classic study",
    icon: "🖥️",
    placements: [
      { item: "rug", x: 320, y: 440 },
      { item: "deskplant", x: 86, y: 302 },
      { item: "books", x: 156, y: 300 },
      { item: "mug", x: 394, y: 300 },
      { item: "pencilcup", x: 438, y: 304 },
      { item: "notebook", x: 500, y: 306 },
      { item: "desklamp", x: 566, y: 296 },
      { item: "frame", x: 496, y: 88 },
      { item: "hangplant", x: 544, y: 76 },
      { item: "clock", x: 496, y: 158 },
      { item: "garland", x: 320, y: 24 },
    ],
  },
  greenhouse: {
    label: "Greenhouse",
    icon: "🌿",
    placements: [
      { item: "rugstripe", x: 320, y: 442 },
      { item: "deskplant", x: 86, y: 302 },
      { item: "cactus", x: 168, y: 300 },
      { item: "mug", x: 400, y: 300 },
      { item: "deskplant", x: 470, y: 302 },
      { item: "desklamp", x: 566, y: 296 },
      { item: "hangplant", x: 470, y: 76 },
      { item: "hangplant", x: 545, y: 76 },
      { item: "shelf", x: 520, y: 168 },
      { item: "monstera", x: 90, y: 428 },
      { item: "monstera", x: 560, y: 436 },
      { item: "cat", x: 320, y: 448 },
    ],
  },
  library: {
    label: "Library",
    icon: "📚",
    placements: [
      { item: "rug", x: 320, y: 440 },
      { item: "books", x: 120, y: 300 },
      { item: "books", x: 190, y: 300 },
      { item: "notebook", x: 400, y: 306 },
      { item: "pencilcup", x: 460, y: 304 },
      { item: "desklamp", x: 566, y: 296 },
      { item: "frame", x: 480, y: 80 },
      { item: "clock", x: 545, y: 80 },
      { item: "shelf", x: 512, y: 160 },
      { item: "bookshelf", x: 76, y: 424 },
      { item: "garland", x: 320, y: 24 },
    ],
  },
  nightowl: {
    label: "Night owl",
    icon: "🌙",
    placements: [
      { item: "rugstripe", x: 320, y: 442 },
      { item: "mug", x: 150, y: 300 },
      { item: "headphones", x: 220, y: 302 },
      { item: "cactus", x: 420, y: 300 },
      { item: "desklamp", x: 566, y: 296 },
      { item: "poster", x: 480, y: 90 },
      { item: "polaroids", x: 552, y: 88 },
      { item: "floorlamp", x: 580, y: 430 },
      { item: "cat", x: 150, y: 446 },
      { item: "beanbag", x: 90, y: 440 },
      { item: "garland", x: 320, y: 24 },
    ],
  },
};

export function presetPlacements(key) {
  const preset = PRESETS[key] || PRESETS.default;
  return preset.placements.map((p) => ({ ...p, id: makeId() }));
}
