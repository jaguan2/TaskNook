import { describe, expect, it } from "vitest";
import {
  BOND_CAP,
  BOND_POINTS,
  FRIENDSHIP_LEVELS,
  clampBond,
  levelFor,
} from "./friendship";

describe("the friendship vocabulary", () => {
  it("levels ascend and start from zero", () => {
    expect(FRIENDSHIP_LEVELS[0].at).toBe(0);
    for (let i = 1; i < FRIENDSHIP_LEVELS.length; i += 1) {
      expect(FRIENDSHIP_LEVELS[i].at).toBeGreaterThan(FRIENDSHIP_LEVELS[i - 1].at);
      expect(FRIENDSHIP_LEVELS[i].level).toBe(FRIENDSHIP_LEVELS[i - 1].level + 1);
    }
  });

  it("every interaction is worth something", () => {
    for (const pts of Object.values(BOND_POINTS)) {
      expect(Number.isInteger(pts)).toBe(true);
      expect(pts).toBeGreaterThan(0);
    }
  });

  it("the top level is reachable under the cap", () => {
    expect(FRIENDSHIP_LEVELS[FRIENDSHIP_LEVELS.length - 1].at).toBeLessThanOrEqual(BOND_CAP);
  });
});

describe("clampBond", () => {
  it("rejects junk and negatives as zero", () => {
    for (const bad of [null, undefined, NaN, "cat", -5, -0.1]) {
      expect(clampBond(bad)).toBe(0);
    }
  });

  it("rounds and caps", () => {
    expect(clampBond(3.6)).toBe(4);
    expect(clampBond(BOND_CAP + 500)).toBe(BOND_CAP);
  });
});

describe("levelFor", () => {
  it("starts at level one with an empty bar and a next step", () => {
    const bond = levelFor(0);
    expect(bond.level).toBe(1);
    expect(bond.label).toBe("New friends");
    expect(bond.frac).toBe(0);
    expect(bond.next).toBe(FRIENDSHIP_LEVELS[1].at);
  });

  it("a threshold reached is a level held", () => {
    for (const { level, at } of FRIENDSHIP_LEVELS) {
      expect(levelFor(at).level).toBe(level);
      if (at > 0) expect(levelFor(at - 1).level).toBe(level - 1);
    }
  });

  it("tops out with a full bar and nothing next", () => {
    const top = FRIENDSHIP_LEVELS[FRIENDSHIP_LEVELS.length - 1];
    for (const pts of [top.at, top.at + 1, BOND_CAP, BOND_CAP * 3]) {
      const bond = levelFor(pts);
      expect(bond.level).toBe(top.level);
      expect(bond.frac).toBe(1);
      expect(bond.next).toBe(null);
    }
  });

  it("the bar only ever fills", () => {
    let prev = -1;
    for (let pts = 0; pts <= BOND_CAP; pts += 7) {
      const { frac } = levelFor(pts);
      expect(frac).toBeGreaterThanOrEqual(prev);
      expect(frac).toBeLessThanOrEqual(1);
      prev = frac;
    }
  });
});
