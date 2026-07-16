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
%PY% -m PyInstaller --onefile --windowed --name TaskNook ^
  --distpath . ^
  --workpath build ^
  --add-data "backend;backend" ^
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
popd
pause
endlocal
