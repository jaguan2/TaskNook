// Pure daily-goal/streak/history math over the {"YYYY-MM-DD": minutes} map that
// GET /api/sessions/days returns. Dates are handled as LOCAL calendar days —
// same convention as the rest of the app.
//
// `toISO` comes from dates.js rather than being written again here. It used to be
// duplicated, which is a bad thing to have two copies of: the whole point of that
// helper is the UTC-vs-local subtlety documented in its comment, and the app has
// already shipped that bug once.
import { toISO } from "./dates";

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d); // local midnight
}

/** Today as a LOCAL YYYY-MM-DD (never toISOString — that's UTC). */
export function localTodayISO() {
  return toISO(new Date());
}

// Consecutive days (ending at today) with at least `goalMinutes` of focus.
// Today only counts once it's met — but an unmet today doesn't break a streak
// that's still alive from yesterday, because the day isn't over yet.
export function focusStreak(sessionDays, goalMinutes, todayISO) {
  if (!sessionDays || !goalMinutes || !todayISO) return 0;
  const met = (iso) => (sessionDays[iso] || 0) >= goalMinutes;
  let streak = met(todayISO) ? 1 : 0;
  const cursor = parseISO(todayISO);
  for (;;) {
    cursor.setDate(cursor.getDate() - 1);
    if (!met(toISO(cursor))) break;
    streak += 1;
  }
  return streak;
}

/**
 * Thresholds for shading a day by how much focus it holds.
 *
 * RELATIVE to your own history, not absolute: the scale is the tertiles of your
 * non-zero days, so someone who studies 20 minutes a day gets the same spread of
 * light-to-dark as someone doing four hours. A fixed scale would show the first
 * person nothing but the palest tint forever, which is the same "your history is
 * a boolean" problem one step along.
 *
 * Returns ascending cut points; `intensityOf` turns minutes into 0-3.
 */
export function intensityScale(sessionDays) {
  const days = Object.values(sessionDays || {})
    .filter((m) => m > 0)
    .sort((a, b) => a - b);
  if (!days.length) return [];
  // One or two days of history can't have tertiles — everything you have is
  // your best day, so shade it fully rather than inventing a spread.
  if (days.length < 3) return [days[0]];
  const at = (f) => days[Math.min(days.length - 1, Math.floor(days.length * f))];
  // De-duplicated: with lots of identical days (a strict 25-minute habit) the
  // cut points collapse, and equal thresholds would make the scale meaningless.
  return [...new Set([at(0), at(0.34), at(0.67)])];
}

/** 0 = nothing, then 1..n up the scale from `intensityScale`. */
export function intensityOf(minutes, scale) {
  if (!minutes || minutes <= 0 || !scale.length) return 0;
  let level = 1;
  // Index loop, not indexOf: with a repeated cut point indexOf finds the first
  // occurrence, so this was only correct because intensityScale de-duplicates —
  // a property it declares for an unrelated reason. Don't lean on it.
  for (let i = 0; i < scale.length; i += 1) if (minutes >= scale[i]) level = i + 1;
  return level;
}

/**
 * The last `weeks` calendar weeks as Monday-first columns of 7 local days,
 * ending with the week containing `todayISO`.
 *
 * Columns rather than rows because that's how a year of days fits a panel:
 * 7 tall, as many weeks wide as there's room for.
 */
export function focusWeeks(sessionDays, todayISO, weeks = 15) {
  const end = parseISO(todayISO);
  // Walk back to the Monday of this week, then back `weeks - 1` more.
  const mondayOffset = (end.getDay() + 6) % 7;
  const start = parseISO(todayISO);
  start.setDate(start.getDate() - mondayOffset - (weeks - 1) * 7);
  const out = [];
  for (let w = 0; w < weeks; w += 1) {
    const col = [];
    for (let d = 0; d < 7; d += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const iso = toISO(day);
      col.push({
        iso,
        minutes: (sessionDays || {})[iso] || 0,
        // Days after today are drawn as empty slots, not as zero-focus days —
        // "you did nothing on Friday" is a lie when it's Wednesday.
        future: day > end,
      });
    }
    out.push(col);
  }
  return out;
}

/**
 * Headline numbers for a history view: your best day, this week's total, and how
 * that compares with the seven days before it.
 *
 * `deltaPct` is null rather than 0 when last week was empty — "up 0%" and "your
 * first week" are different things, and dividing by zero says the wrong one.
 */
export function focusSummary(sessionDays, todayISO) {
  const map = sessionDays || {};
  let bestISO = null;
  let bestMinutes = 0;
  for (const [iso, minutes] of Object.entries(map)) {
    if (minutes > bestMinutes) (bestMinutes = minutes), (bestISO = iso);
  }
  const sumBack = (from, days) => {
    const cursor = parseISO(from);
    let total = 0;
    for (let i = 0; i < days; i += 1) {
      total += map[toISO(cursor)] || 0;
      cursor.setDate(cursor.getDate() - 1);
    }
    return total;
  };
  const last7 = sumBack(todayISO, 7);
  const prevCursor = parseISO(todayISO);
  prevCursor.setDate(prevCursor.getDate() - 7);
  const prev7 = sumBack(toISO(prevCursor), 7);
  return {
    bestISO,
    bestMinutes,
    last7,
    prev7,
    deltaPct: prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null,
    // Days you actually showed up, ever — the number that makes a long streak
    // feel earned even after it breaks.
    activeDays: Object.values(map).filter((m) => m > 0).length,
  };
}
