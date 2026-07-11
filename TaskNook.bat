@echo off
REM ============================================================
REM  TaskNook - one-click desktop launcher (Windows)
REM  Double-click this file to build (first run) and open the app.
REM ============================================================
setlocal
cd /d "%~dp0"
title TaskNook

REM --- 0. Find Python: prefer the "py" launcher, fall back to "python" ---
set "PY=python"
where py >nul 2>&1 && set "PY=py"

REM --- 1. Build the frontend the first time (creates frontend\dist) ---
if not exist "frontend\dist\index.html" (
    echo Building the TaskNook frontend ^(first launch only^)...
    pushd frontend
    if not exist "node_modules" (
        echo Installing frontend packages...
        call npm install || goto :error
    )
    call npm run build || goto :error
    popd
)

REM --- 2. Make sure the desktop Python dependencies are present ---
echo Checking Python dependencies...
%PY% -m pip install -r requirements-desktop.txt >nul 2>&1

REM --- 3. Launch the native desktop app ---
echo Opening TaskNook...
%PY% desktop.py
goto :eof

:error
echo.
echo Something went wrong during setup. Make sure Node.js and Python are installed.
popd
pause
endlocal
