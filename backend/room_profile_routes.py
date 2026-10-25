"""Room and profile API boundary.

The frontend owns the vocabulary for furniture and character choices. This
module owns the bounded JSON envelopes that make those flexible blobs safe to
store, plus the two small route families that read and write them.
"""

import json

from flask import Blueprint, jsonify, request

from models import AVATAR_MAX, DISPLAY_NAME_MAX, db


# Cross-language contracts mirrored in frontend/src/lib/isoRoom.js. The room
# tests compare them so adding an environment, wall mode, coat or temper cannot
# silently make a frontend preset unsaveable.
ISO_ENVS = ("room", "cafe", "library", "terrace", "garden", "snow")
ISO_WALLS = ("full", "low", "none")
PET_LOOKS = (
    "ink", "ginger", "greytabby", "tuxedo", "calico", "siamese", "tortie",
    "golden", "shiba", "corgi", "dalmatian", "husky", "cloud", "snow", "cocoa",
)
PET_TEMPERS = ("mellow", "curious", "sleepy")

PROFILE_MAX_KEYS = 24
CHARACTER_MAX_KEYS = 40
PROFILE_MAX_VALUE = 280


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _finite_number(value):
    """A real coordinate/setting that JSON and SQLite can safely retain."""
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and -1e7 < value < 1e7
    )


def _hex_color(value):
    return (
        isinstance(value, str)
        and len(value) == 7
        and value[0] == "#"
        and all(char in "0123456789abcdefABCDEF" for char in value[1:])
    )


def _clean_str(value, limit):
    return ("" if value is None else str(value)).strip()[:limit]


def clean_layout(placements, xkey, ykey):
    """Return a bounded flat or isometric placement list, or ``None``."""
    if not isinstance(placements, list) or len(placements) > 200:
        return None

    cleaned = []
    for placement in placements:
        if not isinstance(placement, dict):
            return None
        placement_id = placement.get("id")
        item = placement.get("item")
        x, y = placement.get(xkey), placement.get(ykey)
        if not (isinstance(placement_id, str) and 0 < len(placement_id) <= 32):
            return None
        if not (isinstance(item, str) and 0 < len(item) <= 32):
            return None
        if not _finite_number(x) or not _finite_number(y):
            return None

        entry = {"id": placement_id, "item": item, xkey: x, ykey: y}
        tint = placement.get("tint")
        if tint is not None:
            if not _hex_color(tint):
                return None
            entry["tint"] = tint

        rotation = placement.get("rot")
        if rotation is not None:
            if not (
                isinstance(rotation, int)
                and not isinstance(rotation, bool)
                and 0 <= rotation <= 3
            ):
                return None
            if rotation:
                entry["rot"] = rotation

        name = placement.get("name")
        if name is not None:
            if not (isinstance(name, str) and 0 < len(name.strip()) <= 16):
                return None
            entry["name"] = name.strip()

        temper = placement.get("temper")
        if temper is not None:
            if temper not in PET_TEMPERS:
                return None
            entry["temper"] = temper

        look = placement.get("look")
        if look is not None:
            if look not in PET_LOOKS:
                return None
            entry["look"] = look

        off = placement.get("off")
        if off is not None:
            if not isinstance(off, bool):
                return None
            if off:
                entry["off"] = True
        cleaned.append(entry)
    return cleaned


def _clean_edges(edges, width, depth):
    if not isinstance(edges, list) or len(edges) > 2 * width * depth:
        return None
    cleaned = set()
    for key in edges:
        if not isinstance(key, str):
            return None
        parts = key.split(":")
        if len(parts) != 3 or parts[0] not in ("gx", "gy"):
            return None
        try:
            at, start = int(parts[1]), int(parts[2])
        except ValueError:
            return None
        canonical = f"{parts[0]}:{at}:{start}"
        if canonical != key:
            return None
        valid = (
            0 < at < (depth if parts[0] == "gy" else width)
            and 0 <= start < (width if parts[0] == "gy" else depth)
        )
        if not valid:
            return None
        cleaned.add(canonical)
    return sorted(cleaned)


