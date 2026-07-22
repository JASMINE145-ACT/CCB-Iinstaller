@echo off
setlocal
chcp 65001 >nul 2>&1

set "INSTALL=%~dp0"
if "%INSTALL:~-1%"=="\" set "INSTALL=%INSTALL:~0,-1%"
set "PS=%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe"

echo.
echo CCB-Wanding - detect / purge non-primary install trees
echo.
echo Before Apply: fully quit AionUI (including system tray).
echo Keep order (this .cmd does NOT force keep = this folder):
echo   1) Registry NSIS InstallDir
echo   2) %%LOCALAPPDATA%%\Programs\CCB-Wanding
echo   3) This launcher only if 1/2 missing
echo User config is NEVER deleted:
echo   %%LOCALAPPDATA%%\CCB-Wanding\.claude
echo.

set "SCRIPT=%INSTALL%\scripts\purge-stale-wanding-installs.ps1"
if not exist "%SCRIPT%" (
    echo Missing: "%SCRIPT%"
    echo Re-run the CCB-Wanding installer or get this tool from IT.
    pause
    exit /b 1
)

echo [1/2] Dry-run detection...
echo.
REM Do NOT pass -KeepInstallDir here — that would purge the real Programs
REM tree when this .cmd is opened from a stale copy (D:\CCB-Wanding, etc.).
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -InvokerInstallDir "%INSTALL%"
set "DETECT_EXIT=%ERRORLEVEL%"

if "%DETECT_EXIT%"=="0" (
    echo.
    echo No stale copies found. Done.
    echo.
    pause
    exit /b 0
)

if "%DETECT_EXIT%"=="3" (
    echo.
    echo Could not resolve keep install. Abort.
    pause
    exit /b 3
)

echo.
echo Stale copies were listed above (dry-run).
choice /C YN /M "Delete owned footprints under those non-keep trees now"
if errorlevel 2 (
    echo Aborted — nothing deleted.
    pause
    exit /b 4
)

echo.
echo [2/2] Applying purge...
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -InvokerInstallDir "%INSTALL%" -Apply -Force
set "PURGE_EXIT=%ERRORLEVEL%"
echo.
if "%PURGE_EXIT%"=="0" (
    echo Purge finished. Prefer shortcuts from the Keep copy (Start Menu / Programs).
) else (
    echo Purge finished with errors — see log under %%LOCALAPPDATA%%\CCB-Wanding\logs\
)
echo.
pause
exit /b %PURGE_EXIT%
