"""API behaviour the app actually depends on, but nothing covered until now:
auth, the two different time windows in /api/stats, session logging, batch
reorder, the symmetric friend graph, and the error/404 contract that api.js
parses.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app import MAX_TOKENS_PER_USER, create_app
from models import FocusSession, Task, Token, User, db


@pytest.fixture()
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("TASKNOOK_DB", str(tmp_path / "api.db"))
    return create_app()


@pytest.fixture()
def client(app):
    return app.test_client()


def register(client, username="tester", password="test1234"):
    res = client.post(
        "/api/auth/register", json={"username": username, "password": password}
    )
    return res.get_json()["token"]


@pytest.fixture()
def auth(client):
    return {"Authorization": f"Bearer {register(client)}"}


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
def test_register_then_login_returns_the_same_user(client):
    created = client.post(
        "/api/auth/register", json={"username": "Luna2", "password": "test1234"}
    ).get_json()
    # Usernames are lowercased on the way in, so the same person can't be
    # created twice with different capitalisation.
    assert created["user"]["username"] == "luna2"

    logged_in = client.post(
        "/api/auth/login", json={"username": "LUNA2", "password": "test1234"}
    )
    assert logged_in.status_code == 200
    assert logged_in.get_json()["user"]["id"] == created["user"]["id"]


def test_duplicate_username_is_refused(client):
    register(client, "twice")
    res = client.post(
        "/api/auth/register", json={"username": "twice", "password": "test1234"}
    )
    assert res.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"username": "x"},
        {"username": "x", "password": "abc"},  # under the 4-char floor
        {"username": "", "password": "test1234"},
        # Non-string values used to reach .strip()/slicing and 500.
        {"username": 12, "password": ["nope"]},
    ],
)
def test_register_rejects_bad_credentials_without_crashing(client, payload):
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_wrong_password_is_401_and_says_nothing_useful(client):
    register(client, "gatekeeper")
    res = client.post(
        "/api/auth/login", json={"username": "gatekeeper", "password": "wrong"}
    )
    assert res.status_code == 401
    # Same message whether the user exists or not — no account enumeration.
    assert res.get_json()["error"] == "Invalid username or password"


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer nope"}, {"Authorization": "Basic whatever"}],
)
def test_protected_routes_require_a_real_token(client, headers):
    assert client.get("/api/tasks", headers=headers).status_code == 401


def test_logout_invalidates_only_that_token(client):
    first = register(client, "leaver")
    second = client.post(
        "/api/auth/login", json={"username": "leaver", "password": "test1234"}
    ).get_json()["token"]

    client.post("/api/auth/logout", headers={"Authorization": f"Bearer {first}"})

    assert client.get("/api/tasks", headers={"Authorization": f"Bearer {first}"}).status_code == 401
    assert client.get("/api/tasks", headers={"Authorization": f"Bearer {second}"}).status_code == 200


def test_tokens_do_not_pile_up_forever(app, client):
    """Regression: every login added a Token row and nothing ever removed one.

    The desktop app's persistence check is "the table doesn't grow across a
    close+relaunch", which only means something if something prunes."""
    register(client, "returner")
    for _ in range(MAX_TOKENS_PER_USER + 4):
        client.post("/api/auth/login", json={"username": "returner", "password": "test1234"})

    with app.app_context():
        user = User.query.filter_by(username="returner").first()
        assert Token.query.filter_by(user_id=user.id).count() == MAX_TOKENS_PER_USER


def test_pruning_keeps_the_newest_token_usable(client):
    register(client, "keeper")
    newest = None
    for _ in range(MAX_TOKENS_PER_USER + 2):
        newest = client.post(
            "/api/auth/login", json={"username": "keeper", "password": "test1234"}
        ).get_json()["token"]
    assert client.get("/api/tasks", headers={"Authorization": f"Bearer {newest}"}).status_code == 200


