@echo off
setlocal
chcp 65001 >nul 2>&1

set "INSTALL=%~dp0"
if "%INSTALL:~-1%"=="\" set "INSTALL=%INSTALL:~0,-1%"
set "CONFIG=%LOCALAPPDATA%\CCB-Wanding\.claude"
set "PS=%WINDIR%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "LOG=%LOCALAPPDATA%\CCB-Wanding\logs\launch-aionui.log"
set "RUNTIME_ROUTE=%APPDATA%\AionUi\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js"
set "CCB_INSTALL_DIR=%INSTALL%"
set "CCB_WANDING_HOME=%INSTALL%"
set "CCB_WANDING_CONFIG_DIR=%CONFIG%"
set "AIONUI_DISABLE_AUTO_UPDATE=1"
if not defined CCB_UPDATE_MANIFEST_URL set "CCB_UPDATE_MANIFEST_URL=http://67.216.206.3/updates/manifest.json"
if not defined AIONUI_UPDATE_MANIFEST_URL set "AIONUI_UPDATE_MANIFEST_URL=http://67.216.206.3/updates/manifest.json"
if exist "%LOCALAPPDATA%\CCB-Wanding\config\update-server.env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%LOCALAPPDATA%\CCB-Wanding\config\update-server.env") do (
        if not "%%A"=="" set "%%A=%%B"
    )
)
if exist "%LOCALAPPDATA%\CCB-Wanding\config\sso.env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%LOCALAPPDATA%\CCB-Wanding\config\sso.env") do (
        if not "%%A"=="" set "%%A=%%B"
    )
)

if not exist "%INSTALL%\AionUi\AionUi.exe" (
    echo [CCB-Wanding] Missing AionUi.exe in "%INSTALL%\AionUi"
    echo Re-run the CCB-Wanding installer or repair the install folder.
    pause
    exit /b 1
)

if not exist "%LOCALAPPDATA%\CCB-Wanding\logs" mkdir "%LOCALAPPDATA%\CCB-Wanding\logs" >nul 2>&1

set "BOOT_MODE=Quick"
if not exist "%CONFIG%\.bootstrap-ok" set "BOOT_MODE=Full"

if exist "%CONFIG%\.auth-reset-required" (
    set "AIONUI_FORCE_RELOGIN=1"
    del "%CONFIG%\.auth-reset-required" >nul 2>&1
)

>>"%LOG%" echo [%DATE% %TIME%] launch bootstrap %BOOT_MODE%
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%INSTALL%\scripts\run-wanding-bootstrap.ps1" -InstallDir "%INSTALL%" -Mode %BOOT_MODE% -LogFile "%LOG%"
set "BOOT_EXIT=%ERRORLEVEL%"

if not "%BOOT_EXIT%"=="0" (
    echo [CCB-Wanding] Setup reported errors exit=%BOOT_EXIT%
    echo Log: "%LOG%"
    echo AionUI will not start until setup is repaired.
    echo Run "Check Install" from the Start Menu and send the log file if this repeats.
    if not "%CCB_NO_PAUSE%"=="1" pause
    exit /b %BOOT_EXIT%
)

findstr /C:"ccb-native-acp-route" "%RUNTIME_ROUTE%" >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
    echo [CCB-Wanding] Route-B runtime cache is not configured.
    echo Log: "%LOG%"
    echo Run "Check Install" from the Start Menu to repair it.
    if not "%CCB_NO_PAUSE%"=="1" pause
    exit /b 2
)

if not "%CCB_NO_UPDATE%"=="1" if exist "%INSTALL%\scripts\ccb-update-notify.ps1" (
    start /b "" "%PS%" -NonInteractive -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "%INSTALL%\scripts\ccb-update-notify.ps1" -InstallDir "%INSTALL%"
)

set "PATH=%INSTALL%\bin;%PATH%"
cd /d "%INSTALL%\AionUi"
>>"%LOG%" echo [%DATE% %TIME%] update manifest=%AIONUI_UPDATE_MANIFEST_URL% disable_github=%AIONUI_DISABLE_AUTO_UPDATE%
echo [CCB-Wanding] AionUi is starting. This window will close automatically.
start "" "%INSTALL%\AionUi\AionUi.exe"
exit /b 0
