$ErrorActionPreference = "Stop"
$skillPy = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills\ccb-subagent-gate\scripts\lib\parse_transcript_roe_judge.py"
$accMd = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\agents\accurate-agent.md"
$orchMd = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\agents\wande-orchestrator.md"
$accProfile = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills\ccb-subagent-gate\config\roe-judge-profiles\accurate-agent.json"

Write-Host "=== live skill py exists: $(Test-Path $skillPy)"
if (Test-Path $skillPy) {
  $hits = Select-String -LiteralPath $skillPy -Pattern "readonly_skip_from_profile" -SimpleMatch
  Write-Host "readonly_skip hits: $($hits.Count)"
  Write-Host "py length: $((Get-Item $skillPy).Length)"
}
Write-Host "=== accurate profile exists: $(Test-Path $accProfile)"
if (Test-Path $accProfile) { Get-Content -LiteralPath $accProfile -Raw | Write-Host }
Write-Host "=== accurate md exists: $(Test-Path $accMd)"
if (Test-Path $accMd) {
  $hits2 = Select-String -LiteralPath $accMd -Pattern "openpyxl|过度交付|batch_get_detail"
  Write-Host "accurate ban hits: $($hits2.Count)"
  $hits2 | ForEach-Object { Write-Host ("L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0, [Math]::Min(120, $_.Line.Trim().Length))) }
}
Write-Host "=== orch md"
if (Test-Path $orchMd) {
  $hits3 = Select-String -LiteralPath $orchMd -Pattern "ROE-GATE|用户原话|无写权限"
  Write-Host "orch hits: $($hits3.Count)"
  $hits3 | ForEach-Object { Write-Host ("L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0, [Math]::Min(120, $_.Line.Trim().Length))) }
}
Write-Host "=== processes"
Get-Process | Where-Object ProcessName -Match "electron|AionUi|bun" | Format-Table ProcessName,Id -AutoSize
