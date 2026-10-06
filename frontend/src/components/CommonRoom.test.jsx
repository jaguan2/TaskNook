// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CommonRoom from "./CommonRoom";
import { COMMON_PLACES, createCommonSession, resolveCommonProps, settleCommonGuest } from "../lib/commonRooms";
import { floorPatch, project } from "../lib/iso";
import { footOf } from "../lib/isoRoom";
import { DEFAULT_CHARACTER } from "../lib/profile";

afterEach(cleanup);

// jsdom does not paint SVG, but its transform/clip coordinate spaces are still
// inspectable. Resolve translations through the actual rendered ancestors,
// so a defined clip that moves away from its material fails this regression.
const points = (value) => value.trim().split(/\s+/).map((p) => p.split(",").map(Number));
const scenePoints = (node, coordinates) => {
  let dx = 0, dy = 0;
  for (let parent = node; parent && parent.tagName.toLowerCase() !== "svg"; parent = parent.parentElement) {
    for (const match of (parent.getAttribute("transform") || "").matchAll(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/g)) {
      dx += Number(match[1]); dy += Number(match[2]);
    }
  }
  return coordinates.map(([x, y]) => [x + dx, y + dy].map((n) => Math.round(n * 1e6) / 1e6));
};
const resolvedClip = (container, group) => {
  const id = group.getAttribute("clip-path").match(/url\(#(.*)\)/)[1];
  const definition = [...container.querySelectorAll("clipPath")].find((clip) => clip.id === id);
  return scenePoints(group, points(definition.querySelector("polygon").getAttribute("points")));
};

describe("common-room seats", () => {
  it("clips the translated stone material to the actual Willow terrace", () => {
    const { container } = render(<CommonRoom session={createCommonSession("willow-pond")} character={DEFAULT_CHARACTER} />);
    const definition = [...container.querySelectorAll("clipPath")].find((clip) => clip.id.endsWith("-patio"));
    const material = container.querySelector(`g[clip-path="url(#${definition.id})"]`);
    const floor = material.parentElement.querySelector(":scope > polygon");
    expect(resolvedClip(container, material)).toEqual(scenePoints(floor, points(floor.getAttribute("points"))));
  });
  it.each([["common-cottage", "nook-sconce", "nook"], ["willow-pond", "patio-lightjar", "patio"]])(
    "clips %s raised lights at their supporting floor height", (sceneId, lightId, level) => {
      const { container } = render(<CommonRoom session={createCommonSession(sceneId)} character={DEFAULT_CHARACTER} timeOfDay="night" />);
      const pool = container.querySelector(`[data-common-light="${lightId}"]`);
      const clip = pool.closest("g[clip-path]");
      const s = COMMON_PLACES[sceneId].surfaces[level];
      const expected = points(floorPatch(s.gx, s.gy, s.dx, s.dy)).map(([x, y]) => [x, y - s.z].map((n) => Math.round(n * 1e6) / 1e6));
      expect(resolvedClip(container, clip)).toEqual(expected);
      // Moving the clip must not accidentally apply the lift twice to a pool.
      const prop = resolveCommonProps(COMMON_PLACES[sceneId]).find((p) => p.id === lightId);
      const [w, d] = footOf(prop.item, prop.rot);
      const at = project(prop.gx + w / 2, prop.gy + d / 2);
      const ellipse = pool.querySelector("ellipse");
      const centre = scenePoints(ellipse, [[Number(ellipse.getAttribute("cx")), Number(ellipse.getAttribute("cy"))]])[0];
      expect(centre[0]).toBeCloseTo(at.x, 5);
      expect(centre[1]).toBeCloseTo(at.y - s.z, 5);
    }
  );
  it("returns keyboard focus to the seat chooser after settling", () => {
    render(<CommonRoom session={createCommonSession("common-cottage")} character={DEFAULT_CHARACTER} onChooseSeat={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Change seat/ }));
    const seat = screen.getByRole("button", { name: "Reading armchair" });
    seat.focus();
    fireEvent.click(seat);
    expect(document.activeElement === screen.getByRole("button", { name: /Change seat/ })).toBe(true);
  });
  it("defines every SVG paint and clip used by both authored scenes", () => {
    for (const sceneId of ["common-cottage", "willow-pond"]) {
      const { container } = render(<CommonRoom session={createCommonSession(sceneId)} character={DEFAULT_CHARACTER} />);
      const refs = new Set();
      for (const element of container.querySelectorAll("*")) {
        for (const attribute of element.attributes) {
          for (const match of attribute.value.matchAll(/url\(#([^)]*)\)/g)) refs.add(match[1]);
        }
      }
      expect(refs.has("isoScreen")).toBe(true);
      for (const id of refs) expect(document.getElementById(id), `${sceneId}/${id}`).not.toBeNull();
      cleanup();
    }
  });
  it("offers open seats by button and refuses occupied seats", () => {
    const onChooseSeat = vi.fn();
    render(<CommonRoom session={createCommonSession("common-cottage")} character={DEFAULT_CHARACTER} onChooseSeat={onChooseSeat} />);
    expect(document.querySelectorAll("[data-common-person]")).toHaveLength(4);
    expect(screen.queryByRole("group", { name: "Common room seats" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Change seat/ }));
    expect(screen.getByRole("button", { name: "Window armchair · Kai" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Reading armchair" }));
    expect(onChooseSeat).toHaveBeenCalledWith("window-right");
    expect(onChooseSeat).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("group", { name: "Common room seats" })).toBeNull();
  });
  it("casts catalog light and dresses the open partition without adding interactions", () => {
    const { container } = render(<CommonRoom session={createCommonSession("common-cottage")}
      character={DEFAULT_CHARACTER} timeOfDay="sunset" />);
    expect(container.querySelectorAll("[data-common-light]").length).toBeGreaterThanOrEqual(8);
    expect(container.querySelectorAll('[data-partition-bulb="true"]')).toHaveLength(8);
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(0);
  });
  it("updates the user's floor and outfit without moving the neighbours", () => {
    const session = createCommonSession("common-cottage");
    const { rerender, container } = render(<CommonRoom session={session} character={DEFAULT_CHARACTER} />);
    const neighbours = [...container.querySelectorAll('[data-common-person]:not([data-common-person="you"])')].map((p) => p.getAttribute("transform"));
    rerender(<CommonRoom session={settleCommonGuest(session, "window-right")} character={{ ...DEFAULT_CHARACTER, garment: "blouse" }} />);
    expect(container.querySelector('[data-common-person="you"]').getAttribute("data-seat")).toBe("window-right");
    expect([...container.querySelectorAll('[data-common-person]:not([data-common-person="you"])')].map((p) => p.getAttribute("transform"))).toEqual(neighbours);
    expect(container.querySelectorAll(".room-item")).toHaveLength(0);
  });

  it("renders Willow Pond's lawn, terrace, path and lantern-lit seating", () => {
    const onChooseSeat = vi.fn();
    const { container } = render(<CommonRoom session={createCommonSession("willow-pond")}
      character={DEFAULT_CHARACTER} timeOfDay="night" onChooseSeat={onChooseSeat} />);
    expect(screen.getByRole("img", { name: /Willow Pond/ })).toBeTruthy();
    expect(container.querySelector('[data-garden-architecture="willow-pond"]')).toBeTruthy();
    expect(container.querySelector('[data-garden-path="stepping-stones"]')).toBeTruthy();
    expect(container.querySelector('[data-garden-details="meadow"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-garden-bulb="true"]')).toHaveLength(9);
    expect(container.querySelectorAll('[data-common-light]')).toHaveLength(5);
    expect(container.querySelector('[data-common-prop="pond"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-partition-bulb="true"]')).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Change seat/ }));
    fireEvent.click(screen.getByRole("button", { name: "Willow bench right" }));
    expect(onChooseSeat).toHaveBeenCalledWith("pond-bench-right");
  });
});
