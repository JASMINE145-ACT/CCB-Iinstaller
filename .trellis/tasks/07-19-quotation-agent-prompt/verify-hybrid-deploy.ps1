$ErrorActionPreference = "Stop"
$py = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills\ccb-subagent-gate\scripts\post-match-knowledge-nudge.py"
$relay = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills\ccb-subagent-gate\scripts\post-quotation-relay-nudge.py"
Write-Host "match nudge exists: $(Test-Path $py)"
$h1 = Select-String -LiteralPath $py -Pattern "suppliers_hybrid_match" -SimpleMatch
Write-Host "hybrid hits in live match nudge: $($h1.Count)"
$h2 = Select-String -LiteralPath $relay -Pattern "名录|hybrid" 
Write-Host "relay 名录/hybrid hits: $($h2.Count)"
$h2 | ForEach-Object { Write-Host $_.Line.Trim().Substring(0, [Math]::Min(100, $_.Line.Trim().Length)) }
