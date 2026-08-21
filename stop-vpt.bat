@echo off
setlocal EnableDelayedExpansion
REM ============================================================================
REM  stop-vpt.bat — stop the Veloci Project Tracker server.
REM
REM  Finds whatever is LISTENING on VPT's port and ends it. Deliberately targets
REM  the port rather than "every node.exe", so it cannot take down unrelated
REM  Node processes you have running.
REM ============================================================================

REM Same precedence as server/paths.js and launch-vpt.bat: VPT_PORT, PORT, 5177.
if defined VPT_PORT (
    set "PORT=%VPT_PORT%"
) else (
    if not defined PORT set "PORT=5177"
)

echo.
echo   Stopping Veloci Project Tracker (port %PORT%)...
echo.

set "FOUND="
REM netstat lines look like:  TCP  127.0.0.1:5177  0.0.0.0:0  LISTENING  1234
for /f "tokens=5" %%P in ('netstat -ano -p TCP ^| findstr /R /C:":%PORT% .*LISTENING"') do (
    if not "%%P"=="0" (
        set "FOUND=1"
        echo   Ending process %%P
        taskkill /F /PID %%P >nul 2>&1
        if !ERRORLEVEL!==0 (
            echo     stopped.
        ) else (
            echo     could not stop %%P - try running this as Administrator.
        )
    )
)

if not defined FOUND (
    echo   Nothing was listening on port %PORT% - VPT is not running.
)

REM The launcher starts the server inside a "VPT server" console window; close
REM any leftover one so no empty window is stranded in the taskbar.
taskkill /F /FI "WINDOWTITLE eq VPT server*" >nul 2>&1

echo.
echo   Done.
timeout /t 2 >nul 2>&1
exit /b 0
