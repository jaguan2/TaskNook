// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FriendsPanel from "./FriendsPanel";

const mocks = vi.hoisted(() => ({ openGroupChat: vi.fn(), openChatWith: vi.fn(), showToast: vi.fn() }));
vi.mock("../store", () => ({ useStore: () => ({
  user: { id: 9 },
  friends: [
    { id: 1, username: "luna", displayName: "Luna", visitAccess: "open" },
    { id: 2, username: "kai", displayName: "Kai", visitAccess: "friends" },
  ],
  chats: [], friendship: {}, hudVisibility: { chat: "on" }, knockingId: null,
  ...mocks,
}) }));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("opening conversations", () => {
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
