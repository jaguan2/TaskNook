// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ISO_SPRITES } from "./IsoItems";
import { ISO_ITEM_KEYS, ISO_ITEMS, ISO_PRESETS, ISO_PRESET_KEYS } from "../lib/isoRoom";

afterEach(cleanup);

const draw = (node) => render(<svg>{node}</svg>);

describe("the isometric catalog and its artwork agree", () => {
  it("every catalog entry has a sprite", () => {
    const missing = ISO_ITEM_KEYS.filter((key) => !ISO_SPRITES[key]);
    expect(missing).toEqual([]);
  });

  it("every sprite has a catalog entry", () => {
    // A sprite with no entry can never be placed — it's dead weight in the
    // bundle, and for the Kenney items it drags PNGs along with it.
    const orphans = Object.keys(ISO_SPRITES).filter((key) => !ISO_ITEMS[key]);
    expect(orphans).toEqual([]);
  });

  it.each(ISO_ITEM_KEYS)("%s renders in both orientations without throwing", (key) => {
    // The scene has no per-sprite error handling — one throw in here used to
    // take the entire app down (there's a boundary now, but a blank room is
    // still a bug). Cheap to assert, and it covers the whole catalog.
    const Sprite = ISO_SPRITES[key];
    expect(() => draw(<Sprite rot={0} />)).not.toThrow();
    expect(() => draw(<Sprite rot={1} />)).not.toThrow();
  });

  it.each(ISO_ITEM_KEYS.filter((k) => ISO_ITEMS[k].variants))(
    "%s renders each of its colourways",
    (key) => {
      const Sprite = ISO_SPRITES[key];
      for (const variant of Object.values(ISO_ITEMS[key].variants)) {
        expect(() => draw(<Sprite rot={0} variant={variant} />)).not.toThrow();
      }
    }
  );

  it("personas render seated, standing and walking", () => {
    const people = ISO_ITEM_KEYS.filter((k) => ISO_ITEMS[k].persona);
    expect(people.length).toBeGreaterThan(0);
    for (const key of people) {
      const Sprite = ISO_SPRITES[key];
      expect(() => draw(<Sprite seated />)).not.toThrow();
      expect(() => draw(<Sprite seated working />)).not.toThrow();
      expect(() => draw(<Sprite moving />)).not.toThrow();
    }
  });

  it("roamers render awake and asleep", () => {
    for (const key of ISO_ITEM_KEYS.filter((k) => ISO_ITEMS[k].roamer)) {
      const Sprite = ISO_SPRITES[key];
      expect(() => draw(<Sprite awake />)).not.toThrow();
      expect(() => draw(<Sprite awake={false} />)).not.toThrow();
    }
  });

  it("every preset only places items that exist", () => {
    for (const key of ISO_PRESET_KEYS) {
      for (const p of ISO_PRESETS[key].items) {
        expect(ISO_ITEMS[p.item], `${key} places unknown item "${p.item}"`).toBeTruthy();
        expect(ISO_SPRITES[p.item], `${key} places unrendered item "${p.item}"`).toBeTruthy();
      }
    }
  });

  it("every preset tint an item declares is one of its real colourways", () => {
    // A tint hex that isn't in `variants` silently falls back to the default
    // render — the preset would look nothing like it was written to.
    for (const key of ISO_PRESET_KEYS) {
      for (const p of ISO_PRESETS[key].items) {
        const variants = ISO_ITEMS[p.item].variants;
        if (!variants || !p.tint) continue;
        expect(
          Object.keys(variants),
          `${key}: ${p.item} asks for ${p.tint}`
        ).toContain(p.tint);
      }
    }
  });
});
