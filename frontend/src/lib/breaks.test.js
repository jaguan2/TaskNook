import { describe, expect, it } from "vitest";
import {
  BREAK_NUDGE_MINUTES,
  IDLE_GRACE_MINUTES,
  PRESENCE_TICK_SECONDS,
  REST_MINUTES,
  isPresent,
  tickPresence,
} from "./breaks";

const ON = { enabled: true, suppressed: false, present: true };
const TICKS = (BREAK_NUDGE_MINUTES * 60) / PRESENCE_TICK_SECONDS;
const START = { focus: 0, away: 0 };

/** Run `n` samples and report the final state plus how often it nudged. */
const run = (n, opts = ON, from = START) => {
  let state = from;
  let nudges = 0;
  for (let i = 0; i < n; i++) {
    const r = tickPresence(state, opts);
    state = { focus: r.focus, away: r.away };
    if (r.nudge) nudges++;
  }
  return { ...state, nudges };
};

describe("who counts as present", () => {
  const base = { visible: true, idleMs: 0, timerRunning: false };

  it("someone who just touched the keyboard is", () => {
    expect(isPresent(base)).toBe(true);
  });

  it("someone reading beside a running timer is", () => {
    // The whole point of the timer case: deliberate study away from the
    // keyboard shouldn't read as having left.
    expect(isPresent({ ...base, idleMs: 60 * 60_000, timerRunning: true })).toBe(true);
  });

  it("an app left open and untouched isn't", () => {
    // The dinner-cooking case — this is why raw app-open time is the wrong
    // trigger.
    expect(isPresent({ ...base, idleMs: (IDLE_GRACE_MINUTES + 1) * 60_000 })).toBe(false);
  });

  it("a hidden window isn't, however recently it was touched", () => {
    expect(isPresent({ ...base, visible: false })).toBe(false);
    expect(isPresent({ ...base, visible: false, timerRunning: true })).toBe(false);
  });
});

describe("the break nudge", () => {
  it("fires at the threshold, not before", () => {
    expect(run(TICKS - 1).nudges).toBe(0);
    expect(run(TICKS).nudges).toBe(1);
  });

  it("counts study with no timer running", () => {
    // The reason presence replaced focus-seconds: someone working from a
    // textbook never presses play, and used to be invisible to this.
    expect(run(TICKS, { ...ON, present: true }).nudges).toBe(1);
  });

  it("restarts afterwards, so a marathon is reminded more than once", () => {
    expect(run(TICKS * 3).nudges).toBe(3);
  });

  it("stands down while suppressed, and when switched off", () => {
    expect(run(TICKS * 2, { ...ON, suppressed: true }).nudges).toBe(0);
    expect(run(TICKS * 2, { ...ON, enabled: false }).nudges).toBe(0);
  });

  it("doesn't count time spent away", () => {
    const away = run(TICKS * 2, { ...ON, present: false });
    expect(away.nudges).toBe(0);
    expect(away.focus).toBe(0);
  });

  it("treats a brief absence as an interruption, not a break", () => {
    // Alt-tabbing to look something up must not wipe an hour of sitting.
    const sat = run(TICKS - 10);
    const blip = run(1, { ...ON, present: false }, sat);
    expect(blip.focus).toBe(sat.focus);
    expect(run(10, ON, blip).nudges).toBe(1);
  });

  it("treats a long absence as the break", () => {
    const sat = run(TICKS - 10);
    const gone = run((REST_MINUTES * 60) / PRESENCE_TICK_SECONDS, { ...ON, present: false }, sat);
    expect(gone.focus).toBe(0);
    // and the clock genuinely starts over
    expect(run(10, ON, gone).nudges).toBe(0);
  });
});
