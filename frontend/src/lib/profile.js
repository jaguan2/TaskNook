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
import { BUILD_SHAPE, WIDTH_RANGE, HEIGHT_RANGE, LEG_H } from "./body";

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
  expression: "calm",
  build: "average",
  width: BUILD_SHAPE.average.halfW,
  height: LEG_H,
};

const MODEL_KEYS = new Set(MODELS.map((m) => m.key));
const HAIR_KEYS = new Set(HAIR_STYLES.map((h) => h.key));
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
  return {
    model: pickKey(c.model, MODEL_KEYS, DEFAULT_CHARACTER.model),
    skin: pickHex(c.skin, DEFAULT_CHARACTER.skin),
    hair: pickKey(c.hair, HAIR_KEYS, DEFAULT_CHARACTER.hair),
    hairColor: pickHex(c.hairColor, DEFAULT_CHARACTER.hairColor),
    outfit: pickHex(c.outfit, DEFAULT_CHARACTER.outfit),
    expression: pickKey(c.expression, EXPRESSION_KEYS, DEFAULT_CHARACTER.expression),
    build,
    // Width defaults from the BUILD, not from a fixed number — a pre-slider
    // save that chose "slim" keeps its silhouette instead of snapping to
    // average the first time it round-trips through here.
    width: pickNum(c.width, WIDTH_RANGE, BUILD_SHAPE[build].halfW),
    height: pickNum(c.height, HEIGHT_RANGE, LEG_H),
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
