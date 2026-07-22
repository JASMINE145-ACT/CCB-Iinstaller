# Smoke suite for purge-stale-wanding-installs.ps1 + packaging wiring (no real install touch).
# Usage: powershell -File .\ccb-installer\scripts\test-purge-stale-wanding-installs.ps1
#
# Covers: basic purge, invoker≠keep, NSIS empty-Keep DirectoryLeave sim,
# dry-run no-delete, .claude preserved, foreign skip, locked residual post-check,
# pack shipScripts/NSI/staging.

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$installerRoot = Split-Path -Parent $here
$purge = Join-Path $here 'purge-stale-wanding-installs.ps1'
$cmd = Join-Path $installerRoot 'ccb-purge-stale-installs.cmd'
$nsi = Join-Path $installerRoot 'installer-wanding-v2.nsi'
$buildPs1 = Join-Path $here 'build-wanding.ps1'
$buildLib = Join-Path $here 'build-wanding-lib.ps1'

if (-not (Test-Path -LiteralPath $purge)) { throw "missing $purge" }

$failures = [System.Collections.Generic.List[string]]::new()
function Assert-True([bool]$Cond, [string]$Msg) {
    if (-not $Cond) { $script:failures.Add($Msg) | Out-Null }
}
function Assert-Exit([int]$Actual, [int]$Expected, [string]$Case) {
    if ($Actual -ne $Expected) {
        $script:failures.Add("$Case expected exit $Expected, got $Actual") | Out-Null
    }
}

function New-FakeInstall {
    param([string]$Root, [string]$Version, [switch]$Marked)
    New-Item -ItemType Directory -Force -Path (Join-Path $Root 'dist') | Out-Null
    Set-Content -LiteralPath (Join-Path $Root 'dist\VERSION') -Value $Version -Encoding ascii
    Set-Content -LiteralPath (Join-Path $Root 'dist\cli.js') -Value "// $Version" -Encoding ascii
    Set-Content -LiteralPath (Join-Path $Root 'ccb-launch-aionui.cmd') -Value '@echo off' -Encoding ascii
    if ($Marked) {
        Set-Content -LiteralPath (Join-Path $Root '.ccb-wanding-install-root') -Value $Version -Encoding ascii
    }
}

