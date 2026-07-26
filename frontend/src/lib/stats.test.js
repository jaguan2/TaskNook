import { describe, it, expect } from "vitest";
import { focusStreak } from "./stats";

const TODAY = "2026-03-10";

describe("focusStreak", () => {
  it("is zero with no history", () => {
    expect(focusStreak({}, 60, TODAY)).toBe(0);
    expect(focusStreak(null, 60, TODAY)).toBe(0);
  });

  it("counts today once the goal is met", () => {
    expect(focusStreak({ [TODAY]: 60 }, 60, TODAY)).toBe(1);
    expect(focusStreak({ [TODAY]: 59 }, 60, TODAY)).toBe(0);
  });

  it("chains consecutive met days backwards from today", () => {
    const days = {
      "2026-03-10": 90,
      "2026-03-09": 60,
      "2026-03-08": 75,
    };
    expect(focusStreak(days, 60, TODAY)).toBe(3);
  });

  it("an unmet today keeps yesterday's streak alive (the day isn't over)", () => {
    const days = { "2026-03-09": 60, "2026-03-08": 60 };
    expect(focusStreak(days, 60, TODAY)).toBe(2);
  });

  it("a gap breaks the chain", () => {
    const days = {
      "2026-03-10": 60,
      // 03-09 missing
      "2026-03-08": 60,
    };
    expect(focusStreak(days, 60, TODAY)).toBe(1);
  });

  it("crosses month boundaries", () => {
    const days = { "2026-03-01": 60, "2026-02-28": 60 };
    expect(focusStreak(days, 60, "2026-03-01")).toBe(2);
  });

  it("under-goal days don't count even with some minutes", () => {
    const days = { "2026-03-10": 120, "2026-03-09": 30 };
    expect(focusStreak(days, 60, TODAY)).toBe(1);
  });
});
