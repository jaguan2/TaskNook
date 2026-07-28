// The isometric room's decoration model: a resizable W×D tile floor and
// items placed ON the grid as { id, item, gx, gy, tint? } (tile coordinates,
// half-tile snapping). Pure data + functions; projection math lives in
// lib/iso.js and the artwork in components/IsoItems.jsx.

export const ISO_SIZE_MIN = 3;
export const ISO_SIZE_MAX = 48;
export const DEFAULT_ISO_SIZE = { w: 9, d: 7 };
// Raised from 60 for group rooms: a study hall with four tables, sixteen
// chairs, people in them and shelving along two walls lands around 75, and 60
// silently truncated it. Room SIZE was never the constraint — the floor has
// gone to 48x48 all along. The scene is memo'd and each placement is a handful
// of SVG nodes, so the ceiling here is legibility, not frame rate.
export const ISO_MAX_ITEMS = 150;
// Irregular floors, the full Sims way: a TILE MASK. `mask` is d row-strings
// of w chars ("1" = floor, "0" = void) painted in the panel's floor-plan
// grid; walls and the front lip are computed per tile edge, so ANY drawn
// shape gets correct geometry. A missing mask means a full rectangle (and
// an all-"1" mask normalises back to missing). Legacy corner-cut saves are
// converted to masks on validation.
export const CUT_CORNERS = ["back", "right", "left", "front"];
// Environments: what the scene AROUND the tiles is. Same grid, same engine —
// only the dressing changes, which is how VC2 gets its variety.
//
//   walls   "full" cutaway interior · "low" waist-height balustrade · "none"
//   floor   the gradient id IsoRoom fills the tile sheet with
//   floorStyle  the MATERIAL drawn over it: boards / tiles / stone / grass.
//           A flat gradient reads as a coloured plane; grain is what makes
//           the biggest surface in the scene look like a floor.
//   lip     [gx-facing, gy-facing] colours for the floor's front rim
//   window  the built-in window on the left wall
//   lights  the built-in string lights along the right wall
//
// Only FULL walls can hold wall decor — a balustrade is waist height, and a
// picture frame floating over open air is worse than no picture frame.
export const ISO_ENVS = {
  room: {
    label: "Room",
    icon: "🏠",
    walls: "full",
    floor: "isoFloor",
    floorStyle: "boards",
    lip: ["#1d0f1f", "#170c19"],
    window: true,
    lights: true,
  },
  cafe: {
    label: "Café",
    icon: "☕",
    walls: "full",
    floor: "isoTile",
    floorStyle: "tiles",
    lip: ["#2e211c", "#261b17"],
    window: true,
    lights: true,
  },
  library: {
    label: "Library",
    icon: "📚",
    walls: "full",
    floor: "isoWood",
    floorStyle: "boards",
    lip: ["#2a1a12", "#221410"],
    window: true,
  },
  terrace: {
    label: "Terrace",
    icon: "🪴",
    walls: "low",
    floor: "isoStone",
    floorStyle: "stone",
    lip: ["#3a3630", "#2e2b26"],
    lights: true,
  },
  garden: {
    label: "Garden",
    icon: "🌿",
    walls: "none",
    floor: "isoGrass",
    floorStyle: "grass",
    lip: ["#2c2018", "#241a12"],
  },
};
export const ISO_ENV_KEYS = Object.keys(ISO_ENVS);

/** The env config for a layout, defaulting to the walled room. */
export const envOf = (key) => ISO_ENVS[key] || ISO_ENVS.room;

