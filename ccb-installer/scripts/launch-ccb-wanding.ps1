# launch-ccb-wanding.ps1
# Silent hidden launcher invoked by the desktop/start-menu shortcut.
# Detects Windows Terminal and starts wt.exe directly so the user
# sees only one terminal window -- no intermediate cmd flash.
# ASCII-only: no Chinese strings in this file (PS 5.1 OEM-page issue).

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$installDir = Split-Path -Parent $scriptDir
$cmdFile    = Join-Path $installDir "ccb-wanding.cmd"

# Mark as already relaunched so ccb-wanding.cmd skips its own WT detection.
$env:CCB_WT_RELAUNCHED = "1"

# Locate wt.exe
$wtExe = $null
try   { $wtExe = (Get-Command wt -ErrorAction Stop).Source } catch {}
if (-not $wtExe) {
    $wtCandidates = @(
        "$env:LOCALAPPDATA\Microsoft\WindowsApps\wt.exe"
    )
    foreach ($c in $wtCandidates) {
        if (Test-Path $c) { $wtExe = $c; break }
    }
}

if ($wtExe -and (Test-Path $wtExe)) {
    $profileArg = ""
    if (Test-Path "$env:LOCALAPPDATA\Microsoft\Windows Terminal\Fragments\CCB\ccb.json") {
        $profileArg = "--profile `"CCB`" "
    }
    # Launch WT directly. CCB_WT_RELAUNCHED=1 is inherited so ccb-wanding.cmd
    # skips its own WT detection and proceeds straight to the session picker.
    $wtArgs = "${profileArg}-d `"$installDir`" cmd /k `"$cmdFile`""
    Start-Process -FilePath $wtExe -ArgumentList $wtArgs
} else {
    # No WT -- open a plain cmd window.
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$cmdFile`""
}
