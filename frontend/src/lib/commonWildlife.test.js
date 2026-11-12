import { describe, expect, it } from "vitest";
import { WILLOW_DUCKS, wildlifeAt } from "./commonWildlife";
import { COMMON_PLACES } from "./commonRooms";

describe("authored pond wildlife", () => {
  it("follows closed, reproducible routes without jumps at the loop boundary", () => {
    for (const duck of WILLOW_DUCKS) {
      const start = wildlifeAt(duck, 0);
      expect(wildlifeAt(duck, duck.duration)).toEqual(start);
      expect(wildlifeAt(duck, duck.duration * 20)).toEqual(start);
      const end = wildlifeAt(duck, duck.duration - 1);
      expect(Math.hypot(end.gx - start.gx, end.gy - start.gy)).toBeLessThan(.001);
      for (let elapsed = 0; elapsed < duck.duration; elapsed += 1000) {
        const before = wildlifeAt(duck, elapsed);
        const after = wildlifeAt(duck, elapsed + 1000);
        // A slow amble, even on the longer dry-bank return leg.
        expect(Math.hypot(after.gx - before.gx, after.gy - before.gy)).toBeLessThan(.15);
      }
    }
  });

  it("keeps one duck on the water and the shore route away from occupied seating", () => {
    const scene = COMMON_PLACES["willow-pond"];
    const pond = scene.props.find(p => p.id === scene.wildlife.waterProp);
    const bankDuck = WILLOW_DUCKS.find(duck => duck.id === "willow-cream-duck");
    expect(wildlifeAt(bankDuck, bankDuck.duration * .48).water).toBe(false);
    expect(wildlifeAt(bankDuck, bankDuck.duration * .9).water).toBe(true);
    for (const duck of WILLOW_DUCKS) {
      for (let t = 0; t < duck.duration; t += 500) {
        const point = wildlifeAt(duck, t);
        expect(point.gx + pond.gx).toBeGreaterThan(.5);
        expect(point.gx + pond.gx).toBeLessThan(scene.w - .5);
        expect(point.gy + pond.gy).toBeLessThan(scene.d - .5);
        if (duck.id === "willow-mallard") expect(point.water).toBe(true);
        if (!point.water) {
          for (const seat of scene.seats) {
            expect(Math.hypot(point.gx + pond.gx - seat.gx, point.gy + pond.gy - seat.gy), seat.id)
              .toBeGreaterThan(.7);
          }
        }
      }
    }
  });
});
