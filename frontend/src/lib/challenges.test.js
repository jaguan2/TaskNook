import { describe, expect, it } from "vitest";
import {
  CHALLENGE_TITLE_MAX, CUSTOM_CHALLENGE_LIMIT, DAILY_CHALLENGES, addCustomChallenge,
  challengeFor, changeCustomProgress, dailyChallengeIds, normalizeChallenges,
  recordChallenge, removeCustomChallenge, replaceDailyChallenge, resetCustomChallenge,
} from "./challenges";

const today = new Date(2026, 9, 7, 23, 45);
const tomorrow = new Date(2026, 9, 8);
const empty = () => normalizeChallenges(null, today);
const legacy = () => normalizeChallenges({ version: 1, day: "2026-10-07", completed: [] }, today);
const draft = (patch = {}) => ({ title: "Read a chapter", target: 3, tracking: "manual", cadence: "daily", ...patch });
const add = (state, patch = {}, id = "custom-one") => addCustomChallenge(state, draft(patch), id, today);

describe("daily variety and migration", () => {
  it("changes every category between adjacent LOCAL days and stays stable through a day", () => {
    const seen = new Set();
    for (let i = 0; i < 366; i++) {
      const day = new Date(2026, 0, 1 + i, 0, 1);
      const late = new Date(2026, 0, 1 + i, 23, 59);
      const ids = dailyChallengeIds(day), next = dailyChallengeIds(new Date(2026, 0, 2 + i));
      expect(dailyChallengeIds(late)).toEqual(ids);
      expect(new Set(ids).size).toBe(3);
      expect(ids.map((id) => challengeFor(id).category)).toEqual(["focus", "tasks", "social"]);
      ids.forEach((id, index) => { expect(next[index]).not.toBe(id); seen.add(id); });
    }
    expect(seen.size).toBe(DAILY_CHALLENGES.length);
    expect(empty().day).toBe("2026-10-07");
  });

  it("migrates the first release without replacing today's prompts or erasing completed ones", () => {
    const progress = normalizeChallenges({ version: 1, day: "2026-10-07", completed: ["start-study", "start-study", "unknown"] }, today);
    expect(progress.version).toBe(2);
    expect(progress.daily).toEqual([
      { id: "talk-to-friend", progress: 0 }, { id: "start-study", progress: 1 }, { id: "update-todos", progress: 0 },
    ]);
    expect(normalizeChallenges(progress, today)).toBe(progress);
    expect(normalizeChallenges(progress, tomorrow).daily).toEqual(dailyChallengeIds(tomorrow).map((id) => ({ id, progress: 0 })));
  });

  it.each([null, [], "bad", { version: 99 }, { version: 2, day: "2026-10-07", daily: [null, {}, { id: "unknown" }] }])(
    "repairs malformed progress %j", (saved) => {
      const normalized = normalizeChallenges(saved, today);
      expect(normalized.day).toBe("2026-10-07");
      expect(normalized.daily).toHaveLength(3);
      expect(normalized.daily.every(({ id, progress }) => !!challengeFor(id) && progress === 0)).toBe(true);
    }
  );

  it("keeps valid event credit idempotent without mutating input", () => {
    const progress = legacy();
    const done = recordChallenge(progress, "focus-started", 1, today);
    expect(progress.daily.find(({ id }) => id === "start-study").progress).toBe(0);
    expect(recordChallenge(done, "focus-started", 1, today)).toBe(done);
    expect(recordChallenge(done, "unknown", 1, today)).toBe(done);
    expect(recordChallenge(done, "focus-started", Infinity, today)).toBe(done);
  });

  it("has a stable unique ID for every developer-authored prompt", () => {
    expect(new Set(DAILY_CHALLENGES.map(({ id }) => id)).size).toBe(DAILY_CHALLENGES.length);
  });
});

describe("replacing a prompt", () => {
  it("changes only the chosen unfinished slot, saves the choice, and never duplicates active prompts", () => {
    const completed = recordChallenge(legacy(), "focus-started", 1, today);
    let state = completed;
    for (let i = 0; i < 25; i++) {
      const old = state.daily[0].id;
      const before = state.daily.slice(1);
      state = replaceDailyChallenge(state, old, today);
      expect(state.daily[0].id).not.toBe(old);
      expect(state.daily[0].progress).toBe(0);
      expect(state.daily.slice(1)).toEqual(before);
      expect(new Set(state.daily.map(({ id }) => id)).size).toBe(3);
      expect(state.seen.length).toBeLessThanOrEqual(DAILY_CHALLENGES.length);
      expect(normalizeChallenges(state, today)).toBe(state);
    }
    expect(replaceDailyChallenge(completed, "start-study", today)).toBe(completed);
    expect(replaceDailyChallenge(completed, "missing", today)).toBe(completed);
  });

  it("uses unseen prompts before recycling earlier choices and gives no retroactive credit", () => {
    let state = legacy();
    for (let i = 0; i < 6; i++) {
      const before = state.seen;
      state = replaceDailyChallenge(state, state.daily[0].id, today);
      expect(before).not.toContain(state.daily[0].id);
    }
    expect(state.seen).toHaveLength(9);
  });
});

