import { describe, expect, it } from "vitest";
import {
  currentLoginStreak, levelForXP, loginXP, normalizeProgression, recordLogin,
  recordNeighbourXP, rewardChallengeProgress, syncStudyXP, xpBeforeLevel, xpForNextLevel,
} from "./progression";
import { addCustomChallenge, changeCustomProgress, normalizeChallenges, recordChallenge, removeCustomChallenge, resetCustomChallenge } from "./challenges";

const today = new Date(2026, 9, 7, 23, 59);
const tomorrow = new Date(2026, 9, 8, 0, 1);
const empty = () => normalizeProgression(null, today);
const goals = () => normalizeChallenges({ version: 1, day: "2026-10-07", completed: [] }, today);
const addGoal = (state, cadence) => addCustomChallenge(state, { title: "Read", target: 1, tracking: "manual", cadence }, "custom-read", today);

describe("level curve and study credit", () => {
  it.each([[0, 1, 0, 100], [99, 1, 99, 100], [100, 2, 0, 150], [249, 2, 149, 150], [250, 3, 0, 200], [450, 4, 0, 250]])(
    "%i XP gives level %i with %i of %i progress", (xp, level, earned, required) => {
      expect(levelForXP(xp)).toEqual({ totalXP: xp, level, earned, required, remaining: required - earned });
    }
  );
  it("increases every level requirement and keeps exact boundaries through high levels", () => {
    for (let level = 1; level < 1000; level++) {
      expect(levelForXP(xpBeforeLevel(level)).level).toBe(level);
      expect(xpForNextLevel(level + 1) - xpForNextLevel(level)).toBe(50);
    }
    for (const invalid of [NaN, Infinity, -10, "100"]) expect(levelForXP(invalid).level).toBe(1);
  });
  it("backfills saved study minutes once and never loses XP on stale reads", () => {
    const first = syncStudyXP(empty(), 90, today);
    expect(first.studyXP).toBe(90);
    expect(syncStudyXP(first, 90, today)).toBe(first);
    expect(syncStudyXP(first, 20, today)).toBe(first);
    expect(syncStudyXP(first, 120, today).studyXP).toBe(120);
  });
});

describe("local-day check-ins and neighbours", () => {
  it("rewards one check-in a day, builds streaks and restarts after a missed day", () => {
    const first = recordLogin(empty(), today);
    expect(first.bonusXP).toBe(10);
    expect(recordLogin(first, today)).toBe(first);
    const second = recordLogin(first, tomorrow);
    expect(second.loginStreak).toBe(2);
    expect(second.bonusXP).toBe(21);
    const missed = recordLogin(second, new Date(2026, 9, 10));
    expect(missed.loginStreak).toBe(1);
    expect(missed.bestStreak).toBe(2);
    expect(missed.bonusXP).toBe(31);
    expect(loginXP(30)).toBe(20);
    expect(recordLogin(second, today).bonusXP).toBe(21);
  });
  it("uses calendar days across a daylight-saving boundary and expires a missed streak", () => {
    const first = recordLogin(empty(), new Date(2026, 2, 7, 23, 59));
    const second = recordLogin(first, new Date(2026, 2, 8, 23, 59));
    expect(second.loginStreak).toBe(2);
    expect(currentLoginStreak(second, new Date(2026, 2, 9))).toBe(2);
    expect(currentLoginStreak(second, new Date(2026, 2, 10))).toBe(0);
  });
  it("shares a neighbour's bonus between messages and visits and resets eligibility daily", () => {
    const first = recordNeighbourXP(empty(), "Luna", today);
    expect(first.bonusXP).toBe(5);
    expect(recordNeighbourXP(first, " luna ", today)).toBe(first);
    expect(recordNeighbourXP(first, "kai", today).bonusXP).toBe(10);
    expect(recordNeighbourXP(first, "luna", tomorrow).bonusXP).toBe(10);
    expect(recordNeighbourXP(first, "", today)).toBe(first);
  });
  it("repairs malformed counters, dates and claims while preserving valid earned XP", () => {
    const state = normalizeProgression({ version: 1, day: "2026-10-07", studyXP: -1,
      bonusXP: 75.7, lastLogin: "2026-02-30", loginStreak: Infinity, bestStreak: -1,
      neighbours: ["luna", "luna", 7], dailyClaims: {}, ongoingClaims: ["custom-a", "custom-a"] }, today);
    expect(state.studyXP).toBe(0);
    expect(state.bonusXP).toBe(75);
    expect(state.lastLogin).toBeNull();
    expect(state.loginStreak).toBe(0);
    expect(state.neighbours).toEqual(["luna"]);
    expect(state.ongoingClaims).toEqual(["custom-a"]);
    expect(normalizeProgression(state, today)).toBe(state);
  });
});

describe("challenge XP eligibility", () => {
  it("credits a real completion once, never partial progress or an already completed snapshot", () => {
    const before = goals();
    const after = recordChallenge(before, "focus-started", 1, today);
    const reward = rewardChallengeProgress(empty(), before, after, today);
    expect(reward.bonusXP).toBe(10);
    expect(reward.dailyClaims).toEqual(["start-study"]);
    expect(rewardChallengeProgress(reward, before, after, today)).toBe(reward);
    expect(rewardChallengeProgress(empty(), after, after, today).bonusXP).toBe(0);
    expect(rewardChallengeProgress(empty(), before, before, today).bonusXP).toBe(0);
  });
  it.each(["daily", "ongoing"])("prevents reset/undo farming for a %s personal goal", (cadence) => {
    const before = addGoal(goals(), cadence);
    const done = changeCustomProgress(before, "custom-read", 1, today);
    const reward = rewardChallengeProgress(empty(), before, done, today);
    const reset = resetCustomChallenge(done, "custom-read", today);
    const redone = changeCustomProgress(reset, "custom-read", 1, today);
    expect(rewardChallengeProgress(reward, reset, redone, today).bonusXP).toBe(10);
    const nextDayStart = resetCustomChallenge(redone, "custom-read", tomorrow);
    const nextDayDone = changeCustomProgress(nextDayStart, "custom-read", 1, tomorrow);
    expect(rewardChallengeProgress(reward, nextDayStart, nextDayDone, tomorrow).bonusXP).toBe(cadence === "daily" ? 20 : 10);
  });
  it("prunes deleted goal claims without subtracting earned XP", () => {
    const before = addGoal(goals(), "ongoing");
    const done = changeCustomProgress(before, "custom-read", 1, today);
    const reward = rewardChallengeProgress(empty(), before, done, today);
    const removed = removeCustomChallenge(done, "custom-read", today);
    const next = rewardChallengeProgress(reward, done, removed, today);
    expect(next.bonusXP).toBe(10);
    expect(next.ongoingClaims).toEqual([]);
  });
});
