/**
 * Chatting with the cottage neighbours — the pure model.
 *
 * TaskNook's friends are seeded bots, so chat is SIMULATED social, exactly
 * like visiting: the backend stores messages and enforces membership, and
 * this file owns everything the simulation decides — whether a bot answers,
 * how long it takes, and what it says. Same division of labour as
 * visiting.js/room.js (the server stores, the frontend owns the vocabulary),
 * which is also why the reply is POSTed by the client naming the bot as the
 * sender rather than invented server-side.
 *
 * Everything here is pure and node-testable: `now` and a `seed` are passed in
 * rather than read, so a test can pin an exact reply at an exact instant.
 *
 * The bots answer IN CHARACTER WITH THEIR DAY. `npcActivity` already gives
 * every bot a 120-minute study loop that the Friends panel displays, so a bot
 * mid-focus-block replies briefly and late, one on a break chats, and an idle
 * one is happy to natter. Without that tie-in the presence line and the chat
 * would be two simulations telling different stories about the same person.
 */
import { npcActivity } from "./visiting";

/** Longest a message can be — matches MESSAGE_MAX on the column. */
export const MESSAGE_MAX = 2000;

/**
 * A small deterministic hash. Chat replies are PERSISTED (unlike the room's
 * ambience, which is recomputed every render), so a random pick would be
 * stable once written — but a hash keeps the whole thing testable at a fixed
 * instant, and lets the same question asked twice get different answers by
 * folding in the message count.
 */
