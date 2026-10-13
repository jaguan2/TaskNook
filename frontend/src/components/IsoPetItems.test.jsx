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
    expect(awake).toContain("resident-type");
    expect(resting).toContain("cat-breathe");
  });
});
