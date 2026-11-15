/**
 * Friendship with the cottage neighbours — the pure model.
 *
 * The bots are simulated social (visiting.js, chat.js), and the bond is the
 * part of that simulation that REMEMBERS you: points accrue for doing things
 * together — saying something in a chat, stepping through a door, minutes
 * spent in the same room — and the level read off them warms the dialogue
 * and fills the level meter in the Friends panel. Mostly cosmetic, deliberately:
 * it's a reason to interact, not a grind with rewards. Tangible rewards are
 * deliberately not built; add them only if the social loop grows beyond its
 * current cosmetic purpose.
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

// Curves change the spacing between milestones, not the points awarded. Every
// threshold stays at or below the original curve, preserving earned levels.
export const FRIENDSHIP_GROWTH = {
  steady: FRIENDSHIP_LEVELS.map(({ at }) => at),
  slowBurn: [0, 25, 80, 155, 275],
  quickStart: [0, 12, 45, 150, 320],
};
const NEIGHBOUR_GROWTH = { luna: 'slowBurn', kai: 'quickStart', sora: 'slowBurn', mochi: 'steady' };

/** Authored personalities for familiar neighbours; other names get a stable
 * curve. No randomness, clock or storage is involved in reading a level. */
export function friendshipGrowthFor(username) {
  const name = String(username || '').trim().toLowerCase();
  if (!name) return 'steady';
  if (Object.hasOwn(NEIGHBOUR_GROWTH, name)) return NEIGHBOUR_GROWTH[name];
  let hash = 0;
  for (const character of name) hash = (Math.imul(hash, 31) + character.codePointAt(0)) >>> 0;
  const patterns = Object.keys(FRIENDSHIP_GROWTH);
  return patterns[hash % patterns.length];
}

/** Clamp a stored tally to something the vocabulary understands. */
export function clampBond(points) {
  const n = Number(points);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(BOND_CAP, Math.round(n));
}

/**
 * One level calculation for cards, profiles, room hearts and chat replies.
 * `frac` remains lifetime progress for room hearts; `progress` and the local
 * earned/required pair describe the CURRENT level. Saved tallies are unchanged.
 */
export function levelFor(points, username) {
  const pts = clampBond(points);
  const growth = friendshipGrowthFor(username);
  const thresholds = FRIENDSHIP_GROWTH[growth];
  let index = 0;
  for (let i = 1; i < thresholds.length; i++) if (pts >= thresholds[i]) index = i;
  const entry = FRIENDSHIP_LEVELS[index];
  const nextEntry = FRIENDSHIP_LEVELS[index + 1] || null;
  const required = nextEntry ? thresholds[index + 1] - thresholds[index] : 0;
  const earned = nextEntry ? pts - thresholds[index] : 0;
  return {
    level: entry.level,
    label: entry.label,
    frac: Math.min(1, pts / thresholds[thresholds.length - 1]),
    next: nextEntry ? required - earned : null,
    nextLevel: nextEntry?.level ?? null,
    earned, required, growth,
    progress: nextEntry ? earned / required : 1,
  };
}
