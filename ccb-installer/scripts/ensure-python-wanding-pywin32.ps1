# Ensure vendor/python-wanding has a real pywin32 so PYTHONNOUSERSITE=1 MCP
# servers (accurate, etc.) can `import mcp` after office-word stub quarantine.
#
# Side effect context: install-office-word-mcp.ps1 renames tiny pywintypes.py stubs
# under python-wanding site-packages to *.stub-bak so Word's --target pywin32 wins.
# Accurate MCP uses python-wanding site-packages directly and then cannot import mcp
# (mcp → win32 utilities → pywintypes). Reinstall pywin32 into python-wanding.
#
# Usage:
#   .\ensure-python-wanding-pywin32.ps1 [-InstallDir D:\CCB-Wanding]
param(
    [string]$InstallDir = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$pythonExe = Join-Path $InstallDir 'vendor\python-wanding\python.exe'
$pythonSite = Join-Path $InstallDir 'vendor\python-wanding\Lib\site-packages'

if (-not (Test-Path -LiteralPath $pythonExe)) {
    throw "Bundled Python required: $pythonExe"
}
if (-not (Test-Path -LiteralPath $pythonSite)) {
    throw "python-wanding site-packages missing: $pythonSite"
}

function Test-PythonWandingMcpImport {
    $prev = $env:PYTHONNOUSERSITE
    $env:PYTHONNOUSERSITE = '1'
    try {
        $prevEa = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        & $pythonExe -c "import mcp; import pywintypes; print('OK', mcp.__file__)"
        $code = $LASTEXITCODE
        $ErrorActionPreference = $prevEa
        return ($code -eq 0)
    } finally {
        if ($null -eq $prev) { Remove-Item Env:PYTHONNOUSERSITE -ErrorAction SilentlyContinue }
        else { $env:PYTHONNOUSERSITE = $prev }
    }
}

if (Test-PythonWandingMcpImport) {
    Write-Host '[python-wanding-pywin32] import mcp+pywintypes OK (PYTHONNOUSERSITE=1); skip pip'
    exit 0
}

Write-Host '[python-wanding-pywin32] repairing: pip install pywin32 into python-wanding site-packages ...'
# Force install into the bundled prefix — never touch %APPDATA%\Python user site
# (prior bug: pip upgraded user-site pywin32 and hit WinError 5 on DLL replace).
$prevUserSite = $env:PYTHONNOUSERSITE
$env:PYTHONNOUSERSITE = '1'
$prevEa = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $pythonExe -m pip install --upgrade --force-reinstall --no-user --disable-pip-version-check `
    --target $pythonSite 'pywin32'
$pipExit = $LASTEXITCODE
$ErrorActionPreference = $prevEa
if ($null -eq $prevUserSite) { Remove-Item Env:PYTHONNOUSERSITE -ErrorAction SilentlyContinue }
else { $env:PYTHONNOUSERSITE = $prevUserSite }
if ($pipExit -ne 0) {
    throw "pip install pywin32 failed (exit $pipExit)"
}

# Re-quarantine tiny stubs only (idempotent). Do not touch real pywin32 modules.
$stubNames = @(
    'pywintypes.py',
    'pythoncom.py',
    'win32api.py',
    'win32con.py',
    'win32job.py',
    'win32gui.py',
    'win32process.py'
)
foreach ($name in $stubNames) {
    $stubPath = Join-Path $pythonSite $name
    if (-not (Test-Path -LiteralPath $stubPath)) { continue }
    $stubLen = (Get-Item -LiteralPath $stubPath).Length
    if ($stubLen -ge 2048) { continue }
    $bak = "$stubPath.stub-bak"
    Move-Item -LiteralPath $stubPath -Destination $bak -Force
    Write-Host "[python-wanding-pywin32] quarantined stub $name ($stubLen B) -> $bak"
}

# pywin32 post-install sometimes needs pywin32_postinstall for DLLs
if (Test-Path -LiteralPath (Join-Path $pythonSite 'win32\lib\pywin32_postinstall.py')) {
    $prevEa = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $pythonExe (Join-Path $pythonSite 'win32\lib\pywin32_postinstall.py') -install 2>$null
    $ErrorActionPreference = $prevEa
}

if (-not (Test-PythonWandingMcpImport)) {
    throw '[python-wanding-pywin32] import mcp still fails under PYTHONNOUSERSITE=1 after repair'
}

Write-Host '[python-wanding-pywin32] repaired OK' -ForegroundColor Green
exit 0
