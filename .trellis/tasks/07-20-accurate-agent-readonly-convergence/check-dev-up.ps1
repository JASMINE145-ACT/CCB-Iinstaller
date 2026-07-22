Get-Process | Where-Object ProcessName -Match "electron|bun|AionUi" | Format-Table ProcessName,Id,StartTime -AutoSize
try {
  $r = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 5
  Write-Host "renderer HTTP $($r.StatusCode) len=$($r.RawContentLength)"
} catch {
  Write-Host "renderer not up: $($_.Exception.Message)"
}
