# Profile levels

Profile opens with a level card: current level, total XP, progress toward the
next level, and current/best daily login streak. Expand **How to earn XP** for
the rules. Levels are cosmetic for this first version.

| Activity | XP |
|---|---|
| Saved studying | 1 per recorded focus minute, including existing study history |
| Challenge completion | 10 once per daily goal per local day, or once per ongoing goal |
| NPC interaction | 5 per neighbour per local day, shared by successful outgoing messages and accepted visits |
| Daily check-in | 10 on day one, plus 1 per additional consecutive day, up to 20 per day |

The first level-up takes 100 XP. Each later level takes 50 more than the previous:

| Advance | XP required | Total XP at the new level |
|---|---:|---:|
| 1 to 2 | 100 | 100 |
| 2 to 3 | 150 | 250 |
| 3 to 4 | 200 | 450 |
| 4 to 5 | 250 | 700 |

Opening/returning to/using the app counts as checking in after successful local
account bootstrap. Reopening on the same day gives no extra XP. A missed calendar
day restarts the current streak; best streak and earned XP remain. An unattended
window crossing midnight doesn't extend a login streak by itself.

## Persistence and action boundaries

`lib/progression.js` contains the pure curve, validation and eligibility model.
`lib/useProgression.js` keeps `tasknook.progression` through the storage gateway;
the store integrates the recorded study map and explicit successful NPC/challenge
actions. Profile renders the store marker through `LevelCard.jsx`.

Study XP follows a high-water mark of the all-history saved focus map, so a poll
or relaunch cannot reward the same minutes again and an older read cannot lower
a level. A saved session appears in XP when its history refresh succeeds; after
a failed refresh the next successful read recovers it from SQLite. Existing saved
study time counts from the first install of this feature.

Daily/ongoing challenge claim lists are bounded by current definitions. The
challenge hook supplies before/after snapshots, and only a completion edge earns
XP. Resetting or undoing progress retains the claim. Deleting a goal prunes its
claim without subtracting earned XP. Old completed snapshots are not retroactively
rewarded; new completions and newly created goals are eligible.

Incoming bot replies/check-ins and obsolete/refused visits do not give XP.
Friendship points remain a separate NPC bond. No counter runs on the timer's
1 Hz tick and there is no extra database table, unlock requirement or currency.
XP/streak bonuses persist on this device; clearing browser storage removes the
bonus marker, while saved study history remains in SQLite. A failed storage write
keeps in-memory progress and gives a toast explaining that it is session-only.

## Validation

- Run `npm test`, `npm run lint` and `npm run build` from `frontend`.
- Pure/hook/store/card regressions cover exact level boundaries, increasing
  requirements, study backfill/stale reads, once-daily check-ins, calendar/DST
  streaks, NPC deduplication, daily/ongoing reset eligibility, relaunch, rejected
  messages and storage failures.
- Use isolated data for live checks of profile rendering, goal XP/reset/redo,
  NPC messaging/visiting, saved stopwatch minutes, level-up/relaunch, a simulated
  next day and a 600x420 profile drawer.
- [Profile screenshot](screenshots/47-profile-levels.webp) is reproduced with
  `frontend/scripts/screenshots.mjs 47` against a throwaway database/profile.

For desktop changes, follow the [build and self-test instructions](../README.md#run-as-a-desktop-app).
Use `desktop-update.json` for the shipping build's identity and checksum.
