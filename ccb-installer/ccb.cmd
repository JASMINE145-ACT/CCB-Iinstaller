@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "CCB_CONFIG_DIR=%LOCALAPPDATA%\CCB\.claude"
set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"
set "CLAUDE_CONFIG_DIR=%CCB_CONFIG_DIR%"
set "CCB_LOG_DIR=%LOCALAPPDATA%\CCB\logs"
set "CCB_PREFLIGHT_LOG=%TEMP%\ccb-preflight-%RANDOM%.log"
if not exist "%CCB_LOG_DIR%" mkdir "%CCB_LOG_DIR%" >nul 2>&1
set "CCB_LAUNCH_LOG=%CCB_LOG_DIR%\launcher-%RANDOM%-%RANDOM%.log"
set "CCB_DEBUG_LOG=%CCB_LOG_DIR%\debug-%RANDOM%-%RANDOM%.log"
set "LANG=zh_CN.UTF-8"
set "LC_ALL=zh_CN.UTF-8"
set "LC_CTYPE=zh_CN.UTF-8"
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
if defined WT_SESSION if /i "%TERM_PROGRAM%"=="vscode" set "TERM_PROGRAM=WindowsTerminal"

:: If Windows Terminal is available, normalize launches from old shortcuts,
:: Explorer, and context menus into WT before the TUI starts drawing.
if not defined WT_SESSION if not "%CCB_DISABLE_WT_RELAUNCH%"=="1" if not "%CCB_WT_RELAUNCHED%"=="1" (
    for /f "delims=" %%W in ('where wt.exe 2^>nul') do (
        if exist "%CCB_LOG_DIR%" (
            >>"%CCB_LAUNCH_LOG%" echo [CCB] Relaunching through Windows Terminal.
            >>"%CCB_LAUNCH_LOG%" echo [CCB] wt.exe=%%W
        )
        start "" "%%W" -d "%CCB_INSTALL_DIR%" cmd /k "set CCB_WT_RELAUNCHED=1&& ""%~f0"" %*"
        exit /b 0
    )
)

if exist "%CCB_LOG_DIR%" (
    >>"%CCB_LAUNCH_LOG%" echo [CCB] Launch started.
    >>"%CCB_LAUNCH_LOG%" echo [CCB] InstallDir=%CCB_INSTALL_DIR%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] ConfigDir=%CCB_CONFIG_DIR%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] DebugLog=%CCB_DEBUG_LOG%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] WT_SESSION=%WT_SESSION%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] TERM_PROGRAM=%TERM_PROGRAM%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] TERM=%TERM%
    >>"%CCB_LAUNCH_LOG%" chcp
    where wt.exe >>"%CCB_LAUNCH_LOG%" 2>&1
    wt.exe --version >>"%CCB_LAUNCH_LOG%" 2>&1
)

:: Prefer the bundled Git Bash, then use well-known local Git installations if
:: security software removed part of the bundle.
set "CLAUDE_CODE_GIT_BASH_PATH=%CCB_INSTALL_DIR%\vendor\git\bin\bash.exe"
call :try_bash "%CLAUDE_CODE_GIT_BASH_PATH%"
if errorlevel 1 call :try_bash "%ProgramFiles%\Git\bin\bash.exe"
if errorlevel 1 call :try_bash "%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
if errorlevel 1 (
    echo [CCB] 未找到可用的 Git Bash。
    echo [CCB] 已检查内置 Git Bash 及标准安装路径。
    goto :fail
)

:: Set environment
set "PATH=%CCB_INSTALL_DIR%\vendor\bun;%CCB_INSTALL_DIR%\vendor\ripgrep;%CCB_INSTALL_DIR%\vendor\git\bin;%CCB_INSTALL_DIR%\vendor\git\mingw64\bin;%CCB_INSTALL_DIR%\vendor\git\usr\bin;%PATH%"

:: =============================================================================
:: Pre-flight checks
:: =============================================================================

if not exist "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" (
    echo [CCB] 缺少 Bun 运行时: "%CCB_INSTALL_DIR%\vendor\bun\bun.exe"
    goto :fail
)

if not exist "%CCB_INSTALL_DIR%\dist\cli.js" (
    echo [CCB] 缺少 CCB 入口文件: "%CCB_INSTALL_DIR%\dist\cli.js"
    goto :fail
)

:: Executing probes detects antivirus quarantine, truncated files, and missing
:: DLLs before the TUI switches screen buffers and hides the actual failure.
"%CCB_INSTALL_DIR%\vendor\bun\bun.exe" --version >"%CCB_PREFLIGHT_LOG%" 2>&1
if errorlevel 1 (
    echo [CCB] Bun 存在但无法运行。
    if exist "%CCB_LOG_DIR%" type "%CCB_PREFLIGHT_LOG%" >>"%CCB_LAUNCH_LOG%" 2>nul
    goto :preflight_fail
)
"%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --version >>"%CCB_PREFLIGHT_LOG%" 2>&1
if errorlevel 1 (
    echo [CCB] 应用程序文件启动检查失败。
    if exist "%CCB_LOG_DIR%" type "%CCB_PREFLIGHT_LOG%" >>"%CCB_LAUNCH_LOG%" 2>nul
    goto :preflight_fail
)
del /q "%CCB_PREFLIGHT_LOG%" >nul 2>&1

