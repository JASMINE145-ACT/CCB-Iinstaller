# Packaging / ship conflict smoke for stale-purge (no makensis / no full build).
# Usage: powershell -File .\ccb-installer\scripts\test-purge-packaging-wiring.ps1

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$installerRoot = Split-Path -Parent $here
. (Join-Path $here 'build-wanding-lib.ps1')

$ship = @(Get-WandingShipScripts)
if ($ship -notcontains 'purge-stale-wanding-installs.ps1') {
    throw 'FAIL: purge-stale-wanding-installs.ps1 not in Get-WandingShipScripts'
}
if ($ship -contains 'test-purge-stale-wanding-installs.ps1') {
    throw 'FAIL: test-purge must NOT ship (should be $devOnlyScripts only)'
}
if ($ship -contains 'test-purge-packaging-wiring.ps1') {
    throw 'FAIL: this wiring test must not ship'
}

$srcPurge = Join-Path $here 'purge-stale-wanding-installs.ps1'
$srcCmd = Join-Path $installerRoot 'ccb-purge-stale-installs.cmd'
if (-not (Test-Path -LiteralPath $srcPurge)) { throw "missing $srcPurge" }
if (-not (Test-Path -LiteralPath $srcCmd)) { throw "missing $srcCmd" }

# Mirror build-wanding.ps1 ship copy steps into a disposable staging dir
$staging = Join-Path $env:TEMP ("ccb-purge-stage-" + [guid]::NewGuid().ToString('n'))
$scriptsDest = Join-Path $staging 'scripts'
New-Item -ItemType Directory -Force -Path $scriptsDest | Out-Null
Copy-Item -LiteralPath $srcPurge -Destination (Join-Path $scriptsDest 'purge-stale-wanding-installs.ps1') -Force
Copy-Item -LiteralPath $srcCmd -Destination (Join-Path $staging 'ccb-purge-stale-installs.cmd') -Force

# What makensis File "staging\..." requires after a real build
$need = @(
    (Join-Path $scriptsDest 'purge-stale-wanding-installs.ps1'),
    (Join-Path $staging 'ccb-purge-stale-installs.cmd')
)
foreach ($p in $need) {
    if (-not (Test-Path -LiteralPath $p)) { throw "FAIL staging missing $p" }
}

# NSI DirectoryLeave File source is relative to NSI cwd at compile time (= installer root with staging/)
$nsi = Get-Content -LiteralPath (Join-Path $installerRoot 'installer-wanding-v2.nsi') -Raw
if ($nsi -notmatch 'Function DirectoryLeave') { throw 'FAIL NSI DirectoryLeave missing' }
if ($nsi -notmatch 'File "staging\\scripts\\purge-stale-wanding-installs\.ps1"') {
    throw 'FAIL NSI File staging\scripts\purge-stale path mismatch'
}
if ($nsi -notmatch 'File "staging\\ccb-purge-stale-installs\.cmd"') {
    throw 'FAIL NSI File staging\ccb-purge-stale-installs.cmd missing'
}
if ($nsi -notmatch 'KeepInstallDir "\$INSTDIR"') {
    throw 'FAIL NSI purge does not pass -KeepInstallDir $INSTDIR'
}

# Ensure build-wanding $devOnlyScripts classifies the unit smoke (grep source)
$build = Get-Content -LiteralPath (Join-Path $here 'build-wanding.ps1') -Raw
if ($build -notmatch "'test-purge-stale-wanding-installs\.ps1'") {
    throw 'FAIL test-purge-stale not listed in build-wanding.ps1 (devOnly)'
}
if ($build -notmatch "'test-purge-packaging-wiring\.ps1'") {
    # optional — add ourselves to avoid unclassified WARN
}

Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'PASS test-purge-packaging-wiring'
exit 0
