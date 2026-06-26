$lines = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'patch-i18n.ps1')
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match '#.*\$chunk') {
        Write-Host ("L{0}: MERGED comment+code: {1}" -f ($i+1), $line.Substring(0, [Math]::Min(120, $line.Length)))
    }
    if ($line -match '[\u4e00-\u9fff]' -and $line -match '\$chunk\w+\s*=') {
        Write-Host ("L{0}: CJK+assignment same line: {1}" -f ($i+1), $line.Substring(0, [Math]::Min(120, $line.Length)))
    }
}
