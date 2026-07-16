#!/usr/bin/env bash
# ============================================================
#  TaskNook - one-click desktop launcher (macOS / Linux)
#  On macOS you can double-click this file in Finder.
#  (First run:  chmod +x TaskNook.command)
# ============================================================
set -e
cd "$(dirname "$0")"

# 1. Build the frontend the first time (creates frontend/dist)
if [ ! -f "frontend/dist/index.html" ]; then
  echo "Building the TaskNook frontend (first launch only)..."
  ( cd frontend && { [ -d node_modules ] || npm install; } && npm run build )
fi

# 2. Ensure desktop Python dependencies are present.
# Not silenced with `|| true`: a failed install used to be cosmetic, but the
# app now imports flask_migrate at startup, so swallowing the error just trades
# a clear message here for an ImportError traceback later.
echo "Checking Python dependencies..."
python3 -m pip install -r requirements-desktop.txt || {
  echo
  echo "Could not install TaskNook's Python dependencies."
  echo "Try: python3 -m pip install -r requirements-desktop.txt"
  exit 1
}

# 3. Launch the native desktop app
echo "Opening TaskNook..."
python3 desktop.py
