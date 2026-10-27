"""Stamp a packaged build, then publish its matching small update manifest."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import uuid

ROOT = Path(__file__).resolve().parents[1]

SOURCE_PATHS = (
    "desktop.py",
    "desktop_updates.py",
    "build-exe.bat",
    "requirements-desktop.txt",
    "requirements-desktop-build.txt",
    "backend/requirements.txt",
    "frontend/.nvmrc",
    "frontend/package.json",
    "frontend/package-lock.json",
    "frontend/vite.config.js",
    "scripts/desktop_package.py",
    "scripts/desktop_update_manifest.py",
)
SOURCE_GLOBS = (
    "backend/*.py",
    "backend/migrations/*.py",
    "backend/migrations/*.ini",
    "backend/migrations/*.mako",
    "backend/migrations/versions/*.py",
    "frontend/dist/**/*",
)
TEXT_SUFFIXES = {
    ".bat", ".css", ".html", ".ini", ".js", ".json", ".mako",
    ".mjs", ".py", ".txt",
}


def source_fingerprint(root=ROOT):
    """Hash every analyzed source, bundled file and pinned build input."""
    root = Path(root)
    paths = {Path(path) for path in SOURCE_PATHS}
    for pattern in SOURCE_GLOBS:
        paths.update(path.relative_to(root) for path in root.glob(pattern) if path.is_file())
    digest = hashlib.sha256()
    for relative in sorted(paths, key=lambda path: path.as_posix()):
        path = root / relative
        digest.update(relative.as_posix().encode("utf-8"))
        digest.update(b"\0")
        if not path.is_file():
            digest.update(b"<missing>")
            continue
        content = path.read_bytes()
        if path.suffix.lower() in TEXT_SUFFIXES or path.name == ".nvmrc":
            content = content.replace(b"\r\n", b"\n")
        digest.update(content)
        digest.update(b"\0")
    return digest.hexdigest()


def prepare(root=ROOT, channel="main"):
    metadata = {"schema": 1, "build_id": uuid.uuid4().hex,
                "built_at": datetime.now(timezone.utc).isoformat(), "channel": channel,
                "source_sha256": source_fingerprint(root)}
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
