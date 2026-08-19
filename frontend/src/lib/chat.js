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
// presence line above it a lie. These are the GENERIC pools; each bot's VOICE
// below replaces them where it has something of its own to say.
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

// ---------------------------------------------------------------------------
// The VOICES: each neighbour is a PERSON, not a reskin (owner, 2026-08-19:
// "right now they all have the same responses and prompts").
// ---------------------------------------------------------------------------
// A voice REPLACES the generic pool wherever it defines one and falls back
// where it doesn't — replacement, not merging, because a distinct character
// is the point (CLOSE_LINES stays additive; warmth widens, personality
// swaps). `topics` is what they're studying: picked by (username, dayKey,
// dayPart), so "what are you working on?" gives a different answer in the
// morning than after dinner, and a different one again tomorrow — same
// determinism contract as everything else here.
//
//   luna  — the night owl: stars, quiet wonder, soft lowercase 🌙
//   kai   — the early bird: short, bright, all momentum 💪
//   sora  — the bookworm: dry, few words, precise 📚
//   mochi — the café keeper: feeds everyone, thinks in bakes ☕
const VOICE = {
  luna: {
    focus: [
      "deep in {topic} — {left}m 🌙",
      "can't stop mid-chart… {left} minutes, promise ✨",
      "the stars won't map themselves 📖 back in {left}m",
    ],
    break: [
      "stargazing out the window instead of resting, honestly ✨",
      "break time — I saved you the window seat 🌙",
      "tea's steeping. keep me company?",
    ],
    idle: [
      "hi… I was just watching the sky 🌙",
      "perfect timing, the night's gone quiet",
      "hello you ✨ still up too?",
    ],
    greeting: ["hi hi 🌙", "evening, star ✨", "you're here — good"],
    thanks: ["oh, anytime 🌙", "it's nothing ✨"],
    bye: ["sleep well when you get there 🌙", "the moon and I will be here ✨"],
    joke: [
      "why did the moon skip dinner? it was full 🌙",
      "I only tell astronomy jokes when there's atmosphere… oh. sorry ✨",
    ],
    encourage: [
      "hey. even the moon does it in phases 🌙 one small piece first",
      "breathe. the list will still be there — start with the tiniest star ✨",
    ],
    ack: ["mm, I like that", "…tell me more?", "that sounds like you 🌙"],
    topics: [
      "star charts",
      "an astronomy problem set",
      "moon phase notes",
      "a poetry anthology",
      "nebula photos for class",
    ],
    checkin: {
      morning: ["you're up before me for once ☀️ what's first?", "morning… I barely slept, the sky was too good 🌙"],
      afternoon: ["the light's going gold — how's your list? ✨", "afternoon check: still with me?"],
      evening: ["the stars are out 🌙 one more block together?", "evening… best hours of the day. what's left?"],
    },
  },
  kai: {
    focus: [
      "MID BLOCK. {left}m. talk after 💪",
      "can't stop now — {topic}, {left} to go ⚡",
      "flow state!! back in {left}",
    ],
    break: [
      "BREAK. hydrating 💧 what's up!",
      "just crushed a block 💪 your turn",
      "five minutes then back at it — go go",
    ],
    idle: [
      "yo!! ⚡",
      "was about to start — race you to a block? 💪",
      "hey hey. warmed up and ready",
    ],
    greeting: ["YO 👋", "hey hey ⚡", "there they are!!"],
    thanks: ["got you 💪", "any time, team"],
    bye: ["go get it!! 💪", "later!! don't skip the stretch"],
    joke: [
      "why did the skeleton skip the gym? no body to train with 💀💪",
      "I'd tell a running joke but it'd go on too long ⚡",
    ],
    encourage: [
      "okay. ONE block. ten minutes. I'll do it with you — go 💪",
      "tired is data, not defeat ⚡ water, stretch, tiny start",
    ],
    ack: ["heard!!", "big if true 💪", "okay okay, and then?"],
    topics: [
      "anatomy flashcards",
      "a training plan write-up",
      "stats homework",
      "physio notes",
      "a nutrition essay",
    ],
    checkin: {
      morning: ["MORNING ☀️ list me your top three!!", "up!! day's half won already 💪"],
      afternoon: ["midday check 💪 still moving?", "afternoon!! block count so far?"],
      evening: ["evening sesh? one more with me ⚡", "how'd today score? 💪"],
    },
  },
  sora: {
    focus: [
      "reading. {left}m.",
      "{topic}. don't make me lose the line 📚",
      "mid-chapter — {left} minutes",
    ],
    break: [
      "resting my eyes. what.",
      "break. tea, no sugar. you?",
      "between chapters. speak now 📚",
    ],
    idle: [
      "hm? oh. hi 🍂",
      "was just rearranging the shelf. again",
      "here. quietly",
    ],
    greeting: ["hi.", "oh — hello 🍂", "you found me"],
    thanks: ["it's fine.", "mm. welcome 🍂"],
    bye: ["bye. read something good", "night. 📚"],
    joke: [
      "I'd lend you a joke but you never return books 📚",
      "metaphors. I could tell you one but it wouldn't be literal enough",
    ],
    encourage: [
      "one page. that's the whole trick 📚",
      "stuck is just the chapter before it gets good. keep going",
    ],
    ack: ["noted.", "…huh. fair", "go on 🍂"],
    topics: [
      "a thick novel",
      "kanji drills",
      "an essay draft",
      "the library returns pile",
      "margin annotations",
    ],
    checkin: {
      morning: ["morning. coffee, then words 📚", "up. reading before the world wakes"],
      afternoon: ["afternoon. quiet hours. using them?", "checking in 🍂 progress?"],
      evening: ["evening's for reading. join me 📚", "day's done soon. finish something small"],
    },
  },
  mochi: {
    focus: [
      "mid-bake!! {left}m before anything comes out 🥐",
      "flour everywhere — {left} minutes ☕",
      "working through {topic}, can't step away yet 🍡",
    ],
    break: [
      "the oven's doing the work now ☕ sit, sit",
      "break! there's a warm one with your name on it 🥐",
      "just iced a tray — perfect timing 🍡",
    ],
    idle: [
      "welcome in! ☕",
      "quiet in the café tonight 🍡 keep me company",
      "hello hello — hungry?",
    ],
    greeting: ["hello, love ☕", "welcome in 🥐", "there's my favourite regular 🍡"],
    thanks: ["oh hush, it's nothing ☕", "sweet of you 🍡"],
    bye: ["take a snack for the road 🥐", "come back hungry! ☕"],
    joke: [
      "why did the croissant fail its exam? it flaked 🥐",
      "my bread jokes? they never get stale ☕",
    ],
    encourage: [
      "you can't pour from an empty cup — fill yours first ☕ then one small task",
      "rest a minute, love. even dough needs time to rise 🥐",
    ],
    ack: ["mm-hm, I'm listening ☕", "oh I know exactly what you mean 🍡", "and then what happened?"],
    topics: [
      "a new scone recipe",
      "the café's books",
      "latte art practice",
      "tomorrow's bake list",
      "a big pastry order",
    ],
    checkin: {
      morning: ["morning bake's out ☀️ come start your day warm 🥐", "kettle's on for you ☕ what's the plan?"],
      afternoon: ["afternoon lull ☕ how's the list rising?", "saved you the corner table 🍡 working hard?"],
      evening: ["closing soon 🌙 one more cocoa, one more block? ☕", "evening! did today turn out sweet? 🍡"],
    },
  },
};

