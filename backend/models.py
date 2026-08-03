"""Database models for TaskNook."""
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


def _utc_iso(dt):
    """Serialize a stored timestamp WITH its UTC marker.

    SQLite's DateTime column drops the offset on write and returns naive
    datetimes, so a bare isoformat() has no 'Z'/'+00:00' — and JS parses an
    offset-less date-time string as LOCAL time, shifting every timestamp by
    the user's UTC offset (a task completed in the evening tinted the NEXT
    day on the calendar for anyone west of UTC).
    """
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# Association table for the (symmetric) friendship graph.
friendships = db.Table(
    "friendships",
    db.Column("user_id", db.Integer, db.ForeignKey("user.id"), primary_key=True),
    db.Column("friend_id", db.Integer, db.ForeignKey("user.id"), primary_key=True),
)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(40), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(60), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar = db.Column(db.String(8), default="🌙")  # emoji avatar
    # Freeform room-decoration layout, stored as a JSON string of
    # [{id, item, x, y}] placements. The frontend owns the catalog; the
    # backend just keeps the layout safe alongside the rest of the user's data.
    room_config = db.Column(db.Text, nullable=True)
    # Furniture bought with focus minutes, as a JSON string of item keys.
    # Like room_config, the frontend owns the catalog and the prices; this just
    # keeps the list safe. Nullable rather than defaulted so an existing row
    # doesn't need backfilling — an absent value means "only the free pieces".
    unlocked = db.Column(db.Text, nullable=True)
    # Who you are (JSON string): mbti, birthDate, pronouns, bio… A blob rather
    # than a column per field on purpose — same bargain as room_config, and the
    # whole point of a profile is that fields get added later. A new question
    # is then a frontend change, not a migration.
    profile = db.Column(db.Text, nullable=True)
    # How your resident LOOKS (JSON string): body, skin, hair, outfit + their
    # colours. Kept apart from `profile` because a different consumer reads it —
    # the iso room draws this every frame, panels read the other one.
    character = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    tasks = db.relationship(
        "Task", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    sessions = db.relationship(
        "FocusSession", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    tokens = db.relationship(
        "Token", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    friends = db.relationship(
        "User",
        secondary=friendships,
        primaryjoin=id == friendships.c.user_id,
        secondaryjoin=id == friendships.c.friend_id,
        lazy="dynamic",
    )

    def public_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "displayName": self.display_name,
            "avatar": self.avatar,
        }


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    duration = db.Column(db.Integer, nullable=False, default=25)  # minutes
    priority = db.Column(db.String(10), nullable=False, default="medium")
    completed = db.Column(db.Boolean, nullable=False, default=False)
    # Manual position used by the "custom" ordering algorithm.
    position = db.Column(db.Integer, nullable=False, default=0)
    # Optional ISO date (YYYY-MM-DD) the task is scheduled on the calendar.
    scheduled_date = db.Column(db.String(10), nullable=True)
    # Optional to-do group header the task lives under (VC2-style).
    group_name = db.Column(db.String(60), nullable=True)
    # Routine tasks reset to not-done at the start of each (local) day.
    is_routine = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "duration": self.duration,
            "priority": self.priority,
            "completed": self.completed,
            "position": self.position,
            "scheduledDate": self.scheduled_date,
            "group": self.group_name,
            "routine": self.is_routine,
            "createdAt": _utc_iso(self.created_at),
            "completedAt": _utc_iso(self.completed_at),
        }


class FocusSession(db.Model):
    """A completed (or in-progress) focus block, used for productivity hours."""

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    minutes = db.Column(db.Integer, nullable=False, default=0)
    task_name = db.Column(db.String(200), nullable=True)
    started_at = db.Column(db.DateTime, default=utcnow)
    # Stored as YYYY-MM-DD for cheap "today" aggregation.
    day = db.Column(db.String(10), nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "minutes": self.minutes,
            "taskName": self.task_name,
            "day": self.day,
            "startedAt": _utc_iso(self.started_at),
        }


class Token(db.Model):
    """Opaque bearer token for simple session auth."""

    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
