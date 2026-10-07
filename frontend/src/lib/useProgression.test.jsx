// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PROGRESSION_KEY } from "./progression";
import { useProgression } from "./useProgression";
import { readJSON, removeStored } from "./storage";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 7, 12)); removeStored(PROGRESSION_KEY); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); removeStored(PROGRESSION_KEY); });

it("waits for successful bootstrap and credits one login despite StrictMode and repeated interactions", () => {
  const { result, rerender } = renderHook(({ ready }) => useProgression(ready), { initialProps: { ready: false }, wrapper: StrictMode });
  expect(result.current.progression.bonusXP).toBe(0);
  rerender({ ready: true });
  expect(result.current.progression.bonusXP).toBe(10);
  const state = result.current.progression;
  act(() => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("keydown")); window.dispatchEvent(new Event("pointerdown")); });
  expect(result.current.progression).toBe(state);
});

it("persists immediate study/NPC credit and preserves it across relaunches", () => {
  const first = renderHook(() => useProgression(true));
  act(() => { first.result.current.syncStudy(90); first.result.current.recordNeighbour("luna"); });
  expect(readJSON(PROGRESSION_KEY).studyXP).toBe(90);
  expect(readJSON(PROGRESSION_KEY).bonusXP).toBe(15);
  first.unmount();
  const next = renderHook(() => useProgression(true));
  expect(next.result.current.progression.studyXP).toBe(90);
  expect(next.result.current.progression.bonusXP).toBe(15);
  act(() => next.result.current.recordNeighbour("luna"));
  expect(next.result.current.progression.bonusXP).toBe(15);
});

it("does not award an unattended midnight, but credits a returning or active window", () => {
  const { result } = renderHook(() => useProgression(true));
  act(() => { vi.setSystemTime(new Date(2026, 9, 8, 12)); vi.advanceTimersByTime(60_000); });
  expect(result.current.progression.loginStreak).toBe(1);
  act(() => window.dispatchEvent(new Event("keydown")));
  expect(result.current.progression.loginStreak).toBe(2);
  expect(result.current.progression.bonusXP).toBe(21);
});

it("keeps in-memory XP and gives feedback when storage is unavailable", () => {
  const error = vi.fn();
  const { result } = renderHook(() => useProgression(false, error));
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
  act(() => result.current.syncStudy(100));
  expect(result.current.progression.studyXP).toBe(100);
  expect(error).toHaveBeenCalledWith(expect.stringContaining("kept for this session"));
});
