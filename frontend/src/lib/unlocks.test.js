import { afterEach, describe, expect, it } from "vitest";
import { ISO_ITEM_KEYS } from "./isoRoom";
import {
  BANDS, PREMIUM, balance, canAfford, isPremium, owns,
  storeIsOpen, totalEarned, totalSpent, validateUnlocked,
} from "./unlocks";

// PREMIUM is the module's one table, so pricing something for the duration of
// a test is how the machinery gets exercised at all while the store is empty.
// Without this the arithmetic would sit untested until the day it first
// matters, which is the worst possible day to find out it's wrong.
const priced = (key, cost) => {
  PREMIUM[key] = cost;
  return key;
};
afterEach(() => {
  for (const key of Object.keys(PREMIUM)) delete PREMIUM[key];
});

describe("everything that ships today is free", () => {
  it("prices nothing in the catalog", () => {
    // The decision: you don't take away decorations people already have.
    expect(ISO_ITEM_KEYS.filter(isPremium)).toEqual([]);
    expect(Object.keys(PREMIUM)).toEqual([]);
  });

  it("keeps the store shut, so no balance chip and no locks", () => {
    expect(storeIsOpen()).toBe(false);
  });

  it("says you own every piece, with nothing unlocked", () => {
    for (const key of ISO_ITEM_KEYS) expect(owns([], key), key).toBe(true);
  });

  it("never offers a free piece for sale", () => {
    expect(canAfford({ d: 999 }, [], ISO_ITEM_KEYS[0])).toBe(false);
  });
});

describe("the store, once something is in it", () => {
  it("opens as soon as a piece is priced", () => {
    priced("piano", BANDS.showpiece);
    expect(storeIsOpen()).toBe(true);
    expect(isPremium("piano")).toBe(true);
    expect(owns([], "piano")).toBe(false);
    expect(owns(["piano"], "piano")).toBe(true);
  });

  it("charges the balance down", () => {
    priced("piano", 120);
    const days = { a: 50, b: 100 }; // 150 earned
    expect(balance(days, [])).toBe(150);
    expect(balance(days, ["piano"])).toBe(30);
  });

  it("won't sell what you can't cover, or what you already have", () => {
    priced("piano", 120);
    expect(canAfford({ d: 120 }, [], "piano")).toBe(true); // exactly enough
    expect(canAfford({ d: 119 }, [], "piano")).toBe(false);
    expect(canAfford({ d: 999 }, ["piano"], "piano")).toBe(false);
  });

  it("never goes negative when a piece outgrows what you've earned", () => {
    // A re-price upward, or sessions pruned from the history, would otherwise
    // leave an owner in debt for something they already have.
    priced("piano", 120);
    expect(balance({ a: 5 }, ["piano"])).toBe(0);
  });

  it("hands the balance back when a piece is made free under its owner", () => {
    // Exactly what just happened to the whole catalog: no price, no charge.
    expect(balance({ a: 5 }, ["piano"])).toBe(5);
  });
});

describe("counting", () => {
  it("adds up the recorded days, ignoring junk", () => {
    expect(totalEarned({ a: 50, b: 70 })).toBe(120);
    expect(totalEarned({ a: -5, b: NaN, c: 10 })).toBe(10);
    expect(totalEarned(null)).toBe(0);
    expect(totalEarned("nope")).toBe(0);
  });

  it("spends nothing on free pieces", () => {
    expect(totalSpent(ISO_ITEM_KEYS.slice(0, 5))).toBe(0);
    expect(totalSpent(null)).toBe(0);
  });
});

describe("validateUnlocked", () => {
  it("keeps only real, premium, deduplicated keys", () => {
    priced("piano", 120);
    expect(validateUnlocked(["piano", "piano", "hot-tub", 7, null, "mug"])).toEqual(["piano"]);
  });

  it("forgets purchases of anything that's since become free", () => {
    // The stored list survives a re-price; it just stops meaning anything.
    expect(validateUnlocked(["piano", "mug"])).toEqual([]);
  });

  it("survives junk", () => {
    expect(validateUnlocked("nope")).toEqual([]);
    expect(validateUnlocked(null)).toEqual([]);
  });
});
