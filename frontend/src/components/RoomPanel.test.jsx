// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const store = vi.hoisted(() => ({
  roomPlacements: [],
  roomEditMode: false,
  setRoomEditMode: vi.fn(),
  addRoomItem: vi.fn(),
  applyRoomPreset: vi.fn(),
  clearRoom: vi.fn(),
  visiting: null,
  leaveVisit: vi.fn(),
  isoPreview: true,
  setIsoPreview: vi.fn(),
  isoRoom: { w: 9, d: 7, env: "room", placements: [] },
  addIsoItem: vi.fn(),
  setIsoSize: vi.fn(),
  setIsoTile: vi.fn(),
  setIsoPartition: vi.fn(),
  resetIsoPartitions: vi.fn(),
  resetIsoShape: vi.fn(),
  setIsoEnv: vi.fn(),
  setIsoWalls: vi.fn(),
  setIsoWallColor: vi.fn(),
  setIsoLighting: vi.fn(),
  applyIsoPreset: vi.fn(),
  unlocked: [],
  unlockItem: vi.fn(),
  unlockBalance: 0,
}));

vi.mock("../store", () => ({ useStore: () => store }));

import RoomPanel from "./RoomPanel";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const presetPreviews = (container) => container.querySelectorAll("svg.h-24");
const itemPreviews = (container) => container.querySelectorAll("svg.h-9");
const floorCells = (container) => container.querySelectorAll(".cursor-crosshair");

describe("RoomPanel progressive rendering", () => {
  it("shows optimized preset previews but keeps furniture and the floor editor deferred", () => {
    const { container } = render(<RoomPanel />);

    expect(presetPreviews(container)).toHaveLength(11);
    expect(itemPreviews(container)).toHaveLength(0);
    expect(floorCells(container)).toHaveLength(0);
  });

  it("applies a visible preset in one click and draws walls through the floor editor", () => {
    const { container } = render(<RoomPanel />);

    fireEvent.click(screen.getByRole("button", { name: /shared home/i }));
    expect(store.applyIsoPreset).toHaveBeenCalledWith("home");

    fireEvent.click(screen.getByRole("button", { name: /^furniture/i }));
    expect(screen.getByRole("button", { name: /seating & beds/i })).toBeTruthy();
    expect(itemPreviews(container)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /seating & beds/i }));
    expect(itemPreviews(container).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^floor plan/i }));
    expect(floorCells(container)).toHaveLength(9 * 7);

    fireEvent.click(screen.getByRole("button", { name: /wall ↔/i }));
    fireEvent.pointerDown(floorCells(container)[0]);
    expect(store.setIsoPartition).toHaveBeenCalledWith("gy", 1, 0, true);
  });
});
