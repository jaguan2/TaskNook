import { useI18n } from "../i18n/I18nProvider";
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
import { useSystemStore, useTaskStore } from "../store";
import { useArmed } from "../hooks/useArmed";
import { toISO } from "../lib/dates";
import ConfirmDialog from "./ConfirmDialog";

// The top-right to-do list, drawn straight onto the backdrop (no card/dialog
// chrome) — Virtual Cottage-style. Checked tasks stay visible, crossed out;
// rows can be deleted with ✕ (two-tap: arm then confirm, like the Tasks
// panel), re-ordered by dragging the ⠿ handle, marked as a daily routine with
// ↻, and organised under group headers (VC2's "New Group"). The full Tasks
// drawer stays behind ⚙.

// Row lives at module scope, NOT inside HudTasks: an inner component gets a
// new function identity every render, so React remounts every row on a store
// update. Stable component identity preserves in-flight drag-reorders.
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
 * an inner component gets a fresh identity every render. A store update must
 * not remount the editor and wipe a half-written note.
 */
function TaskDetails({ task, editTask, onClose }) {
  const { t: ui } = useI18n();
  const [notes, setNotes] = useState(task.notes || "");
  const [name, setName] = useState(task.name);
  const [due, setDue] = useState(task.dueDate || "");
  const [scheduled, setScheduled] = useState(task.scheduledDate || "");
  const [duration, setDuration] = useState(task.duration);
  const [priority, setPriority] = useState(task.priority);

  // Only send what changed — a PUT carrying every field would re-stamp things the
  // user never touched, and the backend treats a present key as an instruction.
  const commit = (patch) => {
    const [[key, value]] = Object.entries(patch);
    const before = {
      name: task.name,
      notes: task.notes || "",
      dueDate: task.dueDate || "",
      scheduledDate: task.scheduledDate || "",
      duration: task.duration,
      priority: task.priority,
    }[key];
    if (value === before) return;
    editTask(task.id, patch);
  };

  return (
    <>
    <div className="mb-1 ml-[38px] mr-1 space-y-1.5 rounded-lg bg-white/5 p-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => commit({ name: name.trim() || task.name })}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        maxLength={200}
        aria-label={ui("tasks.name")}
        className="w-full rounded-md bg-white/10 px-2 py-1 text-sm text-cream outline-none placeholder:text-petal/40 focus:bg-white/15"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => commit({ notes })}
        rows={2}
        maxLength={2000}
        placeholder={ui("hud.notesPlaceholder")}
        aria-label={ui("hud.notes")}
        className="cozy-scroll w-full resize-none rounded-md bg-white/10 px-2 py-1 text-xs text-cream outline-none placeholder:text-petal/40 focus:bg-white/15"
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-[11px] text-petal/60">
          Estimate
          <input
            type="number"
            min="1"
            max="1440"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onBlur={() => {
              const next = Math.max(1, Math.min(1440, Math.round(Number(duration) || task.duration)));
              setDuration(next);
              commit({ duration: next });
            }}
            aria-label={ui("tasks.minutes")}
            className="w-14 rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-cream outline-none focus:bg-white/15"
          />
          <span className="shrink-0 whitespace-nowrap">{ui("units.minutes")}</span>
        </label>
        <label className="flex items-center gap-1 text-[11px] text-petal/60">
          {ui("tasks.priority")}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              commit({ priority: e.target.value });
            }}
            aria-label={ui("hud.taskPriority")}
            className="rounded-md bg-plum/90 px-1.5 py-0.5 text-[11px] text-cream outline-none focus:bg-plum"
          >
            <option value="low">{ui("tasks.low")}</option>
            <option value="medium">{ui("tasks.medium")}</option>
            <option value="high">{ui("tasks.high")}</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-petal/60">
          <CalendarClock size={12} /> {ui("hud.planned")}
          <input
            type="date"
            value={scheduled}
            onChange={(e) => {
              setScheduled(e.target.value);
              if (e.target.value !== (task.scheduledDate || "")) {
                editTask(task.id, { scheduledDate: e.target.value || null });
              }
            }}
            aria-label={ui("hud.scheduled")}
            className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-cream outline-none focus:bg-white/15"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-petal/60">
          <CalendarClock size={12} /> {ui("tasks.due")}
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
            aria-label={ui("tasks.due")}
            className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-cream outline-none focus:bg-white/15"
          />
        </label>
        <button
          onClick={onClose}
          className="ml-auto px-1 text-[11px] text-petal/50 transition hover:text-cream"
        >
          {ui("hud.close")}
        </button>
      </div>
    </div>
    </>
  );
}

