"""TaskNook backend — a cozy task tracker API.

Run:  python app.py    (serves the REST API on http://localhost:5000)
"""
import os
import secrets
from datetime import datetime, timezone, date
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User, Task, FocusSession, Token, utcnow

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# If the frontend has been built (frontend/dist), Flask will also serve it.
FRONTEND_DIST = os.path.join(BASE_DIR, "..", "frontend", "dist")


def create_app():
    app = Flask(__name__, static_folder=None)
    # DB lives next to this file by default; override with TASKNOOK_DB so the
    # packaged desktop app can store it in a user-writable location.
    db_path = os.environ.get("TASKNOOK_DB") or os.path.join(BASE_DIR, "tasknook.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + db_path
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    CORS(app)
    db.init_app(app)

    with app.app_context():
        db.create_all()
        seed_demo_data()

    register_routes(app)
    register_frontend(app)
    return app


# --------------------------------------------------------------------------- #
# Auth helpers
# --------------------------------------------------------------------------- #
def issue_token(user):
    token = Token(value=secrets.token_hex(24), user_id=user.id)
    db.session.add(token)
    db.session.commit()
    return token.value


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
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip().lower()
        password = data.get("password") or ""
        display_name = (data.get("displayName") or username).strip()
        avatar = (data.get("avatar") or "🌙")[:8]

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        if len(password) < 4:
            return jsonify({"error": "Password must be at least 4 characters"}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "That username is taken"}), 409

        user = User(
            username=username,
            display_name=display_name or username,
            password_hash=generate_password_hash(password),
            avatar=avatar,
        )
        db.session.add(user)
        db.session.commit()

        # New users are auto-friended with the demo cottage-dwellers so the
        # social panel is never empty.
        befriend_demo_users(user)

        token = issue_token(user)
        return jsonify({"token": token, "user": user.public_dict()}), 201

    @app.post("/api/auth/login")
    def login():
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip().lower()
        password = data.get("password") or ""
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
        return jsonify([t.to_dict() for t in tasks])

    @app.post("/api/tasks")
    @require_auth
    def create_task(user):
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
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
        task = Task(
            user_id=user.id,
            name=name,
            duration=duration,
            priority=priority,
            position=(max_pos or 0) + 1,
            scheduled_date=data.get("scheduledDate"),
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
        data = request.get_json(silent=True) or {}

        if "name" in data and data["name"].strip():
            task.name = data["name"].strip()
        if "duration" in data:
            try:
                task.duration = max(1, int(data["duration"]))
            except (TypeError, ValueError):
                pass
        if "priority" in data and data["priority"] in ("low", "medium", "high"):
            task.priority = data["priority"]
        if "position" in data:
            try:
                task.position = int(data["position"])
            except (TypeError, ValueError):
                pass
        if "scheduledDate" in data:
            task.scheduled_date = data["scheduledDate"] or None
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
        data = request.get_json(silent=True) or {}
        order = data.get("order", [])
        for index, task_id in enumerate(order):
            task = Task.query.filter_by(id=task_id, user_id=user.id).first()
            if task:
                task.position = index
        db.session.commit()
        return jsonify({"ok": True})

    # ----- Focus sessions / productivity ---------------------------------- #
    @app.post("/api/sessions")
    @require_auth
    def log_session(user):
        data = request.get_json(silent=True) or {}
        try:
            minutes = max(0, int(data.get("minutes", 0)))
        except (TypeError, ValueError):
            minutes = 0
        session = FocusSession(
            user_id=user.id,
            minutes=minutes,
            task_name=data.get("taskName"),
            day=today_str(),
        )
        db.session.add(session)
        db.session.commit()
        return jsonify(session.to_dict()), 201

    @app.get("/api/stats")
    @require_auth
    def stats(user):
        return jsonify(build_stats(user))

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
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip().lower()
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
    """Aggregate today's productivity for a user."""
    today = today_str()
    tasks = Task.query.filter_by(user_id=user.id).all()
    total = len(tasks)
    done = sum(1 for t in tasks if t.completed)

    focus_minutes = (
        db.session.query(db.func.coalesce(db.func.sum(FocusSession.minutes), 0))
        .filter_by(user_id=user.id, day=today)
        .scalar()
        or 0
    )
    return {
        "tasksTotal": total,
        "tasksDone": done,
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
