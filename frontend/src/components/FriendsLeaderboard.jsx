import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { buildWeeklyLeaderboard, leaderboardDateRange } from "../lib/leaderboard";

function minutesLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

const RANK_STYLE = [
  "bg-amber/20 text-amber",
  "bg-white/15 text-cream",
  "bg-rose/15 text-blush",
];

export default function FriendsLeaderboard({ user, friends, sessionDays, now }) {
  const board = useMemo(
    () => buildWeeklyLeaderboard({ user, friends, sessionDays, now }),
    [friends, now, sessionDays, user]
  );
  const maxMinutes = Math.max(...board.map((entry) => entry.minutes), 1);
  const hasStudyTime = board.some((entry) => entry.minutes > 0);

  return (
    <section
      aria-labelledby="friends-weekly-leaderboard"
      className="rounded-2xl border border-white/10 bg-white/5 p-3"
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3
          id="friends-weekly-leaderboard"
          className="flex items-center gap-1.5 text-xs font-semibold text-cream"
        >
          <Trophy size={14} className="text-amber" aria-hidden="true" />
          Weekly study
        </h3>
        <span className="text-[10px] font-medium text-petal/55">
          {leaderboardDateRange(now)} · starts Sun
        </span>
      </div>

      {!hasStudyTime ? (
        <p className="rounded-xl bg-white/5 px-3 py-3 text-xs text-petal/60">
          A fresh week — start the first study session.
        </p>
      ) : (
        <ol aria-label="Weekly study rankings" className="space-y-1.5">
          {board.map((entry) => (
            <li
              key={entry.key}
              className={`relative overflow-hidden rounded-xl px-2.5 py-2 ${
                entry.isYou ? "bg-glow/10 ring-1 ring-glow/20" : "bg-white/5"
              }`}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-glow/10"
                style={{ width: `${Math.max(3, (entry.minutes / maxMinutes) * 100)}%` }}
              />
              <div className="relative flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                    RANK_STYLE[entry.rank - 1] || "bg-white/10 text-petal/60"
                  }`}
                >
                  {entry.rank}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-wine text-sm">
                  {entry.avatar}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-cream">
                  {entry.label}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-petal/75">
                  {minutesLabel(entry.minutes)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
