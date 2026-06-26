# Deploy Phase 1 smoke seed agents to the CCB-Wanding user config agents directory.
# Usage:
#   .\ccb-installer\scripts\deploy-seed-agents.ps1
#   .\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
# Implementation delegates to deploy-seed-agents.mjs for UTF-8-safe copies.

param(
    [string]$ConfigDir,
    [switch]$ForceMd
)

$ErrorActionPreference = "Stop"

$nodeScript = Join-Path $PSScriptRoot "deploy-seed-agents.mjs"
if (-not (Test-Path -LiteralPath $nodeScript)) {
    throw "deploy-seed-agents.mjs not found: $nodeScript"
}

function Resolve-BundledNode {
    $installDir = Split-Path $PSScriptRoot -Parent
    $bun = Join-Path $installDir 'vendor\bun\bun.exe'
    if (Test-Path -LiteralPath $bun) { return $bun }
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) { return $node.Source }
    throw "No JavaScript runtime for deploy-seed-agents (expected $bun or node on PATH)"
}

$runtime = Resolve-BundledNode

$nodeArgs = @($nodeScript)
if ($ConfigDir) {
    $nodeArgs += "--config=$ConfigDir"
}
if ($ForceMd) {
    $nodeArgs += "--force-md"
}

& $runtime @nodeArgs
if ($LASTEXITCODE -ne 0) {
    throw "deploy-seed-agents.mjs failed with exit code $LASTEXITCODE"
}
