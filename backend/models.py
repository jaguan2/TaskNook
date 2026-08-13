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


# Column widths that the API also has to respect. Here rather than in app.py so
# the bound and the column are declared in one place: register was clamping both
# of these to 80 while `save_profile` clamped display_name to 60, so two writers
# disagreed about the same column and neither matched the schema. SQLite forgives
# an over-long string, which is exactly why it went unnoticed.
USERNAME_MAX = 40
DISPLAY_NAME_MAX = 60
AVATAR_MAX = 8
TASK_NAME_MAX = 200
TASK_NOTES_MAX = 2000
GROUP_NAME_MAX = 60
CHAT_TITLE_MAX = 60
MESSAGE_MAX = 2000


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(USERNAME_MAX), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(DISPLAY_NAME_MAX), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar = db.Column(db.String(AVATAR_MAX), default="🌙")  # emoji avatar
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
    # Who may visit this user's room: "public" | "friends" | "invite" |
    # "private". A real COLUMN, not a blob field, because it is an access
    # rule a multi-user server would enforce — not presentation the frontend
    # owns. (Today enforcement is client-side theater against the seeded
    # bots; see the /api/friends/<id>/room doc-comment.)
    visit_access = db.Column(db.String(16), nullable=False, server_default="friends")
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
            "visitAccess": self.visit_access,
        }


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    name = db.Column(db.String(TASK_NAME_MAX), nullable=False)
    duration = db.Column(db.Integer, nullable=False, default=25)  # minutes
    priority = db.Column(db.String(10), nullable=False, default="medium")
    completed = db.Column(db.Boolean, nullable=False, default=False)
    # Manual position used by the "custom" ordering algorithm.
    position = db.Column(db.Integer, nullable=False, default=0)
    # Optional ISO date (YYYY-MM-DD) the task is scheduled on the calendar.
    scheduled_date = db.Column(db.String(10), nullable=True)
    # Free text under the task — the bit of context that stops a one-line title
    # from being a riddle a week later ("call back" — about what?).
    notes = db.Column(db.Text, nullable=True)
    # A DEADLINE, which `scheduled_date` deliberately is not: that one is where
    # you chose to put the task on the calendar, and nothing sorts by it or warns
    # on it. Same YYYY-MM-DD convention, and the same local-day rule as the rest
    # of the app — the client sends a local date string, never a UTC timestamp.
    due_date = db.Column(db.String(10), nullable=True)
    # Optional to-do group header the task lives under (VC2-style).
    group_name = db.Column(db.String(GROUP_NAME_MAX), nullable=True)
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
            "notes": self.notes,
            "dueDate": self.due_date,
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


class Conversation(db.Model):
    """A chat thread: one-to-one with a friend, or a named group.

    `is_group` is stored rather than derived from the member count, because the
    two are different KINDS of thread and a group can legitimately be left with
    two members. A one-to-one has no title — its name is whoever else is in it,
    which the client already knows how to draw.
    """

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(CHAT_TITLE_MAX), nullable=True)
    is_group = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    members = db.relationship(
        "ConversationMember",
        backref="conversation",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    messages = db.relationship(
        "Message",
        backref="conversation",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class ConversationMember(db.Model):
    """Who is in a thread, and how far they have read.

    A model rather than a plain association table (which is all `friendships`
    needs) because membership carries state: `last_read_at` is what an unread
    count is measured against. Storing a TIMESTAMP rather than a count means
    the number is derived from the messages themselves and can't drift out of
    step with them — the same reasoning as the unlock balance.
    """

    __table_args__ = (
        db.UniqueConstraint("conversation_id", "user_id", name="uq_member_once"),
    )

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(
        db.Integer, db.ForeignKey("conversation.id"), nullable=False, index=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    last_read_at = db.Column(db.DateTime, nullable=True)
    joined_at = db.Column(db.DateTime, default=utcnow)

    # The cascade is declared from the USER side (via backref) so deleting an
    # account takes its memberships with it, the same way tasks and tokens go.
    user = db.relationship(
        "User",
        backref=db.backref("chat_memberships", lazy=True, cascade="all, delete-orphan"),
    )


class Message(db.Model):
    """One line in a thread.

    `sender_id` is a real user row — including the seeded bots, whose replies
    are written by the client (see the POST endpoint's doc-comment). Deleting a
    user takes their messages with them, same as their tasks.
    """

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(
        db.Integer, db.ForeignKey("conversation.id"), nullable=False, index=True
    )
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    body = db.Column(db.String(MESSAGE_MAX), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)

    sender = db.relationship(
        "User",
        backref=db.backref("sent_messages", lazy=True, cascade="all, delete-orphan"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "conversationId": self.conversation_id,
            "senderId": self.sender_id,
            "body": self.body,
            "createdAt": _utc_iso(self.created_at),
        }


class Token(db.Model):
    """Opaque bearer token for simple session auth."""

    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
