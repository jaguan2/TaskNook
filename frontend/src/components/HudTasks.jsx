import { useState } from "react";
import { useStore } from "../store";

// The top-right to-do HUD (Virtual Cottage-style): today's list always in
// sight — check things off and quick-add without opening a panel. The full
// Tasks drawer (priorities, durations, ordering algorithms) is one click away.
export default function HudTasks({ onOpenTasks }) {
  const { orderedTasks, toggleTask, addTask, activeTaskId, setActiveTaskId } = useStore();
  const [draft, setDraft] = useState("");

  const active = orderedTasks.filter((t) => !t.completed);
  const done = orderedTasks.length - active.length;

  const submit = async (e) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    try {
      await addTask({ name, duration: 25, priority: "medium" });
    } catch (err) {
      console.error("Quick-add failed:", err);
    }
  };

  return (
    <div className="intro-chrome absolute right-6 top-6 z-20 flex max-h-[46vh] w-72 flex-col rounded-3xl glass shadow-soft">
      <header className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <p className="text-sm font-bold text-cream">
          To-Do{" "}
          <span className="font-semibold text-petal/60">
            ({done}/{orderedTasks.length})
          </span>
        </p>
        <button
          onClick={onOpenTasks}
          title="Open the full task manager (priorities, ordering, durations)"
          className="pill px-2.5 py-1 text-xs text-petal hover:bg-white/10"
        >
          ⚙
        </button>
      </header>

      <div className="cozy-scroll min-h-0 flex-1 overflow-y-auto px-2.5">
        {active.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-petal/60">
            All clear 🌿 add something below.
          </p>
        ) : (
          active.map((task) => (
            <div
              key={task.id}
              className={`group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition ${
                activeTaskId === task.id ? "bg-glow/10" : "hover:bg-white/5"
              }`}
            >
              <button
                onClick={() => toggleTask(task)}
                title="Mark complete"
                className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border-2 border-petal/50 text-transparent transition hover:border-glow"
              >
                ✓
              </button>
              <button
                onClick={() => setActiveTaskId(task.id)}
                title="Focus on this task"
                className="min-w-0 flex-1 text-left"
              >
                <span
                  className={`block truncate text-sm ${
                    activeTaskId === task.id ? "font-semibold text-glow" : "text-cream"
                  }`}
                >
                  {task.name}
                </span>
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="px-3 pb-3 pt-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="+ new task"
          className="w-full rounded-xl bg-white/10 px-3 py-1.5 text-sm text-cream placeholder:text-petal/40 outline-none focus:bg-white/15"
        />
      </form>
    </div>
  );
}
