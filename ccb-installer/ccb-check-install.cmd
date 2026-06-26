@echo off
setlocal
chcp 65001 >nul 2>&1

set "INSTALL=%~dp0"
if "%INSTALL:~-1%"=="\" set "INSTALL=%INSTALL:~0,-1%"
set "CONFIG=%LOCALAPPDATA%\CCB-Wanding\.claude"
set "LOG=%LOCALAPPDATA%\CCB-Wanding\logs\check-install.log"
set "PS=%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe"

if not exist "%LOCALAPPDATA%\CCB-Wanding\logs" mkdir "%LOCALAPPDATA%\CCB-Wanding\logs" >nul 2>&1

echo.
echo CCB-Wanding install check
echo Log file: "%LOG%"
echo.
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%INSTALL%\scripts\test-install-health.ps1" -InstallDir "%INSTALL%" -ConfigDir "%CONFIG%" -LogFile "%LOG%"
set "CHECK_EXIT=%ERRORLEVEL%"
echo.
echo --- Update server (VPS manifest) ---
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%INSTALL%\scripts\verify-update-server.ps1" -InstallDir "%INSTALL%"
set "UPDATE_EXIT=%ERRORLEVEL%"
echo.
type "%LOG%"
echo.
if not "%CHECK_EXIT%"=="0" (
    echo Install health check failed (exit=%CHECK_EXIT%).
    if not "%CCB_NO_PAUSE%"=="1" pause
    exit /b %CHECK_EXIT%
)
if not "%UPDATE_EXIT%"=="0" (
    echo Update server check failed (exit=%UPDATE_EXIT%) — VPS manifest may be empty.
)
if not "%CCB_NO_PAUSE%"=="1" pause
exit /b %CHECK_EXIT%
