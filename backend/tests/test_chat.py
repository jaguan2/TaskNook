"""Chat threads: membership, one-to-one idempotence, unread counts, and the
sender seam the bots reply through.

The feature is simulated social — the "friends" are seeded bots in the user's
own SQLite file — so what the SERVER owes is narrow and worth pinning: you can
only talk to friends, you can only see threads you are in, and a thread you
were never in is a 404 rather than a leak.
"""
import pytest

from app import create_app
from models import Conversation, ConversationMember, Message, User, db


@pytest.fixture()
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("TASKNOOK_DB", str(tmp_path / "chat.db"))
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


def friend_id(client, auth, username="luna"):
    """A seeded demo friend — every new account is auto-friended with them."""
    friends = client.get("/api/friends", headers=auth).get_json()
    return next(f["id"] for f in friends if f["username"] == username)


def open_chat(client, auth, *member_ids, title=None, is_group=False):
    body = {"memberIds": list(member_ids)}
    if title:
        body["title"] = title
    if is_group:
        body["isGroup"] = True
    return client.post("/api/chats", json=body, headers=auth)


# --------------------------------------------------------------------------- #
# opening threads
# --------------------------------------------------------------------------- #
def test_one_to_one_is_idempotent(client, auth):
    """"Message Luna" is a PLACE, not an event — asking twice must not leave
    two empty threads with the same person in the list."""
    luna = friend_id(client, auth)
    first = open_chat(client, auth, luna)
    assert first.status_code == 201
    second = open_chat(client, auth, luna)
    assert second.status_code == 200
    assert second.get_json()["id"] == first.get_json()["id"]
    assert len(client.get("/api/chats", headers=auth).get_json()) == 1


def test_a_group_can_repeat_the_same_people(client, auth):
    """Groups are NOT deduplicated: two groups with the same members is a
    thing people actually want (work vs. weekend)."""
    luna, kai = friend_id(client, auth), friend_id(client, auth, "kai")
    a = open_chat(client, auth, luna, kai, title="Study group")
    b = open_chat(client, auth, luna, kai, title="Weekend")
    assert a.status_code == b.status_code == 201
    assert a.get_json()["id"] != b.get_json()["id"]
    assert a.get_json()["isGroup"] and a.get_json()["title"] == "Study group"


def test_two_members_can_be_a_group_when_asked(client, auth):
    """A named two-person group stays a group — is_group is stored, not
    inferred from how many people are left in it."""
    luna = friend_id(client, auth)
    res = open_chat(client, auth, luna, title="Just us", is_group=True)
    assert res.get_json()["isGroup"] is True
    assert res.get_json()["title"] == "Just us"


def test_you_are_always_a_member_of_what_you_open(client, auth):
    luna = friend_id(client, auth)
    chat = open_chat(client, auth, luna).get_json()
    ids = {m["id"] for m in chat["members"]}
    me = client.get("/api/auth/me", headers=auth).get_json()["user"]["id"]
    assert me in ids and luna in ids


def test_only_friends_can_be_added(client, auth):
    stranger = client.post(
        "/api/auth/register", json={"username": "stranger", "password": "test1234"}
    ).get_json()["user"]["id"]
    res = open_chat(client, auth, stranger)
    assert res.status_code == 400
    assert "friends" in res.get_json()["error"].lower()


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"memberIds": "luna"},
        {"memberIds": []},
        {"memberIds": [None, "x", -3]},
        {"memberIds": [True]},
        {"memberIds": [1e30]},
    ],
)
def test_junk_never_500s(client, auth, payload):
    res = client.post("/api/chats", json=payload, headers=auth)
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_a_zero_id_is_not_quietly_user_one(client, auth):
    """Regression: ids went through `clean_int`, which CLAMPS — so `0` became
    `1` and opened a thread with whoever user #1 is. An identifier is not a
    magnitude; junk must be refused, not rounded into range."""
    res = client.post("/api/chats", json={"memberIds": [0]}, headers=auth)
    assert res.status_code == 400
    assert client.get("/api/chats", headers=auth).get_json() == []


# --------------------------------------------------------------------------- #
# messages
# --------------------------------------------------------------------------- #
def test_send_and_read_back(client, auth):
    luna = friend_id(client, auth)
    chat = open_chat(client, auth, luna).get_json()
    client.post(f"/api/chats/{chat['id']}/messages", json={"body": "hey"}, headers=auth)
    msgs = client.get(f"/api/chats/{chat['id']}/messages", headers=auth).get_json()
    assert [m["body"] for m in msgs] == ["hey"]


def test_messages_come_back_oldest_first(client, auth):
    """The limit takes the NEWEST messages, but the list reads top to bottom."""
    luna = friend_id(client, auth)
    chat = open_chat(client, auth, luna).get_json()
    for line in ["one", "two", "three"]:
        client.post(
            f"/api/chats/{chat['id']}/messages", json={"body": line}, headers=auth
        )
    msgs = client.get(f"/api/chats/{chat['id']}/messages", headers=auth).get_json()
    assert [m["body"] for m in msgs] == ["one", "two", "three"]


