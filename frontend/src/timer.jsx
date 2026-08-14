import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "./lib/api";
import { playChime } from "./lib/audio";
import { readJSON, readStored, writeStored } from "./lib/storage";
import { elapsedFrom, remainingFrom } from "./lib/time";
import {
  BREAK_NUDGE_MINUTES,
  PRESENCE_TICK_SECONDS,
  formatSpan,
  isPresent,
  tickPresence,
} from "./lib/breaks";
import { useStore } from "./store";

// The focus timer lives in its OWN provider, nested inside StoreProvider.
//
// It used to be part of the store, which meant the store's context value was
// rebuilt once a second — so every single useStore() consumer (the to-do list,
// the dock, the clock cluster, the music bar, every open panel) re-rendered on
// every tick, whether or not it showed the time. Splitting it means the tick
// only reaches the components that actually display it.
//
// The nesting is what makes that work: `children` is an element created by
// StoreProvider, which no longer re-renders per tick, so React skips the whole
// subtree when only this provider's state changes. Nothing below re-renders
// except context consumers.
//
// TWO contexts, on purpose:
//   useTimer()       — everything, including `remaining`/`elapsed`. Consumers
//                      re-render every second, which is correct for anything
//                      showing a clock.
//   useTimerStatus() — only running/phase/timerMode, memoised. For components
//                      that merely REACT to a session (App tells the scene to
//                      animate its resident). Reading the full context there
//                      would put App back on a 1Hz re-render and drag its whole
//                      subtree along with it — the exact thing this split fixes.

const FOCUS_PRESETS = [15, 25, 45, 60];

// Long enough to read without hurrying, since this one arrives unprompted
// while your eyes are on the work rather than on the app.
const NUDGE_TOAST_MS = 60_000;

const TimerContext = createContext(null);
const TimerStatusContext = createContext({
  running: false,
  phase: "focus",
  timerMode: "timer",
});

export const useTimer = () => useContext(TimerContext);
export const useTimerStatus = () => useContext(TimerStatusContext);

