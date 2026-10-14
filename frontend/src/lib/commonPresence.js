import { CHARACTER_PRESETS } from "./characterPresets";
import {
  COMMON_PLACES,
  availableCommonSeats,
  createCommonSession,
} from "./commonRooms";
import { deriveNpcCharacter } from "./visiting";

export const COMMON_PRESENCE_MIN_MS = 30 * 60_000;
export const COMMON_PRESENCE_MAX_MS = 4 * 60 * 60_000;

// The authored neighbours across all places form one familiar local cast.
// A person keeps their room-specific outfit when one exists; visitors who are
// new to that place use the first authored version of their look.
const COMMON_ROSTER = Array.from(
  new Map(
    Object.values(COMMON_PLACES)
      .flatMap((scene) => scene.neighbours)
      .map((person) => [person.username, person])
  ).values()
).map(({ username, label, look }) => ({ username, label, look }));

const boundedRandom = (rand) => {
  const value = Number(rand?.());
  return Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0.5;
};

const pick = (values, rand) =>
  values[Math.floor(boundedRandom(rand) * values.length)];

const personFor = (scene, profile, seatId) => {
  const authored = scene.neighbours.find(
    (person) => person.username === profile.username
  );
  const resident = authored || profile;
  const baseline = deriveNpcCharacter(resident.username);
  const look = CHARACTER_PRESETS.find((preset) => preset.key === resident.look);
  return {
    ...resident,
    seatId,
    character: look
      ? { ...look.character, skin: baseline.skin }
      : baseline,
  };
};

export function nextCommonPresenceDelay(rand = Math.random) {
  const span = COMMON_PRESENCE_MAX_MS - COMMON_PRESENCE_MIN_MS;
  return Math.round(COMMON_PRESENCE_MIN_MS + span * boundedRandom(rand));
}

export function createCommonPresence(sceneId, now = Date.now(), rand = Math.random) {
  const session = createCommonSession(sceneId);
  if (!session) return null;
  return {
    ...session,
    nextChangeAt: now + nextCommonPresenceDelay(rand),
    change: null,
  };
}

export function createCommonPresences(now = Date.now(), rand = Math.random) {
  return Object.fromEntries(
    Object.keys(COMMON_PLACES).map((sceneId) => [
      sceneId,
      createCommonPresence(sceneId, now, rand),
    ])
  );
}

/**
 * Apply at most one visible arrival or departure. If the app was asleep past
 * several deadlines, returning to it causes one natural change instead of a
 * burst of catch-up animation and toasts.
 */
export function advanceCommonPresence(
  presence,
  { now = Date.now(), reservedSeatId = null, rand = Math.random } = {}
) {
  const scene = COMMON_PLACES[presence?.sceneId];
  if (!scene || now < presence.nextChangeAt) return presence;

  const occupants = presence.occupants;
  const present = new Set(occupants.map((person) => person.username));
  const absent = COMMON_ROSTER.filter((person) => !present.has(person.username));
  const lastDeparture = presence.change?.type === "left"
    ? presence.change.person.username
    : null;
  const arrivals = absent.filter((person) => person.username !== lastDeparture);
  const eligibleArrivals = arrivals.length ? arrivals : absent;
  const occupiedSeats = new Set(occupants.map((person) => person.seatId));
  const freeSeats = scene.seats.filter(
    (seat) => seat.id !== reservedSeatId && !occupiedSeats.has(seat.id)
  );
  const baseline = scene.neighbours.length;
  const minimum = Math.max(1, baseline - 1);
  const maximum = Math.min(scene.seats.length - 1, baseline + 1, COMMON_ROSTER.length);
  const canLeave = occupants.length > minimum;
  const canJoin = occupants.length < maximum && eligibleArrivals.length > 0 && freeSeats.length > 0;
  const joining = canJoin && (!canLeave || boundedRandom(rand) >= 0.5);

  let nextOccupants = occupants;
  let change = null;
  if (joining) {
    const profile = pick(eligibleArrivals, rand);
    const seat = pick(freeSeats, rand);
    const person = personFor(scene, profile, seat.id);
    nextOccupants = [...occupants, person];
    change = { type: "joined", person };
  } else if (canLeave) {
    const person = pick(occupants, rand);
    nextOccupants = occupants.filter(
      (occupant) => occupant.username !== person.username
    );
    change = { type: "left", person };
  }

  return {
    ...presence,
    occupants: nextOccupants,
    nextChangeAt: now + nextCommonPresenceDelay(rand),
    change,
  };
}

export function joinCommonPresence(presence) {
  const scene = COMMON_PLACES[presence?.sceneId];
  if (!scene) return null;
  const openSeats = availableCommonSeats(presence);
  const guestSeat =
    openSeats.find((seat) => seat.id === scene.arrivalSeat) || openSeats[0];
  return guestSeat ? { ...presence, guestSeatId: guestSeat.id } : null;
}
