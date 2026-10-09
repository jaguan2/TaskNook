// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { StoreProvider, useStore } from "./store";
import { api } from "./lib/api";
import { removeStored, writeJSON } from "./lib/storage";
import { localTodayISO } from "./lib/stats";

vi.mock("./lib/api", () => ({
  getToken: () => "test-token", setToken: vi.fn(), setReauthorizer: vi.fn(),
  api: Object.fromEntries([
    "me", "listTasks", "stats", "listFriends", "sessionDays", "listEvents", "listChats",
    "getRoom", "saveRoom", "getUnlocks", "getProfile", "saveProfile", "updateTask", "createTask", "deleteTask", "sendMessage", "openChat", "deleteChat", "friendRoom",
  ].map((name) => [name, vi.fn()])),
}));

let store;
function Reader() {
  store = useStore();
  return null;
}
const original = { id: 1, name: "Write notes", completed: false, completedAt: null };
const saved = { ...original, completed: true, completedAt: "2026-09-20T16:00:00+00:00" };
const doneIds = () => store.challenges.daily.filter(({ progress }) => progress === 1).map(({ id }) => id);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  removeStored("tasknook.room.dirty");
  removeStored("tasknook.progression");
  writeJSON("tasknook.challenges", { version: 1, day: localTodayISO(), completed: [] });
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

describe("profile XP", () => {
  it("backs study XP with saved history and does not repeat credit on refresh", async () => {
    api.sessionDays.mockResolvedValue({ "2026-10-01": 90 });
    await boot();
    await waitFor(() => expect(store.progression.studyXP).toBe(90));
    expect(store.progression.bonusXP).toBe(10);
    await act(async () => store.refreshAll());
    expect(store.progression.studyXP).toBe(90);
    expect(store.progression.bonusXP).toBe(10);
  });

  it("rewards manual goals once through reset/redo, with claims surviving relaunch", async () => {
    await boot();
    act(() => store.addCustomChallenge({ title: "Read", target: 1, tracking: "manual", cadence: "ongoing" }));
    const id = store.challenges.custom[0].id;
    act(() => store.advanceChallenge(id));
    expect(store.progression.bonusXP).toBe(20);
    act(() => { store.resetChallenge(id); store.advanceChallenge(id); });
    expect(store.progression.bonusXP).toBe(20);
    cleanup();
    await boot();
    act(() => { store.resetChallenge(id); store.advanceChallenge(id); });
    expect(store.progression.bonusXP).toBe(20);
  });

  it("does not grant XP for a rejected outgoing message and shares NPC credit across repeated messages", async () => {
    await boot();
    const chat = { id: 8, members: [{ id: 1 }, { id: 2, username: "luna" }] };
    api.sendMessage.mockRejectedValueOnce(new Error("failed"));
    await act(async () => store.sendChatMessage(chat, "hello"));
    expect(store.progression.bonusXP).toBe(10);
    api.sendMessage.mockResolvedValue({});
    await act(async () => store.sendChatMessage(chat, "hello"));
    expect(store.progression.bonusXP).toBe(25); // login + challenge + neighbour
    await act(async () => store.sendChatMessage(chat, "hello again"));
    expect(store.progression.bonusXP).toBe(25);
  });
});

describe("durable task writes", () => {
  it("keeps created and edited rows visible when list refreshes fail", async () => {
    await boot();
    const created = { ...original, id: 9, name: "New saved task" };
    api.createTask.mockResolvedValueOnce(created);
    api.listTasks.mockRejectedValueOnce(new Error("offline"));
    await act(async () => expect(store.addTask({ name: created.name })).resolves.toEqual(created));
    expect(store.tasks.map((task) => task.name)).toEqual([original.name, "New saved task"]);
    api.updateTask.mockResolvedValueOnce({ ...created, notes: "Saved notes" });
    api.listTasks.mockRejectedValueOnce(new Error("offline"));
    await act(async () => store.editTask(9, { notes: "Saved notes" }));
    expect(store.tasks.find((task) => task.id === 9).notes).toBe("Saved notes");
    expect(store.toast.message).toBe("Task saved, but couldn't refresh the list 🌧️");
  });
  it("keeps rejected deletions attached to the timer, but honours saved deletions even when refreshing fails", async () => {
    await boot();
    act(() => store.setActiveTaskId(1));
    api.deleteTask.mockRejectedValueOnce(new Error("offline"));
    await act(async () => store.removeTask(1));
    expect(store.tasks).toEqual([original]);
    expect(store.activeTaskId).toBe(1);
    api.deleteTask.mockResolvedValueOnce({});
    api.listTasks.mockRejectedValueOnce(new Error("offline"));
    await act(async () => store.removeTask(1));
    expect(store.tasks).toEqual([]);
    expect(store.activeTaskId).toBeNull();
    expect(store.toast.message).toBe("Task removed, but couldn't refresh the list 🌧️");
  });
});

