"""Package TaskNook for Windows and verify the committed download.

The data-file and hidden-import lists live here so the local release command
and CI cannot quietly package different applications.
"""
from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parents[1]

DATA_SPECS = (
    ("build/desktop-build.json", "."),
    ("backend/*.py", "backend"),
    ("backend/migrations/*.py", "backend/migrations"),
    ("backend/migrations/*.ini", "backend/migrations"),
    ("backend/migrations/*.mako", "backend/migrations"),
    ("backend/migrations/versions/*.py", "backend/migrations/versions"),
    ("frontend/dist", "frontend/dist"),
)

HIDDEN_IMPORTS = (
    "flask_sqlalchemy",
    "flask_migrate",
    "logging.config",
)


class ArtifactError(RuntimeError):
    """The committed executable does not represent the checked-out source."""


def package_args() -> list[str]:
    args = [
        "--onefile",
        "--windowed",
        "--name",
        "TaskNook",
        "--distpath",
        ".",
        "--workpath",
        "build",
    ]
    for source, destination in DATA_SPECS:
        args.extend(("--add-data", f"{source}{os.pathsep}{destination}"))
    for module in HIDDEN_IMPORTS:
        args.extend(("--hidden-import", module))
    args.extend(("--collect-all", "alembic", "--noconfirm", "desktop.py"))
    return args


def package(root: Path = ROOT) -> None:
    from PyInstaller.__main__ import run

    previous = Path.cwd()
    try:
        os.chdir(root)
        run(package_args())
    finally:
        os.chdir(previous)


