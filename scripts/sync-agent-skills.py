"""Verify vendored skill sources, or fetch the exact GitHub revisions in their lock file."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote
from urllib.request import Request, urlopen


def load_sources(root):
    lock_path = root / "docs/agent-skills/upstream.lock.json"
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    if lock.get("version") != 1:
        raise ValueError("Unsupported skill source lock version")
    paths = set()
    for source in lock["sources"]:
        if not re.fullmatch(r"[\w.-]+/[\w.-]+", source["repo"]):
            raise ValueError("Invalid GitHub repository")
        if not re.fullmatch(r"[0-9a-f]{40}", source["revision"]):
            raise ValueError("Pin each source to a full Git commit SHA")
        for entry in source["files"]:
            upstream = Path(entry["upstream"])
            if upstream.is_absolute() or ".." in upstream.parts:
                raise ValueError("Invalid upstream file path")
            target = (root / entry["local"]).resolve()
            if not target.is_relative_to(root / "docs/agent-skills/upstream"):
                raise ValueError("Skill sources must stay in docs/agent-skills/upstream")
            if target in paths:
                raise ValueError("Duplicate skill source destination")
            paths.add(target)
    return lock_path, lock


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--verify", action="store_true", help="Check local hashes without network access (default)")
    mode.add_argument("--fetch", action="store_true", help="Fetch pinned files and update their recorded hashes; review the diff")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    lock_path, lock = load_sources(root)
    pending, failures = [], []
    for source in lock["sources"]:
        for entry in source["files"]:
            target = root / entry["local"]
            if args.fetch:
                url = f"https://raw.githubusercontent.com/{source['repo']}/{source['revision']}/{quote(entry['upstream'], safe='/')}"
                request = Request(url, headers={"User-Agent": "repo-agent-skills-sync"})
                with urlopen(request, timeout=30) as response:
                    content = response.read()
                pending.append((target, content, entry))
            elif not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != entry["sha256"]:
                failures.append(entry["local"])
    if failures:
        raise ValueError("Skill source hash mismatch: " + ", ".join(failures))
    # Finish every download before changing the repository. Never run downloaded code.
    for target, content, entry in pending:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        entry["sha256"] = hashlib.sha256(content).hexdigest()
    if args.fetch:
        lock_path.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    count = sum(len(source["files"]) for source in lock["sources"])
    print(f"{'Fetched' if args.fetch else 'Verified'} {count} pinned skill source files")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError) as error:
        print(f"Skill sync failed: {error}", file=sys.stderr)
        sys.exit(1)
