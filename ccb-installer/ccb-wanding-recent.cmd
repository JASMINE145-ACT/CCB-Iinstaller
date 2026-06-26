@echo off
setlocal

set "CCB_INSTALL_DIR=%~dp0"
if "%CCB_INSTALL_DIR:~-1%"=="\" set "CCB_INSTALL_DIR=%CCB_INSTALL_DIR:~0,-1%"

:: "CCB Wanding Recent" entry point: shows the recent-conversation list before launch
:: so you can resume history with one key (or press Enter for a new chat).
:: CCB_RECENT=1 is inherited by ccb-wanding.cmd across the Windows Terminal relaunch.
:: Keep this file ASCII-only (cmd.exe tokenizes .cmd in OEM/GBK, not UTF-8).
set "CCB_RECENT=1"

call "%CCB_INSTALL_DIR%\ccb-wanding.cmd" %*
exit /b %ERRORLEVEL%
