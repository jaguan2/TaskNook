// @vitest-environment jsdom
// The scene's one render smoke test: a visited room with personas and name
// tags. Nothing else renders IsoRoom in tests, so before this existed a
// throw in the personas/label layer would have shipped uncaught — the scene
// ErrorBoundary's fallback would be the first anyone heard of it.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import IsoRoom from "./IsoRoom";
import { WALL_H } from "../lib/iso";
import { resolveVisitRoom } from "../lib/visiting";
import { validateCharacter } from "../lib/profile";

afterEach(cleanup);

// The grab cursor IS the walk-order affordance, and it's the only part of a
// walk order a render test can see (jsdom has no getScreenCTM, so the drag
// itself is verified in a real browser).
const grabCursors = (container) =>
  [...container.querySelectorAll("g")].filter((g) => g.style && g.style.cursor === "grab");

describe("IsoRoom while visiting", () => {
  it("renders a visited room with both name tags and no self bubble", () => {
    const { layout, personas } = resolveVisitRoom(
      { id: 1, username: "luna", displayName: "Luna", room: null, character: null },
      { character: validateCharacter(null), name: "You" }
    );
    const { container } = render(
      <IsoRoom
        size={layout}
        placements={layout.placements}
        editMode={false}
        personas={personas}
        saveView={false}
      />
    );
    const texts = [...container.querySelectorAll("text")].map((t) => t.textContent);
    expect(texts).toContain("Luna");
    expect(texts).toContain("You");
  });

  it("renders the home shape without tags when personas is null", () => {
    const { layout } = resolveVisitRoom(
      { id: 2, username: "kai", displayName: "Kai", room: null, character: null },
      null
    );
    const { container } = render(
      <IsoRoom size={layout} placements={layout.placements} saveView={false} />
    );
    expect([...container.querySelectorAll("text")].map((t) => t.textContent)).not.toContain(
      "Kai"
    );
  });

  it("arms exactly your own placement for walk orders", () => {

    // The grab cursor is the walk-order affordance; the owner (and every
    // piece of furniture) must not offer it.
    const { layout, personas, guestId } = resolveVisitRoom(
      { id: 3, username: "sora", displayName: "Sora", room: null, character: null },
      { character: validateCharacter(null), name: "You" }
    );
    expect(guestId).toBeTruthy();
    const { container } = render(
      <IsoRoom
        size={layout}
        placements={layout.placements}
        editMode={false}
        personas={personas}
        saveView={false}
        walkId={guestId}
        onWalkTo={() => {}}
      />
    );
    expect(grabCursors(container).length).toBe(1);
  });
});

describe("powered room decorations", () => {
  const SIZE = { w: 6, d: 6 };
  const LIGHTS = [{ id: "fairy", item: "fairylights", gx: 0, gy: 2 }];

  it("toggles fairy lights directly outside Decorate mode", () => {
    const onToggleItem = vi.fn();
    const { container } = render(
      <IsoRoom size={SIZE} placements={LIGHTS} saveView={false} onToggleItem={onToggleItem} />
    );

    const lights = container.querySelector('[data-placement-id="fairy"]');
    expect(lights.style.cursor).toBe("pointer");
    fireEvent.pointerDown(lights);
    expect(onToggleItem).toHaveBeenCalledWith("fairy");
  });

  it("removes the room light pool while switched off", () => {
    const props = { size: SIZE, saveView: false, timeOfDay: "night" };
    const { container, rerender } = render(<IsoRoom {...props} placements={LIGHTS} />);
    expect(container.querySelector('[data-item-glow="fairy"]')).toBeTruthy();

    rerender(<IsoRoom {...props} placements={[{ ...LIGHTS[0], off: true }]} />);
    expect(container.querySelector('[data-item-glow="fairy"]')).toBeNull();
  });

  it("offers a power button on the selected decoration in Decorate mode", () => {
    const onToggleItem = vi.fn();
    const { container } = render(
      <IsoRoom
        size={SIZE}
        placements={LIGHTS}
        editMode
        saveView={false}
        onToggleItem={onToggleItem}
      />
    );

    container.querySelector("svg").getScreenCTM = () => null;
    fireEvent.pointerDown(container.querySelector('[data-placement-id="fairy"]'));
    const power = container.querySelector('[data-power-toggle="fairy"]');
    expect(power).toBeTruthy();
    fireEvent.pointerDown(power);
    expect(onToggleItem).toHaveBeenCalledWith("fairy");
  });
});

describe("camera panning", () => {
  it("composites one translated layer during the gesture and commits viewBox on release", () => {
    const { container } = render(
      <IsoRoom size={{ w: 9, d: 7 }} placements={[]} saveView={false} />
    );
    const svg = container.querySelector("svg");
    const layer = container.querySelector('[data-pan-layer="true"]');
    svg.getBoundingClientRect = () => ({ width: 1000, height: 500 });
    svg.setPointerCapture = vi.fn();
    const before = svg.getAttribute("viewBox");

    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 200, clientY: 150 });
    expect(svg.getAttribute("viewBox")).toBe(before);
    expect(layer.getAttribute("transform")).toBe("translate(64 48)");

    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 200, clientY: 150 });
    expect(layer.hasAttribute("transform")).toBe(false);
    expect(svg.getAttribute("viewBox")).toBe("-64 -48 640 480");
  });
});

