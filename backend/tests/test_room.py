"""Room-layout API tests: the decoration a user drags into place must survive
the round trip, and malformed payloads must never reach the database."""
import json

import pytest

from app import create_app


@pytest.fixture()
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("TASKNOOK_DB", str(tmp_path / "room.db"))
    return create_app()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth(client):
    res = client.post(
        "/api/auth/register",
        json={"username": "decorator", "password": "test1234"},
    )
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


LAYOUT = [
    {"id": "p1", "item": "rug", "x": 320, "y": 440},
    {"id": "p2", "item": "monstera", "x": 90, "y": 428},
    {"id": "p3", "item": "desklamp", "x": 566, "y": 296},
]


def test_room_starts_empty(client, auth):
    res = client.get("/api/room", headers=auth)
    assert res.status_code == 200
    assert res.get_json() == {"placements": None, "iso": None}


def test_room_roundtrip(client, auth):
    assert client.put("/api/room", json={"placements": LAYOUT}, headers=auth).status_code == 200
    res = client.get("/api/room", headers=auth)
    assert res.get_json() == {"placements": LAYOUT, "iso": None}

    # Saving again replaces, not appends.
    assert client.put("/api/room", json={"placements": []}, headers=auth).status_code == 200
    assert client.get("/api/room", headers=auth).get_json() == {"placements": [], "iso": None}


def test_room_requires_auth(client):
    assert client.get("/api/room").status_code == 401
    assert client.put("/api/room", json={"placements": []}).status_code == 401


@pytest.mark.parametrize(
    "payload",
    [
        {},  # missing placements
        {"placements": "not a list"},
        {"placements": [{"id": "p1", "item": "rug", "x": "left", "y": 1}],},  # non-numeric
        {"placements": [{"id": "p1", "x": 1, "y": 1}]},  # missing item
        {"placements": [{"id": "", "item": "rug", "x": 1, "y": 1}]},  # empty id
        {"placements": [{"id": "p1", "item": "x" * 40, "x": 1, "y": 1}]},  # oversized key
        {"placements": [{"id": "p1", "item": "rug", "x": 1, "y": 1}] * 81},  # too many
    ],
)
def test_room_rejects_malformed_layouts(client, auth, payload):
    # Establish a known-good layout first…
    client.put("/api/room", json={"placements": LAYOUT}, headers=auth)

    assert client.put("/api/room", json=payload, headers=auth).status_code == 400

    # …and confirm the rejected write didn't clobber it.
    assert client.get("/api/room", headers=auth).get_json() == {"placements": LAYOUT, "iso": None}


def test_room_rejects_non_finite_coordinates(client, auth):
    """NaN/Infinity are floats, and json.dumps writes them as bare NaN/Infinity
    — invalid JSON that a browser's JSON.parse rejects. Storing one would
    corrupt the room permanently, so they must be refused at the door."""
    client.put("/api/room", json={"placements": LAYOUT}, headers=auth)

    for bad in ("NaN", "Infinity", "-Infinity"):
        raw = '{"placements":[{"id":"p1","item":"rug","x":%s,"y":1}]}' % bad
        res = client.put("/api/room", data=raw, content_type="application/json", headers=auth)
        assert res.status_code == 400, f"{bad} was accepted"

    # The good layout is intact, and still parses as strict JSON.
    saved = client.get("/api/room", headers=auth)
    assert saved.get_json() == {"placements": LAYOUT, "iso": None}
    json.loads(saved.get_data(as_text=True))  # would raise if NaN leaked in


def test_room_rejects_booleans_as_coordinates(client, auth):
    """isinstance(True, int) is True in Python — a bool must not pass as a
    coordinate just because it quacks like an int."""
    res = client.put(
        "/api/room",
        json={"placements": [{"id": "p1", "item": "rug", "x": True, "y": 1}]},
        headers=auth,
    )
    assert res.status_code == 400


def test_room_survives_a_non_list_config(app, client, auth):
    """A room_config that is valid JSON but not a list (an older/other shape)
    must read back as 'no layout' rather than handing the client something it
    would choke on."""
    from models import User, db

    with app.app_context():
        user = User.query.filter_by(username="decorator").first()
        user.room_config = '{"unexpected": "shape"}'
        db.session.commit()

    assert client.get("/api/room", headers=auth).get_json() == {"placements": None, "iso": None}


def test_room_strips_unknown_fields(client, auth):
    dirty = [{"id": "p1", "item": "rug", "x": 1, "y": 2, "evil": "<script>"}]
    client.put("/api/room", json={"placements": dirty}, headers=auth)
    saved = client.get("/api/room", headers=auth).get_json()["placements"]
    assert saved == [{"id": "p1", "item": "rug", "x": 1, "y": 2}]


