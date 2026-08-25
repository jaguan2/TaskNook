import { createIsoSeasonalPresets } from "./isoSeasonalPresets";

/**
 * Ready-made isometric rooms.
 *
 * Presets are data rather than room-engine behavior. Keeping them in their
 * own module lets future rooms grow without making geometry, placement, and
 * validation code harder to navigate.
 */
export function createIsoPresets(defaultIsoSize) {
  return {
  home: {
    label: "Shared home",
    icon: "🏡",
    size: {
      w: 14,
      d: 11,
      env: "room",
      wallColors: { left: "#9f756b", right: "#765d65" },
      lighting: "golden",
      // The reference is not a rectangle decorated into zones: its silhouette
      // does the work. A recessed sleeping wing occupies the back-left and the
      // kitchen projects from the right. The extension begins one row AFTER
      // the bedroom threshold: putting both edges on gy 3 made their walls
      // merge into one impossible diagonal in isometric projection. The old
      // opposite front-left cut also added a wall return that appeared to sink
      // into missing floor, so the shared room now keeps that usable floor.
      mask: [
        "11111111110000", "11111111110000", "11111111110000",
        "11111111110000", "11111111111111", "11111111111111",
        "11111111111111", "11111111111111", "11111111111111",
        "11111111111111", "11111111111111",
      ],
      // Keep the shared home open-plan. Its asymmetric shell, recessed bed,
      // projecting kitchen and furniture groups already define the zones;
      // an interior arch here added architecture without separating rooms.
    },
    items: [
      // Recessed sleeping wing, entirely behind the partition line at gy 3.
      { item: "bed", gx: 0.5, gy: 0, tint: "#8d7897" },
      { item: "nightstand", gx: 3, gy: 0, tint: "#d2a075" },
      { item: "tablelamp", gx: 3, gy: 0, tint: "#d7a56f" },
      { item: "wardrobe", gx: 4, gy: 0, tint: "#77576f" },
      { item: "bookshelf", gx: 7.5, gy: 0, tint: "#ba9879" },
      { item: "runner", gx: 3.5, gy: 2, tint: "#b88491" },
      { item: "floorlamp", gx: 3, gy: 1.5, tint: "#d6a77e" },
      // Work zone sits between the sleeping and living areas.
      { item: "desk", gx: 5, gy: 3.5, tint: "#c39a75" },
      { item: "laptop", gx: 5.5, gy: 3.5 },
      { item: "desklamp", gx: 6.5, gy: 3.5, tint: "#d19b67" },
      { item: "mug", gx: 6.5, gy: 4 },
      { item: "ovalrug", gx: 5, gy: 4, tint: "#8f777b" },
      // Turned around: its backrest belongs behind the resident, not wedged
      // between them and the laptop.
      { item: "deskchair", gx: 6, gy: 5, rot: 2, tint: "#b47c92" },
      { item: "resident", gx: 6, gy: 5 },
      // Main living room stays open around one clear circulation lane.
      { item: "persianrug", gx: 2.5, gy: 5.5, tint: "#a9788e" },
      { item: "sofa", gx: 3, gy: 7, tint: "#78648d" },
      { item: "coffeetable", gx: 4.5, gy: 6, tint: "#c39a75" },
      { item: "bookstack", gx: 4.5, gy: 6 },
      { item: "mug", gx: 5.5, gy: 6.5 },
      { item: "armchair", gx: 6, gy: 6, tint: "#c5828c" },
      { item: "cushion", gx: 6.5, gy: 7.5, tint: "#a97782" },
      { item: "tvunit", gx: 0, gy: 4.5, rot: 1, tint: "#77576f" },
      { item: "floorlamp", gx: 1.5, gy: 5.5, tint: "#d6a77e" },
      { item: "dog", gx: 7, gy: 7, look: "husky" },
      // Projecting kitchen wing and the dining transition into it.
      { item: "counter", gx: 10.5, gy: 4, tint: "#c4a287" },
      { item: "microwave", gx: 10.5, gy: 4 },
      { item: "sink", gx: 12.5, gy: 4, tint: "#c4a287" },
      { item: "oven", gx: 12.5, gy: 5, tint: "#8d7897" },
      { item: "fridge", gx: 13, gy: 6, tint: "#7c6a91" },
      { item: "stripedrug", gx: 10.5, gy: 7.5, tint: "#8d7897" },
      { item: "counter", gx: 11.5, gy: 9.5, tint: "#c4a287" },
      { item: "counter", gx: 10.5, gy: 9.5, tint: "#c4a287" },
      { item: "kettle", gx: 11.5, gy: 9.5 },
      { item: "bread", gx: 10.5, gy: 9.5 },
      { item: "diningtable", gx: 7.5, gy: 8.5, tint: "#c39a75" },
      { item: "fruitbowl", gx: 7.5, gy: 8.5 },
      { item: "candle", gx: 8.5, gy: 9, tint: "#d7a56f" },
      { item: "chair", gx: 8, gy: 8, tint: "#9c7890" },
      { item: "chair", gx: 8, gy: 10, rot: 2, tint: "#9c7890" },
      // Wall detail follows the asymmetric shell rather than filling every run.
      { item: "bigwindow", gx: 5.5, gy: 0 },
      { item: "poster", gx: 3.5, gy: 0, tint: "#c7788b" },
      { item: "hangplant", gx: 8.5, gy: 0, tint: "#668069" },
      { item: "neon", gx: 0, gy: 5.5, rot: 1, tint: "#d887a4" },
      { item: "curtain", gx: 0, gy: 1, rot: 1, tint: "#bd705f" },
      { item: "snakeplant", gx: 9, gy: 3.5 },
      { item: "monstera", gx: 3.5, gy: 9.5 },
      { item: "plant", gx: 12.5, gy: 9.5 },
    ],
  },
  loft: {
    label: "Loft",
    icon: "⭐",
    // A full 10×8 rectangle. It used to cut a 4×3 notch out of the front corner
    // for an L-shaped attic, but this is the preset a fresh install opens on —
    // the first thing anyone sees shouldn't be a room with a bite taken out of
    // it, and the floor plan is a drag-to-draw grid, so anyone who wants the L
    // can paint it back in two strokes. Removing a cut only ADDS floor, so no
    // placement can be stranded by this.
    size: {
      w: 10,
      d: 8,
      wallColors: { left: "#6f566e", right: "#4b425d" },
      lighting: "golden",
    },
    items: [
      // Rebuilt: the first version left the dresser, the standing mirror, the
      // guitar, the vinyl crate AND the floor lamp adrift in open floor, which
      // breaks the two rules every other preset follows — big pieces go flush
      // to a wall, and the middle stays walkable. Now it's three zones with a
      // clear path between them.
      //
      // ---- SLEEPING, in the right-hand bay -------------------------------
      { item: "bed", gx: 8, gy: 0, tint: "#7f9ec9" },
      { item: "nightstand", gx: 7, gy: 0 },
      { item: "mushroomlamp", gx: 7, gy: 0, tint: "#c58e9e" },
      { item: "runner", gx: 7, gy: 3.5, tint: "#75658e" },
      { item: "standmirror", gx: 9, gy: 3.5 },
      // ---- MEDIA WALL, along the back ------------------------------------
      { item: "tvunit", gx: 0, gy: 0 },
      { item: "recordplayer", gx: 2.5, gy: 0, tint: "#4a3a5b" },
      { item: "vinylcrate", gx: 3.5, gy: 1, tint: "#4a3a5b" },
      { item: "aquarium", gx: 4, gy: 0 },
      // A guitar standing in open floor reads as balancing on nothing — it
      // needs a wall to lean on, so it goes in the gap between the aquarium
      // and the bed's nightstand.
      { item: "guitar", gx: 6, gy: 0 },
      { item: "screen", gx: 6.5, gy: 3 },
      // ---- LOUNGE: an L-group, both seats addressing the table -----------
      // `rot` is a MIRROR, not a rotation — there are only two facings, so a
      // true face-to-face across the table can't be expressed. An L works
      // with what exists: the sofa on the left wall looks along +gx, the
      // armchair on the back edge looks along +gy, and the coffee table sits
      // where those two sightlines cross. Matching tints make them read as
      // one suite rather than two stray chairs.
      { item: "squarerug", gx: 0.5, gy: 2.5, tint: "#8a7ac2" },
      { item: "sofa", gx: 0, gy: 2.5, rot: 1, tint: "#7f9ec9" },
      { item: "coffeetable", gx: 1.5, gy: 3, rot: 1 },
      { item: "mug", gx: 1.5, gy: 3 },
      { item: "bookstack", gx: 2, gy: 3.5 },
      { item: "armchair", gx: 1.5, gy: 1.5, tint: "#7f9ec9" },
      // the lamp lights the sofa from the corner instead of standing in the
      // middle of the room
      { item: "floorlamp", gx: 0.5, gy: 1 },
      { item: "dresser", gx: 0, gy: 5, rot: 1, tint: "#3a3142" },
      { item: "radio", gx: 0, gy: 5, tint: "#4a3a5b" },
      { item: "lightjar", gx: 0.5, gy: 5, tint: "#a986c2" },
      // ---- the open nook the corner cut leaves ---------------------------
      { item: "ovalrug", gx: 2.5, gy: 5.5, tint: "#71658e" },
      { item: "beanbag", gx: 2.5, gy: 6, tint: "#8a7ac2" },
      { item: "cat", gx: 4, gy: 6, tint: "#2c2438" },
      { item: "sidetable", gx: 5, gy: 6.5, tint: "#3a3142" },
      { item: "moonlamp", gx: 5, gy: 6.5 },
      { item: "fern", gx: 6.5, gy: 7 },
      { item: "monstera", gx: 0.5, gy: 7 },
      // ---- wall, spaced rather than crowded ------------------------------
      { item: "pennant", gx: 0, gy: 0, tint: "#5b6b9b" },
      { item: "wallshelf", gx: 1.5, gy: 0, tint: "#3a3142" },
      { item: "frame", gx: 3.5, gy: 0, tint: "#3a3142" },
      { item: "neon", gx: 5.5, gy: 0, tint: "#8a7ac2" },
      { item: "mirror", gx: 0, gy: 6.5, rot: 1, tint: "#cbd5e8" },
      // Overhead, above the lounge group — the left wall's one free run,
      // between the built-in window and the mirror.
      { item: "pendant", gx: 0, gy: 4.5, rot: 1, tint: "#3a3142" },
      // The window the attic deserves, inside the new bedroom bay.
      { item: "bigwindow", gx: 7.5, gy: 0 },
    ],
  },
  classic: {
    label: "Cozy study",
    icon: "🕯️",
    size: {
      w: 9,
      d: 7,
      wallColors: { left: "#8a7562", right: "#6f6658" },
      lighting: "golden",
    },
    items: [
      // Put the workstation directly in the broad left-wall window light,
      // like the references, rather than floating it along the back wall.
      // It stays deliberately empty: in a personal room the chair is yours.
      { item: "desk", gx: 0, gy: 1.5, rot: 1, tint: "#b78d67" },
      { item: "computer", gx: 0, gy: 2 },
      { item: "desklamp", gx: 0, gy: 1.5, tint: "#c68d59" },
      { item: "mug", gx: 0.5, gy: 3 },
      { item: "deskchair", gx: 1.5, gy: 2.5, rot: 2, tint: "#71806c" },
      // A fuller back wall makes the room feel built-in and collected.
      { item: "bookshelf", gx: 3, gy: 0, tint: "#9b7659" },
      { item: "frame", gx: 1.5, gy: 0, tint: "#a56f5e" },
      { item: "wallclock", gx: 4, gy: 0 },
      { item: "bigwindow", gx: 5, gy: 0 },
      { item: "corkboard", gx: 7, gy: 0 },
      // The pendant fills the room's upper third and warms the plant corner.
      { item: "pendant", gx: 0, gy: 5, rot: 1 },
      // The middle is a proper reading nook: layered textile, two seats and
      // a pool of table light, with the cat's bed just beyond it.
      { item: "persianrug", gx: 2.5, gy: 3, tint: "#a76f60" },
      { item: "armchair", gx: 3, gy: 4, tint: "#70806a" },
      { item: "cushion", gx: 4.5, gy: 5, tint: "#b98568" },
      { item: "sidetable", gx: 4.5, gy: 4, tint: "#a87c59" },
      { item: "tablelamp", gx: 4.5, gy: 4, tint: "#d2a164" },
      { item: "bookstack", gx: 5, gy: 4 },
      { item: "cat", gx: 5, gy: 3.5 },
      { item: "petbed", gx: 6.5, gy: 4.5, tint: "#a87569" },
      // Green corners and a coat by the door soften the room's edges.
      { item: "monstera", gx: 0.5, gy: 5.5 },
      { item: "fern", gx: 7.5, gy: 5.5 },
      { item: "coatrack", gx: 8, gy: 2.5 },
      // A door, and the two things a studious room collects: something
      // half-painted, and a globe to spin while thinking.
      { item: "doorway", gx: 7.5, gy: 0 },
      { item: "easel", gx: 6.5, gy: 1.5, tint: "#b78d67" },
      { item: "globe", gx: 2, gy: 5.5 },
    ],
  },
  cabin: {
    label: "Cozy cabin",
    icon: "🪵",
    size: {
      w: 9,
      d: 8,
      wallColors: { left: "#765242", right: "#59423b" },
      lighting: "candle",
    },
    items: [
      // The hearth end: fire, the fleece in front of it, the dog asleep on it.
      { item: "fireplace", gx: 3, gy: 0 },
      { item: "sheepskin", gx: 3, gy: 1 },
      { item: "dog", gx: 3.5, gy: 1.5 },
      // sleeping end
      { item: "bed", gx: 6.5, gy: 0 },
      { item: "nightstand", gx: 5.5, gy: 0 },
      { item: "wardrobe", gx: 0, gy: 0 },
      { item: "bookshelf", gx: 1.5, gy: 0 },
      // sitting end, on its own rug
      { item: "squarerug", gx: 0.5, gy: 3.5 },
      { item: "sofa", gx: 0, gy: 3.5, rot: 1 },
      { item: "coffeetable", gx: 1.5, gy: 4, rot: 1 },
      // A second seat turns these into a conversation nook instead of three
      // objects lined up against a wall. The smaller lived-in pieces ride the
      // table rather than consuming more floor.
      { item: "armchair", gx: 3, gy: 4.5, tint: "#8f6b58" },
      { item: "mug", gx: 2, gy: 4 },
      { item: "bookstack", gx: 2.5, gy: 4.5 },
      { item: "floorlamp", gx: 0.5, gy: 6.5 },
      { item: "cat", gx: 2, gy: 5.5 },
      { item: "runner", gx: 4.5, gy: 4.5, tint: "#8a5f52" },
      { item: "candle", gx: 5.5, gy: 0.5 },
      // and just enough on the walls
      { item: "wallshelf", gx: 6.5, gy: 0 },
      { item: "christmaslights", gx: 4.5, gy: 0 },
      { item: "frame", gx: 0, gy: 4, rot: 1 },
      { item: "curtain", gx: 0, gy: 1, rot: 1 },
      { item: "pendant", gx: 0, gy: 6, rot: 1, tint: "#6f493d" },
    ],
  },
  garden: {
    label: "Secret garden",
    icon: "🌿",
    size: { w: 10, d: 8, env: "garden" },
    items: [
      // An OFFICE DESK and a laptop were sitting on the grass, with a stool
      // and stacked crates beside them — the single most out-of-place thing
      // in any preset. Gone, along with the scatter of pot plants.
      //
      // Three zones with open lawn between: the tree line, the pond you sit
      // by, and the corner you lie down in.
      { item: "tree", gx: 0.5, gy: 0 },
      { item: "pine", gx: 2.5, gy: 0 },
      { item: "birch", gx: 4, gy: 0.5 },
      { item: "rock", gx: 2.5, gy: 2.5 },
      // the pond, with somewhere to sit facing it
      { item: "pond", gx: 6, gy: 0.5 },
      { item: "bench", gx: 6, gy: 4 },
      { item: "log", gx: 8, gy: 3.5 },
      { item: "bush", gx: 8.5, gy: 5.5 },
      // and the lying-down corner — the blanket well clear of the hammock,
      // which previously overlapped it and left the cat apparently floating
      { item: "hammock", gx: 1, gy: 4 },
      { item: "lightjar", gx: 5.5, gy: 5 },
      // a dog on the picnic blanket — a dog lying in a garden makes sense
      // in a way a cat outdoors never quite did (owner call, 2026-08-10)
      { item: "picnic", gx: 1, gy: 6 },
      { item: "dog", gx: 1.5, gy: 6.5 },
      { item: "flowerbed", gx: 3.5, gy: 6.5 },
      { item: "bunny", gx: 5, gy: 7 },
    ],
  },
  // THE café — the two café presets merged (owner decision, 2026-08-10):
  // Corner café's working counter run (bar, espresso machine, pastry case,
  // till, menu board — the ordering side the owner wanted kept) plus Morning
  // café's two facing-chair table sets, which were always its best feature.
  // Two cafés that each had half of a café was a preset slot spent twice;
  // the Morning café preset is retired. Both halves keep their PROVEN
  // coordinates — the counter run and the table-set geometry are transplants,
  // not redesigns, so only the seams needed occupancy-checking.
  cafeteria: {
    label: "Corner café",
    icon: "🥐",
    size: {
      w: 10,
      d: 7,
      env: "cafe",
      wallColors: { left: "#8d5947", right: "#68433f" },
      lighting: "golden",
    },
    items: [
      // a way in, then the bar along the back — four pieces reading as one run
      { item: "doorway", gx: 0.5, gy: 0 },
      { item: "menuboard", gx: 2.5, gy: 0 },
      { item: "barcounter", gx: 4, gy: 1 },
      { item: "barcounter", gx: 5, gy: 1 },
      { item: "barcounter", gx: 6, gy: 1 },
      { item: "coffeecounter", gx: 7, gy: 1 },
      { item: "pastrycase", gx: 4, gy: 1 },
      { item: "till", gx: 6, gy: 1 },
      // behind it — the shelves stop short of the menu board so it isn't
      // drawn behind them
      { item: "shelf", gx: 5, gy: 0 },
      { item: "shelf", gx: 6, gy: 0 },
      { item: "fridge", gx: 8, gy: 0 },
      // someone at the bar
      { item: "woodstool", gx: 5, gy: 2 },
      { item: "resident", gx: 5, gy: 2 },
      // Seating set A on the room's one rug: two chairs across a table,
      // genuinely facing each other (rot 0 looks toward +gy, rot 2 back
      // toward −gy — possible since chairs ship real back-view artwork).
      { item: "persianrug", gx: 0.5, gy: 2, tint: "#7a4034" },
      { item: "cafetable", gx: 2, gy: 3 },
      { item: "chair", gx: 2.5, gy: 2 },
      { item: "chair", gx: 2.5, gy: 4.5, rot: 2 },
      // a customer — a café with nobody in it reads as closed
      { item: "resident", gx: 2.5, gy: 4.5, tint: "#6fb8cf" },
      // seating set B, same geometry, shifted right and forward — served
      // (the mug) but empty: that table is yours
      { item: "cafetable", gx: 6, gy: 4 },
      { item: "mug", gx: 6, gy: 4 },
      { item: "chair", gx: 6.5, gy: 3 },
      { item: "chair", gx: 6.5, gy: 5.5, rot: 2 },
      // green in the far corner
      { item: "monstera", gx: 9, gy: 6 },
    ],
  },
  // A working little nursery rather than a generic green room: merchandise
  // climbs both walls, two island tables hold the small pots, and the checkout
  // run faces the open central aisle. The tile floor and deep green walls come
  // from the supplied shop reference; the warm timber keeps it in TaskNook's
  // softer palette instead of turning the room into a garden centre warehouse.
  plantshop: {
    label: "Plant shop",
    icon: "🪴",
    size: {
      w: 12,
      d: 9,
      env: "cafe",
      wallColors: { left: "#58735f", right: "#3f5d52" },
      lighting: "natural",
    },
    items: [
      // Storefront and identity: a side entrance keeps the back wall free for
      // two tall windows and the displays that need their light.
      { item: "doorway", gx: 0, gy: 0.5, rot: 1, tint: "#6e8b72" },
      { item: "bigwindow", gx: 1, gy: 0 },
      { item: "bigwindow", gx: 4.5, gy: 0 },
      { item: "menuboard", gx: 7, gy: 0, tint: "#466b54" },
      { item: "hangplant", gx: 9.5, gy: 0, tint: "#5f8b63" },

      // Six merchandise racks form an L around the perimeter. They are one
      // movable fixture each, so the preset stays pleasant to edit despite
      // looking densely stocked.
      { item: "plantshelf", gx: 7, gy: 0.5, tint: "#6c5d46" },
      { item: "plantshelf", gx: 8.5, gy: 0.5, tint: "#6c5d46" },
      { item: "plantshelf", gx: 10, gy: 0.5, tint: "#6c5d46" },
      { item: "plantshelf", gx: 0, gy: 3, rot: 1, tint: "#6c5d46" },
      { item: "plantshelf", gx: 0, gy: 4.5, rot: 1, tint: "#6c5d46" },
      { item: "plantshelf", gx: 0, gy: 6, rot: 1, tint: "#6c5d46" },

      // Two low display islands, with each small plant landing on the real
      // tabletop surface. The rug distinguishes the browsing zone from the
      // checkout lane without blocking circulation.
      { item: "stripedrug", gx: 3, gy: 2.5, tint: "#6d946d" },
      { item: "diningtable", gx: 3.5, gy: 3, tint: "#9a7959" },
      { item: "succulent", gx: 3.5, gy: 3, tint: "#c7775b" },
      { item: "orchid", gx: 4.5, gy: 3, tint: "#a87591" },
      { item: "seedtray", gx: 4, gy: 3.5, tint: "#6d946d" },
      { item: "diningtable", gx: 6.5, gy: 5, tint: "#9a7959" },
      { item: "bonsai", gx: 6.5, gy: 5, tint: "#b76b50" },
      { item: "plant", gx: 7.5, gy: 5.5, tint: "#d09a64" },
      { item: "wateringcan", gx: 7, gy: 5, tint: "#6b8f87" },

      // Checkout across the front-left, with the staff side kept clear.
      { item: "barcounter", gx: 1.5, gy: 7.5, tint: "#9a7959" },
      { item: "barcounter", gx: 2.5, gy: 7.5, tint: "#9a7959" },
      { item: "barcounter", gx: 3.5, gy: 7.5, tint: "#9a7959" },
      { item: "succulent", gx: 1.5, gy: 7.5, tint: "#c7775b" },
      { item: "till", gx: 2.5, gy: 7.5 },
      { item: "resident", gx: 2.5, gy: 6.5, tint: "#d8b477" },

      // The bigger specimens anchor corners and make the stock vary in height.
      { item: "palm", gx: 10.5, gy: 2.5, tint: "#5f8b63" },
      { item: "snakeplant", gx: 8.5, gy: 2, tint: "#d09a64" },
      { item: "sidetable", gx: 9, gy: 4.5, tint: "#6c5d46" },
      { item: "terrarium", gx: 9, gy: 4.5 },
      { item: "resident", gx: 9, gy: 6, tint: "#8a7396" },
      { item: "fern", gx: 6, gy: 7.5, tint: "#b76b50" },
      { item: "fern", gx: 8, gy: 7.5, tint: "#d09a64" },
      { item: "monstera", gx: 10.5, gy: 7.5, tint: "#b76b50" },
    ],
  },
  // A READING room: bookcases wall to wall, one long table down the middle,
  // and the clutter of somebody mid-project.
  library: {
    label: "Reading room",
    icon: "📚",
    size: { w: 11, d: 9, env: "library" },
    items: [
      // ---- ENCLOSED BY BOOKS ----------------------------------------------
      // The point of this room is being surrounded, so shelving takes all
      // THREE edges: the tall run along both walls, and a lower run along the
      // right-hand rim that you look over rather than at.
      { item: "bookshelf", gx: 0, gy: 0, tint: "#5c3a2c" },
      { item: "bookshelf", gx: 1.5, gy: 0, tint: "#5c3a2c" },
      { item: "bookshelf", gx: 6, gy: 0, tint: "#5c3a2c" },
      { item: "bookshelf", gx: 7.5, gy: 0, tint: "#5c3a2c" },
      // left wall, stopping short of the window bay (gy 1–2.5) — books over
      // a window would be a dark rectangle exactly where the light is
      { item: "bookshelf", gx: 0, gy: 3, rot: 1, tint: "#5c3a2c" },
      { item: "bookshelf", gx: 0, gy: 4.5, rot: 1, tint: "#5c3a2c" },
      { item: "bookshelf", gx: 0, gy: 6, rot: 1, tint: "#5c3a2c" },
      { item: "bookshelf", gx: 0, gy: 7.5, rot: 1, tint: "#5c3a2c" },
      // the low run along the right rim
      { item: "bookcase", gx: 10, gy: 2, rot: 1, tint: "#6b4a39" },
      { item: "bookcase", gx: 10, gy: 4, rot: 1, tint: "#6b4a39" },
      { item: "bookcase", gx: 10, gy: 6, rot: 1, tint: "#6b4a39" },
      // two ladders, leaning — they clip the shelves on purpose
      { item: "ladder", gx: 6.5, gy: 0.5, tint: "#8f5d49" },
      { item: "ladder", gx: 0.5, gy: 5, rot: 1, tint: "#8f5d49" },
      { item: "curtain", gx: 0, gy: 1, rot: 1, tint: "#4a3a5b" },
      // ---- the reading table, centred on its rug ---------------------------
      { item: "ovalrug", gx: 3, gy: 3.5, tint: "#8a5346" },
      { item: "diningtable", gx: 3.5, gy: 4 },
      { item: "desklamp", gx: 3.5, gy: 4 },
      { item: "bookstack", gx: 4.5, gy: 4 },
      { item: "chair", gx: 4, gy: 5.5 },
      { item: "resident", gx: 4, gy: 5.5, tint: "#8a5346" },
      { item: "sidetable", gx: 1.5, gy: 3 },
      { item: "lightjar", gx: 1.5, gy: 3 },
      { item: "floorlamp", gx: 8.5, gy: 3 },
      // ---- a writing corner, tucked out of the middle ----------------------
      { item: "desk", gx: 6.5, gy: 6.5 },
      { item: "computer", gx: 7, gy: 6.5 },
      { item: "deskchair", gx: 7.5, gy: 8, rot: 2 },
      // ---- stacks on the floor: the tell that someone actually works here --
      { item: "bookstack", gx: 1, gy: 6.5 },
      { item: "bookstack", gx: 2, gy: 7.5 },
      { item: "bookstack", gx: 6.5, gy: 5.5 },
      { item: "bookstack", gx: 9, gy: 8 },
      { item: "bookstack", gx: 5.5, gy: 1.5 },
      { item: "crates", gx: 6, gy: 8, tint: "#5c3a2c" },
      { item: "cat", gx: 5, gy: 7, tint: "#3a2a24" },
      { item: "monstera", gx: 9.5, gy: 8 },
      // Arched entrance, a tall window, and a game waiting on the big table.
      { item: "archway", gx: 3.5, gy: 0 },
      { item: "bigwindow", gx: 9, gy: 0 },
      { item: "chess", gx: 4, gy: 4.5 },
    ],
  },
  // Half outdoors: a low balustrade instead of walls, stone underfoot, and
  // string lights overhead.
  hall: {
    label: "Study hall",
    icon: "🧑‍🤝‍🧑",
    // The big one: a 16x12 room built for company. Four tables of four with
    // people sitting ACROSS from each other — only possible since seating got
    // real back-view artwork, so the far row can turn round (rot 2) instead of
    // everyone facing the same way.
    size: { w: 16, d: 12, env: "library" },
    items: [
      // ---- shelving along the two walls -------------------------------
      { item: "bookshelf", gx: 2.0, gy: 0 },
      { item: "bookshelf", gx: 3.5, gy: 0 },
      { item: "bookshelf", gx: 9.5, gy: 0 },
      { item: "bookshelf", gx: 11.0, gy: 0 },
      { item: "bookshelf", gx: 12.5, gy: 0 },
      { item: "bookcase", gx: 0, gy: 2, rot: 1 },
      { item: "bookcase", gx: 0, gy: 4, rot: 1 },
      { item: "bookcase", gx: 0, gy: 6, rot: 1 },
      { item: "bookcase", gx: 0, gy: 8, rot: 1 },
      // ---- four study tables, people facing each other across them ----
      { item: "diningtable", gx: 4, gy: 3 },
      { item: "chair", gx: 4, gy: 2 },
      { item: "resident", gx: 4, gy: 2, tint: "#6fb8cf" },
      { item: "chair", gx: 5, gy: 2 },
      { item: "chair", gx: 4, gy: 4.5, rot: 2 },
      { item: "chair", gx: 5, gy: 4.5, rot: 2 },
      { item: "diningtable", gx: 9, gy: 3 },
      { item: "chair", gx: 9, gy: 2 },
      { item: "chair", gx: 10, gy: 2 },
      { item: "chair", gx: 9, gy: 4.5, rot: 2 },
      { item: "resident", gx: 9, gy: 4.5, tint: "#e0774a" },
      { item: "chair", gx: 10, gy: 4.5, rot: 2 },
      { item: "diningtable", gx: 4, gy: 7.5 },
      { item: "chair", gx: 4, gy: 6.5 },
      { item: "resident", gx: 4, gy: 6.5, tint: "#e0a374" },
      { item: "chair", gx: 5, gy: 6.5 },
      { item: "chair", gx: 4, gy: 9, rot: 2 },
      { item: "chair", gx: 5, gy: 9, rot: 2 },
      { item: "resident", gx: 5, gy: 9, tint: "#7faf8f" },
      { item: "diningtable", gx: 9, gy: 7.5 },
      { item: "chair", gx: 9, gy: 6.5 },
      { item: "chair", gx: 10, gy: 6.5 },
      { item: "chair", gx: 9, gy: 9, rot: 2 },
      { item: "chair", gx: 10, gy: 9, rot: 2 },
      // ---- something on every table ------------------------------------
      { item: "mug", gx: 4.5, gy: 3.5 },
      { item: "bookstack", gx: 5, gy: 3.5 },
      { item: "mug", gx: 9.5, gy: 3.5 },
      { item: "bookstack", gx: 10, gy: 3.5 },
      { item: "mug", gx: 4.5, gy: 8.0 },
      { item: "bookstack", gx: 5, gy: 8.0 },
      // ---- corners, greenery and light ----------------------------------
      { item: "ladder", gx: 14.5, gy: 0 },
      { item: "monstera", gx: 14.5, gy: 2 },
      { item: "monstera", gx: 1, gy: 10.5 },
      { item: "plant", gx: 2.5, gy: 5.5 },
      { item: "floorlamp", gx: 7.5, gy: 5.5 },
      { item: "floorlamp", gx: 15, gy: 8 },
      { item: "coatrack", gx: 12, gy: 11 },
      { item: "runner", gx: 6.5, gy: 10.5, tint: "#8f4a3c" },
      { item: "cat", gx: 3.5, gy: 11 },
      { item: "frame", gx: 0.5, gy: 0, tint: "#9a6a45" },
      { item: "wallclock", gx: 13.5, gy: 0 },
      { item: "hangplant", gx: 0, gy: 6.5, rot: 1 },
      { item: "poster", gx: 0, gy: 10, rot: 1 },
      // ---- a lounge corner at the front, so the room isn't four identical
      // ---- tables and a lot of empty floorboards -------------------------
      { item: "squarerug", gx: 12.5, gy: 9, tint: "#8f4a3c" },
      { item: "coffeetable", gx: 13, gy: 9.5 },
      { item: "mug", gx: 13.5, gy: 9.5 },
      { item: "armchair", gx: 13, gy: 8.5, tint: "#7faf8f" },
      { item: "armchair", gx: 13, gy: 10.5, rot: 2, tint: "#cf8f93" },
      { item: "resident", gx: 13, gy: 8.5, tint: "#c9a24b" },
      { item: "beanbag", gx: 1.5, gy: 7.5, tint: "#8a7ac2" },
      { item: "plant", gx: 2.5, gy: 9.5 },
      // The hall gets its architecture: an arch to come in by, a window
      // down the long wall, and a piano in the corner. The piano sits at the
      // near end of the left wall on purpose — in the far corner a monstera
      // stood in front of it and hid the keyboard, which is the only part of
      // an upright that isn't a dark box.
      { item: "archway", gx: 5.5, gy: 0 },
      { item: "bigwindow", gx: 7.5, gy: 0 },
      { item: "piano", gx: 0, gy: 1, tint: "#43302b" },
    ],
  },
  terrace: {
    label: "Terrace",
    icon: "🪴",
    size: { w: 9, d: 7, env: "terrace" },
    items: [
      { item: "hedge", gx: 0, gy: 0 },
      { item: "hedge", gx: 2, gy: 0 },
      { item: "pine", gx: 7, gy: 0 },
      { item: "diningtable", gx: 2.5, gy: 2.5 },
      { item: "candle", gx: 2.5, gy: 2.5 },
      { item: "woodstool", gx: 2.5, gy: 4 },
      { item: "woodstool", gx: 4, gy: 4 },
      { item: "woodstool", gx: 3.5, gy: 1.5 },
      { item: "matrug", gx: 6.5, gy: 4.5, tint: "#8a5346" },
      { item: "armchair", gx: 6.5, gy: 4.5, tint: "#7faf8f" },
      { item: "sidetable", gx: 5, gy: 5 },
      { item: "mug", gx: 5, gy: 5 },
      { item: "flowers", gx: 0.5, gy: 5.5 },
      { item: "flowers", gx: 8, gy: 2 },
      { item: "monstera", gx: 0.5, gy: 3 },
      { item: "cactus", gx: 8, gy: 6 },
      { item: "cat", gx: 5.5, gy: 6 },
      // was ALSO on the side table at 5,5 — two `stacks` items at one spot
      // both centre on the same surface and the second is invisible
      { item: "lightjar", gx: 7.5, gy: 6 },
      // A lantern for when the string lights are not enough.
      { item: "lantern", gx: 5, gy: 2 },
    ],
  },
  ...createIsoSeasonalPresets(),
  empty: {
    label: "Empty room",
    icon: "🫙",
    size: defaultIsoSize,
    items: [],
  },
  };
}
