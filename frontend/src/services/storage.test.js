// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readJSON, readStored, removeStored, writeJSON, writeStored } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

/** Make localStorage behave like a browser with storage disabled or full. */
function breakStorage(method, error) {
  vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw error;
  });
}

describe("storage — the happy path", () => {
  it("round-trips strings and JSON", () => {
    writeStored("a", "hello");
    expect(readStored("a")).toBe("hello");

    writeJSON("b", { x: 1, list: [1, 2] });
    expect(readJSON("b")).toEqual({ x: 1, list: [1, 2] });
  });

  it("returns null / the fallback for keys that were never set", () => {
    expect(readStored("missing")).toBeNull();
    expect(readJSON("missing")).toBeNull();
    expect(readJSON("missing", { safe: true })).toEqual({ safe: true });
  });

  it("removes keys", () => {
    writeStored("gone", "x");
    removeStored("gone");
    expect(readStored("gone")).toBeNull();
  });
});

describe("storage — the failures this module exists for", () => {
  // These are not exotic: setItem raises QuotaExceededError when the profile
  // is full, and BOTH halves raise SecurityError when storage is disabled or
  // partitioned. Unguarded, those throws propagate into React's render/commit
  // and blank the packaged app, which has no console to explain itself.
  it("survives a quota-exceeded write", () => {
    const quota = new DOMException("full", "QuotaExceededError");
    breakStorage("setItem", quota);
    expect(() => writeStored("k", "v")).not.toThrow();
    expect(writeStored("k", "v")).toBe(false);
    expect(writeJSON("k", { a: 1 })).toBe(false);
  });

  it("survives storage being blocked outright", () => {
    const denied = new DOMException("denied", "SecurityError");
    breakStorage("getItem", denied);
    breakStorage("removeItem", denied);
    expect(readStored("k")).toBeNull();
    expect(readJSON("k", "fallback")).toBe("fallback");
    expect(removeStored("k")).toBe(false);
  });

  it("treats corrupt JSON as absent rather than throwing", () => {
    writeStored("bad", "{not json");
    expect(readJSON("bad", [])).toEqual([]);
  });

  it("refuses to throw on a value that cannot be serialized", () => {
    const circular = {};
    circular.self = circular;
    expect(writeJSON("circular", circular)).toBe(false);
  });
});
