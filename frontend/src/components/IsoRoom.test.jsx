// @vitest-environment jsdom
// The scene's one render smoke test: a visited room with personas and name
// tags. Nothing else renders IsoRoom in tests, so before this existed a
// throw in the personas/label layer would have shipped uncaught — the scene
// ErrorBoundary's fallback would be the first anyone heard of it.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import IsoRoom from "./IsoRoom";
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
