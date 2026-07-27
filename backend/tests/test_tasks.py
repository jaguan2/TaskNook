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
