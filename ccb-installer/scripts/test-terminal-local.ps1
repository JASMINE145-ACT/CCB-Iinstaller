[CmdletBinding()]
param(
    [ValidateSet("Modern", "Flat", "Safe", "Diagnostics", "ResizeRepro")]
    [string]$Mode = "Modern",
    [string]$SandboxRoot = "D:\tmp\ccb-terminal-test",
    [switch]$PrepareOnly,
    [switch]$NoWindowsTerminal,
    [switch]$DirectLaunch,
    [switch]$EncodingProbe
)

$ErrorActionPreference = "Stop"
$InstallerDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AllowedRoot = [IO.Path]::GetFullPath("D:\tmp")
$ResolvedRoot = [IO.Path]::GetFullPath($SandboxRoot)

if (-not $ResolvedRoot.StartsWith($AllowedRoot + "\", [StringComparison]::OrdinalIgnoreCase)) {
    throw "SandboxRoot must be under D:\tmp. Received: $ResolvedRoot"
}

$AppDir = Join-Path $ResolvedRoot "app"
$ProfileDir = Join-Path $ResolvedRoot "profile"
$ConfigDir = Join-Path $ProfileDir "CCB\.claude"
$LogDir = Join-Path $ProfileDir "CCB\logs"

$requiredSources = @(
    (Join-Path $InstallerDir "ccb.cmd"),
    (Join-Path $InstallerDir "ccb-diagnose.cmd"),
    (Join-Path $InstallerDir "ccb-fix-terminal.cmd"),
    (Join-Path $InstallerDir "ccb-flat.cmd"),
    (Join-Path $InstallerDir "ccb-safe.cmd"),
    (Join-Path $InstallerDir "ccb-text.cmd"),
    (Join-Path $InstallerDir "dist\cli.js"),
    (Join-Path $InstallerDir "dist\chunk-z9bw4q7j.js"),
    (Join-Path $InstallerDir "scripts\ensure-mcp-settings.ps1"),
    (Join-Path $InstallerDir "scripts\fix-terminal-launcher.ps1"),
    (Join-Path $InstallerDir "scripts\install-windows-terminal.ps1"),
    (Join-Path $InstallerDir "scripts\launch-ccb.ps1"),
    (Join-Path $InstallerDir "scripts\patch-i18n.ps1"),
    (Join-Path $InstallerDir "vendor\bun\bun.exe"),
    (Join-Path $InstallerDir "vendor\git\bin\bash.exe"),
    (Join-Path $InstallerDir "vendor\mcp-servers\excel-mcp\mcp-excel.exe"),
    (Join-Path $InstallerDir "vendor\windows-terminal\Microsoft.WindowsTerminal_1.24.11321.0_8wekyb3d8bbwe.msixbundle"),
    (Join-Path $InstallerDir "resources\settings\settings.json"),
    (Join-Path $InstallerDir "resources\commands\modo.md")
)
foreach ($path in $requiredSources) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required test source is missing: $path"
    }
}

New-Item -ItemType Directory -Force -Path $ResolvedRoot, $ProfileDir, $ConfigDir, $LogDir | Out-Null
if (Test-Path -LiteralPath $AppDir) {
    # Kill any bun/bash processes still running from the previous sandbox
    Get-Process -Name "bun","bash","git" -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -and $_.Path.StartsWith($AppDir, [StringComparison]::OrdinalIgnoreCase) } |
        ForEach-Object { $_.Kill(); $_.WaitForExit(2000) }
    Start-Sleep -Milliseconds 300
    Remove-Item -LiteralPath $AppDir -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $AppDir) {
        Write-Warning "部分文件仍被锁定，无法删除 $AppDir。尝试继续..."
    }
}
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

