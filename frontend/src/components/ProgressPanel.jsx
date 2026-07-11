import { useStore } from "../store";

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
  const { stats, tasks } = useStore();
  const completion = stats.completion || 0;
  const hours = Math.floor(stats.focusMinutesToday / 60);
  const mins = stats.focusMinutesToday % 60;

  const totalPlannedMin = tasks
    .filter((t) => !t.completed)
    .reduce((sum, t) => sum + t.duration, 0);

  return (
    <div className="space-y-5">
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
          {stats.tasksDone} of {stats.tasksTotal} tasks done
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
          {Array.from({ length: Math.max(1, Math.ceil(stats.focusMinutesToday / 15)) }).map(
            (_, i) => (
              <span key={i} className="animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
                {stats.focusMinutesToday === 0 ? "🌱" : ["🌿", "🍃", "🌷", "🌻"][i % 4]}
              </span>
            )
          )}
        </div>
        <p className="mt-1 text-xs text-petal/60">
          {stats.focusMinutesToday === 0
            ? "Start a focus block to grow your garden."
            : "Every 15 minutes of focus grows a new plant. Keep going! 🌙"}
        </p>
      </div>
    </div>
  );
}
