// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatThread from "./ChatThread";

const mocks = vi.hoisted(() => ({
  chatMessages: vi.fn(), sendChatMessage: vi.fn(), markChatRead: vi.fn(),
  deleteChat: vi.fn(), listeners: new Map(),
}));
vi.mock("../lib/api", () => ({ api: { chatMessages: mocks.chatMessages } }));
const subscribeChat = (id, fn) => {
  mocks.listeners.set(id, fn);
  return () => mocks.listeners.delete(id);
};
vi.mock("../store", () => ({ useStore: () => ({
  user: { id: 1 }, sendChatMessage: mocks.sendChatMessage,
  markChatRead: mocks.markChatRead, deleteChat: mocks.deleteChat, subscribeChat,
}) }));
const chat = { id: 8, members: [{ id: 1, displayName: "You" }, { id: 2, username: "luna", displayName: "Luna" }] };
const message = (id, body) => ({ id, body, senderId: 2, createdAt: new Date().toISOString() });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.listeners.clear();
  mocks.chatMessages.mockResolvedValue([]);
  mocks.sendChatMessage.mockResolvedValue(true);
});
afterEach(cleanup);

describe("chat delivery and recovery", () => {
  it("shows pending names without refetching messages for a status-only update", async () => {
    render(<ChatThread chat={chat} onBack={() => {}} />);
    await screen.findByText(/Say hello/);
    const reads = mocks.chatMessages.mock.calls.length;
    act(() => mocks.listeners.get(chat.id)({ messagesChanged: false, pending: [{ displayName: "Luna" }] }));
    expect(screen.getByRole("status").textContent).toBe("Luna is taking a moment to reply…");
    expect(mocks.chatMessages).toHaveBeenCalledTimes(reads);
    act(() => mocks.listeners.get(chat.id)({ messagesChanged: false, pending: [] }));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("keeps a failed draft and clears it only once the retry succeeds", async () => {
    mocks.sendChatMessage.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<ChatThread chat={chat} onBack={() => {}} />);
    const input = screen.getByLabelText("Type a message");
    fireEvent.change(input, { target: { value: "Hello Luna" } });
    fireEvent.click(screen.getByLabelText("Send"));
    await waitFor(() => expect(screen.getByLabelText("Send").disabled).toBe(false));
    expect(input.value).toBe("Hello Luna");
    fireEvent.click(screen.getByLabelText("Send"));
    await waitFor(() => expect(input.value).toBe(""));
  });

  it("does not erase a new draft typed while a send is in flight", async () => {
    let resolve;
    mocks.sendChatMessage.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<ChatThread chat={chat} onBack={() => {}} />);
    const input = screen.getByLabelText("Type a message");
    fireEvent.change(input, { target: { value: "First line" } });
    fireEvent.click(screen.getByLabelText("Send"));
    fireEvent.change(input, { target: { value: "Next line" } });
    await act(async () => resolve(true));
    expect(input.value).toBe("Next line");
  });

  it("loads a delayed reply into a reopened thread", async () => {
    const first = render(<ChatThread chat={chat} onBack={() => {}} />);
    await screen.findByText(/Say hello/);
    first.unmount();
    expect(mocks.listeners.size).toBe(0);
    render(<ChatThread chat={chat} onBack={() => {}} />);
    await screen.findByText(/Say hello/);
    mocks.chatMessages.mockResolvedValue([message(1, "Saved you a cup")]);
    await act(async () => mocks.listeners.get(chat.id)());
    expect(screen.getByText("Saved you a cup")).toBeTruthy();
    expect(mocks.markChatRead).toHaveBeenCalledWith(chat.id);
  });

  it("does not replace a newer transcript with a slow opening request", async () => {
    let old;
    mocks.chatMessages.mockImplementationOnce(() => new Promise((done) => { old = done; }));
    render(<ChatThread chat={chat} onBack={() => {}} />);
    mocks.chatMessages.mockResolvedValue([message(2, "Newest reply")]);
    await act(async () => mocks.listeners.get(chat.id)());
    await act(async () => old([message(1, "Old reply")]));
    expect(screen.getByText("Newest reply")).toBeTruthy();
    expect(screen.queryByText("Old reply")).toBeNull();
  });

  it("shows a retry instead of pretending a failed load is an empty chat", async () => {
    mocks.chatMessages.mockRejectedValueOnce(new Error("offline"));
    render(<ChatThread chat={chat} onBack={() => {}} />);
    await screen.findByRole("alert");
    expect(screen.queryByText(/Say hello/)).toBeNull();
    expect(mocks.markChatRead).not.toHaveBeenCalled();
    mocks.chatMessages.mockResolvedValue([message(1, "Welcome back")]);
    fireEvent.click(screen.getByText("Try again"));
    await screen.findByText("Welcome back");
  });

  it("stays in the thread when deletion fails", async () => {
    const onBack = vi.fn();
    mocks.deleteChat.mockResolvedValue(false);
    render(<ChatThread chat={chat} onBack={onBack} />);
    fireEvent.click(screen.getByLabelText("Delete this chat"));
    fireEvent.click(screen.getByLabelText("Tap again to delete this chat"));
    await waitFor(() => expect(mocks.deleteChat).toHaveBeenCalled());
    expect(onBack).not.toHaveBeenCalled();
  });
});
