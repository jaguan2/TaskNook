import { useState } from "react";
import { motion, useDragControls } from "framer-motion";
import {
  Check,
  ChevronUp,
  Flame,
  Hourglass,
  Pause,
  Play,
  Settings2,
  Target,
  Timer,
} from "lucide-react";
import { useStore } from "../store";
import { focusStreak, localTodayISO } from "../lib/stats";
import { useArmed } from "../lib/useArmed";

const BREAK_PRESETS = [3, 5, 10];
const ROUND_PRESETS = [2, 3, 4, 6];

function fmt(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// The top-left focus HUD, Virtual Cottage-style: a SMALL transport card —
// round pips, the time, a thin progress bar, and ✕ ▶/⏸ ✓ — with everything
// else (mode, presets, pomodoro plan) tucked behind the ⚙ expander. The task
// name appears centred above only when there IS one; no idle filler text.
export default function HudFocusCard() {
  const {
    remaining,
    running,
    startTimer,
    pauseTimer,
    resetTimer,
    focusMinutes,
    setFocus,
    focusPresets,
    activeTask,
    pomodoro,
    setPomodoro,
    phase,
    round,
    timerMode,
    setTimerMode,
    elapsed,
    finishStopwatch,
    skipBreak,
    nudgeSeconds,
    nudgeTimer,
    focusMinutesLive,
    sessionDays,
    dailyGoal,
  } = useStore();
  const [expanded, setExpanded] = useState(false);
  const dragControls = useDragControls();

  // ✕ discards the block (nothing is logged), so once there's real progress
  // on the clock it arms first — the app-wide two-tap rhythm (lib/useArmed).
  const [armedId, arm] = useArmed();
  const confirmReset = armedId === "reset";

  const today = localTodayISO();
  const streak = focusStreak(
    { ...sessionDays, [today]: focusMinutesLive },
    dailyGoal,
    today
  );
  const goalMet = focusMinutesLive >= dailyGoal;

  const stopwatch = timerMode === "stopwatch";
  const inBreak = !stopwatch && phase === "break";
  // ±nudges stretch/shrink the block, so the bar's total moves with them.
  const total =
    (inBreak ? pomodoro.breakMinutes : focusMinutes) * 60 + (inBreak ? 0 : nudgeSeconds);
  const progress = stopwatch ? (elapsed % 60) / 60 : total > 0 ? 1 - remaining / total : 0;
  const barColor = inBreak ? "#7faf8f" : stopwatch ? "#6fb8cf" : "#ffe9b0";

  const heading = inBreak ? "Break time ☕" : activeTask?.name;

  const hasProgress = stopwatch ? elapsed > 0 : running || remaining < total;
  const requestReset = () => {
    if (hasProgress) arm("reset", resetTimer);
    else resetTimer();
  };

  return (
    // z-30: when the ⚙ options are expanded on a short window the panel may
    // reach the dock's territory — it should overlay it like a dropdown, not
    // slide underneath.
    <div className="intro-chrome pointer-events-none absolute left-6 top-6 z-30">
      <motion.div
        drag
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        className="pointer-events-auto flex w-[13.5rem] flex-col items-center"
      >
        {heading && (
          <h1 className="mb-1.5 max-w-full truncate text-center text-xl font-bold tracking-wide text-cream drop-shadow">
            {heading}
          </h1>
        )}

        <div className="glass w-full rounded-2xl px-4 pb-3 pt-2 shadow-soft">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            title="Drag to move"
            className="mx-auto mb-1 h-1.5 w-10 cursor-grab rounded-full bg-white/20 active:cursor-grabbing"
          />

          {/* pomodoro round pips */}
          {!stopwatch && pomodoro.enabled && (
            <div className="mb-1 flex justify-center gap-1.5">
              {Array.from({ length: pomodoro.rounds }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 < round
                      ? "w-4 bg-sage"
                      : i + 1 === round
                      ? `w-6 ${inBreak ? "bg-sage/60" : "bg-glow"}`
                      : "w-4 bg-white/15"
                  }`}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5">
            {!stopwatch && !inBreak && (
              <button
                onClick={() => nudgeTimer(-60)}
                title="One minute less"
                className="pill px-1.5 py-0.5 text-[10px] font-semibold text-petal/50 hover:bg-white/10 hover:text-cream"
              >
                −1:00
              </button>
            )}
            <p className="text-center text-[26px] font-bold leading-8 tabular-nums text-cream">
              {fmt(stopwatch ? elapsed : remaining)}
            </p>
            {inBreak && (
              <button
                onClick={skipBreak}
                title="Skip the break — straight into the next round"
                className="pill px-1.5 py-0.5 text-[10px] font-semibold text-petal/50 hover:bg-white/10 hover:text-cream"
              >
                Skip ▸
              </button>
            )}
            {!stopwatch && !inBreak && (
              <button
                onClick={() => nudgeTimer(60)}
                title="One more minute"
                className="pill px-1.5 py-0.5 text-[10px] font-semibold text-petal/50 hover:bg-white/10 hover:text-cream"
              >
                +1:00
              </button>
            )}
          </div>

          {/* thin progress bar (sweeps once per minute in stopwatch mode) */}
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
                backgroundColor: barColor,
                transition: "width 1s linear",
              }}
            />
          </div>

          {/* transport row */}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <button
              onClick={requestReset}
              title="Reset (discards this block — nothing is logged)"
              className={`pill grid h-8 place-items-center transition ${
                confirmReset
                  ? "px-2 text-[10px] font-bold text-danger hover:bg-white/10"
                  : "w-8 text-sm text-petal/70 hover:bg-white/10 hover:text-cream"
              }`}
            >
              {confirmReset ? "sure?" : "✕"}
            </button>
            {!running ? (
              <button
                onClick={startTimer}
                title={stopwatch ? "Start tracking" : "Start focusing"}
                className="pill grid h-9 w-12 place-items-center bg-glow text-plum shadow-soft hover:bg-amber"
              >
                <Play size={16} />
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                title="Pause"
                className="pill grid h-9 w-12 place-items-center bg-blush text-plum shadow-soft hover:bg-rose"
              >
                <Pause size={16} />
              </button>
            )}
            {stopwatch && (
              <button
                onClick={finishStopwatch}
                disabled={elapsed === 0}
                title="Finish and log the tracked time"
                className="pill grid h-8 w-8 place-items-center bg-sage/80 text-plum hover:bg-sage disabled:opacity-40"
              >
                <Check size={15} />
              </button>
            )}
            <button
              onClick={() => setExpanded((e) => !e)}
              title="Timer options"
              className={`pill grid h-8 w-8 place-items-center transition ${
                expanded ? "bg-white/15 text-cream" : "text-petal/70 hover:bg-white/10 hover:text-cream"
              }`}
            >
              {expanded ? <ChevronUp size={15} /> : <Settings2 size={14} />}
            </button>
          </div>

          {/* options, tucked away by default */}
          {expanded && (
            <div className="mt-2.5 flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
              <div className="flex justify-center gap-1">
                {[
                  { key: "timer", label: "Timer", Icon: Hourglass },
                  { key: "stopwatch", label: "Stopwatch", Icon: Timer },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setTimerMode(m.key)}
                    disabled={running}
                    className={`pill flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold transition disabled:opacity-50 ${
                      timerMode === m.key
                        ? "bg-glow text-plum"
                        : "bg-white/10 text-petal hover:bg-white/20"
                    }`}
                  >
                    <m.Icon size={10} /> {m.label}
                  </button>
                ))}
              </div>

              {!stopwatch && (
                <>
                  <div className="flex items-center justify-center gap-1">
                    {focusPresets.map((m) => (
                      <button
                        key={m}
                        onClick={() => setFocus(m)}
                        className={`pill px-2 py-0.5 text-[11px] font-semibold transition ${
                          focusMinutes === m
                            ? "bg-glow text-plum"
                            : "bg-white/10 text-petal hover:bg-white/20"
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPomodoro({ enabled: !pomodoro.enabled })}
                    className={`pill mx-auto px-3 py-1 text-[11px] font-semibold transition ${
                      pomodoro.enabled
                        ? "bg-rose/80 text-plum"
                        : "bg-white/10 text-petal hover:bg-white/20"
                    }`}
                  >
                    🍅 Pomodoro {pomodoro.enabled ? "on" : "off"}
                  </button>
                  {pomodoro.enabled && (
                    <>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                          break
                        </span>
                        {BREAK_PRESETS.map((m) => (
                          <button
                            key={m}
                            onClick={() => setPomodoro({ breakMinutes: m })}
                            className={`pill px-2 py-0.5 text-[11px] font-semibold transition ${
                              pomodoro.breakMinutes === m
                                ? "bg-sage text-plum"
                                : "bg-white/10 text-petal hover:bg-white/20"
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                          rounds
                        </span>
                        {ROUND_PRESETS.map((n) => (
                          <button
                            key={n}
                            onClick={() => setPomodoro({ rounds: n })}
                            className={`pill px-2 py-0.5 text-[11px] font-semibold transition ${
                              pomodoro.rounds === n
                                ? "bg-rose text-plum"
                                : "bg-white/10 text-petal hover:bg-white/20"
                            }`}
                          >
                            ×{n}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {stopwatch && (
                <p className="text-center text-[10px] text-petal/60">
                  Counts up — ✓ logs the tracked time.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Daily goal + streak: chromeless, straight on the backdrop (VC2
            keeps this on the main screen, not buried in a stats dialog). */}
        <p
          title="Today's focus vs your daily goal (set in Progress) and your streak of goal-met days"
          className={`mt-1.5 flex items-center justify-center gap-1 text-center text-[11px] font-semibold drop-shadow ${
            goalMet ? "text-sage" : "text-petal/60"
          }`}
        >
          <Target size={11} className="shrink-0" />
          {focusMinutesLive}/{dailyGoal}m{goalMet ? " ✓" : ""}
          {streak > 0 && (
            <span className="ml-1 flex items-center gap-0.5">
              <Flame size={11} className="shrink-0 text-amber" />
              {streak}d
            </span>
          )}
        </p>
      </motion.div>
    </div>
  );
}