def clean_room_payload(data):
    """Validate a room request and return its canonical stored shape."""
    placements = clean_layout(data.get("placements"), "x", "y")
    if placements is None:
        return None

    stored = {"placements": placements, "iso": None}
    iso = data.get("iso")
    if iso is None:
        return stored
    if not isinstance(iso, dict):
        return None

    width, depth = iso.get("w"), iso.get("d")
    if not (
        isinstance(width, int)
        and not isinstance(width, bool)
        and 3 <= width <= 64
    ):
        return None
    if not (
        isinstance(depth, int)
        and not isinstance(depth, bool)
        and 3 <= depth <= 64
    ):
        return None

    iso_placements = clean_layout(iso.get("placements"), "gx", "gy")
    if iso_placements is None:
        return None
    cleaned_iso = {"w": width, "d": depth, "placements": iso_placements}

    version = iso.get("version")
    if version is not None:
        if not (
            isinstance(version, int)
            and not isinstance(version, bool)
            and 1 <= version <= 64
        ):
            return None
        cleaned_iso["version"] = version

    env = iso.get("env")
    if env is not None:
        if env not in ISO_ENVS:
            return None
        cleaned_iso["env"] = env

    walls = iso.get("walls")
    if walls is not None:
        if walls not in ISO_WALLS:
            return None
        cleaned_iso["walls"] = walls

    wall_colors = iso.get("wallColors")
    if wall_colors is not None:
        if not isinstance(wall_colors, dict) or set(wall_colors) - {"left", "right"}:
            return None
        if any(not _hex_color(color) for color in wall_colors.values()):
            return None
        if wall_colors:
            cleaned_iso["wallColors"] = dict(wall_colors)

    lighting = iso.get("lighting")
    if lighting is not None:
        if lighting not in ("natural", "golden", "candle", "moonlit"):
            return None
        cleaned_iso["lighting"] = lighting

    mask = iso.get("mask")
    if mask is not None:
        valid_mask = (
            isinstance(mask, list)
            and len(mask) == depth
            and all(
                isinstance(row, str)
                and len(row) == width
                and set(row) <= {"0", "1"}
                for row in mask
            )
            and any("1" in row for row in mask)
        )
        if not valid_mask:
            return None
        cleaned_iso["mask"] = mask

    for field in ("partitions", "arches"):
        if field not in iso:
            continue
        edges = _clean_edges(iso[field], width, depth)
        if edges is None:
            return None
        if edges:
            cleaned_iso[field] = edges
    if "arches" in cleaned_iso and "partitions" in cleaned_iso:
        arch_edges = set(cleaned_iso["arches"])
        solid_edges = [
            key for key in cleaned_iso["partitions"] if key not in arch_edges
        ]
        if solid_edges:
            cleaned_iso["partitions"] = solid_edges
        else:
            cleaned_iso.pop("partitions")

    cuts = iso.get("cuts")
    if cuts is not None:
        if not isinstance(cuts, list) or len(cuts) > 4:
            return None
        cleaned_cuts = []
        for cut in cuts:
            if not isinstance(cut, dict):
                return None
            corner = cut.get("corner")
            cut_width, cut_depth = cut.get("cw"), cut.get("cd")
            if corner not in ("back", "right", "left", "front"):
                return None
            if any(
                not (
                    isinstance(value, int)
                    and not isinstance(value, bool)
                    and 1 <= value <= 16
                )
                for value in (cut_width, cut_depth)
            ):
                return None
            cleaned_cuts.append(
                {"corner": corner, "cw": cut_width, "cd": cut_depth}
            )
        cleaned_iso["cuts"] = cleaned_cuts

    stored["iso"] = cleaned_iso
    return stored


def clean_json_map(value, max_keys, max_len):
    """Return a bounded flat settings map, or ``None`` for an invalid map."""
    if not isinstance(value, dict) or len(value) > max_keys:
        return None
    cleaned = {}
    for key, entry in value.items():
        if not (isinstance(key, str) and 0 < len(key) <= 32):
            return None
        if entry is None or entry == "":
            continue
        if isinstance(entry, bool):
            cleaned[key] = entry
        elif isinstance(entry, (int, float)):
            if not _finite_number(entry):
                return None
            cleaned[key] = entry
        elif isinstance(entry, str):
            if len(entry) > max_len:
                return None
            cleaned[key] = entry.strip()
        else:
            return None
    return cleaned


def read_json_map(raw):
    if not raw:
        return {}
    try:
        saved = json.loads(raw)
    except ValueError:
        return {}
    return saved if isinstance(saved, dict) else {}


def profile_payload(user):
    return {
        "username": user.username,
        "displayName": user.display_name,
        "avatar": user.avatar,
        "profile": read_json_map(user.profile),
        "character": read_json_map(user.character),
    }


def create_room_profile_blueprint(require_auth):
    blueprint = Blueprint("room_profile", __name__)

    @blueprint.get("/api/room")
    @require_auth
    def get_room(user):
        empty = {"placements": None, "iso": None}
        if not user.room_config:
            return jsonify(empty)
        try:
            saved = json.loads(user.room_config)
        except ValueError:
            return jsonify(empty)
        if isinstance(saved, list):
            return jsonify({"placements": saved, "iso": None})
        if isinstance(saved, dict):
            return jsonify(
                {"placements": saved.get("placements"), "iso": saved.get("iso")}
            )
        return jsonify(empty)

    @blueprint.put("/api/room")
    @require_auth
    def save_room(user):
        stored = clean_room_payload(_json_body())
        if stored is None:
            return jsonify({"error": "Invalid room layout"}), 400
        user.room_config = json.dumps(stored)
        db.session.commit()
        return jsonify({"ok": True})

    @blueprint.get("/api/profile")
    @require_auth
    def get_profile(user):
        return jsonify(profile_payload(user))

    @blueprint.put("/api/profile")
    @require_auth
    def save_profile(user):
        data = _json_body()
        if "displayName" in data:
            name = _clean_str(data.get("displayName"), DISPLAY_NAME_MAX)
            if not name:
                return jsonify({"error": "A name can't be empty"}), 400
            user.display_name = name
        if "avatar" in data:
            user.avatar = _clean_str(data.get("avatar"), AVATAR_MAX)
        if "profile" in data:
            cleaned = clean_json_map(
                data.get("profile"), PROFILE_MAX_KEYS, PROFILE_MAX_VALUE
            )
            if cleaned is None:
                return jsonify({"error": "Invalid profile"}), 400
            user.profile = json.dumps(cleaned)
        if "character" in data:
            cleaned = clean_json_map(
                data.get("character"), CHARACTER_MAX_KEYS, 32
            )
            if cleaned is None:
                return jsonify({"error": "Invalid character"}), 400
            user.character = json.dumps(cleaned)
        db.session.commit()
        return jsonify(profile_payload(user))

    return blueprint
