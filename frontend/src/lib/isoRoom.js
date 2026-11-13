import { furnitureFacingRotation } from "./furnitureFacing";
// The isometric room's decoration model: a resizable W×D tile floor and
// items placed ON the grid as { id, item, gx, gy, tint? } (tile coordinates,
// half-tile snapping). Pure data + functions; projection math lives in
// lib/iso.js and the artwork in the components/Iso*Items modules.

import { cleanShelfDecor } from "./shelfDecor";
import { cleanFurnitureColors } from './furnitureColors';
import { bedDimensions, cleanFurnitureDimensions, RESIZABLE_FURNITURE } from './furnitureDimensions';
import { createIsoPresets } from "./isoPresets";
import { cleanPetTraits, newPetTraits } from "./pets";
import {
  ISO_ENV_KEYS,
  ISO_ITEMS,
  ISO_LIGHTING_KEYS,
  PET_TEMPERS,
  WALL_MODES,
  cleanPetName,
  envHasWalls,
  envOf,
  isStorableLook,
} from "./isoCatalog";

export {
  BUNNY_COATS,
  CAT_COATS,
  DOG_BREEDS,
  ISO_ENVS,
  ISO_ENV_KEYS,
  ISO_ITEMS,
  ISO_ITEM_GROUPS,
  ISO_LIGHTING,
  ISO_LIGHTING_KEYS,
  PET_LOOKS,
  PET_NAME_MAX,
  PET_TEMPERS,
  WALL_MODES,
  cleanPetName,
  envHasWalls,
  envOf,
  isStorableLook,
  petLooksFor,
  petTemper,
  wallModeOf,
} from "./isoCatalog";

export const ISO_SIZE_MIN = 3;
export const ISO_SIZE_MAX = 48;
export const DEFAULT_ISO_SIZE = { w: 9, d: 7 };
// Versioned because normalization occasionally needs to repair an old saved
// arrangement without forever overriding choices the user makes afterward.
export const ISO_LAYOUT_VERSION = 2;
// Shared item cap for editable rooms. Large lots can still be expensive to
// rasterize; scene memoization, camera transforms and dense-scene motion
// treatment handle separate performance costs.
export const ISO_MAX_ITEMS = 150;
// Irregular floors, the full Sims way: a TILE MASK. `mask` is d row-strings
// of w chars ("1" = floor, "0" = void) painted in the panel's floor-plan
// grid; walls and the front lip are computed per tile edge, so ANY drawn
// shape gets correct geometry. A missing mask means a full rectangle (and
// an all-"1" mask normalises back to missing). Legacy corner-cut saves are
// converted to masks on validation.
export const CUT_CORNERS = ["back", "right", "left", "front"];
const TINT_RE = /^#[0-9a-f]{6}$/i;

/** Is `placement`'s centre inside `other`'s footprint? */
function centreOver(placement, other) {
  const f = footOf(placement);
  const cx = placement.gx + f[0] / 2;
  const cy = placement.gy + f[1] / 2;
  const of = footOf(other);
  return cx >= other.gx && cx <= other.gx + of[0] && cy >= other.gy && cy <= other.gy + of[1];
}

/**
 * The seat a persona is placed on, if their centre is over one. `lie` marks
 * furniture you lie on rather than perch on (a bed), which the sprite uses to
 * pick a pose.
 */
export function seatFor(placement, placements) {
  if (!ISO_ITEMS[placement.item]?.persona) return null;
  for (const other of placements) {
    if (other.id === placement.id) continue;
    const seat = ISO_ITEMS[other.item];
    if (!seat?.seat) continue;
    if (centreOver(placement, other)) {
      return { placement: other, height: seat.seat, lie: !!seat.lie };
    }
  }
  // SOFT GROUND (seated life, 2026-08-19): a rug, cushion or blanket under
  // the centre seats a persona cross-legged on the floor — floor-sitting is
  // how a sparse room still offers somewhere to be, and it's peak cozy.
  // `soft: true` tells the occupancy rule a rug seats MANY (it isn't a
  // chair); real seats win the loop above, so a stool ON a rug still reads
  // as the stool. Explicit catalog metadata keeps other flat layers (pools,
  // ponds, snow angels, pet beds and door mats) from becoming human seats.
  for (const other of placements) {
    if (other.id === placement.id) continue;
    const it = ISO_ITEMS[other.item];
    if (!it?.softSeat) continue;
    if (centreOver(placement, other)) {
      // `height` is the resident's HIP lift, not the textile's thickness.
      // Folded legs need their hips about 14px above the floor for the shoes
      // to meet the rug; the old 1.5px value sank the whole pose through it.
      return { placement: other, height: 14, lie: false, soft: true };
    }
  }
  return null;
}

/**
 * The first place a newly-arriving persona should SIT: a free seat, else any
 * soft ground, else null (the caller falls back to standing room). Returns
 * the gx/gy that centres the persona's footprint over the spot — being shown
 * to a chair, as arrival should feel in the seated life.
 */
export function freeSeatSpot(placements, item = "resident") {
  const foot = footOf(item, 0);
  const occupied = new Set();
  for (const p of placements) {
    if (!ISO_ITEMS[p.item]?.persona) continue;
    const s = seatFor(p, placements.filter((o) => o.id !== p.id));
    if (s && !s.soft) occupied.add(s.placement.id);
  }
  const centreOn = (p) => {
    const of = footOf(p);
    return { gx: p.gx + (of[0] - foot[0]) / 2, gy: p.gy + (of[1] - foot[1]) / 2 };
  };
  // Proper seats before lie-on furniture: the first cut took placement
  // order, and arriving home in the Loft put you straight INTO BED — funny
  // once, wrong as a welcome. A bed still beats the floor.
  for (const p of placements) {
    const it = ISO_ITEMS[p.item];
    if (it?.seat && !it.lie && !it.persona && !occupied.has(p.id)) return centreOn(p);
  }
  for (const p of placements) {
    const it = ISO_ITEMS[p.item];
    if (it?.seat && !it.persona && !occupied.has(p.id)) return centreOn(p);
  }
  for (const p of placements) {
    const it = ISO_ITEMS[p.item];
    if (it?.softSeat && !it.persona) return centreOn(p);
  }
  return null;
}

