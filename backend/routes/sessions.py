"""Focus-session history and productivity-summary routes."""

from flask import Blueprint, jsonify, request

from models import FocusSession, db
from request_validation import clean_str, json_body


def create_sessions_blueprint(require_auth, today_str, clean_day, build_stats):
    bp = Blueprint("sessions", __name__)

    # ----- Focus sessions / productivity ---------------------------------- #
    @bp.post("/api/sessions")
    @require_auth
    def log_session(user):
        data = json_body()
        try:
            minutes = int(data.get("minutes", 0))
        except (TypeError, ValueError):
            return jsonify({"error": "minutes must be a number"}), 400
        # A zero-minute session isn't a session. Both loggers in the app already
        # refuse to send one, but the endpoint accepted it and created a row —
        # which made /api/sessions/days answer {"2026-07-27": 0}, and the
        # calendar marks a day active from the key merely being present.
        if minutes < 1:
            return jsonify({"error": "minutes must be at least 1"}), 400
        # Bounded above too: one logged session can't exceed a day.
        minutes = min(24 * 60, minutes)
        session = FocusSession(
            user_id=user.id,
            minutes=minutes,
            task_name=clean_str(data.get("taskName"), 200) or None,
            day=today_str(),
        )
        db.session.add(session)
        db.session.commit()
        return jsonify(session.to_dict()), 201

    @bp.get("/api/stats")
    @require_auth
    def stats(user):
        return jsonify(build_stats(user))

    @bp.get("/api/sessions/days")
    @require_auth
    def session_days(user):
        """Focus minutes per day, for marking active days on the calendar."""
        rows = (
            db.session.query(FocusSession.day, db.func.sum(FocusSession.minutes))
            .filter_by(user_id=user.id)
            .group_by(FocusSession.day)
            .all()
        )
        return jsonify({day: int(minutes) for day, minutes in rows})

    @bp.get("/api/sessions/day")
    @require_auth
    def session_day(user):
        """What you focused ON during one day — the other half of the history.

        `task_name` has been written on every session since sessions existed and
        read back by nothing, so the calendar could say "94 minutes" but never
        "94 minutes, on what". Kept as its own endpoint rather than folded into
        /sessions/days because that one is fetched wholesale on every refresh and
        paints a whole month; names are wanted for exactly one day at a time.
        """
        day = clean_day(request.args.get("day"))
        if not day:
            return jsonify({"error": "day must be YYYY-MM-DD"}), 400
        rows = (
            db.session.query(
                FocusSession.task_name,
                db.func.sum(FocusSession.minutes),
                db.func.count(FocusSession.id),
            )
            .filter_by(user_id=user.id, day=day)
            .group_by(FocusSession.task_name)
            .all()
        )
        entries = [
            {
                # A block run with no active task is a real, common case — the
                # UI needs something to print, and inventing a name server-side
                # would make it indistinguishable from a task actually called
                # "Focus". Null travels; the client decides how to say it.
                "taskName": name,
                "minutes": int(minutes),
                "sessions": int(count),
            }
            for name, minutes, count in rows
        ]
        # Longest first: "what did I spend the day on" is the question.
        entries.sort(key=lambda e: e["minutes"], reverse=True)
        return jsonify(
            {
                "day": day,
                "total": sum(e["minutes"] for e in entries),
                "entries": entries,
            }
        )
    return bp
