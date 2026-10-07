import { useRef, useState } from "react";
import { Check, ClipboardList, Leaf, Play, Plus, RefreshCw, RotateCcw, Users, X } from "lucide-react";
import { useStore } from "../store";
import { useArmed } from "../lib/useArmed";
import {
  CHALLENGE_TARGET_MAX, CHALLENGE_TITLE_MAX, CHALLENGE_TRACKING,
  CUSTOM_CHALLENGE_LIMIT, challengeFor,
} from "../lib/challenges";

const ICONS = { friends: Users, focus: Play, tasks: ClipboardList };
const fieldClass = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream outline-none focus:border-glow/50";
const actionClass = "pill inline-flex items-center gap-1.5 px-2 py-1 text-xs text-petal/80 transition hover:bg-white/10 hover:text-cream disabled:opacity-40";

function ChallengeForm({ onAdd, onCancel }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("1");
  const [cadence, setCadence] = useState("daily");
  const [tracking, setTracking] = useState("manual");
  const submit = (event) => {
    event.preventDefault();
    onAdd({ title, target: Number(target), cadence, tracking });
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4" aria-label="New personal challenge">
      <label className="block space-y-1 text-xs text-petal/80">
        <span>Your goal</span>
        <input autoFocus required maxLength={CHALLENGE_TITLE_MAX} value={title}
          onChange={(event) => setTitle(event.target.value)} placeholder="Read a chapter, practice a skill..." className={fieldClass} />
      </label>
      <label className="block space-y-1 text-xs text-petal/80">
        <span>Track progress</span>
        <select value={tracking} onChange={(event) => setTracking(event.target.value)} className={fieldClass}>
          {CHALLENGE_TRACKING.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1 text-xs text-petal/80">
          <span>Target ({CHALLENGE_TRACKING.find(({ key }) => key === tracking).unit})</span>
          <input type="number" required min="1" max={CHALLENGE_TARGET_MAX} step="1" value={target}
            onChange={(event) => setTarget(event.target.value)} className={fieldClass} />
        </label>
        <label className="block space-y-1 text-xs text-petal/80">
          <span>Repeat</span>
          <select value={cadence} onChange={(event) => setCadence(event.target.value)} className={fieldClass}>
            <option value="daily">Daily</option>
            <option value="ongoing">Ongoing</option>
          </select>
        </label>
      </div>
      <p className="text-xs leading-relaxed text-petal/60">
        {cadence === "daily" ? "Progress starts fresh each day; your goal stays in the list." : "Keep your progress across days until you reach your goal."}
        {tracking === "focus-minutes" && " Minutes count when a timer block finishes or you save the stopwatch."}
        {tracking === "focus-started" && " Pressing play to start or resume focus counts."}
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={actionClass}>Cancel</button>
        <button type="submit" className="pill bg-glow px-3 py-1.5 text-sm font-semibold text-plum">Add challenge</button>
      </div>
    </form>
  );
}

function ProgressLine({ progress, target, unit }) {
  return target > 1 ? (
    <div className="space-y-1.5">
      <span className="text-xs text-petal/70">{progress} / {target} {unit}</span>
      <div className="h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full bg-sage" style={{ width: `${progress / target * 100}%` }} />
      </div>
    </div>
  ) : null;
}

export default function ChallengesPanel() {
  const { challenges, replaceChallenge, addCustomChallenge,
    advanceChallenge, resetChallenge, removeChallenge } = useStore();
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
      <div role="tablist" aria-label="Challenge lists" onKeyDown={switchTab} className="flex gap-1 rounded-full bg-white/5 p-1">
        {[["daily", "Daily"], ["personal", "My challenges"]].map(([key, label]) => (
          <button key={key} type="button" role="tab" id={`challenges-${key}-tab`} aria-controls={`challenges-${key}`}
            aria-selected={view === key} tabIndex={view === key ? 0 : -1} onClick={() => setView(key)}
            className={`pill flex-1 px-3 py-1.5 text-sm transition ${view === key ? "bg-glow text-plum" : "text-petal/70 hover:bg-white/10"}`}>{label}</button>
        ))}
      </div>
      <div role="tabpanel" id="challenges-daily" aria-labelledby="challenges-daily-tab" hidden={view !== "daily"} className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-cream">
          <Leaf size={18} className="text-sage" aria-hidden="true" />
          <h3 className="font-display font-bold">A little inspiration for today</h3>
        </div>
        <p className="text-sm leading-relaxed text-petal/80">
          A different set each day. Replace any prompt that doesn't fit your plans.
        </p>
        <div className="flex items-center justify-between text-xs text-petal/70">
          <time dateTime={challenges.day}>{new Date(`${challenges.day}T12:00:00`).toLocaleDateString(undefined, {
            month: "short", day: "numeric",
          })}</time>
          <span role="status" aria-live="polite">{count} of {challenges.daily.length} completed</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-sage" style={{ width: `${count / challenges.daily.length * 100}%` }} />
        </div>
      </div>

      <ul className="space-y-3" aria-label="Today's challenges">
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
                  <h4 className="text-sm font-semibold text-cream">{challenge.title}</h4>
                  <p className="text-xs leading-relaxed text-petal/80">{challenge.description}</p>
                  <p className={`text-xs leading-relaxed ${done ? "text-sage" : "text-petal/60"}`}>
                    {done ? "Completed today" : challenge.hint}
                  </p>
                  <ProgressLine progress={progress} target={challenge.target} unit={challenge.unit} />
                  {!done && <button type="button" aria-label={`Replace ${challenge.title}`}
                    onClick={() => progress ? arm(`replace:${id}`, () => replaceChallenge(id)) : replaceChallenge(id)}
                    className={`${actionClass} ${armed === `replace:${id}` ? "text-danger" : ""}`}>
                    <RefreshCw size={12} aria-hidden="true" />{armed === `replace:${id}` ? "Replace?" : "Replace"}
                  </button>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs leading-relaxed text-petal/60">Daily prompts and progress start fresh tomorrow. Try whichever ones feel right.</p>
      </div>

      <section role="tabpanel" id="challenges-personal" aria-labelledby="challenges-personal-tab" hidden={view !== "personal"} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id="personal-challenges-title" className="font-display font-bold text-cream">My challenges</h3>
          <button ref={addButton} type="button" onClick={() => setShowForm((value) => !value)}
            aria-expanded={showForm} className={actionClass}>
            <Plus size={13} aria-hidden="true" />New challenge
          </button>
        </div>
        <p className="text-xs leading-relaxed text-petal/70">Write your own goal. Make it daily, or keep working on it across days.</p>
        {showForm && <ChallengeForm onAdd={add} onCancel={closeForm} />}
        {!challenges.custom.length && !showForm && <p className="py-2 text-center text-xs text-petal/50">A small goal of your own can start here.</p>}
        <ul className="space-y-3" aria-label="Personal challenges">
          {challenges.custom.map((goal) => {
            const done = goal.progress >= goal.target;
            const tracking = CHALLENGE_TRACKING.find(({ key }) => key === goal.tracking);
            return (
              <li key={goal.id} className={`space-y-2 rounded-2xl border p-4 ${done ? "border-sage/30 bg-sage/10" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-semibold text-cream">{goal.title}</h4>
                  <button type="button" aria-label={`Delete ${goal.title}`} onClick={() => arm(`delete:${goal.id}`, () => {
                    removeChallenge(goal.id);
                    addButton.current?.focus({ preventScroll: true });
                  })}
                    className={`${actionClass} shrink-0 hover:text-danger ${armed === `delete:${goal.id}` ? "text-danger" : ""}`}>
                    {armed === `delete:${goal.id}` ? "sure?" : <X size={13} aria-hidden="true" />}
                  </button>
                </div>
                <p className="text-xs text-petal/60">{goal.cadence === "daily" ? "Daily" : "Ongoing"} / {tracking.label}</p>
                <ProgressLine progress={goal.progress} target={goal.target} unit={tracking.unit} />
                {done && <p className="flex items-center gap-1.5 text-xs text-sage"><Check size={13} aria-hidden="true" />{goal.cadence === "daily" ? "Completed today" : "Goal reached"}</p>}
                <div className="flex flex-wrap items-center gap-1">
                  {goal.tracking === "manual" && !done && <button type="button" onClick={() => advanceChallenge(goal.id)} className="pill bg-glow/15 px-2.5 py-1 text-xs text-glow hover:bg-glow/25">
                    {goal.target === 1 ? "Mark complete" : "+1 step"}
                  </button>}
                  {goal.tracking === "manual" && goal.progress > 0 && <button type="button" aria-label={`Undo one step for ${goal.title}`} onClick={() => advanceChallenge(goal.id, -1)} className={actionClass}>Undo</button>}
                  {goal.progress > 0 && <button type="button" aria-label={`Reset ${goal.title} progress`} onClick={() => arm(`reset:${goal.id}`, () => {
                    resetChallenge(goal.id);
                    addButton.current?.focus({ preventScroll: true });
                  })}
                    className={`${actionClass} ${armed === `reset:${goal.id}` ? "text-danger" : ""}`}>
                    <RotateCcw size={12} aria-hidden="true" />{armed === `reset:${goal.id}` ? "Reset?" : "Reset"}
                  </button>}
                </div>
              </li>
            );
          })}
        </ul>
        {challenges.custom.length >= CUSTOM_CHALLENGE_LIMIT && <p className="text-xs text-petal/60">You have {CUSTOM_CHALLENGE_LIMIT} personal challenges. Remove one to make room for another.</p>}
      </section>
    </div>
  );
}
