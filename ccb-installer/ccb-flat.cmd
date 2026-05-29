@echo off
setlocal

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"

:: Flat Mode: disable alternate-screen (fullscreen TUI) and mouse tracking.
:: Use when Normal mode renders overlapping text or broken borders.
:: Mouse tracking is OFF so the terminal handles wheel scroll (scrollback)
:: and text selection natively — drag to select, right-click or Ctrl+C to copy.
if not defined WT_SESSION if not "%CCB_DISABLE_WT_RELAUNCH%"=="1" if not "%CCB_WT_RELAUNCHED%"=="1" (
    for /f "delims=" %%W in ('where wt.exe 2^>nul') do (
        start "" "%%W" -d "%CCB_INSTALL_DIR%" cmd /k "set CCB_WT_RELAUNCHED=1&& ""%~f0"" %*"
        exit /b 0
    )
)

chcp 65001 >nul 2>&1

set "CCB_DISABLE_FULLSCREEN=1"
set "CCB_FLAT_MODE=1"
set "CLAUDE_CODE_DISABLE_MOUSE=1"
set "CLAUDE_CODE_NO_FLICKER=0"
set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"

call "%CCB_INSTALL_DIR%\ccb.cmd" %*
exit /b %ERRORLEVEL%
