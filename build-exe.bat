@echo off
REM ============================================================
REM  Build TaskNook.exe - a single-file, no-console Windows app
REM  (PyInstaller). Run from the repo root: build-exe.bat
REM  Output: dist\TaskNook.exe
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
  --add-data "backend;backend" ^
  --add-data "frontend\dist;frontend\dist" ^
  --hidden-import flask_cors ^
  --hidden-import flask_sqlalchemy ^
  desktop.py || goto :error

echo.
echo Done! dist\TaskNook.exe is ready to share/run standalone.
pause
goto :eof

:error
echo.
echo Something went wrong during the build.
popd
pause
endlocal
