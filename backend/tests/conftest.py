import os
import sys
import tempfile

# create_app() runs at import time (app.py's module-level `app = create_app()`),
# which migrates whatever TASKNOOK_DB points at. Redirect it to a throwaway file
# BEFORE anything imports app, so running the tests can never touch — or
# migrate — the real dev database.
os.environ.setdefault(
    "TASKNOOK_DB", os.path.join(tempfile.mkdtemp(prefix="tasknook-tests-"), "import.db")
)

# Make backend/ importable (app, models, schema) without installing a package.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
