import { describe, it, expect } from "vitest";
import { TILE_W, TILE_H, project, unproject, isoBox } from "./iso";

describe("isometric projection", () => {
  it("projects the origin to the origin", () => {
    expect(project(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("keeps the 2:1 diamond ratio", () => {
    const p = project(1, 0);
    expect(p).toEqual({ x: TILE_W / 2, y: TILE_H / 2 });
    expect(TILE_W).toBe(2 * TILE_H);
  });

  it("+gx goes lower-right, +gy goes lower-left", () => {
    expect(project(1, 0).x).toBeGreaterThan(0);
    expect(project(0, 1).x).toBeLessThan(0);
    expect(project(1, 0).y).toBeGreaterThan(0);
    expect(project(0, 1).y).toBeGreaterThan(0);
  });

  it("unproject inverts project exactly (the future drag mapping)", () => {
    for (const [gx, gy] of [[0, 0], [3, 5], [7.5, 2.25], [-1, 4]]) {
      const { x, y } = project(gx, gy);
      const g = unproject(x, y);
      expect(g.gx).toBeCloseTo(gx, 10);
      expect(g.gy).toBeCloseTo(gy, 10);
    }
  });

  it("screen depth increases toward the viewer on both axes", () => {
    // The painter's-order RULE lives in sortIso (a placement's front corner).
    // What this module guarantees is the property that rule rests on: moving
    // along either axis moves you down the screen.
    expect(project(2, 3).y).toBeGreaterThan(project(1, 3).y);
    expect(project(2, 3).y).toBeGreaterThan(project(2, 2).y);
  });

  it("isoBox's front corner is the lowest point on screen", () => {
    const { corners } = isoBox(2, 2, 2, 1, 30);
    expect(corners.C.y).toBeGreaterThan(corners.A.y);
    expect(corners.C.y).toBeGreaterThan(corners.B.y);
    expect(corners.C.y).toBeGreaterThan(corners.D.y);
  });

  it("isoBox faces are quads", () => {
    const box = isoBox(0, 0, 1, 1, 20);
    for (const face of [box.top, box.left, box.right]) {
      expect(face.split(" ")).toHaveLength(4);
    }
  });
});
