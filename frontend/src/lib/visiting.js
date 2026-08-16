/**
 * Visiting friends' study rooms — the pure model.
 *
 * TaskNook's friends are seeded bots, so visiting is SIMULATED social: the
 * backend serves whatever room/character a friend has stored (null for the
 * bots, by design), and this file owns everything the simulation derives
 * from that — which preset is whose home, what each bot looks like, and how
 * a visited room gains its owner and its guest. Same division of labour as
 * room.js/profile.js: the server stores, the frontend owns the vocabulary.
 *
 * Everything here is pure and node-testable; nothing it produces is ever
 * persisted — a visit is rendered, not saved.
 */
import {
  ISO_ITEMS,
  findFreeSpot,
  footOf,
  footprintFree,
  isoPresetLayout,
  validateIsoLayout,
} from "./isoRoom";
import {
  HAIR_COLORS,
  HAIR_STYLES,
  MODELS,
  SKIN_TONES,
  validateCharacter,
} from "./profile";
import { WIDTH_RANGE, HEIGHT_RANGE } from "./body";

// Door vocabulary. The KEYS are the backend whitelist (VISIT_ACCESS_LEVELS
// in app.py — same both-languages contract as ISO_ENVS); labels and hints
// are UI text this file owns.
export const VISIT_ACCESS = [
  { key: "public", label: "Public", hint: "anyone may drop in" },
  { key: "friends", label: "Friends-only", hint: "friends may drop in" },
  { key: "invite", label: "Invite-only", hint: "visitors knock first" },
  { key: "private", label: "Private", hint: "nobody visits" },
];

// How long a knock hangs in the air before an invite-only bot opens the
// door. The WAIT is the feature — instant entry would make "invite-only"
// indistinguishable from "public".
export const KNOCK_WAIT_MS = 2600;

// Hand-picked homes for the seeded bots — personality over hash: luna the
// night owl at her study desk, kai among the Reading room's shelves, sora
// keeping the Secret garden, mochi running the Corner café.
const NPC_HOMES = {
  luna: "classic",
  kai: "library",
  sora: "garden",
  mochi: "cafeteria",
};

// Where each owner belongs in their home — seats the NPC pass deliberately
// left empty (luna's desk chair, kai's writing desk, sora's pond bench),
// or open floor for the host (mochi in front of her counter). These are
// checked by visiting.test.js against the real presets, and findFreeSpot
// is the net if a preset ever shifts underneath one.
const NPC_SPOTS = {
  luna: { gx: 4, gy: 1.5 },
  kai: { gx: 7.5, gy: 8 },
  sora: { gx: 6.5, gy: 4 },
  mochi: { gx: 4, gy: 2 },
};

// Outfit hexes from the field-proven preset tints — bots dress like the
// rooms they keep.
const NPC_OUTFITS = ["#6fb8cf", "#e0774a", "#8a5346", "#e0a374", "#c9a24b", "#c4767f"];

/**
 * A deterministic look for a bot with no stored character. Derived, not
 * seeded server-side, for the usual reason: the character vocabulary lives
 * in the frontend, and a hash of the username gives four visibly different
 * neighbours for free (the body sliders included). Deterministic — never
 * Math.random — so luna is the same luna on every visit.
 */
