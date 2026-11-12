// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ISO_SPRITES } from "./IsoItems";
import { Bed, BedTuckCover } from "./IsoSeatingItems";
import { ISO_ITEMS } from "../lib/isoRoom";
import { project } from "../lib/iso";

afterEach(cleanup);

// Measure the drawn cushion, rather than merely asserting another seat-height
// constant. These pieces must still meet the room's existing seated hips.
function renderedTopY(pad) {
  return renderedTopPoint(pad).y;
}

function renderedTopPoint(pad) {
  const top = pad.firstElementChild.children[4];
  const [, x, y] = top.getAttribute("d").match(/^M([^,]+),([^ ]+)/);
  let screenY = Number(y);
  for (let node = top.parentElement; node?.tagName.toLowerCase() !== "svg"; node = node.parentElement) {
    const transform = node.getAttribute("transform");
    if (transform) screenY += Number(transform.match(/^translate\(0,\s*([^)]+)\)$/)[1]);
  }
  return { x: Number(x), y: screenY };
}

describe("furniture contact geometry", () => {
  it.each([
    ["chair", false, 0.16, 0.04],
    ["chair", true, 0.16, 0.04],
    ["deskchair", false, 0.28, 0.12],
    ["deskchair", true, 0.28, 0.12],
    ["armchair", false, 0.37, 0.27],
    ["armchair", true, 0.37, 0.05],
    ["sofa", false, 0.37, 0.27],
    ["sofa", true, 0.37, 0.05],
  ])("keeps %s (back=%s) cushion at the room's catalog seat", (key, back, gx, gy) => {
    const Sprite = ISO_SPRITES[key];
    const { container } = render(<svg><Sprite back={back} /></svg>);
    const pad = container.querySelector('[data-furniture-part="seat-pad"]');
    expect(project(gx, gy).y - renderedTopY(pad)).toBeCloseTo(ISO_ITEMS[key].seat, 8);
  });

  it.each(["armchair", "sofa"])("keeps the %s far arm below the projected rear crown", (key) => {
    const Sprite = ISO_SPRITES[key];
    const { container } = render(<svg><Sprite back /></svg>);
    const back = renderedTopPoint(container.querySelector('[data-furniture-part="backrest"]'));
    const arm = renderedTopPoint(container.querySelector('[data-furniture-part="arm"]'));
    // Both top edges run along a .5-slope plane. Compare their intercepts
    // at the same screen x, where the old low back exposed upright tabs.
    expect((arm.y - arm.x * 0.5) - (back.y - back.x * 0.5)).toBeGreaterThan(0.5);
  });

  it("keeps the thin duvet above the sleeping plane", () => {
    const { container } = render(<svg><Bed /></svg>);
    const top = renderedTopPoint(container.querySelector('[data-furniture-part="duvet-top"]'));
    expect(project(0.18, 1.15).y - top.y).toBeCloseTo(ISO_ITEMS.bed.seat + 1, 8);
  });

  it("repaints exactly the occupied bed's duvet without covering its pillows", () => {
    const { container, rerender } = render(<svg><Bed /></svg>);
    const duvet = container.querySelector('[data-furniture-part="duvet"]').outerHTML;
    const bedLift = container.querySelector('[data-furniture-part="duvet"]').parentElement.getAttribute("transform");
    rerender(<svg><BedTuckCover /></svg>);
    expect(container.querySelector('[data-furniture-part="duvet"]').outerHTML).toBe(duvet);
    expect(container.querySelector("[data-bed-tuck-cover]").getAttribute("transform")).toBe(bedLift);
    expect(container.querySelector('[data-furniture-part="pillows"]')).toBeNull();
  });
});
