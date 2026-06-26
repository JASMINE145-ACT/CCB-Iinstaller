# Install Python dependencies for ppt-master skill (bundled python-wanding or fallback).
# Usage:
#   .\ccb-installer\scripts\ensure-ppt-master-deps.ps1
#   .\ccb-installer\scripts\ensure-ppt-master-deps.ps1 -InstallDir "D:\CCB-Wanding"
#   .\ccb-installer\scripts\ensure-ppt-master-deps.ps1 -SkillDir "C:\Users\me\AppData\Local\CCB-Wanding\.claude\skills\ppt-master"

param(
    [string]$SkillDir,
    [string]$InstallDir,
    [string]$PythonExe
)

$ErrorActionPreference = "Stop"

if (-not $InstallDir) {
    $InstallDir = Split-Path -Parent $PSScriptRoot
}

if (-not $SkillDir) {
    $SkillDir = Join-Path $env:LOCALAPPDATA "CCB-Wanding\.claude\skills\ppt-master"
}

$req = Join-Path $SkillDir "requirements.txt"
if (-not (Test-Path -LiteralPath $req)) {
    throw "requirements.txt not found: $req (run deploy-ppt-master-skill.ps1 first)"
}

if (-not $PythonExe) {
    $PythonExe = Join-Path $InstallDir "vendor\python-wanding\python.exe"
}

$py = $null
if (Test-Path -LiteralPath $PythonExe) {
    $py = $PythonExe
} else {
    foreach ($candidate in @("python", "py", "python3")) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) {
            $py = $candidate
            break
        }
    }
}

if (-not $py) {
    throw "Python not found. Expected bundled runtime at $PythonExe or a system python/py on PATH."
}

function Ensure-PythonPip([string]$PythonPath) {
    & $PythonPath -m pip --version *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[pip] bootstrapping pip via ensurepip ..."
        & $PythonPath -m ensurepip --upgrade
        if ($LASTEXITCODE -ne 0) {
            throw "ensurepip failed (exit $LASTEXITCODE)"
        }
    }
}

if ($py -eq $PythonExe -or (Test-Path -LiteralPath $py)) {
    Ensure-PythonPip $py
}

$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONNOUSERSITE = "1"

& $py -c "import pptx" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[ok] ppt-master Python dependencies already installed."
    exit 0
}

# pip on Chinese Windows may fail to read UTF-8 comments in upstream requirements.txt (GBK decode).
$sanitizedReq = Join-Path $env:TEMP "ppt-master-req-$([Guid]::NewGuid().ToString('N')).txt"
try {
    $reqLines = Get-Content -LiteralPath $req -Encoding UTF8 |
        ForEach-Object {
            $line = ($_ -split '#', 2)[0].Trim()
            if ($line) { $line }
        }
    if ($reqLines.Count -eq 0) {
        throw "No installable packages parsed from $req"
    }
    Set-Content -LiteralPath $sanitizedReq -Value $reqLines -Encoding UTF8

    Write-Host "[pip] $py -m pip install -r $sanitizedReq ($($reqLines.Count) packages)"
    & $py -m pip install --upgrade -r $sanitizedReq
    if ($LASTEXITCODE -ne 0) {
        throw "pip install failed (exit $LASTEXITCODE)"
    }

    & $py -c "import pptx" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "post-install verify failed: bundled python cannot import pptx"
    }
}
finally {
    Remove-Item -LiteralPath $sanitizedReq -Force -ErrorAction SilentlyContinue
}

Write-Host "[ok] ppt-master Python dependencies installed."
