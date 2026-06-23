import { useStore } from "../store";

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
  } = useStore();

  const total = focusMinutes * 60;
  const progress = total > 0 ? 1 - remaining / total : 0;

  return (
    <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
      <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-4 shadow-soft">
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
                stroke="#ffe9b0"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <span className="text-xl font-bold tabular-nums text-cream">
              {fmt(remaining)}
            </span>
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
            </div>

            <div className="flex gap-1.5">
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
          </div>
        </div>

        <p className="max-w-[260px] truncate text-center text-xs text-petal/80">
          {activeTask ? `Working on “${activeTask.name}”` : "No task selected — open Tasks to pick one"}
        </p>
      </div>
    </div>
  );
}
