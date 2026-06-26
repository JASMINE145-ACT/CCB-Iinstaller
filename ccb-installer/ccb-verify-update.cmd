@echo off
setlocal
chcp 65001 >nul 2>&1

set "INSTALL=%~dp0"
if "%INSTALL:~-1%"=="\" set "INSTALL=%INSTALL:~0,-1%"
set "PS=%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe"

echo.
echo CCB-Wanding update server check (VPS manifest + AionUI bundle)
echo.
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%INSTALL%\scripts\verify-update-server.ps1" -InstallDir "%INSTALL%"
set "EXIT=%ERRORLEVEL%"
echo.
if not "%CCB_NO_PAUSE%"=="1" pause
exit /b %EXIT%
