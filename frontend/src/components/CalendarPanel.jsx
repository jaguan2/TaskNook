import { useState } from "react";
import { useStore } from "../store";
import { toISO } from "../lib/dates";

function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

export default function CalendarPanel() {
  const { tasks, editTask, sessionDays } = useStore();
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(toISO(today));

  const cells = monthMatrix(view.y, view.m);
  const monthName = new Date(view.y, view.m).toLocaleString([], {
    month: "long",
    year: "numeric",
  });

  const countByDate = {};
  tasks.forEach((t) => {
    if (t.scheduledDate)
      countByDate[t.scheduledDate] = (countByDate[t.scheduledDate] || 0) + 1;
  });

  // A day is "active" if you focused (sessionDays) or completed a task on it —
  // completedAt is a UTC timestamp, so route it through toISO for the local day.
  const activeDays = new Set(Object.keys(sessionDays));
  tasks.forEach((t) => {
    if (t.completedAt) activeDays.add(toISO(new Date(t.completedAt)));
  });

  const scheduled = tasks.filter((t) => t.scheduledDate === selected);
  const unscheduled = tasks.filter((t) => !t.scheduledDate && !t.completed);

  const shift = (delta) => {
    let m = view.m + delta;
    let y = view.y;
    if (m < 0) (m = 11), (y -= 1);
    if (m > 11) (m = 0), (y += 1);
    setView({ y, m });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} className="pill px-3 py-1 text-cream hover:bg-white/10">‹</button>
        <p className="text-sm font-semibold text-cream">{monthName}</p>
        <button onClick={() => shift(1)} className="pill px-3 py-1 text-cream hover:bg-white/10">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK.map((d, i) => (
          <span key={i} className="text-[10px] font-semibold text-petal/50">{d}</span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={i} />;
          const iso = toISO(date);
          const isToday = iso === toISO(today);
          const isSel = iso === selected;
          const count = countByDate[iso] || 0;
          const isActive = activeDays.has(iso);
          return (
            <button
              key={i}
              onClick={() => setSelected(iso)}
              title={isActive ? "You were active this day" : undefined}
              className={`relative grid h-9 place-items-center rounded-lg text-xs transition ${
                isSel
                  ? "bg-glow font-bold text-plum"
                  : isToday
                  ? "bg-white/15 text-cream"
                  : isActive
                  ? "bg-sage/20 text-sage"
                  : "text-petal hover:bg-white/10"
              }`}
            >
              {date.getDate()}
              {count > 0 && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    isSel ? "bg-plum" : "bg-glow"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-[10px] text-petal/50">
        <span className="h-2 w-2 rounded-full bg-sage/40" /> focused or completed a task that day
      </p>

      {/* Scheduled on selected day */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
          Planned for {selected}
        </p>
        {scheduled.length === 0 ? (
          <p className="rounded-xl bg-white/5 px-3 py-3 text-center text-xs text-petal/60">
            Nothing scheduled. Drop a task in below.
          </p>
        ) : (
          <div className="space-y-1.5">
            {scheduled.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
              >
                <span className={`text-sm text-cream ${t.completed ? "line-through opacity-60" : ""}`}>
                  {t.name}
                </span>
                <button
                  onClick={() => editTask(t.id, { scheduledDate: null })}
                  className="text-xs text-petal/60 hover:text-rose"
                >
                  unschedule
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unscheduled pool */}
      {unscheduled.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
            Unscheduled
          </p>
          <div className="space-y-1.5">
            {unscheduled.map((t) => (
              <button
                key={t.id}
                onClick={() => editTask(t.id, { scheduledDate: selected })}
                className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
              >
                <span className="text-sm text-cream">{t.name}</span>
                <span className="text-xs text-glow">+ add to {selected.slice(5)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
