import { describe, expect, it } from "vitest";
import { isoPresetLayout } from "./isoRoom";
import {
  HOME_VISITOR_KICK_COOLDOWN_MS,
  HOME_VISITOR_MAX,
  admitHomeVisitor,
  advanceHomeVisitors,
  chooseHomeVisitor,
  homeVisitorScene,
  homeVisitorStay,
  homeVisitorsEnabled,
  moveHomeVisitor,
  nextHomeVisitorDelay,
} from "./homeVisitors";

const friends = [
  { id: 1, username: "luna", displayName: "Luna", avatar: "🌙" },
  { id: 2, username: "kai", displayName: "Kai", avatar: "🍵" },
];

describe("open-room drop-ins", () => {
  it("admits friends under the default Friends-only setting as well as Open", () => {
    const home = { isometric: true, editing: false, isVisiting: false, widgetMode: false };
    for (const access of ["friends", "open"]) {
      expect(homeVisitorsEnabled({ ...home, access })).toBe(true);
      for (const blocked of [{ editing: true }, { isVisiting: true }, { widgetMode: true }, { isometric: false }]) {
        expect(homeVisitorsEnabled({ ...home, access, ...blocked })).toBe(false);
      }
    }
    for (const access of ["invite", "private", undefined, "unknown"]) {
      expect(homeVisitorsEnabled({ ...home, access })).toBe(false);
    }
  });
  it("spaces arrivals and gives guests a bounded visit", () => {
    expect(nextHomeVisitorDelay(() => 0)).toBe(90_000);
    expect(nextHomeVisitorDelay(() => 1)).toBeLessThanOrEqual(4 * 60_000);
    expect(homeVisitorStay(() => 0)).toBe(4 * 60_000);
    expect(homeVisitorStay(() => 1)).toBeLessThanOrEqual(10 * 60_000);
  });

  it("does not choose someone present or still cooling down after a kick", () => {
    const now = 1_000_000;
    expect(
      chooseHomeVisitor(friends, [{ username: "luna" }], { kai: now + 1 }, now, () => 0)
    ).toBeNull();
    expect(
      chooseHomeVisitor(friends, [], { luna: now + HOME_VISITOR_KICK_COOLDOWN_MS }, now, () => 0)
    ).toEqual(friends[1]);
  });

  it("adds at most two temporary residents without mutating the saved room", () => {
    const room = isoPresetLayout("classic");
    const original = room.placements;
    const luna = admitHomeVisitor(room, [], friends[0], 100, () => 0);
    const kai = admitHomeVisitor(room, [luna], friends[1], 200, () => 0);
    expect(luna).not.toBeNull();
    expect(kai).not.toBeNull();
    expect(admitHomeVisitor(room, [luna, kai], { id: 3, username: "sora" }, 300)).toBeNull();
    expect([luna, kai]).toHaveLength(HOME_VISITOR_MAX);

    const scene = homeVisitorScene(room, [luna, kai]);
    expect(scene.layout.placements).toHaveLength(original.length + 2);
    expect(room.placements).toBe(original);
    expect(scene.personas[luna.id].label).toBe("Luna");
    expect(scene.personas[luna.id].npcUsername).toBe("luna");
  });

  it("lets the host re-seat a guest without changing other visitors", () => {
    const visitors = [
      { id: "home-visitor-1", gx: 1, gy: 1 },
      { id: "home-visitor-2", gx: 2, gy: 2 },
    ];
    const moved = moveHomeVisitor(visitors, "home-visitor-1", 4, 5);
    expect(moved[0]).toMatchObject({ gx: 4, gy: 5 });
    expect(moved[1]).toBe(visitors[1]);
    expect(moveHomeVisitor(moved, "unknown", 0, 0)).toBe(moved);
  });

  it("schedules arrivals, admits them when due, and removes them after their stay", () => {
    const room = isoPresetLayout("classic");
    const scheduled = advanceHomeVisitors({
      layout: room,
      friends,
      visitors: [],
      now: 1_000,
      nextArrivalAt: null,
      rand: () => 0,
    });
    expect(scheduled.visitors).toEqual([]);
    expect(scheduled.nextArrivalAt).toBe(91_000);

    const arrived = advanceHomeVisitors({
      layout: room,
      friends,
      visitors: scheduled.visitors,
      now: scheduled.nextArrivalAt,
      nextArrivalAt: scheduled.nextArrivalAt,
      rand: () => 0,
    });
    expect(arrived.arrived?.username).toBe("luna");
    expect(arrived.visitors).toHaveLength(1);
    expect(arrived.nextArrivalAt).toBe(scheduled.nextArrivalAt + 90_000);

    const departed = advanceHomeVisitors({
      layout: room,
      friends,
      visitors: arrived.visitors,
      now: arrived.arrived.leaveAt,
      nextArrivalAt: arrived.arrived.leaveAt + 1,
      rand: () => 0,
    });
    expect(departed.visitors).toEqual([]);
  });
});