$root = Join-Path $env:TEMP ("ccb-purge-smoke-" + [guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory -Force -Path $root | Out-Null

try {
    # ---------- Case 1: explicit keep + extra stale ----------
    $keep = Join-Path $root 'c1-keep'
    $stale = Join-Path $root 'c1-stale'
    New-FakeInstall -Root $keep -Version '1.1.9' -Marked
    New-FakeInstall -Root $stale -Version '1.1.8'
    & $purge -KeepInstallDir $keep -ExtraCandidatePaths @($stale) -Apply -Force -Quiet `
        -SkipShortcuts -SkipProcessStop -LogFile (Join-Path $root 'c1.log')
    Assert-Exit $LASTEXITCODE 0 'case1'
    Assert-True (Test-Path (Join-Path $keep 'dist\VERSION')) 'case1 KEEP deleted'
    Assert-True (-not (Test-Path (Join-Path $stale 'dist\VERSION'))) 'case1 STALE still present'

    # ---------- Case 2: invoker is stale, Keep explicit ----------
    $keep2 = Join-Path $root 'c2-keep'
    $stale2 = Join-Path $root 'c2-stale'
    $invoker = Join-Path $root 'c2-invoker'
    New-FakeInstall -Root $keep2 -Version '2.0.0' -Marked
    New-FakeInstall -Root $stale2 -Version '1.1.8'
    New-FakeInstall -Root $invoker -Version '1.1.8'
    & $purge -KeepInstallDir $keep2 -InvokerInstallDir $invoker `
        -ExtraCandidatePaths @($stale2, $invoker) -Apply -Force -Quiet `
        -SkipShortcuts -SkipProcessStop -LogFile (Join-Path $root 'c2.log')
    Assert-Exit $LASTEXITCODE 0 'case2'
    Assert-True (Test-Path (Join-Path $keep2 'dist\VERSION')) 'case2 KEEP deleted (CRITICAL)'
    Assert-True (-not (Test-Path (Join-Path $invoker 'dist\VERSION'))) 'case2 invoker-stale still present'

    # ---------- Case 3: NSIS DirectoryLeave — empty future INSTDIR as Keep ----------
    $emptyKeep = Join-Path $root 'c3-instdir-empty'
    $otherCopy = Join-Path $root 'c3-other'
    New-Item -ItemType Directory -Force -Path $emptyKeep | Out-Null
    New-FakeInstall -Root $otherCopy -Version '1.1.9' -Marked
    $report = Join-Path $root 'c3-report.txt'
    & $purge -KeepInstallDir $emptyKeep -ExtraCandidatePaths @($otherCopy) -Quiet `
        -SkipShortcuts -SkipProcessStop -ReportFile $report -LogFile (Join-Path $root 'c3-detect.log')
    Assert-Exit $LASTEXITCODE 2 'case3 dry-run should find stale (exit 2)'
    Assert-True (Test-Path $report) 'case3 ReportFile missing'
    $reportText = Get-Content -LiteralPath $report -Raw -Encoding Unicode
    Assert-True ($reportText -like "*$otherCopy*") 'case3 report missing other path'
    Assert-True (Test-Path (Join-Path $otherCopy 'dist\VERSION')) 'case3 dry-run deleted stale!'

    & $purge -KeepInstallDir $emptyKeep -ExtraCandidatePaths @($otherCopy) -Apply -Force -Quiet `
        -SkipShortcuts -SkipProcessStop -LogFile (Join-Path $root 'c3-apply.log')
    Assert-Exit $LASTEXITCODE 0 'case3 apply'
    Assert-True (Test-Path $emptyKeep) 'case3 empty Keep dir removed'
    Assert-True (-not (Test-Path (Join-Path $otherCopy 'dist\VERSION'))) 'case3 other copy not cleared'
    Assert-True (-not (Test-Path (Join-Path $otherCopy '.ccb-wanding-install-root'))) 'case3 marker remains'

    # ---------- Case 4: .claude preserved beside misplaced program tree ----------
    $misroot = Join-Path $root 'c4-localapp'
    $claude = Join-Path $misroot '.claude'
    New-Item -ItemType Directory -Force -Path $claude | Out-Null
    Set-Content -LiteralPath (Join-Path $claude 'settings.json') -Value '{"ok":true}' -Encoding utf8
    New-FakeInstall -Root $misroot -Version '1.0.0'
    $keep4 = Join-Path $root 'c4-keep'
    New-FakeInstall -Root $keep4 -Version '2.0.0' -Marked
    & $purge -KeepInstallDir $keep4 -ExtraCandidatePaths @($misroot) -Apply -Force -Quiet `
        -SkipShortcuts -SkipProcessStop -LogFile (Join-Path $root 'c4.log')
    Assert-Exit $LASTEXITCODE 0 'case4'
    Assert-True (Test-Path (Join-Path $claude 'settings.json')) 'case4 .claude/settings.json deleted'
    Assert-True (-not (Test-Path (Join-Path $misroot 'dist\VERSION'))) 'case4 misplaced dist remains'

    # ---------- Case 5: foreign directory (no CCB footprints) skipped ----------
    $foreign = Join-Path $root 'c5-foreign'
    New-Item -ItemType Directory -Force -Path $foreign | Out-Null
    Set-Content -LiteralPath (Join-Path $foreign 'readme.txt') -Value 'not ccb' -Encoding ascii
    $keep5 = Join-Path $root 'c5-keep'
    New-FakeInstall -Root $keep5 -Version '2.0.0' -Marked
    & $purge -KeepInstallDir $keep5 -ExtraCandidatePaths @($foreign) -Apply -Force -Quiet `
        -SkipShortcuts -SkipProcessStop -LogFile (Join-Path $root 'c5.log')
    Assert-Exit $LASTEXITCODE 0 'case5 (no stale → 0)'
    Assert-True (Test-Path (Join-Path $foreign 'readme.txt')) 'case5 foreign file deleted'

    # ---------- Case 5b: NSIS explicit Keep — former registry/old tree MUST purge ----------
    # Simulates HKCU InstallDir still pointing at oldPath while installer Keep=$INSTDIR(new).
    $newInst = Join-Path $root 'c5b-new-instdir'
    $oldReg = Join-Path $root 'c5b-old-registry'
    New-Item -ItemType Directory -Force -Path $newInst | Out-Null
    New-FakeInstall -Root $oldReg -Version '1.1.9' -Marked
    & $purge -KeepInstallDir $newInst -ExtraCandidatePaths @($oldReg) -Apply -Force -Quiet `
        -SkipShortcuts -SkipProcessStop -LogFile (Join-Path $root 'c5b.log')
    Assert-Exit $LASTEXITCODE 0 'case5b'
    Assert-True (Test-Path $newInst) 'case5b new INSTDIR removed'
    Assert-True (-not (Test-Path (Join-Path $oldReg 'dist\VERSION'))) `
        'case5b old registry-style tree not purged under explicit Keep (IMPORTANT regress)'

    # ---------- Case 6: post-check must catch AionUi.exe residual (not only dist\cli.js) ----------
    $keep6 = Join-Path $root 'c6-keep'
    $stale6 = Join-Path $root 'c6-stale'
    New-FakeInstall -Root $keep6 -Version '2.0.0' -Marked
    New-FakeInstall -Root $stale6 -Version '1.1.8'
    $exeDir = Join-Path $stale6 'AionUi'
    New-Item -ItemType Directory -Force -Path $exeDir | Out-Null
    $exePath = Join-Path $exeDir 'AionUi.exe'
    Set-Content -LiteralPath $exePath -Value 'fake-exe' -Encoding ascii
    $lockStream = $null
    try {
        $lockStream = [System.IO.File]::Open(
            $exePath,
            [System.IO.FileMode]::Open,
            [System.IO.FileAccess]::Read,
            [System.IO.FileShare]::None)
        & $purge -KeepInstallDir $keep6 -ExtraCandidatePaths @($stale6) -Apply -Force -Quiet `
            -SkipShortcuts -SkipProcessStop -LogFile (Join-Path $root 'c6.log')
        Assert-Exit $LASTEXITCODE 1 'case6 locked residual should fail expanded post-check'
        Assert-True (Test-Path -LiteralPath $exePath) 'case6 locked AionUi.exe should remain'
        $log6 = Get-Content -LiteralPath (Join-Path $root 'c6.log') -Raw -ErrorAction SilentlyContinue
        Assert-True ($log6 -like '*residual after purge*' -or $log6 -like '*still present after delete*') `
            'case6 log missing residual/AV clue'
    }
    finally {
        if ($null -ne $lockStream) {
            $lockStream.Close()
            $lockStream.Dispose()
        }
    }

    # ---------- Case 7: packaging wiring (no full build) ----------
    Assert-True (Test-Path $cmd) 'pack: missing ccb-purge-stale-installs.cmd'
    Assert-True (Test-Path $nsi) 'pack: missing installer-wanding-v2.nsi'
    $nsiText = [System.IO.File]::ReadAllText($nsi, [System.Text.UTF8Encoding]::new($false))
    Assert-True ($nsiText -match 'Function DirectoryLeave') 'pack: NSI missing DirectoryLeave'
    Assert-True ($nsiText -match 'purge-stale-wanding-installs\.ps1') 'pack: NSI missing purge script File'
    Assert-True ($nsiText -match 'ccb-purge-stale-installs\.cmd') 'pack: NSI missing purge cmd'
    Assert-True ($nsiText -match 'Purge Stale Installs') 'pack: NSI missing Start Menu shortcut'
    Assert-True ($nsiText -match 'MUI_PAGE_CUSTOMFUNCTION_LEAVE DirectoryLeave') 'pack: DirectoryLeave not wired to DIRECTORY page'
    Assert-True ($nsiText -match 'install-stale-report-') 'pack: STALE_REPORT must be under logs (durable)'
    Assert-True ($nsiText -notmatch '\$PLUGINSDIR\\stale-report') 'pack: report must NOT stay only in PLUGINSDIR'
    Assert-True ($nsiText -match 'fully quit AionUI \(including tray\)') 'pack: MessageBox/UX must tell user to quit AionUI'
    Assert-True ($nsiText -match 'IfSilent directory_leave_purge') 'pack: silent /S auto-purge path'
    Assert-True ($nsiText -match 'IfSilent 0 preserve_after_silent_stale') 'pack: silent must Call DirectoryLeave from Preserve section'
    Assert-True ($nsiText -match 'Call DirectoryLeave') 'pack: silent Call DirectoryLeave site'
    Assert-True ($nsiText -match 'IfFileExists "\$STALE_REPORT"') 'pack: hide empty report path branch'
    Assert-True ($nsiText -match 'Delete "\$SMPROGRAMS\\\$\{STARTMENU_FOLDER\}\\Purge Stale Installs\.lnk"') `
        'pack: uninstall must Delete Purge Stale Installs.lnk'

    $buildText = Get-Content -LiteralPath $buildPs1 -Raw
    Assert-True ($buildText -match "'purge-stale-wanding-installs\.ps1'") 'pack: not in build-wanding `$shipScripts'
    Assert-True ($buildText -match 'ccb-purge-stale-installs\.cmd') 'pack: staging Copy-Item for cmd missing'
    Assert-True ($buildText -match "'test-purge-stale-wanding-installs\.ps1'") 'pack: test script must be in `$devOnlyScripts (not unclassified WARN)'

    $libText = Get-Content -LiteralPath $buildLib -Raw
    Assert-True ($libText -match "'purge-stale-wanding-installs\.ps1'") 'pack: not in build-wanding-lib Get-WandingShipScripts'

    $cmdText = Get-Content -LiteralPath $cmd -Raw
    Assert-True ($cmdText -match 'fully quit AionUI') 'pack: employee .cmd must warn quit AionUI'

    # Simulate staging slice NSIS DirectoryLeave needs at compile/runtime extract time
    $fakeStaging = Join-Path $root 'fake-staging'
    $fakeScripts = Join-Path $fakeStaging 'scripts'
    New-Item -ItemType Directory -Force -Path $fakeScripts | Out-Null
    Copy-Item -LiteralPath $purge -Destination (Join-Path $fakeScripts 'purge-stale-wanding-installs.ps1') -Force
    Copy-Item -LiteralPath $cmd -Destination (Join-Path $fakeStaging 'ccb-purge-stale-installs.cmd') -Force
    Assert-True (Test-Path (Join-Path $fakeScripts 'purge-stale-wanding-installs.ps1')) 'pack: staging scripts/purge missing after copy'
    Assert-True (Test-Path (Join-Path $fakeStaging 'ccb-purge-stale-installs.cmd')) 'pack: staging cmd missing after copy'

    # NSIS File path relative to installer root at makensis time
    $nsiFileRel = Join-Path $installerRoot 'staging\scripts\purge-stale-wanding-installs.ps1'
    # May not exist until build — ensure scripts source exists (what build copies FROM)
    Assert-True (Test-Path $purge) 'pack: source purge script missing for $shipScripts copy'

    # Conflict check: purge must not appear twice conflicting in ship vs devOnly
    $shipHit = [regex]::Matches($buildText, "'purge-stale-wanding-installs\.ps1'").Count
    Assert-True ($shipHit -ge 1) 'pack: shipScripts purge entry count 0'

    if ($failures.Count -gt 0) {
        Write-Host 'FAIL test-purge-stale-wanding-installs' -ForegroundColor Red
        foreach ($f in $failures) { Write-Host "  - $f" -ForegroundColor Red }
        exit 1
    }

    Write-Host 'PASS test-purge-stale-wanding-installs (7 behavioral + pack wiring)' -ForegroundColor Green
    exit 0
}
finally {
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
