import { useRef, useState } from "react";
import {
  CalendarClock,
  GripVertical,
  Pencil,
  Plus,
  Repeat,
  SlidersHorizontal,
  StickyNote,
} from "lucide-react";
import { useStore } from "../store";
import { useArmed } from "../lib/useArmed";
import { toISO } from "../lib/dates";

// The top-right to-do list, drawn straight onto the backdrop (no card/dialog
// chrome) — Virtual Cottage-style. Checked tasks stay visible, crossed out;
// rows can be deleted with ✕ (two-tap: arm then confirm, like the Tasks
// panel), re-ordered by dragging the ⠿ handle, marked as a daily routine with
// ↻, and organised under group headers (VC2's "New Group"). The full Tasks
// drawer stays behind ⚙.

// Row lives at module scope, NOT inside HudTasks: an inner component gets a
// new function identity every render, so React remounts every row — and the
// store re-renders this HUD once per second while a focus session runs, which
// killed in-flight drag-reorders (learned the hard way).
/**
 * The expanded half of a task row: a note, a deadline, and the two fields that
 * previously had no editor anywhere in the app.
 *
 * On the row rather than in a dialog, per the design north star — VC2 keeps
 * everything on the scene and saves panels for infrequent configuration, and a
 * note you write while looking at your list is not configuration.
 *
 * Saves on BLUR, not per keystroke: every write goes through the store and
 * refetches, so typing a sentence would be a sentence's worth of round trips.
 * A local draft holds the text until focus leaves.
 *
 * At module scope for the same reason `Row` is, and here it matters twice over:
 * an inner component gets a fresh identity every render, and this HUD re-renders
 * once a second while a focus block runs — so the remount would wipe the half
 * written note out from under you, once per second.
 */
function TaskDetails({ task, editTask, onClose }) {
  const [notes, setNotes] = useState(task.notes || "");
  const [name, setName] = useState(task.name);
  const [due, setDue] = useState(task.dueDate || "");

  // Only send what changed — a PUT carrying every field would re-stamp things the
  // user never touched, and the backend treats a present key as an instruction.
  const commit = (patch) => {
    const [[key, value]] = Object.entries(patch);
    const before = { name: task.name, notes: task.notes || "", dueDate: task.dueDate || "" }[key];
    if (value === before) return;
    editTask(task.id, patch);
  };

  return (
    <div className="mb-1 ml-[38px] mr-1 space-y-1.5 rounded-lg bg-white/5 p-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => commit({ name: name.trim() || task.name })}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        maxLength={200}
        aria-label="Task name"
        className="w-full rounded-md bg-white/10 px-2 py-1 text-sm text-cream outline-none placeholder:text-petal/40 focus:bg-white/15"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => commit({ notes })}
        rows={2}
        maxLength={2000}
        placeholder="Notes…"
        aria-label="Notes"
        className="cozy-scroll w-full resize-none rounded-md bg-white/10 px-2 py-1 text-xs text-cream outline-none placeholder:text-petal/40 focus:bg-white/15"
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-petal/60">
          <CalendarClock size={12} /> Due
          <input
            type="date"
            value={due}
            onChange={(e) => {
              setDue(e.target.value);
              // A date picker commits on change, not on blur — there is no
              // half-typed date to protect and waiting feels broken.
              if (e.target.value !== (task.dueDate || "")) {
                editTask(task.id, { dueDate: e.target.value || null });
              }
            }}
            aria-label="Due date"
            className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-cream outline-none focus:bg-white/15"
          />
        </label>
        <button
          onClick={onClose}
          className="ml-auto px-1 text-[11px] text-petal/50 transition hover:text-cream"
        >
          done
        </button>
      </div>
    </div>
  );
}

