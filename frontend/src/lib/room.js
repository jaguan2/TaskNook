// The freeform room-decoration model: which items exist and how a layout is
// ordered for drawing. Pure data + functions — the SVG artwork itself lives in
// components/RoomItems.jsx.
//
// A layout ("placements") is an array of { id, item, x, y, tint? } in the
// scene's SVG coordinates. (x, y) is the item's ORIGIN — the point
// of the sprite that touches its surface (base of a plant pot, centre of a
// wall frame). Placement is deliberately unbounded: an item's `zone` is only
// its spawn point and panel grouping, never a constraint — a plant can sit on
// the desk, a clock can lean on the floor. The only clamp keeps the origin
// inside the room so nothing can be dragged somewhere it can't be grabbed
// back from. `tint` is an optional #rrggbb the sprite's main material takes on.


// Dragging snaps to a fine grid: loose enough to feel freeform, tight enough
// that nudged items line up.
export const GRID = 4;

export const COTTAGE_SETTINGS = { city: "City lights", woodland: "Woodland", coast: "Seaside" };
export const cottageSetting = (value) => Object.hasOwn(COTTAGE_SETTINGS, value) ? value : "city";

// The one placement rule: the ORIGIN stays inside the room's frame, so every
// item remains reachable in edit mode (sprites may overhang; roomClip trims).
export const COTTAGE_FRAME = { x: -128, y: 0, w: 1152, h: 648 };
export const ROOM_BOUNDS = { x: COTTAGE_FRAME.x + 20, y: 20, w: COTTAGE_FRAME.w - 40, h: COTTAGE_FRAME.h - 36 };

// Shared with the fixed desk drawing and authored-preset clearance checks.
export const COTTAGE_DESK = {
  left: 30, right: 610, floorY: 400,
  drawers: { x: 444, y: 316, w: 150 },
  kneeLeft: 68,
  laptopScale: 0.8,
};

// Curated tint swatches shown on a selected item — drawn from the app's own
// palette so any recolour still feels at home in the scene.
export const TINT_SWATCHES = [
  "#d98a93", // rose
  "#e8b04b", // amber
  "#7faf8f", // sage
  "#6fb8cf", // sky
  "#9b8bd6", // lavender
  "#f7e9e2", // cream
  "#3a3142", // charcoal
];

const TINT_RE = /^#[0-9a-f]{6}$/i;