export function deriveNpcCharacter(username) {
  let h = 0;
  for (const ch of String(username)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pick = (arr, shift) => arr[(h >>> shift) % arr.length];
  const lerp = ([lo, hi], t) => lo + (hi - lo) * t;
  return validateCharacter({
    model: pick(MODELS, 2).key,
    skin: pick(SKIN_TONES, 5).hex,
    hair: pick(HAIR_STYLES, 8).key,
    hairColor: pick(HAIR_COLORS, 12).hex,
    outfit: pick(NPC_OUTFITS, 16),
    expression: "calm",
    // Snapped to the sliders' own steps so a derived body is always a body
    // the panel could have produced.
    width: Math.round(lerp(WIDTH_RANGE, ((h >>> 20) % 7) / 6) * 5) / 5,
    height: Math.round(lerp(HEIGHT_RANGE, ((h >>> 24) % 7) / 6) * 2) / 2,
  });
}

// A resident spot: the hand-picked one when it's on real floor (it may — on
// purpose — sit on a SEAT, so only the mask rules it out), else the nearest
// clear floor to `near`, else anywhere the mask allows.
function residentSpot(layout, placements, want, near) {
  const foot = footOf("resident", 0);
  if (want && footprintFree(want.gx, want.gy, foot, layout)) return want;
  return (
    findFreeSpot("resident", 0, layout, near.gx, near.gy, placements) ||
    findFreeSpot("resident", 0, layout, near.gx, near.gy)
  );
}

/**
 * Turn the friend-room endpoint's response into a renderable visit:
 * a validated layout with the OWNER placed in it (seated wherever their
 * spot has a seat) and the GUEST — you — standing near the front, plus the
 * personas map IsoRoom draws per-placement characters and name labels from.
 *
 * A stored room always beats the derived home; the bots simply never have
 * one. Both inserted residents are ordinary `resident` items (not `you` —
 * `self` semantics belong to your OWN room), with stable synthetic ids the
 * personas map keys off.
 */
export function resolveVisitRoom(data, guest = null) {
  // A stored room always beats the derived home — INCLUDING a deliberately
  // empty one. `[]` is a room someone cleared on purpose (the same rule the
  // room reconcile follows: only null, never-saved, may be substituted).
  const stored = data?.room ? validateIsoLayout(data.room) : null;
  const layout =
    stored || validateIsoLayout(isoPresetLayout(NPC_HOMES[data?.username] || "classic"));

  // Synthetic ids are UNIQUE PER FRIEND: the scene instance (and its wander
  // offsets, keyed by id) can outlive one visit, so a reused "visit-owner"
  // would inherit the previous room's roam offset and render the next owner
  // off their own floor. Any stored placement that collides is dropped —
  // these two ids are ours.
  const ownerId = `visit-owner-${data?.id ?? "x"}`;
  const guestId = `visit-guest-${data?.id ?? "x"}`;
  const placements = layout.placements.filter(
    (p) => p.id !== ownerId && p.id !== guestId
  );
  const personas = {};

  // A stored room may contain the owner's own `you` placement. In THEIR
  // room that persona IS them — but `self` semantics (your character, your
  // thought bubble) belong to your own room, so it becomes the owner's
  // resident: its spot is where they chose to be, its sprite wears their
  // character via the personas map.
  let ownerWant = NPC_SPOTS[data?.username];
  const youIdx = placements.findIndex((p) => ISO_ITEMS[p.item]?.self);
  if (youIdx >= 0) {
    ownerWant = { gx: placements[youIdx].gx, gy: placements[youIdx].gy };
    placements.splice(youIdx, 1);
  }

  const ownerCharacter =
    data?.character && Object.keys(data.character).length
      ? validateCharacter(data.character)
      : deriveNpcCharacter(data?.username || "friend");
  const ownerAt = residentSpot(layout, placements, ownerWant, {
    gx: layout.w / 2,
    gy: layout.d / 2,
  });
  if (ownerAt) {
    placements.push({ id: ownerId, item: "resident", gx: ownerAt.gx, gy: ownerAt.gy });
    personas[ownerId] = {
      character: ownerCharacter,
      label: data?.displayName || data?.username || "friend",
    };
  }

  let placedGuestId = null;
  if (guest) {
    // You arrive at the front of the room — visiting means being there,
    // not watching a diorama.
    const at = residentSpot(layout, placements, null, {
      gx: layout.w / 2,
      gy: layout.d - 1,
    });
    if (at) {
      placements.push({ id: guestId, item: "resident", gx: at.gx, gy: at.gy });
      personas[guestId] = {
        character: validateCharacter(guest.character),
        label: guest.name || "you",
      };
      placedGuestId = guestId;
    }
  }

  // `guestId` is null when no guest stands in the room — it's what the scene
  // uses to grant walk orders, and an id with no placement would arm a drag
  // that can never start.
  return { layout: { ...layout, placements }, personas, guestId: placedGuestId };
}

/**
 * What a bot is DOING right now — the friends list's presence line.
 *
 * Honest theater, same contract as the rest of this file: the bots don't run
 * timers, so their day is a fixed 120-minute study loop (blocks of focus,
 * short breaks, a couple of idle stretches — the schedule a productivity app's
 * bots ought to keep) offset per-username so the four are never all in the
 * same state. Deterministic from the username and the CLOCK — never
 * Math.random — so the panel can re-derive it on a timer without anyone's
 * status jittering, and reopening the drawer agrees with what it said before.
 *
 * `now` is epoch milliseconds, passed in rather than read here so the
 * function stays pure and node-testable at fixed instants.
 */
const ACTIVITY_CYCLE = [
  ["focus", 25],
  ["break", 5],
  ["focus", 25],
  ["idle", 10],
  ["focus", 25],
  ["break", 5],
  ["idle", 25],
];
const CYCLE_MINUTES = ACTIVITY_CYCLE.reduce((sum, [, mins]) => sum + mins, 0);
export function npcActivity(username, now) {
  // A different multiplier than deriveNpcCharacter's, so a bot's schedule
  // isn't correlated with its looks.
  let h = 0;
  for (const ch of String(username)) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  let t = (Math.floor(now / 60000) + (h % CYCLE_MINUTES)) % CYCLE_MINUTES;
  for (const [state, span] of ACTIVITY_CYCLE) {
    if (t < span) return { state, minutesLeft: span - t };
    t -= span;
  }
  // Unreachable: t < CYCLE_MINUTES and the spans sum to CYCLE_MINUTES.
  return { state: "idle", minutesLeft: 1 };
}

/**
 * A bot's day in NUMBERS — the friends list's "focused · tasks" line.
 *
 * The API serves the seeded users' real rows, which never change: every bot
 * showed "0m focused" forever, right beside a presence line claiming they
 * were mid-block — two simulations telling different stories. This replaces
 * the displayed numbers with a day that actually happens: a to-do list of
 * 2–6 tasks rolled fresh per LOCAL day, a finishing point somewhere between
 * "got through some of it" and "cleared it", and focus minutes that tick up
 * through waking hours as the tasks fall.
 *
 * The minutes and the count can never disagree, because the count is DERIVED
 * from the minutes: each finished task costs 20–40 of them, and a task is
 * done when the day's clock has covered its span. Deterministic in
 * (username, local day, clock) — never Math.random — so the panel re-derives
 * it on its 30s tick and the numbers only ever move forward, like someone
 * actually working through a list.
 */
export function npcDailyStats(username, now) {
  const d = new Date(now);
  // LOCAL parts, the same day-boundary convention as everywhere else.
  const seed = `${username}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  // A third multiplier, so a bot's workload correlates with neither its looks
  // nor its schedule.
  let h = 0;
  for (const ch of seed) h = (h * 193 + ch.charCodeAt(0)) >>> 0;

  const tasksTotal = 2 + (h % 5); // 2..6, fresh each day
  // How much of the list today actually finishes — some days end 2/5, and a
  // roster of four bots all on 100% every evening would read as bots.
  const doneTarget = Math.max(1, Math.round((tasksTotal * (40 + ((h >>> 8) % 61))) / 100));

  // Everyone starts at their own hour (07:00–10:00) and winds down by 21:00.
  const startMin = 7 * 60 + ((h >>> 16) % 181);
  const minuteOfDay = d.getHours() * 60 + d.getMinutes();
  const t = Math.max(0, Math.min(1, (minuteOfDay - startMin) / (21 * 60 - startMin)));

  const spans = [];
  for (let i = 0; i < doneTarget; i += 1) spans.push(20 + ((h >>> ((i * 5) % 27)) % 21));
  const dayMinutes = spans.reduce((sum, span) => sum + span, 0);
  const focusMinutes = Math.floor(dayMinutes * t);
  let tasksDone = 0;
  let acc = 0;
  for (const span of spans) {
    acc += span;
    if (acc <= focusMinutes) tasksDone += 1;
  }
  return { focusMinutes, tasksDone, tasksTotal };
}

// Exported for the tests: which preset key is whose home.
export const NPC_HOME_KEYS = { ...NPC_HOMES };
