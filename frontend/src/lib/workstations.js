import { project } from "./iso";
import { footOf, isoDepth, ISO_ITEMS, seatedPlacement, stackedPlacement, surfaceFor } from "./isoRoom";

// Keyboard decks are shared by the artwork and the contact resolver. Heights
// are measured above their supporting desktop, never above the room floor.
export const COMPUTER_KEYBOARD = { gx: 0.22, gy: 0.66, dx: 0.7, dy: 0.22, h: 2 };
export const LAPTOP_KEYBOARD = { gx: 0.12, gy: 0.25, dx: 0.48, dy: 0.13, h: 3 };

function keyboardOn(equipment, height) {
  const keyboard = equipment.item === "computer" ? COMPUTER_KEYBOARD : LAPTOP_KEYBOARD;
  const transpose = (equipment.rot || 0) % 2 === 1;
  const point = (fraction) => {
    const gx = keyboard.gx + keyboard.dx * fraction;
    const gy = keyboard.gy + keyboard.dy / 2;
    return { gx: equipment.gx + (transpose ? gy : gx), gy: equipment.gy + (transpose ? gx : gy) };
  };
  return { hands: [point(0.3), point(0.7)], height: height + keyboard.h, rot: equipment.rot || 0 };
}

/** Render-only equipment ownership; a computer on the floor equips no desk. */
export function resolveWorkstations(placements) {
  const desks = new Map(placements.filter((p) => p.item === "desk").map((desk) => [desk.id, {
    desk,
    equipped: false,
    ...keyboardOn({ ...desk, item: "laptop" }, ISO_ITEMS.desk.surface),
  }]));
  for (const equipment of placements) {
    if (equipment.item !== "computer" && equipment.item !== "laptop") continue;
    const on = surfaceFor(equipment, placements);
    const station = on && desks.get(on.placement.id);
    if (!station || station.equipped) continue;
    const resolved = { ...equipment, ...stackedPlacement(equipment, on) };
    Object.assign(station, { equipped: true, ...keyboardOn(resolved, on.height) });
  }
  return desks;
}

/** Keyboard contacts in the seated sprite's own coordinate system. */
export function seatedWorkTarget(person, seat, stations) {
  if (seat.soft || seat.lie || seat.placement.item !== "deskchair") return null;
  const rot = seat.placement.rot || 0;
  const [w, d] = footOf(person.item, person.rot);
  const centre = { gx: person.gx + w / 2, gy: person.gy + d / 2 };
  const direction = [[0, 1], [1, 0], [0, -1], [-1, 0]][rot];
  let best = null;
  let distance = Infinity;
  for (const station of stations.values()) {
    if (rot !== (station.rot + 2) % 4) continue;
    const a = station.hands[0];
    const b = station.hands[1];
    const dx = (a.gx + b.gx) / 2 - centre.gx;
    const dy = (a.gy + b.gy) / 2 - centre.gy;
    const ahead = dx * direction[0] + dy * direction[1];
    const across = Math.abs(dx * direction[1] - dy * direction[0]);
    const reach = Math.hypot(dx, dy);
    // Facing the keyboard matters. Do not reach through the backrest, across
    // another bay, or toward a desk too far away for this small seated body.
    if (ahead <= 0 || ahead > 1.15 || across > 0.7 || reach >= distance) continue;
    best = station;
    distance = reach;
  }
  if (!best) return null;
  const origin = project(centre.gx, centre.gy);
  const mirror = rot % 2 ? -1 : 1;
  const hands = best.hands.map((hand) => {
    const at = project(hand.gx, hand.gy);
    return { x: (at.x - origin.x) * mirror, y: at.y - origin.y + seat.height - best.height };
  }).sort((a, b) => a.x - b.x);
  return { hands, deskDepth: isoDepth(best.desk) };
}

/** A wide desktop's front corner must not bury a sitter on its near edge. */
export function orderWorkstationSeats(placements, stations) {
  const depths = new Map();
  for (const p of placements) {
    if (p.item !== "deskchair" || (p.rot || 0) < 2) continue;
    const seat = { placement: p, height: ISO_ITEMS.deskchair.seat };
    const sitter = { item: "resident", ...seatedPlacement({ item: "resident" }, seat) };
    const target = seatedWorkTarget(sitter, seat, stations);
    if (!target) continue;
    // The empty chair keeps this order too: carrying its sitter away must not
    // make its cushion disappear behind the desk again.
    depths.set(p.id, Math.max(isoDepth(p), target.deskDepth + 0.03));
  }
  return placements.map((p) => {
    if (depths.has(p.id)) return { ...p, _depth: depths.get(p.id) };
    if (depths.has(p._seatId)) return { ...p, _depth: depths.get(p._seatId) - 0.01 };
    return p;
  });
}
