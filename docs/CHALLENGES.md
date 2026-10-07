# Challenges

Open the leaf icon in the dock. **Daily** offers three optional developer-authored
prompts; **My challenges** lets you write goals of your own. Completions now give
[profile XP](LEVELS.md), with no claim button or missed-goal penalties. The separate panel is the owner's requested discovery
surface and keeps the room's existing HUD composition.

## Daily variety and replacements

Each local day selects one focus, one task and one social prompt from nine choices.
Each category changes between adjacent days; reloading during a day keeps the same
selection and progress. All daily prompts and progress start fresh the next day,
including when the app remains open overnight or returns from suspension.

| Area | Prompts |
|---|---|
| Focus | Start studying; finish a session; save 15 focused minutes |
| To-do | Update the list; add a small task; complete a task |
| Social | Send a message; visit a neighbour; enter a common place |

**Replace** exchanges only the chosen unfinished prompt. Other prompts and earned
progress stay intact. The replacement starts at zero, never duplicates an active
prompt, and prefers choices not seen today. After all alternatives have been seen,
replacement remains available by cycling through inactive choices. Replacing partial
progress requires a second tap; completed daily prompts keep their credit.

## Personal goals

Create a goal with a name, a target from 1 to 999, a tracking method and a cadence:

- **Daily:** progress resets each local day; the goal itself stays in the list.
- **Ongoing:** progress continues across days until the target is reached or reset.

Manual goals have a **Mark complete** button for a target of one, or **+1 step** and
**Undo** for larger goals. Automatic goals can count focus starts, saved focus
minutes, tasks added/completed, messages sent, neighbour visits or common-place
visits. Focus starts include resuming a paused focus block; saved minutes count
when a timer block ends or the stopwatch is saved, using the app's logged minutes.

Resetting progress or deleting a goal requires two taps. Reset affects only that
goal; delete removes its definition. Up to 12 personal goals can be kept at once.
XP rewards once per daily goal per day or once per ongoing goal; undo/reset and
redo do not repeat that reward. Earned XP remains after a goal is removed.
Switching Daily/My challenges preserves an unfinished personal-goal draft, and the
tab controls support arrow keys, Home and End.

## Persistence and action boundaries

The v2 device marker in `tasknook.challenges` stores `{version, day, daily, seen,
custom}`. The original v1 marker migrates without changing today's three original
prompts or losing completed ones; normal rotation begins on the next local day.
Custom definitions and ongoing progress survive day changes. Malformed markers,
duplicate IDs, obsolete catalog entries and invalid counters are sanitized and
bounded. Clearing browser storage clears these goals; no new database table is used.

`lib/challenges.js` owns the pure model; `lib/useChallenges.js` owns persistence and
day reconciliation; the store exposes its state/actions. Successful task/message
writes and accepted visits emit explicit events. Timer completion emits session and
minute events only after `logSession` succeeds, before the later stats refresh.
Failed writes, optimistic checkbox states, incoming bot messages, obsolete visits,
opening a chat and breaks never earn credit. Replacements don't receive retroactive
credit from actions done before they were selected.

Progress is saved synchronously through the guarded storage gateway, outside React
updaters. If saving fails, a toast explains that current progress is retained only
for this session. Ordinary day checks preserve state identity, and the timer's 1 Hz
tick stays in its own provider.

## Validation

- Run `npm test`, `npm run lint` and `npm run build` from `frontend`.
- Regressions cover a year of daily variation, repeated replacements, migration,
  midnight rollover, ongoing retention, manual/automatic targets, undo/reset/delete,
  unavailable storage, failed writes/reads, accepted/obsolete visits, both timer modes
  and the keyboard/form flows.
- Use isolated SQLite data for live checks of migration, replacement and
  goal persistence, manual steps, task completion and stopwatch logging, a
  simulated next local day, confirmation controls and a 600x420 window.
- [Daily screenshot](screenshots/45-challenges.webp) and
  [personal-goal screenshot](screenshots/46-personal-challenges.webp) are captured from
  real UI actions. Regenerate with `frontend/scripts/screenshots.mjs 45 46` against a
  throwaway database/profile.

For desktop changes, follow the [build and self-test instructions](../README.md#run-as-a-desktop-app).
The shipping identity belongs in `desktop-update.json`; feature guides do not
track changing build IDs or suite totals.