def _manifest_module():
    path = Path(__file__).with_name("desktop_update_manifest.py")
    spec = importlib.util.spec_from_file_location("tasknook_desktop_update_manifest", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def release(root: Path = ROOT, channel: str = "main") -> dict:
    manifest = _manifest_module()
    manifest.prepare(root, channel)
    package(root)
    return manifest.publish(root)


def _archive_name(path: Path | str) -> str:
    return str(path).replace("\\", "/")


def expected_bundle_files(root: Path = ROOT) -> dict[str, Path]:
    expected: dict[str, Path] = {}
    for source, destination in DATA_SPECS:
        if source == "build/desktop-build.json":
            continue
        source_path = root / source
        if source_path.is_dir():
            files = (path for path in source_path.rglob("*") if path.is_file())
            for path in files:
                key = Path(destination) / path.relative_to(source_path)
                expected[_archive_name(key)] = path
            continue
        for path in root.glob(source):
            if path.is_file():
                expected[_archive_name(Path(destination) / path.name)] = path
    return expected


def _read_manifest(root: Path) -> dict:
    try:
        manifest = json.loads((root / "desktop-update.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ArtifactError(f"desktop-update.json is unreadable: {exc}") from exc
    required = {
        "schema", "build_id", "built_at", "channel", "source_sha256", "sha256", "size",
    }
    if not isinstance(manifest, dict) or set(manifest) != required or not _valid_manifest(manifest):
        raise ArtifactError("desktop-update.json has an invalid build identity, hash, size, or channel")
    return manifest


def _valid_manifest(value: dict) -> bool:
    if type(value.get("schema")) is not int or value["schema"] != 1:
        return False
    if value.get("channel") not in {"main", "dev"}:
        return False
    if not isinstance(value.get("build_id"), str) or not re.fullmatch(r"[0-9a-f]{32}", value["build_id"]):
        return False
    if not isinstance(value.get("sha256"), str) or not re.fullmatch(r"[0-9a-f]{64}", value["sha256"]):
        return False
    if not isinstance(value.get("source_sha256"), str) or not re.fullmatch(
        r"[0-9a-f]{64}", value["source_sha256"]
    ):
        return False
    if isinstance(value.get("size"), bool) or not isinstance(value.get("size"), int) or value["size"] < 0:
        return False
    try:
        built_at = datetime.fromisoformat(value["built_at"])
    except (TypeError, ValueError):
        return False
    return built_at.utcoffset() is not None


def _comparable_bytes(path: Path, content: bytes) -> bytes:
    if path.suffix.lower() in {".py", ".ini", ".mako"}:
        return content.replace(b"\r\n", b"\n")
    return content


def changed_paths(root: Path, base: str | None) -> set[str]:
    if not base or not base.strip("0"):
        return set()
    result = subprocess.run(
        ("git", "diff", "--name-only", f"{base}...HEAD", "--"),
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    return {_archive_name(line.strip()) for line in result.stdout.splitlines() if line.strip()}


def require_release_pair(paths: set[str]) -> None:
    runtime_files = {
        "desktop.py",
        "desktop_updates.py",
        "build-exe.bat",
        "requirements-desktop.txt",
        "requirements-desktop-build.txt",
        "scripts/desktop_package.py",
        "scripts/desktop_update_manifest.py",
    }

    def reaches_executable(path: str) -> bool:
        if path in runtime_files:
            return True
        if path.startswith("backend/"):
            return not path.startswith("backend/tests/")
        if path.startswith("frontend/"):
            return ".test." not in path and not path.startswith("frontend/art-sheet/")
        return False

    runtime_changed = any(reaches_executable(path) for path in paths)
    released = {"TaskNook.exe", "desktop-update.json"}
    if runtime_changed and not released.issubset(paths):
        missing = ", ".join(sorted(released - paths))
        raise ArtifactError(f"runtime files changed without a matching desktop release: {missing}")
    if paths & released and not released.issubset(paths):
        missing = ", ".join(sorted(released - paths))
        raise ArtifactError(f"desktop release files must change together: {missing}")


def verify(root: Path = ROOT, reader_cls=None, base: str | None = None) -> dict:
    executable = root / "TaskNook.exe"
    if not executable.is_file():
        raise ArtifactError("TaskNook.exe is missing")

    manifest = _read_manifest(root)
    size = executable.stat().st_size
    digest = hashlib.sha256(executable.read_bytes()).hexdigest()
    if manifest["size"] != size or manifest["sha256"] != digest:
        raise ArtifactError("TaskNook.exe does not match desktop-update.json")

    if reader_cls is None:
        try:
            from PyInstaller.archive.readers import CArchiveReader
        except (ImportError, AttributeError) as exc:
            raise ArtifactError(
                "PyInstaller's archive reader is unavailable; install requirements-desktop-build.txt"
            ) from exc
        reader_cls = CArchiveReader
    try:
        archive = reader_cls(str(executable))
    except Exception as exc:
        raise ArtifactError(
            "TaskNook.exe cannot be inspected with the supported PyInstaller version; rebuild it"
        ) from exc
    try:
        embedded = json.loads(archive.extract("desktop-build.json"))
    except (KeyError, TypeError, json.JSONDecodeError) as exc:
        raise ArtifactError(f"embedded desktop-build.json is invalid: {exc}") from exc
    identity = {
        key: manifest[key]
        for key in ("schema", "build_id", "built_at", "channel", "source_sha256")
    }
    if embedded != identity:
        raise ArtifactError("embedded build identity does not match desktop-update.json")

    if manifest["source_sha256"] != _manifest_module().source_fingerprint(root):
        raise ArtifactError("TaskNook.exe was built from different desktop runtime sources")

    expected = expected_bundle_files(root)
    archive_names = {_archive_name(name): name for name in archive.toc}
    bundled = {
        name for name in archive_names
        if name.startswith("backend/") or name.startswith("frontend/dist/")
    }
    missing = sorted(set(expected) - bundled)
    extra = sorted(bundled - set(expected))
    if missing or extra:
        detail = []
        if missing:
            detail.append(f"missing: {', '.join(missing[:5])}")
        if extra:
            detail.append(f"extra: {', '.join(extra[:5])}")
        raise ArtifactError("bundled file list differs from source (" + "; ".join(detail) + ")")
    changed = [
        name for name, path in expected.items()
        if _comparable_bytes(path, archive.extract(archive_names[name]))
        != _comparable_bytes(path, path.read_bytes())
    ]
    if changed:
        raise ArtifactError("bundled files differ from source: " + ", ".join(changed[:5]))
    require_release_pair(changed_paths(root, base))
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("build", "package", "verify"))
    parser.add_argument("--channel", choices=("main", "dev"), default="main")
    parser.add_argument("--base", help="Git base SHA for the release-pair scope check")
    args = parser.parse_args()
    if args.action == "build":
        manifest = release(channel=args.channel)
        print(f"built TaskNook.exe: {manifest['build_id']}")
    elif args.action == "package":
        package()
    else:
        manifest = verify(base=args.base)
        print(f"committed TaskNook.exe verified: {manifest['build_id']}")


if __name__ == "__main__":
    main()
