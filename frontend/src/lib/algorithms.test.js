import { describe, it, expect } from "vitest";
import { applyAlgorithm, ALGORITHMS, ALGORITHM_KEYS } from "./algorithms";

const task = (id, over = {}) => ({
  id,
  name: `task ${id}`,
  duration: 25,
  priority: "medium",
  completed: false,
  position: id,
  ...over,
});

const names = (list) => list.map((t) => t.id);

describe("ordering algorithms", () => {
  describe("shared invariants (every algorithm)", () => {
    const tasks = [
      task(1, { duration: 50, completed: true }),
      task(2, { duration: 10 }),
      task(3, { duration: 90, priority: "high" }),
      task(4, { duration: 5, completed: true }),
      task(5, { duration: 30, priority: "low" }),
    ];

    it.each(ALGORITHM_KEYS)("%s keeps every task exactly once", (key) => {
      const out = applyAlgorithm(key, tasks, { randomOrder: [5, 3, 2] });
      expect(out).toHaveLength(tasks.length);
      expect(names(out).sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it.each(ALGORITHM_KEYS)("%s sinks completed tasks to the bottom", (key) => {
      const out = applyAlgorithm(key, tasks, { randomOrder: [5, 3, 2] });
      const firstDone = out.findIndex((t) => t.completed);
      const lastActive = out.map((t) => t.completed).lastIndexOf(false);
      expect(firstDone).toBeGreaterThan(lastActive);
    });

    // Guards a classic footgun: Array.sort() mutates. The store recomputes
    // ordering on every render, so mutating the source array would scramble
    // the caller's state.
    it.each(ALGORITHM_KEYS)("%s does not mutate the input array", (key) => {
      const input = [task(1, { duration: 90 }), task(2, { duration: 5 })];
      const snapshot = names(input);
      applyAlgorithm(key, input, { randomOrder: [2, 1] });
      expect(names(input)).toEqual(snapshot);
    });

    it.each(ALGORITHM_KEYS)("%s handles an empty list", (key) => {
      expect(applyAlgorithm(key, [], { randomOrder: [] })).toEqual([]);
    });
  });

  it("shortest: quick wins first", () => {
    const out = applyAlgorithm("shortest", [
      task(1, { duration: 50 }),
      task(2, { duration: 5 }),
      task(3, { duration: 25 }),
    ]);
    expect(names(out)).toEqual([2, 3, 1]);
  });

  it("longest: deep work first", () => {
    const out = applyAlgorithm("longest", [
      task(1, { duration: 50 }),
      task(2, { duration: 5 }),
      task(3, { duration: 25 }),
    ]);
    expect(names(out)).toEqual([1, 3, 2]);
  });

  it("alternate: weaves shortest and longest from both ends", () => {
    const out = applyAlgorithm("alternate", [
      task(1, { duration: 10 }),
      task(2, { duration: 20 }),
      task(3, { duration: 30 }),
      task(4, { duration: 40 }),
    ]);
    // sorted 10,20,30,40 -> take short, long, short, long
    expect(out.map((t) => t.duration)).toEqual([10, 40, 20, 30]);
  });

  it("alternate: handles an odd count without dropping the middle task", () => {
    const out = applyAlgorithm("alternate", [
      task(1, { duration: 10 }),
      task(2, { duration: 20 }),
      task(3, { duration: 30 }),
    ]);
    expect(out.map((t) => t.duration)).toEqual([10, 30, 20]);
  });

  it("priority: high first, ties broken by shorter duration", () => {
    const out = applyAlgorithm("priority", [
      task(1, { priority: "low", duration: 5 }),
      task(2, { priority: "high", duration: 60 }),
      task(3, { priority: "high", duration: 15 }),
      task(4, { priority: "medium", duration: 30 }),
    ]);
    expect(names(out)).toEqual([3, 2, 4, 1]);
  });

  it("custom: follows the manual position field", () => {
    const out = applyAlgorithm("custom", [
      task(1, { position: 2 }),
      task(2, { position: 0 }),
      task(3, { position: 1 }),
    ]);
    expect(names(out)).toEqual([2, 3, 1]);
  });

  describe("random", () => {
    it("follows the supplied shuffled order", () => {
      const tasks = [task(1), task(2), task(3)];
      expect(names(applyAlgorithm("random", tasks, { randomOrder: [3, 1, 2] })))
        .toEqual([3, 1, 2]);
    });

    // The reason randomOrder exists at all: ordering recomputes on every
    // render (e.g. each timer tick), so it must be stable between shuffles.
    it("is stable across repeated calls with the same order", () => {
      const tasks = [task(1), task(2), task(3)];
      const ctx = { randomOrder: [2, 3, 1] };
      const a = names(applyAlgorithm("random", tasks, ctx));
      const b = names(applyAlgorithm("random", tasks, ctx));
      expect(a).toEqual(b);
    });

    it("puts tasks missing from the order at the end rather than dropping them", () => {
      const tasks = [task(1), task(2), task(3)];
      const out = applyAlgorithm("random", tasks, { randomOrder: [3] });
      expect(out[0].id).toBe(3);
      expect(names(out).sort()).toEqual([1, 2, 3]);
    });

    it("survives a missing context (no randomOrder)", () => {
      expect(() => applyAlgorithm("random", [task(1)])).not.toThrow();
    });
  });

  it("falls back to custom for an unknown key", () => {
    const tasks = [task(1, { position: 1 }), task(2, { position: 0 })];
    expect(names(applyAlgorithm("nope", tasks))).toEqual([2, 1]);
  });

  it("every algorithm exposes the metadata the UI renders", () => {
    for (const key of ALGORITHM_KEYS) {
      expect(ALGORITHMS[key].label).toBeTruthy();
      expect(ALGORITHMS[key].hint).toBeTruthy();
      expect(ALGORITHMS[key].icon).toBeTruthy();
    }
  });
});
