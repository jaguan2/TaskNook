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

// The top-left focus HUD (Virtual Cottage-style): the task you're on and a
// compact timer/stopwatch card, always visible instead of tucked away.
// Absorbs the old bottom-centre FocusTimer (pomodoro included) and the old
// top-left status text.
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

  const stopwatch = timerMode === "stopwatch";
  const inBreak = !stopwatch && phase === "break";
  const total = (inBreak ? pomodoro.breakMinutes : focusMinutes) * 60;
  // The stopwatch ring sweeps once per minute — motion without a target.
  const progress = stopwatch ? (elapsed % 60) / 60 : total > 0 ? 1 - remaining / total : 0;
  const dragControls = useDragControls();

  const status = running
    ? inBreak
      ? "Break time ☕"
      : stopwatch
      ? "Tracking"
      : "Focusing"
    : "Cozy break";

  return (
    <div className="intro-chrome pointer-events-none absolute left-6 top-6 z-20">
      <motion.div
        drag
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        className="pointer-events-auto"
      >
        {/* what you're working on, as the heading — VC2 style */}
        <h1 className="max-w-[300px] truncate text-2xl font-bold tracking-wide text-cream drop-shadow">
          {activeTask ? activeTask.name : status}
        </h1>
        <p className="mb-2 mt-0.5 text-xs font-medium text-petal/80">
          {activeTask ? status : "Pick a task & press play"}
          {!stopwatch && running && ` · ${Math.ceil(remaining / 60)} min to go`}
        </p>

        <div className="glass inline-flex flex-col gap-2.5 rounded-3xl px-5 py-4 shadow-soft">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            title="Drag to move"
            className="-mt-1 mx-auto h-1.5 w-10 shrink-0 cursor-grab rounded-full bg-white/20 active:cursor-grabbing"
          />

          <div className="flex items-center gap-4">
            {/* ring + time */}
            <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(243,198,192,0.18)" strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke={inBreak ? "#7faf8f" : stopwatch ? "#6fb8cf" : "#ffe9b0"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - progress)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="text-center">
                <span className="block text-lg font-bold tabular-nums text-cream">
                  {fmt(stopwatch ? elapsed : remaining)}
                </span>
                {!stopwatch && pomodoro.enabled && (
                  <span className={`block text-[9px] font-semibold ${inBreak ? "text-sage" : "text-petal/60"}`}>
                    {inBreak ? "☕ break" : `${round}/${pomodoro.rounds}`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* mode: countdown vs stopwatch (locked while running) */}
              <div className="flex gap-1">
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

              <div className="flex gap-1.5">
                {!running ? (
                  <button
                    onClick={startTimer}
                    className="pill bg-glow px-4 py-1.5 text-sm font-semibold text-plum shadow-soft hover:bg-amber"
                  >
                    ▶ {stopwatch ? "Start" : "Focus"}
                  </button>
                ) : (
                  <button
                    onClick={pauseTimer}
                    className="pill bg-blush px-4 py-1.5 text-sm font-semibold text-plum shadow-soft hover:bg-rose"
                  >
                    ❚❚ Pause
                  </button>
                )}
                {stopwatch ? (
                  <button
                    onClick={finishStopwatch}
                    disabled={elapsed === 0}
                    title="Finish and log the tracked time"
                    className="pill bg-sage/80 px-3 py-1.5 text-sm font-semibold text-plum shadow-soft hover:bg-sage disabled:opacity-40"
                  >
                    ✓
                  </button>
                ) : (
                  <button
                    onClick={() => setPomodoro({ enabled: !pomodoro.enabled })}
                    title="Pomodoro: focus → break cycles for a set number of rounds"
                    className={`pill px-2.5 py-1.5 text-sm font-semibold transition ${
                      pomodoro.enabled
                        ? "bg-rose/80 text-plum"
                        : "bg-white/10 text-petal hover:bg-white/20"
                    }`}
                  >
                    🍅
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  title="Reset"
                  className="pill glass px-3 py-1.5 text-sm font-medium text-cream hover:bg-white/10"
                >
                  ↺
                </button>
              </div>

              {!stopwatch && (
                <div className="flex items-center gap-1">
                  {pomodoro.enabled && (
                    <span className="w-9 text-right text-[10px] text-petal/60">focus</span>
                  )}
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
              )}

              {!stopwatch && pomodoro.enabled && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="w-9 text-right text-[10px] text-petal/60">break</span>
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
                  <div className="flex items-center gap-1">
                    <span className="w-9 text-right text-[10px] text-petal/60">rounds</span>
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
            </div>
          </div>

          {stopwatch && (
            <p className="max-w-[260px] text-center text-[11px] text-petal/70">
              Counting up — ✓ finishes and logs the time.
            </p>
          )}
          {inBreak && (
            <p className="max-w-[260px] text-center text-[11px] text-petal/70">
              On a break — round {round} of {pomodoro.rounds} done ☕
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