def test_room_roundtrips_a_tint(client, auth):
    layout = [{"id": "p1", "item": "rug", "x": 320, "y": 440, "tint": "#6fb8cf"}]
    assert client.put("/api/room", json={"placements": layout}, headers=auth).status_code == 200
    assert client.get("/api/room", headers=auth).get_json() == {"placements": layout, "iso": None}


@pytest.mark.parametrize(
    "bad_tint",
    ["6fb8cf", "#6fb8c", "#6fb8cfff", "#gggggg", 123, {"r": 1}, "red"],
)
def test_room_rejects_malformed_tints(client, auth, bad_tint):
    layout = [{"id": "p1", "item": "rug", "x": 1, "y": 2, "tint": bad_tint}]
    assert client.put("/api/room", json={"placements": layout}, headers=auth).status_code == 400


# --------------------------------------------------------------------------- #
# isometric layout
# --------------------------------------------------------------------------- #
ISO = {
    "w": 9,
    "d": 7,
    "placements": [
        {"id": "i1", "item": "rug", "gx": 3, "gy": 2.5},
        {"id": "i2", "item": "desk", "gx": 5.5, "gy": 0, "tint": "#6fb8cf"},
    ],
}


def test_iso_layout_roundtrip(client, auth):
    res = client.put("/api/room", json={"placements": LAYOUT, "iso": ISO}, headers=auth)
    assert res.status_code == 200
    assert client.get("/api/room", headers=auth).get_json() == {
        "placements": LAYOUT,
        "iso": ISO,
    }


def test_flat_only_save_keeps_iso_none(client, auth):
    client.put("/api/room", json={"placements": LAYOUT}, headers=auth)
    assert client.get("/api/room", headers=auth).get_json()["iso"] is None


@pytest.mark.parametrize(
    "bad_iso",
    [
        "not a dict",
        {"w": 2, "d": 7, "placements": []},  # below minimum size
        {"w": 9, "d": 17, "placements": []},  # above maximum size
        {"w": True, "d": 7, "placements": []},  # bool masquerading as int
        {"w": 9, "d": 7, "placements": "nope"},
        {"w": 9, "d": 7, "placements": [{"id": "i1", "item": "rug", "gx": "left", "gy": 1}]},
        {"w": 9, "d": 7, "placements": [{"id": "i1", "item": "rug", "gx": 1, "gy": 1, "tint": "red"}]},
    ],
)
def test_iso_rejects_malformed_layouts(client, auth, bad_iso):
    client.put("/api/room", json={"placements": LAYOUT, "iso": ISO}, headers=auth)

    res = client.put("/api/room", json={"placements": LAYOUT, "iso": bad_iso}, headers=auth)
    assert res.status_code == 400

    # the good save is untouched
    assert client.get("/api/room", headers=auth).get_json()["iso"] == ISO


def test_iso_roundtrips_a_rotation(client, auth):
    iso = {
        "w": 9,
        "d": 7,
        "placements": [{"id": "i1", "item": "sofa", "gx": 2, "gy": 3, "rot": 1}],
    }
    assert (
        client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth).status_code
        == 200
    )
    assert client.get("/api/room", headers=auth).get_json()["iso"] == iso

    # rot 0 is the default orientation and stored implicitly (dropped).
    iso0 = {
        "w": 9,
        "d": 7,
        "placements": [{"id": "i1", "item": "sofa", "gx": 2, "gy": 3, "rot": 0}],
    }
    client.put("/api/room", json={"placements": [], "iso": iso0}, headers=auth)
    saved = client.get("/api/room", headers=auth).get_json()["iso"]
    assert "rot" not in saved["placements"][0]


@pytest.mark.parametrize("bad_rot", [2, -1, True, "1", 1.0])
def test_iso_rejects_malformed_rotations(client, auth, bad_rot):
    iso = {
        "w": 9,
        "d": 7,
        "placements": [{"id": "i1", "item": "sofa", "gx": 2, "gy": 3, "rot": bad_rot}],
    }
    res = client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth)
    assert res.status_code == 400


def test_legacy_list_config_still_readable(app, client, auth):
    """Saves from before the iso room existed stored a bare list — GET must
    surface them as the flat layout, not error or hide them."""
    from models import User, db

    with app.app_context():
        user = User.query.filter_by(username="decorator").first()
        user.room_config = json.dumps(LAYOUT)
        db.session.commit()

    assert client.get("/api/room", headers=auth).get_json() == {
        "placements": LAYOUT,
        "iso": None,
    }
