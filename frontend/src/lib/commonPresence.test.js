import { describe, expect, it, vi } from "vitest";
import { COMMON_PLACES } from "./commonRooms";
import {
  COMMON_PRESENCE_MAX_MS,
  COMMON_PRESENCE_MIN_MS,
  advanceCommonPresence,
  createCommonPresence,
  createCommonPresences,
  joinCommonPresence,
  nextCommonPresenceDelay,
} from "./commonPresence";

describe("common-place presence", () => {
  it("schedules every change between thirty minutes and four hours", () => {
    expect(nextCommonPresenceDelay(() => 0)).toBe(COMMON_PRESENCE_MIN_MS);
    expect(nextCommonPresenceDelay(() => 1)).toBeLessThanOrEqual(
      COMMON_PRESENCE_MAX_MS
    );
    expect(nextCommonPresenceDelay(() => Number.NaN)).toBeGreaterThanOrEqual(
      COMMON_PRESENCE_MIN_MS
    );
    expect(nextCommonPresenceDelay(() => Number.NaN)).toBeLessThanOrEqual(
      COMMON_PRESENCE_MAX_MS
    );
  });

  it("creates one scheduled population for every common place", () => {
    const now = 1_000;
    const presences = createCommonPresences(now, () => 0);
    expect(Object.keys(presences)).toEqual(Object.keys(COMMON_PLACES));
    for (const [sceneId, presence] of Object.entries(presences)) {
      expect(presence.sceneId).toBe(sceneId);
      expect(presence.nextChangeAt).toBe(now + COMMON_PRESENCE_MIN_MS);
      expect(presence.change).toBeNull();
    }
    expect(createCommonPresence("missing", now)).toBeNull();
  });

  it("leaves once at a due boundary and does not change again before the next one", () => {
    const now = 10_000;
    const presence = createCommonPresence("common-cottage", now, () => 0);
    const beforeDue = advanceCommonPresence(presence, {
      now: presence.nextChangeAt - 1,
      rand: () => 0,
    });
    expect(beforeDue).toBe(presence);

    const changed = advanceCommonPresence(presence, {
      now: presence.nextChangeAt,
      rand: () => 0,
    });
    expect(changed.change.type).toBe("left");
    expect(changed.occupants).toHaveLength(presence.occupants.length - 1);
    expect(changed.nextChangeAt).toBe(
      presence.nextChangeAt + COMMON_PRESENCE_MIN_MS
    );
    expect(
      advanceCommonPresence(changed, {
        now: changed.nextChangeAt - 1,
        rand: () => 0,
      })
    ).toBe(changed);
  });

  it("brings a different resident into a free seat without taking the user's seat", () => {
    const now = 20_000;
    const initial = createCommonPresence("common-cottage", now, () => 0);
    const thinned = advanceCommonPresence(initial, {
      now: initial.nextChangeAt,
      rand: () => 0,
    });
    const guest = joinCommonPresence(thinned);
    const joined = advanceCommonPresence(thinned, {
      now: thinned.nextChangeAt,
      reservedSeatId: guest.guestSeatId,
      rand: vi.fn()
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0),
    });

    expect(joined.change.type).toBe("joined");
    expect(joined.occupants).toHaveLength(initial.occupants.length);
    expect(joined.occupants.map((person) => person.username)).not.toContain(
      thinned.change.person.username
    );
    expect(joined.occupants.map((person) => person.seatId)).not.toContain(
      guest.guestSeatId
    );
    expect(new Set(joined.occupants.map((person) => person.seatId)).size).toBe(
      joined.occupants.length
    );
  });

  it("finds another arrival seat when the preferred chair is occupied", () => {
    const presence = createCommonPresence("common-cottage", 0, () => 0);
    const session = joinCommonPresence({
      ...presence,
      occupants: [
        ...presence.occupants,
        { username: "ivy", label: "Ivy", seatId: "study-right" },
      ],
    });
    expect(session.guestSeatId).not.toBe("study-right");
    expect(session.occupants.map((person) => person.seatId)).not.toContain(
      session.guestSeatId
    );
  });

  it("keeps every room within its capacity through repeated turnover", () => {
    for (const scene of Object.values(COMMON_PLACES)) {
      let presence = createCommonPresence(scene.id, 0, () => 0);
      const guest = joinCommonPresence(presence);
      for (let index = 0; index < 80; index += 1) {
        presence = advanceCommonPresence(presence, {
          now: presence.nextChangeAt,
          reservedSeatId: guest.guestSeatId,
          rand: () => (index % 3 === 0 ? 0.9 : 0.1),
        });
        const usernames = presence.occupants.map((person) => person.username);
        const seats = presence.occupants.map((person) => person.seatId);
        expect(new Set(usernames).size, scene.id).toBe(usernames.length);
        expect(new Set(seats).size, scene.id).toBe(seats.length);
        expect(seats, scene.id).not.toContain(guest.guestSeatId);
        expect(presence.occupants.length, scene.id).toBeGreaterThanOrEqual(1);
        expect(presence.occupants.length, scene.id).toBeLessThan(
          scene.seats.length
        );
      }
    }
  });
});
