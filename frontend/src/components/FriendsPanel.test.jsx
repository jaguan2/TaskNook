// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FriendsPanel from "./FriendsPanel";

const mocks = vi.hoisted(() => ({ enterCommonRoom: vi.fn(), openGroupChat: vi.fn(), openChatWith: vi.fn(), addFriend: vi.fn(), removeFriend: vi.fn(), refreshChats: vi.fn(), chatsError: false }));
vi.mock("../store", () => {
  const useMockStore = () => ({
    user: { id: 9, username: "you", displayName: "Taylor", avatar: "🌿" },
    sessionDays: { "2026-10-11": 45 },
    friends: [
      { id: 1, username: "luna", displayName: "Luna", visitAccess: "open" },
      { id: 2, username: "kai", displayName: "Kai", visitAccess: "friends" },
    ],
    chats: [], friendship: {}, hudVisibility: { chat: "on" }, knockingId: null,
    ...mocks,
  });
  return {
    useSystemStore: useMockStore,
    useTaskStore: useMockStore,
    useSettingsStore: useMockStore,
    useSocialStore: useMockStore,
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.chatsError = false;
  mocks.commonRoom = null;
  mocks.commonPresence = undefined;
  mocks.addFriend.mockResolvedValue({ id: 3, username: "sora" });
  mocks.removeFriend.mockResolvedValue(true);
});
afterEach(cleanup);

describe("opening conversations", () => {
  it("includes the week-to-date study leaderboard", () => {
    render(<FriendsPanel />);
    expect(screen.getByRole("heading", { name: "Weekly study" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Weekly study" })).toBeTruthy();
  });

  it("uses store-owned friend writes and clears a committed add", async () => {
    render(<FriendsPanel />);
    const input = screen.getByLabelText("Friend username");
    fireEvent.change(input, { target: { value: "Sora" } });
    fireEvent.click(screen.getByLabelText("Add friend"));
    await waitFor(() => expect(input.value).toBe(""));
    expect(mocks.addFriend).toHaveBeenCalledWith("sora");

    fireEvent.click(screen.getAllByLabelText("Remove friend")[0]);
    fireEvent.click(screen.getByText("sure?"));
    expect(mocks.removeFriend).toHaveBeenCalledWith(1);
  });

  it("names everyone in each common place before joining", () => {
    render(<FriendsPanel />);
    const cottage = screen.getByRole("button", { name: /Common Cottage/ });
    expect(cottage.textContent).toContain("Here now");
    expect(cottage.textContent).toContain("Kai");
    expect(cottage.textContent).toContain("Luna");
    expect(cottage.textContent).toContain("Sora");
    expect(cottage.textContent).toContain("3 open seats");
    const library = screen.getByRole("button", { name: /Grand Library/ });
    expect(within(library).getAllByTitle(/^@/).map((person) => person.textContent)).toEqual([
      "Kai", "Luna", "Sora", "Mochi", "Ivy", "Theo", "Fern", "Robin", "Nico", "Aria", "Jun", "Hazel",
    ]);
    expect(library.textContent).toContain("24 open seats");
    fireEvent.click(cottage);
    fireEvent.click(library);
    fireEvent.click(screen.getByRole("button", { name: /Willow Pond/ }));
    expect(mocks.enterCommonRoom.mock.calls).toEqual([["common-cottage"], ["grand-library"], ["willow-pond"]]);
  });
  it("includes you in the attendee list after joining", () => {
    mocks.commonRoom = { sceneId: "common-cottage" };
    render(<FriendsPanel />);
    const cottage = screen.getByRole("button", { name: /Common Cottage/ });
    expect(cottage.textContent).toContain("You");
    expect(cottage.textContent).toContain("2 open seats");
    expect(cottage.textContent).toContain("Here");
    expect(cottage.disabled).toBe(true);
  });
  it("shows the store-owned live population before joining", () => {
    mocks.commonPresence = {
      "common-cottage": {
        occupants: [
          { username: "ivy", label: "Ivy" },
          { username: "theo", label: "Theo" },
        ],
      },
    };
    render(<FriendsPanel />);
    const cottage = screen.getByRole("button", { name: /Common Cottage/ });
    expect(cottage.textContent).toContain("Ivy");
    expect(cottage.textContent).toContain("Theo");
    expect(cottage.textContent).not.toContain("Kai");
    expect(cottage.textContent).toContain("4 open seats");
  });
  it("offers a retry when the conversation list could not load", () => {
    mocks.chatsError = true;
    render(<FriendsPanel />);
    expect(screen.getByRole("alert").textContent).toContain("Couldn't refresh conversations");
    fireEvent.click(screen.getByRole("button", { name: "Retry conversations" }));
    expect(mocks.refreshChats).toHaveBeenCalledTimes(1);
  });
  it("starts a group only once and preserves the picks when creation fails", async () => {
    let resolve;
    mocks.openGroupChat.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<FriendsPanel />);
    fireEvent.click(screen.getByText("＋ New"));
    fireEvent.click(screen.getByRole("button", { name: "Luna" }));
    fireEvent.click(screen.getByRole("button", { name: "Kai" }));
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Evening study" } });
    const start = screen.getByRole("button", { name: "Start with 2 friends" });
    fireEvent.click(start);
    fireEvent.click(start);
    expect(mocks.openGroupChat).toHaveBeenCalledTimes(1);
    expect(mocks.openGroupChat).toHaveBeenCalledWith([1, 2], "Evening study");
    expect(screen.getByLabelText("Back to friends").disabled).toBe(true);
    await act(async () => resolve(null));
    expect(screen.getByLabelText("Group name").value).toBe("Evening study");
    expect(screen.getByRole("button", { name: "Start with 2 friends" }).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Luna" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("does not race two different friend opens", async () => {
    let resolve;
    mocks.openChatWith.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<FriendsPanel />);
    fireEvent.click(screen.getByTitle("Message Luna"));
    fireEvent.click(screen.getByTitle("Message Kai"));
    expect(mocks.openChatWith).toHaveBeenCalledTimes(1);
    await act(async () => resolve(null));
    expect(screen.getByTitle("Message Kai").disabled).toBe(false);
  });
});