/** Can wall decor hang here? Full-height walls only. */
export const envHasWalls = (key) => envOf(key).walls === "full";

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
  desk: { label: "Workstation", icon: "🖥️", foot: [2.2, 1.2], hitH: 44, surface: 30 },
  stool: { label: "Stool", icon: "🪑", foot: [0.8, 0.8], hitH: 28, seat: 20 },
  // Every item here is hand-drawn SVG (see the note atop IsoItems.jsx). The
  // Kenney PNG era left two flags behind that no catalog entry needs any
  // more: `noMirror` (raster needed a second render per orientation; vector
  // just mirrors) and `variants` (raster needed pre-shaded colourway files;
  // vector reads `--tint` and takes any colour). `tintable: false` survives
  // for the handful of pieces that are inherently multi-coloured — an
  // aquarium, a pond — where one flat colour would destroy them.
  //
  // `seat` is where a persona's feet land, so it tracks the actual cushion
  // top; `hitH` parks the ⟳/✕ buttons just clear of the tallest part. Both
  // have to move whenever a sprite's proportions change. `lie: true` marks
  // furniture you lie on rather than perch on, which picks the sprite's pose.
  //
  // `surface: <px>` is a top things can be PUT ON, and `stacks: true` marks an
  // item small enough to be put there — see surfaceFor(). Every value is a
  // real sprite height, so a mug lands on a table top and not in mid-air.
  sofa: { label: "Sofa", icon: "🛋️", foot: [2, 0.85], hitH: 37, seat: 22, backView: true },
  armchair: { label: "Armchair", icon: "💺", foot: [1, 0.85], hitH: 37, seat: 22, backView: true },
  nightstand: { label: "Nightstand", icon: "🗄️", foot: [0.7, 0.7], hitH: 30, surface: 24 },
  chair: { label: "Wooden chair", icon: "🪑", foot: [0.7, 0.7], hitH: 46, seat: 19, backView: true },
  shelf: { label: "Open shelf", icon: "🪜", foot: [1, 0.5], hitH: 60 },
  bookcase: { label: "Wide bookcase", icon: "📚", foot: [2, 0.6], hitH: 66 },
  sidetable: { label: "Side table", icon: "🗃️", foot: [1.2, 0.5], hitH: 32, surface: 28 },
  radio: { label: "Radio", icon: "📻", foot: [0.7, 0.25], hitH: 30, stacks: true },
  fridge: { label: "Little fridge", icon: "🧊", foot: [1, 0.7], hitH: 48 },
  cafetable: { label: "Café table", icon: "🍰", foot: [1.2, 1.2], hitH: 30, surface: 21 },
  counter: { label: "Counter", icon: "🥐", foot: [1, 0.5], hitH: 34, surface: 29.5 },
  // A serving bar, not a kitchen cabinet: taller, panelled front, brass
  // footrail, and a top that overhangs the customer side.
  barcounter: { label: "Café bar", icon: "🍹", foot: [1, 0.6], hitH: 42, surface: 36.5 },
  till: { label: "Till", icon: "🧾", foot: [0.5, 0.4], hitH: 18, stacks: true },
  pastrycase: { label: "Pastry case", icon: "🍰", foot: [0.8, 0.5], hitH: 20, stacks: true },
  coffeecounter: { label: "Coffee counter", icon: "🫖", foot: [1, 0.5], hitH: 50, glow: [18, 0.25] },
  tvunit: { label: "TV cabinet", icon: "📺", foot: [2, 0.6], hitH: 50, glow: [26, 0.3] },
  coffeetable: { label: "Coffee table", icon: "☕", foot: [1.4, 0.9], hitH: 24, surface: 19 },
  // The tint paints the DUVET (mattress and pillows stay linen-white).
  // seat = the duvet's top edge, hitH = clear of the headboard.
  bed: { label: "Bed", icon: "🛏️", foot: [2, 2.8], hitH: 40, seat: 18, lie: true },
  cushion: { label: "Floor cushion", icon: "🧶", foot: [0.9, 0.9], hitH: 18, seat: 13 },
  // ---- storage & seating ----
  wardrobe: { label: "Wardrobe", icon: "🚪", foot: [1.4, 0.7], hitH: 92 },
  dresser: { label: "Dresser", icon: "🧦", foot: [1.6, 0.6], hitH: 42, surface: 34 },
  deskchair: { label: "Desk chair", icon: "💺", foot: [0.8, 0.8], hitH: 50, seat: 24, backView: true },
  beanbag: { label: "Beanbag", icon: "🫘", foot: [1.1, 1.1], hitH: 26, seat: 15 },
  standmirror: { label: "Standing mirror", icon: "🪞", foot: [0.6, 0.4], hitH: 70 },
  // ---- the small stuff that makes a room look lived in ----
  desklamp: { label: "Desk lamp", icon: "🔆", foot: [0.4, 0.4], hitH: 34, stacks: true, glow: [20, 0.52] },
  guitar: { label: "Guitar", icon: "🎸", foot: [0.5, 0.4], hitH: 62 },
  // multi-coloured by nature: one flat tint would turn it into a brick
  bookstack: { label: "Stack of books", icon: "📗", foot: [0.5, 0.4], hitH: 16, tintable: false, stacks: true },
  vinylcrate: { label: "Record crate", icon: "💿", foot: [0.7, 0.5], hitH: 24 },
  basket: { label: "Laundry basket", icon: "🧺", foot: [0.6, 0.6], hitH: 24 },
  coatrack: { label: "Coat rack", icon: "🧥", foot: [0.5, 0.5], hitH: 76 },
  ladder: { label: "Ladder shelf", icon: "🪜", foot: [0.9, 0.5], hitH: 70 },
  crates: { label: "Stacked crates", icon: "📦", foot: [0.8, 0.7], hitH: 36 },
  cactus: { label: "Cactus", icon: "🌵", foot: [0.5, 0.5], hitH: 46 },
  terrarium: { label: "Terrarium", icon: "🫙", foot: [0.6, 0.6], hitH: 28, stacks: true },
  lightjar: { label: "Jar of lights", icon: "✨", foot: [0.4, 0.4], hitH: 24, stacks: true, glow: [15, 0.3] },
  mug: { label: "Mug", icon: "☕", foot: [0.3, 0.3], hitH: 16, stacks: true },
  // The cat treats every layer:-1 item as a soft spot, so it will eventually
  // curl up in this one — which is the entire point of a pet bed.
  petbed: { label: "Pet bed", icon: "🐾", foot: [1.1, 0.9], layer: -1, hitH: 12 },
  runner: { label: "Runner rug", icon: "🟫", foot: [3, 1], layer: -1, hitH: 10 },
  ovalrug: { label: "Oval rug", icon: "⭕", foot: [2.2, 1.7], layer: -1, hitH: 10 },
  matrug: { label: "Door mat", icon: "▫️", foot: [1.4, 0.9], layer: -1, hitH: 10 },
  // ---- more of what the room already had ----
  computer: { label: "Computer", icon: "🖳", foot: [1.4, 0.9], hitH: 42, stacks: true, glow: [22, 0.3] },
  diningtable: { label: "Dining table", icon: "🍽️", foot: [1.8, 1.1], hitH: 30, surface: 26.5 },
  woodstool: { label: "Wooden stool", icon: "🪑", foot: [0.7, 0.7], hitH: 26, seat: 19 },
  bookshelf: { label: "Bookshelf", icon: "📖", foot: [1.5, 0.7], hitH: 96 },
  aquarium: { label: "Aquarium", icon: "🐠", foot: [1.4, 0.7], hitH: 66, tintable: false, glow: [26, 0.35] },
  monstera: { label: "Monstera", icon: "🌱", foot: [0.8, 0.8], hitH: 78 },
  plant: { label: "Potted plant", icon: "🪴", foot: [0.6, 0.6], hitH: 46, stacks: true },
  floorlamp: { label: "Floor lamp", icon: "💡", hitH: 84, foot: [0.8, 0.8], glow: [34, 0.72] },
  // roamer: wanders like a persona, but with cat rules — finds a rug, naps.
  cat: { label: "Cat", icon: "🐈", foot: [1.2, 0.8], hitH: 34, roamer: true },
  // Architecture: openings that give a wall somewhere to look through.
  archway: { label: "Archway", icon: "🏛️", foot: [2, 0.3], wall: true, hitH: 104 },
  doorway: { label: "Door", icon: "🚪", foot: [1.2, 0.3], wall: true, hitH: 96 },
  bigwindow: { label: "Tall window", icon: "🪟", foot: [1.8, 0.3], wall: true, hitH: 104 },
  frame: { label: "Picture frame", icon: "🖼️", foot: [1.4, 0.3], wall: true, hitH: 100 },
  wallshelf: { label: "Wall shelf", icon: "📚", foot: [1.6, 0.3], wall: true, hitH: 96 },
  mirror: { label: "Round mirror", icon: "🪞", foot: [1.1, 0.3], wall: true, hitH: 96 },
  wallclock: { label: "Wall clock", icon: "🕰️", foot: [0.8, 0.3], wall: true, hitH: 100 },
  poster: { label: "Poster", icon: "🖼️", foot: [1, 0.3], wall: true, hitH: 98 },
  menuboard: { label: "Menu board", icon: "📋", foot: [1.8, 0.3], wall: true, hitH: 100 },
  curtain: { label: "Curtains", icon: "🪟", foot: [1.6, 0.3], wall: true, hitH: 110 },
  hangplant: { label: "Hanging plant", icon: "🌿", foot: [0.7, 0.3], wall: true, hitH: 110 },
  neon: { label: "Neon sign", icon: "💡", foot: [1.4, 0.3], wall: true, hitH: 94, glow: [30, 0.4] },
  corkboard: { label: "Corkboard", icon: "📌", foot: [1.2, 0.3], wall: true, hitH: 100 },
  pennant: { label: "Pennant", icon: "🚩", foot: [0.9, 0.3], wall: true, hitH: 100 },
  fireplace: { label: "Fireplace", icon: "🔥", foot: [1.6, 0.7], hitH: 78, glow: [44, 0.7] },
  recordplayer: { label: "Record player", icon: "📀", foot: [1.2, 0.7], hitH: 42 },
  candle: { label: "Candle", icon: "🕯️", foot: [0.4, 0.4], hitH: 28, stacks: true, glow: [16, 0.35] },
  // outdoor set (at home in the garden, allowed anywhere)
  tree: { label: "Tree", icon: "🌳", foot: [1.5, 1.5], hitH: 128 },
  pine: { label: "Pine tree", icon: "🌲", foot: [1.2, 1.2], hitH: 92 },
  birch: { label: "Birch tree", icon: "🍂", foot: [1.2, 1.2], hitH: 90 },
  hedge: { label: "Hedge", icon: "🌿", foot: [1.6, 0.6], hitH: 34 },
  rock: { label: "Rock", icon: "🪨", foot: [0.9, 0.8], hitH: 26 },
  log: { label: "Fallen log", icon: "🪵", foot: [1.4, 0.7], hitH: 20, seat: 12 },
  flowers: { label: "Wildflowers", icon: "🌸", foot: [0.7, 0.6], hitH: 24 },
  bush: { label: "Bush", icon: "🌲", foot: [1, 1], hitH: 40 },
  pond: { label: "Pond", icon: "🪷", foot: [3.5, 2.5], layer: -1, hitH: 12, tintable: false },
  picnic: { label: "Picnic blanket", icon: "🧺", foot: [2, 1.5], layer: -1, hitH: 10 },
  bench: { label: "Garden bench", icon: "🪑", foot: [1.6, 0.6], hitH: 34, seat: 16, backView: true },
  flowerbed: { label: "Flower patch", icon: "🌼", foot: [1, 0.6], hitH: 22 },
  // the resident — a little person you drop anywhere: onto a seat (they sit)
  // or the open floor (they idle-wander). Tint = their sweater.
  resident: { label: "Resident", icon: "🧍", foot: [0.8, 0.8], hitH: 56, persona: true },
  // ---- more pets: same roamer engine as the cat, different silhouettes ----
  dog: { label: "Dog", icon: "🐕", foot: [1.1, 0.7], hitH: 32, roamer: true },
  bunny: { label: "Rabbit", icon: "🐇", foot: [0.7, 0.6], hitH: 26, roamer: true },
  // ---- more rugs ----
  persianrug: { label: "Patterned rug", icon: "🔶", foot: [3, 2.2], layer: -1, hitH: 10 },
  stripedrug: { label: "Striped rug", icon: "🟦", foot: [2.6, 1.8], layer: -1, hitH: 10 },
  sheepskin: { label: "Sheepskin", icon: "☁️", foot: [1.8, 1.5], layer: -1, hitH: 10 },
  // ---- more decoration ----
  piano: { label: "Upright piano", icon: "🎹", foot: [2, 0.8], hitH: 66, surface: 62 },
  easel: { label: "Easel", icon: "🎨", foot: [0.9, 0.8], hitH: 62 },
  birdcage: { label: "Birdcage", icon: "🐦", foot: [0.6, 0.6], hitH: 60, glow: [16, 0.25] },
  screen: { label: "Folding screen", icon: "🎏", foot: [1.6, 0.4], hitH: 62 },
  globe: { label: "Globe", icon: "🌍", foot: [0.45, 0.45], hitH: 28, stacks: true },
  // a checkered board is two colours by definition — one flat tint erases it
  chess: { label: "Chess set", icon: "♟️", foot: [0.6, 0.5], hitH: 14, stacks: true, tintable: false },
  // ---- more outdoors ----
  hammock: { label: "Hammock", icon: "🏝️", foot: [2.2, 0.9], hitH: 44, seat: 22, lie: true },
  lantern: { label: "Garden lantern", icon: "🏮", foot: [0.5, 0.5], hitH: 58, glow: [26, 0.45] },
};

