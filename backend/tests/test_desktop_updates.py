"""Update detection and publishing without the network or desktop launch side effects."""
import importlib.util
import json
from pathlib import Path
from unittest.mock import Mock

import pytest

ROOT = Path(__file__).resolve().parents[2]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


updates = load_module("desktop_updates", ROOT / "desktop_updates.py")
publisher = load_module("desktop_update_manifest", ROOT / "scripts/desktop_update_manifest.py")
CURRENT = {"schema": 1, "build_id": "a" * 32, "built_at": "2026-09-01T00:00:00+00:00", "channel": "main"}
NEW = {**CURRENT, "build_id": "b" * 32, "built_at": "2026-09-02T00:00:00+00:00"}


@pytest.mark.parametrize("remote", [CURRENT, {}, [], None, {**NEW, "built_at": "bad"},
    {**NEW, "built_at": "2026-08-01T00:00:00+00:00"}, {**NEW, "channel": "dev"},
    {**NEW, "built_at": "2026-10-01"}, {**NEW, "build_id": "not-a-build"}])
def test_does_not_offer_same_older_malformed_or_other_channel(remote):
    assert not updates.newer_build(CURRENT, remote)


def test_download_requires_consent_and_ignores_remote_url(tmp_path):
    confirm, browser = Mock(return_value=True), Mock(return_value=True)
    remote = {**NEW, "download_url": "https://example.com/untrusted.exe"}
    result = updates.check_once(CURRENT, tmp_path / "state.json", confirm,
        fetch=lambda _: remote, open_url=browser, now=100000)
    assert result == "download-opened"
    confirm.assert_called_once()
    browser.assert_called_once_with("https://github.com/jaguan2/TaskNook/raw/refs/heads/main/TaskNook.exe")
    assert "replace your old TaskNook.exe" in confirm.call_args.args[1]


def test_decline_is_remembered_across_restarts_and_only_reminds_next_day(tmp_path):
    path, confirm, browser = tmp_path / "state.json", Mock(return_value=False), Mock()
    def check(now):
        return updates.check_once(CURRENT, path, confirm, fetch=lambda _: NEW, open_url=browser, now=now)
    assert check(100000) == "declined"
    assert check(100001) == "throttled"
    assert check(100000 + updates.CHECK_INTERVAL) == "deferred"
    assert check(100000 + updates.PROMPT_INTERVAL) == "declined"
    assert confirm.call_count == 2
    browser.assert_not_called()


def test_offline_does_not_prompt_or_interrupt_and_retries_later(tmp_path):
    fetch, confirm = Mock(side_effect=OSError("offline")), Mock()
    path = tmp_path / "state.json"
    assert updates.check_once(CURRENT, path, confirm, fetch=fetch, now=100000) == "unavailable"
    assert updates.check_once(CURRENT, path, confirm, fetch=fetch, now=100001) == "throttled"
    confirm.assert_not_called()


def test_closed_during_fetch_never_prompts(tmp_path):
    closed, confirm = Mock(side_effect=[False, True]), Mock()
    assert updates.check_once(CURRENT, tmp_path / "state.json", confirm,
        fetch=lambda _: NEW, closed=closed) == "deferred"
    confirm.assert_not_called()


@pytest.mark.parametrize("state", ['broken json', '[]', '{"checked_at": "bad"}',
    '{"channel": "main", "checked_at": 99999999999}'])
def test_corrupt_state_or_clock_rollback_does_not_permanently_suppress_updates(tmp_path, state):
    path = tmp_path / "state.json"
    path.write_text(state)
    assert updates.check_once(CURRENT, path, Mock(return_value=False), fetch=lambda _: NEW, now=100000) == "declined"


def test_network_manifest_is_size_bounded(monkeypatch):
    response = Mock()
    response.__enter__ = Mock(return_value=response)
    response.__exit__ = Mock(return_value=False)
    response.read.return_value = b"x" * (updates.MAX_MANIFEST + 1)
    monkeypatch.setattr(updates.urllib.request, "urlopen", Mock(return_value=response))
    with pytest.raises(ValueError, match="too large"):
        updates.fetch_manifest("main")
    response.read.assert_called_once_with(updates.MAX_MANIFEST + 1)


def test_publish_identifies_the_exact_bundled_build_and_artifact(tmp_path):
    local = publisher.prepare(tmp_path, "dev")
    (tmp_path / "TaskNook.exe").write_bytes(b"test artifact")
    published = publisher.publish(tmp_path)
    assert updates.valid_build(published)
    assert published["build_id"] == local["build_id"]
    assert published["size"] == 13
    assert len(published["sha256"]) == 64
    assert json.loads((tmp_path / "desktop-update.json").read_text()) == published
    assert not updates.newer_build(local, published)


def test_failed_publish_keeps_previous_manifest(tmp_path):
    publisher.prepare(tmp_path)
    target = tmp_path / "desktop-update.json"
    target.write_text('previous')
    with pytest.raises(FileNotFoundError):
        publisher.publish(tmp_path)
    assert target.read_text() == 'previous'


@pytest.mark.parametrize("previous_result", [CURRENT, OSError("offline")])
def test_reopening_checks_again_even_after_a_recent_check(tmp_path, previous_result):
    path, confirm = tmp_path / "state.json", Mock(return_value=False)
    fetch = Mock(side_effect=[previous_result, NEW])
    updates.check_once(CURRENT, path, confirm, fetch=fetch, now=100000, startup=True)
    assert updates.check_once(CURRENT, path, confirm, fetch=fetch, now=100001,
                              startup=True) == "declined"
    assert fetch.call_count == 2
    confirm.assert_called_once()


def test_startup_rechecks_without_repeating_a_declined_prompt(tmp_path):
    path, confirm, fetch = tmp_path / "state.json", Mock(return_value=False), Mock(return_value=NEW)
    assert updates.check_once(CURRENT, path, confirm, fetch=fetch, now=100000,
                              startup=True) == "declined"
    assert updates.check_once(CURRENT, path, confirm, fetch=fetch, now=100001,
                              startup=True) == "deferred"
    assert fetch.call_count == 2
    confirm.assert_called_once()


def test_watcher_bypasses_cooldown_only_on_launch(tmp_path, monkeypatch):
    (tmp_path / "desktop-build.json").write_text(json.dumps(CURRENT))
    monkeypatch.delenv("TASKNOOK_NO_UPDATE_CHECK", raising=False)
    window = Mock()
    window.events.closed.wait.side_effect = [False, False, False, True]
    check = Mock()
    monkeypatch.setattr(updates, "check_once", check)
    updates.watch_updates(window, tmp_path, tmp_path)
    assert [call.kwargs["startup"] for call in check.call_args_list] == [True, False]
