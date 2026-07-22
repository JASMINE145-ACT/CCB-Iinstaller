param(
    [string]$InstallDir = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

$targetRoot = Join-Path $InstallDir "vendor\mcp-servers\office-word-mcp"
$sitePackages = Join-Path $targetRoot "site-packages"
$serverPy = Join-Path $targetRoot "server.py"
$pythonSite = Join-Path $InstallDir "vendor\python-wanding\Lib\site-packages"

New-Item -ItemType Directory -Force -Path $sitePackages | Out-Null

$pythonExe = Join-Path $InstallDir "vendor\python-wanding\python.exe"
if (-not (Test-Path -LiteralPath $pythonExe)) {
    throw "Bundled Python required (no system Python needed): $pythonExe"
}

function Invoke-PipTarget {
    param([string[]]$Packages)
    Write-Host "[office-word-mcp] pip install $($Packages -join ' ') -> $sitePackages"
    $prevEa = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    & $pythonExe -m pip install --upgrade @Packages --target $sitePackages
    $pipExit = $LASTEXITCODE; $ErrorActionPreference = $prevEa
    if ($pipExit -ne 0) { throw "pip install failed (exit $pipExit): $($Packages -join ' ')" }
}

$wordMain = Join-Path $sitePackages "word_document_server\main.py"
if (Test-Path -LiteralPath $wordMain) {
    Write-Host "[office-word-mcp] site-packages already present; skip core pip."
}
else {
    Invoke-PipTarget -Packages @(
        'office-word-mcp-server==1.1.11',
        'fastmcp',
        'python-docx',
        'lxml',
        'mcp'
    )
    if (-not (Test-Path -LiteralPath $wordMain)) {
        throw "office-word-mcp install incomplete: word_document_server missing"
    }
}

# PDF export (convert_to_pdf) needs docx2pdf + a working pywin32 under --target installs.
$docx2pdfMarker = Join-Path $sitePackages "docx2pdf\__init__.py"
$pywin32Pth = Join-Path $sitePackages "pywin32.pth"
if (-not (Test-Path -LiteralPath $docx2pdfMarker) -or -not (Test-Path -LiteralPath $pywin32Pth)) {
    Invoke-PipTarget -Packages @('docx2pdf', 'pywin32')
}

# Bundled python-wanding sometimes ships tiny stub modules (e.g. pywintypes.py 37 B,
# win32api.py 85 B) that shadow real pywin32 from MCP site-packages and break docx2pdf:
#   AttributeError: module 'pywintypes' has no attribute '__import_pywin32_system_module__'
#   AttributeError: module 'win32api' has no attribute 'RegOpenKey'
# Side effect: these stubs live under shared vendor/python-wanding (not MCP-only).
# Quarantine is intentional so Word PDF export works; rename is idempotent (.stub-bak).
if (Test-Path -LiteralPath $pythonSite) {
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
        # Real pywin32 modules are large; stubs are tiny shims.
        if ($stubLen -ge 2048) { continue }
        $bak = "$stubPath.stub-bak"
        Move-Item -LiteralPath $stubPath -Destination $bak -Force
        Write-Host "[office-word-mcp] quarantined stub $name ($stubLen B) -> $bak"
    }
}

# Accurate / other PYTHONNOUSERSITE MCPs need real pywin32 on python-wanding after stub quarantine.
$ensurePywin32 = Join-Path $PSScriptRoot 'ensure-python-wanding-pywin32.ps1'
if (-not (Test-Path -LiteralPath $ensurePywin32)) {
    throw "ensure-python-wanding-pywin32.ps1 missing next to install-office-word-mcp.ps1 (packaging gap)"
}
& $ensurePywin32 -InstallDir $InstallDir
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "ensure-python-wanding-pywin32 failed (exit $LASTEXITCODE)"
}

$launcher = @'
#!/usr/bin/env python3
"""CCB-Wanding launcher for GongRzhe Office-Word-MCP-Server (office-word-mcp-server)."""
from __future__ import annotations

import builtins
import os
import site
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
_SITE = os.path.join(_ROOT, "site-packages")
if os.path.isdir(_SITE):
    # Prefer MCP site-packages; process .pth (pywin32.pth) so win32/ + bootstrap load.
    sys.path.insert(0, _SITE)
    site.addsitedir(_SITE)

# Upstream prints boot messages to stdout, which breaks MCP stdio transport.
_real_print = builtins.print


def _stderr_print(*args, **kwargs):
    kwargs.setdefault("file", sys.stderr)
    return _real_print(*args, **kwargs)


builtins.print = _stderr_print

from word_document_server.main import run_server  # noqa: E402

if __name__ == "__main__":
    run_server()
'@

Set-Content -LiteralPath $serverPy -Value $launcher -Encoding UTF8

# WANd DocumentSpec extension (lib -> site-packages)
$wandSpecSrc = Join-Path (Split-Path -Parent $PSScriptRoot) "lib\wand-document-spec\wand_document_spec"
$wandSpecDst = Join-Path $sitePackages "wand_document_spec"
if (Test-Path -LiteralPath $wandSpecSrc) {
    if (Test-Path -LiteralPath $wandSpecDst) { Remove-Item -LiteralPath $wandSpecDst -Recurse -Force }
    Copy-Item -LiteralPath $wandSpecSrc -Destination $wandSpecDst -Recurse -Force
    Write-Host "[office-word-mcp] synced wand_document_spec -> $wandSpecDst"
} else {
    Write-Warning "[office-word-mcp] wand_document_spec source missing: $wandSpecSrc"
}

# Idempotent: inject DocumentSpec registration into vendor main.py (survives pip reinstall)
$wordMainPy = Join-Path $sitePackages "word_document_server\main.py"
$hookMarker = "register_wand_document_spec_tools"
if ((Test-Path -LiteralPath $wordMainPy) -and (Test-Path -LiteralPath $wandSpecDst)) {
    $mainText = Get-Content -LiteralPath $wordMainPy -Raw -Encoding UTF8
    if ($mainText -notmatch [regex]::Escape($hookMarker)) {
        $hookBlock = @'

    # WANd DocumentSpec tools (CCB-Wanding extension)
    try:
        from wand_document_spec.mcp_register import register_wand_document_spec_tools
        register_wand_document_spec_tools(mcp)
        print("Registered WANd DocumentSpec tools", file=sys.stderr)
    except ImportError as exc:
        print(f"WANd DocumentSpec tools not loaded: {exc}", file=sys.stderr)

'@
        if ($mainText -match '(?m)^def run_server\(\):') {
            $mainText = $mainText -replace '(?m)^def run_server\(\):', ($hookBlock + "`r`ndef run_server():")
            Set-Content -LiteralPath $wordMainPy -Value $mainText -Encoding UTF8 -NoNewline
            Write-Host "[office-word-mcp] injected DocumentSpec hook into word_document_server/main.py"
        } else {
            Write-Warning "[office-word-mcp] could not find def run_server() to inject DocumentSpec hook"
        }
    } else {
        Write-Host "[office-word-mcp] DocumentSpec hook already present in main.py"
    }
}

Write-Host "[office-word-mcp] OK -> $serverPy"
