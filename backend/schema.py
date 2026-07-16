"""Schema lifecycle: bring the database up to date, without ever losing data.

TaskNook ships as a desktop .exe, so a user's SQLite file lives in
%LOCALAPPDATA%\\TaskNook\\ and outlives any given release. That makes
`db.create_all()` insufficient: it creates *missing tables* but never adds a
column to an existing one, so shipping a new model field would break every
existing install. Alembic migrations are the upgrade path.

Three cases are handled on startup:

1. **Fresh database** — no tables yet. We run `upgrade()` from zero rather
   than `create_all()`, deliberately: it keeps migrations the single source of
   truth for the schema. If someone adds a model field and forgets to generate
   a migration, dev breaks immediately instead of silently diverging from what
   shipped users will get.
2. **Legacy database** — created before migrations existed, so it has tables
   but no `alembic_version`. Its schema *is* the baseline, so we stamp it
   rather than replaying history against it (which would fail: the tables are
   already there).
3. **Already managed** — just apply anything pending.
"""
import logging
import os
import shutil
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


def _alembic_config():
    return current_app.extensions["migrate"].migrate.get_config()


def _current_revision():
    with db.engine.connect() as conn:
        return MigrationContext.configure(conn).get_current_revision()


def _head_revision():
    return ScriptDirectory.from_config(_alembic_config()).get_current_head()


def _table_names():
    return set(inspect(db.engine).get_table_names())


def _backup_sqlite(db_path):
    """Copy the SQLite file before a schema change. Cheap insurance: a failed
    migration on a user's machine must never mean lost tasks."""
    if not db_path or not os.path.isfile(db_path):
        return None
    stamp_str = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = f"{db_path}.{stamp_str}.bak"
    try:
        shutil.copy2(db_path, backup)
    except OSError as exc:
        log.warning("Could not back up the database before migrating: %s", exc)
        return None
    _prune_backups(db_path)
    return backup


def _prune_backups(db_path):
    directory = os.path.dirname(db_path) or "."
    prefix = os.path.basename(db_path) + "."
    backups = sorted(
        (f for f in os.listdir(directory) if f.startswith(prefix) and f.endswith(".bak")),
        reverse=True,
    )
    for stale in backups[MAX_BACKUPS:]:
        try:
            os.remove(os.path.join(directory, stale))
        except OSError:
            pass


def init_schema(db_path=None):
    """Idempotent: safe to call on every startup. Must run inside an app context."""
    tables = _table_names()
    is_fresh = not (tables - {"alembic_version"})
    is_legacy = bool(tables) and "alembic_version" not in tables

    if is_legacy:
        # Adopt the existing schema as the baseline instead of re-creating it.
        log.info("Existing pre-migrations database found — stamping baseline.")
        stamp(revision=BASELINE_REVISION)

    if is_fresh:
        upgrade()  # builds the whole schema from the migration history
        return

    if _current_revision() == _head_revision():
        return  # already up to date; the common case, costs one cheap query

    backup = _backup_sqlite(db_path)
    if backup:
        log.info("Backed up database to %s before migrating.", backup)
    upgrade()
    log.info("Database schema upgraded to %s.", _head_revision())
