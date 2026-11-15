# Friend cards and personal growth — November 14, 2026

The entire friend card opens the centered profile popup, including its padding,
stats, progress bars and presence area. Chat, Visit/Knock and Remove remain
independent native buttons. Keyboard users can activate the profile with Enter
or Space; closing the popup returns focus to that card's profile button.

## Presentation and ownership

[`FriendCard.jsx`](../frontend/src/components/FriendCard.jsx) owns the roster
presentation. Its stretched profile button is a sibling of the other controls,
so there are no nested buttons or generic click handlers intercepting actions.
Passive content passes pointer events to that button; action controls receive
their own pointer events. The panel keeps friend selection, group creation,
conversation navigation and store-owned writes.

[`FriendshipMeter.jsx`](../frontend/src/components/FriendshipMeter.jsx) spans
the card's content width. Its five segments represent New friends, Warming up,
Good friends, Close friends and Kindred spirits. Achieved milestones stay filled;
the next segment fills with progress within the current level. The label and
earned/required pair make that level explicit. At the top, all segments fill and
the meter shows Max. The profile repeats the same meter and explains how that
character grows closer. Labels are localized in all five supported languages.

## Growth curves and existing saves

[`friendship.js`](../frontend/src/lib/friendship.js) owns the pure model. These
are cumulative point thresholds, not new rewards or action multipliers:

| Pattern | New friends | Warming up | Good friends | Close friends | Kindred spirits |
| --- | ---: | ---: | ---: | ---: | ---: |
| Steady | 0 | 25 | 80 | 180 | 320 |
| Slow to open up | 0 | 25 | 80 | 155 | 275 |
| Quick to connect | 0 | 12 | 45 | 150 | 320 |

Luna and Sora open up slowly, Kai connects quickly, and Mochi grows steadily.
Other usernames receive a deterministic pattern. Reading a level never samples
randomness or the clock. A quick start can still have a longer final stage.

The existing `tasknook.friendship` username-to-points object remains unchanged.
Messages still give 2 points, accepted visits 6 and each minute together 1.
Every new threshold is at or below the original steady curve, so existing earned
levels cannot go backwards. No migration, point reset or retroactive point
award is required. The same username-aware calculation drives profile/cards,
room and carried name-tag hearts, and the level-4 close-friend chat replies.
Room hearts retain their lifetime fraction; the card makes individual milestones
visible. Profile XP and its social-credit limits keep their separate policy.

## Verification and retained evidence

- [Desktop cards](screenshots/72-friendship-cards.webp),
  [touch cards](screenshots/72-friendship-cards-small.webp) and
  [an accepted-message level-up](screenshots/72-friendship-level-up.webp).
- 1,672 frontend tests pass across the full run and focused rechecks; the optional
  art generator is skipped. A room-heart expectation now derives its fraction
  from the personal curve. Build reproducibility passes natively after the
  sandbox's special-character temporary path prevented module resolution.
- Lint and production build pass. Eleven native browser cases exercise card
  padding/bars/presence, independent actions, Enter/Space, focus return, a real
  accepted-message level-up and reload, all common places, touch/compact windows
  and localized profiles. Group creation, Places, Weekly and the conversation
  list retain their component regression coverage after the card extraction.

Local structural self-review preserves the storage gateway, accepted-write
boundary, timer isolation and visit state. The separately installed shared toolkit
is unavailable. Evidence is ignored under `build/skill-verification/friendship-cards/`.
Only selected current screenshots and repeatable tests are retained; temporary
helper/configuration, raw browser output and frozen test data are removed.
Runtime delivery includes the matching main-channel executable/manifest, exact
package verification and an isolated frozen startup test.
