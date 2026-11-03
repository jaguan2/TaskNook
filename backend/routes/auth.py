"""Registration, login and local bearer-session routes."""

from flask import Blueprint, jsonify
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from models import AVATAR_MAX, DISPLAY_NAME_MAX, Token, USERNAME_MAX, User, db
from request_validation import clean_str, json_body


def create_auth_blueprint(require_auth, issue_token, bearer_value, befriend_demo_users):
    bp = Blueprint("auth", __name__)

    # ----- Auth ----------------------------------------------------------- #
    @bp.post("/api/auth/register")
    def register():
        data = json_body()
        # clean_str throughout: non-string JSON values (numbers, lists) used
        # to reach .strip()/slicing and 500.
        username = clean_str(data.get("username"), USERNAME_MAX).lower()
        password = data.get("password") if isinstance(data.get("password"), str) else ""
        # Clamped to the COLUMN widths (models.py), not to a round number. The
        # migrations are the stated source of truth for the schema, and register
        # was letting 80 characters into String(40)/String(60) while save_profile
        # clamped the same column to 60 — two writers disagreeing about one column.
        # SQLite forgives an over-long string, which is why it went unnoticed; a
        # real database or a CHECK constraint would not.
        display_name = clean_str(data.get("displayName"), DISPLAY_NAME_MAX) or username
        avatar = clean_str(data.get("avatar"), AVATAR_MAX) or "🌙"

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        if len(password) < 4:
            return jsonify({"error": "Password must be at least 4 characters"}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "That username is taken"}), 409

        user = User(
            username=username,
            display_name=display_name,
            password_hash=generate_password_hash(password),
            avatar=avatar,
        )
        db.session.add(user)
        try:
            db.session.commit()
        except IntegrityError:
            # The pre-check above isn't atomic with the commit — concurrent
            # registers (StrictMode's double bootstrap does this in dev) race
            # into the unique constraint. Same answer as losing the pre-check.
            db.session.rollback()
            return jsonify({"error": "That username is taken"}), 409

        # New users are auto-friended with the demo cottage-dwellers so the
        # social panel is never empty.
        befriend_demo_users(user)

        token = issue_token(user)
        return jsonify({"token": token, "user": user.public_dict()}), 201

    @bp.post("/api/auth/login")
    def login():
        data = json_body()
        username = clean_str(data.get("username"), USERNAME_MAX).lower()
        password = data.get("password") if isinstance(data.get("password"), str) else ""
        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid username or password"}), 401
        token = issue_token(user)
        return jsonify({"token": token, "user": user.public_dict()})

    @bp.get("/api/auth/me")
    @require_auth
    def me(user):
        return jsonify({"user": user.public_dict()})

    @bp.post("/api/auth/logout")
    @require_auth
    def logout(user):  # noqa: ARG001 — @require_auth supplies it
        # Through the shared parser, rather than a second hand-rolled copy of the
        # same header slicing.
        value = bearer_value()
        if value:
            Token.query.filter_by(value=value).delete()
            db.session.commit()
        return jsonify({"ok": True})

    return bp
