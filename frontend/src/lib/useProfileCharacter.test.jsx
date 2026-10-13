// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProfileCharacter } from "./useProfileCharacter";
import { removeStored, writeJSON, writeStored } from "./storage";
import { api } from "./api";

vi.mock("./api", () => ({ api: { getProfile: vi.fn(), saveProfile: vi.fn() } }));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  removeStored("tasknook.character");
  removeStored("tasknook.character.dirty");
  api.getProfile.mockResolvedValue({ displayName: "You", profile: {}, character: {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const mount = (showToast = vi.fn()) => renderHook(
  ({ user }) => useProfileCharacter({ user, showToast }),
  { initialProps: { user: { id: 1 } } }
);

describe("profile and resident persistence", () => {
  it("serializes rapid profile patches and merges each onto the optimistic snapshot", async () => {
    const first = deferred();
    api.saveProfile.mockReturnValueOnce(first.promise).mockResolvedValueOnce({});
    const { result } = mount();
    await waitFor(() => expect(result.current.profile.displayName).toBe("You"));

    let nameSave, bioSave;
    act(() => {
      nameSave = result.current.saveProfile({ displayName: "Nora" });
      bioSave = result.current.saveProfile({ bio: "Late-night study" });
    });
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledTimes(1));
    await act(async () => { first.resolve({}); await nameSave; });
    await act(async () => bioSave);

    expect(api.saveProfile.mock.calls[1][0]).toEqual({
      displayName: "Nora",
      profile: { bio: "Late-night study" },
    });
    expect(result.current.profile).toMatchObject({ displayName: "Nora", bio: "Late-night study" });
  });

  it("does not report an obsolete profile failure after a newer merged snapshot saves", async () => {
    const first = deferred();
    const showToast = vi.fn();
    api.saveProfile.mockReturnValueOnce(first.promise).mockResolvedValueOnce({});
    const { result } = mount(showToast);
    await waitFor(() => expect(result.current.profile.displayName).toBe("You"));

    let nameSave, bioSave;
    act(() => {
      nameSave = result.current.saveProfile({ displayName: "Nora" });
      bioSave = result.current.saveProfile({ bio: "Late-night study" });
    });
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledTimes(1));
    await act(async () => {
      first.reject(new Error("older write failed"));
      await nameSave;
    });
    await act(async () => bioSave);

    expect(showToast).not.toHaveBeenCalled();
    expect(result.current.profile).toMatchObject({ displayName: "Nora", bio: "Late-night study" });
  });

  it("returns the newest optimistic resident identity while its save is still pending", async () => {
    const pending = deferred();
    api.saveProfile.mockReturnValueOnce(pending.promise);
    const { result } = mount();
    await waitFor(() => expect(result.current.profile.displayName).toBe("You"));

    let save;
    act(() => { save = result.current.saveCharacter({ hair: "bob" }); });
    expect(result.current.getResidentIdentity("fallback")).toMatchObject({
      name: "You",
      character: { hair: "bob" },
    });
    await act(async () => { pending.resolve({}); await save; });
  });

  it("does not let an older profile GET repaint a name saved while it was loading", async () => {
    const read = deferred();
    api.getProfile.mockReturnValueOnce(read.promise);
    api.saveProfile.mockResolvedValueOnce({});
    const { result } = mount();

    await act(async () => result.current.saveProfile({ displayName: "Nora" }));
    await act(async () => {
      read.resolve({ displayName: "Old name", profile: {}, character: {} });
      await read.promise;
    });
    expect(result.current.profile.displayName).toBe("Nora");
    expect(result.current.getResidentIdentity("fallback").name).toBe("Nora");
  });

  it("replays a marked device mirror before accepting an older server character", async () => {
    writeJSON("tasknook.character", { garment: "overalls" });
    writeStored("tasknook.character.dirty", "1");
    api.getProfile.mockResolvedValueOnce({ displayName: "You", character: { garment: "sweater" } });
    api.saveProfile.mockResolvedValueOnce({});
    const { result } = mount();

    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledWith(expect.objectContaining({
      character: expect.objectContaining({ garment: "overalls" }),
    })));
    expect(result.current.character.garment).toBe("overalls");
  });
});
