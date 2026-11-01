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
from sqlalchemy.exc import OperationalError
from werkzeug.security import generate_password_hash

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
from routes import (
    ISO_ENVS,
    ISO_WALLS,
    PET_LOOKS,
    PET_TEMPERS,
    VISIT_ACCESS_LEVELS,
    create_auth_blueprint,
    create_calendar_blueprint,
    create_chat_blueprint,
    create_room_profile_blueprint,
    create_sessions_blueprint,
    create_social_blueprint,
    create_tasks_blueprint,
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
    app.register_blueprint(
        create_auth_blueprint(require_auth, issue_token, _bearer_value, befriend_demo_users)
    )
    app.register_blueprint(create_tasks_blueprint(require_auth, clean_date))
    app.register_blueprint(
        create_calendar_blueprint(require_auth, clean_date, clean_time)
    )
    app.register_blueprint(
        create_sessions_blueprint(
            require_auth, today_str, clean_day, build_stats
        )
    )
    app.register_blueprint(
        create_social_blueprint(require_auth, build_stats_for, build_stats)
    )
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


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
def register_routes(app):
    @app.get("/api/health")
    def health():
        return {"status": "ok", "time": utcnow().isoformat()}


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
