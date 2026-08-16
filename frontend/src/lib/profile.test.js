import { describe, it, expect } from "vitest";
import { BUILD_SHAPE, WIDTH_RANGE, HEIGHT_RANGE, LEG_H } from "./body";
import {
  MBTI_TYPES,
  MODELS,
  ZODIAC,
  DEFAULT_CHARACTER,
  HAIR_STYLES,
  OUTFITS,
  isMbti,
  parseBirthDate,
  zodiacFor,
  ageFor,
  validateCharacter,
  validateProfile,
  MOODS,
  moodFor,
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
      model: "fem",
      skin: "#8D5524",
      hair: "bun",
      hairColor: "#c68a4a",
      outfit: "#c4767f",
      expression: "happy",
      build: "slim",
    };
    // width/height weren't stored, so they fill in from the BUILD and the
    // classic leg — a pre-slider "slim" save keeps its slim silhouette. The
    // wardrobe axes fill in the same way: a character saved before garments
    // existed still validates to the plain sweater over plum trousers it drew
    // at the time, which is the whole reason the character is a JSON blob and
    // not columns.
    expect(validateCharacter(chosen)).toEqual({
      ...chosen,
      skin: "#8d5524",
      garment: "sweater",
      inner: DEFAULT_CHARACTER.inner,
      trouser: DEFAULT_CHARACTER.trouser,
      width: BUILD_SHAPE.slim.halfW,
      height: LEG_H,
    });
  });

  it("the wardrobe: keeps a real garment, refuses an invented one", () => {
    expect(validateCharacter({ garment: "hoodie" }).garment).toBe("hoodie");
    expect(validateCharacter({ garment: "spacesuit" }).garment).toBe("sweater");
    expect(validateCharacter({ garment: 7 }).garment).toBe("sweater");
    // Trousers and the second colour are hexes, normalised like every other.
    expect(validateCharacter({ trouser: "#3F5A7A" }).trouser).toBe("#3f5a7a");
    expect(validateCharacter({ trouser: "not a colour" }).trouser).toBe(
      DEFAULT_CHARACTER.trouser
    );
    expect(validateCharacter({ inner: "#ABCDEF" }).inner).toBe("#abcdef");
  });

  it("every garment in the catalogue is actually reachable", () => {
    // The panel offers exactly this list, so a key here that the validator
    // rejects would be a button that silently does nothing.
    for (const o of OUTFITS) {
      expect(validateCharacter({ garment: o.key }).garment).toBe(o.key);
      expect(o.label).toBeTruthy();
    }
    // A garment earns its slot by changing the outline or the two-tone split;
    // the ones that layer must declare it, or the panel won't offer the second
    // colour and half the garment renders in a colour nobody chose.
    expect(OUTFITS.filter((o) => o.inner).length).toBeGreaterThan(0);
  });

  it("body sliders: clamps width/height, rejects junk, defaults width from the build", () => {
    expect(validateCharacter({ width: 100 }).width).toBe(WIDTH_RANGE[1]);
    expect(validateCharacter({ width: 0 }).width).toBe(WIDTH_RANGE[0]);
    expect(validateCharacter({ height: 1000 }).height).toBe(HEIGHT_RANGE[1]);
    expect(validateCharacter({ height: 0 }).height).toBe(HEIGHT_RANGE[0]);
    for (const junk of ["9", NaN, Infinity, true, null]) {
      expect(validateCharacter({ width: junk }).width).toBe(DEFAULT_CHARACTER.width);
      expect(validateCharacter({ height: junk }).height).toBe(DEFAULT_CHARACTER.height);
    }
    expect(validateCharacter({ build: "sturdy" }).width).toBe(BUILD_SHAPE.sturdy.halfW);
  });

  it("every model is accepted, and an unknown one falls back", () => {
    for (const { key } of MODELS) {
      expect(validateCharacter({ model: key }).model).toBe(key);
    }
    expect(validateCharacter({ model: "centaur" }).model).toBe(DEFAULT_CHARACTER.model);
  });

  it("model constrains nothing else — any hair on any body", () => {
    // The point of two bodies rather than two CHARACTERS: picking one must not
    // quietly take options away from the other.
    for (const { key: model } of MODELS) {
      for (const { key: hair } of HAIR_STYLES) {
        const out = validateCharacter({ model, hair });
        expect(out.model, `${model}/${hair}`).toBe(model);
        expect(out.hair, `${model}/${hair}`).toBe(hair);
      }
    }
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

describe("what the character is thinking", () => {
  it("says nothing when the timer isn't running", () => {
    // An idle character shows no bubble, not an empty one.
    expect(moodFor({ running: false, phase: "focus" })).toBe(null);
    expect(moodFor(null)).toBe(null);
    expect(moodFor(undefined)).toBe(null);
  });

  it("studies during a focus block", () => {
    expect(moodFor({ running: true, phase: "focus" })).toBe("studying");
  });

  it("rests during a pomodoro break", () => {
    expect(moodFor({ running: true, phase: "break" })).toBe("resting");
  });

  it("only ever returns a mood the vocabulary knows", () => {
    // The sprite indexes MOODS with this, so an unknown key is a blank bubble.
    for (const running of [true, false]) {
      for (const phase of ["focus", "break", "nonsense", undefined]) {
        const mood = moodFor({ running, phase });
        expect(mood === null || mood in MOODS).toBe(true);
      }
    }
  });
});
