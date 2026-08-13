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
export function botReply(username, text, now, seed = 0) {
  const { state, minutesLeft } = npcActivity(username, now);
  const shape = shapeOf(text);
  const h = hash(username, text, seed);

  // Busy beats chatty: mid-block, they answer the way someone typing with one
  // hand does, whatever you asked.
  if (state === "focus" && shape !== "bye") {
    return pick(LINES.focus, h).replace("{left}", String(minutesLeft));
  }
  if (shape) return pick(SHAPED[shape], h);
  return pick(LINES[state] || LINES.idle, h).replace("{left}", String(minutesLeft));
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