# --------------------------------------------------------------------------- #
# Stats — two different time windows in one payload
# --------------------------------------------------------------------------- #
def test_task_counts_are_list_wide_and_today_is_separate(app, client, auth):
    """Regression: tasksTotal/tasksDone count the whole list, but the panel
    labelled them "Today's completion" — so a task finished a year ago read as
    today's progress. `tasksDoneToday` is the genuinely day-bucketed one."""
    old = client.post("/api/tasks", json={"name": "ancient history"}, headers=auth).get_json()
    fresh = client.post("/api/tasks", json={"name": "done just now"}, headers=auth).get_json()
    client.put(f"/api/tasks/{old['id']}", json={"completed": True}, headers=auth)
    client.put(f"/api/tasks/{fresh['id']}", json={"completed": True}, headers=auth)

    # Backdate one completion well past any timezone's idea of "today".
    with app.app_context():
        task = db.session.get(Task, old["id"])
        task.completed_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=400)
        db.session.commit()

    stats = client.get("/api/stats", headers=auth).get_json()
    assert stats["tasksTotal"] == 2
    assert stats["tasksDone"] == 2       # list-wide: both are ticked off
    assert stats["tasksDoneToday"] == 1  # today: only the fresh one
    assert stats["completion"] == 100


def test_stats_are_zero_for_an_empty_account(client, auth):
    stats = client.get("/api/stats", headers=auth).get_json()
    assert stats == {
        "tasksTotal": 0,
        "tasksDone": 0,
        "tasksDoneToday": 0,
        "completion": 0,
        "focusMinutesToday": 0,
    }


def test_uncompleting_a_task_clears_it_from_today(client, auth):
    task = client.post("/api/tasks", json={"name": "oops"}, headers=auth).get_json()
    client.put(f"/api/tasks/{task['id']}", json={"completed": True}, headers=auth)
    assert client.get("/api/stats", headers=auth).get_json()["tasksDoneToday"] == 1

    client.put(f"/api/tasks/{task['id']}", json={"completed": False}, headers=auth)
    assert client.get("/api/stats", headers=auth).get_json()["tasksDoneToday"] == 0


def test_one_user_never_sees_another_users_tasks(client):
    mine = {"Authorization": f"Bearer {register(client, 'mine')}"}
    theirs = {"Authorization": f"Bearer {register(client, 'theirs')}"}
    task = client.post("/api/tasks", json={"name": "private"}, headers=mine).get_json()

    assert client.get("/api/tasks", headers=theirs).get_json() == []
    assert client.put(f"/api/tasks/{task['id']}", json={"name": "hijacked"}, headers=theirs).status_code == 404
    assert client.delete(f"/api/tasks/{task['id']}", headers=theirs).status_code == 404
    assert client.get("/api/stats", headers=theirs).get_json()["tasksTotal"] == 0


# --------------------------------------------------------------------------- #
# Focus sessions
# --------------------------------------------------------------------------- #
def test_logging_a_session_shows_up_in_stats_and_days(client, auth):
    res = client.post("/api/sessions", json={"minutes": 25, "taskName": "Deep work"}, headers=auth)
    assert res.status_code == 201

    assert client.get("/api/stats", headers=auth).get_json()["focusMinutesToday"] == 25
    days = client.get("/api/sessions/days", headers=auth).get_json()
    assert sum(days.values()) == 25


def test_sessions_accumulate_within_a_day(client, auth):
    for minutes in (25, 15, 45):
        client.post("/api/sessions", json={"minutes": minutes}, headers=auth)
    assert client.get("/api/stats", headers=auth).get_json()["focusMinutesToday"] == 85


@pytest.mark.parametrize("minutes", [0, -5])
def test_empty_sessions_are_refused(app, client, auth, minutes):
    """Regression: a zero-minute session created a row, so /sessions/days
    answered {"<today>": 0} — and the calendar tints a day "active" from the
    key merely existing."""
    res = client.post("/api/sessions", json={"minutes": minutes}, headers=auth)
    assert res.status_code == 400
    assert client.get("/api/sessions/days", headers=auth).get_json() == {}
    with app.app_context():
        # Scoped to this user: the seeded demo cottage-dwellers have sessions
        # of their own, and they are not what this asserts.
        me = User.query.filter_by(username="tester").first()
        assert FocusSession.query.filter_by(user_id=me.id).count() == 0


