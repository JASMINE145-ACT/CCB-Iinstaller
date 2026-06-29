# M7 post-deploy smoke for ROE MVP (Windows-native; no bash required).
# Usage: .\ccb-installer\scripts\smoke-roe-deploy.ps1

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$skillDest = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills\ccb-subagent-gate"
$agentMd = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\agents\quotation-agent.md"
$fixtures = Join-Path $repoRoot "ccb-installer\config\skills\ccb-subagent-gate\tests\fixtures\transcripts"
$pyTest = Join-Path $repoRoot "ccb-installer\config\skills\ccb-subagent-gate\tests\test_roe_gate.py"
$logDir = Join-Path $env:TEMP "roe-deploy-smoke-logs"

$pass = 0
$fail = 0

function Assert-File($path, $label) {
    if (Test-Path -LiteralPath $path) {
        Write-Host "[PASS] $label"
        $script:pass++
    } else {
        Write-Host "[FAIL] $label — missing: $path"
        $script:fail++
    }
}

function Assert-Content($path, $pattern, $label) {
    if ((Test-Path -LiteralPath $path) -and (Select-String -LiteralPath $path -Pattern $pattern -Quiet)) {
        Write-Host "[PASS] $label"
        $script:pass++
    } else {
        Write-Host "[FAIL] $label"
        $script:fail++
    }
}

Write-Host "=== M6 deploy artifacts ==="
Assert-File (Join-Path $skillDest "scripts\validators\quotation-roe.sh") "quotation-roe.sh deployed"
Assert-File (Join-Path $skillDest "scripts\lib\parse_transcript_roe.py") "parse_transcript_roe.py deployed"
Assert-File (Join-Path $skillDest "config\modes.json") "modes.json deployed"
Assert-Content (Join-Path $skillDest "config\modes.json") 'quotation-agent:roe' "modes.json quotation-agent:roe"
Assert-Content $agentMd "subagent-gate\.sh" "quotation-agent Stop hook"
Assert-Content $agentMd "ROE" "quotation-agent ROE SOP section"

Write-Host ""
Write-Host "=== M7 Guid-path simulation (Stop hook logic via Python) ==="
python $pyTest
if ($LASTEXITCODE -eq 0) {
    Write-Host "[PASS] test_roe_gate.py (7 cases incl. n5)"
    $pass++
} else {
    Write-Host "[FAIL] test_roe_gate.py"
    $fail++
}

# Live deployed Python matches repo (hash spot-check)
$repoPy = Join-Path $repoRoot "ccb-installer\config\skills\ccb-subagent-gate\scripts\lib\parse_transcript_roe.py"
$livePy = Join-Path $skillDest "scripts\lib\parse_transcript_roe.py"
if ((Get-FileHash $repoPy).Hash -eq (Get-FileHash $livePy).Hash) {
    Write-Host "[PASS] deployed parse_transcript_roe.py matches repo"
    $pass++
} else {
    Write-Host "[FAIL] deployed parse_transcript_roe.py drift from repo"
    $fail++
}

Write-Host ""
Write-Host "Results: $pass passed, $fail failed"
if ($fail -gt 0) { exit 1 }
Write-Host "M7 deploy smoke: ALL PASS (automated; open Guid 万鼎报价专家 for manual edit-order confirm)"
