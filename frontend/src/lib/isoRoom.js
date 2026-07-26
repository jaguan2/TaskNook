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
export const ISO_ITEMS = {
  rug: { label: "Round rug", icon: "🟣", foot: [3.5, 2.5], layer: -1, hitH: 10 },
  desk: { label: "Workstation", icon: "🖥️", foot: [2.5, 1.05], hitH: 84, tintable: false },
  stool: { label: "Stool", icon: "🪑", foot: [0.8, 0.8], hitH: 28 },
  bookshelf: { label: "Bookshelf", icon: "📖", foot: [1.5, 0.7], hitH: 96 },
  monstera: { label: "Monstera", icon: "🌱", foot: [0.8, 0.8], hitH: 78 },
  plant: { label: "Potted plant", icon: "🪴", foot: [0.6, 0.6], hitH: 46 },
  floorlamp: { label: "Floor lamp", icon: "🛋️", hitH: 116, foot: [0.8, 0.8] },
  cat: { label: "Sleeping cat", icon: "🐈", foot: [1.2, 0.8], hitH: 34 },
};

export const ISO_ITEM_KEYS = Object.keys(ISO_ITEMS);

/** Half-tile snapping: fine enough to feel free, aligned enough to feel tidy. */
export const snapHalf = (v) => Math.round(v * 2) / 2;

export const clampIsoSize = (v) =>
  Math.max(ISO_SIZE_MIN, Math.min(ISO_SIZE_MAX, Math.round(Number(v) || DEFAULT_ISO_SIZE.w)));

/** Keep the whole FOOTPRINT on the floor — nothing can hang off the edge. */
export function clampIsoPlacement(itemKey, gx, gy, size) {
  const item = ISO_ITEMS[itemKey];
  if (!item) return { gx, gy };
  return {
    gx: Math.max(0, Math.min(size.w - item.foot[0], gx)),
    gy: Math.max(0, Math.min(size.d - item.foot[1], gy)),
  };
}

/** Painter's order: flat rugs first, then by the front corner's depth. */
export function sortIso(placements) {
  const depth = (p) => {
    const f = ISO_ITEMS[p.item].foot;
    return p.gx + f[0] + p.gy + f[1];
  };
  return [...placements].sort(
    (a, b) =>
      (ISO_ITEMS[a.item].layer || 0) - (ISO_ITEMS[b.item].layer || 0) ||
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
  // Spawn near the room centre, fanning repeated adds so copies don't stack.
  const n = existing.length;
  const { gx, gy } = clampIsoPlacement(
    itemKey,
    snapHalf(size.w / 2 - item.foot[0] / 2 + ((n % 4) - 1.5)),
    snapHalf(size.d / 2 - item.foot[1] / 2 + ((Math.floor(n / 4) % 3) - 1)),
    size
  );
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
    const { gx, gy } = clampIsoPlacement(p.item, snapHalf(p.gx), snapHalf(p.gy), size);
    clean.push({ id, item: p.item, gx, gy, ...(tint && { tint }) });
    if (clean.length >= ISO_MAX_ITEMS) break;
  }
  return { w, d, placements: clean };
}

/** The starter arrangement (the original mock scene). */
export function defaultIsoLayout() {
  const items = [
    { item: "rug", gx: 3, gy: 2.5 },
    { item: "bookshelf", gx: 2, gy: 0 },
    { item: "desk", gx: 5.5, gy: 0 },
    { item: "stool", gx: 6, gy: 1.5 },
    { item: "monstera", gx: 0.5, gy: 5 },
    { item: "cat", gx: 4, gy: 3 },
    { item: "floorlamp", gx: 7.5, gy: 3 },
  ];
  return {
    ...DEFAULT_ISO_SIZE,
    placements: items.map((p) => ({ ...p, id: makeId() })),
  };
}
