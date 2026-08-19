/**
 * Who you are, and what your resident looks like — the pure model.
 *
 * Two separate things live here because two separate things are stored (see
 * `User.profile` / `User.character` in the backend):
 *
 *   profile   — facts about you: name, MBTI, birth date, pronouns, a line of bio.
 *   character — how your resident is DRAWN: skin, hair, outfit, expression.
 *
 * The backend validates neither vocabulary — it only guarantees a bounded flat
 * map of scalars. This file is the vocabulary, exactly like `lib/room.js` owns
 * the furniture catalog, so adding a hairstyle or a profile question is a
 * frontend change with no migration.
 *
 * Everything here is a pure function so it can be tested in the fast `node`
 * environment; nothing touches the DOM, the store, or `localStorage`.
 */
import { BUILD_SHAPE, WIDTH_RANGE, HEIGHT_RANGE, TORSO_RANGE, LEG_H, TORSO_H } from "./body";

// --------------------------------------------------------------------------- //
// MBTI
// --------------------------------------------------------------------------- //
// Listed rather than generated from the four axes so each one can carry the
// nickname people actually recognise it by — "INFP" alone means nothing to
// someone who hasn't taken the test.
export const MBTI_TYPES = [
  { key: "INTJ", label: "Architect" },
  { key: "INTP", label: "Logician" },
  { key: "ENTJ", label: "Commander" },
  { key: "ENTP", label: "Debater" },
  { key: "INFJ", label: "Advocate" },
  { key: "INFP", label: "Mediator" },
  { key: "ENFJ", label: "Protagonist" },
  { key: "ENFP", label: "Campaigner" },
  { key: "ISTJ", label: "Logistician" },
  { key: "ISFJ", label: "Defender" },
  { key: "ESTJ", label: "Executive" },
  { key: "ESFJ", label: "Consul" },
  { key: "ISTP", label: "Virtuoso" },
  { key: "ISFP", label: "Adventurer" },
  { key: "ESTP", label: "Entrepreneur" },
  { key: "ESFP", label: "Entertainer" },
];

const MBTI_KEYS = new Set(MBTI_TYPES.map((t) => t.key));

export function isMbti(value) {
  return typeof value === "string" && MBTI_KEYS.has(value.toUpperCase());
}

// --------------------------------------------------------------------------- //
// Zodiac
// --------------------------------------------------------------------------- //
export const ZODIAC = {
  aries: { label: "Aries", symbol: "♈", element: "fire" },
  taurus: { label: "Taurus", symbol: "♉", element: "earth" },
  gemini: { label: "Gemini", symbol: "♊", element: "air" },
  cancer: { label: "Cancer", symbol: "♋", element: "water" },
  leo: { label: "Leo", symbol: "♌", element: "fire" },
  virgo: { label: "Virgo", symbol: "♍", element: "earth" },
  libra: { label: "Libra", symbol: "♎", element: "air" },
  scorpio: { label: "Scorpio", symbol: "♏", element: "water" },
  sagittarius: { label: "Sagittarius", symbol: "♐", element: "fire" },
  capricorn: { label: "Capricorn", symbol: "♑", element: "earth" },
  aquarius: { label: "Aquarius", symbol: "♒", element: "air" },
  pisces: { label: "Pisces", symbol: "♓", element: "water" },
};

// [month, first day of that sign, sign]. A date on or after the cutoff is the
// listed sign; before it, it still belongs to the previous month's entry.
const CUSPS = [
  [1, 20, "aquarius"],
  [2, 19, "pisces"],
  [3, 21, "aries"],
  [4, 20, "taurus"],
  [5, 21, "gemini"],
  [6, 21, "cancer"],
  [7, 23, "leo"],
  [8, 23, "virgo"],
  [9, 23, "libra"],
  [10, 23, "scorpio"],
  [11, 22, "sagittarius"],
  [12, 22, "capricorn"],
];

