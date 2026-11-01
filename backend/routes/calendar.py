"""Calendar-event routes."""

from flask import Blueprint, jsonify

from models import CalendarEvent, TASK_NAME_MAX, TASK_NOTES_MAX, db
from request_validation import clean_int, clean_str, json_body


def create_calendar_blueprint(require_auth, clean_date, clean_time):
    bp = Blueprint("calendar", __name__)

    @bp.get("/api/events")
    @require_auth
    def list_events(user):
        events = CalendarEvent.query.filter_by(user_id=user.id).order_by(
            CalendarEvent.event_date.asc(), CalendarEvent.start_time.asc()
        ).all()
        return jsonify([event.to_dict() for event in events])

    @bp.post("/api/events")
    @require_auth
    def create_event(user):
        data = json_body()
        title = clean_str(data.get("title"), TASK_NAME_MAX)
        event_date = clean_date(data.get("date"))
        start_time = clean_time(data.get("startTime"))
        if not title or not event_date or not start_time:
            return jsonify({"error": "Event title, date, and start time are required"}), 400
        event = CalendarEvent(
            user_id=user.id,
            title=title,
            event_date=event_date,
            start_time=start_time,
            duration=clean_int(data.get("duration"), 1, 24 * 60, 60),
            notes=clean_str(data.get("notes"), TASK_NOTES_MAX) or None,
        )
        db.session.add(event)
        db.session.commit()
        return jsonify(event.to_dict()), 201

    @bp.delete("/api/events/<int:event_id>")
    @require_auth
    def delete_event(user, event_id):
        event = CalendarEvent.query.filter_by(id=event_id, user_id=user.id).first()
        if not event:
            return jsonify({"error": "Event not found"}), 404
        db.session.delete(event)
        db.session.commit()
        return jsonify({"ok": True})
    return bp
