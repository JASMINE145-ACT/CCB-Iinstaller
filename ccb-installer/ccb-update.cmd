@echo off
setlocal
echo.
echo CCB now updates through a full installer package.
echo.
echo Download and run the latest CCB-Setup-x.y.z.exe over the existing install.
echo Do not uninstall first. User configuration remains at:
echo   "%LOCALAPPDATA%\CCB\.claude"
echo.
echo Installers from version 1.0.3 also create a pre-upgrade config backup.
echo.
echo Press any key to exit.
pause >nul
exit /b 0
