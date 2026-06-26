$ErrorActionPreference = 'Stop'
$settings = Get-Content "$env:LOCALAPPDATA\CCB-Wanding\.claude\settings.json" | ConvertFrom-Json
$env:CLAUDE_CONFIG_DIR = "$env:LOCALAPPDATA\CCB-Wanding\.claude"
$env:ANTHROPIC_BASE_URL = $settings.env.ANTHROPIC_BASE_URL
$env:ANTHROPIC_AUTH_TOKEN = $settings.env.ANTHROPIC_AUTH_TOKEN
$env:ANTHROPIC_API_KEY = $settings.env.ANTHROPIC_AUTH_TOKEN
$env:ANTHROPIC_DEFAULT_SONNET_MODEL = 'minimax-m3'
$env:CLAUDE_CODE_ENABLE_TELEMETRY = '0'
$env:NODE_TLS_REJECT_UNAUTHORIZED = '0'
$env:CCB_WANDING_ACP_INCLUDE_QUOTATION = '0'
$env:ENABLE_SEARCH_EXTRA_TOOLS = '0'

$bun = 'D:\CCB-Wanding\vendor\bun\bun.exe'
$cli = 'D:\CCB-Wanding\dist\cli.js'
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $bun
$psi.Arguments = "`"$cli`" -p `"what is 1+1? answer with digit only`" --model minimax-m3 --setting-sources user --disallowedTools Bash,Edit,Write,Read,Glob,Grep,Task,WebFetch,WebSearch,MCP"
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.WorkingDirectory = $env:TEMP
$p = [System.Diagnostics.Process]::Start($psi)
if (-not $p.WaitForExit(75000)) {
    $p.Kill()
    Write-Output 'RESULT: TIMEOUT'
    exit 1
}
$out = $p.StandardOutput.ReadToEnd()
$err = $p.StandardError.ReadToEnd()
Write-Output "EXIT: $($p.ExitCode)"
Write-Output "STDOUT: $out"
if ($err) { Write-Output "STDERR: $err" }
if ($out -match '\d') { exit 0 } else { exit 1 }
