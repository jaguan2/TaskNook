// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import CommonRoomChat from "./CommonRoomChat";
import { createCommonSession } from "../lib/commonRooms";

const user = { username: "you", displayName: "Mina" };
const room = () => createCommonSession("common-cottage");

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("common-room chat", () => {
  it("opens from slash or Enter without stealing Enter from another control", () => {
    render(<CommonRoomChat session={room()} roomName="Common Cottage" user={user} />);
    expect(screen.getByText("Welcome Mina to Common Cottage")).toBeTruthy();

    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    fireEvent.keyDown(outside, { key: "Enter" });
    expect(screen.queryByRole("textbox", { name: "Message the room" })).toBeNull();

    fireEvent.keyDown(document.body, { key: "/" });
    expect(screen.getByRole("textbox", { name: "Message the room" })).toBe(document.activeElement);
    outside.remove();
  });

  it("sends a line and receives one in-character reply from someone present", () => {
    vi.useFakeTimers();
    render(<CommonRoomChat session={room()} roomName="Common Cottage" user={user} />);
    fireEvent.keyDown(document.body, { key: "Enter" });
    const input = screen.getByRole("textbox", { name: "Message the room" });
    fireEvent.change(input, { target: { value: "hello everyone" } });
    fireEvent.submit(input.closest("form"));
    expect(screen.getByText("hello everyone")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/typing/);

    act(() => vi.advanceTimersByTime(12_000));
    expect(screen.queryByRole("status")).toBeNull();
    const log = screen.getByRole("log", { name: "Room messages" });
    expect(within(log).getAllByText(/^(Kai|Luna|Sora):$/)).toHaveLength(1);
  });

  it("uses Tab inside the composer for the roster and preserves normal Tab elsewhere", () => {
    render(<CommonRoomChat session={room()} roomName="Common Cottage" user={user} />);
    fireEvent.keyDown(document.body, { key: "Enter" });
    const input = screen.getByRole("textbox", { name: "Message the room" });
    expect(fireEvent.keyDown(input, { key: "Tab" })).toBe(false);
    expect(screen.getByText("In this room")).toBeTruthy();

    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    expect(fireEvent.keyDown(outside, { key: "Tab" })).toBe(true);
    outside.remove();
  });

  it("lets the user mute themself, deafen the room, and mute individual people", () => {
    vi.useFakeTimers();
    render(<CommonRoomChat session={room()} roomName="Common Cottage" user={user} />);
    fireEvent.keyDown(document.body, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /4 here/ }));

    fireEvent.click(screen.getByRole("button", { name: "Mute yourself" }));
    expect(screen.getByRole("textbox", { name: "Message the room" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Unmute yourself" }));

    fireEvent.click(screen.getByRole("button", { name: "Mute Luna" }));
    expect(screen.getByRole("button", { name: "Unmute Luna" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Deafen room chat" }));

    const input = screen.getByRole("textbox", { name: "Message the room" });
    fireEvent.change(input, { target: { value: "can anyone hear me?" } });
    fireEvent.submit(input.closest("form"));
    act(() => vi.advanceTimersByTime(12_000));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText(/^(Kai|Luna|Sora):$/)).toBeNull();
    expect(screen.getByText("Incoming room chat is paused")).toBeTruthy();
  });

  it("announces live arrivals once, but not a change that happened before joining", () => {
    const session = room();
    const existing = {
      ...session,
      change: { type: "joined", person: session.occupants[0] },
      nextChangeAt: 10,
    };
    const view = render(<CommonRoomChat session={existing} roomName="Common Cottage" user={user} />);
    expect(screen.queryByText("Kai joined the room")).toBeNull();
    view.rerender(<CommonRoomChat
      session={{
        ...existing,
        change: { type: "left", person: session.occupants[0] },
        nextChangeAt: 20,
      }}
      roomName="Common Cottage"
      user={user}
    />);
    expect(screen.getByText("Kai left the room")).toBeTruthy();
  });

  it("keeps the session mounted but disables shortcuts when the HUD is hidden", () => {
    vi.useFakeTimers();
    const session = room();
    const view = render(<CommonRoomChat session={session} roomName="Common Cottage" user={user} />);
    fireEvent.keyDown(document.body, { key: "/" });
    const input = screen.getByRole("textbox", { name: "Message the room" });
    fireEvent.change(input, { target: { value: "hello from hiding" } });
    fireEvent.submit(input.closest("form"));
    view.rerender(<CommonRoomChat session={session} roomName="Common Cottage" user={user} disabled />);
    act(() => vi.advanceTimersByTime(12_000));
    fireEvent.keyDown(document.body, { key: "/" });
    expect(screen.queryByRole("textbox", { name: "Message the room" })).toBeNull();
    view.rerender(<CommonRoomChat session={session} roomName="Common Cottage" user={user} />);
    fireEvent.keyDown(document.body, { key: "/" });
    expect(screen.getByRole("textbox", { name: "Message the room" })).toBeTruthy();
    expect(screen.getByText("hello from hiding")).toBeTruthy();
    expect(screen.getByRole("log", { name: "Room messages" })
      .querySelector('[data-message-kind="npc"]')).toBeTruthy();
  });

  it("consumes the first Escape to close chat and leaves the next one for the room", () => {
    render(<CommonRoomChat session={room()} roomName="Common Cottage" user={user} />);
    fireEvent.keyDown(document.body, { key: "/" });
    let roomEscapes = 0;
    const onRoomEscape = (event) => {
      if (event.key === "Escape") roomEscapes += 1;
    };
    window.addEventListener("keydown", onRoomEscape);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "Message the room" })).toBeNull();
    expect(roomEscapes).toBe(0);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(roomEscapes).toBe(1);
    window.removeEventListener("keydown", onRoomEscape);
  });
});

