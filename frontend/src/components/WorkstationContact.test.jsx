// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import IsoRoom from "./IsoRoom";
import { IsoPresetPreview } from "./IsoRoomPreviews";
import { ISO_PRESETS } from "../lib/isoRoom";

afterEach(cleanup);
const desk = { id: "desk", item: "desk", gx: 0, gy: 1.5, rot: 1 };
const computer = { id: "computer", item: "computer", gx: 0, gy: 2, rot: 1 };
const chair = { id: "chair", item: "deskchair", gx: 1, gy: 2.5, rot: 3 };
const person = { id: "person", item: "you", gx: 1, gy: 2.5 };
const placements = [desk, computer, chair, person];
const scene = (rows = placements, activity = "focus") => <IsoRoom
  size={{ w: 6, d: 6 }} placements={rows} activity={activity} saveView={false} reduceMotion />;

it("uses a bent keyboard pose only at a reachable workstation, preserving break and floor poses", () => {
  const { container, rerender } = render(scene());
  const arms = () => container.querySelectorAll('[data-item="you"] [data-arm-pose="keyboard"]');
  expect(arms()).toHaveLength(2);
  expect(container.querySelector('[data-item="you"] .resident-type').style.getPropertyValue("--type-lift"))
    .toBe("0.45px");
  rerender(scene(placements, "break"));
  expect(arms()).toHaveLength(0);
  expect(container.querySelector('[data-item="you"] .break-stretch')).toBeTruthy();
  rerender(scene([person]));
  expect(arms()).toHaveLength(0);
  expect(container.querySelector('[data-item="you"] .resident-type')).toBeNull();
});

it("inherits the chair's mirror even when the saved person has another rotation", () => {
  const { container } = render(scene([...placements.slice(0, 3), { ...person, rot: 0 }]));
  const arm = container.querySelector('[data-item="you"] [data-arm-pose="keyboard"]');
  expect(arm.closest('[transform="scale(-1,1)"]')).toBeTruthy();
});

it("removes the integrated laptop only while real equipment rests on that desk", () => {
  const { container, rerender } = render(scene());
  const integrated = () => container.querySelectorAll('[data-item="desk"] [data-desk-part="integrated-laptop"]');
  expect(integrated()).toHaveLength(0);
  rerender(scene([desk, { ...computer, gx: 4 }, chair, person]));
  expect(integrated()).toHaveLength(1);
});

it("uses the same equipment ownership in the Loft preset thumbnail", () => {
  const { container } = render(<IsoPresetPreview preset={ISO_PRESETS.loft} />);
  expect(container.querySelectorAll('[data-desk-part="integrated-laptop"]')).toHaveLength(0);
});

it("keeps a sitter in front of a broad desk, with their backrest in front of them", () => {
  const rows = [
    { id: "desk", item: "desk", gx: 2, gy: 2 },
    { id: "chair", item: "deskchair", gx: 2.5, gy: 3, rot: 2 },
    { id: "person", item: "you", gx: 2.5, gy: 3 },
  ];
  const { container, rerender } = render(scene(rows));
  const order = [...container.querySelectorAll('[data-placement-id]')].map((el) => el.dataset.placementId);
  expect(order).toEqual(["desk", "person", "chair"]);
  expect(container.querySelectorAll('[data-item="you"] [data-arm-pose="keyboard"]')).toHaveLength(2);
  rerender(scene(rows.slice(0, 2)));
  expect([...container.querySelectorAll('[data-placement-id]')].map((el) => el.dataset.placementId))
    .toEqual(["desk", "chair"]);
});
