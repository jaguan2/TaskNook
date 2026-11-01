"""Task-list CRUD, grouping, archiving and ordering routes."""

from datetime import date, timezone

from flask import Blueprint, jsonify

from models import GROUP_NAME_MAX, TASK_NAME_MAX, TASK_NOTES_MAX, Task, db, utcnow
from request_validation import clean_id, clean_int, clean_str, json_body


def create_tasks_blueprint(require_auth, clean_date):
    bp = Blueprint("tasks", __name__)

    # ----- Tasks ---------------------------------------------------------- #
    @bp.get("/api/tasks")
    @require_auth
    def list_tasks(user):
        tasks = (
            Task.query.filter_by(user_id=user.id)
            .order_by(Task.position.asc(), Task.created_at.asc())
            .all()
        )
        # Routines reset lazily on read: a routine completed on a previous
        # LOCAL day comes back as not-done. Same local-day convention as the
        # "today" stats bucketing.
        today = date.today()
        changed = False
        for t in tasks:
            if t.archived_at:
                continue
            if t.is_routine and t.completed and t.completed_at:
                done_at = t.completed_at
                if done_at.tzinfo is None:
                    done_at = done_at.replace(tzinfo=timezone.utc)
                if done_at.astimezone().date() < today:
                    t.completed = False
                    t.completed_at = None
                    changed = True
        if changed:
            db.session.commit()
        return jsonify([t.to_dict() for t in tasks])

    @bp.post("/api/tasks")
    @require_auth
    def create_task(user):
        data = json_body()
        name = clean_str(data.get("name"), TASK_NAME_MAX)
        if not name:
            return jsonify({"error": "Task name is required"}), 400
        # A day is the longest a single task can plausibly claim — the same
        # ceiling `log_session` puts on one session.
        duration = clean_int(data.get("duration"), 1, 24 * 60, 25)
        priority = data.get("priority", "medium")
        if priority not in ("low", "medium", "high"):
            priority = "medium"

        max_pos = (
            db.session.query(db.func.max(Task.position))
            .filter_by(user_id=user.id)
            .scalar()
        )
        group = clean_str(data.get("group"), GROUP_NAME_MAX) or None
        sched = data.get("scheduledDate")
        task = Task(
            user_id=user.id,
            name=name,
            duration=duration,
            priority=priority,
            position=(max_pos or 0) + 1,
            # Only a plausible date string reaches the String(10) column — a
            # non-string would raise at bind time (500), and SQLite doesn't
            # enforce the length itself.
            scheduled_date=clean_date(sched),
            notes=clean_str(data.get("notes"), TASK_NOTES_MAX) or None,
            due_date=clean_date(data.get("dueDate")),
            group_name=group,
            is_routine=bool(data.get("routine")),
        )
        db.session.add(task)
        db.session.commit()
        return jsonify(task.to_dict()), 201

    @bp.put("/api/tasks/<int:task_id>")
    @require_auth
    def update_task(user, task_id):
        task = Task.query.filter_by(id=task_id, user_id=user.id).first()
        if not task:
            return jsonify({"error": "Task not found"}), 404
        data = json_body()

        if "name" in data and clean_str(data["name"], 200):
            task.name = clean_str(data["name"], 200)
        if "duration" in data:
            duration = clean_int(data["duration"], 1, 24 * 60)
            if duration is None:
                # 400 instead of a silent pass — a client bug shouldn't look
                # like a successful save (create_task and save_room both 400).
                # A huge but genuinely numeric value CLAMPS instead: it carries a
                # clear intent, and it used to 500.
                return jsonify({"error": "duration must be a number"}), 400
            task.duration = duration
        if "priority" in data and data["priority"] in ("low", "medium", "high"):
            task.priority = data["priority"]
        if "position" in data:
            # Positions are only ever compared with each other, so the bound only
            # has to be sane and bindable.
            position = clean_int(data["position"], 0, 1_000_000)
            if position is None:
                return jsonify({"error": "position must be a number"}), 400
            task.position = position
        if "scheduledDate" in data:
            task.scheduled_date = clean_date(data["scheduledDate"])
        if "notes" in data:
            # Empty string clears it, so the field behaves like the textarea does.
            task.notes = clean_str(data["notes"], TASK_NOTES_MAX) or None
        if "dueDate" in data:
            task.due_date = clean_date(data["dueDate"])
        if "group" in data:
            task.group_name = clean_str(data["group"], GROUP_NAME_MAX) or None
        if "routine" in data:
            task.is_routine = bool(data["routine"])
        if "completed" in data:
            # Stamp only on an actual TRANSITION. A repeated `completed: true` for
            # an already-done task used to move `completed_at` to now, which
            # inflates "done today", re-tints today on the calendar, and — worst —
            # cancels a routine's pending lazy reset by making yesterday's
            # completion look like today's.
            #
            # No current caller sends one (every PUT is a partial patch), so this
            # is a contract hole rather than a live bug — but it is one
            # "send the whole task object" refactor away from being real, and
            # nothing about it would fail loudly.
            done = bool(data["completed"])
            if done != task.completed:
                task.completed = done
                task.completed_at = utcnow() if done else None

        db.session.commit()
        return jsonify(task.to_dict())

    @bp.delete("/api/tasks/<int:task_id>")
    @require_auth
    def delete_task(user, task_id):
        task = Task.query.filter_by(id=task_id, user_id=user.id).first()
        if not task:
            return jsonify({"error": "Task not found"}), 404
        db.session.delete(task)
        db.session.commit()
        return jsonify({"ok": True})

    @bp.post("/api/tasks/<int:task_id>/archive")
    @require_auth
    def archive_task(user, task_id):
        task = Task.query.filter_by(id=task_id, user_id=user.id).first()
        if not task:
            return jsonify({"error": "Task not found"}), 404
        if not task.completed:
            return jsonify({"error": "Only completed tasks can be archived"}), 400
        if task.is_routine:
            return jsonify({"error": "Daily routines cannot be archived"}), 400
        if not task.archived_at:
            task.archived_at = utcnow()
            db.session.commit()
        return jsonify(task.to_dict())

    @bp.put("/api/tasks/group")
    @require_auth
    def rename_task_group(user):
        """Rename one user's task group atomically.

        The client used to issue one PUT per task. A network failure halfway
        through split a single group into two names, which is worse than a
        refused rename. One SQL UPDATE makes the operation all-or-nothing.
        Empty group headings remain client-side and never call this route.
        """
        data = json_body()
        next_raw = data.get("nextName")
        if "nextName" not in data or not isinstance(data.get("name"), str) or not (
            next_raw is None or isinstance(next_raw, str)
        ):
            return jsonify({"error": "Group names are required"}), 400
        name = clean_str(data["name"], GROUP_NAME_MAX)
        next_name = clean_str(next_raw, GROUP_NAME_MAX) if next_raw is not None else None
        if not name or next_name == "" or name == next_name:
            return jsonify({"error": "Two different group names are required"}), 400
        if next_name and Task.query.filter_by(user_id=user.id, group_name=next_name).first():
            return jsonify({"error": "That task group already exists"}), 409
        updated = Task.query.filter_by(user_id=user.id, group_name=name).update(
            {"group_name": next_name}, synchronize_session=False
        )
        if not updated:
            return jsonify({"error": "Task group not found"}), 404
        db.session.commit()
        return jsonify({"updated": updated, "name": next_name})

    @bp.put("/api/tasks/reorder")
    @require_auth
    def reorder_tasks(user):
        """Persist a new ordering. Body: {"order": [taskId, taskId, ...]}."""
        data = json_body()
        order = data.get("order", [])
        if not isinstance(order, list):
            return jsonify({"error": "order must be a list"}), 400
        # One query for the lot, not one per id (the old loop was an N+1
        # write for every drag-reorder).
        # Bounded, not merely type-checked: a huge int passes `isinstance(t, int)`
        # and then raises OverflowError inside `Task.id.in_(ids)`. This is the
        # fourth site of the same bug and the one with no test covering it.
        ids = []
        seen = set()
        for raw in order:
            task_id = clean_id(raw)
            if task_id is not None and task_id not in seen:
                seen.add(task_id)
                ids.append(task_id)

        # A partial or duplicate client list must still leave one dense,
        # deterministic ordering. Previously omitted tasks kept their old
        # positions and duplicate ids created gaps/collisions, so later reads
        # could interleave rows unpredictably.
        all_tasks = (
            Task.query.filter_by(user_id=user.id)
            .order_by(Task.position, Task.id)
            .all()
        )
        by_id = {task.id: task for task in all_tasks}
        reordered = [by_id[task_id] for task_id in ids if task_id in by_id]
        reordered.extend(task for task in all_tasks if task.id not in seen)
        for index, task in enumerate(reordered):
            task.position = index
        db.session.commit()
        return jsonify({"ok": True})
    return bp
