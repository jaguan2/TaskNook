// The furniture store: pieces bought with focus minutes.
//
// **Nothing in the catalog costs anything today, and that's deliberate.** The
// first cut priced most of the 93 items and gated them behind focus time; the
// call was that you don't take away decorations people already have. So the
// rule inverted: everything is free unless it's explicitly listed in PREMIUM
// below, and PREMIUM is empty. With it empty the whole feature is inert — the
// picker shows no locks, the balance chip doesn't render, and `owns()` is true
// for everything.
//
// What survives is the machinery, because it's the part that's fiddly to get
// right and it's already migrated into the database: ownership, a derived
// balance, persistence, and validation. Adding a premium piece later is one
// line in PREMIUM — the UI, the API and the storage are already wired.
//
// If a store never happens, this file and `user.unlocked` are the things to
// delete. They cost nothing to carry, but they aren't free of cost forever.
import { ISO_ITEMS } from "./isoRoom";

/** Minutes of focus a band costs. Kept for whenever PREMIUM fills up. */
export const BANDS = { accent: 15, everyday: 30, feature: 60, showpiece: 120 };

/**
 * itemKey → cost in focus minutes. EMPTY on purpose: every piece that ships
 * today is free. Add new premium pieces here, e.g.
 *
 *     export const PREMIUM = { grandpiano: BANDS.showpiece };
 *
 * Prices are hand-set rather than derived from footprint or height, because
 * geometry encodes the wrong thing — `hitH` is where the ⟳/✕ buttons sit, so
 * deriving priced wall decor like a showpiece and put a rug above a piano.
 */
export const PREMIUM = {};

/** What a piece costs. Anything not explicitly premium is free — a catalog
 *  addition nobody priced must never become unplaceable. */
export const costOf = (key) => PREMIUM[key] ?? 0;

/** Is this piece behind the store at all? */
export const isPremium = (key) => costOf(key) > 0;

/** Is there anything to buy? While this is false the whole feature stays out
 *  of sight — a balance you can't spend is just a confusing number. */
export const storeIsOpen = () => Object.keys(PREMIUM).length > 0;

/** Total focus minutes ever recorded — the {day: minutes} map from
 *  GET /api/sessions/days, which the store already fetches for the calendar. */
export function totalEarned(sessionDays) {
  if (!sessionDays || typeof sessionDays !== "object") return 0;
  return Object.values(sessionDays).reduce(
    (sum, m) => sum + (Number.isFinite(m) && m > 0 ? m : 0),
    0
  );
}

/** What's been spent. Free pieces cost nothing, so owning them can't drag the
 *  balance down. */
export function totalSpent(unlocked) {
  if (!Array.isArray(unlocked)) return 0;
  return unlocked.reduce((sum, key) => sum + costOf(key), 0);
}

/**
 * Minutes left to spend. Derived from the sessions rather than stored as a
 * counter, so it cannot drift out of step with the focus time it came from.
 * Never negative: a piece that gets re-priced (or made free, as they all just
 * were) must not put its owner in debt.
 */
export function balance(sessionDays, unlocked) {
  return Math.max(0, totalEarned(sessionDays) - totalSpent(unlocked));
}

/** Does the user own this piece? Free pieces are owned by everyone. */
export function owns(unlocked, key) {
  return !isPremium(key) || (Array.isArray(unlocked) && unlocked.includes(key));
}

export function canAfford(sessionDays, unlocked, key) {
  return !owns(unlocked, key) && balance(sessionDays, unlocked) >= costOf(key);
}

/** Drop junk, unknown keys, duplicates, and anything that's free anyway —
 *  including pieces bought before a re-price made them free. */
export function validateUnlocked(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  for (const key of raw) {
    if (typeof key !== "string" || !ISO_ITEMS[key] || !isPremium(key)) continue;
    seen.add(key);
  }
  return [...seen];
}
