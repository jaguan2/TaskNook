"""Small request-value validators shared by backend route modules."""

from flask import request


def json_body():
    """Return the request JSON object, or an empty object for every other shape."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def clean_int(value, lo, hi, default=None):
    """Return an integer clamped to ``[lo, hi]`` or ``default`` for junk.

    Bounds are checked without ``math.isfinite`` so arbitrary-size integers
    cannot raise. Booleans are rejected explicitly even though Python treats
    them as integers.
    """
    if isinstance(value, bool) or value is None:
        return default
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            return default
        value = int(value)
    if not isinstance(value, int):
        try:
            value = int(str(value).strip())
        except (TypeError, ValueError):
            return default
    return lo if value < lo else hi if value > hi else value


def clean_id(value):
    """Return a bounded positive row id without coercing or clamping it.

    Identifiers must never use ``clean_int``: turning 0 into 1 can quietly
    address a real row, while a duration legitimately benefits from clamping.
    """
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if 1 <= value <= 2**31 - 1 else None


def clean_str(value, limit):
    """Coerce a JSON value to a trimmed, bounded string (empty for ``None``)."""
    return ("" if value is None else str(value)).strip()[:limit]
