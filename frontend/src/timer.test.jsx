// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TimerProvider, useTimer } from "./timer";
import { api } from "./lib/api";
import { readStored, removeStored, writeStored } from "./lib/storage";

const mockStore = vi.hoisted(() => ({
  activeTask: null,
  stats: { focusMinutesToday: 0 },
  refreshFocus: vi.fn(),
  showToast: vi.fn(),
  nudgeFromFriend: vi.fn(),
  recordChallengeEvent: vi.fn(),
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
    setPomodoro,
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
      <button onClick={() => setPomodoro({ enabled: true })}>enable pomodoro</button>
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
  mockStore.recordChallengeEvent.mockClear();
  mockStore.refreshFocus.mockReset();
  vi.mocked(api.logSession).mockReset().mockResolvedValue({});
  vi.useRealTimers();
});

describe("persisted timer preferences", () => {
  it.each(["timer", "stopwatch"])("credits saved %s minutes even if the following refresh fails", async (mode) => {
    vi.useFakeTimers();
    mockStore.refreshFocus.mockRejectedValueOnce(new Error("read failed"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TimerProvider><Probe /></TimerProvider>);
    if (mode === "stopwatch") fireEvent.click(screen.getByText("stopwatch mode"));
    fireEvent.click(screen.getByText("start"));
    await act(async () => vi.advanceTimersByTimeAsync(mode === "timer" ? 30 * 60_000 : 3 * 60_000));
    if (mode === "stopwatch") await act(async () => fireEvent.click(screen.getByText("finish stopwatch")));
    expect(mockStore.recordChallengeEvent).toHaveBeenCalledWith("focus-session-completed");
    expect(mockStore.recordChallengeEvent).toHaveBeenCalledWith("focus-minutes", mode === "timer" ? 30 : 3);
    log.mockRestore();
  });

  it("gives no saved-minute or completion credit to a rejected session or a stopwatch too short to log", async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TimerProvider><Probe /></TimerProvider>);
    fireEvent.click(screen.getByText("stopwatch mode"));
    fireEvent.click(screen.getByText("start"));
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    await act(async () => fireEvent.click(screen.getByText("finish stopwatch")));
    expect(api.logSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("start"));
    await act(async () => vi.advanceTimersByTimeAsync(90_000));
    vi.mocked(api.logSession).mockRejectedValueOnce(new Error("write failed"));
    await act(async () => fireEvent.click(screen.getByText("finish stopwatch")));
    expect(mockStore.recordChallengeEvent.mock.calls.every(([event]) => event === "focus-started")).toBe(true);
    log.mockRestore();
  });
  it.each(["timer", "stopwatch"])("credits starting %s focus, without credit on ticks or repeated starts", (mode) => {
    vi.useFakeTimers();
    render(<TimerProvider><Probe /></TimerProvider>);
    if (mode === "stopwatch") fireEvent.click(screen.getByText("stopwatch mode"));
    expect(mockStore.recordChallengeEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("start"));
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByText("start"));
    expect(mockStore.recordChallengeEvent).toHaveBeenCalledTimes(1);
    expect(mockStore.recordChallengeEvent).toHaveBeenCalledWith("focus-started");
  });

  it("does not credit resuming a Pomodoro break", async () => {
    vi.useFakeTimers();
    render(<TimerProvider><Probe /></TimerProvider>);
    fireEvent.click(screen.getByText("enable pomodoro"));
    fireEvent.click(screen.getByText("start"));
    await act(async () => vi.advanceTimersByTimeAsync(30 * 60 * 1000));
    fireEvent.click(screen.getByText("pause"));
    mockStore.recordChallengeEvent.mockClear();
    fireEvent.click(screen.getByText("start"));
    expect(mockStore.recordChallengeEvent).not.toHaveBeenCalled();
  });
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