// A bot's pool for `key`, falling back to the generic one.
const poolFor = (username, key, fallback) => VOICE[username]?.[key] || fallback;

// The local day + its third: what makes answers ROTATE. Morning, afternoon
// and evening each get their own pick, stable within the band (asking twice
// at 10:00 and 10:20 reads as a person with one answer, not a slot machine —
// the `seed` still varies the WORDING on repeats).
export function dayPartOf(now) {
  const h = new Date(now).getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}
const dayKeyOf = (now) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** What they're studying right now — rotates per (bot, day, third-of-day). */
export function topicOf(username, now) {
  const topics = VOICE[username]?.topics || ["a reading list", "some notes", "the to-do pile"];
  return topics[hash(username, dayKeyOf(now), dayPartOf(now)) % topics.length];
}

// How many blocks they reckon they have left in them today — deterministic
// per (bot, day), so "how long are you on for?" holds its answer all day.
const blocksLeftOf = (username, now) => 1 + (hash("blocks", username, dayKeyOf(now)) % 3);

const fill = (line, { left, topic, blocks }) =>
  line
    .replace("{left}", String(left))
    .replace("{topic}", topic)
    .replace("{blocks}", String(blocks));

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
  onlong: "How long are you on for?",
  plans: "What's the plan today?",
  wind: "Calling it a night soon?",
  thanks: "Thanks 💛",
  bye: "Good luck — talk later 👋",
};

