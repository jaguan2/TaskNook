// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useChallenges } from "./useChallenges";
import { CHALLENGES_KEY, challengeFor, dailyChallengeIds } from "./challenges";
import { readJSON, removeStored, writeJSON } from "./storage";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 7, 23, 59));
  removeStored(CHALLENGES_KEY);
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); removeStored(CHALLENGES_KEY);
});
const goal = (cadence = "ongoing") => ({ title: "Read chapters", target: 3, tracking: "manual", cadence });

it("persists a replacement and consecutive custom actions immediately, then restores on relaunch", () => {
  const first = renderHook(() => useChallenges(), { wrapper: StrictMode });
  let id;
  act(() => {
    first.result.current.replaceChallenge(first.result.current.challenges.daily[0].id);
    first.result.current.addChallenge(goal());
  });
  id = first.result.current.challenges.custom[0].id;
  act(() => {
    first.result.current.advanceChallenge(id);
    first.result.current.advanceChallenge(id);
    expect(readJSON(CHALLENGES_KEY).custom[0].progress).toBe(2);
  });
  const snapshot = first.result.current.challenges;
  first.unmount();
  const next = renderHook(() => useChallenges());
  expect(next.result.current.challenges).toEqual(snapshot);
});

it("rolls over while open, keeps ongoing progress, and never re-renders on ordinary day checks", () => {
  let renders = 0;
  const { result } = renderHook(() => { renders++; return useChallenges(); });
  act(() => { result.current.addChallenge(goal("daily")); result.current.addChallenge(goal()); });
  act(() => { result.current.challenges.custom.forEach(({ id }) => result.current.advanceChallenge(id)); });
  const before = renders;
  act(() => { vi.setSystemTime(new Date(2026, 9, 7, 22)); vi.advanceTimersByTime(60_000); });
  expect(renders).toBe(before);
  act(() => { vi.setSystemTime(new Date(2026, 9, 8)); vi.advanceTimersByTime(60_000); });
  expect(result.current.challenges.day).toBe("2026-10-08");
  expect(result.current.challenges.custom.map(({ progress }) => progress)).toEqual([0, 1]);
  expect(result.current.challenges.daily.map(({ id }) => id)).toEqual(dailyChallengeIds(new Date(2026, 9, 8)));
  expect(readJSON(CHALLENGES_KEY)).toEqual(result.current.challenges);
});

it("reconciles a suspended window and credits an action only to the current local day", () => {
  const { result } = renderHook(() => useChallenges());
  const event = challengeFor(result.current.challenges.daily[0].id).event;
  act(() => result.current.recordChallengeEvent(event));
  act(() => { vi.setSystemTime(new Date(2026, 9, 8)); window.dispatchEvent(new Event("focus")); });
  expect(result.current.challenges.daily.every(({ progress }) => !progress)).toBe(true);
  act(() => { vi.setSystemTime(new Date(2026, 9, 9)); result.current.recordChallengeEvent("unknown"); });
  expect(result.current.challenges.day).toBe("2026-10-09");
  expect(result.current.challenges.daily.every(({ progress }) => !progress)).toBe(true);
});

it("migrates saved credit and warns about unavailable storage without losing in-memory goals", () => {
  writeJSON(CHALLENGES_KEY, { version: 1, day: "2026-10-07", completed: ["start-study"] });
  const error = vi.fn();
  const { result } = renderHook(() => useChallenges(error));
  expect(result.current.challenges.daily.find(({ id }) => id === "start-study").progress).toBe(1);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
  act(() => result.current.addChallenge(goal()));
  expect(result.current.challenges.custom).toHaveLength(1);
  expect(error).toHaveBeenCalledWith(expect.stringContaining("progress is kept for this session"));
});