:: Config directory created by installer; skip creation to avoid overwriting pre-configured settings.json
:: If running ccb.cmd directly (outside install), settings.json may need to be created by user

if exist "%CCB_INSTALL_DIR%\scripts\ensure-mcp-settings.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%CCB_INSTALL_DIR%\scripts\ensure-mcp-settings.ps1" -InstallDir "%CCB_INSTALL_DIR%" -ConfigDir "%CCB_CONFIG_DIR%" >nul 2>&1
    if errorlevel 1 echo [CCB] 警告：无法更新 MCP 默认配置。
)

:: =============================================================================
:: API Configuration (MiniMax)
:: =============================================================================
set "ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic"
set "ANTHROPIC_AUTH_TOKEN=sk-cp-FVpTaa8qfaTOU97mM7m7Svk0NOVNwIIhOq1-aWp4LQubya8kRiTgg3DEGRSgBPImWpJKJwJAFdhR-JlSU4H-Qz-Zq2drSi6KbCscdLnuKsUpXKtXpPraT-I"
set "ANTHROPIC_DEFAULT_OPUS_MODEL=minimax-m2.7"
set "ANTHROPIC_DEFAULT_SONNET_MODEL=minimax-m2.7"
set "ANTHROPIC_DEFAULT_HAIKU_MODEL=minimax-m2.7"

:: =============================================================================
:: Terminal encoding and fullscreen (full Claude Code TUI — no feature cuts)
:: =============================================================================
:: Terminal encoding and fullscreen/mouse settings
:: =============================================================================
chcp 65001 >nul 2>&1

:: Fullscreen TUI (alternate screen) is disabled so the terminal keeps its
:: scrollback buffer. Mouse tracking OFF so wheel scroll and drag-to-select
:: work natively in all terminals.
:: FORCE_CODE_TERMINAL=1 is set for WT/VSCode so Claude Code recognises them
:: as capable terminals even without fullscreen.
set "CLAUDE_CODE_NO_FLICKER=0"
if defined WT_SESSION set "FORCE_CODE_TERMINAL=1"
if /i "%TERM_PROGRAM%"=="vscode" set "FORCE_CODE_TERMINAL=1"
if "%CCB_DISABLE_FULLSCREEN%"=="1" set "CLAUDE_CODE_NO_FLICKER=0"

if not "%CCB_SAFE_MODE%"=="1" if not "%CCB_FLAT_MODE%"=="1" (
    set "CLAUDE_CODE_DISABLE_MOUSE=1"
    set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
    set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"
)

if exist "%CCB_LOG_DIR%" (
    >>"%CCB_LAUNCH_LOG%" echo [CCB] CLAUDE_CODE_NO_FLICKER=%CLAUDE_CODE_NO_FLICKER%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] CLAUDE_CODE_DISABLE_MOUSE=%CLAUDE_CODE_DISABLE_MOUSE%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=%CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL%
)

:: =============================================================================
:: Launch Claude Code
:: =============================================================================

cd /d "%CCB_INSTALL_DIR%"
if "%CCB_DISABLE_DEBUG_LOG%"=="1" (
    if exist "%CCB_INSTALL_DIR%\ccb-mcp.json" (
        "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json" %*
    ) else (
        "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" %*
    )
) else (
    if exist "%CCB_INSTALL_DIR%\ccb-mcp.json" (
        "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json" --debug-file "%CCB_DEBUG_LOG%" %*
    ) else (
        "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --debug-file "%CCB_DEBUG_LOG%" %*
    )
)
set "CCB_EXIT_CODE=%ERRORLEVEL%"
if exist "%CCB_LOG_DIR%" (
    >>"%CCB_LAUNCH_LOG%" echo [CCB] ExitCode=%CCB_EXIT_CODE%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] Finished.
)

if not "%CCB_EXIT_CODE%"=="0" (
    echo.
    echo [CCB] 退出码：%CCB_EXIT_CODE%
    echo [CCB] 安装目录："%CCB_INSTALL_DIR%"
    echo [CCB] 配置目录："%CCB_CONFIG_DIR%"
    echo [CCB] 启动日志："%CCB_LAUNCH_LOG%"
    echo [CCB] 调试日志："%CCB_DEBUG_LOG%"
    if not "%CCB_NO_PAUSE%"=="1" pause
)

exit /b %CCB_EXIT_CODE%

:fail
echo.
echo [CCB] 安装不完整或已损坏。
echo [CCB] 请重新安装 CCB 或恢复被隔离的文件后再试。
if exist "%CCB_LOG_DIR%" echo [CCB] 启动日志："%CCB_LAUNCH_LOG%"
if not "%CCB_NO_PAUSE%"=="1" pause
exit /b 1

:preflight_fail
echo [CCB] 详细信息已写入："%CCB_PREFLIGHT_LOG%"
if exist "%CCB_LOG_DIR%" echo [CCB] 启动日志："%CCB_LAUNCH_LOG%"
goto :fail

:try_bash
if not exist "%~1" exit /b 1
"%~1" --noprofile --norc -c "git --version" >nul 2>&1
if errorlevel 1 exit /b 1
set "CLAUDE_CODE_GIT_BASH_PATH=%~1"
exit /b 0
