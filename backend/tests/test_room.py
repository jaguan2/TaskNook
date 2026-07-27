"""Room-layout API tests: the decoration a user drags into place must survive
the round trip, and malformed payloads must never reach the database."""
import json
import pathlib
import re

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
        {"w": 9, "d": 65, "placements": []},  # above maximum size
        {"w": 9, "d": 7, "placements": [], "cuts": "corner"},  # cuts not a list
        {"w": 9, "d": 7, "placements": [], "cuts": [{"corner": "top", "cw": 2, "cd": 2}]},
        {"w": 9, "d": 7, "placements": [], "cuts": [{"corner": "back", "cw": 0, "cd": 2}]},
        {"w": 9, "d": 7, "placements": [], "cuts": [{"corner": "back", "cw": True, "cd": 2}]},
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


def test_iso_roundtrips_an_environment(client, auth):
    iso = {"w": 11, "d": 9, "env": "garden", "placements": []}
    assert (
        client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth).status_code
        == 200
    )
    assert client.get("/api/room", headers=auth).get_json()["iso"] == iso

    bad = {"w": 11, "d": 9, "env": "space", "placements": []}
    assert (
        client.put("/api/room", json={"placements": [], "iso": bad}, headers=auth).status_code
        == 400
    )


def frontend_environments():
    """The environment keys the SPA actually ships, read out of its source.

    The list lives in two languages with no shared definition, and hardcoding
    it here a second time would drift exactly the way the backend's own copy
    did. Parsing is deliberately strict: a source change this can't read is an
    error, not a silently-passing test.
    """
    js = ISO_ROOM_JS.read_text(encoding="utf-8")
    block = re.search(r"export const ISO_ENVS = \{(.*?)\n\};", js, re.S)
    assert block, f"couldn't find ISO_ENVS in {ISO_ROOM_JS} — has it moved?"
    keys = re.findall(r"^  (\w+): \{$", block.group(1), re.M)
    assert keys, "found ISO_ENVS but parsed no keys out of it"
    return keys


ISO_ROOM_JS = (
    pathlib.Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "isoRoom.js"
)


@pytest.mark.skipif(not ISO_ROOM_JS.exists(), reason="frontend sources not present")
def test_backend_accepts_every_environment_the_frontend_ships(client, auth):
    """The drift guard.

    `cafe`, `library` and `terrace` were added to the frontend and never here,
    so the three presets built on them failed to save — every apply toasted
    "couldn't save the room" and the layout lived only in localStorage. The
    old test only exercised `garden`, which happened to be one of the two the
    backend already knew.
    """
    envs = frontend_environments()
    assert len(envs) >= 2, "suspiciously few environments parsed"
    for env in envs:
        iso = {"w": 9, "d": 7, "env": env, "placements": []}
        res = client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth)
        assert res.status_code == 200, f"backend rejects environment {env!r}"


def test_iso_roundtrips_a_floor_mask(client, auth):
    iso = {"w": 4, "d": 3, "mask": ["1111", "1100", "1100"], "placements": []}
    assert (
        client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth).status_code
        == 200
    )
    assert client.get("/api/room", headers=auth).get_json()["iso"] == iso


@pytest.mark.parametrize(
    "bad_mask",
    [
        "1111",  # not a list
        ["1111", "1100"],  # wrong row count for d=3
        ["1111", "110", "1100"],  # wrong row length
        ["1111", "11x0", "1100"],  # bad chars
        ["0000", "0000", "0000"],  # no floor at all
    ],
)
def test_iso_rejects_malformed_masks(client, auth, bad_mask):
    iso = {"w": 4, "d": 3, "mask": bad_mask, "placements": []}
    assert (
        client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth).status_code
        == 400
    )


def test_iso_roundtrips_corner_cuts(client, auth):
    iso = {
        "w": 12,
        "d": 9,
        "cuts": [{"corner": "front", "cw": 4, "cd": 3}],
        "placements": [],
    }
    assert (
        client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth).status_code
        == 200
    )
    assert client.get("/api/room", headers=auth).get_json()["iso"] == iso


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


@pytest.mark.parametrize("bad_rot", [4, -1, True, "1", 1.0])
def test_iso_rejects_malformed_rotations(client, auth, bad_rot):
    """Rotation is quarter turns 0-3. `True` is excluded deliberately: it's an
    int in Python, so a naive range check would let a bool through."""
    iso = {
        "w": 9,
        "d": 7,
        "placements": [{"id": "i1", "item": "sofa", "gx": 2, "gy": 3, "rot": bad_rot}],
    }
    res = client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth)
    assert res.status_code == 400


@pytest.mark.parametrize("rot", [1, 2, 3])
def test_iso_round_trips_every_quarter_turn(client, auth, rot):
    """Seating that ships back-view artwork has all four facings. The backend
    only bounds the range — the frontend's normalizeRot is what folds a turn an
    item can't be DRAWN in back to one it can."""
    iso = {
        "w": 9,
        "d": 7,
        "placements": [{"id": "i1", "item": "sofa", "gx": 2, "gy": 3, "rot": rot}],
    }
    assert (
        client.put("/api/room", json={"placements": [], "iso": iso}, headers=auth).status_code
        == 200
    )
    saved = client.get("/api/room", headers=auth).get_json()["iso"]
    assert saved["placements"][0]["rot"] == rot


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