def test_absurd_session_lengths_are_capped_not_rejected(client, auth):
    client.post("/api/sessions", json={"minutes": 10**9}, headers=auth)
    assert client.get("/api/stats", headers=auth).get_json()["focusMinutesToday"] == 24 * 60


def test_non_numeric_session_minutes_are_a_400(client, auth):
    assert client.post("/api/sessions", json={"minutes": "lots"}, headers=auth).status_code == 400


# --------------------------------------------------------------------------- #
# Reorder
# --------------------------------------------------------------------------- #
def names_in_order(client, auth):
    return [t["name"] for t in client.get("/api/tasks", headers=auth).get_json()]


def test_reorder_persists_the_new_order(client, auth):
    ids = [
        client.post("/api/tasks", json={"name": n}, headers=auth).get_json()["id"]
        for n in ("a", "b", "c")
    ]
    res = client.put("/api/tasks/reorder", json={"order": [ids[2], ids[0], ids[1]]}, headers=auth)
    assert res.status_code == 200
    assert names_in_order(client, auth) == ["c", "a", "b"]


def test_reorder_ignores_ids_that_are_not_yours(client, auth):
    mine = [
        client.post("/api/tasks", json={"name": n}, headers=auth).get_json()["id"]
        for n in ("a", "b")
    ]
    stranger = {"Authorization": f"Bearer {register(client, 'stranger')}"}
    theirs = client.post("/api/tasks", json={"name": "z"}, headers=stranger).get_json()

    client.put("/api/tasks/reorder", json={"order": [theirs["id"], mine[1], mine[0]]}, headers=auth)

    assert names_in_order(client, auth) == ["b", "a"]
    assert names_in_order(client, stranger) == ["z"]


@pytest.mark.parametrize("order", ["nope", 5, {"a": 1}])
def test_reorder_rejects_a_non_list(client, auth, order):
    assert client.put("/api/tasks/reorder", json={"order": order}, headers=auth).status_code == 400


def test_reorder_survives_junk_entries(client, auth):
    task = client.post("/api/tasks", json={"name": "solo"}, headers=auth).get_json()
    res = client.put(
        "/api/tasks/reorder",
        json={"order": [None, "x", True, 9999, task["id"]]},
        headers=auth,
    )
    assert res.status_code == 200
    assert names_in_order(client, auth) == ["solo"]


# --------------------------------------------------------------------------- #
# Friends — the graph is two directed rows, on purpose
# --------------------------------------------------------------------------- #
def test_friendship_is_symmetric_in_both_directions(client):
    a = {"Authorization": f"Bearer {register(client, 'ada')}"}
    b_token = register(client, "bo")
    b = {"Authorization": f"Bearer {b_token}"}

    assert client.post("/api/friends", json={"username": "bo"}, headers=a).status_code == 201

    # CLAUDE.md calls this out as deliberate: A→B and B→A are stored as two
    # rows, and both sides must see the friendship.
    assert "bo" in [f["username"] for f in client.get("/api/friends", headers=a).get_json()]
    assert "ada" in [f["username"] for f in client.get("/api/friends", headers=b).get_json()]


def test_removing_a_friend_removes_both_directions(client):
    a = {"Authorization": f"Bearer {register(client, 'ada')}"}
    b = {"Authorization": f"Bearer {register(client, 'bo')}"}
    client.post("/api/friends", json={"username": "bo"}, headers=a)
    bo_id = [f for f in client.get("/api/friends", headers=a).get_json() if f["username"] == "bo"][0]["id"]

    client.delete(f"/api/friends/{bo_id}", headers=a)

    # A half-removed friendship leaves one side with a ghost.
    assert "bo" not in [f["username"] for f in client.get("/api/friends", headers=a).get_json()]
    assert "ada" not in [f["username"] for f in client.get("/api/friends", headers=b).get_json()]