export function TimerProvider({ children }) {
  const { activeTask, stats, refreshFocus, showToast, nudgeFromFriend } = useStore();

  const [focusMinutes, setFocusMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const tickRef = useRef(null);
  // "timer" counts down to a target; "stopwatch" counts up open-ended and
  // logs whatever it measured when finished. Pomodoro belongs to timer mode.
  const [timerMode, setTimerModeState] = useState(() =>
    readStored("tasknook.timerMode") === "stopwatch" ? "stopwatch" : "timer"
  );
  const [elapsed, setElapsed] = useState(0);

  /**
   * The clock's anchor: when we last knew the truth, and what it was.
   *
   * `remaining`/`elapsed` used to be ACCUMULATED — one `-1` per interval tick —
   * which quietly made the timer a count of callbacks rather than a measure of
   * time. Browsers throttle timers in a hidden page (Chromium clamps to 1s, then
   * to roughly once a MINUTE after ~5 minutes hidden), so a 25-minute block
   * became a 20-hour one whenever the window was minimised. That is the normal
   * way to put a desktop app away, and the completion notification — which
   * exists precisely for someone who stepped away — never arrived for exactly
   * that person.
   *
   * Now the anchor is the source of truth and the displayed value is derived
   * from `Date.now()`. The interval survives only as a repaint trigger, so a
   * throttled tab gives a correct clock that merely updates coarsely.
   *
   * A ref, not state: it changes in the same breath as the value it describes,
   * and nothing renders from it.
   */
  const clockRef = useRef({ at: Date.now(), base: 25 * 60 });

  /**
   * Set the countdown AND re-anchor it. Every write to `remaining` goes through
   * here, because a bare `setRemaining` would leave the anchor describing a
   * value that no longer exists and the next tick would undo the write.
   */
  const setClock = useCallback((seconds) => {
    clockRef.current = { at: Date.now(), base: seconds };
    setRemaining(seconds);
  }, []);

  /** The same, for the stopwatch's count-up. */
  const setStopwatch = useCallback((seconds) => {
    clockRef.current = { at: Date.now(), base: seconds };
    setElapsed(seconds);
  }, []);

  /**
   * What the clock reads RIGHT NOW, straight from the anchor.
   *
   * Anything that has to act on the live value — a nudge, logging a stopwatch —
   * reads it here rather than from its render closure, which lags by up to a
   * tick and by a whole throttled minute in a hidden tab.
   */
  const currentRemaining = useCallback(() => remainingFrom(clockRef.current), []);
  const currentElapsed = useCallback(() => elapsedFrom(clockRef.current), []);

  // The break nudge's running total, in seconds. Refs, not state: they move on
  // a timer and nothing renders from them, so state would rebuild this
  // provider's context for no visible gain.
  const breakRunRef = useRef({ focus: 0, away: 0 });
  const lastActivityRef = useRef(Date.now());
  const [breakNudge, setBreakNudgeState] = useState(
    () => readStored("tasknook.breakNudge") !== "off"
  );
  const setBreakNudge = (on) => {
    setBreakNudgeState(on);
    writeStored("tasknook.breakNudge", on ? "on" : "off");
    breakRunRef.current = { focus: 0, away: 0 };
  };

  // Pomodoro mode: focus → break → focus … for a set number of rounds.
  const [pomodoro, setPomodoroState] = useState(() => ({
    enabled: false,
    breakMinutes: 5,
    rounds: 4,
    // readJSON already returns the fallback for missing OR corrupt storage, so
    // the try/catch this used to carry was dead weight.
    ...readJSON("tasknook.pomodoro", {}),
  }));
  const [phase, setPhase] = useState("focus"); // "focus" | "break"
  const [round, setRound] = useState(1);

  // Mid-session ±time nudges (VC2-style). Tracked separately so the progress
  // bar's total stretches with the block and the logged session reflects the
  // time actually planned, not the preset.
  const [nudgeSeconds, setNudgeSeconds] = useState(0);

  const setPomodoro = (patch) => {
    // Persist OUTSIDE the updater (updaters must stay pure — StrictMode
    // double-invokes them); `pomodoro` is in scope, so compute next here.
    const next = { ...pomodoro, ...patch };
    writeStored("tasknook.pomodoro", JSON.stringify(next));
    setPomodoroState(next);
    // Changing the plan restarts the cycle from round 1 — but only when idle.
    // While a session runs, only the settings change: resetting phase/round
    // mid-run silently wiped round progress, and doing it during a BREAK
    // relabelled the remaining break time as a focus phase (which then got
    // logged as a session).
    if (!running) {
      setPhase("focus");
      setRound(1);
      setClock(focusMinutes * 60);
      setNudgeSeconds(0);
    }
  };

  const nudgeTimer = (deltaSec) => {
    if (timerMode !== "timer" || phase === "break") return;
    // Read the live value off the CLOCK, not out of the render closure. The
    // closure's `remaining` lags by up to a tick, which made `applied`
    // disagree with the value actually stored — so `nudgeSeconds` (and with it
    // the logged minutes and the progress total) could drift.
    const now = running ? currentRemaining() : remaining;
    // Only count what actually applied: −1:00 with 30s left clamps to 1s, and
    // crediting the full minute would shrink the logged session and the
    // progress total by time that never existed.
    const next = Math.max(1, now + deltaSec);
    const applied = next - now;
    if (applied === 0) return;
    setClock(next);
    setNudgeSeconds((n) => n + applied);
  };

  const setFocus = (minutes) => {
    // A NO-OP while running. Only the `remaining` reset used to be guarded, so
    // `focusMinutes` changed anyway — and that is the number the completion path
    // logs (`focusMinutes * 60 + nudgeSeconds`). Tapping "15m" five minutes into
    // an hour-long block therefore logged 15 minutes for an hour of focus, and
    // fed that into the streak, the daily goal, sessionDays and the calendar.
    // Two visible tells came with it: the progress total shrank below `remaining`
    // so the bar snapped to empty for the rest of the block, and the 🎯 chip
    // clamped to 0 and stopped counting the running session.
    //
    // Guarded here rather than only on the button because the value, not the
    // control, is what's unsafe — the Pomodoro settings take the same care
    // (see setPomodoro) and any future caller inherits it.
    if (running) return;
    setFocusMinutes(minutes);
    setClock(minutes * 60);
    setPhase("focus");
    setRound(1);
    setNudgeSeconds(0);
  };

  const startTimer = () => {
    // Re-anchor on every start: a paused clock has been standing still, and
    // without this the time spent paused would be deducted the moment it
    // resumed. Also covers restarting a finished block.
    if (timerMode === "timer") {
      setClock(remaining <= 0 ? focusMinutes * 60 : remaining);
    } else {
      setStopwatch(elapsed);
    }
    // First start is the natural moment to ask — completion/break alerts are
    // exactly what was just signed up for. Without this request the notify()
    // calls below are permanently dead (permission starts as "default").
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch {
      /* older webviews may not implement it */
    }
    setRunning(true);
  };
  const pauseTimer = () => setRunning(false);
  const resetTimer = () => {
    setRunning(false);
    if (timerMode === "stopwatch") {
      setStopwatch(0);
      return;
    }
    setPhase("focus");
    setRound(1);
    setClock(focusMinutes * 60);
    setNudgeSeconds(0);
  };

  // Switching between countdown and stopwatch resets both clocks; blocked
  // while running so a mid-session flip can't eat tracked time.
  const setTimerMode = (mode) => {
    if (running || (mode !== "timer" && mode !== "stopwatch")) return;
    setTimerModeState(mode);
    writeStored("tasknook.timerMode", mode);
    setPhase("focus");
    setRound(1);
    // Both clocks, in the order that leaves the anchor describing the one the
    // new mode will actually read.
    setElapsed(0);
    setClock(focusMinutes * 60);
    setNudgeSeconds(0);
  };

  const notify = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  // Runs when a countdown reaches zero. In pomodoro mode this advances the
  // focus/break cycle (the interval keeps ticking through transitions);
  // otherwise it just ends the block. Completed FOCUS phases are logged as
  // sessions — breaks never are.
  const handlePhaseComplete = useCallback(async () => {
    // A soft in-app chime marks every phase edge for someone at the screen;
    // the system notification covers whoever stepped away.
    playChime();
    if (phase === "break") {
      setPhase("focus");
      setRound((r) => r + 1);
      setClock(focusMinutes * 60);
      notify("🌱 Back to it", `Round ${round + 1} of ${pomodoro.rounds} — ${focusMinutes} focused minutes.`);
      return;
    }
    try {
      await api.logSession({
        minutes: Math.max(1, Math.round((focusMinutes * 60 + nudgeSeconds) / 60)),
        // No active task sends NOTHING, not a placeholder. These used to log
        // the literals "Focus" and "Stopwatch", which the calendar's day
        // breakdown then showed as two ordinary tasks by those names — so the
        // same thing (time you didn't attach to a task) split across two rows
        // and was indistinguishable from a task someone really had called
        // "Focus". Absent means absent; the panel decides how to word it.
        taskName: activeTask ? activeTask.name : null,
      });
      await refreshFocus();
    } catch (err) {
      // Not ignorable: a silently-unlogged block reads as a frozen streak.
      console.error("Failed to log the focus session:", err);
      showToast("Couldn't log that session — it may be missing from today 🌧️");
    }
    setNudgeSeconds(0);
    if (pomodoro.enabled && round < pomodoro.rounds) {
      setPhase("break");
      setClock(pomodoro.breakMinutes * 60);
      notify("☕ Break time", `${pomodoro.breakMinutes} minutes — stretch, hydrate, breathe.`);
    } else {
      setRunning(false);
      setPhase("focus");
      setRound(1);
      if (pomodoro.enabled) {
        notify("🎉 Pomodoro complete", `All ${pomodoro.rounds} rounds done — ${pomodoro.rounds * focusMinutes} minutes logged.`);
      } else {
        notify("🌙 Focus block complete", `${focusMinutes} cozy minutes logged. Time to stretch.`);
      }
    }
    // `setClock` is a stable useCallback with no deps of its own, so listing it
    // costs nothing and keeps the rule satisfied honestly rather than suppressed.
  }, [phase, round, focusMinutes, nudgeSeconds, pomodoro, activeTask, refreshFocus, showToast, setClock]);

  // Ends a break early and moves straight into the next focus round — before
  // this, the only way out of a break was ✕, which discards the whole cycle.
  const skipBreak = () => {
    if (phase !== "break") return;
    setPhase("focus");
    setRound((r) => r + 1);
    setClock(focusMinutes * 60);
  };

  // Keep the latest handler in a ref so the ticking interval depends only on
  // `running` — selecting a different task mid-focus won't restart the timer.
  const handlePhaseCompleteRef = useRef(null);
  useEffect(() => {
    handlePhaseCompleteRef.current = handlePhaseComplete;
  }, [handlePhaseComplete]);

  // The break nudge samples PRESENCE on its own clock, independent of whether
  // a focus block is running — someone studying from a textbook never presses
  // play, and used to be invisible to this. Read through a ref so the sampler
  // below can be a mount-once effect.
  const samplePresenceRef = useRef(null);
  samplePresenceRef.current = () => {
    const r = tickPresence(breakRunRef.current, {
      enabled: breakNudge,
      // Only while a pomodoro is actually RUNNING: that already stands you up
      // on a schedule, and a second reminder would land mid-break. Merely
      // having the setting switched on shouldn't silence the nudge for someone
      // studying without it.
      suppressed: pomodoro.enabled && running,
      present: isPresent({
        visible: document.visibilityState === "visible",
        idleMs: Date.now() - lastActivityRef.current,
        timerRunning: running && phase === "focus",
      }),
    });
    breakRunRef.current = { focus: r.focus, away: r.away };
    if (r.nudge) {
      const span = formatSpan(BREAK_NUDGE_MINUTES);
      showToast(`${span} without a break — stretch your legs? 🌿`, NUDGE_TOAST_MS);
      // And a friend says it in their own words. Both channels on purpose: the
      // toast is the one that can't be missed, and the message is the one still
      // waiting for you when you come back. Fire-and-forget — a nudge that
      // couldn't be delivered must not surface an error over the top of the
      // toast that just worked.
      nudgeFromFriend?.(span);
    }
  };

  // Always on, unlike the timer's own interval: the whole point is to notice
  // time that no focus block is measuring. Cheap — one ref write every
  // PRESENCE_TICK_SECONDS, and the listeners only stamp a timestamp.
  useEffect(() => {
    const seen = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "visibilitychange"];
    for (const e of events) window.addEventListener(e, seen, { passive: true });
    const id = setInterval(() => samplePresenceRef.current?.(), PRESENCE_TICK_SECONDS * 1000);
    return () => {
      for (const e of events) window.removeEventListener(e, seen);
      clearInterval(id);
    };
  }, []);

  // timerMode can't change while running (setTimerMode blocks it), so adding
  // it to the deps never restarts a live interval.
  //
  // The interval is a REPAINT trigger, nothing more: the value comes from the
  // wall clock via the anchor, so a browser that throttles this to once a minute
  // produces a correct clock that updates coarsely rather than a block that
  // takes twenty hours.
  useEffect(() => {
    if (!running) return undefined;
    const sync = () => {
      if (timerMode === "stopwatch") setElapsed(elapsedFrom(clockRef.current));
      else setRemaining(remainingFrom(clockRef.current));
    };
    sync();
    tickRef.current = setInterval(sync, 1000);
    // Returning to a hidden window has to snap to the truth at once. Waiting out
    // a throttled interval is exactly the moment someone sees a wrong number and
    // stops trusting the timer.
    const onVisibility = () => {
      if (!document.hidden) sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(tickRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running, timerMode]);

  // Fire the phase handler from an effect (not inside the setState updater) so
  // it can safely set more state / await API calls. Countdown mode only — a
  // stopwatch has no "zero" to reach.
  useEffect(() => {
    if (!running || remaining > 0 || timerMode !== "timer") return;
    handlePhaseCompleteRef.current?.();
  }, [remaining, running, timerMode]);

  // Ending a stopwatch logs whatever it measured (rounded to minutes) as a
  // focus session, exactly like a completed countdown block.
  const finishStopwatch = async () => {
    setRunning(false);
    const minutes = Math.round(currentElapsed() / 60);
    setStopwatch(0);
    if (minutes < 1) return; // nothing meaningful to log
    playChime();
    try {
      await api.logSession({
        minutes,
        // Absent rather than the literal "Stopwatch" — see finishFocus above.
        taskName: activeTask ? activeTask.name : null,
      });
      await refreshFocus();
    } catch (err) {
      console.error("Failed to log the stopwatch session:", err);
      showToast("Couldn't log that session — it may be missing from today 🌧️");
    }
    notify("⏱️ Time tracked", `${minutes} cozy ${minutes === 1 ? "minute" : "minutes"} logged.`);
  };

  // "Focus today" including the CURRENT running block — the DB only knows
  // about completed sessions, which read as "the app isn't tracking me".
  const inSessionMinutes = !running
    ? 0
    : timerMode === "stopwatch"
    ? Math.floor(elapsed / 60)
    : phase === "focus"
    ? Math.max(0, Math.floor((focusMinutes * 60 + nudgeSeconds - remaining) / 60))
    : 0;
  const focusMinutesLive = (stats.focusMinutesToday || 0) + inSessionMinutes;

  // Memoised so it changes only on real state transitions, never on a tick.
  const status = useMemo(
    () => ({ running, phase, timerMode }),
    [running, phase, timerMode]
  );

  const value = {
    focusMinutes,
    setFocus,
    focusPresets: FOCUS_PRESETS,
    remaining,
    running,
    startTimer,
    pauseTimer,
    resetTimer,
    timerMode,
    setTimerMode,
    elapsed,
    finishStopwatch,
    skipBreak,
    breakNudge,
    setBreakNudge,
    breakNudgeMinutes: BREAK_NUDGE_MINUTES,
    nudgeSeconds,
    nudgeTimer,
    pomodoro,
    setPomodoro,
    phase,
    round,
    focusMinutesLive,
  };

  return (
    <TimerContext.Provider value={value}>
      <TimerStatusContext.Provider value={status}>{children}</TimerStatusContext.Provider>
    </TimerContext.Provider>
  );
}
