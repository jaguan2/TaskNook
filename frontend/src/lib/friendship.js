/**
 * Friendship with the cottage neighbours — the pure model.
 *
 * The bots are simulated social (visiting.js, chat.js), and the bond is the
 * part of that simulation that REMEMBERS you: points accrue for doing things
 * together — saying something in a chat, stepping through a door, minutes
 * spent in the same room — and the level read off them warms the dialogue
 * and fills a small bar in the Friends panel. Mostly cosmetic, deliberately:
 * it's a reason to interact, not a grind with rewards. (If rewards ever
 * come — outfits, decorations gifted at high levels — that's noted in
 * docs/visiting_friends_plan.md, not built.)
 *
 * Same division of labour as the rest of the simulation: this file owns the
 * vocabulary (points, thresholds, labels), the store owns the impure half
 * (the per-device tally in `tasknook.friendship`).
 */

/** What each interaction is worth. The store applies these; one place to tune. */
export const BOND_POINTS = {
  /** A line you send them — typed or picked off the menu. */
  message: 2,
  /** Stepping through their door (a knock that's answered counts — you went). */
  visit: 6,
  /** Each minute spent in their room. Studying together accrues the same way —
   *  being there is what counts, exactly like real libraries. */
  minuteTogether: 1,
};

/**
 * The tally never grows past this. Levels top out well below it, so the cap
 * exists only to keep a years-old install's numbers honest, not as a wall
 * anyone notices.
 */
export const BOND_CAP = 999;

/**
 * Thresholds are cumulative points. Reaching the top is meant to take real
 * weeks of dropping by — the bar moving slowly is what makes it worth a
 * glance, and a maxed bar on day two would end the reason to interact that
 * the whole feature exists to give.
 */
export const FRIENDSHIP_LEVELS = [
  { level: 1, label: "New friends", at: 0 },
  { level: 2, label: "Warming up", at: 25 },
  { level: 3, label: "Good friends", at: 80 },
  { level: 4, label: "Close friends", at: 180 },
  { level: 5, label: "Kindred spirits", at: 320 },
];

const TOP = FRIENDSHIP_LEVELS[FRIENDSHIP_LEVELS.length - 1];

/** Clamp a stored tally to something the vocabulary understands. */
export function clampBond(points) {
  const n = Number(points);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(BOND_CAP, Math.round(n));
}

/**
 * Where `points` puts you: `{level, label, frac, next}`.
 *
 * `frac` is overall progress toward the top level (0..1) — one bar that fills
 * over the friendship's whole life reads better at a glance than one that
 * resets at every level. `next` is points still needed for the next level,
 * null at the top.
 */
export function levelFor(points) {
  const pts = clampBond(points);
  let entry = FRIENDSHIP_LEVELS[0];
  for (const lvl of FRIENDSHIP_LEVELS) if (pts >= lvl.at) entry = lvl;
  const nextEntry = FRIENDSHIP_LEVELS[FRIENDSHIP_LEVELS.indexOf(entry) + 1] || null;
  return {
    level: entry.level,
    label: entry.label,
    frac: Math.min(1, pts / TOP.at),
    next: nextEntry ? nextEntry.at - pts : null,
  };
}
