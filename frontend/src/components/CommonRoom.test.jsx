// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CommonRoom from "./CommonRoom";
import { createCommonSession, settleCommonGuest } from "../lib/commonRooms";
import { DEFAULT_CHARACTER } from "../lib/profile";

afterEach(cleanup);
describe("common-room seats", () => {
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
