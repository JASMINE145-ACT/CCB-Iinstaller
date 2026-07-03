# Quick parity check for Copy-WandingDataFromRepo (INT-P1-7)
$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path $PSScriptRoot -Parent) 'lib\sync-wanding-data.ps1')

$repoRoot = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$tmp = Join-Path $env:TEMP ("wanding-data-test-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
try {
    Copy-WandingDataFromRepo -RepoRoot $repoRoot -DataDest $tmp
    $deny = Get-WandingDataMdDenylist
    $expectedMd = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'data') -Filter '*.md' |
        Where-Object { $deny -notcontains $_.Name } | ForEach-Object { $_.Name })
    $expectedXlsx = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'data') -Filter '*.xlsx' |
        ForEach-Object { $_.Name })
    $copied = @(Get-ChildItem -LiteralPath $tmp | ForEach-Object { $_.Name })
    $missing = @($expectedMd + $expectedXlsx | Where-Object { $_ -notin $copied })
    if ($missing.Count -gt 0) {
        throw "missing copies: $($missing -join ', ')"
    }
    if ('ccb-wanding-pricing-system.md' -in $copied) {
        throw 'denylist md was copied'
    }
    Write-Host "PASS copied=$($copied.Count) md=$($expectedMd.Count) xlsx=$($expectedXlsx.Count)"
}
finally {
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
