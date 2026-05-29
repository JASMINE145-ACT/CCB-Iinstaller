@echo off
setlocal

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"

:: Plain text fallback. This avoids full-screen TUI rendering entirely.
set "CCB_DISABLE_FULLSCREEN=1"
set "CLAUDE_CODE_NO_FLICKER=0"
set "CLAUDE_CODE_DISABLE_MOUSE=1"
set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"

call "%CCB_INSTALL_DIR%\ccb.cmd" -p %*
exit /b %ERRORLEVEL%
