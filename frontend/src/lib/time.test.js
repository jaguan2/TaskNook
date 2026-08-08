import { describe, expect, it } from "vitest";
import { elapsedFrom, formatClock, remainingFrom } from "./time";

describe("formatClock", () => {
  it("reads m:ss under an hour", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(59)).toBe("0:59");
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(1500)).toBe("25:00");
  });

  it("pads the minutes when asked, which the countdown wants", () => {
    // So the digits don't shift as the clock crosses ten minutes.
    expect(formatClock(300, { padMinutes: true })).toBe("05:00");
    expect(formatClock(1500, { padMinutes: true })).toBe("25:00");
    expect(formatClock(0, { padMinutes: true })).toBe("00:00");
  });

  it("grows an hours field, always padding the minutes there", () => {
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(3903)).toBe("1:05:03");
    expect(formatClock(7325)).toBe("2:02:05");
  });

  it("never renders NaN for a missing or absurd duration", () => {
    // YouTube reports one of these for a live stream.
    for (const bad of [NaN, Infinity, -Infinity, -5, undefined, null, "abc"]) {
      expect(formatClock(bad)).toBe("0:00");
      expect(formatClock(bad, { padMinutes: true })).toBe("00:00");
    }
  });

  it("truncates rather than rounding, so a clock never shows its target early", () => {
    expect(formatClock(59.9)).toBe("0:59");
  });
});

describe("the clock anchor (what makes a throttled tab correct)", () => {
  const at = 1_000_000;

  it("counts down by real elapsed time", () => {
    const anchor = { at, base: 300 };
    expect(remainingFrom(anchor, at)).toBe(300);
    expect(remainingFrom(anchor, at + 1000)).toBe(299);
    expect(remainingFrom(anchor, at + 60_000)).toBe(240);
  });

  it("counts time that passed while NOTHING ticked", () => {
    // The actual bug: with a throttled interval the old code decremented once and
    // called it a second. Here the ticks are irrelevant — only the wall clock is.
    const anchor = { at, base: 25 * 60 };
    // Six minutes of real time, however few callbacks ran in between.
    expect(remainingFrom(anchor, at + 6 * 60_000)).toBe(19 * 60);
    // And a whole night away finishes the block rather than stretching it.
    expect(remainingFrom(anchor, at + 8 * 3600_000)).toBe(0);
  });

  it("never goes negative, so the completion effect fires exactly once", () => {
    const anchor = { at, base: 10 };
    expect(remainingFrom(anchor, at + 10_000)).toBe(0);
    expect(remainingFrom(anchor, at + 999_000)).toBe(0);
  });

  it("ignores a clock that jumps backwards", () => {
    // NTP correction, or a laptop waking with a stale time. Treat it as no time
    // passed rather than as time being handed back.
    const anchor = { at, base: 120 };
    expect(remainingFrom(anchor, at - 60_000)).toBe(120);
    expect(elapsedFrom(anchor, at - 60_000)).toBe(120);
  });

  it("a stopwatch measures wall time, which is what a stopwatch is", () => {
    const anchor = { at, base: 0 };
    expect(elapsedFrom(anchor, at + 90_000)).toBe(90);
    // Left running while hidden it now reports the truth; it used to UNDER-count.
    expect(elapsedFrom(anchor, at + 3600_000)).toBe(3600);
  });

  it("re-anchoring is what makes a pause free", () => {
    // Pause holds `remaining`; resume re-anchors with it, so the paused interval
    // isn't deducted the moment it resumes.
    const paused = remainingFrom({ at, base: 300 }, at + 30_000); // 270
    const resumed = { at: at + 5 * 60_000, base: paused }; // 5 min later
    expect(remainingFrom(resumed, at + 5 * 60_000)).toBe(270);
    expect(remainingFrom(resumed, at + 5 * 60_000 + 10_000)).toBe(260);
  });
});
