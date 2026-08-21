@echo off
setlocal EnableDelayedExpansion
REM ============================================================================
REM  launch-vpt.bat — start Veloci Project Tracker and open it in the browser.
REM
REM  Safe to run twice: if VPT is already answering on its port it just opens
REM  the browser instead of starting a second server.
REM
REM  Wire this to login via Task Scheduler or the Startup folder — see README.md.
REM ============================================================================

REM %~dp0 is this script's own folder (with trailing backslash), so the repo can
REM live anywhere — including under OneDrive — without editing this file.
cd /d "%~dp0"

REM Port precedence matches server/paths.js: VPT_PORT, then PORT, then 5177.
REM Whatever we settle on is exported to the child `npm start`, so the launcher
REM and the server can never disagree about which port to use.
if defined VPT_PORT (
    set "PORT=%VPT_PORT%"
) else (
    if not defined PORT set "PORT=5177"
)

set "URL=http://localhost:%PORT%"
set "HEALTH=%URL%/api/health"

echo.
echo   Veloci Project Tracker
echo   ----------------------
echo   folder: %CD%
echo.

REM ---------------------------------------------------------------- already up?
call :probe
if "!UP!"=="1" (
    echo   Already running on port %PORT% - opening the browser.
    start "" "%URL%"
    exit /b 0
)

REM ------------------------------------------------------------------ sanity
if not exist "node_modules\" (
    echo   [!] node_modules is missing. Run "npm install" here first.
    echo.
    pause
    exit /b 1
)

REM -------------------------------------------------------------------- start
REM Minimized rather than hidden: a .bat cannot spawn a truly hidden process
REM without a helper (VBScript/PowerShell -WindowStyle Hidden), and a stray
REM hidden node is worse than a visible one you can find and close. The window
REM sits minimized in the taskbar; stop-vpt.bat closes it cleanly.
echo   Starting VPT (this builds the UI on first run - can take a minute)...
start "VPT server" /min cmd /c "npm start"

REM ------------------------------------------------------- wait for readiness
REM Never open the browser before the server answers, or the user gets a
REM connection-refused page and assumes it's broken.
echo   Waiting for the server to come up...
set /a TRIES=0
:waitloop
set /a TRIES+=1
REM timeout is unavailable in some non-interactive contexts; ping is universal.
ping -n 2 127.0.0.1 >nul 2>&1
call :probe
if "!UP!"=="1" goto ready
if !TRIES! GEQ 90 goto timedout
if !TRIES!==15 echo   ...still building, hang on...
if !TRIES!==45 echo   ...first build is slow, still waiting...
goto waitloop

:ready
echo   Up after roughly !TRIES! seconds. Opening %URL%
start "" "%URL%"
exit /b 0

:timedout
echo.
echo   [!] VPT did not answer on %PORT% within ~3 minutes.
echo       Check the minimized "VPT server" window for the error,
echo       or run "npm start" here to see it directly.
echo.
pause
exit /b 1

REM --------------------------------------------------------------- subroutine
REM Sets UP=1 when the health endpoint answers. curl ships with Windows 10+;
REM if it is somehow absent we fall back to PowerShell.
:probe
set "UP="
where curl >nul 2>&1
if %ERRORLEVEL%==0 (
    curl -s -o nul -m 2 "%HEALTH%" >nul 2>&1
    if !ERRORLEVEL!==0 set "UP=1"
) else (
    powershell -NoProfile -Command "try{Invoke-WebRequest -Uri '%HEALTH%' -TimeoutSec 2 -UseBasicParsing|Out-Null;exit 0}catch{exit 1}" >nul 2>&1
    if !ERRORLEVEL!==0 set "UP=1"
)
exit /b 0
