import { describe, it, expect } from "vitest";
import {
  DEFAULT_ISO_SIZE,
  ISO_ITEMS,
  ISO_ITEM_KEYS,
  ISO_MAX_ITEMS,
  ISO_PRESET_KEYS,
  ISO_PRESETS,
  clampIsoPlacement,
  clampIsoSize,
  cutsToMask,
  defaultIsoLayout,
  footOf,
  footprintFree,
  isoPresetLayout,
  lipRuns,
  newIsoPlacement,
  normalizeMask,
  snapHalf,
  sortIso,
  validateIsoLayout,
  wallRuns,
} from "./isoRoom";
import { ISO_SPRITES } from "../components/IsoItems";

const SIZE = { w: 9, d: 7 };

describe("iso catalog integrity", () => {
  it("every item has a sprite, a footprint and a hit height", () => {
    for (const key of ISO_ITEM_KEYS) {
      const item = ISO_ITEMS[key];
      expect(ISO_SPRITES[key], `sprite for ${key}`).toBeTypeOf("function");
      expect(item.foot[0]).toBeGreaterThan(0);
      expect(item.foot[1]).toBeGreaterThan(0);
      expect(item.hitH).toBeGreaterThan(0);
      expect(item.label).toBeTruthy();
    }
  });

  it("every sprite belongs to a catalog entry", () => {
    for (const key of Object.keys(ISO_SPRITES)) {
      expect(ISO_ITEMS[key], `catalog entry for ${key}`).toBeTruthy();
    }
  });
});

describe("grid maths", () => {
  it("snaps to half tiles", () => {
    expect(snapHalf(3.2)).toBe(3);
    expect(snapHalf(3.3)).toBe(3.5);
    expect(snapHalf(3.76)).toBe(4);
  });

  it("keeps a footprint fully on the floor", () => {
    // rug is 3.5×2.5 — in a 9×7 room its origin caps at (5.5, 4.5)
    expect(clampIsoPlacement("rug", 99, 99, SIZE)).toEqual({ gx: 5.5, gy: 4.5 });
    expect(clampIsoPlacement("rug", -5, -5, SIZE)).toEqual({ gx: 0, gy: 0 });
  });

  it("clamps sizes into the allowed range as integers", () => {
    expect(clampIsoSize(1)).toBe(3);
    expect(clampIsoSize(99)).toBe(30);
    expect(clampIsoSize(8.6)).toBe(9);
    expect(clampIsoSize("junk")).toBe(DEFAULT_ISO_SIZE.w);
  });

  it("rotation transposes the footprint (and the clamp with it)", () => {
    expect(footOf("sofa", 0)).toEqual([2, 1]);
    expect(footOf("sofa", 1)).toEqual([1, 2]);
    // in a 9×7 room a rotated sofa's origin caps at (8, 5), not (7, 6)
    expect(clampIsoPlacement("sofa", 99, 99, SIZE, 1)).toEqual({ gx: 8, gy: 5 });
    expect(clampIsoPlacement("sofa", 99, 99, SIZE, 0)).toEqual({ gx: 7, gy: 6 });
  });

  it("wall items are glued to their wall; rot picks which one", () => {
    // rot 0 → right wall: gy pinned to 0, slides along gx
    expect(clampIsoPlacement("frame", 4, 5, SIZE, 0)).toEqual({ gx: 4, gy: 0 });
    expect(clampIsoPlacement("frame", 99, 0, SIZE, 0)).toEqual({ gx: 9 - 1.4, gy: 0 });
    // rot 1 → left wall: gx pinned to 0, slides along gy
    expect(clampIsoPlacement("frame", 4, 5, SIZE, 1)).toEqual({ gx: 0, gy: 5 });
    expect(clampIsoPlacement("frame", 0, 99, SIZE, 1)).toEqual({ gx: 0, gy: 7 - 1.4 });
  });
});

