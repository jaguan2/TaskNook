import { describe, expect, it } from "vitest";
import { seatedPlacement, surfaceFor } from "./isoRoom";
import { resolveWorkstations, seatedWorkTarget } from "./workstations";

describe("workstation equipment and physical contact", () => {
  const desk = { id: "desk", item: "desk", gx: 0, gy: 1.5, rot: 1 };
  const computer = { id: "computer", item: "computer", gx: 0, gy: 2, rot: 1 };
  const chair = { id: "chair", item: "deskchair", gx: 1, gy: 2.5, rot: 3 };
  const person = { id: "person", item: "you", gx: 1, gy: 2.5 };
  const seat = { placement: chair, height: 24, lie: false };

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
    // 32px above floor, against hip centre(1.25,2.9) at height24.
    expect(contact.hands[0].x).toBeCloseTo(2.64);
    expect(contact.hands[0].y).toBeCloseTo(-18.2);
    expect(contact.hands[1].x).toBeCloseTo(9.36);
    expect(contact.hands[1].y).toBeCloseTo(-14.84);
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
});