Copy-Item -LiteralPath (Join-Path $InstallerDir "ccb.cmd") -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $InstallerDir "ccb-diagnose.cmd") -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $InstallerDir "ccb-fix-terminal.cmd") -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $InstallerDir "ccb-safe.cmd") -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $InstallerDir "ccb-flat.cmd") -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $InstallerDir "ccb-text.cmd") -Destination $AppDir
Copy-Item -LiteralPath (Join-Path $InstallerDir "dist") -Destination $AppDir -Recurse
Copy-Item -LiteralPath (Join-Path $InstallerDir "scripts") -Destination $AppDir -Recurse
Copy-Item -LiteralPath (Join-Path $InstallerDir "vendor") -Destination $AppDir -Recurse

$patchScript = Join-Path $InstallerDir "scripts\patch-i18n.ps1"
if (-not (Test-Path -LiteralPath $patchScript)) {
    throw "Required i18n patch script is missing: $patchScript"
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $patchScript -DistDir (Join-Path $AppDir "dist")
if ($LASTEXITCODE -ne 0) {
    throw "patch-i18n.ps1 failed while preparing sandbox dist."
}

$testSettings = Join-Path $ConfigDir "settings.json"
if (-not (Test-Path -LiteralPath $testSettings)) {
    Copy-Item -LiteralPath (Join-Path $InstallerDir "resources\settings\settings.json") -Destination $testSettings
}

$commandsDest = Join-Path $ConfigDir "commands"
New-Item -ItemType Directory -Force -Path $commandsDest | Out-Null
Copy-Item -LiteralPath (Join-Path $InstallerDir "resources\commands\modo.md") -Destination $commandsDest -Force

$entry = Join-Path $AppDir "ccb.cmd"
$safeEntry = Join-Path $AppDir "ccb-safe.cmd"
$textEntry = Join-Path $AppDir "ccb-text.cmd"
$flatEntry = Join-Path $AppDir "ccb-flat.cmd"
$psEntry = Join-Path $AppDir "scripts\launch-ccb.ps1"
$renderer = Join-Path $AppDir "dist\chunk-z9bw4q7j.js"
$diagnose = Join-Path $AppDir "ccb-diagnose.cmd"
$mcpSettings = Join-Path $AppDir "scripts\ensure-mcp-settings.ps1"
$mcpConfig = Join-Path $AppDir "ccb-mcp.json"
$excelMcp = Join-Path $AppDir "vendor\mcp-servers\excel-mcp\mcp-excel.exe"

if (-not (Select-String -LiteralPath $entry -SimpleMatch "CCB_DISABLE_FULLSCREEN" -Quiet)) {
    throw "Staged ccb.cmd does not contain the fullscreen compatibility switch."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "CCB_DISABLE_WT_RELAUNCH" -Quiet)) {
    throw "Staged ccb.cmd does not contain the Windows Terminal relaunch guard."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "where wt.exe" -Quiet)) {
    throw "Staged ccb.cmd does not try to normalize launches into Windows Terminal."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "CCB_LAUNCH_LOG" -Quiet)) {
    throw "Staged ccb.cmd does not write a launcher log."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "--debug-file" -Quiet)) {
    throw "Staged ccb.cmd does not enable Claude Code debug logging."
}
if (-not (Select-String -LiteralPath $renderer -SimpleMatch "CLAUDE_CODE_DISABLE_TUI_RESIZE" -Quiet)) {
    throw "Staged renderer does not contain the resize protection patch."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "WT_SESSION" -Quiet)) {
    throw "Normal ccb.cmd must gate mouse/scroll flags on WT_SESSION (terminal capability check)."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "LANG=zh_CN.UTF-8" -Quiet)) {
    throw "Staged ccb.cmd does not set UTF-8 locale environment variables."
}
if (-not (Select-String -LiteralPath $psEntry -SimpleMatch "Console]::OutputEncoding" -Quiet)) {
    throw "Staged PowerShell launcher does not set UTF-8 console output."
}
if (-not (Select-String -LiteralPath $psEntry -SimpleMatch "vendor\bun\bun.exe" -Quiet)) {
    throw "Staged PowerShell launcher does not launch bundled Bun directly."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "ensure-mcp-settings.ps1" -Quiet)) {
    throw "Staged ccb.cmd does not contain the MCP settings bootstrap."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "ANTHROPIC_AUTH_TOKEN" -Quiet)) {
    throw "Staged ccb.cmd does not contain ANTHROPIC_AUTH_TOKEN."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "minimax-m2.7" -Quiet)) {
    throw "Staged ccb.cmd does not contain MiniMax model config."
}
if (-not (Select-String -LiteralPath $entry -SimpleMatch "--mcp-config" -Quiet)) {
    throw "Staged ccb.cmd does not launch Claude Code with --mcp-config."
}
if (-not (Select-String -LiteralPath $safeEntry -SimpleMatch "mode con: cols=140 lines=40" -Quiet)) {
    throw "Staged ccb-safe.cmd does not contain the conservative console sizing fallback."
}
if (-not (Select-String -LiteralPath $safeEntry -SimpleMatch "CCB_SAFE_MODE=1" -Quiet)) {
    throw "Staged ccb-safe.cmd does not set CCB_SAFE_MODE=1."
}
if (-not (Select-String -LiteralPath $safeEntry -SimpleMatch "CLAUDE_CODE_DISABLE_MOUSE" -Quiet)) {
    throw "Staged ccb-safe.cmd does not disable mouse tracking."
}
if (-not (Select-String -LiteralPath $safeEntry -SimpleMatch "CLAUDE_CODE_DISABLE_TUI_RESIZE" -Quiet)) {
    throw "Staged ccb-safe.cmd does not disable TUI resize for compatibility."
}
if (-not (Select-String -LiteralPath $flatEntry -SimpleMatch "CCB_DISABLE_FULLSCREEN=1" -Quiet)) {
    throw "Staged ccb-flat.cmd does not set CCB_DISABLE_FULLSCREEN=1."
}
if (-not (Select-String -LiteralPath $flatEntry -SimpleMatch "CCB_FLAT_MODE=1" -Quiet)) {
    throw "Staged ccb-flat.cmd does not set CCB_FLAT_MODE=1."
}
if (-not (Select-String -LiteralPath $flatEntry -SimpleMatch 'CLAUDE_CODE_DISABLE_MOUSE=1' -Quiet)) {
    throw "Staged ccb-flat.cmd must set CLAUDE_CODE_DISABLE_MOUSE=1 (Flat Mode disables mouse tracking for native terminal selection)."
}
if (-not (Select-String -LiteralPath $textEntry -SimpleMatch " -p %*" -Quiet)) {
    throw "Staged ccb-text.cmd does not launch plain text mode."
}
$mojibakePattern = '\u00e5|\u00e6|\u00e8|\u00e7|\u5a06|\u6748|\u9422|\u951b|\u9239|\u7039|\u93c2|\u6d93'
$mojibake = Get-ChildItem -LiteralPath (Join-Path $AppDir "dist") -Filter "*.js" -File |
    Select-String -Pattern $mojibakePattern |
    Select-Object -First 1
