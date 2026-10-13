// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { StoreProvider, useStore } from "./store";
import { api } from "./lib/api";
import { readStored, removeStored, writeJSON, writeStored } from "./lib/storage";
import { localTodayISO } from "./lib/stats";

vi.mock("./lib/api", () => ({
  getToken: () => "test-token", setToken: vi.fn(), setReauthorizer: vi.fn(),
  api: Object.fromEntries([
    "me", "listTasks", "stats", "listFriends", "sessionDays", "listEvents", "listChats",
    "getRoom", "saveRoom", "getProfile", "saveProfile", "updateTask", "createTask", "deleteTask", "archiveTask", "reorderTasks", "renameTaskGroup", "createEvent", "deleteEvent", "addFriend", "removeFriend", "sendMessage", "openChat", "deleteChat", "friendRoom",
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
  removeStored("tasknook.character");
  removeStored("tasknook.character.dirty");
  removeStored("tasknook.progression");
  removeStored("tasknook.taskGroups");
  writeJSON("tasknook.challenges", { version: 1, day: localTodayISO(), completed: [] });
  api.me.mockResolvedValue({ user: { id: 1, username: "you" } });
  api.listTasks.mockResolvedValue([original]);
  api.stats.mockResolvedValue({ tasksTotal: 1, tasksDone: 0 });
  for (const key of ["listFriends", "listEvents", "listChats"]) api[key].mockResolvedValue([]);
  api.sessionDays.mockResolvedValue({});
  api.getRoom.mockResolvedValue({ placements: [] });
  api.saveRoom.mockResolvedValue({});
  api.getProfile.mockResolvedValue({});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function boot(expectedTasks = [original]) {
  render(<StoreProvider><Reader /></StoreProvider>);
  await waitFor(() => expect(store.tasks).toEqual(expectedTasks));
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
  it("rolls a new task back to its committed position when its refresh and a later reorder fail", async () => {
    const first = { ...original, position: 0 };
    const created = { ...original, id: 9, name: "New saved task", position: 1 };
    api.listTasks.mockResolvedValueOnce([first]);
    await boot([first]);

    api.createTask.mockResolvedValueOnce(created);
    api.listTasks.mockRejectedValueOnce(new Error("offline"));
    await act(async () => store.addTask({ name: created.name }));

    api.reorderTasks.mockRejectedValueOnce(new Error("offline"));
    await act(async () => store.reorderTasks([created, first]));

    expect(new Map(store.tasks.map(({ id, position }) => [id, position]))).toEqual(
      new Map([[1, 0], [9, 1]])
    );
    expect(store.orderedTasks.map(({ id }) => id)).toEqual([1, 9]);
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

  it("keeps a committed task-group removal when its follow-up refresh fails", async () => {
    const grouped = { ...original, group: "Work" };
    api.listTasks.mockResolvedValueOnce([grouped]);
    await boot([grouped]);
    api.renameTaskGroup.mockResolvedValueOnce({ updated: 1, name: null });
    api.listTasks.mockRejectedValueOnce(new Error("offline"));

    await act(async () => store.removeTaskGroup("Work"));

    expect(store.tasks[0].group).toBeNull();
    expect(store.taskGroups).not.toContain("Work");
    expect(store.toast.message).toBe("Tasks ungrouped, but couldn't refresh the list 🌧️");
  });

  it("keeps a committed task-group rename when its follow-up refresh fails", async () => {
    const grouped = { ...original, group: "Work" };
    api.listTasks.mockResolvedValueOnce([grouped]);
    await boot([grouped]);
    api.renameTaskGroup.mockResolvedValueOnce({ updated: 1, name: "Deep work" });
    api.listTasks.mockRejectedValueOnce(new Error("offline"));

    await act(async () => expect(store.renameTaskGroup("Work", "Deep work")).resolves.toBe(true));

    expect(store.tasks[0].group).toBe("Deep work");
    expect(store.taskGroups).toContain("Deep work");
    expect(store.taskGroups).not.toContain("Work");
    expect(store.toast.message).toBe("Task group renamed, but couldn't refresh the list 🌧️");
  });
});

describe("authoritative write results", () => {
  it("keeps a saved custom order in memory and rolls back only positions when the write fails", async () => {
    const first = { ...original, position: 0 };
    const second = { ...original, id: 2, name: "Read", position: 1 };
    api.listTasks.mockResolvedValueOnce([first, second]);
    await boot([first, second]);

    api.reorderTasks.mockResolvedValueOnce({ ok: true });
    await act(async () => store.reorderTasks([second, first]));
    expect(store.orderedTasks.map(({ id }) => id)).toEqual([2, 1]);
    expect(store.tasks.map(({ position }) => position)).toEqual([0, 1]);
    expect(api.listTasks).toHaveBeenCalledTimes(1);

    api.reorderTasks.mockRejectedValueOnce(new Error("offline"));
    await act(async () => store.reorderTasks([first, second]));
    expect(store.orderedTasks.map(({ id }) => id)).toEqual([2, 1]);
    expect(store.toast.message).toContain("Couldn't save the new order");
  });

  it("serializes overlapping reorders and lets only the newest intent settle the UI", async () => {
    const first = { ...original, position: 0 };
    const second = { ...original, id: 2, name: "Read", position: 1 };
    api.listTasks.mockResolvedValueOnce([first, second]);
    await boot([first, second]);
    const oldWrite = deferred();
    api.reorderTasks.mockReturnValueOnce(oldWrite.promise).mockResolvedValueOnce({ ok: true });

    let older;
    act(() => { older = store.reorderTasks([second, first]); });
    await waitFor(() => expect(api.reorderTasks).toHaveBeenCalledTimes(1));
    let newer;
    act(() => { newer = store.reorderTasks([first, second]); });
    expect(api.reorderTasks).toHaveBeenCalledTimes(1);
    await act(async () => { oldWrite.reject(new Error("old failed")); await older; });
    await act(async () => newer);

    expect(api.reorderTasks.mock.calls.map(([ids]) => ids)).toEqual([[2, 1], [1, 2]]);
    expect(store.orderedTasks.map(({ id }) => id)).toEqual([1, 2]);
    expect(store.toast).toBeNull();
  });

  it("restores the last server-confirmed order when overlapping reorders both fail", async () => {
    const first = { ...original, position: 0 };
    const second = { ...original, id: 2, name: "Read", position: 1 };
    api.listTasks.mockResolvedValueOnce([first, second]);
    await boot([first, second]);
    const oldWrite = deferred();
    api.reorderTasks.mockReturnValueOnce(oldWrite.promise).mockRejectedValueOnce(new Error("new failed"));

    let older;
    act(() => { older = store.reorderTasks([second, first]); });
    await waitFor(() => expect(api.reorderTasks).toHaveBeenCalledTimes(1));
    let newer;
    act(() => { newer = store.reorderTasks([first, second]); });
    await act(async () => { oldWrite.reject(new Error("old failed")); await older; });
    await act(async () => newer);

    expect(store.orderedTasks.map(({ id }) => id)).toEqual([1, 2]);
    expect(store.toast.message).toContain("Couldn't save the new order");
  });

  it("rolls a failed newer reorder back to an older reorder that did commit", async () => {
    const first = { ...original, position: 0 };
    const second = { ...original, id: 2, name: "Read", position: 1 };
    api.listTasks.mockResolvedValueOnce([first, second]);
    await boot([first, second]);
    const oldWrite = deferred();
    api.reorderTasks.mockReturnValueOnce(oldWrite.promise).mockRejectedValueOnce(new Error("new failed"));

    let older;
    act(() => { older = store.reorderTasks([second, first]); });
    await waitFor(() => expect(api.reorderTasks).toHaveBeenCalledTimes(1));
    let newer;
    act(() => { newer = store.reorderTasks([first, second]); });
    await act(async () => { oldWrite.resolve({ ok: true }); await older; });
    await act(async () => newer);

    expect(store.orderedTasks.map(({ id }) => id)).toEqual([2, 1]);
    expect(store.toast.message).toContain("Couldn't save the new order");
  });

  it("reapplies a committed reorder after an intervening task refresh", async () => {
    const first = { ...original, position: 0 };
    const second = { ...original, id: 2, name: "Read", position: 1 };
    api.listTasks.mockResolvedValueOnce([first, second]);
    await boot([first, second]);
    const write = deferred();
    api.reorderTasks.mockReturnValueOnce(write.promise);

    let reorder;
    act(() => { reorder = store.reorderTasks([second, first]); });
    await waitFor(() => expect(api.reorderTasks).toHaveBeenCalledTimes(1));
    api.listTasks.mockResolvedValueOnce([first, second]);
    await act(async () => store.refreshTasks());
    expect(store.orderedTasks.map(({ id }) => id)).toEqual([1, 2]);
    await act(async () => { write.resolve({ ok: true }); await reorder; });
    expect(store.orderedTasks.map(({ id }) => id)).toEqual([2, 1]);
  });

  it("keeps committed calendar writes and ignores an older event read", async () => {
    const existing = { id: 3, title: "Dentist", date: "2026-10-12", startTime: "09:00" };
    api.listEvents.mockResolvedValueOnce([existing]);
    await boot();
    await waitFor(() => expect(store.events).toEqual([existing]));

    const stale = deferred();
    api.listEvents.mockReturnValueOnce(stale.promise);
    let refresh;
    act(() => { refresh = store.refreshEvents(); });
    const savedEvent = { id: 4, title: "Tea", date: "2026-10-11", startTime: "15:00" };
    api.createEvent.mockResolvedValueOnce(savedEvent);
    await act(async () => expect(store.addEvent(savedEvent)).resolves.toEqual(savedEvent));
    await act(async () => { stale.resolve([existing]); await refresh; });
    expect(store.events).toEqual([savedEvent, existing]);

    api.deleteEvent.mockResolvedValueOnce({ ok: true });
    await act(async () => store.removeEvent(existing.id));
    expect(store.events).toEqual([savedEvent]);
    expect(api.listEvents).toHaveBeenCalledTimes(2);
  });

  it("keeps an archived task when the stats refresh fails", async () => {
    const completed = { ...original, completed: true, completedAt: "2026-10-11T12:00:00+00:00" };
    const archived = { ...completed, archived: true, archivedAt: "2026-10-11T13:00:00+00:00" };
    api.listTasks.mockResolvedValueOnce([completed]);
    await boot([completed]);
    api.archiveTask.mockResolvedValueOnce(archived);
    api.listTasks.mockRejectedValueOnce(new Error("offline"));

    await act(async () => expect(store.archiveTask(completed.id)).resolves.toBe(true));
    expect(store.tasks[0]).toEqual(archived);
    expect(store.toast.message).toContain("Task archived, but couldn't refresh");
  });

  it("updates events and friends from writes without letting an older full refresh erase them", async () => {
    const existingEvent = { id: 8, title: "Dentist", date: "2026-10-12", startTime: "09:00" };
    const luna = { id: 2, username: "luna", focusMinutesToday: 20 };
    const kai = { id: 3, username: "kai", focusMinutesToday: 40 };
    api.listFriends.mockResolvedValueOnce([luna]);
    api.listEvents.mockResolvedValueOnce([existingEvent]);
    await boot();
    await waitFor(() => expect(store.friends).toEqual([luna]));

    const staleFriends = deferred();
    const staleEvents = deferred();
    api.listTasks.mockResolvedValueOnce([original]);
    api.listFriends.mockReturnValueOnce(staleFriends.promise);
    api.listEvents.mockReturnValueOnce(staleEvents.promise);
    let refresh;
    act(() => { refresh = store.refreshAll(); });
    await waitFor(() => expect(api.listFriends).toHaveBeenCalledTimes(2));
    api.addFriend.mockResolvedValueOnce(kai);
    const tea = { id: 9, title: "Tea", date: "2026-10-11", startTime: "15:00" };
    api.createEvent.mockResolvedValueOnce(tea);
    await act(async () => expect(store.addFriend("kai")).resolves.toEqual(kai));
    await act(async () => expect(store.addEvent(tea)).resolves.toEqual(tea));
    await act(async () => {
      staleFriends.resolve([luna]);
      staleEvents.resolve([existingEvent]);
      await refresh;
    });
    expect(store.friends).toEqual([kai, luna]);
    expect(store.events).toEqual([tea, existingEvent]);

    api.removeFriend.mockResolvedValueOnce({ ok: true });
    await act(async () => store.removeFriend(luna.id));
    expect(store.friends).toEqual([kai]);
    expect(api.listFriends).toHaveBeenCalledTimes(2);
  });

  it("does not paint rejected event or friend writes", async () => {
    await boot();
    api.createEvent.mockRejectedValueOnce(new Error("event offline"));
    await act(async () => expect(store.addEvent({ title: "Tea" })).rejects.toThrow("event offline"));
    expect(store.events).toEqual([]);

    api.addFriend.mockRejectedValueOnce(new Error("friend offline"));
    await act(async () => expect(store.addFriend("kai")).rejects.toThrow("friend offline"));
    expect(store.friends).toEqual([]);

    const event = { id: 5, title: "Tea", date: "2026-10-11", startTime: "15:00" };
    api.listEvents.mockResolvedValueOnce([event]);
    await act(async () => store.refreshEvents());
    api.deleteEvent.mockRejectedValueOnce(new Error("delete offline"));
    await act(async () => expect(store.removeEvent(event.id)).resolves.toBe(false));
    expect(store.events).toEqual([event]);

    const friend = { id: 7, username: "sora", focusMinutesToday: 0 };
    api.addFriend.mockResolvedValueOnce(friend);
    await act(async () => store.addFriend("sora"));
    api.removeFriend.mockRejectedValueOnce(new Error("remove offline"));
    await act(async () => expect(store.removeFriend(friend.id)).rejects.toThrow("remove offline"));
    expect(store.friends).toEqual([friend]);
  });
});

describe("character save recovery", () => {
  it("replays a failed server save from the device mirror on the next launch", async () => {
    api.getProfile.mockResolvedValue({ character: { garment: "sweater" } });
    await boot();
    await waitFor(() => expect(store.character.garment).toBe("sweater"));
    api.saveProfile.mockRejectedValueOnce(new Error("offline"));

    await act(async () => expect(store.saveCharacter({ garment: "overalls" })).resolves.toBe(false));
    expect(store.character.garment).toBe("overalls");
    expect(readStored("tasknook.character.dirty")).toBe("1");
    expect(store.toast.message).toContain("still saved on this device");

    cleanup();
    api.saveProfile.mockResolvedValue({});
    await boot();
    await waitFor(() => expect(api.saveProfile).toHaveBeenLastCalledWith(expect.objectContaining({
      character: expect.objectContaining({ garment: "overalls" }),
    })));
    expect(store.character.garment).toBe("overalls");
    expect(readStored("tasknook.character.dirty")).toBeNull();
  });

  it("keeps the dirty marker until the newest queued appearance is acknowledged", async () => {
    await boot();
    const first = deferred();
    const second = deferred();
    api.saveProfile.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    let older;
    act(() => { older = store.saveCharacter({ garment: "overalls" }); });
    let newer;
    act(() => { newer = store.saveCharacter({ hair: "bob" }); });
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledTimes(1));

    await act(async () => { first.resolve({}); await older; });
    expect(readStored("tasknook.character.dirty")).toBe("1");
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledTimes(2));
    await act(async () => { second.resolve({}); await newer; });
    expect(readStored("tasknook.character.dirty")).toBeNull();
    expect(store.character).toMatchObject({ garment: "overalls", hair: "bob" });
  });

  it("keeps a failed boot recovery pending and explains that SQLite is still stale", async () => {
    writeJSON("tasknook.character", { garment: "overalls" });
    writeStored("tasknook.character.dirty", "1");
    api.getProfile.mockResolvedValueOnce({ character: { garment: "sweater" } });
    api.saveProfile.mockRejectedValueOnce(new Error("offline"));

    await boot();
    await waitFor(() => expect(store.toast?.message).toContain("Couldn't sync your saved character"));
    expect(store.character.garment).toBe("overalls");
    expect(readStored("tasknook.character.dirty")).toBe("1");
  });

  it("does not show a stale boot-recovery error over a newer successful edit", async () => {
    writeJSON("tasknook.character", { garment: "overalls" });
    writeStored("tasknook.character.dirty", "1");
    const recovery = deferred();
    const newerSave = deferred();
    api.getProfile.mockResolvedValueOnce({ character: { garment: "sweater" } });
    api.saveProfile.mockReturnValueOnce(recovery.promise).mockReturnValueOnce(newerSave.promise);
    await boot();
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledTimes(1));

    let save;
    act(() => { save = store.saveCharacter({ hair: "bob" }); });
    await act(async () => recovery.reject(new Error("old retry failed")));
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledTimes(2));
    await act(async () => { newerSave.resolve({}); await save; });

    expect(store.toast).toBeNull();
    expect(store.character).toMatchObject({ garment: "overalls", hair: "bob" });
    expect(readStored("tasknook.character.dirty")).toBeNull();
  });

  it("lets only the newest queued save decide recovery and feedback", async () => {
    await boot();
    const olderSave = deferred();
    const newerSave = deferred();
    api.saveProfile.mockReturnValueOnce(olderSave.promise).mockReturnValueOnce(newerSave.promise);
    let older;
    act(() => { older = store.saveCharacter({ garment: "overalls" }); });
    let newer;
    act(() => { newer = store.saveCharacter({ hair: "bob" }); });
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledTimes(1));

    await act(async () => { olderSave.reject(new Error("old failed")); await older; });
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledTimes(2));
    expect(store.toast).toBeNull();
    await act(async () => { newerSave.resolve({}); await newer; });
    expect(readStored("tasknook.character.dirty")).toBeNull();

    const finalSave = deferred();
    api.saveProfile.mockReturnValueOnce(finalSave.promise);
    let failed;
    act(() => { failed = store.saveCharacter({ hair: "long" }); });
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledTimes(3));
    await act(async () => { finalSave.reject(new Error("latest failed")); await failed; });
    expect(readStored("tasknook.character.dirty")).toBe("1");
    expect(store.toast.message).toContain("still saved on this device");
  });

  it("discards an orphaned marker instead of pushing a default over the server character", async () => {
    writeStored("tasknook.character.dirty", "1");
    api.getProfile.mockResolvedValueOnce({ character: { garment: "overalls" } });
    await boot();
    await waitFor(() => expect(store.character.garment).toBe("overalls"));
    expect(api.saveProfile).not.toHaveBeenCalled();
    expect(readStored("tasknook.character.dirty")).toBeNull();
  });

  it("does not claim device recovery when local storage rejects the mirror", async () => {
    await boot();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    api.saveProfile.mockRejectedValueOnce(new Error("offline"));

    await act(async () => expect(store.saveCharacter({ garment: "overalls" })).resolves.toBe(false));
    expect(store.character.garment).toBe("overalls");
    expect(store.toast.message).toContain("couldn't keep a recovery copy");
    expect(store.toast.message).not.toContain("still saved on this device");
  });

  it("does not let an older profile GET overwrite a character saved while it was loading", async () => {
    const profileRead = deferred();
    api.getProfile.mockReturnValueOnce(profileRead.promise);
    await boot();
    api.saveProfile.mockResolvedValueOnce({});
    await act(async () => store.saveCharacter({ garment: "overalls" }));
    await act(async () => {
      profileRead.resolve({ displayName: "Old profile", character: { garment: "sweater" } });
      await profileRead.promise;
    });
    await waitFor(() => expect(store.profile.displayName).toBe("Old profile"));
    expect(store.character.garment).toBe("overalls");
  });
});

