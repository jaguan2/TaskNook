// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TimerProvider, useTimer } from "./timer";
import { readStored, removeStored, writeStored } from "./lib/storage";

const mockStore = vi.hoisted(() => ({
  activeTask: null,
  stats: { focusMinutesToday: 0 },
  refreshFocus: vi.fn(),
  showToast: vi.fn(),
  nudgeFromFriend: vi.fn(),
}));
const mockPlayChime = vi.hoisted(() => vi.fn());

vi.mock("./store", () => ({ useStore: () => mockStore }));
vi.mock("./lib/api", () => ({
  api: { logSession: vi.fn(async () => ({})) },
}));
vi.mock("./lib/audio", async (importOriginal) => ({
  ...(await importOriginal()),
  playChime: mockPlayChime,
}));

function Probe() {
  const {
    focusMinutes,
    setFocus,
    chimeVolume,
    setChimeVolume,
    setTimerMode,
    startTimer,
    pauseTimer,
    finishStopwatch,
    remaining,
    pomodoro,
  } = useTimer();
  return (
    <div>
      <output aria-label="focus minutes">{focusMinutes}</output>
      <output aria-label="chime volume">{chimeVolume}</output>
      <output aria-label="remaining">{remaining}</output>
      <output aria-label="pomodoro">{JSON.stringify(pomodoro)}</output>
      <button onClick={() => setFocus(52)}>custom focus</button>
      <button onClick={() => setChimeVolume(0)}>mute chime</button>
      <button onClick={() => setTimerMode("stopwatch")}>stopwatch mode</button>
      <button onClick={startTimer}>start</button>
      <button onClick={pauseTimer}>pause</button>
      <button onClick={finishStopwatch}>finish stopwatch</button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  removeStored("tasknook.focusMinutes");
  removeStored("tasknook.chimeVolume");
  removeStored("tasknook.timerMode");
  removeStored("tasknook.pomodoro");
  mockPlayChime.mockClear();
  vi.useRealTimers();
});

describe("persisted timer preferences", () => {
  it("restores and updates a custom focus length and chime level", () => {
    writeStored("tasknook.focusMinutes", "37");
    writeStored("tasknook.chimeVolume", "0.3");
    render(<TimerProvider><Probe /></TimerProvider>);

    expect(screen.getByLabelText("focus minutes").textContent).toBe("37");
    expect(screen.getByLabelText("chime volume").textContent).toBe("0.3");

    fireEvent.click(screen.getByText("custom focus"));
    fireEvent.click(screen.getByText("mute chime"));

    expect(screen.getByLabelText("focus minutes").textContent).toBe("52");
    expect(screen.getByLabelText("chime volume").textContent).toBe("0");
    expect(readStored("tasknook.focusMinutes")).toBe("52");
    expect(readStored("tasknook.chimeVolume")).toBe("0");
  });

  it("repairs a corrupt Pomodoro plan before rendering it", () => {
    writeStored(
      "tasknook.pomodoro",
      JSON.stringify({ enabled: "true", breakMinutes: -5, rounds: 999999 })
    );
    render(<TimerProvider><Probe /></TimerProvider>);

    expect(JSON.parse(screen.getByLabelText("pomodoro").textContent)).toEqual({
      enabled: false,
      breakMinutes: 1,
      rounds: 12,
    });
  });

  it("samples wall time when pausing after a throttled interval", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00Z"));
    render(<TimerProvider><Probe /></TimerProvider>);
    fireEvent.click(screen.getByText("start"));

    // Move the wall clock without running the 1 Hz repaint interval, matching
    // a browser that throttled callbacks while the window was hidden.
    vi.setSystemTime(new Date("2026-08-26T12:01:00Z"));
    fireEvent.click(screen.getByText("pause"));

    expect(screen.getByLabelText("remaining").textContent).toBe(String(29 * 60));
  });

  it("uses the configured chime level when a stopwatch finishes", async () => {
    vi.useFakeTimers();
    writeStored("tasknook.chimeVolume", "0.3");
    render(<TimerProvider><Probe /></TimerProvider>);

    fireEvent.click(screen.getByText("stopwatch mode"));
    fireEvent.click(screen.getByText("start"));
    await vi.advanceTimersByTimeAsync(61_000);
    fireEvent.click(screen.getByText("finish stopwatch"));

    expect(mockPlayChime).toHaveBeenCalledWith(0.3);
  });
});
