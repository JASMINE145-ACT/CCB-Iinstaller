param(
    [string]$InstallDir = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

$targetRoot = Join-Path $InstallDir "vendor\mcp-servers\excel-mcp-server"
$sitePackages = Join-Path $targetRoot "site-packages"
$serverPy = Join-Path $targetRoot "server.py"

New-Item -ItemType Directory -Force -Path $sitePackages | Out-Null

$pythonExe = Join-Path $InstallDir "vendor\python-wanding\python.exe"
if (-not (Test-Path -LiteralPath $pythonExe)) {
    throw "Bundled Python required (no system Python needed): $pythonExe"
}

$excelServer = Join-Path $sitePackages "excel_mcp\server.py"
if (Test-Path -LiteralPath $excelServer) {
    Write-Host "[excel-mcp-server] site-packages already present; skip pip."
}
else {
    Write-Host "[excel-mcp-server] Installing haris-musa/excel-mcp-server into $sitePackages ..."
    $prevEa = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    & $pythonExe -m pip install `
        --upgrade `
        excel-mcp-server==0.1.8 `
        openpyxl `
        mcp `
        --target $sitePackages
    $pipExit = $LASTEXITCODE; $ErrorActionPreference = $prevEa
    if ($pipExit -ne 0) { throw "pip install excel-mcp-server failed (exit $pipExit)" }

    if (-not (Test-Path -LiteralPath $excelServer)) {
        throw "excel-mcp-server install incomplete: excel_mcp.server missing"
    }
}

$launcher = @'
#!/usr/bin/env python3
"""CCB-Wanding launcher for haris-musa/excel-mcp-server (excel-mcp-server PyPI)."""
from __future__ import annotations

import builtins
import os
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
_SITE = os.path.join(_ROOT, "site-packages")
if os.path.isdir(_SITE):
    sys.path.insert(0, _SITE)

# Upstream typer/cli may print to stdout; redirect for MCP stdio safety.
_real_print = builtins.print


def _stderr_print(*args, **kwargs):
    kwargs.setdefault("file", sys.stderr)
    return _real_print(*args, **kwargs)


builtins.print = _stderr_print

from excel_mcp.server import run_stdio  # noqa: E402

if __name__ == "__main__":
    run_stdio()
'@

Set-Content -LiteralPath $serverPy -Value $launcher -Encoding UTF8
Write-Host "[excel-mcp-server] OK -> $serverPy"
