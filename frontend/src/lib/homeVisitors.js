/**
 * Simulated drop-in visitors for a home that admits friends.
 *
 * These records are deliberately render-only. A guest must never enter the
 * persisted room layout: closing the app, changing rooms, or changing access
 * to Invite or Private ends the fiction without leaving somebody in the room JSON.
 */
import { findFreeSpot, freeSeatSpot } from "./isoRoom";
import { deriveNpcCharacter } from "./visiting";

export const HOME_VISITOR_MAX = 2;
export const HOME_VISITOR_TICK_MS = 15_000;
export const HOME_VISITOR_KICK_COOLDOWN_MS = 30 * 60_000;

// Both door settings admit friends. Invite/private never schedule unsolicited
// arrivals, and hidden room modes must not consume visits off-screen.
export function homeVisitorsEnabled({ access, isVisiting, editing, isometric, widgetMode }) {
  return (access === "open" || access === "friends") &&
    !isVisiting && !editing && Boolean(isometric) && !widgetMode;
}

const ARRIVAL_MIN_MS = 90_000;
const ARRIVAL_MAX_MS = 4 * 60_000;
const STAY_MIN_MS = 4 * 60_000;
const STAY_MAX_MS = 10 * 60_000;

const boundedRandom = (rand) => {
  const value = Number(rand?.());
  return Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0.5;
};

const between = (lo, hi, rand) => Math.round(lo + (hi - lo) * boundedRandom(rand));

export const nextHomeVisitorDelay = (rand = Math.random) =>
  between(ARRIVAL_MIN_MS, ARRIVAL_MAX_MS, rand);

export const homeVisitorStay = (rand = Math.random) =>
  between(STAY_MIN_MS, STAY_MAX_MS, rand);

export const homeVisitorId = (friend) => `home-visitor-${friend?.id ?? friend?.username}`;

/** Pick one eligible bot without mutating or reordering the friends list. */
export function chooseHomeVisitor(friends, current, kickedUntil, now, rand = Math.random) {
  const present = new Set(current.map((guest) => guest.username));
  const eligible = (Array.isArray(friends) ? friends : []).filter((friend) => {
    if (!friend?.username || present.has(friend.username)) return false;
    return (kickedUntil?.[friend.username] || 0) <= now;
  });
  if (!eligible.length) return null;
  return eligible[Math.floor(boundedRandom(rand) * eligible.length)];
}

/**
 * Seat a friend in the current room, falling back to clear floor near the
 * entrance. Returns null when the room genuinely has nowhere to put them.
 */
export function admitHomeVisitor(layout, current, friend, now, rand = Math.random) {
  if (!layout || !Array.isArray(layout.placements) || !friend?.username) return null;
  if (current.length >= HOME_VISITOR_MAX) return null;
  const id = homeVisitorId(friend);
  const temporary = current.map((guest) => ({
    id: guest.id,
    item: "resident",
    gx: guest.gx,
    gy: guest.gy,
  }));
  const occupied = [...layout.placements.filter((p) => p.id !== id), ...temporary];
  const at =
    freeSeatSpot(occupied, "resident") ||
    findFreeSpot("resident", 0, layout, layout.w / 2, layout.d - 1, occupied);
  if (!at) return null;
  return {
    id,
    friendId: friend.id,
    username: friend.username,
    label: friend.displayName || friend.username,
    avatar: friend.avatar || "🌙",
    character: deriveNpcCharacter(friend.username),
    gx: at.gx,
    gy: at.gy,
    joinedAt: now,
    leaveAt: now + homeVisitorStay(rand),
  };
}

/** Merge temporary guests into a render copy; the input layout is untouched. */
export function homeVisitorScene(layout, visitors) {
  const list = Array.isArray(visitors) ? visitors : [];
  const ids = new Set(list.map((visitor) => visitor.id));
  const placements = [
    ...layout.placements.filter((placement) => !ids.has(placement.id)),
    ...list.map((visitor) => ({
      id: visitor.id,
      item: "resident",
      gx: visitor.gx,
      gy: visitor.gy,
    })),
  ];
  const personas = Object.fromEntries(
    list.map((visitor) => [
      visitor.id,
      { character: visitor.character, label: visitor.label, npcUsername: visitor.username },
    ])
  );
  return { layout: { ...layout, placements }, personas };
}

export function moveHomeVisitor(visitors, id, gx, gy) {
  let changed = false;
  const next = visitors.map((visitor) => {
    if (visitor.id !== id || (visitor.gx === gx && visitor.gy === gy)) return visitor;
    changed = true;
    return { ...visitor, gx, gy };
  });
  return changed ? next : visitors;
}

/**
 * Advance one scheduler tick without side effects. Keeping the clock and
 * random source outside makes departures, eligibility, and the next-arrival
 * deadline deterministic in tests; the store only commits this result and
 * announces a newly arrived guest.
 */
export function advanceHomeVisitors({
  layout,
  friends,
  visitors,
  kickedUntil = {},
  now,
  nextArrivalAt,
  rand = Math.random,
}) {
  let next = (Array.isArray(visitors) ? visitors : []).filter(
    (visitor) => visitor.leaveAt > now
  );
  let arrivalAt = nextArrivalAt;
  let arrived = null;

  if (next.length >= HOME_VISITOR_MAX) {
    arrivalAt = null;
  } else if (arrivalAt == null) {
    arrivalAt = now + nextHomeVisitorDelay(rand);
  } else if (now >= arrivalAt) {
    const friend = chooseHomeVisitor(friends, next, kickedUntil, now, rand);
    if (friend) {
      arrived = admitHomeVisitor(layout, next, friend, now, rand);
      if (arrived) next = [...next, arrived];
    }
    arrivalAt =
      next.length >= HOME_VISITOR_MAX
        ? null
        : now + nextHomeVisitorDelay(rand);
  }

  return { visitors: next, nextArrivalAt: arrivalAt, arrived };
}
