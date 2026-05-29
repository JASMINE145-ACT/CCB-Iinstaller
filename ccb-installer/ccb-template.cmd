@echo off
chcp 65001 >nul 2>&1
setlocal

set "CCB_CONFIG_DIR=%LOCALAPPDATA%\CCB\.claude"
set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"
set "CLAUDE_CONFIG_DIR=%CCB_CONFIG_DIR%"
set "CCB_PREFLIGHT_LOG=%TEMP%\ccb-preflight-%RANDOM%.log"
set "PATH=%CCB_INSTALL_DIR%\vendor\bun;%CCB_INSTALL_DIR%\vendor\ripgrep;%PATH%"

set "CLAUDE_CODE_GIT_BASH_PATH=%CCB_INSTALL_DIR%\vendor\git\bin\bash.exe"
call :try_bash "%CLAUDE_CODE_GIT_BASH_PATH%"
if errorlevel 1 call :try_bash "%ProgramFiles%\Git\bin\bash.exe"
if errorlevel 1 call :try_bash "%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
if errorlevel 1 (
    echo [CCB] 未找到可用的 Git Bash。
    goto :fail
)

if not exist "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" (
    echo [CCB] 缺少 Bun 运行时: "%CCB_INSTALL_DIR%\vendor\bun\bun.exe"
    goto :fail
)

if not exist "%CCB_INSTALL_DIR%\dist\cli.js" (
    echo [CCB] 缺少 CCB 入口文件: "%CCB_INSTALL_DIR%\dist\cli.js"
    goto :fail
)

"%CCB_INSTALL_DIR%\vendor\bun\bun.exe" --version >"%CCB_PREFLIGHT_LOG%" 2>&1
if errorlevel 1 (
    echo [CCB] Bun 存在但无法运行。
    goto :preflight_fail
)
"%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --version >>"%CCB_PREFLIGHT_LOG%" 2>&1
if errorlevel 1 (
    echo [CCB] 应用程序文件启动检查失败。
    goto :preflight_fail
)
del /q "%CCB_PREFLIGHT_LOG%" >nul 2>&1

if not exist "%CCB_CONFIG_DIR%" (
    mkdir "%CCB_CONFIG_DIR%" >nul 2>nul
)

if exist "%CCB_INSTALL_DIR%\scripts\ensure-mcp-settings.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%CCB_INSTALL_DIR%\scripts\ensure-mcp-settings.ps1" -InstallDir "%CCB_INSTALL_DIR%" -ConfigDir "%CCB_CONFIG_DIR%" >nul 2>&1
    if errorlevel 1 echo [CCB] 警告：无法更新 MCP 默认配置。
)

chcp 65001 >nul 2>&1
if not defined CLAUDE_CODE_NO_FLICKER (
    if "%CCB_DISABLE_FULLSCREEN%"=="1" (
        set "CLAUDE_CODE_NO_FLICKER=0"
    ) else if defined WT_SESSION (
        set "CLAUDE_CODE_NO_FLICKER=1"
    ) else if /i "%TERM_PROGRAM%"=="vscode" (
        set "CLAUDE_CODE_NO_FLICKER=1"
    ) else (
        set "CLAUDE_CODE_NO_FLICKER=0"
    )
)

cd /d "%CCB_INSTALL_DIR%"
if exist "%CCB_INSTALL_DIR%\ccb-mcp.json" (
    "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json" %*
) else (
    "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" %*
)
set "CCB_EXIT_CODE=%ERRORLEVEL%"

if not "%CCB_EXIT_CODE%"=="0" (
    echo.
    echo [CCB] 退出码：%CCB_EXIT_CODE%
    echo [CCB] 安装目录："%CCB_INSTALL_DIR%"
    echo [CCB] 配置目录："%CCB_CONFIG_DIR%"
    if not "%CCB_NO_PAUSE%"=="1" pause
)

exit /b %CCB_EXIT_CODE%

:fail
echo.
echo [CCB] 安装不完整或已损坏。
echo [CCB] 请重新安装 CCB 或恢复被隔离的文件后再试。
if not "%CCB_NO_PAUSE%"=="1" pause
exit /b 1

:preflight_fail
echo [CCB] 详细信息已写入："%CCB_PREFLIGHT_LOG%"
goto :fail

:try_bash
if not exist "%~1" exit /b 1
"%~1" --noprofile --norc -c "git --version" >nul 2>&1
if errorlevel 1 exit /b 1
set "CLAUDE_CODE_GIT_BASH_PATH=%~1"
exit /b 0