def test_friends_carry_their_stats(client):
    a = {"Authorization": f"Bearer {register(client, 'ada')}"}
    b = {"Authorization": f"Bearer {register(client, 'bo')}"}
    client.post("/api/sessions", json={"minutes": 40}, headers=b)
    client.post("/api/friends", json={"username": "bo"}, headers=a)

    bo = [f for f in client.get("/api/friends", headers=a).get_json() if f["username"] == "bo"][0]
    assert bo["focusMinutesToday"] == 40
    assert "tasksDoneToday" in bo


def test_cannot_befriend_yourself_or_a_stranger(client):
    a = {"Authorization": f"Bearer {register(client, 'ada')}"}
    assert client.post("/api/friends", json={"username": "ada"}, headers=a).status_code == 400
    assert client.post("/api/friends", json={"username": "nobody"}, headers=a).status_code == 404


def test_befriending_twice_is_a_conflict_not_a_duplicate(client):
    a = {"Authorization": f"Bearer {register(client, 'ada')}"}
    register(client, "bo")
    client.post("/api/friends", json={"username": "bo"}, headers=a)

    assert client.post("/api/friends", json={"username": "bo"}, headers=a).status_code == 409
    # Count bo specifically — new accounts are auto-friended with the seeded
    # demo users, so the total is never 1.
    friends = client.get("/api/friends", headers=a).get_json()
    assert [f["username"] for f in friends].count("bo") == 1


# --------------------------------------------------------------------------- #
# The error contract api.js relies on
# --------------------------------------------------------------------------- #
def test_unknown_api_paths_are_json_404s_not_the_spa(client):
    """The catch-all serves index.html; without the /api guard a typo'd
    endpoint returned HTML with a 200 and api.js handed a string to a caller
    expecting an array."""
    res = client.get("/api/there-is-no-such-thing")
    assert res.status_code == 404
    assert res.get_json()["error"]


def test_malformed_json_does_not_500(client, auth):
    res = client.post(
        "/api/tasks", data="{not json", content_type="application/json", headers=auth
    )
    assert res.status_code == 400
    assert "error" in res.get_json()


@pytest.mark.parametrize("body", ["[1,2,3]", '"hello"', "5", "null"])
def test_well_formed_but_non_object_bodies_do_not_500(client, auth, body):
    """`get_json(silent=True)` only guards MALFORMED json — a valid non-object
    is truthy and used to reach .get() and blow up."""
    res = client.post("/api/tasks", data=body, content_type="application/json", headers=auth)
    assert res.status_code == 400


def test_unhandled_errors_come_back_as_json(app):
    # The route has to be registered before the app serves anything (Flask
    # locks its routing table on the first request), so this test can't use
    # the `client`/`auth` fixtures — they've already made one.
    @app.get("/api/boom")
    def boom():
        raise RuntimeError("kaboom")

    res = app.test_client().get("/api/boom")
    assert res.status_code == 500
    assert res.get_json()["error"]
    assert "kaboom" not in res.get_data(as_text=True)  # no internals leaked


def test_health_needs_no_auth(client):
    assert client.get("/api/health").get_json()["status"] == "ok"


# --------------------------------------------------------------------------- #
# magnitude, not just type: the gap in the "junk never 500s" contract
# --------------------------------------------------------------------------- #
_BIGINT_ACCOUNTS = iter(range(1, 999))


def _huge_client():
    """A client on its own account.

    These tests share one database, so a fixed username registers for the first
    test and then returns "username taken" — with no token — for every one after
    it, failing as a KeyError far from the cause while each test passes alone.
    """
    app = create_app()
    client = app.test_client()
    token = client.post(
        "/api/auth/register",
        json={"username": f"bigint{next(_BIGINT_ACCOUNTS)}", "password": "test1234"},
    ).get_json()["token"]
    return client, {"Authorization": f"Bearer {token}"}


HUGE = 2**70  # past signed 64-bit, so SQLite raises OverflowError at bind time


