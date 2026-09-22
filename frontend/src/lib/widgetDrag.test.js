import { describe, expect, it } from "vitest";
import { EDGE_DISMISS_SLIVER, shouldDismissAtEdge } from "./widgetDrag";

const viewport = { width: 1200, height: 800 };

describe("edge dismissal for movable widgets", () => {
  it("dismisses once only a narrow sliver remains on any edge", () => {
    expect(shouldDismissAtEdge({ left: -300, right: 39, top: 100, bottom: 400 }, viewport)).toBe(true);
    expect(shouldDismissAtEdge({ left: 1161, right: 1500, top: 100, bottom: 400 }, viewport)).toBe(true);
    expect(shouldDismissAtEdge({ left: 100, right: 400, top: -300, bottom: 40 }, viewport)).toBe(true);
    expect(shouldDismissAtEdge({ left: 100, right: 400, top: 761, bottom: 1100 }, viewport)).toBe(true);
  });

  it("keeps a widget that touches an edge but still has a usable surface", () => {
    expect(
      shouldDismissAtEdge(
        { left: -200, right: EDGE_DISMISS_SLIVER + 1, top: 0, bottom: 300 },
        viewport
      )
    ).toBe(false);
    expect(shouldDismissAtEdge({ left: 860, right: 1200, top: 100, bottom: 400 }, viewport)).toBe(false);
  });

  it("fails safe when measurements are unavailable", () => {
    expect(shouldDismissAtEdge(null, viewport)).toBe(false);
    expect(shouldDismissAtEdge({}, { width: NaN, height: 800 })).toBe(false);
  });
});
