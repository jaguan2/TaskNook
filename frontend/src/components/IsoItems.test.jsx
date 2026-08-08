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

  it.each(ISO_ITEM_KEYS)("%s renders in every facing without throwing", (key) => {
    // The scene has no per-sprite error handling — one throw in here used to
    // take the entire app down (there's a boundary now, but a blank room is
    // still a bug). Cheap to assert, and it covers the whole catalog.
    const Sprite = ISO_SPRITES[key];
    expect(() => draw(<Sprite rot={0} />)).not.toThrow();
    expect(() => draw(<Sprite rot={1} />)).not.toThrow();
    // The away-facing pair is a different drawing, not a transform — every
    // sprite has to tolerate the prop even if it ignores it.
    expect(() => draw(<Sprite rot={0} back />)).not.toThrow();
    expect(() => draw(<Sprite rot={1} back />)).not.toThrow();
  });

  it("renders every colourway of every item that has them", () => {
    // Not it.each: the fabric pieces went back to free tinting when they
    // returned to SVG, so this list is legitimately empty now — and an empty
    // it.each is a vitest error, not a pass.
    for (const key of ISO_ITEM_KEYS.filter((k) => ISO_ITEMS[k].variants)) {
      const Sprite = ISO_SPRITES[key];
      for (const variant of Object.values(ISO_ITEMS[key].variants)) {
        expect(() => draw(<Sprite rot={0} variant={variant} />)).not.toThrow();
      }
    }
  });

  it("tintable items actually respond to --tint", () => {
    // The point of coming back to SVG for upholstery: a picked colour has to
    // reach the fabric. A sprite that paints only literal fills would pass
    // every other test here and silently ignore the picker.
    for (const key of ["bed", "sofa", "armchair", "cushion"]) {
      expect(ISO_ITEMS[key].tintable, `${key} is marked untintable`).not.toBe(false);
      const Sprite = ISO_SPRITES[key];
      const { container } = draw(<Sprite />);
      expect(container.innerHTML, `${key} never references var(--tint)`).toContain("--tint");
      cleanup();
    }
  });

  it("personas render seated, standing and walking", () => {
    const people = ISO_ITEM_KEYS.filter((k) => ISO_ITEMS[k].persona);
    expect(people.length).toBeGreaterThan(0);
    for (const key of people) {
      const Sprite = ISO_SPRITES[key];
      expect(() => draw(<Sprite seated />)).not.toThrow();
      expect(() => draw(<Sprite seated activity="focus" />)).not.toThrow();
      expect(() => draw(<Sprite moving />)).not.toThrow();
    }
  });

  describe("a seated persona actually sits", () => {
    const Resident = ISO_SPRITES.resident;

    /** Every straight-line stroke in the sprite, as {x1,y1,x2,y2}. */
    const limbs = (node) => {
      const { container } = draw(node);
      return [...container.querySelectorAll("path[stroke-linecap='round']")]
        .map((p) => /^M(-?[\d.]+) (-?[\d.]+) L(-?[\d.]+) (-?[\d.]+)$/.exec(p.getAttribute("d")))
        .filter(Boolean)
        .map(([, x1, y1, x2, y2]) => ({ x1: +x1, y1: +y1, x2: +x2, y2: +y2 }));
    };

    it("bends at the knee instead of just shortening the leg", () => {
      // The whole complaint: two stacked vertical boxes is a standing figure
      // with stubby legs. A sitting one needs a segment that travels
      // FORWARD (dx != 0) before the shin drops.
      const thighs = limbs(<Resident seated seatH={19} />).filter((l) => l.x1 !== l.x2);
      expect(thighs.length, "no forward-travelling thigh — the pose is straight-legged").toBe(2);
      for (const t of thighs) expect(t.y2).toBeGreaterThan(t.y1); // forward AND down
    });

    it("puts the feet on the floor, whatever it's sitting on", () => {
      // The sprite is lifted by the seat's height, so the floor is at +seatH
      // in its own coordinates. Feet that ignore it dangle at cushion level.
      for (const seatH of [13, 19, 22]) {
        const shins = limbs(<Resident seated seatH={seatH} />).filter((l) => l.x1 === l.x2);
        expect(shins.length).toBe(2);
        for (const s of shins) expect(s.y2).toBeCloseTo(seatH - 2, 5);
        cleanup();
      }
    });

    it("keeps a real shin on a low cushion rather than a stub", () => {
      const shins = limbs(<Resident seated seatH={4} />).filter((l) => l.x1 === l.x2);
      for (const s of shins) expect(s.y2 - s.y1).toBeGreaterThan(5);
    });

    it("stands with straight legs — the bend belongs to sitting only", () => {
      expect(limbs(<Resident />)).toHaveLength(0);
    });
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