// Options whose answer depends on what the bot is DOING, so they need their
// own per-state lines. `{topic}` rotates per (bot, day, third-of-day) and
// `{blocks}` holds per (bot, day) — see topicOf/blocksLeftOf.
const OPTION_LINES = {
  working: {
    focus: ["{topic} 📖 {left}m left on this block", "deep in {topic} — nearly through"],
    break: ["{topic}, between blocks ☕ yours?", "taking a breather from {topic}. what about you?"],
    idle: ["about to start on {topic} 🌙", "tidying my list, then {topic}"],
  },
  study: {
    focus: ["already at it — join me 📖", "yes! {left}m in, plenty left"],
    break: ["yes! give me five ☕", "in a minute — kettle first"],
    idle: ["yes please 🌸 I need the push", "go on then. you start!"],
  },
  onlong: {
    focus: ["this block plus {blocks} more, I think ⏳", "{left}m here, then {blocks} more rounds"],
    break: ["{blocks} more blocks in me today", "a while yet — {blocks} more, then I'm done"],
    idle: ["just settling in — {blocks} blocks at least", "an hour or two? depends how {topic} goes"],
  },
  plans: {
    focus: ["today IS this: {topic} 📖", "{topic} till it's done, then we'll see"],
    break: ["{topic}, mostly — and enough breaks to survive it", "a big push on {topic}. wish me luck"],
    idle: ["{topic} first, then whatever's left of me decides", "easing in — {topic}, then the fun list"],
  },
  wind: {
    focus: ["after this one 🌙 {left}m and I'm done", "one more block, then yes"],
    break: ["soon… one more cocoa first", "nearly — wrapping up after this break"],
    idle: ["probably! unless a second wind shows up 🌙", "soon. today was a good one"],
  },
};

// Which shape each option speaks in, when it isn't one of those above.
// `howsit` is deliberately null: "how's it going?" should be answered by what
// they're doing, which is what the activity lines are.
const OPTION_SHAPE = { greet: "greeting", thanks: "thanks", bye: "bye", howsit: null };

// Which three you're offered, by what they're up to AND when it is — the
// menu itself rotates through the day (owner, 2026-08-19), so a morning
// visit asks about plans and an evening one about winding down.
const MENU = {
  focus: {
    morning: ["howsit", "study", "bye"],
    afternoon: ["howsit", "study", "bye"],
    evening: ["howsit", "wind", "bye"],
  },
  break: {
    morning: ["howsit", "plans", "working"],
    afternoon: ["howsit", "working", "onlong"],
    evening: ["howsit", "working", "wind"],
  },
  idle: {
    morning: ["greet", "plans", "study"],
    afternoon: ["greet", "working", "study"],
    evening: ["greet", "onlong", "wind"],
  },
};

/**
 * The lines on offer right now, as `{id, label}`.
 *
 * `theirTurn` — the last message in the thread is theirs — swaps in "Thanks",
 * which is the one option that only makes sense as a response.
 */
export function dialogueOptions(username, now, { theirTurn = false } = {}) {
  const { state } = npcActivity(username, now);
  const byPart = MENU[state] || MENU.idle;
  const ids = [...(byPart[dayPartOf(now)] || byPart.afternoon)];
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
  // A voice's own answer for this option beats the generic table — kai and
  // mochi should not describe the same day in the same words.
  const own = VOICE[username]?.options?.[optionId] || OPTION_LINES[optionId];
  if (own) {
    const lines = withClose(own[state] || own.idle, CLOSE_OPTION_LINES[optionId], bond);
    return fill(pick(lines, hash(username, optionId, seed)), {
      left: minutesLeft,
      topic: topicOf(username, now),
      blocks: blocksLeftOf(username, now),
    });
  }
  // Everything else answers the way typed text of that shape would, so the two
  // entry points can never drift into telling different stories.
  return replyFor(username, OPTION_SHAPE[optionId] ?? null, optionId, now, seed, bond);
}

