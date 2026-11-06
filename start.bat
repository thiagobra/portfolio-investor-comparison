@echo off
rem Double-click launcher: starts serve.py (unless it is already running) and
rem opens the app in the default browser. index.html cannot be opened directly
rem from disk: the ES modules and /api/* calls need this local server.
rem Close the minimized "Portfolio Workstation server" window to stop it.
setlocal
cd /d "%~dp0"
set "URL=http://127.0.0.1:8420/"

rem Probe over HTTP, not netstat: netstat's state column is localised
rem (ESCUTANDO, ABHOEREN...), and Python on Windows will happily bind a
rem second server to a port that is already taken.
curl.exe -s -f -o nul "%URL%" && goto open

set "PY=python3"
where python3 >nul 2>&1 || set "PY=python"
start "Portfolio Workstation server" /min %PY% serve.py

rem Wait up to ~15 s for the server (slow PC); ping is the console-free sleep.
for /l %%i in (1,1,15) do (
  curl.exe -s -f -o nul "%URL%" && goto open
  ping -n 2 127.0.0.1 >nul
)
echo Server did not start on port 8420 - check the "Portfolio Workstation server" window.
pause
exit /b 1

:open
start "" "%URL%"
