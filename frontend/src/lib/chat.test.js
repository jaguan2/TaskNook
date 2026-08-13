import { describe, expect, it } from "vitest";
import {
  REPLY_MAX_MS,
  REPLY_MIN_MS,
  botReply,
  chatTitle,
  groupResponders,
  replyDelayMs,
  whenLabel,
} from "./chat";
import { npcActivity } from "./visiting";

// A fixed instant per state, found from the real npcActivity rather than
// assumed — the cycle is offset per username, so hard-coding a "focus time"
// would silently stop testing focus the day the schedule is retuned.
function instantWhere(username, state) {
  const start = Date.UTC(2026, 7, 13, 0, 0, 0);
  for (let i = 0; i < 240; i += 1) {
    const now = start + i * 60000;
    if (npcActivity(username, now).state === state) return now;
  }
  throw new Error(`${username} is never ${state}`);
}

describe("bot replies answer in character with their day", () => {
  it("a bot mid-block says so, and its countdown is the REAL one", () => {
    const now = instantWhere("luna", "focus");
    const { minutesLeft } = npcActivity("luna", now);
    // Across every variant of the focus line: whenever one quotes a number of
    // minutes, it must be the same number the presence line shows two rows up
    // in the panel. Two simulations telling different stories about the same
    // person is exactly what tying chat to npcActivity was meant to prevent.
    for (let seed = 0; seed < 12; seed += 1) {
      const reply = botReply("luna", "hey! how's it going?", now, seed);
      expect(reply.length).toBeLessThan(60); // busy people are brief
      const quoted = reply.match(/(\d+)\s*(?:m\b|minutes)/);
      if (quoted) expect(Number(quoted[1])).toBe(minutesLeft);
    }
  });

  it("never leaks an unfilled placeholder", () => {
    for (const state of ["focus", "break", "idle"]) {
      for (const name of ["luna", "kai", "sora", "mochi"]) {
        const now = instantWhere(name, state);
        for (let seed = 0; seed < 12; seed += 1) {
          expect(botReply(name, "hello?", now, seed)).not.toContain("{");
        }
      }
    }
  });

  it("a free bot answers the SHAPE of what you said", () => {
    const now = instantWhere("kai", "idle");
    // Thanks and goodbyes are recognisable regardless of which variant is
    // picked, so assert on the set rather than one string.
    const thanks = new Set(
      Array.from({ length: 8 }, (_, i) => botReply("kai", "thanks!", now, i))
    );
    expect([...thanks].every((r) => r.length > 0)).toBe(true);
    expect(thanks.size).toBeGreaterThan(1); // the seed actually varies it
  });

  it("says goodbye even mid-block — leaving is the one thing you don't ignore", () => {
    const now = instantWhere("sora", "focus");
    const reply = botReply("sora", "night!", now);
    expect(reply).toMatch(/night|see you|later|bye/i);
  });

  it("is pure: same inputs, same words", () => {
    const now = instantWhere("mochi", "break");
    expect(botReply("mochi", "hi", now, 3)).toBe(botReply("mochi", "hi", now, 3));
  });

  it("the same question twice gets different answers", () => {
    const now = instantWhere("mochi", "idle");
    const replies = new Set(
      Array.from({ length: 10 }, (_, i) => botReply("mochi", "what's up?", now, i))
    );
    expect(replies.size).toBeGreaterThan(1);
  });

  it("handles an empty or odd message without throwing", () => {
    const now = instantWhere("luna", "idle");
    for (const text of ["", "   ", null, undefined, "?", "🌙"]) {
      expect(() => botReply("luna", text, now)).not.toThrow();
      expect(botReply("luna", text, now)).toBeTruthy();
    }
  });
});

describe("the wait before a reply", () => {
  it("stays inside the bounds that make it read as a person", () => {
    for (const name of ["luna", "kai", "sora", "mochi"]) {
      for (let seed = 0; seed < 30; seed += 1) {
        const now = instantWhere(name, "idle") + seed * 60000;
        const ms = replyDelayMs(name, now, seed);
        expect(ms).toBeGreaterThanOrEqual(REPLY_MIN_MS);
        expect(ms).toBeLessThanOrEqual(REPLY_MAX_MS);
      }
    }
  });

  it("a working bot takes longer to look up than one on a break", () => {
    const busy = replyDelayMs("luna", instantWhere("luna", "focus"), 1);
    const free = replyDelayMs("luna", instantWhere("luna", "break"), 1);
    expect(busy).toBeGreaterThan(free);
  });
});

describe("who answers in a group", () => {
  const CREW = ["luna", "kai", "sora", "mochi"];

  it("never everyone at once", () => {
    for (let i = 0; i < 60; i += 1) {
      const now = Date.UTC(2026, 7, 13, 0, 0, 0) + i * 60000;
      expect(groupResponders(CREW, "anyone about?", now, i).length).toBeLessThanOrEqual(2);
    }
  });

  it("people mid-block mostly stay out of it", () => {
    // Over a whole cycle, a responder should rarely be someone focusing.
    let focusing = 0;
    let total = 0;
    for (let i = 0; i < 120; i += 1) {
      const now = Date.UTC(2026, 7, 13, 0, 0, 0) + i * 60000;
      for (const name of groupResponders(CREW, "hi all", now, i)) {
        total += 1;
        if (npcActivity(name, now).state === "focus") focusing += 1;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(focusing).toBe(0);
  });

  it("is deterministic and order-stable", () => {
    const now = Date.UTC(2026, 7, 13, 3, 0, 0);
    expect(groupResponders(CREW, "hello", now, 2)).toEqual(
      groupResponders(CREW, "hello", now, 2)
    );
    // Same people, listed differently, must not change who speaks.
    expect(groupResponders([...CREW].reverse(), "hello", now, 2)).toEqual(
      groupResponders(CREW, "hello", now, 2)
    );
  });

  it("copes with an empty room", () => {
    expect(groupResponders([], "hi", Date.now(), 0)).toEqual([]);
  });
});

describe("thread titles", () => {
  const me = 1;
  it("a group uses its name", () => {
    expect(chatTitle({ title: "Study group", members: [] }, me)).toBe("Study group");
  });

  it("a one-to-one is named after the other person", () => {
    const chat = {
      title: null,
      members: [
        { id: 1, displayName: "You" },
        { id: 2, displayName: "Luna" },
      ],
    };
    expect(chatTitle(chat, me)).toBe("Luna");
  });

  it("an untitled group lists everyone else", () => {
    const chat = {
      title: null,
      members: [
        { id: 1, displayName: "You" },
        { id: 2, displayName: "Luna" },
        { id: 3, displayName: "Kai" },
      ],
    };
    expect(chatTitle(chat, me)).toBe("Luna, Kai");
  });

  it("doesn't throw on a missing thread", () => {
    expect(chatTitle(null, me)).toBe("");
  });
});

describe("message timestamps", () => {
  const now = Date.UTC(2026, 7, 13, 12, 0, 0);
  const ago = (ms) => new Date(now - ms).toISOString();

  it("reads as a person would say it", () => {
    expect(whenLabel(ago(10 * 1000), now)).toBe("now");
    expect(whenLabel(ago(12 * 60000), now)).toBe("12m");
    expect(whenLabel(ago(3 * 3600000), now)).toBe("3h");
    expect(whenLabel(ago(26 * 3600000), now)).toBe("yesterday");
  });

  it("survives a missing or malformed stamp", () => {
    expect(whenLabel(null, now)).toBe("");
    expect(whenLabel("not a date", now)).toBe("");
  });
});
