import { CHARACTER_PRESETS } from "./characterPresets";
import { deriveNpcCharacter } from "./visiting";
import { ISO_ITEMS, stackedPlacement } from "./isoRoom";

// Fixed places are authored scenes, not editable home layouts. A surface's
// height lifts its floor, architecture, furniture, shadows AND seat anchors.
const prop = (id, item, gx, gy, extra = {}) => ({ id, item, gx, gy, ...extra });
export const COMMON_PLACES = {
  "common-cottage": {
    id: "common-cottage", label: "Common Cottage", icon: "🏡",
    kind: "cottage",
    ariaLabel: "Common Cottage: study, lounge and raised reading nook",
    description: "A shared study, soft lounge and raised window nook",
    w: 11, d: 9,
    surfaces: {
      ground: { gx: 0, gy: 0, dx: 11, dy: 9, z: 0, color: "#ad8667" },
      nook: { gx: 0, gy: 0, dx: 4.4, dy: 3.1, z: 36, color: "#c8a27a" },
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
      prop("nook-books", "bookstack", 2.25, 1.65, { level: "nook", on: "nook-table" }),
      prop("nook-curtain", "curtain", 0, 0.45, { level: "nook", rot: 1, tint: "#a86155" }),
      prop("nook-hanging-plant", "hangplant", 0, 2.45, { level: "nook", rot: 1, tint: "#8d6d4f" }),
      prop("nook-sconce", "sconce", 4.05, 0, { level: "nook", tint: "#d9b77e" }),
      prop("nook-fern", "fern", 0.15, 0.3, { level: "nook" }),
      prop("study-shelf", "bookshelf", 9.1, 0, { tint: "#95704f" }),
      prop("study-corkboard", "corkboard", 4.65, 0, { tint: "#a96e62" }),
      prop("study-curtain", "curtain", 6.1, 0, { tint: "#8a5b62" }),
      prop("study-fairy-lights", "fairylights", 8.6, 0),
      prop("study-desk-left", "desk", 6, 1.3, { tint: "#b99775" }),
      prop("study-desk-right", "desk", 8.2, 1.3, { tint: "#b99775" }),
      prop("study-chair-left", "deskchair", 6.4, 2.95, { rot: 2, tint: "#7c9993" }),
      prop("study-chair-right", "deskchair", 8.6, 2.95, { rot: 2, tint: "#b28caa" }),
      prop("study-lamp", "desklamp", 6.1, 1.4, { on: "study-desk-left", tint: "#dfbf84" }),
      prop("study-mug", "mug", 7.05, 1.55, { on: "study-desk-left", tint: "#d9bfa0" }),
      prop("study-books", "bookstack", 8.3, 1.5, { on: "study-desk-right" }),
      prop("study-mushroom-lamp", "mushroomlamp", 9.15, 1.45, { on: "study-desk-right", tint: "#cf836f" }),
      prop("study-orchid", "orchid", 9.5, 1.5, { on: "study-desk-right" }),
      prop("tea-counter", "counter", 0, 5, { rot: 1, tint: "#93a08b" }),
      prop("tea-kettle", "kettle", 0.2, 5.2, { on: "tea-counter", tint: "#d7b079" }),
      prop("tea-mug", "mug", 0.3, 6, { on: "tea-counter", tint: "#eed8b8" }),
      prop("tea-plant", "snakeplant", 0.2, 7.2),
      prop("lounge-wall-frame", "frame", 0, 3.55, { rot: 1, tint: "#a96658" }),
      prop("lounge-wall-shelf", "wallshelf", 0, 6.25, { rot: 1, tint: "#8d6a4d" }),
      prop("lounge-rug", "persianrug", 2.15, 5.15, { tint: "#a96962" }),
      prop("lounge-sofa", "sofa", 2.65, 5.8, { tint: "#88a195" }),
      prop("lounge-table", "coffeetable", 3.1, 7.2, { tint: "#b99775" }),
      prop("lounge-books", "bookstack", 3.3, 7.25, { on: "lounge-table" }),
      prop("lounge-cup", "mug", 4.25, 7.3, { on: "lounge-table", tint: "#eed8b8" }),
      prop("lounge-candle", "candle", 3.95, 7.55, { on: "lounge-table", tint: "#d7a261" }),
      prop("lounge-lamp", "floorlamp", 5.6, 5.7, { tint: "#e0bd86" }),
      prop("lounge-monstera", "monstera", 1.1, 4.3),
      prop("lounge-palm", "palm", 0.65, 7.8),
      prop("lounge-basket", "basket", 1.75, 7.65, { tint: "#a67b58" }),
      prop("lounge-cushion", "cushion", 5.15, 7.45, { tint: "#c88c75" }),
      prop("entry-dresser", "dresser", 8, 5.4, { tint: "#95704f" }),
      prop("entry-succulent", "succulent", 8.2, 5.45, { on: "entry-dresser" }),
      prop("entry-lightjar", "lightjar", 8.85, 5.5, { on: "entry-dresser", tint: "#d9b77e" }),
      prop("entry-runner", "runner", 7.35, 7.65, { tint: "#8c6961" }),
      prop("entry-coatrack", "coatrack", 9.9, 7.35, { tint: "#795b45" }),
      prop("entry-fern", "fern", 10.05, 5.85),
    ],
  },
  "willow-pond": {
    id: "willow-pond", label: "Willow Pond", icon: "🌿",
    kind: "garden",
    ariaLabel: "Willow Pond: garden study terrace, pond bench and picnic",
    description: "A leafy pond, stone study terrace and picnic lawn",
    w: 12, d: 9,
    surfaces: {
      ground: { gx: 0, gy: 0, dx: 12, dy: 9, z: 0, color: "#71845f", style: "grass" },
      patio: { gx: 0.5, gy: 4.6, dx: 5.2, dy: 3.7, z: 4, color: "#b79a78", style: "stone" },
    },
    seats: [
      { id: "patio-left", label: "Terrace study chair", level: "patio", gx: 1.3, gy: 5.9, height: 19, facing: "back", furniture: "patio-chair-left" },
      { id: "patio-right", label: "Garden study chair", level: "patio", gx: 4, gy: 5.2, height: 19, furniture: "patio-chair-right" },
      { id: "pond-bench-left", label: "Willow bench left", level: "ground", gx: 7.45, gy: 4.5, height: 16, furniture: "pond-bench" },
      { id: "pond-bench-right", label: "Willow bench right", level: "ground", gx: 8.2, gy: 4.5, height: 16, furniture: "pond-bench" },
      { id: "picnic-left", label: "Picnic cushion left", level: "ground", gx: 9.3, gy: 6.25, height: 13, furniture: "picnic-cushion-left" },
      { id: "picnic-right", label: "Picnic cushion right", level: "ground", gx: 10.35, gy: 6.75, height: 13, furniture: "picnic-cushion-right" },
    ],
    arrivalSeat: "patio-right",
    neighbours: [
      { username: "luna", label: "Luna", seatId: "patio-left", look: "lofi-girl" },
      { username: "kai", label: "Kai", seatId: "pond-bench-left", look: "fall-guy" },
      { username: "mochi", label: "Mochi", seatId: "picnic-right", look: "cozy-gamer" },
    ],
    props: [
      prop("pond", "pond", 7.35, 1.25),
      prop("rear-willow", "tree", 5.8, 0.1, { tint: "#557154" }),
      prop("rear-birch", "birch", 10.25, 0.2, { tint: "#78906c" }),
      prop("left-tree", "tree", 0.3, 0.65, { tint: "#60765a" }),
      prop("rear-shrub-left", "bush", 7.15, 0.1, { tint: "#496849" }),
      prop("rear-shrub-right", "bush", 8.45, 0.05, { tint: "#526f4e" }),
      prop("rear-bush", "bush", 4.9, 0.55, { tint: "#496846" }),
      prop("pond-rock-left", "rock", 6.7, 1.4, { tint: "#817b6c" }),
      prop("pond-rock-right", "rock", 10.55, 2.8, { tint: "#82796c" }),
      prop("pond-rock-rear", "rock", 9.65, 0.75, { tint: "#79776d" }),
      prop("pond-rock-front", "rock", 8.9, 3.65, { tint: "#8a806f" }),
      prop("pond-bush-left", "bush", 6.25, 2.6, { tint: "#557252" }),
      prop("pond-bush-right", "bush", 10.55, 1.15, { tint: "#607c59" }),
      prop("pond-fern-left", "fern", 6.05, 1.75, { tint: "#5d7d55" }),
      prop("pond-fern-right", "fern", 10.75, 3.2, { tint: "#66825d" }),
      prop("pond-flowerbank", "flowerbed", 5.55, 2.75, { tint: "#c98f83" }),
      prop("pond-flowers", "flowerbed", 9.85, 3.65, { tint: "#d7a170" }),
      prop("pond-wildflowers", "flowers", 6.4, 3.8, { tint: "#d6b06f" }),
      prop("pond-tulips", "tulips", 11.2, 2.2, { tint: "#d78f88" }),
      prop("birdbath", "birdbath", 4.85, 1.7, { tint: "#8c8a79" }),
      prop("pond-bench", "bench", 7.4, 4.45, { tint: "#9a6f4d" }),
      prop("patio-table", "diningtable", 2.25, 5.25, { level: "patio", tint: "#9a704f" }),
      prop("patio-chair-left", "chair", 1.3, 5.9, { level: "patio", rot: 2, tint: "#8d664a" }),
      prop("patio-chair-right", "chair", 4, 5.2, { level: "patio", tint: "#8d664a" }),
      prop("patio-laptop", "laptop", 2.45, 5.35, { level: "patio", on: "patio-table" }),
      prop("patio-books", "bookstack", 3.35, 5.35, { level: "patio", on: "patio-table" }),
      prop("patio-mug", "mug", 3.15, 5.75, { level: "patio", on: "patio-table", tint: "#e5c89d" }),
      prop("patio-radio", "radio", 2.25, 5.2, { level: "patio", on: "patio-table", tint: "#8d6953" }),
      prop("patio-seedlings", "seedtray", 3.7, 5.2, { level: "patio", on: "patio-table" }),
      prop("patio-fern", "fern", 0.7, 6.9, { level: "patio" }),
      prop("patio-palm", "palm", 0.55, 4.85, { level: "patio", tint: "#5e7857" }),
      prop("patio-snakeplant", "snakeplant", 4.95, 4.85, { level: "patio", tint: "#6d865e" }),
      prop("patio-lightjar", "lightjar", 4.7, 7.45, { level: "patio", tint: "#d8b675" }),
      prop("patio-watering-can", "wateringcan", 4.75, 7.3, { level: "patio", tint: "#93a798" }),
      prop("picnic-rug", "picnic", 9.15, 5.9),
      prop("picnic-cushion-left", "cushion", 9.3, 6.25, { tint: "#d9a273" }),
      prop("picnic-cushion-right", "cushion", 10.35, 6.75, { tint: "#80947b" }),
      prop("picnic-basket", "basket", 9.2, 7.25, { tint: "#a47754" }),
      prop("picnic-books", "bookstack", 10.45, 6.05),
      prop("picnic-fruit", "fruitbowl", 10.6, 7.35),
      prop("picnic-teapot", "teapot", 9.95, 7.45, { tint: "#d7b88d" }),
      prop("picnic-cat", "cat", 11.05, 6.8, { tint: "#8b6552" }),
      prop("path-lantern-left", "lantern", 1.05, 8.05, { tint: "#987252" }),
      prop("path-lantern-middle", "lantern", 6.35, 6.5, { tint: "#987252" }),
      prop("path-lantern-right", "lantern", 10.9, 5.1, { tint: "#987252" }),
      prop("front-flowers-left", "flowers", 0.5, 8.15, { tint: "#d69b71" }),
      prop("front-flowerbed", "flowerbed", 2.0, 8.15, { tint: "#cf8f83" }),
      prop("front-flowers-right", "flowers", 11.05, 7.9, { tint: "#d7b66f" }),
      prop("front-bush", "bush", 11.15, 8.0, { tint: "#587451" }),
      prop("front-log", "log", 6.5, 8.0, { tint: "#826044" }),
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
