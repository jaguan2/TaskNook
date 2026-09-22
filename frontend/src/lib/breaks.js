// The break nudge: after a long unbroken stretch AT the app, a small pill
// suggests standing up.
//
// The trigger is PRESENCE, which is neither "the focus timer has been running"
// nor "the app has been open":
//
//   - Timer-only was too narrow. Plenty of studying happens with a textbook
//     and no timer running at all, and those people got nothing.
//   - App-open time is too broad. TaskNook is half ambient furniture — people
//     leave it running all day for the room and the rain — so it would scold
//     someone who was out cooking dinner, and make a cozy app feel like it was
//     watching them.
//
// Present = the window is visible AND there's a sign of a human: an
// interaction in the last couple of minutes, or a focus block actually
// running. That covers reading beside the screen, and excludes an app left
// open in a background tab.

/** Unbroken presence before the nudge fires. */
export const BREAK_NUDGE_MINUTES = 120;
/** Continuously away for this long and you've taken the break. */
export const REST_MINUTES = 5;
/** Still "at the desk" this long after the last click or keypress. */
export const IDLE_GRACE_MINUTES = 2;
/**
 * Seconds between presence samples. Deliberately coarse: this drives a
 * multi-hour threshold, so a 1Hz timer running the whole time the app is open
 * would buy nothing.
 */
export const PRESENCE_TICK_SECONDS = 15;

/**
 * Is somebody actually here?
 *
 * A running timer counts on its own — you can be deliberately studying away
 * from the keyboard, and that's the case the timer exists to mark.
 */
export function isPresent({ visible, idleMs, timerRunning }) {
  if (!visible) return false;
  return Boolean(timerRunning) || idleMs < IDLE_GRACE_MINUTES * 60_000;
}

/**
 * Fold one presence sample into the run.
 *
 * `state` is `{ focus, away }` in seconds. Being away doesn't reset the run
 * immediately — alt-tabbing for twenty seconds to look something up is not a
 * break — it resets once you've been gone for `REST_MINUTES` straight.
 *
 * Pure, because when this fires IS the feature, and it otherwise lives inside
 * a `setInterval` that only ever runs in a live app.
 */
export function tickPresence(state, { enabled, suppressed, present, step = PRESENCE_TICK_SECONDS }) {
  if (!enabled || suppressed) return { ...state, nudge: false };
  if (!present) {
    const away = state.away + step;
    // Gone long enough, and that IS the break.
    return away >= REST_MINUTES * 60
      ? { focus: 0, away, nudge: false }
      : { ...state, away, nudge: false };
  }
  const focus = state.focus + step;
  // Restart the count afterwards, so a marathon sitting is reminded again
  // rather than exactly once.
  return focus >= BREAK_NUDGE_MINUTES * 60
    ? { focus: 0, away: 0, nudge: true }
    : { focus, away: 0, nudge: false };
}

/**
 * The threshold in words, for the toast and the toggle that controls it.
 *
 * Both read it from the constant rather than spelling it out, so changing
 * BREAK_NUDGE_MINUTES can't leave one of them lying. Interpolating the raw
 * number gave "120 minutes without a break", which nobody says.
 */
export function formatSpan(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} minute${m === 1 ? "" : "s"}`;
  const hours = `${h} hour${h === 1 ? "" : "s"}`;
  return m ? `${hours} ${m} min` : hours;
}
