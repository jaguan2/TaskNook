"""Task API tests for groups and daily routines: a group name must survive the
round trip, and a routine completed yesterday must come back not-done today."""
import pathlib
import re
from datetime import timedelta

import pytest

from app import create_app
from models import db, Task, utcnow


@pytest.fixture()
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("TASKNOOK_DB", str(tmp_path / "tasks.db"))
    return create_app()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth(client):
    res = client.post(
        "/api/auth/register",
        json={"username": "grouper", "password": "test1234"},
    )
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_with_group_and_routine(client, auth):
    res = client.post(
        "/api/tasks",
        json={"name": "water the plants", "group": "  Morning  ", "routine": True},
        headers=auth,
    )
    assert res.status_code == 201
    task = res.get_json()
    assert task["group"] == "Morning"
    assert task["routine"] is True

    listed = client.get("/api/tasks", headers=auth).get_json()
    assert listed[0]["group"] == "Morning"
    assert listed[0]["routine"] is True


def test_defaults_are_ungrouped_one_off(client, auth):
    res = client.post("/api/tasks", json={"name": "plain"}, headers=auth)
    task = res.get_json()
    assert task["group"] is None
    assert task["routine"] is False


def test_update_group_and_clear(client, auth):
    task_id = client.post("/api/tasks", json={"name": "t"}, headers=auth).get_json()["id"]

    res = client.put(f"/api/tasks/{task_id}", json={"group": "Evening"}, headers=auth)
    assert res.get_json()["group"] == "Evening"

    # Empty string / null both clear the group.
    res = client.put(f"/api/tasks/{task_id}", json={"group": ""}, headers=auth)
    assert res.get_json()["group"] is None
    res = client.put(f"/api/tasks/{task_id}", json={"group": None}, headers=auth)
    assert res.get_json()["group"] is None


def test_group_name_is_capped(client, auth):
    res = client.post(
        "/api/tasks", json={"name": "t", "group": "x" * 200}, headers=auth
    )
    assert len(res.get_json()["group"]) == 60


def test_non_string_group_does_not_crash(client, auth):
    """A numeric/other-typed group must coerce, not 500 on .strip()."""
    res = client.post("/api/tasks", json={"name": "t", "group": 42}, headers=auth)
    assert res.status_code == 201
    assert res.get_json()["group"] == "42"


def test_routine_resets_after_a_day(app, client, auth):
    task_id = client.post(
        "/api/tasks", json={"name": "stretch", "routine": True}, headers=auth
    ).get_json()["id"]
    assert (
        client.put(f"/api/tasks/{task_id}", json={"completed": True}, headers=auth)
        .get_json()["completed"]
        is True
    )

    # Completed today: stays done on re-read.
    assert client.get("/api/tasks", headers=auth).get_json()[0]["completed"] is True

    # Backdate the completion to yesterday: the next read resets it.
    with app.app_context():
        task = db.session.get(Task, task_id)
        task.completed_at = utcnow() - timedelta(days=1)
        db.session.commit()
    listed = client.get("/api/tasks", headers=auth).get_json()
    assert listed[0]["completed"] is False
    assert listed[0]["completedAt"] is None


def test_non_routine_never_resets(app, client, auth):
    task_id = client.post("/api/tasks", json={"name": "one-off"}, headers=auth).get_json()[
        "id"
    ]
    client.put(f"/api/tasks/{task_id}", json={"completed": True}, headers=auth)
    with app.app_context():
        task = db.session.get(Task, task_id)
        task.completed_at = utcnow() - timedelta(days=3)
        db.session.commit()
    assert client.get("/api/tasks", headers=auth).get_json()[0]["completed"] is True


ALGORITHMS_JS = (
    pathlib.Path(__file__).resolve().parents[2]
    / "frontend"
    / "src"
    / "lib"
    / "algorithms.js"
)


@pytest.mark.skipif(not ALGORITHMS_JS.exists(), reason="frontend sources not present")
def test_backend_keeps_every_priority_the_frontend_can_produce():
    """Same drift guard as room environments, for the enum that fails QUIETLY.

    An unrecognised priority isn't rejected — create_task coerces it to
    "medium" — so a fourth level added frontend-side would save, come back
    downgraded, and sort wrong, with nothing anywhere to notice. `env` at
    least toasted when it broke.
    """
    js = ALGORITHMS_JS.read_text(encoding="utf-8")
    match = re.search(r"const PRIORITY_WEIGHT = \{(.*?)\}", js, re.S)
    assert match, f"couldn't find PRIORITY_WEIGHT in {ALGORITHMS_JS} — has it moved?"
    levels = re.findall(r"(\w+):\s*\d+", match.group(1))
    assert levels, "found PRIORITY_WEIGHT but parsed no levels out of it"

    app = create_app()
    client = app.test_client()
    token = client.post(
        "/api/auth/register", json={"username": "sorter", "password": "test1234"}
    ).get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    for level in levels:
        res = client.post(
            "/api/tasks", json={"name": f"a {level} task", "priority": level}, headers=headers
        )
        assert res.status_code == 201
        assert res.get_json()["priority"] == level, f"backend downgraded {level!r}"