def test_a_bot_can_be_named_as_the_sender(client, auth):
    """The seam the whole feature hangs off: lib/chat.js writes the bot's
    reply, so the client names a sender other than itself. Safe only because
    every member is a row in the caller's own database — see the endpoint's
    doc-comment for the multi-user contract."""
    luna = friend_id(client, auth)
    chat = open_chat(client, auth, luna).get_json()
    res = client.post(
        f"/api/chats/{chat['id']}/messages",
        json={"body": "back in 10", "senderId": luna},
        headers=auth,
    )
    assert res.status_code == 201
    assert res.get_json()["senderId"] == luna


def test_sender_must_be_in_the_thread(client, auth):
    """Even as theater it has a floor: you cannot put words in the mouth of
    someone who isn't there."""
    luna, kai = friend_id(client, auth), friend_id(client, auth, "kai")
    chat = open_chat(client, auth, luna).get_json()
    res = client.post(
        f"/api/chats/{chat['id']}/messages",
        json={"body": "hi", "senderId": kai},
        headers=auth,
    )
    assert res.status_code == 400


def test_empty_and_oversized_bodies(client, auth):
    luna = friend_id(client, auth)
    chat = open_chat(client, auth, luna).get_json()
    blank = client.post(
        f"/api/chats/{chat['id']}/messages", json={"body": "   "}, headers=auth
    )
    assert blank.status_code == 400
    huge = client.post(
        f"/api/chats/{chat['id']}/messages", json={"body": "x" * 5000}, headers=auth
    )
    assert huge.status_code == 201
    assert len(huge.get_json()["body"]) == 2000  # clamped to the column width


# --------------------------------------------------------------------------- #
# who can see what
# --------------------------------------------------------------------------- #
def test_someone_elses_thread_is_a_404(client, app, auth):
    """Not a 403: a thread you are not in should not even confirm it exists."""
    other_token = register(client, "outsider", "test1234")
    other = {"Authorization": f"Bearer {other_token}"}
    luna = friend_id(client, other)
    theirs = open_chat(client, other, luna).get_json()

    assert client.get(f"/api/chats/{theirs['id']}/messages", headers=auth).status_code == 404
    assert (
        client.post(
            f"/api/chats/{theirs['id']}/messages", json={"body": "peek"}, headers=auth
        ).status_code
        == 404
    )
    assert client.delete(f"/api/chats/{theirs['id']}", headers=auth).status_code == 404
    assert client.get("/api/chats", headers=auth).get_json() == []


def test_unauthenticated_is_401(client):
    assert client.get("/api/chats").status_code == 401


# --------------------------------------------------------------------------- #
# unread
# --------------------------------------------------------------------------- #
def test_unread_counts_only_other_peoples_lines(client, auth):
    luna = friend_id(client, auth)
    chat = open_chat(client, auth, luna).get_json()
    client.post(f"/api/chats/{chat['id']}/messages", json={"body": "hi"}, headers=auth)
    client.post(
        f"/api/chats/{chat['id']}/messages",
        json={"body": "hello!", "senderId": luna},
        headers=auth,
    )
    client.post(
        f"/api/chats/{chat['id']}/messages",
        json={"body": "how's the thesis", "senderId": luna},
        headers=auth,
    )
    listed = client.get("/api/chats", headers=auth).get_json()[0]
    assert listed["unread"] == 2

    client.post(f"/api/chats/{chat['id']}/read", headers=auth)
    assert client.get("/api/chats", headers=auth).get_json()[0]["unread"] == 0


def test_sending_marks_the_thread_read(client, auth):
    """You were plainly looking at it while you typed."""
    luna = friend_id(client, auth)
    chat = open_chat(client, auth, luna).get_json()
    client.post(
        f"/api/chats/{chat['id']}/messages",
        json={"body": "you there?", "senderId": luna},
        headers=auth,
    )
    assert client.get("/api/chats", headers=auth).get_json()[0]["unread"] == 1
    client.post(f"/api/chats/{chat['id']}/messages", json={"body": "here"}, headers=auth)
    assert client.get("/api/chats", headers=auth).get_json()[0]["unread"] == 0


def test_list_is_newest_activity_first(client, auth):
    luna, kai = friend_id(client, auth), friend_id(client, auth, "kai")
    first = open_chat(client, auth, luna).get_json()
    second = open_chat(client, auth, kai).get_json()
    client.post(f"/api/chats/{first['id']}/messages", json={"body": "ping"}, headers=auth)
    listed = client.get("/api/chats", headers=auth).get_json()
    assert listed[0]["id"] == first["id"]
    assert listed[0]["lastMessage"]["body"] == "ping"
    assert listed[1]["id"] == second["id"] and listed[1]["lastMessage"] is None


# --------------------------------------------------------------------------- #
# deletion
# --------------------------------------------------------------------------- #
def test_deleting_takes_its_messages_with_it(client, app, auth):
    luna = friend_id(client, auth)
    chat = open_chat(client, auth, luna).get_json()
    client.post(f"/api/chats/{chat['id']}/messages", json={"body": "bye"}, headers=auth)

    assert client.delete(f"/api/chats/{chat['id']}", headers=auth).status_code == 200
    assert client.get("/api/chats", headers=auth).get_json() == []
    with app.app_context():
        assert Message.query.filter_by(conversation_id=chat["id"]).count() == 0
        assert ConversationMember.query.filter_by(conversation_id=chat["id"]).count() == 0
        assert db.session.get(Conversation, chat["id"]) is None
