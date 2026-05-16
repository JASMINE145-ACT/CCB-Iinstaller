@echo off
REM ===== CCB 入口脚本 =====
REM 设置独立配置目录
set "CCB_CONFIG_DIR=%LOCALAPPDATA%\CCB\.claude"
set "CCB_INSTALL_DIR=%LOCALAPPDATA%\Programs\CCB"

REM 检测首次运行
if not exist "%CCB_CONFIG_DIR%\settings.json" (
    set "CCB_FIRST_RUN=1"
)

REM 临时注入 bun 到 PATH (不污染系统 PATH)
set "PATH=%CCB_INSTALL_DIR%\bun;%PATH%"
cd /d "%CCB_INSTALL_DIR%"

REM 运行 CCB (使用 cli.js 主入口)
"%CCB_INSTALL_DIR%\bun\bun.exe" run dist/cli.js %*