<!-- Design investigation, 2026-08-10 — "visiting friends' study rooms".
     Written before implementation on the owner's ask; grounded in the code
     as of this date. -->

# Visiting friends' study rooms — design

## The honest framing (drives every choice below)

TaskNook is a **single-user local app**: the "friends" are four seeded bots
(luna/kai/sora/mochi) in your own SQLite file. So visiting is **simulated
social** — and the design splits cleanly into what should be *real
infrastructure* (a column, an endpoint, a contract that survives a future
multi-user server) and what should be *cozy theater* (the knock, the wait,
being let in). Building the theater as if it were real infrastructure —
invite tables, server-side 403s — would be over-engineering a stage play;
building the infrastructure as theater would mean redoing it if real
visiting ever ships.

## What exists to build on (verified in code)

- `User.room_config` is already **per-user** — every friend has a room slot,
  currently null for the bots. `User.character` likewise (null → validated
  to the classic resident client-side).
- `IsoRoom` is **fully presentational**: it renders whatever
  `size`/`placements`/`character` it is given, and `editMode={false}`
  already is read-only. Rendering someone else's room is a props change,
  not a rendering feature.
- `public_dict` (id/username/displayName/avatar) feeds `/api/friends`; one
  new key there flows to the panel for free.
- `ISO_PRESETS` live in the **frontend** — the both-languages drift lesson
  (`ISO_ENVS`) says don't duplicate layout data into Python.
- The seeded friends are auto-friended with the local account on creation.

## The design

### Layer 1 — real infrastructure (backend)

1. **`visit_access` column** on User: `String(16), nullable=False,
   server_default="friends"`. Stored keys are short: `public | friends |
   invite | private` (UI labels — "friends-only", "invite-only" — are
   frontend vocabulary, same division as everywhere else). Alembic
   migration per CLAUDE.md rules: own `batch_alter_table` block, explicit
   `server_default`, drop it in `make_pre_migrations`.
2. **Expose it**: add `visitAccess` to `public_dict` → `/api/friends` rows
   carry it → the panel knows which door state to draw.
3. **`GET /api/friends/<id>/room`** (auth; 404 unless actually a friend):
   returns `{visitAccess, room, character, username, displayName, avatar}` —
   `room` is the friend's `room_config` iso layout or null, `character`
   their blob or null. **Deliberate trade**: the endpoint returns the data
   to any *friend* even for `invite`/`private`; enforcement is client-side
   theater for now, because the "server" is the user's own local SQLite and
   a real invite system would be stage props. The doc-comment on the
   endpoint says exactly this, so a future multi-user server knows the gate
   must move server-side (403 + an invites table) before the endpoint is
   ever exposed beyond localhost.
4. **`PUT /api/visit-access`** `{value}` — whitelist-validated, sets your
   own column. Tiny single-purpose endpoint (it's a real column, not part
   of the profile blob).
5. **Seeding**: give the four bots one of each access level so every UI
   state exists on day one — luna `public`, kai `friends`, sora `invite`,
   mochi `private`. Their `room_config` stays **null on purpose** (see
   Layer 2). Tests: migration guarantees, endpoint contract (friend-gated,
   404 for strangers, junk value 400s), seeded access levels.

### Layer 2 — the visit flow (frontend)

6. **NPC rooms are resolved client-side, not stored.** When a friend's
   `room` comes back null, the client picks their room from a **hand-picked
   map by username** (fallback: hash → preset) and runs it through the
   normal validator. Hand-picked beats hashed because the bots have
   personalities to honour: luna 🌙 → Cozy study (night owl at her desk),
   kai 🌿 → Reading room, sora ☀️ → Secret garden, mochi 🍡 → Corner café.
   A real `room_config`, if one ever exists, always wins. Zero layout data
   crosses into Python; presets stay single-sourced.
