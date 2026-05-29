@echo off
setlocal
echo.
echo CCB 通过完整安装包进行升级。
echo.
echo 下载最新的 CCB-Setup-x.y.z.exe 后，直接覆盖现有安装即可。
echo 无需先卸载旧版本。用户配置保留在：
echo   "%LOCALAPPDATA%\CCB\.claude"
echo.
echo 1.0.3 及以上版本会在升级前自动备份配置。
echo.
echo 按任意键退出。
pause >nul
exit /b 0