/**
 * Split a "YYYY-MM-DD" string into local calendar parts.
 *
 * Parsed by hand rather than with `new Date(str)`: the Date constructor reads a
 * bare date string as UTC, so for anyone west of Greenwich it lands on the
 * PREVIOUS day — which for a birthday on a cusp silently hands you the wrong
 * star sign. Same reason `CalendarPanel`'s `toISO()` formats from local parts.
 */
export function parseBirthDate(value) {
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject the impossible (31 April, 30 February) by round-tripping through a
  // local Date and checking it didn't roll over into the next month.
  const probe = new Date(year, month - 1, day);
  if (probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;
  return { year, month, day };
}

/** The sun sign for a "YYYY-MM-DD" birth date, or null if it isn't one. */
export function zodiacFor(value) {
  const parts = parseBirthDate(value);
  if (!parts) return null;
  const [, cutoff, sign] = CUSPS[parts.month - 1];
  if (parts.day >= cutoff) return sign;
  // Before the cutoff you're still the previous sign; January wraps to December.
  return CUSPS[(parts.month + 10) % 12][2];
}

/** Age in whole years on `today`, or null when the birth date is unusable. */
export function ageFor(value, today = new Date()) {
  const parts = parseBirthDate(value);
  if (!parts) return null;
  let age = today.getFullYear() - parts.year;
  const beforeBirthday =
    today.getMonth() + 1 < parts.month ||
    (today.getMonth() + 1 === parts.month && today.getDate() < parts.day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

// --------------------------------------------------------------------------- //
// Character
// --------------------------------------------------------------------------- //
// Only axes that visibly change a sprite roughly 40px tall are offered.
//
// `model` is two hand-drawn bodies rather than a slider, because at this size a
// blend of the two reads as neither. It is deliberately ONLY a silhouette —
// shoulder width and whether the torso has a waist — and it constrains nothing
// else: every hairstyle, outfit and expression is available on both, so "guy
// with long hair" and "girl with a buzz cut" are one tap each.
export const SKIN_TONES = [
  { key: "porcelain", hex: "#f2d3bb" },
  { key: "light", hex: "#edc39e" },
  { key: "warm", hex: "#d9a273" },
  { key: "tan", hex: "#c08552" },
  { key: "deep", hex: "#8d5524" },
  { key: "rich", hex: "#5c3317" },
];

export const MODELS = [
  { key: "masc", label: "Guy" },
  { key: "fem", label: "Girl" },
];

export const HAIR_STYLES = [
  { key: "short", label: "Short" },
  { key: "buzz", label: "Buzz" },
  { key: "messy", label: "Messy" },
  { key: "bob", label: "Bob" },
  { key: "long", label: "Long" },
  { key: "ponytail", label: "Ponytail" },
  { key: "bun", label: "Bun" },
  { key: "curly", label: "Curly" },
  { key: "braids", label: "Braids" },
  // Added after rendering all nine side by side: `buzz` and `short` were the
  // same silhouette at 57px, and nothing in the set was shaved-sided, coiled,
  // or two-tailed. Same rule as the wardrobe — a style earns a slot by changing
  // the OUTLINE, not by having a different name.
  { key: "undercut", label: "Undercut" },
  { key: "afro", label: "Afro" },
  { key: "pigtails", label: "Pigtails" },
  // Cuts people actually ask for by name. Both clear the outline rule on their
  // own terms: the two block has a STEP in its silhouette (long top over
  // cropped sides), the wolf carries its mass above the crown and breaks up at
  // the nape — neither is a smooth cap, which is what the rest of the short
  // end of the set already had covered.
  { key: "twoblock", label: "Two block" },
  { key: "wolf", label: "Wolf cut" },
  // The registry round (see components/character/hair.jsx — a style is one
  // self-contained entry now). Same bar as ever, outline first: curtains =
  // the centre-part notch; mullet = a square nape curtain under a clean cap;
  // space buns = two crown buns; locs = thick clean ropes past the jaw;
  // high pony = the tail whipping UP off the crown.
  { key: "curtains", label: "Curtains" },
  { key: "mullet", label: "Mullet" },
  { key: "spacebuns", label: "Space buns" },
  { key: "locs", label: "Locs" },
  { key: "highpony", label: "High pony" },
];

/**
 * Hats — the first ACCESSORY slot, orthogonal to hair and garments (the
 * Roblox lesson: accessories are where variety gets cheap). Artwork lives in
 * components/character/hats.jsx (HAT_REGISTRY, same both-ways key contract
 * as hair). "none" is a real catalog entry, not an absence — the picker
 * needs a button for bare-headed.
 */
export const HATS = [
  { key: "none", label: "None" },
  { key: "beanie", label: "Beanie" },
  { key: "cap", label: "Cap" },
  { key: "bucket", label: "Bucket hat" },
  { key: "beret", label: "Beret" },
  { key: "straw", label: "Sun hat" },
  // The ushanka: ear flaps past the jaw — the one hat that changes the
  // head-to-shoulder outline rather than just the crown.
  { key: "trapper", label: "Trapper hat" },
];

/**
 * Scarves — the second accessory slot (artwork in character/scarves.jsx,
 * same both-ways key contract as hats). At the neck it reads in every facing
 * and composes with every top, coat and hat — one slot that multiplies
 * against the whole wardrobe. Unlike hats a scarf carries its OWN colour:
 * it's the accent-colour accessory, the same argument that got shoes theirs.
 */
export const SCARVES = [
  { key: "none", label: "None" },
  { key: "wrapped", label: "Wrapped" },
  { key: "loop", label: "Loop" },
  { key: "long", label: "Long" },
];

export const SCARF_COLORS = [
  { key: "cherry", hex: "#8e3a3f" },
  { key: "mustard", hex: "#c9a24b" },
  { key: "moss", hex: "#4e6b4a" },
  { key: "denim", hex: "#3f5a7a" },
  { key: "cream", hex: "#e9dcc9" },
  { key: "plum", hex: "#6b4a6e" },
];

/**
 * Glasses — the third accessory slot (artwork in character/glasses.jsx, same
 * both-ways key contract as hats and scarves). They live on the FACE, so one
 * entry reads in front and profile alike, under every hat and over every
 * hairstyle. Deliberately NO colour option: frames are a fixed dark neutral
 * the way shoe soles are fixed rubber — at ~1px of frame a sixth hex channel
 * buys nothing you can see, and a fixed anchor reads as designed.
 */
export const GLASSES = [
  { key: "none", label: "None" },
  { key: "round", label: "Round" },
  { key: "square", label: "Square" },
  // Half-moons sit low on the nose with the top rim open — the one pair the
  // character looks OVER rather than through.
  { key: "halfmoon", label: "Half-moon" },
];

/**
 * The wardrobe. `outfit` was a lone hex for years, so every resident in the app
 * wore the same sweater in a different colour — nine hairstyles against one
 * garment.
 *
 * THE RULE FOR ADDING ONE: a garment earns a slot only if it changes the
 * OUTLINE or the TWO-TONE SPLIT. The figure is 57px tall; a recoloured t-shirt
 * and a recoloured sweater are the same sprite, so "more options" that differ
 * only in name is catalogue padding you can't see. Each of these changes the
 * silhouette (a hood, a flared hem, bare forearms) or splits the torso into two
 * colours (an open jacket, straps over a shirt).
 *
 * `sleeves: "short"` bares the forearm, which the arm drawing reads directly.
 * `inner` marks the garments that show a second colour underneath.
 */
export const OUTFITS = [
  { key: "sweater", label: "Sweater" },
  { key: "tee", label: "T-shirt", sleeves: "short" },
  // Button-up: collar wings + placket + buttons — the neck-and-centre marks
  // are what separate a shirt from a tee at this size.
  { key: "shirt", label: "Button-up" },
  { key: "overalls", label: "Overalls", inner: true },
  { key: "dress", label: "Dress", sleeves: "short" },
  // Cardigan/turtleneck notes live with their entries below and in COATS.
  // Turtleneck = the collar swallows the neck (the one garment that changes
  // the NECK line, via the registry's `collar` slot).
  { key: "turtleneck", label: "Turtleneck" },
  // Sweater vest: knit over the shirt, and the first top whose SLEEVES belong
  // to the layer underneath — `sleeves: "inner"` paints the arms in the inner
  // colour, a torso-vs-arms split no other garment has.
  { key: "vest", label: "Sweater vest", sleeves: "inner", inner: true },
];

/**
 * The OUTER layer — a real second slot, not more entries in one list (owner
 * call, 2026-08-17: "change clothing into inner and outer shirts"). A coat is
 * WORN OVER whatever top you picked, with its own colour: hoodie over a tee,
 * cardigan over a dress. The one-slot era's outer garments migrate in
 * `validateCharacter` — see the legacy note there. "none" is a real catalog
 * entry: the picker needs a button for shirtsleeves.
 *
 * Every coat draws its shell one step proud of the torso and thickens the
 * sleeves to match — layers have thickness, or they read as a print. The
 * open ones (jacket's parallel panel, cardigan's V) show the TOP through the
 * opening, which is what makes two slots read as two garments.
 */
export const COATS = [
  { key: "none", label: "None" },
  { key: "hoodie", label: "Hoodie" },
  { key: "jacket", label: "Jacket" },
  { key: "cardigan", label: "Cardigan" },
  { key: "puffer", label: "Puffer" },
  // Varsity: the coat whose SLEEVES are the second colour — the classic wool
  // body / leather arms split, via the same `sleeves: "inner"` wiring as the
  // vest. Ribbed trims in the sleeve colour tie the two halves together.
  { key: "varsity", label: "Varsity", sleeves: "inner" },
  // Raincoat: the LONGEST layer in the set — its shell drops straight past
  // the hem to mid-thigh, the one coat that changes where the legs start.
  { key: "raincoat", label: "Raincoat" },
  // Robe: the raincoat's drop AND an open front — the inner column runs from
  // collar into the skirt, a full-length two-tone split. Peak cozy.
  { key: "robe", label: "Robe" },
];

/**
 * Bottom STYLES (owner call, same day: "various pants options… dress pants,
 * khaki, shorts, skirts, jorts"). Same slot rule as everything else — each
 * earns its place with an outline change or a distinct MARK the leg drawing
 * renders (a crease, a turn-up, an ankle cuff): shorts and jorts bare the
 * shin, the wide leg drops as a straight column, joggers taper to an elastic
 * cuff, skirts replace the trouser legs with bare legs under a flare.
 * Khakis are trousers in a khaki COLOUR — that's what TROUSER_COLORS is for.
 * With seven tops, seven coats and nine bottoms the wardrobe is 441
 * silhouette combinations before a single colour is picked.
 */
export const PANTS = [
  { key: "trousers", label: "Trousers" },
  { key: "dress", label: "Dress pants" },
  { key: "jeans", label: "Jeans" },
  { key: "joggers", label: "Joggers" },
  { key: "wide", label: "Wide leg" },
  { key: "shorts", label: "Shorts" },
  { key: "jorts", label: "Jorts" },
  { key: "skirt", label: "Skirt" },
  { key: "pleats", label: "Pleated skirt" },
  // The maxi drops the cone to the ANKLE — the whole lower half becomes one
  // cloth mass with only shoes peeking, the biggest lower-body outline
  // change since the skirt itself.
  { key: "maxi", label: "Maxi skirt" },
];

/**
 * Shoes (owner call, 2026-08-17: "right now it kind of just looks like two
 * circles"). The classic chunky shoe IS the sneaker; the others each change
 * the outline or carry the one mark that names them — a loafer sits low with
 * its instep band, boots grow a shaft up the ankle, heels lift on a spike
 * (the profile view is where they really read), Mary Janes strap across.
 * `SHOE_FORM` in character/body.jsx owns what each does to the drawing.
 */
export const SHOES = [
  { key: "sneakers", label: "Sneakers" },
  { key: "loafers", label: "Loafers" },
  { key: "boots", label: "Boots" },
  { key: "heels", label: "Heels" },
  { key: "maryjanes", label: "Mary Janes" },
];

export const SHOE_COLORS = [
  { key: "ink", hex: "#2b2350" },
  { key: "black", hex: "#26232b" },
  { key: "brown", hex: "#5b3a29" },
  { key: "tan", hex: "#a97c50" },
  { key: "cream", hex: "#d9cbb2" },
  { key: "cherry", hex: "#8e3a3f" },
];

// Trousers were a hard-coded constant, so the whole lower half of every
// resident was the same colour — half the figure, none of it yours.
/**
 * Prints on the torso — a garment is more than a solid colour (owner call).
 * Drawn in the INNER colour, clipped to the torso path, under whatever the
 * garment layers on top; each earns its slot by being tellable from the
 * others at 57px, same bar as everything else.
 */
export const PATTERNS = [
  { key: "none", label: "Plain" },
  { key: "stripes", label: "Stripes" },
  { key: "chest", label: "Chest stripe" },
  { key: "dots", label: "Dots" },
  // Both axes crossing, with the intersections doubled to full opacity —
  // the crossings are what read as plaid rather than "a grid".
  { key: "plaid", label: "Plaid" },
];

export const TROUSER_COLORS = [
  { key: "plum", hex: "#4a3a5b" },
  { key: "denim", hex: "#3f5a7a" },
  { key: "charcoal", hex: "#3a3a42" },
  { key: "clay", hex: "#8a5a44" },
  { key: "moss", hex: "#4e6b4a" },
  { key: "cream", hex: "#c8b394" },
];

export const HAIR_COLORS = [
  { key: "ink", hex: "#3a3142" },
  { key: "chestnut", hex: "#5b3a29" },
  { key: "auburn", hex: "#8c4a2f" },
  { key: "honey", hex: "#c68a4a" },
  { key: "ash", hex: "#8a8a94" },
  { key: "rose", hex: "#c4767f" },
  { key: "mint", hex: "#7faf8f" },
];

export const EXPRESSIONS = [
  { key: "calm", label: "Calm" },
  { key: "happy", label: "Happy" },
  { key: "sleepy", label: "Sleepy" },
];

// Legacy vocabulary: the panel now offers body width/height SLIDERS instead
// of build pills, but stored builds keep their meaning — a build is the
// width the slider defaults to when no explicit width was ever saved.
export const BUILDS = [
  { key: "slim", label: "Slim" },
  { key: "average", label: "Average" },
  { key: "sturdy", label: "Sturdy" },
];

// The classic resident, unchanged — so an existing room looks identical until
// someone actually opens the panel and picks something.
export const DEFAULT_CHARACTER = {
  model: "masc",
  skin: "#edc39e",
  hair: "short",
  hairColor: "#3a3142",
  outfit: "#7faf8f",
  // The classic resident wore a plain sweater over plum trousers, so those are
  // the defaults — an existing room looks identical until someone picks
  // something else.
  garment: "sweater",
  coat: "none",
  coatColor: "#8a5346",
  inner: "#f2e9dd",
  trouser: "#4a3a5b",
  pants: "trousers",
  shoes: "sneakers",
  shoeColor: "#2b2350",
  hat: "none",
  scarf: "none",
  scarfColor: "#8e3a3f",
  glasses: "none",
  print: "none",
  expression: "calm",
  build: "average",
  width: BUILD_SHAPE.average.halfW,
  height: LEG_H,
  torso: TORSO_H,
};

const MODEL_KEYS = new Set(MODELS.map((m) => m.key));
const HAIR_KEYS = new Set(HAIR_STYLES.map((h) => h.key));
const HAT_KEYS = new Set(HATS.map((h) => h.key));
const SCARF_KEYS = new Set(SCARVES.map((s) => s.key));
const GLASSES_KEYS = new Set(GLASSES.map((g) => g.key));
const PATTERN_KEYS = new Set(PATTERNS.map((p) => p.key));
const GARMENT_KEYS = new Set(OUTFITS.map((o) => o.key));
const COAT_KEYS = new Set(COATS.map((c) => c.key));
const PANTS_KEYS = new Set(PANTS.map((p) => p.key));
const SHOE_KEYS = new Set(SHOES.map((s) => s.key));
// The one-slot era stored these in `garment`; they're coats now.
const LEGACY_COATS = new Set(["hoodie", "jacket", "cardigan", "puffer"]);
/** The garment's own rules, for the sprite: sleeve length and whether it layers. */
export const garmentOf = (key) => OUTFITS.find((o) => o.key === key) || OUTFITS[0];
/** The coat worn over it, "none" included. */
export const coatOf = (key) => COATS.find((c) => c.key === key) || COATS[0];
const EXPRESSION_KEYS = new Set(EXPRESSIONS.map((e) => e.key));
const BUILD_KEYS = new Set(BUILDS.map((b) => b.key));

const HEX = /^#[0-9a-f]{6}$/i;

function pickHex(value, fallback) {
  return typeof value === "string" && HEX.test(value.trim())
    ? value.trim().toLowerCase()
    : fallback;
}

function pickKey(value, allowed, fallback) {
  return typeof value === "string" && allowed.has(value) ? value : fallback;
}

// A finite number clamped into the range, or the fallback. Clamping rather
// than rejecting an out-of-range value: a slider position slightly outside
// today's range (saved by a build that allowed more) should come back as
// "as far as we go", not reset to the middle.
function pickNum(value, [lo, hi], fallback) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(hi, Math.max(lo, value))
    : fallback;
}

/**
 * A drawable character, whatever was stored.
 *
 * Tolerant on purpose — same bargain as `validatePlacements`: a value this
 * build doesn't recognise (a hairstyle removed since, a half-written blob)
 * falls back to the default instead of throwing. The resident is drawn every
 * frame, so a strict parse here would be a blank room, not an error message.
 */
export function validateCharacter(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  const build = pickKey(c.build, BUILD_KEYS, DEFAULT_CHARACTER.build);
  // Legacy one-slot saves: "hoodie" in the garment slot becomes the coat,
  // KEEPING its colour — and the shirt in a jacket's opening keeps the colour
  // it used to show (the old `inner`), so a migrated character draws the same
  // pixels it always did. Only fires when no explicit coat was ever stored.
  let garment = pickKey(c.garment, GARMENT_KEYS, DEFAULT_CHARACTER.garment);
  let coat = pickKey(c.coat, COAT_KEYS, DEFAULT_CHARACTER.coat);
  let outfit = pickHex(c.outfit, DEFAULT_CHARACTER.outfit);
  let coatColor = pickHex(c.coatColor, DEFAULT_CHARACTER.coatColor);
  if (
    typeof c.garment === "string" &&
    LEGACY_COATS.has(c.garment) &&
    !(typeof c.coat === "string" && COAT_KEYS.has(c.coat))
  ) {
    coat = c.garment;
    coatColor = outfit;
    garment = "tee";
    outfit = pickHex(c.inner, DEFAULT_CHARACTER.inner);
  }
  return {
    model: pickKey(c.model, MODEL_KEYS, DEFAULT_CHARACTER.model),
    skin: pickHex(c.skin, DEFAULT_CHARACTER.skin),
    hair: pickKey(c.hair, HAIR_KEYS, DEFAULT_CHARACTER.hair),
    hairColor: pickHex(c.hairColor, DEFAULT_CHARACTER.hairColor),
    outfit,
    // New axes fall back to the classic look, so every character saved before
    // the wardrobe existed still validates to exactly what it drew before —
    // the same bargain the JSON blob buys everywhere else (no migration).
    garment,
    coat,
    coatColor,
    inner: pickHex(c.inner, DEFAULT_CHARACTER.inner),
    trouser: pickHex(c.trouser, DEFAULT_CHARACTER.trouser),
    pants: pickKey(c.pants, PANTS_KEYS, DEFAULT_CHARACTER.pants),
    shoes: pickKey(c.shoes, SHOE_KEYS, DEFAULT_CHARACTER.shoes),
    shoeColor: pickHex(c.shoeColor, DEFAULT_CHARACTER.shoeColor),
    hat: pickKey(c.hat, HAT_KEYS, DEFAULT_CHARACTER.hat),
    scarf: pickKey(c.scarf, SCARF_KEYS, DEFAULT_CHARACTER.scarf),
    scarfColor: pickHex(c.scarfColor, DEFAULT_CHARACTER.scarfColor),
    glasses: pickKey(c.glasses, GLASSES_KEYS, DEFAULT_CHARACTER.glasses),
    print: pickKey(c.print, PATTERN_KEYS, DEFAULT_CHARACTER.print),
    expression: pickKey(c.expression, EXPRESSION_KEYS, DEFAULT_CHARACTER.expression),
    build,
    // Width defaults from the BUILD, not from a fixed number — a pre-slider
    // save that chose "slim" keeps its silhouette instead of snapping to
    // average the first time it round-trips through here.
    width: pickNum(c.width, WIDTH_RANGE, BUILD_SHAPE[build].halfW),
    height: pickNum(c.height, HEIGHT_RANGE, LEG_H),
    // Legs and torso are separate axes; pre-split saves had no torso and
    // keep the classic one.
    torso: pickNum(c.torso, TORSO_RANGE, TORSO_H),
  };
}

export const BIO_MAX = 280;
export const NAME_MAX = 60;

/**
 * A stored profile, cleaned for display. Unknown keys are dropped rather than
 * carried, so the shape the panel renders is always the shape declared here.
 */
export function validateProfile(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const out = {};
  const name = typeof p.displayName === "string" ? p.displayName.trim() : "";
  if (name) out.displayName = name.slice(0, NAME_MAX);
  if (isMbti(p.mbti)) out.mbti = p.mbti.toUpperCase();
  if (parseBirthDate(p.birthDate)) out.birthDate = p.birthDate.trim();
  const pronouns = typeof p.pronouns === "string" ? p.pronouns.trim() : "";
  if (pronouns) out.pronouns = pronouns.slice(0, 32);
  const bio = typeof p.bio === "string" ? p.bio.trim() : "";
  if (bio) out.bio = bio.slice(0, BIO_MAX);
  return out;
}

/** Everything derived from a profile that the UI wants to show. */
export function profileSummary(profile, today = new Date()) {
  const clean = validateProfile(profile);
  const sign = zodiacFor(clean.birthDate);
  return {
    ...clean,
    zodiac: sign,
    zodiacLabel: sign ? ZODIAC[sign].label : null,
    zodiacSymbol: sign ? ZODIAC[sign].symbol : null,
    element: sign ? ZODIAC[sign].element : null,
    age: ageFor(clean.birthDate, today),
    mbtiLabel: clean.mbti
      ? MBTI_TYPES.find((t) => t.key === clean.mbti)?.label ?? null
      : null,
  };
}

// --------------------------------------------------------------------------- //
// Mood
// --------------------------------------------------------------------------- //
/**
 * What your character is thinking about, Sims-style — the little cloud over
 * their head.
 *
 * A pure function of the timer's STATUS, deliberately: `running` and `phase`
 * change a handful of times an hour, so the memo'd scene re-renders on a real
 * transition and never on a tick. Deriving it from `remaining` instead would
 * put the whole room back on a 1Hz redraw, which is exactly what splitting the
 * timer into its own provider avoided.
 *
 * Returns null when there's nothing to say — an idle character shows no
 * bubble at all rather than an empty one.
 */
// mood → the icon the thought cloud draws. The value is load-bearing (the
// sprite switches on it) and the key set doubles as the whitelist: a mood
// that isn't in here draws no bubble at all rather than an empty one.
export const MOODS = {
  studying: "book",
  resting: "mug",
};

export function moodFor(status) {
  if (!status || !status.running) return null;
  return status.phase === "break" ? "resting" : "studying";
}
