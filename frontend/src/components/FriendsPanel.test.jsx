// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import FriendsPanel from "./FriendsPanel";

const mocks = vi.hoisted(() => ({ enterCommonRoom: vi.fn(), visitFriend: vi.fn(), knockFriend: vi.fn(), openGroupChat: vi.fn(), openChatWith: vi.fn(), addFriend: vi.fn(), removeFriend: vi.fn(), refreshChats: vi.fn(), chatsError: false }));
// jsdom has no modal API. Only emulate open/close here; the native browser
// journey verifies top-layer placement, inertness, focus and Escape behavior.
const dialogMethods = Object.fromEntries(['showModal', 'close'].map(name =>
  [name, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name)]));
beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() { this.open = true; } },
    close: { configurable: true, value() { this.open = false; } },
  });
});
afterAll(() => {
  for (const [name, descriptor] of Object.entries(dialogMethods)) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else delete HTMLDialogElement.prototype[name];
  }
});
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
  mocks.friendship = {};
  mocks.addFriend.mockResolvedValue({ id: 3, username: "sora" });
  mocks.removeFriend.mockResolvedValue(true);
});
afterEach(cleanup);

describe('neighbour profiles', () => {
  it('uses a card-sized profile control with separate action buttons and personal level progress', () => {
    mocks.friendship = { luna: 60, kai: 60 };
    render(<FriendsPanel />);
    const trigger = screen.getByRole('button', { name: "View Luna's profile" });
    const card = trigger.closest('[data-friend-card]');
    expect(card.querySelectorAll('button button')).toHaveLength(0);
    const meter = within(card).getByRole('progressbar', { name: 'Luna friendship' });
    expect(meter.getAttribute('data-friendship-level')).toBe('2');
    expect(within(card).getByText('35 / 55')).toBeTruthy();
    const kai = screen.getByRole('button', { name: "View Kai's profile" }).closest('[data-friend-card]');
    expect(within(kai).getByRole('progressbar').getAttribute('data-friendship-level')).toBe('3');
    fireEvent.click(within(card).getByRole('button', { name: 'Remove friend' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(trigger);
    const popup = screen.getByRole('dialog');
    expect(within(popup).getByRole('progressbar').getAttribute('data-friendship-level')).toBe('2');
    expect(within(popup).getByText('Takes time to open up, then grows closer more quickly.')).toBeTruthy();
  });

  it('opens profiles in a separate dialog without expanding the row or starting another action', () => {
    render(<FriendsPanel />);
    const luna = screen.getByRole('button', { name: "View Luna's profile" });
    fireEvent.click(luna);
    expect(luna.getAttribute('aria-expanded')).toBe('true');
    expect(luna.getAttribute('aria-haspopup')).toBe('dialog');
    const details = screen.getByRole('dialog', { name: 'About Luna' });
    expect(details.parentElement).toBe(document.body);
    expect(details.closest('.group')).toBeNull();
    expect(details.id).toBe(luna.getAttribute('aria-controls'));
    expect(within(details).getByText('October 12, 1997')).toBeTruthy();
    expect(within(details).getByText('she/her')).toBeTruthy();
    expect(within(details).getByText('September 18, 2023')).toBeTruthy();
    expect(within(details).getByText('Focus this week')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: "Close Luna's profile" }));
    fireEvent.click(screen.getByRole('button', { name: "View Kai's profile" }));
    expect(screen.queryByRole('dialog', { name: 'About Luna' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'About Kai' })).toBeTruthy();
    expect(mocks.visitFriend).not.toHaveBeenCalled();
    expect(mocks.openChatWith).not.toHaveBeenCalled();
    expect(mocks.enterCommonRoom).not.toHaveBeenCalled();
  });

  it('closes with Escape or Close and returns focus to the profile trigger', () => {
    render(<FriendsPanel />);
    const trigger = screen.getByRole('button', { name: "View Luna's profile" });
    fireEvent.click(trigger);
    // Escape's native dialog default dispatches cancel; actual key handling and
    // focus containment are covered in the real-browser profile journey.
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog', { name: 'About Luna' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: "Close Luna's profile" }));
    expect(screen.queryByRole('dialog', { name: 'About Luna' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe("opening conversations", () => {
  it("opens on friends and keeps the three destinations mutually exclusive", () => {
    render(<FriendsPanel />);
    const friends = screen.getByRole("button", { name: "Friends" });
    const places = screen.getByRole("button", { name: "Places" });
    const weekly = screen.getByRole("button", { name: "Weekly" });
    expect(friends.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Friend username")).toBeTruthy();

    fireEvent.click(places);
    expect(places.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByLabelText("Friend username")).toBe(null);
    expect(screen.getByRole("button", { name: /Common Cottage/ })).toBeTruthy();

    fireEvent.click(weekly);
    expect(weekly.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: /Common Cottage/ })).toBe(null);
    expect(screen.getByRole("heading", { name: "Weekly study" })).toBeTruthy();
  });

  it("includes the week-to-date study leaderboard", () => {
    render(<FriendsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Places" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Places" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Places" }));
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