function hash(...parts) {
  let h = 2166136261;
  for (const part of parts) {
    const str = String(part);
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

const pick = (list, seed) => list[seed % list.length];

// What a bot says, by what it's doing. The focus lines acknowledge that they
// are busy — a bot deep in a block that answers with a paragraph makes the
// presence line above it a lie.
const LINES = {
  focus: [
    "mid-block — back in {left}m ⏳",
    "heads down for another {left} minutes, then I'm all yours",
    "shhh, focusing 📖 ping you at the break",
    "{left}m left on this one!",
  ],
  break: [
    "just made tea ☕ what's up?",
    "on a break — perfect timing",
    "stretching my legs, talk to me",
    "5 minutes of freedom, go 😄",
  ],
  idle: [
    "oh hey! 🌙",
    "pottering about, nothing urgent",
    "hi hi — what are you working on?",
    "here! kettle's on",
  ],
};

// Replies that answer the SHAPE of what you said. Checked before the
// activity lines so "how's it going?" doesn't get a non-sequitur — but a
// focusing bot still keeps it short, because being busy outranks being
// chatty.
const GREETING = /\b(hi|hey|hello|yo|morning|evening|howdy)\b/i;
const QUESTION = /\?\s*$/;
const THANKS = /\b(thanks|thank you|ta|cheers)\b/i;
const BYE = /\b(bye|goodnight|night|see you|later)\b/i;

const SHAPED = {
  greeting: ["hey you 👋", "hello!", "hi! 🌸", "heyyy"],
  question: [
    "good question — what do you reckon?",
    "hmm! tell me more",
    "honestly? no idea 😅",
    "depends. what's the deadline?",
  ],
  thanks: ["anytime 💛", "of course!", "no bother", "🫶"],
  bye: ["night! 🌙", "see you 👋", "later! good luck with the list", "bye for now"],
};

// What close friendship ADDS. At bond level 4+ these pools merge into the
// base ones, so a close friend SOMETIMES says something only a close friend
// would — additive rather than replacing, because a friendship warming up
// should widen what someone might say, not swap their personality out. Low
// bond can never produce these lines; that asymmetry is the whole tweak.
const CLOSE_LINES = {
  greeting: ["there you are 🥰", "was hoping you'd come by"],
  thanks: ["always. what are friends for?", "for you? any time 💛"],
  bye: ["come back soon, yeah? 🌙", "miss you already — go on"],
  idle: ["you're my favourite interruption 🌸", "saved you a seat ☕"],
  focus: ["stay while I finish? {left}m 📖", "you can keep me company — {left}m left"],
};
const CLOSE_OPTION_LINES = {
  study: ["with you? always 🌸", "thought you'd never ask"],
};
const CLOSE_BOND = 4;
const withClose = (base, extra, bond) =>
  bond >= CLOSE_BOND && extra ? [...base, ...extra] : base;

// ---------------------------------------------------------------------------
// What YOU can say: an RPG dialogue menu, not a text box.
// ---------------------------------------------------------------------------
// The bots' replies are canned, so a free-text box promises a conversation they
// can't have — you type something thoughtful and get a non-sequitur back. A
// menu is the honest version of the same feature: it says "this is a game
// conversation" before you commit a sentence to it, and every reply fits what
// you actually picked, because the option IS the intent (no regex guessing).
//
// The label is also the message body posted as you, so what you clicked is
// exactly what appears in the thread.
export const OPTION_LABEL = {
  greet: "Hey! 👋",
  howsit: "How's it going?",
  working: "What are you working on?",
  study: "Want to study together?",
  thanks: "Thanks 💛",
  bye: "Good luck — talk later 👋",
};

// Options whose answer depends on what the bot is DOING, so they need their own
// per-state lines. The rest map onto the shapes below.
const OPTION_LINES = {
  working: {
    focus: ["a long reading list 📖 nearly through it", "essay. {left}m of it left, apparently"],
    break: ["notes, mostly ☕ yours?", "a bit of everything. what about you?"],
    idle: ["nothing yet! deciding 🌙", "tidying my list before I start"],
  },
  study: {
    focus: ["already at it — join me 📖", "yes! {left}m in, plenty left"],
    break: ["yes! give me five ☕", "in a minute — kettle first"],
    idle: ["yes please 🌸 I need the push", "go on then. you start!"],
  },
};

// Which shape each option speaks in, when it isn't one of the two above.
// `howsit` is deliberately null: "how's it going?" should be answered by what
// they're doing, which is what the activity lines are.
const OPTION_SHAPE = { greet: "greeting", thanks: "thanks", bye: "bye", howsit: null };

// Which three (or four) you're offered, by what they're up to. `thanks` only
// appears when they've just said something — thanking silence is odd.
const MENU = {
  focus: ["howsit", "study", "bye"],
  break: ["howsit", "working", "bye"],
  idle: ["greet", "working", "study"],
};

/**
 * The lines on offer right now, as `{id, label}`.
 *
 * `theirTurn` — the last message in the thread is theirs — swaps in "Thanks",
 * which is the one option that only makes sense as a response.
 */
export function dialogueOptions(username, now, { theirTurn = false } = {}) {
  const { state } = npcActivity(username, now);
  const ids = [...(MENU[state] || MENU.idle)];
  if (theirTurn && !ids.includes("thanks")) ids.splice(ids.length - 1, 0, "thanks");
  return ids.map((id) => ({ id, label: OPTION_LABEL[id] }));
}

/**
 * What they say back to the option you picked.
 *
 * `bond` is the friendship level (lib/friendship.js) — 4+ widens the pools
 * with lines only a close friend says. Defaults to 1 so every reply pinned
 * before the bond existed still lands word-for-word.
 */
export function replyToOption(username, optionId, now, seed = 0, bond = 1) {
  const { state, minutesLeft } = npcActivity(username, now);
  const own = OPTION_LINES[optionId];
  if (own) {
    const lines = withClose(own[state] || own.idle, CLOSE_OPTION_LINES[optionId], bond);
    return pick(lines, hash(username, optionId, seed)).replace("{left}", String(minutesLeft));
  }
  // Everything else answers the way typed text of that shape would, so the two
  // entry points can never drift into telling different stories.
  return replyFor(username, OPTION_SHAPE[optionId] ?? null, optionId, now, seed, bond);
}

/** Which shaped reply, if any, the text calls for. */
function shapeOf(text) {
  const body = String(text || "").trim();
  if (!body) return null;
  if (BYE.test(body)) return "bye";
  if (THANKS.test(body)) return "thanks";
  if (GREETING.test(body) && body.length < 24) return "greeting";
  if (QUESTION.test(body)) return "question";
  return null;
}

/**
 * What `username` says back to `text`, right now.
 *
 * `seed` distinguishes repeats — pass the thread's message count, so asking
 * the same thing twice doesn't get the same words back.
 */
export function botReply(username, text, now, seed = 0, bond = 1) {
  return replyFor(username, shapeOf(text), text, now, seed, bond);
}

/**
 * The one place a reply is chosen, shared by typed text and picked options.
 *
 * `shape` is the intent (already decided by either the regexes or the menu) and
 * `salt` is whatever should make repeats differ — the text you typed, or the
 * option id. Split out so the two entry points can't drift apart.
 */
function replyFor(username, shape, salt, now, seed = 0, bond = 1) {
  const { state, minutesLeft } = npcActivity(username, now);
  const h = hash(username, salt, seed);

  // Busy beats chatty: mid-block, they answer the way someone typing with one
  // hand does, whatever you asked.
  if (state === "focus" && shape !== "bye") {
    return pick(withClose(LINES.focus, CLOSE_LINES.focus, bond), h).replace(
      "{left}",
      String(minutesLeft)
    );
  }
  if (shape) return pick(withClose(SHAPED[shape], CLOSE_LINES[shape], bond), h);
  return pick(
    withClose(LINES[state] || LINES.idle, state === "idle" ? CLOSE_LINES.idle : null, bond),
    h
  ).replace("{left}", String(minutesLeft));
}

/**
 * How long before the reply lands, in ms.
 *
 * The WAIT is the feature, the same way KNOCK_WAIT_MS is: an instant answer
 * reads as a machine, and a bot who is supposedly deep in a focus block ought
 * to take longer to look at their phone than one on a break. Bounded at both
 * ends — under a second isn't a pause, and beyond about twelve you've stopped
 * waiting and the reply arrives as a surprise.
 */
export const REPLY_MIN_MS = 1200;
export const REPLY_MAX_MS = 12000;

export function replyDelayMs(username, now, seed = 0) {
  const { state } = npcActivity(username, now);
  const base = state === "focus" ? 7000 : state === "break" ? 2200 : 3400;
  // ±40%, deterministically.
  const jitter = ((hash(username, seed) % 81) - 40) / 100;
  const ms = Math.round(base * (1 + jitter));
  return Math.min(REPLY_MAX_MS, Math.max(REPLY_MIN_MS, ms));
}

/**
 * Who answers in a group, and in what order.
 *
 * Not everyone: a room where all four bots reply to every line is a machine
 * gun, and the charm of a group chat is that some people are around and some
 * aren't. Anyone mid-focus-block usually stays quiet (they're working), and at
 * most two answer — deterministically chosen, so the same message in the same
 * minute always produces the same conversation.
 */
export function groupResponders(usernames, text, now, seed = 0) {
  const ranked = usernames
    .map((username) => {
      const { state } = npcActivity(username, now);
      const h = hash(username, text, seed);
      // Free people are far likelier to pick up than working ones.
      const weight = (state === "focus" ? 0 : state === "break" ? 70 : 55) + (h % 30);
      return { username, weight, h };
    })
    .filter((c) => c.weight >= 50)
    .sort((a, b) => b.weight - a.weight || (a.username < b.username ? -1 : 1));
  return ranked.slice(0, 2).map((c) => c.username);
}

// ---------------------------------------------------------------------------
// Messages you didn't ask for: the check-in, and the nudge to stand up.
// ---------------------------------------------------------------------------

const CHECKIN = {
  morning: [
    "morning! what's on the list today? ☀️",
    "up early? I've just put the kettle on ☕",
    "new day, clean list 🌸 what's first?",
  ],
  afternoon: [
    "how's the day treating you?",
    "halfway there 💛 what are you working on?",
    "afternoon slump over here. distract me?",
  ],
  evening: [
    "winding down? 🌙",
    "evening! did the list survive?",
    "one more block or calling it? 🕯️",
  ],
};

/**
 * The day's unprompted hello: WHO messages you, WHEN, and what they say.
 *
 * Exactly one a day, not one per friend — four bots each opening a thread every
 * morning is a notification pile, not a cottage. Pure in `(usernames, dayKey)`,
 * so the same day always produces the same visit from the same person and a
 * test can pin it; the store owns whether it has actually been delivered.
 *
 * `minute` is minutes past midnight, spread across waking hours (08:00–21:00) —
 * a check-in at 04:00 would be waiting for you every morning, which reads as a
 * backlog rather than as someone thinking of you.
 */
export function dailyCheckIn(usernames, dayKey) {
  const names = [...(usernames || [])].filter(Boolean).sort();
  if (!names.length) return null;
  const h = hash("checkin", dayKey);
  const username = names[h % names.length];
  const minute = 8 * 60 + (hash("when", dayKey, username) % (13 * 60));
  const band = minute < 12 * 60 ? "morning" : minute < 18 * 60 ? "afternoon" : "evening";
  return {
    username,
    minute,
    text: pick(CHECKIN[band], hash("say", dayKey, username)),
  };
}

const NUDGE_LINES = [
  "you've been going {mins} — tea break? ☕",
  "oi, {mins} without a stretch 🌿 go on",
  "{mins} straight! come back to it in five 💛",
  "still there? {mins} is plenty. stand up 🙂",
];

/**
 * A friend noticing you haven't stopped. The toast says the same thing in
 * plainer words and is the reliable channel — this is the warm one, and it
 * lands in a thread so it's still there when you come back.
 */
export function breakNudgeLine(username, spanLabel, seed = 0) {
  return pick(NUDGE_LINES, hash("nudge", username, seed)).replace("{mins}", spanLabel);
}

/** Who says it: whoever is least busy, so the nudge doesn't come mid-block. */
export function nudgeSpeaker(usernames, now) {
  const names = [...(usernames || [])].filter(Boolean).sort();
  if (!names.length) return null;
  const rank = { break: 0, idle: 1, focus: 2 };
  return names
    .map((username) => ({ username, r: rank[npcActivity(username, now).state] ?? 1 }))
    .sort((a, b) => a.r - b.r)[0].username;
}

/** A thread's display name: its title, or whoever else is in it. */
export function chatTitle(chat, myId) {
  if (!chat) return "";
  if (chat.title) return chat.title;
  const others = (chat.members || []).filter((m) => m.id !== myId);
  if (others.length === 0) return "Just you";
  return others.map((m) => m.displayName).join(", ");
}

/** Short relative time for a message stamp — "now", "12m", "3h", "Tue". */
export function whenLabel(iso, now) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) {
    return new Date(then).toLocaleDateString([], { weekday: "short" });
  }
  // Local parts, never toISOString — the same day-boundary rule as everywhere
  // else in the app.
  return new Date(then).toLocaleDateString([], { month: "short", day: "numeric" });
}
