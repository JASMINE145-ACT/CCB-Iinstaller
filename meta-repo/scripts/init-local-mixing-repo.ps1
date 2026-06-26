# Initialize local Mixing meta-repo and wire submodules to existing checkouts.
# Run from an empty folder or after copying meta-repo/* from claude-code-best.
#
# Usage:
#   .\scripts\init-local-mixing-repo.ps1
#   .\scripts\init-local-mixing-repo.ps1 -MixingRoot D:\Projects\Mixing

param(
  [string]$MixingRoot = 'D:\Projects\Mixing',
  [string]$BackendPath = 'D:\Projects\claude-code-best',
  [string]$DesktopPath = 'D:\Projects\aionui-src',
  [string]$Remote = 'https://github.com/JASMINE145-ACT/Mixing.git'
)

$ErrorActionPreference = 'Stop'
$TemplateRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$MetaRepoRoot = Join-Path $TemplateRoot 'meta-repo'

if (-not (Test-Path $BackendPath)) { throw "Backend not found: $BackendPath" }
if (-not (Test-Path $DesktopPath)) { throw "Desktop not found: $DesktopPath" }

New-Item -ItemType Directory -Force -Path $MixingRoot | Out-Null

foreach ($name in @('README.md', '.gitmodules')) {
  Copy-Item -Force (Join-Path $MetaRepoRoot $name) (Join-Path $MixingRoot $name)
}
Copy-Item -Recurse -Force (Join-Path $MetaRepoRoot 'scripts') (Join-Path $MixingRoot 'scripts')

Set-Location $MixingRoot
if (-not (Test-Path '.git')) {
  git init
  git remote add origin $Remote
}

if (-not (Test-Path 'backend')) {
  git submodule add https://github.com/JASMINE145-ACT/CCB-Iinstaller.git backend 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'submodule add backend failed — linking existing checkout' -ForegroundColor Yellow
    cmd /c mklink /J backend $BackendPath
  }
}

if (-not (Test-Path 'desktop')) {
  git submodule add -b ccb-wanding-1.1.2-recovered https://github.com/JASMINE145-ACT/AionUi.git desktop 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'submodule add desktop failed — fork AionUi first; linking existing checkout' -ForegroundColor Yellow
    cmd /c mklink /J desktop $DesktopPath
  }
}

Write-Host ''
Write-Host "Mixing meta-repo ready at: $MixingRoot" -ForegroundColor Green
Write-Host 'Next:' -ForegroundColor Cyan
Write-Host '  1. Push aionui-src branch to github.com/JASMINE145-ACT/AionUi'
Write-Host '  2. git add README.md .gitmodules scripts && git commit'
Write-Host '  3. git push -u origin main && git tag v1.1.2-recovered && git push origin v1.1.2-recovered'