describe("render ordering", () => {
  it("flat rugs paint first regardless of depth", () => {
    const out = sortIso([
      { id: "a", item: "cat", gx: 0, gy: 0 },
      { id: "b", item: "rug", gx: 5, gy: 4 },
    ]);
    expect(out.map((p) => p.item)).toEqual(["rug", "cat"]);
  });

  it("nearer items (bigger front-corner depth) paint later", () => {
    const out = sortIso([
      { id: "a", item: "stool", gx: 6, gy: 5 },
      { id: "b", item: "stool", gx: 1, gy: 1 },
    ]);
    expect(out.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("wall decor paints behind everything, even rugs", () => {
    const out = sortIso([
      { id: "a", item: "rug", gx: 0, gy: 0 },
      { id: "b", item: "frame", gx: 6, gy: 0 },
    ]);
    expect(out.map((p) => p.item)).toEqual(["frame", "rug"]);
  });
});

describe("newIsoPlacement", () => {
  it("spawns on the grid with a unique id", () => {
    const a = newIsoPlacement("stool", [], SIZE);
    const b = newIsoPlacement("stool", [a], SIZE);
    expect(a.id).not.toBe(b.id);
    expect(`${a.gx},${a.gy}`).not.toBe(`${b.gx},${b.gy}`);
    expect(a.gx).toBeGreaterThanOrEqual(0);
    expect(a.gx).toBeLessThanOrEqual(SIZE.w - ISO_ITEMS.stool.foot[0]);
  });

  it("returns null for unknown items", () => {
    expect(newIsoPlacement("hot-tub", [], SIZE)).toBeNull();
  });
});

describe("validateIsoLayout", () => {
  it("returns null for non-layouts", () => {
    expect(validateIsoLayout(null)).toBeNull();
    expect(validateIsoLayout("nope")).toBeNull();
  });

  it("clamps size and re-homes out-of-room furniture", () => {
    const out = validateIsoLayout({
      w: 99,
      d: 1,
      placements: [{ id: "a", item: "stool", gx: 50, gy: 50 }],
    });
    expect(out.w).toBe(30);
    expect(out.d).toBe(3);
    expect(out.placements[0].gx).toBeLessThanOrEqual(30 - ISO_ITEMS.stool.foot[0]);
    expect(out.placements[0].gy).toBeLessThanOrEqual(3 - ISO_ITEMS.stool.foot[1]);
  });

  it("drops unknown items and bad coordinates, keeps valid tints", () => {
    const out = validateIsoLayout({
      w: 9,
      d: 7,
      placements: [
        { id: "a", item: "stool", gx: 2, gy: 2, tint: "#6fb8cf" },
        { id: "b", item: "jacuzzi", gx: 1, gy: 1 },
        { id: "c", item: "cat", gx: NaN, gy: 2 },
        { id: "d", item: "cat", gx: 3, gy: 3, tint: "purple" },
      ],
    });
    expect(out.placements.map((p) => p.id)).toEqual(["a", "d"]);
    expect(out.placements[0].tint).toBe("#6fb8cf");
    expect(out.placements[1].tint).toBeUndefined();
  });

  it("keeps rot 1, normalises everything else to unrotated", () => {
    const out = validateIsoLayout({
      w: 9,
      d: 7,
      placements: [
        { id: "a", item: "sofa", gx: 2, gy: 2, rot: 1 },
        { id: "b", item: "sofa", gx: 2, gy: 2, rot: 7 },
        { id: "c", item: "frame", gx: 3, gy: 6, rot: 1 }, // wall item re-glued
      ],
    });
    expect(out.placements[0].rot).toBe(1);
    expect(out.placements[1].rot).toBeUndefined();
    expect(out.placements[2]).toMatchObject({ gx: 0, gy: 7 - 1.4, rot: 1 });
  });

  it("caps runaway layouts", () => {
    const many = Array.from({ length: ISO_MAX_ITEMS + 10 }, (_, i) => ({
      id: `p${i}`,
      item: "stool",
      gx: 1,
      gy: 1,
    }));
    expect(validateIsoLayout({ w: 9, d: 7, placements: many }).placements).toHaveLength(
      ISO_MAX_ITEMS
    );
  });
});

describe("floor masks (drawn shapes)", () => {
  // 10×8 with the front-right 4×3 painted away (an L)
  const L_MASK = [
    "1111111111",
    "1111111111",
    "1111111111",
    "1111111111",
    "1111111111",
    "1111110000",
    "1111110000",
    "1111110000",
  ];
  const L_ROOM = { w: 10, d: 8, mask: L_MASK };

  it("footprints must sit on painted tiles only", () => {
    expect(footprintFree(1, 1, [1, 1], L_ROOM)).toBe(true);
    expect(footprintFree(7, 6, [1, 1], L_ROOM)).toBe(false);
    expect(footprintFree(5.5, 4.5, [1, 1], L_ROOM)).toBe(false); // straddles
  });

  it("normalize pads junk (missing = floor), all-on implicit, all-off refused", () => {
    expect(normalizeMask(["10", "0"], 2, 2)).toEqual(["10", "01"]);
    expect(normalizeMask(["11", "11"], 2, 2)).toBeUndefined();
    expect(normalizeMask(["00", "00"], 2, 2)).toBeUndefined();
  });

  it("legacy corner cuts convert to the same mask", () => {
    expect(cutsToMask([{ corner: "front", cw: 4, cd: 3 }], 10, 8)).toEqual(L_MASK);
  });

  it("walls and lip are computed per tile edge", () => {
    expect(wallRuns({ w: 10, d: 8 })).toHaveLength(2);
    // back-corner hole: main walls shorten + two inner planes appear
    const back = { w: 10, d: 8, mask: cutsToMask([{ corner: "back", cw: 3, cd: 2 }], 10, 8) };
    expect(wallRuns(back)).toHaveLength(4);
    expect(lipRuns({ w: 10, d: 8 })).toHaveLength(2);
    expect(lipRuns(L_ROOM)).toHaveLength(4);
  });

  it("wall items slide only along the wall's remaining main run", () => {
    const back = { w: 10, d: 8, mask: cutsToMask([{ corner: "back", cw: 3, cd: 2 }], 10, 8) };
    expect(clampIsoPlacement("frame", 0, 0, back, 0).gx).toBe(3);
    expect(clampIsoPlacement("frame", 0, 0, back, 1).gy).toBe(2);
  });

  it("validate relocates items off void tiles (or drops them if hopeless)", () => {
    const out = validateIsoLayout({
      ...L_ROOM,
      placements: [{ id: "a", item: "stool", gx: 8, gy: 6 }],
    });
    expect(out.placements).toHaveLength(1);
    const p = out.placements[0];
    expect(footprintFree(p.gx, p.gy, footOf("stool", 0), out)).toBe(true);
  });
});

describe("environments", () => {
  it("keeps a known env, defaults junk to room (implicit)", () => {
    expect(validateIsoLayout({ w: 9, d: 7, env: "garden", placements: [] }).env).toBe("garden");
    expect(validateIsoLayout({ w: 9, d: 7, env: "space", placements: [] }).env).toBeUndefined();
    expect(validateIsoLayout({ w: 9, d: 7, env: "room", placements: [] }).env).toBeUndefined();
  });

  it("drops wall decor outdoors (no walls to hang it on)", () => {
    const out = validateIsoLayout({
      w: 9,
      d: 7,
      env: "garden",
      placements: [
        { id: "a", item: "frame", gx: 2, gy: 0 },
        { id: "b", item: "tree", gx: 2, gy: 2 },
      ],
    });
    expect(out.placements.map((p) => p.item)).toEqual(["tree"]);
  });
});

describe("presets", () => {
  it("every preset is valid by its own rules and fits its own floor", () => {
    for (const key of ISO_PRESET_KEYS) {
      const layout = isoPresetLayout(key);
      const revalidated = validateIsoLayout(layout);
      expect(revalidated.placements, `preset ${key} loses items`).toHaveLength(
        layout.placements.length
      );
      expect({ w: revalidated.w, d: revalidated.d }).toEqual({ w: layout.w, d: layout.d });
      for (const p of layout.placements) {
        const clamped = clampIsoPlacement(p.item, p.gx, p.gy, layout, p.rot || 0);
        expect({ gx: p.gx, gy: p.gy }, `preset ${key}: ${p.item} out of bounds`).toEqual(
          clamped
        );
        expect(p.gx, `${key}:${p.item} gx not half-snapped`).toBe(snapHalf(p.gx));
        expect(p.gy, `${key}:${p.item} gy not half-snapped`).toBe(snapHalf(p.gy));
      }
    }
  });

  it("each application mints fresh ids (presets can be applied repeatedly)", () => {
    const a = isoPresetLayout("classic");
    const b = isoPresetLayout("classic");
    const ids = new Set([...a.placements, ...b.placements].map((p) => p.id));
    expect(ids.size).toBe(a.placements.length * 2);
  });

  it("the default layout is the classic preset, and empty is empty", () => {
    expect(defaultIsoLayout().placements.length).toBe(
      ISO_PRESETS.classic.items.length
    );
    expect(isoPresetLayout("empty").placements).toEqual([]);
    expect(isoPresetLayout("empty").w).toBe(DEFAULT_ISO_SIZE.w);
  });
});
