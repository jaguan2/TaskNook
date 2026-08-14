import { describe, expect, it } from "vitest";
import {
  OPTION_LABEL,
  REPLY_MAX_MS,
  REPLY_MIN_MS,
  botReply,
  breakNudgeLine,
  chatTitle,
  dailyCheckIn,
  dialogueOptions,
  groupResponders,
  nudgeSpeaker,
  replyDelayMs,
  replyToOption,
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

// ---------------------------------------------------------------------------
// The dialogue menu — you pick a line, you don't type one.
// ---------------------------------------------------------------------------
const BOTS = ["luna", "kai", "sora", "mochi"];
const STATES = ["focus", "break", "idle"];

describe("dialogue options are an RPG menu, not a text box", () => {
  it("offers only real options, and offers them by what the bot is doing", () => {
    for (const state of STATES) {
      const now = instantWhere("luna", state);
      const opts = dialogueOptions("luna", now);
      expect(opts.length).toBeGreaterThanOrEqual(3);
      for (const o of opts) {
        // A label that isn't in the table would render as an empty button.
        expect(OPTION_LABEL[o.id], `unknown option ${o.id}`).toBeTruthy();
        expect(o.label).toBe(OPTION_LABEL[o.id]);
      }
      // Distinct ids: two buttons saying the same thing is a menu bug.
      expect(new Set(opts.map((o) => o.id)).size).toBe(opts.length);
    }
  });

  it("only offers Thanks when they've just said something", () => {
    const now = instantWhere("kai", "idle");
    expect(dialogueOptions("kai", now).map((o) => o.id)).not.toContain("thanks");
    expect(dialogueOptions("kai", now, { theirTurn: true }).map((o) => o.id)).toContain(
      "thanks"
    );
  });

  it("every option gets a real answer in every state", () => {
    // The guard that catches a missing row in the reply tables: an option with
    // no line for the current state would come back empty, or leaking {left}.
    for (const state of STATES) {
      for (const bot of BOTS) {
        const now = instantWhere(bot, state);
        for (const id of Object.keys(OPTION_LABEL)) {
          const reply = replyToOption(bot, id, now, 3);
          expect(reply, `${bot}/${state}/${id}`).toBeTruthy();
          expect(reply, `${bot}/${state}/${id} leaked a placeholder`).not.toContain("{");
        }
      }
    }
  });

  it("is deterministic, and repeats differ", () => {
    const now = instantWhere("sora", "idle");
    expect(replyToOption("sora", "greet", now, 1)).toBe(replyToOption("sora", "greet", now, 1));
    const seeds = new Set([0, 1, 2, 3].map((s) => replyToOption("sora", "greet", now, s)));
    expect(seeds.size).toBeGreaterThan(1);
  });

  it("a bot mid-block stays brief whatever you pick — except goodbye", () => {
    const now = instantWhere("luna", "focus");
    const { minutesLeft } = npcActivity("luna", now);
    // "How's it going?" mid-block must answer with the block, and the SAME
    // countdown the presence line shows.
    const reply = replyToOption("luna", "howsit", now, 0);
    const quoted = reply.match(/(\d+)\s*m/);
    if (quoted) expect(Number(quoted[1])).toBe(minutesLeft);
    // Goodbye is the one thing you can always say to someone who's busy.
    expect(replyToOption("luna", "bye", now, 0)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Messages you didn't ask for.
// ---------------------------------------------------------------------------
describe("the daily check-in", () => {
  it("is one message a day, from one friend, at a waking hour", () => {
    const seen = new Set();
    for (let d = 1; d <= 28; d += 1) {
      const day = `2026-09-${String(d).padStart(2, "0")}`;
      const c = dailyCheckIn(BOTS, day);
      expect(BOTS).toContain(c.username);
      expect(c.text).toBeTruthy();
      // 08:00–21:00. A 04:00 check-in is just a backlog waiting for you.
      expect(c.minute).toBeGreaterThanOrEqual(8 * 60);
      expect(c.minute).toBeLessThan(21 * 60);
      seen.add(c.username);
    }
    // Over a month it should not always be the same person.
    expect(seen.size).toBeGreaterThan(1);
  });

  it("is stable for a day and independent of friend ORDER", () => {
    const a = dailyCheckIn(BOTS, "2026-09-04");
    const b = dailyCheckIn([...BOTS].reverse(), "2026-09-04");
    expect(a).toEqual(b); // else the sender changes when the list re-sorts
    expect(dailyCheckIn(BOTS, "2026-09-05")).not.toEqual(a);
  });

  it("says nothing when you have no friends", () => {
    expect(dailyCheckIn([], "2026-09-04")).toBe(null);
    expect(dailyCheckIn(null, "2026-09-04")).toBe(null);
  });
});

describe("the break nudge, said by a friend", () => {
  it("quotes the span it was given", () => {
    expect(breakNudgeLine("luna", "2 hours", 0)).toContain("2 hours");
    expect(breakNudgeLine("luna", "90 minutes", 1)).toContain("90 minutes");
  });

  it("comes from whoever isn't mid-block", () => {
    // A nudge to take a break, delivered by someone deep in a focus block, is
    // the one voice that shouldn't be giving it.
    const now = instantWhere("luna", "focus");
    const speaker = nudgeSpeaker(BOTS, now);
    const others = BOTS.filter((b) => npcActivity(b, now).state !== "focus");
    if (others.length) expect(others).toContain(speaker);
    expect(nudgeSpeaker([], now)).toBe(null);
  });
});
