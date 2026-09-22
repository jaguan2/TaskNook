// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import SettingsPanel from "./SettingsPanel";

const mockStore = vi.hoisted(() => ({
  brightness: 1,
  setBrightness: vi.fn(),
  colorScheme: "plum",
  setColorScheme: vi.fn(),
  customColor: "#d98a93",
  setCustomColor: vi.fn(),
  customSurface: null,
  setCustomSurface: vi.fn(),
  motionMode: "auto",
  setMotionMode: vi.fn(),
  hudVisibility: {
    timer: "on",
    tasks: "on",
    music: "on",
    clock: "on",
    chat: "on",
  },
  setHudVisibility: vi.fn(),
  setAllHudVisibility: vi.fn(),
  autoResumeMusic: true,
  setAutoResumeMusic: vi.fn(),
}));

vi.mock("../store", () => ({ useStore: () => mockStore }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HUD visibility controls", () => {
  it("offers clear global presets and per-element show, dim, and hide actions", () => {
    render(<SettingsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Hide all" }));
    expect(mockStore.setAllHudVisibility).toHaveBeenCalledWith("hidden");

    const taskControls = screen.getByRole("group", { name: "To-do list visibility" });
    fireEvent.click(within(taskControls).getByRole("button", { name: "Dim" }));
    expect(mockStore.setHudVisibility).toHaveBeenCalledWith("tasks", "faded");

    expect(screen.getByText(/Open Settings from the left dock/)).toBeTruthy();
  });
});