// layer: flat things (rugs) always draw first within their zone so standing
// items can never be overpainted by a rug edge; everything else sorts by y
// (painter's algorithm — lower on screen = nearer = drawn later).
export const ITEMS = {
  mirror: { label: "Arched mirror", icon: "🪞", zone: "wall", hit: { x: -25, y: -45, w: 50, h: 90 } },
  armchair: { label: "Reading chair", icon: "🛋️", zone: "floor", hit: { x: -68, y: -120, w: 136, h: 128 } },
  sidetable: { label: "Tea table", icon: "🫖", zone: "floor", hit: { x: -31, y: -53, w: 62, h: 55 } },
  plantstand: { label: "Plant stand", icon: "🪴", zone: "floor", hit: { x: -28, y: -113, w: 56, h: 115 } },
  // ---- wall ----
  frame: { label: "Picture frame", icon: "🖼️", zone: "wall", hit: { x: -24, y: -32, w: 48, h: 64 } },
  clock: { label: "Wall clock", icon: "🕰️", zone: "wall", hit: { x: -20, y: -20, w: 40, h: 40 } },
  hangplant: { label: "Hanging plant", icon: "🌿", zone: "wall", hit: { x: -26, y: -34, w: 52, h: 76 } },
  poster: { label: "Sunrise poster", icon: "🌄", zone: "wall", hit: { x: -22, y: -29, w: 44, h: 58 } },
  polaroids: { label: "Polaroids", icon: "📸", zone: "wall", tintable: false, hit: { x: -26, y: -18, w: 52, h: 40 } },
  shelf: { label: "Floating shelf", icon: "🪵", zone: "wall", hit: { x: -39, y: -29, w: 78, h: 53 } },
  bunting: { label: "Bunting", icon: "🎏", zone: "wall", hit: { x: -62, y: -12, w: 124, h: 32 } },

  // ---- desk ----
  deskplant: { label: "Potted plant", icon: "🪴", zone: "desk", hit: { x: -24, y: -78, w: 48, h: 82 } },
  books: { label: "Book stack", icon: "📚", zone: "desk", hit: { x: -32, y: -42, w: 64, h: 44 } },
  mug: { label: "Steaming mug", icon: "☕", zone: "desk", hit: { x: -18, y: -44, w: 42, h: 46 } },
  pencilcup: { label: "Pencil cup", icon: "✏️", zone: "desk", hit: { x: -16, y: -62, w: 32, h: 64 } },
  notebook: { label: "Open notebook", icon: "📓", zone: "desk", tintable: false, hit: { x: -46, y: -12, w: 92, h: 14 } },
  desklamp: { label: "Desk lamp", icon: "💡", zone: "desk", hit: { x: -56, y: -64, w: 78, h: 66 } },
  cactus: { label: "Tiny cactus", icon: "🌵", zone: "desk", hit: { x: -16, y: -40, w: 32, h: 42 } },
  headphones: { label: "Headphones", icon: "🎧", zone: "desk", hit: { x: -24, y: -22, w: 48, h: 24 } },
  radio: { label: "Little radio", icon: "📻", zone: "desk", hit: { x: -24, y: -48, w: 48, h: 50 } },
  candle: { label: "Lit candle", icon: "🕯️", zone: "desk", hit: { x: -13, y: -48, w: 26, h: 50 } },
  flowervase: { label: "Flower vase", icon: "🌷", zone: "desk", hit: { x: -16, y: -52, w: 32, h: 54 } },

  // ---- floor ----
  rug: { label: "Round rug", icon: "🟣", zone: "floor", layer: -1, hit: { x: -140, y: -42, w: 280, h: 86 } },
  rugstripe: { label: "Striped rug", icon: "🧶", zone: "floor", layer: -1, hit: { x: -124, y: -32, w: 248, h: 68 } },
  monstera: { label: "Monstera", icon: "🌱", zone: "floor", hit: { x: -38, y: -100, w: 76, h: 104 } },
  floorlamp: { label: "Floor lamp", icon: "💡", zone: "floor", hit: { x: -26, y: -128, w: 52, h: 130 } },
  cat: { label: "Sleeping cat", icon: "🐈", zone: "floor", hit: { x: -34, y: -30, w: 70, h: 34 } },
  bookshelf: { label: "Bookshelf", icon: "📖", zone: "floor", hit: { x: -44, y: -108, w: 88, h: 114 } },
  beanbag: { label: "Beanbag", icon: "🫘", zone: "floor", hit: { x: -40, y: -34, w: 80, h: 36 } },
  basket: { label: "Yarn basket", icon: "🧺", zone: "floor", hit: { x: -24, y: -46, w: 48, h: 48 } },
  slippers: { label: "Cozy slippers", icon: "🥿", zone: "floor", hit: { x: -28, y: -14, w: 56, h: 16 } },
  sofa: { label: "Cozy sofa", icon: "🛋️", zone: "floor", hit: { x: -137, y: -126, w: 274, h: 132 } },
  deskchair: { label: "Study chair", icon: "🪑", zone: "floor", hit: { x: -68, y: -136, w: 136, h: 142 } },
  coffeetable: { label: "Coffee table", icon: "☕", zone: "floor", hit: { x: -80, y: -50, w: 160, h: 55 } },
  floorcushion: { label: "Floor cushion", icon: "🧸", zone: "floor", hit: { x: -36, y: -27, w: 72, h: 29 } },
  terrarium: { label: "Glass terrarium", icon: "🌱", zone: "desk", hit: { x: -24, y: -49, w: 48, h: 51 } },

  // ---- ceiling (fixed position; can be added/removed but not dragged) ----
  garland: { label: "String lights", icon: "✨", zone: "ceiling", fixed: true, hit: { x: -304, y: -6, w: 608, h: 30 } },
};

export const ITEM_KEYS = Object.keys(ITEMS);

export const snap = (v) => Math.round(v / GRID) * GRID;

/** The only placement constraint: keep the origin inside the room so the item
 *  can always be grabbed again. Anything else goes — that's the point. */
export function clampToRoom(itemKey, x, y) {
  const item = ITEMS[itemKey];
  if (!item || item.fixed) return { x, y };
  const b = ROOM_BOUNDS;
  return {
    x: Math.min(Math.max(x, b.x), b.x + b.w),
    y: Math.min(Math.max(y, b.y), b.y + b.h),
  };
}

/** Painter's ordering, purely by depth: flat rugs (`layer: -1`) go down first
 *  so nothing standing is ever overpainted by a rug edge, then lower on screen
 *  = nearer = drawn later. No per-kind ordering — with unbounded placement an
 *  item's depth is wherever the user put it. Returns a NEW array. */
