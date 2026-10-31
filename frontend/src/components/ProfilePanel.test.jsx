// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { DEFAULT_CHARACTER } from "../lib/profile";

const store = vi.hoisted(() => ({
  progression: { level: 1, xp: 0 },
  selfInRoom: true,
  setSelfInRoom: vi.fn(),
  profile: {},
  character: null,
  saveProfile: vi.fn(),
  saveCharacter: vi.fn(),
  savedLooks: [],
  saveCharacterLook: vi.fn(),
  removeCharacterLook: vi.fn(),
  user: { visitAccess: "friends" },
  setVisitAccess: vi.fn(),
  isoRoom: { placements: [] },
  setPetIdentity: vi.fn(),
  addIsoItem: vi.fn(),
  removeIsoItem: vi.fn(),
}));

vi.mock("../store", () => ({
  useProfileStore: () => store,
  useTaskStore: () => store,
  useSystemStore: () => store,
  useSocialStore: () => store,
  useRoomStore: () => store,
}));
vi.mock("./IsoItems", () => ({ ISO_SPRITES: { resident: () => <g data-testid="resident" /> } }));
vi.mock("./LevelCard", () => ({ default: () => <div data-testid="level-card" /> }));
vi.mock("./SavedCharacterLooks", () => ({ default: () => <div data-testid="saved-looks" /> }));
vi.mock("./CharacterPresets", () => ({ default: () => <div data-testid="character-presets" /> }));
vi.mock("./ProfilePetsSection", () => ({ default: () => <div data-testid="profile-pets" /> }));

import ProfilePanel from "./ProfilePanel";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProfilePanel character editor wiring", () => {
  it("switches editor categories and sends character choices through the store", () => {
    store.character = { ...DEFAULT_CHARACTER };
    render(<ProfilePanel />);

    fireEvent.click(screen.getByRole("tab", { name: "Body" }));
    const model = screen.getByRole("group", { name: "Model" });
    expect(screen.getByRole("slider", { name: /Body width/ })).toBeTruthy();
    fireEvent.click(within(model).getByRole("button", { name: "Girl" }));
    expect(store.saveCharacter).toHaveBeenCalledWith({ model: "fem" });

    fireEvent.click(screen.getByRole("tab", { name: "Face" }));
    expect(screen.getByRole("group", { name: "Eye color" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /Eye spacing/ })).toBeTruthy();
  });
});
