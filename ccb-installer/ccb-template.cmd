@echo off
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
    echo [CCB] No working Git Bash was found.
    goto :fail
)

if not exist "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" (
    echo [CCB] Missing Bun runtime: "%CCB_INSTALL_DIR%\vendor\bun\bun.exe"
    goto :fail
)

if not exist "%CCB_INSTALL_DIR%\dist\cli.js" (
    echo [CCB] Missing CCB entry: "%CCB_INSTALL_DIR%\dist\cli.js"
    goto :fail
)

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

if not exist "%CCB_CONFIG_DIR%" (
    mkdir "%CCB_CONFIG_DIR%" >nul 2>nul
)

if exist "%CCB_INSTALL_DIR%\scripts\ensure-mcp-settings.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%CCB_INSTALL_DIR%\scripts\ensure-mcp-settings.ps1" -InstallDir "%CCB_INSTALL_DIR%" -ConfigDir "%CCB_CONFIG_DIR%" >nul 2>&1
    if errorlevel 1 echo [CCB] Warning: MCP default configuration could not be updated.
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
set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
set "CLAUDE_CODE_DISABLE_MOUSE=1"
if not "%CCB_ENABLE_TUI_RESIZE%"=="1" set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"

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