function Row({
  task,
  section,
  index,
  draggableRow,
  activeTaskId,
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
  const { t: ui } = useI18n();
  const expanded = expandedId === task.id;
  // A deadline that has passed (or lands today) is the only thing in the list
  // allowed to shout. Compared as LOCAL date strings, never a UTC timestamp —
  // the same rule the calendar follows, and both are plain YYYY-MM-DD so a
  // string compare is a date compare.
  const overdue = task.dueDate && !task.completed && task.dueDate < toISO(new Date());
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
        title={task.completed ? ui("tasks.undo") : ui("tasks.complete")}
        aria-label={ui(task.completed ? "hud.undoName" : "hud.completeName", { name: task.name })}
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
        title={task.completed ? undefined : ui("tasks.focus")}
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
            <span title={ui("hud.routine")} className="mr-1 inline-block align-middle text-sage">
              <Repeat size={10} />
            </span>
          )}
          {task.name}
        </span>
      </button>
      {task.notes && (
        <span title={task.notes} aria-label={ui("hud.hasNotes")} className="shrink-0 text-petal/40">
          <StickyNote size={11} />
        </span>
      )}
      {task.dueDate && (
        <span
          title={ui("tasks.dueOn", { date: task.dueDate })}
          className={`shrink-0 whitespace-nowrap text-[10px] font-semibold ${
            overdue ? "text-danger" : "text-petal/50"
          }`}
        >
          {task.dueDate.slice(5)}
        </span>
      )}
      {task.scheduledDate && !task.completed && (
        <span
          title={ui("calendar.plannedFor", { date: task.scheduledDate })}
          className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[10px] font-semibold text-sage"
        >
          <CalendarClock size={10} /> {task.scheduledDate.slice(5)}
        </span>
      )}
      <button
        onClick={() => onToggleExpand(task.id)}
        title={ui(expanded ? "hud.hideDetails" : "hud.editDetails")}
        aria-label={ui("hud.editDetails")}
        aria-expanded={expanded}
        className={`hover-reveal shrink-0 px-0.5 transition ${
          expanded ? "text-glow" : "text-petal/30 hover:text-cream"
        }`}
      >
        <Pencil size={11} />
      </button>
      <button
        onClick={() => toggleRoutine(task)}
        title={ui(task.routine ? "hud.routineHelp" : "hud.makeRoutine")}
        aria-label={ui(task.routine ? "hud.onceName" : "hud.routineName", { name: task.name })}
        className={`hover-reveal shrink-0 px-0.5 transition ${
          task.routine ? "text-sage" : "text-petal/30 hover:text-sage"
        }`}
      >
        <Repeat size={12} />
      </button>
      <button
        onClick={() => requestDelete(task)}
        title={ui("tasks.delete")}
        aria-label={ui("tasks.delete")}
        className="hover-reveal shrink-0 px-1 text-sm text-petal/30 transition hover:text-danger"
      >
        ✕
      </button>
    </div>
    {expanded && (
      <TaskDetails task={task} editTask={editTask} onClose={() => onToggleExpand(task.id)} />
    )}
    </>
  );
}

