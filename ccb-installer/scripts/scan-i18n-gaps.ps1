# Scan dist/chunks for English backtick strings and CJK literals
$dir = Join-Path $PSScriptRoot '..\dist\chunks'
$files = Get-ChildItem $dir -Filter '*.js'
$seen = @{}
$byFile = @{}
foreach ($f in $files) {
    $c = [IO.File]::ReadAllText($f.FullName)
    $ms = [regex]::Matches($c, '`([^`\\]{2,200})`')
    foreach ($m in $ms) {
        $s = $m.Groups[1].Value
        if ($s -match '\\u[0-9a-fA-F]{4}') { continue }
        if ($s -match '^[a-z]+-[A-Z0-9]') { continue }
        if ($s -match '^[a-z_]+$') { continue }
        if ($s -match '^[A-Z_]+$') { continue }
        if ($s -match 'https?://') { continue }
        if ($s -notmatch '[A-Za-z]{3,}') { continue }
        if ($s -notmatch '[A-Z]' -or $s -notmatch '[a-z]') { continue }
        if (-not $seen.ContainsKey($s)) { $seen[$s] = $true }
        if (-not $byFile.ContainsKey($f.Name)) { $byFile[$f.Name] = 0 }
        $byFile[$f.Name]++
    }
}
Write-Host "TOTAL unique English backtick strings: $($seen.Count)"
Write-Host ''
Write-Host 'Top 25 files by hit count:'
$byFile.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 25 | ForEach-Object {
    Write-Host ("  {0}: {1}" -f $_.Name, $_.Value)
}
Write-Host ''
Write-Host 'Sample high-priority strings (first 40 sorted):'
$seen.Keys | Sort-Object | Select-Object -First 40 | ForEach-Object { Write-Host "  $_" }

Write-Host ''
Write-Host '=== CJK literal check ==='
$cjkHits = @()
foreach ($f in $files) {
    $text = [IO.File]::ReadAllText($f.FullName)
    $m = [regex]::Matches($text, '[\u4e00-\u9fff]')
    if ($m.Count -gt 0) {
        $cjkHits += [pscustomobject]@{ File = $f.Name; CJK = $m.Count }
    }
}
if ($cjkHits.Count -eq 0) {
    Write-Host 'No CJK literals in dist chunks'
} else {
    $cjkHits | Sort-Object CJK -Descending | Format-Table -AutoSize
}