function Row({
  task,
  section,
  index,
  draggableRow,
  activeTaskId,
  confirmId,
  toggleTask,
  setActiveTaskId,
  toggleRoutine,
  requestDelete,
  onDragStartRow,
  onDropRow,
  expandedId,
  onToggleExpand,
  editTask,
}) {
  const expanded = expandedId === task.id;
  const confirming = confirmId === task.id;
  // A deadline that has passed (or lands today) is the only thing in the list
  // allowed to shout. Compared as LOCAL date strings, never a UTC timestamp —
  // the same rule the calendar follows, and both are plain YYYY-MM-DD so a
  // string compare is a date compare.
  const overdue = task.dueDate && !task.completed && task.dueDate <= toISO(new Date());
  return (
    <>
    <div
      draggable={draggableRow}
      onDragStart={() => onDragStartRow(section, index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => draggableRow && onDropRow(section, index)}
      className={`group flex items-center gap-1.5 rounded-lg px-1 py-1 transition ${
        activeTaskId === task.id ? "bg-glow/10" : "hover:bg-white/5"
      }`}
    >
      <span
        className={`hover-reveal w-3 shrink-0 text-petal/40 transition ${
          draggableRow ? "cursor-grab" : "invisible"
        }`}
      >
        <GripVertical size={12} />
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
          {task.routine && (
            <span title="Daily routine" className="mr-1 inline-block align-middle text-sage">
              <Repeat size={10} />
            </span>
          )}
          {task.name}
        </span>
      </button>
      {task.notes && (
        <span title={task.notes} aria-label="Has notes" className="shrink-0 text-petal/40">
          <StickyNote size={11} />
        </span>
      )}
      {task.dueDate && (
        <span
          title={`Due ${task.dueDate}`}
          className={`shrink-0 whitespace-nowrap text-[10px] font-semibold ${
            overdue ? "text-danger" : "text-petal/50"
          }`}
        >
          {task.dueDate.slice(5)}
        </span>
      )}
      <button
        onClick={() => onToggleExpand(task.id)}
        title={expanded ? "Hide details" : "Notes and due date"}
        aria-label="Notes and due date"
        aria-expanded={expanded}
        className={`hover-reveal shrink-0 px-0.5 transition ${
          expanded ? "text-glow" : "text-petal/30 hover:text-cream"
        }`}
      >
        <Pencil size={11} />
      </button>
      <button
        onClick={() => toggleRoutine(task)}
        title={task.routine ? "Routine: resets daily. Click to make one-off" : "Make a daily routine"}
        className={`hover-reveal shrink-0 px-0.5 transition ${
          task.routine ? "text-sage" : "text-petal/30 hover:text-sage"
        }`}
      >
        <Repeat size={12} />
      </button>
      <button
        onClick={() => requestDelete(task.id)}
        title="Delete task"
        aria-label="Delete task"
        className={`hover-reveal shrink-0 px-1 transition ${
          confirming
            ? "confirming text-[10px] font-bold text-danger"
            : "text-sm text-petal/30 hover:text-danger"
        }`}
      >
        {confirming ? "sure?" : "✕"}
      </button>
    </div>
    {expanded && (
      <TaskDetails task={task} editTask={editTask} onClose={() => onToggleExpand(task.id)} />
    )}
    </>
  );
}

export default function HudTasks({ onOpenTasks }) {
  const {
    orderedTasks,
    toggleTask,
    addTask,
    removeTask,
    reorderTasks,
    activeTaskId,
    setActiveTaskId,
    taskGroups,
    addTaskGroup,
    removeTaskGroup,
    toggleRoutine,
    editTask,
    showToast,
  } = useStore();
  const [draft, setDraft] = useState("");
  const [draftGroup, setDraftGroup] = useState("");
  const [groupDraft, setGroupDraft] = useState(null); // null = closed, "" = typing
  const dragFrom = useRef(null); // { section, index }

  // Two-tap delete, the app-wide rhythm (see lib/useArmed.js).
  // One row open at a time: two open note editors on a 288px list is a wall of
  // form, and the point of putting this on the row was to keep the list a list.
  const [expandedId, setExpandedId] = useState(null);
  const toggleExpand = (id) => setExpandedId((cur) => (cur === id ? null : id));

  const [confirmId, arm] = useArmed();
  const requestDelete = (id) => arm(id, () => removeTask(id));

  // orderedTasks already sinks completed tasks to the bottom. Grouping only
  // partitions the active rows — done rows collapse into one flat pile.
  const active = orderedTasks.filter((t) => !t.completed);
  const done = orderedTasks.filter((t) => t.completed);
  const sections = [
    { key: "", tasks: active.filter((t) => !t.group) },
    ...taskGroups.map((g) => ({ key: g, tasks: active.filter((t) => t.group === g) })),
  ];

  const submit = async (e) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    try {
      await addTask({ name, duration: 25, priority: "medium", group: draftGroup || null });
    } catch (err) {
      console.error("Quick-add failed:", err);
      setDraft(name); // give the typed text back instead of eating it
      showToast("Couldn't add the task 🌧️");
    }
  };

  const submitGroup = (e) => {
    e.preventDefault();
    const name = (groupDraft || "").trim();
    if (name) addTaskGroup(name);
    setGroupDraft(null);
  };

  const onDragStartRow = (section, index) => {
    dragFrom.current = { section, index };
  };
  const onDropRow = (section, index) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (!from || from.section !== section || from.index === index) return;
    const rows = sections.find((s) => s.key === section)?.tasks;
    if (!rows) return;
    const next = [...rows];
    const [moved] = next.splice(from.index, 1);
    next.splice(index, 0, moved);
    // Persist the FULL active ordering (all sections, display order) so
    // positions stay consistent for the ordering algorithms.
    reorderTasks(
      sections.flatMap((s) => (s.key === section ? next : s.tasks))
    );
  };

  const rowProps = {
    activeTaskId,
    confirmId,
    toggleTask,
    setActiveTaskId,
    toggleRoutine,
    requestDelete,
    onDragStartRow,
    onDropRow,
    expandedId,
    onToggleExpand: toggleExpand,
    editTask,
  };

  return (
    // Below 600px this 288px list and the 216px timer card can't both have the
    // top of the window: they overlapped, and the result was unreadable — two
    // stacks of text on top of each other (measured: the collision starts at
    // 588px and grows as you narrow). The list steps aside instead; the full
    // Tasks panel is still one dock click away.
    //
    // `invisible`, never `hidden`: this carries .intro-chrome, and
    // display:none would replay its 1.5s boot animation every time the window
    // crossed the threshold (docs/DESIGN.md).
    <div className="intro-chrome absolute right-6 top-5 z-20 flex max-h-[52vh] w-72 flex-col max-[599px]:invisible">
      <header className="flex items-center justify-between px-1 pb-1.5">
        <p className="font-display text-base font-bold tracking-wide text-cream drop-shadow">
          To-Do List{" "}
          <span className="font-cozy text-sm font-semibold text-petal/60">
            ({done.length}/{orderedTasks.length})
          </span>
        </p>
        <div className="flex items-center gap-1">
          {groupDraft === null ? (
            <button
              onClick={() => setGroupDraft("")}
              title="New group"
              className="pill flex items-center gap-0.5 px-2 py-0.5 text-xs text-petal/60 hover:bg-white/10 hover:text-petal"
            >
              <Plus size={11} /> Group
            </button>
          ) : (
            <form onSubmit={submitGroup}>
              <input
                autoFocus
                value={groupDraft}
                onChange={(e) => setGroupDraft(e.target.value)}
                onBlur={submitGroup}
                maxLength={60}
                placeholder="Group name"
                className="w-24 rounded-lg bg-white/10 px-2 py-0.5 text-xs text-cream placeholder:text-petal/40 outline-none"
              />
            </form>
          )}
          <button
            onClick={onOpenTasks}
            title="Open the full task manager (priorities, ordering, durations)"
            aria-label="Open the full task manager (priorities, ordering, durations)"
            className="pill px-2 py-1 text-petal/60 hover:bg-white/10 hover:text-petal"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>
      </header>

      <div className="cozy-scroll cozy-scroll--bare min-h-0 flex-1 overflow-y-auto">
        {orderedTasks.length === 0 && taskGroups.length === 0 && (
          <p className="px-2 py-3 text-xs text-petal/50">All clear 🌿</p>
        )}
        {sections.map((section) =>
          section.key === "" ? (
            section.tasks.map((task, i) => (
              <Row key={task.id} task={task} section="" index={i} draggableRow {...rowProps} />
            ))
          ) : (
            <div key={section.key} className="mt-1">
              {/* the header row is its own hover group — a section-wide group
                  revealed EVERY row's controls when hovering any of them */}
              <div className="group flex items-center gap-1.5 px-1 pb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-petal/60">
                  {section.key}
                </span>
                <span className="h-px flex-1 bg-white/10" />
                {/* Armed like the row deletes: ungrouping is unrecoverable
                    (the quick-add select is the only way back INTO a group),
                    so one stray tap mustn't scatter a whole section. */}
                <button
                  onClick={() => arm(`group:${section.key}`, () => removeTaskGroup(section.key))}
                  title="Remove group (its tasks stay, ungrouped)"
                  aria-label={
                    confirmId === `group:${section.key}`
                      ? "Tap again to remove this group"
                      : "Remove group (its tasks stay, ungrouped)"
                  }
                  className={`hover-reveal px-1 transition ${
                    confirmId === `group:${section.key}`
                      ? "confirming text-[10px] font-bold text-danger"
                      : "text-xs text-petal/30 hover:text-danger"
                  }`}
                >
                  {confirmId === `group:${section.key}` ? "sure?" : "✕"}
                </button>
              </div>
              {section.tasks.length === 0 && (
                <p className="px-2 pb-1 text-[11px] italic text-petal/35">nothing here yet</p>
              )}
              {section.tasks.map((task, i) => (
                <Row
                  key={task.id}
                  task={task}
                  section={section.key}
                  index={i}
                  draggableRow
                  {...rowProps}
                />
              ))}
            </div>
          )
        )}
        {done.length > 0 && <div className="mt-1 h-px bg-white/5" />}
        {done.map((task) => (
          <Row
            key={task.id}
            task={task}
            section="done"
            index={-1}
            draggableRow={false}
            {...rowProps}
          />
        ))}
      </div>

      <form onSubmit={submit} className="mt-1 flex items-center gap-1 border-t border-white/10 px-1 pt-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={200}
          placeholder="＋ New Task"
          className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-cream placeholder:text-petal/40 outline-none"
        />
        {taskGroups.length > 0 && (
          <select
            value={draftGroup}
            onChange={(e) => setDraftGroup(e.target.value)}
            title="Add into group"
            aria-label="Add into group"
            className="max-w-[7rem] rounded-lg bg-white/10 px-1.5 py-0.5 text-xs text-petal outline-none"
          >
            <option value="">No group</option>
            {taskGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
      </form>
    </div>
  );
}
