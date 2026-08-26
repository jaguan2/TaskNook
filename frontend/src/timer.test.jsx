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

vi.mock("./store", () => ({ useStore: () => mockStore }));

function Probe() {
  const { focusMinutes, setFocus, chimeVolume, setChimeVolume } = useTimer();
  return (
    <div>
      <output aria-label="focus minutes">{focusMinutes}</output>
      <output aria-label="chime volume">{chimeVolume}</output>
      <button onClick={() => setFocus(52)}>custom focus</button>
      <button onClick={() => setChimeVolume(0)}>mute chime</button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  removeStored("tasknook.focusMinutes");
  removeStored("tasknook.chimeVolume");
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
});
