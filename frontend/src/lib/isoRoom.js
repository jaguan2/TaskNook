// The isometric room's decoration model: a resizable W×D tile floor and
// items placed ON the grid as { id, item, gx, gy, tint? } (tile coordinates,
// half-tile snapping). Pure data + functions; projection math lives in
// lib/iso.js and the artwork in components/IsoItems.jsx.

import { createIsoPresets } from "./isoPresets";

export const ISO_SIZE_MIN = 3;
export const ISO_SIZE_MAX = 48;
export const DEFAULT_ISO_SIZE = { w: 9, d: 7 };
// Versioned because normalization occasionally needs to repair an old saved
// arrangement without forever overriding choices the user makes afterward.
export const ISO_LAYOUT_VERSION = 2;
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
// The panel presents these as FLOOR choices (owner decision, 2026-08-10 —
// "setting: Room/Café/Library" was a second room-identity concept fighting
// the presets for the same job; a floor material is what you actually see).
// Each floor still brings its environment along — walls, window, string
// lights, lip colours — and the KEYS are untouchable: they are what layouts
// store and what the backend whitelists (`ISO_ENVS` in app.py, kept in sync
// by test_room.py parsing this block).
export const ISO_ENVS = {
  room: {
    label: "Boards",
    icon: "🪵",
    walls: "full",
    floor: "isoFloor",
    floorStyle: "boards",
    lip: ["#1d0f1f", "#170c19"],
    window: true,
    lights: true,
  },
  library: {
    label: "Dark boards",
    icon: "🟫",
    walls: "full",
    floor: "isoWood",
    floorStyle: "boards",
    lip: ["#2a1a12", "#221410"],
    window: true,
    // The only indoor env without them, which is why the Reading room and the
    // Study hall had NOTHING above eye level — both have walls shelved end to
    // end, so there's no free run to hang a pendant in, and the env is the
    // only place the ceiling zone can be filled without displacing furniture.
    lights: true,
  },
  cafe: {
    label: "Terracotta",
    icon: "🧱",
    walls: "full",
    floor: "isoTile",
    floorStyle: "tiles",
    lip: ["#2e211c", "#261b17"],
    window: true,
    lights: true,
  },
  terrace: {
    label: "Stone",
    icon: "🪨",
    walls: "low",
    floor: "isoStone",
    floorStyle: "stone",
    lip: ["#3a3630", "#2e2b26"],
    lights: true,
  },
  garden: {
    label: "Grass",
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

// A layout may carry its own `walls` ("full" | "low" | "none"), overriding
// the floor's default — grass with full walls is a courtyard, boards with
// none is a stage, and neither needed a new env to exist. Mirrored in
// app.py's ISO_WALLS (same both-languages contract as ISO_ENVS).
export const WALL_MODES = ["full", "low", "none"];
export const ISO_LIGHTING = {
  natural: { label: "Natural", color: "#ffe8c2", opacity: 0.1 },
  golden: { label: "Golden hour", color: "#ffb45e", opacity: 0.18 },
  candle: { label: "Candlelit", color: "#ff8a4c", opacity: 0.15 },
  moonlit: { label: "Moonlit", color: "#7f9ee8", opacity: 0.12 },
};
export const ISO_LIGHTING_KEYS = Object.keys(ISO_LIGHTING);

/** Resolve the shell independently from the floor material. */
export const wallModeOf = (key, walls) =>
  WALL_MODES.includes(walls) ? walls : envOf(key).walls;

/** Can wall decor hang here? Full-height walls only. */
export const envHasWalls = (key, walls) => wallModeOf(key, walls) === "full";

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
  plantshelf: { label: "Plant display", icon: "🌿", foot: [1.5, 0.6], hitH: 74 },
  bookcase: { label: "Wide bookcase", icon: "📚", foot: [2, 0.6], hitH: 66 },
  sidetable: { label: "Side table", icon: "🗃️", foot: [1.2, 0.5], hitH: 32, surface: 28 },
  // The set and the laptop are separate placeables as well as parts of the
  // TV unit and the desk: what sits ON furniture should be movable.
  tv: { label: "Television", icon: "📺", foot: [1.3, 0.5], hitH: 42, stacks: true, tintable: false, glow: [24, 0.3] },
  laptop: { label: "Laptop", icon: "💻", foot: [0.7, 0.55], hitH: 20, stacks: true, tintable: false, glow: [13, 0.22] },
  // ---- autumn ----------------------------------------------------------
  // A seasonal set, grouped together in the picker so it reads as a set
  // rather than as seven unrelated things scattered through the catalog.
  mapletree: { label: "Maple", icon: "🍁", foot: [1.5, 1.5], hitH: 124 },
  leafpile: { label: "Leaf pile", icon: "🍂", foot: [1, 0.8], hitH: 16 },
  haybale: { label: "Hay bale", icon: "🌾", foot: [0.9, 0.7], hitH: 26, seat: 26 },
  pumpkin: { label: "Pumpkin", icon: "🎃", foot: [0.5, 0.5], hitH: 20, stacks: true },
  jackolantern: { label: "Jack-o'-lantern", icon: "🎃", foot: [0.5, 0.5], hitH: 20, stacks: true, flicker: true, glow: [15, 0.34] },
  rake: { label: "Rake", icon: "🧹", foot: [0.4, 0.4], hitH: 62 },
  scarecrow: { label: "Scarecrow", icon: "🌾", foot: [1.1, 0.9], hitH: 78 },
  turkey: { label: "Turkey", icon: "🦃", foot: [0.9, 0.8], hitH: 38 },
  wreath: { label: "Wreath", icon: "🌿", foot: [0.9, 0.3], wall: true, hitH: 96 },
  // ---- winter ----------------------------------------------------------
  // The second seasonal set, and the reason autumn wasn't a one-off: a season
  // is a reason to redecorate, and one season only works for three months.
  // Same shape as autumn — a hero tree, something to sit on, something low and
  // wide, one light, one wall piece.
  snowpine: { label: "Snowy pine", icon: "🌲", foot: [1.3, 1.3], hitH: 118 },
  snowman: { label: "Snowman", icon: "⛄", foot: [0.8, 0.8], hitH: 52 },
  snowdrift: { label: "Snow drift", icon: "❄️", foot: [1.2, 0.9], hitH: 14 },
  snowballs: { label: "Snowballs", icon: "⚪", foot: [0.9, 0.7], hitH: 28, tintable: false },
  christmastree: { label: "Christmas tree", icon: "🎄", foot: [1.4, 1.4], hitH: 126, glow: [32, 0.34] },
  snowangel: { label: "Snow angel", icon: "❄️", foot: [2.4, 1.6], layer: -1, hitH: 10, tintable: false },
  christmaslights: { label: "Christmas lights", icon: "🎄", foot: [1.4, 0.3], wall: true, hitH: 104, tintable: false, glow: [24, 0.35] },
  chimney: { label: "Snowy chimney", icon: "🏠", foot: [1, 0.72], hitH: 112 },
  logstack: { label: "Firewood", icon: "🪵", foot: [0.9, 0.6], hitH: 28, seat: 28 },
  icelantern: { label: "Ice lantern", icon: "🕯️", foot: [0.45, 0.45], hitH: 22, stacks: true, flicker: true, glow: [17, 0.36] },
  icicles: { label: "Icicles", icon: "🧊", foot: [1, 0.3], wall: true, hitH: 104 },
  // ---- spring ----------------------------------------------------------
  blossomtree: { label: "Blossom tree", icon: "🌸", foot: [1.5, 1.5], hitH: 122 },
  tulips: { label: "Tulips", icon: "🌷", foot: [0.6, 0.6], hitH: 26 },
  wateringcan: { label: "Watering can", icon: "🪴", foot: [0.5, 0.45], hitH: 20, stacks: true },
  birdbath: { label: "Bird bath", icon: "🐦", foot: [0.8, 0.8], hitH: 34 },
  seedtray: { label: "Seedlings", icon: "🌱", foot: [0.7, 0.5], hitH: 12, stacks: true },
  bunting: { label: "Bunting", icon: "🎉", foot: [1.4, 0.3], wall: true, hitH: 100 },
  // ---- summer ----------------------------------------------------------
  pool: { label: "Swimming pool", icon: "🏊", foot: [3.5, 2.5], layer: -1, hitH: 14, tintable: false },
  coconutpalm: { label: "Coconut palm", icon: "🌴", foot: [1.5, 1.5], hitH: 122 },
  poolumbrella: { label: "Pool umbrella", icon: "⛱️", foot: [1.5, 1.5], hitH: 86 },
  beachball: { label: "Beach ball", icon: "🏖️", foot: [0.6, 0.6], hitH: 22, tintable: false },
  sunlounger: { label: "Sun lounger", icon: "🪑", foot: [1.6, 0.85], hitH: 46, seat: 18, lie: true },
  // ---- kitchen ---------------------------------------------------------
  oven: { label: "Oven", icon: "🍳", foot: [0.9, 0.7], hitH: 42, surface: 40 },
  sink: { label: "Sink", icon: "🚰", foot: [0.9, 0.65], hitH: 36 },
  microwave: { label: "Microwave", icon: "📦", foot: [0.65, 0.45], hitH: 18, stacks: true },
  toaster: { label: "Toaster", icon: "🍞", foot: [0.4, 0.35], hitH: 14, stacks: true },
  kettle: { label: "Kettle", icon: "🍵", foot: [0.35, 0.35], hitH: 15, stacks: true },
  pot: { label: "Stockpot", icon: "🍲", foot: [0.4, 0.4], hitH: 14, stacks: true },
  // ---- food ------------------------------------------------------------
  // Every one of these `stacks`: food belongs on a table, and on open floor it
  // just sits there, which is what the mechanic already does.
  teapot: { label: "Teapot", icon: "🫖", foot: [0.4, 0.35], hitH: 14, stacks: true },
  fruitbowl: { label: "Fruit bowl", icon: "🍎", foot: [0.4, 0.4], hitH: 10, stacks: true },
  bread: { label: "Bread", icon: "🥖", foot: [0.4, 0.3], hitH: 10, stacks: true },
  cake: { label: "Cake", icon: "🍰", foot: [0.4, 0.4], hitH: 14, stacks: true },
  pie: { label: "Pie", icon: "🥧", foot: [0.4, 0.4], hitH: 9, stacks: true },
  ramen: { label: "Ramen", icon: "🍜", foot: [0.35, 0.35], hitH: 10, stacks: true },
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
  // ---- mood lighting (2026-08-19): three more ways to light a corner ----
  lavalamp: { label: "Lava lamp", icon: "🌋", foot: [0.4, 0.4], hitH: 30, stacks: true, glow: [15, 0.3] },
  mushroomlamp: { label: "Mushroom lamp", icon: "🍄", foot: [0.45, 0.45], hitH: 26, stacks: true, glow: [17, 0.4] },
  // a green moon is not a moon
  moonlamp: { label: "Moon lamp", icon: "🌕", foot: [0.35, 0.35], hitH: 16, stacks: true, tintable: false, glow: [13, 0.3] },
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
  fern: { label: "Fern", icon: "🌿", foot: [0.7, 0.7], hitH: 52 },
  palm: { label: "Parlour palm", icon: "🌴", foot: [0.9, 0.9], hitH: 104 },
  snakeplant: { label: "Snake plant", icon: "🪴", foot: [0.6, 0.6], hitH: 72 },
  // The three small ones stack: a plant belongs on a windowsill or a desk at
  // least as often as on the floor.
  bonsai: { label: "Bonsai", icon: "🌳", foot: [0.5, 0.45], hitH: 30, stacks: true },
  succulent: { label: "Succulent", icon: "🌵", foot: [0.35, 0.35], hitH: 16, stacks: true },
  orchid: { label: "Orchid", icon: "🌸", foot: [0.4, 0.4], hitH: 36, stacks: true },
  plant: { label: "Potted plant", icon: "🪴", foot: [0.6, 0.6], hitH: 46, stacks: true },
  floorlamp: { label: "Floor lamp", icon: "💡", hitH: 84, foot: [0.8, 0.8], glow: [34, 0.72] },
  // roamer: wanders like a persona, but with cat rules — finds a rug, naps.
  cat: { label: "Cat", icon: "🐈", foot: [1.2, 0.8], hitH: 34, roamer: true },
  // Architecture: openings that give a wall somewhere to look through.
  archway: { label: "Archway", icon: "🏛️", foot: [2, 0.3], wall: true, hitH: 104 },
  doorway: { label: "Door", icon: "🚪", foot: [1.2, 0.3], wall: true, hitH: 96 },
  bigwindow: { label: "Tall window", icon: "🪟", foot: [1.8, 0.3], wall: true, hitH: 104 },
  // Structure that stands ON the floor rather than hanging on a wall. The
  // stair climbs into a dark landing for the same reason the arch is a recess
  // and not a hole: a flight that plainly goes somewhere costs one sprite,
  // where a real upper storey would be a change to the whole model.
  stairs: { label: "Staircase", icon: "🪜", foot: [1, 2.5], hitH: 72, backView: true },
  railing: { label: "Railing", icon: "🚧", foot: [2, 0.25], hitH: 38 },
  pillar: { label: "Pillar", icon: "🏛️", foot: [0.6, 0.6], hitH: 118 },
  frame: { label: "Picture frame", icon: "🖼️", foot: [1.4, 0.3], wall: true, hitH: 100 },
  wallshelf: { label: "Wall shelf", icon: "📚", foot: [1.6, 0.3], wall: true, hitH: 96 },
  mirror: { label: "Round mirror", icon: "🪞", foot: [1.1, 0.3], wall: true, hitH: 96 },
  wallclock: { label: "Wall clock", icon: "🕰️", foot: [0.8, 0.3], wall: true, hitH: 100 },
  poster: { label: "Poster", icon: "🖼️", foot: [1, 0.3], wall: true, hitH: 98 },
  menuboard: { label: "Menu board", icon: "📋", foot: [1.8, 0.3], wall: true, hitH: 100 },
  curtain: { label: "Curtains", icon: "🪟", foot: [1.6, 0.3], wall: true, hitH: 110 },
  hangplant: { label: "Hanging plant", icon: "🌿", foot: [0.7, 0.3], wall: true, hitH: 110 },
  neon: { label: "Neon sign", icon: "💡", foot: [1.4, 0.3], wall: true, hitH: 94, glow: [30, 0.4] },
  sconce: { label: "Wall sconce", icon: "🕯️", foot: [0.6, 0.3], wall: true, hitH: 96, flicker: true, glow: [17, 0.34] },
  pendant: { label: "Pendant light", icon: "💡", foot: [0.8, 0.3], wall: true, hitH: 118, glow: [27, 0.5] },
  corkboard: { label: "Corkboard", icon: "📌", foot: [1.2, 0.3], wall: true, hitH: 100 },
  pennant: { label: "Pennant", icon: "🚩", foot: [0.9, 0.3], wall: true, hitH: 100 },
  fireplace: { label: "Fireplace", icon: "🔥", foot: [1.6, 0.7], hitH: 78, flicker: true, glow: [44, 0.7] },
  recordplayer: { label: "Record player", icon: "📀", foot: [1.2, 0.7], hitH: 42 },
  candle: { label: "Candle", icon: "🕯️", foot: [0.4, 0.4], hitH: 28, stacks: true, flicker: true, glow: [16, 0.35] },
  tablelamp: { label: "Table lamp", icon: "🛋️", foot: [0.45, 0.45], hitH: 30, stacks: true, glow: [18, 0.45] },
  candelabra: { label: "Candelabra", icon: "🕯️", foot: [0.5, 0.5], hitH: 46, stacks: true, flicker: true, glow: [20, 0.4] },
  paperlantern: { label: "Paper lamp", icon: "🏮", foot: [0.7, 0.7], hitH: 78, glow: [26, 0.5] },
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
  // YOU. A persona like the resident, but the only one drawn with the
  // character from your profile — and `unique` so a saved layout can never
  // contain two of you, however it got there. The generic residents stay
  // generic: with the character on every one of them, dropping four people in
  // the study hall gave you four identical copies of yourself.
  // hitH is only ever the parking spot for the ⟳/✕ chrome, and YOU are the
  // one persona who can be taller than their own head: at 46 the buttons sat
  // squarely on top of the thought cloud whenever a block was running. It rose
  // again when the figure got its proper proportions and the cloud went with
  // the taller head.
  you: { label: "You", icon: "🙋", foot: [0.8, 0.8], hitH: 84, persona: true, self: true, unique: true },
  // hitH covers the TALLEST slider combo (long legs + long torso ≈ 64px).
  resident: { label: "Resident", icon: "🧍", foot: [0.8, 0.8], hitH: 66, persona: true },
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
  lantern: { label: "Garden lantern", icon: "🏮", foot: [0.5, 0.5], hitH: 58, flicker: true, glow: [26, 0.45] },
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
    keys: ["bookshelf", "bookcase", "shelf", "wardrobe", "dresser", "tvunit",
      "pastrycase", "crates", "basket", "vinylcrate", "ladder", "coatrack"],
  },
  {
    label: "Rugs & floor",
    keys: ["rug", "squarerug", "ovalrug", "runner", "persianrug", "stripedrug",
      "sheepskin", "matrug", "picnic", "petbed", "pond"],
  },
  {
    label: "Light & warmth",
    keys: ["floorlamp", "desklamp", "tablelamp", "paperlantern", "lantern", "candle",
      "candelabra", "lightjar", "lavalamp", "mushroomlamp", "moonlamp", "fireplace"],
  },
  {
    label: "Plants & greenery",
    keys: ["plantshelf", "monstera", "palm", "fern", "snakeplant", "plant", "cactus", "succulent",
      "orchid", "bonsai", "flowers", "flowerbed", "terrarium"],
  },
  {
    label: "Decoration",
    keys: ["piano", "easel", "screen", "birdcage", "standmirror", "aquarium",
      "globe", "chess", "guitar", "bookstack", "till"],
  },
  {
    label: "Tech & music",
    keys: ["computer", "laptop", "tv", "radio", "recordplayer"],
  },
  {
    label: "Architecture",
    keys: ["archway", "doorway", "bigwindow", "stairs", "railing", "pillar"],
  },
  {
    label: "On the wall",
    keys: ["frame", "poster", "wallshelf", "mirror", "wallclock", "menuboard", "corkboard",
      "pennant", "neon", "sconce", "pendant", "curtain", "hangplant"],
  },
  {
    label: "Kitchen",
    keys: ["oven", "sink", "fridge", "microwave", "toaster", "kettle", "pot"],
  },
  {
    label: "Food & drink",
    keys: ["teapot", "mug", "fruitbowl", "bread", "cake", "pie", "ramen"],
  },
  {
    label: "Autumn",
    keys: ["mapletree", "leafpile", "haybale", "pumpkin", "jackolantern", "rake", "scarecrow", "turkey", "wreath"],
  },
  {
    label: "Winter",
    keys: ["snowpine", "snowman", "snowdrift", "snowballs", "christmastree", "snowangel",
      "logstack", "icelantern", "chimney", "christmaslights", "icicles"],
  },
  {
    label: "Spring",
    keys: ["blossomtree", "tulips", "wateringcan", "birdbath", "seedtray", "bunting"],
  },
  {
    label: "Summer",
    keys: ["pool", "coconutpalm", "poolumbrella", "beachball", "sunlounger"],
  },
  {
    label: "Outdoors",
    keys: ["tree", "pine", "birch", "bush", "hedge", "rock"],
  },
  {
    label: "Living things",
    keys: ["you", "resident", "cat", "dog", "bunny"],
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
  // SOFT GROUND (seated life, 2026-08-19): a rug, cushion or blanket under
  // the centre seats a persona cross-legged on the floor — floor-sitting is
  // how a sparse room still offers somewhere to be, and it's peak cozy.
  // `soft: true` tells the occupancy rule a rug seats MANY (it isn't a
  // chair); real seats win the loop above, so a stool ON a rug still reads
  // as the stool. The pond is water, not upholstery.
  for (const other of placements) {
    if (other.id === placement.id) continue;
    const it = ISO_ITEMS[other.item];
    if (!it || it.layer !== -1 || other.item === "pond") continue;
    if (centreOver(placement, other)) {
      return { placement: other, height: 1.5, lie: false, soft: true };
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
    const of = footOf(p.item, p.rot);
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
    if (it && it.layer === -1 && p.item !== "pond" && !it.persona) return centreOn(p);
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
 * Still not the edit-mode drag rule (that one only refuses void tiles —
 * decorating is deliberate, overlap included).
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
  // Soft ground and bare floor both refuse furniture overlap — the wander
  // engine's "bumped into furniture" rule.
  return !others.some((o) => {
    const it = ISO_ITEMS[o.item];
    if (!it || it.wall || it.persona || it.roamer || it.layer === -1) return false;
    const of = footOf(o.item, o.rot);
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
    const of = footOf(o.item, o.rot);
    return (
      gx < o.gx + of[0] && o.gx < gx + foot[0] && gy < o.gy + of[1] && o.gy < gy + foot[1]
    );
  });
}

/**
 * PET TEMPERS — how a pet's personality reaches the wander engine. Three
 * numbers each: `chance` (how often a roam tick actually moves them),
 * `stay` (how sticky a soft spot is once they've curled up on it) and
 * `range` (how far from home they drift). Mellow is the default and matches
 * the engine's classic behaviour, so an unnamed pet acts exactly as pets
 * always did. The keys are mirrored in backend app.py (`PET_TEMPERS`) —
 * same both-languages contract as ISO_ENVS.
 */
export const PET_TEMPERS = [
  { key: "mellow", label: "Mellow", chance: 1, stay: 0.8, range: 1.5 },
  { key: "curious", label: "Curious", chance: 1, stay: 0.4, range: 2.6 },
  { key: "sleepy", label: "Sleepy", chance: 0.3, stay: 0.96, range: 0.8 },
];
export const petTemper = (key) =>
  PET_TEMPERS.find((t) => t.key === key) || PET_TEMPERS[0];
// A pet's name: short, trimmed, and never just whitespace.
export const PET_NAME_MAX = 16;
export const cleanPetName = (raw) =>
  typeof raw === "string" ? raw.trim().slice(0, PET_NAME_MAX) : "";

/**
 * PET LOOKS — coat patterns for cats, breeds for dogs. Purely visual: the
 * sprite reads the key and draws that fur (IsoItems.jsx owns the artwork,
 * exactly as it owns which items have four rotations); the wander engine
 * never looks at it. Per-species lists because a calico dog isn't a thing.
 * The FIRST entry of each list is the classic drawing and is stored
 * implicitly — same contract as temper's "mellow" — so every pet that
 * exists today keeps its exact look. Keys from both lists are mirrored in
 * backend app.py (`PET_LOOKS`), the same both-languages drift contract as
 * PET_TEMPERS/ISO_ENVS (test_room.py parses this block).
 */
export const CAT_COATS = [
  { key: "ink", label: "Ink" },
  { key: "ginger", label: "Ginger" },
  { key: "greytabby", label: "Grey tabby" },
  { key: "tuxedo", label: "Tuxedo" },
  { key: "calico", label: "Calico" },
  { key: "siamese", label: "Siamese" },
  { key: "tortie", label: "Tortoiseshell" },
];
export const DOG_BREEDS = [
  { key: "golden", label: "Golden" },
  { key: "shiba", label: "Shiba" },
  { key: "corgi", label: "Corgi" },
  { key: "dalmatian", label: "Dalmatian" },
  { key: "husky", label: "Husky" },
];
export const BUNNY_COATS = [
  { key: "cloud", label: "Cloud" },
  { key: "snow", label: "Snow" },
  { key: "cocoa", label: "Cocoa" },
];
/** The look list an item's pets choose from, or null for a one-look species. */
export const PET_LOOKS = { cat: CAT_COATS, dog: DOG_BREEDS, bunny: BUNNY_COATS };
export const petLooksFor = (item) => PET_LOOKS[item] || null;
/** True only for a NON-DEFAULT look this species actually has — what gets stored. */
export const isStorableLook = (item, key) => {
  const looks = PET_LOOKS[item];
  return !!looks && looks.some((l, i) => l.key === key && i > 0);
};

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
    // The sitter faces AWAY from the backrest. Rot 0/1 put the backrest on
    // the far edge, so the resident faces us; rot 2/3 put it on the near edge,
    // so the resident faces into the room. Keeping this coupled to the real
    // backrest position prevents the impossible desk pose where the chair's
    // back sits between the person and their computer.
    // Rugs and cushions are shared soft ground, not directional furniture;
    // their stored `rot` describes the textile, not where a floor-sitter is
    // looking. Keep those residents welcomingly front-facing.
    _facing: seat.soft ? "front" : away ? "back" : "front",
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
/** Do two placements' footprints overlap on the floor? */
export function footprintsOverlap(a, b) {
  const af = footOf(a.item, a.rot);
  const bf = footOf(b.item, b.rot);
  return (
    a.gx < b.gx + bf[0] &&
    b.gx < a.gx + af[0] &&
    a.gy < b.gy + bf[1] &&
    b.gy < a.gy + af[1]
  );
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
export function spotIsClear(gx, gy, itemKey, rot, size, placements) {
  if (!footprintFree(gx, gy, footOf(itemKey, rot), size)) return false;
  const me = { item: itemKey, rot, gx, gy };
  return !placements.some((p) => blocksSpawn(p.item) && footprintsOverlap(me, p));
}

/** Nearest half-snapped spot to (nearGx, nearGy) this piece fits in. Pass
 *  `placements` to also require it be clear of the furniture already there. */
export function findFreeSpot(itemKey, rot, size, nearGx, nearGy, placements = null) {
  const f = footOf(itemKey, rot);
  let best = null;
  let bestDist = Infinity;
  for (let x = 0; x <= (size.w - f[0]) * 2; x++) {
    for (let y = 0; y <= (size.d - f[1]) * 2; y++) {
      const gx = x / 2;
      const gy = y / 2;
      const ok = placements
        ? spotIsClear(gx, gy, itemKey, rot, size, placements)
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
  const f = footOf(p.item, p.rot);
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
    const [fw, fd] = footOf(placement.item, placement.rot);
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
  return { id: makeId(), item: itemKey, gx: snapHalf(gx), gy: snapHalf(gy) };
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
    // normalizeRot folds a half turn back to a facing this item can actually
    // be DRAWN in — a saved rot 2 on something with no back view would
    // otherwise render upside down. `true` is a legacy shape for rot 1.
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
    let { gx, gy } = clampIsoPlacement(p.item, snapHalf(p.gx), snapHalf(p.gy), size, rot);
    // An item over void tiles is relocated to the nearest floor spot, or
    // dropped if the drawn shape has no room for it at all.
    if (!ISO_ITEMS[p.item].wall && !footprintFree(gx, gy, footOf(p.item, rot), size)) {
      const spot = findFreeSpot(p.item, rot, size, gx, gy);
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
    clean.push({
      id,
      item: p.item,
      gx,
      gy,
      ...(rot && { rot }),
      ...(tint && { tint }),
      ...(name && { name }),
      ...(temper && { temper }),
      ...(look && { look }),
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
