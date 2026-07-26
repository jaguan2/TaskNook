import { useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { useStore } from "../store";

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
  } = useStore();
  const [expanded, setExpanded] = useState(false);
  const dragControls = useDragControls();

  const stopwatch = timerMode === "stopwatch";
  const inBreak = !stopwatch && phase === "break";
  const total = (inBreak ? pomodoro.breakMinutes : focusMinutes) * 60;
  const progress = stopwatch ? (elapsed % 60) / 60 : total > 0 ? 1 - remaining / total : 0;
  const barColor = inBreak ? "#7faf8f" : stopwatch ? "#6fb8cf" : "#ffe9b0";

  const heading = inBreak ? "Break time ☕" : activeTask?.name;

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

          <p className="text-center text-[26px] font-bold leading-8 tabular-nums text-cream">
            {fmt(stopwatch ? elapsed : remaining)}
          </p>

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
              onClick={resetTimer}
              title="Reset"
              className="pill grid h-8 w-8 place-items-center text-sm text-petal/70 hover:bg-white/10 hover:text-cream"
            >
              ✕
            </button>
            {!running ? (
              <button
                onClick={startTimer}
                title={stopwatch ? "Start tracking" : "Start focusing"}
                className="pill grid h-9 w-12 place-items-center bg-glow text-sm font-bold text-plum shadow-soft hover:bg-amber"
              >
                ▶
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                title="Pause"
                className="pill grid h-9 w-12 place-items-center bg-blush text-sm font-bold text-plum shadow-soft hover:bg-rose"
              >
                ❚❚
              </button>
            )}
            {stopwatch && (
              <button
                onClick={finishStopwatch}
                disabled={elapsed === 0}
                title="Finish and log the tracked time"
                className="pill grid h-8 w-8 place-items-center bg-sage/80 text-sm font-bold text-plum hover:bg-sage disabled:opacity-40"
              >
                ✓
              </button>
            )}
            <button
              onClick={() => setExpanded((e) => !e)}
              title="Timer options"
              className={`pill grid h-8 w-8 place-items-center text-sm transition ${
                expanded ? "bg-white/15 text-cream" : "text-petal/70 hover:bg-white/10 hover:text-cream"
              }`}
            >
              {expanded ? "▴" : "⚙"}
            </button>
          </div>

          {/* options, tucked away by default */}
          {expanded && (
            <div className="mt-2.5 flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
              <div className="flex justify-center gap-1">
                {[
                  { key: "timer", label: "⏳ timer" },
                  { key: "stopwatch", label: "⏱ stopwatch" },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setTimerMode(m.key)}
                    disabled={running}
                    className={`pill px-2.5 py-0.5 text-[10px] font-semibold transition disabled:opacity-50 ${
                      timerMode === m.key
                        ? "bg-petal text-plum"
                        : "bg-white/10 text-petal hover:bg-white/20"
                    }`}
                  >
                    {m.label}
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
                            ? "bg-petal text-plum"
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
                    🍅 pomodoro {pomodoro.enabled ? "on" : "off"}
                  </button>
                  {pomodoro.enabled && (
                    <>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] text-petal/60">break</span>
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
                        <span className="text-[10px] text-petal/60">rounds</span>
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
      </motion.div>
    </div>
  );
}