export default function HudTasks({ onOpenTasks }) {
  const { t: ui } = useI18n();
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
    renameTaskGroup,
    toggleRoutine,
    editTask,
  } = useTaskStore();
  const { showToast } = useSystemStore();
  const [draft, setDraft] = useState("");
  const [draftGroup, setDraftGroup] = useState("");
  const [groupDraft, setGroupDraft] = useState(null); // null = closed, "" = typing
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const dragFrom = useRef(null); // { section, index }

  // Two-tap delete, the app-wide rhythm (see hooks/useArmed.js).
  // One row open at a time: two open note editors on a 288px list is a wall of
  // form, and the point of putting this on the row was to keep the list a list.
  const [expandedId, setExpandedId] = useState(null);
  const toggleExpand = (id) => setExpandedId((cur) => (cur === id ? null : id));

  const [deleting, setDeleting] = useState(null);
  const requestDelete = (task) => setDeleting(task);
  const [confirmId, arm] = useArmed();

  // orderedTasks already sinks completed tasks to the bottom. Grouping only
  // partitions the active rows — done rows collapse into one flat pile.
  const today = toISO(new Date());
  const currentTasks = orderedTasks.filter((t) => !t.archived);
  const todayTasks = currentTasks.filter((t) => !t.scheduledDate || t.scheduledDate <= today);
  const active = todayTasks.filter((t) => !t.completed);
  const done = todayTasks.filter((t) => t.completed);
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
      showToast(ui("hud.addError"));
    }
  };

  const submitGroup = (e) => {
    e.preventDefault();
    const name = (groupDraft || "").trim();
    if (name) addTaskGroup(name);
    setGroupDraft(null);
  };
  const finishGroupRename = async () => {
    if (renameDraft.trim() === renamingGroup) {
      setRenamingGroup(null);
      return;
    }
    if (await renameTaskGroup(renamingGroup, renameDraft)) setRenamingGroup(null);
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
    <>
    {/* Below 600px this 288px list and the 216px timer card can't both have the
    // top of the window: they overlapped, and the result was unreadable — two
    // stacks of text on top of each other (measured: the collision starts at
    // 588px and grows as you narrow). The list steps aside instead; the full
    // Tasks panel is still one dock click away.
    //
    // `invisible`, never `hidden`: this carries .intro-chrome, and
    // display:none would replay its 1.5s boot animation every time the window
    // crossed the threshold (docs/DESIGN.md).
    */}
    <div className="intro-chrome absolute right-6 top-5 z-20 flex max-h-[52vh] w-72 flex-col max-[599px]:invisible">
      <header className="flex items-center justify-between px-1 pb-1.5">
        <p className="font-display text-base font-bold tracking-wide text-cream drop-shadow">
          {ui("hud.title")}{" "}
          <span className="font-cozy text-sm font-semibold text-petal/60">
            ({done.length}/{currentTasks.length})
          </span>
        </p>
        <div className="flex items-center gap-1">
          {groupDraft === null ? (
            <button
              onClick={() => setGroupDraft("")}
              title={ui("hud.newGroup")}
              className="pill flex items-center gap-0.5 px-2 py-0.5 text-xs text-petal/60 hover:bg-white/10 hover:text-petal"
            >
              <Plus size={11} /> {ui("hud.group")}
            </button>
          ) : (
            <form onSubmit={submitGroup}>
              <input
                autoFocus
                value={groupDraft}
                onChange={(e) => setGroupDraft(e.target.value)}
                onBlur={submitGroup}
                maxLength={60}
                placeholder={ui("hud.groupName")}
                className="w-24 rounded-lg bg-white/10 px-2 py-0.5 text-xs text-cream placeholder:text-petal/40 outline-none"
              />
            </form>
          )}
          <button
            onClick={onOpenTasks}
            title={ui("hud.manager")}
            aria-label={ui("hud.manager")}
            className="pill px-2 py-1 text-petal/60 hover:bg-white/10 hover:text-petal"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>
      </header>

      <div className="cozy-scroll cozy-scroll--bare min-h-0 flex-1 overflow-y-auto">
        {currentTasks.length === 0 && taskGroups.length === 0 && (
          <p className="px-2 py-3 text-xs text-petal/50">{ui("hud.clear")}</p>
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
                {renamingGroup === section.key ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setRenamingGroup(null);
                    }}
                    onBlur={finishGroupRename}
                    maxLength={60}
                    aria-label={ui("hud.taskGroup")}
                    className="w-28 rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cream outline-none"
                  />
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-petal/60">
                    {section.key}
                  </span>
                )}
                <span className="h-px flex-1 bg-white/10" />
                <button
                  onClick={() => {
                    setRenamingGroup(section.key);
                    setRenameDraft(section.key);
                  }}
                  title={ui("hud.renameGroup")}
                  aria-label={ui("hud.renameGroupName", { name: section.key })}
                  className="hover-reveal px-1 text-petal/30 transition hover:text-cream"
                >
                  <Pencil size={10} />
                </button>
                {/* Armed like the row deletes: ungrouping is unrecoverable
                    (the quick-add select is the only way back INTO a group),
                    so one stray tap mustn't scatter a whole section. */}
                <button
                  onClick={() => arm(`group:${section.key}`, () => removeTaskGroup(section.key))}
                  title={ui("hud.removeGroup")}
                  aria-label={
                    confirmId === `group:${section.key}`
                      ? ui("hud.confirmGroup")
                      : ui("hud.removeGroup")
                  }
                  className={`hover-reveal px-1 transition ${
                    confirmId === `group:${section.key}`
                      ? "confirming text-[10px] font-bold text-danger"
                      : "text-xs text-petal/30 hover:text-danger"
                  }`}
                >
                  {confirmId === `group:${section.key}` ? ui("common.sure") : "✕"}
                </button>
              </div>
              {section.tasks.length === 0 && (
                <p className="px-2 pb-1 text-[11px] italic text-petal/35">{ui("hud.emptyGroup")}</p>
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
          placeholder={ui("hud.newTask")}
          className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-cream placeholder:text-petal/40 outline-none"
        />
        {taskGroups.length > 0 && (
          <select
            value={draftGroup}
            onChange={(e) => setDraftGroup(e.target.value)}
            title={ui("hud.addGroup")}
            aria-label={ui("hud.addGroup")}
            className="max-w-[7rem] rounded-lg bg-white/10 px-1.5 py-0.5 text-xs text-petal outline-none"
          >
            <option value="">{ui("hud.noGroup")}</option>
            {taskGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
      </form>
    </div>
    <ConfirmDialog open={!!deleting} title={ui("tasks.deleteTitle")}
      message={ui("tasks.deleteMessage", { name: deleting?.name || ui("tasks.thisTask") })}
      onCancel={() => setDeleting(null)}
      onConfirm={() => { removeTask(deleting.id); setDeleting(null); }} />
    </>
  );
}
