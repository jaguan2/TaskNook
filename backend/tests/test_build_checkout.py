"""Release build inputs must survive a fresh checkout without byte changes."""
from pathlib import Path
import subprocess

import pytest


ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize("autocrlf", ["true", "false", "input"])
def test_checkout_keeps_build_text_lf_and_preserves_launcher_and_binary_rules(
    tmp_path, autocrlf
):
    source = tmp_path / "source"
    source.mkdir()
    (source / ".gitattributes").write_bytes((ROOT / ".gitattributes").read_bytes())
    # A multiline JSX attribute caused the Windows release verification failure:
    # CRLF becomes a literal escaped carriage return in the emitted JavaScript.
    jsx = b'<path d="M0 0\n  L4 8 Z" />\n'
    inputs = {
        "frontend/src/shape.jsx": jsx,
        "frontend/src/main.js": b'export const label = "TaskNook";\n',
        "frontend/index.html": b"<main>\n  TaskNook\n</main>\n",
        "frontend/src/index.css": b"body {\n  margin: 0;\n}\n",
        "frontend/package.json": b'{"name":"checkout-fixture"}\n',
        "frontend/public/texture.svg": b"<svg>\n  <path />\n</svg>\n",
        "build-exe.bat": b"@echo off\r\necho TaskNook\r\n",
        "TaskNook.command": b"#!/bin/sh\necho TaskNook\n",
        "TaskNook.exe": b"MZ\x00\r\n\x1a\n\x00",
        "frontend/public/texture.webp": b"RIFF\x00\r\nWEBP\x00\n",
    }
    for name, content in inputs.items():
        path = source / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def git(*args):
        subprocess.run(
            ("git", "-c", f"core.autocrlf={autocrlf}", *args),
            cwd=source, check=True, capture_output=True,
        )

    git("init", "--quiet")
    git("add", ".")
    checkout = tmp_path / "checkout"
    git("checkout-index", "--all", f"--prefix={checkout.as_posix()}/")

    for name, content in inputs.items():
        assert (checkout / name).read_bytes() == content, name
