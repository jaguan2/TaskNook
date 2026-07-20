import { describe, it, expect } from "vitest";
import {
  GRID,
  ITEMS,
  ITEM_KEYS,
  MAX_ITEMS,
  PRESETS,
  ZONES,
  clampToZone,
  newPlacement,
  presetPlacements,
  snap,
  sortForRender,
  validatePlacements,
} from "./room";
import { ITEM_SPRITES } from "../components/RoomItems";

const inZone = (itemKey, x, y) => {
  const z = ZONES[ITEMS[itemKey].zone];
  return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
};

describe("catalog integrity", () => {
  it("every item has a sprite, a zone, and a hit box", () => {
    for (const key of ITEM_KEYS) {
      const item = ITEMS[key];
      expect(ITEM_SPRITES[key], `sprite for ${key}`).toBeTypeOf("function");
      expect(item.zone === "ceiling" || ZONES[item.zone], `zone for ${key}`).toBeTruthy();
      expect(item.hit.w).toBeGreaterThan(0);
      expect(item.hit.h).toBeGreaterThan(0);
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });

  it("every sprite belongs to a catalog entry", () => {
    for (const key of Object.keys(ITEM_SPRITES)) {
      expect(ITEMS[key], `catalog entry for sprite ${key}`).toBeTruthy();
    }
  });
});

describe("snap & clamp", () => {
  it("snaps to the grid", () => {
    expect(snap(0)).toBe(0);
    expect(snap(GRID + 1) % GRID).toBe(0);
    expect(snap(517.7) % GRID).toBe(0);
  });

  it("clamps an origin into its item's zone", () => {
    const { x, y } = clampToZone("mug", -500, 900);
    expect(inZone("mug", x, y)).toBe(true);
  });

  it("leaves in-zone points alone", () => {
    const z = ZONES.floor;
    const p = clampToZone("cat", z.x + 10, z.y + 10);
    expect(p).toEqual({ x: z.x + 10, y: z.y + 10 });
  });

  it("passes fixed items through untouched", () => {
    expect(clampToZone("garland", 1, 2)).toEqual({ x: 1, y: 2 });
  });
});

describe("render ordering", () => {
  const p = (item, y, id = `${item}-${y}`) => ({ id, item, x: 100, y });

  it("draws rugs before standing floor items regardless of y", () => {
    // Cat ABOVE the rug's centre line: naive y-sorting would paint the rug
    // over the cat. Rugs are flat, so they must always go down first.
    const out = sortForRender([p("cat", 420), p("rug", 440)]);
    expect(out.map((o) => o.item)).toEqual(["rug", "cat"]);
  });

  it("draws nearer (lower) items later within a zone", () => {
    const out = sortForRender([p("cat", 460), p("monstera", 410)]);
    expect(out.map((o) => o.item)).toEqual(["monstera", "cat"]);
  });

  it("orders zones ceiling → wall → desk → floor", () => {
    const out = sortForRender([
      p("cat", 430),
      p("mug", 300),
      p("clock", 100),
      p("garland", 24),
    ]);
    expect(out.map((o) => o.item)).toEqual(["garland", "clock", "mug", "cat"]);
  });

  it("does not mutate its input", () => {
    const input = [p("cat", 460), p("rug", 440)];
    const before = input.map((o) => o.id);
    sortForRender(input);
    expect(input.map((o) => o.id)).toEqual(before);
  });
});

describe("newPlacement", () => {
  it("spawns inside the item's zone with a unique id", () => {
    const a = newPlacement("mug", []);
    const b = newPlacement("mug", [a]);
    expect(inZone("mug", a.x, a.y)).toBe(true);
    expect(a.id).not.toBe(b.id);
  });

  it("fans repeated adds out instead of stacking them", () => {
    const a = newPlacement("cat", []);
    const b = newPlacement("cat", [a]);
    expect(`${a.x},${a.y}`).not.toBe(`${b.x},${b.y}`);
  });

  it("returns null for unknown items", () => {
    expect(newPlacement("jacuzzi", [])).toBeNull();
  });

  it("spawns fixed items exactly at their home position", () => {
    const g = newPlacement("garland", []);
    expect({ x: g.x, y: g.y }).toEqual({ x: 320, y: 24 });
  });

  it("treats fixed items as singletons — a second add returns null", () => {
    const first = newPlacement("garland", []);
    expect(newPlacement("garland", [first])).toBeNull();
  });
});

describe("validatePlacements", () => {
  it("returns null for anything that isn't a layout", () => {
    expect(validatePlacements(null)).toBeNull();
    expect(validatePlacements("nope")).toBeNull();
    expect(validatePlacements({ 0: {} })).toBeNull();
  });

  it("drops unknown items so a removed catalog entry can't brick a save", () => {
    const out = validatePlacements([
      { id: "a", item: "rug", x: 320, y: 440 },
      { id: "b", item: "discontinued-lava-lamp", x: 1, y: 2 },
    ]);
    expect(out.map((p) => p.item)).toEqual(["rug"]);
  });

  it("drops entries with non-numeric coordinates", () => {
    const out = validatePlacements([
      { id: "a", item: "mug", x: "left", y: 300 },
      { id: "b", item: "mug", x: NaN, y: 300 },
      { id: "c", item: "mug", x: 200, y: 300 },
    ]);
    expect(out.map((p) => p.id)).toEqual(["c"]);
  });

  it("re-clamps out-of-zone saves back onto their surface", () => {
    const [p] = validatePlacements([{ id: "a", item: "mug", x: -999, y: 999 }]);
    expect(inZone("mug", p.x, p.y)).toBe(true);
  });

  it("de-duplicates colliding ids", () => {
    const out = validatePlacements([
      { id: "same", item: "mug", x: 200, y: 300 },
      { id: "same", item: "cat", x: 200, y: 430 },
    ]);
    expect(new Set(out.map((p) => p.id)).size).toBe(2);
  });

  it("collapses duplicate fixed items and heals them onto their home spot", () => {
    // A layout saved by the old build could contain a second garland stuck at
    // an offset it can never be dragged back from. Loading such a save must
    // repair it, not preserve the damage.
    const out = validatePlacements([
      { id: "a", item: "garland", x: 356, y: 36 }, // the stuck duplicate
      { id: "b", item: "garland", x: 320, y: 24 },
      { id: "c", item: "rug", x: 320, y: 440 },
    ]);
    const garlands = out.filter((p) => p.item === "garland");
    expect(garlands).toHaveLength(1);
    expect({ x: garlands[0].x, y: garlands[0].y }).toEqual({ x: 320, y: 24 });
    expect(out.some((p) => p.item === "rug")).toBe(true);
  });

  it("caps runaway layouts at MAX_ITEMS", () => {
    const many = Array.from({ length: MAX_ITEMS + 20 }, (_, i) => ({
      id: `p${i}`,
      item: "mug",
      x: 200,
      y: 300,
    }));
    expect(validatePlacements(many)).toHaveLength(MAX_ITEMS);
  });
});

describe("presets", () => {
  it("only reference items that exist, placed inside their zones", () => {
    for (const [name, preset] of Object.entries(PRESETS)) {
      for (const p of preset.placements) {
        expect(ITEMS[p.item], `${name} references ${p.item}`).toBeTruthy();
        if (!ITEMS[p.item].fixed) {
          expect(inZone(p.item, p.x, p.y), `${name}: ${p.item} at ${p.x},${p.y}`).toBe(true);
        }
      }
    }
  });

  it("default preset reproduces the classic scene's furniture", () => {
    const items = PRESETS.default.placements.map((p) => p.item);
    for (const expected of ["rug", "deskplant", "books", "mug", "desklamp", "clock", "garland"]) {
      expect(items).toContain(expected);
    }
  });

  it("instantiates with unique ids each time", () => {
    const a = presetPlacements("default");
    const b = presetPlacements("default");
    const ids = new Set([...a, ...b].map((p) => p.id));
    expect(ids.size).toBe(a.length + b.length);
  });

  it("falls back to the default preset for unknown keys", () => {
    expect(presetPlacements("penthouse")).toHaveLength(PRESETS.default.placements.length);
  });
});
