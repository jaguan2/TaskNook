import { toISO } from "./dates";
import { npcDailyStats } from "./visiting";

const asDate = (value) => new Date(value);

/** The local midnight that begins the Sunday-based week containing `now`. */
export function sundayWeekStart(now) {
  const day = asDate(now);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

/** Sum the user's persisted daily focus minutes for the current local week. */
export function weeklyFocusMinutes(sessionDays = {}, now = new Date()) {
  const today = asDate(now);
  today.setHours(0, 0, 0, 0);
  const cursor = sundayWeekStart(today);
  let minutes = 0;

  while (cursor <= today) {
    const value = Number(sessionDays[toISO(cursor)]);
    if (Number.isFinite(value) && value > 0) minutes += value;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.round(minutes);
}

/**
 * Replay a simulated neighbour's deterministic daily totals through today.
 * Past dates are sampled at the existing 21:00 wind-down point; only today
 * remains partial. That keeps the leaderboard and each friend's daily card
 * on one shared model instead of inventing a second set of social numbers.
 */
export function npcWeeklyFocusMinutes(username, now = new Date()) {
  const current = asDate(now);
  const today = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate()
  );
  const cursor = sundayWeekStart(current);
  let minutes = 0;

  while (cursor <= today) {
    const isToday = cursor.getTime() === today.getTime();
    const sample = isToday
      ? current
      : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 21);
    minutes += npcDailyStats(username, sample.getTime()).focusMinutes;
    cursor.setDate(cursor.getDate() + 1);
  }
  return minutes;
}

/** Build one comparable, deterministic roster: the local user plus friends. */
export function buildWeeklyLeaderboard({
  user,
  friends = [],
  sessionDays = {},
  now = new Date(),
}) {
  const entries = [
    {
      key: `you-${user?.id ?? "local"}`,
      username: user?.username || "you",
      label: "You",
      avatar: user?.avatar || "🏡",
      minutes: weeklyFocusMinutes(sessionDays, now),
      isYou: true,
    },
    ...friends.map((friend) => ({
      key: `friend-${friend.id ?? friend.username}`,
      username: friend.username,
      label: friend.displayName || friend.username || "Friend",
      avatar: friend.avatar || "🌿",
      minutes: npcWeeklyFocusMinutes(friend.username || "friend", now),
      isYou: false,
    })),
  ];

  return entries
    .sort((a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function leaderboardDateRange(now = new Date()) {
  const current = asDate(now);
  const start = sundayWeekStart(current);
  const format = (date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const sameDay = start.getDate() === current.getDate();
  if (sameDay) return format(start);
  const sameMonth =
    start.getFullYear() === current.getFullYear() &&
    start.getMonth() === current.getMonth();
  return sameMonth
    ? `${format(start)}–${current.getDate()}`
    : `${format(start)}–${format(current)}`;
}
