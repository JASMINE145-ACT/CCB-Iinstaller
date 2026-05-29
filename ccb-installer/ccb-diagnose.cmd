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
    echo [CCB 诊断] 无法创建日志目录："%CCB_LOG_DIR%"
    echo [CCB 诊断] 请检查权限和磁盘空间后重试。
    pause
    exit /b 1
)

set "CCB_TIMESTAMP=%DATE:/=-%_%TIME::=-%"
set "CCB_TIMESTAMP=%CCB_TIMESTAMP: =0%"
set "CCB_TIMESTAMP=%CCB_TIMESTAMP:.=-%"
set "CCB_DEBUG_LOG=%CCB_LOG_DIR%\ccb-%CCB_TIMESTAMP%.log"

chcp 65001 >nul 2>&1
echo [CCB 诊断] 启动器："%CCB_INSTALL_DIR%\ccb.cmd"
echo [CCB 诊断] 终端：TERM_PROGRAM=%TERM_PROGRAM% WT_SESSION=%WT_SESSION%
echo [CCB 诊断] 调试日志："%CCB_DEBUG_LOG%"
echo [CCB 诊断] 模式：%CCB_DIAG_MODE%
if "%CCB_DIAG_MODE%"=="resize-repro" (
    echo [CCB 诊断] 调整大小重现已启用。界面出现后调整窗口大小即可触发。
) else (
    echo [CCB 诊断] 调整大小保护已启用。初始布局测试期间请勿调整窗口大小。
    echo [CCB 诊断] 仅在收集调整大小崩溃证据时使用 --repro-resize。
)
echo.

set "CCB_NO_PAUSE=1"
call "%CCB_INSTALL_DIR%\ccb.cmd" --debug-file "%CCB_DEBUG_LOG%" %*
set "CCB_EXIT_CODE=%ERRORLEVEL%"

echo.
echo [CCB 诊断] Claude Code 退出码：%CCB_EXIT_CODE%
echo [CCB 诊断] 调试日志："%CCB_DEBUG_LOG%"
echo [CCB 诊断] 此窗口保持打开，以便查看崩溃输出。
pause
exit /b %CCB_EXIT_CODE%
