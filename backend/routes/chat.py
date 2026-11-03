"""Chat API boundary for stored local conversations and simulated replies.

The server owns persistence and membership. The frontend chooses seeded-bot
replies and writes them through ``senderId`` because TaskNook is a single-user
localhost app. Before this API is ever multi-user or remotely served, that
sender seam must be removed so clients cannot impersonate another member.
"""

from flask import Blueprint, jsonify, request
from sqlalchemy import tuple_

from models import (
    CHAT_TITLE_MAX,
    MESSAGE_MAX,
    Conversation,
    ConversationMember,
    Message,
    User,
    _utc_iso,
    db,
    utcnow,
)
from request_validation import clean_id, clean_int, clean_str, json_body


def _membership(user, chat_id):
    """Return the viewer's membership row, if this is their thread."""
    return ConversationMember.query.filter_by(
        conversation_id=chat_id, user_id=user.id
    ).first()


def _is_member(chat_id, user_id):
    return (
        ConversationMember.query.filter_by(
            conversation_id=chat_id, user_id=user_id
        ).first()
        is not None
    )


def _unread_messages(viewer_id):
    return Message.query.join(
        ConversationMember,
        db.and_(
            ConversationMember.conversation_id == Message.conversation_id,
            ConversationMember.user_id == viewer_id,
        ),
    ).filter(
        Message.sender_id != viewer_id,
        db.or_(
            ConversationMember.last_read_at.is_(None),
            tuple_(Message.created_at, Message.id)
            > tuple_(
                ConversationMember.last_read_at,
                ConversationMember.last_read_message_id,
            ),
        ),
    )


def _chat_payload(chat, members_by_chat, last_by_chat, unread_by_chat):
    return {
        "id": chat.id,
        "title": chat.title,
        "isGroup": chat.is_group,
        "members": [
            member.public_dict() for member in members_by_chat.get(chat.id, [])
        ],
        "lastMessage": (
            last_by_chat[chat.id].to_dict() if chat.id in last_by_chat else None
        ),
        "unread": unread_by_chat.get(chat.id, 0),
        "createdAt": _utc_iso(chat.created_at),
    }


def _one_chat(chat, viewer):
    members = [member.user for member in chat.members]
    # The relationship defaults to ascending order; clear it before asking for
    # the newest line or SQLAlchemy appends this ordering to the default one.
    last = (
        chat.messages.order_by(None)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .first()
    )
    unread = _unread_messages(viewer.id).filter(
        Message.conversation_id == chat.id
    )
    return {
        "id": chat.id,
        "title": chat.title,
        "isGroup": chat.is_group,
        "members": [member.public_dict() for member in members],
        "lastMessage": last.to_dict() if last else None,
        "unread": unread.count(),
        "createdAt": _utc_iso(chat.created_at),
    }


