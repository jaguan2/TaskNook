import { toISO } from "./dates";
import { challengeFor, normalizeChallenges } from "./challenges";

export const PROGRESSION_KEY = "tasknook.progression";
export const XP_RULES = { studyMinute: 1, challenge: 10, neighbour: 5, login: 10, loginStreakMaxBonus: 10 };
const MAX_XP = 1_000_000_000;
const whole = (value, max = MAX_XP) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const uniqueStrings = (value, limit, maxLength = 100) => Array.isArray(value)
  ? [...new Set(value.filter((item) => typeof item === "string" && item.length > 0 && item.length <= maxLength))].slice(0, limit)
  : [];

function dayNumber(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (toISO(date) !== iso) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** Level 1 needs 100 XP, level 2 needs 150, then 200, 250, ... */
export const xpForNextLevel = (level) => 100 + 50 * (Math.max(1, whole(level)) - 1);
export const xpBeforeLevel = (level) => 25 * (level - 1) * (level + 2);
export function levelForXP(value) {
  const totalXP = whole(value, MAX_XP * 2);
  const level = Math.floor((Math.sqrt(9 + 4 * totalXP / 25) - 1) / 2);
  const earned = totalXP - xpBeforeLevel(level);
  const required = xpForNextLevel(level);
  return { level, totalXP, earned, required, remaining: required - earned };
}

export function normalizeProgression(saved, now = new Date()) {
  const today = toISO(new Date(now));
  const source = saved?.version === 1 ? saved : {};
  // A clock correction must not reopen an already credited reward day.
  const day = dayNumber(source.day) !== null && source.day > today ? source.day : today;
  const current = source.day === day;
  const lastLogin = dayNumber(source.lastLogin) !== null ? source.lastLogin : null;
  const loginStreak = lastLogin ? whole(source.loginStreak, 36_500) : 0;
  const next = { version: 1, studyXP: whole(source.studyXP), bonusXP: whole(source.bonusXP), day,
    lastLogin, loginStreak, bestStreak: Math.max(loginStreak, whole(source.bestStreak, 36_500)),
    neighbours: current ? uniqueStrings(source.neighbours, 100, 40) : [],
    dailyClaims: current ? uniqueStrings(source.dailyClaims, 15) : [],
    ongoingClaims: uniqueStrings(source.ongoingClaims, 12) };
  return same(next, saved) ? saved : next;
}

/** Saved study history is a high-water mark, never credited again on a refresh. */
export function syncStudyXP(saved, minutes, now = new Date()) {
  const state = normalizeProgression(saved, now);
  const studyXP = Math.max(state.studyXP, whole(minutes) * XP_RULES.studyMinute);
  return studyXP === state.studyXP ? state : { ...state, studyXP };
}

export const loginXP = (streak) => XP_RULES.login + Math.min(XP_RULES.loginStreakMaxBonus, Math.max(0, streak - 1));
export function recordLogin(saved, now = new Date()) {
  const state = normalizeProgression(saved, now);
  const today = toISO(new Date(now));
  if (state.lastLogin && state.lastLogin >= today) return state;
  const consecutive = dayNumber(today) - dayNumber(state.lastLogin) === 1;
  const loginStreak = consecutive ? Math.min(36_500, state.loginStreak + 1) : 1;
  return { ...state, lastLogin: today, loginStreak,
    bestStreak: Math.max(state.bestStreak, loginStreak), bonusXP: whole(state.bonusXP + loginXP(loginStreak)) };
}

export function currentLoginStreak(saved, now = new Date()) {
  const state = normalizeProgression(saved, now);
  const gap = dayNumber(toISO(new Date(now))) - dayNumber(state.lastLogin);
  return state.lastLogin && gap >= 0 && gap <= 1 ? state.loginStreak : 0;
}

/** One bonus per neighbour per local day, shared by messages and visits. */
export function recordNeighbourXP(saved, username, now = new Date()) {
  const state = normalizeProgression(saved, now);
  const name = typeof username === "string" ? username.trim().toLowerCase() : "";
  if (!name || name.length > 40 || state.neighbours.includes(name) || state.neighbours.length >= 100) return state;
  return { ...state, neighbours: [...state.neighbours, name], bonusXP: whole(state.bonusXP + XP_RULES.neighbour) };
}

/** Reward a completion edge, retaining claims through undo/reset. Deleted UUIDs
 * can be discarded: the editor never reuses a removed personal goal's ID. */
export function rewardChallengeProgress(saved, before, after, now = new Date()) {
  const state = normalizeProgression(saved, now);
  const previous = normalizeChallenges(before, now);
  const next = normalizeChallenges(after, now);
  const daily = next.daily.map((entry) => ({ ...entry, target: challengeFor(entry.id).target }));
  const dailyGoals = [...daily, ...next.custom.filter((goal) => goal.cadence === "daily")];
  const ongoingGoals = next.custom.filter((goal) => goal.cadence === "ongoing");
  const oldGoals = new Map([...previous.daily, ...previous.custom].map((goal) => [goal.id, goal]));
  const dailyClaims = state.dailyClaims.filter((id) => dailyGoals.some((goal) => goal.id === id));
  const ongoingClaims = state.ongoingClaims.filter((id) => ongoingGoals.some((goal) => goal.id === id));
  let rewards = 0;
  for (const [goals, claims] of [[dailyGoals, dailyClaims], [ongoingGoals, ongoingClaims]]) {
    for (const goal of goals) {
      const old = oldGoals.get(goal.id);
      if (old && old.progress < goal.target && goal.progress >= goal.target && !claims.includes(goal.id)) {
        claims.push(goal.id);
        rewards++;
      }
    }
  }
  const updated = { ...state, dailyClaims, ongoingClaims, bonusXP: whole(state.bonusXP + rewards * XP_RULES.challenge) };
  return same(updated, state) ? state : updated;
}
