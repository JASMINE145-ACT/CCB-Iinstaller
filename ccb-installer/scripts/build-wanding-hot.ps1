# Build CCB-Wanding hot-update zip (partial components only — no full NSIS staging).
# Spec: .trellis/spec/integration/wanding-packaging-whitelist.md §16.1
#       .trellis/spec/integration/internal-update.md
#
# Usage:
#   .\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.2 -Components dist,python,seed
#   .\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.2 -AutoFromGitDiff
#   .\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.2 -Components dist -BuildDist
#
# Apply on target PC:
#   .\scripts\internal-upgrade.ps1 -ZipPath '...\CCB-dist-1.0.2-win-x64.zip' `
#     -ExpectedVersion 1.0.2 -ExpectedSha256 (Get-Content ...\.sha256)

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [string[]]$Components = @('dist', 'scripts'),
    [string]$ClaudeCodeBRoot = 'D:\claude-code-B',
    [string]$ReferenceInstallDir = '',
    [string]$OutputDir = '',
    [string]$GitBaseRef = 'HEAD',
    [switch]$AutoFromGitDiff,
    [switch]$BuildDist,
    [switch]$RebuildMcpPip
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'build-wanding-lib.ps1')

$roots = Get-WandingBuildRoots -ScriptsRoot $PSScriptRoot
$installerRoot = $roots.InstallerRoot

# Allow -Components dist,python,seed as one comma-separated argument
$expandedComponents = [System.Collections.Generic.List[string]]::new()
foreach ($entry in $Components) {
    foreach ($part in ($entry -split ',')) {
        $trimmed = $part.Trim()
        if ($trimmed) { [void]$expandedComponents.Add($trimmed) }
    }
}
$Components = @($expandedComponents)

if (-not $ReferenceInstallDir) {
    $ReferenceInstallDir = Resolve-WandingReferenceInstallDir
}

if ($AutoFromGitDiff) {
    $Components = Resolve-WandingHotComponentsFromGit -RepoRoot $roots.RepoRoot -BaseRef $GitBaseRef
    Write-Host "  AutoFromGitDiff -> $($Components -join ', ')" -ForegroundColor DarkGray
}

$normalized = Normalize-WandingHotComponents -Components $Components
if ($normalized.Count -eq 0) {
    throw 'No components selected. Use -Components dist,python,seed or -AutoFromGitDiff'
}

$catalog = Get-WandingHotComponentCatalog
foreach ($c in $normalized) {
    if (-not $catalog.Contains($c)) {
        throw "Unknown component '$c'. Valid: $($catalog.Keys -join ', ')"
    }
}

$needsRef = @('office-word', 'excel') | Where-Object { $_ -in $normalized -and -not $RebuildMcpPip }
if ($needsRef -and -not $ReferenceInstallDir) {
    throw "Components [$($needsRef -join ', ')] copy MCP from an existing install. Pass -ReferenceInstallDir or use -RebuildMcpPip (slow)."
}

if (-not $OutputDir) {
    $OutputDir = Join-Path $installerRoot 'out\hot'
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$zipName = "CCB-dist-$Version-win-x64.zip"
$zipPath = Join-Path $OutputDir $zipName
$shaPath = "$zipPath.sha256"

$tempRoot = Join-Path $env:TEMP "ccb-hot-build-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

Write-WandingBuildStep "Hot update build — version $Version"
Write-Host "  Components: $($normalized -join ', ')" -ForegroundColor DarkGray
Write-Host "  Temp:       $tempRoot" -ForegroundColor DarkGray
Write-Host "  Output:     $zipPath" -ForegroundColor DarkGray
if ($ReferenceInstallDir) {
    Write-Host "  Reference:  $ReferenceInstallDir" -ForegroundColor DarkGray
}

try {
    foreach ($component in $normalized) {
        Write-WandingBuildStep "Stage component: $component"
        Invoke-WandingHotComponentStage `
            -Component $component `
            -HotRoot $tempRoot `
            -Version $Version `
            -Roots $roots `
            -ClaudeCodeBRoot $ClaudeCodeBRoot `
            -ReferenceInstallDir $ReferenceInstallDir `
            -BuildDist:$BuildDist `
            -RebuildMcpPip:$RebuildMcpPip
    }

    $expectedPaths = Get-WandingHotZipRelPaths -Components $normalized
    foreach ($rel in $expectedPaths) {
        $staged = Join-Path $tempRoot $rel
        if (-not (Test-Path -LiteralPath $staged)) {
            throw "Staging incomplete: expected '$rel' for components [$($normalized -join ', ')]"
        }
    }

    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    Write-WandingBuildStep 'Compress zip'
    Compress-Archive -Path (Get-ChildItem -LiteralPath $tempRoot | ForEach-Object { $_.FullName }) -DestinationPath $zipPath -CompressionLevel Optimal

    $hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::WriteAllText($shaPath, $hash, [System.Text.UTF8Encoding]::new($false))

    $sizeMb = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 2)
    Write-Host ''
    Write-Host "[OK] $zipPath ($sizeMb MB)" -ForegroundColor Green
    Write-Host "     sha256: $hash" -ForegroundColor DarkGray
    Write-Host "     sidecar: $shaPath" -ForegroundColor DarkGray
    Write-Host ''
    Write-Host 'Apply on target:' -ForegroundColor Cyan
    Write-Host "  .\scripts\internal-upgrade.ps1 -ZipPath '$zipPath' -ExpectedVersion $Version -ExpectedSha256 $hash" -ForegroundColor DarkGray
    Write-Host 'Publish (optional):' -ForegroundColor Cyan
    Write-Host "  .\scripts\update\publish-update-bundle.ps1 ... -CcbDistZip '$zipPath' -CcbVersion $Version" -ForegroundColor DarkGray
}
finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
