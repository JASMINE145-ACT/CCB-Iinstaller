$ErrorActionPreference = 'Stop'
$install = 'D:\CCB-Wanding'
$configDir = "$env:LOCALAPPDATA\CCB-Wanding\.claude"
$settings = Get-Content "$configDir\settings.json" -Raw | ForEach-Object { $_ -replace '^\xEF\xBB\xBF','' } | ConvertFrom-Json

$env:CLAUDE_CONFIG_DIR = $configDir
$env:ANTHROPIC_BASE_URL = $settings.env.ANTHROPIC_BASE_URL
$env:ANTHROPIC_AUTH_TOKEN = $settings.env.ANTHROPIC_AUTH_TOKEN
$env:ANTHROPIC_API_KEY = $settings.env.ANTHROPIC_AUTH_TOKEN
$env:CLAUDE_CODE_DISABLE_FAST_MODE = '1'
$env:CLAUDE_CODE_ENABLE_TELEMETRY = '0'
$env:NODE_TLS_REJECT_UNAUTHORIZED = '0'
$env:ENABLE_AUTOUPDATE_PLUGINS = '0'
$env:PATH = "$install\vendor\bun;$install\vendor\ripgrep;$install\vendor\git\bin;$env:PATH"

$dbg = "$env:TEMP\ccb-headless-native.log"
$out = "$env:TEMP\ccb-headless-native-out.txt"
$err = "$env:TEMP\ccb-headless-native-err.txt"
Remove-Item $dbg,$out,$err -EA SilentlyContinue

$args = @(
  "$install\dist\cli.js",
  '-p', '2+2',
  '--model', 'minimax-m3',
  '--bare',
  '--setting-sources', 'user',
  '--permission-mode', 'bypassPermissions',
  '--debug-file', $dbg,
  '--debug', 'api'
)

'' | Out-File "$env:TEMP\ccb-null.txt" -Encoding ascii -Force
$p = Start-Process -FilePath "$install\vendor\bun\bun.exe" -ArgumentList $args -WorkingDirectory $install -PassThru -RedirectStandardInput "$env:TEMP\ccb-null.txt" -RedirectStandardOutput $out -RedirectStandardError $err -NoNewWindow

for ($i = 0; $i -lt 24; $i++) {
  Start-Sleep 5
  if ($p.HasExited) { break }
}
if (-not $p.HasExited) { 'TIMEOUT'; $p | Stop-Process -Force } else { "EXIT $($p.ExitCode)" }

Write-Host '--- STDOUT ---'
if (Test-Path $out) { Get-Content $out }
Write-Host '--- STDERR ---'
if (Test-Path $err) { Get-Content $err }
Write-Host '--- DEBUG markers ---'
if (Test-Path $dbg) {
  Select-String -Path $dbg -Pattern 'Bootstrap|runHeadless|API:request|auto-mode|Skipped|before_runHeadless|after_grove|ERROR|plugin' | Select-Object -Last 25
}
