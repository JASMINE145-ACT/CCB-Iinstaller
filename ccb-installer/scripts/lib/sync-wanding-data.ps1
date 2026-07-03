# Shared Wanding data staging — mirrors build-wanding.ps1 L531–544 (md denylist + all xlsx).
# Used by sync-dev-wanding-vendor.ps1; build-wanding may inline the same rule until unified.

function Get-WandingDataMdDenylist {
    return @(
        'ccb-wanding-update-server.md',
        'ccb-wanding-pricing-system.md'
    )
}

function Copy-WandingDataFromRepo {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [string]$DataDest
    )
    $dataRoot = Join-Path $RepoRoot 'data'
    if (-not (Test-Path -LiteralPath $dataRoot)) {
        Write-Host "[skip] data root missing: $dataRoot" -ForegroundColor Yellow
        return
    }
    $denylist = Get-WandingDataMdDenylist
    $null = New-Item -ItemType Directory -Force -Path $DataDest
    Get-ChildItem -LiteralPath $dataRoot -Filter '*.md' -ErrorAction SilentlyContinue | ForEach-Object {
        if ($denylist -notcontains $_.Name) {
            Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $DataDest $_.Name) -Force
            Write-Host "[copy] data\$($_.Name)"
        }
    }
    Get-ChildItem -LiteralPath $dataRoot -Filter '*.xlsx' -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $DataDest $_.Name) -Force
        Write-Host "[copy] data\$($_.Name)"
    }
}
