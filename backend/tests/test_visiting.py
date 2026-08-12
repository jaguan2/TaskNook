"""The visiting contract: the door column, the friend-room endpoint, and the
seeded bots' varied doors.

Enforcement of invite/private is deliberately CLIENT-side theater today (see
the endpoint's doc-comment) — what this file pins is the real infrastructure:
the whitelist, the friend gate, and the data a visit needs coming back in one
call.
"""
import re
from pathlib import Path

import pytest

from app import VISIT_ACCESS_LEVELS, create_app


@pytest.fixture()
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("TASKNOOK_DB", str(tmp_path / "visiting.db"))
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


def friends_by_name(client, auth):
    return {f["username"]: f for f in client.get("/api/friends", headers=auth).get_json()}


def test_seeded_bots_cover_every_door_state(client, auth):
    # One of each, so every visit flow in the UI exists on day one.
    doors = {name: f["visitAccess"] for name, f in friends_by_name(client, auth).items()}
    assert doors == {"luna": "public", "kai": "friends", "sora": "invite", "mochi": "private"}


def test_friend_room_returns_everything_a_visit_needs(client, auth):
    luna = friends_by_name(client, auth)["luna"]
    res = client.get(f"/api/friends/{luna['id']}/room", headers=auth)
    assert res.status_code == 200
    data = res.get_json()
    assert data["username"] == "luna"
    assert data["displayName"] == "Luna"
    assert data["visitAccess"] == "public"
    # The bots ship with no stored room or character — the frontend derives
    # both (preset home + deterministic look), so null is the contract here.
    assert data["room"] is None
    assert data["character"] is None


def test_friend_room_serves_a_stored_iso_layout(client, auth):
    # Round-trip a real room through the normal save path, then read it back
    # through the OTHER user's visiting endpoint.
    iso = {
        "w": 9,
        "d": 7,
        "env": "cafe",
        "placements": [{"id": "t1", "item": "cafetable", "gx": 2, "gy": 3}],
    }
    assert (
        client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth).status_code
        == 200
    )
    me = client.get("/api/auth/me", headers=auth).get_json()["user"]

    other_auth = {"Authorization": f"Bearer {register(client, username='visitor')}"}
    # Not friends yet → invisible.
    assert client.get(f"/api/friends/{me['id']}/room", headers=other_auth).status_code == 404
    assert client.post("/api/friends", json={"username": "tester"}, headers=other_auth).status_code in (200, 201)
    data = client.get(f"/api/friends/{me['id']}/room", headers=other_auth).get_json()
    assert data["room"]["env"] == "cafe"
    assert data["room"]["placements"][0]["item"] == "cafetable"


def test_friend_room_is_friend_gated(client, auth):
    # A second real account shares the bots as friends but is NOT friends
    # with the first — its id must 404, same as a nonsense id.
    stranger = client.post(
        "/api/auth/register", json={"username": "stranger", "password": "test1234"}
    ).get_json()["user"]
    assert client.get(f"/api/friends/{stranger['id']}/room", headers=auth).status_code == 404
    assert client.get("/api/friends/999999/room", headers=auth).status_code == 404


def frontend_visit_access():
    """The door keys the SPA ships, read out of lib/visiting.js.

    The same drift guard test_room.py runs for ISO_ENVS, for the same
    reason: the list lives in two languages with no shared definition, and
    ISO_ENVS drifted exactly once before that guard existed."""
    src = (
        Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "visiting.js"
    ).read_text(encoding="utf-8")
    block = re.search(r"export const VISIT_ACCESS = \[(.*?)\];", src, re.S)
    assert block, "couldn't find VISIT_ACCESS in visiting.js"
    keys = re.findall(r"key:\s*\"([a-z]+)\"", block.group(1))
    assert len(keys) >= 2, "suspiciously few door states parsed"
    return keys


def test_backend_whitelist_matches_the_frontend_door_vocabulary():
    assert tuple(frontend_visit_access()) == VISIT_ACCESS_LEVELS


def test_visit_access_is_settable_and_whitelisted(client, auth):
    assert (
        client.put("/api/visit-access", json={"value": "invite"}, headers=auth).status_code
        == 200
    )
    me = client.get("/api/auth/me", headers=auth).get_json()["user"]
    assert me["visitAccess"] == "invite"
    for junk in ("castle", "", None, 7):
        res = client.put("/api/visit-access", json={"value": junk}, headers=auth)
        assert res.status_code == 400, f"accepted {junk!r}"
