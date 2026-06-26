$lines = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'patch-i18n.ps1')
2468..2472 | ForEach-Object {
    $i = $_ - 1
    $line = $lines[$i]
    Write-Host "L$_`: [$line]"
    if ($line -match 'chunkDiff') {
        [int[]][char[]]$line | Select-Object -First 30 | ForEach-Object { Write-Host -NoNewline ("{0:X4} " -f $_) }
        Write-Host ''
    }
}
