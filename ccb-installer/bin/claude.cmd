@echo off
setlocal
set "_BIN=%~dp0"
if "%_BIN:~-1%"=="\" set "_BIN=%_BIN:~0,-1%"
for %%I in ("%_BIN%\..") do set "_ROOT=%%~fI"
if not defined CCB_INSTALL_DIR set "CCB_INSTALL_DIR=%_ROOT%"
if not defined CLAUDE_CONFIG_DIR set "CLAUDE_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude"
set "PYTHONNOUSERSITE=1"
set "PATH=%CCB_INSTALL_DIR%\vendor\bun;%CCB_INSTALL_DIR%\vendor\python-wanding;%CCB_INSTALL_DIR%\vendor\python-wanding\Scripts;%CCB_INSTALL_DIR%\vendor\git\bin;%CCB_INSTALL_DIR%\vendor\git\mingw64\bin;%CCB_INSTALL_DIR%\vendor\git\usr\bin;%PATH%"
"%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" %*
