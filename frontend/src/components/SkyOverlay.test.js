import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DAY_LIFT, SUNSET_BAND } from "./SkyOverlay";

// The to-do list is drawn STRAIGHT onto the backdrop with no card behind it,
// in cream. Every point of daylight lift is a point of contrast spent, so the
// ceiling on how bright day can get is a legibility number, not a taste one.
const CREAM = [247, 233, 226];
const DAY_WASH = [142, 201, 234];
const SUNSET_WASH = [255, 138, 80];

const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const composite = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

/** Every theme's darkest stop, read out of the stylesheet rather than copied —
 *  a new colour scheme has to pass this too, and a hardcoded list wouldn't
 *  know about it. */
function themeVoids() {
  const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
  const found = [...css.matchAll(/--color-void:\s*(\d+)\s+(\d+)\s+(\d+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
  ]);
  if (!found.length) throw new Error("no --color-void found in index.css");
  return found;
}

describe("daylight never costs the to-do list its legibility", () => {
  const voids = themeVoids();

  it("reads several themes out of the stylesheet", () => {
    expect(voids.length).toBeGreaterThanOrEqual(4);
  });

  it.each([
    ["day", DAY_LIFT, DAY_WASH],
    ["sunset", SUNSET_BAND, SUNSET_WASH],
  ])("%s keeps cream above WCAG AA on every theme", (_name, alpha, wash) => {
    for (const bg of voids) {
      const ratio = contrast(CREAM, composite(wash, alpha, bg));
      expect(ratio, `void ${bg.join(",")} at alpha ${alpha}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("is actually a visible lift, not a token one", () => {
    // The old value was 0.14 — safe, and indistinguishable from night, which
    // is the bug this replaced. Guard the floor as well as the ceiling.
    expect(DAY_LIFT).toBeGreaterThan(0.25);
    expect(SUNSET_BAND).toBeGreaterThan(0.25);
  });
});
