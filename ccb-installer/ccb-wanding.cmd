@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "CCB_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude"
set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"
set "CLAUDE_CONFIG_DIR=%CCB_CONFIG_DIR%"
set "CCB_LOG_DIR=%LOCALAPPDATA%\CCB-Wanding\logs"
set "CCB_PREFLIGHT_LOG=%TEMP%\ccb-preflight-%RANDOM%.log"
if not exist "%CCB_LOG_DIR%" mkdir "%CCB_LOG_DIR%" >nul 2>&1
set "CCB_LAUNCH_LOG=%CCB_LOG_DIR%\launcher-%RANDOM%-%RANDOM%.log"
set "CCB_DEBUG_LOG=%CCB_LOG_DIR%\debug-%RANDOM%-%RANDOM%.log"
set "LANG=zh_CN.UTF-8"
set "LC_ALL=zh_CN.UTF-8"
set "LC_CTYPE=zh_CN.UTF-8"
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
set "CLAUDE_CODE_DISABLE_EARLY_INPUT=1"
set "CLAUDE_CODE_ENABLE_TELEMETRY=0"
set "NODE_TLS_REJECT_UNAUTHORIZED=0"
if defined WT_SESSION if /i "%TERM_PROGRAM%"=="vscode" set "TERM_PROGRAM=WindowsTerminal"
if not defined TERM set "TERM=xterm-256color"
:: Enable full color in the TUI. NO_COLOR / FORCE_COLOR=0 previously forced a
:: monochrome (all-white) interface; truecolor is what modern terminals (WT,
:: VS Code, ConEmu) support, so advertise it explicitly.
set "NO_COLOR="
set "CLICOLOR=1"
set "CLICOLOR_FORCE=1"
set "FORCE_COLOR=3"
set "COLORTERM=truecolor"
:: Wanding ships a small, fixed MCP set. Keep MCP tools loaded directly instead
:: of forcing the deferred SearchExtraTools -> ExecuteExtraTool protocol, which
:: some non-Claude models can loop on. Current dist expects auto:N; auto:100
:: means the auto threshold is 100% of context, so it resolves to standard mode.
set "ENABLE_SEARCH_EXTRA_TOOLS=auto:100"

:: If Windows Terminal is available, normalize launches from old shortcuts,
:: Explorer, and context menus into WT before the TUI starts drawing.
if not defined WT_SESSION if not "%CCB_DISABLE_WT_RELAUNCH%"=="1" if not "%CCB_WT_RELAUNCHED%"=="1" (
    for /f "delims=" %%W in ('where wt.exe 2^>nul') do (
        if exist "%CCB_LOG_DIR%" (
            >>"%CCB_LAUNCH_LOG%" echo [CCB] Relaunching through Windows Terminal.
            >>"%CCB_LAUNCH_LOG%" echo [CCB] wt.exe=%%W
        )
        set "CCB_WT_PROFILE_ARG="
        if exist "%LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\CCB\ccb.json" set "CCB_WT_PROFILE_ARG=--profile "CCB" "
        start "" "%%W" !CCB_WT_PROFILE_ARG!-d "%CCB_INSTALL_DIR%" cmd /k "set CCB_WT_RELAUNCHED=1&& ""%~f0"" %*"
        exit /b 0
    )
)


:: =============================================================================
:: Log cleanup: keep only the newest 40 log files so the logs dir cannot grow
:: without bound. Older builds never pruned, leaving 2+ files per launch.
:: Set CCB_DISABLE_LOG_CLEANUP=1 to turn this off.
:: NOTE: keep this file ASCII-only. cmd.exe tokenizes .cmd in the OEM/GBK code
:: page, not UTF-8, so CJK in comments can be mis-parsed and run as a command.
:: =============================================================================
if not "%CCB_DISABLE_LOG_CLEANUP%"=="1" if exist "%CCB_LOG_DIR%" (
    for /f "skip=40 delims=" %%F in ('dir /b /a-d /o-d "%CCB_LOG_DIR%\*.log" 2^>nul') do del /q "%CCB_LOG_DIR%\%%F" >nul 2>&1
)