def test_huge_integers_never_500():
    """Every existing junk test uses a wrong TYPE or a small value.

    `int()` accepts a Python int of any size and the failure happens later, at the
    SQLite bind, as an OverflowError — which no `except (TypeError, ValueError)`
    catches. That produced a bare 500 on four separate endpoints.
    """
    client, headers = _huge_client()
    created = client.post("/api/tasks", json={"name": "t", "duration": HUGE}, headers=headers)
    assert created.status_code == 201
    # Clamped rather than rejected: a huge number has a clear intent, and the
    # ceiling is the same one a single logged session gets.
    assert created.get_json()["duration"] == 24 * 60
    tid = created.get_json()["id"]

    assert client.put(f"/api/tasks/{tid}", json={"duration": HUGE}, headers=headers).status_code == 200
    assert client.put(f"/api/tasks/{tid}", json={"position": HUGE}, headers=headers).status_code == 200
    # The fourth site, which had no coverage at all.
    reorder = client.put("/api/tasks/reorder", json={"order": [HUGE, tid]}, headers=headers)
    assert reorder.status_code == 200
    assert client.post("/api/sessions", json={"minutes": HUGE}, headers=headers).status_code == 201


def test_huge_negative_and_float_infinities_never_500():
    client, headers = _huge_client()
    for bad in [-HUGE, float("inf"), float("-inf"), float("nan"), 1e30]:
        res = client.post("/api/tasks", json={"name": "t", "duration": bad}, headers=headers)
        assert res.status_code == 201, f"{bad!r} broke create"
        assert 1 <= res.get_json()["duration"] <= 24 * 60


def test_booleans_are_not_accepted_as_numbers():
    """`isinstance(True, int)` is True in Python, so a naive check stores 1."""
    client, headers = _huge_client()
    body = client.post("/api/tasks", json={"name": "t", "duration": True}, headers=headers).get_json()
    assert body["duration"] == 25, "a bool was taken as a duration of 1"


def test_a_reasonable_duration_still_survives_untouched():
    client, headers = _huge_client()
    body = client.post("/api/tasks", json={"name": "t", "duration": 90}, headers=headers).get_json()
    assert body["duration"] == 90


def test_string_fields_are_clamped_to_their_column_widths():
    """Register used to allow 80 characters into String(40)/String(60), and
    save_profile clamped the same column to 60 — two writers, two answers."""
    from models import DISPLAY_NAME_MAX, USERNAME_MAX

    app = create_app()
    client = app.test_client()
    body = client.post(
        "/api/auth/register",
        json={"username": "u" * 90, "password": "test1234", "displayName": "d" * 90},
    ).get_json()
    assert len(body["user"]["username"]) <= USERNAME_MAX
    assert len(body["user"]["displayName"]) <= DISPLAY_NAME_MAX


def test_grouped_friend_stats_agree_with_the_per_user_version():
    """`build_stats_for` replaced four queries PER FRIEND with two grouped ones.

    The risk in that rewrite is a conditional aggregate that quietly disagrees with
    the original — especially around the two different time windows (list-wide
    counts vs the local day). So compare them directly, on users with real data:
    the seeded demo friends own tasks and sessions.
    """
    from app import build_stats, build_stats_for

    app = create_app()
    with app.app_context():
        users = User.query.limit(6).all()
        assert users, "no users to compare"
        grouped = build_stats_for(u.id for u in users)
        for u in users:
            assert grouped[u.id] == build_stats(u), f"disagreement for {u.username}"


def test_grouped_friend_stats_handles_a_user_with_nothing():
    from app import build_stats, build_stats_for

    app = create_app()
    client = app.test_client()
    client.post("/api/auth/register", json={"username": "emptyfriend", "password": "test1234"})
    with app.app_context():
        fresh = User.query.filter_by(username="emptyfriend").first()
        grouped = build_stats_for([fresh.id])
        # A user with no tasks has no row in the grouped result, so the zero-fill
        # is the part that has to be right — a KeyError here would 500 the panel.
        assert grouped[fresh.id] == build_stats(fresh)
        assert grouped[fresh.id]["completion"] == 0


def test_grouped_friend_stats_with_no_ids_is_empty():
    from app import build_stats_for

    app = create_app()
    with app.app_context():
        assert build_stats_for([]) == {}
