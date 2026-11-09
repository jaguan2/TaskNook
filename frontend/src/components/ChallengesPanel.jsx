import { useI18n } from "../i18n/I18nProvider";
import { useRef, useState } from "react";
import { Check, ClipboardList, Leaf, Play, Plus, RefreshCw, RotateCcw, Users, X } from "lucide-react";
import { useChallengeStore } from "../store";
import { useArmed } from "../hooks/useArmed";
import {
  CHALLENGE_TARGET_MAX, CHALLENGE_TITLE_MAX, CHALLENGE_TRACKING,
  CUSTOM_CHALLENGE_LIMIT, challengeFor,
} from "../lib/challenges";

const ICONS = { friends: Users, focus: Play, tasks: ClipboardList };
const fieldClass = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream outline-none focus:border-glow/50";
const actionClass = "pill inline-flex items-center gap-1.5 px-2 py-1 text-xs text-petal/80 transition hover:bg-white/10 hover:text-cream disabled:opacity-40";

function ChallengeForm({ onAdd, onCancel }) {
  const { t: ui } = useI18n();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("1");
  const [cadence, setCadence] = useState("daily");
  const [tracking, setTracking] = useState("manual");
  const submit = (event) => {
    event.preventDefault();
    onAdd({ title, target: Number(target), cadence, tracking });
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4" aria-label={ui("challenges.form")}>
      <label className="block space-y-1 text-xs text-petal/80">
        <span>{ui("challenges.goal")}</span>
        <input autoFocus required maxLength={CHALLENGE_TITLE_MAX} value={title}
          onChange={(event) => setTitle(event.target.value)} placeholder={ui("challenges.placeholder")} className={fieldClass} />
      </label>
      <label className="block space-y-1 text-xs text-petal/80">
        <span>{ui("challenges.track")}</span>
        <select value={tracking} onChange={(event) => setTracking(event.target.value)} className={fieldClass}>
          {CHALLENGE_TRACKING.map(({ key }) => <option key={key} value={key}>{ui(`tracking.${key}`)}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1 text-xs text-petal/80">
          <span>{ui("challenges.target", { unit: ui(`challengeUnit.${CHALLENGE_TRACKING.find(({ key }) => key === tracking).unit}`) })}</span>
          <input type="number" required min="1" max={CHALLENGE_TARGET_MAX} step="1" value={target}
            onChange={(event) => setTarget(event.target.value)} className={fieldClass} />
        </label>
        <label className="block space-y-1 text-xs text-petal/80">
          <span>{ui("challenges.repeat")}</span>
          <select value={cadence} onChange={(event) => setCadence(event.target.value)} className={fieldClass}>
            <option value="daily">{ui("challenges.daily")}</option>
            <option value="ongoing">{ui("challenges.ongoing")}</option>
          </select>
        </label>
      </div>
      <p className="text-xs leading-relaxed text-petal/60">
        {cadence === "daily" ? ui("challenges.dailyHelp") : ui("challenges.ongoingHelp")}
        {tracking === "focus-minutes" && ui("challenges.minutesHelp")}
        {tracking === "focus-started" && ui("challenges.startHelp")}
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={actionClass}>{ui("actions.cancel")}</button>
        <button type="submit" className="pill bg-glow px-3 py-1.5 text-sm font-semibold text-plum">{ui("challenges.add")}</button>
      </div>
    </form>
  );
}

function ProgressLine({ progress, target, unit }) {
  const { t: ui } = useI18n();
  return target > 1 ? (
    <div className="space-y-1.5">
      <span className="text-xs text-petal/70">{progress} / {target} {unit ? ui(`challengeUnit.${unit}`) : ""}</span>
      <div className="h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full bg-sage" style={{ width: `${progress / target * 100}%` }} />
      </div>
    </div>
  ) : null;
}

export default function ChallengesPanel() {
  const { t: ui, formatDate } = useI18n();
  const { challenges, replaceChallenge, addCustomChallenge,
    advanceChallenge, resetChallenge, removeChallenge } = useChallengeStore();
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState("daily");
  const [armed, arm] = useArmed();
  const addButton = useRef(null);
  const count = challenges.daily.filter(({ id, progress }) => progress >= challengeFor(id).target).length;
  const closeForm = () => {
    setShowForm(false);
    addButton.current?.focus({ preventScroll: true });
  };
  const add = (draft) => { if (addCustomChallenge(draft)) closeForm(); };
  const switchTab = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "daily" : event.key === "End" ? "personal" : view === "daily" ? "personal" : "daily";
    setView(next);
    event.currentTarget.querySelector(`#challenges-${next}-tab`)?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={ui("challenges.lists")} onKeyDown={switchTab} className="flex gap-1 rounded-full bg-white/5 p-1">
        {["daily", "personal"].map((key) => (
          <button key={key} type="button" role="tab" id={`challenges-${key}-tab`} aria-controls={`challenges-${key}`}
            aria-selected={view === key} tabIndex={view === key ? 0 : -1} onClick={() => setView(key)}
            className={`pill flex-1 px-3 py-1.5 text-sm transition ${view === key ? "bg-glow text-plum" : "text-petal/70 hover:bg-white/10"}`}>{ui(`challenges.${key}`)}</button>
        ))}
      </div>
      <div role="tabpanel" id="challenges-daily" aria-labelledby="challenges-daily-tab" hidden={view !== "daily"} className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-cream">
          <Leaf size={18} className="text-sage" aria-hidden="true" />
          <h3 className="font-display font-bold">{ui("challenges.inspiration")}</h3>
        </div>
        <p className="text-sm leading-relaxed text-petal/80">
          {ui("challenges.description")}
        </p>
        <div className="flex items-center justify-between text-xs text-petal/70">
          <time dateTime={challenges.day}>{formatDate(new Date(`${challenges.day}T12:00:00`), {
            month: "short", day: "numeric",
          })}</time>
          <span role="status" aria-live="polite">{ui("challenges.completedCount", { count, total: challenges.daily.length })}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-sage" style={{ width: `${count / challenges.daily.length * 100}%` }} />
        </div>
      </div>

      <ul className="space-y-3" aria-label={ui("challenges.todayList")}>
        {challenges.daily.map(({ id, progress }, slot) => {
          const challenge = challengeFor(id);
          const done = progress >= challenge.target;
          const Icon = ICONS[challenge.icon];
          return (
            // Slots stay put across replacements, preserving the focused control.
            <li key={slot} className={`rounded-2xl border p-4 ${done ? "border-sage/30 bg-sage/10" : "border-white/10 bg-white/5"}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? "bg-sage/20 text-sage" : "bg-white/10 text-cream"}`}>
                  {done ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h4 className="text-sm font-semibold text-cream">{ui(`prompt.${id}.title`)}</h4>
                  <p className="text-xs leading-relaxed text-petal/80">{ui(`prompt.${id}.description`)}</p>
                  <p className={`text-xs leading-relaxed ${done ? "text-sage" : "text-petal/60"}`}>
                    {done ? ui("challenges.completedToday") : ui(`prompt.${id}.hint`)}
                  </p>
                  <ProgressLine progress={progress} target={challenge.target} unit={challenge.unit} />
                  {!done && <button type="button" aria-label={ui("challenges.replaceName", { name: ui(`prompt.${id}.title`) })}
                    onClick={() => progress ? arm(`replace:${id}`, () => replaceChallenge(id)) : replaceChallenge(id)}
                    className={`${actionClass} ${armed === `replace:${id}` ? "text-danger" : ""}`}>
                    <RefreshCw size={12} aria-hidden="true" />{armed === `replace:${id}` ? ui("challenges.replaceConfirm") : ui("challenges.replace")}
                  </button>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs leading-relaxed text-petal/60">{ui("challenges.tomorrow")}</p>
      </div>

      <section role="tabpanel" id="challenges-personal" aria-labelledby="challenges-personal-tab" hidden={view !== "personal"} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id="personal-challenges-title" className="font-display font-bold text-cream">{ui("challenges.personal")}</h3>
          <button ref={addButton} type="button" onClick={() => setShowForm((value) => !value)}
            aria-expanded={showForm} className={actionClass}>
            <Plus size={13} aria-hidden="true" />{ui("challenges.new")}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-petal/70">{ui("challenges.personalHelp")}</p>
        {showForm && <ChallengeForm onAdd={add} onCancel={closeForm} />}
        {!challenges.custom.length && !showForm && <p className="py-2 text-center text-xs text-petal/50">{ui("challenges.empty")}</p>}
        <ul className="space-y-3" aria-label={ui("challenges.personalList")}>
          {challenges.custom.map((goal) => {
            const done = goal.progress >= goal.target;
            const tracking = CHALLENGE_TRACKING.find(({ key }) => key === goal.tracking);
            return (
              <li key={goal.id} className={`space-y-2 rounded-2xl border p-4 ${done ? "border-sage/30 bg-sage/10" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-semibold text-cream">{goal.title}</h4>
                  <button type="button" aria-label={ui("calendar.deleteName", { name: goal.title })} onClick={() => arm(`delete:${goal.id}`, () => {
                    removeChallenge(goal.id);
                    addButton.current?.focus({ preventScroll: true });
                  })}
                    className={`${actionClass} shrink-0 hover:text-danger ${armed === `delete:${goal.id}` ? "text-danger" : ""}`}>
                    {armed === `delete:${goal.id}` ? ui("common.sure") : <X size={13} aria-hidden="true" />}
                  </button>
                </div>
                <p className="text-xs text-petal/60">{ui(`challenges.${goal.cadence}`)} / {ui(`tracking.${tracking.key}`)}</p>
                <ProgressLine progress={goal.progress} target={goal.target} unit={tracking.unit} />
                {done && <p className="flex items-center gap-1.5 text-xs text-sage"><Check size={13} aria-hidden="true" />{ui(goal.cadence === "daily" ? "challenges.completedToday" : "challenges.reached")}</p>}
                <div className="flex flex-wrap items-center gap-1">
                  {goal.tracking === "manual" && !done && <button type="button" onClick={() => advanceChallenge(goal.id)} className="pill bg-glow/15 px-2.5 py-1 text-xs text-glow hover:bg-glow/25">
                    {ui(goal.target === 1 ? "tasks.complete" : "challenges.step")}
                  </button>}
                  {goal.tracking === "manual" && goal.progress > 0 && <button type="button" aria-label={ui("challenges.undoName", { name: goal.title })} onClick={() => advanceChallenge(goal.id, -1)} className={actionClass}>{ui("challenges.undo")}</button>}
                  {goal.progress > 0 && <button type="button" aria-label={ui("challenges.resetName", { name: goal.title })} onClick={() => arm(`reset:${goal.id}`, () => {
                    resetChallenge(goal.id);
                    addButton.current?.focus({ preventScroll: true });
                  })}
                    className={`${actionClass} ${armed === `reset:${goal.id}` ? "text-danger" : ""}`}>
                    <RotateCcw size={12} aria-hidden="true" />{armed === `reset:${goal.id}` ? ui("challenges.resetConfirm") : ui("challenges.reset")}
                  </button>}
                </div>
              </li>
            );
          })}
        </ul>
        {challenges.custom.length >= CUSTOM_CHALLENGE_LIMIT && <p className="text-xs text-petal/60">{ui("challenges.limit", { count: CUSTOM_CHALLENGE_LIMIT })}</p>}
      </section>
    </div>
  );
}
