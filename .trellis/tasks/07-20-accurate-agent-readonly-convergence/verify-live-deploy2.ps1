$ErrorActionPreference = "Stop"
$skillPy = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills\ccb-subagent-gate\scripts\lib\parse_transcript_roe_judge.py"
$accMd = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\agents\accurate-agent.md"
Write-Host "skip hits: $((Select-String -LiteralPath $skillPy -Pattern 'readonly_skip_from_profile' -SimpleMatch).Count)"
Write-Host "accurate first 3 lines:"
Get-Content -LiteralPath $accMd -TotalCount 3 -Encoding UTF8
Write-Host "profile:"
Test-Path (Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills\ccb-subagent-gate\config\roe-judge-profiles\accurate-agent.json")
Get-Process | Where-Object ProcessName -Match "electron|bun" | Format-Table ProcessName,Id -AutoSize
