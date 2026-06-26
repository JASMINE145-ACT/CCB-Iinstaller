@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"

if not exist "%CCB_INSTALL_DIR%\scripts\ccb-check-update.ps1" (
    echo [CCB] Update script not found: "%CCB_INSTALL_DIR%\scripts\ccb-check-update.ps1"
    pause
    exit /b 1
)

:: Relaunch through Windows Terminal if available
if not defined WT_SESSION if not "%CCB_WT_RELAUNCHED%"=="1" (
    for /f "delims=" %%W in ('where wt.exe 2^>nul') do (
        set "CCB_WT_PROFILE_ARG="
        if exist "%LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\CCB\ccb.json" set "CCB_WT_PROFILE_ARG=--profile "CCB" "
        start "" "%%W" !CCB_WT_PROFILE_ARG!-d "%CCB_INSTALL_DIR%" cmd /k "set CCB_WT_RELAUNCHED=1&& ""%~f0"" %*"
        exit /b 0
    )
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%CCB_INSTALL_DIR%\scripts\ccb-check-update.ps1" -AppName "CCB" -Select
set "CCB_EXIT=%ERRORLEVEL%"
if "%CCB_EXIT%"=="2" (
    echo.
    echo [CCB] Install complete. Close this window and relaunch CCB.
)
if not "%CCB_NO_PAUSE%"=="1" pause
exit /b %CCB_EXIT%
