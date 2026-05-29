@echo off
setlocal

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"

set "CCB_FIX_SCRIPT=%CCB_INSTALL_DIR%\scripts\fix-terminal-launcher.ps1"
if not exist "%CCB_FIX_SCRIPT%" (
    echo [CCB] 缺少终端修复脚本：
    echo [CCB] "%CCB_FIX_SCRIPT%"
    echo.
    echo 请重新安装 CCB 后再试。
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CCB_FIX_SCRIPT%" %*
set "CCB_EXIT_CODE=%ERRORLEVEL%"

echo.
if "%CCB_EXIT_CODE%"=="0" (
    echo [CCB] 终端启动器修复完成。
) else (
    echo [CCB] 终端启动器修复失败，退出码：%CCB_EXIT_CODE%
)
pause
exit /b %CCB_EXIT_CODE%