# --------------------------------------------------------------------------- #
# notes and due dates
# --------------------------------------------------------------------------- #
_ACCOUNTS = iter(range(1, 999))


def _client():
    """A fresh client on its OWN account.

    The username has to be unique per call: these tests share one database (demo
    seeding has already run against it), so a fixed name registers fine for the
    first test and then returns "username taken" — with no token in the body — for
    every test after it. That failed as a KeyError far from the cause, and each
    test passed in isolation.
    """
    app = create_app()
    client = app.test_client()
    token = client.post(
        "/api/auth/register",
        json={"username": f"notetaker{next(_ACCOUNTS)}", "password": "test1234"},
    ).get_json()["token"]
    return client, {"Authorization": f"Bearer {token}"}


def test_notes_and_due_date_round_trip():
    client, headers = _client()
    res = client.post(
        "/api/tasks",
        json={"name": "call the bank", "notes": "about the standing order", "dueDate": "2026-09-01"},
        headers=headers,
    )
    assert res.status_code == 201
    body = res.get_json()
    assert body["notes"] == "about the standing order"
    assert body["dueDate"] == "2026-09-01"

    # And they survive a re-read, not just the create response.
    listed = client.get("/api/tasks", headers=headers).get_json()
    mine = next(t for t in listed if t["id"] == body["id"])
    assert mine["notes"] == "about the standing order"
    assert mine["dueDate"] == "2026-09-01"


def test_notes_and_due_date_default_to_empty():
    client, headers = _client()
    body = client.post("/api/tasks", json={"name": "bare"}, headers=headers).get_json()
    assert body["notes"] is None
    assert body["dueDate"] is None


def test_notes_can_be_edited_and_cleared():
    client, headers = _client()
    tid = client.post("/api/tasks", json={"name": "t", "notes": "first"}, headers=headers).get_json()["id"]

    edited = client.put(f"/api/tasks/{tid}", json={"notes": "second"}, headers=headers).get_json()
    assert edited["notes"] == "second"

    # An empty string CLEARS it, so the field behaves the way the textarea does —
    # deleting the text has to mean "no note", not "keep the old one".
    cleared = client.put(f"/api/tasks/{tid}", json={"notes": ""}, headers=headers).get_json()
    assert cleared["notes"] is None


def test_a_due_date_that_is_not_a_date_is_dropped_not_stored():
    # The old scheduledDate handling took a bare `value[:10]`, so any ten-character
    # string sat in a date column and then failed to compare against anything.
    client, headers = _client()
    for junk in ["not-a-date", "2026-13-45", "tomorrow!!", "", "2026/09/01"]:
        body = client.post(
            "/api/tasks", json={"name": "j", "dueDate": junk}, headers=headers
        ).get_json()
        assert body["dueDate"] is None, f"{junk!r} was stored as a date"


def test_a_longer_iso_timestamp_is_narrowed_to_its_date():
    # Clients that send a full ISO timestamp should still land on the right day
    # rather than being rejected outright.
    client, headers = _client()
    body = client.post(
        "/api/tasks", json={"name": "t", "dueDate": "2026-09-01T13:45:00Z"}, headers=headers
    ).get_json()
    assert body["dueDate"] == "2026-09-01"


def test_junk_types_in_the_new_fields_never_500():
    # Same contract the rest of the API is held to.
    client, headers = _client()
    for bad in [123, [], {}, True, None]:
        res = client.post("/api/tasks", json={"name": "t", "notes": bad, "dueDate": bad}, headers=headers)
        assert res.status_code == 201, f"{bad!r} broke create"
        assert res.get_json()["dueDate"] is None


def test_scheduled_date_now_gets_the_same_validation():
    # It shares the cleaner, so the fix applies to both fields at once.
    client, headers = _client()
    body = client.post(
        "/api/tasks", json={"name": "t", "scheduledDate": "garbage__"}, headers=headers
    ).get_json()
    assert body["scheduledDate"] is None