/**
 * May a persona be SET DOWN at gx,gy? The carry-landing rule of the seated
 * life (owner decision, 2026-08-19, from the VC2 reference — people don't
 * pace a study, they settle where you put them):
 *
 *   * a FREE seat under the centre is legal (an occupied one is refused —
 *     two people snapping to one chair's centre is the stacked-mug bug
 *     wearing a face);
 *   * SOFT GROUND (rug/cushion/blanket) is legal and shared — floor-sitting;
 *   * BARE floor is legal anywhere clear of furniture — they just STAND
 *     there (owner, same day: "it is also fine to allow users to drop the
 *     characters anywhere and they are just standing"). Standing is a spot
 *     you chose, not a walk — nobody moves until carried again.
 *
 * Decorate mode uses this same standing/seating rule for characters. Other
 * furniture moves use moveIsoPlacements so rugs and surface props keep their
 * intentional layering without introducing new solid intersections.
 */
export function personaCanSit(gx, gy, layout, placements, selfId) {
  const foot = footOf("resident", 0);
  if (!footprintFree(gx, gy, foot, layout)) return false;
  const others = placements.filter((p) => p.id !== selfId);
  const seat = seatFor({ id: selfId, item: "resident", gx, gy }, others);
  if (seat && !seat.soft) {
    return !others.some((o) => {
      if (!ISO_ITEMS[o.item]?.persona) return false;
      const s = seatFor(o, others);
      return s && !s.soft && s.placement.id === seat.placement.id;
    });
  }
  // Floor drops refuse furniture overlap; soft ground can host several people.
  return !others.some((o) => {
    const it = ISO_ITEMS[o.item];
    if (!it || it.wall || it.persona || it.roamer || it.layer === -1) return false;
    const of = footOf(o);
    return (
      gx < o.gx + of[0] && o.gx < gx + foot[0] && gy < o.gy + of[1] && o.gy < gy + foot[1]
    );
  });
}

/**
 * May a PET be set down at gx,gy? Same open-floor rule as a persona's walk
 * order but WITHOUT the seat exception — there's no seated-cat drawing, so a
 * pet dropped on a chair would float at cushion depth. Rugs stay legal (layer
 * −1 doesn't block), which is where a cat wants to be anyway.
 */
export function petCanStand(gx, gy, layout, placements, selfId, item) {
  const foot = footOf(item, 0);
  if (!footprintFree(gx, gy, foot, layout)) return false;
  return !placements.some((o) => {
    if (o.id === selfId) return false;
    const it = ISO_ITEMS[o.item];
    if (!it || it.wall || it.persona || it.roamer || it.layer === -1) return false;
    const of = footOf(o);
    return (
      gx < o.gx + of[0] && o.gx < gx + foot[0] && gy < o.gy + of[1] && o.gy < gy + foot[1]
    );
  });
}

/**
 * Where a persona is actually drawn once they've been seated, and how deep.
 * Render-time only: the stored gx/gy never changes, so persistence, validation
 * and the drag engine know nothing about it.
 *
 * Which way the SEAT faces decides both. Rot 0/1 keep the backrest at the far
 * edge, so the sitter shifts toward the viewer and paints in FRONT of it; rot
 * 2/3 move it to the near edge, and then they belong BEHIND, with just their
 * head and shoulders over the top. The shift also has to follow the seat's
 * facing axis — odd rotations are the grid transpose, so they face along gx.
 *
 * Depth is forced from the seat rather than derived from the sitter's own
 * footprint: depth is the FRONT CORNER, so a small person centred on a big
 * sofa scores lower than it and would sort behind whichever way it faced.
 */
export function seatedPlacement(persona, seat) {
  const sf = footOf(seat.placement);
  const pf = footOf(persona);
  const seatRot = seat.placement.rot || 0;
  const seatFacing = furnitureFacingRotation(seat.placement.item, seatRot);
  const away = seatFacing >= 2;
  // Longer beds keep the unchanged human rig near the pillow end. Width
  // still centres it; a larger mattress does not scale the character.
  const extraDepth = seat.placement.item === 'bed' ? Math.max(0, bedDimensions(seat.placement).d - 2.8) / 2 : 0;
  const shift = (away ? -0.15 : 0.15) + (away ? extraDepth : -extraDepth);
  const alongGx = seatFacing % 2 === 1;
  return {
    gx: seat.placement.gx + sf[0] / 2 - pf[0] / 2 + (alongGx ? shift : 0),
    gy: seat.placement.gy + sf[1] / 2 - pf[1] / 2 + (alongGx ? 0 : shift),
    _seat: seat.height,
    _seatId: seat.placement.id,
    // A resident inherits the chair's grid transpose, not their old standing
    // rotation. Soft ground has no directional backrest.
    _seatRot: seat.soft ? 0 : seatRot,
    _lie: seat.lie,
    ...(seat.lie && { _lieFacing: seatFacing, _lieRise: ISO_ITEMS[seat.placement.item].lieRise || 0, _lieLift: ISO_ITEMS[seat.placement.item].lieLift || 0 }),
    // The renderer needs the actual lie-on furniture for its foreground
    // bedding layer. This reference exists only on the resolved render copy;
    // stored placements remain the same small JSON objects as before.
    ...(seat.lie && { _lieOn: seat.placement }),
    // Soft-ground seating is the floor-sit promised by seatFor: the rug owns
    // this one override, while chairs leave personality to the character.
    ...(seat.soft && { _seatPose: "crossed" }),
    // The sitter faces AWAY from the backrest. Rot 0/1 put the backrest on
    // the far edge, so the resident faces us; rot 2/3 put it on the near edge,
    // so the resident faces into the room. Keeping this coupled to the real
    // backrest position prevents the impossible desk pose where the chair's
    // back sits between the person and their computer.
    // Rugs and cushions are shared soft ground, not directional furniture;
    // their stored `rot` describes the textile, not where a floor-sitter is
    // looking. Keep those residents welcomingly front-facing.
    _facing: seat.soft ? "front" : away ? "back" : "front",
    // Lying figures rest above the support surface. Near headboards and the
    // duvet have their own foreground cover; a whole chair cannot cover them.
    _depth: isoDepth(seat.placement) + (away && !seat.lie ? -0.01 : 0.01),
  };
}

