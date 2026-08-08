"""GET /api/sessions/day — what you focused on, for one day.

`FocusSession.task_name` was collected from the beginning and read back by
nothing; these cover the endpoint that finally surfaces it.
"""
import itertools

import pytest

from app import create_app

# Demo seeding has already run and every account is auto-friended with the
# cottage-dwellers, so a fixed username works once and returns "username taken"
# — with no token — for every test after it.
_ACCOUNTS = itertools.count()


@pytest.fixture()
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("TASKNOOK_DB", str(tmp_path / "journal.db"))
    return create_app()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth(client):
    name = f"journal{next(_ACCOUNTS)}"
    res = client.post("/api/auth/register", json={"username": name, "password": "test1234"})
    return {"Authorization": f"Bearer {res.get_json()['token']}"}


def log(client, auth, minutes, task=None):
    body = {"minutes": minutes}
    if task is not None:
        body["taskName"] = task
    return client.post("/api/sessions", json=body, headers=auth)


def today(client, auth):
    """The day the server bucketed those sessions into."""
    days = client.get("/api/sessions/days", headers=auth).get_json()
    return next(iter(days))


def test_empty_day_is_not_an_error(client, auth):
    body = client.get("/api/sessions/day?day=2020-01-01", headers=auth).get_json()
    assert body["entries"] == []
    assert body["total"] == 0


def test_groups_by_task_and_sums_minutes(client, auth):
    log(client, auth, 25, "Thesis")
    log(client, auth, 15, "Thesis")
    log(client, auth, 30, "Email")
    day = today(client, auth)

    body = client.get(f"/api/sessions/day?day={day}", headers=auth).get_json()

    assert body["total"] == 70
    # Longest first — the question is what the day went on.
    assert [e["taskName"] for e in body["entries"]] == ["Thesis", "Email"]
    assert body["entries"][0] == {"taskName": "Thesis", "minutes": 40, "sessions": 2}


def test_untitled_blocks_survive_as_null(client, auth):
    """A block run with no active task is common. It must still be counted, and
    must stay distinguishable from a task literally named "Focus"."""
    log(client, auth, 20)
    day = today(client, auth)

    body = client.get(f"/api/sessions/day?day={day}", headers=auth).get_json()

    assert body["total"] == 20
    assert body["entries"][0]["taskName"] is None


def test_only_the_requested_day(client, auth):
    log(client, auth, 25, "Thesis")
    day = today(client, auth)

    other = client.get("/api/sessions/day?day=1999-01-01", headers=auth).get_json()

    assert other["entries"] == []
    assert client.get(f"/api/sessions/day?day={day}", headers=auth).get_json()["total"] == 25


def test_one_users_focus_is_not_anothers(client, app):
    a = client.post("/api/auth/register", json={"username": f"j{next(_ACCOUNTS)}", "password": "test1234"})
    b = client.post("/api/auth/register", json={"username": f"j{next(_ACCOUNTS)}", "password": "test1234"})
    ah = {"Authorization": f"Bearer {a.get_json()['token']}"}
    bh = {"Authorization": f"Bearer {b.get_json()['token']}"}
    log(client, ah, 40, "Private")
    day = today(client, ah)

    assert client.get(f"/api/sessions/day?day={day}", headers=bh).get_json()["entries"] == []


@pytest.mark.parametrize("bad", ["", "nonsense", "2026-13-40", "not-a-date"])
def test_a_bad_day_is_refused_not_guessed(client, auth, bad):
    assert client.get(f"/api/sessions/day?day={bad}", headers=auth).status_code == 400


def test_missing_day_is_refused(client, auth):
    assert client.get("/api/sessions/day", headers=auth).status_code == 400


def test_requires_auth(client):
    assert client.get("/api/sessions/day?day=2026-01-01").status_code == 401
