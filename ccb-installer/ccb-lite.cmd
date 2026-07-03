@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "CCB_CONFIG_DIR=%LOCALAPPDATA%\CCB-Lite\.claude"
set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"
set "CLAUDE_CONFIG_DIR=%CCB_CONFIG_DIR%"
set "CCB_LITE_MODE=1"
set "CCB_LOG_DIR=%LOCALAPPDATA%\CCB-Lite\logs"
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
if not defined TERM set "TERM=xterm-256color"
rem Enable full color in the TUI. NO_COLOR / FORCE_COLOR=0 previously forced a
rem monochrome (all-white) interface; truecolor is what modern terminals (WT,
rem VS Code, ConEmu) support, so advertise it explicitly.
set "NO_COLOR="
set "CLICOLOR=1"
set "CLICOLOR_FORCE=1"
set "FORCE_COLOR=3"
set "COLORTERM=truecolor"

rem If Windows Terminal is available, normalize launches from old shortcuts,
rem Explorer, and context menus into WT before the TUI starts drawing.
if not defined WT_SESSION if not "%CCB_DISABLE_WT_RELAUNCH%"=="1" if not "%CCB_WT_RELAUNCHED%"=="1" (
    for /f "delims=" %%W in ('where wt.exe 2^>nul') do (
        if exist "%CCB_LOG_DIR%" (
            >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] Relaunching through Windows Terminal.
            >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] wt.exe=%%W
        )
        set "CCB_WT_PROFILE_ARG="
        if exist "%LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\CCB\ccb.json" set "CCB_WT_PROFILE_ARG=--profile "CCB" "
        start "" "%%W" !CCB_WT_PROFILE_ARG!-d "%CCB_INSTALL_DIR%" cmd /k "set CCB_WT_RELAUNCHED=1&& ""%~f0"" %*"
        exit /b 0
    )
)

rem =============================================================================
rem Log cleanup: keep only the newest 40 log files so the logs dir cannot grow
rem without bound. Older builds never pruned, leaving 2+ files per launch.
rem Set CCB_DISABLE_LOG_CLEANUP=1 to turn this off.
rem NOTE: keep this file ASCII-only. cmd.exe tokenizes .cmd in the OEM/GBK code
rem page, not UTF-8, so CJK in comments can be mis-parsed and run as a command.
rem =============================================================================
if not "%CCB_DISABLE_LOG_CLEANUP%"=="1" if exist "%CCB_LOG_DIR%" (
    for /f "skip=40 delims=" %%F in ('dir /b /a-d /o-d "%CCB_LOG_DIR%\*.log" 2^>nul') do del /q "%CCB_LOG_DIR%\%%F" >nul 2>&1
)

if exist "%CCB_LOG_DIR%" (
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] Launch started.
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] InstallDir=%CCB_INSTALL_DIR%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] ConfigDir=%CCB_CONFIG_DIR%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] DebugLog=%CCB_DEBUG_LOG%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] WT_SESSION=%WT_SESSION%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] TERM_PROGRAM=%TERM_PROGRAM%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] TERM=%TERM%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] NO_COLOR=%NO_COLOR%
)

rem Prefer the bundled Git Bash, then use well-known local Git installations if
rem security software removed part of the bundle.
set "CLAUDE_CODE_GIT_BASH_PATH=%CCB_INSTALL_DIR%\vendor\git\bin\bash.exe"
call :find_bash "%CLAUDE_CODE_GIT_BASH_PATH%"
if errorlevel 1 call :find_bash "%ProgramFiles%\Git\bin\bash.exe"
if errorlevel 1 call :find_bash "%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
if errorlevel 1 (
    echo [CCB-Lite] Git Bash not found. Checked bundled and standard paths.
    goto :fail
)

rem Set environment
set "PATH=%CCB_INSTALL_DIR%\vendor\bun;%CCB_INSTALL_DIR%\vendor\ripgrep;%CCB_INSTALL_DIR%\vendor\git\bin;%CCB_INSTALL_DIR%\vendor\git\mingw64\bin;%CCB_INSTALL_DIR%\vendor\git\usr\bin;%PATH%"

rem =============================================================================
rem Pre-flight checks
rem =============================================================================

if not exist "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" (
    echo [CCB-Lite] Missing Bun runtime: "%CCB_INSTALL_DIR%\vendor\bun\bun.exe"
    goto :fail
)