if ($mojibake) {
    throw "Staged dist contains possible mojibake: $($mojibake.Path):$($mojibake.LineNumber)"
}
$previousLocalAppData = $env:LOCALAPPDATA
$previousDisableWtRelaunch = $env:CCB_DISABLE_WT_RELAUNCH
$previousDisableDebugLog = $env:CCB_DISABLE_DEBUG_LOG
try {
    $env:LOCALAPPDATA = $ProfileDir
    $env:CCB_DISABLE_WT_RELAUNCH = "1"
    $env:CCB_DISABLE_DEBUG_LOG = "1"
    $version = & $entry --version 2>&1
    if ($LASTEXITCODE -ne 0 -or ($version -join "`n") -notmatch "2\.1\.888 \(Claude Code\)") {
        throw "Staged launcher version check failed: $($version -join ' ')"
    }

    $settings = Get-Content -Raw -LiteralPath $testSettings | ConvertFrom-Json
    if ($settings.mcpServers.exa.url -ne "https://mcp.exa.ai/mcp") {
        throw "Staged settings do not contain the exa MCP server."
    }
    if ([string]::IsNullOrWhiteSpace($settings.env.ANTHROPIC_AUTH_TOKEN)) {
        throw "Staged settings do not contain ANTHROPIC_AUTH_TOKEN."
    }
    if ($settings.env.'ANTHROPIC_DEFAULT_SONNET_MODEL' -ne "minimax-m2.7") {
        throw "Staged settings do not contain MiniMax model config."
    }
    if ($settings.mcpServers.'excel-mcp'.command -ne $excelMcp) {
        throw "Staged settings do not point excel-mcp at the staged executable."
    }
    if (-not (Test-Path -LiteralPath $mcpConfig)) {
        throw "Staged MCP config file was not generated: $mcpConfig"
    }
    $runtimeMcp = Get-Content -Raw -LiteralPath $mcpConfig | ConvertFrom-Json
    if ($runtimeMcp.mcpServers.exa.url -ne "https://mcp.exa.ai/mcp") {
        throw "Runtime MCP config does not contain exa."
    }
    if ($runtimeMcp.mcpServers.'excel-mcp'.command -ne $excelMcp) {
        throw "Runtime MCP config does not point excel-mcp at the staged executable."
    }

    $excelHelp = & $excelMcp --help 2>&1
    if ($LASTEXITCODE -ne 0 -or ($excelHelp -join "`n") -notmatch "Excel MCP Server") {
        throw "Staged excel-mcp executable failed: $($excelHelp -join ' ')"
    }
}
finally {
    $env:LOCALAPPDATA = $previousLocalAppData
    $env:CCB_DISABLE_WT_RELAUNCH = $previousDisableWtRelaunch
    $env:CCB_DISABLE_DEBUG_LOG = $previousDisableDebugLog
}

