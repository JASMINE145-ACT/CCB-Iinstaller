# Run patch-i18n.ps1 up to chunkTheme2 then test chunkDiff2
$ErrorActionPreference = 'Stop'
$content = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'patch-i18n.ps1') -Raw
$marker = '# DiffDialog'
$idx = $content.IndexOf($marker)
if ($idx -lt 0) { throw 'marker not found' }
$partial = $content.Substring(0, $idx)
Invoke-Expression $partial
Write-Host "chunkDiff2 type before: $(if($null -eq $chunkDiff2){'NULL'} else {$chunkDiff2.GetType().Name})"
$chunkDiff2 = New-ReplacementMap
Write-Host "chunkDiff2 type after: $($chunkDiff2.GetType().Name)"
$chunkDiff2['children:`Binary file`'] = 'children:`test`'
Write-Host 'chunkDiff2 assignment OK'
