// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { npcActivity } from "./visiting";
import { useNpcActivity } from "./useNpcActivity";

afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("independent NPC activity", () => {
  it("follows their own schedule while the user starts and stops a timer", () => {
    vi.useFakeTimers();
    let now = new Date(2026, 8, 10, 12).getTime();
    while (npcActivity("luna", now).state !== "break") now += 60_000;
    vi.setSystemTime(now);
    const { result, rerender, unmount } = renderHook(({ activity }) => useNpcActivity("luna", activity), {
      initialProps: { activity: "focus" },
    });
    expect(result.current).toBe("break");
    rerender({ activity: null });
    expect(result.current).toBe("break");
    act(() => vi.advanceTimersByTime(5 * 60_000));
    const expected = npcActivity("luna", Date.now()).state;
    expect(result.current).toBe(expected === "idle" ? null : expected);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives the user's character the real timer without adding a clock", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ activity }) => useNpcActivity(undefined, activity), {
      initialProps: { activity: "focus" },
    });
    expect(result.current).toBe("focus");
    expect(vi.getTimerCount()).toBe(0);
    rerender({ activity: "break" });
    expect(result.current).toBe("break");
  });
});
