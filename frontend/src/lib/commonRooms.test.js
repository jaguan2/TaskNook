import { describe, expect, it } from "vitest";
import { COMMON_PLACES, availableCommonSeats, createCommonSession, resolveCommonProps, settleCommonGuest } from "./commonRooms";
import { footOf, isoDepth, ISO_ITEMS } from "./isoRoom";

describe("fixed common places", () => {
  it("supports tabletop details at catalog heights and paints them after their hosts", () => {
    const scene = COMMON_PLACES["common-cottage"];
    const before = JSON.stringify(scene);
    const props = resolveCommonProps(scene);
    for (const detail of props.filter((p) => p.on)) {
      const host = props.find((p) => p.id === detail.on);
      expect(detail._rest, detail.id).toBe(ISO_ITEMS[host.item].surface);
      expect(detail._depth, detail.id).toBeGreaterThan(isoDepth(host));
      expect(detail.level || "ground", detail.id).toBe(host.level || "ground");
    }
    const kettle = props.find((p) => p.id === "tea-kettle");
    const mug = props.find((p) => p.id === "tea-mug");
    expect([kettle.gx, kettle.gy]).not.toEqual([mug.gx, mug.gy]);
    expect(JSON.stringify(scene)).toBe(before);
  });
  it("has supported, distinct seats on both levels, including two sofa slots", () => {
    const scene = COMMON_PLACES["common-cottage"];
    const anchors = new Set();
    for (const seat of scene.seats) {
      const furniture = scene.props.find((p) => p.id === seat.furniture);
      const surface = scene.surfaces[seat.level];
      const [w, d] = footOf(furniture.item, furniture.rot);
      expect(seat.height, seat.id).toBe(ISO_ITEMS[furniture.item].seat);
      // Character footprint centres must land on their physical seat, rather
      // than merely passing a scene-ID whitelist.
      expect(seat.gx + 0.4, seat.id).toBeGreaterThanOrEqual(furniture.gx);
      expect(seat.gx + 0.4, seat.id).toBeLessThanOrEqual(furniture.gx + w);
      expect(seat.gy + 0.4, seat.id).toBeGreaterThanOrEqual(furniture.gy);
      expect(seat.gy + 0.4, seat.id).toBeLessThanOrEqual(furniture.gy + d);
      expect(seat.gx, seat.id).toBeGreaterThanOrEqual(surface.gx);
      expect(seat.gy, seat.id).toBeGreaterThanOrEqual(surface.gy);
      expect(seat.gx + 0.8, seat.id).toBeLessThanOrEqual(surface.gx + surface.dx);
      expect(seat.gy + 0.8, seat.id).toBeLessThanOrEqual(surface.gy + surface.dy);
      anchors.add(`${seat.level}:${seat.gx}:${seat.gy}`);
    }
    expect(anchors.size).toBe(6);
    expect(scene.surfaces.nook.z).toBeGreaterThan(scene.surfaces.ground.z);
    expect(scene.seats.filter((s) => s.furniture === "lounge-sofa")).toHaveLength(2);
  });
  it("arrives in a reserved free seat with a stable, varied population", () => {
    const session = createCommonSession("common-cottage");
    expect(session).toEqual(createCommonSession("common-cottage"));
    expect(session.occupants).toHaveLength(3);
    expect(new Set(session.occupants.map((p) => p.seatId)).size).toBe(3);
    expect(new Set(session.occupants.map((p) => p.character.coatColor)).size).toBe(3);
    expect(availableCommonSeats(session).map((s) => s.id)).toContain(session.guestSeatId);
    expect(availableCommonSeats(session)).toHaveLength(3);
    expect(createCommonSession("missing")).toBeNull();
  });
  it("moves only the guest and refuses occupied or unknown destinations", () => {
    const session = createCommonSession("common-cottage");
    const moved = settleCommonGuest(session, "window-right");
    expect(moved.guestSeatId).toBe("window-right");
    expect(moved.occupants).toBe(session.occupants);
    expect(session.guestSeatId).toBe("study-right");
    expect(settleCommonGuest(moved, "window-left")).toBe(moved);
    expect(settleCommonGuest(moved, "missing")).toBe(moved);
    expect(availableCommonSeats(null)).toEqual([]);
  });
});