/**
 * Where a stacked item is drawn once it's resting on `surface`.
 *
 * It KEEPS the spot it was put down on, clamped so its footprint stays fully
 * on the surface. It used to be snapped to the surface's dead centre, which
 * meant one table could only ever display one thing: a mug and a bookstack on
 * the same table drew at exactly the same point, so the second was invisible
 * however far apart they were written. Eight items across the shipped presets
 * were hidden this way — a mug inside a computer, four hall tables each with a
 * mug inside a bookstack.
 *
 * Centring is still the fallback for something too big for what it's on,
 * where there is no offset left to preserve.
 */
export function stackedPlacement(placement, on) {
  const sf = footOf(on.placement);
  const pf = footOf(placement);
  const keep = (v, lo, span) =>
    span <= 0 ? lo + span / 2 : Math.min(Math.max(v, lo), lo + span);
  const gx = keep(placement.gx, on.placement.gx, sf[0] - pf[0]);
  const gy = keep(placement.gy, on.placement.gy, sf[1] - pf[1]);
  return {
    gx,
    // A hair nearer than the surface so the depth sort draws it ON it.
    gy: gy + 0.1,
    _rest: on.height,
    // Nudged by how far back it sits, so two things on one table sort
    // front-to-back against each other rather than by array order.
    _depth: isoDepth(on.placement) + 0.01 + (gy - on.placement.gy) * 0.001,
  };
}

/**
 * The surface a small item is resting on — the same idea as seatFor, applied
 * to objects instead of people.
 *
 * Everything in this room used to sit on the floor, so a desk lamp beside a
 * desk was a desk lamp ON THE FLOOR. Any item marked `stacks` whose centre
 * lands on an item with a `surface` height now renders lifted onto it.
 *
 * Like seating, this is RENDER-TIME ONLY: the stored gx/gy never changes, so
 * persistence, validation and the drag engine need to know nothing about it —
 * pick the table up and whatever was on it simply returns to the floor.
 */
export function surfaceFor(placement, placements) {
  if (!ISO_ITEMS[placement.item]?.stacks) return null;
  let best = null;
  for (const other of placements) {
    if (other.id === placement.id) continue;
    const top = ISO_ITEMS[other.item]?.surface;
    if (!top) continue;
    if (!centreOver(placement, other)) continue;
    // Highest wins, so a mug over both a rug and the table standing on it
    // lands on the table.
    if (!best || top > best.height) best = { placement: other, height: top };
  }
  return best;
}

export const ISO_ITEM_KEYS = Object.keys(ISO_ITEMS);

/** Saved turns: 0 = south, 1 = east, 2 = north, 3 = west for +Z-front models.
 * Odd turns transpose the footprint; rear turns use the GLB's actual geometry.
 * Wall mounts and customized SVG actors keep their two supported orientations. */
export const ROTATIONS = [0, 1, 2, 3];

export function rotationsFor(itemKey) {
  const item = ISO_ITEMS[itemKey];
  return !item || item.wall || item.persona || item.roamer ? 2 : 4;
}

/** Coerce any stored rot into one this item can actually be drawn in. */
export function normalizeRot(itemKey, rot) {
  const n = Number.isInteger(rot) ? ((rot % 4) + 4) % 4 : 0;
  return n < rotationsFor(itemKey) ? n : n % 2;
}

/** The next rotation the ⟳ button should step to. */
export const nextRot = (itemKey, rot = 0) =>
  (normalizeRot(itemKey, rot) + 1) % rotationsFor(itemKey);

/** Footprint for a rotation. Odd turns transpose it; a half turn doesn't
 *  change which tiles are covered, only which way the thing looks. */
