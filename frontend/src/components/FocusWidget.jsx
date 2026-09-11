import { ArrowUpRight, Check, Coffee, Pause, Play, RotateCcw, Timer } from "lucide-react";

// A dedicated small-window surface. Timer state and actions stay in the HUD's
// existing provider; entering or leaving this view never starts a second clock.
export default function FocusWidget({ clock, running, inBreak, stopwatch, task,
  progress, round, rounds, today, goal, confirmReset, canFinish,
  onToggle, onReset, onFinish, onSkip, onNudge, onExpand }) {
  const mode = inBreak ? "Take a breath" : stopwatch ? "Stopwatch" : "Focus";
  const status = running ? "In progress" : canFinish ? "Paused" : "Ready when you are";
  const ring = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return <section className={`focus-widget ${inBreak ? "focus-widget-break" : ""}`} aria-label="Focus widget">
    <header className="focus-widget-header">
      <span className="focus-widget-mode">{inBreak ? <Coffee size={15} /> : <Timer size={15} />}{mode}</span>
      <button className="focus-widget-icon" onClick={onExpand} aria-label="Exit Widget Mode" title="Back to your room (Escape)"><ArrowUpRight size={18} /></button>
    </header>
    <p className="focus-widget-task" title={task || undefined}>{inBreak ? "A little room to recharge." : task || "Make space for one thing."}</p>
    <div className="focus-widget-clock-row">
      <div className="focus-widget-time"><p className={`focus-widget-clock ${clock.length > 5 ? "focus-widget-clock-long" : ""}`} role="timer" aria-label={stopwatch ? "Elapsed time" : "Time remaining"}>{clock}</p><p className="focus-widget-status">{status}</p></div>
      <svg className="focus-widget-ring" viewBox="0 0 64 64" role="img" aria-label={`${Math.round(ring * 100)}% ${stopwatch ? "of daily goal" : "of session complete"}`}>
        <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="4" opacity=".12" />
        <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray={`${ring * 100} 100`} transform="rotate(-90 32 32)" />
        <circle cx="32" cy="32" r="4" fill="currentColor" opacity={running ? 1 : .4} />
      </svg>
    </div>
    <div className="focus-widget-actions">
      <button className="focus-widget-primary" onClick={onToggle}>{running ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}{running ? "Pause" : canFinish ? "Resume" : inBreak ? "Start break" : "Start"}</button>
      {stopwatch ? <button className="focus-widget-secondary" onClick={onFinish} disabled={!canFinish} aria-label="Finish and log the tracked time"><Check size={16} /> Finish</button>
        : <button className="focus-widget-secondary" onClick={inBreak ? onSkip : onNudge}>{inBreak ? "Skip break" : "+1 min"}</button>}
      <button className={`focus-widget-icon ${confirmReset ? "text-danger" : ""}`} onClick={onReset} aria-label={confirmReset ? "Confirm reset" : "Reset session"} title="Reset discards this session">{confirmReset ? <span className="text-[11px]">sure?</span> : <RotateCcw size={16} />}</button>
    </div>
    <footer className="focus-widget-footer"><span>{Math.floor(today)} / {goal} min today</span><span>{rounds ? `Round ${round} of ${rounds}` : "TaskNook"}</span></footer>
  </section>;
}
