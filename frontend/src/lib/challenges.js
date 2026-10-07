import { toISO } from "./dates";

export const CHALLENGES_KEY = "tasknook.challenges";
export const DAILY_CHALLENGE_COUNT = 3;
export const CUSTOM_CHALLENGE_LIMIT = 12;
export const CHALLENGE_TITLE_MAX = 120;
export const CHALLENGE_TARGET_MAX = 999;
export const CHALLENGE_TRACKING = [
  { key: "manual", label: "I'll track it myself", unit: "steps" },
  { key: "focus-started", label: "Focus starts", unit: "starts" },
  { key: "focus-minutes", label: "Focused minutes saved", unit: "minutes" },
  { key: "task-created", label: "Tasks added", unit: "tasks" },
  { key: "task-completed", label: "Tasks completed", unit: "tasks" },
  { key: "friend-message", label: "Messages sent", unit: "messages" },
  { key: "friend-visited", label: "Neighbour visits", unit: "visits" },
  { key: "common-visited", label: "Common-place visits", unit: "visits" },
];

// Stable IDs preserve today's progress when a developer edits the wording.
export const DAILY_CHALLENGES = [
  { id: "start-study", category: "focus", event: "focus-started", target: 1, icon: "focus",
    title: "Start a study session", description: "Begin focusing with the timer or stopwatch.",
    hint: "Press play when you're ready. Any session length is welcome." },
  { id: "finish-session", category: "focus", event: "focus-session-completed", target: 1, icon: "focus",
    title: "Finish a focus session", description: "Finish a timer block or save a stopwatch session.",
    hint: "Saved focus time counts; breaks don't." },
  { id: "focus-fifteen", category: "focus", event: "focus-minutes", target: 15, unit: "minutes", icon: "focus",
    title: "Make time for 15 minutes of focus", description: "Save a little focused time, in one session or several.",
    hint: "Minutes count when a timer block finishes or you save the stopwatch." },
  { id: "update-todos", category: "tasks", event: "task-updated", target: 1, icon: "tasks",
    title: "Update your to-do list", description: "Add a task, edit one, or check something off.",
    hint: "Make one change to a task in your list." },
  { id: "plan-one-task", category: "tasks", event: "task-created", target: 1, icon: "tasks",
    title: "Plan one small task", description: "Add something manageable to your to-do list.",
    hint: "A small next step is enough." },
  { id: "finish-a-task", category: "tasks", event: "task-completed", target: 1, icon: "tasks",
    title: "Check off one task", description: "Finish a task you've been working on.",
    hint: "Check its box once it's done." },
  { id: "talk-to-friend", category: "social", event: "friend-message", target: 1, icon: "friends",
    title: "Talk to a friend today", description: "Send a message to a neighbour in a chat or a group.",
    hint: "Open Friends and choose someone to chat with." },
  { id: "visit-neighbour", category: "social", event: "friend-visited", target: 1, icon: "friends",
    title: "Visit a neighbour", description: "Pop into a friend's room for a change of scenery.",
    hint: "Choose an open room in Friends, or knock on a door." },
  { id: "join-common-place", category: "social", event: "common-visited", target: 1, icon: "friends",
    title: "Settle into a common place", description: "Try the Common Cottage or Willow Pond.",
    hint: "Choose a common place in Friends. Your home will be waiting." },
];

export const challengeFor = (id) => DAILY_CHALLENGES.find((challenge) => challenge.id === id);
const categories = ["focus", "tasks", "social"];
const legacyIds = ["talk-to-friend", "start-study", "update-todos"];
const knownEvents = new Set([
  ...DAILY_CHALLENGES.map(({ event }) => event),
  ...CHALLENGE_TRACKING.filter(({ key }) => key !== "manual").map(({ key }) => key),
]);
const count = (value, max) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
const dayNumber = (now) => {
  const date = new Date(now);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
};
const same = (a, b) => {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};

/** One prompt per category. Each category changes between adjacent local days. */
export function dailyChallengeIds(now = new Date()) {
  const day = dayNumber(now);
  return categories.map((category, index) => {
    const pool = DAILY_CHALLENGES.filter((challenge) => challenge.category === category);
    const pick = (day + Math.floor(day / (7 + index * 4)) + index) % pool.length;
    return pool[(pick + pool.length) % pool.length].id;
  });
}

function normalizeCustom(saved) {
  if (!Array.isArray(saved)) return [];
  const result = [], seen = new Set();
  for (const entry of saved) {
    if (!entry || typeof entry.id !== "string" || !/^custom-[\w-]{1,80}$/.test(entry.id) || seen.has(entry.id)) continue;
    const title = typeof entry.title === "string" ? entry.title.trim().slice(0, CHALLENGE_TITLE_MAX) : "";
    if (!title) continue;
    const target = Math.max(1, count(entry.target, CHALLENGE_TARGET_MAX));
    result.push({ id: entry.id, title, target,
      tracking: CHALLENGE_TRACKING.some(({ key }) => key === entry.tracking) ? entry.tracking : "manual",
      cadence: entry.cadence === "ongoing" ? "ongoing" : "daily",
      progress: count(entry.progress, target) });
    seen.add(entry.id);
    if (result.length === CUSTOM_CHALLENGE_LIMIT) break;
  }
  return result;
}

