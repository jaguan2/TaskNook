// Pure daily-goal/streak math over the {"YYYY-MM-DD": minutes} map that
// GET /api/sessions/days returns. Dates are handled as LOCAL calendar days —
// same convention as the rest of the app (see CalendarPanel's toISO).

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d); // local midnight
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
