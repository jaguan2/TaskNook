// Static vocabulary for the isometric room engine: environments, item
// metadata, picker sections and pet customization. Placement behavior and
// geometry stay in isoRoom.js; that module re-exports this public catalog so
// existing consumers keep one stable import surface.

// Environments: what the scene AROUND the tiles is. Same grid, same engine —
// only the dressing changes, which is how VC2 gets its variety.
//
//   walls   "full" cutaway interior · "low" waist-height balustrade · "none"
//   floor   the gradient id IsoRoom fills the tile sheet with
//   floorStyle  the MATERIAL drawn over it: boards / tiles / stone / grass / snow.
//           A flat gradient reads as a coloured plane; grain is what makes
//           the biggest surface in the scene look like a floor.
//   preview a representative flat colour for the preset thumbnail
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
    preview: "rgb(var(--color-wine))",
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
    preview: "#503522",
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
    preview: "#704834",
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
    preview: "#77736b",
    lip: ["#3a3630", "#2e2b26"],
    lights: true,
  },
  garden: {
    label: "Grass",
    icon: "🌿",
    walls: "none",
    floor: "isoGrass",
    floorStyle: "grass",
    preview: "#3d6a50",
    lip: ["#2c2018", "#241a12"],
  },
  snow: {
    label: "Snow",
    icon: "❄️",
    walls: "none",
    floor: "isoSnow",
    floorStyle: "snow",
    preview: "#dce7ea",
    lip: ["#778797", "#667787"],
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

// foot: [tiles along +gx, tiles along +gy] — used for clamping AND depth.
// hitH: rough sprite height in px, for the edit-mode grab target.
// rot 0|1 on a placement mirrors the sprite (screen-mirror = grid-transpose,
// so the footprint swaps to [foot[1], foot[0]] and the item faces the other
// wall). wall: true items hang ON a wall instead of standing on the floor —
// rot picks the wall (0 = right wall along +gx, 1 = left wall along +gy) and
// clamping glues them to it.
export const ISO_ITEMS = {
  rug: { label: "Round rug", icon: "🟣", foot: [3.5, 2.5], layer: -1, hitH: 10, softSeat: true },
  squarerug: { label: "Square rug", icon: "🟪", foot: [2.5, 2], layer: -1, hitH: 10, softSeat: true },
  desk: { label: "Workstation", icon: "🖥️", foot: [2.2, 1.2], hitH: 44, surface: 30, backView: true },
  stool: { label: "Stool", icon: "🪑", foot: [0.8, 0.8], hitH: 28, seat: 20 },
  // Every item here is hand-drawn SVG (see the notes atop the Iso*Items modules). The
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
  laptop: { label: "Laptop", icon: "💻", foot: [0.7, 0.55], hitH: 20, stacks: true, backView: true, tintable: false, glow: [13, 0.22] },
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
  cornstalks: { label: "Bundled cornstalks", icon: "🌽", foot: [0.8, 0.8], hitH: 72, tintable: false },
  applecrate: { label: "Apple crate", icon: "🍎", foot: [0.8, 0.6], hitH: 27 },
  mushroompatch: { label: "Mushroom patch", icon: "🍄", foot: [0.8, 0.7], hitH: 22, tintable: false },
  leafgarland: { label: "Leaf garland", icon: "🍁", foot: [1.4, 0.3], wall: true, hitH: 100, tintable: false },
  leafbarrow: { label: "Leaf wheelbarrow", icon: "🍂", foot: [1.25, 0.75], hitH: 40 },
  mums: { label: "Potted mums", icon: "🌼", foot: [0.6, 0.6], hitH: 42 },
  harvestbasket: { label: "Harvest basket", icon: "🧺", foot: [0.7, 0.55], hitH: 28, stacks: true },
  acornbowl: { label: "Acorn bowl", icon: "🌰", foot: [0.4, 0.35], hitH: 12, stacks: true },
  harvestsign: { label: "Harvest sign", icon: "🪧", foot: [0.65, 0.45], hitH: 58 },
  ciderset: { label: "Hot cider set", icon: "🍎", foot: [0.55, 0.45], hitH: 22, stacks: true },
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
  christmaslights: { label: "Christmas lights", icon: "🎄", foot: [1.4, 0.3], wall: true, hitH: 104, tintable: false, toggleable: true, glow: [24, 0.35] },
  chimney: { label: "Snowy chimney", icon: "🏠", foot: [1, 0.72], hitH: 124 },
  logstack: { label: "Firewood", icon: "🪵", foot: [0.9, 0.6], hitH: 28, seat: 28 },
  icelantern: { label: "Ice lantern", icon: "🕯️", foot: [0.45, 0.45], hitH: 22, stacks: true, flicker: true, glow: [17, 0.36], tintable: false },
  icicles: { label: "Icicles", icon: "🧊", foot: [1, 0.3], wall: true, hitH: 104, tintable: false },
  sled: { label: "Wooden sled", icon: "🛷", foot: [1.35, 0.65], hitH: 32 },
  giftstack: { label: "Wrapped gifts", icon: "🎁", foot: [0.75, 0.6], hitH: 30, stacks: true },
  snowglobe: { label: "Snow globe", icon: "❄️", foot: [0.35, 0.35], hitH: 18, stacks: true },
  evergreengarland: { label: "Evergreen garland", icon: "🌲", foot: [1.4, 0.3], wall: true, hitH: 100, tintable: false },
  stocking: { label: "Knit stocking", icon: "🧦", foot: [0.75, 0.3], wall: true, hitH: 96 },
  blanketbasket: { label: "Blanket basket", icon: "🧺", foot: [0.75, 0.6], hitH: 32 },
  // ---- spring ----------------------------------------------------------
  blossomtree: { label: "Blossom tree", icon: "🌸", foot: [1.5, 1.5], hitH: 122 },
  tulips: { label: "Tulips", icon: "🌷", foot: [0.6, 0.6], hitH: 26 },
  wateringcan: { label: "Watering can", icon: "🪴", foot: [0.5, 0.45], hitH: 20, stacks: true },
  birdbath: { label: "Bird bath", icon: "🐦", foot: [0.8, 0.8], hitH: 34 },
  seedtray: { label: "Seedlings", icon: "🌱", foot: [0.7, 0.5], hitH: 12, stacks: true },
  bunting: { label: "Bunting", icon: "🎉", foot: [1.4, 0.3], wall: true, hitH: 100 },
  // ---- summer ----------------------------------------------------------
  pool: { label: "Swimming pool", icon: "🏊", foot: [3.5, 2.5], layer: -1, hitH: 14, tintable: false },
  longpool: { label: "Long swimming pool", icon: "🏊", foot: [7, 2.5], layer: -1, hitH: 14, tintable: false },
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
  bed: { label: "Bed", icon: "🛏️", foot: [2, 2.8], hitH: 40, seat: 18, lie: true, tuck: true },
  cushion: { label: "Floor cushion", icon: "🧶", foot: [0.9, 0.9], hitH: 18, seat: 13 },
  flowercushion: { label: "Flower cushion", icon: "🌼", foot: [1, 1], hitH: 18, seat: 13 },
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
  openjournal: { label: "Open journal", icon: "📖", foot: [0.9, 0.65], hitH: 8, stacks: true },
  foldedblanket: { label: "Folded blanket", icon: "🧶", foot: [0.9, 0.65], hitH: 12, stacks: true },
  booktrolley: { label: "Book trolley", icon: "📚", foot: [1.3, 0.7], hitH: 46, surface: 32 },
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
  runner: { label: "Runner rug", icon: "🟫", foot: [3, 1], layer: -1, hitH: 10, softSeat: true },
  ovalrug: { label: "Oval rug", icon: "⭕", foot: [2.2, 1.7], layer: -1, hitH: 10, softSeat: true },
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
  // Pets roam independently and settle on soft ground; people stay placed.
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
  fairylights: { label: "Fairy lights", icon: "✨", foot: [2, 0.3], wall: true, hitH: 104, tintable: false, toggleable: true, glow: [22, 0.16] },
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
  gardenpond: { label: "Garden pond", icon: "🪷", foot: [8, 6], layer: -1, hitH: 28, tintable: false },
  gardentrail: { label: "Stepping-stone trail", icon: "🪨", foot: [3.5, 1.5], layer: -1, hitH: 6, tintable: false },
  picnic: { label: "Picnic blanket", icon: "🧺", foot: [2, 1.5], layer: -1, hitH: 10, softSeat: true },
  bench: { label: "Garden bench", icon: "🪑", foot: [1.6, 0.6], hitH: 34, seat: 16, backView: true },
  flowerbed: { label: "Flower patch", icon: "🌼", foot: [1, 0.6], hitH: 22 },
  // Residents stay where placed: seated on furniture/soft ground or standing
  // on clear floor. They move only when carried. Tint = their sweater.
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
  persianrug: { label: "Patterned rug", icon: "🔶", foot: [3, 2.2], layer: -1, hitH: 10, softSeat: true },
  stripedrug: { label: "Striped rug", icon: "🟦", foot: [2.6, 1.8], layer: -1, hitH: 10, softSeat: true },
  sheepskin: { label: "Sheepskin", icon: "☁️", foot: [1.8, 1.5], layer: -1, hitH: 10, softSeat: true },
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
      "cushion", "flowercushion", "bed", "bench", "log", "hammock"],
  },
  {
    label: "Tables & desks",
    keys: ["desk", "diningtable", "cafetable", "coffeetable", "sidetable", "nightstand",
      "counter", "barcounter", "coffeecounter"],
  },
  {
    label: "Storage",
    keys: ["bookshelf", "bookcase", "shelf", "wardrobe", "dresser", "tvunit",
      "pastrycase", "crates", "basket", "vinylcrate", "ladder", "coatrack", "booktrolley"],
  },
  {
    label: "Rugs & floor",
    keys: ["rug", "squarerug", "ovalrug", "runner", "persianrug", "stripedrug",
      "sheepskin", "matrug", "picnic", "petbed", "pond", "gardenpond", "gardentrail"],
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
      "globe", "chess", "guitar", "bookstack", "openjournal", "foldedblanket", "till"],
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
      "pennant", "neon", "fairylights", "sconce", "pendant", "curtain", "hangplant"],
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
    keys: ["mapletree", "leafpile", "haybale", "pumpkin", "jackolantern", "rake", "scarecrow", "turkey", "wreath",
      "cornstalks", "applecrate", "mushroompatch", "leafgarland", "leafbarrow", "mums", "harvestbasket",
      "acornbowl", "harvestsign", "ciderset"],
  },
  {
    label: "Winter",
    keys: ["snowpine", "snowman", "snowdrift", "snowballs", "christmastree", "snowangel",
      "logstack", "icelantern", "chimney", "christmaslights", "icicles", "sled", "giftstack",
      "snowglobe", "evergreengarland", "stocking", "blanketbasket"],
  },
  {
    label: "Spring",
    keys: ["blossomtree", "tulips", "wateringcan", "birdbath", "seedtray", "bunting"],
  },
  {
    label: "Summer",
    keys: ["pool", "longpool", "coconutpalm", "poolumbrella", "beachball", "sunlounger"],
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
 * sprite reads the key and draws that fur (IsoPetItems.jsx owns the artwork;
 * this room model owns only the allowed look keys); the wander engine
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