// The free-form field's recognisers (owner, 2026-08-19: "certain scripts we
// know how to respond to"). An OPTION intent routes into the option tables —
// typing "what are you studying?" and tapping the menu line get the same
// per-bot, per-time answer — and a SHAPE picks a voice pool. Order matters:
// the most specific read wins.
const STUDYQ = /\b(study(ing)?|working on|work on|learning)\b/i;
const JOINQ = /\b(together|join|with me|study with)\b/i;
const HOWLONG = /\b(how long|on for|staying (up|on)|until when)\b/i;
const JOKE = /\b(joke|funny|make me laugh)\b/i;
const LOWMOOD = /\b(tired|exhausted|stressed|overwhelmed|burnt? ?out|can'?t focus|procrastinat\w*|stuck)\b/i;

/** Which reply the text calls for: {option} routes to the menu tables. */
function intentOf(text) {
  const body = String(text || "").trim();
  if (!body) return { shape: null };
  if (BYE.test(body)) return { shape: "bye" };
  if (THANKS.test(body)) return { shape: "thanks" };
  if (LOWMOOD.test(body)) return { shape: "encourage" };
  if (JOKE.test(body)) return { shape: "joke" };
  if (JOINQ.test(body)) return { option: "study" };
  if (HOWLONG.test(body)) return { option: "onlong" };
  if (STUDYQ.test(body)) return { option: "working" };
  if (GREETING.test(body) && body.length < 24) return { shape: "greeting" };
  if (QUESTION.test(body)) return { shape: "question" };
  // A plain statement gets an acknowledgement, not a non-sequitur about
  // kettles — the "ack" pools exist exactly for this.
  return { shape: "ack" };
}

/**
 * What `username` says back to `text`, right now.
 *
 * `seed` distinguishes repeats — pass the thread's message count, so asking
 * the same thing twice doesn't get the same words back.
 */
export function botReply(username, text, now, seed = 0, bond = 1) {
  const intent = intentOf(text);
  if (intent.option) return replyToOption(username, intent.option, now, seed, bond);
  return replyFor(username, intent.shape, text, now, seed, bond);
}

// Generic pools for the two shapes only typed text can reach.
const EXTRA_SHAPED = {
  joke: ["I only know one and I'm saving it 😄", "my jokes need a warm-up block first"],
  encourage: [
    "small steps count double on hard days 💛 pick the tiniest one",
    "you've done harder. one block, then reassess 🌱",
  ],
  ack: ["mm, I hear you", "ha — fair", "noted 🌱 go on"],
};

/**
 * The one place a reply is chosen, shared by typed text and picked options.
 *
 * `shape` is the intent (already decided by either the recognisers or the
 * menu) and `salt` is whatever should make repeats differ — the text you
 * typed, or the option id. Split out so the two entry points can't drift.
 */
function replyFor(username, shape, salt, now, seed = 0, bond = 1) {
  const { state, minutesLeft } = npcActivity(username, now);
  const h = hash(username, salt, seed);
  const vars = { left: minutesLeft, topic: topicOf(username, now), blocks: blocksLeftOf(username, now) };

  // Busy beats chatty: mid-block, they answer the way someone typing with one
  // hand does, whatever you asked. (A plea for encouragement still gets a
  // real answer — a friend looks up from the book for that.)
  if (state === "focus" && shape !== "bye" && shape !== "encourage") {
    return fill(pick(withClose(poolFor(username, "focus", LINES.focus), CLOSE_LINES.focus, bond), h), vars);
  }
  if (shape) {
    const base = poolFor(username, shape, SHAPED[shape] || EXTRA_SHAPED[shape] || EXTRA_SHAPED.ack);
    return fill(pick(withClose(base, CLOSE_LINES[shape], bond), h), vars);
  }
  return fill(
    pick(
      withClose(
        poolFor(username, state, LINES[state] || LINES.idle),
        state === "idle" ? CLOSE_LINES.idle : null,
        bond
      ),
      h
    ),
    vars
  );
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
  // The voice's own check-ins first — luna opening your morning and mochi
  // opening it should not be the same sentence.
  const pool = VOICE[username]?.checkin?.[band] || CHECKIN[band];
  return {
    username,
    minute,
    text: pick(pool, hash("say", dayKey, username)),
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
