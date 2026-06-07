# CCB pre-flight diagnostic. Called by ccb-diagnose.cmd before launching.
# Must be saved as UTF-8 with BOM so PowerShell reads Chinese correctly.
param(
    [string]$InstallDir = (Split-Path -Parent $PSScriptRoot)
)

$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "=== CCB 诊断报告 ===" -ForegroundColor Cyan
Write-Host ""

# 1. Bun runtime
$bunExe = Join-Path $InstallDir "vendor\bun\bun.exe"
if (Test-Path $bunExe) {
    try {
        $v = (& $bunExe --version 2>$null).Trim()
        Write-Host "  [OK]   Bun 运行时: $v" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Bun 版本获取失败" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERR]  Bun 未找到: $bunExe" -ForegroundColor Red
}

# 2. Main entry point
$cliJs = Join-Path $InstallDir "dist\cli.js"
if (Test-Path $cliJs) {
    Write-Host "  [OK]   主程序入口存在 (dist/cli.js)" -ForegroundColor Green
} else {
    Write-Host "  [ERR]  主程序入口缺失: $cliJs" -ForegroundColor Red
}

# 3. MCP config
$mcpJson = Join-Path $InstallDir "ccb-mcp.json"
if (Test-Path $mcpJson) {
    try {
        $null = Get-Content $mcpJson -Raw | ConvertFrom-Json
        Write-Host "  [OK]   ccb-mcp.json 格式合法" -ForegroundColor Green
    } catch {
        Write-Host "  [ERR]  ccb-mcp.json 格式错误，MCP 功能将无法加载" -ForegroundColor Red
    }
} else {
    Write-Host "  [INFO] 无 ccb-mcp.json（MCP 功能未配置）" -ForegroundColor DarkGray
}

# 4. Config dir health
$configDir = "$env:LOCALAPPDATA\CCB\.claude"
$settingsFile = Join-Path $configDir "settings.json"
if (Test-Path $settingsFile) {
    try {
        $null = Get-Content $settingsFile -Raw | ConvertFrom-Json
        Write-Host "  [OK]   settings.json 格式合法" -ForegroundColor Green
    } catch {
        Write-Host "  [ERR]  settings.json 格式错误，建议删除后重新运行 CCB 以重建" -ForegroundColor Red
    }
} else {
    Write-Host "  [INFO] settings.json 不存在（首次运行将自动创建）" -ForegroundColor DarkGray
}

# 5. API connectivity
Write-Host "  ...   正在检测 API 连通性 (api.minimaxi.com)..." -NoNewline -ForegroundColor DarkGray
try {
    $resp = Invoke-WebRequest -Uri "https://api.minimaxi.com" -Method Head `
        -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop 2>$null
    Write-Host "`r  [OK]   API 端点可达 (状态: $($resp.StatusCode))                      " -ForegroundColor Green
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -ge 400 -and $code -lt 500) {
        Write-Host "`r  [OK]   API 端点可达 (状态: $code)                      " -ForegroundColor Green
    } else {
        Write-Host "`r  [WARN] API 端点不可达 — 请检查网络或代理设置              " -ForegroundColor Yellow
    }
}

# 6. Multiple CCB instances
$ccbProcs = Get-Process -Name bun -ErrorAction SilentlyContinue | Where-Object {
    try { (Get-Item $_.Path -ErrorAction Stop).FullName -like "*CCB*" } catch { $false }
}
$count = if ($ccbProcs) { @($ccbProcs).Count } else { 0 }
if ($count -gt 0) {
    Write-Host "  [WARN] 检测到 $count 个 CCB 进程正在运行，可能产生冲突" -ForegroundColor Yellow
} else {
    Write-Host "  [OK]   无其他 CCB 实例运行" -ForegroundColor Green
}

Write-Host ""
