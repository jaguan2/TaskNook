# Challenges

Open the leaf icon in the dock. **Daily** offers four small, optional goals;
**My challenges** lets you write goals of your own. Completions give
[profile XP](LEVELS.md), with no claim button or missed-goal penalties. The separate panel is the owner's requested discovery
surface and keeps the room's existing HUD composition.

## Turning challenges on and off

Settings has a **Challenges** switch, enabled by default. Turning it off hides
the dock entry, closes any open/pinned Challenges panel and pauses daily and
personal progress tracking. Your saved goals and current progress are kept.
Actions while off are ignored rather than replayed later. Turning challenges on
restores the dock entry and reconciles the current local day: daily goals reset
normally, while ongoing personal progress and all definitions survive.

Challenge XP is paused with tracking. Normal study history, task writes, social
activity and their separate profile XP policies continue. The setting is stored
immediately through the guarded storage gateway in `tasknook.challenges.enabled`.

## Simple daily goals

New daily boards use the same four gentle goals. Do as many or as few as you like:

| Goal | What counts |
|---|---|
| Message your friend | One successfully sent friend/group-chat message |
| Go to a common room | An accepted entry into any common room |
| Add a task | One successfully created task |
| Study for 5 minutes | Five saved focus minutes, in one session or several |

Timer options include a **5m** preset; the usual default duration is unchanged.
Starting a timer alone does not complete the study goal. Minutes count only after
the timer finishes or stopwatch time is successfully saved; breaks do not count.

Today's saved older prompts and their progress remain readable, with a fourth
slot filled by a simple goal. On the next local day the board uses all four simple
goals. An unfinished older prompt can be replaced by an inactive simple goal;
partial progress requires confirmation. Other slots and completed credit stay
intact. Once all four simple goals are present, no replacement button is needed.

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
prompts or losing completed ones; a fourth simple prompt is added. New boards use
the four IDs in `SIMPLE_DAILY_IDS`. Older definitions remain for saved-board compatibility.
Custom definitions and ongoing progress survive day changes. Malformed markers,
duplicate IDs, obsolete catalog entries and invalid counters are sanitized and
bounded. Clearing browser storage clears these goals; no new database table is used.

`lib/challenges.js` owns the pure model; `hooks/useChallenges.js` owns persistence,
the immediate pause gate and day reconciliation. The store exposes state/actions;
only the stable preference and setter are also shared through Settings, so the app
shell need not subscribe to challenge progress. Successful task/message
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
- Regressions cover stable simple goals, compatible older-board replacements, migration,
  midnight rollover, ongoing retention, manual/automatic targets, undo/reset/delete,
  unavailable storage, failed writes/reads, accepted/obsolete visits, both timer modes
  keyboard/form flows, immediate pausing, setting persistence, and XP idempotence
  after off/on cycles.
- `e2e/simple-challenges.spec.mjs` exercises all four goals through real controls,
  including a saved five-minute timer advanced with Playwright's clock. It also
  verifies the hidden/pinned panel, disabled actions, relaunch, reward retention
  and a 390×720 touch window against isolated SQLite data.
- Use isolated SQLite data for other live checks of migration, replacement and
  goal persistence, manual steps, task completion and stopwatch logging, a
  simulated next local day, confirmation controls and a 600x420 window.
- [Daily screenshot](screenshots/45-challenges.webp) and
  [personal-goal screenshot](screenshots/46-personal-challenges.webp) are captured from
  real UI actions. Regenerate with `frontend/scripts/screenshots.mjs 45 46` against a
  throwaway database/profile.
- Current toggle, compact layout and saved-study captures are
  [Settings off](screenshots/73-challenges-off.webp),
  [touch](screenshots/73-simple-challenges-small.webp) and
  [five minutes saved](screenshots/73-short-study-complete.webp).

The November 15 simplification follows local structural self-review and the
project's verification workflow; the separately installed shared toolkit is
unavailable. Logs/results are ignored under `build/skill-verification/simple-challenges/`.
Temporary browser output, helper configuration and test data are removed after
retaining selected current images and repeatable tests.

For desktop changes, follow the [build and self-test instructions](../README.md#run-as-a-desktop-app).
The shipping identity belongs in `desktop-update.json`; feature guides do not
track changing build IDs or suite totals.
