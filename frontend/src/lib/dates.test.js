import { describe, it, expect } from "vitest";
import { toISO } from "./dates";

describe("toISO", () => {
  it("formats a date from its local parts", () => {
    expect(toISO(new Date(2026, 6, 4))).toBe("2026-07-04");
  });

  it("zero-pads single-digit months and days", () => {
    expect(toISO(new Date(2026, 0, 9))).toBe("2026-01-09");
  });

  // The regression this whole module exists for: toISOString() would convert
  // to UTC first, turning a late-evening local date into the previous day for
  // anyone west of Greenwich (i.e. all of the Americas).
  it("does NOT shift the day for a late-evening local time", () => {
    const lateEvening = new Date(2026, 6, 4, 23, 30); // 11:30pm local, Jul 4
    expect(toISO(lateEvening)).toBe("2026-07-04");
  });

  it("does NOT shift the day for an early-morning local time", () => {
    const earlyMorning = new Date(2026, 6, 4, 0, 15); // 12:15am local, Jul 4
    expect(toISO(earlyMorning)).toBe("2026-07-04");
  });

  it("agrees with the local calendar across a year boundary", () => {
    expect(toISO(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
    expect(toISO(new Date(2027, 0, 1, 0, 1))).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(toISO(new Date(2028, 1, 29))).toBe("2028-02-29");
  });
});
