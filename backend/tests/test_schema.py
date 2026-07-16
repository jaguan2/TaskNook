"""Schema-lifecycle tests.

These guard the promise that makes shipping a desktop .exe safe: a user's
database survives an upgrade. Every case below maps to a real way an install
can be found in the wild — including two states that previously left the app
permanently unable to boot.
"""
import sqlite3

import pytest

from app import create_app
from schema import BASELINE_REVISION, MAX_BACKUPS, SchemaError


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def boot(db_path, monkeypatch):
    """Start the app against db_path, exactly as a launch would."""
    monkeypatch.setenv("TASKNOOK_DB", str(db_path))
    return create_app()


def sql(db_path, statement, *args):
    con = sqlite3.connect(str(db_path))
    try:
        rows = con.execute(statement, args).fetchall()
        con.commit()
        return rows
    finally:
        con.close()


def tables(db_path):
    rows = sql(db_path, "SELECT name FROM sqlite_master WHERE type='table'")
    return {r[0] for r in rows} - {"sqlite_sequence"}


def revision(db_path):
    """The recorded revision, or None — covering both 'no alembic_version
    table' (a pre-migrations DB) and 'table present but empty'."""
    try:
        rows = sql(db_path, "SELECT version_num FROM alembic_version")
    except sqlite3.OperationalError:
        return None
    return rows[0][0] if rows else None


def backups(tmp_path):
    return sorted(p.name for p in tmp_path.glob("*.bak"))


APP_TABLES = {"user", "task", "token", "focus_session", "friendships"}


# --------------------------------------------------------------------------- #
# the everyday paths
# --------------------------------------------------------------------------- #
def test_fresh_database_is_built_from_migrations(tmp_path, monkeypatch):
    db = tmp_path / "fresh.db"
    boot(db, monkeypatch)

    assert APP_TABLES <= tables(db)
    assert revision(db) == BASELINE_REVISION
    # Nothing to protect on a brand-new file.
    assert backups(tmp_path) == []


def test_legacy_database_is_adopted_without_losing_data(tmp_path, monkeypatch):
    """A DB from before migrations existed: real tables, no alembic_version."""
    db = tmp_path / "legacy.db"
    boot(db, monkeypatch)
    sql(db, "INSERT INTO user (username, display_name, password_hash) VALUES (?,?,?)",
        "legacy", "Legacy", "x")
    sql(db, "INSERT INTO task (user_id, name, duration, priority, completed, position) "
            "VALUES ((SELECT id FROM user WHERE username='legacy'),?,?,?,0,0)",
        "PRECIOUS TASK", 42, "high")
    sql(db, "DROP TABLE alembic_version")  # <- what a pre-migrations install looks like
    assert revision(db) is None

    boot(db, monkeypatch)

    assert revision(db) == BASELINE_REVISION
    assert sql(db, "SELECT name, duration FROM task WHERE name='PRECIOUS TASK'") == [
        ("PRECIOUS TASK", 42)
    ]
    # Stamping writes to their file, so it must be snapshotted first.
    assert len(backups(tmp_path)) == 1


def test_relaunch_when_up_to_date_does_no_work(tmp_path, monkeypatch):
    db = tmp_path / "managed.db"
    boot(db, monkeypatch)
    before = backups(tmp_path)

    boot(db, monkeypatch)

    # Backing up on every launch would be wasteful and would churn the user's
    # disk for nothing.
    assert backups(tmp_path) == before
    assert revision(db) == BASELINE_REVISION


# --------------------------------------------------------------------------- #
# the edge cases that used to brick the app
# --------------------------------------------------------------------------- #
def test_stamped_but_empty_database_recovers(tmp_path, monkeypatch):
    """Regression: a revision row with no tables (interrupted setup).

    Deciding 'fresh' from table names while upgrade() decides from the revision
    row made these disagree: upgrade() saw 'already at head', created nothing,
    and every later launch hit `no such table: user` — forever.
    """
    db = tmp_path / "stamped.db"
    boot(db, monkeypatch)
    for table in APP_TABLES:
        sql(db, f"DROP TABLE {table}")
    assert revision(db) == BASELINE_REVISION and not (tables(db) & APP_TABLES)

    boot(db, monkeypatch)

    assert APP_TABLES <= tables(db)
    assert revision(db) == BASELINE_REVISION


def test_empty_revision_row_beside_real_tables_is_adopted(tmp_path, monkeypatch):
    """Regression: alembic_version exists but holds no row.

    This isn't 'legacy' by table-name logic (the table is there), so it used to
    fall through to upgrade(), which replayed the baseline onto live tables and
    died with `table user already exists`.
    """
    db = tmp_path / "emptyrev.db"
    boot(db, monkeypatch)
    sql(db, "DELETE FROM alembic_version")
    assert revision(db) is None and APP_TABLES <= tables(db)

    boot(db, monkeypatch)

    assert revision(db) == BASELINE_REVISION
    assert APP_TABLES <= tables(db)


def test_database_from_a_newer_release_is_refused_not_corrupted(tmp_path, monkeypatch):
    """The user downgraded the app. Their data is newer than this build."""
    db = tmp_path / "future.db"
    boot(db, monkeypatch)
    sql(db, "UPDATE alembic_version SET version_num='9999_from_the_future'")

    with pytest.raises(SchemaError, match="newer release"):
        boot(db, monkeypatch)

    # Refusing means leaving it exactly as found.
    assert revision(db) == "9999_from_the_future"
    assert APP_TABLES <= tables(db)


# --------------------------------------------------------------------------- #
# backups
# --------------------------------------------------------------------------- #
def test_backups_are_pruned_to_the_newest_few(tmp_path, monkeypatch):
    db = tmp_path / "pruned.db"
    boot(db, monkeypatch)
    for i in range(MAX_BACKUPS + 3):
        (tmp_path / f"pruned.db.2020010{i}-000000.bak").write_text("old")

    # Force a backup by making the DB look legacy again.
    sql(db, "DROP TABLE alembic_version")
    boot(db, monkeypatch)

    assert len(backups(tmp_path)) == MAX_BACKUPS


def test_pruning_never_touches_files_we_did_not_create(tmp_path, monkeypatch):
    db = tmp_path / "safe.db"
    boot(db, monkeypatch)
    mine = tmp_path / "safe.db.keepme.bak"  # a user's own backup
    mine.write_text("do not delete")
    for i in range(MAX_BACKUPS + 2):
        (tmp_path / f"safe.db.2020010{i}-000000.bak").write_text("old")

    sql(db, "DROP TABLE alembic_version")
    boot(db, monkeypatch)

    assert mine.exists(), "pruning must only consider its own timestamped backups"
