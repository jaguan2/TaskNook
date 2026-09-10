"""Calendar appointments are separate from completable tasks."""
import pytest

from app import create_app


@pytest.fixture()
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("TASKNOOK_DB", str(tmp_path / "events.db"))
    return create_app()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth(client):
    result = client.post("/api/auth/register", json={"username": "events", "password": "test1234"})
    return {"Authorization": f"Bearer {result.get_json()['token']}"}


def test_create_list_and_delete_an_event(client, auth):
    made = client.post(
        "/api/events",
        json={"title": "Dentist", "date": "2026-09-10", "startTime": "09:30", "duration": 30},
        headers=auth,
    )
    assert made.status_code == 201
    event = made.get_json()
    assert event == {"id": event["id"], "title": "Dentist", "date": "2026-09-10", "startTime": "09:30", "duration": 30, "notes": None}
    assert client.get("/api/events", headers=auth).get_json() == [event]
    assert client.delete(f"/api/events/{event['id']}", headers=auth).status_code == 200


def test_event_requires_a_real_local_time(client, auth):
    response = client.post("/api/events", json={"title": "Dentist", "date": "2026-09-10", "startTime": "nope"}, headers=auth)
    assert response.status_code == 400
