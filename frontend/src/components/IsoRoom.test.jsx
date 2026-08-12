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
});
