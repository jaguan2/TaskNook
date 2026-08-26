import { describe, expect, it } from "vitest";
import { TASK_GROUP_LIMIT, validateTaskGroups } from "./taskGroups";

describe("validateTaskGroups", () => {
  it("trims, deduplicates, bounds, and drops malformed cached names", () => {
    const raw = [" Work ", "Work", null, "", ...Array.from({ length: 70 }, (_, i) => `g${i}`)];
    const clean = validateTaskGroups(raw);
    expect(clean[0]).toBe("Work");
    expect(clean).toHaveLength(TASK_GROUP_LIMIT);
    expect(new Set(clean).size).toBe(clean.length);
  });
});
