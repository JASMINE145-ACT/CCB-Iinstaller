@echo off
setlocal

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"

:: Safe Mode for CCB-Wanding: conservative terminal settings.
chcp 65001 >nul 2>&1
mode con: cols=140 lines=40 >nul 2>&1

set "CCB_SAFE_MODE=1"
set "CCB_DISABLE_FULLSCREEN=1"
set "CLAUDE_CODE_NO_FLICKER=0"
set "CLAUDE_CODE_DISABLE_MOUSE=1"
set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"

call "%CCB_INSTALL_DIR%\ccb-wanding.cmd" %*
exit /b %ERRORLEVEL%
