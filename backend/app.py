"""TaskNook backend — a cozy task tracker API.

Run:  python app.py    (serves the REST API on http://localhost:5000)
"""
import json
import os
import secrets
import traceback
from datetime import datetime, time, timezone, date
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_migrate import Migrate
from sqlalchemy.exc import IntegrityError, OperationalError
from werkzeug.security import generate_password_hash, check_password_hash

from models import (
    AVATAR_MAX,
    CHAT_TITLE_MAX,
    Conversation,
    ConversationMember,
    DISPLAY_NAME_MAX,
    FocusSession,
    GROUP_NAME_MAX,
    MESSAGE_MAX,
    Message,
    TASK_NAME_MAX,
    TASK_NOTES_MAX,
    Task,
    Token,
    USERNAME_MAX,
    User,
    _utc_iso,
    db,
    utcnow,
)
from schema import init_schema, SchemaError

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# If the frontend has been built (frontend/dist), Flask will also serve it.
FRONTEND_DIST = os.path.join(BASE_DIR, "..", "frontend", "dist")
# Absolute so Alembic finds the migrations regardless of the working directory
# (and inside the packaged .exe, where backend/ is bundled under _MEIPASS).
MIGRATIONS_DIR = os.path.join(BASE_DIR, "migrations")


def create_app():
    app = Flask(__name__, static_folder=None)
    # DB lives next to this file by default; override with TASKNOOK_DB so the
    # packaged desktop app can store it in a user-writable location.
    db_path = os.environ.get("TASKNOOK_DB") or os.path.join(BASE_DIR, "tasknook.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + db_path
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    # No CORS on purpose. Every legitimate client is same-origin (the packaged
    # app serves the SPA itself; the Vite dev server PROXIES /api), and a
    # wildcard Access-Control-Allow-Origin would let any web page in any
    # browser log into this localhost API with the well-known local-account
    # credentials and read the token cross-origin.
    db.init_app(app)
    # render_as_batch is required for SQLite: it can't ALTER/DROP columns in
    # place, so Alembic rebuilds the table instead.
    Migrate(app, db, directory=MIGRATIONS_DIR, render_as_batch=True)

    with app.app_context():
        _prepare_database(db_path)
        try:
            seed_demo_data()
        except OperationalError:
            # The models are ahead of the migration history — the one moment
            # this legitimately happens is while `flask db migrate` imports the
            # app to autogenerate the missing revision, so don't block it.
            # A *forgotten* migration is caught by CI's `flask db check`.
            db.session.rollback()
            print("[!] Schema behind models (pending migration?) — skipped seeding.")

    register_routes(app)
    register_frontend(app)
    register_error_handlers(app)
    return app


def register_error_handlers(app):
    """API errors must be JSON. Without this, any unhandled exception returns
    Werkzeug's HTML page — api.js then surfaces the generic 'Request failed
    (500)' instead of a message, and the session may be left dirty."""

    @app.errorhandler(Exception)
    def handle_uncaught(exc):  # noqa: ARG001
        from werkzeug.exceptions import HTTPException

        if isinstance(exc, HTTPException):
            return exc  # 404s, method-not-allowed etc. keep their semantics
        db.session.rollback()
        traceback.print_exc()
        return jsonify({"error": "Something went wrong on TaskNook's side"}), 500


def _prepare_database(db_path):
    """Run migrations, and make sure a failure is never invisible.

    Flask-Migrate wraps Alembic commands in a handler that logs and then calls
    `sys.exit(1)` — a SystemExit, which `except Exception` does NOT catch. Since
    create_app() runs at import time and the packaged app is --windowed (no
    console), an unhandled failure here means the .exe simply vanishes on
    double-click with nothing to diagnose. So: catch BaseException, leave a log
    file beside the database, and re-raise as a normal exception the launcher
    can present to the user.
    """
    try:
        init_schema(db_path)
    except BaseException as exc:  # noqa: BLE001 — SystemExit is the point
        _log_startup_failure(exc, db_path)
        if isinstance(exc, SchemaError):
            raise
        raise SchemaError(
            "TaskNook couldn't prepare its database. Your data has not been "
            f"changed. Details were written to the log beside {db_path}."
        ) from exc


def _log_startup_failure(exc, db_path):
    directory = os.path.dirname(db_path) or BASE_DIR
    try:
        with open(
            os.path.join(directory, "tasknook-error.log"), "a", encoding="utf-8"
        ) as fh:
            fh.write(f"\n=== {datetime.now(timezone.utc).isoformat()} ===\n")
            fh.write(
                "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            )
    except OSError:
        pass  # last resort: never mask the original error with a logging error


# --------------------------------------------------------------------------- #
# Auth helpers
# --------------------------------------------------------------------------- #
# Enough for a few devices/windows at once; anything older is a leftover.
MAX_TOKENS_PER_USER = 5


def issue_token(user):
    token = Token(value=secrets.token_hex(24), user_id=user.id)
    db.session.add(token)
    # Flush rather than commit, so the insert and the prune land in ONE
    # transaction: the row (and its id) exist for the prune's ordering, but there
    # is no window in which the new token is committed and the stale ones aren't.
    db.session.flush()
    _prune_tokens(user)
    db.session.commit()
    return token.value


def _prune_tokens(user):
    """Keep only the newest few tokens per user.

    Nothing ever deleted them: every login added a row, and the frontend has no
    logout UI, so the table grew by one on every boot that started from cleared
    browser storage (and, in dev, on every StrictMode double-bootstrap). The
    size never mattered, but CLAUDE.md's own desktop-persistence check is
    literally "the Token table must not grow across a close+relaunch" — so give
    that check something it can actually assert.
    """
    stale = (
        Token.query.filter_by(user_id=user.id)
        .order_by(Token.created_at.desc(), Token.id.desc())
        .offset(MAX_TOKENS_PER_USER)
        .all()
    )
    for row in stale:
        db.session.delete(row)
    # No commit here: `issue_token` owns the transaction so the insert and this
    # prune are atomic. (Shadowing the builtin-ish name `old` in the loop was also
    # asking for trouble the day this function grows.)


def _bearer_value():
    """The token from the Authorization header, or None.

    Shared because `logout` re-parsed the same header by hand — two copies of one
    small piece of protocol knowledge.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return auth[7:].strip() or None


def current_user():
    value = _bearer_value()
    if not value:
        return None
    # ONE query. `Token.query...first()` followed by `tok.user` is two round trips
    # per authenticated request — the token row, then a lazy load for its user —
    # and every endpoint pays it.
    return (
        db.session.query(User)
        .join(Token, Token.user_id == User.id)
        .filter(Token.value == value)
        .first()
    )


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            return jsonify({"error": "Unauthorized"}), 401
        return fn(user, *args, **kwargs)

    return wrapper


def today_str():
    return date.today().isoformat()


def local_day_start_utc():
    """Local midnight, expressed as the NAIVE UTC datetime the DB stores.

    `completed_at` is written by `utcnow()` (aware UTC) but SQLite's DateTime
    column drops the offset, so rows come back naive-UTC. To bucket them by the
    user's LOCAL day — the same convention `today_str()` and the frontend use —
    the boundary has to make the same round trip: local midnight → UTC → naive.
    """
    return (
        datetime.combine(date.today(), time.min)
        .astimezone(timezone.utc)
        .replace(tzinfo=None)
    )


def json_body():
    """The request's JSON body, guaranteed to be a dict.

    `silent=True` alone only guards MALFORMED JSON — a well-formed non-object
    body (`[1,2]`, `"hi"`, `5`) is truthy and would reach `.get(...)` and 500.
    """
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def clean_date(value):
    """A YYYY-MM-DD string, or None.

    Stricter than the bare `[:10]` slice this replaces: that let any
    ten-character string into a date column, so "not a date" round-tripped
    happily and then failed to compare against anything. Returns None for
    junk rather than 400ing, because both callers treat "no date" as a
    legitimate value and a bad one carries no intent worth preserving.
    """
    if not isinstance(value, str) or not value:
        return None
    head = value[:10]
    try:
        date.fromisoformat(head)
    except ValueError:
        return None
    return head


def clean_int(value, lo, hi, default=None):
    """A storable integer inside [lo, hi], or `default` for anything else.

    Two traps, both of which reached a 500 before this existed:

    * `int()` happily returns a Python int of any size, and SQLite raises
      OverflowError at BIND time for anything outside signed 64-bit. That escaped
      every `except (TypeError, ValueError)` in the file and broke the app's own
      tested "junk never 500s" contract — whose cases all use wrong TYPES or small
      values, so magnitude slipped straight through. `log_session` already clamped
      its minutes for this reason and `_finite_number` documents the identical
      trap for room coordinates; it was simply never applied to the four integer
      paths (duration on create and update, position, and the reorder list).
    * `isinstance(True, int)` is True in Python, so a naive numeric check lets a
      bool through as 0/1 while the rest of this file carefully excludes them.

    Bounds are compared rather than checked with `math.isfinite`, because isfinite
    RAISES on a huge int. Integer comparison is exact at any size, so the order
    here matters: reject the un-numeric first, then clamp.
    """
    if isinstance(value, bool) or value is None:
        return default
    if isinstance(value, float):
        # NaN fails every comparison, and infinities aren't storable.
        if value != value or value in (float("inf"), float("-inf")):
            return default
        value = int(value)
    if not isinstance(value, int):
        try:
            value = int(str(value).strip())
        except (TypeError, ValueError):
            return default
    return lo if value < lo else hi if value > hi else value


def clean_id(value):
    """A row id, or None for anything that isn't one.

    Deliberately NOT `clean_int`, which CLAMPS into range: that is right for a
    duration (a huge number carries a clear intent — "as long as you like") and
    actively wrong for an identifier, where `0` would come back as `1` and
    quietly address whoever user #1 happens to be. Found by the chat tests
    doing exactly that: `memberIds: [0]` opened a thread with a real friend.

    Strict about type, too — ids come from our own client as JSON numbers, so
    there is no reason to accept "3" and every reason not to guess.
    """
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if 1 <= value <= 2**31 - 1 else None


def clean_str(v, limit):
    """Coerce any JSON value to a trimmed, bounded string ('' for None)."""
    return ("" if v is None else str(v)).strip()[:limit]


def _finite_number(v):
    """A real, storable coordinate.

    Three traps this closes: `isinstance(True, int)` is True in Python, so a
    bare bool would sail through a naive numeric check; NaN/Infinity are
    floats that `json.dumps` writes as bare `NaN`/`Infinity` — invalid JSON
    that a browser's JSON.parse rejects, which would corrupt the saved room
    for good; and `math.isfinite` raises OverflowError on a huge int, so a
    bounded comparison (exact for big ints) stands in for it.
    """
    return isinstance(v, (int, float)) and not isinstance(v, bool) and -1e7 < v < 1e7


# Room environments, mirroring ISO_ENVS in frontend/src/lib/isoRoom.js. This
# list is duplicated across two languages and drifted once already: `cafe`,
# `library` and `terrace` were added to the frontend and not here, so the three
# presets that use them 400'd on every save — the room survived only in the
# browser's localStorage mirror, toasting "couldn't save" each time. Adding an
# environment means editing BOTH; test_room.py reads the JS and fails if they
# disagree.
ISO_ENVS = ("room", "cafe", "library", "terrace", "garden")

# The user-picked walls override — mirrors WALL_MODES in isoRoom.js, same
# both-languages contract as ISO_ENVS above. Absent means "the floor's
# default"; the frontend stores it only when it actually overrides.
ISO_WALLS = ("full", "low", "none")

# Pet personalities — mirrors PET_TEMPERS in lib/isoRoom.js (the same
# both-languages contract). "mellow" is the default and stored implicitly,
# but a client sending it explicitly is legal.
PET_TEMPERS = ("mellow", "curious", "sleepy")

# Who may visit a user's room. Short stored keys; the UI labels
# ("friends-only", "invite-only") are frontend vocabulary.
VISIT_ACCESS_LEVELS = ("public", "friends", "invite", "private")


def _hex_color(v):
    """A strict #rrggbb item tint."""
    return (
        isinstance(v, str)
        and len(v) == 7
        and v[0] == "#"
        and all(c in "0123456789abcdefABCDEF" for c in v[1:])
    )


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
def register_routes(app):
    @app.get("/api/health")
    def health():
        return {"status": "ok", "time": utcnow().isoformat()}

    # ----- Auth ----------------------------------------------------------- #
    @app.post("/api/auth/register")
    def register():
        data = json_body()
        # clean_str throughout: non-string JSON values (numbers, lists) used
        # to reach .strip()/slicing and 500.
        username = clean_str(data.get("username"), USERNAME_MAX).lower()
        password = data.get("password") if isinstance(data.get("password"), str) else ""
        # Clamped to the COLUMN widths (models.py), not to a round number. The
        # migrations are the stated source of truth for the schema, and register
        # was letting 80 characters into String(40)/String(60) while save_profile
        # clamped the same column to 60 — two writers disagreeing about one column.
        # SQLite forgives an over-long string, which is why it went unnoticed; a
        # real database or a CHECK constraint would not.
        display_name = clean_str(data.get("displayName"), DISPLAY_NAME_MAX) or username
        avatar = clean_str(data.get("avatar"), AVATAR_MAX) or "🌙"

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        if len(password) < 4:
            return jsonify({"error": "Password must be at least 4 characters"}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "That username is taken"}), 409

        user = User(
            username=username,
            display_name=display_name,
            password_hash=generate_password_hash(password),
            avatar=avatar,
        )
        db.session.add(user)
        try:
            db.session.commit()
        except IntegrityError:
            # The pre-check above isn't atomic with the commit — concurrent
            # registers (StrictMode's double bootstrap does this in dev) race
            # into the unique constraint. Same answer as losing the pre-check.
            db.session.rollback()
            return jsonify({"error": "That username is taken"}), 409

        # New users are auto-friended with the demo cottage-dwellers so the
        # social panel is never empty.
        befriend_demo_users(user)

        token = issue_token(user)
        return jsonify({"token": token, "user": user.public_dict()}), 201

    @app.post("/api/auth/login")
    def login():
        data = json_body()
        username = clean_str(data.get("username"), USERNAME_MAX).lower()
        password = data.get("password") if isinstance(data.get("password"), str) else ""
        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid username or password"}), 401
        token = issue_token(user)
        return jsonify({"token": token, "user": user.public_dict()})

    @app.get("/api/auth/me")
    @require_auth
    def me(user):
        return jsonify({"user": user.public_dict()})

    @app.post("/api/auth/logout")
    @require_auth
    def logout(user):  # noqa: ARG001 — @require_auth supplies it
        # Through the shared parser, rather than a second hand-rolled copy of the
        # same header slicing.
        value = _bearer_value()
        if value:
            Token.query.filter_by(value=value).delete()
            db.session.commit()
        return jsonify({"ok": True})

    # ----- Tasks ---------------------------------------------------------- #
    @app.get("/api/tasks")
    @require_auth
    def list_tasks(user):
        tasks = (
            Task.query.filter_by(user_id=user.id)
            .order_by(Task.position.asc(), Task.created_at.asc())
            .all()
        )
        # Routines reset lazily on read: a routine completed on a previous
        # LOCAL day comes back as not-done. Same local-day convention as the
        # "today" stats bucketing.
        today = date.today()
        changed = False
        for t in tasks:
            if t.is_routine and t.completed and t.completed_at:
                done_at = t.completed_at
                if done_at.tzinfo is None:
                    done_at = done_at.replace(tzinfo=timezone.utc)
                if done_at.astimezone().date() < today:
                    t.completed = False
                    t.completed_at = None
                    changed = True
        if changed:
            db.session.commit()
        return jsonify([t.to_dict() for t in tasks])

    @app.post("/api/tasks")
    @require_auth
    def create_task(user):
        data = json_body()
        name = clean_str(data.get("name"), TASK_NAME_MAX)
        if not name:
            return jsonify({"error": "Task name is required"}), 400
        # A day is the longest a single task can plausibly claim — the same
        # ceiling `log_session` puts on one session.
        duration = clean_int(data.get("duration"), 1, 24 * 60, 25)
        priority = data.get("priority", "medium")
        if priority not in ("low", "medium", "high"):
            priority = "medium"

        max_pos = (
            db.session.query(db.func.max(Task.position))
            .filter_by(user_id=user.id)
            .scalar()
        )
        group = clean_str(data.get("group"), GROUP_NAME_MAX) or None
        sched = data.get("scheduledDate")
        task = Task(
            user_id=user.id,
            name=name,
            duration=duration,
            priority=priority,
            position=(max_pos or 0) + 1,
            # Only a plausible date string reaches the String(10) column — a
            # non-string would raise at bind time (500), and SQLite doesn't
            # enforce the length itself.
            scheduled_date=clean_date(sched),
            notes=clean_str(data.get("notes"), TASK_NOTES_MAX) or None,
            due_date=clean_date(data.get("dueDate")),
            group_name=group,
            is_routine=bool(data.get("routine")),
        )
        db.session.add(task)
        db.session.commit()
        return jsonify(task.to_dict()), 201

    @app.put("/api/tasks/<int:task_id>")
    @require_auth
    def update_task(user, task_id):
        task = Task.query.filter_by(id=task_id, user_id=user.id).first()
        if not task:
            return jsonify({"error": "Task not found"}), 404
        data = json_body()

        if "name" in data and clean_str(data["name"], 200):
            task.name = clean_str(data["name"], 200)
        if "duration" in data:
            duration = clean_int(data["duration"], 1, 24 * 60)
            if duration is None:
                # 400 instead of a silent pass — a client bug shouldn't look
                # like a successful save (create_task and save_room both 400).
                # A huge but genuinely numeric value CLAMPS instead: it carries a
                # clear intent, and it used to 500.
                return jsonify({"error": "duration must be a number"}), 400
            task.duration = duration
        if "priority" in data and data["priority"] in ("low", "medium", "high"):
            task.priority = data["priority"]
        if "position" in data:
            # Positions are only ever compared with each other, so the bound only
            # has to be sane and bindable.
            position = clean_int(data["position"], 0, 1_000_000)
            if position is None:
                return jsonify({"error": "position must be a number"}), 400
            task.position = position
        if "scheduledDate" in data:
            task.scheduled_date = clean_date(data["scheduledDate"])
        if "notes" in data:
            # Empty string clears it, so the field behaves like the textarea does.
            task.notes = clean_str(data["notes"], TASK_NOTES_MAX) or None
        if "dueDate" in data:
            task.due_date = clean_date(data["dueDate"])
        if "group" in data:
            task.group_name = clean_str(data["group"], GROUP_NAME_MAX) or None
        if "routine" in data:
            task.is_routine = bool(data["routine"])
        if "completed" in data:
            # Stamp only on an actual TRANSITION. A repeated `completed: true` for
            # an already-done task used to move `completed_at` to now, which
            # inflates "done today", re-tints today on the calendar, and — worst —
            # cancels a routine's pending lazy reset by making yesterday's
            # completion look like today's.
            #
            # No current caller sends one (every PUT is a partial patch), so this
            # is a contract hole rather than a live bug — but it is one
            # "send the whole task object" refactor away from being real, and
            # nothing about it would fail loudly.
            done = bool(data["completed"])
            if done != task.completed:
                task.completed = done
                task.completed_at = utcnow() if done else None

        db.session.commit()
        return jsonify(task.to_dict())

    @app.delete("/api/tasks/<int:task_id>")
    @require_auth
    def delete_task(user, task_id):
        task = Task.query.filter_by(id=task_id, user_id=user.id).first()
        if not task:
            return jsonify({"error": "Task not found"}), 404
        db.session.delete(task)
        db.session.commit()
        return jsonify({"ok": True})

    @app.put("/api/tasks/reorder")
    @require_auth
    def reorder_tasks(user):
        """Persist a new ordering. Body: {"order": [taskId, taskId, ...]}."""
        data = json_body()
        order = data.get("order", [])
        if not isinstance(order, list):
            return jsonify({"error": "order must be a list"}), 400
        # One query for the lot, not one per id (the old loop was an N+1
        # write for every drag-reorder).
        # Bounded, not merely type-checked: a huge int passes `isinstance(t, int)`
        # and then raises OverflowError inside `Task.id.in_(ids)`. This is the
        # fourth site of the same bug and the one with no test covering it.
        ids = [
            v
            for v in (
                clean_int(t, 1, 2**53)
                for t in order
                if isinstance(t, int) and not isinstance(t, bool)
            )
            if v is not None
        ]
        tasks = {
            t.id: t
            for t in Task.query.filter(Task.user_id == user.id, Task.id.in_(ids)).all()
        }
        for index, task_id in enumerate(ids):
            task = tasks.get(task_id)
            if task:
                task.position = index
        db.session.commit()
        return jsonify({"ok": True})

    # ----- Focus sessions / productivity ---------------------------------- #
    @app.post("/api/sessions")
    @require_auth
    def log_session(user):
        data = json_body()
        try:
            minutes = int(data.get("minutes", 0))
        except (TypeError, ValueError):
            return jsonify({"error": "minutes must be a number"}), 400
        # A zero-minute session isn't a session. Both loggers in the app already
        # refuse to send one, but the endpoint accepted it and created a row —
        # which made /api/sessions/days answer {"2026-07-27": 0}, and the
        # calendar marks a day active from the key merely being present.
        if minutes < 1:
            return jsonify({"error": "minutes must be at least 1"}), 400
        # Bounded above too: one logged session can't exceed a day.
        minutes = min(24 * 60, minutes)
        session = FocusSession(
            user_id=user.id,
            minutes=minutes,
            task_name=clean_str(data.get("taskName"), 200) or None,
            day=today_str(),
        )
        db.session.add(session)
        db.session.commit()
        return jsonify(session.to_dict()), 201

    @app.get("/api/stats")
    @require_auth
    def stats(user):
        return jsonify(build_stats(user))

    @app.get("/api/sessions/days")
    @require_auth
    def session_days(user):
        """Focus minutes per day, for marking active days on the calendar."""
        rows = (
            db.session.query(FocusSession.day, db.func.sum(FocusSession.minutes))
            .filter_by(user_id=user.id)
            .group_by(FocusSession.day)
            .all()
        )
        return jsonify({day: int(minutes) for day, minutes in rows})

    @app.get("/api/sessions/day")
    @require_auth
    def session_day(user):
        """What you focused ON during one day — the other half of the history.

        `task_name` has been written on every session since sessions existed and
        read back by nothing, so the calendar could say "94 minutes" but never
        "94 minutes, on what". Kept as its own endpoint rather than folded into
        /sessions/days because that one is fetched wholesale on every refresh and
        paints a whole month; names are wanted for exactly one day at a time.
        """
        day = clean_date(request.args.get("day"))
        if not day:
            return jsonify({"error": "day must be YYYY-MM-DD"}), 400
        rows = (
            db.session.query(
                FocusSession.task_name,
                db.func.sum(FocusSession.minutes),
                db.func.count(FocusSession.id),
            )
            .filter_by(user_id=user.id, day=day)
            .group_by(FocusSession.task_name)
            .all()
        )
        entries = [
            {
                # A block run with no active task is a real, common case — the
                # UI needs something to print, and inventing a name server-side
                # would make it indistinguishable from a task actually called
                # "Focus". Null travels; the client decides how to say it.
                "taskName": name,
                "minutes": int(minutes),
                "sessions": int(count),
            }
            for name, minutes, count in rows
        ]
        # Longest first: "what did I spend the day on" is the question.
        entries.sort(key=lambda e: e["minutes"], reverse=True)
        return jsonify(
            {
                "day": day,
                "total": sum(e["minutes"] for e in entries),
                "entries": entries,
            }
        )

    # ----- Room decoration ------------------------------------------------- #
    # The frontend owns the item catalog and zone rules; the backend only
    # enforces shape and size so a bug can't balloon the stored blob.
    @app.get("/api/room")
    @require_auth
    def get_room(user):
        empty = {"placements": None, "iso": None}
        if not user.room_config:
            return jsonify(empty)
        try:
            saved = json.loads(user.room_config)
        except ValueError:
            return jsonify(empty)
        # Legacy shape: a bare list of flat placements (saves from before the
        # isometric room existed).
        if isinstance(saved, list):
            return jsonify({"placements": saved, "iso": None})
        if isinstance(saved, dict):
            return jsonify({
                "placements": saved.get("placements"),
                "iso": saved.get("iso"),
            })
        return jsonify(empty)

    def _clean_layout(placements, xkey, ykey):
        """Validate one placement list. Returns (cleaned, ok) — shared by the
        flat layout (x/y) and the isometric layout (gx/gy)."""
        # Headroom above the frontend's ISO_MAX_ITEMS (150), same as it
        # has always sat above it — this only stops a bug ballooning the blob.
        if not isinstance(placements, list) or len(placements) > 200:
            return None, False
        clean = []
        for p in placements:
            if not isinstance(p, dict):
                return None, False
            pid, item = p.get("id"), p.get("item")
            x, y = p.get(xkey), p.get(ykey)
            if not (isinstance(pid, str) and 0 < len(pid) <= 32):
                return None, False
            if not (isinstance(item, str) and 0 < len(item) <= 32):
                return None, False
            if not _finite_number(x) or not _finite_number(y):
                return None, False
            entry = {"id": pid, "item": item, xkey: x, ykey: y}
            tint = p.get("tint")
            if tint is not None:
                if not _hex_color(tint):
                    return None, False
                entry["tint"] = tint
            # Quarter turns, 0-3. It used to accept only 0/1, because only two
            # facings could be DRAWN (a screen mirror is a grid transpose; a
            # half turn is the sprite upside down). Seating that ships real
            # back-view artwork now has all four, and the frontend's
            # normalizeRot folds an unsupported turn back to a drawable one —
            # so this only has to bound the range, not know which items have it.
            rot = p.get("rot")
            if rot is not None:
                if not (isinstance(rot, int) and not isinstance(rot, bool) and 0 <= rot <= 3):
                    return None, False
                if rot:
                    entry["rot"] = rot
            # Pet identity: a NAME and a TEMPER ride the placement (pets ARE
            # placements). Same bounded-not-knowing stance as rot: which items
            # are pets is catalog (frontend) knowledge, so this only bounds the
            # values — the client's validateIsoLayout strips them from
            # non-pets on read. PET_TEMPERS mirrors lib/isoRoom.js (the
            # both-languages contract, like ISO_ENVS).
            name = p.get("name")
            if name is not None:
                if not (isinstance(name, str) and 0 < len(name.strip()) <= 16):
                    return None, False
                entry["name"] = name.strip()
            temper = p.get("temper")
            if temper is not None:
                if temper not in PET_TEMPERS:
                    return None, False
                entry["temper"] = temper
            clean.append(entry)
        return clean, True

    @app.put("/api/room")
    @require_auth
    def save_room(user):
        data = json_body()
        clean, ok = _clean_layout(data.get("placements"), "x", "y")
        if not ok:
            return jsonify({"error": "Invalid room layout"}), 400

        stored = {"placements": clean, "iso": None}
        iso = data.get("iso")
        if iso is not None:
            if not isinstance(iso, dict):
                return jsonify({"error": "Invalid room layout"}), 400
            w, depth = iso.get("w"), iso.get("d")
            if not (isinstance(w, int) and not isinstance(w, bool) and 3 <= w <= 64):
                return jsonify({"error": "Invalid room layout"}), 400
            if not (isinstance(depth, int) and not isinstance(depth, bool) and 3 <= depth <= 64):
                return jsonify({"error": "Invalid room layout"}), 400
            iso_clean, iso_ok = _clean_layout(iso.get("placements"), "gx", "gy")
            if not iso_ok:
                return jsonify({"error": "Invalid room layout"}), 400
            stored["iso"] = {"w": w, "d": depth, "placements": iso_clean}
            env = iso.get("env")
            if env is not None:
                if env not in ISO_ENVS:
                    return jsonify({"error": "Invalid room layout"}), 400
                stored["iso"]["env"] = env
            walls = iso.get("walls")
            if walls is not None:
                if walls not in ISO_WALLS:
                    return jsonify({"error": "Invalid room layout"}), 400
                stored["iso"]["walls"] = walls
            # Optional floor-plan mask: d row-strings of w "0"/"1" chars with
            # at least one floor tile.
            mask = iso.get("mask")
            if mask is not None:
                if (
                    not isinstance(mask, list)
                    or len(mask) != depth
                    or not all(
                        isinstance(r, str) and len(r) == w and set(r) <= {"0", "1"}
                        for r in mask
                    )
                    or not any("1" in r for r in mask)
                ):
                    return jsonify({"error": "Invalid room layout"}), 400
                stored["iso"]["mask"] = mask
            # Optional corner cuts (irregular floors). The frontend owns the
            # geometry rules; here we only pin the shape and sizes.
            cuts = iso.get("cuts")
            if cuts is not None:
                if not isinstance(cuts, list) or len(cuts) > 4:
                    return jsonify({"error": "Invalid room layout"}), 400
                clean_cuts = []
                for c in cuts:
                    if not isinstance(c, dict):
                        return jsonify({"error": "Invalid room layout"}), 400
                    corner = c.get("corner")
                    cw, cd = c.get("cw"), c.get("cd")
                    if corner not in ("back", "right", "left", "front"):
                        return jsonify({"error": "Invalid room layout"}), 400
                    for v in (cw, cd):
                        if not (isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 16):
                            return jsonify({"error": "Invalid room layout"}), 400
                    clean_cuts.append({"corner": corner, "cw": cw, "cd": cd})
                stored["iso"]["cuts"] = clean_cuts

        user.room_config = json.dumps(stored)
        db.session.commit()
        return jsonify({"ok": True})

    # ----- Profile & character --------------------------------------------- #
    # Third instance of the same division of labour as the room layout and the
    # unlock list: the frontend owns the vocabulary (which MBTI types exist,
    # which hairstyles are drawable), this only keeps a bounded blob safe. A new
    # profile question or a new hairstyle is then a frontend change with no
    # migration — which is the whole reason these are JSON and not columns.
    PROFILE_MAX_KEYS = 24
    PROFILE_MAX_VALUE = 280  # a bio, not an essay

    def _clean_json_map(value, max_keys, max_len):
        """A bounded {str: str|number|bool} map, or None if it isn't one.

        Deliberately flat: nesting is what turns a settings blob into somewhere
        arbitrary payloads can hide, and nothing here needs it.
        """
        if not isinstance(value, dict) or len(value) > max_keys:
            return None
        clean = {}
        for key, val in value.items():
            if not (isinstance(key, str) and 0 < len(key) <= 32):
                return None
            if val is None or val == "":
                continue  # clearing a field just drops it
            if isinstance(val, bool):
                clean[key] = val
            elif isinstance(val, (int, float)):
                # Reuse the room's guard: NaN/Infinity are floats that
                # json.dumps writes as bare NaN/Infinity — invalid JSON that
                # the browser then refuses to parse, corrupting the profile.
                if not _finite_number(val):
                    return None
                clean[key] = val
            elif isinstance(val, str):
                if len(val) > max_len:
                    return None
                clean[key] = val.strip()
            else:
                return None
        return clean

    def _read_json_map(raw):
        if not raw:
            return {}
        try:
            saved = json.loads(raw)
        except ValueError:
            return {}
        return saved if isinstance(saved, dict) else {}

    def _profile_payload(user):
        """The profile response. Built in one place because GET and PUT both
        return it, and two verbatim copies is one edit away from a PUT whose
        response omits a field the GET has."""
        return {
            "username": user.username,
            "displayName": user.display_name,
            "avatar": user.avatar,
            "profile": _read_json_map(user.profile),
            "character": _read_json_map(user.character),
        }

    @app.get("/api/profile")
    @require_auth
    def get_profile(user):
        return jsonify(
            _profile_payload(user)
        )

    @app.put("/api/profile")
    @require_auth
    def save_profile(user):
        data = json_body()

        # Each field is optional — the panel saves the section you edited, so a
        # partial body must leave the rest of the profile alone.
        if "displayName" in data:
            name = clean_str(data.get("displayName"), DISPLAY_NAME_MAX)
            if not name:
                return jsonify({"error": "A name can't be empty"}), 400
            user.display_name = name

        if "avatar" in data:
            # The column is String(8): one emoji can be several code points
            # (skin-tone and ZWJ sequences), so this is a byte-ish budget, not
            # "8 characters" as a person would count them.
            user.avatar = clean_str(data.get("avatar"), AVATAR_MAX)

        if "profile" in data:
            cleaned = _clean_json_map(
                data.get("profile"), PROFILE_MAX_KEYS, PROFILE_MAX_VALUE
            )
            if cleaned is None:
                return jsonify({"error": "Invalid profile"}), 400
            user.profile = json.dumps(cleaned)

        if "character" in data:
            # Appearance values are keys and hex colours, never prose.
            cleaned = _clean_json_map(data.get("character"), PROFILE_MAX_KEYS, 32)
            if cleaned is None:
                return jsonify({"error": "Invalid character"}), 400
            user.character = json.dumps(cleaned)

        db.session.commit()
        return jsonify(
            _profile_payload(user)
        )

    # ----- Unlocked furniture ---------------------------------------------- #
    # Same division of labour as the room layout: the frontend owns the catalog
    # AND the prices, so this only keeps the list of keys safe. Pricing here too
    # would duplicate catalog knowledge across two languages, which is exactly
    # how the environment list drifted and 400'd three presets. There's nothing
    # to cheat anyway — TaskNook is a single-user app on your own machine.
    @app.get("/api/unlocks")
    @require_auth
    def get_unlocks(user):
        if not user.unlocked:
            return jsonify({"unlocked": []})
        try:
            saved = json.loads(user.unlocked)
        except ValueError:
            return jsonify({"unlocked": []})
        if not isinstance(saved, list):
            return jsonify({"unlocked": []})
        return jsonify({"unlocked": [k for k in saved if isinstance(k, str)]})

    @app.put("/api/unlocks")
    @require_auth
    def save_unlocks(user):
        data = json_body()
        keys = data.get("unlocked")
        if not isinstance(keys, list) or len(keys) > 300:
            return jsonify({"error": "Invalid unlock list"}), 400
        clean = []
        seen = set()
        for key in keys:
            if not (isinstance(key, str) and 0 < len(key) <= 32):
                return jsonify({"error": "Invalid unlock list"}), 400
            if key not in seen:
                seen.add(key)
                clean.append(key)
        user.unlocked = json.dumps(clean)
        db.session.commit()
        return jsonify({"ok": True})

    # ----- Friends -------------------------------------------------------- #
    @app.get("/api/friends")
    @require_auth
    def list_friends(user):
        friends = list(user.friends)
        # Two grouped queries for everyone, instead of four per friend.
        stats = build_stats_for(f.id for f in friends)
        result = [{**f.public_dict(), **stats[f.id]} for f in friends]
        # Most productive today first.
        result.sort(key=lambda f: f["focusMinutesToday"], reverse=True)
        return jsonify(result)

    @app.post("/api/friends")
    @require_auth
    def add_friend(user):
        data = json_body()
        username = clean_str(data.get("username"), USERNAME_MAX).lower()
        friend = User.query.filter_by(username=username).first()
        if not friend:
            return jsonify({"error": "No cottage-dweller with that name"}), 404
        if friend.id == user.id:
            return jsonify({"error": "You are already your own best friend 🙂"}), 400
        if user.friends.filter_by(id=friend.id).first():
            return jsonify({"error": "Already friends"}), 409
        # Symmetric friendship.
        user.friends.append(friend)
        friend.friends.append(user)
        db.session.commit()
        return jsonify({**friend.public_dict(), **build_stats(friend)}), 201

    @app.get("/api/friends/<int:friend_id>/room")
    @require_auth
    def friend_room(user, friend_id):
        """A friend's room, character and door setting — for VISITING.

        Friend-gated (a stranger gets a 404), but deliberately NOT gated on
        `visit_access`: TaskNook is a single-user local app, the "friends"
        are seeded bots in the user's own SQLite file, and the knock/private
        flows are cozy client-side theater. Returning the data to a friend
        keeps that theater cheap and honest. THE CONTRACT FOR A MULTI-USER
        FUTURE: before this endpoint is ever served beyond localhost,
        enforcement must move HERE — 403 for `private`, an invites table for
        `invite` — because a client-side gate is no gate at all.
        """
        friend = user.friends.filter_by(id=friend_id).first()
        if not friend:
            return jsonify({"error": "Not found"}), 404
        # The visitable room is the ISO layout half of room_config; a legacy
        # bare-list config (flat-scene only) has no iso room to show.
        room = None
        if friend.room_config:
            try:
                saved = json.loads(friend.room_config)
                if isinstance(saved, dict) and isinstance(saved.get("iso"), dict):
                    room = saved["iso"]
            except ValueError:
                room = None
        character = _read_json_map(friend.character)
        return jsonify(
            {
                **friend.public_dict(),
                "room": room,
                "character": character or None,
            }
        )

    @app.put("/api/visit-access")
    @require_auth
    def set_visit_access(user):
        """Your own door setting. A whitelist, not free text — the value is
        an access rule, and an unknown level must fail loudly rather than be
        stored as a string nothing will ever match."""
        data = json_body()
        value = data.get("value")
        if value not in VISIT_ACCESS_LEVELS:
            return jsonify({"error": "Invalid visit access"}), 400
        user.visit_access = value
        db.session.commit()
        return jsonify({"visitAccess": value})

    @app.delete("/api/friends/<int:friend_id>")
    @require_auth
    def remove_friend(user, friend_id):
        friend = db.session.get(User, friend_id)
        if friend and user.friends.filter_by(id=friend.id).first():
            user.friends.remove(friend)
            if friend.friends.filter_by(id=user.id).first():
                friend.friends.remove(user)
            db.session.commit()
        return jsonify({"ok": True})

    # ---- chat ----------------------------------------------------------- #
    #
    # Threads with the seeded bots. The same simulated-social contract as
    # visiting: the server STORES messages and enforces membership, while the
    # replies themselves are written by the client (lib/chat.js owns the
    # vocabulary, the way lib/visiting.js owns the bots' homes). See
    # `post_message` for the seam and what a multi-user future must change.

    def _membership(user, chat_id):
        """The viewer's membership row, or None if it isn't their thread."""
        return ConversationMember.query.filter_by(
            conversation_id=chat_id, user_id=user.id
        ).first()

    def _chat_payload(chat, viewer_id, members_by_chat, last_by_chat, unread_by_chat):
        return {
            "id": chat.id,
            "title": chat.title,
            "isGroup": chat.is_group,
            "members": [m.public_dict() for m in members_by_chat.get(chat.id, [])],
            "lastMessage": (
                last_by_chat[chat.id].to_dict() if chat.id in last_by_chat else None
            ),
            "unread": unread_by_chat.get(chat.id, 0),
            "createdAt": _utc_iso(chat.created_at),
        }

    @app.get("/api/chats")
    @require_auth
    def list_chats(user):
        """Every thread the viewer is in, newest activity first.

        Three grouped queries rather than per-thread lookups — the same lesson
        `/api/friends` already learned, and a chat list is the screen most
        likely to grow.
        """
        rows = (
            db.session.query(Conversation, ConversationMember.last_read_at)
            .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
            .filter(ConversationMember.user_id == user.id)
            .all()
        )
        chats = [row[0] for row in rows]
        read_at = {row[0].id: row[1] for row in rows}
        ids = [c.id for c in chats]

        members_by_chat = {}
        if ids:
            for chat_id, member in (
                db.session.query(ConversationMember.conversation_id, User)
                .join(User, User.id == ConversationMember.user_id)
                .filter(ConversationMember.conversation_id.in_(ids))
                .all()
            ):
                members_by_chat.setdefault(chat_id, []).append(member)

        last_by_chat = {}
        unread_by_chat = {}
        if ids:
            for msg in (
                Message.query.filter(Message.conversation_id.in_(ids))
                .order_by(Message.created_at, Message.id)
                .all()
            ):
                last_by_chat[msg.conversation_id] = msg
                seen = read_at.get(msg.conversation_id)
                # Your own lines are never unread, and a thread you have never
                # opened counts everything but yourself.
                if msg.sender_id != user.id and (seen is None or msg.created_at > seen):
                    unread_by_chat[msg.conversation_id] = (
                        unread_by_chat.get(msg.conversation_id, 0) + 1
                    )

        payload = [
            _chat_payload(c, user.id, members_by_chat, last_by_chat, unread_by_chat)
            for c in chats
        ]
        payload.sort(
            key=lambda c: (c["lastMessage"] or {}).get("createdAt") or c["createdAt"] or "",
            reverse=True,
        )
        return jsonify(payload)

    @app.post("/api/chats")
    @require_auth
    def create_chat(user):
        """Open a thread with friends.

        A one-to-one is IDEMPOTENT — asking twice returns the thread you
        already have rather than a second empty copy of it, because "message
        Luna" is a place, not an event. Groups are not: two groups with the
        same people are a thing people genuinely want.
        """
        data = json_body()
        raw_ids = data.get("memberIds")
        if not isinstance(raw_ids, list):
            return jsonify({"error": "memberIds must be a list"}), 400
        # Only friends, only once each, never yourself twice.
        friend_ids = {f.id for f in user.friends}
        wanted = []
        for value in raw_ids[:50]:
            member_id = clean_id(value)
            if member_id is None or member_id == user.id or member_id in wanted:
                continue
            if member_id not in friend_ids:
                return jsonify({"error": "You can only chat with friends"}), 400
            wanted.append(member_id)
        if not wanted:
            return jsonify({"error": "Pick someone to talk to"}), 400

        is_group = len(wanted) > 1 or bool(data.get("isGroup"))
        title = clean_str(data.get("title"), CHAT_TITLE_MAX) or None

        if not is_group:
            # Find an existing one-to-one with exactly these two people.
            other = wanted[0]
            mine = db.session.query(ConversationMember.conversation_id).filter_by(
                user_id=user.id
            )
            theirs = db.session.query(ConversationMember.conversation_id).filter_by(
                user_id=other
            )
            existing = (
                Conversation.query.filter(
                    Conversation.is_group.is_(False),
                    Conversation.id.in_(mine),
                    Conversation.id.in_(theirs),
                )
                .order_by(Conversation.id)
                .first()
            )
            if existing:
                return jsonify(_one_chat(existing, user)), 200

        chat = Conversation(title=title if is_group else None, is_group=is_group)
        db.session.add(chat)
        db.session.flush()
        for member_id in [user.id, *wanted]:
            db.session.add(
                ConversationMember(conversation_id=chat.id, user_id=member_id)
            )
        db.session.commit()
        return jsonify(_one_chat(chat, user)), 201

    def _one_chat(chat, viewer):
        members = [m.user for m in chat.members]
        last = chat.messages.order_by(Message.created_at.desc(), Message.id.desc()).first()
        return {
            "id": chat.id,
            "title": chat.title,
            "isGroup": chat.is_group,
            "members": [m.public_dict() for m in members],
            "lastMessage": last.to_dict() if last else None,
            "unread": 0,
            "createdAt": _utc_iso(chat.created_at),
        }

    @app.get("/api/chats/<int:chat_id>/messages")
    @require_auth
    def list_messages(user, chat_id):
        if not _membership(user, chat_id):
            return jsonify({"error": "Not found"}), 404
        limit = clean_int(request.args.get("limit"), 1, 500, 200)
        rows = (
            Message.query.filter_by(conversation_id=chat_id)
            .order_by(Message.created_at.desc(), Message.id.desc())
            .limit(limit)
            .all()
        )
        return jsonify([m.to_dict() for m in reversed(rows)])

    @app.post("/api/chats/<int:chat_id>/messages")
    @require_auth
    def post_message(user, chat_id):
        """Add a line to a thread.

        `senderId` may name ANY member, not just the viewer — that is how the
        bots reply, since their words are the frontend's to choose (lib/chat.js,
        the same division of labour as lib/visiting.js). It is safe here for
        exactly the reason the visiting gate is: every member is a row in the
        caller's own local database, and there is no second machine.

        THE CONTRACT FOR A MULTI-USER FUTURE: this field must go before this
        endpoint is served beyond localhost. A client that can pick its own
        sender can forge messages from anyone it shares a thread with.
        """
        if not _membership(user, chat_id):
            return jsonify({"error": "Not found"}), 404
        data = json_body()
        body = clean_str(data.get("body"), MESSAGE_MAX)
        if not body:
            return jsonify({"error": "Message cannot be empty"}), 400

        sender_id = user.id
        raw_sender = data.get("senderId")
        if raw_sender is not None:
            candidate = clean_id(raw_sender)
            if candidate is None or not _is_member(chat_id, candidate):
                return jsonify({"error": "Sender is not in this chat"}), 400
            sender_id = candidate

        msg = Message(conversation_id=chat_id, sender_id=sender_id, body=body)
        db.session.add(msg)
        # Sending is reading: your own line must not come back as unread, and
        # you were plainly looking at the thread when you wrote it.
        if sender_id == user.id:
            member = _membership(user, chat_id)
            member.last_read_at = utcnow().replace(tzinfo=None)
        db.session.commit()
        return jsonify(msg.to_dict()), 201

    def _is_member(chat_id, user_id):
        return (
            ConversationMember.query.filter_by(
                conversation_id=chat_id, user_id=user_id
            ).first()
            is not None
        )

    @app.post("/api/chats/<int:chat_id>/read")
    @require_auth
    def mark_chat_read(user, chat_id):
        member = _membership(user, chat_id)
        if not member:
            return jsonify({"error": "Not found"}), 404
        member.last_read_at = utcnow().replace(tzinfo=None)
        db.session.commit()
        return jsonify({"ok": True})

    @app.delete("/api/chats/<int:chat_id>")
    @require_auth
    def delete_chat(user, chat_id):
        """Leave and delete a thread.

        Single-user app: the thread is only ever in your database, so leaving
        it and deleting it are the same act. The cascade takes the messages
        and the other memberships with it.
        """
        if not _membership(user, chat_id):
            return jsonify({"error": "Not found"}), 404
        chat = db.session.get(Conversation, chat_id)
        db.session.delete(chat)
        db.session.commit()
        return jsonify({"ok": True})


def build_stats_for(user_ids):
    """`build_stats` for MANY users, in a fixed number of queries.

    The friends panel asked for four aggregates per friend plus one for the
    viewer — seventeen round trips for the four seeded demo friends, growing
    linearly. Two GROUPED queries answer all of it regardless of how many friends
    there are, and the result is less code than the loop it replaces, not more.

    Conditional aggregates rather than four separate scans: `sum(case(...))` lets
    one pass over a user's tasks produce the total, the completed count and the
    completed-today count at once. The two time windows stay exactly as
    `build_stats` documents them — the list-wide counts and the local-day ones are
    computed side by side here, not merged.
    """
    ids = list(user_ids)
    if not ids:
        return {}
    day_start = local_day_start_utc()
    task_rows = (
        db.session.query(
            Task.user_id,
            db.func.count(Task.id),
            db.func.coalesce(db.func.sum(db.case((Task.completed.is_(True), 1), else_=0)), 0),
            db.func.coalesce(
                db.func.sum(
                    db.case(
                        (
                            db.and_(
                                Task.completed.is_(True),
                                Task.completed_at.isnot(None),
                                Task.completed_at >= day_start,
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ),
        )
        .filter(Task.user_id.in_(ids))
        .group_by(Task.user_id)
        .all()
    )
    focus_rows = (
        db.session.query(
            FocusSession.user_id,
            db.func.coalesce(db.func.sum(FocusSession.minutes), 0),
        )
        .filter(FocusSession.user_id.in_(ids), FocusSession.day == today_str())
        .group_by(FocusSession.user_id)
        .all()
    )
    tasks = {row[0]: (int(row[1]), int(row[2]), int(row[3])) for row in task_rows}
    focus = {row[0]: int(row[1]) for row in focus_rows}
    out = {}
    for uid in ids:
        total, done, done_today = tasks.get(uid, (0, 0, 0))
        out[uid] = {
            "tasksTotal": total,
            "tasksDone": done,
            "tasksDoneToday": done_today,
            "completion": round(done / total * 100) if total else 0,
            "focusMinutesToday": focus.get(uid, 0),
        }
    return out


def build_stats(user):
    """Aggregate a user's productivity.

    Two DIFFERENT time windows live here, and mixing them up is exactly the bug
    this shape exists to prevent: `tasksTotal`/`tasksDone`/`completion` describe
    the CURRENT LIST (which is ongoing — a standing to-do list isn't created
    fresh each morning), while `tasksDoneToday`/`focusMinutesToday` are bucketed
    by the local day. Label them accordingly in the UI; "Today's completion" over
    a lifetime count read as today's progress and never moved.

    COUNT queries, not `.all()` — this runs once per friend per friends-panel
    refresh, and hydrating every task row just to count them was the app's
    one real N+1.
    """
    today = today_str()
    total = db.session.query(db.func.count(Task.id)).filter_by(user_id=user.id).scalar() or 0
    done = (
        db.session.query(db.func.count(Task.id))
        .filter_by(user_id=user.id, completed=True)
        .scalar()
        or 0
    )
    done_today = (
        db.session.query(db.func.count(Task.id))
        .filter(
            Task.user_id == user.id,
            Task.completed.is_(True),
            Task.completed_at.isnot(None),
            Task.completed_at >= local_day_start_utc(),
        )
        .scalar()
        or 0
    )

    focus_minutes = (
        db.session.query(db.func.coalesce(db.func.sum(FocusSession.minutes), 0))
        .filter_by(user_id=user.id, day=today)
        .scalar()
        or 0
    )
    return {
        "tasksTotal": total,
        "tasksDone": done,
        "tasksDoneToday": int(done_today),
        "completion": round(done / total * 100) if total else 0,
        "focusMinutesToday": int(focus_minutes),
    }


# --------------------------------------------------------------------------- #
# Frontend (optional — only when built)
# --------------------------------------------------------------------------- #
def register_frontend(app):
    @app.get("/")
    @app.get("/<path:path>")
    def serve_frontend(path=""):
        # An unknown /api path must 404 as JSON, not fall through to
        # index.html with a 200 — api.js would hand HTML to a caller
        # expecting an array.
        if path.startswith("api/"):
            return jsonify({"error": "Not found"}), 404
        if not os.path.isdir(FRONTEND_DIST):
            return (
                "<h1>TaskNook API is running 🌙</h1>"
                "<p>The dev frontend runs separately via Vite "
                "(<code>cd frontend && npm run dev</code>), "
                "or build it with <code>npm run build</code> to serve it here.</p>"
            )
        target = os.path.join(FRONTEND_DIST, path)
        if path and os.path.isfile(target):
            return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, "index.html")


# --------------------------------------------------------------------------- #
# Seed data — demo cottage-dwellers so the social feature has life
# --------------------------------------------------------------------------- #
DEMO_USERS = [
    ("luna", "Luna", "🌸", "lofi123", [("Write journal", 20, "low", True),
                                       ("Read a chapter", 30, "medium", True),
                                       ("Water the plants", 10, "low", False)], 95),
    ("kai", "Kai", "🍵", "lofi123", [("Design mockups", 50, "high", True),
                                     ("Code review", 25, "medium", False)], 50),
    ("sora", "Sora", "🌧️", "lofi123", [("Study calculus", 45, "high", True),
                                        ("Stretch break", 10, "low", True),
                                        ("Email replies", 15, "medium", True)], 130),
    ("mochi", "Mochi", "🐱", "lofi123", [("Nap planning", 5, "low", False),
                                         ("Snack run", 10, "low", True)], 25),
]


def befriend_demo_users(user):
    for username, *_ in DEMO_USERS:
        friend = User.query.filter_by(username=username).first()
        if friend and not user.friends.filter_by(id=friend.id).first():
            user.friends.append(friend)
            friend.friends.append(user)
    db.session.commit()


# One of each door state, so every visit flow in the UI exists on day one:
# luna's door is open, kai is friends-only (the default), sora makes you
# knock, and mochi's room is private.
DEMO_VISIT_ACCESS = {"luna": "public", "kai": "friends", "sora": "invite", "mochi": "private"}


def seed_demo_data():
    if User.query.filter_by(username="luna").first():
        # Existing install: the bots predate visit_access, so they all sit on
        # the column default. Deal them their varied doors ONCE — if any bot
        # differs from the default the backfill (or a future hand) already
        # ran, and re-dealing would overwrite it on every boot. Accepted
        # edge: a hand that deliberately sets all four back to "friends"
        # (nothing in the app can) would see them re-dealt next boot —
        # making this truly one-shot needs a marker row, which isn't worth
        # it for seeded bots.
        bots = User.query.filter(User.username.in_(DEMO_VISIT_ACCESS)).all()
        if bots and all(b.visit_access == "friends" for b in bots):
            for b in bots:
                b.visit_access = DEMO_VISIT_ACCESS[b.username]
            db.session.commit()
        return  # already seeded

    created = []
    for username, display, avatar, pw, tasks, focus_today in DEMO_USERS:
        u = User(
            username=username,
            display_name=display,
            avatar=avatar,
            password_hash=generate_password_hash(pw),
            visit_access=DEMO_VISIT_ACCESS.get(username, "friends"),
        )
        db.session.add(u)
        db.session.flush()
        for i, (name, dur, prio, done) in enumerate(tasks):
            db.session.add(
                Task(
                    user_id=u.id,
                    name=name,
                    duration=dur,
                    priority=prio,
                    completed=done,
                    position=i,
                    completed_at=utcnow() if done else None,
                )
            )
        db.session.add(
            FocusSession(
                user_id=u.id, minutes=focus_today, task_name="Focus", day=today_str()
            )
        )
        created.append(u)

    # Demo users are all friends with each other.
    for a in created:
        for b in created:
            if a.id != b.id:
                a.friends.append(b)
    db.session.commit()


app = create_app()

if __name__ == "__main__":
    # Debug is on by default for local dev; set FLASK_DEBUG=0 in production.
    debug = os.environ.get("FLASK_DEBUG", "1") not in ("0", "false", "False")
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=debug, port=port)