Write-Host "[PASS] Local CCB terminal sandbox prepared." -ForegroundColor Green
Write-Host "App:      $AppDir"
Write-Host "Profile:  $ProfileDir"
Write-Host "Settings: $testSettings"
Write-Host "Logs:     $LogDir"
Write-Host "Version:  $($version -join ' ')"
Write-Host "MCP:      exa + excel-mcp configured"

function Write-TerminalHostHint {
    $hostName = if ($env:WT_SESSION) { "Windows Terminal" }
        elseif ($env:TERM_PROGRAM -eq "vscode") { "VS Code / Cursor integrated terminal" }
        else { "legacy console host" }

    Write-Host "Current terminal host: $hostName"
    if ($Mode -eq "Modern") {
        Write-Host ""
        Write-Host "Modern = terminal scrollback + native mouse selection." -ForegroundColor Yellow
        Write-Host "Wheel scrolls terminal scrollback. Drag to select text, right-click or Ctrl+C to copy."
        Write-Host "Use /modo inside CCB to see available modes and how to switch (Shift+Tab)."
        Write-Host ""
    }
    if ($Mode -eq "Flat") {
        Write-Host ""
        Write-Host "Flat Mode = no fullscreen, mouse tracking OFF." -ForegroundColor Yellow
        Write-Host "Terminal handles wheel scroll (scrollback) and text selection natively."
        Write-Host "Drag to select text, right-click or Ctrl+C to copy."
        Write-Host ""
    }
    if ($Mode -eq "Safe") {
        Write-Host ""
        Write-Host "Safe Mode = fullscreen OFF, mouse OFF, fixed 140x40 window." -ForegroundColor Yellow
        Write-Host "Not a scroll solution — this is a last-resort compatibility fallback."
        Write-Host ""
    }
}

