// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { StoreProvider, useStore } from "./store";
import { api } from "./lib/api";
import { removeStored } from "./lib/storage";

vi.mock("./lib/api", () => ({
  getToken: () => "test-token", setToken: vi.fn(), setReauthorizer: vi.fn(),
  api: Object.fromEntries([
    "me", "listTasks", "stats", "listFriends", "sessionDays", "listEvents", "listChats",
    "getRoom", "saveRoom", "getUnlocks", "getProfile", "saveProfile", "updateTask", "openChat", "deleteChat",
  ].map((name) => [name, vi.fn()])),
}));

let store;
function Reader() {
  store = useStore();
  return null;
}
const original = { id: 1, name: "Write notes", completed: false, completedAt: null };
const saved = { ...original, completed: true, completedAt: "2026-09-20T16:00:00+00:00" };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  removeStored("tasknook.room.dirty");
  api.me.mockResolvedValue({ user: { id: 1, username: "you" } });
  api.listTasks.mockResolvedValue([original]);
  api.stats.mockResolvedValue({ tasksTotal: 1, tasksDone: 0 });
  for (const key of ["listFriends", "listEvents", "listChats"]) api[key].mockResolvedValue([]);
  api.sessionDays.mockResolvedValue({});
  api.getRoom.mockResolvedValue({ placements: [] });
  api.saveRoom.mockResolvedValue({});
  api.getUnlocks.mockResolvedValue({ unlocked: [] });
  api.getProfile.mockResolvedValue({});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function boot() {
  render(<StoreProvider><Reader /></StoreProvider>);
  await waitFor(() => expect(store.tasks).toEqual([original]));
}

describe("task completion durability", () => {
  it("does not let an older refresh erase another task's completed save", async () => {
    await boot();
    const second = { ...original, id: 2, name: "Read a chapter" };
    api.listTasks.mockResolvedValue([original, second]);
    await act(async () => store.refreshTasks());
    const oldRead = deferred();
    api.updateTask.mockResolvedValueOnce(saved);
    api.listTasks.mockReturnValueOnce(oldRead.promise);
    let firstToggle;
    await act(async () => { firstToggle = store.toggleTask(original); });
    const secondSaved = { ...second, completed: true, completedAt: saved.completedAt };
    api.updateTask.mockResolvedValueOnce(secondSaved);
    api.listTasks.mockResolvedValueOnce([saved, secondSaved]);
    await act(async () => store.toggleTask(second));
    await act(async () => { oldRead.resolve([saved, second]); await firstToggle; });
    expect(store.tasks).toEqual([saved, secondSaved]);
  });

  it("keeps another pending checkbox visible during a background refresh", async () => {
    await boot();
    const request = deferred();
    api.updateTask.mockReturnValue(request.promise);
    let toggle;
    act(() => { toggle = store.toggleTask(original); });
    await act(async () => store.refreshTasks());
    expect(store.tasks[0].completed).toBe(true);
    api.listTasks.mockResolvedValue([saved]);
    await act(async () => { request.resolve(saved); await toggle; });
    expect(store.tasks[0]).toEqual(saved);
  });

  it("keeps a committed checkmark if refreshing the list fails", async () => {
    await boot();
    api.updateTask.mockResolvedValue(saved);
    api.listTasks.mockRejectedValueOnce(new Error("read failed"));
    await act(async () => store.toggleTask(original));
    expect(store.tasks[0]).toEqual(saved);
    expect(store.toast.message).toContain("Task saved");
  });

  it("keeps the saved timestamp when only the stats refresh fails", async () => {
    await boot();
    api.updateTask.mockResolvedValue(saved);
    api.listTasks.mockResolvedValue([saved]);
    api.stats.mockRejectedValueOnce(new Error("stats failed"));
    await act(async () => store.toggleTask(original));
    expect(store.tasks[0]).toEqual(saved);
  });

  it("paints immediately, ignores duplicate taps, and rolls back a rejected write", async () => {
    await boot();
    const request = deferred();
    api.updateTask.mockReturnValue(request.promise);
    let completion;
    act(() => { completion = store.toggleTask(original); });
    expect(store.tasks[0].completed).toBe(true);
    await act(async () => store.toggleTask(store.tasks[0]));
    expect(api.updateTask).toHaveBeenCalledTimes(1);
    await act(async () => { request.reject(new Error("write failed")); await completion; });
    expect(store.tasks[0]).toEqual(original);
    expect(store.toast.message).toContain("Couldn't save");
    api.updateTask.mockResolvedValue(saved);
    api.listTasks.mockResolvedValue([saved]);
    await act(async () => store.toggleTask(original));
    expect(api.updateTask).toHaveBeenCalledTimes(2);
    expect(store.tasks[0]).toEqual(saved);
  });
});

describe("conversation list recovery", () => {
  const chat = { id: 8, members: [{ id: 1 }, { id: 2, username: "luna" }], unread: 0 };
  it("opens the saved thread without waiting for a slow roster refresh", async () => {
    await boot();
    const read = deferred();
    api.openChat.mockResolvedValue(chat);
    api.listChats.mockReturnValueOnce(read.promise);
    let opened;
    await act(async () => { opened = await store.openChatWith({ id: 2 }); });
    expect(opened).toEqual(chat);
    expect(store.chats).toEqual([chat]);
    await act(async () => read.resolve([chat]));
  });
  it("keeps a newly opened chat available even if refreshing the list fails", async () => {
    await boot();
    api.openChat.mockResolvedValue(chat);
    api.listChats.mockRejectedValueOnce(new Error("read failed"));
    let opened;
    await act(async () => { opened = await store.openChatWith({ id: 2 }); });
    expect(opened).toEqual(chat);
    expect(store.chats).toEqual([chat]);
    expect(store.chatsError).toBe(true);
    api.listChats.mockResolvedValue([chat]);
    await act(async () => store.refreshChats());
    expect(store.chatsError).toBe(false);
  });

  it("does not resurrect a deleted conversation from a delayed list response", async () => {
    await boot();
    api.listChats.mockResolvedValue([chat]);
    await act(async () => store.refreshChats());
    const read = deferred();
    api.listChats.mockReturnValueOnce(read.promise);
    let refresh;
    act(() => { refresh = store.refreshChats(); });
    api.deleteChat.mockResolvedValue({ ok: true });
    api.listChats.mockRejectedValueOnce(new Error("offline"));
    await act(async () => store.deleteChat(chat.id));
    await act(async () => { read.resolve([chat]); await refresh; });
    expect(store.chats).toEqual([]);
  });
});
