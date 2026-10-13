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

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%V"
if not "%NODE_MAJOR%"=="20" (
  echo TaskNook release builds require Node 20; found major %NODE_MAJOR%.
  goto :error
)

echo Building the frontend...
pushd frontend
if not exist "node_modules" call npm install || goto :error
call npm run build || goto :error
popd

echo Installing pinned desktop build dependencies...
%PY% -m pip install -r requirements-desktop-build.txt || goto :error

echo Building TaskNook.exe (this can take a minute)...
if not defined TASKNOOK_UPDATE_CHANNEL set "TASKNOOK_UPDATE_CHANNEL=main"
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
%PY% scripts\desktop_package.py build --channel "%TASKNOOK_UPDATE_CHANNEL%" || goto :error

echo.
echo Done! TaskNook.exe (repo root) is ready to share/run standalone.
echo Commit TaskNook.exe and desktop-update.json together to publish the update.
pause
goto :eof

:error
echo.
echo Something went wrong during the build.
pause
REM  Non-zero exit so CI and callers actually see the failure.
exit /b 1
