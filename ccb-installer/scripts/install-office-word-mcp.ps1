param(
    [string]$InstallDir = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

$targetRoot = Join-Path $InstallDir "vendor\mcp-servers\office-word-mcp"
$sitePackages = Join-Path $targetRoot "site-packages"
$serverPy = Join-Path $targetRoot "server.py"

New-Item -ItemType Directory -Force -Path $sitePackages | Out-Null

$pythonExe = Join-Path $InstallDir "vendor\python-wanding\python.exe"
if (-not (Test-Path -LiteralPath $pythonExe)) {
    throw "Bundled Python required (no system Python needed): $pythonExe"
}

$wordMain = Join-Path $sitePackages "word_document_server\main.py"
if (Test-Path -LiteralPath $wordMain) {
    Write-Host "[office-word-mcp] site-packages already present; skip pip."
}
else {
    Write-Host "[office-word-mcp] Installing office-word-mcp-server into $sitePackages ..."
    $prevEa = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    & $pythonExe -m pip install `
        --upgrade `
        office-word-mcp-server==1.1.11 `
        fastmcp `
        python-docx `
        lxml `
        mcp `
        --target $sitePackages
    $pipExit = $LASTEXITCODE; $ErrorActionPreference = $prevEa
    if ($pipExit -ne 0) { throw "pip install office-word-mcp failed (exit $pipExit)" }

    if (-not (Test-Path -LiteralPath $wordMain)) {
        throw "office-word-mcp install incomplete: word_document_server missing"
    }
}

$launcher = @'
#!/usr/bin/env python3
"""CCB-Wanding launcher for GongRzhe Office-Word-MCP-Server (office-word-mcp-server)."""
from __future__ import annotations

import builtins
import os
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
_SITE = os.path.join(_ROOT, "site-packages")
if os.path.isdir(_SITE):
    sys.path.insert(0, _SITE)

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
Write-Host "[office-word-mcp] OK -> $serverPy"
