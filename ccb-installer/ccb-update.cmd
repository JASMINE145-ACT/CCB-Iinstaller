@echo off
setlocal
chcp 65001 >nul 2>&1

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"

if exist "%CCB_INSTALL_DIR%\scripts\ccb-update-info.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%CCB_INSTALL_DIR%\scripts\ccb-update-info.ps1"
) else (
    echo.
    echo CCB upgrades through the full installer.
    echo Download the latest CCB-Setup-x.y.z.exe and run it over your existing install.
    echo Config is preserved at: "%LOCALAPPDATA%\CCB\.claude"
    echo.
)

pause >nul
exit /b 0
