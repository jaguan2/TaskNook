@echo off
REM ============================================================
REM  Build TaskNook.exe - a single-file, no-console Windows app
REM  (PyInstaller). Run from the repo root: build-exe.bat
REM  Output: TaskNook.exe (repo root, so it's front and center on
REM  GitHub). frontend\dist is the Vite build that gets bundled
REM  INTO the exe - not the exe output dir.
REM ============================================================
setlocal
cd /d "%~dp0"
title Building TaskNook.exe

set "PY=python"
where py >nul 2>&1 && set "PY=py"

echo Building the frontend...
pushd frontend
if not exist "node_modules" call npm install || goto :error
call npm run build || goto :error
popd

echo Installing build dependencies (pywebview, waitress, pyinstaller)...
%PY% -m pip install -r requirements-desktop.txt pyinstaller || goto :error

echo Building TaskNook.exe (this can take a minute)...
REM  IMPORTANT: bundle backend source EXPLICITLY, never the whole folder.
REM  "--add-data backend;backend" would sweep in your local tasknook.db (real
REM  tasks), its .bak backups and __pycache__ — publishing personal data inside
REM  a committed binary. The frozen app reads its DB from %LOCALAPPDATA% anyway
REM  (see desktop.py), so a bundled copy is pure dead weight.
REM
REM  Every backend third-party import needs an explicit flag: backend/ ships as
REM  loose data, so PyInstaller's analyzer never sees its imports. Missing one
REM  only fails at runtime, silently (--windowed has no console). Verify with:
REM    set TASKNOOK_SELFTEST=1 && TaskNook.exe   (exit code must be 0)
%PY% -m PyInstaller --onefile --windowed --name TaskNook ^
  --distpath . ^
  --workpath build ^
  --add-data "backend\*.py;backend" ^
  --add-data "backend\migrations\*.py;backend\migrations" ^
  --add-data "backend\migrations\*.ini;backend\migrations" ^
  --add-data "backend\migrations\*.mako;backend\migrations" ^
  --add-data "backend\migrations\versions\*.py;backend\migrations\versions" ^
  --add-data "frontend\dist;frontend\dist" ^
  --hidden-import flask_cors ^
  --hidden-import flask_sqlalchemy ^
  --hidden-import flask_migrate ^
  --collect-all alembic ^
  --hidden-import logging.config ^
  desktop.py || goto :error

echo.
echo Done! TaskNook.exe (repo root) is ready to share/run standalone.
pause
goto :eof

:error
echo.
echo Something went wrong during the build.
pause
REM  Non-zero exit so CI and callers actually see the failure.
exit /b 1