/** Migrate v1 without losing today's credit; ongoing goals survive day changes. */
export function normalizeChallenges(saved, now = new Date()) {
  const day = toISO(new Date(now));
  const current = saved?.day === day;
  const custom = normalizeCustom(saved?.version === 2 ? saved.custom : null)
    .map((goal) => !current && goal.cadence === "daily" ? { ...goal, progress: 0 } : goal);
  const defaults = dailyChallengeIds(now);
  let daily = [];
  if (saved?.version === 1 && current) {
    daily = legacyIds.map((id) => ({ id, progress: Array.isArray(saved.completed) && saved.completed.includes(id) ? 1 : 0 }));
  } else if (saved?.version === 2 && current && Array.isArray(saved.daily)) {
    for (const entry of saved.daily) {
      const challenge = challengeFor(entry?.id);
      if (!challenge || daily.some(({ id }) => id === entry.id)) continue;
      daily.push({ id: entry.id, progress: count(entry.progress, challenge.target) });
      if (daily.length === DAILY_CHALLENGE_COUNT) break;
    }
  }
  for (const id of [...defaults, ...DAILY_CHALLENGES.map((challenge) => challenge.id)]) {
    if (daily.length === DAILY_CHALLENGE_COUNT) break;
    if (!daily.some((entry) => entry.id === id)) daily.push({ id, progress: 0 });
  }
  const seen = [...new Set([
    ...(saved?.version === 2 && current && Array.isArray(saved.seen) ? saved.seen.filter(challengeFor) : []),
    ...daily.map(({ id }) => id),
  ])];
  const next = { version: 2, day, daily, seen, custom };
  return same(next, saved) ? saved : next; // no app render on ordinary day checks
}

export function recordChallenge(saved, event, amount = 1, now = new Date()) {
  const progress = normalizeChallenges(saved, now);
  const delta = count(amount, CHALLENGE_TARGET_MAX);
  if (!knownEvents.has(event) || !delta) return progress;
  const next = { ...progress,
    daily: progress.daily.map((entry) => challengeFor(entry.id).event === event
      ? { ...entry, progress: Math.min(challengeFor(entry.id).target, entry.progress + delta) } : entry),
    custom: progress.custom.map((goal) => goal.tracking === event
      ? { ...goal, progress: Math.min(goal.target, goal.progress + delta) } : goal),
  };
  return same(next, progress) ? progress : next;
}

/** Replace just this prompt; prefer unseen choices, then cycle without duplicates. */
export function replaceDailyChallenge(saved, id, now = new Date()) {
  const progress = normalizeChallenges(saved, now);
  const index = progress.daily.findIndex((entry) => entry.id === id);
  if (index < 0 || progress.daily[index].progress >= challengeFor(id).target) return progress;
  const available = DAILY_CHALLENGES.filter((challenge) => !progress.daily.some((entry) => entry.id === challenge.id));
  const unseen = available.filter((challenge) => !progress.seen.includes(challenge.id));
  const pool = unseen.length ? unseen : available;
  const replacement = pool[(dayNumber(now) + progress.seen.length + index) % pool.length];
  return { ...progress,
    daily: progress.daily.map((entry, i) => i === index ? { id: replacement.id, progress: 0 } : entry),
    seen: [...new Set([...progress.seen, replacement.id])],
  };
}

export function addCustomChallenge(saved, draft, id, now = new Date()) {
  const progress = normalizeChallenges(saved, now);
  const title = typeof draft?.title === "string" ? draft.title.trim() : "";
  if (!title || title.length > CHALLENGE_TITLE_MAX) throw new Error(`Give your challenge a name of 1-${CHALLENGE_TITLE_MAX} characters.`);
  if (!Number.isInteger(draft.target) || draft.target < 1 || draft.target > CHALLENGE_TARGET_MAX) throw new Error(`Choose a target from 1 to ${CHALLENGE_TARGET_MAX}.`);
  if (!CHALLENGE_TRACKING.some(({ key }) => key === draft.tracking)) throw new Error("Choose how to track your challenge.");
  if (!["daily", "ongoing"].includes(draft.cadence)) throw new Error("Choose daily or ongoing.");
  if (progress.custom.length >= CUSTOM_CHALLENGE_LIMIT) throw new Error(`You can keep ${CUSTOM_CHALLENGE_LIMIT} personal challenges. Remove one to add another.`);
  if (typeof id !== "string" || !/^custom-[\w-]{1,80}$/.test(id) || progress.custom.some((goal) => goal.id === id)) throw new Error("Couldn't create that challenge. Please try again.");
  return { ...progress, custom: [...progress.custom, { id, title, target: draft.target,
    tracking: draft.tracking, cadence: draft.cadence, progress: 0 }] };
}

export function changeCustomProgress(saved, id, delta, now = new Date()) {
  const progress = normalizeChallenges(saved, now);
  if (!Number.isInteger(delta) || ![-1, 1].includes(delta)) return progress;
  const custom = progress.custom.map((goal) => goal.id === id && goal.tracking === "manual"
    ? { ...goal, progress: Math.max(0, Math.min(goal.target, goal.progress + delta)) } : goal);
  return same(custom, progress.custom) ? progress : { ...progress, custom };
}

export function resetCustomChallenge(saved, id, now = new Date()) {
  const progress = normalizeChallenges(saved, now);
  const custom = progress.custom.map((goal) => goal.id === id ? { ...goal, progress: 0 } : goal);
  return same(custom, progress.custom) ? progress : { ...progress, custom };
}

export function removeCustomChallenge(saved, id, now = new Date()) {
  const progress = normalizeChallenges(saved, now);
  const custom = progress.custom.filter((goal) => goal.id !== id);
  return custom.length === progress.custom.length ? progress : { ...progress, custom };
}
