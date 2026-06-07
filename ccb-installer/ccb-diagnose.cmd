@echo off
setlocal

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"
set "CCB_LOG_DIR=%LOCALAPPDATA%\CCB\logs"
set "CCB_DIAG_MODE=compat"
if /i "%~1"=="--repro-resize" (
    set "CCB_DIAG_MODE=resize-repro"
    set "CCB_ENABLE_TUI_RESIZE=1"
    shift
)
if not exist "%CCB_LOG_DIR%" mkdir "%CCB_LOG_DIR%" >nul 2>&1
if not exist "%CCB_LOG_DIR%" (
    echo [CCB Diagnose] Cannot create log dir: "%CCB_LOG_DIR%"
    echo [CCB Diagnose] Check permissions and free disk space, then retry.
    pause
    exit /b 1
)

set "CCB_TIMESTAMP=%DATE:/=-%_%TIME::=-%"
set "CCB_TIMESTAMP=%CCB_TIMESTAMP: =0%"
set "CCB_TIMESTAMP=%CCB_TIMESTAMP:.=-%"
set "CCB_DEBUG_LOG=%CCB_LOG_DIR%\ccb-%CCB_TIMESTAMP%.log"

chcp 65001 >nul 2>&1

:: Pre-flight diagnostics (Bun / CLI / MCP / settings / API / multi-instance)
if exist "%CCB_INSTALL_DIR%\scripts\ccb-diagnose.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%CCB_INSTALL_DIR%\scripts\ccb-diagnose.ps1" -InstallDir "%CCB_INSTALL_DIR%"
)

echo [CCB Diagnose] Launcher: "%CCB_INSTALL_DIR%\ccb.cmd"
echo [CCB Diagnose] Terminal: TERM_PROGRAM=%TERM_PROGRAM% WT_SESSION=%WT_SESSION%
echo [CCB Diagnose] Debug log: "%CCB_DEBUG_LOG%"
echo [CCB Diagnose] Mode: %CCB_DIAG_MODE%
if "%CCB_DIAG_MODE%"=="resize-repro" (
    echo [CCB Diagnose] Resize repro enabled. Resize the window after the UI appears to trigger it.
) else (
    echo [CCB Diagnose] Resize guard enabled. Do not resize the window during initial layout testing.
    echo [CCB Diagnose] Use --repro-resize only when collecting resize-crash evidence.
)
echo.

set "CCB_NO_PAUSE=1"
call "%CCB_INSTALL_DIR%\ccb.cmd" --debug-file "%CCB_DEBUG_LOG%" %*
set "CCB_EXIT_CODE=%ERRORLEVEL%"

echo.
echo [CCB Diagnose] Claude Code exit code: %CCB_EXIT_CODE%
echo [CCB Diagnose] Debug log: "%CCB_DEBUG_LOG%"
echo [CCB Diagnose] This window stays open so you can read crash output.
pause
exit /b %CCB_EXIT_CODE%