describe("IsoRoom interior architecture", () => {
  it("layers a soft glow behind a full-height room window", () => {
    const { container } = render(
      <IsoRoom size={{ w: 6, d: 6, env: "room", walls: "full" }} placements={[]} saveView={false} />
    );

    const glow = container.querySelector('[data-window-glow="true"]');
    expect(glow).toBeTruthy();
    expect(container.querySelector('[data-window-floor-light="true"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-window-pane-light="true"] polygon')).toHaveLength(4);
    expect(container.querySelectorAll('[data-window-mullion-shadow="true"] polygon')).toHaveLength(2);
    const wallY = glow
      .getAttribute("points")
      .trim()
      .split(/\s+/)
      .map((point) => Number(point.split(",")[1]));
    expect(Math.min(...wallY)).toBeGreaterThanOrEqual(-WALL_H);
  });

  it("does not leave window light floating in an open room", () => {
    const { container } = render(
      <IsoRoom
        size={{ w: 6, d: 6, env: "room", walls: "none" }}
        placements={[]}
        saveView={false}
      />
    );

    expect(container.querySelector('[data-window-glow="true"]')).toBeNull();
    expect(container.querySelector('[data-window-floor-light="true"]')).toBeNull();
    expect(container.querySelector('[data-window-pane-light="true"]')).toBeNull();
    expect(container.querySelector('[data-window-mullion-shadow="true"]')).toBeNull();
  });

  it("does not draw a window past the end of an asymmetric wall run", () => {
    const { container } = render(
      <IsoRoom
        size={{
          w: 6,
          d: 6,
          env: "room",
          walls: "full",
          mask: ["111111", "111111", "111111", "011111", "011111", "011111"],
        }}
        placements={[]}
        saveView={false}
      />
    );

    expect(container.querySelector('[data-window-glow="true"]')).toBeNull();
    expect(container.querySelector('[data-window-floor-light="true"]')).toBeNull();
  });

  it("makes window light stronger by day than at night", () => {
    const props = {
      size: { w: 6, d: 6, env: "room", walls: "full" },
      placements: [],
      saveView: false,
    };
    const { container, rerender } = render(<IsoRoom {...props} timeOfDay="night" />);
    const night = Number(
      container.querySelector('[data-window-floor-light="true"] polygon').getAttribute("opacity"),
    );
    rerender(<IsoRoom {...props} timeOfDay="day" />);
    const day = Number(
      container.querySelector('[data-window-floor-light="true"] polygon').getAttribute("opacity"),
    );

    expect(day).toBeGreaterThan(night);
  });

  it("batches a maximum-size board floor into a bounded number of SVG nodes", () => {
    const { container } = render(
      <IsoRoom size={{ w: 48, d: 48, env: "room" }} placements={[]} saveView={false} />
    );
    const surface = container.querySelector('[data-floor-surface="boards"]');

    expect(surface).toBeTruthy();
    expect(surface.children.length).toBeLessThanOrEqual(50);
    expect(surface.querySelectorAll("path")).toHaveLength(2);
  });

  it("renders a drawn divider at the exterior roof height", () => {
    const { container } = render(
      <IsoRoom
        size={{ w: 5, d: 4, partitions: ["gy:2:1", "gy:2:2"] }}
        placements={[]}
        saveView={false}
      />
    );
    const wall = container.querySelector('[data-partition-style="wall"]');

    expect(Number(wall.dataset.wallHeight)).toBe(WALL_H);
  });
});

describe("IsoRoom at home — walking your own island", () => {
  // Two people and two pieces of furniture. `walkPersonas` means "they're all
  // yours", which is the whole difference from a visit: there, exactly one
  // placement walks and the host's people are untouchable.
  const HOME = { w: 9, d: 7 };
  const PLACEMENTS = [
    { id: "me", item: "resident", gx: 2, gy: 2 },
    { id: "flatmate", item: "resident", gx: 5, gy: 4 },
    { id: "desk", item: "desk", gx: 6, gy: 1 },
    { id: "rug", item: "rug", gx: 3, gy: 5 },
  ];

  it("arms every persona and nothing else", () => {
    const { container } = render(
      <IsoRoom
        size={HOME}
        placements={PLACEMENTS}
        editMode={false}
        saveView={false}
        walkPersonas
        onWalkTo={() => {}}
      />
    );
    // Both residents, neither the desk nor the rug — a grab cursor on
    // furniture would promise a walk that the drag handler then refuses.
    expect(grabCursors(container).length).toBe(2);
  });

  it("offers no walk affordance while decorating", () => {
    // In Decorate a drag MOVES things, so a walk cursor there would be
    // advertising the wrong verb — and the handler takes the edit path anyway.
    const { container } = render(
      <IsoRoom
        size={HOME}
        placements={PLACEMENTS}
        editMode
        saveView={false}
        walkPersonas
        onWalkTo={() => {}}
      />
    );
    expect(grabCursors(container).length).toBe(0);
  });

  it("arms nobody when the room isn't armed for walking", () => {
    // The flat-cottage scene and any future read-only render: personas must
    // not become grabbable just by existing.
    const { container } = render(
      <IsoRoom size={HOME} placements={PLACEMENTS} editMode={false} saveView={false} />
    );
    expect(grabCursors(container).length).toBe(0);
  });
});