function Start-CcbLauncher {
    param(
        [Parameter(Mandatory = $true)][string]$LauncherPath,
        [Parameter(Mandatory = $true)][string]$WorkingDir,
        [switch]$PowerShell
    )

    $useWt = -not $NoWindowsTerminal -and -not $DirectLaunch -and -not $env:WT_SESSION
    $wt = if ($useWt) { Get-Command wt.exe -ErrorAction SilentlyContinue } else { $null }

    if ($wt) {
        $tempLauncher = Join-Path $env:TEMP ("ccb-test-" + [System.IO.Path]::GetRandomFileName().Replace('.','') + ".ps1")
@"
`$env:LOCALAPPDATA = '$ProfileDir'
`$env:CCB_DISABLE_DEBUG_LOG = '1'
`$env:LANG = 'zh_CN.UTF-8'
`$env:LC_ALL = 'zh_CN.UTF-8'
`$env:LC_CTYPE = 'zh_CN.UTF-8'
if (`$env:WT_SESSION -and `$env:TERM_PROGRAM -eq 'vscode') { `$env:TERM_PROGRAM = 'WindowsTerminal' }
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new(`$false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(`$false)
cmd /c "chcp 65001 >nul"
if ('$EncodingProbe' -eq 'True') {
  chcp
  & '$AppDir\vendor\bun\bun.exe' -e "console.log('[CCB UTF-8 probe] \u4e2d\u6587\u7f16\u7801\u6d4b\u8bd5\uff1a\u6b22\u8fce\u56de\u6765')"
  Start-Sleep -Seconds 3
}
& '$LauncherPath'
"@ | Set-Content -Path $tempLauncher -Encoding ASCII
        $wtArgs = "-d `"$WorkingDir`" powershell.exe -NoLogo -NoExit -ExecutionPolicy Bypass -File `"$tempLauncher`""
        Write-Host "Opening Windows Terminal: $($wt.Source) $wtArgs"
        Start-Process -FilePath $wt.Source -ArgumentList $wtArgs | Out-Null
        return
    }

    if ($useWt) {
        Write-Warning "wt.exe was not found. Launching in the current terminal; mouse/wheel may not work."
    }

    $previousLocalAppData = $env:LOCALAPPDATA
    $previousDisableDebugLog = $env:CCB_DISABLE_DEBUG_LOG
    try {
        $env:LOCALAPPDATA = $ProfileDir
        $env:CCB_DISABLE_DEBUG_LOG = "1"
        cmd /c "chcp 65001 >nul" | Out-Null
        if ($EncodingProbe) {
            chcp
            & (Join-Path $AppDir "vendor\bun\bun.exe") -e "console.log('[CCB UTF-8 probe] \u4e2d\u6587\u7f16\u7801\u6d4b\u8bd5\uff1a\u6b22\u8fce\u56de\u6765')"
            Start-Sleep -Seconds 3
        }
        & $LauncherPath
    }
    finally {
        $env:LOCALAPPDATA = $previousLocalAppData
        $env:CCB_DISABLE_DEBUG_LOG = $previousDisableDebugLog
    }
}

if ($PrepareOnly) {
    Write-Host ""
    Write-Host "Preparation only. Interactive test (recommended):"
    Write-Host "  .\scripts\test-terminal-local.ps1 -Mode Modern"
    Write-Host "  .\scripts\test-terminal-local.ps1 -Mode Flat"
    Write-Host ""
    Write-Host "Modern opens Windows Terminal automatically. Use -DirectLaunch to stay in Cursor."
    exit 0
}

Write-Host ""
Write-Host "Launching mode: $Mode"
Write-TerminalHostHint
Write-Host "Use the same short Chinese prompts in each mode to compare CJK rendering."

$launcherPath = switch ($Mode) {
    "Flat" { $flatEntry }
    "Safe" { $safeEntry }
    "Diagnostics" { $diagnose }
    "ResizeRepro" { $diagnose }
    default { $psEntry }
}

if ($Mode -eq "ResizeRepro") {
    $previousLocalAppData = $env:LOCALAPPDATA
    try {
        $env:LOCALAPPDATA = $ProfileDir
        & $launcherPath --repro-resize
    }
    finally {
        $env:LOCALAPPDATA = $previousLocalAppData
    }
}
elseif ($Mode -eq "Diagnostics") {
    $previousLocalAppData = $env:LOCALAPPDATA
    try {
        $env:LOCALAPPDATA = $ProfileDir
        & $launcherPath
    }
    finally {
        $env:LOCALAPPDATA = $previousLocalAppData
    }
}
else {
    Start-CcbLauncher -LauncherPath $launcherPath -WorkingDir $AppDir -PowerShell:($Mode -eq "Modern")
}