describe("challenge action credit", () => {
  it("counts actual task creation and completion for personal goals, without credit for unchecking", async () => {
    await boot();
    act(() => {
      store.addCustomChallenge({ title: "Plan two tasks", target: 2, tracking: "task-created", cadence: "ongoing" });
      store.addCustomChallenge({ title: "Finish two tasks", target: 2, tracking: "task-completed", cadence: "daily" });
    });
    api.createTask.mockResolvedValue(original);
    await act(async () => { await store.addTask({ name: "First" }); await store.addTask({ name: "Second" }); });
    expect(store.challenges.custom[0].progress).toBe(2);
    api.updateTask.mockResolvedValueOnce(saved);
    await act(async () => store.toggleTask(original));
    expect(store.challenges.custom[1].progress).toBe(1);
    api.updateTask.mockResolvedValueOnce(original);
    await act(async () => store.toggleTask(saved));
    expect(store.challenges.custom[1].progress).toBe(1);
  });

  it("credits only accepted visits, never a refused place or an obsolete friend response", async () => {
    await boot();
    act(() => {
      store.addCustomChallenge({ title: "Visit friends", target: 2, tracking: "friend-visited", cadence: "ongoing" });
      store.addCustomChallenge({ title: "Common place", target: 2, tracking: "common-visited", cadence: "daily" });
      store.enterCommonRoom("unknown");
    });
    expect(store.challenges.custom[1].progress).toBe(0);
    const request = deferred();
    api.friendRoom.mockReturnValueOnce(request.promise);
    let visit;
    act(() => { visit = store.visitFriend({ id: 2 }); store.enterCommonRoom("willow-pond"); });
    await act(async () => { request.resolve({ id: 2, username: "kai" }); await visit; });
    expect(store.challenges.custom.map(({ progress }) => progress)).toEqual([0, 1]);
    api.friendRoom.mockResolvedValueOnce({ id: 2, username: "kai" });
    await act(async () => store.visitFriend({ id: 2 }));
    expect(store.challenges.custom.map(({ progress }) => progress)).toEqual([1, 1]);
  });

  it("gives feedback for an invalid personal goal instead of losing the draft silently", async () => {
    await boot();
    act(() => expect(store.addCustomChallenge({ title: " ", target: 1, cadence: "daily", tracking: "manual" })).toBe(false));
    expect(store.toast.message).toContain("Give your challenge a name");
    expect(store.challenges.custom).toEqual([]);
  });

  it("does not count bootstrap, optimistic toggles or rejected saves", async () => {
    await boot();
    expect(doneIds()).toEqual([]);
    const request = deferred();
    api.updateTask.mockReturnValueOnce(request.promise);
    let toggle;
    act(() => { toggle = store.toggleTask(original); });
    expect(doneIds()).toEqual([]);
    await act(async () => { request.reject(new Error("failed")); await toggle; });
    expect(doneIds()).toEqual([]);
    api.updateTask.mockRejectedValueOnce(new Error("failed"));
    await act(async () => store.editTask(1, { notes: "draft" }));
    expect(doneIds()).toEqual([]);
    api.createTask.mockRejectedValueOnce(new Error("failed"));
    await act(async () => { await expect(store.addTask({ name: "new" })).rejects.toThrow("failed"); });
    expect(doneIds()).toEqual([]);
  });

  it.each(["add", "edit", "toggle"])("counts a saved %s even when its later refresh fails", async (action) => {
    await boot();
    api.createTask.mockResolvedValue(original);
    api.updateTask.mockResolvedValue(saved);
    api.listTasks.mockRejectedValueOnce(new Error("refresh failed"));
    await act(async () => {
      if (action === "add") await expect(store.addTask({ name: "new" })).resolves.toEqual(original);
      else if (action === "edit") await store.editTask(1, { notes: "saved" });
      else await store.toggleTask(original);
    });
    expect(doneIds()).toEqual(["update-todos"]);
  });

  it("counts an outgoing friend message only after the send succeeds", async () => {
    await boot();
    const chat = { id: 8, members: [{ id: 1 }, { id: 2, username: "luna" }] };
    api.sendMessage.mockRejectedValueOnce(new Error("failed"));
    await act(async () => { expect(await store.sendChatMessage(chat, "hello")).toBe(false); });
    expect(doneIds()).toEqual([]);
    api.sendMessage.mockResolvedValue({});
    await act(async () => store.sendChatMessage(chat, "hello"));
    expect(doneIds()).toEqual(["talk-to-friend"]);
  });
});

