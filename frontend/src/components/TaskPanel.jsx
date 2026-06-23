import { useState, useRef } from "react";
import { useStore } from "../store";
import { ALGORITHMS, ALGORITHM_KEYS } from "../lib/algorithms";

const PRIORITY_STYLE = {
  high: "bg-rose/30 text-rose border-rose/40",
  medium: "bg-amber/20 text-amber border-amber/40",
  low: "bg-sage/20 text-sage border-sage/40",
};

export default function TaskPanel() {
  const {
    orderedTasks,
    algorithm,
    chooseAlgorithm,
    addTask,
    toggleTask,
    removeTask,
    reorderTasks,
    activeTaskId,
    setActiveTaskId,
  } = useStore();

  const [name, setName] = useState("");
  const [duration, setDuration] = useState(25);
  const [priority, setPriority] = useState("medium");
  const [error, setError] = useState("");
  const dragIndex = useRef(null);

  const active = orderedTasks.filter((t) => !t.completed);
  const done = orderedTasks.filter((t) => t.completed);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await addTask({ name: name.trim(), duration: Number(duration), priority });
      setName("");
      setDuration(25);
      setPriority("medium");
    } catch (err) {
      setError(err.message);
    }
  };

  const onDrop = (index) => {
    const from = dragIndex.current;
    if (from === null || from === index) return;
    const next = [...active];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    dragIndex.current = null;
    reorderTasks(next);
  };

  const algo = ALGORITHMS[algorithm];

  return (
    <div className="space-y-5">
      {/* Add task */}
      <form onSubmit={submit} className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What needs doing?"
          className="w-full rounded-xl bg-white/10 px-3 py-2 text-cream placeholder:text-petal/50 outline-none focus:ring-2 focus:ring-glow/50"
        />
        <div className="flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-petal">
            ⏱
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-transparent text-cream outline-none"
            />
            min
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm text-cream outline-none"
          >
            <option className="bg-plum" value="low">Low</option>
            <option className="bg-plum" value="medium">Medium</option>
            <option className="bg-plum" value="high">High</option>
          </select>
        </div>
        <button className="pill w-full bg-glow py-2 font-semibold text-plum hover:bg-amber">
          + Add task
        </button>
        {error && <p className="text-xs text-rose">{error}</p>}
      </form>

      {/* Algorithm selector */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
          Arrange by
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALGORITHM_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => chooseAlgorithm(key)}
              className={`pill px-3 py-1.5 text-xs font-semibold transition ${
                algorithm === key
                  ? "bg-petal text-plum"
                  : "bg-white/10 text-petal hover:bg-white/20"
              }`}
            >
              {ALGORITHMS[key].icon} {ALGORITHMS[key].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-petal/60">{algo.hint}</p>
      </div>

      {/* Active tasks */}
      <div className="space-y-2">
        {active.length === 0 && (
          <p className="rounded-xl bg-white/5 px-3 py-6 text-center text-sm text-petal/60">
            No tasks yet — add one above to start your cozy session. 🌿
          </p>
        )}
        {active.map((task, index) => (
          <div
            key={task.id}
            draggable={algorithm === "custom"}
            onDragStart={() => (dragIndex.current = index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(index)}
            className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
              activeTaskId === task.id
                ? "border-glow/60 bg-glow/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <button
              onClick={() => toggleTask(task)}
              title="Mark complete"
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-petal/50 text-transparent hover:border-glow"
            >
              ✓
            </button>
            <button
              onClick={() => setActiveTaskId(task.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-medium text-cream">{task.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs text-petal/70">{task.duration} min</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[task.priority]}`}
                >
                  {task.priority}
                </span>
                {activeTaskId === task.id && (
                  <span className="text-[10px] font-semibold text-glow">● focusing</span>
                )}
              </div>
            </button>
            {algorithm === "custom" && (
              <span className="cursor-grab text-petal/40">⠿</span>
            )}
            <button
              onClick={() => removeTask(task.id)}
              className="text-petal/40 opacity-0 transition hover:text-rose group-hover:opacity-100"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-petal/60">
            Done · {done.length}
          </p>
          {done.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 opacity-60"
            >
              <button
                onClick={() => toggleTask(task)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage text-xs text-plum"
              >
                ✓
              </button>
              <p className="flex-1 truncate text-sm text-cream line-through">
                {task.name}
              </p>
              <button
                onClick={() => removeTask(task.id)}
                className="text-petal/40 hover:text-rose"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
