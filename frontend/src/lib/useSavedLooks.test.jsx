// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useSavedLooks } from "./useSavedLooks";
import { DEFAULT_CHARACTER } from "./profile";
import { readJSON, removeStored, writeJSON } from "./storage";

beforeEach(() => removeStored("tasknook.characterLooks"));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("saved outfits", () => {
  it("persists named snapshots, updates names without duplicates and survives a remount", () => {
    const first = renderHook(() => useSavedLooks(vi.fn()));
    act(() => first.result.current.saveCharacterLook("My knits", { ...DEFAULT_CHARACTER, garment: "turtleneck" }));
    const key = first.result.current.savedLooks[0].key;
    act(() => first.result.current.saveCharacterLook("my knits", { ...DEFAULT_CHARACTER, garment: "overalls" }));
    expect(first.result.current.savedLooks).toHaveLength(1);
    expect(first.result.current.savedLooks[0]).toMatchObject({ key, label: "my knits", character: { garment: "overalls" } });
    first.unmount();
    const second = renderHook(() => useSavedLooks(vi.fn()));
    expect(second.result.current.savedLooks[0].character.garment).toBe("overalls");
    act(() => second.result.current.removeCharacterLook(key));
    expect(readJSON("tasknook.characterLooks", null)).toEqual([]);
  });
  it("cleans malformed saved definitions and reports storage failures without pretending to save", () => {
    writeJSON("tasknook.characterLooks", [{ key: "bad", label: "Broken", character: [] }]);
    const showToast = vi.fn();
    const { result } = renderHook(() => useSavedLooks(showToast));
    expect(result.current.savedLooks).toEqual([]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    act(() => expect(result.current.saveCharacterLook("Knits", DEFAULT_CHARACTER)).toBe(false));
    expect(result.current.savedLooks).toEqual([]);
    expect(showToast).toHaveBeenCalledWith("Couldn't save your outfits on this device");
  });
});
