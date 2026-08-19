// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ISO_SPRITES } from "./IsoItems";
import { GARMENT_REGISTRY, HAIR_REGISTRY, HAT_REGISTRY } from "./character";
import { SCARF_REGISTRY } from "./character/scarves";
import { ISO_ITEM_KEYS, ISO_ITEMS, ISO_PRESETS, ISO_PRESET_KEYS } from "../lib/isoRoom";
import { COATS, DEFAULT_CHARACTER, HAIR_STYLES, HATS, MODELS, OUTFITS, PANTS, SCARVES, SHOES } from "../lib/profile";

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
      // Turned away: the back of the head replaces the face — it must render
      // AND actually differ (a back view identical to the front would mean
      // the away prop is wired to nothing).
      const front = draw(<Sprite />).container.innerHTML;
      cleanup();
      const back = draw(<Sprite away />).container.innerHTML;
      cleanup();
      expect(back).not.toBe(front);
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

  describe("the character vocabulary and the sprite agree", () => {
    // The profile panel offers whatever profile.js lists; the sprite draws
    // whatever it has branches for. Nothing else ties the two together, and a
    // HAIR_STYLES key with no drawing branch falls through to the default cap
    // SILENTLY — the exact catalog-vs-artwork drift this file exists to catch,
    // one axis over.
    const Resident = ISO_SPRITES.resident;

    it.each(
      MODELS.flatMap((m) => HAIR_STYLES.map((h) => [m.key, h.key]))
    )("%s × %s renders standing and seated without throwing", (model, hair) => {
      const character = { ...DEFAULT_CHARACTER, model, hair };
      expect(() => draw(<Resident character={character} />)).not.toThrow();
      expect(() => draw(<Resident character={character} seated seatH={19} />)).not.toThrow();
    });

    it("the registries and the profile catalog agree, both ways", () => {
      // The registry refactor's whole point: a style is ONE self-contained
      // entry, and this is the structural guard — a picker key with no
      // artwork, or artwork no picker can reach, is now a failing test
      // instead of a silent default cap (hair) or a bare torso (garment).
      expect(Object.keys(HAIR_REGISTRY).sort()).toEqual(
        HAIR_STYLES.map((h) => h.key).sort()
      );
      // The registry backs BOTH wardrobe slots: every top and every real
      // coat ("none" is an absence, not artwork).
      expect(Object.keys(GARMENT_REGISTRY).sort()).toEqual(
        [...OUTFITS.map((o) => o.key), ...COATS.filter((c) => c.key !== "none").map((c) => c.key)].sort()
      );
      expect(Object.keys(HAT_REGISTRY).sort()).toEqual(HATS.map((h) => h.key).sort());
      expect(Object.keys(SCARF_REGISTRY).sort()).toEqual(SCARVES.map((s) => s.key).sort());
    });

    it("every scarf renders, and each draws its own geometry", () => {
      const seen = new Map();
      for (const { key } of SCARVES) {
        const { container } = draw(
          <Resident character={{ ...DEFAULT_CHARACTER, scarf: key }} />
        );
        const html = container.innerHTML;
        expect(
          seen.has(html),
          `"${key}" draws identically to "${seen.get(html)}"`
        ).toBe(false);
        seen.set(html, key);
        cleanup();
      }
    });

    it("every hat renders, and each draws its own geometry", () => {
      const seen = new Map();
      for (const { key } of HATS) {
        const { container } = draw(
          <Resident character={{ ...DEFAULT_CHARACTER, hat: key }} />
        );
        const html = container.innerHTML;
        expect(
          seen.has(html),
          `"${key}" draws identically to "${seen.get(html)}"`
        ).toBe(false);
        seen.set(html, key);
        cleanup();
      }
    });

    it("every hair style draws its own geometry", () => {
      // Rendering without throwing isn't enough: an unhandled key doesn't
      // throw, it just draws the default. Distinct markup per style is what
      // proves each key actually has a branch.
      const seen = new Map();
      for (const { key } of HAIR_STYLES) {
        const { container } = draw(
          <Resident character={{ ...DEFAULT_CHARACTER, hair: key }} />
        );
        const html = container.innerHTML;
        expect(
          seen.has(html),
          `"${key}" draws identically to "${seen.get(html)}" — missing its branch?`
        ).toBe(false);
        seen.set(html, key);
        cleanup();
      }
    });

    it("the two models cut different silhouettes", () => {
      const htmlFor = (model) => {
        const { container } = draw(
          <Resident character={{ ...DEFAULT_CHARACTER, model }} />
        );
        const html = container.innerHTML;
        cleanup();
        return html;
      };
      expect(htmlFor("masc")).not.toBe(htmlFor("fem"));
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

describe("the profile view and the wardrobe slots", () => {
  afterEach(cleanup);
  const Resident = ISO_SPRITES.resident;
  // Render a set of variants and insist every one draws its OWN geometry —
  // the same distinct-markup guard the hats and hair fronts already live
  // under. A key whose drawing collapses into another's is catalogue padding.
  const allDistinct = (labelOf, nodes) => {
    const seen = new Map();
    for (const [key, node] of nodes) {
      const { container } = draw(node);
      const html = container.innerHTML;
      expect(
        seen.has(html),
        `${labelOf} "${key}" draws identically to "${seen.get(html)}"`
      ).toBe(false);
      seen.set(html, key);
      cleanup();
    }
  };

  it("front, profile and back are three different drawings", () => {
    allDistinct(
      "facing",
      ["front", "side", "back"].map((facing) => [
        facing,
        <Resident key={facing} character={DEFAULT_CHARACTER} facing={facing} />,
      ])
    );
  });

  it("every hair style draws its own PROFILE, on both models", () => {
    for (const model of MODELS.map((m) => m.key)) {
      allDistinct(
        `${model} profile hair`,
        HAIR_STYLES.map(({ key }) => [
          key,
          <Resident
            key={key}
            character={{ ...DEFAULT_CHARACTER, model, hair: key }}
            facing="side"
          />,
        ])
      );
    }
  });

  it("every bottom draws its own legs, front and profile", () => {
    for (const facing of ["front", "side"]) {
      allDistinct(
        `${facing} bottoms`,
        PANTS.map(({ key }) => [
          key,
          <Resident
            key={key}
            character={{ ...DEFAULT_CHARACTER, pants: key }}
            facing={facing}
          />,
        ])
      );
    }
  });

  it("every coat layers its own artwork over the same top", () => {
    allDistinct(
      "coat",
      COATS.map(({ key }) => [
        key,
        <Resident
          key={key}
          character={{ ...DEFAULT_CHARACTER, garment: "tee", coat: key }}
        />,
      ])
    );
  });

  it("the seated pose survives every bottom", () => {
    for (const { key } of PANTS) {
      expect(() =>
        draw(
          <Resident
            character={{ ...DEFAULT_CHARACTER, pants: key }}
            seated
            seatH={19}
          />
        )
      ).not.toThrow();
      cleanup();
    }
  });

  it("every shoe draws its own feet, front and profile", () => {
    for (const facing of ["front", "side"]) {
      allDistinct(
        `${facing} shoes`,
        SHOES.map(({ key }) => [
          key,
          <Resident
            key={key}
            character={{ ...DEFAULT_CHARACTER, shoes: key }}
            facing={facing}
          />,
        ])
      );
    }
  });

  it("the cat and the dog have real front and back views", () => {
    for (const pet of ["cat", "dog"]) {
      const Sprite = ISO_SPRITES[pet];
      allDistinct(
        pet,
        ["side", "front", "back"].map((facing) => [
          facing,
          <Sprite key={facing} awake facing={facing} />,
        ])
      );
    }
  });

  it("the cat and the dog have a real held pose (pets are carryable)", () => {
    for (const pet of ["cat", "dog"]) {
      const Sprite = ISO_SPRITES[pet];
      const held = draw(<Sprite held />).container.innerHTML;
      const front = draw(<Sprite awake facing="front" />).container.innerHTML;
      // Its own drawing, not the front pose with a class on it.
      expect(held).not.toBe(front);
      expect(held).toContain("held-dangle");
    }
  });
});
