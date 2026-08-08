/**
 * Seconds as `m:ss`, or `h:mm:ss` once it passes an hour.
 *
 * There were two of these — one in HudFocusCard, one in MusicDock — and they were
 * NOT quite the same function, which is why extracting one needed an option
 * rather than a delete: a countdown reads `05:00` (padded, so the digits don't
 * jump as it crosses ten minutes) while a track reads `5:00`. `padMinutes` keeps
 * both, and keeps them from drifting apart again.
 */
export function formatClock(seconds, { padMinutes = false } = {}) {
  // A missing or absurd duration (YouTube reports one for live streams) must not
  // render as "NaN:NaN".
  if (!Number.isFinite(seconds) || seconds < 0) return padMinutes ? "00:00" : "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  // Past an hour the minutes are always padded, or `1:5:03` would come out.
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${s}`;
  return `${padMinutes ? String(m).padStart(2, "0") : m}:${s}`;
}

/**
 * What a clock anchored at `at` with `base` seconds reads at `now`.
 *
 * The countdown's whole correctness lives in these two lines, so they're pure and
 * testable rather than buried in an interval callback. `remaining`/`elapsed` used
 * to be ACCUMULATED — one `-1` per `setInterval` tick — which made the timer a
 * count of callbacks rather than a measure of time: browsers throttle timers in a
 * hidden page (Chromium clamps to 1s, then to roughly once a minute after ~5
 * minutes hidden), so a 25-minute block became a 20-hour one whenever the window
 * was minimised, and the completion notification never arrived for the very person
 * it exists for.
 *
 * Deriving from the wall clock means a throttled tab produces a CORRECT clock that
 * merely updates coarsely — and that elapsed time while nothing ticked is still
 * counted, which is the property worth testing.
 */
export function remainingFrom(anchor, now = Date.now()) {
  const gone = Math.max(0, Math.round((now - anchor.at) / 1000));
  return Math.max(0, anchor.base - gone);
}

/** The same, counting up: a stopwatch measures wall time by definition. */
export function elapsedFrom(anchor, now = Date.now()) {
  return anchor.base + Math.max(0, Math.round((now - anchor.at) / 1000));
}
