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
    echo [CCB Diagnostics] Unable to create log directory: "%CCB_LOG_DIR%"
    echo [CCB Diagnostics] Check permissions and free disk space, then retry.
    pause
    exit /b 1
)

set "CCB_TIMESTAMP=%DATE:/=-%_%TIME::=-%"
set "CCB_TIMESTAMP=%CCB_TIMESTAMP: =0%"
set "CCB_TIMESTAMP=%CCB_TIMESTAMP:.=-%"
set "CCB_DEBUG_LOG=%CCB_LOG_DIR%\ccb-%CCB_TIMESTAMP%.log"

chcp 65001 >nul 2>&1
echo [CCB Diagnostics] Launcher: "%CCB_INSTALL_DIR%\ccb.cmd"
echo [CCB Diagnostics] Terminal: TERM_PROGRAM=%TERM_PROGRAM% WT_SESSION=%WT_SESSION%
echo [CCB Diagnostics] Debug log: "%CCB_DEBUG_LOG%"
echo [CCB Diagnostics] Mode: %CCB_DIAG_MODE%
if "%CCB_DIAG_MODE%"=="resize-repro" (
    echo [CCB Diagnostics] Resize reproduction is enabled. Resize after the interface appears.
) else (
    echo [CCB Diagnostics] Resize protection is enabled. Do not resize during initial layout testing.
    echo [CCB Diagnostics] Run with --repro-resize only when collecting resize crash evidence.
)
echo.

set "CCB_NO_PAUSE=1"
call "%CCB_INSTALL_DIR%\ccb.cmd" --debug-file "%CCB_DEBUG_LOG%" %*
set "CCB_EXIT_CODE=%ERRORLEVEL%"

echo.
echo [CCB Diagnostics] Claude Code exited with code %CCB_EXIT_CODE%.
echo [CCB Diagnostics] Debug log: "%CCB_DEBUG_LOG%"
echo [CCB Diagnostics] This window is kept open so crash output remains visible.
pause
exit /b %CCB_EXIT_CODE%
