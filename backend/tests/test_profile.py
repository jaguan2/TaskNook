"""Profile & character API tests.

The backend deliberately knows nothing about MBTI types or hairstyles — the
frontend owns that vocabulary. What it DOES guarantee is the shape: a bounded,
flat map of scalars, saved section by section without clobbering the rest.
"""
import pytest

from app import create_app


@pytest.fixture()
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("TASKNOOK_DB", str(tmp_path / "profile.db"))
    return create_app()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth(client):
    res = client.post(
        "/api/auth/register",
        json={"username": "dreamer", "password": "test1234"},
    )
    return {"Authorization": f"Bearer {res.get_json()['token']}"}


def test_profile_starts_empty_but_carries_the_account_name(client, auth):
    body = client.get("/api/profile", headers=auth).get_json()
    assert body["username"] == "dreamer"
    assert body["profile"] == {}
    assert body["character"] == {}


def test_profile_round_trips(client, auth):
    res = client.put(
        "/api/profile",
        headers=auth,
        json={
            "displayName": "Moon",
            "avatar": "🌙",
            "profile": {"mbti": "INFP", "birthDate": "1999-04-12"},
            "character": {"hair": "bob", "hairColor": "#3b2a24"},
        },
    )
    assert res.status_code == 200

    body = client.get("/api/profile", headers=auth).get_json()
    assert body["displayName"] == "Moon"
    assert body["profile"] == {"mbti": "INFP", "birthDate": "1999-04-12"}
    assert body["character"] == {"hair": "bob", "hairColor": "#3b2a24"}


def test_sections_save_independently(client, auth):
    """The panel saves the section you edited. Sending only `character` must
    not wipe the profile you filled in earlier — that would silently delete
    someone's answers the moment they changed their hair."""
    client.put(
        "/api/profile",
        headers=auth,
        json={"profile": {"mbti": "ENFJ"}, "character": {"hair": "bob"}},
    )
    client.put("/api/profile", headers=auth, json={"character": {"hair": "long"}})

    body = client.get("/api/profile", headers=auth).get_json()
    assert body["profile"] == {"mbti": "ENFJ"}, "editing the character wiped the profile"
    assert body["character"] == {"hair": "long"}


def test_clearing_a_field_drops_it(client, auth):
    client.put("/api/profile", headers=auth, json={"profile": {"bio": "hello"}})
    client.put("/api/profile", headers=auth, json={"profile": {"bio": ""}})

    assert client.get("/api/profile", headers=auth).get_json()["profile"] == {}


def test_empty_display_name_is_refused(client, auth):
    res = client.put("/api/profile", headers=auth, json={"displayName": "   "})
    assert res.status_code == 400
    # and the old name survived
    assert client.get("/api/profile", headers=auth).get_json()["displayName"]


@pytest.mark.parametrize(
    "bad",
    [
        {"profile": "not a map"},
        {"profile": [1, 2, 3]},
        {"profile": {"bio": "x" * 500}},           # past the value cap
        {"profile": {"nested": {"a": 1}}},         # flat scalars only
        {"profile": {"k" * 40: "v"}},              # past the key cap
        {"profile": {"n": float("inf")}},          # json.dumps would emit Infinity
        {"character": {"hair": "x" * 60}},         # appearance values are keys/hexes
    ],
)
def test_malformed_payloads_are_refused(client, auth, bad):
    assert client.put("/api/profile", headers=auth, json=bad).status_code == 400


def test_a_refused_payload_changes_nothing(client, auth):
    client.put("/api/profile", headers=auth, json={"profile": {"mbti": "INTP"}})
    client.put("/api/profile", headers=auth, json={"profile": {"bio": "x" * 500}})

    assert client.get("/api/profile", headers=auth).get_json()["profile"] == {
        "mbti": "INTP"
    }


def test_profile_requires_auth(client):
    assert client.get("/api/profile").status_code == 401
    assert client.put("/api/profile", json={"profile": {}}).status_code == 401
