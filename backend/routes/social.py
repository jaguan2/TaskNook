"""Friendship, visit-access and friend-room routes."""

import json

from flask import Blueprint, jsonify

from models import USERNAME_MAX, User, db
from request_validation import clean_str, json_body
from .room_profile import read_json_map

VISIT_ACCESS_LEVELS = ("open", "friends", "invite", "private")


def create_social_blueprint(require_auth, build_stats_for, build_stats):
    bp = Blueprint("social", __name__)

    # ----- Friends -------------------------------------------------------- #
    @bp.get("/api/friends")
    @require_auth
    def list_friends(user):
        friends = list(user.friends)
        # Two grouped queries for everyone, instead of four per friend.
        stats = build_stats_for(f.id for f in friends)
        result = [{**f.public_dict(), **stats[f.id]} for f in friends]
        # Most productive today first.
        result.sort(key=lambda f: f["focusMinutesToday"], reverse=True)
        return jsonify(result)

    @bp.post("/api/friends")
    @require_auth
    def add_friend(user):
        data = json_body()
        username = clean_str(data.get("username"), USERNAME_MAX).lower()
        friend = User.query.filter_by(username=username).first()
        if not friend:
            return jsonify({"error": "No cottage-dweller with that name"}), 404
        if friend.id == user.id:
            return jsonify({"error": "You are already your own best friend 🙂"}), 400
        if user.friends.filter_by(id=friend.id).first():
            return jsonify({"error": "Already friends"}), 409
        # Symmetric friendship.
        user.friends.append(friend)
        friend.friends.append(user)
        db.session.commit()
        return jsonify({**friend.public_dict(), **build_stats(friend)}), 201

    @bp.get("/api/friends/<int:friend_id>/room")
    @require_auth
    def friend_room(user, friend_id):
        """A friend's room, character and access setting — for VISITING.

        Friend-gated (a stranger gets a 404), but deliberately NOT gated on
        `visit_access`: TaskNook is a single-user local app, the "friends"
        are seeded bots in the user's own SQLite file, and the knock/private
        flows are cozy client-side theater. Returning the data to a friend
        keeps that theater cheap and honest. THE CONTRACT FOR A MULTI-USER
        FUTURE: before this endpoint is ever served beyond localhost,
        enforcement must move HERE — 403 for `private`, an invites table for
        `invite` — because a client-side gate is no gate at all.
        """
        friend = user.friends.filter_by(id=friend_id).first()
        if not friend:
            return jsonify({"error": "Not found"}), 404
        # The visitable room is the ISO layout half of room_config; a legacy
        # bare-list config (flat-scene only) has no iso room to show.
        room = None
        if friend.room_config:
            try:
                saved = json.loads(friend.room_config)
                if isinstance(saved, dict) and isinstance(saved.get("iso"), dict):
                    room = saved["iso"]
            except ValueError:
                room = None
        character = read_json_map(friend.character)
        return jsonify(
            {
                **friend.public_dict(),
                "room": room,
                "character": character or None,
            }
        )

    @bp.put("/api/visit-access")
    @require_auth
    def set_visit_access(user):
        """Your room's visit setting. A whitelist, not free text — the value is
        an access rule, and an unknown level must fail loudly rather than be
        stored as a string nothing will ever match."""
        data = json_body()
        value = data.get("value")
        if value not in VISIT_ACCESS_LEVELS:
            return jsonify({"error": "Invalid visit access"}), 400
        user.visit_access = value
        db.session.commit()
        return jsonify({"visitAccess": value})

    @bp.delete("/api/friends/<int:friend_id>")
    @require_auth
    def remove_friend(user, friend_id):
        friend = db.session.get(User, friend_id)
        if friend and user.friends.filter_by(id=friend.id).first():
            user.friends.remove(friend)
            if friend.friends.filter_by(id=user.id).first():
                friend.friends.remove(user)
            db.session.commit()
        return jsonify({"ok": True})
    return bp
