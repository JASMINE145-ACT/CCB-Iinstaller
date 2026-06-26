# Sync CCB ACP overlay (agent.ts incl. idle stale-session rehydrate, mcpSessionPrefetch) into claude-code-B, then build + deploy.
#
# Usage:
#   .\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1
#   .\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy
#
param(
  [string]$ClaudeCodeBRoot = "D:\claude-code-B",
  [switch]$Build,
  [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$Overlay = Join-Path $RepoRoot "ccb-installer\claude-code-b-src\src\services\acp"

if (-not (Test-Path $ClaudeCodeBRoot)) {
  Write-Error "claude-code-B not found at $ClaudeCodeBRoot. Clone/build tree required for source rebuild; live dist hotfix may already be applied under D:\CCB-Wanding\dist."
}

$DestAcp = Join-Path $ClaudeCodeBRoot "src\services\acp"
foreach ($file in @("agent.ts", "agentSessionProfile.ts", "mcpSessionPrefetch.ts", "mcpToolRepeatGuard.ts", "wanDEnvBootstrap.ts", "wanDMcpWarmup.ts", "permissions.ts", "workspacePointer.ts")) {
  $src = Join-Path $Overlay $file
  if (-not (Test-Path $src)) { Write-Error "Missing overlay file: $src" }
  Copy-Item $src (Join-Path $DestAcp $file) -Force
  Write-Host "Copied $file -> $DestAcp"
}

$testSrc = Join-Path $Overlay "__tests__\mcpSessionPrefetch.test.ts"
$testDest = Join-Path $DestAcp "__tests__\mcpSessionPrefetch.test.ts"
if (Test-Path $testSrc) {
  New-Item -ItemType Directory -Force -Path (Split-Path $testDest -Parent) | Out-Null
  Copy-Item $testSrc $testDest -Force
  Write-Host "Copied mcpSessionPrefetch.test.ts"
}

$repeatTestSrc = Join-Path $Overlay "__tests__\mcpToolRepeatGuard.test.ts"
$repeatTestDest = Join-Path $DestAcp "__tests__\mcpToolRepeatGuard.test.ts"
if (Test-Path $repeatTestSrc) {
  New-Item -ItemType Directory -Force -Path (Split-Path $repeatTestDest -Parent) | Out-Null
  Copy-Item $repeatTestSrc $repeatTestDest -Force
  Write-Host "Copied mcpToolRepeatGuard.test.ts"
}

$profileTestSrc = Join-Path $Overlay "__tests__\agentSessionProfile.test.ts"
$profileTestDest = Join-Path $DestAcp "__tests__\agentSessionProfile.test.ts"
if (Test-Path $profileTestSrc) {
  New-Item -ItemType Directory -Force -Path (Split-Path $profileTestDest -Parent) | Out-Null
  Copy-Item $profileTestSrc $profileTestDest -Force
  Write-Host "Copied agentSessionProfile.test.ts"
}

if ($Build) {
  Push-Location $ClaudeCodeBRoot
  try {
    if ($env:BUN_JSC_forceRAMSize -lt 3500000000) { $env:BUN_JSC_forceRAMSize = "3500000000" }
    bun test src/services/acp/__tests__/mcpSessionPrefetch.test.ts src/services/acp/__tests__/mcpToolRepeatGuard.test.ts src/services/acp/__tests__/agentSessionProfile.test.ts
    bun run build
  } finally {
    Pop-Location
  }
}

if ($Deploy) {
  & (Join-Path $RepoRoot "ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1") -Backup
}

Write-Host "Done. Restart AionUI dev and smoke: new Guid chat -> check /warmup latency_ms and F12 [warmupConversation] ready."