7. **NPC characters derived, not stored**: friend `character` null → derive
   a deterministic one from the username hash (model, hair, hair colour,
   outfit hex from the preset-proven tints, width/height within slider
   range). The body sliders make four visibly different residents free.
8. **Store**: `visiting` state (`{friend, layout, character} | null`),
   `visitFriend(friend)` (fetch → resolve → set), `leaveVisit()`. While
   visiting: the App scene renders the visited layout (`editMode` locked
   off), the Room panel's Decorate button is disabled with a hint ("you're
   visiting — head home to decorate"), and your own room state is untouched.
   The focus timer, to-do list and music keep working — a visit is a scene
   swap, not a mode.
9. **The door states** (FriendsPanel, per row — a Visit affordance beside
   the stats):
   - `public` → "Visit" — enters immediately; hint "the door's open".
   - `friends` → "Visit" — enters immediately (you are friends).
   - `invite` → "Knock" — toast "you knock on sora's door…", a 2–4s wait,
     then they let you in. The WAIT is the feature; NPCs always answer
     (v1 — "not home" adds texture but risks reading as a bug).
   - `private` → lock chip, disabled: "mochi's room is private 🔒".
10. **The visiting chip**: while visiting, a top-centre pill (same pattern
    as the decorating chip): "☕ In luna's room · Leave". Escape also
    leaves (before App's other Escape handlers).

### Layer 3 — presence and labels (what makes it feel inhabited)

11. **Name labels over characters**: `IsoRoom` gains an optional
    `labels` prop (`{[placementId]: string}`), drawn as small cream name
    tags above the sprite (anchored above `hitH`, rendered in the
    selection-chrome layer so nearer furniture can't bury them; chromeless
    text with a soft dark halo, per the VC2 grammar — no pills).
12. **The owner is home**: when resolving an NPC room, insert their
    resident (drawn with their derived character) seated at the room's
    natural seat — luna at her desk chair, kai at the reading table, sora
    on the pond bench, mochi behind the café counter. Labelled with their
    display name. Render-time insertion, never persisted — the same
    philosophy as wander offsets and seating.
13. **You walk in too**: your own character appears near the front of the
    room with your name label — visiting means being there, not watching a
    diorama. Also render-time only.
14. **Studying together**: the owner's resident `working` (typing) tracks
    YOUR focus timer — start a block while visiting and you both study.
    Reuses the existing `activity` prop; changes on phase edges only, so
    the memo'd scene stays calm.

### Layer 4 — your own door

15. **Your `visit_access` setting**: a Choices row in ProfilePanel
    ("Who can visit"), with an honest hint — it matters the day friends
    can really visit; today it's a preference the bots politely respect.

## Phases (each = commit + exe rebuild)

1. **Backend**: migration + `public_dict` + room endpoint + seeds + tests.
2. **Visit flow**: api method, store state, FriendsPanel door states +
   knock theater, App scene swap + chip, decorate lockout.
3. **Presence**: labels prop, owner-at-home insertion, guest-you,
   study-together typing.
4. **Your door setting** in ProfilePanel + polish (e.g. visited room's
   env decides the window/lights exactly as at home).

## Rejected along the way

- **Storing preset layouts server-side for the bots** — duplicates the
  preset catalog into Python; the `ISO_ENVS` drift already taught this.
- **Server-enforced knock/private with an invites table** — stage props
  pretending to be a stage; the doc-comment contract on the endpoint is
  the honest version until multi-user is real.
- **A separate "visit scene" component** — IsoRoom is already
  presentational; a second scene would drift from it exactly like every
  other duplicated thing here has.
- **Labels as part of the layout data** — names are presentation about
  WHO is in the room now, not furniture; persisting them would leak into
  saves and the backend whitelist for no benefit.

## Open questions (owner)

1. Guest-you in the room — in (recommended) or out?
2. Knock outcome — always let in (recommended v1), or occasionally "not
   home" for texture?
3. The bot→room pairings above — taste-check them.
4. Your account's default `visit_access` — "friends" (recommended)?
