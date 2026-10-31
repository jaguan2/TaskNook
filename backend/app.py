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
    CalendarEvent,
    DISPLAY_NAME_MAX,
    FocusSession,
    GROUP_NAME_MAX,
    TASK_NAME_MAX,
    TASK_NOTES_MAX,
    Task,
    Token,
    USERNAME_MAX,
    User,
    db,
    utcnow,
)
from schema import init_schema, SchemaError
from request_validation import clean_id, clean_int, clean_str, json_body
from routes import (
    ISO_ENVS,
    ISO_WALLS,
    PET_LOOKS,
    PET_TEMPERS,
    create_chat_blueprint,
    create_room_profile_blueprint,
    read_json_map,
)

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
    app.register_blueprint(create_chat_blueprint(require_auth))
    app.register_blueprint(create_room_profile_blueprint(require_auth))
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


def clean_time(value):
    """A local HH:MM time, or None — appointments are not UTC timestamps."""
    if not isinstance(value, str) or len(value) != 5:
        return None
    try:
        time.fromisoformat(value)
    except ValueError:
        return None
    return value


def clean_day(value):
    """An exact YYYY-MM-DD query value (timestamps are not query days)."""
    if not isinstance(value, str) or len(value) != 10:
        return None
    return clean_date(value)


# Who may visit a user's room. Short stored keys; the UI labels
# ("friends-only", "invite-only") are frontend vocabulary.
VISIT_ACCESS_LEVELS = ("open", "friends", "invite", "private")


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
            if t.archived_at:
                continue
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

    @app.post("/api/tasks/<int:task_id>/archive")
    @require_auth
    def archive_task(user, task_id):
        task = Task.query.filter_by(id=task_id, user_id=user.id).first()
        if not task:
            return jsonify({"error": "Task not found"}), 404
        if not task.completed:
            return jsonify({"error": "Only completed tasks can be archived"}), 400
        if task.is_routine:
            return jsonify({"error": "Daily routines cannot be archived"}), 400
        if not task.archived_at:
            task.archived_at = utcnow()
            db.session.commit()
        return jsonify(task.to_dict())

    @app.get("/api/events")
    @require_auth
    def list_events(user):
        events = CalendarEvent.query.filter_by(user_id=user.id).order_by(
            CalendarEvent.event_date.asc(), CalendarEvent.start_time.asc()
        ).all()
        return jsonify([event.to_dict() for event in events])

    @app.post("/api/events")
    @require_auth
    def create_event(user):
        data = json_body()
        title = clean_str(data.get("title"), TASK_NAME_MAX)
        event_date = clean_date(data.get("date"))
        start_time = clean_time(data.get("startTime"))
        if not title or not event_date or not start_time:
            return jsonify({"error": "Event title, date, and start time are required"}), 400
        event = CalendarEvent(
            user_id=user.id,
            title=title,
            event_date=event_date,
            start_time=start_time,
            duration=clean_int(data.get("duration"), 1, 24 * 60, 60),
            notes=clean_str(data.get("notes"), TASK_NOTES_MAX) or None,
        )
        db.session.add(event)
        db.session.commit()
        return jsonify(event.to_dict()), 201

    @app.delete("/api/events/<int:event_id>")
    @require_auth
    def delete_event(user, event_id):
        event = CalendarEvent.query.filter_by(id=event_id, user_id=user.id).first()
        if not event:
            return jsonify({"error": "Event not found"}), 404
        db.session.delete(event)
        db.session.commit()
        return jsonify({"ok": True})

    @app.put("/api/tasks/group")
    @require_auth
    def rename_task_group(user):
        """Rename one user's task group atomically.

        The client used to issue one PUT per task. A network failure halfway
        through split a single group into two names, which is worse than a
        refused rename. One SQL UPDATE makes the operation all-or-nothing.
        Empty group headings remain client-side and never call this route.
        """
        data = json_body()
        next_raw = data.get("nextName")
        if "nextName" not in data or not isinstance(data.get("name"), str) or not (
            next_raw is None or isinstance(next_raw, str)
        ):
            return jsonify({"error": "Group names are required"}), 400
        name = clean_str(data["name"], GROUP_NAME_MAX)
        next_name = clean_str(next_raw, GROUP_NAME_MAX) if next_raw is not None else None
        if not name or next_name == "" or name == next_name:
            return jsonify({"error": "Two different group names are required"}), 400
        if next_name and Task.query.filter_by(user_id=user.id, group_name=next_name).first():
            return jsonify({"error": "That task group already exists"}), 409
        updated = Task.query.filter_by(user_id=user.id, group_name=name).update(
            {"group_name": next_name}, synchronize_session=False
        )
        if not updated:
            return jsonify({"error": "Task group not found"}), 404
        db.session.commit()
        return jsonify({"updated": updated, "name": next_name})

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
        ids = []
        seen = set()
        for raw in order:
            task_id = clean_id(raw)
            if task_id is not None and task_id not in seen:
                seen.add(task_id)
                ids.append(task_id)

        # A partial or duplicate client list must still leave one dense,
        # deterministic ordering. Previously omitted tasks kept their old
        # positions and duplicate ids created gaps/collisions, so later reads
        # could interleave rows unpredictably.
        all_tasks = (
            Task.query.filter_by(user_id=user.id)
            .order_by(Task.position, Task.id)
            .all()
        )
        by_id = {task.id: task for task in all_tasks}
        reordered = [by_id[task_id] for task_id in ids if task_id in by_id]
        reordered.extend(task for task in all_tasks if task.id not in seen)
        for index, task in enumerate(reordered):
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
        day = clean_day(request.args.get("day"))
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
        """A friend's room, character and access setting — for VISITING.

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
        character = read_json_map(friend.character)
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
        """Your room's visit setting. A whitelist, not free text — the value is
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

def build_stats_for(user_ids):
    """One productivity policy for both the local account and friends.

    List totals/completion describe the current, unarchived list. Daily credit
    includes archived completions: moving finished work to the journal must not
    erase it from today's achievements. Focus minutes use the same local day.
    Two grouped queries answer all requested users without loading task history.
    """
    ids = list(user_ids)
    if not ids:
        return {}
    day_start = local_day_start_utc()
    active = Task.archived_at.is_(None)
    task_rows = (
        db.session.query(
            Task.user_id,
            db.func.coalesce(db.func.sum(db.case((active, 1), else_=0)), 0),
            db.func.coalesce(db.func.sum(db.case((db.and_(active, Task.completed.is_(True)), 1), else_=0)), 0),
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
    """Single-user view of the same list/day aggregation used for friends."""
    return build_stats_for([user.id])[user.id]


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


# One of each access state, so every visit flow in the UI exists on day one:
# Luna's room is open, Kai's is friends-only (the default), Sora asks visitors
# to knock, and Mochi's room is private.
DEMO_VISIT_ACCESS = {"luna": "open", "kai": "friends", "sora": "invite", "mochi": "private"}


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
