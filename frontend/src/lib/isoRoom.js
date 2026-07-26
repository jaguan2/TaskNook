// The isometric room's decoration model: a resizable W×D tile floor and
// items placed ON the grid as { id, item, gx, gy, tint? } (tile coordinates,
// half-tile snapping). Pure data + functions; projection math lives in
// lib/iso.js and the artwork in components/IsoItems.jsx.

export const ISO_SIZE_MIN = 3;
export const ISO_SIZE_MAX = 14;
export const DEFAULT_ISO_SIZE = { w: 9, d: 7 };
export const ISO_MAX_ITEMS = 60;

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
  stool: { label: "Stool", icon: "🪑", foot: [0.8, 0.8], hitH: 28 },
  sofa: { label: "Sofa", icon: "🛋️", foot: [2, 1], hitH: 62 },
  coffeetable: { label: "Coffee table", icon: "☕", foot: [1.4, 0.9], hitH: 30 },
  bed: { label: "Bed", icon: "🛏️", foot: [2, 2.8], hitH: 58 },
  cushion: { label: "Floor cushion", icon: "🧶", foot: [0.9, 0.9], hitH: 18 },
  bookshelf: { label: "Bookshelf", icon: "📖", foot: [1.5, 0.7], hitH: 96 },
  aquarium: { label: "Aquarium", icon: "🐠", foot: [1.4, 0.7], hitH: 66, tintable: false },
  monstera: { label: "Monstera", icon: "🌱", foot: [0.8, 0.8], hitH: 78 },
  plant: { label: "Potted plant", icon: "🪴", foot: [0.6, 0.6], hitH: 46 },
  floorlamp: { label: "Floor lamp", icon: "💡", hitH: 116, foot: [0.8, 0.8] },
  cat: { label: "Sleeping cat", icon: "🐈", foot: [1.2, 0.8], hitH: 34 },
  frame: { label: "Picture frame", icon: "🖼️", foot: [1.4, 0.3], wall: true, hitH: 100 },
  wallshelf: { label: "Wall shelf", icon: "📚", foot: [1.6, 0.3], wall: true, hitH: 96 },
  mirror: { label: "Round mirror", icon: "🪞", foot: [1.1, 0.3], wall: true, hitH: 96 },
};

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

/** Keep the whole FOOTPRINT on the floor — nothing can hang off the edge.
 *  Wall items are additionally glued to their wall: rot 0 → the right wall
 *  (gy pinned to 0, sliding along gx), rot 1 → the left wall (gx pinned). */
export function clampIsoPlacement(itemKey, gx, gy, size, rot = 0) {
  const item = ISO_ITEMS[itemKey];
  if (!item) return { gx, gy };
  const f = footOf(itemKey, rot);
  if (item.wall) {
    return rot
      ? { gx: 0, gy: Math.max(0, Math.min(size.d - f[1], gy)) }
      : { gx: Math.max(0, Math.min(size.w - f[0], gx)), gy: 0 };
  }
  return {
    gx: Math.max(0, Math.min(size.w - f[0], gx)),
    gy: Math.max(0, Math.min(size.d - f[1], gy)),
  };
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
  const size = { w, d };
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
    const { gx, gy } = clampIsoPlacement(p.item, snapHalf(p.gx), snapHalf(p.gy), size, rot);
    clean.push({ id, item: p.item, gx, gy, ...(rot && { rot }), ...(tint && { tint }) });
    if (clean.length >= ISO_MAX_ITEMS) break;
  }
  return { w, d, placements: clean };
}

/** Ready-made rooms — a happy default plus a couple of moods. Each preset
 *  owns its floor size too. Coordinates must be half-snapped AND in-bounds as
 *  written (the preset test asserts clamp-stability). */
