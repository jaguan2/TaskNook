import { describe, it, expect } from "vitest";
import {
  MBTI_TYPES,
  ZODIAC,
  DEFAULT_CHARACTER,
  HAIR_STYLES,
  isMbti,
  parseBirthDate,
  zodiacFor,
  ageFor,
  validateCharacter,
  validateProfile,
  profileSummary,
} from "./profile";

describe("zodiac", () => {
  it("covers all twelve signs with no gaps", () => {
    const seen = new Set();
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 28; day++) {
        const iso = `2001-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const sign = zodiacFor(iso);
        expect(sign, iso).toBeTruthy();
        seen.add(sign);
      }
    }
    expect(seen.size).toBe(12);
    expect([...seen].sort()).toEqual(Object.keys(ZODIAC).sort());
  });

  // Every boundary, both sides. Off-by-one here is the entire bug class for
  // this function, and it's invisible unless you were born on a cusp.
  it.each([
    ["2001-01-19", "capricorn"],
    ["2001-01-20", "aquarius"],
    ["2001-02-18", "aquarius"],
    ["2001-02-19", "pisces"],
    ["2001-03-20", "pisces"],
    ["2001-03-21", "aries"],
    ["2001-04-19", "aries"],
    ["2001-04-20", "taurus"],
    ["2001-05-20", "taurus"],
    ["2001-05-21", "gemini"],
    ["2001-06-20", "gemini"],
    ["2001-06-21", "cancer"],
    ["2001-07-22", "cancer"],
    ["2001-07-23", "leo"],
    ["2001-08-22", "leo"],
    ["2001-08-23", "virgo"],
    ["2001-09-22", "virgo"],
    ["2001-09-23", "libra"],
    ["2001-10-22", "libra"],
    ["2001-10-23", "scorpio"],
    ["2001-11-21", "scorpio"],
    ["2001-11-22", "sagittarius"],
    ["2001-12-21", "sagittarius"],
    ["2001-12-22", "capricorn"],
    ["2001-12-31", "capricorn"],
    ["2001-01-01", "capricorn"],
  ])("%s is %s", (iso, sign) => {
    expect(zodiacFor(iso)).toBe(sign);
  });

  it("does not shift the day for negative-UTC users", () => {
    // `new Date("2001-03-21")` is midnight UTC, which in any western timezone
    // is still 20 March locally — the naive implementation reads Pisces here.
    expect(zodiacFor("2001-03-21")).toBe("aries");
    expect(zodiacFor("2001-01-20")).toBe("aquarius");
  });

  it("rejects junk instead of guessing", () => {
    for (const bad of ["", "nonsense", "2001-13-01", "2001-02-30", "2001-04-31", "01-01-2001", null, undefined, 42, {}]) {
      expect(zodiacFor(bad), String(bad)).toBeNull();
    }
  });

  it("accepts a real leap day but not a fake one", () => {
    expect(parseBirthDate("2000-02-29")).toEqual({ year: 2000, month: 2, day: 29 });
    expect(parseBirthDate("2001-02-29")).toBeNull();
  });
});

describe("age", () => {
  it("counts whole years, not calendar-year differences", () => {
    const today = new Date(2026, 7, 1); // 1 Aug 2026, local
    expect(ageFor("2000-08-01", today)).toBe(26); // birthday today
    expect(ageFor("2000-08-02", today)).toBe(25); // tomorrow — not yet
    expect(ageFor("2000-07-31", today)).toBe(26);
  });

  it("returns null rather than a negative age for a future date", () => {
    expect(ageFor("2030-01-01", new Date(2026, 0, 1))).toBeNull();
  });
});

describe("mbti", () => {
  it("has all sixteen types, each with a nickname", () => {
    expect(MBTI_TYPES).toHaveLength(16);
    expect(new Set(MBTI_TYPES.map((t) => t.key)).size).toBe(16);
    for (const t of MBTI_TYPES) expect(t.label).toBeTruthy();
  });

  it("accepts any case but rejects near-misses", () => {
    expect(isMbti("infp")).toBe(true);
    expect(isMbti("INFP")).toBe(true);
    expect(isMbti("INFX")).toBe(false);
    expect(isMbti("")).toBe(false);
    expect(isMbti(null)).toBe(false);
  });
});

describe("validateCharacter", () => {
  it("returns the classic resident for an empty or broken blob", () => {
    for (const bad of [undefined, null, {}, "nope", 5, []]) {
      expect(validateCharacter(bad)).toEqual(DEFAULT_CHARACTER);
    }
  });

  it("keeps valid choices", () => {
    const chosen = {
      skin: "#8D5524",
      hair: "bun",
      hairColor: "#c68a4a",
      outfit: "#c4767f",
      expression: "happy",
      build: "slim",
    };
    expect(validateCharacter(chosen)).toEqual({ ...chosen, skin: "#8d5524" });
  });

  it("falls back per-field rather than discarding the whole character", () => {
    // A hairstyle this build no longer draws must not also cost you your skin
    // tone — the resident is drawn every frame, so partial recovery is the
    // difference between one odd hairstyle and a blank room.
    const out = validateCharacter({ hair: "mohawk-from-the-future", skin: "#8d5524" });
    expect(out.hair).toBe(DEFAULT_CHARACTER.hair);
    expect(out.skin).toBe("#8d5524");
  });

  it("refuses colours that aren't 6-digit hex", () => {
    for (const bad of ["red", "#fff", "#12345g", "rgb(0,0,0)", "#1234567"]) {
      expect(validateCharacter({ skin: bad }).skin).toBe(DEFAULT_CHARACTER.skin);
    }
  });

  it("every declared hairstyle survives validation", () => {
    for (const { key } of HAIR_STYLES) {
      expect(validateCharacter({ hair: key }).hair).toBe(key);
    }
  });
});

describe("validateProfile", () => {
  it("drops empty and unknown fields", () => {
    expect(validateProfile({ bio: "   ", mbti: "", junk: "x" })).toEqual({});
  });

  it("keeps and normalises what it recognises", () => {
    expect(
      validateProfile({ mbti: "enfp", birthDate: "1999-04-12", bio: " hi ", pronouns: "they/them" })
    ).toEqual({ mbti: "ENFP", birthDate: "1999-04-12", bio: "hi", pronouns: "they/them" });
  });

  it("drops an unusable birth date instead of storing it", () => {
    expect(validateProfile({ birthDate: "not-a-date" }).birthDate).toBeUndefined();
  });

  it("truncates an over-long bio rather than rejecting the save", () => {
    expect(validateProfile({ bio: "x".repeat(400) }).bio).toHaveLength(280);
  });
});

describe("profileSummary", () => {
  it("derives sign, element and nickname together", () => {
    const s = profileSummary(
      { mbti: "INFP", birthDate: "1999-04-12" },
      new Date(2026, 7, 1)
    );
    expect(s.zodiac).toBe("aries");
    expect(s.zodiacLabel).toBe("Aries");
    expect(s.element).toBe("fire");
    expect(s.mbtiLabel).toBe("Mediator");
    expect(s.age).toBe(27);
  });

  it("is all-null for an empty profile rather than throwing", () => {
    const s = profileSummary({});
    expect(s.zodiac).toBeNull();
    expect(s.mbtiLabel).toBeNull();
    expect(s.age).toBeNull();
  });
});
