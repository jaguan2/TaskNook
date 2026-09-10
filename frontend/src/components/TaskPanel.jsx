import { useState, useRef } from "react";
import { CalendarClock, ChevronDown, ChevronUp, Flame, GripVertical, Pencil, Sparkles, Target } from "lucide-react";
import { useStore } from "../store";
import { useTimer } from "../timer";
import { ALGORITHMS, ALGORITHM_KEYS } from "../lib/algorithms";
import { focusStreak, localTodayISO } from "../lib/stats";
import { formatSpan } from "../lib/breaks";
import ConfirmDialog from "./ConfirmDialog";

// The three are a SCALE, so all three colours have to be fixed ones or the
// scale stops meaning anything. `danger` rather than `rose` for high: rose is
// re-tinted per theme (blue in shore, grey in linen, tan in walnut), so urgent
// tasks lost their urgency in three of the four presets — and in the warm ones
// they landed next to medium's amber, making the top two steps indistinguishable.
// Same reasoning the delete grammar already uses. amber/sage are fixed already.
const PRIORITY_STYLE = {
  high: "bg-danger/25 text-danger border-danger/40",
  medium: "bg-amber/20 text-amber border-amber/40",
  low: "bg-sage/20 text-sage border-sage/40",
};

// VC2-style daily goal ring: today's focus minutes against a user-set target.
// Lived in the Progress panel until that panel was dissolved (2026-08-16) —
// the goal is set here now, beside the list it exists to serve.
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
    editTask,
    stats,
    sessionDays,
    dailyGoal,
    setDailyGoal,
  } = useStore();
  // The FULL timer context, deliberately: the goal ring displays live minutes,
  // so this panel ticking once a second while open is correct — the same
  // bargain the focus card makes. Components that merely react to a session
  // use useTimerStatus instead.
  const { focusMinutesLive, breakNudge, setBreakNudge, breakNudgeMinutes } = useTimer();

  const [name, setName] = useState("");
  const [duration, setDuration] = useState(25);
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dragIndex = useRef(null);

  const [deleting, setDeleting] = useState(null);
  const confirmId = null;
  const [editingId, setEditingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const requestDelete = (task) => setDeleting(task);
  const finishRename = (task) => {
    const next = renameDraft.trim();
    setEditingId(null);
    if (next && next !== task.name) editTask(task.id, { name: next });
  };

  const active = orderedTasks.filter((t) => !t.completed);
  const done = orderedTasks.filter((t) => t.completed);

  const submit = async (e) => {
    e.preventDefault();
    // busy guard: a double Enter would otherwise create the task twice
    // (HudTasks clears its draft pre-await; Friends uses the same flag).
    if (busy || !name.trim()) return;
    setError("");
    setBusy(true);
    try {
      // Guard against an emptied number field (Number("") === 0).
      await addTask({
        name: name.trim(),
        duration: Math.max(1, Math.min(1440, Math.round(Number(duration) || 25))),
        priority,
        dueDate: dueDate || null,
      });
      setName("");
      setDuration(25);
      setPriority("medium");
      setDueDate("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
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
  const moveTask = (index, direction) => {
    const to = index + direction;
    if (to < 0 || to >= active.length) return;
    const next = [...active];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    reorderTasks(next);
  };

  const algo = ALGORITHMS[algorithm];

  const completion = stats.completion || 0;
  const totalPlannedMin = active.reduce((sum, t) => sum + t.duration, 0);
  // Today's square counts the running block, same reason the goal chip does —
  // without the live part the panel reads as "not tracking me".
  const streak = focusStreak(
    { ...sessionDays, [localTodayISO()]: focusMinutesLive },
    dailyGoal,
    localTodayISO()
  );
  const goalMet = focusMinutesLive >= dailyGoal;

  return (
    <>
    <div className="space-y-5">
      {/* Add task */}
      <form onSubmit={submit} className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          placeholder="What needs doing?"
          className="w-full rounded-xl bg-white/10 px-3 py-2 text-cream placeholder:text-petal/50 outline-none focus:ring-2 focus:ring-glow/50"
        />
        <div className="flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-petal">
            ⏱
            <input
              type="number"
              min="1"
              max="1440"
              aria-label="Estimated minutes"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-transparent text-cream outline-none"
            />
            min
          </label>
          <select
            aria-label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm text-cream outline-none"
          >
            <option className="bg-plum" value="low">Low</option>
            <option className="bg-plum" value="medium">Medium</option>
            <option className="bg-plum" value="high">High</option>
          </select>
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-petal">
          Due date <span className="text-petal/50">(optional)</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            aria-label="Due date" className="ml-auto min-w-0 bg-transparent text-cream outline-none" />
        </label>
        <button
          disabled={busy}
          className="pill w-full bg-glow py-2 font-semibold text-plum hover:bg-amber disabled:opacity-50"
        >
          + Add task
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
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
                  ? "bg-glow text-plum"
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
              aria-label="Mark complete"
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-petal/50 text-transparent hover:border-glow"
            >
              ✓
            </button>
            <div className="min-w-0 flex-1">
              {editingId === task.id ? (
                <input autoFocus value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => finishRename(task)} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  aria-label="Task name" maxLength={200}
                  className="w-full rounded-md bg-white/10 px-1.5 py-0.5 text-sm font-medium text-cream outline-none focus:bg-white/15" />
              ) : (
                <button onClick={() => setActiveTaskId(task.id)} title="Focus on this task" className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium text-cream">{task.name}</p>
                </button>
              )}
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs text-petal/70">{task.duration} min</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[task.priority]}`}
                >
                  {task.priority}
                </span>
                {task.dueDate && (
                  <span
                    title={`Due ${task.dueDate}`}
                    className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                      task.dueDate < localTodayISO() ? "text-danger" : "text-petal/60"
                    }`}
                  >
                    <CalendarClock size={10} /> {task.dueDate.slice(5)}
                  </span>
                )}
                {activeTaskId === task.id && (
                  <span className="text-[10px] font-semibold text-glow">● focusing</span>
                )}
              </div>
            </div>
            <button onClick={() => { setEditingId(task.id); setRenameDraft(task.name); }} title="Rename task" aria-label={`Rename ${task.name}`}
              className="hover-reveal shrink-0 text-petal/40 hover:text-cream"><Pencil size={13} /></button>
            {algorithm === "custom" && (
              <div className="flex shrink-0 items-center gap-0.5">
                <GripVertical size={13} className="cursor-grab text-petal/40" aria-hidden="true" />
                <button
                  onClick={() => moveTask(index, -1)}
                  disabled={index === 0}
                  title="Move task up"
                  aria-label={`Move ${task.name} up`}
                  className="text-petal/50 hover:text-cream disabled:opacity-20"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => moveTask(index, 1)}
                  disabled={index === active.length - 1}
                  title="Move task down"
                  aria-label={`Move ${task.name} down`}
                  className="text-petal/50 hover:text-cream disabled:opacity-20"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
            )}
            <button
              onClick={() => requestDelete(task)}
              title="Delete task"
              aria-label="Delete task"
              className={`hover-reveal shrink-0 transition ${
                confirmId === task.id
                  ? "confirming text-[10px] font-bold text-danger"
                  : "text-sm text-petal/40 hover:text-danger"
              }`}
            >
              {confirmId === task.id ? "sure?" : "✕"}
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
                title="Mark as not done"
                aria-label="Mark as not done"
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage text-xs text-plum"
              >
                ✓
              </button>
              <p className="flex-1 truncate text-sm text-cream line-through">
                {task.name}
              </p>
              <button
                onClick={() => requestDelete(task)}
                title="Delete task"
                aria-label="Delete task"
                className={`shrink-0 transition ${
                  confirmId === task.id
                    ? "text-[10px] font-bold text-danger"
                    : "text-sm text-petal/40 hover:text-danger"
                }`}
              >
                {confirmId === task.id ? "sure?" : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Completion bar — LIST-wide, not today's. `tasksDone`/`tasksTotal`
          count the whole standing list (a to-do list isn't recreated each
          morning), so the heading must not claim "today": it once said so
          over lifetime counts and the bar never moved. Only rendered when
          there's a list to summarise — a permanent 0% over an empty list is
          a reproach, not a stat. */}
      {stats.tasksTotal > 0 && (
        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-cream">List completion</p>
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
            {stats.tasksDoneToday > 0 && <> · {stats.tasksDoneToday} today</>}
            {totalPlannedMin > 0 && <> · {totalPlannedMin}m still planned</>}
          </p>
        </div>
      )}

      {/* Daily goal ring + streak. Configured here since the Progress panel
          was dissolved; the scene's goal chip reads the same numbers. */}
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

      {/* Break nudge. It sits under the goal because it's the other half of
          the same idea — the goal pushes, this one says when to stop. An
          unprompted reminder you can't switch off is a nag, so the toggle
          isn't optional. Always shown, including with Pomodoro on: the nudge
          only stands down while a pomodoro is actually RUNNING, so it still
          covers studying without one. */}
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-xs text-petal/70">
          Nudge me to stretch after {formatSpan(breakNudgeMinutes)} without a break
        </span>
        <input
          type="checkbox"
          checked={breakNudge}
          onChange={(e) => setBreakNudge(e.target.checked)}
          className="h-4 w-4 shrink-0 accent-glow"
        />
      </label>
    </div>
    <ConfirmDialog open={!!deleting} title="Delete task?"
      message={`Remove “${deleting?.name || "this task"}” permanently?`}
      onCancel={() => setDeleting(null)}
      onConfirm={() => { removeTask(deleting.id); setDeleting(null); }} />
    </>
  );
}
