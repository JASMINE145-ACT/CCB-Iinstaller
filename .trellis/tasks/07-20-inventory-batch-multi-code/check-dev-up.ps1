try {
  $r = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 5
  Write-Host "renderer HTTP $($r.StatusCode)"
} catch {
  Write-Host "renderer fail: $($_.Exception.Message)"
}
Get-Process | Where-Object ProcessName -Match "electron|bun" | Format-Table ProcessName,Id -AutoSize