if not exist "%CCB_INSTALL_DIR%\dist\cli.js" (
    echo [CCB-Lite] Missing entry file: "%CCB_INSTALL_DIR%\dist\cli.js"
    goto :fail
)

del /q "%CCB_PREFLIGHT_LOG%" >nul 2>&1

rem =============================================================================
rem API Configuration (MiniMax)
rem =============================================================================
set "ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic"
set "ANTHROPIC_DEFAULT_OPUS_MODEL=minimax-m2.7"
set "ANTHROPIC_DEFAULT_SONNET_MODEL=minimax-m2.7"
set "ANTHROPIC_DEFAULT_HAIKU_MODEL=minimax-m2.7"

rem =============================================================================
rem Terminal encoding and fullscreen (full Claude Code TUI - no feature cuts)
rem =============================================================================
rem Terminal encoding and fullscreen/mouse settings
rem =============================================================================
chcp 65001 >nul 2>&1

rem Fullscreen TUI (alternate screen) is disabled so the terminal keeps its
rem scrollback buffer. Mouse tracking OFF so wheel scroll and drag-to-select
rem work natively in all terminals.
rem FORCE_CODE_TERMINAL=1 is set for WT/VSCode so Claude Code recognises them
rem as capable terminals even without fullscreen.
set "CLAUDE_CODE_NO_FLICKER=0"
set "FORCE_CODE_TERMINAL=1"
if defined WT_SESSION set "FORCE_CODE_TERMINAL=1"
if /i "%TERM_PROGRAM%"=="vscode" set "FORCE_CODE_TERMINAL=1"
if "%CCB_DISABLE_FULLSCREEN%"=="1" set "CLAUDE_CODE_NO_FLICKER=0"

if not "%CCB_SAFE_MODE%"=="1" if not "%CCB_FLAT_MODE%"=="1" (
    set "CLAUDE_CODE_DISABLE_MOUSE=1"
    set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
    set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"
)

if exist "%CCB_LOG_DIR%" (
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] CLAUDE_CODE_NO_FLICKER=%CLAUDE_CODE_NO_FLICKER%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] FORCE_CODE_TERMINAL=%FORCE_CODE_TERMINAL%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] CLAUDE_CODE_DISABLE_MOUSE=%CLAUDE_CODE_DISABLE_MOUSE%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=%CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL%
)

rem =============================================================================
rem Recent conversations: Lite has a single entry, so by default it shows the
rem recent-conversation list before launch (resume history with one key, or
rem press Enter to start fresh). Set CCB_NO_RECENT=1 to disable.
rem =============================================================================
set "CCB_RESUME_ARG="
set "CCB_RESUME_CWD="
if not "%CCB_NO_RECENT%"=="1" if exist "%CCB_INSTALL_DIR%\scripts\ccb-recent.ps1" (
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

rem =============================================================================
rem Launch Claude Code
rem =============================================================================

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
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] ExitCode=%CCB_EXIT_CODE%
    >>"%CCB_LAUNCH_LOG%" echo [CCB-Lite] Finished.
)

if not "%CCB_EXIT_CODE%"=="0" (
    echo.
    echo [CCB-Lite] Exit code: %CCB_EXIT_CODE%
    echo [CCB-Lite] Install dir: "%CCB_INSTALL_DIR%"
    echo [CCB-Lite] Config dir:  "%CCB_CONFIG_DIR%"
    echo [CCB-Lite] Launch log:  "%CCB_LAUNCH_LOG%"
    echo [CCB-Lite] Debug log:   "%CCB_DEBUG_LOG%"
    if not "%CCB_NO_PAUSE%"=="1" pause
)

exit /b %CCB_EXIT_CODE%

:fail
echo.
echo [CCB-Lite] Installation incomplete or corrupted.
echo [CCB-Lite] Reinstall CCB Lite or restore quarantined files and try again.
if exist "%CCB_LOG_DIR%" echo [CCB-Lite] Launch log: "%CCB_LAUNCH_LOG%"
if not "%CCB_NO_PAUSE%"=="1" pause
exit /b 1

:preflight_fail
echo [CCB-Lite] Details written to: "%CCB_PREFLIGHT_LOG%"
if exist "%CCB_LOG_DIR%" echo [CCB-Lite] Launch log: "%CCB_LAUNCH_LOG%"
goto :fail

:find_bash
if not exist "%~1" exit /b 1
set "CLAUDE_CODE_GIT_BASH_PATH=%~1"
exit /b 0
