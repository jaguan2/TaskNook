import { CHARACTER_PRESETS } from "./characterPresets";
import { deriveNpcCharacter } from "./visiting";
import { ISO_ITEMS, stackedPlacement } from "./isoRoom";

// Fixed places are authored scenes, not editable home layouts. A surface's
// height lifts its floor, architecture, furniture, shadows AND seat anchors.
const prop = (id, item, gx, gy, extra = {}) => ({ id, item, gx, gy, ...extra });
export const COMMON_PLACES = {
  "common-cottage": {
    id: "common-cottage", label: "Common Cottage", icon: "🏡",
    description: "A shared study, soft lounge and raised window nook",
    w: 11, d: 9,
    surfaces: {
      ground: { gx: 0, gy: 0, dx: 11, dy: 9, z: 0, color: "#b29378" },
      nook: { gx: 0, gy: 0, dx: 4.4, dy: 3.1, z: 36, color: "#c5aa87" },
    },
    seats: [
      { id: "window-left", label: "Window armchair", level: "nook", gx: 0.8, gy: 1.325, height: 22, furniture: "nook-chair-left" },
      { id: "window-right", label: "Reading armchair", level: "nook", gx: 2.8, gy: 1.325, height: 22, furniture: "nook-chair-right" },
      { id: "study-left", label: "Left study desk", level: "ground", gx: 6.4, gy: 2.8, height: 24, facing: "back", furniture: "study-chair-left" },
      { id: "study-right", label: "Right study desk", level: "ground", gx: 8.6, gy: 2.8, height: 24, facing: "back", furniture: "study-chair-right" },
      { id: "lounge-left", label: "Sofa by the plants", level: "ground", gx: 2.65, gy: 5.975, height: 22, furniture: "lounge-sofa" },
      { id: "lounge-right", label: "Sofa by the lamp", level: "ground", gx: 3.85, gy: 5.975, height: 22, furniture: "lounge-sofa" },
    ],
    arrivalSeat: "study-right",
    neighbours: [
      { username: "kai", label: "Kai", seatId: "window-left", look: "fall-guy" },
      { username: "luna", label: "Luna", seatId: "study-left", look: "lofi-girl" },
      { username: "sora", label: "Sora", seatId: "lounge-right", look: "school-girl" },
    ],
    props: [
      prop("nook-shelf", "bookshelf", 2.8, 0, { level: "nook", tint: "#95704f" }),
      prop("nook-rug", "persianrug", 0.4, 0.7, { level: "nook", tint: "#a96e62" }),
      prop("nook-chair-left", "armchair", 0.7, 1.15, { level: "nook", tint: "#869b78" }),
      prop("nook-chair-right", "armchair", 2.7, 1.15, { level: "nook", tint: "#b58a73" }),
      prop("nook-table", "sidetable", 1.9, 1.6, { level: "nook", tint: "#987351" }),
      prop("nook-lamp", "tablelamp", 1.9, 1.6, { level: "nook", on: "nook-table", tint: "#d9b77e" }),
      prop("nook-fern", "fern", 0.15, 0.3, { level: "nook" }),
      prop("study-shelf", "bookshelf", 9.1, 0, { tint: "#95704f" }),
      prop("study-desk-left", "desk", 6, 1.3, { tint: "#b99775" }),
      prop("study-desk-right", "desk", 8.2, 1.3, { tint: "#b99775" }),
      prop("study-chair-left", "deskchair", 6.4, 2.95, { rot: 2, tint: "#7c9993" }),
      prop("study-chair-right", "deskchair", 8.6, 2.95, { rot: 2, tint: "#b28caa" }),
      prop("study-lamp", "desklamp", 6.1, 1.4, { on: "study-desk-left", tint: "#dfbf84" }),
      prop("study-orchid", "orchid", 9.5, 1.5, { on: "study-desk-right" }),
      prop("tea-counter", "counter", 0, 5, { rot: 1, tint: "#93a08b" }),
      prop("tea-kettle", "kettle", 0.2, 5.2, { on: "tea-counter", tint: "#d7b079" }),
      prop("tea-mug", "mug", 0.3, 6, { on: "tea-counter", tint: "#eed8b8" }),
      prop("tea-plant", "snakeplant", 0.2, 7.2),
      prop("lounge-rug", "ovalrug", 2.4, 5.4, { tint: "#b88c78" }),
      prop("lounge-sofa", "sofa", 2.65, 5.8, { tint: "#88a195" }),
      prop("lounge-table", "coffeetable", 3.1, 7.2, { tint: "#b99775" }),
      prop("lounge-books", "bookstack", 3.3, 7.25, { on: "lounge-table" }),
      prop("lounge-cup", "mug", 4.25, 7.3, { on: "lounge-table", tint: "#eed8b8" }),
      prop("lounge-lamp", "floorlamp", 5.6, 5.7, { tint: "#e0bd86" }),
      prop("lounge-monstera", "monstera", 1.1, 4.3),
      prop("entry-dresser", "dresser", 8, 5.4, { tint: "#95704f" }),
      prop("entry-succulent", "succulent", 8.2, 5.45, { on: "entry-dresser" }),
    ],
  },
};

// Reuse the home renderer's support and depth rules so tabletop details sit
// on the catalog's actual surface and paint after their supporting furniture.
export function resolveCommonProps(scene) {
  return scene.props.map((p) => {
    if (!p.on) return p;
    const host = scene.props.find((candidate) => candidate.id === p.on);
    return { ...p, ...stackedPlacement(p, { placement: host, height: ISO_ITEMS[host.item].surface }) };
  });
}

export function createCommonSession(sceneId) {
  const scene = COMMON_PLACES[sceneId];
  if (!scene) return null;
  const occupants = scene.neighbours.map((neighbour) => {
    const baseline = deriveNpcCharacter(neighbour.username);
    const look = CHARACTER_PRESETS.find((p) => p.key === neighbour.look);
    return { ...neighbour, character: { ...look.character, skin: baseline.skin } };
  });
  return { sceneId, guestSeatId: scene.arrivalSeat, occupants };
}

export function availableCommonSeats(session) {
  const scene = COMMON_PLACES[session?.sceneId];
  if (!scene) return [];
  const occupied = new Set(session.occupants.map((person) => person.seatId));
  return scene.seats.filter((seat) => !occupied.has(seat.id));
}

// A failed choice preserves the session; callers can give feedback without
// a transient disappearance or moving a neighbour out of their chair.
export function settleCommonGuest(session, seatId) {
  if (!availableCommonSeats(session).some((seat) => seat.id === seatId)) return session;
  return session.guestSeatId === seatId ? session : { ...session, guestSeatId: seatId };
}