export const footOf = (itemOrPlacement, rot) => {
  const placement = typeof itemOrPlacement === 'object' ? itemOrPlacement : null;
  const itemKey = placement ? placement.item : itemOrPlacement;
  const dimensions = placement && cleanFurnitureDimensions(itemKey, placement.dimensions);
  const f = dimensions ? [dimensions.w, dimensions.d] : ISO_ITEMS[itemKey]?.foot || [1, 1];
  const rotation = rot ?? placement?.rot ?? 0;
  return rotation % 2 ? [f[1], f[0]] : f;
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

/** Does a footprint cross any user-drawn interior wall segment? */
function crossesPartition(gx, gy, foot, size) {
  if (!Array.isArray(size.partitions) || !size.partitions.length) return false;
  const right = gx + foot[0];
  const front = gy + foot[1];
  for (const key of size.partitions) {
    if (typeof key !== "string") continue;
    const [plane, atRaw, fromRaw, extra] = key.split(":");
    const at = Number(atRaw);
    const from = Number(fromRaw);
    if (extra !== undefined || !Number.isInteger(at) || !Number.isInteger(from)) continue;
    if (plane === "gy") {
      if (gy < at && front > at && gx < from + 1 && right > from) return true;
    } else if (plane === "gx") {
      if (gx < at && right > at && gy < from + 1 && front > from) return true;
    }
  }
  return false;
}

/** Is a whole footprint on floor and clear of drawn interior walls? */
export function footprintFree(gx, gy, foot, size) {
  if (gx < 0 || gy < 0 || gx + foot[0] > size.w || gy + foot[1] > size.d) return false;
  const x1 = Math.ceil(gx + foot[0]) - 1;
  const y1 = Math.ceil(gy + foot[1]) - 1;
  for (let x = Math.floor(gx); x <= x1; x++) {
    for (let y = Math.floor(gy); y <= y1; y++) {
      if (!tileOn(size, x, y)) return false;
    }
  }
  return !crossesPartition(gx, gy, foot, size);
}

/** Front-lip edges (the floor slab's viewer-facing rim) — correct for ANY
 *  mask, including the rim around a hole punched in the middle of the lot.
 *  plane "gy": along a gy line at `at`, spanning gx from→to; "gx" mirrored. */
export function lipRuns(size) {
  const runs = [];
  for (let y = 0; y <= size.d; y++) {
    let start = null;
    for (let x = 0; x <= size.w; x++) {
      const edge = x < size.w && tileOn(size, x, y - 1) && !tileOn(size, x, y);
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
      const edge = y < size.d && tileOn(size, x - 1, y) && !tileOn(size, x, y);
      if (edge && start === null) start = y;
      if (!edge && start !== null) {
        runs.push({ plane: "gx", at: x, from: start, to: y });
        start = null;
      }
    }
  }
  return runs;
}

/** Consecutive lines sharing a wall position merge into one plane. */
function mergeWallRuns(line, plane, len) {
  const runs = [];
  let start = 0;
  while (start < len) {
    if (line[start] === null) {
      start++;
      continue;
    }
    let end = start + 1;
    while (end < len && line[end] === line[start]) end++;
    runs.push({ plane, at: line[start], from: start, to: end });
    start = end;
  }
  return runs;
}

/**
 * Wall planes to draw, farthest first — the lot's BACK SILHOUETTE only: the
 * first floor tile you meet walking away from the camera along each column
 * (gy walls) and row (gx walls).
 *
 * This used to wall EVERY far-facing edge, which is wrong the moment a floor
 * plan isn't a rectangle. A wall's face is visible through the void it faces,
 * and it stands 118px tall — so a notch painted anywhere but the true back
 * raised a full-height slab through the middle of the room, with only a tile's
 * worth of floor behind it to hide the bottom. Walls belong where there is
 * nothing behind them; a hole in the floor is a hole, and its near rim
 * (`lipRuns`) is all you can actually see of it from here.
 */
export function wallRuns(size) {
  const backY = [];
  for (let x = 0; x < size.w; x++) {
    let y = 0;
    while (y < size.d && !tileOn(size, x, y)) y++;
    backY[x] = y < size.d ? y : null; // a column with no floor gets no wall
  }
  const backX = [];
  for (let y = 0; y < size.d; y++) {
    let x = 0;
    while (x < size.w && !tileOn(size, x, y)) x++;
    backX[y] = x < size.w ? x : null;
  }
  return [
    ...mergeWallRuns(backY, "gy", size.w),
    ...mergeWallRuns(backX, "gx", size.d),
  ].sort((a, b) => a.at - b.at);
}

/** Full-height walls define the room's two original back axes. A later step
 *  in an asymmetric silhouette is a cutaway edge: keeping it low prevents a
 *  recessed wing from becoming a second facade that appears to fall into the
 *  surrounding void. */
export function exteriorWallHeight(run, fullHeight) {
  return run.at > 0 ? Math.min(fullHeight, 48) : fullHeight;
}

/** One user-drawn interior wall unit. `gy:at:from` spans one tile along gx;
 *  `gx:at:from` spans one tile along gy. Outer walls remain environment
 *  architecture, so partitions are restricted to lines strictly inside the
 *  floor and require floor on both sides. */
export const partitionKey = (plane, at, from) => `${plane}:${at}:${from}`;

export function normalizePartitions(raw, size) {
  if (!Array.isArray(raw)) return [];
  const clean = new Set();
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const [plane, atRaw, fromRaw, extra] = value.split(":");
    if (extra !== undefined || !["gx", "gy"].includes(plane)) continue;
    const at = Number(atRaw);
    const from = Number(fromRaw);
    if (!Number.isInteger(at) || !Number.isInteger(from)) continue;
    const valid =
      plane === "gy"
        ? at > 0 && at < size.d && from >= 0 && from < size.w &&
          tileOn(size, from, at - 1) && tileOn(size, from, at)
        : at > 0 && at < size.w && from >= 0 && from < size.d &&
          tileOn(size, at - 1, from) && tileOn(size, at, from);
    if (valid) clean.add(partitionKey(plane, at, from));
  }
  return [...clean].sort();
}

/** Merge adjacent wall units into planes so a long drawn wall is one SVG
 * polygon rather than one polygon per floor cell. */