export const ISO_PRESETS = {
  classic: {
    label: "Cozy study",
    icon: "⭐",
    size: { w: 9, d: 7 },
    items: [
      { item: "rug", gx: 3, gy: 2.5 },
      { item: "bookshelf", gx: 2, gy: 0 },
      { item: "desk", gx: 5.5, gy: 0 },
      { item: "stool", gx: 6, gy: 1.5 },
      { item: "monstera", gx: 0.5, gy: 5 },
      { item: "cat", gx: 4, gy: 3 },
      { item: "floorlamp", gx: 7.5, gy: 3 },
      { item: "frame", gx: 0.5, gy: 0 },
    ],
  },
  cabin: {
    label: "Cozy cabin",
    icon: "🪵",
    size: { w: 9, d: 8 },
    items: [
      { item: "squarerug", gx: 1.5, gy: 4, tint: "#9a6a45" },
      { item: "bed", gx: 6.5, gy: 4.5, tint: "#c98a4b" },
      { item: "sofa", gx: 0.5, gy: 1, rot: 1, tint: "#8a5a3b" },
      { item: "coffeetable", gx: 2, gy: 1.5 },
      { item: "bookshelf", gx: 3.5, gy: 0 },
      { item: "floorlamp", gx: 8, gy: 0.5 },
      { item: "monstera", gx: 0.5, gy: 6.5 },
      { item: "plant", gx: 8, gy: 3 },
      { item: "cat", gx: 2.5, gy: 4.5, tint: "#8a5a3b" },
      { item: "cushion", gx: 4.5, gy: 5.5, tint: "#c98a4b" },
      { item: "frame", gx: 1.5, gy: 0, tint: "#6b4a39" },
      { item: "wallshelf", gx: 5.5, gy: 0, tint: "#8a5a3b" },
    ],
  },
  loft: {
    label: "Loft",
    icon: "🌙",
    size: { w: 10, d: 8 },
    items: [
      { item: "bed", gx: 7.5, gy: 0.5, tint: "#5b6b9b" },
      { item: "squarerug", gx: 2.5, gy: 3, tint: "#8a7ac2" },
      { item: "sofa", gx: 2.5, gy: 0.5, tint: "#7568ad" },
      { item: "coffeetable", gx: 3, gy: 2, tint: "#4a3a5b" },
      { item: "aquarium", gx: 0.5, gy: 0.5 },
      { item: "mirror", gx: 0, gy: 3, rot: 1, tint: "#cbd5e8" },
      { item: "floorlamp", gx: 9, gy: 4.5, tint: "#cbd5e8" },
      { item: "monstera", gx: 0.5, gy: 6.5, tint: "#3a3142" },
      { item: "cushion", gx: 6, gy: 5, tint: "#8a7ac2" },
      { item: "cat", gx: 3.5, gy: 4, tint: "#2c2438" },
      { item: "frame", gx: 5.5, gy: 0, tint: "#3a3142" },
      { item: "plant", gx: 9, gy: 6.5 },
    ],
  },
  cafe: {
    label: "Morning café",
    icon: "☕",
    size: { w: 10, d: 7 },
    items: [
      { item: "desk", gx: 3, gy: 0 },
      { item: "rug", gx: 2.5, gy: 2, tint: "#c98a4b" },
      { item: "coffeetable", gx: 3, gy: 3 },
      { item: "stool", gx: 2, gy: 3.5, tint: "#e8b04b" },
      { item: "stool", gx: 4.5, gy: 4, tint: "#e8b04b" },
      { item: "coffeetable", gx: 6.5, gy: 3.5 },
      { item: "stool", gx: 6, gy: 4.5, tint: "#d98a93" },
      { item: "stool", gx: 8, gy: 3.5, tint: "#d98a93" },
      { item: "bookshelf", gx: 0.5, gy: 0 },
      { item: "wallshelf", gx: 6.5, gy: 0, tint: "#9a6a45" },
      { item: "frame", gx: 2.5, gy: 0, tint: "#9a6a45" },
      { item: "aquarium", gx: 8.5, gy: 0.5 },
      { item: "monstera", gx: 9, gy: 5.5 },
      { item: "plant", gx: 0.5, gy: 5.5 },
      { item: "floorlamp", gx: 9, gy: 3.5, tint: "#c98a4b" },
      { item: "cat", gx: 5, gy: 5 },
      { item: "cushion", gx: 8, gy: 5.5, tint: "#d98a93" },
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
    placements: preset.items.map((p) => ({ ...p, id: makeId() })),
  };
}

/** The starter arrangement (the original mock scene). */
export function defaultIsoLayout() {
  return isoPresetLayout("classic");
}
