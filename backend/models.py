"""Database models for TaskNook."""
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


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
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
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
            "startedAt": self.started_at.isoformat() if self.started_at else None,
        }


class Token(db.Model):
    """Opaque bearer token for simple session auth."""

    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
