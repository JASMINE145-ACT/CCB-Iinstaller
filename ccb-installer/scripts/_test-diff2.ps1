$ErrorActionPreference = 'Stop'
function New-ReplacementMap {
    return [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)
}
Write-Host "Before chunkDiff2 init"
$chunkDiff2 = New-ReplacementMap
Write-Host "Type: $($chunkDiff2.GetType().FullName)"
$chunkDiff2['children:`Binary file - cannot display diff`'] = 'children:`test`'
Write-Host "OK"
