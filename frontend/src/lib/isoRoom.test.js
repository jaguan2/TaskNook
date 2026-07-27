import { describe, it, expect } from "vitest";
import {
  DEFAULT_ISO_PRESET,
  DEFAULT_ISO_SIZE,
  ISO_ITEMS,
  ISO_ITEM_GROUPS,
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
  seatFor,
  snapHalf,
  sortIso,
  surfaceFor,
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

describe("the picker's sections cover the catalog", () => {
  const grouped = ISO_ITEM_GROUPS.flatMap((g) => g.keys);

  it("lists every item exactly once", () => {
    // The picker is the ONLY way to add an item, so a key missing from these
    // sections is a piece of furniture that exists and can never be placed.
    expect([...grouped].sort()).toEqual([...ISO_ITEM_KEYS].sort());
  });

  it("names no item that doesn't exist", () => {
    expect(grouped.filter((k) => !ISO_ITEMS[k])).toEqual([]);
  });

  it("has no empty section", () => {
    for (const g of ISO_ITEM_GROUPS) {
      expect(g.keys.length, `${g.label} is empty`).toBeGreaterThan(0);
      expect(g.label).toBeTruthy();
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
    expect(clampIsoSize(99)).toBe(48);
    expect(clampIsoSize(8.6)).toBe(9);
    expect(clampIsoSize("junk")).toBe(DEFAULT_ISO_SIZE.w);
  });

  it("rotation transposes the footprint (and the clamp with it)", () => {
    // Derived from the catalog, not hardcoded: this is testing transposition,
    // so it must not fail every time a piece is redrawn at a new size.
    const oblong = ISO_ITEM_KEYS.find((k) => {
      const item = ISO_ITEMS[k];
      return !item.wall && item.foot[0] !== item.foot[1];
    });
    const [fx, fy] = ISO_ITEMS[oblong].foot;
    expect(footOf(oblong, 0)).toEqual([fx, fy]);
    expect(footOf(oblong, 1)).toEqual([fy, fx]);
    // …and the clamp follows it: the origin caps at size minus the ROTATED
    // footprint, so the two orientations bottom out in different corners.
    expect(clampIsoPlacement(oblong, 99, 99, SIZE, 0)).toEqual({
      gx: SIZE.w - fx,
      gy: SIZE.d - fy,
    });
    expect(clampIsoPlacement(oblong, 99, 99, SIZE, 1)).toEqual({
      gx: SIZE.w - fy,
      gy: SIZE.d - fx,
    });
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
    expect(out.w).toBe(48);
    expect(out.d).toBe(3);
    expect(out.placements[0].gx).toBeLessThanOrEqual(48 - ISO_ITEMS.stool.foot[0]);
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

  // A wall stands 118px tall and its face shows through the void it faces, so
  // one raised anywhere but the lot's back silhouette is a slab through the
  // middle of the room. Painting any non-rectangular floor plan used to do
  // exactly that.
  describe("walls stay on the back silhouette", () => {
    /** Every tile behind a wall run must be void, all the way to the edge. */
    const nothingBehind = (size) =>
      wallRuns(size).every((run) => {
        for (let i = run.from; i < run.to; i++) {
          for (let j = 0; j < run.at; j++) {
            const on =
              run.plane === "gy"
                ? size.mask?.[j]?.[i] !== "0"
                : size.mask?.[i]?.[j] !== "0";
            if (on) return false;
          }
        }
        return true;
      });

    it("a hole punched mid-floor raises no wall", () => {
      const donut = { w: 5, d: 5, mask: ["11111", "11111", "11011", "11111", "11111"] };
      expect(wallRuns(donut)).toHaveLength(2); // the two originals, nothing more
      expect(nothingBehind(donut)).toBe(true);
    });

    it("a notch bitten out of the front raises no wall", () => {
      const notched = { w: 5, d: 5, mask: ["11111", "11111", "11111", "11011", "11111"] };
      expect(wallRuns(notched)).toHaveLength(2);
    });

    it("but the BACK wall still steps around a back-edge notch", () => {
      const alcove = { w: 5, d: 5, mask: ["11011", "11111", "11111", "11111", "11111"] };
      const gy = wallRuns(alcove).filter((r) => r.plane === "gy");
      expect(gy).toEqual([
        { plane: "gy", at: 0, from: 0, to: 2 },
        { plane: "gy", at: 0, from: 3, to: 5 },
        { plane: "gy", at: 1, from: 2, to: 3 }, // recessed by one tile
      ]);
      expect(nothingBehind(alcove)).toBe(true);
    });

    it("holds for a staircase, where every tile edge faces away", () => {
      const stairs = { w: 4, d: 4, mask: ["1100", "0110", "0011", "0001"] };
      expect(nothingBehind(stairs)).toBe(true);
    });

    it("skips a column and a row with no floor at all", () => {
      const split = { w: 4, d: 2, mask: ["1101", "1101"] };
      expect(wallRuns(split).filter((r) => r.plane === "gy")).toEqual([
        { plane: "gy", at: 0, from: 0, to: 2 },
        { plane: "gy", at: 0, from: 3, to: 4 },
      ]);
    });
  });

  it("the lip still rims a hole — that IS what you see of it", () => {
    const donut = { w: 5, d: 5, mask: ["11111", "11111", "11011", "11111", "11111"] };
    const rim = lipRuns(donut);
    // far rim of the hole (its viewer-facing side) + the room's own two
    expect(rim).toContainEqual({ plane: "gy", at: 2, from: 2, to: 3 });
    expect(rim).toContainEqual({ plane: "gx", at: 2, from: 2, to: 3 });
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

describe("personas", () => {
  it("a persona over a seat is seated; on open floor is not", () => {
    const placements = [
      { id: "s", item: "stool", gx: 2, gy: 2 },
      { id: "p", item: "resident", gx: 2, gy: 2 },
      { id: "q", item: "resident", gx: 5, gy: 5 },
    ];
    const seat = seatFor(placements[1], placements);
    expect(seat?.placement.id).toBe("s");
    expect(seat?.height).toBe(ISO_ITEMS.stool.seat);
    expect(seatFor(placements[2], placements)).toBeNull();
    expect(seatFor(placements[0], placements)).toBeNull(); // not a persona
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

  it("EVERY preset survives validation with all its furniture", () => {
    // The default preset had this guarantee; the other eight didn't, and they
    // are just as capable of losing pieces — validation drops wall decor in a
    // wall-less env and anything it can't find floor for. A preset that
    // quietly arrives short is invisible unless you count.
    for (const key of ISO_PRESET_KEYS) {
      const before = ISO_PRESETS[key].items;
      const after = validateIsoLayout(isoPresetLayout(key));
      expect(after.placements.length, `${key} lost furniture on apply`).toBe(before.length);
      // and every piece is where it was written, not shuffled by the clamp
      for (const want of before) {
        expect(
          after.placements.some(
            (got) => got.item === want.item && got.gx === want.gx && got.gy === want.gy
          ),
          `${key}: ${want.item} moved from ${want.gx},${want.gy}`
        ).toBe(true);
      }
    }
  });

  it("the default layout is the starter preset, and empty is empty", () => {
    // Survives the validator intact — a starter room that silently loses
    // furniture on first paint is the worst possible first impression.
    expect(defaultIsoLayout().placements.length).toBe(
      ISO_PRESETS[DEFAULT_ISO_PRESET].items.length
    );
    expect(ISO_PRESETS[DEFAULT_ISO_PRESET]).toBeTruthy();
    expect(isoPresetLayout("empty").placements).toEqual([]);
    expect(isoPresetLayout("empty").w).toBe(DEFAULT_ISO_SIZE.w);
  });
});

describe("newIsoPlacement lands items on real floor", () => {
  // A donut: the 9x7 floor with its whole middle painted away, so the room's
  // CENTRE — where spawning aims — is void.
  const donut = {
    w: 9,
    d: 7,
    mask: [
      "111111111",
      "111111111",
      "110000011",
      "110000011",
      "110000011",
      "111111111",
      "111111111",
    ],
  };

  const floorKeys = ISO_ITEM_KEYS.filter((k) => !ISO_ITEMS[k].wall);

  it.each(floorKeys)("%s never spawns over a hole", (key) => {
    // Regression: spawning clamped with clampIsoPlacement, which is bounds-only
    // and never consults the mask. Items appeared floating over the courtyard
    // and then refused every drag (the drag engine won't move a footprint onto
    // void), so they read as stuck until a reload quietly relocated them.
    const placement = newIsoPlacement(key, [], donut);
    if (!placement) return; // legitimately too big for this shape
    expect(
      footprintFree(placement.gx, placement.gy, footOf(key, placement.rot), donut),
      `${key} spawned at ${placement.gx},${placement.gy}`
    ).toBe(true);
  });

  it("keeps spawning on floor as the room fills up", () => {
    const placements = [];
    for (let i = 0; i < 12; i++) {
      const p = newIsoPlacement("stool", placements, donut);
      expect(p).toBeTruthy();
      expect(footprintFree(p.gx, p.gy, footOf("stool", 0), donut)).toBe(true);
      placements.push(p);
    }
  });

  it("returns null when the shape genuinely has no room", () => {
    // One tile of floor cannot hold a 2x2.8 bed.
    const pinhole = { w: 4, d: 4, mask: ["1000", "0000", "0000", "0000"] };
    expect(newIsoPlacement("bed", [], pinhole)).toBeNull();
  });

  it("still spawns on a plain rectangle", () => {
    const p = newIsoPlacement("sofa", [], DEFAULT_ISO_SIZE);
    expect(p).toBeTruthy();
    expect(footprintFree(p.gx, p.gy, footOf("sofa", 0), DEFAULT_ISO_SIZE)).toBe(true);
  });
});

describe("surfaceFor — small things rest on tables", () => {
  const desk = { id: "d", item: "desk", gx: 2, gy: 1 }; // 2..4.2 x 1..2.2
  const rug = { id: "r", item: "squarerug", gx: 0, gy: 0 };

  it("lifts an item whose centre is over a surface", () => {
    const mug = { id: "m", item: "mug", gx: 3, gy: 1.5 };
    const on = surfaceFor(mug, [desk, mug]);
    expect(on?.placement.id).toBe("d");
    expect(on.height).toBe(ISO_ITEMS.desk.surface);
  });

  it("leaves it on the floor when it's only NEXT to the surface", () => {
    const mug = { id: "m", item: "mug", gx: 5, gy: 1.5 };
    expect(surfaceFor(mug, [desk, mug])).toBeNull();
  });

  it("ignores items that aren't stackable", () => {
    // A wardrobe standing on a desk is not a feature.
    const wardrobe = { id: "w", item: "wardrobe", gx: 3, gy: 1.5 };
    expect(surfaceFor(wardrobe, [desk, wardrobe])).toBeNull();
  });

  it("ignores surfaces that aren't surfaces", () => {
    const mug = { id: "m", item: "mug", gx: 1, gy: 1 };
    expect(surfaceFor(mug, [rug, mug])).toBeNull();
  });

  it("picks the HIGHEST surface when they stack up", () => {
    // A mug over both a low coffee table and a desk belongs on the desk.
    const low = { id: "l", item: "coffeetable", gx: 2, gy: 1 };
    const mug = { id: "m", item: "mug", gx: 3, gy: 1.5 };
    const on = surfaceFor(mug, [low, desk, mug]);
    expect(on.height).toBe(ISO_ITEMS.desk.surface);
  });

  it("never rests an item on itself", () => {
    // Both flags on one item would otherwise make it its own table.
    const both = { id: "x", item: "computer", gx: 2, gy: 1 };
    expect(surfaceFor(both, [both])).toBeNull();
  });

  it("every surface height is below the item's own hit height", () => {
    // A surface taller than the sprite would float whatever lands on it.
    for (const key of ISO_ITEM_KEYS) {
      const item = ISO_ITEMS[key];
      if (!item.surface) continue;
      expect(item.surface, `${key} surface above its hitH`).toBeLessThanOrEqual(item.hitH);
    }
  });

  it("seatFor reports `lie` so beds get the lying pose", () => {
    const bed = { id: "b", item: "bed", gx: 0, gy: 0 };
    const who = { id: "p", item: "resident", gx: 0.6, gy: 1.2 };
    expect(seatFor(who, [bed, who])?.lie).toBe(true);
    const stool = { id: "s", item: "stool", gx: 0, gy: 0 };
    const sitter = { id: "q", item: "resident", gx: 0.1, gy: 0.1 };
    expect(seatFor(sitter, [stool, sitter])?.lie).toBe(false);
  });
});
