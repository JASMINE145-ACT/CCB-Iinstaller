@echo off
setlocal

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"

:: Safe Mode: fallback for terminals that cannot run the full TUI.
:: fullscreen=OFF, mouse=OFF, fixed 140x40 window. Not a "better scroll" option —
:: Safe Mode is MORE conservative than Flat (it disables mouse entirely).
:: For scroll, use: Modern (WT) > Flat (PgUp/PgDn) > Text > Safe (last resort).
chcp 65001 >nul 2>&1
mode con: cols=140 lines=40 >nul 2>&1

set "CCB_SAFE_MODE=1"
set "CCB_DISABLE_FULLSCREEN=1"
set "CLAUDE_CODE_NO_FLICKER=0"
set "CLAUDE_CODE_DISABLE_MOUSE=1"
set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"

call "%CCB_INSTALL_DIR%\ccb.cmd" %*
exit /b %ERRORLEVEL%
