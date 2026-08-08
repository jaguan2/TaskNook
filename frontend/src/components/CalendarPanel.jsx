import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "../store";
import { api } from "../lib/api";
import { toISO } from "../lib/dates";
import { intensityOf, intensityScale } from "../lib/stats";
import { formatSpan } from "../lib/breaks";

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
  // What the selected day was actually spent on. Fetched per day rather than
  // held in the store: it's one panel's concern, and sessionDays is already
  // refetched wholesale on every refreshAll.
  const [journal, setJournal] = useState(null);
  // Refetch when THIS day's total changes, not on every refreshAll. Finishing a
  // block with the calendar open used to leave the breakdown stale until you
  // clicked another day — the minutes above it updated and the list under them
  // didn't, which reads as a bug even though a reload fixed it. Keying on the
  // one day's minutes rather than the whole `sessionDays` object avoids
  // refetching every time an unrelated task is ticked.
  const selectedMinutes = sessionDays[selected] || 0;

  useEffect(() => {
    let live = true;
    setJournal(null);
    api
      .sessionDay(selected)
      // A failed lookup leaves the section absent rather than showing an error
      // row: this is history you glance at, not an action you just took.
      .then((data) => live && setJournal(data))
      .catch((err) => {
        console.error("Failed to load the day's focus:", err);
        if (live) setJournal({ entries: [], total: 0 });
      });
    return () => {
      // The day can change faster than the network answers; without this a
      // slow earlier request lands last and shows the wrong day's focus.
      live = false;
    };
  }, [selected, selectedMinutes]);

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
  // Filter on the MINUTES, not just the key: a day with a zero-minute session
  // row is not a day you focused, and tinting it says you did.
  const activeDays = new Set(
    Object.entries(sessionDays)
      .filter(([, minutes]) => minutes > 0)
      .map(([day]) => day)
  );
  tasks.forEach((t) => {
    if (t.completedAt) activeDays.add(toISO(new Date(t.completedAt)));
  });
  // HOW MUCH, not just whether. The per-day minutes were being fetched and then
  // thrown away — five minutes and five hours were the same flat tint, which
  // turned a record of your work into a bare attendance mark. The scale is
  // relative to your own history (see intensityScale), so a modest habit still
  // shades light to dark instead of sitting on the palest step forever.
  const scale = intensityScale(sessionDays);
  const DEPTH = ["", "bg-sage/15 text-sage", "bg-sage/30 text-sage", "bg-sage/50 text-cream"];
  const shadeFor = (iso) => DEPTH[Math.min(DEPTH.length - 1, intensityOf(sessionDays[iso], scale))];
  const spanFor = (minutes) => {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
  };

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
        <button onClick={() => shift(-1)} title="Previous month"
        aria-label="Previous month" className="pill px-3 py-1 text-cream hover:bg-white/10">
          <ChevronLeft size={15} />
        </button>
        <p className="text-sm font-semibold text-cream">{monthName}</p>
        <button onClick={() => shift(1)} title="Next month"
        aria-label="Next month" className="pill px-3 py-1 text-cream hover:bg-white/10">
          <ChevronRight size={15} />
        </button>
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
          const minutes = sessionDays[iso] || 0;
          const shade = shadeFor(iso);
          // A day you completed a task on but never ran the timer has no minutes
          // to shade, so it keeps the faintest step rather than reading as blank.
          const tint = shade || (isActive ? DEPTH[1] : "text-petal hover:bg-white/10");
          const span = spanFor(minutes);
          return (
            <button
              key={i}
              onClick={() => setSelected(iso)}
              title={
                span
                  ? `${span} focused`
                  : isActive
                  ? "You completed a task this day"
                  : undefined
              }
              className={`relative grid h-9 place-items-center rounded-lg text-xs transition ${
                isSel
                  ? "bg-glow font-bold text-plum"
                  : isToday
                  ? "bg-white/15 text-cream"
                  : tint
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

      {/* The legend has to explain a SCALE now, not a single colour. */}
      <div className="flex items-center gap-1.5 text-[10px] text-petal/50">
        <span>less</span>
        {DEPTH.map((d, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-sm ${i === 0 ? "bg-white/10" : d.split(" ")[0]}`}
          />
        ))}
        <span>more focus</span>
      </div>

      {/* What the day actually went on. The calendar could always say HOW LONG
          you focused; taskName was collected from the start and read by
          nothing, so it could never say on what. Only rendered when there's
          something to report — an empty "Focused on" heading over a day you
          didn't work is just a reproach. */}
      {journal && journal.entries.length > 0 && (
        <div>
          <p className="mb-2 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wide text-petal/60">
            <span>Focused on</span>
            <span className="normal-case text-glow">{formatSpan(journal.total)}</span>
          </p>
          <div className="space-y-1.5">
            {journal.entries.map((e, i) => (
              <div
                key={e.taskName ?? `untitled-${i}`}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2"
              >
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    e.taskName ? "text-cream" : "italic text-petal/60"
                  }`}
                >
                  {/* A block run with no active task is common and legitimate;
                      the server sends null so this stays distinguishable from
                      a task someone actually named "Focus". */}
                  {e.taskName || "Untitled block"}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-petal/70">
                  {formatSpan(e.minutes)}
                  {e.sessions > 1 && (
                    <span className="text-petal/40"> · {e.sessions}×</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled on selected day */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
          Planned for {selected}
        </p>
        {scheduled.length === 0 ? (
          <p className="rounded-xl bg-white/5 px-3 py-3 text-center text-xs text-petal/60">
            {/* The actual gesture is a click on an unscheduled row — the old
                copy promised a drag-and-drop that doesn't exist. */}
            {unscheduled.length > 0
              ? "Nothing scheduled — pick a task below to plan it here."
              : "Nothing scheduled for this day."}
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
                  className="text-xs text-petal/60 hover:text-danger"
                >
                  Unschedule
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
