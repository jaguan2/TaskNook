import { describe, it, expect } from "vitest";
import {
  focusStreak,
  focusSummary,
  focusWeeks,
  intensityOf,
  intensityScale,
} from "./stats";

const TODAY = "2026-03-10"; // a Tuesday

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

describe("intensity is relative to your own history", () => {
  it("is empty with nothing recorded, so nothing gets shaded", () => {
    expect(intensityScale({})).toEqual([]);
    expect(intensityOf(30, [])).toBe(0);
  });

  it("a modest habit still uses the whole scale", () => {
    // The point of a relative scale: 10-40 minute days must not all collapse to
    // the palest tint just because someone else studies for four hours.
    const days = { a: 10, b: 15, c: 20, d: 30, e: 40 };
    const scale = intensityScale(days);
    expect(intensityOf(10, scale)).toBe(1);
    expect(intensityOf(40, scale)).toBe(scale.length);
    expect(new Set([10, 15, 20, 30, 40].map((m) => intensityOf(m, scale))).size).toBeGreaterThan(1);
  });

  it("zero is never shaded, and a future/absent day is zero", () => {
    const scale = intensityScale({ a: 10, b: 60, c: 120 });
    expect(intensityOf(0, scale)).toBe(0);
    expect(intensityOf(undefined, scale)).toBe(0);
  });

  it("one or two days of history shade fully rather than inventing a spread", () => {
    expect(intensityScale({ a: 45 })).toEqual([45]);
    expect(intensityOf(45, intensityScale({ a: 45 }))).toBe(1);
  });

  it("an identical daily habit collapses to one level instead of a broken scale", () => {
    // 25 minutes every day: tertiles are all 25, and equal cut points would make
    // the shading arbitrary. De-duplicating gives one honest level.
    const scale = intensityScale({ a: 25, b: 25, c: 25, d: 25 });
    expect(scale).toEqual([25]);
    expect(intensityOf(25, scale)).toBe(1);
  });

  it("more focus is never a lower level", () => {
    const scale = intensityScale({ a: 5, b: 25, c: 50, d: 90, e: 200 });
    let last = 0;
    for (const m of [0, 5, 25, 50, 90, 200, 999]) {
      const level = intensityOf(m, scale);
      expect(level).toBeGreaterThanOrEqual(last);
      last = level;
    }
  });
});

describe("focusWeeks", () => {
  it("lays out Monday-first columns ending with this week", () => {
    const cols = focusWeeks({}, TODAY, 3);
    expect(cols).toHaveLength(3);
    expect(cols.every((c) => c.length === 7)).toBe(true);
    // Every column starts on a Monday.
    for (const col of cols) {
      expect(new Date(`${col[0].iso}T00:00:00`).getDay()).toBe(1);
    }
    // Today sits in the last column (Tuesday → index 1).
    expect(cols[2][1].iso).toBe(TODAY);
  });

  it("marks days after today as future, not as zero-focus", () => {
    // "You did nothing on Friday" is a lie when it's Wednesday.
    const cols = focusWeeks({}, TODAY, 1);
    expect(cols[0].filter((d) => d.future).map((d) => d.iso)).toEqual([
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
      "2026-03-14",
      "2026-03-15",
    ]);
    expect(cols[0][1].future).toBe(false); // today itself is not the future
  });

  it("carries the minutes through", () => {
    const cols = focusWeeks({ [TODAY]: 42 }, TODAY, 1);
    expect(cols[0][1].minutes).toBe(42);
    expect(cols[0][0].minutes).toBe(0);
  });
});

describe("focusSummary", () => {
  const days = {
    "2026-03-10": 30,
    "2026-03-09": 60,
    "2026-03-05": 200, // best
    "2026-03-01": 45, // in the previous 7-day window
  };

  it("finds the best day and counts the days you showed up", () => {
    const s = focusSummary(days, TODAY);
    expect(s.bestISO).toBe("2026-03-05");
    expect(s.bestMinutes).toBe(200);
    expect(s.activeDays).toBe(4);
  });

  it("compares the last seven days with the seven before", () => {
    const s = focusSummary(days, TODAY);
    expect(s.last7).toBe(290); // 03-04..03-10
    expect(s.prev7).toBe(45); // 02-25..03-03
    expect(s.deltaPct).toBe(Math.round(((290 - 45) / 45) * 100));
  });

  it("reports no comparison at all rather than 0% for a first week", () => {
    // "Up 0%" and "this is your first week" are different statements.
    const s = focusSummary({ [TODAY]: 30 }, TODAY);
    expect(s.prev7).toBe(0);
    expect(s.deltaPct).toBe(null);
  });

  it("survives an empty or missing map", () => {
    expect(focusSummary({}, TODAY).bestISO).toBe(null);
    expect(() => focusSummary(null, TODAY)).not.toThrow();
  });
});
