import { describe, expect, it } from "vitest";
import {
  BOND_CAP,
  BOND_POINTS,
  FRIENDSHIP_LEVELS,
  clampBond,
  levelFor,
  FRIENDSHIP_GROWTH,
  friendshipGrowthFor,
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

describe('personal friendship growth', () => {
  it('keeps every curve ascending and preserves all previously earned levels', () => {
    for (const thresholds of Object.values(FRIENDSHIP_GROWTH)) {
      expect(thresholds).toHaveLength(FRIENDSHIP_LEVELS.length);
      expect(thresholds[0]).toBe(0);
      thresholds.forEach((at, i) => {
        expect(at).toBeLessThanOrEqual(FRIENDSHIP_LEVELS[i].at);
        if (i) expect(at).toBeGreaterThan(thresholds[i - 1]);
      });
    }
    for (const name of ['luna', 'kai', 'sora', 'mochi', 'fern', '__proto__']) {
      for (let pts = 0; pts <= BOND_CAP; pts++) expect(levelFor(pts, name).level).toBeGreaterThanOrEqual(levelFor(pts).level);
    }
  });

  it('gives familiar characters different stable growth patterns', () => {
    expect(levelFor(60, 'kai').level).toBe(3);
    expect(levelFor(60, 'luna').level).toBe(2);
    expect(levelFor(160, 'luna').level).toBe(4);
    expect(levelFor(160, 'mochi').level).toBe(3);
    expect(friendshipGrowthFor(' Luna ')).toBe(friendshipGrowthFor('luna'));
    for (const name of ['ivy', 'fern', 'new-neighbour', '__proto__']) {
      expect(FRIENDSHIP_GROWTH[friendshipGrowthFor(name)]).toBeTruthy();
      expect(friendshipGrowthFor(name)).toBe(friendshipGrowthFor(name.toUpperCase()));
    }
  });

  it('tracks progress within a level and resets it exactly at a milestone', () => {
    for (const name of ['luna', 'kai', 'mochi']) {
      const thresholds = FRIENDSHIP_GROWTH[friendshipGrowthFor(name)];
      for (let i = 0; i < thresholds.length - 1; i++) {
        const start = thresholds[i], end = thresholds[i + 1];
        expect(levelFor(start, name)).toMatchObject({ level: i + 1, earned: 0, required: end - start, progress: 0, next: end - start });
        expect(levelFor(end - 1, name).next).toBe(1);
      }
      expect(levelFor(BOND_CAP, name)).toMatchObject({ level: 5, frac: 1, progress: 1, next: null, required: 0 });
    }
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
