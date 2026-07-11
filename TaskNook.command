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

# 2. Ensure desktop Python dependencies are present
echo "Checking Python dependencies..."
python3 -m pip install -r requirements-desktop.txt >/dev/null 2>&1 || true

# 3. Launch the native desktop app
echo "Opening TaskNook..."
python3 desktop.py