export function sortForRender(placements) {
  return [...placements].sort(
    (a, b) =>
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
  const { x, y } = clampToRoom(
    itemKey,
    base.x + (siblings % 6) * 36,
    base.y + (siblings % 3) * 10
  );
  return { id: makeId(), item: itemKey, x: snap(x), y: snap(y) };
}

/** Highest count of items we'll keep in a layout — a sanity bound for both
 *  rendering cost and the persisted payload, far above any real room. */
export const MAX_ITEMS = 60;

/** Copy a movable decoration, including its material, into a nearby spot. */
export function duplicatePlacement(placements, id) {
  const source = placements.find((p) => p.id === id);
  if (!source || !ITEMS[source.item] || ITEMS[source.item].fixed || placements.length >= MAX_ITEMS) return null;
  const x = source.x + 24 <= ROOM_BOUNDS.x + ROOM_BOUNDS.w ? source.x + 24 : source.x - 24;
  const y = source.y + 12 <= ROOM_BOUNDS.y + ROOM_BOUNDS.h ? source.y + 12 : source.y - 12;
  return { ...source, id: makeId(), ...clampToRoom(source.item, snap(x), snap(y)) };
}

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
    // An invalid tint is dropped, never rejected — the placement survives.
    const tint = typeof p.tint === "string" && TINT_RE.test(p.tint) ? p.tint : undefined;
    if (item.fixed) {
      // Singletons, and always at their home position — this also heals
      // layouts saved before that rule existed (an offset duplicate could
      // never be dragged back, so it would be stuck forever).
      if (fixedSeen.has(p.item)) continue;
      fixedSeen.add(p.item);
      const home = SPAWN[item.zone];
      clean.push({ id, item: p.item, x: snap(home.x), y: snap(home.y), ...(tint && { tint }) });
    } else {
      const { x, y } = clampToRoom(p.item, snap(p.x), snap(p.y));
      clean.push({ id, item: p.item, x, y, ...(tint && { tint }) });
    }
    if (clean.length >= MAX_ITEMS) break;
  }
  return clean;
}

