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

from models import db, User, Task, FocusSession, Token, utcnow
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
    db.session.commit()
    _prune_tokens(user)
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
    if not stale:
        return
    for old in stale:
        db.session.delete(old)
    db.session.commit()


def current_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    value = auth[7:].strip()
    tok = Token.query.filter_by(value=value).first()
    return tok.user if tok else None


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
        username = clean_str(data.get("username"), 80).lower()
        password = data.get("password") if isinstance(data.get("password"), str) else ""
        display_name = clean_str(data.get("displayName"), 80) or username
        avatar = clean_str(data.get("avatar"), 8) or "🌙"

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
        username = clean_str(data.get("username"), 80).lower()
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
    def logout(user):
        auth = request.headers.get("Authorization", "")
        value = auth[7:].strip()
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
        name = clean_str(data.get("name"), 200)
        if not name:
            return jsonify({"error": "Task name is required"}), 400
        try:
            duration = max(1, int(data.get("duration", 25)))
        except (TypeError, ValueError):
            duration = 25
        priority = data.get("priority", "medium")
        if priority not in ("low", "medium", "high"):
            priority = "medium"

        max_pos = (
            db.session.query(db.func.max(Task.position))
            .filter_by(user_id=user.id)
            .scalar()
        )
        group = clean_str(data.get("group"), 60) or None
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
            scheduled_date=sched[:10] if isinstance(sched, str) and sched else None,
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
            try:
                task.duration = max(1, int(data["duration"]))
            except (TypeError, ValueError):
                # 400 instead of a silent pass — a client bug shouldn't look
                # like a successful save (create_task and save_room both 400).
                return jsonify({"error": "duration must be a number"}), 400
        if "priority" in data and data["priority"] in ("low", "medium", "high"):
            task.priority = data["priority"]
        if "position" in data:
            try:
                task.position = int(data["position"])
            except (TypeError, ValueError):
                return jsonify({"error": "position must be a number"}), 400
        if "scheduledDate" in data:
            sched = data["scheduledDate"]
            task.scheduled_date = sched[:10] if isinstance(sched, str) and sched else None
        if "group" in data:
            task.group_name = clean_str(data["group"], 60) or None
        if "routine" in data:
            task.is_routine = bool(data["routine"])
        if "completed" in data:
            task.completed = bool(data["completed"])
            task.completed_at = utcnow() if task.completed else None

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
        ids = [t for t in order if isinstance(t, int) and not isinstance(t, bool)]
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
        if not isinstance(placements, list) or len(placements) > 80:
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

    # ----- Friends -------------------------------------------------------- #
    @app.get("/api/friends")
    @require_auth
    def list_friends(user):
        result = []
        for friend in user.friends:
            result.append({**friend.public_dict(), **build_stats(friend)})
        # Most productive today first.
        result.sort(key=lambda f: f["focusMinutesToday"], reverse=True)
        return jsonify(result)

    @app.post("/api/friends")
    @require_auth
    def add_friend(user):
        data = json_body()
        username = clean_str(data.get("username"), 80).lower()
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


def seed_demo_data():
    if User.query.filter_by(username="luna").first():
        return  # already seeded

    created = []
    for username, display, avatar, pw, tasks, focus_today in DEMO_USERS:
        u = User(
            username=username,
            display_name=display,
            avatar=avatar,
            password_hash=generate_password_hash(pw),
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
