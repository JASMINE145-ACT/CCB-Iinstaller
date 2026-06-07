# CCB upgrade info shown when user runs ccb-update.cmd.
# Must be saved as UTF-8 with BOM so PowerShell reads Chinese correctly.
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "CCB 升级说明" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host ""
Write-Host "CCB 通过完整安装包进行升级。" -ForegroundColor White
Write-Host ""
Write-Host "步骤：" -ForegroundColor White
Write-Host "  1. 下载最新版 CCB-Setup-x.y.z.exe"
Write-Host "  2. 直接在现有安装上运行安装包，无需先卸载旧版本"
Write-Host "  3. 安装完成后重新启动 CCB"
Write-Host ""
Write-Host "用户配置自动保留于：" -ForegroundColor White
Write-Host ("  " + $env:LOCALAPPDATA + "\CCB\.claude") -ForegroundColor Yellow
Write-Host ""
Write-Host "1.0.3 及以上版本升级前会自动备份配置。" -ForegroundColor DarkGray
Write-Host ""
