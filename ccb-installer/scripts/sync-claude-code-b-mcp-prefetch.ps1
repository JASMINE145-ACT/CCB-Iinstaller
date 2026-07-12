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
$OverlayRoot = Join-Path $RepoRoot "ccb-installer\claude-code-b-src"

if (-not (Test-Path $ClaudeCodeBRoot)) {
  Write-Error "claude-code-B not found at $ClaudeCodeBRoot. Clone/build tree required for source rebuild; live dist hotfix may already be applied under D:\CCB-Wanding\dist."
}

$DestAcp = Join-Path $ClaudeCodeBRoot "src\services\acp"
foreach ($file in @("agent.ts", "agentSessionProfile.ts", "packageRegistry.ts", "employeeProfile.ts", "mcpSessionPrefetch.ts", "mcpToolRepeatGuard.ts", "wanDEnvBootstrap.ts", "wanDMcpWarmup.ts", "sessionMcpConfig.ts", "permissions.ts", "askUserQuestionPermissionResolve.ts", "workspacePointer.ts", "promptConversion.ts", "sessionTranscript.ts")) {
  $src = Join-Path $Overlay $file
  if (-not (Test-Path $src)) { Write-Error "Missing overlay file: $src" }
  Copy-Item $src (Join-Path $DestAcp $file) -Force
  Write-Host "Copied $file -> $DestAcp"
}

# P9: Agent-tool subagent employee profile merge
$runAgentSrc = Join-Path $OverlayRoot "packages\builtin-tools\src\tools\AgentTool\runAgent.ts"
$runAgentDest = Join-Path $ClaudeCodeBRoot "packages\builtin-tools\src\tools\AgentTool\runAgent.ts"
if (-not (Test-Path $runAgentSrc)) { Write-Error "Missing overlay file: $runAgentSrc" }
Copy-Item $runAgentSrc $runAgentDest -Force
Write-Host "Copied runAgent.ts -> $runAgentDest"

$testSrc = Join-Path $Overlay "__tests__\promptConversion.test.ts"
$testDest = Join-Path $DestAcp "__tests__\promptConversion.test.ts"
if (Test-Path $testSrc) {
  New-Item -ItemType Directory -Force -Path (Split-Path $testDest -Parent) | Out-Null
  Copy-Item $testSrc $testDest -Force
  Write-Host "Copied promptConversion.test.ts"
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

$employeeProfileTestSrc = Join-Path $Overlay "__tests__\employeeProfile.test.ts"
$employeeProfileTestDest = Join-Path $DestAcp "__tests__\employeeProfile.test.ts"
if (Test-Path $employeeProfileTestSrc) {
  New-Item -ItemType Directory -Force -Path (Split-Path $employeeProfileTestDest -Parent) | Out-Null
  Copy-Item $employeeProfileTestSrc $employeeProfileTestDest -Force
  Write-Host "Copied employeeProfile.test.ts"
}

$transcriptTestSrc = Join-Path $Overlay "__tests__\sessionTranscript.test.ts"
$transcriptTestDest = Join-Path $DestAcp "__tests__\sessionTranscript.test.ts"
if (Test-Path $transcriptTestSrc) {
  New-Item -ItemType Directory -Force -Path (Split-Path $transcriptTestDest -Parent) | Out-Null
  Copy-Item $transcriptTestSrc $transcriptTestDest -Force
  Write-Host "Copied sessionTranscript.test.ts"
}

$mergeTestSrc = Join-Path $Overlay "__tests__\sessionMcpConfigMerge.test.ts"
$mergeTestDest = Join-Path $DestAcp "__tests__\sessionMcpConfigMerge.test.ts"
if (Test-Path $mergeTestSrc) {
  New-Item -ItemType Directory -Force -Path (Split-Path $mergeTestDest -Parent) | Out-Null
  Copy-Item $mergeTestSrc $mergeTestDest -Force
  Write-Host "Copied sessionMcpConfigMerge.test.ts"
}

$auqTestSrc = Join-Path $Overlay "__tests__\askUserQuestionPermissions.test.ts"
$auqTestDest = Join-Path $DestAcp "__tests__\askUserQuestionPermissions.test.ts"
if (Test-Path $auqTestSrc) {
  New-Item -ItemType Directory -Force -Path (Split-Path $auqTestDest -Parent) | Out-Null
  Copy-Item $auqTestSrc $auqTestDest -Force
  Write-Host "Copied askUserQuestionPermissions.test.ts"
}

if ($Build) {
  Push-Location $ClaudeCodeBRoot
  try {
    if ($env:BUN_JSC_forceRAMSize -lt 3500000000) { $env:BUN_JSC_forceRAMSize = "3500000000" }
    bun test src/services/acp/__tests__/mcpSessionPrefetch.test.ts src/services/acp/__tests__/mcpToolRepeatGuard.test.ts src/services/acp/__tests__/agentSessionProfile.test.ts src/services/acp/__tests__/promptConversion.test.ts src/services/acp/__tests__/sessionTranscript.test.ts src/services/acp/__tests__/sessionMcpConfigMerge.test.ts src/services/acp/__tests__/askUserQuestionPermissions.test.ts src/services/acp/__tests__/employeeProfile.test.ts
    bun run build
  } finally {
    Pop-Location
  }
}

if ($Deploy) {
  & (Join-Path $RepoRoot "ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1")
}

Write-Host "Done. Restart AionUI dev and smoke: new Guid chat -> check /warmup latency_ms and F12 [warmupConversation] ready."
