$exe = 'D:\Projects\claude-code-best\ccb-installer\CCB-Wanding-2.0.1.exe'
$ver = Get-Content -LiteralPath 'D:\Projects\claude-code-best\ccb-installer\staging\dist\VERSION' -Raw
$gen = (Get-Content -LiteralPath 'D:\Projects\claude-code-best\ccb-installer\staging\seed\config-ship-manifest.json' -Raw | ConvertFrom-Json).config_generation
Write-Output ("VERSION=" + $ver.Trim())
Write-Output ("config_generation=" + $gen)
Write-Output ("exe_exists=" + (Test-Path -LiteralPath $exe))
if (Test-Path -LiteralPath $exe) {
  $i = Get-Item -LiteralPath $exe
  Write-Output ("bytes=" + $i.Length)
  Write-Output ("mtime=" + $i.LastWriteTime)
  $h = Get-FileHash -LiteralPath $exe -Algorithm SHA256
  Write-Output ("SHA256=" + $h.Hash)
}
# F0a spot-check staging
$checks = @(
  'staging\scripts\purge-stale-wanding-installs.ps1',
  'staging\scripts\find-wanding-installs.ps1',
  'staging\scripts\repair-wanding-install-dir.ps1',
  'staging\ccb-purge-stale-installs.cmd',
  'staging\ccb-list-installs.cmd',
  'staging\seed\skills\quotation-learn-by-data\SKILL.md'
)
$root = 'D:\Projects\claude-code-best\ccb-installer'
foreach ($c in $checks) {
  Write-Output (("OK " + $c) + '=' + (Test-Path -LiteralPath (Join-Path $root $c)))
}
