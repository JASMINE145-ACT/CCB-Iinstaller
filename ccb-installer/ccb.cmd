@echo off
setlocal enabledelayedexpansion

set "CCB_CONFIG_DIR=%LOCALAPPDATA%\CCB\.claude"
set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"
set "CLAUDE_CONFIG_DIR=%CCB_CONFIG_DIR%"
set "CCB_PREFLIGHT_LOG=%TEMP%\ccb-preflight-%RANDOM%.log"

:: Prefer the bundled Git Bash, then use well-known local Git installations if
:: security software removed part of the bundle.
set "CLAUDE_CODE_GIT_BASH_PATH=%CCB_INSTALL_DIR%\vendor\git\bin\bash.exe"
call :try_bash "%CLAUDE_CODE_GIT_BASH_PATH%"
if errorlevel 1 call :try_bash "%ProgramFiles%\Git\bin\bash.exe"
if errorlevel 1 call :try_bash "%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
if errorlevel 1 (
    echo [CCB] No working Git Bash was found.
    echo [CCB] Checked bundled Git Bash and standard user/system Git locations.
    goto :fail
)

:: Set environment
set "PATH=%CCB_INSTALL_DIR%\vendor\bun;%CCB_INSTALL_DIR%\vendor\ripgrep;%PATH%"

:: =============================================================================
:: Pre-flight checks
:: =============================================================================

if not exist "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" (
    echo [CCB] Missing Bun runtime: "%CCB_INSTALL_DIR%\vendor\bun\bun.exe"
    goto :fail
)

if not exist "%CCB_INSTALL_DIR%\dist\cli.js" (
    echo [CCB] Missing CCB entry: "%CCB_INSTALL_DIR%\dist\cli.js"
    goto :fail
)

:: Executing probes detects antivirus quarantine, truncated files, and missing
:: DLLs before the TUI switches screen buffers and hides the actual failure.
"%CCB_INSTALL_DIR%\vendor\bun\bun.exe" --version >"%CCB_PREFLIGHT_LOG%" 2>&1
if errorlevel 1 (
    echo [CCB] Bun exists but cannot run.
    goto :preflight_fail
)
"%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --version >>"%CCB_PREFLIGHT_LOG%" 2>&1
if errorlevel 1 (
    echo [CCB] The application files failed the startup check.
    goto :preflight_fail
)
del /q "%CCB_PREFLIGHT_LOG%" >nul 2>&1

:: Config directory created by installer; skip creation to avoid overwriting pre-configured settings.json
:: If running ccb.cmd directly (outside install), settings.json may need to be created by user

if exist "%CCB_INSTALL_DIR%\scripts\ensure-mcp-settings.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%CCB_INSTALL_DIR%\scripts\ensure-mcp-settings.ps1" -InstallDir "%CCB_INSTALL_DIR%" -ConfigDir "%CCB_CONFIG_DIR%" >nul 2>&1
    if errorlevel 1 echo [CCB] Warning: MCP default configuration could not be updated.
)

:: =============================================================================
:: Windows console compatibility
:: =============================================================================
:: Use UTF-8 for Chinese prompts and responses in cmd/conhost fallback sessions.
chcp 65001 >nul 2>&1

:: Windows Terminal and xterm.js terminals support alternate-screen drawing.
:: Keeping those hosts in fullscreen avoids the scrollback diff path that can
:: leave stale lines on the initial CJK layout. Legacy console hosts use the
:: reduced flat renderer instead.
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
set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
set "CLAUDE_CODE_DISABLE_MOUSE=1"

:: This bundled renderer clears and redraws the terminal on resize. On Windows
:: that path can corrupt CJK layout or exit the process. Resize the terminal
:: before launch, or set CCB_ENABLE_TUI_RESIZE=1 to opt back into live relayout.
if not "%CCB_ENABLE_TUI_RESIZE%"=="1" set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"

:: =============================================================================
:: Launch Claude Code
:: =============================================================================

cd /d "%CCB_INSTALL_DIR%"
if exist "%CCB_INSTALL_DIR%\ccb-mcp.json" (
    "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json" %*
) else (
    "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" %*
)
set "CCB_EXIT_CODE=%ERRORLEVEL%"

if not "%CCB_EXIT_CODE%"=="0" (
    echo.
    echo [CCB] Exited with code %CCB_EXIT_CODE%.
    echo [CCB] Install dir: "%CCB_INSTALL_DIR%"
    echo [CCB] Config dir: "%CCB_CONFIG_DIR%"
    if not "%CCB_NO_PAUSE%"=="1" pause
)

exit /b %CCB_EXIT_CODE%

:fail
echo.
echo [CCB] Installation is incomplete or corrupted.
echo [CCB] Reinstall CCB or restore quarantined files, then try again.
if not "%CCB_NO_PAUSE%"=="1" pause
exit /b 1

:preflight_fail
echo [CCB] Details were written to: "%CCB_PREFLIGHT_LOG%"
goto :fail

:try_bash
if not exist "%~1" exit /b 1
"%~1" --noprofile --norc -c "git --version" >nul 2>&1
if errorlevel 1 exit /b 1
set "CLAUDE_CODE_GIT_BASH_PATH=%~1"
exit /b 0
