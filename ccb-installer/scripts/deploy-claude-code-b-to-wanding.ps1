# Copy claude-code-B build output into the CCB-Wanding install dist slot.
# Usage:
#   cd D:\claude-code-B; bun run build
#   .\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1
#   .\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1 -Backup

[CmdletBinding()]
param(
    [string]$SourceDir = "D:\claude-code-B\dist",
    [string]$DestDir = "D:\CCB-Wanding\dist",
    [switch]$Backup,
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SourceDir)) {
    throw "Source dist not found: $SourceDir`nRun: cd D:\claude-code-B; bun run build"
}

if (-not (Test-Path $DestDir)) {
    throw "Destination dist not found: $DestDir`nIs CCB-Wanding installed at D:\CCB-Wanding?"
}

function Test-BuildMcpPatch([string]$DistDir) {
    $chunks = Join-Path $DistDir "chunks"
    if (-not (Test-Path $chunks)) { return $false }
    $hits = Get-ChildItem $chunks -Filter "entry-*.js" -ErrorAction SilentlyContinue |
        Where-Object { Select-String -Path $_.FullName -Pattern '\$buildMcp' -Quiet }
    return [bool]$hits
}

$hadPatch = Test-BuildMcpPatch $DestDir
$sourceHasPatch = Test-BuildMcpPatch $SourceDir

if ($hadPatch -and -not $sourceHasPatch) {
    # Source now has native MCP support via getClaudeConfigHomeDir/settings.json
    # fallback in agent.ts createSession(). The $buildMcp dist-patch is no longer
    # needed. This message is informational only.
    Write-Host "[info] Live install had `$buildMcp patch; source now has native MCP (settings.json fallback). Patch no longer needed." -ForegroundColor Cyan
}

if ($Backup) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupRoot = Join-Path (Split-Path $DestDir -Parent) "dist.backup-$stamp"
    Write-Host "[backup] $DestDir -> $backupRoot"
    if (-not $WhatIf) {
        Copy-Item $DestDir $backupRoot -Recurse -Force
    }
}

Write-Host "[deploy] $SourceDir -> $DestDir (mirror)"
if ($WhatIf) {
    robocopy $SourceDir $DestDir /MIR /XD node_modules /L /NJH /NJS /NDL /NP
    exit 0
}

$robocopyArgs = @($SourceDir, $DestDir, "/MIR", "/XD", "node_modules", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS")
$proc = Start-Process -FilePath "robocopy.exe" -ArgumentList $robocopyArgs -Wait -PassThru -NoNewWindow
# robocopy exit codes 0-7 are success variants
if ($proc.ExitCode -gt 7) {
    throw "robocopy failed with exit code $($proc.ExitCode)"
}

$nowHasPatch = Test-BuildMcpPatch $DestDir
Write-Host "[done] deploy complete. buildMcp in dest: $nowHasPatch"
Write-Host "[next] Smoke: node ccb-installer/test-native-acp-agent.mjs" -ForegroundColor Green
Write-Host "       Or with quotation prompt: CCB_TEST_PROMPT='查询直接50价格' node ccb-installer/test-native-acp-agent.mjs" -ForegroundColor Green
