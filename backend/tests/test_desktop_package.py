"""The committed desktop artifact gate and shared packager definition."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from unittest.mock import Mock

import pytest


ROOT = Path(__file__).resolve().parents[2]
manifest_spec = importlib.util.spec_from_file_location(
    "desktop_update_manifest", ROOT / "scripts/desktop_update_manifest.py"
)
manifest_module = importlib.util.module_from_spec(manifest_spec)
manifest_spec.loader.exec_module(manifest_module)
source_fingerprint = manifest_module.source_fingerprint
spec = importlib.util.spec_from_file_location(
    "desktop_package", ROOT / "scripts/desktop_package.py"
)
desktop_package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(desktop_package)


def artifact_fixture(tmp_path):
    backend = tmp_path / "backend" / "app.py"
    frontend = tmp_path / "frontend" / "dist" / "index.html"
    backend.parent.mkdir(parents=True)
    frontend.parent.mkdir(parents=True)
    backend.write_bytes(b"print('hello')\r\n")
    frontend.write_bytes(b"<main>TaskNook</main>\n")

    executable = tmp_path / "TaskNook.exe"
    executable.write_bytes(b"frozen artifact")
    identity = {
        "schema": 1,
        "build_id": "a" * 32,
        "built_at": "2026-10-12T12:00:00+00:00",
        "channel": "main",
        "source_sha256": source_fingerprint(tmp_path),
    }
    manifest = {
        **identity,
        "sha256": hashlib.sha256(executable.read_bytes()).hexdigest(),
        "size": executable.stat().st_size,
    }
    (tmp_path / "desktop-update.json").write_text(json.dumps(manifest), encoding="utf-8")

    files = {
        "desktop-build.json": json.dumps(identity).encode(),
        "backend\\app.py": b"print('hello')\n",
        "frontend\\dist\\index.html": frontend.read_bytes(),
    }

    class Reader:
        def __init__(self, _path):
            self.toc = {name: None for name in files}

        def extract(self, name):
            return files[name]

    return manifest, files, Reader


def test_package_args_are_the_single_packaging_definition():
    args = desktop_package.package_args()
    joined = " ".join(args)
    for module in desktop_package.HIDDEN_IMPORTS:
        assert f"--hidden-import {module}" in joined
    for source, destination in desktop_package.DATA_SPECS:
        assert f"{source}{os.pathsep}{destination}" in args
    assert "--collect-all alembic" in joined
    assert args[-1] == "desktop.py"


def test_verify_matches_manifest_identity_and_all_loose_runtime_files(tmp_path):
    manifest, _files, reader = artifact_fixture(tmp_path)

    assert desktop_package.verify(tmp_path, reader_cls=reader) == manifest


def test_verify_rejects_a_stale_bundled_file(tmp_path):
    _manifest, files, reader = artifact_fixture(tmp_path)
    files["frontend\\dist\\index.html"] = b"old frontend"

    with pytest.raises(desktop_package.ArtifactError, match="differ from source"):
        desktop_package.verify(tmp_path, reader_cls=reader)


def test_verify_rejects_stale_analyzed_desktop_source(tmp_path):
    _manifest, _files, reader = artifact_fixture(tmp_path)
    (tmp_path / "desktop.py").write_text("print('changed after packaging')\n", encoding="utf-8")

    with pytest.raises(desktop_package.ArtifactError, match="different desktop runtime sources"):
        desktop_package.verify(tmp_path, reader_cls=reader)


@pytest.mark.parametrize(
    "field, value",
    [
        ("schema", True),
        ("schema", 1.0),
        ("build_id", "G" * 32),
        ("built_at", "2026-10-12"),
        ("channel", "nightly"),
        ("sha256", 123),
        ("source_sha256", "not-a-source-hash"),
        ("size", 1.5),
        ("size", -1),
    ],
)
def test_verify_rejects_malformed_public_manifest_fields(tmp_path, field, value):
    manifest, _files, reader = artifact_fixture(tmp_path)
    manifest[field] = value
    (tmp_path / "desktop-update.json").write_text(json.dumps(manifest), encoding="utf-8")

    with pytest.raises(desktop_package.ArtifactError, match="invalid build identity"):
        desktop_package.verify(tmp_path, reader_cls=reader)


def test_changed_paths_uses_the_merge_base_range(monkeypatch, tmp_path):
    run = Mock(return_value=Mock(stdout="frontend/src/App.jsx\n"))
    monkeypatch.setattr(desktop_package.subprocess, "run", run)

    assert desktop_package.changed_paths(tmp_path, "abc123") == {"frontend/src/App.jsx"}
    run.assert_called_once_with(
        ("git", "diff", "--name-only", "abc123...HEAD", "--"),
        cwd=tmp_path,
        check=True,
        capture_output=True,
        text=True,
    )


@pytest.mark.parametrize(
    "paths, message",
    [
        ({"frontend/src/App.jsx"}, "runtime files changed"),
        ({"TaskNook.exe"}, "must change together"),
        ({"desktop-update.json"}, "must change together"),
    ],
)
def test_release_pair_is_required_for_runtime_and_artifact_changes(paths, message):
    with pytest.raises(desktop_package.ArtifactError, match=message):
        desktop_package.require_release_pair(paths)


def test_release_pair_accepts_a_runtime_change_with_both_artifacts():
    desktop_package.require_release_pair(
        {"desktop.py", "TaskNook.exe", "desktop-update.json"}
    )


def test_release_pair_does_not_require_a_rebuild_for_tests_only():
    desktop_package.require_release_pair(
        {"backend/tests/test_room.py", "frontend/src/store.test.jsx"}
    )