describe("refresh freshness", () => {
  it("does not let an older full refresh erase newer focus stats or history", async () => {
    await boot();
    const oldStats = deferred();
    const oldDays = deferred();
    api.listTasks.mockResolvedValueOnce([original]);
    api.stats.mockReturnValueOnce(oldStats.promise).mockResolvedValueOnce({ tasksTotal: 1, focusMinutesToday: 50 });
    api.sessionDays.mockReturnValueOnce(oldDays.promise).mockResolvedValueOnce({ "2026-10-11": 50 });
    let fullRefresh;
    act(() => { fullRefresh = store.refreshAll(); });
    await waitFor(() => expect(api.stats).toHaveBeenCalledTimes(2));

    await act(async () => store.refreshFocus());
    expect(store.stats.focusMinutesToday).toBe(50);
    expect(store.sessionDays).toEqual({ "2026-10-11": 50 });
    await act(async () => {
      oldStats.resolve({ tasksTotal: 1, focusMinutesToday: 0 });
      oldDays.resolve({});
      await fullRefresh;
    });
    expect(store.stats.focusMinutesToday).toBe(50);
    expect(store.sessionDays).toEqual({ "2026-10-11": 50 });
  });

  it("does not let older task stats overwrite a newer focus refresh", async () => {
    await boot();
    const oldStats = deferred();
    api.listTasks.mockResolvedValueOnce([original]);
    api.stats.mockReturnValueOnce(oldStats.promise).mockResolvedValueOnce({ tasksTotal: 1, focusMinutesToday: 25 });
    api.sessionDays.mockResolvedValueOnce({ "2026-10-11": 25 });
    let taskRefresh;
    act(() => { taskRefresh = store.refreshTasks(); });
    await waitFor(() => expect(api.stats).toHaveBeenCalledTimes(2));

    await act(async () => store.refreshFocus());
    await act(async () => { oldStats.resolve({ tasksTotal: 1, focusMinutesToday: 0 }); await taskRefresh; });
    expect(store.stats.focusMinutesToday).toBe(25);
    expect(store.sessionDays).toEqual({ "2026-10-11": 25 });
  });

  it("does not let an older focus refresh overwrite a newer full refresh", async () => {
    await boot();
    const oldStats = deferred();
    const oldDays = deferred();
    api.listTasks.mockResolvedValueOnce([original]);
    api.stats.mockReturnValueOnce(oldStats.promise);
    api.sessionDays.mockReturnValueOnce(oldDays.promise);
    let focusRefresh;
    act(() => { focusRefresh = store.refreshFocus(); });
    await waitFor(() => expect(api.stats).toHaveBeenCalledTimes(2));

    const newestTask = { ...original, name: "Reset routine", completed: false };
    api.listTasks.mockResolvedValueOnce([newestTask]);
    api.stats.mockResolvedValueOnce({ tasksTotal: 1, focusMinutesToday: 60 });
    api.sessionDays.mockResolvedValueOnce({ "2026-10-11": 60 });
    await act(async () => store.refreshAll());
    await act(async () => {
      oldStats.resolve({ tasksTotal: 1, focusMinutesToday: 10 });
      oldDays.resolve({ "2026-10-11": 10 });
      await focusRefresh;
    });

    expect(store.tasks).toEqual([newestTask]);
    expect(store.stats.focusMinutesToday).toBe(60);
    expect(store.sessionDays).toEqual({ "2026-10-11": 60 });
  });

  it("resets daily routines before a focus refresh asks for stats", async () => {
    await boot();
    const tasks = deferred();
    api.listTasks.mockReturnValueOnce(tasks.promise);
    const statsCalls = api.stats.mock.calls.length;
    const dayCalls = api.sessionDays.mock.calls.length;
    let refresh;
    act(() => { refresh = store.refreshFocus(); });
    await Promise.resolve();
    expect(api.stats).toHaveBeenCalledTimes(statsCalls);
    expect(api.sessionDays).toHaveBeenCalledTimes(dayCalls);

    const resetRoutine = { ...original, routine: true, completed: false };
    await act(async () => { tasks.resolve([resetRoutine]); await refresh; });
    expect(api.stats).toHaveBeenCalledTimes(statsCalls + 1);
    expect(api.sessionDays).toHaveBeenCalledTimes(dayCalls + 1);
    expect(store.tasks).toEqual([resetRoutine]);
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
