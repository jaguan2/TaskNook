import { describe, expect, it, vi } from "vitest";
import { createChatSignals } from "./chatSignals";

const luna = { username: "luna", displayName: "Luna" };
const kai = { username: "kai", displayName: "Kai" };
describe("pending chat replies", () => {
  it("restores pending names on reopen without requesting a transcript", () => {
    const signals = createChatSignals();
    const old = vi.fn();
    const close = signals.subscribe(1, old);
    signals.start(1, "reply", luna);
    close();
    old.mockClear();
    const reopened = vi.fn();
    signals.subscribe(1, reopened);
    expect(reopened).toHaveBeenLastCalledWith({ messagesChanged: false, pending: [{ chatId: 1, ...luna }] });
    signals.publish(1);
    expect(reopened.mock.lastCall[0].messagesChanged).toBe(true);
    expect(old).not.toHaveBeenCalled();
  });

  it("shows each person once until all their pending replies settle", () => {
    const signals = createChatSignals();
    const listener = vi.fn();
    signals.subscribe(1, listener);
    signals.start(1, "a", luna);
    signals.start(1, "b", luna);
    signals.start(1, "c", kai);
    signals.finish("a");
    expect(listener.mock.lastCall[0].pending.map((p) => p.username)).toEqual(["luna", "kai"]);
    signals.finish("b");
    expect(listener.mock.lastCall[0].pending.map((p) => p.username)).toEqual(["kai"]);
    signals.finish("c");
    expect(listener.mock.lastCall[0].pending).toEqual([]);
  });

  it("cancels only the deleted thread and tolerates an in-flight reply settling later", () => {
    const signals = createChatSignals();
    const other = vi.fn();
    signals.subscribe(2, other);
    signals.start(1, "a", luna);
    signals.start(2, "b", kai);
    other.mockClear();
    expect(signals.cancel(1)).toEqual(["a"]);
    signals.finish("a");
    expect(other).not.toHaveBeenCalled();
    expect(signals.cancel(2)).toEqual(["b"]);
  });
});