if exist "%CCB_LOG_DIR%" (
    >>"%CCB_LAUNCH_LOG%" echo [CCB] Launch started.
    >>"%CCB_LAUNCH_LOG%" echo [CCB] InstallDir=%CCB_INSTALL_DIR%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] ConfigDir=%CCB_CONFIG_DIR%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] DebugLog=%CCB_DEBUG_LOG%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] WT_SESSION=%WT_SESSION%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] TERM_PROGRAM=%TERM_PROGRAM%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] TERM=%TERM%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] NO_COLOR=%NO_COLOR%
)

:: Prefer the bundled Git Bash, then use well-known local Git installations if
:: security software removed part of the bundle.
set "CLAUDE_CODE_GIT_BASH_PATH=%CCB_INSTALL_DIR%\vendor\git\bin\bash.exe"
call :find_bash "%CLAUDE_CODE_GIT_BASH_PATH%"
if errorlevel 1 call :find_bash "%ProgramFiles%\Git\bin\bash.exe"
if errorlevel 1 call :find_bash "%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
if errorlevel 1 (
    echo [CCB] Git Bash not found. Checked bundled and standard paths.
    goto :fail
)

:: Set environment
set "PYTHONNOUSERSITE=1"
set "PATH=%CCB_INSTALL_DIR%\vendor\python-wanding;%CCB_INSTALL_DIR%\vendor\python-wanding\Scripts;%CCB_INSTALL_DIR%\vendor\bun;%CCB_INSTALL_DIR%\vendor\ripgrep;%CCB_INSTALL_DIR%\vendor\git\bin;%CCB_INSTALL_DIR%\vendor\git\mingw64\bin;%CCB_INSTALL_DIR%\vendor\git\usr\bin;%PATH%"

:: =============================================================================
:: Pre-flight checks
:: =============================================================================

if not exist "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" (
    echo [CCB] Missing Bun runtime: "%CCB_INSTALL_DIR%\vendor\bun\bun.exe"
    goto :fail
)

if not exist "%CCB_INSTALL_DIR%\dist\cli.js" (
    echo [CCB] Missing entry file: "%CCB_INSTALL_DIR%\dist\cli.js"
    goto :fail
)

del /q "%CCB_PREFLIGHT_LOG%" >nul 2>&1

:: =============================================================================
:: API Configuration (MiniMax)
:: =============================================================================
set "ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic"
set "ANTHROPIC_AUTH_TOKEN=sk-cp-FVpTaa8qfaTOU97mM7m7Svk0NOVNwIIhOq1-aWp4LQubya8kRiTgg3DEGRSgBPImWpJKJwJAFdhR-JlSU4H-Qz-Zq2drSi6KbCscdLnuKsUpXKtXpPraT-I"
set "ANTHROPIC_DEFAULT_OPUS_MODEL=minimax-m3"
set "ANTHROPIC_DEFAULT_SONNET_MODEL=minimax-m3"
set "ANTHROPIC_DEFAULT_HAIKU_MODEL=minimax-m3"

:: =============================================================================
:: Terminal encoding and fullscreen (full Claude Code TUI - no feature cuts)
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
set "FORCE_CODE_TERMINAL="
if defined WT_SESSION set "FORCE_CODE_TERMINAL=1"
if /i "%TERM_PROGRAM%"=="vscode" set "FORCE_CODE_TERMINAL=1"
if /i "%TERM_PROGRAM%"=="WindowsTerminal" set "FORCE_CODE_TERMINAL=1"
if "%CCB_DISABLE_FULLSCREEN%"=="1" set "CLAUDE_CODE_NO_FLICKER=0"

if not "%CCB_SAFE_MODE%"=="1" if not "%CCB_FLAT_MODE%"=="1" (
    set "CLAUDE_CODE_DISABLE_MOUSE=1"
    set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
    set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"
)

if exist "%CCB_LOG_DIR%" (
    >>"%CCB_LAUNCH_LOG%" echo [CCB] CLAUDE_CODE_NO_FLICKER=%CLAUDE_CODE_NO_FLICKER%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] FORCE_CODE_TERMINAL=%FORCE_CODE_TERMINAL%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] CLAUDE_CODE_DISABLE_MOUSE=%CLAUDE_CODE_DISABLE_MOUSE%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=%CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL%
)