describe("personal goals", () => {
  it("resets daily progress while retaining ongoing progress and all definitions", () => {
    let state = add(empty());
    state = add(state, { cadence: "ongoing" }, "custom-two");
    state = changeCustomProgress(changeCustomProgress(state, "custom-one", 1, today), "custom-two", 1, today);
    const next = normalizeChallenges(state, tomorrow);
    expect(next.custom.map(({ progress }) => progress)).toEqual([0, 1]);
    expect(next.custom.map(({ title, target, cadence }) => ({ title, target, cadence }))).toEqual(state.custom.map(({ title, target, cadence }) => ({ title, target, cadence })));
    expect(next.daily.every(({ progress }) => progress === 0)).toBe(true);
    expect(normalizeChallenges(next, tomorrow)).toBe(next);
  });

  it("tracks automatic goals cumulatively and clamps at the target", () => {
    let state = add(empty(), { target: 20, tracking: "focus-minutes", cadence: "ongoing" });
    state = recordChallenge(state, "focus-minutes", 12, today);
    expect(state.custom[0].progress).toBe(12);
    state = recordChallenge(state, "focus-minutes", 30, tomorrow);
    expect(state.custom[0].progress).toBe(20);
    expect(recordChallenge(state, "focus-minutes", 10, tomorrow)).toBe(state);
    expect(changeCustomProgress(state, "custom-one", -1, tomorrow)).toBe(state);
  });

  it("supports manual progress, undo, reset and deletion without touching other goals or prompts", () => {
    let state = add(empty(), { target: 1 });
    state = add(state, {}, "custom-two");
    const daily = state.daily;
    state = changeCustomProgress(state, "custom-one", 1, today);
    expect(state.custom[0].progress).toBe(1);
    expect(changeCustomProgress(state, "custom-one", 1, today)).toBe(state);
    state = changeCustomProgress(state, "custom-one", -1, today);
    expect(state.custom[0].progress).toBe(0);
    state = changeCustomProgress(state, "custom-two", 1, today);
    const first = state.custom[0];
    state = resetCustomChallenge(state, "custom-two", today);
    expect(state.custom[1].progress).toBe(0);
    expect(state.custom[0]).toEqual(first);
    state = removeCustomChallenge(state, "custom-one", today);
    expect(state.custom.map(({ id }) => id)).toEqual(["custom-two"]);
    expect(state.daily).toEqual(daily);
    expect(removeCustomChallenge(state, "missing", today)).toBe(state);
    expect(recordChallenge(state, "manual", 1, today)).toBe(state);
  });

  it.each([{ title: " " }, { title: "x".repeat(CHALLENGE_TITLE_MAX + 1) }, { target: 0 }, { target: 1.5 }, { target: 1000 }, { tracking: "invalid" }, { cadence: "weekly" }])(
    "rejects invalid input %j", (patch) => expect(() => add(empty(), patch)).toThrow()
  );

  it("bounds and sanitizes stored goals, including duplicate IDs and impossible counters", () => {
    const state = normalizeChallenges({ ...empty(), custom: [null,
      { id: "bad", title: "bad" }, { id: "custom-one", title: "  Goal  ", target: 2, progress: 999, tracking: "unknown", cadence: "weekly" },
      { id: "custom-one", title: "duplicate" }, ...Array.from({ length: 30 }, (_, i) => ({ id: `custom-${i}`, title: "Goal", target: 2, progress: -1 })),
    ] }, today);
    expect(state.custom).toHaveLength(CUSTOM_CHALLENGE_LIMIT);
    expect(state.custom[0]).toEqual({ id: "custom-one", title: "Goal", target: 2, tracking: "manual", cadence: "daily", progress: 2 });
    expect(() => add(state, {}, "custom-extra")).toThrow(/12 personal/);
    expect(state.custom[1].progress).toBe(0);
  });
});
