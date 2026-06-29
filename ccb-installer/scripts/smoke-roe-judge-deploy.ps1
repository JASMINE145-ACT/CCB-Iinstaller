# M7b post-deploy smoke for Universal ROE Semantic Judge.
# Usage: .\ccb-installer\scripts\smoke-roe-judge-deploy.ps1

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$skillDest = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills\ccb-subagent-gate"
$pyTest = Join-Path $repoRoot "ccb-installer\config\skills\ccb-subagent-gate\tests\test_roe_judge_gate.py"
$pyTestReal = Join-Path $repoRoot "ccb-installer\config\skills\ccb-subagent-gate\tests\test_roe_judge_realistic.py"
$pyTestRoe = Join-Path $repoRoot "ccb-installer\config\skills\ccb-subagent-gate\tests\test_roe_gate.py"

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

Write-Host "=== ROE Judge deploy artifacts ==="
Assert-File (Join-Path $skillDest "scripts\validators\generic-roe-judge.sh") "generic-roe-judge.sh deployed"
Assert-File (Join-Path $skillDest "scripts\lib\parse_transcript_roe_judge.py") "parse_transcript_roe_judge.py deployed"
Assert-File (Join-Path $skillDest "config\roe-judge-profiles\default.json") "default profile deployed"
Assert-Content (Join-Path $skillDest "config\modes.json") 'roe-judge' "modes.json :roe-judge keys"

$agents = @("quotation-agent", "word-creator", "ppt-creator", "excel-creator", "accurate-agent")
foreach ($a in $agents) {
    $md = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\agents\$a.md"
    Assert-Content $md "subagent-gate\.sh" "$a Stop hook"
}

Write-Host ""
Write-Host "=== Judge unit tests (rules-only, in-process) ==="
python $pyTest
if ($LASTEXITCODE -eq 0) {
    Write-Host "[PASS] test_roe_judge_gate.py"
    $pass++
} else {
    Write-Host "[FAIL] test_roe_judge_gate.py"
    $fail++
}

Write-Host ""
Write-Host "=== Realistic scenario tests ==="
python $pyTestReal
if ($LASTEXITCODE -eq 0) {
    Write-Host "[PASS] test_roe_judge_realistic.py"
    $pass++
} else {
    Write-Host "[FAIL] test_roe_judge_realistic.py"
    $fail++
}

Write-Host ""
Write-Host "=== Parent rule ROE regression ==="
python $pyTestRoe
if ($LASTEXITCODE -eq 0) {
    Write-Host "[PASS] test_roe_gate.py"
    $pass++
} else {
    Write-Host "[FAIL] test_roe_gate.py"
    $fail++
}

$repoPy = Join-Path $repoRoot "ccb-installer\config\skills\ccb-subagent-gate\scripts\lib\parse_transcript_roe_judge.py"
$livePy = Join-Path $skillDest "scripts\lib\parse_transcript_roe_judge.py"
if ((Test-Path $livePy) -and (Get-FileHash $repoPy).Hash -eq (Get-FileHash $livePy).Hash) {
    Write-Host "[PASS] deployed parse_transcript_roe_judge.py matches repo"
    $pass++
} else {
    Write-Host "[FAIL] deployed parse_transcript_roe_judge.py drift"
    $fail++
}

Write-Host ""
Write-Host "Results: $pass passed, $fail failed"
if ($fail -gt 0) { exit 1 }
Write-Host "ROE judge deploy smoke: ALL PASS"
Write-Host "In-process mode: rules block + REJECT inject; main model self-checks on auto-continue (no external API)."
