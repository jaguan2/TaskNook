// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Bunny, Cat, Dog } from "./IsoPetItems";

afterEach(cleanup);

const draw = (node) => render(<svg>{node}</svg>);

const artwork = (node) => draw(node).container.innerHTML
  .replace(/:r[0-9a-z]+:/g, ":instance:")
  .replace(/ data-[\w-]+="[^"]*"/g, "");

function allDistinct(label, variants) {
  const drawings = variants.map(([key, node]) => [key, artwork(node)]);
  for (let left = 0; left < drawings.length; left += 1) {
    for (let right = left + 1; right < drawings.length; right += 1) {
      expect(drawings[left][1], `${label}: ${drawings[left][0]} should differ from ${drawings[right][0]}`).not.toBe(drawings[right][1]);
    }
  }
}

describe("isometric pet artwork", () => {
  it.each([
    ["cat", Cat],
    ["dog", Dog],
    ["bunny", Bunny],
  ])("%s has distinct side, front, and back views", (name, Pet) => {
    allDistinct(
      name,
      ["side", "front", "back"].map((facing) => [
        facing,
        <Pet key={facing} awake facing={facing} />,
      ]),
    );
  });

  it.each([
    ["cat", Cat],
    ["dog", Dog],
    ["bunny", Bunny],
  ])("%s has a dedicated carried pose", (_name, Pet) => {
    const held = artwork(<Pet held />);
    const front = artwork(<Pet awake facing="front" />);

    expect(held).not.toBe(front);
    expect(held).toContain("held-dangle");
  });

  it("gives the bunny distinct resting and awake silhouettes", () => {
    const resting = artwork(<Bunny />);
    const awake = artwork(<Bunny awake moving />);

    expect(awake).not.toBe(resting);
    expect(awake).toContain("pet-step-bob");
    expect(resting).toContain("cat-breathe");
  });

  it.each([["cat", Cat], ["dog", Dog], ["rabbit", Bunny]])("%s has one profile eye, two front eyes and no rear face", (_name, Pet) => {
    for (const [facing, eyes] of [["side", 1], ["front", 2], ["back", 0]]) {
      const { container } = draw(<Pet awake facing={facing} />);
      expect(container.querySelectorAll('[data-pet-eyes="open"] ellipse')).toHaveLength(eyes);
      cleanup();
    }
  });

  it.each([["cat", Cat], ["dog", Dog], ["rabbit", Bunny]])("%s changes body form without stretching its face or moving its paws with the torso bob", (_name, Pet) => {
    const heads = [];
    for (const petForm of ["natural", "slender", "round"]) {
      const { container } = draw(<Pet pet={{ petForm }} awake moving facing="front" />);
      heads.push(container.querySelector('[data-pet-head]').outerHTML.replace(/:r[0-9a-z]+:/g, ":instance:"));
      expect(container.querySelectorAll('.pet-step-bob [data-pet-paw]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-pet-paw]')).toHaveLength(2);
      cleanup();
    }
    expect(new Set(heads).size).toBe(1);
  });

  it("keeps a corgi's short legs and lower head when it turns", () => {
    for (const facing of ["front", "side", "back"]) {
      const { container } = draw(<Dog awake facing={facing} look="corgi" />);
      const shortHead = container.querySelector('[data-pet-head]').getAttribute('transform');
      const shortLeg = container.querySelector('[data-pet-paw] path').getAttribute('d');
      cleanup();
      const golden = draw(<Dog awake facing={facing} />).container;
      expect(golden.querySelector('[data-pet-head]').getAttribute('transform')).not.toBe(shortHead);
      expect(golden.querySelector('[data-pet-paw] path').getAttribute('d')).not.toBe(shortLeg);
      cleanup();
    }
  });

  it.each([["cat", Cat], ["dog", Dog]])("%s sways its walking tail and keeps the rare flick for resting", (_name, Pet) => {
    for (const facing of ["side", "front", "back"]) {
      const { container } = draw(<Pet awake moving facing={facing} />);
      expect(container.querySelector('.tail-sway')).toBeTruthy();
      expect(container.querySelector('.tail-flick')).toBeNull();
      cleanup();
    }
    const { container } = draw(<Pet />);
    expect(container.querySelector('.tail-flick')).toBeTruthy();
    expect(container.querySelector('.tail-sway')).toBeNull();
  });
});
