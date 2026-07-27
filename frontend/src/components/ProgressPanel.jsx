import { Flame, Sparkles, Target } from "lucide-react";
import { useStore } from "../store";
import { focusStreak, localTodayISO } from "../lib/stats";

// VC2-style daily goal ring: today's focus minutes against a user-set target.
function GoalRing({ minutes, goal }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, goal > 0 ? minutes / goal : 0);
  return (
    <svg viewBox="0 0 84 84" className="h-24 w-24 -rotate-90">
      <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        stroke={frac >= 1 ? "#7faf8f" : "#ffe9b0"}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        style={{ transition: "stroke-dashoffset 0.7s ease" }}
      />
    </svg>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
      <p className="text-2xl font-bold text-cream">{value}</p>
      <p className="text-xs text-petal/70">{label}</p>
      {sub && <p className="text-[10px] text-petal/50">{sub}</p>}
    </div>
  );
}

export default function ProgressPanel() {
  const { stats, tasks, sessionDays, dailyGoal, setDailyGoal, focusMinutesLive } = useStore();
  const completion = stats.completion || 0;
  const hours = Math.floor(focusMinutesLive / 60);
  const mins = focusMinutesLive % 60;

  const totalPlannedMin = tasks
    .filter((t) => !t.completed)
    .reduce((sum, t) => sum + t.duration, 0);

  const streak = focusStreak(
    { ...sessionDays, [localTodayISO()]: focusMinutesLive },
    dailyGoal,
    localTodayISO()
  );
  const goalMet = focusMinutesLive >= dailyGoal;

  return (
    <div className="space-y-5">
      {/* Daily goal ring + streak */}
      <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-3">
        <div className="relative grid place-items-center">
          <GoalRing minutes={focusMinutesLive} goal={dailyGoal} />
          <span className={`absolute ${goalMet ? "text-sage" : "text-glow"}`}>
            {goalMet ? <Sparkles size={20} /> : <Target size={20} />}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-cream">
            Daily goal{" "}
            <span className={goalMet ? "text-sage" : "text-glow"}>
              {focusMinutesLive} / {dailyGoal} min
            </span>
          </p>
          <p className="flex items-center gap-1 text-xs text-petal/60">
            <Flame size={12} className="shrink-0 text-amber" />{" "}
            <span className="font-semibold text-cream">{streak}</span> day
            {streak === 1 ? "" : "s"} streak
            {goalMet ? " — today's in the bag." : streak > 0 ? " — keep it alive!" : ""}
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            {[60, 120, 180, 240].map((m) => (
              <button
                key={m}
                onClick={() => setDailyGoal(m)}
                className={`pill px-2 py-0.5 text-[11px] font-semibold transition ${
                  dailyGoal === m
                    ? "bg-glow text-plum"
                    : "bg-white/10 text-petal hover:bg-white/20"
                }`}
              >
                {m >= 60 ? `${m / 60}h` : `${m}m`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Completion bar */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-cream">Today's completion</p>
          <p className="text-sm font-bold text-glow">{completion}%</p>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blush to-glow transition-all duration-700"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-petal/60">
          {stats.tasksTotal === 0
            ? "No tasks yet today — they'll show up here as you add them. 🌿"
            : `${stats.tasksDone} of ${stats.tasksTotal} tasks done`}
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Focus today" value={`${hours}h ${mins}m`} />
        <Stat label="Tasks done" value={stats.tasksDone} />
        <Stat label="Remaining" value={`${totalPlannedMin}m`} sub="planned work" />
      </div>

      {/* Productivity garden — one leaf per ~15 focus minutes */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
          Productivity garden
        </p>
        <div className="flex flex-wrap gap-1 rounded-2xl bg-white/5 p-3 text-xl">
          {Array.from({ length: Math.max(1, Math.ceil(focusMinutesLive / 15)) }).map(
            (_, i) => (
              <span key={i} className="animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
                {focusMinutesLive === 0 ? "🌱" : ["🌿", "🍃", "🌷", "🌻"][i % 4]}
              </span>
            )
          )}
        </div>
        <p className="mt-1 text-xs text-petal/60">
          {focusMinutesLive === 0
            ? "Start a focus block to grow your garden."
            : "Every 15 minutes of focus grows a new plant. Keep going! 🌙"}
        </p>
      </div>
    </div>
  );
}

