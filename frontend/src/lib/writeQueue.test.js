import { describe, expect, it, vi } from "vitest";
import { createWriteQueue } from "./writeQueue";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe("createWriteQueue", () => {
  it("does not start a newer snapshot until the older write settles", async () => {
    const first = deferred();
    const writer = vi.fn((value) => (value === "first" ? first.promise : Promise.resolve(value)));
    const write = createWriteQueue(writer);

    const one = write("first");
    const two = write("second");
    await Promise.resolve();
    await Promise.resolve();
    expect(writer).toHaveBeenCalledTimes(1);

    first.resolve("done");
    await expect(one).resolves.toBe("done");
    await expect(two).resolves.toBe("second");
    expect(writer.mock.calls.map(([value]) => value)).toEqual(["first", "second"]);
  });

  it("continues after a failed write while rejecting that caller", async () => {
    const writer = vi.fn((value) =>
      value === "bad" ? Promise.reject(new Error("offline")) : Promise.resolve(value)
    );
    const write = createWriteQueue(writer);

    const bad = write("bad");
    const good = write("good");
    await expect(bad).rejects.toThrow("offline");
    await expect(good).resolves.toBe("good");
  });
});
