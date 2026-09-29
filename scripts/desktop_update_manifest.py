"""Stamp a packaged build, then publish its matching small update manifest."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import uuid

ROOT = Path(__file__).resolve().parents[1]


def prepare(root=ROOT, channel="main"):
    metadata = {"schema": 1, "build_id": uuid.uuid4().hex,
                "built_at": datetime.now(timezone.utc).isoformat(), "channel": channel}
    path = root / "build" / "desktop-build.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return metadata


def publish(root=ROOT):
    metadata = json.loads((root / "build" / "desktop-build.json").read_text(encoding="utf-8"))
    executable = root / "TaskNook.exe"
    with executable.open("rb") as handle:
        metadata["sha256"] = hashlib.file_digest(handle, "sha256").hexdigest()
    metadata["size"] = executable.stat().st_size
    target = root / "desktop-update.json"
    temporary = target.with_suffix(".tmp")
    temporary.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    temporary.replace(target)
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "publish"])
    parser.add_argument("--channel", choices=["main", "dev"], default="main")
    args = parser.parse_args()
    if args.action == "prepare":
        prepare(channel=args.channel)
    else:
        publish()
