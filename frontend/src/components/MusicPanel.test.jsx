// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import MusicPanel from "./MusicPanel";

const first = { provider: "youtube", id: "dQw4w9WgXcQ", label: "First mix", custom: true };
const second = { provider: "youtube", id: "M7lc1UVf-VE", label: "Second mix", custom: true };

const mockStore = vi.hoisted(() => ({
  musicOn: false,
  toggleMusic: vi.fn(),
  musicStations: [],
  activeStationKey: "youtube::dQw4w9WgXcQ",
  selectStation: vi.fn(),
  addCustomStation: vi.fn(() => true),
  removeCustomStation: vi.fn(),
  renameCustomStation: vi.fn(),
  moveCustomStation: vi.fn(),
  soundMix: {},
  setSoundLevel: vi.fn(),
  stopAllSounds: vi.fn(),
}));

vi.mock("../store", () => ({ useStore: () => mockStore }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("custom station management", () => {
  it("renames and reorders saved stations", () => {
    mockStore.musicStations = [first, second];
    render(<MusicPanel />);

    fireEvent.click(screen.getAllByLabelText("Rename station")[0]);
    fireEvent.change(screen.getByLabelText("Station name"), {
      target: { value: "Evening cottage" },
    });
    fireEvent.click(screen.getByLabelText("Save station name"));
    fireEvent.click(screen.getAllByLabelText("Move station later")[0]);

    expect(mockStore.renameCustomStation).toHaveBeenCalledWith(first, "Evening cottage");
    expect(mockStore.moveCustomStation).toHaveBeenCalledWith(first, 1);
  });
});
