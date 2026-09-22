// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HudFocusCard from "./HudFocusCard";

const timer = vi.hoisted(() => ({
  remaining: 1500, running: false, focusMinutes: 25, focusPresets: [25],
  pomodoro: { enabled: true, rounds: 4, breakMinutes: 5 }, phase: "focus", round: 1,
  timerMode: "timer", elapsed: 0, nudgeSeconds: 0, focusMinutesLive: 30,
  startTimer: vi.fn(), pauseTimer: vi.fn(), resetTimer: vi.fn(), finishStopwatch: vi.fn(),
  skipBreak: vi.fn(), nudgeTimer: vi.fn(),
}));
vi.mock("../timer", () => ({ useTimer: () => timer }));
vi.mock("../store", () => ({ useStore: () => ({ activeTask: { name: "A thoughtful task with a very long title" }, sessionDays: {}, dailyGoal: 60, unlockBalance: 0 }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); Object.assign(timer, { remaining: 1500, running: false, phase: "focus", timerMode: "timer", elapsed: 0 }); });

it("uses the existing timer actions and provides its own way back to the room", () => {
  const expand = vi.fn();
  render(<HudFocusCard compact onExpand={expand} />);
  expect(screen.getByRole("timer").textContent).toBe("25:00");
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  expect(timer.startTimer).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "+1 min" }));
  expect(timer.nudgeTimer).toHaveBeenCalledWith(60);
  fireEvent.click(screen.getByRole("button", { name: "Exit Widget Mode" }));
  expect(expand).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "Timer options" })).toBeNull();
});

it("keeps the two-tap reset protection for a running block", () => {
  timer.running = true;
  timer.remaining = 1200;
  render(<HudFocusCard compact />);
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  expect(timer.pauseTimer).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Reset session" }));
  expect(timer.resetTimer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));
  expect(timer.resetTimer).toHaveBeenCalledOnce();
});

it("offers break controls without displaying the active task", () => {
  timer.phase = "break";
  timer.remaining = 300;
  render(<HudFocusCard compact />);
  expect(screen.getByText("Take a breath")).toBeTruthy();
  expect(screen.queryByText(/A thoughtful task/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Skip break" }));
  expect(timer.skipBreak).toHaveBeenCalledOnce();
});

it("shows long stopwatch times and logs through the existing finish action", () => {
  timer.timerMode = "stopwatch";
  timer.elapsed = 3661;
  render(<HudFocusCard compact />);
  expect(screen.getByRole("timer").textContent).toBe("1:01:01");
  expect(screen.getByRole("img", { name: "50% of daily goal" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Finish and log the tracked time" }));
  expect(timer.finishStopwatch).toHaveBeenCalledOnce();
});
