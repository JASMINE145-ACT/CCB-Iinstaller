$ErrorActionPreference = "Stop"
$md = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\agents\quotation-agent.md"
Write-Host "exists: $(Test-Path $md)"
$hits = Select-String -LiteralPath $md -Pattern "WANd.INV.BATCH.MULTI_CODE.001|仅查库存 · 多编码|get_inventory_by_code_batch"
Write-Host "hits: $($hits.Count)"
$hits | Select-Object -First 5 | ForEach-Object { Write-Host ("L{0}: {1}" -f $_.LineNumber, $_.Line.Trim().Substring(0, [Math]::Min(100, $_.Line.Trim().Length))) }
