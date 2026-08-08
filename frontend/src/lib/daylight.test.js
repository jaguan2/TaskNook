import { describe, expect, it } from "vitest";
import { DAYLIGHT_BANDS, timeOfDayForHour, timeOfDayNow } from "./daylight";

describe("timeOfDayForHour", () => {
  it("covers all 24 hours with one of the three scene palettes", () => {
    // The value feeds ISO_TIME / TIME_PRESETS lookups, so an hour that mapped to
    // undefined would take the room's colours with it.
    for (let h = 0; h < 24; h += 1) {
      expect(["night", "sunset", "day"]).toContain(timeOfDayForHour(h));
    }
  });

  it("is dark at night and light in the middle of the day", () => {
    expect(timeOfDayForHour(2)).toBe("night");
    expect(timeOfDayForHour(23)).toBe("night");
    expect(timeOfDayForHour(12)).toBe("day");
    expect(timeOfDayForHour(9)).toBe("day");
  });

  it("uses the warm palette for dawn as well as dusk", () => {
    // There is no separate sunrise scene, and the low warm sun reads as either.
    expect(timeOfDayForHour(6)).toBe("sunset");
    expect(timeOfDayForHour(18)).toBe("sunset");
  });

  it("changes only at the band edges", () => {
    expect(timeOfDayForHour(4)).toBe("night");
    expect(timeOfDayForHour(5)).toBe("sunset");
    expect(timeOfDayForHour(7)).toBe("day");
    expect(timeOfDayForHour(16)).toBe("day");
    expect(timeOfDayForHour(17)).toBe("sunset");
    expect(timeOfDayForHour(19)).toBe("sunset");
    expect(timeOfDayForHour(20)).toBe("night");
  });

  it("falls back to night for a clock it can't read", () => {
    // Rather than returning undefined into a palette lookup.
    for (const bad of [-1, 24, 99, NaN, undefined, null, "noon"]) {
      expect(timeOfDayForHour(bad)).toBe("night");
    }
  });

  it("has bands that are ordered and cover the whole day exactly once", () => {
    const ends = DAYLIGHT_BANDS.map((b) => b.until);
    expect(ends).toEqual([...ends].sort((a, b) => a - b));
    expect(ends[ends.length - 1]).toBe(24);
    expect(new Set(ends).size).toBe(ends.length);
  });

  it("timeOfDayNow reads the LOCAL hour", () => {
    // Local, not UTC — same convention as the rest of the app's day handling.
    const at = (h) => new Date(2026, 2, 10, h, 30);
    expect(timeOfDayNow(at(3))).toBe("night");
    expect(timeOfDayNow(at(13))).toBe("day");
    expect(timeOfDayNow(at(18))).toBe("sunset");
  });
});
