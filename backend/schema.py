"""Schema lifecycle: bring the database up to date, without ever losing data.

TaskNook ships as a desktop .exe, so a user's SQLite file lives in
%LOCALAPPDATA%\\TaskNook\\ and outlives any given release. That makes
`db.create_all()` insufficient: it creates *missing tables* but never adds a
column to an existing one, so shipping a new model field would break every
existing install. Alembic migrations are the upgrade path.

The state we branch on is **Alembic's revision row, not the table names** —
those are two sources of truth and they disagree exactly at the edges (a DB
stamped but never upgraded, or an empty `alembic_version` beside real tables).
`upgrade()` consults the revision, so we must too.

Cases handled on startup:

1. **Fresh** (no real tables) — run `upgrade()` from zero rather than
   `create_all()`, deliberately: it keeps migrations the single source of truth
   for the schema. If someone adds a model field and forgets to generate a
   migration, dev breaks immediately instead of silently diverging from what
   shipped users will get.
2. **Legacy** (real tables, no revision) — created before migrations existed.
   Its schema *is* the baseline, so stamp it rather than replaying history
   against it (which would fail: the tables are already there).
3. **Ahead** (revision unknown to us) — the user downgraded the app. Refuse:
   their data is newer than this build and migrating would corrupt it.
4. **Managed** — apply anything pending.
"""
import logging
import os
import re
import shutil
import sqlite3
from datetime import datetime

from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from flask import current_app
from flask_migrate import stamp, upgrade
from sqlalchemy import inspect

from models import db

log = logging.getLogger(__name__)

# The first revision — the schema as it stood when migrations were introduced.
# A pre-migrations database is, by definition, already at this revision.
BASELINE_REVISION = "0001_baseline"

# Keep a bounded number of pre-upgrade backups so a bad migration is always
# recoverable, without growing forever.
MAX_BACKUPS = 3

# Only prune files we generated: <db>.<YYYYmmdd-HHMMSS[-N]>.bak. Without this a
# user's own `tasknook.db.keepme.bak` would occupy a keep-slot and evict a real
# backup.
_BACKUP_RE = re.compile(r"\.(\d{8}-\d{6}(?:-\d+)?)\.bak$")


class SchemaError(RuntimeError):
    """Raised when we must not touch the database (and why)."""


def _alembic_config():
    return current_app.extensions["migrate"].migrate.get_config()


def _script_directory():
    return ScriptDirectory.from_config(_alembic_config())


def _current_revision():
    with db.engine.connect() as conn:
        return MigrationContext.configure(conn).get_current_revision()


def _head_revision():
    return _script_directory().get_current_head()


def _known_revisions():
    return {s.revision for s in _script_directory().walk_revisions()}


def _is_sqlite():
    return db.engine.dialect.name == "sqlite"


# --------------------------------------------------------------------------- #
# Backups
# --------------------------------------------------------------------------- #
def _backup_path(db_path):
    """A unique, prunable name. Two backups in the same second must not collide
    (the second copy would silently overwrite the first)."""
    base = f"{db_path}.{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    if not os.path.exists(f"{base}.bak"):
        return f"{base}.bak"
    for n in range(2, 100):
        if not os.path.exists(f"{base}-{n}.bak"):
            return f"{base}-{n}.bak"
    return f"{base}-{os.getpid()}.bak"


def _backup_sqlite(db_path):
    """Snapshot the database before a schema change.

    Uses SQLite's own backup API rather than copying the file: a plain copy is
    only correct in the default journal mode. The moment anyone enables WAL (a
    routine perf tweak, and persistent in the file header) recent commits live
    in the -wal sidecar, and a file copy would silently produce a stale
    snapshot — the worst kind of backup. This is engine-level and consistent
    under any journal mode.
    """
    backup = _backup_path(db_path)
    source = sqlite3.connect(db_path)
    try:
        dest = sqlite3.connect(backup)
        try:
            source.backup(dest)
        finally:
            dest.close()
    finally:
        source.close()
    _prune_backups(db_path)
    return backup


def _prune_backups(db_path):
    directory = os.path.dirname(db_path) or "."
    prefix = os.path.basename(db_path)
    ours = [
        f
        for f in os.listdir(directory)
        if f.startswith(prefix + ".") and _BACKUP_RE.search(f)
    ]
    for stale in sorted(ours, reverse=True)[MAX_BACKUPS:]:
        try:
            os.remove(os.path.join(directory, stale))
        except OSError:
            pass  # a locked/vanished backup is not worth failing a launch over


def _safety_backup(db_path):
    """Take a backup, or explain why we're refusing to continue.

    A failed backup is exactly when you do NOT want to migrate anyway, so this
    is fatal rather than a warning nobody will ever see.
    """
    if not _is_sqlite():
        # The guarantee this module advertises is SQLite-file-shaped. Say so
        # loudly rather than silently migrating a Postgres DB with no snapshot.
        raise SchemaError(
            "Refusing to migrate a non-SQLite database automatically: "
            "TaskNook's pre-migration backup only supports SQLite. "
            "Back up manually and run `flask db upgrade` yourself."
        )
    if not db_path or not os.path.isfile(db_path):
        raise SchemaError(f"Cannot back up the database: {db_path!r} is not a file.")
    try:
        return _backup_sqlite(db_path)
    except (OSError, sqlite3.Error) as exc:
        raise SchemaError(
            f"Could not back up the database before migrating ({exc}). "
            "Nothing was changed. Free up disk space or check permissions, "
            "then relaunch."
        ) from exc


# --------------------------------------------------------------------------- #
# Startup
# --------------------------------------------------------------------------- #
def init_schema(db_path):
    """Idempotent: safe to call on every startup. Must run inside an app context.

    Raises SchemaError when the database must not be touched; the caller is
    responsible for surfacing that to the user (see app.py).
    """
    real_tables = _table_names() - {"alembic_version"}
    current = _current_revision()
    head = _head_revision()

    # -- 1. Fresh: build the schema from the migration history ---------------
    if not real_tables:
        if current is not None:
            # Stamped but empty (interrupted setup, or a hand-cleared DB).
            # upgrade() would consult the revision, conclude "already at head"
            # and create nothing — leaving a permanently broken install. Clear
            # the claim so the history actually replays.
            log.info("Revision %s recorded but no tables exist — resetting.", current)
            stamp(revision="base")
        upgrade()
        return

    # -- 2. Legacy: adopt the existing schema as the baseline ----------------
    if current is None:
        log.info("Existing pre-migrations database found — stamping baseline.")
        _safety_backup(db_path)  # stamp writes to their file; snapshot first
        stamp(revision=BASELINE_REVISION)
        current = BASELINE_REVISION

    # -- 3. Ahead: their data is newer than this build -----------------------
    if current not in _known_revisions():
        raise SchemaError(
            f"This database is at revision {current!r}, which this version of "
            "TaskNook doesn't know about — it was created by a newer release. "
            "Upgrade TaskNook again, or restore an older backup."
        )

    # -- 4. Managed ----------------------------------------------------------
    if current == head:
        return  # the common case: one cheap query, no backup, no work

    backup = _safety_backup(db_path)
    log.info("Backed up database to %s before migrating.", backup)
    upgrade()
    log.info("Database schema upgraded to %s.", head)


def _table_names():
    return set(inspect(db.engine).get_table_names())