/**
 * The furniture picker's sections, in display order.
 *
 * The catalog is one flat object because that's what every lookup wants; the
 * picker is a different problem. At 93 entries a single scrolling grid stopped
 * being browsable — you can't find the rug you want, and worse, you can't tell
 * a rug exists. Grouping lives here rather than as a `group:` field on each
 * entry so the catalog stays a plain lookup table, and a test asserts every key
 * appears in exactly one section, so a new item can't quietly go missing from
 * the picker (the only place items can be added from).
 */
export const ISO_ITEM_GROUPS = [
  {
    label: "Seating & beds",
    keys: ["sofa", "armchair", "chair", "deskchair", "stool", "woodstool", "beanbag",
      "cushion", "bed", "bench", "log", "hammock"],
  },
  {
    label: "Tables & desks",
    keys: ["desk", "diningtable", "cafetable", "coffeetable", "sidetable", "nightstand",
      "counter", "barcounter", "coffeecounter"],
  },
  {
    label: "Storage",
    keys: ["bookshelf", "bookcase", "shelf", "wardrobe", "dresser", "tvunit", "fridge",
      "pastrycase", "crates", "basket", "vinylcrate", "ladder", "coatrack"],
  },
  {
    label: "Rugs & floor",
    keys: ["rug", "squarerug", "ovalrug", "runner", "persianrug", "stripedrug",
      "sheepskin", "matrug", "picnic", "petbed", "pond"],
  },
  {
    label: "Light & warmth",
    keys: ["floorlamp", "desklamp", "lantern", "candle", "lightjar", "fireplace"],
  },
  {
    label: "Decoration",
    keys: ["piano", "easel", "screen", "birdcage", "standmirror", "aquarium", "terrarium",
      "monstera", "plant", "cactus", "flowers", "flowerbed", "globe", "chess", "guitar",
      "bookstack", "mug", "till"],
  },
  {
    label: "Tech & music",
    keys: ["computer", "radio", "recordplayer"],
  },
  {
    label: "On the wall",
    keys: ["archway", "doorway", "bigwindow", "frame", "poster", "wallshelf", "mirror", "wallclock", "menuboard", "corkboard",
      "pennant", "neon", "curtain", "hangplant"],
  },
  {
    label: "Outdoors",
    keys: ["tree", "pine", "birch", "bush", "hedge", "rock"],
  },
  {
    label: "Living things",
    keys: ["resident", "cat", "dog", "bunny"],
  },
];