describe("common-place sessions", () => {
  it.each([
    ["common-cottage", "window-right", "window-left"],
    ["willow-pond", "pond-bench-right", "pond-bench-left"],
    ["grand-library", "gallery-right", "gallery-left"],
  ])("enters %s, changes seats and leaves without changing the home or saving it", async (place, freeSeat, occupiedSeat) => {
    await boot();
    const home = store.isoRoom;
    const homeWrites = api.saveRoom.mock.calls.length;
    act(() => store.enterCommonRoom(place));
    expect(store.activePlace.kind).toBe("common");
    act(() => store.chooseCommonSeat(freeSeat));
    expect(store.commonRoom.guestSeatId).toBe(freeSeat);
    act(() => store.chooseCommonSeat(occupiedSeat));
    expect(store.commonRoom.guestSeatId).toBe(freeSeat);
    expect(store.toast.message).toContain("already taken");
    act(() => store.leaveVisit());
    expect(store.activePlace.kind).toBe("home");
    expect(store.commonRoom).toBeNull();
    expect(store.isoRoom).toBe(home);
    expect(api.saveRoom.mock.calls.length).toBe(homeWrites);
  });
  it("does not let a stale friend-room response replace the common place", async () => {
    await boot();
    const pending = deferred();
    api.friendRoom.mockReturnValue(pending.promise);
    let visit;
    act(() => { visit = store.visitFriend({ id: 2 }); });
    act(() => store.enterCommonRoom("common-cottage"));
    await act(async () => { pending.resolve({ id: 2, username: "kai" }); await visit; });
    expect(store.visiting).toBeNull();
    expect(store.commonRoom.sceneId).toBe("common-cottage");
  });
  it("ignores an old friend-room failure after choosing a new destination", async () => {
    await boot();
    const pending = deferred();
    api.friendRoom.mockReturnValue(pending.promise);
    let visit;
    act(() => { visit = store.visitFriend({ id: 2 }); });
    act(() => store.enterCommonRoom("willow-pond"));
    const toast = store.toast;
    await act(async () => { pending.reject(new Error("old request failed")); await visit; });
    expect(store.activePlace).toEqual({ kind: "common", id: "willow-pond" });
    expect(store.toast).toBe(toast);
  });
  it("still gives feedback when the current friend-room request fails", async () => {
    await boot();
    api.friendRoom.mockRejectedValueOnce(new Error("current request failed"));
    await act(async () => { expect(await store.visitFriend({ id: 2 })).toBe(false); });
    expect(store.activePlace.kind).toBe("home");
    expect(store.toast.message).toContain("Couldn't visit");
    expect(store.toast.message).toContain("current request failed");
  });
  it("switches between common places without touching the saved home", async () => {
    await boot();
    const home = store.isoRoom;
    const homeWrites = api.saveRoom.mock.calls.length;
    act(() => store.enterCommonRoom("common-cottage"));
    act(() => store.enterCommonRoom("willow-pond"));
    expect(store.activePlace).toEqual({ kind: "common", id: "willow-pond" });
    expect(store.commonRoom.guestSeatId).toBe("patio-right");
    expect(store.isoRoom).toBe(home);
    expect(api.saveRoom.mock.calls.length).toBe(homeWrites);
  });
});

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
