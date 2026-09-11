// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const store = vi.hoisted(() => ({
  roomPlacements: [],
  cottageView: "city",
  setCottageView: vi.fn(),
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
  setIsoArch: vi.fn(),
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
import { ISO_PRESET_KEYS } from "../lib/isoRoom";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  store.isoPreview = true;
});

const presetPreviews = (container) => container.querySelectorAll("svg.h-24");
const itemPreviews = (container) => container.querySelectorAll("svg.h-9");
const floorCells = (container) => container.querySelectorAll(".cursor-crosshair");

describe("RoomPanel progressive rendering", () => {
  it("previews cottage layouts with independent paint definitions and applies a preset", () => {
    store.isoPreview = false;
    const { container } = render(<RoomPanel />);
    expect(container.querySelectorAll(".cottage-preview")).toHaveLength(6);
    const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const node of container.querySelectorAll("[fill], [clip-path]")) {
      const value = node.getAttribute("fill") || node.getAttribute("clip-path");
      if (value?.startsWith("url(#")) expect(ids).toContain(value.slice(5, -1));
    }
    fireEvent.click(screen.getByRole("button", { name: "Woodland nook" }));
    expect(store.applyRoomPreset).toHaveBeenCalledWith("reading");
    fireEvent.click(screen.getByRole("button", { name: "Seaside" }));
    expect(store.setCottageView).toHaveBeenCalledWith("coast");
  });

  it("finds cottage furniture by name and explains an empty search", () => {
    store.isoPreview = false;
    render(<RoomPanel />);
    const search = screen.getByRole("textbox", { name: "Search cottage decorations" });
    fireEvent.change(search, { target: { value: "  READING  " } });
    fireEvent.click(screen.getByRole("button", { name: /reading chair/i }));
    expect(store.addRoomItem).toHaveBeenCalledWith("armchair");
    expect(screen.queryByRole("button", { name: /tea table/i })).toBeNull();
    fireEvent.change(search, { target: { value: "no-such-piece" } });
    expect(screen.getByText(/no matching decorations/i)).toBeTruthy();
  });
  it("shows optimized preset previews but keeps furniture and the floor editor deferred", () => {
    const { container } = render(<RoomPanel />);

    expect(presetPreviews(container)).toHaveLength(ISO_PRESET_KEYS.length);
    expect(container.querySelectorAll('[data-exterior-wall="cutaway"]')).not.toHaveLength(0);
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

    fireEvent.click(screen.getByRole("button", { name: /arch ↕/i }));
    fireEvent.pointerDown(floorCells(container)[0]);
    expect(store.setIsoArch).toHaveBeenCalledWith("gx", 1, 0, true);
  });

  it("marks floor tiles occupied by furniture before reshaping", () => {
    store.isoRoom = {
      w: 3,
      d: 3,
      env: "room",
      placements: [{ id: "seat", item: "stool", gx: 0.5, gy: 0.5 }],
    };
    const { container } = render(<RoomPanel />);
    fireEvent.click(screen.getByRole("button", { name: /^floor plan/i }));

    const occupied = container.querySelectorAll('[data-occupied="true"]');
    expect(occupied).toHaveLength(4);
    expect(occupied[0].getAttribute("title")).toMatch(/occupied by stool/i);
    const footprint = container.querySelector('[data-footprint="stool"]');
    expect(footprint).toBeTruthy();
    expect(floorCells(container)).toHaveLength(9);
    expect(footprint.style.gridColumn).toBe("1 / span 2");
    expect(footprint.style.gridRow).toBe("1 / span 2");
    expect(footprint.closest('[data-floor-plan-layer]')?.dataset.floorPlanLayer).toBe(
      "footprints",
    );
    expect(
      floorCells(container)[0].closest('[data-floor-plan-layer]')?.dataset.floorPlanLayer,
    ).toBe("cells");

    store.isoRoom = { w: 9, d: 7, env: "room", placements: [] };
  });
});
