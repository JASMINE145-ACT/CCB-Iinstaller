@echo off
setlocal

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"

set "CCB_FIX_SCRIPT=%CCB_INSTALL_DIR%\scripts\fix-terminal-launcher.ps1"
if not exist "%CCB_FIX_SCRIPT%" (
    echo [CCB] Missing terminal fix script:
    echo [CCB] "%CCB_FIX_SCRIPT%"
    echo.
    echo Please reinstall CCB, then try again.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CCB_FIX_SCRIPT%" %*
set "CCB_EXIT_CODE=%ERRORLEVEL%"

echo.
if "%CCB_EXIT_CODE%"=="0" (
    echo [CCB] Terminal launcher repair finished.
) else (
    echo [CCB] Terminal launcher repair failed with code %CCB_EXIT_CODE%.
)
pause
exit /b %CCB_EXIT_CODE%
