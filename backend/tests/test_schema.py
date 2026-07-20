"""Schema-lifecycle tests.

These guard the promise that makes shipping a desktop .exe safe: a user's
database survives an upgrade. Every case below maps to a real way an install
can be found in the wild — including two states that previously left the app
permanently unable to boot.
"""
import sqlite3

import pytest

from app import create_app
from schema import BASELINE_REVISION, MAX_BACKUPS, SchemaError, _head_revision


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def boot(db_path, monkeypatch):
    """Start the app against db_path, exactly as a launch would."""
    monkeypatch.setenv("TASKNOOK_DB", str(db_path))
    return create_app()


def head_of(app):
    """The migration head this build upgrades databases to."""
    with app.app_context():
        return _head_revision()


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


def make_pre_migrations(db_path):
    """Rewind a freshly-booted DB into a true pre-migrations install: the
    schema exactly as it stood at the baseline (later columns removed), with
    no alembic_version table at all."""
    sql(db_path, "ALTER TABLE user DROP COLUMN room_config")
    sql(db_path, "DROP TABLE alembic_version")


def backups(tmp_path):
    return sorted(p.name for p in tmp_path.glob("*.bak"))


APP_TABLES = {"user", "task", "token", "focus_session", "friendships"}


# --------------------------------------------------------------------------- #
# the everyday paths
# --------------------------------------------------------------------------- #
def test_fresh_database_is_built_from_migrations(tmp_path, monkeypatch):
    db = tmp_path / "fresh.db"
    app = boot(db, monkeypatch)

    assert APP_TABLES <= tables(db)
    assert revision(db) == head_of(app)
    # Nothing to protect on a brand-new file.
    assert backups(tmp_path) == []


def test_legacy_database_is_adopted_and_upgraded_without_losing_data(tmp_path, monkeypatch):
    """A DB from before migrations existed: baseline-shaped tables, no
    alembic_version. It must be stamped, then carried through every later
    migration, keeping its data."""
    db = tmp_path / "legacy.db"
    boot(db, monkeypatch)
    sql(db, "INSERT INTO user (username, display_name, password_hash) VALUES (?,?,?)",
        "legacy", "Legacy", "x")
    sql(db, "INSERT INTO task (user_id, name, duration, priority, completed, position) "
            "VALUES ((SELECT id FROM user WHERE username='legacy'),?,?,?,0,0)",
        "PRECIOUS TASK", 42, "high")
    make_pre_migrations(db)
    assert revision(db) is None

    app = boot(db, monkeypatch)

    assert revision(db) == head_of(app)
    assert sql(db, "SELECT name, duration FROM task WHERE name='PRECIOUS TASK'") == [
        ("PRECIOUS TASK", 42)
    ]
    # Both writes to their file were snapshotted first: one backup before the
    # baseline stamp, one before applying the post-baseline migrations.
    assert len(backups(tmp_path)) == 2


def test_relaunch_when_up_to_date_does_no_work(tmp_path, monkeypatch):
    db = tmp_path / "managed.db"
    app = boot(db, monkeypatch)
    before = backups(tmp_path)

    boot(db, monkeypatch)

    # Backing up on every launch would be wasteful and would churn the user's
    # disk for nothing.
    assert backups(tmp_path) == before
    assert revision(db) == head_of(app)


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
    app = boot(db, monkeypatch)
    for table in APP_TABLES:
        sql(db, f"DROP TABLE {table}")
    assert revision(db) == head_of(app) and not (tables(db) & APP_TABLES)

    boot(db, monkeypatch)

    assert APP_TABLES <= tables(db)
    assert revision(db) == head_of(app)


def test_unversioned_head_shaped_db_fails_safely(tmp_path, monkeypatch):
    """A DB whose revision row vanished but whose tables are NOT baseline-shaped
    (they already carry later columns). Adopting it as baseline would replay
    those migrations onto themselves — that must surface as a safe, explicit
    error with a backup taken, never a half-migrated database."""
    db = tmp_path / "headless.db"
    boot(db, monkeypatch)
    sql(db, "INSERT INTO user (username, display_name, password_hash) VALUES (?,?,?)",
        "keeper", "Keeper", "x")
    sql(db, "DELETE FROM alembic_version")

    with pytest.raises(SchemaError):
        boot(db, monkeypatch)

    # The failure left the data alone and a pre-change snapshot behind.
    assert sql(db, "SELECT username FROM user WHERE username='keeper'") == [("keeper",)]
    assert len(backups(tmp_path)) >= 1


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

    # Force backups by rewinding to a pre-migrations shape again.
    make_pre_migrations(db)
    boot(db, monkeypatch)

    assert len(backups(tmp_path)) == MAX_BACKUPS


def test_pruning_never_touches_files_we_did_not_create(tmp_path, monkeypatch):
    db = tmp_path / "safe.db"
    boot(db, monkeypatch)
    mine = tmp_path / "safe.db.keepme.bak"  # a user's own backup
    mine.write_text("do not delete")
    for i in range(MAX_BACKUPS + 2):
        (tmp_path / f"safe.db.2020010{i}-000000.bak").write_text("old")

    make_pre_migrations(db)
    boot(db, monkeypatch)

    assert mine.exists(), "pruning must only consider its own timestamped backups"


def test_baseline_revision_still_exists_in_history():
    """The legacy-adoption stamp targets this revision by name; renaming or
    squashing it away would strand every pre-migrations install."""
    import os

    versions = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "migrations", "versions")
    joined = " ".join(os.listdir(versions))
    assert BASELINE_REVISION in joined
