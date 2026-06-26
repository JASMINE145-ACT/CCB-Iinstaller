# _apply-spec.ps1 — apply a translation spec to dist/chunks/
# Usage: pwsh -File _apply-spec.ps1 <spec.json>
param([string]$SpecPath)
$ErrorActionPreference = "Stop"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ChunksDir = Join-Path (Split-Path -Parent $scriptDir) "dist\chunks"

if (-not (Test-Path $SpecPath)) { throw "Spec not found: $SpecPath" }

function New-ReplacementMap {
    return [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)
}

function Apply-Replacements {
    param(
        [Parameter(Mandatory = $true)][string]$DistDir,
        [Parameter(Mandatory = $true)]$Replacements
    )
    $hits = 0
    $updatedFiles = 0
    Get-ChildItem -LiteralPath $DistDir -Filter "*.js" -File | ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName, $utf8NoBom)
        $changed = $false
        foreach ($kv in $Replacements.GetEnumerator()) {
            if ($content.Contains($kv.Key)) {
                $content = $content.Replace($kv.Key, $kv.Value)
                $changed = $true
                $hits++
            }
        }
        if ($changed) {
            [System.IO.File]::WriteAllText($_.FullName, $content, $utf8NoBom)
            $updatedFiles++
            Write-Host "  [updated] $($_.Name)" -ForegroundColor Green
        }
    }
    return @{ hits = $hits; files = $updatedFiles }
}

$jsonText = [System.IO.File]::ReadAllText($SpecPath, [System.Text.UTF8Encoding]::new($false))
$spec = $jsonText | ConvertFrom-Json
$totalHits = 0
$totalFiles = 0
foreach ($prop in $spec.PSObject.Properties) {
    $chunkName = $prop.Name
    $entries = $prop.Value
    Write-Host ""
    Write-Host "=== Applying chunk: $chunkName ===" -ForegroundColor Cyan
    $map = New-ReplacementMap
    foreach ($entry in $entries.PSObject.Properties) {
        $map[$entry.Name] = $entry.Value
    }
    $result = Apply-Replacements -DistDir $ChunksDir -Replacements $map
    Write-Host "  hits=$($result.hits) files=$($result.files)"
    $totalHits += $result.hits
    $totalFiles += $result.files
}
Write-Host ""
Write-Host "=== Total: $totalHits hits across $totalFiles files ===" -ForegroundColor Cyan
