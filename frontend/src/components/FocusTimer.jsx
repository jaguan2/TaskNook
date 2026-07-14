import { motion, useDragControls } from "framer-motion";
import { useStore } from "../store";

const BREAK_PRESETS = [3, 5, 10];
const ROUND_PRESETS = [2, 3, 4, 6];

function fmt(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function FocusTimer() {
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
  } = useStore();

  const inBreak = phase === "break";
  const total = (inBreak ? pomodoro.breakMinutes : focusMinutes) * 60;
  const progress = total > 0 ? 1 - remaining / total : 0;
  const dragControls = useDragControls();

  return (
    // Centered with a flex wrapper instead of -translate-x-1/2: framer-motion's
    // drag writes an inline `transform` that would overwrite a Tailwind
    // translate class and knock the card off-center.
    <div className="intro-chrome pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
      <motion.div
        drag
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        className="pointer-events-auto"
      >
        <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-4 shadow-soft">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            title="Drag to move"
            className="-mt-1 mb-1 h-1.5 w-10 shrink-0 cursor-grab rounded-full bg-white/20 active:cursor-grabbing"
          />
          {/* progress ring + time */}
          <div className="flex items-center gap-5">
            <div className="relative grid h-20 w-20 place-items-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="rgba(243,198,192,0.18)"
                  strokeWidth="6"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke={inBreak ? "#7faf8f" : "#ffe9b0"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - progress)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="text-center">
                <span className="block text-xl font-bold tabular-nums text-cream">
                  {fmt(remaining)}
                </span>
                {pomodoro.enabled && (
                  <span className={`block text-[9px] font-semibold ${inBreak ? "text-sage" : "text-petal/60"}`}>
                    {inBreak ? "☕ break" : `${round}/${pomodoro.rounds}`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {!running ? (
                  <button
                    onClick={startTimer}
                    className="pill bg-glow px-5 py-2 font-semibold text-plum shadow-soft hover:bg-amber"
                  >
                    ▶ Focus
                  </button>
                ) : (
                  <button
                    onClick={pauseTimer}
                    className="pill bg-blush px-5 py-2 font-semibold text-plum shadow-soft hover:bg-rose"
                  >
                    ❚❚ Pause
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  className="pill glass px-4 py-2 font-medium text-cream hover:bg-white/10"
                >
                  ↺
                </button>
                <button
                  onClick={() => setPomodoro({ enabled: !pomodoro.enabled })}
                  title="Pomodoro: focus → break cycles for a set number of rounds"
                  className={`pill px-3 py-2 text-sm font-semibold transition ${
                    pomodoro.enabled
                      ? "bg-rose/80 text-plum"
                      : "bg-white/10 text-petal hover:bg-white/20"
                  }`}
                >
                  🍅
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {pomodoro.enabled && (
                  <span className="w-11 text-right text-[10px] text-petal/60">focus</span>
                )}
                {focusPresets.map((m) => (
                  <button
                    key={m}
                    onClick={() => setFocus(m)}
                    className={`pill px-3 py-1 text-xs font-semibold transition ${
                      focusMinutes === m
                        ? "bg-petal text-plum"
                        : "bg-white/10 text-petal hover:bg-white/20"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>

              {pomodoro.enabled && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-11 text-right text-[10px] text-petal/60">break</span>
                    {BREAK_PRESETS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setPomodoro({ breakMinutes: m })}
                        className={`pill px-3 py-1 text-xs font-semibold transition ${
                          pomodoro.breakMinutes === m
                            ? "bg-sage text-plum"
                            : "bg-white/10 text-petal hover:bg-white/20"
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-11 text-right text-[10px] text-petal/60">rounds</span>
                    {ROUND_PRESETS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setPomodoro({ rounds: n })}
                        className={`pill px-3 py-1 text-xs font-semibold transition ${
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

          <p className="max-w-[280px] truncate text-center text-xs text-petal/80">
            {inBreak
              ? `On a break — round ${round} of ${pomodoro.rounds} done ☕`
              : activeTask
              ? `Working on “${activeTask.name}”`
              : "No task selected — open Tasks to pick one"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