/** Is `placement`'s centre inside `other`'s footprint? */
function centreOver(placement, other) {
  const f = footOf(placement.item, placement.rot);
  const cx = placement.gx + f[0] / 2;
  const cy = placement.gy + f[1] / 2;
  const of = footOf(other.item, other.rot);
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
  return null;
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
  const sf = footOf(seat.placement.item, seat.placement.rot);
  const pf = footOf(persona.item, persona.rot);
  const seatRot = seat.placement.rot || 0;
  const away = seatRot >= 2;
  const shift = away ? -0.15 : 0.15;
  const alongGx = seatRot % 2 === 1;
  return {
    gx: seat.placement.gx + sf[0] / 2 - pf[0] / 2 + (alongGx ? shift : 0),
    gy: seat.placement.gy + sf[1] / 2 - pf[1] / 2 + (alongGx ? 0 : shift),
    _seat: seat.height,
    _lie: seat.lie,
    _depth: isoDepth(seat.placement) + (away ? -0.01 : 0.01),
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
  const sf = footOf(on.placement.item, on.placement.rot);
  const pf = footOf(placement.item, placement.rot);
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

/** The placement's effective footprint: rot transposes it. */
/**
 * Rotation is 0–3, quarter turns anticlockwise on the grid:
 *
 *   0 faces +gy (front-left)   1 faces +gx (front-right)
 *   2 faces −gy (back-right)   3 faces −gx (back-left)
 *
 * Only 0 and 1 come free. A screen mirror `scale(-1,1)` about the origin IS a
 * grid transpose, which is what turns 0 into 1 — but the half-turn to 2 is
 * `scale(-1,-1)`, i.e. the sprite upside down, so the away-facing pair needs
 * REAL back-view artwork. Items that ship it are marked `backView`; everything
 * else stays a two-way item and `rotationsFor` says so, which is what stops a
 * chair ever being drawn on its head.
 */
export const ROTATIONS = [0, 1, 2, 3];

/** How many quarter turns this item actually has: 4 with a back view, else 2.
 *  Wall decor is always 2 — there rot picks WHICH WALL, not a facing. */
export function rotationsFor(itemKey) {
  const item = ISO_ITEMS[itemKey];
  if (!item || item.wall) return 2;
  return item.backView ? 4 : 2;
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
export const footOf = (itemKey, rot = 0) => {
  const f = ISO_ITEMS[itemKey]?.foot || [1, 1];
  return rot % 2 ? [f[1], f[0]] : f;
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

/** A placement's painter's depth: its footprint's FRONT corner. */
export function isoDepth(p) {
  const f = footOf(p.item, p.rot);
  return p.gx + f[0] + p.gy + f[1];
}

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
  const depth = (p) => (Number.isFinite(p._depth) ? p._depth : isoDepth(p));
  const layer = (p) => {
    // Unknown items are skipped by the renderer — but the SORT runs first, so
    // an unguarded lookup here threw before that guard ever got a chance, and
    // took the whole scene down with it.
    const item = ISO_ITEMS[p.item];
    if (!item) return 0;
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
  let { gx, gy } = clampIsoPlacement(itemKey, snapHalf(want.gx), snapHalf(want.gy), size);
  // clampIsoPlacement is bounds-only by design — it never consults the floor
  // mask. In a courtyard/donut shape the room CENTRE is the hole, so the
  // preferred spawn lands on void: the item renders floating and every drag
  // is refused (IsoRoom won't move a footprint onto void), which reads as
  // "stuck" until a reload, where validation quietly relocates it. Land it
  // on real floor in the first place. Wall items are glued to a wall run by
  // the clamp and have no floor footprint to check.
  if (!item.wall && !footprintFree(gx, gy, footOf(itemKey, 0), size)) {
    const spot = findFreeSpot(itemKey, 0, size, gx, gy);
    if (!spot) return null; // the drawn shape has no room for this piece
    ({ gx, gy } = spot);
  }
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
    // normalizeRot folds a half turn back to a facing this item can actually
    // be DRAWN in — a saved rot 2 on something with no back view would
    // otherwise render upside down. `true` is a legacy shape for rot 1.
    const rot = normalizeRot(p.item, p.rot === true ? 1 : p.rot);
    // Wall decor needs a full-height wall to hang on — outdoors and on a
    // low-walled terrace there isn't one.
    if (ISO_ITEMS[p.item].wall && env && !envHasWalls(env)) continue;
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
  loft: {
    label: "Loft",
    icon: "⭐",
    // L-shaped attic: the front-right corner is cut away.
    size: { w: 10, d: 8, cuts: [{ corner: "front", cw: 4, cd: 3 }] },
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
      { item: "armchair", gx: 1.5, gy: 1.5, tint: "#7f9ec9" },
      // the lamp lights the sofa from the corner instead of standing in the
      // middle of the room
      { item: "floorlamp", gx: 0.5, gy: 1 },
      { item: "dresser", gx: 0, gy: 5, rot: 1, tint: "#3a3142" },
      // ---- the open nook the corner cut leaves ---------------------------
      { item: "beanbag", gx: 2.5, gy: 6, tint: "#8a7ac2" },
      { item: "cat", gx: 4, gy: 6, tint: "#2c2438" },
      { item: "monstera", gx: 0.5, gy: 7 },
      // ---- wall, spaced rather than crowded ------------------------------
      { item: "pennant", gx: 0, gy: 0, tint: "#5b6b9b" },
      { item: "wallshelf", gx: 1.5, gy: 0, tint: "#3a3142" },
      { item: "frame", gx: 3.5, gy: 0, tint: "#3a3142" },
      { item: "neon", gx: 5.5, gy: 0, tint: "#8a7ac2" },
      { item: "mirror", gx: 0, gy: 6.5, rot: 1, tint: "#cbd5e8" },
      // The window the attic deserves, and a screen to curtain off the bed.
      { item: "bigwindow", gx: 7.5, gy: 0 },
      { item: "screen", gx: 6.5, gy: 3 },
    ],
  },
  classic: {
    label: "Cozy study",
    icon: "🕯️",
    size: { w: 9, d: 7 },
    items: [
      // work wall: desk flush against the right wall, stool on its centre —
      // and the resident seated on it, studying (VC2-style)
      // The desk is a SURFACE now, so these three ride on top of it — their
      // stored gx/gy deliberately sits inside the desk's footprint.
      { item: "desk", gx: 3, gy: 0 },
      { item: "computer", gx: 3.5, gy: 0 },
      { item: "mug", gx: 5, gy: 0.5 },
      { item: "deskchair", gx: 4, gy: 1.5 },
      { item: "resident", gx: 4, gy: 1.5 },
      { item: "frame", gx: 1, gy: 0 },
      { item: "wallclock", gx: 4.5, gy: 0 },
      { item: "wallshelf", gx: 6, gy: 0 },
      { item: "floorlamp", gx: 8, gy: 0.5 },
      { item: "bookstack", gx: 2, gy: 4.5 },
      // left wall: bookshelf faces into the room, clear of the window
      { item: "bookshelf", gx: 0, gy: 3, rot: 1 },
      { item: "corkboard", gx: 2.5, gy: 0 },
      // centre: rug + cat, with the cat's own bed just off it
      { item: "stripedrug", gx: 3, gy: 2.5 },
      { item: "cat", gx: 4, gy: 3.5 },
      { item: "petbed", gx: 6.5, gy: 4, tint: "#8a7ac2" },
      // a candle in the window light
      { item: "candle", gx: 1, gy: 2.5 },
      // green corners, a coat by the door, a terrarium on the shelf run
      { item: "monstera", gx: 0.5, gy: 5.5 },
      { item: "plant", gx: 8, gy: 5.5 },
      { item: "shelf", gx: 6.5, gy: 5.5 },
      { item: "terrarium", gx: 5.5, gy: 5.5 },
      { item: "coatrack", gx: 8, gy: 2.5 },
      // A door, and the two things a studious room collects: something
      // half-painted, and a globe to spin while thinking.
      { item: "doorway", gx: 7.5, gy: 0 },
      { item: "easel", gx: 1, gy: 3 },
      { item: "globe", gx: 2, gy: 5 },
    ],
  },
  cabin: {
    label: "Cozy cabin",
    icon: "🪵",
    size: { w: 9, d: 8 },
    items: [
      // sleeping corner: bed flush to the right wall, nightstand beside it
      // (tint = the orange colourway — variants, not free tint)
      { item: "bed", gx: 6.5, gy: 0, tint: "#e0774a" },
      { item: "nightstand", gx: 5.5, gy: 0 },
      // hearth wall, now with an actual hearth: bookshelf, then the
      // fireplace mid-wall, the shelf re-hung over the bed's headboard
      { item: "bookshelf", gx: 1.5, gy: 0 },
      { item: "fireplace", gx: 3.5, gy: 0 },
      { item: "wallshelf", gx: 6.5, gy: 0, tint: "#8a5a3b" },
      { item: "candle", gx: 3, gy: 5, tint: "#e0c9a0" },
      // frame hangs over the sofa (the window owns gy 1–2.5 of this wall)
      { item: "frame", gx: 0, gy: 4, rot: 1, tint: "#6b4a39" },
      // sitting nook on the left wall: sofa faces its table across the rug
      { item: "squarerug", gx: 0.5, gy: 3.5, tint: "#9a6a45" },
      { item: "sofa", gx: 0, gy: 3.5, rot: 1 },
      { item: "coffeetable", gx: 1.5, gy: 4, rot: 1 },
      { item: "cat", gx: 2, gy: 5.5, tint: "#8a5a3b" },
      { item: "floorlamp", gx: 0.5, gy: 6.5 },
      // loose warmth
      { item: "radio", gx: 3.5, gy: 6.5 },
      { item: "cushion", gx: 4, gy: 4.5, tint: "#c98a4b" },
      // wardrobe takes the free stretch of back wall in the corner (the
      // window and its curtains own gy 1–2.5 of the LEFT wall, so it isn't
      // standing in front of them)
      { item: "wardrobe", gx: 0, gy: 0 },
      { item: "plant", gx: 4.5, gy: 7 },
      { item: "monstera", gx: 8, gy: 7 },
      // curtains hang over the window (left wall, gy 1–2.5)
      { item: "curtain", gx: 0, gy: 1, rot: 1, tint: "#9a6a45" },
      { item: "basket", gx: 7.5, gy: 3 },
      // a runner down the middle (layer −1, so furniture sits ON it),
      // storage along the far side, and a jar of lights by the sofa
      { item: "runner", gx: 5, gy: 4, tint: "#9a6a45" },
      { item: "sidetable", gx: 2, gy: 2.5, rot: 1 },
      { item: "crates", gx: 8, gy: 4.5 },
      { item: "ladder", gx: 6, gy: 6.5 },
      { item: "lightjar", gx: 5, gy: 5.5 },
      // Fleece by the hearth with the dog asleep on it, and a lantern.
      { item: "sheepskin", gx: 3, gy: 1 },
      { item: "dog", gx: 3.5, gy: 1.5 },
      { item: "lantern", gx: 5, gy: 2 },
    ],
  },
  cafe: {
    label: "Morning café",
    icon: "☕",
    size: { w: 10, d: 7 },
    items: [
      // a REAL counter row along the back wall: bar, espresso machine, bar,
      // little fridge at the end — an actual café since the kit arrived
      { item: "bookshelf", gx: 0, gy: 0.5, rot: 1 },
      { item: "counter", gx: 3.5, gy: 0 },
      { item: "coffeecounter", gx: 4.5, gy: 0 },
      { item: "counter", gx: 5.5, gy: 0 },
      { item: "fridge", gx: 6.5, gy: 0 },
      { item: "frame", gx: 1.5, gy: 0, tint: "#9a6a45" },
      { item: "wallclock", gx: 3, gy: 0, tint: "#6b4a39" },
      { item: "wallshelf", gx: 6.5, gy: 0, tint: "#9a6a45" },
      { item: "aquarium", gx: 8.5, gy: 0 },
      // Seating set A: two chairs across a table, genuinely facing each other.
      // rot 0 looks toward +gy, rot 2 back toward −gy — the away-facing pair
      // exists now that chairs ship real back-view artwork, so the far chair
      // can sit BEYOND the table and turn round to it instead of every chair
      // having to be tucked behind its own table.
      { item: "rug", gx: 0.5, gy: 2, tint: "#c98a4b" },
      { item: "cafetable", gx: 2, gy: 3 },
      { item: "chair", gx: 2.5, gy: 2 },
      { item: "chair", gx: 2.5, gy: 4.5, rot: 2 },
      // seating set B, same geometry, shifted right and forward
      { item: "cafetable", gx: 6, gy: 4 },
      { item: "chair", gx: 6.5, gy: 3 },
      { item: "chair", gx: 6.5, gy: 5.5, rot: 2 },
      // life
      { item: "floorlamp", gx: 9, gy: 2.5 },
      // clear of set B's far chair — the cat wanders, but it shouldn't
      // START standing inside one
      { item: "cat", gx: 4.5, gy: 5.5 },
      // cushion moved off the monstera — the two used to intersect by 0.16
      // tiles², so the plant appeared to grow out of it
      { item: "cushion", gx: 7.5, gy: 5.5, tint: "#d98a93" },
      { item: "monstera", gx: 9, gy: 6 },
      { item: "plant", gx: 0.5, gy: 5.5 },
      // a café needs somewhere to hang a coat and something on the walls
      { item: "coatrack", gx: 2.5, gy: 5.5 },
      { item: "bookcase", gx: 0, gy: 3, rot: 1 },
      { item: "poster", gx: 0.5, gy: 0 },
      // 8.5, not 8.3: preset coordinates must be half-snapped as written, and
      // the wall shelf runs to 8.1, so this is the next legal slot clear of it
      { item: "hangplant", gx: 8.5, gy: 0 },
      // A way in, and a birdcage — the sort of thing old cafés keep.
      { item: "doorway", gx: 4.5, gy: 0 },
      { item: "birdcage", gx: 4, gy: 1 },
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
      { item: "cactus", gx: 4.5, gy: 7 },
      { item: "lightjar", gx: 7, gy: 7.5 },
      { item: "crates", gx: 9.5, gy: 5.5, tint: "#9a6a45" },
      // a proper tree line: three silhouettes, not three copies of one
      { item: "pine", gx: 3.5, gy: 0 },
      { item: "birch", gx: 7.5, gy: 0 },
      { item: "hedge", gx: 0.5, gy: 2 },
      { item: "rock", gx: 4.5, gy: 1.5 },
      { item: "log", gx: 8, gy: 3 },
      { item: "flowers", gx: 5.5, gy: 6.5 },
      { item: "matrug", gx: 5, gy: 4.5, tint: "#c98a4b" },
      // A hammock strung between the trees, and a rabbit in the grass.
      { item: "hammock", gx: 3, gy: 8 },
      { item: "bunny", gx: 6, gy: 8 },
    ],
  },
  // A REAL café: a working counter run along the back wall, two seating
  // zones on their own rugs, and customers. The env gives it terracotta
  // tiles; the composition rules are the same as everywhere else — counters
  // flush to the wall, each table's chairs on its centreline, the middle
  // walkable.
  cafeteria: {
    label: "Corner café",
    icon: "🥐",
    size: { w: 12, d: 9, env: "cafe" },
    items: [
      // ---- THE BAR, as a zone with DEPTH ----------------------------------
      // The first attempt put everything on the gy 0 line, so the bar was a
      // thin strip against the wall and the props on it hid each other. A
      // real bar is three bands: back-bar shelving against the wall, a metre
      // of barista space, then the counter customers stand at.
      { item: "shelf", gx: 6, gy: 0 },
      { item: "shelf", gx: 7, gy: 0 },
      { item: "shelf", gx: 8, gy: 0 },
      { item: "shelf", gx: 9, gy: 0 },
      { item: "shelf", gx: 10, gy: 0 },
      { item: "fridge", gx: 11, gy: 0 },
      // the counter itself, a step forward — the gap is where staff stand
      { item: "barcounter", gx: 6, gy: 1.5 },
      { item: "barcounter", gx: 7, gy: 1.5 },
      { item: "barcounter", gx: 8, gy: 1.5 },
      { item: "barcounter", gx: 9, gy: 1.5 },
      { item: "coffeecounter", gx: 10, gy: 1.5 },
      // …and what's ON it, spread out so nothing hides anything
      { item: "pastrycase", gx: 6, gy: 1.5 },
      { item: "mug", gx: 8, gy: 1.5 },
      { item: "till", gx: 9, gy: 1.5 },
      // stools at the customer side, clear of the counter's overhang
      { item: "woodstool", gx: 6.5, gy: 2.5 },
      { item: "woodstool", gx: 8, gy: 2.5 },
      { item: "woodstool", gx: 9.5, gy: 2.5 },
      { item: "resident", gx: 8, gy: 2.5, tint: "#e0a374" },
      // menu hangs over the back-bar; the neon sits further along
      { item: "menuboard", gx: 7, gy: 0 },
      { item: "neon", gx: 9.5, gy: 0, tint: "#e0a374" },
      // ---- SEATING, kept on its own side of the room ----------------------
      { item: "persianrug", gx: 0.5, gy: 3, tint: "#7a4034" },
      { item: "cafetable", gx: 1, gy: 3.5 },
      { item: "mug", gx: 1, gy: 3.5 },
      { item: "chair", gx: 0, gy: 4 },
      { item: "chair", gx: 2.5, gy: 4 },
      { item: "resident", gx: 0, gy: 4, tint: "#5b6b9b" },
      { item: "cafetable", gx: 4, gy: 6 },
      { item: "bookstack", gx: 4, gy: 6 },
      { item: "chair", gx: 3, gy: 6.5 },
      { item: "chair", gx: 5.5, gy: 6.5 },
      { item: "resident", gx: 3, gy: 6.5, tint: "#7faf8f" },
      // a planter divides the two zones, the way a real café does it
      { item: "hedge", gx: 5.5, gy: 5, tint: "#3f7f63" },
      // ---- edges: nothing tall or wide in the middle of the floor ---------
      { item: "bookcase", gx: 0, gy: 5.5, rot: 1, tint: "#6b4a39" },
      { item: "coatrack", gx: 0.5, gy: 7.5 },
      { item: "floorlamp", gx: 11, gy: 4 },
      { item: "petbed", gx: 8.5, gy: 6.5, tint: "#c98a4b" },
      { item: "cat", gx: 8.5, gy: 6.5 },
      { item: "monstera", gx: 11, gy: 7.5 },
      { item: "cactus", gx: 2, gy: 8 },
      { item: "plant", gx: 5.5, gy: 8 },
      // left wall: window with curtains, and art between it and the door
      { item: "curtain", gx: 0, gy: 1, rot: 1, tint: "#c98a4b" },
      { item: "frame", gx: 0, gy: 3.5, rot: 1, tint: "#6b4a39" },
      { item: "wallclock", gx: 0.5, gy: 0, tint: "#6b4a39" },
      { item: "corkboard", gx: 2, gy: 0 },
      { item: "poster", gx: 4, gy: 0, tint: "#9a6a45" },
      { item: "hangplant", gx: 5.5, gy: 0 },
      // A game left set up on the corner table, at the other end of it
      // from the books.
      { item: "chess", gx: 4.5, gy: 6.5 },
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
      { item: "deskchair", gx: 7.5, gy: 8 },
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
      { item: "resident", gx: 4, gy: 6.5, tint: "#6fb8cf" },
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
      { item: "resident", gx: 13, gy: 8.5, tint: "#6fb8cf" },
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
      { item: "resident", gx: 2.5, gy: 4, tint: "#e0a374" },
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
  empty: {
    label: "Empty room",
    icon: "🫙",
    size: DEFAULT_ISO_SIZE,
    items: [],
  },
};

export const ISO_PRESET_KEYS = Object.keys(ISO_PRESETS);

/** What a brand-new install opens on — the ⭐ in the Room panel marks it. */
export const DEFAULT_ISO_PRESET = "loft";

export function isoPresetLayout(key) {
  const preset = ISO_PRESETS[key] || ISO_PRESETS[DEFAULT_ISO_PRESET];
  return {
    w: preset.size.w,
    d: preset.size.d,
    ...(preset.size.env && { env: preset.size.env }),
    ...(preset.size.cuts && { cuts: preset.size.cuts.map((c) => ({ ...c })) }),
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
