import { describe, expect, it } from "vitest";
import { ISO_ITEMS, isoPresetLayout, seatedPlacement, surfaceFor } from "./isoRoom";
import { resolveWorkstations, seatedWorkTarget } from "./workstations";

describe("workstation equipment and physical contact", () => {
  it('places the built-in keyboard on the correct side of a resized rear-facing desk', () => {
    const desk = { id: 'sized', item: 'desk', gx: 1, gy: 2, rot: 2, dimensions: { w: 4, d: 1.5 } };
    const station = resolveWorkstations([desk]).get('sized');
    expect(station.hands[0].gx).toBeCloseTo(1 + 4 - (.12 + .48 * .3));
    expect(station.hands[0].gy).toBeCloseTo(2 + 1.5 - (.25 + .13 / 2));
    expect(station.height).toBe(33);
  });
  const desk = { id: "desk", item: "desk", gx: 0, gy: 1.5, rot: 1 };
  const computer = { id: "computer", item: "computer", gx: 0, gy: 2, rot: 1 };
  const chair = { id: "chair", item: "deskchair", gx: 1, gy: 2.5, rot: 3 };
  const person = { id: "person", item: "you", gx: 1, gy: 2.5 };
  const seat = { placement: chair, height: ISO_ITEMS.deskchair.seat, lie: false };

  it("replaces only the desk equipment supported by the actual surface", () => {
    expect(resolveWorkstations([desk]).get("desk").equipped).toBe(false);
    expect(resolveWorkstations([desk, computer]).get("desk").equipped).toBe(true);
    expect(resolveWorkstations([desk, { ...computer, gx: 5 }]).get("desk").equipped).toBe(false);
    const table = { id: "table", item: "coffeetable", gx: 5, gy: 3 };
    const laptop = { id: "laptop", item: "laptop", gx: 5, gy: 3 };
    expect(surfaceFor(laptop, [desk, table, laptop]).placement.id).toBe("table");
    expect(resolveWorkstations([desk, table, laptop]).get("desk").equipped).toBe(false);
  });

  it("places both Loft hands on the keyboard after chair transpose and height", () => {
    const seated = { ...person, ...seatedPlacement(person, seat) };
    const contact = seatedWorkTarget(seated, seat, resolveWorkstations([desk, computer]));
    // Independent world-space keyboard points: x=.77, y=2.53/2.81,
    // 32px above floor, against the cushion centre(1.4,2.9) at height21.
    expect(contact.hands[0].x).toBeCloseTo(6.24);
    expect(contact.hands[0].y).toBeCloseTo(-23);
    expect(contact.hands[1].x).toBeCloseTo(12.96);
    expect(contact.hands[1].y).toBeCloseTo(-19.64);
    expect(contact.reachable).toBe(true);
    expect(seated._seatRot).toBe(3);
    expect(person.rot).toBeUndefined(); // no stored placement mutation
  });

  it("refuses a desk behind the sitter, a remote keyboard and soft-floor seating", () => {
    const stations = resolveWorkstations([desk, computer]);
    const wrongSeat = { ...seat, placement: { ...chair, rot: 1 } };
    expect(seatedWorkTarget(person, wrongSeat, stations)).toBeNull();
    expect(seatedWorkTarget({ ...person, gx: 5 }, seat, stations)).toBeNull();
    expect(seatedWorkTarget(person, { ...seat, soft: true }, stations)).toBeNull();
  });

  it("does not reach through a reversed monitor", () => {
    const reversed = resolveWorkstations([desk, { ...computer, rot: 0 }]);
    expect(seatedWorkTarget(person, seat, reversed)).toBeNull();
  });

  it('keeps the sitter centred and refuses the old offset Loft keyboard reach', () => {
    const oldChair = { ...chair, gy: 2 };
    const oldSeat = { ...seat, placement: oldChair };
    const seated = { ...person, ...seatedPlacement(person, oldSeat) };
    expect(seated.gx).toBeCloseTo(oldChair.gx);
    expect(seated.gy).toBeCloseTo(oldChair.gy);
    const target = seatedWorkTarget(seated, oldSeat, resolveWorkstations([desk, computer]));
    expect(target).not.toBeNull(); // still owns the desk/chair depth ordering
    expect(target.reachable).toBe(false);
  });
  it('keeps the actual Loft preset within keyboard reach', () => {
    const layout = isoPresetLayout('loft');
    const chair = layout.placements.find(p => p.item === 'deskchair');
    const seat = { placement: chair, height: ISO_ITEMS.deskchair.seat };
    const sitter = { item: 'you', ...seatedPlacement({ item: 'you' }, seat) };
    expect(seatedWorkTarget(sitter, seat, resolveWorkstations(layout.placements)).reachable).toBe(true);
  });
});
