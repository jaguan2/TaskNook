import { useRef, useState } from "react";
import { useStore } from "../store";

// The top-right to-do list, drawn straight onto the backdrop (no card/dialog
// chrome) — Virtual Cottage-style. Checked tasks stay visible, crossed out;
// rows can be deleted with ✕ and re-ordered by dragging the ⠿ handle. The
// full Tasks drawer (priorities, durations, ordering algorithms) is behind ⚙.
export default function HudTasks({ onOpenTasks }) {
  const { orderedTasks, toggleTask, addTask, removeTask, reorderTasks, activeTaskId, setActiveTaskId } =
    useStore();
  const [draft, setDraft] = useState("");
  const dragIndex = useRef(null);

  // orderedTasks already sinks completed tasks to the bottom.
  const active = orderedTasks.filter((t) => !t.completed);
  const done = orderedTasks.filter((t) => t.completed);

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

  const onDrop = (index) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === index) return;
    const next = [...active];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    reorderTasks(next);
  };

  const Row = ({ task, index, draggableRow }) => (
    <div
      draggable={draggableRow}
      onDragStart={() => (dragIndex.current = index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(index)}
      className={`group flex items-center gap-1.5 rounded-lg px-1 py-1 transition ${
        activeTaskId === task.id ? "bg-glow/10" : "hover:bg-white/5"
      }`}
    >
      <span
        className={`w-3 shrink-0 text-xs text-petal/40 opacity-0 transition group-hover:opacity-100 ${
          draggableRow ? "cursor-grab" : "invisible"
        }`}
      >
        ⠿
      </span>
      <button
        onClick={() => toggleTask(task)}
        title={task.completed ? "Mark as not done" : "Mark complete"}
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border-2 text-[11px] transition ${
          task.completed
            ? "border-sage bg-sage text-plum"
            : "border-petal/50 text-transparent hover:border-glow"
        }`}
      >
        ✓
      </button>
      <button
        onClick={() => !task.completed && setActiveTaskId(task.id)}
        title={task.completed ? undefined : "Focus on this task"}
        className="min-w-0 flex-1 text-left"
      >
        <span
          className={`block truncate text-sm ${
            task.completed
              ? "text-petal/50 line-through"
              : activeTaskId === task.id
              ? "font-semibold text-glow"
              : "text-cream"
          }`}
        >
          {task.name}
        </span>
      </button>
      <button
        onClick={() => removeTask(task.id)}
        title="Delete task"
        className="shrink-0 px-1 text-sm text-petal/30 opacity-0 transition hover:text-rose group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );

  return (
    <div className="intro-chrome absolute right-6 top-5 z-20 flex max-h-[52vh] w-72 flex-col">
      <header className="flex items-center justify-between px-1 pb-1.5">
        <p className="text-base font-bold tracking-wide text-cream drop-shadow">
          To-Do-List{" "}
          <span className="text-sm font-semibold text-petal/60">
            ({done.length}/{orderedTasks.length})
          </span>
        </p>
        <button
          onClick={onOpenTasks}
          title="Open the full task manager (priorities, ordering, durations)"
          className="pill px-2 py-0.5 text-sm text-petal/60 hover:bg-white/10 hover:text-petal"
        >
          ⚙
        </button>
      </header>

      <div className="cozy-scroll min-h-0 flex-1 overflow-y-auto">
        {orderedTasks.length === 0 && (
          <p className="px-2 py-3 text-xs text-petal/50">All clear 🌿</p>
        )}
        {active.map((task, i) => (
          <Row key={task.id} task={task} index={i} draggableRow />
        ))}
        {done.map((task) => (
          <Row key={task.id} task={task} index={-1} draggableRow={false} />
        ))}
      </div>

      <form onSubmit={submit} className="mt-1 border-t border-white/10 px-1 pt-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="＋ New Task"
          className="w-full bg-transparent px-1 py-1 text-sm text-cream placeholder:text-petal/40 outline-none"
        />
      </form>
    </div>
  );
}
