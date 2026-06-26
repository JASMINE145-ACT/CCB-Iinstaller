$path = Join-Path $PSScriptRoot 'patch-i18n.ps1'
$tokens = $null
$errors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$errors)
if ($errors.Count -eq 0) {
    Write-Host 'PARSE OK'
} else {
    foreach ($err in $errors) {
        Write-Host $err.ToString()
    }
    exit 1
}