export function partitionRuns(size) {
  const units = normalizePartitions(size.partitions, size).map((key) => {
    const [plane, at, from] = key.split(":");
    return { plane, at: Number(at), from: Number(from) };
  });
  const groups = new Map();
  for (const unit of units) {
    const key = `${unit.plane}:${unit.at}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(unit.from);
  }
  const runs = [];
  for (const [key, values] of groups) {
    const [plane, atRaw] = key.split(":");
    const sorted = [...values].sort((a, b) => a - b);
    let start = sorted[0];
    let end = start + 1;
    for (const from of sorted.slice(1)) {
      if (from === end) end += 1;
      else {
        runs.push({ plane, at: Number(atRaw), from: start, to: end, partition: true });
        start = from;
        end = from + 1;
      }
    }
    if (start !== undefined) {
      runs.push({ plane, at: Number(atRaw), from: start, to: end, partition: true });
    }
  }
  return runs.sort((a, b) => a.at - b.at || a.from - b.from);
}

/** Renderable interior architecture. Solid wall units merge independently
 * from passable arch units, so dragging the Arch tool across several edges
 * produces one generous opening instead of a row of narrow arches. */
export function partitionPieces(size) {
  const arches = normalizePartitions(size.arches, size);
  const archSet = new Set(arches);
  const walls = partitionRuns({
    ...size,
    partitions: normalizePartitions(size.partitions, size).filter((key) => !archSet.has(key)),
  });
  const archRuns = partitionRuns({ ...size, partitions: arches }).map((run) => ({
    ...run,
    arch: true,
  }));
  return [...walls, ...archRuns].sort(
    (a, b) => a.at - b.at || a.from - b.from || Number(a.arch) - Number(b.arch)
  );
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
export function clampIsoPlacement(itemOrPlacement, gx, gy, size, rot) {
  const itemKey = typeof itemOrPlacement === 'object' ? itemOrPlacement.item : itemOrPlacement;
  rot ??= typeof itemOrPlacement === 'object' ? itemOrPlacement.rot || 0 : 0;
  const item = ISO_ITEMS[itemKey];
  if (!item) return { gx, gy };
  const f = footOf(itemOrPlacement, rot);
  if (item.wall) {
    // Wall decor is two-way by definition — rot picks the wall, and an odd
    // value is the left one. (rotationsFor keeps 2/3 off wall items, but this
    // stays parity-based so a hand-edited save can't glue a frame to nothing.)
    if (rot % 2) {
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
/** Do two placements' footprints overlap on the floor? */
export function footprintsOverlap(a, b) {
  const af = footOf(a);
  const bf = footOf(b);
  return (
    a.gx < b.gx + bf[0] &&
    b.gx < a.gx + af[0] &&
    a.gy < b.gy + bf[1] &&
    b.gy < a.gy + af[1]
  );
}

function overlapArea(a, b) {
  const af = footOf(a), bf = footOf(b);
  return Math.max(0, Math.min(a.gx + af[0], b.gx + bf[0]) - Math.max(a.gx, b.gx)) *
    Math.max(0, Math.min(a.gy + af[1], b.gy + bf[1]) - Math.max(a.gy, b.gy));
}

/** A move is a preview until release. Existing overlaps may improve, while
 * new intersections are refused. Flat rugs, wall mounts and tabletop props
 * retain their intentional layering rather than behaving like solid cabinets. */
export function moveIsoPlacements(placements, id, gx, gy, size) {
  const original = placements.find(p => p.id === id), item = ISO_ITEMS[original?.item];
  if (!item || !Number.isFinite(gx) || !Number.isFinite(gy)) return null;
  if (original.gx === gx && original.gy === gy) return placements;
  const moved = { ...original, gx, gy }, foot = footOf(moved);
  const at = clampIsoPlacement(moved, gx, gy, size);
  if (at.gx !== gx || at.gy !== gy) return null;
  if (!item.wall && !footprintFree(gx, gy, foot, size)) return null;
  if (item.persona) return personaCanSit(gx, gy, size, placements, id)
    ? placements.map(p => p.id === id ? moved : p) : null;
  const attached = supportedItems(placements, original);
  const next = replaceFurniturePlacement(placements, original, moved);
  const surface = surfaceFor(moved, next);
  if ((item.layer || 0) < 0) return next;
  if (placements.some(p => {
    const other = ISO_ITEMS[p.item];
    if (p.id === id || attached.has(p.id) || !other || (other.layer || 0) < 0 || !!other.wall !== !!item.wall) return false;
    if (surface && (p.id === surface.placement.id || !other.stacks)) return false;
    return overlapArea(moved, p) > overlapArea(original, p) + 1e-8;
  })) return null;
  return next;
}

/** Copies furniture customization and size, giving it a new identity and a
 * clear nearby footprint. Characters and pets keep their own identity. */
export function duplicateIsoPlacement(layout, id) {
  const source = layout.placements.find(p => p.id === id), item = ISO_ITEMS[source?.item];
  if (!item || item.unique || item.persona || item.roamer || layout.placements.length >= ISO_MAX_ITEMS) return null;
  let at;
  if (item.wall) {
    const horizontal = (source.rot || 0) % 2 === 0;
    const length = horizontal ? layout.w : layout.d;
    for (let n = 0; n <= length * 2; n++) {
      const candidate = { ...source, ...(horizontal ? { gx: n / 2 } : { gy: n / 2 }) };
      const clamp = clampIsoPlacement(candidate, candidate.gx, candidate.gy, layout);
      if (clamp.gx !== candidate.gx || clamp.gy !== candidate.gy) continue;
      if (layout.placements.some(p => ISO_ITEMS[p.item]?.wall && footprintsOverlap(candidate, p))) continue;
      if (!at || Math.hypot(candidate.gx - source.gx, candidate.gy - source.gy) < Math.hypot(at.gx - source.gx, at.gy - source.gy)) at = candidate;
    }
  } else {
    at = findFreeSpot(source, source.rot || 0, layout, source.gx + .5, source.gy + .5, layout.placements);
  }
  return at ? { ...source, gx: at.gx, gy: at.gy, id: makeId() } : null;
}

/** Resize one piece, keeping its colours and supported items. Added floor must be
 * clear; pre-existing intentional overlap may shrink but cannot grow. */
export function resizeIsoPlacements(placements, id, value, size) {
  const support = placements.find(p => p.id === id);
  if (!support || !RESIZABLE_FURNITURE[support.item]) return null;
  const dimensions = cleanFurnitureDimensions(support.item, value);
  if (value != null && !dimensions) return null;
  const old = cleanFurnitureDimensions(support.item, support.dimensions);
  if (dimensions ? old?.w === dimensions.w && old?.d === dimensions.d : !support.dimensions) return placements;
  const { dimensions: _previous, ...rest } = support;
  const resized = dimensions ? { ...rest, dimensions } : rest;
  const foot = footOf(resized);
  if (!footprintFree(support.gx, support.gy, foot, size)) return null;
  if (ISO_ITEMS[support.item].wall) {
    const at = clampIsoPlacement(resized, support.gx, support.gy, size);
    if (at.gx !== support.gx || at.gy !== support.gy) return null;
  }
  const attachments = supportedItems(placements, support);
  const oldFoot = footOf(support);
  // A rotated monitor can need more depth than the minimum desktop. Keep
  // physical equipment intact and refuse any newly increased overhang.
  for (const p of placements) {
    if (!attachments.get(p.id)?.at) continue;
    const pf = footOf(p);
    if (pf.some((span, axis) => Math.max(0, span - foot[axis]) > Math.max(0, span - oldFoot[axis]) + 1e-8)) return null;
  }
  const occupants = new Set(attachments.keys());
  if (placements.some(p => {
    const item = ISO_ITEMS[p.item];
    if (p.id === id || occupants.has(p.id) || !item || (item.layer || 0) < 0) return false;
    if (!!item.wall !== !!ISO_ITEMS[support.item].wall) return false;
    return overlapArea(resized, p) > overlapArea(support, p) + 1e-8;
  })) return null;
  return replaceFurniturePlacement(placements, support, resized);
}

function supportedItems(placements, support) {
  const attached = new Map();
  for (const p of placements) {
    if (p.id === support.id) continue;
    if (seatFor(p, placements)?.placement.id === support.id) attached.set(p.id, { seated: true });
    const on = surfaceFor(p, placements);
    if (on?.placement.id === support.id) attached.set(p.id, { at: stackedPlacement(p, on) });
  }
  return attached;
}

// The saved transpose/rear transforms are their own inverses. Coordinates
// here use the support's top-left origin, unlike centred authoring geometry.
export function orientSupportPoint(x, y, w, d, rot) {
  const sign = rot >= 2 ? -1 : 1;
  return rot % 2 ? [sign * (y - d / 2) + d / 2, sign * (x - w / 2) + w / 2]
    : [sign * (x - w / 2) + w / 2, sign * (y - d / 2) + d / 2];
}

/** Keep occupants and independently sized desktop props with their support.
 * Props retain local offsets and clamp onto a smaller top; they never scale. */
export function replaceFurniturePlacement(placements, support, replacement) {
  const occupants = supportedItems(placements, support), foot = footOf(replacement), oldFoot = footOf(support);
  const [width, depth] = footOf(replacement, 0);
  return placements.map(p => {
    if (p.id === support.id) return replacement;
    const attachment = occupants.get(p.id);
    if (!attachment) return p;
    const pf = footOf(p);
    if (attachment.seated) return { ...p, gx: snapHalf(replacement.gx + (foot[0] - pf[0]) / 2), gy: snapHalf(replacement.gy + (foot[1] - pf[1]) / 2) };
    const oldRot = support.rot || 0, newRot = replacement.rot || 0;
    const [x, y] = orientSupportPoint(attachment.at.gx - support.gx + pf[0] / 2,
      attachment.at.gy - support.gy + pf[1] / 2, oldFoot[0], oldFoot[1], oldRot);
    const relativeFoot = footOf(p, (p.rot || 0) ^ oldRot);
    const keep = (v, span, part) => part >= span ? span / 2 : Math.min(Math.max(v, part / 2), span - part / 2);
    const [gx, gy] = orientSupportPoint(keep(x, width, relativeFoot[0]), keep(y, depth, relativeFoot[1]), width, depth, newRot);
    const rot = normalizeRot(p.item, (p.rot || 0) ^ oldRot ^ newRot);
    const movedFoot = footOf(p, rot), { rot: _old, ...rest } = p;
    return { ...rest, ...(rot && { rot }), gx: snapHalf(replacement.gx + gx - movedFoot[0] / 2),
      gy: snapHalf(replacement.gy + gy - movedFoot[1] / 2) };
  });
}

/** Is this a piece a new arrival shouldn't be dropped on top of? Flat things
 *  (rugs, ponds, blankets) are MADE to go under furniture and wall decor isn't
 *  on the floor at all, so neither blocks. Everything else does — people
 *  included: two figures on one tile read as a single merged body. */
export function blocksSpawn(itemKey) {
  const item = ISO_ITEMS[itemKey];
  return !!item && !item.wall && (item.layer || 0) >= 0;
}

/** On floor AND clear of what's already standing there. */
export function spotIsClear(gx, gy, itemOrPlacement, rot, size, placements) {
  if (!footprintFree(gx, gy, footOf(itemOrPlacement, rot), size)) return false;
  const me = { ...(typeof itemOrPlacement === 'object' ? itemOrPlacement : { item: itemOrPlacement }), rot, gx, gy };
  return !placements.some((p) => blocksSpawn(p.item) && footprintsOverlap(me, p));
}

/** Nearest half-snapped spot to (nearGx, nearGy) this piece fits in. Pass
 *  `placements` to also require it be clear of the furniture already there. */
export function findFreeSpot(itemOrPlacement, rot, size, nearGx, nearGy, placements = null) {
  const f = footOf(itemOrPlacement, rot);
  let best = null;
  let bestDist = Infinity;
  for (let x = 0; x <= (size.w - f[0]) * 2; x++) {
    for (let y = 0; y <= (size.d - f[1]) * 2; y++) {
      const gx = x / 2;
      const gy = y / 2;
      const ok = placements
        ? spotIsClear(gx, gy, itemOrPlacement, rot, size, placements)
        : footprintFree(gx, gy, f, size);
      if (!ok) continue;
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

/** A placement's painter's depth: its footprint's FRONT corner. */
export function isoDepth(p) {
  const f = footOf(p);
  return p.gx + f[0] + p.gy + f[1];
}

const placementDepth = (p) => (Number.isFinite(p._depth) ? p._depth : isoDepth(p));

const placementLayer = (p) => {
  // Unknown items are skipped by the renderer — but the SORT runs first, so
  // an unguarded lookup here would throw before that guard gets a chance.
  const item = ISO_ITEMS[p.item];
  if (!item) return 0;
  return item.wall ? -2 : item.layer || 0;
};

/** Painter's order: wall decor first (it hangs behind everything), then flat
 *  rugs, then by the front corner's depth. */
export function sortIso(placements) {
  // `_depth` is a render-time override for something riding ON another item.
  // Depth is the FRONT CORNER, so centring a small thing on a big one puts its
  // corner further back than the host's: a 0.8×0.8 resident on a 2×0.85 sofa
  // scores 4.875 against the sofa's 5.35 and gets drawn behind it — you saw
  // the top of their head over the backrest. The old fix nudged them +0.15
  // toward the viewer, which is only ever enough when the seat is about the
  // person's own size (a stool). Riders now inherit their host's depth plus an
  // epsilon, so they sort just in front of it without moving off the cushion.
  return [...placements].sort(
    (a, b) =>
      placementLayer(a) - placementLayer(b) ||
      placementDepth(a) - placementDepth(b) ||
      String(a.id).localeCompare(String(b.id))
  );
}

/** Put opaque interior walls into the same painter's order as furniture.
 *  A run's near end is its front corner, matching `isoDepth` for an item.
 *  This is the cutaway-room rule: furniture beyond a divider paints first
 *  and is hidden by it, while furniture closer to the viewer paints later. */
export function sortIsoScene(placements, partitions = []) {
  // A long opaque wall cannot have one correct painter depth: its left end
  // may be behind a chair while its right end is in front of another. Split
  // SOLID runs into local one-edge panels for sorting, while metadata tells
  // PartitionWall to draw end strokes only at the original run boundaries.
  // Arches remain merged so one dragged opening keeps one continuous curve.
  const localPartitions = partitions.flatMap((partition) => {
    if (partition.arch || partition.to - partition.from <= 1) return [partition];
    return Array.from({ length: partition.to - partition.from }, (_, index) => ({
      ...partition,
      from: partition.from + index,
      to: partition.from + index + 1,
      segmentStart: index === 0,
      segmentEnd: index === partition.to - partition.from - 1,
    }));
  });
  return [
    ...placements.map((placement) => ({
      kind: "item",
      key: `item:${placement.id}`,
      placement,
      layer: placementLayer(placement),
      depth: placementDepth(placement),
      tie: 1,
    })),
    ...localPartitions.map((partition, index) => ({
      kind: "partition",
      key: `partition:${partition.plane}:${partition.at}:${partition.from}:${index}`,
      partition,
      layer: 0,
      depth: partition.at + partition.to,
      // At an exact depth tie, the item is on the viewer's side of the wall.
      tie: 0,
    })),
  ].sort(
    (a, b) =>
      a.layer - b.layer ||
      a.depth - b.depth ||
      a.tie - b.tie ||
      a.key.localeCompare(b.key)
  );
}

/** Connected furniture footprints for the floor-plan editor. Coordinates are
 *  expanded to every touched tile because placements may sit on half-steps.
 *  Keeping each placement intact lets the UI draw a bed as one 2x3 block
 *  instead of six unrelated occupancy marks. */
export function occupiedIsoFootprints(placements = [], size = {}) {
  const maxX = Number.isFinite(size.w) ? size.w : Infinity;
  const maxY = Number.isFinite(size.d) ? size.d : Infinity;
  return placements.flatMap((placement, index) => {
    const item = ISO_ITEMS[placement.item];
    if (!item || item.wall) return [];
    const [fw, fd] = footOf(placement);
    const x0 = Math.max(0, Math.floor(placement.gx));
    const y0 = Math.max(0, Math.floor(placement.gy));
    const x1 = Math.min(maxX, Math.ceil(placement.gx + fw));
    const y1 = Math.min(maxY, Math.ceil(placement.gy + fd));
    if (x1 <= x0 || y1 <= y0) return [];
    return [{
      id: placement.id || `${placement.item}-${index}`,
      item: placement.item,
      label: item.label,
      icon: item.icon,
      x: x0,
      y: y0,
      w: x1 - x0,
      d: y1 - y0,
    }];
  });
}

/** Tile lookup used for warnings and accessible descriptions. Wall decor is
 *  excluded because it hangs above the plan rather than using a floor tile. */
export function occupiedIsoTiles(placements = []) {
  const occupied = new Map();
  for (const footprint of occupiedIsoFootprints(placements)) {
    for (let y = footprint.y; y < footprint.y + footprint.d; y++) {
      for (let x = footprint.x; x < footprint.x + footprint.w; x++) {
        const key = `${x}:${y}`;
        const labels = occupied.get(key) || [];
        if (!labels.includes(footprint.label)) labels.push(footprint.label);
        occupied.set(key, labels);
      }
    }
  }
  return occupied;
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
  let { gx, gy } = clampIsoPlacement(itemKey, snapHalf(want.gx), snapHalf(want.gy), size);
  // clampIsoPlacement is bounds-only by design — it never consults the floor
  // mask. In a courtyard/donut shape the room CENTRE is the hole, so the
  // preferred spawn lands on void: the item renders floating and every drag
  // is refused (IsoRoom won't move a footprint onto void), which reads as
  // "stuck" until a reload, where validation quietly relocates it. Land it
  // on real floor in the first place. Wall items are glued to a wall run by
  // the clamp and have no floor footprint to check.
  //
  // It also knows nothing about the furniture already in the room, which is
  // how adding a second person put them standing INSIDE the one at the desk —
  // one merged body, and the new arrival is auto-selected so it looks like the
  // click went wrong. Prefer a spot nothing is standing on; a packed room
  // still gets its piece, because floor-only is the fallback rather than a
  // refusal.
  if (!item.wall && !spotIsClear(gx, gy, itemKey, 0, size, existing)) {
    const spot =
      findFreeSpot(itemKey, 0, size, gx, gy, existing) ||
      findFreeSpot(itemKey, 0, size, gx, gy);
    if (!spot) return null; // the drawn shape has no room for this piece
    ({ gx, gy } = spot);
  }
  // A new couch joins the room's existing upholstery by default. This is
  // creation-only: recolouring one item never rewrites an existing layout.
  const couch = ["sofa", "armchair"].includes(itemKey);
  const peer = couch && (existing.find(p => p.item === "sofa") || existing.find(p => p.item === "armchair"));
  const tint = peer?.tint && TINT_RE.test(peer.tint) ? peer.tint : undefined;
  return { id: makeId(), item: itemKey, gx: snapHalf(gx), gy: snapHalf(gy),
    ...(tint && { tint }),
    ...(item.roamer && newPetTraits()) };
}

/** Coerce anything (old saves, server data, garbage) into a valid iso layout,
 *  or null if it isn't one. Same tolerance rules as the flat room. */
export function validateIsoLayout(raw) {
  if (!raw || typeof raw !== "object") return null;
  const w = clampIsoSize(raw.w);
  const d = clampIsoSize(raw.d);
  const mask = normalizeMask(raw.mask, w, d) ?? cutsToMask(raw.cuts, w, d);
  const boundarySize = { w, d, ...(mask && { mask }) };
  const arches = normalizePartitions(raw.arches, boundarySize);
  const archSet = new Set(arches);
  // An opening wins if hand-edited/legacy data names the same edge twice.
  // Live editor actions maintain the same invariant before validation.
  const partitions = normalizePartitions(raw.partitions, boundarySize)
    .filter((key) => !archSet.has(key));
  // "room" is the default and stored implicitly.
  const env = ISO_ENV_KEYS.includes(raw.env) && raw.env !== "room" ? raw.env : undefined;
  // Walls are stored only when they OVERRIDE the floor's default — same
  // implicit-default contract as env, so switching back cleans the blob.
  const walls =
    WALL_MODES.includes(raw.walls) && raw.walls !== envOf(env).walls
      ? raw.walls
      : undefined;
  const wallColors = {};
  for (const side of ["left", "right"]) {
    if (typeof raw.wallColors?.[side] === "string" && TINT_RE.test(raw.wallColors[side])) {
      wallColors[side] = raw.wallColors[side];
    }
  }
  const lighting = ISO_LIGHTING_KEYS.includes(raw.lighting) && raw.lighting !== "natural"
    ? raw.lighting
    : undefined;
  const size = {
    w,
    d,
    ...(env && { env }),
    ...(walls && { walls }),
    ...(mask && { mask }),
    ...(partitions.length && { partitions }),
    ...(arches.length && { arches }),
    ...(Object.keys(wallColors).length && { wallColors }),
    ...(lighting && { lighting }),
  };
  const seen = new Set();
  const unique = new Set();
  const clean = [];
  const migrateDeskFacing = raw.version !== ISO_LAYOUT_VERSION;
  const rawPlacements = Array.isArray(raw.placements) ? raw.placements : [];
  for (const p of Array.isArray(raw.placements) ? raw.placements : []) {
    if (!p || typeof p !== "object") continue;
    if (!ISO_ITEMS[p.item]) continue;
    if (!Number.isFinite(p.gx) || !Number.isFinite(p.gy)) continue;
    let id = typeof p.id === "string" && p.id.length <= 32 ? p.id : makeId();
    while (seen.has(id)) id = makeId();
    seen.add(id);
    const tint = typeof p.tint === "string" && TINT_RE.test(p.tint) ? p.tint : undefined;
    // Complete ground GLBs preserve all four saved values. Wall mounts and
    // SVG actors keep their supported pair; `true` is legacy rot 1.
    let rot = normalizeRot(p.item, p.rot === true ? 1 : p.rot);
    // Saved presets from before layout v2 placed every back-wall desk chair
    // at rot 0. That puts its backrest between the resident and a screen
    // directly up-room. Repair that recognizable workstation once; versioned
    // layouts keep the user's rotation exactly as chosen.
    if (
      migrateDeskFacing &&
      p.item === "deskchair" &&
      rot === 0 &&
      rawPlacements.some(
        (other) =>
          (other?.item === "computer" || other?.item === "laptop") &&
          Number.isFinite(other.gx) &&
          Number.isFinite(other.gy) &&
          other.gy < p.gy &&
          p.gy - other.gy <= 3 &&
          Math.abs(other.gx - p.gx) <= 2
      )
    ) {
      rot = 2;
    }
    // Wall decor needs a full-height wall to hang on — outdoors, on a
    // low rail, or when the user turned the walls off, there isn't one.
    if (ISO_ITEMS[p.item].wall && !envHasWalls(env, walls)) continue;
    let { gx, gy } = clampIsoPlacement(p, snapHalf(p.gx), snapHalf(p.gy), size, rot);
    // An item over void tiles is relocated to the nearest floor spot, or
    // dropped if the drawn shape has no room for it at all.
    if (!ISO_ITEMS[p.item].wall && !footprintFree(gx, gy, footOf(p, rot), size)) {
      const spot = findFreeSpot(p, rot, size, gx, gy);
      if (!spot) continue;
      ({ gx, gy } = spot);
    }
    // `unique` items are singletons — you can only be in the room once, so a
    // second one is dropped rather than drawn on top of itself. This is the
    // last line of defence for layouts arriving from OUTSIDE the app (a
    // hand-edited mirror, a server blob, a save written by an older build);
    // the live add path refuses duplicates up front in `addIsoItem`, because
    // dropping one here silently is exactly what made it feel like a bug.
    if (ISO_ITEMS[p.item].unique) {
      if (unique.has(p.item)) continue;
      unique.add(p.item);
    }
    // Pet identity rides the placement (a pet IS a placement): a short name
    // and a temper, both validated here so a hand-edited blob can't smuggle
    // in an essay or an unknown personality. Pets only — furniture with a
    // name is a bug wearing a collar.
    const name = ISO_ITEMS[p.item].roamer ? cleanPetName(p.name) : "";
    const temper =
      ISO_ITEMS[p.item].roamer && PET_TEMPERS.some((t) => t.key === p.temper && t.key !== "mellow")
        ? p.temper
        : undefined;
    // The look (coat pattern / breed) follows the temper contract exactly:
    // pets only, per-species whitelist, default stored implicitly.
    const look = isStorableLook(p.item, p.look) ? p.look : undefined;
    const dimensions = cleanFurnitureDimensions(p.item, p.dimensions);
    clean.push({
      id,
      item: p.item,
      gx,
      gy,
      ...(rot && { rot }),
      ...(dimensions && { dimensions }),
      ...(tint && { tint }),
      ...(cleanShelfDecor(p.item, p.decor) && { decor: cleanShelfDecor(p.item, p.decor) }),
      ...(cleanFurnitureColors(p.item, p.colors) && { colors: cleanFurnitureColors(p.item, p.colors) }),
      ...(name && { name }),
      ...(temper && { temper }),
      ...(look && { look }),
      ...(ISO_ITEMS[p.item].roamer && cleanPetTraits(p)),
      ...(ISO_ITEMS[p.item].toggleable && p.off === true && { off: true }),
    });
    if (clean.length >= ISO_MAX_ITEMS) break;
  }
  return {
    version: ISO_LAYOUT_VERSION,
    w,
    d,
    ...(env && { env }),
    ...(walls && { walls }),
    ...(mask && { mask }),
    ...(partitions.length && { partitions }),
    ...(arches.length && { arches }),
    ...(Object.keys(wallColors).length && { wallColors }),
    ...(lighting && { lighting }),
    placements: clean,
  };
}

/** Ready-made rooms. Decorating rules that make these read as REAL rooms
 *  (learned from user feedback — floating mid-room furniture looks terrible):
 *  big furniture sits FLUSH against a wall (gy 0 or gx 0, or the room edge);
 *  seating groups share a centreline with their table; rugs go UNDER a
 *  furniture group, not beside it; small accents (plants, lamps) take
 *  corners; the centre stays walkable. Coordinates must be half-snapped and
 *  in-bounds as written — the preset test asserts clamp-stability. */
export const ISO_PRESETS = createIsoPresets(DEFAULT_ISO_SIZE);

export const ISO_PRESET_KEYS = Object.keys(ISO_PRESETS);

/** What a brand-new install opens on — the ⭐ in the Room panel marks it. */
export const DEFAULT_ISO_PRESET = "loft";

export function isoPresetLayout(key) {
  const preset = ISO_PRESETS[key] || ISO_PRESETS[DEFAULT_ISO_PRESET];
  return {
    version: ISO_LAYOUT_VERSION,
    w: preset.size.w,
    d: preset.size.d,
    ...(preset.size.env && { env: preset.size.env }),
    ...(preset.size.walls && { walls: preset.size.walls }),
    ...(preset.size.mask && { mask: [...preset.size.mask] }),
    ...(preset.size.partitions && { partitions: [...preset.size.partitions] }),
    ...(preset.size.arches && { arches: [...preset.size.arches] }),
    ...(preset.size.cuts && { cuts: preset.size.cuts.map((c) => ({ ...c })) }),
    ...(preset.size.wallColors && { wallColors: { ...preset.size.wallColors } }),
    ...(preset.size.lighting && { lighting: preset.size.lighting }),
    placements: preset.items.map((p) => ({ ...p, id: makeId() })),
  };
}

/** The starter arrangement.
 *  Run through the validator like every other layout: it was the one layout in
 *  the app that skipped it, so the layout nobody saved obeyed slightly
 *  different invariants (half-snapping, clamping, mask normalisation, the
 *  `cuts`→`mask` conversion) from every layout people do save. */
export function defaultIsoLayout() {
  return validateIsoLayout(isoPresetLayout(DEFAULT_ISO_PRESET));
}
