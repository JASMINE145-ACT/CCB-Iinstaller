# Start AionUI dev for unified org SSO (org-idp login, no bypass, shared JWT_SECRET).
# Loads secrets from scripts/org-phase0/env.local (gitignored).

$ErrorActionPreference = 'Stop'
$OrgUrl = 'http://67.216.206.3:13401'
$devRoot = Join-Path $env:APPDATA 'AionUi-Dev\aionui'
$orgJson = Join-Path $devRoot 'org-server.json'
$envLocal = Join-Path $PSScriptRoot 'env.local'

function Import-EnvLocalLine {
  param([string]$Line)
  if ($Line -match '^\s*#' -or $Line -match '^\s*$') { return }
  if ($Line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
    Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim()
  }
}

if (Test-Path $envLocal) {
  Get-Content $envLocal | ForEach-Object { Import-EnvLocalLine $_ }
  Write-Host "Loaded SSO env from $envLocal" -ForegroundColor DarkGray
} else {
  Write-Host "WARN: missing $envLocal — copy env.example and fill JWT_SECRET" -ForegroundColor Yellow
}

if (-not $env:AIONUI_SSO_MODE) { $env:AIONUI_SSO_MODE = 'org-idp' }
if (-not $env:JWT_SECRET) {
  throw 'JWT_SECRET is required for SSO dev — set in scripts/org-phase0/env.local'
}

New-Item -ItemType Directory -Force -Path $devRoot | Out-Null
if (-not (Test-Path $orgJson)) {
  $json = @{ url = $OrgUrl } | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText($orgJson, $json, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "Created $orgJson" -ForegroundColor Yellow
} else {
  Write-Host "Using existing $orgJson" -ForegroundColor DarkGray
}

Remove-Item Env:AIONUI_BYPASS_AUTH -ErrorAction SilentlyContinue
Write-Host "AIONUI_SSO_MODE=$($env:AIONUI_SSO_MODE) JWT_SECRET len=$($env:JWT_SECRET.Length)" -ForegroundColor Cyan

$selfBuiltCore = 'D:\Projects\claude-code-best\AionCore\target\release'
$bundledCore   = 'D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64'
$env:PATH = "$selfBuiltCore;$bundledCore;$env:PATH"
Set-Location 'D:\Projects\aionui-src'

Get-Process -Name electron,aioncore -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host 'Starting AionUI dev (unified org SSO mode)...' -ForegroundColor Cyan
bun run dev
