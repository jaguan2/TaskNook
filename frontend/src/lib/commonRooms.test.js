import { describe, expect, it } from "vitest";
import { COMMON_PLACES, availableCommonSeats, createCommonSession, resolveCommonProps, settleCommonGuest } from "./commonRooms";
import { footOf, isoDepth, ISO_ITEMS } from "./isoRoom";

describe("fixed common places", () => {
  it("keeps every authored place internally valid and reserves seats for guests", () => {
    for (const scene of Object.values(COMMON_PLACES)) {
      expect(new Set(scene.props.map((p) => p.id)).size, scene.id).toBe(scene.props.length);
      for (const p of scene.props) {
        expect(ISO_ITEMS[p.item], `${scene.id}/${p.id} catalog item`).toBeTruthy();
        expect(scene.surfaces[p.level || "ground"], `${scene.id}/${p.id} surface`).toBeTruthy();
        if (p.on) {
          const host = scene.props.find((candidate) => candidate.id === p.on);
          expect(host, `${scene.id}/${p.id} support`).toBeTruthy();
          expect(ISO_ITEMS[host.item].surface, `${scene.id}/${p.id} tabletop`).toBeGreaterThan(0);
          expect(p.level || "ground", `${scene.id}/${p.id} level`).toBe(host.level || "ground");
        }
      }
      const anchors = new Set();
      const seatIds = new Set(scene.seats.map((seat) => seat.id));
      for (const seat of scene.seats) {
        const furniture = scene.props.find((p) => p.id === seat.furniture);
        const surface = scene.surfaces[seat.level];
        expect(furniture, `${scene.id}/${seat.id} furniture`).toBeTruthy();
        expect(surface, `${scene.id}/${seat.id} surface`).toBeTruthy();
        expect(seat.height, `${scene.id}/${seat.id} height`).toBe(ISO_ITEMS[furniture.item].seat);
        expect(seat.gx, `${scene.id}/${seat.id} gx`).toBeGreaterThanOrEqual(surface.gx);
        expect(seat.gy, `${scene.id}/${seat.id} gy`).toBeGreaterThanOrEqual(surface.gy);
        expect(seat.gx + 0.8, `${scene.id}/${seat.id} gx end`).toBeLessThanOrEqual(surface.gx + surface.dx);
        expect(seat.gy + 0.8, `${scene.id}/${seat.id} gy end`).toBeLessThanOrEqual(surface.gy + surface.dy);
        anchors.add(`${seat.level}:${seat.gx}:${seat.gy}`);
      }
      expect(anchors.size, scene.id).toBe(scene.seats.length);
      expect(scene.neighbours.every((person) => seatIds.has(person.seatId)), scene.id).toBe(true);
      expect(new Set(scene.neighbours.map((person) => person.seatId)).size, scene.id).toBe(scene.neighbours.length);
      const session = createCommonSession(scene.id);
      expect(session, scene.id).toEqual(createCommonSession(scene.id));
      expect(availableCommonSeats(session), scene.id).toHaveLength(scene.seats.length - scene.neighbours.length);
      expect(availableCommonSeats(session).map((seat) => seat.id), scene.id).toContain(scene.arrivalSeat);
    }
  });

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
  it("authors cozy wall, light and lived-in detail around the fixed seats", () => {
    const scene = COMMON_PLACES["common-cottage"];
    const items = new Set(scene.props.map((p) => p.item));
    for (const item of ["curtain", "fairylights", "corkboard", "frame", "wallshelf", "palm", "basket", "candle"])
      expect(items.has(item), item).toBe(true);
    expect(scene.props.filter((p) => ISO_ITEMS[p.item].wall).length).toBeGreaterThanOrEqual(8);
    expect(scene.props.filter((p) => ISO_ITEMS[p.item].glow).length).toBeGreaterThanOrEqual(8);
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

  it("keeps library seats physically supported across the gallery and lower hall", () => {
    const scene = COMMON_PLACES["grand-library"];
    const before = JSON.stringify(scene);
    const session = createCommonSession(scene.id);
    const occupants = session.occupants;
    expect(scene.seats).toHaveLength(36);
    expect(session.occupants).toHaveLength(12);
    expect(availableCommonSeats(session)).toHaveLength(24);
    for (const seat of scene.seats) {
      const chair = scene.props.find((p) => p.id === seat.furniture);
      const [w, d] = footOf(chair.item, chair.rot);
      expect(seat.gx + .4, seat.id).toBeGreaterThanOrEqual(chair.gx);
      expect(seat.gx + .4, seat.id).toBeLessThanOrEqual(chair.gx + w);
      expect(seat.gy + .4, seat.id).toBeGreaterThanOrEqual(chair.gy);
      expect(seat.gy + .4, seat.id).toBeLessThanOrEqual(chair.gy + d);
    }
    const moved = settleCommonGuest(session, "gallery-right");
    expect(moved.guestSeatId).toBe("gallery-right");
    expect(moved.occupants).toBe(occupants);
    expect(settleCommonGuest(moved, "gallery-left")).toBe(moved);
    for (const seat of availableCommonSeats(session)) {
      const settled = settleCommonGuest(session, seat.id);
      expect(settled.guestSeatId).toBe(seat.id);
      expect(settled.occupants).toBe(occupants);
    }
    for (const detail of resolveCommonProps(scene).filter((p) => p.on)) {
      const host = scene.props.find((p) => p.id === detail.on);
      expect(detail._rest, detail.id).toBe(ISO_ITEMS[host.item].surface);
      expect(detail._depth, detail.id).toBeGreaterThan(isoDepth(host));
    }
    for (const p of scene.props.filter((p) => !p.on)) {
      const surface = scene.surfaces[p.level || "ground"];
      const [w, d] = footOf(p.item, p.rot);
      expect(p.gx, p.id).toBeGreaterThanOrEqual(surface.gx);
      expect(p.gy, p.id).toBeGreaterThanOrEqual(surface.gy);
      expect(p.gx + w, p.id).toBeLessThanOrEqual(surface.gx + surface.dx);
      expect(p.gy + d, p.id).toBeLessThanOrEqual(surface.gy + surface.dy);
    }
    expect(JSON.stringify(scene)).toBe(before);
  });

  it("authors Willow Pond as an outdoor social scene rather than another cottage", () => {
    const scene = COMMON_PLACES["willow-pond"];
    const items = new Set(scene.props.map((p) => p.item));
    for (const item of ["pond", "tree", "bush", "bench", "picnic", "cushion", "diningtable", "lantern", "flowers", "cat"])
      expect(items.has(item), item).toBe(true);
    expect(scene.kind).toBe("garden");
    expect(scene.surfaces.ground.style).toBe("grass");
    expect(scene.surfaces.patio.style).toBe("stone");
    expect(scene.props.filter((p) => ISO_ITEMS[p.item].glow)).toHaveLength(5);
    expect(scene.props.filter((p) => p.item === "lantern")).toHaveLength(3);
    expect(scene.props.filter((p) => ["tree", "bush", "fern", "flowers", "flowerbed", "tulips"].includes(p.item)).length)
      .toBeGreaterThanOrEqual(18);
    expect(scene.seats.filter((seat) => seat.furniture === "pond-bench")).toHaveLength(2);
  });
});
