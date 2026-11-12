// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePetGrowthClock } from "./usePetGrowthClock";
import { PET_STAGES, petGrowth } from "../lib/pets";

afterEach(() => { cleanup(); vi.useRealTimers(); });

it("uses one deadline for several pets, refreshes on return and cleans up", () => {
  vi.useFakeTimers();
  const start = 1_800_000_000_000;
  vi.setSystemTime(start);
  const pets = [
    { growth: { ageMs: PET_STAGES[1].ageMs - 1000, startedAt: start } },
    { growth: { ageMs: 0, startedAt: start } },
    { growth: { ageMs: 0, startedAt: null } },
  ];
  const { result, unmount } = renderHook(() => usePetGrowthClock(pets));
  expect(vi.getTimerCount()).toBe(1);
  act(() => vi.advanceTimersByTime(1000));
  expect(petGrowth(pets[0], result.current).stage.key).toBe("teen");
  vi.setSystemTime(start + PET_STAGES[2].ageMs + 1000);
  act(() => window.dispatchEvent(new Event("focus")));
  expect(petGrowth(pets[1], result.current).stage.key).toBe("adult");
  expect(petGrowth(pets[2], result.current).stage.key).toBe("baby");
  expect(vi.getTimerCount()).toBe(0);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