def create_chat_blueprint(require_auth):
    """Build the chat routes while keeping authentication owned by the app."""
    blueprint = Blueprint("chat", __name__)

    @blueprint.get("/api/chats")
    @require_auth
    def list_chats(user):
        """Return the viewer's threads, newest activity first, without N+1s."""
        rows = (
            db.session.query(Conversation, ConversationMember.last_read_at)
            .join(
                ConversationMember,
                ConversationMember.conversation_id == Conversation.id,
            )
            .filter(ConversationMember.user_id == user.id)
            .all()
        )
        chats = [row[0] for row in rows]
        ids = [chat.id for chat in chats]

        members_by_chat = {}
        if ids:
            for chat_id, member in (
                db.session.query(ConversationMember.conversation_id, User)
                .join(User, User.id == ConversationMember.user_id)
                .filter(ConversationMember.conversation_id.in_(ids))
                .all()
            ):
                members_by_chat.setdefault(chat_id, []).append(member)

        last_by_chat = {}
        unread_by_chat = {}
        if ids:
            latest_id = (
                db.session.query(Message.id)
                .filter(Message.conversation_id == Conversation.id)
                .order_by(Message.created_at.desc(), Message.id.desc())
                .limit(1)
                .correlate(Conversation)
                .scalar_subquery()
            )
            for message in (
                db.session.query(Message)
                .select_from(Conversation)
                .join(Message, Message.id == latest_id)
                .filter(Conversation.id.in_(ids))
                .all()
            ):
                last_by_chat[message.conversation_id] = message
            unread_by_chat = dict(
                _unread_messages(user.id)
                .with_entities(
                    Message.conversation_id, db.func.count(Message.id)
                )
                .filter(Message.conversation_id.in_(ids))
                .group_by(Message.conversation_id)
                .all()
            )

        payload = [
            _chat_payload(chat, members_by_chat, last_by_chat, unread_by_chat)
            for chat in chats
        ]
        payload.sort(
            key=lambda chat: (chat["lastMessage"] or {}).get("createdAt")
            or chat["createdAt"]
            or "",
            reverse=True,
        )
        return jsonify(payload)

    @blueprint.post("/api/chats")
    @require_auth
    def create_chat(user):
        """Open a friend thread; one-to-one conversations are idempotent."""
        data = json_body()
        raw_ids = data.get("memberIds")
        if not isinstance(raw_ids, list):
            return jsonify({"error": "memberIds must be a list"}), 400

        friend_ids = {friend.id for friend in user.friends}
        wanted = []
        for value in raw_ids[:50]:
            member_id = clean_id(value)
            if member_id is None or member_id == user.id or member_id in wanted:
                continue
            if member_id not in friend_ids:
                return jsonify({"error": "You can only chat with friends"}), 400
            wanted.append(member_id)
        if not wanted:
            return jsonify({"error": "Pick someone to talk to"}), 400

        is_group = len(wanted) > 1 or bool(data.get("isGroup"))
        title = clean_str(data.get("title"), CHAT_TITLE_MAX) or None

        if not is_group:
            other = wanted[0]
            mine = db.session.query(
                ConversationMember.conversation_id
            ).filter_by(user_id=user.id)
            theirs = db.session.query(
                ConversationMember.conversation_id
            ).filter_by(user_id=other)
            existing = (
                Conversation.query.filter(
                    Conversation.is_group.is_(False),
                    Conversation.id.in_(mine),
                    Conversation.id.in_(theirs),
                )
                .order_by(Conversation.id)
                .first()
            )
            if existing:
                return jsonify(_one_chat(existing, user)), 200

        chat = Conversation(title=title if is_group else None, is_group=is_group)
        db.session.add(chat)
        db.session.flush()
        for member_id in [user.id, *wanted]:
            db.session.add(
                ConversationMember(conversation_id=chat.id, user_id=member_id)
            )
        db.session.commit()
        return jsonify(_one_chat(chat, user)), 201

    @blueprint.get("/api/chats/<int:chat_id>/messages")
    @require_auth
    def list_messages(user, chat_id):
        if not _membership(user, chat_id):
            return jsonify({"error": "Not found"}), 404
        limit = clean_int(request.args.get("limit"), 1, 500, 200)
        query = Message.query.filter_by(conversation_id=chat_id)
        if "before" in request.args:
            raw_before = request.args["before"]
            before_id = (
                clean_id(int(raw_before))
                if raw_before.isascii()
                and raw_before.isdecimal()
                and len(raw_before) <= 10
                else None
            )
            if before_id is None:
                return jsonify({"error": "before must be a message id"}), 400
            cursor = query.filter_by(id=before_id).first()
            if cursor is None:
                return jsonify({"error": "Not found"}), 404
            query = query.filter(
                tuple_(Message.created_at, Message.id)
                < (cursor.created_at, cursor.id)
            )
        rows = (
            query.order_by(Message.created_at.desc(), Message.id.desc())
            .limit(limit)
            .all()
        )
        return jsonify([message.to_dict() for message in reversed(rows)])

    @blueprint.post("/api/chats/<int:chat_id>/messages")
    @require_auth
    def post_message(user, chat_id):
        """Store a local line, including the explicitly local bot-sender seam."""
        if not _membership(user, chat_id):
            return jsonify({"error": "Not found"}), 404
        data = json_body()
        body = clean_str(data.get("body"), MESSAGE_MAX)
        if not body:
            return jsonify({"error": "Message cannot be empty"}), 400

        sender_id = user.id
        raw_sender = data.get("senderId")
        if raw_sender is not None:
            candidate = clean_id(raw_sender)
            if candidate is None or not _is_member(chat_id, candidate):
                return jsonify({"error": "Sender is not in this chat"}), 400
            sender_id = candidate

        message = Message(
            conversation_id=chat_id, sender_id=sender_id, body=body
        )
        db.session.add(message)
        if sender_id == user.id:
            db.session.flush()
            member = _membership(user, chat_id)
            member.last_read_at = message.created_at
            member.last_read_message_id = message.id
        db.session.commit()
        return jsonify(message.to_dict()), 201

    @blueprint.post("/api/chats/<int:chat_id>/read")
    @require_auth
    def mark_chat_read(user, chat_id):
        member = _membership(user, chat_id)
        if not member:
            return jsonify({"error": "Not found"}), 404
        member.last_read_at = utcnow().replace(tzinfo=None)
        member.last_read_message_id = (
            db.session.query(db.func.max(Message.id))
            .filter_by(conversation_id=chat_id)
            .scalar()
            or 0
        )
        db.session.commit()
        return jsonify({"ok": True})

    @blueprint.delete("/api/chats/<int:chat_id>")
    @require_auth
    def delete_chat(user, chat_id):
        if not _membership(user, chat_id):
            return jsonify({"error": "Not found"}), 404
        chat = db.session.get(Conversation, chat_id)
        db.session.delete(chat)
        db.session.commit()
        return jsonify({"ok": True})

    return blueprint
