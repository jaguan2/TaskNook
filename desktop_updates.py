"""Optional desktop update notifications; importing this module has no side effects.

The repository remains the distribution channel. We never execute a remote URL
or replace a running executable: accepting opens the fixed GitHub download.
"""
import json
import math
import os
from pathlib import Path
import time
import urllib.request
import webbrowser
from datetime import datetime

REPOSITORY = "jaguan2/TaskNook"
CHECK_INTERVAL = 6 * 60 * 60
PROMPT_INTERVAL = 24 * 60 * 60
MAX_MANIFEST = 8192


def read_json(path):
    try:
        with Path(path).open("rb") as handle:
            return json.loads(handle.read(MAX_MANIFEST))
    except (OSError, ValueError):
        return {}


def valid_build(value):
    if not isinstance(value, dict) or value.get("schema") != 1:
        return False
    build_id = value.get("build_id")
    if not isinstance(build_id, str) or len(build_id) != 32:
        return False
    try:
        int(build_id, 16)
        date = datetime.fromisoformat(value["built_at"])
        return date.utcoffset() is not None and value.get("channel") in ("main", "dev")
    except (ValueError, TypeError, KeyError):
        return False


def newer_build(current, remote):
    return (
        valid_build(current) and valid_build(remote)
        and current["channel"] == remote["channel"]
        and current["build_id"] != remote["build_id"]
        and datetime.fromisoformat(remote["built_at"]) > datetime.fromisoformat(current["built_at"])
    )


def fetch_manifest(channel):
    # Channel comes from the bundled build, never from network-provided URLs.
    if channel not in ("main", "dev"):
        raise ValueError("Unknown update channel")
    url = f"https://raw.githubusercontent.com/{REPOSITORY}/{channel}/desktop-update.json"
    request = urllib.request.Request(url, headers={"User-Agent": "TaskNook-update-check", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(request, timeout=8) as response:
        data = response.read(MAX_MANIFEST + 1)
    if len(data) > MAX_MANIFEST:
        raise ValueError("Update manifest is too large")
    return json.loads(data)


def _recent(value, now, interval):
    return isinstance(value, (int, float)) and math.isfinite(value) and 0 <= now - value < interval


def _save_state(path, state):
    try:
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(state), encoding="utf-8")
        temporary.replace(path)
    except OSError:
        pass  # Storage restrictions must never prevent using the app.


def check_once(current, state_path, confirm, *, fetch=fetch_manifest,
               open_url=webbrowser.open, now=None, closed=lambda: False, startup=False):
    """One bounded check. Offline/missing/bad feeds simply leave the app alone."""
    if not valid_build(current) or closed():
        return "disabled"
    now = time.time() if now is None else now
    state_path = Path(state_path)
    state = read_json(state_path)
    if not isinstance(state, dict) or state.get("channel") != current["channel"]:
        state = {"channel": current["channel"]}
    if not startup and _recent(state.get("checked_at"), now, CHECK_INTERVAL):
        return "throttled"
    state["checked_at"] = now
    _save_state(state_path, state)
    try:
        remote = fetch(current["channel"])
        if not newer_build(current, remote):
            return "current"
        if closed() or _recent(state.get("prompted_at"), now, PROMPT_INTERVAL):
            return "deferred"
        state["prompted_at"] = now
        _save_state(state_path, state)
        date = datetime.fromisoformat(remote["built_at"]).strftime("%b %d, %Y")
        accepted = confirm(
            "TaskNook update available",
            f"A newer TaskNook build ({date}) is available.\n\n"
            "Would you like to open the download in your browser?\n\n"
            "After downloading, close TaskNook, replace your old TaskNook.exe "
            "with the new file, and open it. Your tasks and settings stay saved.\n\n"
            "Cancel to keep working; we'll remind you another day.",
        )
        if accepted and not closed():
            # Ignore any download_url supplied by the feed.
            url = f"https://github.com/{REPOSITORY}/raw/refs/heads/{current['channel']}/TaskNook.exe"
            if not open_url(url):
                return "browser-unavailable"
            return "download-opened"
        return "declined"
    except Exception:
        # Optional network/UI work must not take down the desktop or its timer.
        return "unavailable"


def watch_updates(window, base_dir, data_dir):
    """Runs on pywebview's background thread; closing cancels all future checks."""
    if os.environ.get("TASKNOOK_NO_UPDATE_CHECK"):
        return
    current = read_json(Path(base_dir) / "desktop-build.json")
    if not valid_build(current):
        return
    state_path = Path(data_dir) / "update-check.json"
    startup = True
    while not window.events.closed.wait(10):
        check_once(current, state_path, window.create_confirmation_dialog,
                   closed=window.events.closed.is_set, startup=startup)
        startup = False
        if window.events.closed.wait(CHECK_INTERVAL):
            break