:: Auto-update: background-only silent version check. No prompts, no blocking.
:: Result written to %LOCALAPPDATA%\CCB-Wanding\updates\available.json.
:: To update, use the "CCB-Wanding Version Select" shortcut.
if not "%CCB_NO_UPDATE%"=="1" if exist "%CCB_INSTALL_DIR%\scripts\ccb-check-update.ps1" (
    start /b "" "%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe" -NonInteractive -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "%CCB_INSTALL_DIR%\scripts\ccb-check-update.ps1" -BackgroundCheck
)

:: =============================================================================
:: Session picker: always shown on every launch.
:: =============================================================================
set "CCB_RESUME_ARG="
set "CCB_RESUME_CWD="
if exist "%CCB_INSTALL_DIR%\scripts\ccb-recent.ps1" (
    set "CCB_RECENT_RESULT=%TEMP%\ccb-recent-%RANDOM%-%RANDOM%.txt"
    del /q "!CCB_RECENT_RESULT!" >nul 2>&1
    powershell -NoProfile -ExecutionPolicy Bypass -File "%CCB_INSTALL_DIR%\scripts\ccb-recent.ps1" -ConfigDir "%CCB_CONFIG_DIR%" -ResultFile "!CCB_RECENT_RESULT!"
    if exist "!CCB_RECENT_RESULT!" (
        set "CCB_RECENT_LINE="
        set /p CCB_RECENT_LINE=<"!CCB_RECENT_RESULT!"
        del /q "!CCB_RECENT_RESULT!" >nul 2>&1
        if /i "!CCB_RECENT_LINE!"=="QUIT" exit /b 0
        if defined CCB_RECENT_LINE (
            for /f "tokens=1* delims=|" %%a in ("!CCB_RECENT_LINE!") do (
                set "CCB_RESUME_ARG=--resume %%a"
                set "CCB_RESUME_CWD=%%b"
            )
        )
    )
)

:: =============================================================================
:: Launch Claude Code
:: =============================================================================

if defined CCB_RESUME_CWD (
    if exist "!CCB_RESUME_CWD!\" ( cd /d "!CCB_RESUME_CWD!" ) else ( cd /d "%CCB_INSTALL_DIR%" )
) else (
    cd /d "%CCB_INSTALL_DIR%"
)
if "%CCB_DISABLE_DEBUG_LOG%"=="1" (
    if exist "%CCB_INSTALL_DIR%\ccb-mcp.json" (
        "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json" !CCB_RESUME_ARG! %*
    ) else (
        "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" !CCB_RESUME_ARG! %*
    )
) else (
    if exist "%CCB_INSTALL_DIR%\ccb-mcp.json" (
        "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json" --debug-file "%CCB_DEBUG_LOG%" !CCB_RESUME_ARG! %*
    ) else (
        "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --debug-file "%CCB_DEBUG_LOG%" !CCB_RESUME_ARG! %*
    )
)
set "CCB_EXIT_CODE=%ERRORLEVEL%"
if exist "%CCB_LOG_DIR%" (
    >>"%CCB_LAUNCH_LOG%" echo [CCB] ExitCode=%CCB_EXIT_CODE%
    >>"%CCB_LAUNCH_LOG%" echo [CCB] Finished.
)

if not "%CCB_EXIT_CODE%"=="0" (
    echo.
    echo [CCB] Exit code: %CCB_EXIT_CODE%
    echo [CCB] Install dir: "%CCB_INSTALL_DIR%"
    echo [CCB] Config dir:  "%CCB_CONFIG_DIR%"
    echo [CCB] Launch log:  "%CCB_LAUNCH_LOG%"
    echo [CCB] Debug log:   "%CCB_DEBUG_LOG%"
    if not "%CCB_NO_PAUSE%"=="1" pause
)

exit /b %CCB_EXIT_CODE%

:fail
echo.
echo [CCB] Installation incomplete or corrupted.
echo [CCB] Reinstall CCB or restore quarantined files and try again.
if exist "%CCB_LOG_DIR%" echo [CCB] Launch log: "%CCB_LAUNCH_LOG%"
if not "%CCB_NO_PAUSE%"=="1" pause
exit /b 1

:preflight_fail
echo [CCB] Details written to: "%CCB_PREFLIGHT_LOG%"
if exist "%CCB_LOG_DIR%" echo [CCB] Launch log: "%CCB_LAUNCH_LOG%"
goto :fail

:find_bash
if not exist "%~1" exit /b 1
set "CLAUDE_CODE_GIT_BASH_PATH=%~1"
exit /b 0