// --------------------------------------------------------------------------- #
// Presets — starting points, not limits. "default" keeps the classic desk
// decorations and adds the study chair facing the laptop.
// --------------------------------------------------------------------------- #
export const PRESETS = {
  lounge: {
    label: "Cozy lounge", icon: "🛋️", setting: "woodland",
    placements: [
      { item: "rug", x: 840, y: 476, tint: "#b99d98" },
      { item: "sofa", x: 840, y: 432, tint: "#8baba0" },
      { item: "coffeetable", x: 840, y: 504 },
      { item: "deskchair", x: 292, y: 420, tint: "#8f9eaf" },
      { item: "floorlamp", x: 976, y: 432 },
      { item: "bookshelf", x: 656, y: 404 },
      { item: "terrarium", x: 148, y: 300 },
      { item: "mug", x: 400, y: 300 },
      { item: "desklamp", x: 566, y: 296 },
      { item: "frame", x: 816, y: 176 },
      { item: "shelf", x: 924, y: 248 },
      { item: "garland", x: 320, y: 24 },
    ],
  },
  default: {
    label: "Classic study", icon: "💻",
    placements: [
      { item: "rug", x: 292, y: 456, tint: "#bba99d" },
      { item: "deskchair", x: 292, y: 420, tint: "#8f9eaf" },
      { item: "deskplant", x: 96, y: 300 },
      { item: "books", x: 164, y: 300 },
      { item: "mug", x: 388, y: 300 },
      { item: "pencilcup", x: 432, y: 300 },
      { item: "notebook", x: 500, y: 306 },
      { item: "desklamp", x: 566, y: 296 },
      { item: "bookshelf", x: 656, y: 404 },
      { item: "armchair", x: 824, y: 452, tint: "#8baba0" },
      { item: "sidetable", x: 932, y: 464 },
      { item: "floorlamp", x: 976, y: 428 },
      { item: "rug", x: 824, y: 488, tint: "#a99c91" },
      { item: "frame", x: 824, y: 184 },
      { item: "clock", x: 924, y: 112 },
      { item: "shelf", x: 824, y: 268 },
      { item: "garland", x: 320, y: 24 },
    ],
  },
  greenhouse: {
    label: "Greenhouse", icon: "🌿", setting: "woodland",
    placements: [
      { item: "rugstripe", x: 292, y: 460, tint: "#9bac92" },
      { item: "deskchair", x: 292, y: 420, tint: "#8eaa96" },
      { item: "deskplant", x: 96, y: 300 },
      { item: "cactus", x: 168, y: 300 },
      { item: "mug", x: 400, y: 300 },
      { item: "desklamp", x: 566, y: 296 },
      { item: "hangplant", x: 688, y: 108 },
      { item: "hangplant", x: 916, y: 112 },
      { item: "shelf", x: 820, y: 248 },
      { item: "monstera", x: 672, y: 432 },
      { item: "plantstand", x: 960, y: 432, tint: "#c29a7e" },
      { item: "floorcushion", x: 816, y: 488, tint: "#a7b49a" },
      { item: "sidetable", x: 908, y: 492 },
      { item: "cat", x: 336, y: 480 },
    ],
  },
  library: {
    label: "Library", icon: "📚", setting: "city",
    placements: [
      { item: "deskchair", x: 292, y: 420, tint: "#8f9eaf" },
      { item: "rug", x: 808, y: 480, tint: "#baa995" },
      { item: "books", x: 120, y: 300 },
      { item: "books", x: 188, y: 300 },
      { item: "notebook", x: 400, y: 306 },
      { item: "pencilcup", x: 460, y: 300 },
      { item: "desklamp", x: 566, y: 296 },
      { item: "frame", x: 800, y: 176 },
      { item: "clock", x: 916, y: 112 },
      { item: "shelf", x: 848, y: 252 },
      { item: "bookshelf", x: 656, y: 404 },
      { item: "armchair", x: 808, y: 448, tint: "#aaa0b6" },
      { item: "sidetable", x: 920, y: 464 },
      { item: "floorlamp", x: 976, y: 432 },
      { item: "garland", x: 320, y: 24 },
    ],
  },
  nightowl: {
    label: "Night owl", icon: "🌙",
    placements: [
      { item: "deskchair", x: 292, y: 420, tint: "#aaa0b6" },
      { item: "rugstripe", x: 824, y: 480, tint: "#8791ac" },
      { item: "mug", x: 150, y: 300 },
      { item: "headphones", x: 196, y: 302 },
      { item: "cactus", x: 420, y: 300 },
      { item: "desklamp", x: 566, y: 296 },
      { item: "poster", x: 800, y: 188 },
      { item: "polaroids", x: 884, y: 204 },
      { item: "bookshelf", x: 656, y: 404 },
      { item: "floorlamp", x: 968, y: 432 },
      { item: "cat", x: 296, y: 480 },
      { item: "beanbag", x: 824, y: 448 },
      { item: "sidetable", x: 920, y: 476 },
      { item: "garland", x: 320, y: 24 },
    ],
  },
  reading: {
    label: "Woodland nook", icon: "🍃", setting: "woodland",
    placements: [
      { item: "deskchair", x: 292, y: 420, tint: "#8eaa96" },
      { item: "rug", x: 824, y: 480, tint: "#9eaa91" },
      { item: "bookshelf", x: 656, y: 404 },
      { item: "armchair", x: 808, y: 448, tint: "#8baba0" },
      { item: "sidetable", x: 920, y: 464 },
      { item: "floorlamp", x: 976, y: 432 },
      { item: "mirror", x: 924, y: 180, tint: "#c9b28b" },
      { item: "shelf", x: 792, y: 252 },
      { item: "books", x: 144, y: 300 },
      { item: "mug", x: 392, y: 300, tint: "#8baba0" },
      { item: "desklamp", x: 566, y: 296 },
      { item: "cat", x: 332, y: 480 },
    ],
  },
  seaside: {
    label: "Seaside studio", icon: "🐚", setting: "coast",
    placements: [
      { item: "deskchair", x: 292, y: 420, tint: "#83a5af" },
      { item: "rugstripe", x: 824, y: 480, tint: "#97b4b3" },
      { item: "armchair", x: 808, y: 448, tint: "#97b4b3" },
      { item: "sidetable", x: 920, y: 464, tint: "#e5d6bf" },
      { item: "plantstand", x: 656, y: 432, tint: "#c79b7b" },
      { item: "mirror", x: 824, y: 180, tint: "#e5d6bf" },
      { item: "bunting", x: 840, y: 116, tint: "#9db6bf" },
      { item: "flowervase", x: 100, y: 300, tint: "#9db6bf" },
      { item: "books", x: 168, y: 300 },
      { item: "notebook", x: 430, y: 304 },
      { item: "radio", x: 552, y: 300, tint: "#9db6bf" },
      { item: "slippers", x: 332, y: 480 },
      { item: "floorlamp", x: 976, y: 432 },
    ],
  },
};

export function presetPlacements(key) {
  const preset = PRESETS[key] || PRESETS.default;
  return preset.placements.map((p) => ({ ...p, id: makeId() }));
}
