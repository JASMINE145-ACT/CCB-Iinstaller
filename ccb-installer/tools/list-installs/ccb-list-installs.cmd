@echo off
setlocal
chcp 65001 >nul 2>&1

set "INSTALL=%~dp0"
if "%INSTALL:~-1%"=="\" set "INSTALL=%INSTALL:~0,-1%"
set "PS=%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "LOGDIR=%LOCALAPPDATA%\CCB-Wanding\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1

echo.
echo CCB-Wanding - list all install locations on this PC
echo.

set "SCRIPT=%INSTALL%\scripts\find-wanding-installs.ps1"
if not exist "%SCRIPT%" (
    echo Missing: "%SCRIPT%"
    echo Re-run the CCB-Wanding installer or copy this tool from IT.
    pause
    exit /b 1
)

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -InvokerInstallDir "%INSTALL%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo Note: exit %EXIT_CODE% means multiple copies or none found - see lines above.
)
echo Send the log file path above to IT if you need help.
echo.
pause
exit /b %EXIT_CODE%
