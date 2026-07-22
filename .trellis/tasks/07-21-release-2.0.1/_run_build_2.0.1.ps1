$ErrorActionPreference = 'Stop'
$ver = '2.0.1'
$root = 'D:\Projects\claude-code-best\ccb-installer'
$log = Join-Path $root "build-$ver-full.log"
$scripts = Join-Path $root 'scripts'
$aioncore = 'D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe'

Set-Location $scripts
Write-Host "Logging to $log"
& .\build-wanding.ps1 -Version $ver `
  -AioncorePath $aioncore `
  -SkipAionUiBuild `
  *>&1 | Tee-Object -FilePath $log
$code = $LASTEXITCODE
Write-Host "BUILD_EXIT=$code"
exit $code
